import * as vscode from 'vscode';
import { TextUtils } from '../utils/helpers';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { TextBlockProcessor } from '../utils/TextBlockProcessor';
import { ConfigService } from '../services/ConfigService';
import { StatusBarAnimation } from '../utils/StatusBarAnimation';
import { BBCmd, ProcessRequest } from '../core/types';
import { BB } from '../core/bb';

export function registerBBCommand(context: vscode.ExtensionContext) {
    const bbCommand = new BBCommand(context);
    context.subscriptions.push(vscode.commands.registerCommand(
        'blogbuddy.bb',
        () => bbCommand.hiBB()
    ));
}

class BBCommand implements vscode.Disposable {
    private static isExecuting = false;
    private static isInterrupted = false;

    private disposables: vscode.Disposable[] = [];
    private currentProcessor: TextBlockProcessor | null = null;
    private currentEditor: vscode.TextEditor | null = null;
    private originalText: string = '';

    constructor(private context: vscode.ExtensionContext) {
        // 设置全局监听器
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // 编辑器切换监听
        const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(async (activeEditor) => {
            if (BBCommand.isExecuting && !BBCommand.isInterrupted && this.currentEditor) {
                if (!activeEditor || activeEditor.document.uri.toString() !== this.currentEditor.document.uri.toString()) {
                    await this.interruptProcessing('switched to another file');
                }
            }
        });

        // 文档关闭监听
        const documentCloseListener = vscode.workspace.onDidCloseTextDocument(async (doc) => {
            if (BBCommand.isExecuting && !BBCommand.isInterrupted && this.currentEditor) {
                if (doc.uri.toString() === this.currentEditor.document.uri.toString()) {
                    await this.interruptProcessing('closed the file');
                }
            }
        });

        this.disposables.push(editorChangeListener, documentCloseListener);
        this.context.subscriptions.push(...this.disposables);
    }

    private async interruptProcessing(reason: string): Promise<void> {
        if (BBCommand.isInterrupted) {
            return;
        }

        console.log(`BB interrupted: ${reason}`);
        BBCommand.isInterrupted = true;
        BBCommand.isExecuting = false; // 立即释放执行锁

        // 恢复原始文本
        if (this.currentProcessor && this.originalText) {
            await this.currentProcessor.writeText(this.originalText);
        }

        // 清理当前处理器
        if (this.currentProcessor) {
            this.currentProcessor.dispose();
            this.currentProcessor = null;
        }

        // 显示提示
        const animation = StatusBarAnimation.getInstance();
        animation.showStatic('🔄 BB processing interrupted', 3000);
        vscode.window.showWarningMessage(
            `BB processing was interrupted because you ${reason}. Original content has been restored.`
        );
    }

    async hiBB(): Promise<void> {
        // 防止并发执行
        if (BBCommand.isExecuting) {
            vscode.window.showWarningMessage('BB is already executing a command. Please wait...');
            return;
        }

        // 重置状态
        BBCommand.isExecuting = true;
        BBCommand.isInterrupted = false;
        this.currentProcessor = null;
        this.currentEditor = null;
        this.originalText = '';

        try {
            const result = TextUtils.getSelectedTextOrParagraph();
            const editor = vscode.window.activeTextEditor;

            if (!result || !editor) {
                return;
            }

            // 保存当前上下文
            this.currentEditor = editor;
            this.originalText = editor.document.getText(result.range);

            const text = result.text;
            const ps = findAndParse(text);
            if (!ps) {
                return;
            }

            const cmd = Object.values(BBCmd).find(status => ps.command === status);
            if (!cmd) {
                throw new AppError(
                    ErrorCode.UNKNOWN_CMD,
                    "BB don't know cmd: " + ps.command,
                    "BB don't know cmd: " + ps.command,
                );
            }

            const request = {
                filePath: editor.document.uri.fsPath,
                selectText: text.slice(0, ps.startIndex) + text.slice(ps.endIndex),
                cmd: cmd,
                msg: ps.message,
                cmdText: ps.fullMatch
            };

            // 处理请求
            await this.handleProcessing(result.range, request);

        } finally {
            // 清理状态
            this.cleanup();
        }
    }

    private async handleProcessing(range: vscode.Range, request: ProcessRequest): Promise<void> {
        if (!this.currentEditor || BBCommand.isInterrupted) {
            return;
        }

        const config = ConfigService.getInstance().getAllConfig();
        const animation = StatusBarAnimation.getInstance();

        // 初始化处理器
        const displayText = ` BB is working on ${request.cmd}`;
        this.currentProcessor = new TextBlockProcessor(this.currentEditor, range, displayText);

        try {
            // 写入初始文本
            await this.currentProcessor.writeText(request.selectText);
            if (BBCommand.isInterrupted) {
                return;
            }

            // 开始处理
            animation.showStatic(`$(loading~spin) BB executing ${request.cmd}`);

            if (config.streaming) {
                const streamGenerator = await BB.i().actStreaming(request);
                await this.currentProcessor.writeStream(streamGenerator, { delay: 20 });
            } else {
                const response = await BB.i().act(request);
                if (!BBCommand.isInterrupted) {
                    await this.currentProcessor.writeText(response.replaceText);
                }
            }

            // 成功完成
            if (!BBCommand.isInterrupted) {
                console.log('BB processing completed successfully');
                animation.showStatic('BB: Completed!', 3000);
            }

        } catch (error) {
            if (!BBCommand.isInterrupted) {
                const err = error as Error;
                console.error('BB processing failed:', err);
                animation.showStatic(`BB failed: ${err.message}`, 5000);
                vscode.window.showErrorMessage(`BB processing failed: ${err.message}`);

                // 恢复原文
                if (this.currentProcessor && this.originalText) {
                    await this.currentProcessor.writeText(this.originalText);
                }
            }
        }
    }

    private cleanup(): void {
        if (this.currentProcessor) {
            this.currentProcessor.dispose();
            this.currentProcessor = null;
        }

        this.currentEditor = null;
        this.originalText = '';

        // 只有在没有被中断时才重置执行标志（中断时已经重置过了）
        if (!BBCommand.isInterrupted) {
            BBCommand.isExecuting = false;
        }
        BBCommand.isInterrupted = false; // 总是重置中断标志
    }

    dispose(): void {
        this.cleanup();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }

}

interface ParseResult {
    command: string;
    message: string;
    fullMatch: string;      // Complete matched string
    startIndex: number;     // Start position in original string
    endIndex: number;       // End position in original string
}

function findAndParse(text: string): ParseResult | null {
    // Find and match the first command string like <bbcmd:content>
    const regex = /<([\w-]+)(?::([^>]*))?>/;
    const match = text.match(regex);

    if (match) {
        const fullMatch = match[0];
        const command = match[1];
        const message = match[2] || '';
        const startIndex = match.index!;
        const endIndex = startIndex + fullMatch.length;

        return {
            command,
            message,
            fullMatch,
            startIndex,
            endIndex
        };
    }
    return null;
}


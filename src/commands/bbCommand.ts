import * as vscode from 'vscode';
import { TextUtils } from '../utils/helpers';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { TextBlockProcessor } from '../utils/TextBlockProcessor';
import { ConfigService } from '../services/ConfigService';
import { StatusBarAnimation } from '../utils/StatusBarAnimation';
import { BBCmd, ProcessRequest } from '../core/types';
import { BB } from '../core/bb';

export function registerBBCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'blogbuddy.bb',
        () => new BBCommand().hiBB()
    ));
}

class BBCommand {
    private static isExecuting = false;

    async hiBB(): Promise<void> {
        // Prevent concurrent execution
        if (BBCommand.isExecuting) {
            vscode.window.showWarningMessage('BB is already executing a command. Please wait...');
            return;
        }

        // Set execution flag
        BBCommand.isExecuting = true;

        try {
            const result = TextUtils.getSelectedTextOrParagraph();
            const editor = vscode.window.activeTextEditor;
            if (!result) {
                return;
            }
            if (!editor) {
                return;
            }
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
            const bquest = {
                filePath: editor.document.uri.fsPath,
                selectText: text.slice(0, ps.startIndex) + text.slice(ps.endIndex),
                cmd: cmd,
                msg: ps.message,
                cmdText: ps.fullMatch
            };

            // Use unified TextBlockProcessor for both streaming and non-streaming
            const config = ConfigService.getInstance().getAllConfig();
            const useStreaming = config.streaming;

            await this.handleUnifiedProcessing(editor, result.range, bquest, useStreaming);
        } finally {
            // Always reset execution flag
            BBCommand.isExecuting = false;
        }
    }

    /**
     * Handle unified processing using TextBlockProcessor
     */
    private async handleUnifiedProcessing(
        editor: vscode.TextEditor,
        range: vscode.Range,
        request: ProcessRequest,
        useStreaming: boolean
    ): Promise<void> {
        const animation = StatusBarAnimation.getInstance();
        // 保存原始数据用于异常恢复
        const originalText = editor.document.getText(range);

       


        // 初始化处理器并显示装饰
        const displayText = ` BB is working on ${request.cmd}`;
        const processor = new TextBlockProcessor(editor, range, displayText);
        // 先把原始文本替换成用户的纯文本，删除本次处理的 bb-cmd 信息（优化显示体验）
        await processor.writeText(request.selectText);

        try {
            // Start animation
            animation.showStatic(`$(loading~spin) BB executing ${request.cmd}`);

            if (useStreaming) {
                // 流式处理
                const streamGenerator = await BB.i().actStreaming(request);
                await processor.writeStream(streamGenerator, { delay: 20 });
            } else {
                // 非流式处理
                const response = await BB.i().act(request);
                await processor.writeText(response.replaceText);
            }

            // 成功完成
            console.log('BB processing completed successfully');
            animation.showStatic('BB: Completed!', 3000);

        } catch (e: unknown) {
            const error = e as Error;
            console.error('BB processing failed:', error);
            animation.showStatic(`BB failed: ${error.message}`, 5000);
            vscode.window.showErrorMessage(`BB processing failed: ${error.message}`);
            // 恢复原文到锁定区域
            await processor.writeText(originalText);

        } finally {
            // 清理资源
            processor.dispose();
        }
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


// src/utils/helpers.ts
import * as vscode from 'vscode';

/**
 * 文本操作工具函数
 */
export class TextUtils {
    /**
     * 获取当前选中的文本，如果没有选中则获取当前段落
     */
    static getSelectedTextOrParagraph(): { text: string; range: vscode.Range } | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null;
        }

        const selection = editor.selection;
        let text = '';
        let range: vscode.Range;

        if (!selection.isEmpty) {
            // 有选中文本
            text = editor.document.getText(selection);
            range = new vscode.Range(selection.start, selection.end);
        } else {
            // 没有选中文本，获取当前段落
            const currentLine = selection.active.line;
            const lineText = editor.document.lineAt(currentLine).text;
            
            if (lineText.trim() === '') {
                return null;
            }

            text = lineText;
            range = editor.document.lineAt(currentLine).range;
        }

        return { text, range };
    }

    /**
     * 获取选中文本的上下文
     */
    static getContext(range: vscode.Range, contextLines: number = 2): string {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return '';
        }

        const document = editor.document;
        const startLine = Math.max(0, range.start.line - contextLines);
        const endLine = Math.min(document.lineCount - 1, range.end.line + contextLines);

        const contextRange = new vscode.Range(
            new vscode.Position(startLine, 0),
            new vscode.Position(endLine, document.lineAt(endLine).text.length)
        );

        return document.getText(contextRange);
    }

    /**
     * 智能选择文本（选择段落、句子等）
     */
    static smartSelectText(): { text: string; range: vscode.Range } | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null;
        }

        const selection = editor.selection;
        const document = editor.document;

        if (!selection.isEmpty) {
            return {
                text: document.getText(selection),
                range: new vscode.Range(selection.start, selection.end)
            };
        }

        // 查找段落边界
        const currentLine = selection.active.line;
        let startLine = currentLine;
        let endLine = currentLine;

        // 向上查找段落开始
        while (startLine > 0 && document.lineAt(startLine - 1).text.trim() !== '') {
            startLine--;
        }

        // 向下查找段落结束
        while (endLine < document.lineCount - 1 && document.lineAt(endLine + 1).text.trim() !== '') {
            endLine++;
        }

        const range = new vscode.Range(
            new vscode.Position(startLine, 0),
            new vscode.Position(endLine, document.lineAt(endLine).text.length)
        );

        return {
            text: document.getText(range),
            range
        };
    }

    /**
     * 清理文本（移除多余空格、换行等）
     */
    static cleanText(text: string): string {
        return text
            .replace(/\r\n/g, '\n')           // 统一换行符
            .replace(/[ \t]+/g, ' ')          // 合并多个空格
            .replace(/\n\s*\n\s*\n/g, '\n\n') // 合并多个空行
            .trim();
    }

    /**
     * 格式化Markdown文本
     */
    static formatMarkdown(text: string): string {
        return text
            .replace(/^#+ /gm, (match) => match)  // 保持标题格式
            .replace(/^\* /gm, '- ')              // 统一列表符号
            .replace(/\n{3,}/g, '\n\n')           // 限制空行数量
            .trim();
    }
}

/**
 * 文件操作工具函数
 */
export class FileUtils {
    /**
     * 检查当前文件是否为Markdown文件
     */
    static isMarkdownFile(): boolean {
        const editor = vscode.window.activeTextEditor;
        return editor?.document.languageId === 'markdown' || false;
    }

    /**
     * 获取当前文件名
     */
    static getCurrentFileName(): string {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return '';
        }
        return editor.document.fileName;
    }

    /**
     * 保存文档
     */
    static async saveDocument(): Promise<boolean> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }

        try {
            await editor.document.save();
            return true;
        } catch (error) {
            console.error('保存文档失败:', error);
            return false;
        }
    }
}

/**
 * UI操作工具函数
 */
export class UIUtils {
    /**
     * 显示进度条并执行操作
     */
    static async withProgress<T>(
        operation: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>,
        title: string = '处理中...'
    ): Promise<T> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            },
            operation
        );
    }

    /**
     * 显示选择菜单
     */
    static async showQuickPick<T extends vscode.QuickPickItem>(
        items: T[],
        options?: vscode.QuickPickOptions
    ): Promise<T | undefined> {
        return vscode.window.showQuickPick(items, {
            placeHolder: '请选择一个选项',
            ...options
        });
    }

    /**
     * 显示输入框
     */
    static async showInputBox(options?: vscode.InputBoxOptions): Promise<string | undefined> {
        return vscode.window.showInputBox({
            placeHolder: '请输入内容',
            ...options
        });
    }

    /**
     * 显示确认对话框
     */
    static async showConfirmDialog(
        message: string,
        confirmText: string = '确定',
        cancelText: string = '取消'
    ): Promise<boolean> {
        const choice = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            confirmText,
            cancelText
        );
        return choice === confirmText;
    }
}

/**
 * 通用工具函数
 */
export class Utils {
    /**
     * 防抖函数
     */
    static debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * 节流函数
     */
    static throttle<T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let lastFunc: NodeJS.Timeout;
        let lastRan: number;
        return (...args: Parameters<T>) => {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    /**
     * 延迟函数
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 重试函数
     */
    static async retry<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000
    ): Promise<T> {
        let lastError: any;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (i < maxRetries) {
                    await this.delay(delay * Math.pow(2, i)); // 指数退避
                }
            }
        }
        
        throw lastError;
    }

    /**
     * 生成UUID
     */
    static generateId(): string {
        return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * 格式化时间
     */
    static formatTime(date: Date = new Date()): string {
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// src/commands/TextCommands.ts
import * as vscode from 'vscode';
import { TextUtils, UIUtils } from '../utils/helpers';
import { ErrorHandler } from '../utils/ErrorHandler';
import { convertSelectedTextToUpper, convertLineToUpper } from '../features/convertToUpper';

export class TextCommands {
    private errorHandler: ErrorHandler;

    constructor() {
        this.errorHandler = ErrorHandler.getInstance();
    }

    /**
     * 扩写文本命令
     */
    async expandText(): Promise<void> {
        await this.errorHandler.withErrorHandling(async () => {
            const result = TextUtils.getSelectedTextOrParagraph();
            
            if (!result) {
                vscode.window.showWarningMessage('请先选择文本或将光标放在要扩写的段落中');
                return;
            }

            await UIUtils.withProgress(async (progress) => {
                progress.report({ message: '正在扩写文本...' });
                
                // 这里暂时用模拟数据，后续会集成AI服务
                await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟API调用
                const expandedText = `${result.text}\n\n[这里将显示AI扩写的内容 - 功能即将在Day 9-11实现]`;
                
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    await editor.edit(editBuilder => {
                        editBuilder.replace(result.range, expandedText);
                    });
                }
                
                vscode.window.showInformationMessage('文本扩写完成');
            }, '扩写文本');
        }, '扩写文本');
    }

    /**
     * 润色文本命令
     */
    async improveText(): Promise<void> {
        await this.errorHandler.withErrorHandling(async () => {
            const result = TextUtils.getSelectedTextOrParagraph();
            
            if (!result) {
                vscode.window.showWarningMessage('请先选择要润色的文本');
                return;
            }

            await UIUtils.withProgress(async (progress) => {
                progress.report({ message: '正在润色文本...' });
                
                // 这里暂时用模拟数据，后续会集成AI服务
                await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟API调用
                const improvedText = `[润色后的文本 - 功能即将在Day 12实现]: ${result.text}`;
                
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    await editor.edit(editBuilder => {
                        editBuilder.replace(result.range, improvedText);
                    });
                }
                
                vscode.window.showInformationMessage('文本润色完成');
            }, '润色文本');
        }, '润色文本');
    }

    /**
     * 转换选中文本为大写
     */
    async convertSelectedTextToUpper(): Promise<void> {
        await this.errorHandler.withErrorHandling(async () => {
            convertSelectedTextToUpper();
        }, '转换文本为大写');
    }

    /**
     * 转换当前行为大写
     */
    async convertLineToUpper(): Promise<void> {
        await this.errorHandler.withErrorHandling(async () => {
            convertLineToUpper();
        }, '转换当前行为大写');
    }
}

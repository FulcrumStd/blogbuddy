// src/commands/MenuCommands.ts
import * as vscode from 'vscode';
import { TextCommands } from './TextCommands';
import { UIUtils, FileUtils } from '../utils/helpers';
import { ErrorHandler } from '../utils/ErrorHandler';
import { learnProgress } from '../features/learnProgress';


export function registerShowMenuCommands(context: vscode.ExtensionContext){
    const menuCommands = new MenuCommands();
    const showMainMenu = vscode.commands.registerCommand('blogbuddy.showMainMenu',() => menuCommands.showMainMenu());
    context.subscriptions.push(showMainMenu);
}


export class MenuCommands {
    private textCommands: TextCommands;
    private errorHandler: ErrorHandler;

    constructor() {
        this.textCommands = new TextCommands();
        this.errorHandler = ErrorHandler.getInstance();
    }

    /**
     * 显示主菜单
     */
    async showMainMenu(): Promise<void> {
        await this.errorHandler.withErrorHandling(async () => {

            // 检查是否在Markdown文件中
            if (!FileUtils.isMarkdownFile()) {
                const choice = await vscode.window.showWarningMessage(
                    '当前文件不是Markdown格式，某些功能可能无法正常使用。是否继续？',
                    '继续',
                    '取消'
                );
                
                if (choice !== '继续') {
                    return;
                }
            }

            const menuItems = [
                {
                    label: '$(edit) 文本处理',
                    description: '扩写、润色、大小写转换等文本操作',
                    detail: '包含AI文本处理和基础文本操作功能',
                    command: 'showTextMenu'
                },
                {
                    label: '$(table) 内容生成',
                    description: '生成表格、图表等内容',
                    detail: '使用AI生成各种类型的内容',
                    command: 'showGenerateMenu'
                },
                {
                    label: '$(beaker) 交互演示',
                    description: '演示用户交互功能',
                    detail: '包含输入框、确认对话框、进度条和各种通知类型',
                    command: 'learnProgress'
                },
                {
                    label: '$(check) 文本检查',
                    description: '语法检查、文本对比等',
                    detail: '文本质量检查和对比功能',
                    command: 'showCheckMenu'
                },
                {
                    label: '$(question) 帮助信息',
                    description: '查看使用说明和常见问题',
                    detail: '获取使用帮助和故障排除信息',
                    command: 'showHelp'
                }
            ];

            const selected = await UIUtils.showQuickPick(menuItems, {
                title: '博客编写助手',
                placeHolder: '请选择要使用的功能...',
                matchOnDescription: true,
                matchOnDetail: true,
                ignoreFocusOut: true
            });

            if (selected) {
                await this.handleMenuSelection(selected.command);
            }
        }, '显示主菜单');
    }

    /**
     * 显示文本处理菜单
     */
    async showTextMenu(): Promise<void> {
        const items = [
            {
                label: '$(arrow-up) 扩写段落',
                description: '让AI帮助扩写选中的文本段落',
                detail: '使用AI技术扩展和丰富选中的文本内容',
                command: 'expandText'
            },
            {
                label: '$(sparkle) 润色文本',
                description: '改进文本的表达和流畅度',
                detail: '使用AI优化文本的语言表达和逻辑结构',
                command: 'improveText'
            },
            {
                label: '$(globe) 翻译文本',
                description: '翻译选中的文本',
                detail: '将文本翻译成其他语言',
                command: 'translateText'
            },
            {
                label: '$(case-sensitive) 转换为大写',
                description: '转换选中的内容为大写字母',
                detail: '将选中的文本转换为大写格式',
                command: 'convertSelectedTextToUpper'
            },
            {
                label: '$(edit) 转换本行为大写',
                description: '转换本行内容为大写字母',
                detail: '将当前行的文本转换为大写格式',
                command: 'convertLineToUpper'
            },
            {
                label: '$(arrow-left) 返回主菜单',
                description: '返回到主菜单',
                detail: '回到上一级菜单',
                command: 'showMainMenu'
            }
        ];

        const selected = await UIUtils.showQuickPick(items, {
            title: '文本处理功能',
            placeHolder: '选择文本处理操作...',
            matchOnDescription: true,
            matchOnDetail: true,
            ignoreFocusOut: true
        });

        if (selected) {
            await this.handleMenuSelection(selected.command);
        }
    }

    /**
     * 显示内容生成菜单（占位符）
     */
    async showGenerateMenu(): Promise<void> {
        const items = [
            {
                label: '$(table) 生成表格',
                description: '根据描述生成Markdown表格',
                detail: '即将在后续版本中实现',
                command: 'generateTable'
            },
            {
                label: '$(graph) 生成图表',
                description: '生成Mermaid图表代码',
                detail: '即将在后续版本中实现',
                command: 'generateDiagram'
            },
            {
                label: '$(arrow-left) 返回主菜单',
                description: '返回到主菜单',
                detail: '回到上一级菜单',
                command: 'showMainMenu'
            }
        ];

        const selected = await UIUtils.showQuickPick(items, {
            title: '内容生成功能',
            placeHolder: '选择内容生成操作...',
            ignoreFocusOut: true
        });

        if (selected) {
            if (selected.command === 'showMainMenu') {
                await this.showMainMenu();
            } else {
                vscode.window.showInformationMessage(`${selected.description}功能即将在后续版本中实现`);
            }
        }
    }

    /**
     * 显示文本检查菜单（占位符）
     */
    async showCheckMenu(): Promise<void> {
        const items = [
            {
                label: '$(check) 语法检查',
                description: '检查文本的语法和拼写',
                detail: '即将在后续版本中实现',
                command: 'checkGrammar'
            },
            {
                label: '$(diff) 文本对比',
                description: '对比两段文本的差异',
                detail: '即将在后续版本中实现',
                command: 'compareText'
            },
            {
                label: '$(arrow-left) 返回主菜单',
                description: '返回到主菜单',
                detail: '回到上一级菜单',
                command: 'showMainMenu'
            }
        ];

        const selected = await UIUtils.showQuickPick(items, {
            title: '文本检查功能',
            placeHolder: '选择文本检查操作...',
            ignoreFocusOut: true
        });

        if (selected) {
            if (selected.command === 'showMainMenu') {
                await this.showMainMenu();
            } else {
                vscode.window.showInformationMessage(`${selected.description}功能即将在后续版本中实现`);
            }
        }
    }

    /**
     * 处理菜单选择
     */
    private async handleMenuSelection(command: string): Promise<void> {
        switch (command) {
            // 菜单导航
            case 'showMainMenu':
                await this.showMainMenu();
                break;
            case 'showTextMenu':
                await this.showTextMenu();
                break;
            case 'showGenerateMenu':
                await this.showGenerateMenu();
                break;
            case 'showCheckMenu':
                await this.showCheckMenu();
                break;

            // 文本处理功能
            case 'expandText':
                await this.textCommands.expandText();
                break;
            case 'improveText':
                await this.textCommands.improveText();
                break;
            case 'translateText':
                vscode.window.showInformationMessage('翻译功能即将实现');
                break;
            case 'convertSelectedTextToUpper':
                await this.textCommands.convertSelectedTextToUpper();
                break;
            case 'convertLineToUpper':
                await this.textCommands.convertLineToUpper();
                break;

            // 其他功能
            case 'learnProgress':
                learnProgress();
                break;
            case 'openSettings':
                await this.openSettings();
                break;
            case 'showHelp':
                await this.showHelp();
                break;

            default:
                vscode.window.showWarningMessage(`未知命令: ${command}`);
        }
    }

    /**
     * 打开设置
     */
    private async openSettings(): Promise<void> {
        await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'blogbuddy'  // 使用你的插件名称
        );
    }

    /**
     * 显示帮助信息
     */
    private async showHelp(): Promise<void> {
        const helpText = `
# 博客编写助手 - 使用帮助

## 🚀 快速开始
1. 按 Ctrl+Shift+B 打开主菜单
2. 选择相应的功能类别
3. 按照提示操作

## 📝 文本处理功能
• **扩写段落**: 选中文本或将光标放在段落中，AI会帮助扩写
• **润色文本**: 改进文本的表达和流畅度
• **翻译文本**: 将文本翻译成其他语言
• **大小写转换**: 将文本转换为大写格式

## ⚙️ 配置说明
• 首次使用前请在设置中配置API密钥
• 可调整AI模型、温度等参数
• 支持多种语言输出

## 🔧 常用快捷键
• Ctrl+Shift+B: 打开主菜单
• （更多快捷键即将添加）

## ❓ 常见问题
• **配置错误**: 请检查API密钥是否正确设置
• **网络问题**: 请检查网络连接和代理设置
• **功能异常**: 确保在Markdown文件中使用效果更佳

## 📞 获取帮助
• 查看插件设置页面的详细说明
• 检查VS Code的开发者控制台获取错误信息
        `;

        const choice = await vscode.window.showInformationMessage(
            '查看帮助信息',
            '在编辑器中打开',
            '关闭'
        );

        if (choice === '在编辑器中打开') {
            const doc = await vscode.workspace.openTextDocument({
                content: helpText,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        }
    }
}

// src/commands/MenuCommands.ts
import * as vscode from 'vscode';
import { UIUtils, FileUtils } from '../utils/helpers';
import { ErrorHandler } from '../utils/ErrorHandler';
import { AIProxy } from '../utils/aiProxy';


export function registerShowMenuCommands(context: vscode.ExtensionContext){
    const menuCommands = new MenuCommands();
    const showMainMenu = vscode.commands.registerCommand('blogbuddy.showMainMenu',() => menuCommands.showMainMenu());
    context.subscriptions.push(showMainMenu);
}


export class MenuCommands {
    private errorHandler: ErrorHandler;

    constructor() {
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
                    label: '$(graph) Usage 统计',
                    description: '查看AI使用统计信息',
                    detail: '显示请求次数、Token使用量和模型统计',
                    command: 'showUsageStats'
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
     * 显示用量统计
     */
    async showUsageStats(): Promise<void> {
        const aiProxy = AIProxy.getInstance();
        const stats = aiProxy.getUsageStats();
        
        let statsText = '# AI 使用统计\n\n';
        
        if (stats.totalRequests === 0) {
            statsText += '暂无使用记录。开始使用AI功能后，这里会显示详细的使用统计。';
        } else {
            statsText += '| 用途 | 请求次数 | Token使用量 | 使用模型 |\n';
            statsText += '|------|---------|------------|----------|\n';
            
            for (const [flag, flagStat] of stats.flagStats) {
                statsText += `| ${flag} | ${flagStat.requests} | ${flagStat.tokensUsed} | ${flagStat.model} |\n`;
            }
            
            statsText += `| **总计** | **${stats.totalRequests}** | **${stats.totalTokensUsed}** | - |\n`;
        }

        const choice = await vscode.window.showInformationMessage(
            '查看AI使用统计',
            '在编辑器中打开',
            '重置统计',
            '关闭'
        );

        if (choice === '在编辑器中打开') {
            const doc = await vscode.workspace.openTextDocument({
                content: statsText,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        } else if (choice === '重置统计') {
            const confirm = await vscode.window.showWarningMessage(
                '确定要重置所有使用统计吗？此操作不可撤销。',
                '确定',
                '取消'
            );
            if (confirm === '确定') {
                aiProxy.resetUsageStats();
                vscode.window.showInformationMessage('使用统计已重置');
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
            case 'showUsageStats':
                await this.showUsageStats();
                break;
            case 'showHelp':
                await this.showHelp();
                break;

            default:
                vscode.window.showWarningMessage(`未知命令: ${command}`);
        }
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

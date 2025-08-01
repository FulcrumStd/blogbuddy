// commands/dailyPlanning.ts
import * as vscode from 'vscode';

export function registerShowMainMenuCommands(context: vscode.ExtensionContext) {
    // 创建每日计划
    const showMainMenu = vscode.commands.registerCommand('blogbuddy.showMainMenu', async () => {
        // 命令逻辑
        // 创建 QuickPick 菜单项  
        const menuItems: vscode.QuickPickItem[] = [  
            {  
                label: '$(edit) 文本扩写',  
                description: '扩展选中的文本内容',  
                detail: '使用 AI 来扩写和丰富你的文本段落'  
            },  
            {  
                label: '$(sparkle) 文本润色',  
                description: '改善文本的表达和风格',  
                detail: '优化语言表达，让文本更加流畅自然'  
            },  
            {  
                label: '$(globe) 文本翻译',  
                description: '翻译选中的文本',  
                detail: '支持多种语言互译'  
            },  
            {  
                label: '$(checklist) 语法检查',  
                description: '检查并修正语法错误',  
                detail: '识别并建议修正语法问题'  
            },  
            {  
                label: '$(graph) 生成图表',  
                description: '生成 Mermaid 图表',  
                detail: '根据描述生成流程图、时序图等'  
            },  
            {  
                label: '$(table) 生成表格',  
                description: '生成 Markdown 表格',  
                detail: '根据需求生成格式化的表格'  
            }  
        ];  

        // 显示 QuickPick 菜单  
        const selectedItem = await vscode.window.showQuickPick(menuItems, {  
            title: '博客编写助手',  
            placeHolder: '请选择要使用的功能...',  
            matchOnDescription: true,  
            matchOnDetail: true,  
            ignoreFocusOut: true  
        });  

        // 处理用户选择  
        if (selectedItem) {  
            await handleMenuSelection(selectedItem.label);  
        }  
    });
    
    context.subscriptions.push(showMainMenu);
}

// 处理菜单选择的函数  
async function handleMenuSelection(label: string) {  
    switch (label) {  
        case '$(edit) 文本扩写':  
            vscode.window.showInformationMessage('文本扩写功能即将实现...');  
            break;  
        case '$(sparkle) 文本润色':  
            vscode.window.showInformationMessage('文本润色功能即将实现...');  
            break;  
        case '$(globe) 文本翻译':  
            vscode.window.showInformationMessage('文本翻译功能即将实现...');  
            break;  
        case '$(checklist) 语法检查':  
            vscode.window.showInformationMessage('语法检查功能即将实现...');  
            break;  
        case '$(graph) 生成图表':  
            vscode.window.showInformationMessage('图表生成功能即将实现...');  
            break;  
        case '$(table) 生成表格':  
            vscode.window.showInformationMessage('表格生成功能即将实现...');  
            break;  
        default:  
            vscode.window.showWarningMessage('未知的功能选项');  
    }  
}  

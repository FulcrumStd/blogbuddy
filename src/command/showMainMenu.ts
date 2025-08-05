// commands/dailyPlanning.ts
import * as vscode from 'vscode';
import {convertSelectedTextToUpper, convertLineToUpper} from '../feature/convertToUpper';
import {learnProgress} from '../feature/learnProgress';
export function registerShowMainMenuCommands(context: vscode.ExtensionContext) {
    // 创建每日计划
    const showMainMenu = vscode.commands.registerCommand('blogbuddy.showMainMenu', async () => {
        // 命令逻辑
        // 创建 QuickPick 菜单项  
        const menuItems: vscode.QuickPickItem[] = [  
            {  
                label: '$(edit) 转换为大写',  
                description: '转换选中的内容为大写字母',  
                detail: '转换选中的内容为大写字母'
            },   
            {  
                label: '$(edit) 转换本行为大写',  
                description: '转换本行内容为大写字母',  
                detail: '转换本行内容为大写字母'
            },  
            {  
                label: '$(beaker) 交互演示',  
                description: '演示用户交互功能',  
                detail: '包含输入框、确认对话框、进度条和各种通知类型'  
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
        case '$(edit) 转换为大写':
            convertSelectedTextToUpper();
            break;
        case '$(edit) 转换本行为大写':
            convertLineToUpper();
            break;
        case '$(beaker) 交互演示':
            learnProgress();
            break;
        default:  
            vscode.window.showWarningMessage('未知的功能选项');  
    }  
}  

// commands/dailyPlanning.ts
import * as vscode from 'vscode';
import {convertSelectedTextToUpper, convertLineToUpper} from '../feature/convertToUpper';
import {learnProgress} from '../feature/learnProgress';
import { ConfigValidator } from '../util/configValidator';
import { ConfigService } from '../service/configService';
export function registerShowMainMenuCommands(context: vscode.ExtensionContext) {
    // 创建每日计划
    const showMainMenu = vscode.commands.registerCommand('blogbuddy.showMainMenu', async () => {
        // 先检查配置
        const validator = new ConfigValidator();
        const validation = validator.validateFullConfiguration();  
            
        if (!validation.isValid) {  
            const choice = await vscode.window.showErrorMessage(  
                '配置有误，是否打开设置页面？',  
                '打开设置',  
                '取消'  
            );  
            
            if (choice === '打开设置') {  
                vscode.commands.executeCommand('blogWritingAssistant.openSettings');  
            }  
            return;  
        }  

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
            },
            {  
                    label: '⚙️ 插件设置',  
                    description: '配置API密钥和其他选项',  
                      
                },  
                {  
                    label: '📊 查看配置',  
                    description: '显示当前配置状态',  
                    
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
        case '⚙️ 插件设置':
            vscode.commands.executeCommand(  
                'workbench.action.openSettings',   
                'blogbuddy'  
            );
            break;
        case '📊 查看配置':
            const configService = ConfigService.getInstance();
            const config = configService.getAllConfig();
            const validator = new ConfigValidator();
            const validation = validator.validateFullConfiguration();  
            
            vscode.window.showInformationMessage(  
                `当前配置 - 模型: ${config.model}, 状态: ${validation.isValid ? '✅正常' : '❌异常'}`  
            );  
            break;
        default:  
            vscode.window.showWarningMessage('未知的功能选项');  
    }  
}  

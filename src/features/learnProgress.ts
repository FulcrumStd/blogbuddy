import * as vscode from 'vscode';

export async function learnProgress() {
    try {  
        // 步骤1: 获取用户输入  
        const userInput = await getUserInput();  
        if (!userInput) {  
            return; // 用户取消了输入  
        }  

        // 步骤2: 用户确认对话框  
        const confirmed = await showConfirmationDialog(userInput);  
        if (!confirmed) {  
            vscode.window.showInformationMessage('操作已取消');  
            return;  
        }  

        // 步骤3: 显示进度条并执行虚拟处理  
        await processWithProgress(userInput);  

    } catch (error) {  
        vscode.window.showErrorMessage(`交互演示过程中发生错误: ${error}`);  
    }  
}

/**  
 * 获取用户输入  
 */  
async function getUserInput(): Promise<string | undefined> {  
    const input = await vscode.window.showInputBox({  
        title: '交互演示 - 用户输入',  
        placeHolder: '请输入要处理的内容...',  
        prompt: '这里可以输入任何文本，用于演示交互功能',  
        validateInput: (text: string) => {  
            if (!text || text.trim().length === 0) {  
                return '输入不能为空';  
            }  
            if (text.length > 100) {  
                return '输入内容过长，请限制在100字符以内';  
            }  
            return null; // 验证通过  
        },  
        ignoreFocusOut: true  
    });  

    return input?.trim();  
}

/**  
 * 显示确认对话框  
 */  
async function showConfirmationDialog(input: string): Promise<boolean> {  
    const result = await vscode.window.showWarningMessage(  
        `确认要处理以下内容吗？\n\n"${input}"`,  
        // {  
        //     modal: true,  
        //     detail: '此操作将演示完整的用户交互流程，包括进度显示和各种通知类型。'  
        // },  
        '确认处理',  
        '取消'  
    );  

    return result === '确认处理';  
}  

/**  
 * 带进度条的处理过程  
 */  
async function processWithProgress(input: string): Promise<void> {  
    await vscode.window.withProgress(  
        {  
            location: vscode.ProgressLocation.Notification,  
            title: '正在处理用户输入',  
            cancellable: true  
        },  
        async (progress, token) => {  
            // 检查取消状态  
            if (token.isCancellationRequested) {  
                throw new Error('操作被用户取消');  
            }  

            // 第一步：初始化 (显示警告)  
            progress.report({   
                increment: 0,   
                message: '正在初始化处理流程...'   
            });  
            
            await sleep(1000);  
            vscode.window.showWarningMessage(`⚠️ 注意：开始处理内容 "${input}"`);  

            if (token.isCancellationRequested) return;  

            // 第二步：处理中 (显示错误，但这是演示)  
            progress.report({   
                increment: 33,   
                message: '遇到预期的演示错误...'   
            });  
            
            await sleep(1000);  
            vscode.window.showErrorMessage(`❌ 演示错误：这是一个预期的错误信息 (处理内容: "${input}")`);  

            if (token.isCancellationRequested) return;  

            // 第三步：完成处理 (显示成功信息)  
            progress.report({   
                increment: 67,   
                message: '正在完成处理...'   
            });  
            
            await sleep(1000);  
            progress.report({   
                increment: 100,   
                message: '处理完成！'   
            });  

            // 最终成功消息  
            vscode.window.showInformationMessage(  
                `✅ 处理完成！您输入的内容 "${input}" 已成功处理。`,  
                '查看详情'  
            ).then(selection => {  
                if (selection === '查看详情') {  
                    vscode.window.showInformationMessage(  
                        `处理详情：\n输入内容：${input}\n处理时间：3秒\n状态：成功完成`  
                    );  
                }  
            });  
        }  
    );  
}  

/**  
 * 辅助函数：休眠指定毫秒数  
 */  
function sleep(ms: number): Promise<void> {  
    return new Promise(resolve => setTimeout(resolve, ms));  
}  
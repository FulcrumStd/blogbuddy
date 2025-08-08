// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {registerAllCommands} from './command';
import {ConfigWatcher} from './service/configWatcher';
import {ConfigValidator} from './util/configValidator';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "blogbuddy" is now active!');

	// 初始化配置服务  
    const validator = new ConfigValidator();  

    // 启动配置监听器  
    const configWatcher = new ConfigWatcher();  
    context.subscriptions.push(configWatcher);  

    // 验证初始配置  
    const validation = validator.validateFullConfiguration();  
    if (!validation.isValid) {  
        vscode.window.showErrorMessage(  
            `配置错误: ${validation.errors.join(', ')}`  
        );  
    }  

    // 显示警告（如果有）  
    if (validation.warnings.length > 0) {  
        vscode.window.showWarningMessage(  
            `配置警告: ${validation.warnings.join(', ')}`  
        );  
    }  

	registerAllCommands(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}

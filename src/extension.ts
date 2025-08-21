import * as vscode from 'vscode';
import {registerAllCommands} from './commands';
import {ConfigWatcher} from './services/ConfigWatcher';
import {DocumentLockManager} from './utils/DocumentLock';


export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(new ConfigWatcher());
	registerAllCommands(context);
}

export function deactivate() {
	// 确保清理文档锁定管理器资源
	DocumentLockManager.getInstance().dispose();
}

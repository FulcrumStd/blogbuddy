import * as vscode from 'vscode';
import {registerAllCommands} from './commands';
import {ConfigWatcher} from './services/ConfigWatcher';


export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(new ConfigWatcher());  
	registerAllCommands(context);
}

export function deactivate() {}

import * as vscode from 'vscode';
import {registerAllCommands} from './commands';
import {ConfigWatcher} from './services/ConfigWatcher';


export function activate(context: vscode.ExtensionContext) {

    const configWatcher = new ConfigWatcher();  
    context.subscriptions.push(configWatcher);  


	registerAllCommands(context);
}

export function deactivate() {}

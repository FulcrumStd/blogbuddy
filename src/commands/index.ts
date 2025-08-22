// commands/index.ts
import { ExtensionContext } from 'vscode';
import { registerMenuCommand } from './menuCommand';
import { registerBBCommand } from './bbCommand';

export function registerAllCommands(context: ExtensionContext) {
    registerMenuCommand(context);
    registerBBCommand(context);
}

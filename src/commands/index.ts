// commands/index.ts
import { ExtensionContext } from 'vscode';
import { registerMenuCommand } from './menuCommand';
import { registerBBCommand } from './bbCommand';
import { registerDocumentInfoCommand } from './documentInfoCommand';

export function registerAllCommands(context: ExtensionContext) {
    registerMenuCommand(context);
    registerBBCommand(context);
    registerDocumentInfoCommand(context);
}

// commands/index.ts
import { ExtensionContext } from 'vscode';
import { registerMenuCommand } from './menuCommand';
import { registerBBCommand } from './bbCommand';
import { registerDocumentInfoCommand } from './documentInfoCommand';
import { registerEditorCommand } from './editorCommand';

export function registerAllCommands(context: ExtensionContext) {
    registerMenuCommand(context);
    registerBBCommand(context);
    registerDocumentInfoCommand(context);
    registerEditorCommand(context);
}

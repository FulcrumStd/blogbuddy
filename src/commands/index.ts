// commands/index.ts
import { ExtensionContext } from 'vscode';
import { registerMenuCommand } from './menuCommand';
import { registerBBCommand } from './bbCommand';
import { registerDocumentInfoCommand } from './documentInfoCommand';
import { registerEditorCommand } from './editorCommand';
import { registerSelectModelCommand } from './selectModelCommand';
import { registerDiagnosticsCommand } from './diagnosticsCommand';
import { registerConfigStatusBar } from './configStatusBar';
import { registerReaderCommand } from './readerCommand';

export function registerAllCommands(context: ExtensionContext) {
    registerMenuCommand(context);
    registerBBCommand(context);
    registerDocumentInfoCommand(context);
    registerEditorCommand(context);
    registerSelectModelCommand(context);
    registerDiagnosticsCommand(context);
    registerConfigStatusBar(context);
    registerReaderCommand(context);
}

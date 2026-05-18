// commands/index.ts
import { ExtensionContext } from 'vscode';
import { registerBBCommand } from './bbCommand';
import { registerDocumentInfoCommand } from './documentInfoCommand';
import { registerEditorCommand } from './editorCommand';
import { registerSelectModelCommand } from './selectModelCommand';
import { registerDiagnosticsCommand } from './diagnosticsCommand';
import { registerConfigStatusBar } from './configStatusBar';
import { registerReaderCommand } from './readerCommand';
import { registerCreateReaderTemplateCommand } from './createReaderTemplateCommand';
import { registerUsageStatsCommand } from './usageStatsCommand';
import { registerHelpCommand } from './helpCommand';

export function registerAllCommands(context: ExtensionContext) {
    registerBBCommand(context);
    registerDocumentInfoCommand(context);
    registerEditorCommand(context);
    registerSelectModelCommand(context);
    registerDiagnosticsCommand(context);
    registerConfigStatusBar(context);
    registerReaderCommand(context);
    registerCreateReaderTemplateCommand(context);
    registerUsageStatsCommand(context);
    registerHelpCommand(context);
}

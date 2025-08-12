// commands/index.ts
import { ExtensionContext } from 'vscode';
import { registerShowMenuCommands } from './MenuCommands';

export function registerAllCommands(context: ExtensionContext) {
    registerShowMenuCommands(context);
}

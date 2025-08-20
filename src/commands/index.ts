// commands/index.ts
import { ExtensionContext } from 'vscode';
import { registerShowMenuCommands } from './MenuCommands';
import { registerMagicCommands } from './MagicCommands';

export function registerAllCommands(context: ExtensionContext) {
    registerShowMenuCommands(context);
    registerMagicCommands(context);
}

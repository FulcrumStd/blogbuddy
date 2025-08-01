// commands/index.ts
import { ExtensionContext } from 'vscode';
import { registerShowMainMenuCommands } from './showMainMenu';

export function registerAllCommands(context: ExtensionContext) {
    registerShowMainMenuCommands(context);
}

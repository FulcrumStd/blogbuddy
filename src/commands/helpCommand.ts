import * as vscode from 'vscode';
import * as fs from 'fs/promises';

export function registerHelpCommand(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('blogbuddy.showHelp', () => showHelp(context)),
    );
}

async function showHelp(context: vscode.ExtensionContext): Promise<void> {
    // Pick the locale variant when VS Code is set to Chinese; otherwise English.
    const useChinese = vscode.env.language.toLowerCase().startsWith('zh');
    const helpFile = useChinese ? 'help_中文.md' : 'help.md';
    const helpUri = vscode.Uri.joinPath(context.extensionUri, 'docs', helpFile);

    let helpText: string;
    try {
        helpText = await fs.readFile(helpUri.fsPath, 'utf-8');
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to load ${helpFile}: ${msg}`);
        return;
    }

    const choice = await vscode.window.showInformationMessage(
        'View Help Information',
        'Open in Editor',
        'Close'
    );

    if (choice === 'Open in Editor') {
        const doc = await vscode.workspace.openTextDocument({
            content: helpText,
            language: 'markdown',
        });
        await vscode.window.showTextDocument(doc);
    }
}

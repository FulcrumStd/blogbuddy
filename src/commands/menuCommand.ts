// src/commands/MenuCommands.ts
import * as vscode from 'vscode';
import { UIUtils, FileUtils } from '../utils/helpers';
import { ErrorHandler } from '../utils/ErrorHandler';
import { AIProxy } from '../utils/aiProxy';


export function registerMenuCommand(context: vscode.ExtensionContext){
    const showMainMenu = vscode.commands.registerCommand('blogbuddy.menu',() => new MenuCommand().showMainMenu());
    context.subscriptions.push(showMainMenu);
}


export class MenuCommand {
    private errorHandler: ErrorHandler;

    constructor() {
        this.errorHandler = ErrorHandler.getInstance();
    }

    /**
     * Show main menu
     */
    async showMainMenu(): Promise<void> {
        await this.errorHandler.withErrorHandling(async () => {

            const menuItems = [
                {
                    label: '$(graph) Usage Statistics',
                    description: 'View AI usage statistics',
                    detail: 'Display request count, token usage, and model statistics',
                    command: 'showUsageStats'
                },
                {
                    label: '$(question) Help Information',
                    description: 'View usage instructions and FAQ',
                    detail: 'Get usage help and troubleshooting information',
                    command: 'showHelp'
                }
            ];

            const selected = await UIUtils.showQuickPick(menuItems, {
                title: 'BlogBuddy',
                matchOnDescription: true,
                matchOnDetail: true,
                ignoreFocusOut: true
            });

            if (selected) {
                await this.handleMenuSelection(selected.command);
            }
        }, 'BB menu');
    }

    /**
     * Show usage statistics
     */
    async showUsageStats(): Promise<void> {
        const aiProxy = AIProxy.getInstance();
        const stats = aiProxy.getUsageStats();
        
        let statsText = '# AI Usage Statistics\n\n';
        
        if (stats.totalRequests === 0) {
            statsText += 'No usage records yet. After you start using AI features, detailed usage statistics will be displayed here.';
        } else {
            statsText += '| Purpose | Requests | Token Usage | Model Used |\n';
            statsText += '|---------|----------|-------------|------------|\n';
            
            for (const [flag, flagStat] of stats.flagStats) {
                statsText += `| ${flag} | ${flagStat.requests} | ${flagStat.tokensUsed} | ${flagStat.model} |\n`;
            }
            
            statsText += `| **Total** | **${stats.totalRequests}** | **${stats.totalTokensUsed}** | - |\n`;
        }

        const choice = await vscode.window.showInformationMessage(
            'View AI Usage Statistics',
            'Open in Editor',
            'Reset Statistics',
            'Close'
        );

        if (choice === 'Open in Editor') {
            const doc = await vscode.workspace.openTextDocument({
                content: statsText,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        } else if (choice === 'Reset Statistics') {
            const confirm = await vscode.window.showWarningMessage(
                'Are you sure you want to reset all usage statistics? This action cannot be undone.',
                'Confirm',
                'Cancel'
            );
            if (confirm === 'Confirm') {
                aiProxy.resetUsageStats();
                vscode.window.showInformationMessage('Usage statistics have been reset');
            }
        }
    }

    /**
     * Handle menu selection
     */
    private async handleMenuSelection(command: string): Promise<void> {
        switch (command) {
            case 'showUsageStats':
                await this.showUsageStats();
                break;
            case 'showHelp':
                await this.showHelp();
                break;

            default:
                vscode.window.showWarningMessage(`Unknown command: ${command}`);
        }
    }


    /**
     * Show help information
     */
    private async showHelp(): Promise<void> {
        try {
            // Get the workspace root path and construct help.md path
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found. Cannot load help file.');
                return;
            }

            const helpFilePath = vscode.Uri.joinPath(workspaceFolder.uri, 'docs', 'help.md').fsPath;
            const helpText = await FileUtils.readFileContentAsync(helpFilePath, ['.md']);
            
            if (!helpText) {
                vscode.window.showErrorMessage('Failed to load docs/help.md file. Please ensure the file exists in the docs directory.');
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
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load help information: ${error}`);
        }
    }
}

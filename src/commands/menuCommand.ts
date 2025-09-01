// src/commands/MenuCommands.ts
import * as vscode from 'vscode';
import { UIUtils, FileUtils } from '../utils/helpers';
import { ErrorHandler } from '../utils/ErrorHandler';
import { AIService } from '../services/AIService';


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
        const aiService = AIService.getInstance();
        const stats = aiService.getUsageStats();
        const isPricingAvailable = aiService.isPricingAvailable();
        
        let statsText = '# AI Usage Statistics\n\n';
        
        if (stats.totalRequests === 0) {
            statsText += 'No usage records yet. After you start using AI features, detailed usage statistics will be displayed here.';
        } else {
            // Add pricing status information
            if (isPricingAvailable) {
                statsText += '💰 **Pricing Data**: Available (costs calculated)\n\n';
            } else {
                statsText += '⚠️ **Pricing Data**: Unavailable (costs not calculated)\n\n';
            }

            // Create header based on whether pricing is available
            if (isPricingAvailable) {
                statsText += '| Purpose | Requests | Token Usage | Cost (USD) | Model Used |\n';
                statsText += '|---------|----------|-------------|------------|------------|\n';
                
                for (const [flag, flagStat] of stats.flagStats) {
                    const cost = flagStat.cost !== undefined ? `$${flagStat.cost.toFixed(5)}` : 'N/A';
                    statsText += `| ${flag} | ${flagStat.requests} | ${flagStat.tokensUsed} | ${cost} | ${flagStat.model} |\n`;
                }
                
                const totalCost = stats.totalCost !== undefined ? `$${stats.totalCost.toFixed(5)}` : 'N/A';
                statsText += `| **Total** | **${stats.totalRequests}** | **${stats.totalTokensUsed}** | **${totalCost}** | - |\n`;
            } else {
                statsText += '| Purpose | Requests | Token Usage | Model Used |\n';
                statsText += '|---------|----------|-------------|------------|\n';
                
                for (const [flag, flagStat] of stats.flagStats) {
                    statsText += `| ${flag} | ${flagStat.requests} | ${flagStat.tokensUsed} | ${flagStat.model} |\n`;
                }
                
                statsText += `| **Total** | **${stats.totalRequests}** | **${stats.totalTokensUsed}** | - |\n`;
            }

            // Add model breakdown if available
            if (stats.modelStats.size > 1) {
                statsText += '\n## Model Breakdown\n\n';
                
                if (isPricingAvailable) {
                    statsText += '| Model | Requests | Token Usage | Cost (USD) |\n';
                    statsText += '|-------|----------|-------------|-----------|\n';
                    
                    for (const [model, modelStat] of stats.modelStats) {
                        const cost = modelStat.cost !== undefined ? `$${modelStat.cost.toFixed(5)}` : 'N/A';
                        statsText += `| ${model} | ${modelStat.requests} | ${modelStat.tokensUsed} | ${cost} |\n`;
                    }
                } else {
                    statsText += '| Model | Requests | Token Usage |\n';
                    statsText += '|-------|----------|-------------|\n';
                    
                    for (const [model, modelStat] of stats.modelStats) {
                        statsText += `| ${model} | ${modelStat.requests} | ${modelStat.tokensUsed} |\n`;
                    }
                }
            }
        }

        const choice = await vscode.window.showInformationMessage(
            'View AI Usage Statistics',
            'Open in Editor',
            'Reset Statistics',
            'Refresh Pricing',
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
                aiService.resetUsageStats();
                vscode.window.showInformationMessage('Usage statistics have been reset');
            }
        } else if (choice === 'Refresh Pricing') {
            vscode.window.showInformationMessage('Refreshing pricing data...');
            const success = await aiService.refreshPricing();
            if (success) {
                vscode.window.showInformationMessage('Pricing data refreshed successfully');
                // Show updated stats
                await this.showUsageStats();
            } else {
                vscode.window.showWarningMessage('Failed to refresh pricing data');
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

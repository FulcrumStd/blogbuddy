import * as vscode from 'vscode';
import { AIService } from '../services/AIService';

export function registerUsageStatsCommand(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('blogbuddy.showUsageStats', () => showUsageStats()),
    );
}

async function showUsageStats(): Promise<void> {
    const aiService = AIService.getInstance();
    const stats = aiService.getUsageStats();
    const isPricingAvailable = aiService.isPricingAvailable();

    let statsText = '# AI Usage Statistics\n\n';

    if (stats.totalRequests === 0) {
        statsText += 'No usage records yet. After you start using AI features, detailed usage statistics will be displayed here.';
    } else {
        if (isPricingAvailable) {
            statsText += '💰 **Pricing Data**: Available (costs calculated)\n\n';
        } else {
            statsText += '⚠️ **Pricing Data**: Unavailable (costs not calculated)\n\n';
        }

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
            // Re-show the (now updated) stats.
            await showUsageStats();
        } else {
            vscode.window.showWarningMessage('Failed to refresh pricing data');
        }
    }
}

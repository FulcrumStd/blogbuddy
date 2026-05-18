import * as vscode from 'vscode';
import { AIService } from '../services/AIService';

export function registerUsageStatsCommand(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('blogbuddy.showUsageStats', () => showUsageStats()),
        vscode.commands.registerCommand('blogbuddy.resetUsageStats', () => resetUsageStats()),
        vscode.commands.registerCommand('blogbuddy.refreshPricing', () => refreshPricing()),
    );
}

async function showUsageStats(): Promise<void> {
    const aiService = AIService.getInstance();
    const stats = aiService.getUsageStats();
    const isPricingAvailable = aiService.isPricingAvailable();

    if (stats.totalRequests === 0) {
        vscode.window.showInformationMessage(
            'No BB usage records yet. Run some BB commands first and statistics will show up here.',
        );
        return;
    }

    let statsText = '# AI Usage Statistics\n\n';

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

    statsText += '\n---\n\n';
    statsText += '> Run **BlogBuddy: Reset Usage Statistics** from the command palette to clear all counters.  \n';
    statsText += '> Run **BlogBuddy: Refresh Pricing Data** to re-fetch pricing from the provider.\n';

    const doc = await vscode.workspace.openTextDocument({
        content: statsText,
        language: 'markdown',
    });
    await vscode.window.showTextDocument(doc);
}

async function resetUsageStats(): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
        'Reset all BB usage statistics? This cannot be undone.',
        { modal: true },
        'Reset',
    );
    if (confirm !== 'Reset') { return; }
    AIService.getInstance().resetUsageStats();
    vscode.window.showInformationMessage('BB usage statistics have been reset.');
}

async function refreshPricing(): Promise<void> {
    const aiService = AIService.getInstance();
    const success = await aiService.refreshPricing();
    if (success) {
        vscode.window.showInformationMessage('BB pricing data refreshed.');
    } else {
        vscode.window.showWarningMessage('Failed to refresh BB pricing data.');
    }
}

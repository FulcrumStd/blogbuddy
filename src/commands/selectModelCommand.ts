import * as vscode from 'vscode';
import { AIService } from '../services/AIService';
import { ConfigService } from '../services/ConfigService';

export function registerSelectModelCommand(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('blogbuddy.selectModel', () => selectModel()),
    );
}

const CUSTOM_ENTRY_LABEL = '$(edit) Enter custom model…';

type FetchOutcome =
    | { ok: true; models: string[] }
    | { ok: false; error: string };

async function fetchModels(): Promise<FetchOutcome> {
    try {
        const models = await AIService.getInstance().fetchAvailableModels();
        return { ok: true, models };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg };
    }
}

async function selectModel(): Promise<void> {
    const configService = ConfigService.getInstance();
    const currentConfig = configService.getAllConfig();

    if (!currentConfig.apiKey) {
        const action = await vscode.window.showWarningMessage(
            'Set blogbuddy.apiKey first (or BLOGBUDDY_API_KEY / OPENAI_API_KEY env var).',
            'Open Settings',
        );
        if (action === 'Open Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'blogbuddy');
        }
        return;
    }

    const outcome = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'BlogBuddy: fetching model list…',
            cancellable: false,
        },
        fetchModels,
    );

    // On failure, show the real error and give the user three options:
    // retry, enter a model manually, or cancel.
    if (!outcome.ok) {
        const choice = await vscode.window.showErrorMessage(
            `Failed to fetch model list from ${currentConfig.baseURL}: ${outcome.error}`,
            'Retry',
            'Enter Manually',
        );
        if (choice === 'Retry') {
            return selectModel();
        }
        if (choice === 'Enter Manually') {
            await promptForCustomModel(currentConfig.model);
        }
        return;
    }

    const items: vscode.QuickPickItem[] = [
        { label: CUSTOM_ENTRY_LABEL, description: 'Type a model id not in the list' },
    ];

    if (outcome.models.length === 0) {
        items.push({
            label: '$(warning) No models returned',
            description: 'The /v1/models endpoint returned an empty list',
            detail: 'Use "Enter custom model…" above.',
        });
    } else {
        for (const id of outcome.models) {
            items.push({
                label: id,
                description: id === currentConfig.model ? '$(check) current' : undefined,
            });
        }
    }

    const picked = await vscode.window.showQuickPick(items, {
        title: 'BlogBuddy: Select Model',
        placeHolder: currentConfig.model
            ? `Current: ${currentConfig.model}`
            : 'Pick a model or enter a custom id',
        matchOnDescription: true,
        ignoreFocusOut: true,
    });

    if (!picked) { return; }

    if (picked.label === CUSTOM_ENTRY_LABEL) {
        await promptForCustomModel(currentConfig.model);
        return;
    }
    if (picked.label.startsWith('$(')) {
        // Warning/info entry — do nothing.
        return;
    }

    await applyModel(picked.label);
}

async function promptForCustomModel(prefill: string): Promise<void> {
    const chosen = await vscode.window.showInputBox({
        title: 'BlogBuddy: Enter custom model id',
        value: prefill,
        placeHolder: 'e.g. openai/gpt-4o-mini',
        ignoreFocusOut: true,
        validateInput: (v) => v.trim() === '' ? 'Model id cannot be empty' : null,
    });
    const trimmed = chosen?.trim();
    if (!trimmed) { return; }
    await applyModel(trimmed);
}

async function applyModel(model: string): Promise<void> {
    await ConfigService.getInstance().setModel(model);
    vscode.window.showInformationMessage(`BlogBuddy model set to: ${model}`);
}

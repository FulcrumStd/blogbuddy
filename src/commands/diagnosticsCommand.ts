import * as vscode from 'vscode';
import { ConfigService, ConfigKey } from '../services/ConfigService';

export function registerDiagnosticsCommand(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('blogbuddy.showDiagnostics', () => showDiagnostics()),
    );
}

function mask(value: string): string {
    if (!value) { return '(empty)'; }
    if (value.length <= 8) { return '*'.repeat(value.length); }
    return `${value.slice(0, 4)}…${value.slice(-4)} (len=${value.length})`;
}

function envProbe(name: string): string {
    const env = (typeof process !== 'undefined' && process.env) || {};
    const raw = env[name];
    if (raw === undefined) { return '(undefined)'; }
    if (raw === '') { return '(empty string)'; }
    // API keys and URLs can both be sensitive — mask everything.
    return mask(raw);
}

async function showDiagnostics(): Promise<void> {
    const configSection = vscode.workspace.getConfiguration('blogbuddy');
    const apiKeyConfig = configSection.get<string>(ConfigKey.API_KEY, '');
    const baseURLConfig = configSection.get<string>(ConfigKey.BASE_URL, '');
    const modelConfig = configSection.get<string>(ConfigKey.MODEL, '');

    const resolved = ConfigService.getInstance().getAllConfig();

    const lines: string[] = [];
    lines.push('# BlogBuddy — Config Diagnostics');
    lines.push('');
    lines.push('What the extension host (NOT the renderer DevTools console) actually sees.');
    lines.push('Priority: settings value → BLOGBUDDY_* env → OPENAI_* env.');
    lines.push('baseURL also falls back to https://api.openai.com/v1 as a final default.');
    lines.push('');

    lines.push('## Settings (vscode.workspace.getConfiguration)');
    lines.push('');
    lines.push('| Key | Value |');
    lines.push('| --- | --- |');
    lines.push(`| blogbuddy.apiKey | ${mask(apiKeyConfig)} |`);
    lines.push(`| blogbuddy.baseURL | ${baseURLConfig || '(empty)'} |`);
    lines.push(`| blogbuddy.model | ${modelConfig || '(empty)'} |`);
    lines.push('');

    lines.push('## Environment variables (process.env in the extension host)');
    lines.push('');
    lines.push('| Var | Value |');
    lines.push('| --- | --- |');
    lines.push(`| BLOGBUDDY_API_KEY | ${envProbe('BLOGBUDDY_API_KEY')} |`);
    lines.push(`| OPENAI_API_KEY | ${envProbe('OPENAI_API_KEY')} |`);
    lines.push(`| BLOGBUDDY_BASE_URL | ${envProbe('BLOGBUDDY_BASE_URL')} |`);
    lines.push(`| OPENAI_BASE_URL | ${envProbe('OPENAI_BASE_URL')} |`);
    lines.push('');

    lines.push('## Resolved (what BB commands will actually use)');
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('| --- | --- |');
    lines.push(`| apiKey | ${mask(resolved.apiKey)} |`);
    lines.push(`| baseURL | ${resolved.baseURL || '(empty)'} |`);
    lines.push(`| model | ${resolved.model || '(empty)'} |`);
    lines.push('');

    lines.push('## Notes');
    lines.push('');
    lines.push('- If an env var shows `(undefined)` here but your shell has it set,');
    lines.push('  VS Code was launched from a context that did not inherit your shell env');
    lines.push('  (typical for Dock / Spotlight launches on macOS).');
    lines.push('- Quitting VS Code fully (⌘Q) and launching from a terminal with `code .`');
    lines.push('  is the simplest fix.');
    lines.push('- Editing ~/.zshrc does NOT affect an already-running VS Code process.');

    const doc = await vscode.workspace.openTextDocument({
        content: lines.join('\n'),
        language: 'markdown',
    });
    await vscode.window.showTextDocument(doc, { preview: false });
}

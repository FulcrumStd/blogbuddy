import * as vscode from 'vscode';
import { ConfigService, ResolutionSource } from '../services/ConfigService';

const SOURCE_LABEL: Record<ResolutionSource, string> = {
    'settings': 'settings.json',
    'env:BLOGBUDDY_API_KEY': '$BLOGBUDDY_API_KEY',
    'env:OPENAI_API_KEY': '$OPENAI_API_KEY',
    'env:BLOGBUDDY_BASE_URL': '$BLOGBUDDY_BASE_URL',
    'env:OPENAI_BASE_URL': '$OPENAI_BASE_URL',
    'default': 'default (https://api.openai.com/v1)',
    'none': '— not set —',
};

export function registerConfigStatusBar(context: vscode.ExtensionContext): void {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    item.command = 'blogbuddy.showDiagnostics';
    context.subscriptions.push(item);

    update(item);
    item.show();

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('blogbuddy')) { update(item); }
        }),
    );
}

function update(item: vscode.StatusBarItem): void {
    const sources = ConfigService.getInstance().getSources();
    const resolved = ConfigService.getInstance().getAllConfig();

    const warnBg = new vscode.ThemeColor('statusBarItem.warningBackground');

    if (sources.apiKey === 'none') {
        item.text = '$(warning) BB: no key';
        item.backgroundColor = warnBg;
    } else if (sources.model === 'none') {
        item.text = '$(warning) BB: no model';
        item.backgroundColor = warnBg;
    } else {
        item.text = `$(key) BB · ${shortSource(sources.apiKey)}`;
        item.backgroundColor = undefined;
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;
    md.appendMarkdown('**BlogBuddy config sources**\n\n');
    md.appendMarkdown('| Field | Source |\n| --- | --- |\n');
    md.appendMarkdown(`| apiKey | ${SOURCE_LABEL[sources.apiKey]} |\n`);
    md.appendMarkdown(`| baseURL | ${SOURCE_LABEL[sources.baseURL]} |\n`);
    md.appendMarkdown(`| model | ${sources.model === 'settings' ? `\`${resolved.model}\`` : SOURCE_LABEL[sources.model]} |\n`);
    md.appendMarkdown(`\n[$(gear) Diagnostics](command:blogbuddy.showDiagnostics) · [$(list-selection) Select Model](command:blogbuddy.selectModel) · [$(settings-gear) Settings](command:workbench.action.openSettings?${encodeURIComponent('"blogbuddy"')})`);
    item.tooltip = md;
}

function shortSource(s: ResolutionSource): string {
    switch (s) {
        case 'settings': return 'cfg';
        case 'env:BLOGBUDDY_API_KEY':
        case 'env:OPENAI_API_KEY':
        case 'env:BLOGBUDDY_BASE_URL':
        case 'env:OPENAI_BASE_URL':
            return 'env';
        case 'default': return 'default';
        case 'none': return 'none';
    }
}

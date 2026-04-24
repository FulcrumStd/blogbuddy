import * as vscode from 'vscode';
import { MarkdownStatsAnalyzer } from '../utils/MarkdownStatsAnalyzer';

export function registerDocumentInfoCommand(context: vscode.ExtensionContext) {
    const display = new DocumentInfoStatusBar(context);
    context.subscriptions.push(display);
}

class DocumentInfoStatusBar implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private readonly markdownAnalyzer = new MarkdownStatsAnalyzer();
    private readonly statusBarItem: vscode.StatusBarItem;
    private updateTimeout?: NodeJS.Timeout;

    constructor(context: vscode.ExtensionContext) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100,
        );
        this.statusBarItem.tooltip = 'Document word count';
        context.subscriptions.push(this.statusBarItem);

        this.setupEventListeners();
        // Initial render.
        this.scheduleUpdate();
    }

    private setupEventListeners(): void {
        this.disposables.push(
            vscode.window.onDidChangeTextEditorSelection(() => this.scheduleUpdate()),
            vscode.window.onDidChangeActiveTextEditor(() => this.scheduleUpdate()),
            vscode.workspace.onDidChangeTextDocument((event) => {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && event.document === activeEditor.document) {
                    this.scheduleUpdate();
                }
            }),
        );
    }

    private scheduleUpdate(): void {
        if (this.updateTimeout) { clearTimeout(this.updateTimeout); }
        this.updateTimeout = setTimeout(() => this.refresh(), 300);
    }

    private refresh(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
            this.statusBarItem.hide();
            return;
        }

        try {
            const content = editor.document.getText();
            const stats = this.markdownAnalyzer.analyze(content);
            const totalWords = stats.chineseCharacters + stats.englishWords;
            this.statusBarItem.text = `$(edit) ${totalWords} words`;
            this.statusBarItem.show();
        } catch (error) {
            console.error('Failed to analyze document:', error);
            this.statusBarItem.hide();
        }
    }

    public dispose(): void {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = undefined;
        }
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.statusBarItem.hide();
        this.statusBarItem.dispose();
    }
}

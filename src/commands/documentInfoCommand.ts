import * as vscode from 'vscode';
import { MarkdownStatsAnalyzer } from '../utils/MarkdownStatsAnalyzer';
import { extractFrontmatter } from '../utils/frontmatter';
import { editorStatus } from '../services/EditorStatus';
import type { EditorDocumentStats } from '../services/webviewProtocol';

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
        context.subscriptions.push(this.statusBarItem);

        this.setupEventListeners();
        // Initial render.
        this.scheduleUpdate();
    }

    private setupEventListeners(): void {
        this.disposables.push(
            editorStatus.onDidChange(() => this.scheduleUpdate()),
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
        const live = editorStatus.current;
        if (live) {
            this.show(live);
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
            this.statusBarItem.hide();
            return;
        }

        try {
            const content = editor.document.getText();
            const stats = this.markdownAnalyzer.analyze(extractFrontmatter(content).body);
            const selected = editor.selection.isEmpty
                ? undefined : this.markdownAnalyzer.analyze(editor.document.getText(editor.selection));
            this.show({
                words: stats.chineseCharacters + stats.englishWords,
                characters: stats.totalCharacters,
                lines: editor.document.lineCount,
                selectedWords: selected ? selected.chineseCharacters + selected.englishWords : 0,
            });
        } catch (error) {
            console.error('Failed to analyze document:', error);
            this.statusBarItem.hide();
        }
    }

    /** Same label and tooltip for the BB Editor and the plain text editor. */
    private show(stats: EditorDocumentStats): void {
        this.statusBarItem.text = `$(edit) ${stats.words} 字${stats.selectedWords ? ` · 已选 ${stats.selectedWords}` : ''}`;
        this.statusBarItem.tooltip = `${stats.characters} 字符 · ${stats.lines} 行`;
        this.statusBarItem.show();
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

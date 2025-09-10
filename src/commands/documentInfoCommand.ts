import * as vscode from 'vscode';
import { MarkdownStatsAnalyzer } from '../utils/MarkdownStatsAnalyzer';
import { ConfigService } from '../services/ConfigService';

export function registerDocumentInfoCommand(context: vscode.ExtensionContext) {
    const documentInfoCommand = new DocumentInfoCommand(context);
    context.subscriptions.push(vscode.commands.registerCommand(
        'blogbuddy.toggleDocumentInfo',
        () => documentInfoCommand.toggleDocumentInfo()
    ));
}

class DocumentInfoCommand {
    private static currentStats: any = null;
    private disposables: vscode.Disposable[] = [];
    private configService: ConfigService;
    private markdownAnalyzer: MarkdownStatsAnalyzer;
    private updateTimeout?: NodeJS.Timeout;
    private statusBarItem: vscode.StatusBarItem;

    constructor(private context: vscode.ExtensionContext) {
        this.configService = ConfigService.getInstance();
        this.markdownAnalyzer = new MarkdownStatsAnalyzer();
        
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        this.statusBarItem.tooltip = 'Document Word Count - Click to toggle';
        this.statusBarItem.command = 'blogbuddy.toggleDocumentInfo';
        
        // Add to context subscriptions
        this.context.subscriptions.push(this.statusBarItem);
        
        // Setup event listeners - always active, logic handled inside
        this.setupEventListeners();
    }

    public async toggleDocumentInfo(): Promise<void> {
        try {
            const config = this.configService.getAllConfig();
            const newValue = !config.documentInfoDisplay;
            
            // Update configuration
            await vscode.workspace.getConfiguration('blogbuddy').update(
                'documentInfoDisplay',
                newValue,
                vscode.ConfigurationTarget.Global
            );
            
            if (newValue) {
                vscode.window.showInformationMessage('Document word count display enabled');
                // Trigger immediate update
                this.handleDocumentChange();
            } else {
                vscode.window.showInformationMessage('Document word count display disabled');
                // Hide status bar item
                this.statusBarItem.hide();
                DocumentInfoCommand.currentStats = null;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to toggle document info: ${error}`);
        }
    }

    private setupEventListeners(): void {
        // Listen for cursor position changes
        const selectionChangeDisposable = vscode.window.onDidChangeTextEditorSelection(
            () => this.scheduleUpdate()
        );
        this.disposables.push(selectionChangeDisposable);

        // Listen for active editor changes
        const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(
            () => this.scheduleUpdate()
        );
        this.disposables.push(editorChangeDisposable);

        // Listen for document changes
        const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
            (event) => {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && event.document === activeEditor.document) {
                    this.scheduleUpdate();
                }
            }
        );
        this.disposables.push(documentChangeDisposable);
    }

    private scheduleUpdate(): void {
        // Clear existing timeout
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        // Schedule update with debouncing
        this.updateTimeout = setTimeout(() => {
            this.handleDocumentChange();
        }, 300);
    }

    private handleDocumentChange(): void {
        // 1. Check if configuration is enabled
        const config = this.configService.getAllConfig();
        if (!config.documentInfoDisplay) {
            // Configuration disabled, hide status bar and return
            this.statusBarItem.hide();
            DocumentInfoCommand.currentStats = null;
            return;
        }

        // 2. Check if current document is markdown
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.statusBarItem.hide();
            DocumentInfoCommand.currentStats = null;
            return;
        }

        if (editor.document.languageId !== 'markdown') {
            // Not a markdown file, hide status bar and return
            this.statusBarItem.hide();
            DocumentInfoCommand.currentStats = null;
            return;
        }

        // 3. Analyze document and store in static variable
        try {
            const content = editor.document.getText();
            const stats = this.markdownAnalyzer.analyze(content);
            DocumentInfoCommand.currentStats = stats;
            
            // 4. Update status bar
            this.updateStatusBar(stats);
        } catch (error) {
            console.error('Failed to analyze document:', error);
            DocumentInfoCommand.currentStats = null;
            this.statusBarItem.hide();
        }
    }

    private updateStatusBar(stats: any): void {
        // Calculate total words (Chinese characters + English words)
        const totalWords = stats.chineseCharacters + stats.englishWords;
        
        // Format display text - simplified to show only word count
        let displayText: string = `$(edit) ${totalWords} words`;
        
        this.statusBarItem.text = displayText;
        this.statusBarItem.show();
    }

    public dispose(): void {
        // Clear timeout
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = undefined;
        }
        
        // Dispose all event listeners
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
        
        // Hide and dispose status bar
        this.statusBarItem.hide();
        this.statusBarItem.dispose();
        DocumentInfoCommand.currentStats = null;
    }

    // Static method to get current stats from anywhere in the extension
    public static getCurrentStats(): any {
        return DocumentInfoCommand.currentStats;
    }
}
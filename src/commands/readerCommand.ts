import * as vscode from 'vscode';
import * as path from 'path';
import { getPresetDisplayName, RenderCmd, runReaderStream } from '../core/reader';
import { AIService } from '../services/AIService';
import { extractFrontmatter } from '../utils/frontmatter';
import type { ReaderHostMessage, ReaderWebviewMessage } from '../services/webviewProtocol';

export function registerReaderCommand(_context: vscode.ExtensionContext): void {
    // No contributed VS Code command in v1 — Reader is fired exclusively via
    // bb-render* tags routed through blogbuddy.bb. This registrar exists so
    // future entry points (right-click, palette) can be added without rewriting
    // the call site in commands/index.ts.
}

export class ReaderPanel implements vscode.Disposable {
    private static panels = new Map<string, ReaderPanel>();

    /**
     * Open a Reader panel for the given document (revealing it if one already
     * exists for the same source URI). After this returns, the panel is loaded
     * and has received `reader-init`. Streaming is kicked off in Task 9.
     */
    static async openForDocument(
        context: vscode.ExtensionContext,
        sourceDoc: vscode.TextDocument,
        cmd: RenderCmd,
        userPrompt: string,
    ): Promise<void> {
        const key = sourceDoc.uri.toString();
        const existing = ReaderPanel.panels.get(key);
        if (existing) {
            existing.panel.reveal(vscode.ViewColumn.Beside, /* preserveFocus */ false);
            existing.applyNewRequest(cmd, userPrompt);
            return;
        }
        const panel = new ReaderPanel(context, sourceDoc, cmd, userPrompt);
        ReaderPanel.panels.set(key, panel);
        panel.panel.onDidDispose(() => {
            ReaderPanel.panels.delete(key);
            panel.dispose();
        });
        await panel.bootstrap();
    }

    private readonly panel: vscode.WebviewPanel;
    private readonly disposables: vscode.Disposable[] = [];
    private cmd: RenderCmd;
    private userPrompt: string;
    private webviewReady = false;
    private pendingInit = false;
    private generationId = 0;       // increments on each new run, used to discard stale chunks
    private generating = false;
    private hasRenderedOnce = false;
    private startTime = 0;
    private fullText = '';

    private constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly sourceDoc: vscode.TextDocument,
        cmd: RenderCmd,
        userPrompt: string,
    ) {
        this.cmd = cmd;
        this.userPrompt = userPrompt;

        const sourceDir = path.dirname(sourceDoc.uri.fsPath);
        this.panel = vscode.window.createWebviewPanel(
            'blogbuddy.reader',
            `BB Reader: ${path.basename(sourceDoc.uri.fsPath)}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'dist'),
                    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview-reader'),
                    vscode.Uri.file(sourceDir),
                ],
            },
        );

        this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png');
        this.panel.webview.html = this.getWebviewHtml();

        this.disposables.push(
            this.panel.webview.onDidReceiveMessage((m: ReaderWebviewMessage) => this.onMessage(m)),
            vscode.window.onDidChangeActiveColorTheme((t) => this.postTheme(t.kind)),
        );
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((e) => {
                if (e.document.uri.toString() !== this.sourceDoc.uri.toString()) { return; }
                if (!this.hasRenderedOnce || this.generating) { return; }
                this.post({ type: 'reader-source-changed' });
            }),
            vscode.workspace.onDidCloseTextDocument((doc) => {
                if (doc.uri.toString() !== this.sourceDoc.uri.toString()) { return; }
                this.post({ type: 'reader-source-closed' });
            }),
        );
    }

    private applyNewRequest(cmd: RenderCmd, userPrompt: string): void {
        this.cmd = cmd;
        this.userPrompt = userPrompt;
        this.sendInit();
        void this.startGeneration();
    }

    private async bootstrap(): Promise<void> {
        this.pendingInit = true;
        if (this.webviewReady) {
            this.sendInit();
            void this.startGeneration();
        }
    }

    private onMessage(msg: ReaderWebviewMessage): void {
        switch (msg.type) {
            case 'reader-ready':
                this.webviewReady = true;
                if (this.pendingInit) {
                    this.sendInit();
                    void this.startGeneration();
                    this.pendingInit = false;
                }
                break;
            case 'reader-regenerate':
                void this.startGeneration();
                break;
            // Other messages handled in Tasks 11+.
            default: break;
        }
    }

    private async startGeneration(): Promise<void> {
        const myId = ++this.generationId;
        this.generating = true;
        this.startTime = Date.now();
        this.fullText = '';

        const { frontmatter, body } = extractFrontmatter(this.sourceDoc.getText());

        // Snapshot cumulative usage so we can show THIS render's delta, not the
        // running total across all renders since the extension started.
        const baseTokens = readFlagTokens('render');
        const baseCost = readFlagCost('render');

        this.post({ type: 'reader-start' });

        let stream: AsyncGenerator<string, string, unknown>;
        try {
            stream = await runReaderStream({
                cmd: this.cmd,
                userPrompt: this.userPrompt,
                frontmatter,
                body,
                sourceFileName: path.basename(this.sourceDoc.uri.fsPath),
            });
        } catch (err) {
            if (myId === this.generationId) {
                this.post({ type: 'reader-error', message: (err as Error).message });
                this.generating = false;
            }
            return;
        }

        try {
            for await (const chunk of stream) {
                if (myId !== this.generationId) {
                    // A newer generation started; drop this stream's output. The
                    // underlying HTTP request continues until OpenAI finishes, but
                    // we ignore further chunks.
                    return;
                }
                this.fullText += chunk;
                this.post({ type: 'reader-chunk', text: chunk });
            }
            if (myId !== this.generationId) { return; }

            // Compute the delta for this render.
            const tokensUsed = readFlagTokens('render') - baseTokens;
            const costDelta = readFlagCost('render') - baseCost;
            const costUsd = costDelta > 0 ? costDelta : undefined;

            this.post({
                type: 'reader-done',
                fullHtml: this.fullText,
                tokensUsed,
                costUsd,
                durationMs: Date.now() - this.startTime,
            });
            this.generating = false;
            this.hasRenderedOnce = true;
        } catch (err) {
            if (myId === this.generationId) {
                this.post({ type: 'reader-error', message: (err as Error).message });
                this.generating = false;
            }
        }
    }

    private sendInit(): void {
        const sourceDir = path.dirname(this.sourceDoc.uri.fsPath);
        const baseUri = this.panel.webview.asWebviewUri(vscode.Uri.file(sourceDir)).toString();
        const text = this.sourceDoc.getText();
        const estInputTokens = Math.ceil(text.length / 4);

        this.post({
            type: 'reader-init',
            sourceFileName: path.basename(this.sourceDoc.uri.fsPath),
            preset: getPresetDisplayName(this.cmd),
            userPrompt: this.userPrompt,
            baseUri,
            estInputTokens,
        });
        this.postTheme(vscode.window.activeColorTheme.kind);
    }

    private postTheme(kind: vscode.ColorThemeKind): void {
        this.post({
            type: 'reader-theme',
            kind: kind === vscode.ColorThemeKind.Light
                ? 'light'
                : kind === vscode.ColorThemeKind.HighContrast || kind === vscode.ColorThemeKind.HighContrastLight
                    ? 'highContrast'
                    : 'dark',
        });
    }

    private post(msg: ReaderHostMessage): void {
        this.panel.webview.postMessage(msg);
    }

    private getWebviewHtml(): string {
        const webview = this.panel.webview;
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview-reader.js'),
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview-reader', 'styles.css'),
        );
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   style-src 'unsafe-inline' ${webview.cspSource};
                   script-src 'unsafe-inline' 'nonce-${nonce}';
                   img-src ${webview.cspSource} data: https:;
                   font-src ${webview.cspSource};
                   connect-src 'none';">
    <link href="${styleUri}" rel="stylesheet">
    <title>BB Reader</title>
</head>
<body>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    dispose(): void {
        this.generationId++; // invalidates the running for-await loop
        this.disposables.forEach(d => d.dispose());
        this.disposables.length = 0;
        try { this.panel.dispose(); } catch { /* already disposed */ }
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function readFlagTokens(flag: string): number {
    return AIService.getInstance().getUsageStatsByFlag(flag)?.tokensUsed ?? 0;
}
function readFlagCost(flag: string): number {
    const all = AIService.getInstance().getUsageStats();
    return all.flagStats.get(flag)?.cost ?? 0;
}

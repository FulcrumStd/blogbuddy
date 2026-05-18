import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getPresetDisplayName, RenderCmd, runReaderStream } from '../core/reader';
import { AIService } from '../services/AIService';
import { extractFrontmatter } from '../utils/frontmatter';
import { inlineImageAssets } from '../utils/assetInliner';
import type { ReaderHostMessage, ReaderWebviewMessage } from '../services/webviewProtocol';

export function registerReaderCommand(_context: vscode.ExtensionContext): void {
    // No contributed VS Code command in v1 — Reader is fired exclusively via
    // bb-render* tags routed through blogbuddy.bb. This registrar exists so
    // future entry points (right-click, palette) can be added without rewriting
    // the call site in commands/index.ts.
}

export class ReaderPanel implements vscode.Disposable {
    private static panels = new Map<string, ReaderPanel>();
    private static readonly LARGE_INPUT_TOKEN_THRESHOLD = 25_000;

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
    private styleReferenceName?: string;   // basename of the loaded .bbreader.md, if any

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
        );
        // Note: we intentionally do NOT listen for onDidCloseTextDocument. VS Code
        // fires that event whenever the TextDocument is "disposed" — which happens
        // routinely for documents that aren't displayed in a visible editor (e.g.
        // when the source was opened via BB Editor, or when the user dispatched
        // from a plain editor and then switched away). The cached getText() still
        // returns valid content after close, so regeneration would actually work.
        // True file deletion is a separate signal that needs a FileSystemWatcher.
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
                if (msg.userPrompt !== undefined) {
                    this.userPrompt = msg.userPrompt;
                    // Re-emit init so the webview state stays in sync (preset
                    // label, prompt echo). startGeneration will follow.
                    this.sendInit();
                }
                void this.startGeneration();
                break;
            case 'reader-export':
                void this.handleExport();
                break;
            default: break;
        }
    }

    private async startGeneration(): Promise<void> {
        const fullSource = this.sourceDoc.getText();

        // Load the optional .bbreader.md style reference. Each generation re-reads
        // it so edits propagate to subsequent renders without restarting the panel.
        const styleRef = await loadStyleReference(this.sourceDoc.uri);
        const refChars = styleRef?.content.length ?? 0;
        this.styleReferenceName = styleRef?.name;
        // Push an updated init message so the webview's preset label can show the
        // active reference indicator before the stream starts.
        if (this.webviewReady) { this.sendInit(); }

        const estInputTokens = Math.ceil((fullSource.length + refChars) / 4);
        if (estInputTokens > ReaderPanel.LARGE_INPUT_TOKEN_THRESHOLD) {
            const proceed = await vscode.window.showWarningMessage(
                `This file is large (~${estInputTokens.toLocaleString()} input tokens). Render anyway?`,
                { modal: true },
                'Render',
            );
            if (proceed !== 'Render') {
                this.post({ type: 'reader-error', message: 'Cancelled (large input)' });
                return;
            }
        }

        const myId = ++this.generationId;
        this.generating = true;
        this.startTime = Date.now();
        this.fullText = '';

        const { frontmatter, body } = extractFrontmatter(fullSource);

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
                styleReference: styleRef?.content,
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

    private async handleExport(): Promise<void> {
        const html = this.fullText;
        try {
            const sourcePath = this.sourceDoc.uri.fsPath;
            const sourceDir = path.dirname(sourcePath);
            const sourceBase = path.basename(sourcePath, path.extname(sourcePath));
            const defaultName = `${sourceBase}.reader.html`;
            const defaultUri = vscode.Uri.file(path.join(sourceDir, defaultName));

            const target = await vscode.window.showSaveDialog({
                defaultUri,
                filters: { 'HTML': ['html'] },
                saveLabel: 'Export AI Reader HTML',
            });
            if (!target) {
                this.post({ type: 'reader-export-result', success: false, error: 'Cancelled' });
                return;
            }

            // Inline assets unless the user opted out.
            const cfg = vscode.workspace.getConfiguration('blogbuddy.reader');
            const shouldInline = cfg.get<boolean>('inlineAssets', true);
            const finalHtml = shouldInline
                ? await inlineImageAssets(html, sourceDir)
                : html;

            await fs.writeFile(target.fsPath, finalHtml, 'utf-8');

            this.post({ type: 'reader-export-result', success: true, filePath: target.fsPath });

            const choice = await vscode.window.showInformationMessage(
                `Saved ${path.basename(target.fsPath)}`,
                'Open',
                'Show in Folder',
            );
            if (choice === 'Open') {
                await vscode.env.openExternal(target);
            } else if (choice === 'Show in Folder') {
                await vscode.commands.executeCommand('revealFileInOS', target);
            }
        } catch (err) {
            this.post({
                type: 'reader-export-result',
                success: false,
                error: (err as Error).message,
            });
            vscode.window.showErrorMessage(`Export failed: ${(err as Error).message}`);
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
            styleReferenceName: this.styleReferenceName,
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
                   frame-src 'self' blob: data: ${webview.cspSource};
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

// ---- Style reference (.bbreader.md) auto-load ----

const STYLE_REFERENCE_FILENAME = '.bbreader.md';
const STYLE_REFERENCE_MAX_CHARS = 8000;   // ~2k tokens, keeps prompt overhead bounded

/**
 * Look for a .bbreader.md file in the workspace folder containing the source
 * document. If present, return its content (truncated to STYLE_REFERENCE_MAX_CHARS
 * with a marker if larger). Returns undefined when no file exists or no
 * workspace folder applies.
 */
async function loadStyleReference(sourceUri: vscode.Uri): Promise<{ name: string; content: string } | undefined> {
    const folder = vscode.workspace.getWorkspaceFolder(sourceUri);
    if (!folder) { return undefined; }
    const refPath = path.join(folder.uri.fsPath, STYLE_REFERENCE_FILENAME);
    try {
        let content = await fs.readFile(refPath, 'utf-8');
        if (content.length > STYLE_REFERENCE_MAX_CHARS) {
            content = content.slice(0, STYLE_REFERENCE_MAX_CHARS) + '\n\n[... truncated]';
        }
        return { name: STYLE_REFERENCE_FILENAME, content };
    } catch {
        return undefined;
    }
}

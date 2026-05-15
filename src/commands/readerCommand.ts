import * as vscode from 'vscode';
import * as path from 'path';
import { getPresetDisplayName, RenderCmd } from '../core/reader';
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
    }

    private async bootstrap(): Promise<void> {
        // The webview will post 'reader-ready' once mounted; we then send init.
        this.pendingInit = true;
        if (this.webviewReady) {
            this.sendInit();
        }
    }

    private applyNewRequest(cmd: RenderCmd, userPrompt: string): void {
        this.cmd = cmd;
        this.userPrompt = userPrompt;
        this.sendInit();
    }

    private onMessage(msg: ReaderWebviewMessage): void {
        switch (msg.type) {
            case 'reader-ready':
                this.webviewReady = true;
                if (this.pendingInit) {
                    this.sendInit();
                    this.pendingInit = false;
                }
                break;
            // Other messages handled in later tasks.
            default: break;
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

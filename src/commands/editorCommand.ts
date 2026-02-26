import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WebviewBridge } from '../services/WebviewBridge';

export function registerEditorCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('blogbuddy.openEditor', async (uri?: vscode.Uri) => {
            // Keybindings don't pass the selected file URI, so try fallbacks
            if (!uri) {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.uri.fsPath.endsWith('.md')) {
                    uri = activeEditor.document.uri;
                } else {
                    // Show file picker as last resort
                    const picked = await vscode.window.showOpenDialog({
                        filters: { 'Markdown': ['md'] },
                        canSelectMany: false,
                    });
                    if (picked && picked.length > 0) {
                        uri = picked[0];
                    } else {
                        return;
                    }
                }
            }
            EditorPanel.createOrShow(context, uri);
        })
    );
}

class EditorPanel implements vscode.Disposable {
    private static panels = new Map<string, EditorPanel>();

    private panel: vscode.WebviewPanel;
    private bridge: WebviewBridge;
    private filePath?: string;
    private isDirty = false;
    private disposables: vscode.Disposable[] = [];

    static createOrShow(context: vscode.ExtensionContext, uri?: vscode.Uri): void {
        const filePath = uri?.fsPath;
        const key = filePath || `untitled-${Date.now()}`;

        const existing = filePath ? EditorPanel.panels.get(filePath) : undefined;
        if (existing) {
            existing.panel.reveal();
            return;
        }

        const panel = new EditorPanel(context, filePath);
        EditorPanel.panels.set(key, panel);

        panel.panel.onDidDispose(() => {
            EditorPanel.panels.delete(key);
            panel.dispose();
        });
    }

    private constructor(
        private context: vscode.ExtensionContext,
        filePath?: string,
    ) {
        this.filePath = filePath;
        const title = filePath ? path.basename(filePath) : 'New Document';

        this.panel = vscode.window.createWebviewPanel(
            'blogbuddy.editor',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'dist'),
                    ...(filePath ? [vscode.Uri.file(path.dirname(filePath))] : []),
                ],
            },
        );

        this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png');

        this.bridge = new WebviewBridge(this.panel, this.panel.webview, {
            filePath: this.filePath,
            onDirtyChange: (dirty) => this.setDirty(dirty),
            onReady: () => this.onWebviewReady(),
        });

        this.panel.webview.html = this.getWebviewHtml();

        // 监听主题变化
        this.disposables.push(
            vscode.window.onDidChangeActiveColorTheme((theme) => {
                this.bridge.post({
                    type: 'theme',
                    kind: theme.kind === vscode.ColorThemeKind.Light
                        ? 'light'
                        : theme.kind === vscode.ColorThemeKind.HighContrast || theme.kind === vscode.ColorThemeKind.HighContrastLight
                            ? 'highContrast'
                            : 'dark',
                });
            })
        );

        this.disposables.push(this.bridge);
    }

    private async onWebviewReady(): Promise<void> {
        // 发送主题信息
        const themeKind = vscode.window.activeColorTheme.kind;
        this.bridge.post({
            type: 'theme',
            kind: themeKind === vscode.ColorThemeKind.Light
                ? 'light'
                : themeKind === vscode.ColorThemeKind.HighContrast || themeKind === vscode.ColorThemeKind.HighContrastLight
                    ? 'highContrast'
                    : 'dark',
        });

        // 加载文件内容
        if (this.filePath) {
            try {
                const content = await fs.readFile(this.filePath, 'utf-8');
                this.bridge.sendLoad(content, this.filePath);
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Failed to read file';
                vscode.window.showErrorMessage(`Failed to open file: ${msg}`);
            }
        } else {
            this.bridge.sendLoad('');
        }
    }

    private setDirty(dirty: boolean): void {
        this.isDirty = dirty;
        const baseName = this.filePath ? path.basename(this.filePath) : 'New Document';
        this.panel.title = dirty ? `● ${baseName}` : baseName;
    }

    private getWebviewHtml(): string {
        const webview = this.panel.webview;
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.css')
        );
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   style-src ${webview.cspSource} 'unsafe-inline';
                   script-src 'nonce-${nonce}';
                   font-src ${webview.cspSource};
                   img-src ${webview.cspSource} data: https:;">
    <link href="${styleUri}" rel="stylesheet">
    <title>BB Editor</title>
</head>
<body>
    <div id="frontmatter-panel" class="frontmatter-panel frontmatter-hidden">
        <div class="frontmatter-header">
            <button id="frontmatter-toggle" class="frontmatter-toggle" title="Toggle frontmatter">
                <span class="frontmatter-icon">&#9654;</span>
                <span>Frontmatter</span>
            </button>
        </div>
        <div class="frontmatter-body">
            <textarea id="frontmatter-editor" class="frontmatter-textarea"
                      spellcheck="false"
                      placeholder="---&#10;title: &#10;date: &#10;---"></textarea>
        </div>
    </div>
    <div id="editor"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
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

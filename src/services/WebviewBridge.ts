import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BB } from '../core/bb';
import { BBCmd, ProcessRequest } from '../core/types';
import { ConfigService } from './ConfigService';
import { AppError } from '../utils/ErrorHandler';
import {
    WebviewMessage,
    HostMessage,
    WebviewBBRequestMessage,
    WebviewSaveMessage,
    WebviewFileUploadMessage,
} from './webviewProtocol';

export class WebviewBridge implements vscode.Disposable {
    private activeRequests = new Map<string, { cancelled: boolean }>();
    private disposables: vscode.Disposable[] = [];
    private filePath?: string;
    private onDirtyChange?: (isDirty: boolean) => void;
    private onReady?: () => void;
    private lastWrittenContent?: string;
    private lastBodyContent = '';
    private fileWatcher?: vscode.FileSystemWatcher;
    private storedFrontmatter = '';
    private frontmatterAutoSaveTimer?: ReturnType<typeof setTimeout>;

    constructor(
        private panel: vscode.WebviewPanel,
        private webview: vscode.Webview,
        options?: {
            filePath?: string;
            onDirtyChange?: (isDirty: boolean) => void;
            onReady?: () => void;
        }
    ) {
        this.filePath = options?.filePath;
        this.onDirtyChange = options?.onDirtyChange;
        this.onReady = options?.onReady;

        this.disposables.push(
            this.panel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
                this.handleMessage(msg);
            })
        );

        this.watchFile();
    }

    setFilePath(filePath: string): void {
        this.filePath = filePath;
    }

    post(message: HostMessage): void {
        this.panel.webview.postMessage(message);
    }

    sendLoad(content: string, filePath?: string): void {
        const { frontmatter, body } = extractFrontmatter(content);
        this.storedFrontmatter = frontmatter;
        this.lastBodyContent = body;
        this.post({ type: 'load', content: body, frontmatter, filePath, baseUri: this.getBaseUri() });
    }

    private getBaseUri(): string | undefined {
        if (!this.filePath) { return undefined; }
        return this.webview.asWebviewUri(
            vscode.Uri.file(path.dirname(this.filePath))
        ).toString();
    }

    private async handleMessage(msg: WebviewMessage): Promise<void> {
        switch (msg.type) {
            case 'ready':
                this.onReady?.();
                break;
            case 'bb-request':
                await this.handleBBRequest(msg);
                break;
            case 'bb-cancel':
                this.cancelRequest(msg.id);
                break;
            case 'save':
                await this.handleSave(msg);
                break;
            case 'open-file':
                await this.handleOpenFile();
                break;
            case 'new-file':
                this.handleNewFile();
                break;
            case 'auto-save':
                await this.handleAutoSave(msg.content);
                break;
            case 'frontmatter-update':
                this.handleFrontmatterUpdate(msg.frontmatter);
                break;
            case 'file-upload':
                await this.handleFileUpload(msg);
                break;
            case 'dirty':
                this.onDirtyChange?.(msg.isDirty);
                break;
        }
    }

    private async handleBBRequest(msg: WebviewBBRequestMessage): Promise<void> {
        const cmd = Object.values(BBCmd).find(c => c === msg.cmd);
        if (!cmd) {
            this.post({ type: 'error', id: msg.id, message: `Unknown command: ${msg.cmd}` });
            return;
        }

        const state = { cancelled: false };
        this.activeRequests.set(msg.id, state);

        try {
            const request: ProcessRequest = {
                selectText: msg.selectText,
                filePath: this.filePath || '',
                msg: msg.msg,
                cmd: cmd,
                cmdText: msg.msg ? `<${msg.cmd}:${msg.msg}>` : `<${msg.cmd}>`,
            };

            const config = ConfigService.getInstance().getAllConfig();
            let fullText = '';

            if (config.streaming) {
                const generator = await BB.i().actStreaming(request);
                for await (const chunk of generator) {
                    if (state.cancelled) { break; }
                    if (chunk.replace) {
                        fullText = chunk.text;
                    } else {
                        fullText += chunk.text;
                    }
                    this.post({
                        type: 'chunk',
                        id: msg.id,
                        text: chunk.text,
                        replace: chunk.replace,
                    });
                }
            } else {
                const response = await BB.i().act(request);
                fullText = response.replaceText;
            }

            if (!state.cancelled) {
                this.post({ type: 'done', id: msg.id, fullText });
            }
        } catch (error) {
            if (!state.cancelled) {
                const message = error instanceof AppError
                    ? error.userMessage
                    : (error instanceof Error ? error.message : 'Unknown error');
                this.post({ type: 'error', id: msg.id, message });
            }
        } finally {
            this.activeRequests.delete(msg.id);
        }
    }

    private cancelRequest(id: string): void {
        const state = this.activeRequests.get(id);
        if (state) {
            state.cancelled = true;
        }
    }

    private async handleAutoSave(content: string): Promise<void> {
        if (!this.filePath) { return; }
        this.lastBodyContent = content;
        try {
            const fullContent = this.storedFrontmatter + content;
            this.lastWrittenContent = fullContent;
            await fs.writeFile(this.filePath, fullContent, 'utf-8');
            this.onDirtyChange?.(false);
        } catch {
            // Auto-save failures are silent
        }
    }

    private handleFrontmatterUpdate(frontmatter: string): void {
        this.storedFrontmatter = frontmatter;
        this.onDirtyChange?.(true);
        // Debounced auto-save for frontmatter changes
        if (this.frontmatterAutoSaveTimer) { clearTimeout(this.frontmatterAutoSaveTimer); }
        this.frontmatterAutoSaveTimer = setTimeout(async () => {
            if (!this.filePath) { return; }
            try {
                const fullContent = this.storedFrontmatter + this.lastBodyContent;
                this.lastWrittenContent = fullContent;
                await fs.writeFile(this.filePath, fullContent, 'utf-8');
                this.onDirtyChange?.(false);
            } catch {
                // Auto-save failures are silent
            }
        }, 500);
    }

    private async handleSave(msg: WebviewSaveMessage): Promise<void> {
        try {
            if (!this.filePath) {
                const uri = await vscode.window.showSaveDialog({
                    filters: { 'Markdown': ['md'] },
                    defaultUri: vscode.Uri.file('untitled.md'),
                });
                if (!uri) {
                    this.post({ type: 'saved', success: false });
                    return;
                }
                this.filePath = uri.fsPath;
                this.watchFile();
            }

            const fullContent = this.storedFrontmatter + msg.content;
            this.lastWrittenContent = fullContent;
            await fs.writeFile(this.filePath, fullContent, 'utf-8');
            this.post({ type: 'saved', success: true, filePath: this.filePath });
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Save failed';
            vscode.window.showErrorMessage(`Failed to save file: ${errMsg}`);
            this.post({ type: 'saved', success: false });
        }
    }

    private watchFile(): void {
        if (this.fileWatcher) { this.fileWatcher.dispose(); }
        if (!this.filePath) { return; }

        const dirUri = vscode.Uri.file(path.dirname(this.filePath));
        const fileName = path.basename(this.filePath);
        const pattern = new vscode.RelativePattern(dirUri, fileName);
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

        this.fileWatcher.onDidChange(async () => {
            if (!this.filePath) { return; }
            try {
                const content = await fs.readFile(this.filePath, 'utf-8');
                if (content !== this.lastWrittenContent) {
                    this.lastWrittenContent = content;
                    this.sendLoad(content, this.filePath);
                }
            } catch {
                // File read failures are silent
            }
        });

        this.disposables.push(this.fileWatcher);
    }

    private async handleOpenFile(): Promise<void> {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'Markdown': ['md'] },
        });
        if (!uris || uris.length === 0) { return; }

        try {
            const content = await fs.readFile(uris[0].fsPath, 'utf-8');
            this.filePath = uris[0].fsPath;
            this.sendLoad(content, this.filePath);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Open failed';
            vscode.window.showErrorMessage(`Failed to open file: ${errMsg}`);
        }
    }

    private async resolveAssetDir(): Promise<string> {
        const docDir = path.dirname(this.filePath!);
        const config = ConfigService.getInstance().getAllConfig();
        const assetDir = config.assetDir?.trim();

        if (!assetDir) { return docDir; }

        // Only allow relative paths (resolved from document directory)
        if (path.isAbsolute(assetDir)) {
            vscode.window.showWarningMessage('assetDir must be a relative path. Saving to document directory.');
            return docDir;
        }

        const resolved = path.resolve(docDir, assetDir);

        // Ensure resolved path is within docDir (prevent ../ escaping)
        if (!resolved.startsWith(docDir)) {
            vscode.window.showWarningMessage('assetDir must be within the document directory. Saving to document directory.');
            return docDir;
        }

        await fs.mkdir(resolved, { recursive: true });
        return resolved;
    }

    private async handleFileUpload(msg: WebviewFileUploadMessage): Promise<void> {
        if (!this.filePath) {
            vscode.window.showWarningMessage('Please save the document first before uploading files.');
            return;
        }

        try {
            const docDir = path.dirname(this.filePath);
            const dir = await this.resolveAssetDir();
            const finalName = await getUniqueFileName(dir, msg.fileName);
            const fullPath = path.join(dir, finalName);

            const buffer = Buffer.from(msg.dataBase64, 'base64');
            await fs.writeFile(fullPath, buffer);

            const webviewUri = this.webview.asWebviewUri(vscode.Uri.file(fullPath)).toString();
            const isImage = msg.mimeType.startsWith('image/');

            // relativePath must be relative to docDir for correct markdown links
            const relativePath = path.relative(docDir, fullPath);

            this.post({
                type: 'file-uploaded',
                uploadId: msg.uploadId,
                webviewUri,
                relativePath,
                isImage,
                fileName: finalName,
            });
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Upload failed';
            vscode.window.showErrorMessage(`Failed to save file: ${errMsg}`);
        }
    }

    private handleNewFile(): void {
        this.filePath = undefined;
        this.storedFrontmatter = '';
        this.lastBodyContent = '';
        this.post({ type: 'load', content: '', frontmatter: '' });
    }

    dispose(): void {
        if (this.frontmatterAutoSaveTimer) { clearTimeout(this.frontmatterAutoSaveTimer); }
        for (const [, state] of this.activeRequests) {
            state.cancelled = true;
        }
        this.activeRequests.clear();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}

function extractFrontmatter(content: string): { frontmatter: string; body: string } {
    // YAML frontmatter: ---\n...\n---
    const yamlMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    if (yamlMatch) {
        return { frontmatter: yamlMatch[0], body: content.slice(yamlMatch[0].length) };
    }
    // TOML frontmatter: +++\n...\n+++
    const tomlMatch = content.match(/^\+\+\+\r?\n[\s\S]*?\r?\n\+\+\+\r?\n?/);
    if (tomlMatch) {
        return { frontmatter: tomlMatch[0], body: content.slice(tomlMatch[0].length) };
    }
    return { frontmatter: '', body: content };
}

async function getUniqueFileName(dir: string, name: string): Promise<string> {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    let candidate = name;
    let counter = 1;
    while (true) {
        try {
            await fs.access(path.join(dir, candidate));
            candidate = `${base}-${counter}${ext}`;
            counter++;
        } catch {
            return candidate;
        }
    }
}

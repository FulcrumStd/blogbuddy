import { Editor } from '@milkdown/kit/core';
import { rootCtx, defaultValueCtx, editorViewCtx, commandsCtx } from '@milkdown/kit/core';
import { commonmark, toggleStrongCommand } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { block } from '@milkdown/kit/plugin/block';
import { upload, uploadConfig } from '@milkdown/kit/plugin/upload';
import { getMarkdown, replaceAll } from '@milkdown/kit/utils';
import { updateAIBlock, finalizeAIBlock, setAIBlockError, aiBlockPlugin } from './ai-block-plugin';
import { bbSlashPlugin } from './bb-slash-plugin';
import './styles.css';

import type { Node } from '@milkdown/kit/prose/model';
import type { Uploader } from '@milkdown/kit/plugin/upload';
import { Decoration } from '@milkdown/kit/prose/view';

// VS Code API
declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

// Export for use by plugins
(window as unknown as Record<string, unknown>).__vscode = vscode;

let editor: Editor;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let baseUri = '';

// ---- URI Conversion ----

function preprocessMarkdown(md: string): string {
    if (!baseUri) { return md; }
    return md.replace(
        /(!?\[[^\]]*\])\((?!https?:\/\/|data:|vscode-webview:)([^)]+)\)/g,
        (_, prefix, relativePath) => `${prefix}(${baseUri}/${relativePath})`
    );
}

function postprocessMarkdown(md: string): string {
    if (!baseUri) { return md; }
    // Also strip URL-encoded variant (Milkdown may encode + as %2B)
    const encodedBaseUri = baseUri.replace(/\+/g, '%2B');
    return md.replaceAll(baseUri + '/', '').replaceAll(encodedBaseUri + '/', '');
}

// ---- File Upload ----

interface FileUploadedResult {
    uploadId: string;
    webviewUri: string;
    relativePath: string;
    isImage: boolean;
    fileName: string;
}

const pendingUploads = new Map<string, (result: FileUploadedResult) => void>();

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            // Strip "data:mime/type;base64," prefix
            const base64 = dataUrl.split(',')[1] || '';
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

const fileUploader: Uploader = async (files, schema) => {
    const nodes: Node[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) { continue; }

        const dataBase64 = await fileToBase64(file);
        const uploadId = crypto.randomUUID();

        const result = await new Promise<FileUploadedResult>((resolve) => {
            pendingUploads.set(uploadId, resolve);
            vscode.postMessage({
                type: 'file-upload',
                uploadId,
                fileName: file.name,
                mimeType: file.type,
                dataBase64,
            });
        });

        if (result.isImage) {
            const imageType = schema.nodes['image'];
            if (imageType) {
                const node = imageType.createAndFill({
                    src: result.webviewUri,
                    alt: result.fileName,
                });
                if (node) { nodes.push(node); }
            }
        } else {
            const linkMark = schema.marks['link']?.create({ href: result.webviewUri });
            if (linkMark) {
                nodes.push(schema.text(result.fileName, [linkMark]));
            }
        }
    }

    return nodes;
};

// ---- Auto Save ----

function scheduleAutoSave(): void {
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); }
    autoSaveTimer = setTimeout(() => {
        if (!editor) { return; }
        const content = postprocessMarkdown(editor.action(getMarkdown()));
        vscode.postMessage({ type: 'auto-save', content });
    }, 500);
}

// ---- Editor Init ----

async function initEditor(): Promise<void> {
    const editorRoot = document.getElementById('editor');
    if (!editorRoot) { return; }

    editor = await Editor.make()
        .config(ctx => {
            ctx.set(rootCtx, editorRoot);
            ctx.set(defaultValueCtx, '');
            ctx.get(listenerCtx).markdownUpdated(() => {
                scheduleAutoSave();
            });
            ctx.update(uploadConfig.key, () => ({
                uploader: fileUploader,
                enableHtmlFileUploader: true,
                uploadWidgetFactory: (pos: number, spec: Parameters<typeof Decoration.widget>[2]) => {
                    const el = document.createElement('span');
                    el.className = 'upload-placeholder';
                    el.textContent = 'Uploading...';
                    return Decoration.widget(pos, el, spec);
                },
            }));
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener)
        .use(block)
        .use(upload)
        .use(bbSlashPlugin)
        .use(aiBlockPlugin)
        .create();
}

// Message handler from Extension Host
window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
        case 'load':
            if (msg.baseUri) { baseUri = msg.baseUri; }
            if (editor) {
                editor.action(replaceAll(preprocessMarkdown(msg.content || '')));
            }
            setTimeout(() => {
                vscode.postMessage({ type: 'dirty', isDirty: false });
            }, 100);
            break;
        case 'chunk':
            if (editor) { updateAIBlock(editor, msg.id, msg.text, msg.replace); }
            break;
        case 'done':
            if (editor) { finalizeAIBlock(editor, msg.id, msg.fullText); }
            break;
        case 'error':
            if (editor) { setAIBlockError(editor, msg.id, msg.message); }
            break;
        case 'saved':
            if (msg.success) {
                updateStatus('Saved');
                vscode.postMessage({ type: 'dirty', isDirty: false });
                setTimeout(() => updateStatus(''), 2000);
            }
            break;
        case 'theme':
            document.body.setAttribute('data-theme', msg.kind);
            break;
        case 'file-uploaded': {
            const resolve = pendingUploads.get(msg.uploadId);
            if (resolve) {
                resolve(msg);
                pendingUploads.delete(msg.uploadId);
            }
            break;
        }
    }
});

// Keyboard shortcuts
let chordTimer: ReturnType<typeof setTimeout> | null = null;
let waitingForChord = false;

document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
        return;
    }

    // cmd+b / ctrl+b chord detection
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        if (waitingForChord) {
            // Second cmd+b — trigger BB
            e.preventDefault();
            e.stopPropagation();
            if (chordTimer) { clearTimeout(chordTimer); }
            waitingForChord = false;
            triggerBB();
        } else {
            // First cmd+b — start chord wait
            e.preventDefault();
            e.stopPropagation();
            waitingForChord = true;
            chordTimer = setTimeout(() => {
                waitingForChord = false;
                // Timeout — was just a single cmd+b, toggle bold
                if (editor) {
                    editor.action((ctx) => {
                        ctx.get(commandsCtx).call(toggleStrongCommand.key);
                    });
                }
            }, 400);
        }
    }
}, true); // capture phase — intercept before Milkdown

// ---- BB Command Execution (cmd+b cmd+b) ----

const BB_TAG_REGEX = /<([\w-]+)(?::([^>]*))?>/;

function triggerBB(): void {
    if (!editor) { return; }

    editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;
        const { selection, schema } = state;
        const $from = selection.$from;

        let searchText = '';
        let replaceFrom = 0;
        let replaceTo = 0;

        // 1. If user has a non-empty selection, search within it
        if (selection.from !== selection.to) {
            searchText = state.doc.textBetween(selection.from, selection.to, '\n');
            // Expand to block boundaries for clean block-level replacement
            replaceFrom = $from.before(1);
            replaceTo = selection.$to.after(1);
        } else {
            // 2. Fall back to current textblock
            const depth = $from.depth;
            let blockDepth = 0;
            for (let d = depth; d >= 1; d--) {
                const node = $from.node(d);
                if (node.isTextblock) {
                    searchText = node.textContent;
                    blockDepth = d;
                    break;
                }
            }
            if (!searchText || !blockDepth) { return; }
            replaceFrom = $from.before(blockDepth);
            replaceTo = $from.after(blockDepth);
        }

        const match = searchText.match(BB_TAG_REGEX);
        if (!match) {
            vscode.postMessage({ type: 'dirty', isDirty: true });
            return;
        }

        const fullMatch = match[0];
        const command = match[1];
        const message = match[2] || '';
        const tagStart = match.index!;
        const tagEnd = tagStart + fullMatch.length;

        // Text without the BB tag = selectText for the request
        const selectText = searchText.slice(0, tagStart) + searchText.slice(tagEnd);

        // Replace the source range with an AI block
        const nodeType = schema.nodes['ai_block'];
        if (!nodeType) { return; }

        const requestId = crypto.randomUUID();
        const aiNode = nodeType.create({
            requestId,
            status: 'processing',
            content: '',
            bbCmd: command,
        });

        const tr = state.tr.replaceWith(replaceFrom, replaceTo, aiNode);
        view.dispatch(tr);

        vscode.postMessage({
            type: 'bb-request',
            id: requestId,
            cmd: command,
            selectText: selectText.trim(),
            msg: message,
        });
    });
}

function saveFile(): void {
    if (!editor) { return; }
    const content = postprocessMarkdown(editor.action(getMarkdown()));
    vscode.postMessage({ type: 'save', content });
}

function updateStatus(text: string): void {
    const el = document.getElementById('status');
    if (el) { el.textContent = text; }
}

// Click on #editor padding area delegates focus to the editor
document.getElementById('editor')?.addEventListener('mousedown', (e) => {
    if (e.target === e.currentTarget && editor) {
        e.preventDefault();
        editor.action((ctx) => {
            ctx.get(editorViewCtx).focus();
        });
    }
});

// Init
initEditor().then(() => {
    vscode.postMessage({ type: 'ready' });
});

import { Editor, editorViewCtx } from '@milkdown/kit/core';
import { getMarkdown } from '@milkdown/kit/utils';
import type { Node } from '@milkdown/kit/prose/model';
import { preserveUnchangedBlocks } from '../../src/utils/preserveUnchanged';

let sourceMarkdown = '';
let normalizedSource = '';
let cachedDoc: Node | undefined;
let cachedUri = '';
let cachedNormalized = '';
let cachedSaveRaw: string | undefined;
let cachedSaveSource = '';
let cachedSave = '';
export function setSourceMarkdown(markdown: string, normalized: string): void { sourceMarkdown = markdown; normalizedSource = normalized; }
export function normalizedMarkdown(editor: Editor, baseUri: string): string {
    const doc = editor.ctx.get(editorViewCtx).state.doc;
    if (doc !== cachedDoc || cachedUri !== baseUri) {
        cachedNormalized = stripBaseUri(editor.action(getMarkdown()), baseUri);
        cachedDoc = doc;
        cachedUri = baseUri;
    }
    return cachedNormalized;
}

// ---- Base URI handling ----

export function preprocessMarkdown(md: string, baseUri: string): string {
    if (!baseUri) { return md; }
    let out = md.replace(
        /(!?\[[^\]]*\])\((?!https?:\/\/|data:|vscode-webview:)([^)]+)\)/g,
        (_, prefix, relativePath) => `${prefix}(${baseUri}/${relativePath})`
    );
    // HTML <img src="..."> — rewrite relative paths so the embedded image
    // loads inside the webview. Round-trips back to relative via stripBaseUri.
    out = out.replace(
        /(<img\b[^>]*?\bsrc\s*=\s*)(["'])(?!https?:\/\/|data:|vscode-webview:)([^"'>]+)\2/gi,
        (_, prefix, quote, relativePath) => `${prefix}${quote}${baseUri}/${relativePath}${quote}`
    );
    return out;
}

export function stripBaseUri(md: string, baseUri: string): string {
    if (!baseUri) { return md; }
    // Milkdown may percent-encode "+" in URIs as "%2B".
    const encodedBaseUri = baseUri.replace(/\+/g, '%2B');
    return md.replaceAll(baseUri + '/', '').replaceAll(encodedBaseUri + '/', '');
}

// ---- One-stop serialization for save/auto-save ----
//
// Note: no formatting happens here. The host minimizes write churn at save
// time (preserveUnchangedBlocks) so untouched blocks keep their on-disk
// bytes; this function just serializes and restores relative paths.

export function serializeForSave(editor: Editor, baseUri: string): string {
    const raw = normalizedMarkdown(editor, baseUri);
    if (raw === normalizedSource) { return sourceMarkdown; }
    // Drafts, stats and saves all ask for the same doc state; merge once.
    if (raw !== cachedSaveRaw || sourceMarkdown !== cachedSaveSource) {
        cachedSave = preserveUnchangedBlocks(sourceMarkdown, raw);
        cachedSaveRaw = raw;
        cachedSaveSource = sourceMarkdown;
    }
    return cachedSave;
}

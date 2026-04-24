import { Editor } from '@milkdown/kit/core';
import { getMarkdown } from '@milkdown/kit/utils';

// ---- Fenced code block masking ----
// compactMarkdown rules must not touch fenced code block contents.
// Strategy: extract fences, replace with opaque Unicode-sentinel placeholders,
// run rules, restore. Sentinels (U+2039/U+203A single angle quotes) are chosen
// because they are extremely rare in real markdown and don't look like any
// syntactic token the rules below care about.
const SENTINEL_OPEN = '‹';
const SENTINEL_CLOSE = '›';
const CODE_FENCE_RE = /(^|\n)(```[^\n]*\n[\s\S]*?\n```|~~~[^\n]*\n[\s\S]*?\n~~~)/g;

function maskFences(md: string): { masked: string; fences: string[] } {
    const fences: string[] = [];
    const masked = md.replace(CODE_FENCE_RE, (_m, lead: string, block: string) => {
        const idx = fences.length;
        fences.push(block);
        return `${lead}${SENTINEL_OPEN}BB_FENCE_${idx}${SENTINEL_CLOSE}`;
    });
    return { masked, fences };
}

function restoreFences(md: string, fences: string[]): string {
    const re = new RegExp(`${SENTINEL_OPEN}BB_FENCE_(\\d+)${SENTINEL_CLOSE}`, 'g');
    return md.replace(re, (_m, idx: string) => {
        const i = Number(idx);
        return fences[i] ?? '';
    });
}

// ---- Normalization rules (applied outside fenced code blocks) ----

function decodeCommonEntities(md: string): string {
    return md
        .replace(/&#x20;/gi, ' ')
        .replace(/&#32;/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function normalizeBullets(md: string): string {
    // Convert "* item" (with 0-3 leading spaces) to "- item" at line starts.
    // Skip lines where "*" is adjacent to another "*" (bold).
    return md.replace(/(^|\n)([ \t]{0,3})\* (?!\*)/g, '$1$2- ');
}

function tightenLists(md: string): string {
    // Collapse blank lines between consecutive bullet/ordered list items.
    // A list line starts with 0-3 spaces then "- " | "* " | "+ " | "\d+. ".
    const listLine = /^[ \t]{0,3}(?:[-*+] |\d+\. )/;
    const lines = md.split('\n');
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // If current line is blank and both neighbours are list items, drop it.
        if (line.trim() === '' && i > 0 && i < lines.length - 1) {
            const prev = lines[i - 1];
            const next = lines[i + 1];
            if (listLine.test(prev) && listLine.test(next)) {
                continue;
            }
        }
        out.push(line);
    }
    return out.join('\n');
}

function moveBoldSpaceOutside(md: string): string {
    // "**  foo  **" -> "  **foo**  " — emphasis markers should not hug whitespace.
    return md
        .replace(/\*\*(\s+)([^*]+?)\*\*/g, '$1**$2**')
        .replace(/\*\*([^*]+?)(\s+)\*\*/g, '**$1**$2')
        .replace(/__(\s+)([^_]+?)__/g, '$1__$2__')
        .replace(/__([^_]+?)(\s+)__/g, '__$1__$2');
}

function collapseBlankLines(md: string): string {
    // 3+ consecutive blank lines -> 2.
    return md.replace(/\n{4,}/g, '\n\n\n');
}

function trimTrailingBlankLines(md: string): string {
    return md.replace(/\s+$/g, '\n');
}

export function compactMarkdown(md: string): string {
    if (!md) { return md; }

    const { masked, fences } = maskFences(md);

    let out = masked;
    out = decodeCommonEntities(out);
    out = normalizeBullets(out);
    out = tightenLists(out);
    out = moveBoldSpaceOutside(out);
    out = collapseBlankLines(out);
    out = trimTrailingBlankLines(out);

    return restoreFences(out, fences);
}

// ---- Base URI handling ----

export function preprocessMarkdown(md: string, baseUri: string): string {
    if (!baseUri) { return md; }
    return md.replace(
        /(!?\[[^\]]*\])\((?!https?:\/\/|data:|vscode-webview:)([^)]+)\)/g,
        (_, prefix, relativePath) => `${prefix}(${baseUri}/${relativePath})`
    );
}

export function stripBaseUri(md: string, baseUri: string): string {
    if (!baseUri) { return md; }
    // Milkdown may percent-encode "+" in URIs as "%2B".
    const encodedBaseUri = baseUri.replace(/\+/g, '%2B');
    return md.replaceAll(baseUri + '/', '').replaceAll(encodedBaseUri + '/', '');
}

// ---- One-stop serialization for save/auto-save ----

export function serializeForSave(editor: Editor, baseUri: string): string {
    const raw = editor.action(getMarkdown());
    const stripped = stripBaseUri(raw, baseUri);
    return compactMarkdown(stripped);
}

import Prism from 'prismjs';
// Load a curated set of languages. Prism registers them on the shared instance.
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-diff';

import { $prose } from '@milkdown/kit/utils';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import type { EditorState, Transaction } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import type { Node as PmNode } from '@milkdown/kit/prose/model';

const highlightKey = new PluginKey('bb-code-highlight');

const LANGUAGE_ALIASES: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    rs: 'rust',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    md: 'markdown',
    html: 'markup',
    xml: 'markup',
    svg: 'markup',
    cs: 'csharp',
    'c++': 'cpp',
};

function resolveLanguage(raw: string | undefined): Prism.Grammar | null {
    if (!raw) { return null; }
    const normalized = raw.toLowerCase().trim();
    const name = LANGUAGE_ALIASES[normalized] ?? normalized;
    const grammar = Prism.languages[name];
    return grammar ?? null;
}

// Walk Prism's token tree, emitting (absoluteStart, length, className) for each leaf token.
function collectTokenDecorations(
    tokens: (string | Prism.Token)[],
    base: number,
    out: { from: number; to: number; className: string }[],
    classPrefix = '',
): number {
    let cursor = base;
    for (const tok of tokens) {
        if (typeof tok === 'string') {
            cursor += tok.length;
            continue;
        }
        const cls = `${classPrefix}token ${tok.type}`.trim();
        if (typeof tok.content === 'string') {
            const from = cursor;
            const to = from + tok.content.length;
            out.push({ from, to, className: cls });
            cursor = to;
        } else if (Array.isArray(tok.content)) {
            const childClassPrefix = `${classPrefix}${tok.type} `;
            cursor = collectTokenDecorations(
                tok.content as (string | Prism.Token)[],
                cursor,
                out,
                childClassPrefix,
            );
        }
    }
    return cursor;
}

function buildDecorations(doc: PmNode): DecorationSet {
    const decos: Decoration[] = [];

    doc.descendants((node, pos) => {
        if (node.type.name !== 'code_block' && node.type.name !== 'fence') {
            return true;
        }
        const lang = (node.attrs?.language as string | undefined) ?? '';
        const grammar = resolveLanguage(lang);
        if (!grammar) { return false; }

        const code = node.textContent;
        if (!code) { return false; }

        let tokens: (string | Prism.Token)[];
        try {
            tokens = Prism.tokenize(code, grammar);
        } catch {
            return false;
        }

        // textContent start inside a code_block is pos + 1 (opening node token).
        const contentBase = pos + 1;
        const spans: { from: number; to: number; className: string }[] = [];
        collectTokenDecorations(tokens, contentBase, spans);

        for (const span of spans) {
            if (span.from === span.to) { continue; }
            decos.push(Decoration.inline(span.from, span.to, { class: span.className }));
        }
        return false;
    });

    return DecorationSet.create(doc, decos);
}

function codeBlocksChanged(tr: Transaction): boolean {
    if (!tr.docChanged) { return false; }
    let changed = false;
    tr.steps.forEach((step, i) => {
        if (changed) { return; }
        const map = tr.mapping.maps[i];
        map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
            const doc = tr.docs[i + 1] ?? tr.doc;
            doc.nodesBetween(
                Math.max(0, newStart - 1),
                Math.min(doc.content.size, newEnd + 1),
                (node) => {
                    if (node.type.name === 'code_block' || node.type.name === 'fence') {
                        changed = true;
                        return false;
                    }
                    return true;
                },
            );
        });
    });
    return changed;
}

const codeHighlightProse = $prose(() => {
    return new Plugin<DecorationSet>({
        key: highlightKey,
        state: {
            init: (_cfg, state: EditorState) => buildDecorations(state.doc),
            apply: (tr, old: DecorationSet, _oldState: EditorState, newState: EditorState) => {
                if (!tr.docChanged) { return old; }
                if (codeBlocksChanged(tr)) {
                    return buildDecorations(newState.doc);
                }
                return old.map(tr.mapping, tr.doc);
            },
        },
        props: {
            decorations(state: EditorState) {
                return highlightKey.getState(state) ?? null;
            },
        },
    });
});

export const codeHighlightPlugin: MilkdownPlugin[] = [codeHighlightProse];

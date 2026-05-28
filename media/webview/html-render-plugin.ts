// Renders inline HTML nodes that are standalone <img> tags as actual <img>
// elements. The default Milkdown `html` node toDOM sets textContent to the raw
// HTML, which surfaces tags as literal text. We keep that fallback for any HTML
// we don't recognise — the raw `value` attribute is untouched, so round-trips
// to disk preserve the original source exactly.

import { $prose } from '@milkdown/kit/utils';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import { Plugin } from '@milkdown/kit/prose/state';
import type { NodeView } from '@milkdown/kit/prose/view';
import type { Node as PmNode } from '@milkdown/kit/prose/model';

const IMG_TAG_RE = /^<img\b[^>]*\/?>$/i;
// Layout-only wrapper tags. These typically only carry alignment/structural
// intent in markdown documents (e.g. `<div align="center">…</div>` around a
// centered hero). We render them invisibly so the document looks clean, while
// preserving the raw source on save via the node's `value` attribute.
const STRUCTURAL_TAG_RE = /^<\/?(div|center|section|article|header|footer|main|nav|aside|figure|figcaption|span|font)\b[^>]*>$/i;
const ATTR_RE = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

// Whitelist attributes we safely forward to the rendered <img>. `srcset` and
// `sizes` are useful for responsive images; everything else is dropped.
const SAFE_ATTRS = new Set([
    'src', 'alt', 'title', 'width', 'height', 'srcset', 'sizes', 'loading', 'decoding',
]);

function parseImgAttrs(tag: string): Record<string, string> | null {
    const attrs: Record<string, string> = {};
    ATTR_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ATTR_RE.exec(tag)) !== null) {
        const name = m[1].toLowerCase();
        const value = m[2] ?? m[3] ?? m[4] ?? '';
        attrs[name] = value;
    }
    if (!attrs.src) { return null; }
    return attrs;
}

class HtmlNodeView implements NodeView {
    dom: HTMLElement;

    constructor(node: PmNode) {
        const value = String(node.attrs.value ?? '').trim();

        if (IMG_TAG_RE.test(value)) {
            const attrs = parseImgAttrs(value);
            if (attrs) {
                const img = document.createElement('img');
                for (const [k, v] of Object.entries(attrs)) {
                    if (SAFE_ATTRS.has(k)) {
                        img.setAttribute(k, v);
                    }
                }
                img.setAttribute('data-type', 'html-img');
                this.dom = img;
                return;
            }
        }

        if (STRUCTURAL_TAG_RE.test(value)) {
            const span = document.createElement('span');
            span.setAttribute('data-type', 'html-structural');
            span.setAttribute('data-value', value);
            span.className = 'bb-html-structural';
            this.dom = span;
            return;
        }

        // Fallback: mirror the default toDOM so unrecognised HTML still appears
        // exactly the way Milkdown would render it.
        const span = document.createElement('span');
        span.setAttribute('data-type', 'html');
        span.setAttribute('data-value', value);
        span.textContent = value;
        this.dom = span;
    }
}

const htmlRenderProse = $prose(() => new Plugin({
    props: {
        nodeViews: {
            html: (node) => new HtmlNodeView(node),
        },
    },
}));

export const htmlRenderPlugin: MilkdownPlugin[] = [htmlRenderProse];

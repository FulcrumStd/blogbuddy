import { editorViewCtx, parserCtx } from '@milkdown/kit/core';
import { $node, $prose, $view } from '@milkdown/kit/utils';
import { Slice } from '@milkdown/kit/prose/model';
import { Plugin } from '@milkdown/kit/prose/state';
import type { Editor } from '@milkdown/kit/core';
import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model';
import type { EditorView, NodeView } from '@milkdown/kit/prose/view';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';

const activeBlocks = new Map<string, AIBlockNodeView>();
// Streamed text outlives a single node view: moving the block recreates it.
const streamed = new Map<string, string>();

// Originals stay in the document. Previews are never persisted or applied
// until accepted, and acceptance checks that the mapped source is unchanged.
const aiBlockNode = $node('ai_block', () => ({
    group: 'block', atom: true, isolating: true, selectable: true,
    attrs: {
        requestId: { default: '' }, status: { default: 'processing' },
        content: { default: '' }, errorMessage: { default: '' }, bbCmd: { default: '' },
        sourceFrom: { default: 0 }, sourceTo: { default: 0 }, sourceJSON: { default: null },
    },
    parseDOM: [],
    toDOM: () => ['div', { class: 'ai-block' }] as const,
    toMarkdown: { match: node => node.type.name === 'ai_block', runner: () => {} },
    parseMarkdown: { match: () => false, runner: () => {} },
}));

function cancel(id: string): void {
    const bridge = (window as unknown as { __vscode?: { postMessage(message: unknown): void } }).__vscode;
    bridge?.postMessage({ type: 'bb-cancel', id });
}

class AIBlockNodeView implements NodeView {
    dom = document.createElement('div');
    private header = document.createElement('div');
    private content = document.createElement('div');

    constructor(private node: ProseMirrorNode, private view: EditorView,
        private getPos: () => number | undefined, private parse: (text: string) => ProseMirrorNode | null) {
        this.dom.contentEditable = 'false';
        this.header.className = 'ai-block__header';
        this.content.className = 'ai-block__content';
        this.dom.append(this.header, this.content);
        activeBlocks.set(node.attrs.requestId, this);
        this.render();
    }

    update(node: ProseMirrorNode): boolean {
        if (node.type !== this.node.type || node.attrs.requestId !== this.node.attrs.requestId) { return false; }
        this.node = node;
        this.render();
        return true;
    }

    private button(label: string, action: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.textContent = label;
        button.addEventListener('click', action);
        return button;
    }

    private render(): void {
        const status = this.node.attrs.status as string;
        this.dom.className = `ai-block ai-block--${status}`;
        this.header.replaceChildren();
        const label = document.createElement('span');
        label.className = 'ai-block__label';
        label.textContent = status === 'processing' ? 'AI 正在生成 · 原文已保留'
            : status === 'ready' ? 'AI 建议 · 采用后才会替换原文' : 'AI 未完成 · 原文已保留';
        this.header.append(label);
        if (status === 'ready') { this.header.append(this.button('采用结果', () => this.accept())); }
        this.header.append(this.button(status === 'processing' ? '停止生成' : '保留原文', () => this.discard()));
        this.content.textContent = status === 'error' ? this.node.attrs.errorMessage
            : status === 'ready' ? this.node.attrs.content : streamed.get(this.node.attrs.requestId) ?? '';
    }

    private accept(): void {
        const pos = this.getPos();
        if (pos === undefined) { return; }
        const { sourceFrom: from, sourceTo: to, sourceJSON, content } = this.node.attrs;
        const { state } = this.view;
        if (JSON.stringify(state.doc.slice(from, to).toJSON()) !== JSON.stringify(sourceJSON)) {
            this.view.dispatch(state.tr.setNodeMarkup(pos, undefined, {
                ...this.node.attrs, status: 'error', errorMessage: '原文已修改，请重新生成，避免覆盖你的新内容。',
            }));
            return;
        }
        const parsed = this.parse(content);
        if (!parsed || !content.trim()) { return; }
        const tr = state.tr.delete(pos, pos + this.node.nodeSize);
        if (parsed.childCount === 1 && parsed.firstChild?.type.name === 'paragraph'
            && state.doc.resolve(from).sameParent(state.doc.resolve(to))) {
            tr.replaceWith(from, to, parsed.firstChild.content);
        } else { tr.replaceRange(from, to, new Slice(parsed.content, 0, 0)); }
        this.view.dispatch(tr.scrollIntoView());
        this.view.focus();
    }

    private discard(): void {
        cancel(this.node.attrs.requestId);
        const pos = this.getPos();
        if (pos !== undefined) { this.view.dispatch(this.view.state.tr.delete(pos, pos + this.node.nodeSize)); }
        this.view.focus();
    }

    showStreamText(): void {
        this.content.textContent = streamed.get(this.node.attrs.requestId) ?? '';
    }

    destroy(): void {
        const id = this.node.attrs.requestId as string;
        // ProseMirror may build the replacement view (drag, re-render) before
        // destroying this one, or right after within the same update.
        if (activeBlocks.get(id) !== this) { return; }
        activeBlocks.delete(id);
        queueMicrotask(() => {
            if (!activeBlocks.has(id)) { streamed.delete(id); cancel(id); }
        });
    }
    stopEvent(): boolean { return true; }
    ignoreMutation(): boolean { return true; }
}

const aiBlockView = $view(aiBlockNode, (ctx) => (node, view, getPos) =>
    new AIBlockNodeView(node, view, getPos, ctx.get(parserCtx)));

const trackSources = $prose(() => new Plugin({
    appendTransaction(transactions, previous, current) {
        if (!transactions.some(tr => tr.docChanged)) { return null; }
        const sources = new Map<string, { from: number; to: number }>();
        previous.doc.descendants(node => {
            if (node.type.name === 'ai_block') {
                let from = node.attrs.sourceFrom as number;
                let to = node.attrs.sourceTo as number;
                for (const tr of transactions) { from = tr.mapping.map(from, 1); to = tr.mapping.map(to, -1); }
                sources.set(node.attrs.requestId, { from, to: Math.max(from, to) });
            }
        });
        const tr = current.tr;
        current.doc.descendants((node, pos) => {
            const source = node.type.name === 'ai_block' ? sources.get(node.attrs.requestId) : undefined;
            if (source && (source.from !== node.attrs.sourceFrom || source.to !== node.attrs.sourceTo)) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, sourceFrom: source.from, sourceTo: source.to });
            }
        });
        return tr.steps.length ? tr.setMeta('addToHistory', false) : null;
    },
}));

export const aiBlockPlugin: MilkdownPlugin[] = [aiBlockNode, aiBlockView, trackSources];

export function updateAIBlock(_editor: Editor, id: string, text: string, replace?: boolean): void {
    if (!activeBlocks.has(id)) { return; }
    streamed.set(id, replace ? text : (streamed.get(id) ?? '') + text);
    activeBlocks.get(id)?.showStreamText();
}

function updateBlock(editor: Editor, id: string, attrs: Record<string, unknown>): void {
    editor.action(ctx => {
        const view = ctx.get(editorViewCtx);
        view.state.doc.descendants((node, pos) => {
            if (node.type.name === 'ai_block' && node.attrs.requestId === id) {
                view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }).setMeta('addToHistory', false));
                return false;
            }
        });
    });
}

export function finalizeAIBlock(editor: Editor, id: string, fullText: string): void {
    streamed.delete(id);
    updateBlock(editor, id, fullText.trim() ? { status: 'ready', content: fullText }
        : { status: 'error', errorMessage: 'AI 返回了空内容，请重试。' });
}

export function setAIBlockError(editor: Editor, id: string, message: string): void {
    streamed.delete(id);
    updateBlock(editor, id, { status: 'error', errorMessage: message });
}

export function discardAIBlocks(editor: Editor): void {
    editor.action(ctx => {
        const view = ctx.get(editorViewCtx);
        const ranges: Array<{ pos: number; size: number }> = [];
        view.state.doc.descendants((node, pos) => {
            if (node.type.name === 'ai_block') { ranges.push({ pos, size: node.nodeSize }); }
        });
        if (!ranges.length) { return; }
        const tr = view.state.tr;
        for (const { pos, size } of ranges.reverse()) { tr.delete(pos, pos + size); }
        view.dispatch(tr.setMeta('addToHistory', false));
    });
}

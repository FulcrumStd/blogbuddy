import { editorViewCtx, parserCtx } from '@milkdown/kit/core';
import { $node, $view } from '@milkdown/kit/utils';
import type { Editor } from '@milkdown/kit/core';
import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model';
import type { EditorView, NodeView } from '@milkdown/kit/prose/view';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';

// Track active AI blocks by requestId
const activeBlocks = new Map<string, AIBlockNodeView>();

// ---- Node Definition ----

const aiBlockNode = $node('ai_block', () => ({
    group: 'block',
    atom: true,
    isolating: true,
    selectable: true,
    attrs: {
        requestId: { default: '' },
        status: { default: 'processing' },
        content: { default: '' },
        errorMessage: { default: '' },
        bbCmd: { default: '' },
    },
    parseDOM: [],
    toDOM: () => ['div', { class: 'ai-block' }] as const,
    // AI blocks are transient — not serialized to/from Markdown
    toMarkdown: {
        match: (node: ProseMirrorNode) => node.type.name === 'ai_block',
        runner: () => {
            // AI blocks in processing state are not saved to Markdown
        },
    },
    parseMarkdown: {
        match: () => false,
        runner: () => {
            // AI blocks are never parsed from Markdown
        },
    },
}));

// ---- NodeView ----

class AIBlockNodeView implements NodeView {
    dom: HTMLElement;
    private contentEl: HTMLElement;
    private headerEl: HTMLElement;
    private accumulatedText = '';

    constructor(
        private node: ProseMirrorNode,
        private view: EditorView,
        private getPos: () => number | undefined,
    ) {
        this.dom = document.createElement('div');
        this.dom.className = 'ai-block ai-block--processing';
        this.dom.contentEditable = 'false';

        this.headerEl = document.createElement('div');
        this.headerEl.className = 'ai-block__header';
        this.headerEl.innerHTML = `<span class="ai-block__spinner"></span><span class="ai-block__label">BB ${node.attrs.bbCmd} processing...</span>`;
        this.dom.appendChild(this.headerEl);

        this.contentEl = document.createElement('div');
        this.contentEl.className = 'ai-block__content';
        this.dom.appendChild(this.contentEl);

        // Register for streaming updates
        activeBlocks.set(node.attrs.requestId, this);
    }

    update(node: ProseMirrorNode): boolean {
        if (node.type.name !== 'ai_block') { return false; }
        this.node = node;

        if (node.attrs.status === 'error') {
            this.dom.className = 'ai-block ai-block--error';
            this.headerEl.innerHTML = `<span class="ai-block__label">BB Error</span>`;
            this.contentEl.textContent = node.attrs.errorMessage || 'An error occurred';
            this.addCloseButton();
        }

        return true;
    }

    private addCloseButton(): void {
        const btn = document.createElement('button');
        btn.className = 'ai-block__close';
        btn.textContent = '✕';
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.removeSelf();
        });
        this.headerEl.appendChild(btn);
    }

    private removeSelf(): void {
        const pos = this.getPos();
        if (pos === undefined) { return; }
        const tr = this.view.state.tr.delete(pos, pos + this.node.nodeSize);
        this.view.dispatch(tr);
    }

    appendStreamText(text: string, replace?: boolean): void {
        if (replace) {
            this.accumulatedText = text;
        } else {
            this.accumulatedText += text;
        }
        this.contentEl.textContent = this.accumulatedText;
        this.dom.scrollIntoView({ block: 'nearest' });
    }

    destroy(): void {
        activeBlocks.delete(this.node.attrs.requestId);
    }

    stopEvent(): boolean { return true; }
    ignoreMutation(): boolean { return true; }
}

// ---- View Plugin ----

const aiBlockView = $view(aiBlockNode, () => {
    return (node: ProseMirrorNode, view: EditorView, getPos: () => number | undefined) => {
        return new AIBlockNodeView(node, view, getPos);
    };
});

// ---- Exported Plugin ----

export const aiBlockPlugin: MilkdownPlugin[] = [
    aiBlockNode,
    aiBlockView,
];

// ---- External API ----

export function insertAIBlock(editor: Editor, requestId: string, bbCmd: string): void {
    editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;
        const { schema, selection } = state;

        const nodeType = schema.nodes['ai_block'];
        if (!nodeType) { return; }

        const aiNode = nodeType.create({
            requestId,
            status: 'processing',
            content: '',
            bbCmd,
        });

        const pos = selection.$to.after(1);
        const tr = state.tr.insert(pos, aiNode);
        view.dispatch(tr);
    });
}

export function updateAIBlock(_editor: Editor, requestId: string, text: string, replace?: boolean): void {
    const blockView = activeBlocks.get(requestId);
    if (blockView) {
        blockView.appendStreamText(text, replace);
    }
}

export function finalizeAIBlock(editor: Editor, requestId: string, fullText: string): void {
    editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;

        // Find the AI block node
        let targetPos: number | null = null;
        let targetNode: ProseMirrorNode | null = null;

        state.doc.descendants((node, pos) => {
            if (node.type.name === 'ai_block' && node.attrs.requestId === requestId) {
                targetPos = pos;
                targetNode = node;
                return false;
            }
            return true;
        });

        if (targetPos === null || targetNode === null) { return; }

        // Parse the AI response markdown into ProseMirror nodes using the parser
        const parser = ctx.get(parserCtx);
        const parsedDoc = parser(fullText);
        if (!parsedDoc) { return; }

        // Replace the AI block with the parsed content
        const tr = state.tr.replaceWith(
            targetPos,
            targetPos + (targetNode as ProseMirrorNode).nodeSize,
            parsedDoc.content,
        );
        view.dispatch(tr);

        activeBlocks.delete(requestId);
    });
}

export function setAIBlockError(editor: Editor, requestId: string, errorMessage: string): void {
    editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;

        let targetPos: number | null = null;

        state.doc.descendants((node, pos) => {
            if (node.type.name === 'ai_block' && node.attrs.requestId === requestId) {
                targetPos = pos;
                return false;
            }
            return true;
        });

        if (targetPos === null) { return; }

        const tr = state.tr.setNodeMarkup(targetPos, undefined, {
            requestId,
            status: 'error',
            content: '',
            errorMessage,
            bbCmd: '',
        });
        view.dispatch(tr);
    });
}

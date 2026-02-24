import { SlashProvider } from '@milkdown/kit/plugin/slash';
import { commandsCtx } from '@milkdown/kit/core';
import { $prose } from '@milkdown/kit/utils';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import type { EditorView } from '@milkdown/kit/prose/view';
import { Plugin, PluginKey, TextSelection } from '@milkdown/kit/prose/state';
import {
    wrapInHeadingCommand,
    createCodeBlockCommand,
    wrapInBlockquoteCommand,
    wrapInBulletListCommand,
    wrapInOrderedListCommand,
    insertHrCommand,
} from '@milkdown/kit/preset/commonmark';
import type { CommandManager } from '@milkdown/kit/core';

// ---- Types ----

interface SlashItem {
    label: string;
    desc: string;
    group: 'format' | 'bb';
    onSelect: (view: EditorView, slashProvider: SlashProvider) => void;
}

interface BBCmdDef {
    command: string;
    label: string;
    desc: string;
    /** Tag template: use $1 as placeholder for user input cursor */
    tag: string;
}

// ---- BB Command Definitions ----

const BB_COMMANDS: BBCmdDef[] = [
    { command: 'bb',      label: 'BB 指令',   desc: 'Give BB a direct instruction',   tag: '<bb:$1>' },
    { command: 'bb-expd', label: 'BB 扩写',   desc: 'Expand and elaborate content',    tag: '<bb-expd>' },
    { command: 'bb-impv', label: 'BB 润色',   desc: 'Polish and improve writing',      tag: '<bb-impv>' },
    { command: 'bb-tslt', label: 'BB 翻译',   desc: 'Translate to specified language',  tag: '<bb-tslt:$1>' },
    { command: 'bb-kwd',  label: 'BB 关键词', desc: 'Extract keywords',                 tag: '<bb-kwd>' },
    { command: 'bb-tldr', label: 'BB 省流',   desc: 'Generate a TL;DR summary',         tag: '<bb-tldr>' },
    { command: 'bb-mmd',  label: 'BB 图表',   desc: 'Generate a Mermaid diagram',       tag: '<bb-mmd>' },
];

// ---- Helpers ----

function removeSlashText(view: EditorView): void {
    const { state } = view;
    const $from = state.doc.resolve(state.selection.from);
    const blockStart = $from.start();
    const cursorOffset = $from.parentOffset;
    const blockText = $from.parent.textContent;

    // Find the "/" before (or at) the cursor within the current block
    const textBeforeCursor = blockText.slice(0, cursorOffset);
    const slashIdx = textBeforeCursor.lastIndexOf('/');
    if (slashIdx === -1) { return; }

    // Delete from "/" to cursor position (removes "/" and any filter text like "/bb")
    const from = blockStart + slashIdx;
    const to = blockStart + cursorOffset;
    const tr = state.tr.delete(from, to);
    view.dispatch(tr);
}

/** Insert tag text, place cursor at $1 placeholder position if present */
function insertBBTag(view: EditorView, tag: string): void {
    const cursorPlaceholder = '$1';
    const hasCursor = tag.includes(cursorPlaceholder);
    const text = tag.replace(cursorPlaceholder, '');

    const { state } = view;
    const { from } = state.selection;
    const tr = state.tr.insertText(text, from);

    if (hasCursor) {
        const cursorPos = from + tag.indexOf(cursorPlaceholder);
        tr.setSelection(TextSelection.create(tr.doc, cursorPos));
    }

    view.dispatch(tr);
    view.focus();
}

// ---- Build All Slash Items ----

function buildSlashItems(commands: CommandManager): SlashItem[] {
    const items: SlashItem[] = [];

    // Formatting items
    const fmtAction = (fn: () => void) => (view: EditorView, sp: SlashProvider) => {
        sp.hide();
        removeSlashText(view);
        fn();
    };

    items.push({ label: 'Heading 1', desc: 'Large section heading', group: 'format',
        onSelect: fmtAction(() => commands.call(wrapInHeadingCommand.key, 1)) });
    items.push({ label: 'Heading 2', desc: 'Medium section heading', group: 'format',
        onSelect: fmtAction(() => commands.call(wrapInHeadingCommand.key, 2)) });
    items.push({ label: 'Heading 3', desc: 'Small section heading', group: 'format',
        onSelect: fmtAction(() => commands.call(wrapInHeadingCommand.key, 3)) });
    items.push({ label: 'Bullet List', desc: 'Unordered list', group: 'format',
        onSelect: fmtAction(() => commands.call(wrapInBulletListCommand.key)) });
    items.push({ label: 'Ordered List', desc: 'Numbered list', group: 'format',
        onSelect: fmtAction(() => commands.call(wrapInOrderedListCommand.key)) });
    items.push({ label: 'Code Block', desc: 'Fenced code block', group: 'format',
        onSelect: fmtAction(() => commands.call(createCodeBlockCommand.key)) });
    items.push({ label: 'Blockquote', desc: 'Quote block', group: 'format',
        onSelect: fmtAction(() => commands.call(wrapInBlockquoteCommand.key)) });
    items.push({ label: 'Divider', desc: 'Horizontal rule', group: 'format',
        onSelect: fmtAction(() => commands.call(insertHrCommand.key)) });

    // BB tag items — insert tag text only
    for (const cmd of BB_COMMANDS) {
        items.push({
            label: cmd.label,
            desc: cmd.desc,
            group: 'bb',
            onSelect: (view, sp) => {
                sp.hide();
                removeSlashText(view);
                insertBBTag(view, cmd.tag);
            },
        });
    }

    return items;
}

// ---- Slash Menu Controller (keyboard navigation) ----

class SlashMenuController {
    private itemEls: HTMLElement[] = [];
    private activeIndex = 0;
    visible = false;

    constructor(
        private items: SlashItem[],
        private view: EditorView,
        private slashProvider: SlashProvider,
    ) {}

    buildDOM(): HTMLElement {
        const menu = document.createElement('div');
        menu.className = 'bb-slash-menu';

        let prevGroup: string | null = null;

        for (const item of this.items) {
            if (prevGroup && prevGroup !== item.group) {
                const sep = document.createElement('div');
                sep.className = 'bb-slash-separator';
                menu.appendChild(sep);
            }
            prevGroup = item.group;

            const el = document.createElement('div');
            el.className = 'bb-slash-item';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'bb-slash-item__label';
            labelSpan.textContent = item.label;

            const descSpan = document.createElement('span');
            descSpan.className = 'bb-slash-item__desc';
            descSpan.textContent = item.desc;

            el.appendChild(labelSpan);
            el.appendChild(descSpan);

            const idx = this.itemEls.length;
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.items[idx].onSelect(this.view, this.slashProvider);
            });
            el.addEventListener('mouseenter', () => {
                this.setActive(idx);
            });

            this.itemEls.push(el);
            menu.appendChild(el);
        }

        this.setActive(0);
        return menu;
    }

    onShow(): void {
        this.visible = true;
        this.setActive(0);
    }

    onHide(): void {
        this.visible = false;
    }

    handleKeyDown(e: KeyboardEvent): boolean {
        if (!this.visible) { return false; }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.setActive((this.activeIndex + 1) % this.itemEls.length);
                return true;
            case 'ArrowUp':
                e.preventDefault();
                this.setActive((this.activeIndex - 1 + this.itemEls.length) % this.itemEls.length);
                return true;
            case 'Enter':
                e.preventDefault();
                this.items[this.activeIndex].onSelect(this.view, this.slashProvider);
                return true;
            case 'Escape':
                e.preventDefault();
                this.slashProvider.hide();
                return true;
            default:
                return false;
        }
    }

    private setActive(index: number): void {
        if (this.itemEls[this.activeIndex]) {
            this.itemEls[this.activeIndex].classList.remove('bb-slash-item--active');
        }
        this.activeIndex = index;
        if (this.itemEls[this.activeIndex]) {
            this.itemEls[this.activeIndex].classList.add('bb-slash-item--active');
            this.itemEls[this.activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }
}

// ---- Exported Plugin ----

const bbSlashPluginKey = new PluginKey('bb-slash');

const bbSlashProse = $prose((ctx) => {
    const commands = ctx.get(commandsCtx);
    const items = buildSlashItems(commands);

    let controller: SlashMenuController | null = null;

    return new Plugin({
        key: bbSlashPluginKey,
        props: {
            handleKeyDown(_view, event) {
                return controller?.handleKeyDown(event) ?? false;
            },
        },
        view: (editorView: EditorView) => {
            const menuContent = document.createElement('div');
            menuContent.className = 'bb-slash-dropdown';

            const slashProvider = new SlashProvider({
                content: menuContent,
                trigger: '/',
            });

            controller = new SlashMenuController(items, editorView, slashProvider);
            const menu = controller.buildDOM();
            menuContent.appendChild(menu);

            slashProvider.onShow = () => controller?.onShow();
            slashProvider.onHide = () => controller?.onHide();

            return {
                update: (view: EditorView, prevState: EditorView['state']) => {
                    slashProvider.update(view, prevState);
                },
                destroy: () => {
                    slashProvider.destroy();
                    controller = null;
                },
            };
        },
    });
});

export const bbSlashPlugin: MilkdownPlugin[] = [
    bbSlashProse,
];

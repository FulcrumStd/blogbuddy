import { $prose } from '@milkdown/kit/utils';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';

const arrowLigaturesKey = new PluginKey('bb-arrow-ligatures');

// "->" → "→", "=>" → "⇒"
// Skip inside code blocks, inline code marks, and during IME composition.
// Triggered on typing ">" right after a literal "-" or "=".

function isInCode(view: EditorView, pos: number): boolean {
    const $pos = view.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
        const nodeTypeName = $pos.node(d).type.name;
        if (nodeTypeName === 'code_block' || nodeTypeName === 'fence') { return true; }
    }
    const codeMark = view.state.schema.marks['code'];
    if (codeMark && codeMark.isInSet($pos.marks())) { return true; }
    return false;
}

const arrowLigaturesProse = $prose(() => {
    return new Plugin({
        key: arrowLigaturesKey,
        props: {
            handleTextInput(view, from, to, text) {
                if (text !== '>') { return false; }
                if ((view as EditorView & { composing?: boolean }).composing) { return false; }
                if (from !== to) { return false; }
                if (isInCode(view, from)) { return false; }

                const prev = view.state.doc.textBetween(Math.max(0, from - 1), from);
                let replacement: string | null = null;
                if (prev === '-') { replacement = '→'; }
                else if (prev === '=') { replacement = '⇒'; }
                if (!replacement) { return false; }

                const tr = view.state.tr.replaceWith(
                    from - 1,
                    to,
                    view.state.schema.text(replacement),
                );
                view.dispatch(tr);
                return true;
            },
        },
    });
});

export const arrowLigaturesPlugin: MilkdownPlugin[] = [arrowLigaturesProse];

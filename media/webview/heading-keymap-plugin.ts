import { $prose } from '@milkdown/kit/utils';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';

const headingKeymapKey = new PluginKey('heading-keymap');

/**
 * When pressing Backspace at the start of any heading,
 * convert it directly to a paragraph (instead of stepping down h2→h1→paragraph).
 */
const headingKeymapProse = $prose(() => {
    return new Plugin({
        key: headingKeymapKey,
        props: {
            handleKeyDown(view, event) {
                if (event.key !== 'Backspace') { return false; }

                const { state } = view;
                const { selection } = state;

                if (!selection.empty) { return false; }

                const $from = selection.$from;
                if ($from.parentOffset !== 0) { return false; }
                if ($from.parent.type.name !== 'heading') { return false; }

                const paragraphType = state.schema.nodes['paragraph'];
                if (!paragraphType) { return false; }

                const tr = state.tr.setNodeMarkup($from.before($from.depth), paragraphType);
                view.dispatch(tr);
                return true;
            },
        },
    });
});

export const headingKeymapPlugin: MilkdownPlugin[] = [
    headingKeymapProse,
];

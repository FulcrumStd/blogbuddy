export interface BBCommandRange {
    from: number;
    to: number;
    command: string;
    message: string;
}

interface TextBlockNode {
    isTextblock: boolean;
    content: { size: number };
    textBetween(from: number, to: number, separator?: string, leafText?: string): string;
}
interface TextBlockDocument {
    nodesBetween(from: number, to: number, visit: (node: TextBlockNode, pos: number) => boolean | void): void;
}

/** Locate tags inside real text blocks. Inline atoms occupy one PM position. */
export function findBBCommandRange(doc: TextBlockDocument, from: number, to: number): BBCommandRange | undefined {
    let result: BBCommandRange | undefined;
    doc.nodesBetween(from, to, (node, pos) => {
        if (result) { return false; }
        if (!node.isTextblock) { return; }
        const start = Math.max(from, pos + 1);
        const end = Math.min(to, pos + 1 + node.content.size);
        if (end < start) { return false; }
        const text = node.textBetween(start - pos - 1, end - pos - 1, '\n', '\uFFFC');
        const match = /<(bb(?:-[\w-]+)?)(?::([^>\uFFFC]*))?>/.exec(text);
        if (match) {
            result = { from: start + match.index, to: start + match.index + match[0].length,
                command: match[1], message: match[2] || '' };
        }
        return false;
    });
    return result;
}

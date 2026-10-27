// Block-level churn minimizer for BB Editor saves.
//
// A WYSIWYG round-trip (parse → ProseMirror → serialize) unavoidably rewrites
// the whole document in the serializer's dialect: bullets restyled, emphasis
// markers unified, punctuation escaped, soft-wrapped paragraphs joined. To
// honor "don't reformat my file", we merge the freshly serialized Markdown
// against the body currently on disk: blocks whose differences are purely
// presentational keep their on-disk text verbatim; only genuinely edited
// blocks take the serializer's output.

interface ParsedDoc {
    /** gaps[i] is the blank-line run before blocks[i] ('' for most). */
    gaps: string[];
    blocks: string[];
    /** Trailing whitespace/newlines after the last block. */
    trailing: string;
}

const FENCE_OPEN_RE = /^[ \t]{0,3}(`{3,}|~{3,})/;

/**
 * Split a Markdown body into blank-line-separated blocks, treating fenced
 * code blocks as atomic (blank lines inside a fence don't split it).
 */
function parseBlocks(md: string): ParsedDoc {
    const lines = md.split('\n');
    const gaps: string[] = [];
    const blocks: string[] = [];
    let cur: string[] = [];
    let gap: string[] = [];
    let fenceMarker: string | null = null;

    const flush = (): void => {
        if (cur.length === 0) { return; }
        gaps.push(gap.length ? gap.join('\n') + '\n' : '');
        blocks.push(cur.join('\n'));
        cur = [];
        gap = [];
    };

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (fenceMarker) {
            cur.push(line);
            const m = line.match(FENCE_OPEN_RE);
            if (m && m[1][0] === fenceMarker[0] && m[1].length >= fenceMarker.length) {
                fenceMarker = null;
            }
            continue;
        }
        if (line.trim() === '') {
            // remark may turn a tight list into a loose list. Keep list items
            // in one comparison block so an unrelated edit does not restyle it.
            if (/^[ \t]*(?:[-+*]|\d+[.)])\s/.test(cur[0] || '')) {
                const next = lines.slice(index + 1).find(candidate => candidate.trim() !== '');
                if (next && (/^[ \t]*(?:[-+*]|\d+[.)])\s/.test(next) || /^(?: {2,}|\t)\S/.test(next))) {
                    cur.push(line);
                    continue;
                }
            }
            if (cur.length) { flush(); }
            gap.push(line);
            continue;
        }
        const m = line.match(FENCE_OPEN_RE);
        if (m) { fenceMarker = m[1]; }
        cur.push(line);
    }
    flush();

    const trailing = gap.length ? gap.join('\n') + (md.endsWith('\n') ? '' : '') : '';
    // Preserve the exact tail: recompute from the original string to avoid
    // add/drop of the final newline.
    const joined = rebuildRaw(gaps, blocks);
    return { gaps, blocks, trailing: md.slice(joined.length) };
}

function rebuildRaw(gaps: string[], blocks: string[]): string {
    let out = '';
    for (let i = 0; i < blocks.length; i++) {
        out += gaps[i] + blocks[i];
        if (i < blocks.length - 1) { out += '\n'; }
    }
    return out;
}

/**
 * Normalization key: two blocks with equal keys are presentationally
 * different at most — bullets/emphasis restyled, punctuation escaped,
 * entities encoded, or soft-wrapping/whitespace changed — never a content
 * edit. Fenced code blocks compare near-verbatim.
 */
/**
 * Code blocks key as "CODE:<lang>:<verbatim content>". Fenced and indented
 * forms of the same code are indistinguishable in the editor (serializers
 * convert indented → fenced), so they must key equal — but code content
 * itself compares verbatim, and code never collides with a paragraph.
 */
function codeKey(block: string): string | null {
    const fence = block.match(FENCE_OPEN_RE);
    if (fence) {
        const lines = block.split('\n');
        const info = lines[0].replace(FENCE_OPEN_RE, '').trim();
        let body = lines.slice(1);
        if (body.length && /^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$/.test(body[body.length - 1])) {
            body = body.slice(0, -1);
        }
        return `CODE:${info}:${body.join('\n').replace(/\s+$/, '')}`;
    }
    if (/^(?: {4}|\t)/.test(block)) {
        const content = block.split('\n').map(l => l.replace(/^(?: {4}|\t)/, '')).join('\n');
        return `CODE::${content.replace(/\s+$/, '')}`;
    }
    return null;
}

function blockKey(block: string): string {
    const code = codeKey(block);
    if (code !== null) { return code; }
    let s = block;
    const rows = s.split('\n');
    if (rows.length > 1 && /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/.test(rows[1])) {
        rows[1] = rows[1].replace(/-+/g, '-');
        s = rows.join('\n');
    }
    // Hard line breaks (two+ trailing spaces or backslash before newline)
    // are real content — a <br> the user can add/remove in the editor. Mark
    // them before soft-wrap collapsing so "foo<br>bar" never keys equal to
    // "foo bar".
    s = s.replace(/( {2,}|\\)\n/g, '⏎\n');
    // Backslash escapes remark adds for punctuation.
    s = s.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, '$1');
    // Common entity encodings.
    s = s
        .replace(/&#x20;/gi, ' ')
        .replace(/&#32;/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    // Bullet marker style.
    s = s.replace(/(^|\n)([ \t]*)[*+] /g, '$1$2- ');
    // Emphasis marker style: __strong__ → **strong**, _em_ → *em* (word
    // boundaries keep snake_case identifiers out of it).
    s = s.replace(/__(?=\S)([\s\S]*?\S)__/g, '**$1**');
    s = s.replace(/(^|[^\w\\*_])_(?=\S)([^_\n]*?\S)_(?=[^\w*_]|$)/gm, '$1*$2*');
    // Soft-wrap joins and whitespace runs.
    s = s.replace(/[ \t]*\n[ \t]*/g, ' ');
    s = s.replace(/[ \t]+/g, ' ');
    return s.trim();
}

/**
 * Merge freshly serialized Markdown against the body currently on disk.
 * Output follows the serialized document's block order/content, but any
 * block whose key matches its aligned on-disk counterpart is emitted as the
 * on-disk original — so untouched parts of the file stay byte-identical.
 */
export function preserveUnchangedBlocks(onDisk: string, serialized: string): string {
    if (onDisk === serialized) { return onDisk; }
    const prev = parseBlocks(onDisk);
    const gen = parseBlocks(serialized);
    if (prev.blocks.length === 0 || gen.blocks.length === 0) { return serialized; }

    const prevKeys = prev.blocks.map(blockKey);
    const genKeys = gen.blocks.map(blockKey);

    // LCS alignment over block keys. Documents are at most a few hundred
    // blocks, so the O(n·m) table is cheap.
    const n = prevKeys.length;
    const m = genKeys.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            dp[i][j] = prevKeys[i] === genKeys[j]
                ? dp[i + 1][j + 1] + 1
                : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }
    // matchedPrev[j] = index of the on-disk block aligned to generated block j.
    const matchedPrev: number[] = new Array<number>(m).fill(-1);
    let i = 0, j = 0;
    while (i < n && j < m) {
        if (prevKeys[i] === genKeys[j]) {
            matchedPrev[j] = i;
            i++; j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            i++;
        } else {
            j++;
        }
    }

    let out = '';
    for (let k = 0; k < m; k++) {
        const p = matchedPrev[k];
        // Prefer the on-disk gap when this block and its predecessor are the
        // same consecutive pair as on disk; otherwise take the serializer's.
        let gapText = gen.gaps[k];
        if (p !== -1 && (k === 0 ? p === 0 : matchedPrev[k - 1] === p - 1)) {
            gapText = prev.gaps[p];
        }
        out += gapText + (p !== -1 ? prev.blocks[p] : gen.blocks[k]);
        if (k < m - 1) { out += '\n'; }
    }
    out += matchedPrev[m - 1] === n - 1 ? prev.trailing : gen.trailing;
    return out;
}

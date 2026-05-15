import * as fs from 'fs/promises';
import * as path from 'path';

const MIME_BY_EXT: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.avif': 'image/avif',
};

const IMG_SRC_RE = /<img\b([^>]*?)\bsrc=("([^"]*)"|'([^']*)')([^>]*)>/gi;

/**
 * Walk an HTML string and replace local-path <img src="..."> values with
 * base64 data: URIs. Untouched: https:, http:, data:, vscode-webview: URLs
 * and references to files that don't exist (warning logged).
 *
 * baseDir is the directory the relative paths are resolved against — typically
 * the directory of the source Markdown file.
 */
export async function inlineImageAssets(html: string, baseDir: string): Promise<string> {
    const replacements: Array<{ from: string; to: string }> = [];
    const tasks: Promise<void>[] = [];

    // First pass: collect every <img> and schedule async reads.
    html.replace(IMG_SRC_RE, (match, _beforeAttrs, _quoted, dq, sq, _afterAttrs) => {
        const src = dq ?? sq ?? '';
        if (!src) { return match; }
        if (/^(https?:|data:|vscode-webview:)/i.test(src)) { return match; }

        tasks.push((async () => {
            const ext = path.extname(src).toLowerCase();
            const mime = MIME_BY_EXT[ext];
            if (!mime) {
                console.warn(`[bb-reader] skipped inlining ${src}: unsupported extension ${ext}`);
                return;
            }

            const filePath = path.resolve(baseDir, decodeURIComponent(src));
            if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
                console.warn(`[bb-reader] skipped inlining ${src}: path escapes baseDir`);
                return;
            }

            try {
                const buf = await fs.readFile(filePath);
                const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
                const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const replaced = match.replace(
                    new RegExp(`(\\bsrc=)(["'])${escapedSrc}\\2`),
                    `$1$2${dataUri}$2`
                );
                replacements.push({ from: match, to: replaced });
            } catch (err) {
                console.warn(`[bb-reader] skipped inlining ${src}: ${(err as Error).message}`);
            }
        })());

        return match;
    });

    await Promise.all(tasks);

    // Second pass: apply collected replacements. Done sequentially because two
    // <img> tags could be byte-identical and we want both replaced.
    let result = html;
    for (const { from, to } of replacements) {
        result = result.replace(from, to);
    }
    return result;
}

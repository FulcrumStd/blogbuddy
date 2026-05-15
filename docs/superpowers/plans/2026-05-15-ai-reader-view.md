# AI Reader View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-rendered HTML reader view triggered by `<bb-render-*:>` BB tags, with streaming preview, regenerate/export, and a slash menu entry — without breaking any existing BB command behavior.

**Architecture:** Render tags flow through the existing `blogbuddy.bb` command parser. A new prefix branch (`bb-render*`) deletes the tag and dispatches to a `ReaderPanel` (separate webview opened in `ViewColumn.Beside`). The Reader streams HTML via `AIService.chatStreaming`, renders chunks in a sandboxed `<div id="ai-output">`, and exports a self-contained `.html` with base64-inlined assets. The Reader webview has a relaxed CSP that allows inline `<script>` for AI-generated interactivity but blocks `connect-src` for defense in depth.

**Tech Stack:** TypeScript (strict), VS Code Extension API, esbuild (dual-context: extension host CJS + webview IIFE), OpenAI SDK streaming, `@vscode/test-cli` + Mocha for unit tests, `js-yaml` (already a dep) for frontmatter, `prismjs` (already a dep) is *not* used directly here (AI emits its own inline syntax highlighting).

**Spec:** [docs/superpowers/specs/2026-05-15-ai-reader-view-design.md](../specs/2026-05-15-ai-reader-view-design.md)

**Testing philosophy:** The project has minimal pre-existing tests (one placeholder). This plan adds Mocha unit tests **only** for pure-function utilities (frontmatter parsing, asset inlining, prompt assembly) where regressions would be silent. UI/lifecycle behavior is verified manually via the Extension Development Host (`F5`); the spec lists explicit manual checks per task.

**Commits:** One commit per task at the task's final step. Conventional-commit style with concise body to match recent project history.

---

## File Structure

### Files to create

| Path | Responsibility |
|---|---|
| `src/utils/frontmatter.ts` | Shared YAML/TOML frontmatter extractor (lifted from `WebviewBridge.ts`) |
| `src/utils/assetInliner.ts` | Read local image references from HTML, base64-inline them, leave HTTPS URLs alone |
| `src/core/reader.ts` | Preset library, system + hard-constraint prompts, streaming-call wrapper around `AIService` |
| `src/commands/readerCommand.ts` | `ReaderPanel` class (single-source map), command registration, webview HTML, message bridge |
| `media/webview-reader/index.ts` | Reader webview shell: top bar UI, chunk injection, image-src rewriting, regenerate/export buttons |
| `media/webview-reader/styles.css` | Reader webview shell styles |
| `src/test/utils/frontmatter.test.ts` | Frontmatter regression tests |
| `src/test/utils/assetInliner.test.ts` | Asset inliner unit tests |
| `src/test/core/reader.test.ts` | Prompt assembly unit tests |

### Files to modify

| Path | Modification |
|---|---|
| `src/core/types.ts` | Add `RENDER`, `RENDER_BLOG`, `RENDER_SKIM`, `RENDER_EXPL` to `BBCmd` enum |
| `src/services/webviewProtocol.ts` | Add separate `ReaderWebviewMessage` / `ReaderHostMessage` unions (do NOT extend BB Editor unions) |
| `src/services/WebviewBridge.ts` | Replace local `extractFrontmatter` function with an import from `src/utils/frontmatter.ts` |
| `src/commands/bbCommand.ts` | After `cmd` resolution, dispatch `bb-render*` prefixes to `ReaderPanel.openForDocument` and return early before `currentEditor` is set |
| `src/commands/index.ts` | Add `registerReaderCommand` to `registerAllCommands` |
| `media/webview/bb-slash-plugin.ts` | Add a `render` group with 4 items |
| `esbuild.js` | Add a third esbuild context for `media/webview-reader/index.ts` → `dist/webview-reader.js` |
| `package.json` | Add `blogbuddy.reader.inlineAssets` config |
| `docs/help.md` | Document the new tag family |
| `docs/help_中文.md` | Document the new tag family (Chinese) |

---

## Task 1: Lift `extractFrontmatter` into a shared utility

**Files:**
- Create: `src/utils/frontmatter.ts`
- Create: `src/test/utils/frontmatter.test.ts`
- Modify: `src/services/WebviewBridge.ts:381-393` (remove local function), `src/services/WebviewBridge.ts:62` (import + use)

This is a pure refactor with no behavior change. Tests pin down the existing behavior so the Reader can safely reuse the same parser.

- [ ] **Step 1: Write failing tests for the existing parser**

Create `src/test/utils/frontmatter.test.ts`:

```ts
import * as assert from 'assert';
import { extractFrontmatter } from '../../utils/frontmatter';

suite('extractFrontmatter', () => {
    test('extracts YAML frontmatter', () => {
        const input = '---\ntitle: Hello\ndate: 2026-05-15\n---\n\n# Body';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '---\ntitle: Hello\ndate: 2026-05-15\n---\n');
        assert.strictEqual(body, '\n# Body');
    });

    test('extracts TOML frontmatter', () => {
        const input = '+++\ntitle = "Hello"\n+++\n\n# Body';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '+++\ntitle = "Hello"\n+++\n');
        assert.strictEqual(body, '\n# Body');
    });

    test('handles CRLF line endings', () => {
        const input = '---\r\ntitle: Hello\r\n---\r\n\r\n# Body';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '---\r\ntitle: Hello\r\n---\r\n');
        assert.strictEqual(body, '\r\n# Body');
    });

    test('returns empty frontmatter when none present', () => {
        const input = '# Just a heading\n\nText.';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '');
        assert.strictEqual(body, input);
    });

    test('ignores frontmatter that does not start at file beginning', () => {
        const input = 'leading text\n---\ntitle: Hello\n---\n';
        const { frontmatter, body } = extractFrontmatter(input);
        assert.strictEqual(frontmatter, '');
        assert.strictEqual(body, input);
    });
});
```

- [ ] **Step 2: Verify the tests fail (module does not exist)**

Run:
```bash
npm run compile-tests && npm run test
```
Expected: build error like `Cannot find module '../../utils/frontmatter'`.

- [ ] **Step 3: Create the shared utility**

Create `src/utils/frontmatter.ts`:

```ts
/**
 * Parse YAML (`---`) or TOML (`+++`) frontmatter from the head of a document.
 * Returns the raw frontmatter block (including delimiters and trailing newline)
 * and the remaining body. Frontmatter is only recognized at the start of input.
 */
export function extractFrontmatter(content: string): { frontmatter: string; body: string } {
    const yamlMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    if (yamlMatch) {
        return { frontmatter: yamlMatch[0], body: content.slice(yamlMatch[0].length) };
    }
    const tomlMatch = content.match(/^\+\+\+\r?\n[\s\S]*?\r?\n\+\+\+\r?\n?/);
    if (tomlMatch) {
        return { frontmatter: tomlMatch[0], body: content.slice(tomlMatch[0].length) };
    }
    return { frontmatter: '', body: content };
}
```

- [ ] **Step 4: Update `WebviewBridge.ts` to import from the new location**

In `src/services/WebviewBridge.ts`, add the import near the top (after existing imports):

```ts
import { extractFrontmatter } from '../utils/frontmatter';
```

Then **delete** the local `function extractFrontmatter(...)` definition (lines ~381-393, the body shown in §Step 3 — duplicate code). Leave the call site at line 62 unchanged; it now resolves to the imported function.

- [ ] **Step 5: Run all tests and typecheck**

Run:
```bash
npm run compile-tests && npm run check-types && npm run lint && npm run test
```
Expected: all tests pass, no type errors, no lint errors. The existing BB Editor flow is unchanged because the function signature and behavior are identical.

- [ ] **Step 6: Commit**

```bash
git add src/utils/frontmatter.ts src/test/utils/frontmatter.test.ts src/services/WebviewBridge.ts
git commit -m "$(cat <<'EOF'
Extract frontmatter parser into shared utility

Lifts extractFrontmatter from WebviewBridge into src/utils/ so the
upcoming AI Reader can reuse it without re-implementing. Behavior
preserved; regression tests added for YAML, TOML, CRLF, and no-
frontmatter cases.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Asset inliner utility

**Files:**
- Create: `src/utils/assetInliner.ts`
- Create: `src/test/utils/assetInliner.test.ts`

Pure function: given an HTML string and a base directory, replace every `<img src="...">` whose src is a local relative path with `data:image/<ext>;base64,<...>`. Leave `https:`, `http:`, and `data:` srcs alone. If a referenced file is missing, log a warning and leave the src as-is (do not fail).

- [ ] **Step 1: Write failing tests**

Create `src/test/utils/assetInliner.test.ts`:

```ts
import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { inlineImageAssets } from '../../utils/assetInliner';

suite('inlineImageAssets', () => {
    let tmpDir: string;

    setup(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-asset-test-'));
    });

    teardown(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    test('inlines a local PNG image', async () => {
        const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        await fs.writeFile(path.join(tmpDir, 'pic.png'), pngBytes);
        const html = '<p><img src="pic.png" alt="x"></p>';
        const result = await inlineImageAssets(html, tmpDir);
        assert.match(result, /^<p><img src="data:image\/png;base64,[A-Za-z0-9+/]+={0,2}" alt="x"><\/p>$/);
    });

    test('inlines a JPG image with proper mime', async () => {
        await fs.writeFile(path.join(tmpDir, 'photo.jpg'), Buffer.from([0xff, 0xd8, 0xff]));
        const html = '<img src="photo.jpg">';
        const result = await inlineImageAssets(html, tmpDir);
        assert.ok(result.includes('data:image/jpeg;base64,'));
    });

    test('leaves https URLs untouched', async () => {
        const html = '<img src="https://example.com/x.png">';
        const result = await inlineImageAssets(html, tmpDir);
        assert.strictEqual(result, html);
    });

    test('leaves data URIs untouched', async () => {
        const html = '<img src="data:image/png;base64,iVBORw0=">';
        const result = await inlineImageAssets(html, tmpDir);
        assert.strictEqual(result, html);
    });

    test('leaves missing local files as-is', async () => {
        const html = '<img src="ghost.png">';
        const result = await inlineImageAssets(html, tmpDir);
        assert.strictEqual(result, html);
    });

    test('handles multiple images in one document', async () => {
        await fs.writeFile(path.join(tmpDir, 'a.png'), Buffer.from([0x89, 0x50]));
        await fs.writeFile(path.join(tmpDir, 'b.gif'), Buffer.from([0x47, 0x49, 0x46]));
        const html = '<img src="a.png"><img src="https://x/y.png"><img src="b.gif">';
        const result = await inlineImageAssets(html, tmpDir);
        const matches = result.match(/data:image\/(png|gif);base64,/g);
        assert.strictEqual(matches?.length, 2);
        assert.ok(result.includes('https://x/y.png'));
    });

    test('resolves subdirectory paths', async () => {
        await fs.mkdir(path.join(tmpDir, 'sub'));
        await fs.writeFile(path.join(tmpDir, 'sub', 'nested.png'), Buffer.from([0x89]));
        const html = '<img src="sub/nested.png">';
        const result = await inlineImageAssets(html, tmpDir);
        assert.ok(result.includes('data:image/png;base64,'));
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run:
```bash
npm run compile-tests && npm run test
```
Expected: module-not-found error for `../../utils/assetInliner`.

- [ ] **Step 3: Implement the utility**

Create `src/utils/assetInliner.ts`:

```ts
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
            if (!mime) { return; }

            const filePath = path.resolve(baseDir, decodeURIComponent(src));
            try {
                const buf = await fs.readFile(filePath);
                const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
                const replaced = match.replace(src, dataUri);
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
```

- [ ] **Step 4: Run tests and verify they pass**

Run:
```bash
npm run compile-tests && npm run check-types && npm run lint && npm run test
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/assetInliner.ts src/test/utils/assetInliner.test.ts
git commit -m "$(cat <<'EOF'
Add asset inliner utility for HTML export

Pure function that walks an HTML string and replaces local-path
<img src> values with base64 data: URIs, leaving http(s), data:,
and vscode-webview: URLs alone. Missing files are skipped with a
warning rather than failing the whole export.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add render command enum entries

**Files:**
- Modify: `src/core/types.ts`

Types-only change. Adds the four new `BBCmd` values so `bbCommand.ts`'s `Object.values(BBCmd).find(...)` resolves them.

- [ ] **Step 1: Add enum entries**

In `src/core/types.ts`, replace the `BBCmd` enum (lines 3-12) with:

```ts
export enum BBCmd {
    NORMAL = 'bb',          // 直接给 Bgent 指令
    EXPAND = 'bb-expd',     // 扩写
    IMPROVE = 'bb-impv',    // 润色
    MERMAID = 'bb-mmd',     // 生成 Mermaid
    TRANSLATE = 'bb-tslt',  // 翻译
    KEYWORD = 'bb-kwd',     // 提取关键词
    TLDR = 'bb-tldr',       // 加入省流
    TAG = 'bb-tag',         // 加入 BBtag
    // Reader (Task 3+) — these route to ReaderPanel, not inline replacement.
    RENDER = 'bb-render',           // 自定义 prompt 渲染
    RENDER_BLOG = 'bb-render-blog', // 博客风格阅读视图
    RENDER_SKIM = 'bb-render-skim', // 快速扫读视图
    RENDER_EXPL = 'bb-render-expl', // 教学/讲解视图
}
```

- [ ] **Step 2: Verify typecheck still passes**

Run:
```bash
npm run check-types
```
Expected: no errors. (The new values are not yet dispatched anywhere, but they should not break the existing exhaustive switch in `src/core/bb.ts` because that switch's `default` branch throws `UNKNOWN_ERROR` for unknown commands. We won't reach it because the dispatch in Task 8 returns early.)

- [ ] **Step 3: Commit**

```bash
git add src/core/types.ts
git commit -m "$(cat <<'EOF'
Add render command entries to BBCmd enum

Reserves bb-render, bb-render-blog, bb-render-skim, bb-render-expl
for the upcoming AI Reader View. These tags will be routed to a
new ReaderPanel instead of the inline-replacement path; this
commit only registers the strings.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add Reader webview protocol types

**Files:**
- Modify: `src/services/webviewProtocol.ts`

Separate union from the BB Editor protocol — `ReaderWebviewMessage` and `ReaderHostMessage`. The existing `WebviewMessage` / `HostMessage` unions are untouched so the BB Editor's WebviewBridge does not change.

- [ ] **Step 1: Append new types**

At the end of `src/services/webviewProtocol.ts`, append:

```ts
// ===== Reader Webview ↔ Extension Host =====

// Webview → Host
export interface ReaderReadyMessage { type: 'reader-ready'; }
export interface ReaderRegenerateMessage { type: 'reader-regenerate'; }
export interface ReaderExportMessage { type: 'reader-export'; html: string; }

export type ReaderWebviewMessage =
    | ReaderReadyMessage
    | ReaderRegenerateMessage
    | ReaderExportMessage;

// Host → Webview
export interface ReaderInitMessage {
    type: 'reader-init';
    sourceFileName: string;        // basename for the title bar
    preset: string;                // human-readable preset name (e.g. "Blog View")
    userPrompt: string;            // empty string if not provided
    baseUri: string;               // webview URI to source's directory (for image rewriting)
    estInputTokens: number;        // heuristic chars/4
}
export interface ReaderStartMessage { type: 'reader-start'; }
export interface ReaderChunkMessage { type: 'reader-chunk'; text: string; }
export interface ReaderDoneMessage {
    type: 'reader-done';
    fullHtml: string;
    tokensUsed: number;
    costUsd?: number;
    durationMs: number;
}
export interface ReaderErrorMessage { type: 'reader-error'; message: string; }
export interface ReaderSourceChangedMessage { type: 'reader-source-changed'; }
export interface ReaderSourceClosedMessage { type: 'reader-source-closed'; }
export interface ReaderExportResultMessage {
    type: 'reader-export-result';
    success: boolean;
    filePath?: string;
    error?: string;
}
export interface ReaderThemeMessage {
    type: 'reader-theme';
    kind: 'light' | 'dark' | 'highContrast';
}

export type ReaderHostMessage =
    | ReaderInitMessage
    | ReaderStartMessage
    | ReaderChunkMessage
    | ReaderDoneMessage
    | ReaderErrorMessage
    | ReaderSourceChangedMessage
    | ReaderSourceClosedMessage
    | ReaderExportResultMessage
    | ReaderThemeMessage;
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npm run check-types
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/webviewProtocol.ts
git commit -m "$(cat <<'EOF'
Add Reader webview protocol types

Separate ReaderWebviewMessage / ReaderHostMessage unions for the AI
Reader webview, distinct from the BB Editor unions so the existing
WebviewBridge is untouched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Reader core — presets and prompt assembly

**Files:**
- Create: `src/core/reader.ts`
- Create: `src/test/core/reader.test.ts`

The core layer owns the preset prompt library and the function that assembles the final `ChatCompletionMessageParam[]` from `(preset, userPrompt, frontmatter, body, sourceFileName)`. AIService streaming happens here too, so `ReaderPanel` does not import OpenAI types directly.

- [ ] **Step 1: Write failing tests for prompt assembly**

Create `src/test/core/reader.test.ts`:

```ts
import * as assert from 'assert';
import { BBCmd } from '../../core/types';
import { buildReaderMessages, getPresetDisplayName, isRenderCmd } from '../../core/reader';

suite('reader.buildReaderMessages', () => {
    test('Blog View preset uses BLOG system prompt', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG,
            userPrompt: '',
            frontmatter: '',
            body: '# Hello',
            sourceFileName: 'post.md',
        });
        assert.strictEqual(msgs.length, 2);
        assert.strictEqual(msgs[0].role, 'system');
        assert.ok(
            typeof msgs[0].content === 'string' && msgs[0].content.includes('polished'),
            'Blog View system prompt should mention "polished"',
        );
    });

    test('Skim Mode preset is distinct from Blog View', () => {
        const blog = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG, userPrompt: '', frontmatter: '', body: 'x', sourceFileName: 'a.md',
        });
        const skim = buildReaderMessages({
            cmd: BBCmd.RENDER_SKIM, userPrompt: '', frontmatter: '', body: 'x', sourceFileName: 'a.md',
        });
        assert.notStrictEqual(blog[0].content, skim[0].content);
    });

    test('user prompt is appended as "Additionally:" line', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG,
            userPrompt: 'make it slidy',
            frontmatter: '',
            body: '# Hi',
            sourceFileName: 'a.md',
        });
        assert.ok(
            typeof msgs[0].content === 'string' && msgs[0].content.includes('Additionally: make it slidy'),
        );
    });

    test('Custom render uses the user prompt as the primary instruction', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER,
            userPrompt: 'turn it into a slide deck',
            frontmatter: '',
            body: '# Hi',
            sourceFileName: 'a.md',
        });
        // System still contains hard constraints; user prompt is the steering signal.
        assert.ok(typeof msgs[0].content === 'string' && msgs[0].content.length > 0);
        assert.ok(typeof msgs[1].content === 'string' && msgs[1].content.includes('turn it into a slide deck') === false,
            'For custom render, user instruction goes into the system message, not the user message');
        assert.ok(typeof msgs[0].content === 'string' && msgs[0].content.includes('turn it into a slide deck'));
    });

    test('frontmatter is included in the user message as a labeled block', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG,
            userPrompt: '',
            frontmatter: '---\ntitle: Hello\n---\n',
            body: '# Body',
            sourceFileName: 'a.md',
        });
        const userContent = typeof msgs[1].content === 'string' ? msgs[1].content : '';
        assert.ok(userContent.includes('Frontmatter'));
        assert.ok(userContent.includes('title: Hello'));
        assert.ok(userContent.includes('# Body'));
    });

    test('omits frontmatter section when empty', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG, userPrompt: '', frontmatter: '', body: '# B', sourceFileName: 'a.md',
        });
        const userContent = typeof msgs[1].content === 'string' ? msgs[1].content : '';
        assert.ok(!/Frontmatter/i.test(userContent));
    });

    test('source filename appears in the user message', () => {
        const msgs = buildReaderMessages({
            cmd: BBCmd.RENDER_BLOG, userPrompt: '', frontmatter: '', body: '# B', sourceFileName: 'my-post.md',
        });
        const userContent = typeof msgs[1].content === 'string' ? msgs[1].content : '';
        assert.ok(userContent.includes('my-post.md'));
    });
});

suite('reader.getPresetDisplayName', () => {
    test('maps each enum value to a human label', () => {
        assert.strictEqual(getPresetDisplayName(BBCmd.RENDER), 'Custom');
        assert.strictEqual(getPresetDisplayName(BBCmd.RENDER_BLOG), 'Blog View');
        assert.strictEqual(getPresetDisplayName(BBCmd.RENDER_SKIM), 'Skim Mode');
        assert.strictEqual(getPresetDisplayName(BBCmd.RENDER_EXPL), 'Explainer');
    });
});

suite('reader.isRenderCmd', () => {
    test('returns true for render commands', () => {
        assert.strictEqual(isRenderCmd('bb-render'), true);
        assert.strictEqual(isRenderCmd('bb-render-blog'), true);
        assert.strictEqual(isRenderCmd('bb-render-skim'), true);
        assert.strictEqual(isRenderCmd('bb-render-expl'), true);
    });
    test('returns false for non-render commands', () => {
        assert.strictEqual(isRenderCmd('bb'), false);
        assert.strictEqual(isRenderCmd('bb-expd'), false);
        assert.strictEqual(isRenderCmd('bb-renderer'), false);  // not in our enum
    });
});
```

- [ ] **Step 2: Run tests, confirm failure**

Run:
```bash
npm run compile-tests && npm run test
```
Expected: module-not-found error.

- [ ] **Step 3: Implement `src/core/reader.ts`**

Create `src/core/reader.ts`:

```ts
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { AIService } from '../services/AIService';
import { BBCmd } from './types';

// ---- Hard constraints applied to every preset ----

const HARD_CONSTRAINTS = `
You are generating a self-contained HTML document for human reading.

Output requirements:
- Begin with <!DOCTYPE html> and a complete HTML document.
- All CSS must be inline in a <style> block in <head>. No external stylesheets.
- Support both light and dark themes via prefers-color-scheme.
- You may use <svg> for diagrams, and <script> for interactivity — but only INLINE.
  No external <script src="..."> or fetch() — there is no network.
- For images that appear in the source Markdown, KEEP the markdown URL string
  AS-IS in <img src="...">. The renderer translates paths before display.
- Do not echo the source Markdown verbatim as a code block. Render it.

You do NOT need to preserve the exact prose of the source; you may restructure,
summarize, or visualize as the preset directs. But do not invent factual claims
that contradict the source.
`.trim();

// ---- Preset system prompts ----

const PRESET_BLOG = `
You are rendering a polished, readable article. Use a clear hierarchy with an
in-page table of contents at the top (auto-generated from the headings). Use
callout boxes for note-worthy passages and "key takeaway" pull-quotes. Syntax-
highlight code blocks with inline CSS. Use generous whitespace and a body width
around 720px on wide screens — comfortable on a laptop. Pick a serif body and
a sans display heading. The goal: this should look like a hand-designed blog
post a reader would want to bookmark.
`.trim();

const PRESET_SKIM = `
Optimize for fast scanning. Lead with a one-paragraph TL;DR at the very top in
a tinted box. Use tables, badges, and tight sidebars heavily. Wrap any
elaboration that the reader can skip on a first pass in <details> collapsibles
with a clear summary line. Use SVG icons next to section headings to anchor
the eye. Pick a compact, modern sans typeface. The goal: a reader spends 30
seconds on this page and walks away with the spine of the document.
`.trim();

const PRESET_EXPL = `
Turn this into a teaching artifact. Where the source describes a concept,
system, or workflow, generate an SVG diagram (flowchart, sequence, anatomy
labels — whatever fits) to visualize it. Annotate every code block with
margin notes explaining what each section does. Add "Why this matters" or
"Common pitfall" sidebars on key sections. Use a clean, didactic visual
language with strong typographic hierarchy. The goal: someone unfamiliar
with the topic can learn from this in a single read.
`.trim();

function getSystemPromptForPreset(cmd: BBCmd): string {
    switch (cmd) {
        case BBCmd.RENDER_BLOG: return PRESET_BLOG;
        case BBCmd.RENDER_SKIM: return PRESET_SKIM;
        case BBCmd.RENDER_EXPL: return PRESET_EXPL;
        case BBCmd.RENDER:      return ''; // custom — user prompt is the only steer
        default: throw new Error(`getSystemPromptForPreset: not a render cmd: ${cmd}`);
    }
}

// ---- Public API ----

export function isRenderCmd(cmd: string): cmd is BBCmd.RENDER | BBCmd.RENDER_BLOG | BBCmd.RENDER_SKIM | BBCmd.RENDER_EXPL {
    return (
        cmd === BBCmd.RENDER ||
        cmd === BBCmd.RENDER_BLOG ||
        cmd === BBCmd.RENDER_SKIM ||
        cmd === BBCmd.RENDER_EXPL
    );
}

export function getPresetDisplayName(cmd: BBCmd): string {
    switch (cmd) {
        case BBCmd.RENDER:       return 'Custom';
        case BBCmd.RENDER_BLOG:  return 'Blog View';
        case BBCmd.RENDER_SKIM:  return 'Skim Mode';
        case BBCmd.RENDER_EXPL:  return 'Explainer';
        default: return cmd;
    }
}

export interface BuildMessagesInput {
    cmd: BBCmd;
    userPrompt: string;
    frontmatter: string;   // raw frontmatter block (with delimiters) or ''
    body: string;          // Markdown body (frontmatter already stripped)
    sourceFileName: string;
}

export function buildReaderMessages(input: BuildMessagesInput): ChatCompletionMessageParam[] {
    const preset = getSystemPromptForPreset(input.cmd);
    const userPrompt = input.userPrompt.trim();

    // System message: hard constraints + preset (if any) + user steering (custom or "Additionally:")
    const systemParts: string[] = [HARD_CONSTRAINTS];
    if (preset) { systemParts.push(preset); }
    if (userPrompt) {
        if (input.cmd === BBCmd.RENDER) {
            // Custom render: user prompt IS the primary creative direction.
            systemParts.push(`User direction: ${userPrompt}`);
        } else {
            systemParts.push(`Additionally: ${userPrompt}`);
        }
    }

    // User message: file context + frontmatter + body
    const userParts: string[] = [`File: ${input.sourceFileName}`];
    if (input.frontmatter.trim()) {
        userParts.push(`Frontmatter:\n${input.frontmatter.trim()}`);
    }
    userParts.push('---', input.body);

    return [
        { role: 'system', content: systemParts.join('\n\n') },
        { role: 'user',   content: userParts.join('\n\n') },
    ];
}

// ---- Streaming call wrapper ----

/**
 * Run the render request through AIService streaming. Returns an async generator
 * yielding raw text deltas and finally the accumulated full text. Caller is
 * responsible for forwarding to the webview and tracking cancellation.
 */
export async function runReaderStream(input: BuildMessagesInput): Promise<AsyncGenerator<string, string, unknown>> {
    const messages = buildReaderMessages(input);
    return AIService.getInstance().chatStreaming(messages, 'render');
}
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
npm run compile-tests && npm run check-types && npm run lint && npm run test
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/reader.ts src/test/core/reader.test.ts
git commit -m "$(cat <<'EOF'
Add Reader core: presets, prompt assembly, AIService wrapper

Pure-function preset library plus buildReaderMessages() that
assembles system + user messages for AIService.chatStreaming.
Four presets: Blog View / Skim Mode / Explainer / Custom. Custom
routes the user prompt to the system message as the primary
creative direction; the other three append it as "Additionally:".

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Reader webview shell + esbuild wiring

**Files:**
- Create: `media/webview-reader/index.ts`
- Create: `media/webview-reader/styles.css`
- Modify: `esbuild.js`

This is the in-browser code that runs inside the webview. v6.1 of this task implements only the **empty state** — the panel can open and show a placeholder. Streaming, regenerate, and export are wired in later tasks.

- [ ] **Step 1: Add the webview-reader esbuild context**

In `esbuild.js`, after the `webviewCtx` definition (around line 62), add a third context:

```js
        // Reader webview bundle (Browser, IIFE)
        const readerCtx = await esbuild.context({
            entryPoints: [
                'media/webview-reader/index.ts'
            ],
            bundle: true,
            format: 'iife',
            minify: production,
            sourcemap: !production,
            sourcesContent: false,
            platform: 'browser',
            outfile: 'dist/webview-reader.js',
            logLevel: 'silent',
            plugins: [
                esbuildProblemMatcherPlugin,
            ],
        });
```

Then update the `if (watch)` / `else` block at the bottom of `main()`:

```js
        if (watch) {
            await extensionCtx.watch();
            await webviewCtx.watch();
            await readerCtx.watch();
        } else {
            await extensionCtx.rebuild();
            await webviewCtx.rebuild();
            await readerCtx.rebuild();
            await extensionCtx.dispose();
            await webviewCtx.dispose();
            await readerCtx.dispose();
        }
```

- [ ] **Step 2: Create the webview entry point (empty state only)**

Create `media/webview-reader/index.ts`:

```ts
import type {
    ReaderWebviewMessage,
    ReaderHostMessage,
} from '../../src/services/webviewProtocol';

// VS Code webview API — provided at runtime by VS Code, declare for TS.
declare function acquireVsCodeApi(): {
    postMessage: (msg: ReaderWebviewMessage) => void;
    getState: () => unknown;
    setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

// ---- DOM ----

const appHtml = `
<div class="bb-reader">
    <div class="bb-reader__topbar">
        <div class="bb-reader__row1">
            <span id="phase" class="bb-reader__phase">Idle</span>
            <span id="tail" class="bb-reader__tail"></span>
        </div>
        <div class="bb-reader__row2">
            <div class="bb-reader__progress"><div id="progress-fill" class="bb-reader__progress-fill"></div></div>
        </div>
        <div class="bb-reader__row3">
            <span id="user-prompt-echo" class="bb-reader__user-prompt"></span>
            <span class="bb-reader__spacer"></span>
            <span id="cost" class="bb-reader__cost"></span>
            <button id="btn-regenerate" class="bb-reader__btn" disabled>↻ Regenerate</button>
            <button id="btn-export" class="bb-reader__btn bb-reader__btn--primary" disabled>⬇ Export</button>
        </div>
        <div id="source-banner" class="bb-reader__banner bb-reader__banner--hidden">
            <span id="banner-msg">Source changed</span>
            <button id="banner-regen" class="bb-reader__banner-btn">Regenerate</button>
            <button id="banner-dismiss" class="bb-reader__banner-btn-icon" aria-label="Dismiss">×</button>
        </div>
    </div>
    <div id="ai-output" class="bb-reader__output">
        <div class="bb-reader__empty">Waiting for source…</div>
    </div>
</div>
`;
document.body.innerHTML = appHtml;

// ---- State ----

let baseUri = '';
let lastFullHtml = ''; // canonical accumulated text from render-done

// ---- Helpers ----

function $(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) { throw new Error(`#${id} missing`); }
    return el;
}

function setPhase(text: string): void { $('phase').textContent = text; }
function setTail(text: string): void { $('tail').textContent = text; }
function setProgress(percent: number): void {
    $('progress-fill').style.width = `${Math.min(100, Math.max(0, percent))}%`;
}
function setUserPromptEcho(text: string): void {
    $('user-prompt-echo').textContent = text ? `↳ Custom: "${text}"` : '';
}
function setCost(tokens: number, cost?: number): void {
    const tokStr = tokens ? `${tokens.toLocaleString()} tok` : '';
    const costStr = cost !== undefined ? `· $${cost.toFixed(4)}` : '';
    $('cost').textContent = `${tokStr} ${costStr}`.trim();
}

// ---- Bootstrap ----

window.addEventListener('message', (event: MessageEvent<ReaderHostMessage>) => {
    handleHost(event.data);
});

vscode.postMessage({ type: 'reader-ready' });

// Stub handler — full body lives in Task 9.
function handleHost(msg: ReaderHostMessage): void {
    switch (msg.type) {
        case 'reader-init':
            baseUri = msg.baseUri;
            $('user-prompt-echo').textContent = msg.userPrompt ? `↳ Custom: "${msg.userPrompt}"` : '';
            setPhase(`Initialized (${msg.preset})`);
            void baseUri; // suppress unused warning until Task 9
            break;
        default:
            // Other messages handled in later tasks. No-op for now.
            break;
    }
}

// Mark unused to silence TS until Task 9 wires them up.
void setTail; void setProgress; void setCost; void setUserPromptEcho; void lastFullHtml;
```

- [ ] **Step 3: Create the styles**

Create `media/webview-reader/styles.css`:

```css
:root {
    --bb-bg: var(--vscode-editor-background, #1e1e1e);
    --bb-fg: var(--vscode-editor-foreground, #d4d4d4);
    --bb-bar-bg: var(--vscode-editorWidget-background, #252526);
    --bb-bar-border: var(--vscode-editorWidget-border, #454545);
    --bb-accent: var(--vscode-button-background, #0e639c);
    --bb-accent-fg: var(--vscode-button-foreground, #ffffff);
    --bb-muted: var(--vscode-descriptionForeground, #999);
    --bb-progress-bg: var(--vscode-progressBar-background, #0e639c);
}

* { box-sizing: border-box; }

body {
    margin: 0;
    padding: 0;
    background: var(--bb-bg);
    color: var(--bb-fg);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    height: 100vh;
    overflow: hidden;
}

.bb-reader {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.bb-reader__topbar {
    flex: 0 0 auto;
    padding: 8px 12px;
    background: var(--bb-bar-bg);
    border-bottom: 1px solid var(--bb-bar-border);
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.bb-reader__row1 {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 20px;
}
.bb-reader__phase {
    font-weight: 600;
    flex: 0 0 auto;
}
.bb-reader__tail {
    flex: 1 1 auto;
    color: var(--bb-muted);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.bb-reader__row2 {
    height: 4px;
}
.bb-reader__progress {
    height: 4px;
    background: var(--bb-bar-border);
    border-radius: 2px;
    overflow: hidden;
}
.bb-reader__progress-fill {
    height: 100%;
    width: 0;
    background: var(--bb-progress-bg);
    transition: width 0.2s ease-out;
}

.bb-reader__row3 {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 28px;
}
.bb-reader__user-prompt {
    color: var(--bb-muted);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 50%;
}
.bb-reader__spacer { flex: 1 1 auto; }
.bb-reader__cost {
    color: var(--bb-muted);
    font-size: 12px;
}
.bb-reader__btn {
    background: transparent;
    color: var(--bb-fg);
    border: 1px solid var(--bb-bar-border);
    padding: 4px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
}
.bb-reader__btn:hover:not(:disabled) {
    background: var(--bb-bar-border);
}
.bb-reader__btn:disabled {
    opacity: 0.5;
    cursor: default;
}
.bb-reader__btn--primary {
    background: var(--bb-accent);
    color: var(--bb-accent-fg);
    border-color: var(--bb-accent);
}
.bb-reader__btn--primary:hover:not(:disabled) {
    filter: brightness(1.1);
}

.bb-reader__banner {
    margin-top: 8px;
    padding: 6px 10px;
    background: var(--vscode-inputValidation-warningBackground, #5a4a00);
    border: 1px solid var(--vscode-inputValidation-warningBorder, #b89500);
    border-radius: 3px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
}
.bb-reader__banner--hidden { display: none; }
.bb-reader__banner-btn {
    background: transparent;
    color: var(--bb-fg);
    border: 1px solid currentColor;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
}
.bb-reader__banner-btn-icon {
    background: transparent;
    color: var(--bb-fg);
    border: none;
    cursor: pointer;
    font-size: 16px;
    margin-left: auto;
}

.bb-reader__output {
    flex: 1 1 auto;
    overflow: auto;
    /* AI-generated HTML gets injected here — it brings its own styling */
    background: #ffffff;
    color: #111;
}

.bb-reader__empty {
    padding: 40px;
    text-align: center;
    color: var(--bb-muted);
    font-style: italic;
    background: var(--bb-bg);
    color: var(--bb-fg);
}
```

- [ ] **Step 4: Build and verify**

Run:
```bash
npm run compile
```
Expected: build succeeds; `dist/webview-reader.js` and (currently no separate CSS file because we'll inline-load via webview HTML — esbuild bundles CSS only if it's imported by the entry, and we're not importing it).

**Note on CSS:** the existing BB Editor webview emits `dist/webview.css` because Milkdown imports CSS via JS. Our Reader does not import CSS in TS, so esbuild won't emit a CSS file. The Reader's HTML wrapper (Task 7) loads `styles.css` directly via `<link>` from the `media/webview-reader/` source path, using `webview.asWebviewUri`. **Update `localResourceRoots` in Task 7 accordingly.**

- [ ] **Step 5: Commit**

```bash
git add esbuild.js media/webview-reader/index.ts media/webview-reader/styles.css
git commit -m "$(cat <<'EOF'
Add Reader webview shell and esbuild wiring

New media/webview-reader/ bundle compiled by a third esbuild context
to dist/webview-reader.js. Shell contains the top status bar (phase,
progress, tail preview, prompt echo, cost meter, Regenerate/Export
buttons) and an empty <div id="ai-output"> for the AI HTML payload.
Behavior beyond the empty state lands in later tasks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: ReaderPanel skeleton + open flow

**Files:**
- Create: `src/commands/readerCommand.ts`

Implements the `ReaderPanel` class up to the point where opening a panel works: webview HTML loaded, `reader-init` sent, theme posted, but no AI streaming yet. The dispatch from `bbCommand` is wired separately in Task 8 — for now `ReaderPanel.openForDocument` is exported and callable but unused.

- [ ] **Step 1: Create `src/commands/readerCommand.ts`**

```ts
import * as vscode from 'vscode';
import * as path from 'path';
import { BBCmd } from '../core/types';
import { getPresetDisplayName } from '../core/reader';
import type { ReaderHostMessage, ReaderWebviewMessage } from '../services/webviewProtocol';

export function registerReaderCommand(_context: vscode.ExtensionContext): void {
    // No contributed VS Code command in v1 — Reader is fired exclusively via
    // bb-render* tags routed through blogbuddy.bb. This registrar exists so
    // future entry points (right-click, palette) can be added without rewriting
    // the call site in commands/index.ts.
}

export class ReaderPanel implements vscode.Disposable {
    private static panels = new Map<string, ReaderPanel>();

    /**
     * Open a Reader panel for the given document (revealing it if one already
     * exists for the same source URI). After this returns, the panel is loaded
     * and has received `reader-init`. Streaming is kicked off in Task 9.
     */
    static async openForDocument(
        context: vscode.ExtensionContext,
        sourceDoc: vscode.TextDocument,
        cmd: BBCmd,
        userPrompt: string,
    ): Promise<void> {
        const key = sourceDoc.uri.toString();
        const existing = ReaderPanel.panels.get(key);
        if (existing) {
            existing.panel.reveal(vscode.ViewColumn.Beside, /* preserveFocus */ false);
            existing.applyNewRequest(cmd, userPrompt);
            return;
        }
        const panel = new ReaderPanel(context, sourceDoc, cmd, userPrompt);
        ReaderPanel.panels.set(key, panel);
        panel.panel.onDidDispose(() => {
            ReaderPanel.panels.delete(key);
            panel.dispose();
        });
        await panel.bootstrap();
    }

    private readonly panel: vscode.WebviewPanel;
    private readonly disposables: vscode.Disposable[] = [];
    private cmd: BBCmd;
    private userPrompt: string;
    private webviewReady = false;
    private pendingInit = false;

    private constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly sourceDoc: vscode.TextDocument,
        cmd: BBCmd,
        userPrompt: string,
    ) {
        this.cmd = cmd;
        this.userPrompt = userPrompt;

        const sourceDir = path.dirname(sourceDoc.uri.fsPath);
        this.panel = vscode.window.createWebviewPanel(
            'blogbuddy.reader',
            `BB Reader: ${path.basename(sourceDoc.uri.fsPath)}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'dist'),
                    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview-reader'),
                    vscode.Uri.file(sourceDir),
                ],
            },
        );

        this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png');
        this.panel.webview.html = this.getWebviewHtml();

        this.disposables.push(
            this.panel.webview.onDidReceiveMessage((m: ReaderWebviewMessage) => this.onMessage(m)),
            vscode.window.onDidChangeActiveColorTheme((t) => this.postTheme(t.kind)),
        );
    }

    private async bootstrap(): Promise<void> {
        // The webview will post 'reader-ready' once mounted; we then send init.
        this.pendingInit = true;
        if (this.webviewReady) {
            this.sendInit();
        }
    }

    private applyNewRequest(cmd: BBCmd, userPrompt: string): void {
        this.cmd = cmd;
        this.userPrompt = userPrompt;
        this.sendInit();
    }

    private onMessage(msg: ReaderWebviewMessage): void {
        switch (msg.type) {
            case 'reader-ready':
                this.webviewReady = true;
                if (this.pendingInit) {
                    this.sendInit();
                    this.pendingInit = false;
                }
                break;
            // Other messages handled in later tasks.
            default: break;
        }
    }

    private sendInit(): void {
        const sourceDir = path.dirname(this.sourceDoc.uri.fsPath);
        const baseUri = this.panel.webview.asWebviewUri(vscode.Uri.file(sourceDir)).toString();
        const text = this.sourceDoc.getText();
        const estInputTokens = Math.ceil(text.length / 4);

        this.post({
            type: 'reader-init',
            sourceFileName: path.basename(this.sourceDoc.uri.fsPath),
            preset: getPresetDisplayName(this.cmd),
            userPrompt: this.userPrompt,
            baseUri,
            estInputTokens,
        });
        this.postTheme(vscode.window.activeColorTheme.kind);
    }

    private postTheme(kind: vscode.ColorThemeKind): void {
        this.post({
            type: 'reader-theme',
            kind: kind === vscode.ColorThemeKind.Light
                ? 'light'
                : kind === vscode.ColorThemeKind.HighContrast || kind === vscode.ColorThemeKind.HighContrastLight
                    ? 'highContrast'
                    : 'dark',
        });
    }

    private post(msg: ReaderHostMessage): void {
        this.panel.webview.postMessage(msg);
    }

    private getWebviewHtml(): string {
        const webview = this.panel.webview;
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview-reader.js'),
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview-reader', 'styles.css'),
        );
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   style-src 'unsafe-inline' ${webview.cspSource};
                   script-src 'unsafe-inline' 'nonce-${nonce}';
                   img-src ${webview.cspSource} data: https:;
                   font-src ${webview.cspSource};
                   connect-src 'none';">
    <link href="${styleUri}" rel="stylesheet">
    <title>BB Reader</title>
</head>
<body>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables.length = 0;
        try { this.panel.dispose(); } catch { /* already disposed */ }
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npm run check-types && npm run lint
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/commands/readerCommand.ts
git commit -m "$(cat <<'EOF'
Add ReaderPanel skeleton

Single-source-keyed panel registry, webview HTML with relaxed CSP
(inline scripts allowed for AI-generated interactivity; connect-src
none for defense in depth), theme posting, and reader-init message.
Streaming, dispatch wiring, and Regenerate/Export land in later
commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Hook `bbCommand` to dispatch render tags into `ReaderPanel`

**Files:**
- Modify: `src/commands/bbCommand.ts`
- Modify: `src/commands/index.ts`

Insert a prefix-check branch in `hiBB` that fires before the inline-replacement path. Also register `registerReaderCommand` so the no-op registrar runs on extension activation (sets the stage for future entry points).

- [ ] **Step 1: Update `commands/index.ts` to register the Reader command**

Replace `src/commands/index.ts` with:

```ts
// commands/index.ts
import { ExtensionContext } from 'vscode';
import { registerMenuCommand } from './menuCommand';
import { registerBBCommand } from './bbCommand';
import { registerDocumentInfoCommand } from './documentInfoCommand';
import { registerEditorCommand } from './editorCommand';
import { registerSelectModelCommand } from './selectModelCommand';
import { registerDiagnosticsCommand } from './diagnosticsCommand';
import { registerConfigStatusBar } from './configStatusBar';
import { registerReaderCommand } from './readerCommand';

export function registerAllCommands(context: ExtensionContext) {
    registerMenuCommand(context);
    registerBBCommand(context);
    registerDocumentInfoCommand(context);
    registerEditorCommand(context);
    registerSelectModelCommand(context);
    registerDiagnosticsCommand(context);
    registerConfigStatusBar(context);
    registerReaderCommand(context);
}
```

- [ ] **Step 2: Add the render-dispatch branch in `bbCommand.ts`**

In `src/commands/bbCommand.ts`, near the top imports add:

```ts
import { ReaderPanel } from './readerCommand';
import { isRenderCmd } from '../core/reader';
```

Then find the block (around lines 152-163):

```ts
            // 保存当前上下文
            this.currentEditor = editor;
            this.originalText = editor.document.getText(result.range);

            const cmd = Object.values(BBCmd).find(status => ps.command === status);
            if (!cmd) {
                throw new AppError(
                    ErrorCode.UNKNOWN_CMD,
                    "BB don't know cmd: " + ps.command,
                    "BB don't know cmd: " + ps.command,
                );
            }
```

And replace with:

```ts
            const cmd = Object.values(BBCmd).find(status => ps.command === status);
            if (!cmd) {
                throw new AppError(
                    ErrorCode.UNKNOWN_CMD,
                    "BB don't know cmd: " + ps.command,
                    "BB don't know cmd: " + ps.command,
                );
            }

            // Render commands route to ReaderPanel and bypass the inline-replacement
            // path entirely. We delete the tag and return early — currentEditor and
            // originalText are intentionally NOT set, so the file-switch interrupt
            // listener stays quiet when ReaderPanel takes focus on the side.
            if (isRenderCmd(cmd)) {
                // Compute the absolute range of the tag inside the document.
                const tagStartInRange = ps.startIndex;
                const tagEndInRange = ps.endIndex;
                const docStart = result.range.start;
                const lineStartOffset = editor.document.offsetAt(docStart);
                const tagStartPos = editor.document.positionAt(lineStartOffset + tagStartInRange);
                const tagEndPos = editor.document.positionAt(lineStartOffset + tagEndInRange);
                const tagRange = new vscode.Range(tagStartPos, tagEndPos);
                await editor.edit(eb => eb.delete(tagRange));
                await ReaderPanel.openForDocument(this.context, editor.document, cmd, ps.message);
                return;
            }

            // 保存当前上下文 (inline-replacement path only)
            this.currentEditor = editor;
            this.originalText = editor.document.getText(result.range);
```

- [ ] **Step 3: Typecheck and lint**

Run:
```bash
npm run check-types && npm run lint
```
Expected: clean.

- [ ] **Step 4: Manual smoke test of the open flow**

```bash
npm run compile
```

In VS Code, press **F5** to launch the Extension Development Host. Open any Markdown file. Type at the end of the file:

```
<bb-render-blog:make it pretty>
```

Position cursor anywhere on that line and press **Cmd+B Cmd+B** (mac) / **Ctrl+B Ctrl+B** (win/linux).

Expected:
- The tag text disappears from the document.
- A `BB Reader: <filename>` panel opens to the right.
- The top bar shows `Initialized (Blog View)` and `↳ Custom: "make it pretty"`.
- The body shows `Waiting for source…` (streaming not wired yet).

Try the other variants — `<bb-render-skim:>`, `<bb-render-expl:>`, `<bb-render:custom prompt>` — confirm each opens with the correct preset name in the top bar.

If anything fails, fix before committing.

- [ ] **Step 5: Commit**

```bash
git add src/commands/bbCommand.ts src/commands/index.ts
git commit -m "$(cat <<'EOF'
Dispatch bb-render-* tags to ReaderPanel

Adds an early-return branch in BBCommand.hiBB that detects render-
prefixed commands, deletes the tag from the source document, and
hands off to ReaderPanel.openForDocument. The inline-replacement
path is untouched. currentEditor stays null on this path so the
file-switch interrupt listener does not fire when the Reader panel
takes focus.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Streaming generation end-to-end

**Files:**
- Modify: `src/commands/readerCommand.ts`
- Modify: `media/webview-reader/index.ts`

Now the Reader actually runs AI and streams chunks. This is the largest task — it's the feature's beating heart.

- [ ] **Step 1: Extend `readerCommand.ts` with the streaming flow**

In `src/commands/readerCommand.ts`, add three imports at the top (alongside the existing imports from Task 7):

```ts
import { runReaderStream } from '../core/reader';
import { AIService } from '../services/AIService';
import { extractFrontmatter } from '../utils/frontmatter';
```

Add these two module-private helpers near the bottom of the file (after the `getNonce` function from Task 7) for reading per-flag usage stats:

```ts
function readFlagTokens(flag: string): number {
    return AIService.getInstance().getUsageStatsByFlag(flag)?.tokensUsed ?? 0;
}
function readFlagCost(flag: string): number {
    const all = AIService.getInstance().getUsageStats();
    return all.flagStats.get(flag)?.cost ?? 0;
}
```

Add fields to the class:

```ts
    private generationId = 0;       // increments on each new run, used to discard stale chunks
    private generating = false;
    private startTime = 0;
    private fullText = '';
```

Replace `applyNewRequest`, `bootstrap`, and `onMessage`, and add `startGeneration`:

```ts
    private applyNewRequest(cmd: BBCmd, userPrompt: string): void {
        this.cmd = cmd;
        this.userPrompt = userPrompt;
        this.sendInit();
        void this.startGeneration();
    }

    private async bootstrap(): Promise<void> {
        this.pendingInit = true;
        if (this.webviewReady) {
            this.sendInit();
            void this.startGeneration();
        }
    }

    private onMessage(msg: ReaderWebviewMessage): void {
        switch (msg.type) {
            case 'reader-ready':
                this.webviewReady = true;
                if (this.pendingInit) {
                    this.sendInit();
                    void this.startGeneration();
                    this.pendingInit = false;
                }
                break;
            case 'reader-regenerate':
                void this.startGeneration();
                break;
            // Other messages handled in Tasks 11+.
            default: break;
        }
    }

    private async startGeneration(): Promise<void> {
        const myId = ++this.generationId;
        this.generating = true;
        this.startTime = Date.now();
        this.fullText = '';

        const { frontmatter, body } = extractFrontmatter(this.sourceDoc.getText());

        // Snapshot cumulative usage so we can show THIS render's delta, not the
        // running total across all renders since the extension started.
        const baseTokens = readFlagTokens('render');
        const baseCost = readFlagCost('render');

        this.post({ type: 'reader-start' });

        let stream: AsyncGenerator<string, string, unknown>;
        try {
            stream = await runReaderStream({
                cmd: this.cmd,
                userPrompt: this.userPrompt,
                frontmatter,
                body,
                sourceFileName: path.basename(this.sourceDoc.uri.fsPath),
            });
        } catch (err) {
            if (myId === this.generationId) {
                this.post({ type: 'reader-error', message: (err as Error).message });
                this.generating = false;
            }
            return;
        }

        try {
            for await (const chunk of stream) {
                if (myId !== this.generationId) {
                    // A newer generation started; drop this stream's output. The
                    // underlying HTTP request continues until OpenAI finishes, but
                    // we ignore further chunks.
                    return;
                }
                this.fullText += chunk;
                this.post({ type: 'reader-chunk', text: chunk });
            }
            if (myId !== this.generationId) { return; }

            // Compute the delta for this render.
            const tokensUsed = readFlagTokens('render') - baseTokens;
            const costDelta = readFlagCost('render') - baseCost;
            const costUsd = costDelta > 0 ? costDelta : undefined;

            this.post({
                type: 'reader-done',
                fullHtml: this.fullText,
                tokensUsed,
                costUsd,
                durationMs: Date.now() - this.startTime,
            });
            this.generating = false;
        } catch (err) {
            if (myId === this.generationId) {
                this.post({ type: 'reader-error', message: (err as Error).message });
                this.generating = false;
            }
        }
    }
```

Also, update `dispose` to invalidate any running generation:

```ts
    dispose(): void {
        this.generationId++; // invalidates the running for-await loop
        this.disposables.forEach(d => d.dispose());
        this.disposables.length = 0;
        try { this.panel.dispose(); } catch { /* already disposed */ }
    }
```

- [ ] **Step 2: Extend `media/webview-reader/index.ts` to render chunks**

In `media/webview-reader/index.ts`, replace the file body (everything after the `appHtml` injection and helpers — i.e. the `// ---- Bootstrap ----` block and below) with:

```ts
// ---- Image src rewriting ----

/**
 * Replace local-path <img src="..."> with webview URIs. Skips https:, data:,
 * and vscode-webview:. Mirrors the host-side rewrite used in BB Editor.
 */
function rewriteImageSrcs(html: string, baseUri: string): string {
    if (!baseUri) { return html; }
    const encodedBase = baseUri.replace(/\+/g, '%2B');
    return html.replace(
        /(<img\b[^>]*\bsrc=)("([^"]*)"|'([^']*)')/gi,
        (match, before: string, _quoted: string, dq?: string, sq?: string) => {
            const src = dq ?? sq ?? '';
            if (!src || /^(https?:|data:|vscode-webview:)/i.test(src)) { return match; }
            const resolved = `${encodedBase}/${src}`;
            const quote = dq !== undefined ? '"' : "'";
            return `${before}${quote}${resolved}${quote}`;
        },
    );
}

// ---- Tail preview buffer ----

const TAIL_MAX = 80;
let tailBuffer = '';

function pushTail(chunk: string): void {
    // Strip tags and squash whitespace to get a clean preview.
    const text = chunk.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    tailBuffer = (tailBuffer + text).slice(-TAIL_MAX);
    setTail(tailBuffer);
}

// ---- Streaming state ----

let estInputTokens = 0;
let receivedChars = 0;
let preset = '';
let currentUserPrompt = '';

function resetForNewGeneration(): void {
    tailBuffer = '';
    receivedChars = 0;
    lastFullHtml = '';
    setTail('');
    setProgress(0);
    setCost(0);
    $('btn-regenerate').setAttribute('disabled', 'true');
    $('btn-export').setAttribute('disabled', 'true');
    $('ai-output').innerHTML = '<div class="bb-reader__empty">Streaming…</div>';
}

// ---- Message dispatch ----

window.addEventListener('message', (event: MessageEvent<ReaderHostMessage>) => {
    handleHost(event.data);
});

function handleHost(msg: ReaderHostMessage): void {
    switch (msg.type) {
        case 'reader-init':
            baseUri = msg.baseUri;
            preset = msg.preset;
            currentUserPrompt = msg.userPrompt;
            estInputTokens = msg.estInputTokens;
            setUserPromptEcho(currentUserPrompt);
            setPhase(`Ready (${preset})`);
            break;

        case 'reader-start':
            resetForNewGeneration();
            setPhase(`Generating (${preset})`);
            break;

        case 'reader-chunk': {
            if ($('ai-output').querySelector('.bb-reader__empty')) {
                $('ai-output').innerHTML = '';
            }
            const rewritten = rewriteImageSrcs(msg.text, baseUri);
            // Append by inserting an adjacent HTML span. innerHTML += would
            // re-parse the whole accumulated string each chunk, which is O(n²)
            // on long docs. insertAdjacentHTML appends.
            $('ai-output').insertAdjacentHTML('beforeend', rewritten);
            receivedChars += msg.text.length;
            const approxTok = Math.ceil(receivedChars / 4);
            const pct = estInputTokens > 0
                ? Math.min(99, (approxTok / estInputTokens) * 100)
                : 0;
            setProgress(pct);
            pushTail(msg.text);
            break;
        }

        case 'reader-done': {
            lastFullHtml = msg.fullHtml;
            // Re-render the canonical final HTML by replacing innerHTML once.
            const rewritten = rewriteImageSrcs(msg.fullHtml, baseUri);
            $('ai-output').innerHTML = rewritten;
            setProgress(100);
            setTail(`Rendered in ${(msg.durationMs / 1000).toFixed(1)}s`);
            setCost(msg.tokensUsed, msg.costUsd);
            setPhase(`Done (${preset})`);
            $('btn-regenerate').removeAttribute('disabled');
            $('btn-export').removeAttribute('disabled');
            break;
        }

        case 'reader-error':
            setPhase('Error');
            setTail(msg.message);
            $('btn-regenerate').removeAttribute('disabled');
            break;

        case 'reader-theme':
            document.body.dataset.theme = msg.kind;
            break;

        default:
            // Banner, export-result handled in later tasks.
            break;
    }
}

// ---- Button wiring ----

$('btn-regenerate').addEventListener('click', () => {
    vscode.postMessage({ type: 'reader-regenerate' });
});
$('btn-export').addEventListener('click', () => {
    vscode.postMessage({ type: 'reader-export', html: lastFullHtml });
});

// ---- Bootstrap ----

vscode.postMessage({ type: 'reader-ready' });
```

Remove the placeholder `void setTail; void setProgress; ...` line that was suppressing unused warnings — the helpers are now in use.

- [ ] **Step 3: Build and manual test**

```bash
npm run compile
```

Press F5, open a Markdown file with real content (you can use this very plan file as a test fixture — copy a chunk of it into a scratch `.md`). Add `<bb-render-blog:>` and fire with Cmd+B Cmd+B.

Expected:
- Reader opens to the right.
- `Generating (Blog View)` appears, progress bar moves, tail preview scrolls.
- HTML appears in the `ai-output` area, chunk by chunk.
- On completion, phase becomes `Done (Blog View)`, the canonical HTML replaces the streaming buffer, Regenerate and Export buttons enable.

If something doesn't work, check the DevTools console of the webview (`Developer: Open Webview Developer Tools` in command palette) for runtime errors.

- [ ] **Step 4: Commit**

```bash
git add src/commands/readerCommand.ts media/webview-reader/index.ts
git commit -m "$(cat <<'EOF'
Wire streaming generation end-to-end

ReaderPanel kicks off an AIService stream on init and forwards each
chunk to the webview, which appends via insertAdjacentHTML (O(n)
instead of innerHTML O(n²)). On completion, the canonical full
HTML replaces the streamed buffer. Stale streams from previous
generations are detected and discarded via an incrementing
generationId. Image src rewriting runs in the webview.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Source-change banner

**Files:**
- Modify: `src/commands/readerCommand.ts`
- Modify: `media/webview-reader/index.ts`

When the source document changes after a render completes, show a banner inside the Reader. Auto-regeneration is explicitly not done.

- [ ] **Step 1: Watch the source document on the host side**

In `src/commands/readerCommand.ts`, add fields:

```ts
    private hasRenderedOnce = false;
```

In the constructor, after the existing `disposables.push(...)` block, add:

```ts
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((e) => {
                if (e.document.uri.toString() !== this.sourceDoc.uri.toString()) { return; }
                if (!this.hasRenderedOnce || this.generating) { return; }
                this.post({ type: 'reader-source-changed' });
            }),
            vscode.workspace.onDidCloseTextDocument((doc) => {
                if (doc.uri.toString() !== this.sourceDoc.uri.toString()) { return; }
                this.post({ type: 'reader-source-closed' });
            }),
        );
```

Set the flag in `startGeneration` after `reader-done`:

```ts
            this.post({
                type: 'reader-done',
                fullHtml: this.fullText,
                tokensUsed,
                costUsd: cost,
                durationMs: Date.now() - this.startTime,
            });
            this.generating = false;
            this.hasRenderedOnce = true;   // ADD
```

- [ ] **Step 2: Handle banner messages in the webview**

In `media/webview-reader/index.ts`, add to the message dispatch switch:

```ts
        case 'reader-source-changed':
            $('source-banner').classList.remove('bb-reader__banner--hidden');
            $('banner-msg').textContent = 'Source changed — re-render to refresh.';
            break;

        case 'reader-source-closed':
            $('source-banner').classList.remove('bb-reader__banner--hidden');
            $('banner-msg').textContent = 'Source closed — Regenerate disabled.';
            $('btn-regenerate').setAttribute('disabled', 'true');
            break;
```

And wire the banner buttons (place after the existing `$('btn-export').addEventListener(...)`):

```ts
$('banner-regen').addEventListener('click', () => {
    $('source-banner').classList.add('bb-reader__banner--hidden');
    vscode.postMessage({ type: 'reader-regenerate' });
});
$('banner-dismiss').addEventListener('click', () => {
    $('source-banner').classList.add('bb-reader__banner--hidden');
});
```

- [ ] **Step 3: Build and manual test**

```bash
npm run compile
```

Press F5, fire a render on a Markdown file, wait for completion. Then edit the source (type a character). Expected: banner appears in the Reader saying "Source changed — re-render to refresh." with a Regenerate button. Click Regenerate — render restarts.

Close the source file. Expected: banner switches to "Source closed — Regenerate disabled." and the top-bar Regenerate button disables.

- [ ] **Step 4: Commit**

```bash
git add src/commands/readerCommand.ts media/webview-reader/index.ts
git commit -m "$(cat <<'EOF'
Show source-changed / source-closed banner in Reader

Listens to onDidChangeTextDocument / onDidCloseTextDocument for the
source URI. After the first successful render, content changes pop a
banner with a Regenerate button (no auto-regen — AI calls are slow
and metered). Closing the source disables Regenerate while keeping
the last render and Export functional.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Export with asset inlining

**Files:**
- Modify: `src/commands/readerCommand.ts`
- Modify: `media/webview-reader/index.ts`

The webview sends the canonical accumulated HTML (`lastFullHtml`) on `reader-export`. The host runs `inlineImageAssets` against it (with `path.dirname(sourceDoc.uri.fsPath)` as the base), writes the result to `<source>.reader.html`, and posts back success or failure.

- [ ] **Step 1: Handle `reader-export` in the host**

In `src/commands/readerCommand.ts`, add two imports near the top:

```ts
import * as fs from 'fs/promises';
import { inlineImageAssets } from '../utils/assetInliner';
```

Extend `onMessage`:

```ts
            case 'reader-export':
                void this.handleExport(msg.html);
                break;
```

Add a new private method:

```ts
    private async handleExport(html: string): Promise<void> {
        try {
            const sourcePath = this.sourceDoc.uri.fsPath;
            const sourceDir = path.dirname(sourcePath);
            const sourceBase = path.basename(sourcePath, path.extname(sourcePath));
            const defaultName = `${sourceBase}.reader.html`;
            const defaultUri = vscode.Uri.file(path.join(sourceDir, defaultName));

            const target = await vscode.window.showSaveDialog({
                defaultUri,
                filters: { 'HTML': ['html'] },
                saveLabel: 'Export AI Reader HTML',
            });
            if (!target) {
                this.post({ type: 'reader-export-result', success: false, error: 'Cancelled' });
                return;
            }

            // Inline assets unless the user opted out.
            const cfg = vscode.workspace.getConfiguration('blogbuddy.reader');
            const shouldInline = cfg.get<boolean>('inlineAssets', true);
            const finalHtml = shouldInline
                ? await inlineImageAssets(html, sourceDir)
                : html;

            await fs.writeFile(target.fsPath, finalHtml, 'utf-8');

            this.post({ type: 'reader-export-result', success: true, filePath: target.fsPath });

            const choice = await vscode.window.showInformationMessage(
                `Saved ${path.basename(target.fsPath)}`,
                'Open',
                'Show in Folder',
            );
            if (choice === 'Open') {
                await vscode.env.openExternal(target);
            } else if (choice === 'Show in Folder') {
                await vscode.commands.executeCommand('revealFileInOS', target);
            }
        } catch (err) {
            this.post({
                type: 'reader-export-result',
                success: false,
                error: (err as Error).message,
            });
            vscode.window.showErrorMessage(`Export failed: ${(err as Error).message}`);
        }
    }
```


- [ ] **Step 2: Show export result in the webview**

In `media/webview-reader/index.ts`, add to the switch:

```ts
        case 'reader-export-result':
            // Toast-style: flash the phase area briefly.
            if (msg.success) {
                setPhase('Exported');
                setTimeout(() => setPhase(`Done (${preset})`), 2000);
            } else if (msg.error && msg.error !== 'Cancelled') {
                setPhase('Export failed');
                setTail(msg.error);
            }
            break;
```

- [ ] **Step 3: Build and manual test**

```bash
npm run compile
```

Press F5. Open a Markdown file that includes a local image reference (e.g. `![pic](./test.png)` with a real PNG next to it). Add `<bb-render-blog:>` and fire. Wait for completion. Click **Export**.

Expected:
- A save dialog appears with `<source-name>.reader.html` as the default.
- After saving, the phase area flashes `Exported`, then returns to `Done (Blog View)`.
- The saved file opens cleanly in a browser — image is visible because it was inlined as base64.
- An info message offers `Open` and `Show in Folder`.

Test a second time with `blogbuddy.reader.inlineAssets` set to `false` in VS Code settings. Expected: the saved HTML keeps the relative `./test.png` path, and only loads the image if you have the assets folder co-located.

- [ ] **Step 4: Commit**

```bash
git add src/commands/readerCommand.ts media/webview-reader/index.ts
git commit -m "$(cat <<'EOF'
Implement Reader HTML export with asset inlining

Export button asks for a save path (defaulting to <source>.reader.html
next to the source) and writes the canonical full HTML. When
blogbuddy.reader.inlineAssets is true (default), local-path images
are base64-inlined producing a single self-contained file. https:
URLs and missing local files are left as-is. A follow-up info
message offers Open / Show in Folder.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Cost guard at 25k input tokens

**Files:**
- Modify: `src/commands/readerCommand.ts`

Before kicking off any generation, if the estimated input tokens exceed 25,000, ask the user to confirm.

- [ ] **Step 1: Add a confirmation gate to `startGeneration`**

In `src/commands/readerCommand.ts`, at the top of `startGeneration` (immediately after the `++this.generationId` line — actually wrap so we don't increment on cancel):

Replace the opening of `startGeneration` from:

```ts
    private async startGeneration(): Promise<void> {
        const myId = ++this.generationId;
        this.generating = true;
        this.startTime = Date.now();
        this.fullText = '';

        const { frontmatter, body } = extractFrontmatter(this.sourceDoc.getText());

        this.post({ type: 'reader-start' });
```

To:

```ts
    private static readonly LARGE_INPUT_TOKEN_THRESHOLD = 25_000;

    private async startGeneration(): Promise<void> {
        const fullSource = this.sourceDoc.getText();
        const estInputTokens = Math.ceil(fullSource.length / 4);
        if (estInputTokens > ReaderPanel.LARGE_INPUT_TOKEN_THRESHOLD) {
            const proceed = await vscode.window.showWarningMessage(
                `This file is large (~${estInputTokens.toLocaleString()} input tokens). Render anyway?`,
                { modal: true },
                'Render',
            );
            if (proceed !== 'Render') {
                this.post({ type: 'reader-error', message: 'Cancelled (large input)' });
                return;
            }
        }

        const myId = ++this.generationId;
        this.generating = true;
        this.startTime = Date.now();
        this.fullText = '';

        const { frontmatter, body } = extractFrontmatter(fullSource);

        this.post({ type: 'reader-start' });
```

Note: `LARGE_INPUT_TOKEN_THRESHOLD` is declared as a static property on the class. Place it just above the constructor or near the other static (`panels`) — wherever fits the file's existing layout.

- [ ] **Step 2: Manual test**

```bash
npm run compile
```

F5. Create a Markdown file roughly 100KB+ (paste a large amount of text — repeating a paragraph many times is fine). Add `<bb-render-blog:>` and fire.

Expected: a modal warning appears with the token estimate. Click `Cancel` — the Reader top bar shows `Error` with `Cancelled (large input)`. Re-fire and click `Render` — generation proceeds.

For files under the threshold, no modal appears.

- [ ] **Step 3: Commit**

```bash
git add src/commands/readerCommand.ts
git commit -m "$(cat <<'EOF'
Add 25k-token cost guard to Reader

For source files estimated above 25,000 input tokens, prompt the user
with a modal before kicking off generation. Tokens estimated via
chars/4 heuristic (the same estimate already shown in the top bar).
Cancel surfaces as a "Cancelled (large input)" error in the Reader.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Add render slash menu items

**Files:**
- Modify: `media/webview/bb-slash-plugin.ts`

The slash menu in BB Editor gets a new `render` group with four items that insert the corresponding tags. Reuses the existing `BBCmdDef` / `insertBBTag` infrastructure — render items are tag-insertion items, same as the existing seven.

- [ ] **Step 1: Extend the slash item type**

In `media/webview/bb-slash-plugin.ts`, update the `SlashItem` interface (around line 19) to add `'render'` to the group union:

```ts
interface SlashItem {
    label: string;
    desc: string;
    group: 'format' | 'bb' | 'render';
    onSelect: (view: EditorView, slashProvider: SlashProvider) => void;
}
```

- [ ] **Step 2: Add render commands**

Just below the existing `BB_COMMANDS` constant (around line 36-44), add:

```ts
const RENDER_COMMANDS: BBCmdDef[] = [
    { command: 'bb-render-blog', label: 'Render: Blog View',  desc: 'AI-render as a polished article', tag: '<bb-render-blog:$1>' },
    { command: 'bb-render-skim', label: 'Render: Skim Mode',  desc: 'AI-render for fast scanning',     tag: '<bb-render-skim:$1>' },
    { command: 'bb-render-expl', label: 'Render: Explainer',  desc: 'AI-render with SVG teaching aids', tag: '<bb-render-expl:$1>' },
    { command: 'bb-render',      label: 'Render: Custom',     desc: 'AI-render with your own prompt',  tag: '<bb-render:$1>' },
];
```

- [ ] **Step 3: Build render items in `buildSlashItems`**

Inside `buildSlashItems` (around line 88), **before** the "Formatting items" section, after the existing BB tag loop, add:

```ts
    // Render items — same insert-tag pattern as BB items, just a different group.
    for (const cmd of RENDER_COMMANDS) {
        items.push({
            label: cmd.label,
            desc: cmd.desc,
            group: 'render',
            onSelect: (view, sp) => {
                sp.hide();
                removeSlashText(view);
                insertBBTag(view, cmd.tag);
            },
        });
    }
```

- [ ] **Step 4: Build and manual test**

```bash
npm run compile
```

F5. Open a Markdown file in BB Editor (via `Open BB Editor` command or the title button). Type `/` in the editor. Expected: the slash menu shows three groups — `bb` (existing), `render` (new), `format` (existing) — with a separator between each.

Pick `Render: Blog View`. Expected: `<bb-render-blog:>` is inserted with cursor between `:` and `>`. Type a prompt (e.g. `make it slidy`). The text reads `<bb-render-blog:make it slidy>`. Press Cmd+B Cmd+B. Expected: Reader opens to the side and starts streaming.

- [ ] **Step 5: Commit**

```bash
git add media/webview/bb-slash-plugin.ts
git commit -m "$(cat <<'EOF'
Add render group to BB Editor slash menu

Four new slash items insert <bb-render-*:> tags with the cursor
positioned for a refinement prompt — identical mechanism to the
existing BB tag items.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Configuration + help docs + version bump

**Files:**
- Modify: `package.json`
- Modify: `docs/help.md`
- Modify: `docs/help_中文.md`

- [ ] **Step 1: Add the inlineAssets config**

In `package.json`, inside `contributes.configuration.properties`, add after `blogbuddy.assetDir` (which ends around line 111):

```jsonc
        "blogbuddy.reader.inlineAssets": {
          "type": "boolean",
          "default": true,
          "description": "When exporting from BB Reader, inline local images as base64 to produce a single self-contained HTML file. Set false to keep relative image paths.",
          "order": 5
        }
```

Also bump the version:

```jsonc
  "version": "0.0.13",
```

(or whatever's next per existing tags — check `git tag --sort=-v:refname | head -3` if uncertain).

- [ ] **Step 2: Document the new tags in `docs/help.md`**

Open `docs/help.md`. Find the section that documents BB tags (search for `bb-expd` or `bb-tldr`). Add a new subsection. Sample text to add (adjust wording to match the file's existing style):

```markdown
### AI Reader View

The Render commands generate a full HTML "reading artifact" of your Markdown
in a side panel. The Reader does not modify your source — it produces a new
rendering optimized for humans, which you can preview and export to a
standalone `.html` file (with images base64-inlined by default).

**Tags:**

- `<bb-render-blog:>` — Render as a polished article with a TOC and callouts.
- `<bb-render-skim:>` — Render in Skim Mode: TL;DR at top, collapsibles, badges.
- `<bb-render-expl:>` — Render as a teaching artifact: SVG diagrams + annotations.
- `<bb-render:your prompt>` — Render with your own creative direction.

You can add a refinement prompt to any preset:
`<bb-render-blog:make the TOC sticky and add a print stylesheet>`.

**Fire:** position the cursor anywhere on the tag and press `Cmd+B Cmd+B`
(macOS) / `Ctrl+B Ctrl+B` (Windows/Linux). The tag is removed from your
source and a BB Reader panel opens to the right.

**Export:** the Reader has an Export button that writes a self-contained
`.html` file next to your `.md`. Toggle `blogbuddy.reader.inlineAssets` to
`false` if you'd rather keep relative image paths (e.g., for site-uploads
where the assets folder ships alongside the HTML).

**Security:** the Reader webview executes scripts the AI emits, with
network access blocked (`connect-src 'none'`). Trust depends on trusting
your AI provider and the source content you render.
```

- [ ] **Step 3: Document the new tags in `docs/help_中文.md`**

Add a parallel section in Chinese. Sample:

```markdown
### AI 阅读视图

Render 系列命令会基于当前 Markdown 生成一份"为人类阅读优化"的完整 HTML
文档，显示在侧边面板里。Reader **不会修改你的源文件**，只会产出一份新的
渲染结果——你可以预览，并导出成一个独立的 `.html`（默认会把本地图片以
base64 内嵌，得到单文件结果）。

**可用标签：**

- `<bb-render-blog:>` — 渲染成有 TOC 和 callout 的"博客文章"风格。
- `<bb-render-skim:>` — 速读模式：开头 TL;DR + 折叠详情 + 徽标。
- `<bb-render-expl:>` — 教学型：SVG 图示 + 代码注解。
- `<bb-render:你的提示词>` — 完全按你的提示词来写。

任意 preset 都可以追加细化指令：
`<bb-render-blog:让 TOC 吸顶并加一份打印样式>`。

**触发：** 把光标放到标签所在行的任意位置，按 `Cmd+B Cmd+B`（macOS）/
`Ctrl+B Ctrl+B`（Win/Linux）。标签会从源文件里被删除，Reader 面板在右侧
打开。

**导出：** Reader 顶部有 Export 按钮，会把渲染结果存为 `<原名>.reader.html`，
放在 `.md` 旁边。如果你想保留相对图片路径（比如部署到博客时和资源目录一起
发上去），把 `blogbuddy.reader.inlineAssets` 设为 `false`。

**安全：** Reader 的 webview 会执行 AI 生成的内联脚本，但禁用了网络访问
（`connect-src 'none'`）。信任边界等同于你对 AI 服务商和源文件内容的信任。
```

- [ ] **Step 4: Verify the package.json is valid and builds**

```bash
npm run compile && npm run lint && npm run check-types
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json docs/help.md docs/help_中文.md
git commit -m "$(cat <<'EOF'
Wire up AI Reader View config + docs, bump to 0.0.13

Adds blogbuddy.reader.inlineAssets config (default true) and a
help-docs section for the new Render tag family in both English
and Chinese.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Final smoke test and verification

**Files:** (none modified — verification only)

A sweep through the key user flows to catch regressions before merging.

- [ ] **Step 1: Build a production bundle**

```bash
npm run package
```

Expected: clean build, no warnings.

- [ ] **Step 2: Run all tests**

```bash
npm run test
```

Expected: all tests pass (the three unit-test suites from Tasks 1, 2, 5 plus the original sample test).

- [ ] **Step 3: Manual flow checklist**

In the Extension Development Host (F5), verify each:

- [ ] Plain text Markdown editor: typing `<bb-render-blog:my prompt>` and pressing `Cmd+B Cmd+B` opens the Reader to the right and starts streaming. Tag is removed from the doc.
- [ ] BB Editor: typing `/` shows three groups (`bb`, `render`, `format`). Selecting `Render: Blog View` inserts the tag with cursor inside. Adding a prompt and pressing Cmd+B Cmd+B opens the Reader.
- [ ] All four presets produce visibly different output (run the same Markdown through each).
- [ ] `<bb-render:turn this into a slide deck>` (Custom) honors the user direction.
- [ ] Streaming preview shows phase / progress bar / tail text / cost.
- [ ] On completion, the canonical full HTML replaces the streamed buffer (no visible jank — should be near-instant).
- [ ] Regenerate button re-runs and replaces the output.
- [ ] Editing the source after a render shows the banner; Regenerate from banner works; Dismiss closes it.
- [ ] Closing the source shows "Source closed" banner; Regenerate disables; Export still works.
- [ ] Export saves a `.reader.html` next to the source. Opening it in a browser shows correct rendering with images inlined.
- [ ] `blogbuddy.reader.inlineAssets=false` keeps relative paths.
- [ ] A large file (paste ~120KB of text) triggers the cost-guard modal. Cancel aborts; Render proceeds.
- [ ] An existing inline BB command (e.g. `<bb-impv>` on a paragraph) still works as before — no regression.
- [ ] Opening the same `.md` twice with a Reader command reveals the existing Reader and regenerates (one panel per source).
- [ ] Closing the Reader mid-stream does not crash; firing again opens a fresh panel.
- [ ] Theme: switch VS Code to a light theme; the Reader's top bar updates to the light palette (the AI-generated HTML below has its own theming).

- [ ] **Step 4: If any issue surfaces, create a focused follow-up commit**

For each issue, write a minimal fix and commit with a clear message. Do not bundle unrelated fixes.

- [ ] **Step 5: Final summary commit (optional)**

If no fixes were needed, no commit. If you bumped version or touched the README during smoke testing, commit those separately.

---

## Out of Scope (v1) — recap

Confirmed not implemented in this plan, per the spec:

- Conversational refinement against a prior render
- Cross-file context aggregation
- User-editable preset prompts
- Reader as a VS Code Custom Editor
- File-watching the source on disk (we listen to `TextDocument`, which is enough)
- Shihipar's code-review / design-playground / draggable-card use cases
- Server-side hosting and shareable links

### Known v1 limitations (acknowledged, not blocking)

- **Cancel does not abort the HTTP request.** Closing the Reader or starting a regenerate increments `generationId` so the for-await loop stops forwarding chunks, but the underlying OpenAI request keeps streaming until it finishes naturally. Wasted tokens for the duration of the in-flight response (typically tens of seconds). Adding `AbortSignal` plumbing to `AIService.chatStreaming` is a small, focused follow-up.
- **`<img>` rewrite is regex-based** (in both `assetInliner.ts` and the webview `rewriteImageSrcs`). Exotic edge cases like `<img>` inside HTML comments, CDATA, or attribute values that look like tags will be misidentified. The trade-off is no DOM-parser dependency in the host or webview. Acceptable for v1 because AI-generated HTML is well-formed; revisit if real-world bugs surface.

These remain open for v2+.

---

## Self-review notes (for the writer)

Items checked against the spec while writing the plan:

- §2 goals/non-goals ↔ task list: every goal has a task (1–15). Every non-goal is left untouched.
- §3 user experience ↔ Tasks 7, 8, 9, 11: trigger via existing `bb` command, panel opens to side, top bar, regenerate, export — all covered.
- §4 architecture ↔ file structure section: layering matches (commands / core / utils / webview frontend).
- §5 tag schema ↔ Task 3 (enum) + Task 13 (slash menu): all four tags wired in both surfaces.
- §6 reader panel ↔ Tasks 7, 9, 10, 11: panel skeleton → streaming → banner → export.
- §7 presets ↔ Task 5: four presets implemented; tests assert each is distinct.
- §8 prompt strategy ↔ Task 5 `buildReaderMessages`: assembly is tested for system/user split, frontmatter inclusion, custom-vs-preset routing of user prompt.
- §9 AI integration ↔ Task 9: `runReaderStream` wraps `AIService.chatStreaming`; usage stats picked up via existing `'render'` flag.
- §10 webview security ↔ Task 7 `getWebviewHtml`: exact CSP from spec; `connect-src 'none'`; nonce for shell.
- §11 asset/frontmatter ↔ Tasks 1, 2, 9, 11: shared frontmatter util; asset inliner; in-webview image rewrite; export-time inlining toggled by config.
- §12 source sync ↔ Task 10: change banner, close banner, no auto-regen.
- §13 export ↔ Task 11: save dialog with default name, post-save Open / Show in Folder.
- §14 configuration ↔ Task 14: single new config `blogbuddy.reader.inlineAssets`.
- §15 file touchpoints ↔ "Files to create" / "Files to modify" tables: identical to spec.
- §17 risks ↔ implementation: cost guard (Task 12); CSP defense in depth (Task 7); frontmatter parser unification (Task 1); image path edge cases reuse existing `%2B` handling (Task 9 webview).

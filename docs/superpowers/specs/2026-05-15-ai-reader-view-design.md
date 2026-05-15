# AI Reader View — Design Spec

**Date:** 2026-05-15
**Status:** Approved (brainstorm phase complete, awaiting plan)
**Authors:** yaoyupeng-cc-01 (PM/PO), Claude (drafting)

---

## 1. Motivation

A trend in 2026 frames document formats around two consumers: **Markdown is the format agents read (token-efficient, semantically clean), HTML is the format humans read** (information density, interactivity, sharability). Two separate discussions feed this framing:

- **Input side** — Cloudflare's "Markdown for Agents" serves Markdown to AI crawlers, cutting token usage ~80% versus HTML. Concerns the publisher's content delivery.
- **Output side** — Anthropic Claude Code lead Thariq Shihipar's "The Unreasonable Effectiveness of HTML" (May 2026) argues that AI-generated outputs *for humans* should be HTML, not Markdown: richer visual structure, embedded diagrams (SVG), interactivity, and far higher chance the recipient actually reads it.

A generic "Markdown → HTML export" feature does **not** address the Shihipar thesis. That kind of deterministic conversion already exists in the VS Code ecosystem (Markdown Preview Enhanced, Markdown PDF, built-in preview). What is missing is **AI as the renderer** — letting a language model re-interpret the source Markdown and emit an HTML artifact optimized for human reading. That is the gap BlogBuddy is well-positioned to fill, because the project already owns the AI plumbing (`AIService`, model selection, usage stats) and a webview rendering stack.

This spec defines the **AI Reader View** feature: a new BB command family that turns the active Markdown file into a streaming HTML "reading artifact" rendered in a side panel and exportable to a standalone `.html` file.

## 2. Goals & Non-goals

### Goals (v1)

- Let a user trigger an AI-rendered HTML view of the current Markdown file using the same BB command pattern they already know (`<bb-render-*:prompt>` tag + `Cmd+B Cmd+B`).
- Support the trigger from **both** BB Editor (via slash menu) and any plain Markdown text editor (by typing the tag manually).
- Stream the HTML output into a Reader webview panel beside the source, with live status, latest-chunk preview, and running cost/token meter.
- Provide a small library of presets (Blog View / Skim Mode / Explainer / Custom) covering the most common reading scenarios for blog-style content.
- Allow the user to refine and regenerate from inside the Reader panel.
- Export the final HTML as a self-contained `.html` file (assets base64-inlined by default) next to the source `.md`.

### Non-goals (v1)

- Multi-turn conversational refinement against a prior render (each regeneration is one-shot against the source).
- Cross-file context (Reader sees only the current file, not other files in the workspace).
- Two-way editing — the Reader artifact is read-only output; the source Markdown is canonical.
- Configurable / user-editable preset prompts (presets ship as fixed system prompts; configurability is a v2 candidate).
- Reader as a VS Code Custom Editor (`workbench.editors.customEditors`); v1 is a plain WebviewPanel.
- Use cases from Shihipar's article that fall outside the BlogBuddy story: code-review artifacts, PR explainers, design playgrounds with sliders, draggable-card editors, custom data editors. (Not refused for v2; just out of scope here.)
- Watching files on disk for changes (Reader is tied to a `TextDocument`, not a path).

## 3. User Experience

### 3.1 Trigger

The Reader is triggered by a new family of BB tags routed through the existing `blogbuddy.bb` command:

```
<bb-render-blog:>             — Blog View (default polished article style)
<bb-render-skim:>             — Skim Mode (TL;DR + collapsibles)
<bb-render-expl:>             — Explainer (SVG diagrams, teaching annotations)
<bb-render:your prompt here>  — Custom (prompt drives entirely)
```

The `:prompt` portion is optional for the preset tags (empty falls back to the preset's built-in instruction). For `<bb-render:>`, the user prompt is the only instruction beyond the shared hard constraints.

Two entry points:

1. **BB Editor slash menu** — A new `render` group in the slash menu, alongside `format` and `bb`. Selecting an item inserts the matching tag with the cursor placed between `:` and `>` (the `$1` placeholder slot used by existing BB slash items) so the user can immediately type a refinement prompt.
2. **Plain Markdown editor** — User types the tag by hand anywhere in the document. No special editor required.

Either way, the user fires the tag with `Cmd+B Cmd+B` (the existing BB shortcut), exactly as with other BB commands.

### 3.2 What happens on fire

1. `bbCommand.ts` parses the tag, recognizes the `bb-render*` prefix family.
2. The tag is **removed** from the document (no inline replacement; no breadcrumb left behind).
3. The full document text (minus frontmatter) plus frontmatter object are gathered.
4. A `ReaderPanel` is opened in `ViewColumn.Beside` (or revealed if already open for this document — see §6.5).
5. Streaming starts immediately; the user sees the HTML grow.

### 3.3 The Reader panel

```
┌─ BB Reader: my-post.md ─────────────────────────────┐
│ ✦ Generating (Blog View)   "...with rich callouts │
│   ████░░░░░ 42%             and a clear hierarc..." │
│ ↳ Custom: "make it slidy"                            │
│ [↻ Regenerate]  [⬇ Export]   3.2k tok · $0.0023     │
├──────────────────────────────────────────────────────┤
│ <AI-generated HTML rendered live>                    │
└──────────────────────────────────────────────────────┘
```

Top bar elements:

- **Phase indicator:** `Connecting…` → `Generating (<preset name>)` → `Done` / `Error` / `Cancelled`.
- **Progress bar:** received tokens divided by estimated input tokens (chars ÷ 4 heuristic). Not accurate, but provides motion. After completion, replaced by `Rendered in 12.4s · 3214 tok`.
- **Latest chunk preview:** rolling ~80 chars of the last text content (HTML tags stripped) — like a CLI tail. Helps the user see "what is AI writing now."
- **User-prompt echo:** the `:prompt` text the user typed. Shows blank if empty.
- **Regenerate button:** re-runs with the same preset + prompt against the latest document content. Useful after editing the source or just to retry.
- **Export button:** writes a self-contained `.html` file (see §10).
- **Cost meter:** running token count and USD cost (depends on `PricingService` availability — falls back to tokens-only).

Below the top bar: the streaming HTML is injected into `<div id="ai-output">`. Mid-stream invalid HTML (unclosed tags) is tolerated by the browser — repaint is good enough.

### 3.4 Cancel

Closing the Reader panel cancels the in-flight AI request (`AbortController.abort()`). The user can also re-fire from the source to start a new render — this also cancels the in-flight one in the same Reader.

## 4. Architecture

### 4.1 Big picture

```
┌─────────────────────────────────────────────────────────────┐
│  Extension Host (Node)                                       │
│                                                              │
│   blogbuddy.bb command                                      │
│        │                                                     │
│        │  parsed <bb-render*:msg> ?                          │
│        ├── no  ──→ existing inline-replacement flow          │
│        └── yes ──→ ReaderPanel.openForDocument(...)          │
│                          │                                   │
│                          │ owns:                             │
│                          │   - WebviewPanel                  │
│                          │   - AbortController               │
│                          │   - source TextDocument ref       │
│                          │   - last render result            │
│                          │                                   │
│                          ▼                                   │
│                  src/core/reader.ts                          │
│                     - preset library                         │
│                     - prompt assembly                        │
│                     - AIService streaming call               │
└─────────────────────────────────────────────────────────────┘
                          │  HostMessage (render-chunk, etc.)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Reader Webview (browser sandbox)                            │
│     - top status bar shell (signed with nonce)               │
│     - <div id="ai-output"> for AI HTML injection             │
│     - Regenerate / Export buttons → post WebviewMessage      │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Layering (per CLAUDE.md)

- **Commands layer** — `commands/bbCommand.ts` (modified, adds dispatch), `commands/readerCommand.ts` (new, owns `ReaderPanel`).
- **Core layer** — `core/reader.ts` (new, owns preset prompts and the streaming call to AI).
- **Services/Utils layer** — `AIService` (reused), `webviewProtocol.ts` (extended), and a small `WebviewBridge`-style channel inside `ReaderPanel` (likely inline since the protocol is small).

## 5. Tag Schema & Dispatch

### 5.1 New BBCmd enum entries

In `src/core/types.ts`:

```ts
export enum BBCmd {
  // ...existing entries unchanged...
  RENDER       = 'bb-render',
  RENDER_BLOG  = 'bb-render-blog',
  RENDER_SKIM  = 'bb-render-skim',
  RENDER_EXPL  = 'bb-render-expl',
}
```

### 5.2 Dispatch in `bbCommand.ts`

After `findAndParse` succeeds and the `cmd` is resolved against `BBCmd`, check the prefix:

```ts
if (cmd.startsWith('bb-render')) {
  // 1. Remove the tag range from the source document
  await editor.edit(eb => eb.delete(result.range));
  // 2. Hand off to ReaderPanel — fully bypasses handleProcessing()
  await ReaderPanel.openForDocument(
    context,
    editor.document,
    cmd as RenderCmd,
    ps.message,
  );
  return; // do NOT fall through to inline-replacement path
}
```

Notes:

- The tag is deleted *before* opening the Reader, so the document the Reader reads has no `<bb-render-*>` tag in it.
- `handleProcessing` (the inline replacement path) is not touched — it stays exactly as it is for the existing seven BB commands.
- The "interrupt on file switch / file close" logic in `bbCommand.ts` does not apply to render commands (the Reader manages its own lifecycle), so the render branch returns early before the `currentEditor` / `originalText` machinery engages.

### 5.3 Slash menu items

In `media/webview/bb-slash-plugin.ts`, add a new `render` group with four items:

| Label | Tag inserted | Description |
|---|---|---|
| `Render: Blog View` | `<bb-render-blog:$1>` | Polished article rendering |
| `Render: Skim Mode` | `<bb-render-skim:$1>` | Fast-scan layout |
| `Render: Explainer` | `<bb-render-expl:$1>` | Diagrams + teaching annotations |
| `Render: Custom` | `<bb-render:$1>` | Prompt-driven |

`$1` is the cursor placeholder, identical to existing patterns like `<bb-tslt:$1>`.

## 6. Reader Panel

### 6.1 Class outline

`src/commands/readerCommand.ts` defines `ReaderPanel`:

```ts
class ReaderPanel implements vscode.Disposable {
  private static panels = new Map<string, ReaderPanel>();   // key: document.uri.toString()

  static async openForDocument(
    context: vscode.ExtensionContext,
    sourceDoc: vscode.TextDocument,
    cmd: RenderCmd,
    userPrompt: string,
  ): Promise<void>;

  private constructor(...);
  private startRender(): Promise<void>;
  private regenerate(): Promise<void>;
  private exportHtml(): Promise<void>;
  private onSourceChanged(): void;       // banner
  private onSourceClosed(): void;        // banner
  dispose(): void;                       // aborts in-flight, removes from map
}
```

### 6.2 Lifecycle & uniqueness

- One Reader per source `document.uri`. If the user fires a new render while a Reader is already open for the same source, the existing Reader is revealed and a regenerate is triggered with the new preset/prompt.
- Closing the Reader panel disposes it and aborts any in-flight AI call.
- Closing the source document **does not** close the Reader. The Reader switches to a "source closed" state (last render visible, Export still works, Regenerate disabled).

### 6.3 Source change detection

The Reader registers `vscode.workspace.onDidChangeTextDocument` filtered to the source URI. When the document text changes after a successful render, a non-blocking banner appears in the Reader top area:

```
ⓘ Source changed — [Regenerate]   (×)
```

Auto-regeneration is intentionally avoided: AI calls are slow and metered.

### 6.4 Streaming protocol

Reuses the existing chunk/done/error shape from `webviewProtocol.ts`. New messages (additions to the existing union types):

```ts
// Host → Webview
interface HostRenderStartMessage  { type: 'render-start'; id: string; preset: string; userPrompt: string; estInputTok: number; }
interface HostRenderChunkMessage  { type: 'render-chunk'; id: string; text: string; }
interface HostRenderDoneMessage   { type: 'render-done';  id: string; fullHtml: string; tokensUsed: number; costUsd?: number; durationMs: number; }
interface HostRenderErrorMessage  { type: 'render-error'; id: string; message: string; }
interface HostRenderSourceChangedMessage { type: 'render-source-changed'; id: string; }
interface HostRenderSourceClosedMessage  { type: 'render-source-closed';  id: string; }
interface HostRenderExportResultMessage  { type: 'render-export-result';  success: boolean; filePath?: string; error?: string; }

// Webview → Host
interface WebviewRenderRegenerateMessage { type: 'render-regenerate'; }
interface WebviewRenderExportMessage     { type: 'render-export'; html: string; }
interface WebviewRenderCancelMessage     { type: 'render-cancel'; id: string; }
```

The Reader panel sends `render-start` once, many `render-chunk`s, then exactly one of `render-done` / `render-error` / (implicit cancel via dispose).

### 6.5 Top-bar progress heuristic

Estimated input tokens: `Math.ceil(sourceChars / 4)`. Progress percent: `min(99, receivedTok / estInputTok × 100)`. Cap at 99 until `render-done` arrives. Imperfect — the goal is motion, not accuracy.

The "latest chunk preview" is computed in the webview by maintaining a rolling buffer of the last 200 chars of *text content* (parse the chunk as HTML, take `.textContent`, slice tail).

## 7. Presets

v1 ships four presets. Each is a fixed system prompt (200–400 words English) plus a shared hard-constraint block. Preset prompts live in `src/core/reader.ts` as constants. Users cannot edit them in v1.

### 7.1 Shared hard constraints (all presets)

```
You are generating a self-contained HTML document for human reading.

Output requirements:
- Begin with <!DOCTYPE html> and a complete HTML document.
- All CSS must be inline in a <style> block in <head>. No external stylesheets.
- Support both light and dark themes via prefers-color-scheme.
- You may use <svg> for diagrams, and <script> for interactivity — but only INLINE.
  No external <script src="..."> or fetch() — there is no network.
- For images that appear in the source Markdown, KEEP the markdown URL as-is in
  <img src="...">. The renderer will translate paths before display.
- Do not echo the source Markdown verbatim as a code block. Render it.

You do NOT need to preserve the exact prose of the source; you may restructure,
summarize, or visualize as the preset directs. But do not invent factual claims
that contradict the source.
```

### 7.2 Preset prompts

Final wording is determined during implementation. Each preset prompt MUST:

- Be a single coherent paragraph of 200–400 words.
- State the target reader and the rendering objective.
- Give the model concrete latitude (e.g. "use SVG diagrams", "use `<details>`") rather than vague style adjectives.
- Not duplicate constraints already covered by §7.1 (e.g. "must be self-contained").

Working drafts:

**Blog View (default):**
> Render as a polished, readable article. Use a clear hierarchy with a sticky or in-page table of contents. Use callout boxes for note-worthy passages. Syntax-highlight code blocks. Use generous whitespace and a body width that's comfortable on a laptop screen. The goal: this should look like a hand-designed blog post.

**Skim Mode:**
> Optimize for fast scanning. Lead with a one-paragraph TL;DR. Use tables, badges, and sidebars heavily. Wrap any non-essential elaboration in `<details>` collapsibles so the surface stays terse. Use SVG icons next to section headings. The goal: a reader spends 30 seconds and walks away with the spine.

**Explainer:**
> Turn this into a teaching artifact. Where the source describes a concept, system, or workflow, generate SVG diagrams to visualize it. Annotate code blocks with margin notes. Add "Why this matters" sidebars on key sections. Use a clean, didactic visual language. The goal: someone unfamiliar with the topic can learn from this in one read.

**Custom:**
> (No preset preamble; user prompt is the only instruction beyond shared hard constraints.)

### 7.3 Composition

If the user supplies a `:prompt`, it is appended to the preset system prompt as:

```
Additionally: <user prompt>
```

For `<bb-render:>` (Custom), the system prompt is the shared hard constraints alone, and the user prompt is sent as the entire creative direction.

## 8. Prompt Strategy

### 8.1 Message shape

The AI request uses the OpenAI-compatible chat format already used by `AIService`:

```
system: <preset system prompt> + <shared hard constraints> [+ "Additionally: <user prompt>"]
user:   File: <basename>
        Frontmatter (YAML):
        <yaml dump or "(none)">
        ---
        <markdown body, frontmatter stripped>
```

### 8.2 Frontmatter handling

- The source document's frontmatter (YAML or TOML, however the existing parser handles it) is extracted using the same utility BB Editor uses.
- The frontmatter object is serialized back to a small YAML block and inserted into the user message as a labeled section — the AI can use `title`, `date`, `author`, `tags` to populate `<title>`, header bylines, etc.
- The frontmatter does **not** appear in the generated HTML as raw YAML.

### 8.3 Streaming

The streaming generator from `AIService` is awaited chunk by chunk. Each chunk's text is forwarded to the webview as a `render-chunk` message. Cancellation is via `AbortController` passed to `AIService` and tracked by the `ReaderPanel`.

### 8.4 Cost guard (lightweight)

If estimated input tokens exceeds 25,000 (roughly a 100KB Markdown file), show a confirmation modal:

```
This file is large (~25k input tokens, est. cost $0.X).
Render anyway?  [Render]  [Cancel]
```

Threshold and cost estimate use existing `PricingService` if available. Falls back to token-only display.

## 9. AI Integration

- Uses the singleton `AIService` for streaming chat completion. No new transport layer.
- Model resolution uses `blogbuddy.model` config (same as all other BB commands).
- Each render is recorded in usage stats under a single new "purpose flag" `render` (no per-preset breakdown in v1).
- Standard error handling: network failures, rate limits, and aborts are surfaced as `render-error` messages with user-friendly text. The Reader top bar switches to `Error` state with a Retry button.

## 10. Webview Security (CSP)

The Reader webview has a relaxed CSP compared to BB Editor to allow AI-generated inline scripts (needed for collapsibles, tab switchers, sliders per Shihipar's article):

```
default-src 'none';
style-src   'unsafe-inline' ${webview.cspSource};
script-src  'unsafe-inline' 'nonce-<shell-nonce>';
img-src     ${webview.cspSource} data: https:;
font-src    ${webview.cspSource};
connect-src 'none';
```

### 10.1 Security boundary

- The Reader's own shell (top bar, button handlers, message bridge) uses a `nonce-`-tagged `<script>` and does not depend on `'unsafe-inline'`.
- The `'unsafe-inline'` script-src is **only** for the AI-generated HTML injected into `<div id="ai-output">`.
- `connect-src 'none'` ensures generated scripts cannot make network calls — important defense-in-depth, since AI output could theoretically be prompt-injected via the source Markdown.
- The Reader's webview has no access to the workspace beyond messages — it cannot read files or run extension APIs directly.

### 10.2 Documented risks

The README and `docs/help.md` will include a short security note: "AI Reader executes inline scripts the model generates. Trust requires trusting your AI provider and source content. Network calls from generated scripts are blocked."

## 11. Asset & Frontmatter Handling

### 11.1 In-webview rendering (preview)

The AI receives the source Markdown with its **original relative image paths intact** (the model is not exposed to `vscode-webview://...` URLs, which would only confuse it and bloat the prompt). The shared hard constraints in §7.1 instruct the model to keep image src strings verbatim.

The webview translates paths at render time, not the host:

- For each incoming chunk, the webview runs `rewriteImageSrcs(html, baseUri)` before injecting into `<div id="ai-output">`. This helper replaces every non-`https:`, non-`data:`, non-`vscode-webview:` `<img src>` with `${baseUri}/${path}` (URL-encoded, accounting for the `%2B` quirk handled in `media/webview/markdown-output.ts:120`).

The `localResourceRoots` on the webview must include `path.dirname(sourceDoc.uri.fsPath)` so images resolve.

### 11.2 Export-time inlining

When the user clicks Export, by default (config: `blogbuddy.reader.inlineAssets`, default `true`):

- Walk every `<img src="...">` in the final HTML.
- For each non-`https:` / non-`data:` src, resolve against the source's directory, read the file, base64-encode, replace `src` with a `data:image/<ext>;base64,<...>` URI.
- HTTPS image URLs are left as-is.
- If a referenced file doesn't exist on disk, leave the src as-is and log a warning (do not fail the export).

Output file path: `<sourceDir>/<sourceBasename>.reader.html`. If the file exists, prompt overwrite-or-rename via `vscode.window.showWarningMessage`.

When `blogbuddy.reader.inlineAssets` is `false`, images stay as relative paths and the user is responsible for the assets folder co-existing with the HTML.

## 12. Source Sync & Lifecycle

(See §6.2 and §6.3.) Behaviors at a glance:

| Event | Reader behavior |
|---|---|
| User fires a new render for an already-open Reader | Reveal panel, abort current call, regenerate |
| Source `onDidChangeTextDocument` after render done | Show banner; no auto-regen |
| Source closed (`onDidCloseTextDocument`) | Banner; last render preserved; Regenerate disabled |
| Reader panel closed | Abort in-flight call, dispose, remove from map |
| AI error mid-stream | Top bar → `Error`; partial output preserved; Retry button |
| User clicks Regenerate | Abort current (if any), restart with same preset+prompt against latest source |

## 13. Export

(See §11.2.) Additional details:

- Export is **only enabled** after the first successful render completes.
- The exported HTML is the final accumulated text from `render-done.fullHtml` — *not* whatever happens to be in the DOM (which has gone through path rewriting for preview).
- On export, asset inlining runs on the **server-side** copy (extension host has fs access), not on the webview's rewritten copy.
- Success path: open the saved file location via `vscode.commands.executeCommand('revealFileInOS', uri)` is offered in an Information message ("Saved my-post.reader.html — [Open] [Show in Folder]").

## 14. Configuration

New settings in `package.json` `contributes.configuration`:

```jsonc
"blogbuddy.reader.inlineAssets": {
  "type": "boolean",
  "default": true,
  "description": "When exporting from BB Reader, inline images as base64 to produce a single self-contained HTML file. Set false to keep relative image paths."
}
```

No other new settings. Model, API key, base URL all flow through the existing settings.

## 15. File / Code Touch Points

### Files to create

| Path | Purpose |
|---|---|
| `src/commands/readerCommand.ts` | `ReaderPanel` class, panel registration glue |
| `src/core/reader.ts` | Preset prompts, hard-constraint prompt, AIService streaming wrapper, prompt assembly |
| `media/webview-reader/index.ts` | Reader webview shell — top bar UI, message handling, image src rewriting, streaming HTML injection |
| `media/webview-reader/styles.css` | Reader webview shell styles |

### Files to modify

| Path | Modification |
|---|---|
| `src/commands/bbCommand.ts` | Add `bb-render*` prefix dispatch branch before `handleProcessing` |
| `src/core/types.ts` | Add `RENDER`, `RENDER_BLOG`, `RENDER_SKIM`, `RENDER_EXPL` to `BBCmd` enum |
| `src/commands/index.ts` | Register the reader command/panel infrastructure on activation |
| `src/services/webviewProtocol.ts` | Add render-* message type unions (host→webview and webview→host) |
| `media/webview/bb-slash-plugin.ts` | Add the four render slash items in a new `render` group |
| `package.json` | Add `blogbuddy.reader.inlineAssets` config; bump version when ready |
| `esbuild.js` | Add `media/webview-reader/index.ts` as a build entry, producing `dist/webview-reader.js` and `dist/webview-reader.css` |
| `docs/help.md` / `docs/help_中文.md` | Document the new tag family and security note |

### Files NOT touched

- BB Editor's webview (`media/webview/*` except slash plugin) and `EditorPanel` (`src/commands/editorCommand.ts`).
- Existing BB commands (`core/{expander,improve,keyword,mermaid,normal,tldr,translator}.ts`).
- `AIService` internals.

## 16. Out of Scope (v1)

Recap of what is explicitly *not* in v1:

- Multi-turn / conversational refinement (regen is always one-shot against the source).
- Cross-file context aggregation.
- User-editable preset prompts.
- Reader as a VS Code Custom Editor.
- Watching files on disk (Reader tracks the `TextDocument`, which is enough).
- Use cases outside blog-writing: code-review artifacts, PR explainers, design playgrounds, draggable-card editors, custom data editors. (All viable v2+ candidates following Shihipar's article.)
- Server-side or hosted sharing (Shihipar's "upload to S3, share a link"); v1 is local-only.

## 17. Open Questions & Risks

| Item | Risk / question | Mitigation / plan |
|---|---|---|
| AI generates broken HTML | Streaming preview may look ugly until `</html>` arrives | Browser is lenient; final render-done replaces the DOM with the canonical full string |
| Large source files | Cost spike; slow response | Cost-guard modal at ~25k input tokens (§8.4); cancel always available |
| Prompt injection via source content | Source MD could contain text steering the model to emit malicious scripts | `connect-src 'none'` blocks network exfiltration; injected scripts can still manipulate the Reader DOM, but the Reader has no access to extension APIs — blast radius limited to the panel itself |
| Image path resolution edge cases | `%2B`, URL-encoded characters, Windows paths, symlinks | Reuse path-handling logic already tested in BB Editor (`media/webview/markdown-output.ts`) |
| Auto-save / dirty state interactions | If source is dirty when render fires, what content do we render? | The `TextDocument.getText()` returns the in-memory text (dirty or not). That is what we render. Save state is irrelevant to the feature. |
| Frontmatter parser divergence | Two parsers (BB Editor's vs. Reader's) could drift | **Required:** the existing frontmatter extractor used by BB Editor must be lifted into a shared `src/utils/` (or `src/services/`) module before the Reader uses it; both call sites then share one implementation |

---

## Appendix A: Why this matches BlogBuddy's identity

The CLAUDE.md states BlogBuddy's mission as *"seamless AI assistance through embedded command tags in content. The core philosophy is maintaining user flow without context switching."* The Reader feature lands inside that exact pattern: a tag in content (`<bb-render-blog:>`), triggered by the existing shortcut, with the AI doing the work. The user's flow does not change — they just gain a new place for the AI to deliver its output.

This is meaningfully different from a generic Markdown-to-HTML export, which would be a context switch into a different tool model. AI Reader stays within BlogBuddy's tag-driven, AI-mediated paradigm.

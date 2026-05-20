# BlogBuddy — Complete Guide

[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

[中文版本](help_CN.md) · [README](../README.md) · [Changelog](../CHANGELOG.md)

BlogBuddy is a VS Code extension that puts AI verbs inside your Markdown. Drop a tag into your text, press a chord, watch streaming output replace the tag in place. This guide is the reference — setup, every command, the BB Editor, the AI Reader View, and troubleshooting.

---

## Quick start

1. Install **BlogBuddy** from the VS Code Marketplace.
2. Set credentials, either:
   - `blogbuddy.apiKey` in VS Code settings, **or**
   - `export BLOGBUDDY_API_KEY` (falls back to `OPENAI_API_KEY`).
3. Run **BlogBuddy: Select Model** from the command palette. It fetches the provider's `/v1/models` list; pick one or enter a custom id.
4. Open a `.md` file. Insert a tag. Press `Cmd+B Cmd+B` (Mac) / `Ctrl+B Ctrl+B` (Win/Linux).

Word count appears in the status bar for every Markdown file — no toggle.

---

## Three surfaces

| Surface | Trigger | Best for |
|---|---|---|
| **Inline tags** | `<bb-*>` in your text + `Cmd+B Cmd+B` | The fast path — embedded AI assistance without leaving the cursor |
| **BB Editor** | `Cmd+B` on a `.md` in Explorer | WYSIWYG editing with typed frontmatter, slash menu, streaming AI blocks |
| **Command palette** | `Cmd+Shift+P` → `BlogBuddy:` | Everything else — model picker, diagnostics, usage stats, templates |

---

## Inline BB commands

Embed an AI instruction in your text as a tag, then press the chord (`Cmd+B Cmd+B` Mac / `Ctrl+B Ctrl+B` Win/Linux).

### Tag syntax

```
<command:optional-instruction>
```

The optional instruction after the colon refines the model's brief. Examples: `<bb-expd:add concrete examples>`, `<bb-impv:make more concise>`, `<bb-tslt:日本語>`.

### Smart scope detection

BB picks the working scope from your cursor or selection:

- **Manual selection** → process only the selected text.
- **Same line as content** → the tag shares a line with prose; process just that line.
- **Paragraph (text block)** → the tag sits inside a block; process the whole block (text separated by blank lines).
- **Full document** → the tag is alone in its own block (surrounded by blank lines) AND the command supports full-doc mode (`bb-impv`, `bb-tslt`, `bb`). Output goes to a new file.

### The eight inline commands

#### `<bb-expd:focus>` — Expand

Elaborate on existing content while keeping tone and structure intact. BB reads full document context so additions fit naturally.

```markdown
Machine learning is changing software development.
<bb-expd:make this suitable for a technical blog>
```

#### `<bb-impv:focus>` — Improve

Polish clarity, grammar, and rhythm.

- **Block mode** (tag shares a paragraph with content) — rewrite that paragraph in place.
- **Full-document mode** (tag isolated by blank lines) — rewrite the entire document into a new `*_improved.md` file.

```markdown
This paragraph has some repetitive content that says the same thing multiple times.
<bb-impv:make more concise and remove redundancy>
```

#### `<bb-tslt:target-language>` — Translate

Translate the whole document. Always full-document mode; the target language is required.

```markdown
<bb-tslt:中文>
<bb-tslt:Japanese>
<bb-tslt:Français>
```

Produces a new file with a language suffix (e.g. `myblog_日本語.md`) and inserts a Markdown link to it. Markdown structure and fenced code blocks are preserved.

#### `<bb-mmd:diagram-instructions>` — Mermaid

Generate a Mermaid diagram from a description. BB picks the diagram type (flowchart / sequence / class / state / ER / gantt / pie) automatically and validates the output starts with a recognised prefix.

```markdown
User registration process:
1. User enters email and password
2. System validates credentials
3. If valid, create account
4. Send confirmation email
<bb-mmd:create a flowchart>
```

Output: a fenced ` ```mermaid ` block. VS Code's Markdown preview renders it natively.

#### `<bb-kwd:focus>` — Keywords

Extract 8–12 SEO-friendly keywords from the document.

```markdown
<bb-kwd:focus on technical terms>
<bb-kwd:>
```

#### `<bb-tldr:style>` — TL;DR

Generate a concise "too long; didn't read" summary inline.

```markdown
<bb-tldr:focus on actionable insights>
<bb-tldr:>
```

#### `<bb-tag>` — Attribution badge

Insert the BlogBuddy badge:

```
[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)
```

#### `<bb:instruction>` — Free-form

The flexible escape hatch — hand BB any instruction. Block mode rewrites the paragraph; full-document mode writes a new `*_processed.md` file.

> **Note.** Free-form is the most token-hungry command. Prefer the specialised tags above when one fits — they use tighter prompts and produce more predictable output.

```markdown
- Feature 1: Description
- Feature 2: Description
<bb:convert this list to a comparison table>
```

---

## AI Reader View

The `<bb-render-*>` family fires AI re-interpretation: instead of replacing text in your source, BB generates a complete HTML "reading artifact" rendered in a side panel. Your `.md` is never modified.

### The four presets

| Tag | The brief |
|---|---|
| `<bb-render-blog:>` | **Blog View** — polished article with sticky TOC, callouts, syntax-highlighted code, comfortable measure |
| `<bb-render-skim:>` | **Skim Mode** — TL;DR at the top, dense visual structure, `<details>` collapsibles for skippable content |
| `<bb-render-expl:>` | **Explainer** — teaching artifact with SVG diagrams, code annotations, "why this matters" sidebars |
| `<bb-render:your prompt>` | **Custom** — your prompt drives the entire creative direction (overrides preset style) |

Any preset accepts a refinement after the colon:

```markdown
<bb-render-blog:make the TOC sticky and add a print stylesheet>
```

### Firing

Put the cursor anywhere on the tag and press `Cmd+B Cmd+B` (macOS) / `Ctrl+B Ctrl+B` (Windows/Linux). The tag is **removed from your source** and a BB Reader panel opens to the right.

Inside BB Editor, the `/` slash menu has a **Render** group with all four presets pre-filled — pick one, type a refinement between `:` and `>`, fire.

### Reader panel anatomy

- **Top bar** — phase indicator (`Generating…` / `Done ✓`), live token counter, current preset, `.bbreader.md` marker when active
- **Prompt input** — edit the refinement inline; Enter or **Regenerate** to re-run
- **Live stream** — HTML renders incrementally inside a sandboxed iframe as the AI emits it; the canonical document replaces the streamed buffer on completion
- **Source-changed banner** — edit your `.md` after a render and a banner offers one-click Regenerate (auto-regen is intentionally avoided)
- **BB credit footer** — every generated page carries a small `created with BB` badge linking to the repo

### Export

Click **Export** to write a self-contained `.html` next to your `.md` (default name: `<source>.reader.html`). By default, local-path images are read from disk and base64-inlined so the file is portable. Set `blogbuddy.reader.inlineAssets` to `false` to keep relative image paths (useful when the asset folder ships alongside the HTML).

### The `.bbreader.md` style reference

Drop a `.bbreader.md` at your **workspace root** to keep multiple renders stylistically consistent. Every render auto-loads it and feeds it to the AI as authoritative guidance on layout, typography, colors, and components. The Reader's top bar shows `· .bbreader.md` when a reference is active.

Run **BlogBuddy: Create .bbreader.md Template** to scaffold a starter with five sections:

- **Visual style** — typography, body width, colors, headings, code blocks, callouts, links
- **Document structure** — TOC, byline, date format, reading-time estimate
- **Components** — special elements the AI may use
- **Example HTML** — paste an excerpt from your existing blog as a direct reference
- **Things to avoid**

Fill in what you have opinions about, leave the rest blank. Edit and re-render any time — changes take effect immediately on the next render. The file is capped at ~10,000 chars (longer references are truncated with a `[... truncated]` marker).

### Cost guard

If estimated input tokens exceed ~25,000 (~100KB of Markdown plus style ref), a modal prompts before kicking off so you don't accidentally spend on a giant doc.

### Security model

The Reader iframe is loaded via a Blob URL and executes inline scripts the AI emits — so AI-generated interactivity (collapsibles, tabs, simple sliders) works. The parent webview's CSP has `connect-src 'none'`, so injected scripts cannot phone home. Trust depends on trusting your AI provider and the source content you render.

---

## BB Editor

A WYSIWYG Markdown editor built into the extension. Open via the Explorer context menu (right-click a `.md` → **BlogBuddy: Open BB Editor**) or `Cmd+B` with the file selected. The editor reads and writes plain Markdown — no proprietary format.

### Core editing

- **WYSIWYG with full GFM** — tables, strikethrough, task lists, autolinks, blockquotes, code blocks
- **Slash menu (`/`)** — insert block types or BB commands inline; arrow keys clamp at the boundaries (no wrap)
- **Inline `Cmd+B Cmd+B`** — fire any `<bb-*>` tag without leaving the editor
- **Streaming AI blocks** — AI output appears inline as a typed ProseMirror node, token by token
- **Asset paste** — paste or drag-drop files; saved to the document directory or to `blogbuddy.assetDir`, inserted as relative paths
- **Prism syntax highlighting** — 20+ languages including TypeScript, JavaScript, Python, Bash, YAML, Rust, Go, SQL; palette tracks VS Code light / dark / high-contrast themes
- **Arrow ligatures** — `->` → `→`, `=>` → `⇒`; skipped inside code blocks and during IME composition
- **Heading-to-paragraph** — `Backspace` at the start of a heading converts it directly to a paragraph (no step-down through `h2 → h1 → p`)
- **Zen / Read layout toggle** — small `Z` / `R` button at the top-right flips between **Zen mode** (centered 860px, focused on writing) and **Read mode** (full-viewport, comfortable for long reads). State is global and persists across sessions; multiple open BB Editor panels stay in sync

### Frontmatter Properties panel

YAML frontmatter is exposed as a typed panel at the top of the editor:

- **Typed fields** — `title` (text), `date` (date picker), `tags` / `categories` (chip input), `author` / `slug` (text), `draft` (toggle), `description` (textarea)
- **Add field** — dropdown to add a known field not yet in the YAML
- **Raw YAML fallback** — collapsible `<details>` at the bottom for direct editing (useful for custom fields or comments)
- **Collapsed by default** — the panel opens collapsed; click the header to expand. Most editing happens in the body, so the panel stays out of the way until you need it
- Changes round-trip to disk on auto-save alongside the body

### Saving and reliability

- **Auto-save** — debounced writes (~500ms of quiescence)
- **`Cmd+S`** — flush immediately
- **IME composition guard** — CJK input (Chinese / Japanese / Korean Pinyin etc.) suspends auto-save and BB triggers until composition commits; no more half-composed pinyin leaking into saves
- **Compact Markdown normalisation** on save — bullets normalised to `-`, tight lists, HTML entities decoded, bold-marker whitespace moved outside, 3+ consecutive blank lines collapsed to 2. Fenced code block contents are left untouched
- **External-change detection** — if the file changes on disk while you have unsaved edits, a banner offers **Reload** or **Keep my version** (no silent overwrite)

---

## Status bar

Two right-side items appear when a Markdown file is active.

### Word count

Chinese characters and English words counted separately and summed. Markdown-only; hidden for other file types. No toggle.

### Config source indicator

Shows where your `apiKey` is currently resolving from:

| Display | Meaning |
|---|---|
| `$(key) BB · cfg` | Using `blogbuddy.apiKey` from settings |
| `$(key) BB · env` | Using `BLOGBUDDY_API_KEY` or `OPENAI_API_KEY` env var |
| `$(key) BB · default` | Using the default base URL (`https://api.openai.com/v1`) |
| `$(warning) BB: no key` / `BB: no model` | Required config missing (yellow) |

Hover for a per-field source table (apiKey, baseURL, model) and quick links to Diagnostics / Select Model / Settings. Click to open the full **Show Config Diagnostics** report.

---

## Usage statistics

Run **BlogBuddy: Show Usage Statistics** from the command palette to open a Markdown report with request counts, token usage, per-flag / per-model breakdown, and — when pricing data is available — cost estimates.

Related palette commands:

- **BlogBuddy: Reset Usage Statistics** — clear counters (with confirmation)
- **BlogBuddy: Refresh Pricing Data** — re-fetch pricing from the provider

---

## Configuration

### Required

Only **API key** and **model** are strictly required. `baseURL` has a sensible default.

| Setting | Description |
|---|---|
| `blogbuddy.apiKey` | API key. Resolution order: this setting → `$BLOGBUDDY_API_KEY` → `$OPENAI_API_KEY` |
| `blogbuddy.baseURL` | OpenAI-compatible base URL. Resolution order: this setting → `$BLOGBUDDY_BASE_URL` → `$OPENAI_BASE_URL` → `https://api.openai.com/v1` |
| `blogbuddy.model` | Model id (e.g. `gpt-4o-mini`, `openai/gpt-4o-mini`). **Recommended:** use **BlogBuddy: Select Model** |

### Optional

| Setting | Description |
|---|---|
| `blogbuddy.assetDir` | Relative subdirectory for BB Editor asset uploads (e.g. `assets`, `images/uploads`). Resolved from the document directory; must stay within it. Empty = alongside the document |
| `blogbuddy.reader.inlineAssets` | When exporting from BB Reader, inline local images as base64 to produce a single self-contained HTML file. Default `true`; `false` keeps relative paths |

### Commands

Open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and type `BlogBuddy:`.

| Command | Purpose |
|---|---|
| `BlogBuddy: Hi BB` | Execute BB on the current cursor / selection (same as the chord) |
| `BlogBuddy: Open BB Editor` | Open the current `.md` in BB Editor |
| `BlogBuddy: Select Model` | Fetch `/v1/models` and pick (or enter) a model id. Surfaces auth / network errors directly with Retry / Enter Manually |
| `BlogBuddy: Show Config Diagnostics` | Masked report showing what the extension resolves for each field. Great for debugging "my env var isn't picked up" |
| `BlogBuddy: Show Usage Statistics` | Markdown report with token usage, request counts, per-flag / per-model breakdown |
| `BlogBuddy: Reset Usage Statistics` | Clear all counters (with confirmation) |
| `BlogBuddy: Refresh Pricing Data` | Re-fetch pricing data from the provider |
| `BlogBuddy: Create .bbreader.md Template` | Scaffold the style-reference template at the workspace root |

### macOS env var gotcha

Apps launched from Dock or Spotlight on macOS don't inherit shell environment variables. If you set `OPENAI_API_KEY` in `~/.zshrc` and it's "not picked up" by BlogBuddy:

**Easy fix** — launch VS Code from Terminal after `source ~/.zshrc`:

```bash
code .
```

**Persistent fix** — inject into the launchd session:

```bash
launchctl setenv OPENAI_API_KEY 'sk-...'
```

Then fully quit (⌘Q) and restart VS Code. This persists until reboot; for a permanent solution, create a LaunchAgent plist.

Run **BlogBuddy: Show Config Diagnostics** to verify what the extension host actually sees.

---

## Tips

### Scope by cursor placement

The single most useful habit. Cursor position alone tells BB what to operate on:

- Same line as the tag, plus other content → process **just that line**
- Anywhere in a paragraph with a BB tag → process the **paragraph**
- BB tag alone between blank lines (for supported commands) → process the **whole document**

### Be specific

Instructions after the colon shape output more than the command itself. `<bb-expd:>` is fine; `<bb-expd:add a concrete production-debugging example>` is better.

### Combine commands

A common writing flow: `bb-expd` → `bb-impv` → `bb-tslt`.

### Compose at the line level

For surgical edits, put the tag inline with the text you want changed:

```markdown
Machine learning is a subset of AI. <bb-expd:add practical examples>
```

### Full-document moves

For doc-wide rewrites and translations, isolate the tag with blank lines:

```markdown
Some content here...

<bb-impv:improve grammar and readability throughout the entire document>

More content here...
```

---

## Shortcuts & commands (quick reference)

| Action | Shortcut | Command id |
|---|---|---|
| Execute BB command | `Cmd+B Cmd+B` (Mac) / `Ctrl+B Ctrl+B` (Win/Linux) | `blogbuddy.bb` |
| Open BB Editor | `Cmd+B` (Mac) / `Ctrl+B` (Win/Linux) — Explorer focus on `.md` | `blogbuddy.openEditor` |
| Select model | Palette | `blogbuddy.selectModel` |
| Show diagnostics | Palette | `blogbuddy.showDiagnostics` |
| Show usage statistics | Palette | `blogbuddy.showUsageStats` |
| Create .bbreader.md template | Palette | `blogbuddy.createReaderTemplate` |

---

## Troubleshooting

### "API Key not set"

- Check `blogbuddy.apiKey`, or export `BLOGBUDDY_API_KEY` / `OPENAI_API_KEY`.
- Run **BlogBuddy: Show Config Diagnostics** to see what the extension actually resolves.
- On macOS, see the env var gotcha above if you set the variable but it's not picked up.

### "Select Model" fails

Check the error message — common cases:

- `401 Unauthorized` — wrong API key, or insufficient permissions for the provider.
- `404` / `ENOTFOUND` — wrong base URL (e.g. missing `/v1` path).
- `fetch failed` / `ECONNREFUSED` — network or proxy issue.
- Cert errors — enterprise proxy / TLS interception.

The error dialog has an **Enter Manually** button for typing a model id when the list fetch fails.

### Translation says "target language required"

Add the language after the colon: `<bb-tslt:Spanish>` or `<bb-tslt:日本語>`.

### Mermaid output seems off

BB validates that the output starts with a recognised diagram prefix (`flowchart`, `sequenceDiagram`, etc.). If the AI produces something unusable, try a more specific instruction or a different model.

### AI output drifts off-topic

- Tighten the instruction after the colon.
- BB reads full document context; if the doc is very large, context can be truncated — select a smaller range manually.

### Logs and support

- Check the VS Code Output panel for extension logs.
- Open [an issue](https://github.com/FulcrumStd/blogbuddy/issues) with diagnostics output attached.

---

## Version history

See the [CHANGELOG](../CHANGELOG.md) for the per-version breakdown. Recent highlights:

- **0.0.13** — **AI Reader View** (the `<bb-render-*>` family, side-panel HTML rendering, streaming preview, single-file export, `.bbreader.md` style reference). BB Menu removed in favour of palette-only command discovery; stats/help open directly without an intermediate prompt; slash menu navigation clamps at boundaries instead of wrapping.
- **0.0.12** — Config simplified (one model setting, always-on streaming, always-on word count). Env-var fallback for API key and base URL. New commands: **Select Model**, **Show Config Diagnostics**. Status bar config-source indicator. Mermaid output is always a fenced block.
- **0.0.11** — BB Editor polish — IME guard for CJK input, Prism syntax highlighting, external-file conflict detection, typed Properties panel for frontmatter, arrow ligatures, compact Markdown normalisation, View Source button.
- **0.0.10** — Frontmatter preview and editing panel added to BB Editor.

---

*Built with care for people who write in Markdown.*

# Change Log

All notable changes to the "blogbuddy" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### backlog

- Add the bb-srch command to support internet searches based on user requests
- Agent mode: Make bb commands agentic, allowing them to reference other files in the workspace to complete tasks
- Auto execute mode: Execute all BB commands in a file with one click
- Add support for generating SVG images with the bb-mmd command
- **Issue:** Warning popup may not show consistently when text selection overlaps with working area

---

## [0.0.14] - 2026-05-20

### Changed

- **AI Reader prompt restructured into four layers** — technical safety, aesthetic core, per-preset structural function, and user/style-reference overrides. The new aesthetic core carries a 12-tone catalog (editorial-magazine, brutalist, retro-futuristic, didactic-clinical, …), an explicit **Forbidden list** (Inter / Roboto / Arial / purple-on-white gradients / uniform `border-radius:8px` / "Tailwind default" feel), an anti-convergence rule, and a Self-check (no overflow at 1280px/380px, AA contrast in both schemes, SVG > ~8 nodes → HTML+CSS fallback). Adapted from Anthropic's `frontend-design` skill, tuned for the Reader webview's no-network CSP. Output is measurably less generic and has fewer layout glitches.
- **Reader Regenerate** now feeds the previous attempts' Design Briefs back to the model with a "pick a meaningfully different tone AND font AND palette" steer. Queue is capped at the last 3 attempts; resets on a new `<bb-render-*:>` trigger or when the user changes the refinement prompt between attempts. Earlier regenerates were sampling-temperature rerolls with no signal — this gives concrete avoidance.
- **`.bbreader.md` template** gains an **Aesthetic direction** section (Tone / Feel / Reference sites). Example fonts updated away from Inter (now flagged by the Forbidden list).

### Fixed

- **Slash menu nav in BB Editor** — pressing ↓ past the visible viewport no longer jumps the active highlight back near the top. Root cause: `scrollIntoView` on the active item triggers synthetic `mouseenter` events on items sliding under a stationary cursor, which our hover handler then promoted to active. We now gate `mouseenter` on actual mouse motion (`mousemove`), so scroll-induced enters are ignored while real hover still works.

---

## [0.0.13] - 2026-05-18

### Added

- **AI Reader View** — a new BB command family (`<bb-render-blog:>` / `<bb-render-skim:>` / `<bb-render-expl:>` / `<bb-render:custom prompt>`) that has the AI re-interpret the current Markdown as a full HTML "reading artifact" rendered in a side panel. Source `.md` is never modified.
  - Four presets: **Blog View** (polished article with TOC + callouts), **Skim Mode** (TL;DR + collapsibles), **Explainer** (SVG diagrams + teaching annotations), **Custom** (user prompt drives entirely)
  - Streaming HTML preview inside a sandboxed iframe (Blob URL), with phase indicator, spinner→checkmark transition, live token counter, and editable refinement prompt
  - **Export to self-contained `.html`** with images base64-inlined by default (`blogbuddy.reader.inlineAssets` controls this)
  - Source-changed banner (no auto-regen — renders are slow/metered)
  - BB credit footer injected into every render and exported file
  - Cost guard at ~25k input tokens
- **`.bbreader.md` style reference** — drop a `.bbreader.md` at workspace root; auto-loaded into every Reader render as authoritative style guidance for layout, typography, colors, components. Truncated at 10,000 chars
- **`BlogBuddy: Create .bbreader.md Template`** command — scaffolds a 5-section starter (Visual style / Document structure / Components / Example HTML / Things to avoid) at workspace root
- **`BlogBuddy: Show Usage Statistics`** / **`Reset Usage Statistics`** / **`Refresh Pricing Data`** as standalone palette commands (the prior dialog-based stats menu is gone)

### Changed

- **BB Menu removed** — the `Cmd+Shift+B` popup with just Usage Statistics + Help duplicated VS Code's native command palette. All BB features now live in the palette (`Cmd+Shift+P` `BlogBuddy:`). `Cmd+Shift+B` keybinding freed.
- **Show Usage Statistics** opens content directly (no intermediate "Open in Editor" notification step). The empty-state case (`totalRequests === 0`) shows an info toast instead of opening an empty markdown tab
- **Slash menu nav** in BB Editor clamps at the first/last item instead of wrapping (the old modulo wrap felt like a teleport once the menu had 19 items)
- Renamed Chinese docs to ASCII filenames: `help_中文.md` → `help_CN.md`, `README_中文.md` → `README_CN.md`

### Internal

- Frontmatter parser lifted from `WebviewBridge` into shared `src/utils/frontmatter.ts` (covered by regression tests)
- New `src/utils/assetInliner.ts` with regex-based `<img>` rewriting, path-traversal guard, and 10 unit tests
- Third esbuild context for the Reader webview (`media/webview-reader/` → `dist/webview-reader.js`)
- New protocol unions in `src/services/webviewProtocol.ts` for Reader ↔ host messages (kept separate from BB Editor's existing protocol)

---

## [0.0.12] - 2026-04-24

### Added

- **`BlogBuddy: Select Model` command**: fetches `/v1/models` from the configured base URL and opens a picker; choose an existing model or "Enter custom model…" to type one manually. Surfaces auth / network / base-URL errors directly (with Retry / Enter Manually) instead of silently returning an empty list
- **Environment variable fallback** for credentials. Resolution order (first non-empty wins):
  - `apiKey`: `blogbuddy.apiKey` → `$BLOGBUDDY_API_KEY` → `$OPENAI_API_KEY`
  - `baseURL`: `blogbuddy.baseURL` → `$BLOGBUDDY_BASE_URL` → `$OPENAI_BASE_URL` → `https://api.openai.com/v1` (final default, so a fresh install works out of the box with just an API key)
- **`BlogBuddy: Show Config Diagnostics` command**: opens a masked markdown report showing what the extension host actually resolves for each field (settings vs env vs default), useful for debugging the "I set the env var but it doesn't work" case
- **Config source status bar indicator**: a right-side `$(key) BB · cfg|env|default` item (turns yellow `$(warning) BB: no key` if nothing resolves). Hover for a per-field source table; click to open diagnostics. Also links to Select Model and settings

### Changed

- **Configuration simplified**. Removed the following settings (and their handling code):
  - `blogbuddy.smallModel` — all commands now use the single `blogbuddy.model`
  - `blogbuddy.streaming` — streaming is always on
  - `blogbuddy.documentInfoDisplay` — word count in the status bar is always shown for Markdown files; the `Toggle Document Info Display` command and its `Cmd+Shift+D` keybinding are removed
  - `blogbuddy.mermaidSVG` — Mermaid output is always an inline fenced code block; the Kroki-based SVG rendering path is removed (along with `src/services/KrokiService.ts`)
- **Settings UI polish**: `apiKey` / `baseURL` / `model` now use `markdownDescription` documenting the full resolution order; descriptions include inline clickable command links to Show Config Diagnostics and Select Model (since the model field can't be rendered as a native dropdown — the model list is fetched dynamically from the provider)
- **AI client recreation**: the OpenAI client is now rebuilt when `apiKey` or `baseURL` changes at runtime (previously cached the first-seen credentials until restart)

### Removed / Cleaned up

- `BB.act()` / `Processor.process()` non-streaming paths and the `StreamingProcessor` interface — all processors now expose a single streaming `process()`
- `aiService.chat(..., model?)` / `chatStreaming(..., model?)` per-call model override — both now use `blogbuddy.model` from config
- `src/services/KrokiService.ts` and its Mermaid-to-SVG rendering path

---

## [0.0.11] - 2026-04-24

### Added

- **Syntax highlighting in code blocks**: Fenced code blocks in BB Editor now render colored tokens (Prism-based, 20+ languages including ts/js/python/bash/yaml/rust/go/sql/…); palette adapts to VS Code light and dark/high-contrast themes
- **Typed Properties panel** for YAML frontmatter: `title`, `date`, `tags`, `categories`, `author`, `slug`, `draft`, `description` render as typed controls (text / date picker / chip input / toggle / textarea) with an "Add field" dropdown; raw YAML remains available as a collapsible fallback
- **External file conflict detection**: when the file changes on disk while BB Editor has unsaved edits, a banner offers **Reload from disk** or **Keep my version** instead of silently overwriting
- **View Source button** in the Frontmatter header opens the raw `.md` in a side VS Code editor
- **Arrow ligatures**: typing `->` auto-converts to `→`, `=>` to `⇒`; skipped inside code blocks/inline code and during IME composition

### Improved

- **IME composition protection**: auto-save and `Cmd+B Cmd+B` are suppressed during CJK (Chinese/Japanese/Korean) IME composition, so half-composed pinyin/kana no longer leaks into saves or BB command execution
- **Markdown output normalization** on save: bullets normalized to `-`, list items tightened (no blank lines between siblings), common HTML entities (`&amp;`, `&lt;`, `&gt;`, `&#x20;`, …) decoded, whitespace around `**bold**` markers moved outside, 3+ consecutive blank lines collapsed to 2; fenced code block contents are left untouched. Reduces Git diff noise when round-tripping through BB Editor
- **One-press Backspace** at the start of a heading now converts it directly to a paragraph (no longer steps down h2 → h1 → paragraph)
- **Centralized serialization pipeline**: `save` and `auto-save` share a single `getMarkdown → stripBaseUri → compactMarkdown` path for consistent output

---

## [0.0.10] - 2026-02-26

### Added

- **Frontmatter preview and editing panel**: YAML/TOML frontmatter is exposed as a dedicated collapsible editor at the top of BB Editor; changes auto-save alongside body edits

---

## [0.0.9] - 2026-02-26

### Added

- **GFM support**: BB Editor now supports GitHub Flavored Markdown — tables, strikethrough, task lists, and autolinks render correctly
- **Configurable asset directory**: New `blogbuddy.assetDir` setting to specify a relative subdirectory for uploaded images/attachments (e.g. `assets` or `images/uploads`)

### Improved

- **Editor empty state UX**: Editing area now fills the full viewport height — clicking anywhere in the editor focuses the cursor; added placeholder text ("Start writing, or type / for BB commands...")
- **Page-style visual**: Editor content area has subtle side borders with differentiated background, giving a "page" feel
- **Slash menu**: BB commands now appear first in the menu with English labels; fixed a bug where hover and keyboard selection could highlight two items simultaneously
- **URI encoding fix**: Fixed image display issue when `baseUri` contained `+` characters (encoded as `%2B` by Milkdown)

### Fixed

- Fixed `documentInfoDisplay` setting description — was incorrectly referencing cursor position instead of status bar

---

## [0.0.8] - 2026-02-24

### Added

- **BB Editor**: New WYSIWYG Markdown editor powered by Milkdown
  - Rich-text editing with real-time preview (commonmark, history, block plugins)
  - BB slash commands via `/` menu and `Cmd+B Cmd+B` chord shortcut
  - AI streaming block: inline display of AI processing results
  - Image/attachment paste & drag-drop: saves files to document directory, inserts as relative path
  - Frontmatter preservation: YAML (`---`) and TOML (`+++`) metadata is stripped on load and reattached on save
  - Auto-save with debounce and external file change detection
  - Theme sync with VS Code color theme
  - Open from file explorer context menu, active editor, or file picker
- CSP now allows external HTTPS images (e.g. shields.io badges) in BB Editor

---

## [0.0.7] - 2025-09-15

### Added

- Switching files or closing a file while a BB command is running will automatically terminate the command and display a notification

### Improved

- Improved BB command scope detection: automatically determines whether to process current line or entire paragraph based on BB tag location and content
- Changed locked area warning from status bar message to information popup for better visibility
- Improved the display of locked text content

### Fixed

- Fixed TextBlockProcessor selection handling logic bug where all text selections were being blocked when locked areas existed

## [0.0.6] - 2025-09-11

### Fixed

- Fixed an issue where the translation command would occasionally output formatting markers or tags

## [0.0.5] - 2025-09-10

### Added

- Added a word count feature that displays the document's word count in the status bar; toggle it on or off using `cmd+shift+d` (Mac) or `ctrl+shift+d` (Win/Linux)
- The color scheme will follow the editor theme

## [0.0.4] - 2025-09-08

### Added

- bb-tslt translation command now supports text block mode

### Fixed

- bb-tag command generated the wrong location

## [0.0.3] - 2025-09-03

### Added

- Small model setting for improved performance and cost optimization
- All BB commands except agent mode now use the small model by default

### Improved

- Reduced extension package size by optimizing image assets packaging

## [0.0.2] - 2025-09-01

### Fixed

- Editor block lose locking

# BlogBuddy - Your AI-Powered Blog Writing Sidekick

<div align="center">

<img src="images/logo.png" alt="BlogBuddy 徽标" width="200">

**Blog Buddy** makes Markdown magic happen with AI-powered writing assistance!

[![Version](https://img.shields.io/badge/version-0.0.13-FFD900.svg)](https://github.com/FulcrumStd/blogbuddy)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC.svg)](https://marketplace.visualstudio.com/items?itemName=blogbuddy.blogbuddy)
[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

</div>

[中文 Version](docs/README_CN.md)

## ⚠️ Important Notice

> **🚧 Development Status**: This project is currently in active development. Features may have bugs and are subject to change in future updates. Please use with caution in production environments.

> **🧪 Experimental Feature**: The `bb` command (AI Agent mode) is currently under development and in experimental stage. This feature may not work as expected and could undergo significant changes.

## ✨ What is Blog Buddy?

Blog Buddy (BB) is a VS Code extension designed to enhance your blog writing workflow without disrupting your creative flow. Instead of switching contexts or opening external tools, you simply insert BB command tags directly in your Markdown content and trigger them with keyboard shortcuts. It's that simple!

## 🚀 Key Features

### Smart Command Tags

Use intuitive command tags anywhere in your blog posts (all tags support `<bb-xxx:custom instructions>` format):

- `<bb:task description>` - Direct AI agent mode - give BB any task to complete
- `<bb-expd:expansion requirements>` - Expand and elaborate on surrounding text content
- `<bb-impv:improvement focus>` - Polish text quality (inline for local text, standalone for full document)
- `<bb-tslt:target language>` - Translate content (must specify target language)
- `<bb-tldr:summary style>` - Generate TL;DR summaries
- `<bb-mmd:diagram description>` - Generate Mermaid diagrams (fenced code block)
- `<bb-kwd:keyword focus>` - Extract keywords
- `<bb-tag>` - Add BlogBuddy attribution badge
- `<bb-render-blog:>` / `<bb-render-skim:>` / `<bb-render-expl:>` / `<bb-render:custom prompt>` - **AI Reader View** — see below

### Seamless Workflow Integration

- **Non-intrusive**: Commands are embedded directly in your content
- **Keyboard-driven**: Activate with simple key combinations
- **Context-aware**: AI understands your full document context
- **Streaming by default**: Output appears token-by-token as the AI generates it
- **Instant results**: Commands execute and replace content in-place

### BB Editor (WYSIWYG)

A built-in rich-text Markdown editor powered by [Milkdown](https://milkdown.dev), designed for a distraction-free writing experience:

- **Rich-text editing**: WYSIWYG with real-time preview — no split panes needed
- **GFM support**: Tables, strikethrough, task lists, and autolinks
- **BB commands built-in**: Use `/` slash menu or `Cmd+B Cmd+B` to trigger any BB command inline
- **AI streaming**: See AI results appear in real-time as an inline block
- **Syntax-highlighted code blocks**: Fenced blocks render colored tokens via Prism (20+ languages, palette adapts to VS Code light/dark themes)
- **Typed Properties panel for frontmatter**: YAML fields (`title`, `date`, `tags`, `categories`, `author`, `slug`, `draft`, `description`) render as typed controls — date picker, chip input, toggle, etc. Raw YAML remains available as a collapsible fallback
- **IME-friendly**: Composition events (CJK input) are guarded so auto-save and BB commands never fire on half-composed text
- **Arrow ligatures**: `->` auto-converts to `→`, `=>` to `⇒`; skipped inside code blocks and during IME composition
- **Compact Markdown on save**: bullets normalized to `-`, tight lists, HTML entities decoded, multiple blank lines collapsed — reduces Git diff noise
- **External file conflict detection**: if the file changes on disk while you have unsaved edits, a banner offers Reload or Keep my version instead of silently overwriting
- **View source button**: open the raw `.md` in a side VS Code editor any time
- **Image & file paste**: paste or drag-drop — files saved to the document directory (or configurable via `blogbuddy.assetDir`), inserted as relative paths
- **Auto-save**: debounced saves; `Cmd+S` to flush immediately
- **Theme sync**: editor theme follows your VS Code color theme

Open the BB Editor via:

- Right-click a `.md` file in the explorer → **BlogBuddy: Open BB Editor**
- Or use `Cmd+B` (Mac) / `Ctrl+B` (Win/Linux) when a `.md` file is selected in the explorer

### AI Reader View

Trigger `<bb-render-*:>` tags to have the AI re-interpret your Markdown as a full HTML "reading artifact" rendered in a side panel:

- **Four presets**: Blog View (polished article with TOC and callouts), Skim Mode (TL;DR + collapsibles), Explainer (SVG diagrams + teaching annotations), and Custom (your own prompt drives entirely)
- **Live streaming preview**: the HTML renders incrementally inside a sandboxed iframe as the AI generates it; final canonical document replaces the streamed buffer on completion
- **Editable prompt + Regenerate**: tweak the refinement prompt inline and re-run without re-typing the tag
- **Export to self-contained `.html`**: single-file output with images base64-inlined (toggle `blogbuddy.reader.inlineAssets` to keep relative paths instead)
- **`.bbreader.md` style reference** (optional): drop a `.bbreader.md` at your workspace root describing your blog's typography, colors, components, etc. — every Reader render uses it as authoritative style guidance. Run **BlogBuddy: Create .bbreader.md Template** to scaffold a starter
- **BB credit footer**: every generated page (preview and exported) carries a small `created with BB` badge linking back to the repo
- **Cost guard**: large source files (~25k input tokens) prompt before kicking off a render

Trigger from any Markdown editor — type `<bb-render-blog:>` then press `Cmd+B Cmd+B`. Inside BB Editor, the `/` slash menu has a **Render** group with the four presets prefilled.

### Document Statistics

Word count for the active Markdown file is always shown in the VS Code status bar:

- **Smart counting**: Chinese characters + English words counted separately
- **Status bar display**: Small, unobtrusive item on the right
- **Markdown-only**: Hidden for non-Markdown files

### Config Source Indicator

A small BlogBuddy item in the status bar shows which source your `apiKey` is currently resolving from (`cfg` / `env` / `default`). Hover to see per-field sources; click to open full diagnostics.

## 📖 How to Use

### Quick Start

1. Install BlogBuddy from the VS Code marketplace
2. Set your API key — either:
   - Set `blogbuddy.apiKey` in VS Code settings, **or**
   - Export `BLOGBUDDY_API_KEY` / `OPENAI_API_KEY` as an environment variable
3. Optionally set `blogbuddy.baseURL` if you're using a non-OpenAI provider (e.g. OpenRouter, DeepSeek, your own proxy). The extension falls back to `https://api.openai.com/v1` by default
4. Run **BlogBuddy: Select Model** from the command palette — the command fetches the provider's `/v1/models` list and lets you pick one (or enter a custom id)
5. Start writing and insert BB commands where you want AI assistance

### Basic Usage

1. **Insert a command tag** in your text:

   ```markdown
   Here's a brief overview of machine learning.
   <bb-expd:focus on practical applications>
   ```

2. **Position your cursor** in the paragraph containing the tag (or select text manually for precise scoping)

3. **Press the activation key**: `Cmd+B Cmd+B` (Mac) or `Ctrl+B Ctrl+B` (Windows/Linux)

4. **Watch BB work its magic** — the command tag and surrounding text are replaced with AI-generated content (streaming in real time)

### Finding all commands

Every BlogBuddy command is available from the VS Code command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) — type `BlogBuddy:` to filter, including **Usage Statistics**, **Help**, **Select Model**, **Create .bbreader.md Template**, etc.

### 📚 Detailed Documentation

For comprehensive feature documentation, examples, and advanced usage tips, see our detailed guide:
**➡️ [Complete User Guide](docs/help.md)**

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+B Cmd+B` (Mac)<br>`Ctrl+B Ctrl+B` (Win/Linux) | Execute BB command on the current block / selection |
| `Cmd+B` (Mac)<br>`Ctrl+B` (Win/Linux) | Open BB Editor for the selected `.md` file (in Explorer) |

Inside the BB Editor:

| Shortcut | Action |
|----------|--------|
| `/` | Open the slash menu (BB commands + block types) |
| `Cmd+B Cmd+B` | Trigger a `<bb-*>` tag inline |
| `Cmd+S` | Save immediately |
| `Backspace` (at start of heading) | Convert heading to paragraph |

## ⚙️ Configuration

BlogBuddy needs an API key and a model. Everything else has a sensible default.

### Settings

| Key | Description |
|-----|-------------|
| `blogbuddy.apiKey` | API key. Falls back to `BLOGBUDDY_API_KEY` → `OPENAI_API_KEY` env vars if empty |
| `blogbuddy.baseURL` | OpenAI-compatible base URL. Falls back to `BLOGBUDDY_BASE_URL` → `OPENAI_BASE_URL` env vars, then `https://api.openai.com/v1` |
| `blogbuddy.model` | Model id. Recommended: run **BlogBuddy: Select Model** to pick from the provider's list |
| `blogbuddy.assetDir` | Relative subdirectory for BB Editor asset uploads (e.g. `assets`). Empty = alongside the document |
| `blogbuddy.reader.inlineAssets` | When exporting from BB Reader, inline local images as base64 to produce a single self-contained HTML file. Default `true` |

### Commands

| Command | What it does |
|---------|--------------|
| `BlogBuddy: Select Model` | Fetches `/v1/models` from the configured base URL and opens a picker. Also offers "Enter custom model…" if the list is empty or missing your model |
| `BlogBuddy: Show Config Diagnostics` | Opens a masked report showing what the extension actually resolves for each field (settings vs env vs default) — useful for debugging "I set the env var but it doesn't work" on macOS |
| `BlogBuddy: Show Usage Statistics` | View token usage, request counts, and (when pricing data is available) per-model cost |
| `BlogBuddy: Reset Usage Statistics` | Clear all counters (with confirmation) |
| `BlogBuddy: Refresh Pricing Data` | Re-fetch provider pricing data |
| `BlogBuddy: Show Help` | Open the bundled help document |
| `BlogBuddy: Create .bbreader.md Template` | Scaffold the style-reference template at the workspace root for AI Reader |
| `BlogBuddy: Hi BB` | Execute BB command on current text |
| `BlogBuddy: Open BB Editor` | Open the current `.md` in BB Editor |

### macOS env var gotcha

If you set `OPENAI_API_KEY` in `~/.zshrc` but VS Code launched from Dock doesn't pick it up, the problem is that Dock-launched apps don't read your shell config. Either:

- **Launch VS Code from terminal** with `code .` after `source ~/.zshrc`, or
- Run `launchctl setenv OPENAI_API_KEY 'sk-...'` in Terminal, then fully quit (⌘Q) and restart VS Code

Run **BlogBuddy: Show Config Diagnostics** to verify what the extension actually sees.

## 🎯 Perfect For

- **Blog Writers** who want AI assistance without leaving their editor
- **Content Creators** looking to enhance their writing workflow
- **Technical Writers** who need diagram generation and content expansion
- **Multilingual Bloggers** requiring translation assistance
- **Anyone** who values seamless, keyboard-driven productivity

## 🐛 Issues & Feedback

Found a bug or have a feature suggestion? Please [open an issue](https://github.com/FulcrumStd/blogbuddy/issues) on our GitHub repository.

---

**Happy Blogging with BB! 🎉**

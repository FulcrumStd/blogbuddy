# BlogBuddy - AI-Powered Writing Assistant

[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

[中文 Version](help_中文.md)

BlogBuddy is a VS Code extension that enhances your Markdown writing workflow with AI. Embed commands directly in your text, run them with a keystroke, and watch the output stream in. This guide covers everything from setup to the BB Editor, inline commands, and troubleshooting.

## 🚀 Quick Start

1. **Install** BlogBuddy from the VS Code Marketplace
2. **Configure credentials** — either:
   - Set `blogbuddy.apiKey` in VS Code settings, **or**
   - Export `BLOGBUDDY_API_KEY` (or `OPENAI_API_KEY`) as an environment variable
3. **Pick a model** — run **BlogBuddy: Select Model** from the command palette. The command fetches the provider's `/v1/models` list; pick one or enter a custom id
4. **Open a Markdown file** and start writing
5. **Insert BB tags** where you want AI help, then press `Cmd+B Cmd+B` (Mac) / `Ctrl+B Ctrl+B` (Win/Linux)

## 📋 Three ways to use BlogBuddy

1. **Inline BB commands** — embed tags in your text, press the hotkey (`Cmd+B Cmd+B`)
2. **BB Editor** — a built-in WYSIWYG Markdown editor with frontmatter Properties panel, syntax highlighting, and slash menu (`Cmd+B` on a `.md` file in the Explorer)
3. **Command palette** — every BB feature (usage stats, help, model picker, .bbreader.md template, …) is available via `Cmd+Shift+P` / `Ctrl+Shift+P` and the `BlogBuddy:` prefix

Word count for Markdown files is always shown in the status bar (no toggle — it's on for every `.md` file).

---

## 🏷️ Inline BB Commands

Embed AI instructions in your text using tags, then press `Cmd+B Cmd+B` (Mac) / `Ctrl+B Ctrl+B` (Win/Linux) to execute.

### Smart scope detection

The extension picks the scope based on your cursor / selection:

- **Manual selection**: processes only the selected text
- **Current line**: if the line contains the BB tag **and** other content, processes just that line
- **Paragraph (text block)**: if the BB tag is alone on a line (or you're anywhere in a block that has one), processes the whole block (text separated by blank lines)
- **Full document**: when the BB tag stands alone in its own text block (surrounded by blank lines) and the command supports it (`bb-impv`, `bb-tslt`, `bb`), processes the entire document into a new file

### Command syntax

```
<command:optional-message>
```

### Available BB Commands

#### 1. `<bb-expd:additional-context>` — Text Expansion

**Purpose**: expand and elaborate on existing content while preserving meaning.

```markdown
Machine learning is changing software development.
<bb-expd:make this suitable for a technical blog>
```

**Features**: reads full document context; maintains tone and style; adds concrete examples; ensures natural integration.

#### 2. `<bb-impv:style-instructions>` — Text Improvement

**Purpose**: enhance clarity, grammar, and overall quality.

**Text Block Mode** (tag shares a paragraph with content) — improves that paragraph in place:

```markdown
This paragraph has some repetitive content that says the same thing multiple times.
<bb-impv:make more concise and remove redundancy>
```

**Full Document Mode** (tag isolated by blank lines) — improves the whole document into a new `*_improved.md` file:

```markdown
Some content above...

<bb-impv:improve the entire document's professional tone>

Some content below...
```

#### 3. `<bb-tslt:target-language>` — Translation

**Purpose**: translate the entire document to the specified language.

```markdown
<bb-tslt:中文>
<bb-tslt:Japanese>
<bb-tslt:Français>
```

**Features**: creates a new file with a language suffix (e.g. `myblog_日本語.md`); preserves Markdown structure and code blocks; generates a Markdown link to the translated file.

#### 4. `<bb-mmd:diagram-instructions>` — Mermaid Diagrams

**Purpose**: generate a Mermaid diagram from a description.

```markdown
User registration process:
1. User enters email and password
2. System validates credentials
3. If valid, create account
4. Send confirmation email
<bb-mmd:create a flowchart>
```

**Output**: a fenced ` ```mermaid ` code block. Automatically picks the appropriate diagram type (flowchart / sequence / class / state / ER / gantt / pie). The Mermaid code is validated for a recognized diagram prefix; VS Code renders it natively in Markdown preview.

#### 5. `<bb-kwd:keyword-focus>` — Keyword Extraction

**Purpose**: extract 8–12 SEO-friendly keywords from the document.

```markdown
<bb-kwd:focus on technical terms>
<bb-kwd:>
```

#### 6. `<bb-tldr:summary-style>` — TL;DR Generation

**Purpose**: generate a concise "too long; didn't read" summary.

```markdown
<bb-tldr:focus on actionable insights>
<bb-tldr:>
```

#### 7. `<bb-tag>` — BB Badge

**Purpose**: insert a BlogBuddy attribution badge.

**Output**: `[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)`

#### 8. `<bb:your-instruction>` — General AI Tasks ⚠️

**Purpose**: execute an arbitrary instruction against your text.

> **⚠️**: this is the most flexible command but also the most expensive. It can consume significantly more tokens than specialized commands. Prefer the specialized ones when possible.

**Text Block Mode** — processes the paragraph:

```markdown
- Feature 1: Description
- Feature 2: Description
<bb:convert this list to a table format>
```

**Full Document Mode** — processes the whole doc into a `*_processed.md` file:

```markdown
Some previous content here.

<bb:convert all lists in this document to table format>

Some following content here.
```

---

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

---

## 📝 BB Editor

A WYSIWYG Markdown editor built into the extension. Open it from the Explorer context menu (right-click a `.md` file → **BlogBuddy: Open BB Editor**) or press `Cmd+B` with the file selected.

### Core editing

- **WYSIWYG with GFM**: tables, strikethrough, task lists, autolinks, blockquotes, code blocks
- **Slash menu (`/`)**: insert block types or BB commands inline
- **Cmd+B Cmd+B chord**: trigger any `<bb-*>` tag without leaving the editor
- **Streaming AI blocks**: AI results appear inline, token by token
- **Image & file paste**: paste or drag-drop files — saved to the document directory or a configurable subdirectory via `blogbuddy.assetDir`, inserted as relative paths
- **Syntax-highlighted code blocks**: Prism-based, 20+ languages including ts/js/python/bash/yaml/rust/go/sql; palette adapts to VS Code light / dark / high-contrast themes
- **Arrow ligatures**: `->` → `→`, `=>` → `⇒`; skipped inside code blocks and during IME composition
- **Heading-to-paragraph**: press `Backspace` at the start of a heading to convert it directly to a paragraph (no step-down through `h2 → h1 → p`)

### Frontmatter Properties panel

YAML frontmatter is exposed as a typed panel at the top of the editor:

- **Typed fields**: `title` (text), `date` (date picker), `tags` / `categories` (chip input), `author` / `slug` (text), `draft` (toggle), `description` (textarea)
- **Add field**: dropdown to add a known field not yet in the YAML
- **Raw YAML fallback**: collapsible `<details>` at the bottom for direct editing (useful for custom fields or comments)
- Changes round-trip to disk on auto-save alongside the body content

### Saving & reliability

- **Auto-save**: debounced writes (~500ms of quiescence)
- **Cmd+S**: flush immediately
- **IME composition guard**: CJK input (Chinese / Japanese / Korean Pinyin etc.) suspends auto-save and BB triggers until composition commits — no more half-composed pinyin leaking into saves
- **Compact Markdown normalization** on save: bullets normalized to `-`, tight lists, HTML entities decoded, bold-marker whitespace moved outside, 3+ consecutive blank lines collapsed to 2 — keeps Git diffs clean. Fenced code block contents are left untouched
- **External file conflict detection**: if the file changes on disk while you have unsaved edits in BB Editor, a yellow banner offers **Reload** or **Keep my version** — no silent overwrite
- **View source button**: in the Frontmatter panel header, opens the raw `.md` in a side VS Code editor

---

## 📊 Document Statistics

Word count for the active Markdown file is always shown in the status bar on the right:

- **Counting**: Chinese characters and English words counted separately and summed
- **Markdown-only**: hidden for non-Markdown files
- **Always on**: no toggle — the status bar item appears whenever a Markdown file is active

## 🎛️ Status Bar — Config Source Indicator

A second status bar item shows where your `apiKey` is resolving from:

- `$(key) BB · cfg` — using `blogbuddy.apiKey` from settings
- `$(key) BB · env` — using `BLOGBUDDY_API_KEY` or `OPENAI_API_KEY` env var
- `$(key) BB · default` — using the default base URL (`https://api.openai.com/v1`)
- `$(warning) BB: no key` / `$(warning) BB: no model` — missing required config, in yellow

Hover the item for a per-field source table (apiKey, baseURL, model) and quick links to Diagnostics / Select Model / Settings. Click to open the full **Show Config Diagnostics** report.

---

## 📊 Usage Statistics & Help

Run `BlogBuddy: Show Usage Statistics` from the command palette to open a markdown report with request counts, token usage, per-flag / per-model breakdown, and (when pricing data is available) cost estimates. Two related commands sit next to it in the palette: `BlogBuddy: Reset Usage Statistics` (clears counters after confirmation) and `BlogBuddy: Refresh Pricing Data` (re-fetches pricing from the provider).

Run `BlogBuddy: Show Help` to open this document.

---

## ⚙️ Configuration

### Required settings

Only **API key** and **model** are strictly required. `baseURL` has a sensible default.

| Setting | Description |
|---------|-------------|
| `blogbuddy.apiKey` | API key. Resolution order: this setting → `$BLOGBUDDY_API_KEY` → `$OPENAI_API_KEY` |
| `blogbuddy.baseURL` | OpenAI-compatible base URL. Resolution order: this setting → `$BLOGBUDDY_BASE_URL` → `$OPENAI_BASE_URL` → `https://api.openai.com/v1` |
| `blogbuddy.model` | Model id (e.g. `gpt-4o-mini`, `openai/gpt-4o-mini`). **Recommended**: use the **BlogBuddy: Select Model** command |

### Optional settings

| Setting | Description |
|---------|-------------|
| `blogbuddy.assetDir` | Relative subdirectory for BB Editor asset uploads (e.g. `assets` or `images/uploads`). Resolved from the document directory. Empty = alongside the document. Paths must stay within the document directory |
| `blogbuddy.reader.inlineAssets` | When exporting from BB Reader, inline local images as base64 to produce a single self-contained HTML file. Default `true`. Set `false` to keep relative image paths (e.g. for site-uploads where the assets folder ships alongside the HTML) |

### Commands

Open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and type `BlogBuddy:`

| Command | Purpose |
|---------|---------|
| `BlogBuddy: Select Model` | Fetch the provider's `/v1/models` list and pick (or enter) a model id. Surfaces auth / network errors directly if the fetch fails |
| `BlogBuddy: Show Config Diagnostics` | Open a masked report showing what the extension actually resolves for `apiKey`, `baseURL`, `model` — settings value, env var source, or default. Great for debugging "my env var isn't picked up" |
| `BlogBuddy: Show Usage Statistics` | Open a markdown report with token usage, request counts, per-flag / per-model breakdown |
| `BlogBuddy: Reset Usage Statistics` | Clear all counters (with confirmation) |
| `BlogBuddy: Refresh Pricing Data` | Re-fetch pricing data from the provider |
| `BlogBuddy: Show Help` | Open this document |
| `BlogBuddy: Create .bbreader.md Template` | Scaffold the style-reference template at the workspace root for AI Reader |
| `BlogBuddy: Hi BB` | Execute the BB command on current cursor / selection (same as `Cmd+B Cmd+B`) |
| `BlogBuddy: Open BB Editor` | Open the current `.md` in the BB Editor |

### macOS env var gotcha

On macOS, apps launched from Dock / Spotlight don't inherit shell environment variables. If you set `OPENAI_API_KEY` in `~/.zshrc` and it's "not picked up" by BlogBuddy:

1. **Easy fix**: launch VS Code from Terminal after `source ~/.zshrc`:

   ```bash
   code .
   ```

2. **Persistent fix**: inject into the launchd session:

   ```bash
   launchctl setenv OPENAI_API_KEY 'sk-...'
   ```

   Then fully quit (⌘Q) and restart VS Code. This persists until reboot; for a permanent solution, create a LaunchAgent plist.

Run **BlogBuddy: Show Config Diagnostics** to verify what the extension host actually sees.

---

## 💡 Pro Tips

### Best practices

1. **Leverage smart scope detection**: cursor position implies the scope
   - Same line with BB tag + content → processes just that line
   - Anywhere in a paragraph with a BB tag → processes the paragraph
   - BB tag alone between blank lines → full document (for supported commands)
2. **Be specific**: clear instructions in the tag message produce better output
3. **Review AI output**: always review before shipping — AI can be wrong
4. **Combine commands**: expand → improve → translate is a common flow

### Command combinations

**Line-level** (tag + content on one line):

```markdown
Machine learning is a subset of AI. <bb-expd:add practical examples>
```

**Paragraph**:

```markdown
Your initial paragraph here.
<bb-expd:add technical details>
```

**Full document** (tag alone between blank lines):

```markdown
Some content here...

<bb-impv:improve grammar and readability throughout the entire document>

More content here...
```

---

## 🔧 Shortcuts & Commands (quick reference)

| Action | Shortcut | Command |
|--------|----------|---------|
| Execute BB command | `Cmd+B Cmd+B` (Mac)<br>`Ctrl+B Ctrl+B` (Win/Linux) | `blogbuddy.bb` |
| Open BB Editor | `Cmd+B` (Mac)<br>`Ctrl+B` (Win/Linux) — Explorer focus on `.md` | `blogbuddy.openEditor` |
| Select model | Command palette | `blogbuddy.selectModel` |
| Show diagnostics | Command palette | `blogbuddy.showDiagnostics` |
| Show usage statistics | Command palette | `blogbuddy.showUsageStats` |
| Show help | Command palette | `blogbuddy.showHelp` |
| Create .bbreader.md template | Command palette | `blogbuddy.createReaderTemplate` |

---

## ❓ Troubleshooting

### "API Key not set" warning

- Check `blogbuddy.apiKey` in settings, **or** export `BLOGBUDDY_API_KEY` / `OPENAI_API_KEY`
- Run **BlogBuddy: Show Config Diagnostics** to see what the extension actually resolves
- On macOS, see the env var gotcha above if you set the env var but it's not picked up

### "BlogBuddy: Select Model" fails

- Check the error message — common cases:
  - `401 Unauthorized`: wrong API key or insufficient permissions for the provider
  - `404 / ENOTFOUND`: wrong base URL (e.g. missing `/v1` path)
  - `fetch failed` / `ECONNREFUSED`: network / proxy issue
  - Cert errors: enterprise proxy / TLS interception
- "Enter Manually" in the error dialog lets you type a model id even when the list fetch fails

### Translation requires a target language

- Add the language to the tag, e.g. `<bb-tslt:Spanish>` or `<bb-tslt:日本語>`

### Mermaid code seems off

- BB validates that the output starts with a recognized diagram prefix (e.g. `flowchart`, `sequenceDiagram`). If the AI generates unusable output, try a more specific instruction or a different model

### Generated content seems off-topic

- Provide more specific instructions in the tag message
- BB reads full document context; if your document is huge, context may be truncated — narrow the scope by selecting text

### Getting support

- Check the VS Code Output panel for extension logs
- Open [an issue](https://github.com/FulcrumStd/blogbuddy/issues) with diagnostics output attached

---

## 🔄 Version history

See the [CHANGELOG](../CHANGELOG.md) for a full per-version breakdown. Highlights of recent releases:

- **0.0.12** — Config simplified (one model, always-on streaming, always-on word count); env var fallback for API key and base URL; `BlogBuddy: Select Model` and `BlogBuddy: Show Config Diagnostics` commands; status bar config source indicator; Mermaid output always fenced
- **0.0.11** — BB Editor polish: IME guard for CJK input, Prism syntax highlighting, external file conflict detection, typed Properties panel for frontmatter, arrow ligatures, compact Markdown normalization, View Source button
- **0.0.10** — Frontmatter preview and editing panel in BB Editor

---

*Made with ❤️ for productive writing workflows*

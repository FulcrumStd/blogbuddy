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

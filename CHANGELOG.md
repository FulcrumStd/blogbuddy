# Change Log

All notable changes to the "blogbuddy" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### 0.0.7

- Fixed a bug where the text-processing lock would disappear after switching files
- Improved the display of locked text content

### backlog

- Add the bb-srch command to support internet searches based on user requests
- Agent mode: Make bb commands agentic, allowing them to reference other files in the workspace to complete tasks
- Auto execute mode: Execute all BB commands in a file with one click
- Add support for generating SVG images with the bb-mmd command

---

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

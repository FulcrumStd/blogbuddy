# Change Log

All notable changes to the "blogbuddy" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- BB in agent mode.
- Auto execute all BB commands in a opened file.
- Generate svg images from mermaid codes.
- Working between multiple files within one workspace.
- The document processing lock feature becomes disabled when switching files

---

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

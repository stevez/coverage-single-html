# Changelog

## [0.1.3] - 2024-12-19

### Fixed

- Fixed click handler to recognize `#` anchor links in addition to `.html` links
- Links rewritten by `rewriteInternalLinks()` now properly navigate when clicked

## [0.1.2] - 2024-12-19

### Fixed

- Fixed internal navigation links in bundled HTML to use `#` anchors instead of external URLs
- Links now correctly navigate within the single-page application instead of trying to load separate files
- Added `rewriteInternalLinks()` to pre-process HTML content and convert relative paths to anchor links

## [0.1.1] - 2024-12-19

### Fixed

- Fixed package exports to use `default` instead of `import` for better compatibility with bundlers and Playwright

## [0.1.0] - 2024-12-18

### Added

- Initial release
- CLI tool (`coverage-single-html`) to bundle coverage HTML reports into a single file
- Programmatic API (`bundleCoverage`)
- Sidebar navigation with collapsible folder tree
- Inline CSS, JS, and images (base64 encoded)
- Internal link navigation between coverage pages
- Support for Istanbul-style HTML reports (Vitest, Jest, nyc, c8)
- Mobile responsive layout

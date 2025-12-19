# Changelog

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

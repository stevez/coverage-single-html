# coverage-single-html

Convert Istanbul/Vitest coverage HTML reports into a single self-contained HTML file.

Perfect for:
- Sharing coverage reports via email or Slack
- Attaching to pull requests or issues
- Archiving coverage snapshots
- Viewing reports without a web server

## Installation

```bash
npm install -D coverage-single-html
```

Or run directly with npx:

```bash
npx coverage-single-html coverage/lcov-report -o report.html
```

## Usage

### CLI

```bash
# Basic usage - outputs to coverage-report.html
coverage-single-html coverage/merged

# Specify output file
coverage-single-html coverage/lcov-report -o my-report.html

# Custom title
coverage-single-html coverage -t "My Project Coverage" -o coverage.html
```

### Options

```
Arguments:
  <input-dir>    Directory containing Istanbul/Vitest HTML coverage report

Options:
  -o, --output   Output file path (default: coverage-report.html)
  -t, --title    Custom title for the report
  -h, --help     Show help message
  -v, --version  Show version
```

### Programmatic API

```typescript
import { bundleCoverage } from 'coverage-single-html'
import { writeFileSync } from 'fs'

const result = bundleCoverage({
  inputDir: 'coverage/lcov-report',
  title: 'My Coverage Report',
})

writeFileSync('report.html', result.html)

console.log(`Bundled ${result.fileCount} files`)
console.log(`Total size: ${result.totalSize} bytes`)
```

## Supported Coverage Tools

Works with any tool that generates Istanbul-style HTML reports:

- **Vitest** (`@vitest/coverage-v8`)
- **Jest** (`jest --coverage`)
- **nyc/Istanbul** (`nyc report --reporter=html`)
- **c8** (`c8 report --reporter=html`)

## Features

- **Single file output** - All HTML, CSS, JS, and images bundled into one file
- **Sidebar navigation** - Browse files with a collapsible folder tree
- **Keyboard navigation** - Press `n`/`j` for next uncovered, `b`/`p`/`k` for previous
- **Mobile responsive** - Works on phones and tablets
- **No dependencies** - Zero runtime dependencies

## Demo

[View a sample coverage report](https://stevez.github.io/coverage-single-html/test-report.html) generated from a real project (62 files bundled into a single 662KB HTML file).

## Example

```bash
# Generate coverage with Vitest
npm run test -- --coverage

# Bundle into single file
npx coverage-single-html coverage -o coverage-report.html

# Open in browser
open coverage-report.html  # macOS
start coverage-report.html # Windows
```

## How It Works

1. Reads all HTML files from the coverage directory
2. Extracts and inlines CSS and JavaScript
3. Converts images to base64 data URLs
4. Builds a sidebar navigation tree
5. Outputs a single self-contained HTML file

## License

MIT

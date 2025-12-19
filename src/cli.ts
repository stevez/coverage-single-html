#!/usr/bin/env node

import { existsSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { bundleCoverage } from './index.js'

function printUsage(): void {
  console.log(`
coverage-single-html - Convert coverage HTML reports to a single file

Usage:
  coverage-single-html <input-dir> -o <output-file>
  coverage-single-html <input-dir>                    # outputs to coverage-report.html

Arguments:
  <input-dir>    Directory containing Istanbul/Vitest HTML coverage report
                 (should contain index.html, base.css, etc.)

Options:
  -o, --output   Output file path (default: coverage-report.html)
  -t, --title    Custom title for the report
  -h, --help     Show this help message
  -v, --version  Show version

Examples:
  coverage-single-html coverage/merged -o report.html
  coverage-single-html coverage/lcov-report
  coverage-single-html coverage -t "My Project Coverage" -o coverage.html

The tool bundles all HTML pages, CSS, JS, and images into a single
self-contained HTML file that can be opened directly in a browser
or shared via email/Slack.
`)
}

function printVersion(): void {
  console.log('coverage-single-html v0.1.0')
}

interface ParsedArgs {
  inputDir: string | null
  outputFile: string
  title: string | null
  help: boolean
  version: boolean
  error: string | null
}

function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    inputDir: null,
    outputFile: 'coverage-report.html',
    title: null,
    help: false,
    version: false,
    error: null,
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (arg === '-h' || arg === '--help') {
      result.help = true
      return result
    }

    if (arg === '-v' || arg === '--version') {
      result.version = true
      return result
    }

    if (arg === '-o' || arg === '--output') {
      i++
      if (i >= args.length) {
        result.error = 'Missing output file after -o/--output'
        return result
      }
      result.outputFile = args[i]
    } else if (arg === '-t' || arg === '--title') {
      i++
      if (i >= args.length) {
        result.error = 'Missing title after -t/--title'
        return result
      }
      result.title = args[i]
    } else if (arg.startsWith('-')) {
      result.error = `Unknown option: ${arg}`
      return result
    } else {
      if (result.inputDir) {
        result.error = 'Only one input directory is allowed'
        return result
      }
      result.inputDir = arg
    }

    i++
  }

  return result
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    printUsage()
    process.exit(0)
  }

  const parsed = parseArgs(args)

  if (parsed.error) {
    console.error(`Error: ${parsed.error}`)
    process.exit(1)
  }

  if (parsed.help) {
    printUsage()
    process.exit(0)
  }

  if (parsed.version) {
    printVersion()
    process.exit(0)
  }

  if (!parsed.inputDir) {
    console.error('Error: Input directory is required')
    process.exit(1)
  }

  const inputDir = resolve(parsed.inputDir)

  if (!existsSync(inputDir)) {
    console.error(`Error: Input directory not found: ${inputDir}`)
    process.exit(1)
  }

  const indexPath = resolve(inputDir, 'index.html')
  if (!existsSync(indexPath)) {
    console.error(`Error: No index.html found in ${inputDir}`)
    console.error('Make sure this is an Istanbul/Vitest HTML coverage report directory')
    process.exit(1)
  }

  const outputFile = resolve(parsed.outputFile)

  try {
    console.log(`Bundling coverage report from: ${inputDir}`)

    const result = bundleCoverage({
      inputDir,
      title: parsed.title || undefined,
    })

    // Ensure output directory exists
    const outputDir = dirname(outputFile)
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    writeFileSync(outputFile, result.html, 'utf-8')

    console.log(`\nSuccess!`)
    console.log(`  Files bundled: ${result.fileCount}`)
    console.log(`  Output size: ${formatSize(result.totalSize)}`)
    console.log(`  Output: ${outputFile}`)
  } catch (error) {
    console.error('Error bundling coverage:', error)
    process.exit(1)
  }
}

main()

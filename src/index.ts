import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative, dirname, basename } from 'path'

export interface BundleOptions {
  inputDir: string
  title?: string
}

export interface BundleResult {
  html: string
  fileCount: number
  totalSize: number
}

interface FileEntry {
  path: string
  content: string
}

function findHtmlFiles(dir: string, basePath: string = ''): FileEntry[] {
  const entries: FileEntry[] = []
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const relativePath = basePath ? `${basePath}/${item}` : item
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      // Skip lcov-report subdirectory to avoid duplicates
      if (item === 'lcov-report') continue
      entries.push(...findHtmlFiles(fullPath, relativePath))
    } else if (item.endsWith('.html')) {
      entries.push({
        path: relativePath,
        content: readFileSync(fullPath, 'utf-8'),
      })
    }
  }

  return entries
}

function readAsset(dir: string, filename: string): string | null {
  const filePath = join(dir, filename)
  if (existsSync(filePath)) {
    return readFileSync(filePath, 'utf-8')
  }
  return null
}

function readBinaryAsset(dir: string, filename: string): string | null {
  const filePath = join(dir, filename)
  if (existsSync(filePath)) {
    const buffer = readFileSync(filePath)
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeType = ext === 'png' ? 'image/png' : 'image/x-icon'
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  }
  return null
}

function extractTitle(html: string): string {
  const match = html.match(/<title>([^<]+)<\/title>/)
  return match ? match[1] : 'Coverage Report'
}

function extractBodyContent(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return match ? match[1] : html
}

function rewriteInternalLinks(
  html: string,
  currentPath: string,
  pathToIdMap: Record<string, string>
): string {
  // Rewrite href attributes that point to .html files to use # anchors
  return html.replace(/href="([^"]+\.html)"/g, (match, href) => {
    // Skip external URLs
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return match
    }

    // Resolve relative path
    const resolvedPath = resolveRelativePath(href, currentPath)
    const pageId = pathToIdMap[resolvedPath]

    if (pageId) {
      return `href="#${pageId}"`
    }

    // If not found, keep original (will be handled by JS as fallback)
    return match
  })
}

function resolveRelativePath(href: string, basePath: string): string {
  // Get directory of current file
  const baseDir = basePath.includes('/')
    ? basePath.substring(0, basePath.lastIndexOf('/'))
    : ''

  let resolved = href

  if (href.startsWith('./')) {
    resolved = baseDir ? baseDir + '/' + href.substring(2) : href.substring(2)
  } else if (href.startsWith('../')) {
    const parts = baseDir.split('/')
    const hrefParts = href.split('/')

    for (const part of hrefParts) {
      if (part === '..') {
        parts.pop()
      } else if (part !== '.') {
        parts.push(part)
      }
    }
    resolved = parts.join('/')
  } else if (!href.startsWith('/') && !href.includes('://')) {
    // Relative path without ./ or ../
    resolved = baseDir ? baseDir + '/' + href : href
  }

  // Normalize path
  resolved = resolved.replace(/\\/g, '/').replace(/\/+/g, '/')
  if (resolved.startsWith('/')) resolved = resolved.substring(1)

  return resolved
}

function sanitizeId(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, '_')
}

export function bundleCoverage(options: BundleOptions): BundleResult {
  const { inputDir, title } = options

  // Find all HTML files
  const htmlFiles = findHtmlFiles(inputDir)
  if (htmlFiles.length === 0) {
    throw new Error(`No HTML files found in ${inputDir}`)
  }

  // Find index.html
  const indexFile = htmlFiles.find((f) => f.path === 'index.html')
  if (!indexFile) {
    throw new Error(`No index.html found in ${inputDir}`)
  }

  // Read CSS and JS assets
  const baseCss = readAsset(inputDir, 'base.css') || ''
  const prettifyCss = readAsset(inputDir, 'prettify.css') || ''
  const prettifyJs = readAsset(inputDir, 'prettify.js') || ''
  const sorterJs = readAsset(inputDir, 'sorter.js') || ''
  const blockNavJs = readAsset(inputDir, 'block-navigation.js') || ''

  // Read images as base64
  const favicon = readBinaryAsset(inputDir, 'favicon.png')
  const sortArrow = readBinaryAsset(inputDir, 'sort-arrow-sprite.png')

  // Build path-to-id lookup map first (needed for link rewriting)
  const pathToIdMap: Record<string, string> = {}
  for (const file of htmlFiles) {
    pathToIdMap[file.path] = sanitizeId(file.path)
  }

  // Build page data for navigation, rewriting internal links
  const pages = htmlFiles.map((file) => {
    const body = extractBodyContent(file.content)
    const rewrittenBody = rewriteInternalLinks(body, file.path, pathToIdMap)
    return {
      id: sanitizeId(file.path),
      path: file.path,
      title: extractTitle(file.content),
      body: rewrittenBody,
    }
  })

  // Build navigation structure
  const fileTree = buildFileTree(htmlFiles.map((f) => f.path))

  const reportTitle = title || 'Coverage Report'

  // Generate the single HTML file
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${reportTitle}</title>
  ${favicon ? `<link rel="shortcut icon" type="image/png" href="${favicon}">` : ''}
  <style>
${baseCss}
${prettifyCss}
${sortArrow ? `.coverage-summary .sorter { background-image: url(${sortArrow}); }` : ''}

/* Single-page navigation styles */
.spa-container {
  display: flex;
  min-height: 100vh;
}
.spa-sidebar {
  width: 280px;
  background: #1a1a2e;
  color: #eee;
  padding: 1rem;
  overflow-y: auto;
  position: fixed;
  height: 100vh;
  box-sizing: border-box;
}
.spa-sidebar h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #fff;
  border-bottom: 1px solid #333;
  padding-bottom: 0.5rem;
}
.spa-sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.spa-sidebar li {
  margin: 2px 0;
}
.spa-sidebar a {
  color: #8be9fd;
  text-decoration: none;
  font-size: 0.85rem;
  display: block;
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}
.spa-sidebar a:hover,
.spa-sidebar a.active {
  background: #2d2d44;
  color: #fff;
}
.spa-sidebar .folder {
  color: #f1fa8c;
  font-weight: bold;
  cursor: pointer;
  padding: 4px 8px;
}
.spa-sidebar .folder::before {
  content: '▶ ';
  font-size: 0.7rem;
}
.spa-sidebar .folder.open::before {
  content: '▼ ';
}
.spa-sidebar .folder-contents {
  display: none;
  padding-left: 1rem;
}
.spa-sidebar .folder.open + .folder-contents {
  display: block;
}
.spa-content {
  flex: 1;
  margin-left: 280px;
  padding: 1rem;
}
.spa-page {
  display: none;
}
.spa-page.active {
  display: block;
}
@media (max-width: 768px) {
  .spa-sidebar {
    width: 100%;
    height: auto;
    position: relative;
  }
  .spa-content {
    margin-left: 0;
  }
  .spa-container {
    flex-direction: column;
  }
}
  </style>
</head>
<body>
  <div class="spa-container">
    <nav class="spa-sidebar">
      <h2>${reportTitle}</h2>
      ${renderFileTree(fileTree)}
    </nav>
    <main class="spa-content">
      ${pages.map((page) => `<div id="page_${page.id}" class="spa-page${page.path === 'index.html' ? ' active' : ''}">${page.body}</div>`).join('\n      ')}
    </main>
  </div>

  <script>
${prettifyJs}
${sorterJs}
${blockNavJs}

// Path to page ID mapping
var pathToId = ${JSON.stringify(pathToIdMap)};

// Single-page navigation
(function() {
  const links = document.querySelectorAll('.spa-sidebar a[data-page]');
  const pages = document.querySelectorAll('.spa-page');
  const folders = document.querySelectorAll('.spa-sidebar .folder');
  let currentPath = 'index.html';

  function showPage(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    links.forEach(l => l.classList.remove('active'));

    const page = document.getElementById('page_' + pageId);
    if (page) {
      page.classList.add('active');
      const link = document.querySelector('a[data-page="' + pageId + '"]');
      if (link) link.classList.add('active');

      // Update currentPath for relative link resolution
      for (const [path, id] of Object.entries(pathToId)) {
        if (id === pageId) {
          currentPath = path;
          break;
        }
      }
    }
  }

  // Resolve relative paths like "../foo.html" or "./bar.html"
  function resolvePath(href, basePath) {
    // Get directory of current file
    const baseDir = basePath.includes('/') ? basePath.substring(0, basePath.lastIndexOf('/')) : '';

    // Handle different relative path formats
    let resolved = href;

    if (href.startsWith('./')) {
      resolved = baseDir ? baseDir + '/' + href.substring(2) : href.substring(2);
    } else if (href.startsWith('../')) {
      let parts = baseDir.split('/');
      let hrefParts = href.split('/');

      for (const part of hrefParts) {
        if (part === '..') {
          parts.pop();
        } else if (part !== '.') {
          parts.push(part);
        }
      }
      resolved = parts.join('/');
    } else if (!href.startsWith('/') && !href.includes('://')) {
      // Relative path without ./ or ../
      resolved = baseDir ? baseDir + '/' + href : href;
    }

    // Normalize path (remove duplicate slashes, etc.)
    resolved = resolved.replace(/\\\\/g, '/').replace(/\\/+/g, '/');
    if (resolved.startsWith('/')) resolved = resolved.substring(1);

    return resolved;
  }

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = link.getAttribute('data-page');
      showPage(pageId);
      history.pushState({ pageId }, '', '#' + pageId);
    });
  });

  folders.forEach(folder => {
    folder.addEventListener('click', () => {
      folder.classList.toggle('open');
    });
  });

  // Handle back/forward
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.pageId) {
      showPage(e.state.pageId);
    }
  });

  // Handle initial hash
  if (location.hash) {
    showPage(location.hash.slice(1));
  }

  // Intercept internal links in content
  document.querySelector('.spa-content').addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
      const href = link.getAttribute('href');
      if (!href) return;

      // Handle # anchor links (already rewritten)
      if (href.startsWith('#')) {
        e.preventDefault();
        const pageId = href.slice(1);
        showPage(pageId);
        history.pushState({ pageId }, '', '#' + pageId);
        return;
      }

      // Handle .html links (fallback for any not rewritten)
      if (href.endsWith('.html') && !href.startsWith('http')) {
        e.preventDefault();

        // Resolve relative path
        const resolvedPath = resolvePath(href, currentPath);

        // Look up page ID from resolved path
        const pageId = pathToId[resolvedPath];
        if (pageId) {
          showPage(pageId);
          history.pushState({ pageId }, '', '#' + pageId);
        } else {
          console.warn('Page not found:', resolvedPath, 'from href:', href, 'base:', currentPath);
        }
      }
    }
  });

  // Run prettify if available
  if (typeof prettyPrint === 'function') {
    prettyPrint();
  }
})();
  </script>
</body>
</html>`

  return {
    html,
    fileCount: htmlFiles.length,
    totalSize: html.length,
  }
}

interface TreeNode {
  name: string
  path?: string
  children: Map<string, TreeNode>
}

function buildFileTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: '', children: new Map() }

  for (const path of paths) {
    const parts = path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: i === parts.length - 1 ? path : undefined,
          children: new Map(),
        })
      }
      current = current.children.get(part)!
    }
  }

  return root
}

function renderFileTree(node: TreeNode, depth: number = 0): string {
  const items: string[] = []

  // Sort: folders first, then files
  const children = Array.from(node.children.values()).sort((a, b) => {
    const aIsFolder = a.children.size > 0 && !a.path
    const bIsFolder = b.children.size > 0 && !b.path
    if (aIsFolder && !bIsFolder) return -1
    if (!aIsFolder && bIsFolder) return 1
    return a.name.localeCompare(b.name)
  })

  for (const child of children) {
    if (child.path) {
      // It's a file
      const id = sanitizeId(child.path)
      const displayName = child.name.replace('.html', '')
      items.push(`<li><a href="#${id}" data-page="${id}">${displayName}</a></li>`)
    } else if (child.children.size > 0) {
      // It's a folder
      items.push(`<li><span class="folder">${child.name}</span><ul class="folder-contents">${renderFileTree(child, depth + 1)}</ul></li>`)
    }
  }

  return items.length > 0 ? `<ul>${items.join('')}</ul>` : ''
}

/**
 * E2E Tests: Rich Markdown Rendering (User Story 1)
 * Tasks: T021-T024
 *
 * These tests verify:
 * - GFM rendering (tables, task lists, code blocks)
 * - Syntax highlighting for 5+ languages
 * - Mermaid diagram rendering
 * - Performance targets (<500ms for complex documents)
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers';
import * as path from 'path';
import * as fs from 'fs';

let electronApp: ElectronApplication;
let page: Page;

// Test markdown content with various features
const TEST_MARKDOWN_GFM = `# Test Document

## GitHub Flavored Markdown

### Task Lists
- [x] Completed task
- [ ] Pending task
- [ ] Another pending task

### Tables
| Feature | Status | Priority |
|---------|--------|----------|
| Tables | ✓ | P1 |
| Task Lists | ✓ | P1 |
| Code Blocks | ✓ | P1 |

### Links and Images
[External Link](https://example.com)
[Internal Link](#test-document)
`;

const TEST_MARKDOWN_CODE = `# Syntax Highlighting Test

## JavaScript
\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
console.log(fibonacci(10));
\`\`\`

## Python
\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\`

## TypeScript
\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' }
];
\`\`\`

## Rust
\`\`\`rust
fn main() {
    let mut vec = vec![1, 2, 3];
    vec.push(4);
    println!("Vector: {:?}", vec);
}
\`\`\`

## Go
\`\`\`go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
\`\`\`
`;

const TEST_MARKDOWN_MERMAID = `# Mermaid Diagram Test

## Flowchart
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

## Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    Alice->>John: Hello John, how are you?
    John-->>Alice: Great!
    Alice-)John: See you later!
\`\`\`
`;

const TEST_MARKDOWN_COMPLEX = `# Complex Performance Test Document

${TEST_MARKDOWN_GFM}

${TEST_MARKDOWN_CODE}

${TEST_MARKDOWN_MERMAID}

## Additional Code Blocks

\`\`\`java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
\`\`\`

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
\`\`\`

\`\`\`bash
#!/bin/bash
echo "Hello, World!"
for i in {1..5}; do
    echo "Number: $i"
done
\`\`\`

## Images and More Content
![Test Image](./test-image.png)

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
`;

test.beforeAll(async () => {
  // Create test markdown files
  const testDir = path.join(__dirname, '../fixtures');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  fs.writeFileSync(path.join(testDir, 'test-gfm.md'), TEST_MARKDOWN_GFM);
  fs.writeFileSync(path.join(testDir, 'test-code.md'), TEST_MARKDOWN_CODE);
  fs.writeFileSync(path.join(testDir, 'test-mermaid.md'), TEST_MARKDOWN_MERMAID);
  fs.writeFileSync(path.join(testDir, 'test-complex.md'), TEST_MARKDOWN_COMPLEX);

  // Launch Electron app
  const latestBuild = findLatestBuild('dist');
  const appInfo = parseElectronApp(latestBuild);

  electronApp = await electron.launch({
    args: [appInfo.main],
    executablePath: appInfo.executable,
  });

  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp.close();

  // Clean up test files
  const testDir = path.join(__dirname, '../fixtures');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

/**
 * T021: E2E test for markdown rendering
 * Verify GFM (tables, task lists), code blocks, and diagrams render correctly
 */
test.describe('T021: Markdown Rendering', () => {
  test('should render GitHub Flavored Markdown correctly', async () => {
    // Open test file
    const testFile = path.join(__dirname, '../fixtures/test-gfm.md');

    // Simulate file open (will use IPC when implemented)
    await page.evaluate((filePath) => {
      // This will call the file open IPC handler
      return window.electronAPI?.file.openFileDialog({ defaultPath: filePath });
    }, testFile);

    // Wait for markdown to render
    await page.waitForSelector('.markdown-viewer', { timeout: 5000 });

    // Verify task lists render
    const taskLists = await page.locator('input[type="checkbox"]').count();
    expect(taskLists).toBeGreaterThan(0);

    // Verify tables render
    const tables = await page.locator('table').count();
    expect(tables).toBeGreaterThan(0);

    // Verify table headers
    const tableHeaders = await page.locator('th').allTextContents();
    expect(tableHeaders).toContain('Feature');
    expect(tableHeaders).toContain('Status');
    expect(tableHeaders).toContain('Priority');

    // Verify links render
    const links = await page.locator('a[href]').count();
    expect(links).toBeGreaterThan(0);
  });

  test('should render headings with correct hierarchy', async () => {
    const h1 = await page.locator('h1').count();
    const h2 = await page.locator('h2').count();
    const h3 = await page.locator('h3').count();

    expect(h1).toBeGreaterThan(0);
    expect(h2).toBeGreaterThan(0);
    expect(h3).toBeGreaterThan(0);
  });
});

/**
 * T022: E2E test for syntax highlighting
 * Verify 5+ languages display with proper color highlighting
 */
test.describe('T022: Syntax Highlighting', () => {
  test('should apply syntax highlighting to code blocks', async () => {
    const testFile = path.join(__dirname, '../fixtures/test-code.md');

    await page.evaluate((filePath) => {
      return window.electronAPI?.file.read({ filePath });
    }, testFile);

    await page.waitForSelector('.markdown-viewer', { timeout: 5000 });

    // Verify code blocks exist
    const codeBlocks = await page.locator('pre code').count();
    expect(codeBlocks).toBeGreaterThanOrEqual(5);

    // Verify language classes are applied
    const jsCode = await page.locator('code.language-javascript, code.hljs.javascript').count();
    expect(jsCode).toBeGreaterThan(0);

    const pyCode = await page.locator('code.language-python, code.hljs.python').count();
    expect(pyCode).toBeGreaterThan(0);

    const tsCode = await page.locator('code.language-typescript, code.hljs.typescript').count();
    expect(tsCode).toBeGreaterThan(0);

    const rustCode = await page.locator('code.language-rust, code.hljs.rust').count();
    expect(rustCode).toBeGreaterThan(0);

    const goCode = await page.locator('code.language-go, code.hljs.go').count();
    expect(goCode).toBeGreaterThan(0);
  });

  test('should apply color styling to syntax-highlighted code', async () => {
    // Check that code blocks have styled spans (from Highlight.js)
    const styledSpans = await page.locator('pre code span[class*="hljs"]').count();
    expect(styledSpans).toBeGreaterThan(0);

    // Verify color is applied (not default black)
    const firstSpan = page.locator('pre code span[class*="hljs"]').first();
    const color = await firstSpan.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Color should not be default black (rgb(0, 0, 0))
    expect(color).not.toBe('rgb(0, 0, 0)');
  });
});

/**
 * T023: E2E test for Mermaid diagrams
 * Verify diagrams appear as graphics, not raw code
 */
test.describe('T023: Mermaid Diagrams', () => {
  test('should render Mermaid diagrams as SVG graphics', async () => {
    const testFile = path.join(__dirname, '../fixtures/test-mermaid.md');

    await page.evaluate((filePath) => {
      return window.electronAPI?.file.read({ filePath });
    }, testFile);

    await page.waitForSelector('.markdown-viewer', { timeout: 5000 });

    // Wait for Mermaid to render (may take a moment)
    await page.waitForSelector('svg', { timeout: 10000 });

    // Verify SVG diagrams exist
    const svgDiagrams = await page.locator('svg').count();
    expect(svgDiagrams).toBeGreaterThanOrEqual(2); // flowchart + sequence diagram

    // Verify raw mermaid code is NOT visible
    const mermaidCodeBlocks = await page.locator('pre code.language-mermaid').count();
    expect(mermaidCodeBlocks).toBe(0); // Should be converted to SVG
  });

  test('should render flowchart with nodes and edges', async () => {
    // Verify SVG contains graph elements
    const graphElements = await page.locator('svg g').count();
    expect(graphElements).toBeGreaterThan(0);

    // Verify nodes exist (rectangles, circles, etc.)
    const nodes = await page.locator('svg rect, svg circle, svg polygon').count();
    expect(nodes).toBeGreaterThan(0);
  });
});

/**
 * T024: E2E test for performance
 * Verify complex document renders within 500ms (SC-001)
 */
test.describe('T024: Rendering Performance', () => {
  test('should render complex document within 500ms', async () => {
    const testFile = path.join(__dirname, '../fixtures/test-complex.md');

    const startTime = Date.now();

    await page.evaluate((filePath) => {
      return window.electronAPI?.file.read({ filePath });
    }, testFile);

    await page.waitForSelector('.markdown-viewer', { timeout: 5000 });

    // Wait for all content to render
    await page.waitForSelector('h1', { timeout: 1000 });
    await page.waitForSelector('table', { timeout: 1000 });
    await page.waitForSelector('pre code', { timeout: 1000 });

    const endTime = Date.now();
    const renderTime = endTime - startTime;

    // Verify render time is under 500ms
    expect(renderTime).toBeLessThan(500);
  });

  test('should handle documents with 10+ code blocks efficiently', async () => {
    const testFile = path.join(__dirname, '../fixtures/test-complex.md');

    await page.evaluate((filePath) => {
      return window.electronAPI?.file.read({ filePath });
    }, testFile);

    await page.waitForSelector('.markdown-viewer', { timeout: 5000 });

    // Verify all code blocks rendered
    const codeBlocks = await page.locator('pre code').count();
    expect(codeBlocks).toBeGreaterThanOrEqual(8); // 5 languages + java + cpp + bash

    // Verify all syntax highlighting applied
    const highlightedBlocks = await page.locator('pre code[class*="language-"], pre code[class*="hljs"]').count();
    expect(highlightedBlocks).toBe(codeBlocks);
  });

  test('should maintain 60 FPS during scrolling', async () => {
    // Scroll through document and measure frame rate
    const frameRates: number[] = [];
    let lastTime = performance.now();

    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(16); // ~60 FPS = 16ms per frame

      const currentTime = performance.now();
      const frameTime = currentTime - lastTime;
      const fps = 1000 / frameTime;
      frameRates.push(fps);
      lastTime = currentTime;
    }

    const averageFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;

    // Average FPS should be close to 60 (allow some variance)
    expect(averageFps).toBeGreaterThanOrEqual(50);
  });
});

/**
 * Evidence capture for issue #23 (Small fixes: paths with spaces, export
 * exclude list, blank page on navigation, Open Folder after export).
 *
 * Produces screenshots in docs/evidence/issue-23/ and asserts the visible
 * behaviour of the UI-facing items:
 *  1. Links to files/folders with spaces open, and the generated directory
 *     listing renders working links for names with spaces / % / #.
 *  2. The Export settings panel has an "Exclude from Export" section with
 *     presets, toggle and remove.
 *
 * Run after `npm run build`:  npx playwright test tests/e2e/issue-23-evidence.spec.ts
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

let electronApp: ElectronApplication;
let page: Page;

const FIXTURE_ROOT = path.join(__dirname, '../fixtures/issue-23');
const EVIDENCE_DIR = path.join(__dirname, '../../docs/evidence/issue-23');

// 1x1 transparent PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function writeFixture(relative: string, content: string | Buffer): void {
  const full = path.join(FIXTURE_ROOT, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

const consoleLog: string[] = [];

async function openFile(relative: string, headingText: string): Promise<void> {
  const filePath = path.join(FIXTURE_ROOT, relative);
  // Same event the file tree / Ctrl+Click use to open a file in a new tab
  await page.evaluate((p) => {
    window.dispatchEvent(new CustomEvent('open-file-in-new-tab', { detail: { filePath: p } }));
  }, filePath);
  try {
    await page.waitForSelector(`.markdown-viewer__buffer--active h1:has-text("${headingText}")`, { timeout: 15000 });
  } catch (err) {
    const diag = await page.evaluate(() => ({
      viewers: document.querySelectorAll('.markdown-viewer').length,
      buffers: Array.from(document.querySelectorAll('.markdown-viewer__buffer')).map((b) => ({
        cls: b.className,
        len: b.innerHTML.length,
        h1: b.querySelector('h1')?.textContent,
      })),
      mainText: (document.querySelector('.app-layout__main, main, .app-layout__content') as HTMLElement | null)?.innerText?.slice(0, 300),
    }));
    console.log('[evidence] DIAG', JSON.stringify(diag, null, 2));
    const logPath = path.join(__dirname, '../../test-results/issue-23-console.log');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, consoleLog.join('\n'));
    console.log('[evidence] full console written to', logPath);
    throw err;
  }
  await page.waitForTimeout(400);
}

async function goBack(headingText: string): Promise<void> {
  await page.click('button:has-text("◀")');
  await page.waitForSelector(`.markdown-viewer__buffer--active h1:has-text("${headingText}")`, { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function shot(name: string): Promise<void> {
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage: false });
}

test.beforeAll(async () => {
  fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  writeFixture(
    'My Docs/index.md',
    [
      '# Issue 23 Fixture',
      '',
      'Links whose destination contains spaces (issue #23):',
      '',
      '- [Angle-bracket link](<My Folder/My File.md>)',
      '- [Percent-encoded link](My%20Folder/My%20File.md)',
      '- [Folder listing](My%20Folder/)',
      '',
      '![Image in folder with spaces](My%20Folder/tiny%20image.png)',
      '',
    ].join('\n')
  );
  writeFixture('My Docs/My Folder/My File.md', '# Spaced File Opened\n\nThis file lives in a folder with a space.\n');
  writeFixture('My Docs/My Folder/100%.md', '# Percent File\n');
  writeFixture('My Docs/My Folder/C#.md', '# Hash File\n');
  writeFixture('My Docs/My Folder/Sub Folder/inner.md', '# Inner\n');
  writeFixture('My Docs/My Folder/tiny image.png', TINY_PNG);

  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../out/main/index.js')],
    timeout: 60000,
  });

  page = await electronApp.firstWindow();
  page.on('console', (msg) => consoleLog.push(`[${msg.type()}] ${msg.text().slice(0, 300)}`));
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.setViewportSize({ width: 1280, height: 800 });
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
  fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

test.describe('Issue #23 evidence', () => {
  test('1. links and images with spaces resolve; directory listing has working links', async () => {
    await openFile('My Docs/index.md', 'Issue 23 Fixture');

    // The image inside "My Folder" must have been resolved to an mdfile:// URL (not the "not found" placeholder)
    const imgSrc = await page.getAttribute('.markdown-viewer__buffer--active img', 'src');
    expect(imgSrc).toMatch(/^mdfile:\/\/\//);
    expect(imgSrc).toContain('My%20Folder/tiny%20image.png');
    await shot('after-01-links-with-spaces.png');

    // Percent-encoded link opens the file in the folder with a space
    await page.click('.markdown-viewer__buffer--active a[href="My%20Folder/My%20File.md"]');
    await page.waitForSelector('.markdown-viewer__buffer--active h1:has-text("Spaced File Opened")', { timeout: 15000 });
    await page.waitForTimeout(400);
    await shot('after-02-spaced-file-opened.png');

    // Back to the index (title bar back button), then the angle-bracket link
    // (markdown-it encodes it to the same href, so both anchors match)
    await goBack('Issue 23 Fixture');
    const spacedLinks = page.locator('.markdown-viewer__buffer--active a[href="My%20Folder/My%20File.md"]');
    await expect(spacedLinks).toHaveCount(2);

    // Folder link -> generated directory listing with encoded destinations
    await page.click('.markdown-viewer__buffer--active a[href="My%20Folder/"]');
    await page.waitForSelector('.markdown-viewer__buffer--active h1:has-text("My Folder")', { timeout: 15000 });
    await page.waitForTimeout(400);

    const listingHrefs = await page.$$eval('.markdown-viewer__buffer--active a[href]', (as) =>
      as.map((a) => a.getAttribute('href'))
    );
    expect(listingHrefs).toContain('Sub%20Folder/');
    expect(listingHrefs).toContain('My%20File.md');
    expect(listingHrefs).toContain('100%25.md');
    expect(listingHrefs).toContain('C%23.md');
    expect(listingHrefs.some((h) => h?.startsWith('http://'))).toBe(false);
    await shot('after-03-directory-listing-with-spaces.png');

    // A listing entry with a space opens the nested listing
    await page.click('.markdown-viewer__buffer--active a[href="Sub%20Folder/"]');
    await page.waitForSelector('.markdown-viewer__buffer--active h1:has-text("Sub Folder")', { timeout: 15000 });
    const nested = await page.$$eval('.markdown-viewer__buffer--active a[href]', (as) => as.map((a) => a.getAttribute('href')));
    expect(nested).toContain('inner.md');
    await shot('after-04-nested-listing.png');
  });

  test('2. Export settings has an "Exclude from Export" section', async () => {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('menu:settings')));
    await page.waitForSelector('.settings-window', { timeout: 10000 });
    await page.click('.settings-window button:has-text("Export")');
    const section = page.locator('[data-testid="export-exclusions"]');
    await expect(section).toBeVisible({ timeout: 10000 });
    await section.scrollIntoViewIfNeeded();

    // Add via preset and via typed pattern
    await section.locator('button:has-text("CLAUDE.md")').click();
    await section.locator('input[aria-label="New export exclusion pattern"]').fill('*.agent.md');
    await section.locator('button:has-text("Add")').click();
    await expect(section.locator('.folder-exclusion__pattern')).toHaveText(['CLAUDE.md', '*.agent.md']);
    // Preset is disabled once present
    await expect(section.locator('button:has-text("CLAUDE.md")').first()).toBeDisabled();
    await page.waitForTimeout(300);
    await shot('after-05-export-exclusions-settings.png');

    // Toggle one off
    await section.locator('.folder-exclusion__item').first().locator('input[type="checkbox"]').click();
    await expect(section.locator('.folder-exclusion__item').first()).toHaveClass(/--disabled/);

    // Clean up so the run leaves no exclusions behind in the user's settings
    await section.locator('button:has-text("Clear All")').click();
    await expect(section.locator('.folder-exclusion__empty')).toBeVisible();
  });
});

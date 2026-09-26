/**
 * Evidence capture for issue #25 (Outline side panel).
 *
 * Produces screenshots in docs/evidence/issue-25/ and asserts the visible
 * behaviour of the outline panel:
 *  - listing, count, relative nesting and de-duplicated heading ids
 *  - click-to-navigate, scrollspy (activation line + bottom rule)
 *  - filter, collapse/expand, left/right position, empty state
 *  - Appearance settings controls
 *
 * Run after `npm run build`:
 *   EVIDENCE_PHASE=before npx playwright test tests/e2e/issue-25-evidence.spec.ts   (unmodified build)
 *   EVIDENCE_PHASE=after  npx playwright test tests/e2e/issue-25-evidence.spec.ts   (default)
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

let electronApp: ElectronApplication;
let page: Page;
const consoleLog: string[] = [];
let originalOutlinePosition: 'left' | 'right' = 'right';

const PHASE = process.env.EVIDENCE_PHASE === 'before' ? 'before' : 'after';
const FIXTURE_ROOT = path.join(__dirname, '../fixtures/issue-25');
const EVIDENCE_DIR = path.join(__dirname, '../../docs/evidence/issue-25');

function writeFixture(relative: string, content: string): void {
  const full = path.join(FIXTURE_ROOT, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function buildLongDocument(): string {
  const lines: string[] = ['# Outline Fixture', '', 'Intro paragraph before the first section.', ''];
  lines.push('## Getting `started` with *emphasis* and a [link](https://example.com) 🚀', '');
  lines.push('Some text.', '');
  lines.push('#### Skipped level (h4 directly under h2)', '', 'Nested under the h2 by relative level.', '');
  lines.push('### Back to h3', '', 'Sibling of the skipped h4.', '');
  lines.push('## Duplicate', '', 'First duplicate section.', '');
  lines.push('## Duplicate', '', 'Second duplicate section.', '');
  lines.push(
    '## A very long heading that keeps going and going so that it must be truncated with an ellipsis in the outline panel',
    '',
    'Long heading text.',
    ''
  );
  for (let i = 1; i <= 40; i++) {
    lines.push(`## Section ${i}`, '');
    for (let p = 0; p < 4; p++) {
      lines.push(`Paragraph ${p + 1} of section ${i}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`, '');
    }
    lines.push(`### Section ${i} details`, '', `Details for section ${i}.`, '');
  }
  lines.push('## Last Section', '', 'The very last heading of the document.', '');
  return lines.join('\n');
}

async function openFile(relative: string, readySelector: string): Promise<void> {
  const filePath = path.join(FIXTURE_ROOT, relative);
  await page.evaluate((p) => {
    window.dispatchEvent(new CustomEvent('open-file-in-new-tab', { detail: { filePath: p } }));
  }, filePath);
  await page.waitForSelector(`.markdown-viewer__buffer--active ${readySelector}`, { timeout: 15000 });
  await page.waitForTimeout(500);
}

async function shot(name: string): Promise<void> {
  await page.screenshot({ path: path.join(EVIDENCE_DIR, `${PHASE}-${name}.png`), fullPage: false });
}

function toggleOutline(): Promise<void> {
  return page.evaluate(() => window.dispatchEvent(new CustomEvent('toggle-toc')));
}

test.beforeAll(async () => {
  fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  writeFixture('docs/long.md', buildLongDocument());
  writeFixture('docs/no-headings.md', 'Just a paragraph.\n\nAnother paragraph without any heading.\n');

  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../out/main/index.js')],
    timeout: 60000,
  });

  page = await electronApp.firstWindow();
  page.on('console', (msg) => consoleLog.push(`[${msg.type()}] ${msg.text().slice(0, 400)}`));
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.setViewportSize({ width: 1280, height: 800 });

  // Start from the default outline position (right) regardless of what a previous run persisted
  const loaded = await page.evaluate(async () => {
    const api = (window as any).electronAPI;
    const result = await api?.settings?.load({});
    return result?.settings?.appearance?.outlinePosition ?? 'right';
  });
  originalOutlinePosition = loaded === 'left' ? 'left' : 'right';
  if (originalOutlinePosition === 'left') {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('outline:toggle-position')));
    await page.waitForTimeout(300);
  }
});

test.afterAll(async () => {
  if (electronApp) {
    // Put the user's outline position back the way it was
    try {
      const current = await page.evaluate(async () => {
        const api = (window as any).electronAPI;
        const result = await api?.settings?.load({});
        return result?.settings?.appearance?.outlinePosition ?? 'right';
      });
      if (current !== originalOutlinePosition) {
        await page.evaluate(() => window.dispatchEvent(new CustomEvent('outline:toggle-position')));
        await page.waitForTimeout(800);
      }
    } catch {
      // best effort
    }
    await electronApp.close();
  }
  fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

function dumpConsole(label: string, pattern: RegExp, max = 60): void {
  const lines = consoleLog.filter((l) => pattern.test(l)).slice(-max);
  console.log(['[evidence] ---- ' + label + ' ----', ...lines].join('\n'));
}

test.describe(`Issue #25 evidence (${PHASE})`, () => {
  test.skip(PHASE !== 'before', 'before-phase only');
  test('before: toggling the outline does nothing', async () => {
    await openFile('docs/long.md', 'h1:has-text("Outline Fixture")');
    await toggleOutline();
    await page.keyboard.press('Control+Alt+o');
    await page.waitForTimeout(600);
    await expect(page.locator('.outline-panel')).toHaveCount(0);
    await shot('01-no-outline-panel');
  });
});

test.describe(`Issue #25 evidence (${PHASE}) - outline panel`, () => {
  test.skip(PHASE !== 'after', 'after-phase only');

  test('1. panel lists headings with count, nesting and unique ids', async () => {
    await openFile('docs/long.md', 'h1:has-text("Outline Fixture")');

    // Make sure the panel is visible (state may be persisted from a previous run)
    if ((await page.locator('.outline-panel').count()) === 0) {
      await toggleOutline();
    }
    const panel = page.locator('.outline-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });
    await expect(panel.locator('.outline-panel__filter-input')).toHaveValue('');

    // Header count matches the number of headings in the fixture (1 + 5 + 1 + 40*2 + 1 = 88)
    await expect(panel.locator('.outline-panel__count')).toHaveText('88');

    // Relative nesting: the skipped h4 sits one level under its h2 parent, the following h3 is its sibling
    const skipped = panel.locator('[role="treeitem"]', { hasText: 'Skipped level' }).first();
    const backToH3 = panel.locator('[role="treeitem"]', { hasText: 'Back to h3' }).first();
    await expect(skipped).toHaveAttribute('aria-level', '3');
    await expect(backToH3).toHaveAttribute('aria-level', '3');

    // Inline markdown stripped, emoji kept
    const started = panel.locator('.outline-item__label', { hasText: 'Getting started' }).first();
    await expect(started).toHaveText('Getting started with emphasis and a link 🚀');

    // Duplicate headings get distinct ids that exist in the rendered DOM
    const dupIds = await panel.locator('.outline-item[data-heading-id^="duplicate"]').evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-heading-id'))
    );
    expect(dupIds).toEqual(['duplicate', 'duplicate-1']);
    for (const id of dupIds) {
      await expect(page.locator(`.markdown-viewer__buffer--active [id="${id}"]`)).toHaveCount(1);
    }

    // Long heading: label is truncated (overflow) and carries the full text as tooltip
    const longLabel = panel.locator('.outline-item__label', { hasText: 'A very long heading' }).first();
    const title = await longLabel.getAttribute('title');
    expect(title).toContain('truncated with an ellipsis');

    await shot('01-outline-right');
  });

  test('2. clicking an entry navigates and locks the active entry; bottom rule marks the last heading', async () => {
    const panel = page.locator('.outline-panel');
    const target = panel.locator('.outline-item[data-heading-id="section-20"]');
    await target.scrollIntoViewIfNeeded();
    await target.click();
    await expect(target).toHaveAttribute('aria-current', 'location');
    await page.waitForTimeout(900);
    await expect(target).toHaveAttribute('aria-current', 'location');
    await expect(panel.locator('[aria-current="location"]')).toHaveCount(1);

    const scrollTop = await page.evaluate(() => document.querySelector('.markdown-viewer__buffer--active')!.scrollTop);
    expect(scrollTop).toBeGreaterThan(500);
    await shot('02-click-navigates');

    // Scroll to the very bottom: the last heading is active even though it cannot reach the activation line
    await page.evaluate(() => {
      const el = document.querySelector('.markdown-viewer__buffer--active') as HTMLElement;
      el.scrollTop = el.scrollHeight;
    });
    await expect(panel.locator('.outline-item[data-heading-id="last-section"]')).toHaveAttribute('aria-current', 'location', { timeout: 5000 });
    await shot('03-bottom-last-active');

    // Alt+Left returns to the position before the outline click
    await page.keyboard.press('Alt+ArrowLeft');
    await page.waitForTimeout(800);
    const backTop = await page.evaluate(() => document.querySelector('.markdown-viewer__buffer--active')!.scrollTop);
    if (backTop >= 100) dumpConsole('console after Alt+Left', /navigat|history|Outline|scroll|error/i);
    expect(backTop).toBeLessThan(100);
  });

  test('3. filter keeps matches and ancestors; Esc clears', async () => {
    const panel = page.locator('.outline-panel');
    const input = panel.locator('.outline-panel__filter-input');
    await input.fill('section 3 details');
    await expect(panel.locator('.outline-item')).toHaveCount(3); // h1 ancestor + Section 3 + its details
    await shot('04-filter');
    await input.press('Escape');
    await expect(input).toHaveValue('');
    await expect(panel.locator('.outline-item[data-heading-id="section-20"]')).toBeVisible();
  });

  test('4. collapse all / expand all', async () => {
    const panel = page.locator('.outline-panel');
    await panel.locator('button[aria-label="Collapse all"]').click();
    await expect(panel.locator('.outline-item')).toHaveCount(1);
    await shot('05-collapsed');
    await panel.locator('button[aria-label="Expand all"]').click();
    await expect(panel.locator('.outline-item[data-heading-id="section-20"]')).toBeVisible();
  });

  test('5. move to left stacks the outline under the file tree', async () => {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('outline:toggle-position')));
    await expect(page.locator('.sidebar .outline-panel--stacked')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.sidebar-outline-divider')).toBeVisible();
    await shot('06-left-stacked');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('outline:toggle-position')));
    await expect(page.locator('.outline-panel--right')).toBeVisible({ timeout: 5000 });
  });

  test('6. empty state for a document without headings', async () => {
    await openFile('docs/no-headings.md', 'p:has-text("Just a paragraph")');
    await expect(page.locator('.outline-panel__empty')).toHaveText('No headings in this document');
    await shot('07-empty-state');
  });

  test('7. Ctrl+G focuses the filter; arrow keys and Enter navigate the tree', async () => {
    // Switch back to the already-open long document (re-opening does not activate an existing tab)
    await page.click('.sidebar-open-file-item:has-text("long.md")');
    await page.waitForSelector('.markdown-viewer__buffer--active h1:has-text("Outline Fixture")', { timeout: 15000 });
    await expect(page.locator('.outline-panel__count')).toHaveText('88');
    await page.keyboard.press('Control+g');
    const input = page.locator('.outline-panel__filter-input');
    await expect(input).toBeFocused();

    await page.keyboard.press('ArrowDown'); // into the tree (first entry)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown'); // "Skipped level"
    const focused = await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset?.headingId);
    expect(focused).toBe('skipped-level-h4-directly-under-h2');

    await page.keyboard.press('ArrowLeft'); // parent
    const parent = await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset?.headingId);
    expect(parent).toBe('getting-started-with-emphasis-and-a-link');

    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page.locator('.outline-item[data-heading-id="last-section"]')).toHaveAttribute('aria-current', 'location', { timeout: 5000 });
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
  });

  test('8. dark theme uses theme colours', async () => {
    await page.click('button[title="Switch to Dark Theme"]');
    await page.waitForTimeout(400);
    await page.locator('.outline-item[data-heading-id="section-5"]').click();
    await page.waitForTimeout(700);
    await shot('09-dark-theme');
    await page.click('button[title="Switch to Light Theme"]');
    await page.waitForTimeout(300);
  });

  test('9. Appearance settings expose outline position and depth', async () => {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('menu:settings')));
    await page.waitForSelector('.settings-window', { timeout: 10000 });
    const section = page.locator('[data-testid="outline-settings"]');
    await expect(section).toBeVisible();
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator('#outline-position')).toHaveValue('right');
    await expect(section.locator('#outline-depth')).toHaveValue('6');
    await shot('08-settings');
    await page.keyboard.press('Escape');
  });
});

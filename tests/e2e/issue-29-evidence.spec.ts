/**
 * Evidence capture for issue #29 (New page, go to top).
 *
 * Produces screenshots in docs/evidence/issue-29/ and asserts:
 *  - a page opened fresh into a tab starts at the top-left
 *  - focusing an already-open tab keeps its scroll position
 *  - Ctrl+click / Shift+click open the page in a new tab / window at the top or at the linked heading
 *  - same-page links are in-document jumps (no reload)
 *  - cross-file deep links align the heading to the top (exact, percent-encoded, digit-leading,
 *    case-insensitive, empty and missing fragments, directory links)
 *  - Back/Forward, the history panel and tab switching still restore positions
 *  - a deep link into a page with a Mermaid diagram stays aligned once the height stabilises
 *  - a disk change re-render keeps the scroll position
 *
 * Run after `npm run build`:
 *   EVIDENCE_PHASE=before npx playwright test tests/e2e/issue-29-evidence.spec.ts   (unmodified build)
 *   EVIDENCE_PHASE=after  npx playwright test tests/e2e/issue-29-evidence.spec.ts   (default)
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

let electronApp: ElectronApplication;
let page: Page;
const consoleLog: string[] = [];

const PHASE = process.env.EVIDENCE_PHASE === 'before' ? 'before' : 'after';
const FIXTURE_ROOT = path.join(__dirname, '../fixtures/issue-29');
const EVIDENCE_DIR = path.join(__dirname, '../../docs/evidence/issue-29');
const ACTIVE = '.markdown-viewer__buffer--active';
const HEADING_OFFSET = 12;

function writeFixture(relative: string, content: string): void {
  const full = path.join(FIXTURE_ROOT, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function filler(label: string, paragraphs = 4): string[] {
  const out: string[] = [];
  for (let p = 0; p < paragraphs; p++) {
    out.push(`Paragraph ${p + 1} of ${label}. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.`, '');
  }
  return out;
}

function buildPageA(): string {
  const lines: string[] = ['# Page A', '', 'Intro paragraph of page A.', ''];
  lines.push('## Setup', '', ...filler('setup'));
  // A very wide line so the page can be panned horizontally at 100% zoom
  lines.push('```text', 'WIDE ' + 'x'.repeat(400), '```', '');
  for (let i = 1; i <= 40; i++) {
    lines.push(`## A section ${i}`, '');
    if (i === 20) {
      lines.push(
        '- [Plain link to B](page-b.md)',
        '- [Deep link to B](page-b.md#section-two)',
        '- [Deep link upper case](page-b.md#Section-Two)',
        '- [Deep link digit](page-b.md#2-numbered)',
        '- [Deep link encoded](page-b.md#caf%C3%A9-section)',
        '- [Deep link missing](page-b.md#no-such-heading)',
        '- [Empty fragment](page-b.md#)',
        '- [Docs directory](docs/#intro)',
        '- [Same page setup](./page-a.md#setup)',
        '- [Same page setup upper](#Setup)',
        '- [Same page top](./page-a.md)',
        ''
      );
    }
    lines.push(...filler(`A section ${i}`));
  }
  lines.push('## Last A', '', 'End of page A.', '');
  return lines.join('\n');
}

function buildPageB(): string {
  const lines: string[] = ['# Page B', '', 'Intro paragraph of page B. [Back to A](page-a.md)', ''];
  lines.push('```mermaid', 'graph TD', '  A[Start] --> B{Decision}', '  B -->|yes| C[Do it]', '  B -->|no| D[Skip]', '  C --> E[End]', '  D --> E', '```', '');
  lines.push('## Section one', '', ...filler('section one', 6));
  lines.push('## Section two', '', ...filler('section two', 6));
  lines.push('## 2 Numbered', '', ...filler('numbered', 6));
  lines.push('## Café section', '', ...filler('café', 6));
  for (let i = 1; i <= 30; i++) {
    lines.push(`## B section ${i}`, '', ...filler(`B section ${i}`));
  }
  lines.push('## Last B', '', 'End of page B.', '');
  return lines.join('\n');
}

async function openInNewTab(relative: string, readySelector: string): Promise<void> {
  const filePath = path.join(FIXTURE_ROOT, relative);
  await page.evaluate((p) => {
    window.dispatchEvent(new CustomEvent('open-file-in-new-tab', { detail: { filePath: p } }));
  }, filePath);
  await page.waitForSelector(`${ACTIVE} ${readySelector}`, { timeout: 15000 });
  await page.waitForTimeout(600);
}

async function waitForPage(readySelector: string, settle = 1500, target: Page = page): Promise<void> {
  await target.waitForSelector(`${ACTIVE} ${readySelector}`, { timeout: 15000 });
  await target.waitForTimeout(settle);
}

async function scrollState(target: Page = page): Promise<{ top: number; left: number }> {
  return target.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement;
    return { top: el.scrollTop, left: el.scrollLeft };
  }, ACTIVE);
}

async function setScroll(top: number, left = 0): Promise<void> {
  await page.evaluate(({ sel, top, left }) => {
    const el = document.querySelector(sel) as HTMLElement;
    el.scrollTop = top;
    el.scrollLeft = left;
  }, { sel: ACTIVE, top, left });
  await page.waitForTimeout(400);
}

/** Top of the heading relative to the active buffer's viewport (12px when aligned) */
async function headingTop(id: string, target: Page = page): Promise<number | null> {
  return target.evaluate(({ sel, id }) => {
    const buffer = document.querySelector(sel) as HTMLElement;
    const el = buffer?.querySelector(`[id="${id}"]`);
    if (!buffer || !el) return null;
    return Math.round(el.getBoundingClientRect().top - buffer.getBoundingClientRect().top);
  }, { sel: ACTIVE, id });
}

/** Dispatch a click on the link without Playwright scrolling it into view first */
async function clickLink(text: string, modifiers: { ctrl?: boolean; shift?: boolean } = {}): Promise<void> {
  const clicked = await page.evaluate(({ sel, text, modifiers }) => {
    const buffer = document.querySelector(sel) as HTMLElement;
    const link = Array.from(buffer.querySelectorAll('a')).find((a) => a.textContent?.trim() === text);
    if (!link) return false;
    link.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: !!modifiers.ctrl,
      shiftKey: !!modifiers.shift,
    }));
    return true;
  }, { sel: ACTIVE, text, modifiers });
  expect(clicked, `link "${text}" exists`).toBe(true);
}

async function shot(name: string, target: Page = page): Promise<void> {
  await target.screenshot({ path: path.join(EVIDENCE_DIR, `${PHASE}-${name}.png`), fullPage: false });
}

/** Focus the tab holding `relative` (opens it when not open) - the same open-existing-tab path the tree / recents use */
async function activateFile(relative: string, readySelector: string): Promise<void> {
  await openInNewTab(relative, readySelector);
}

async function ensureSidebar(): Promise<void> {
  if ((await page.locator('.sidebar').count()) === 0) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('toggle-sidebar')));
    await page.waitForTimeout(300);
  }
}

function consoleSince(mark: number, pattern: RegExp): string[] {
  return consoleLog.slice(mark).filter((l) => pattern.test(l));
}

function dumpConsole(label: string, mark: number, pattern: RegExp, max = 80): void {
  const lines = consoleSince(mark, pattern).slice(-max);
  console.log(['[evidence] ---- ' + label + ' ----', ...lines].join('\n'));
}

test.beforeAll(async () => {
  fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  writeFixture('page-a.md', buildPageA());
  writeFixture('page-b.md', buildPageB());
  writeFixture('docs/README.md', '# Docs Intro\n\nReadme inside docs.\n');
  writeFixture('docs/other.md', '# Other\n');

  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../out/main/index.js')],
    timeout: 60000,
  });

  page = await electronApp.firstWindow();
  page.on('console', (msg) => consoleLog.push(`[${msg.type()}] ${msg.text().slice(0, 400)}`));
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.setViewportSize({ width: 1280, height: 800 });
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
  fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

test.describe(`Issue #29 evidence (${PHASE}) - before`, () => {
  test.skip(PHASE !== 'before', 'before-phase only');

  test('before: plain link keeps the previous page offset; deep link fails', async () => {
    await openInNewTab('page-a.md', 'h1:has-text("Page A")');
    const linkTop = await headingTop('a-section-20');
    await setScroll((linkTop ?? 3000) - 100, 300);
    await shot('01-page-a-scrolled');

    await clickLink('Plain link to B');
    await waitForPage('h1:has-text("Page B")');
    const after = await scrollState();
    console.log('[evidence] before-phase plain link -> page B scroll:', after);
    await shot('02-plain-link-stale-offset');

    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');
    await clickLink('Deep link to B');
    await page.waitForTimeout(1500);
    const toast = await page.locator('.toast__message').count();
    console.log('[evidence] before-phase deep link -> toast count:', toast, 'section-two top:', await headingTop('section-two'));
    await shot('03-deep-link-fails');
  });
});

test.describe(`Issue #29 evidence (${PHASE}) - after`, () => {
  test.skip(PHASE !== 'after', 'after-phase only');

  test('1. plain relative link opens page B at the top-left', async () => {
    await openInNewTab('page-a.md', 'h1:has-text("Page A")');
    const linkTop = await headingTop('a-section-20');
    expect(linkTop).not.toBeNull();
    await setScroll((linkTop ?? 3000) - 100, 300);
    const before = await scrollState();
    expect(before.top).toBeGreaterThan(1000);
    expect(before.left).toBeGreaterThan(0);
    await shot('01-page-a-scrolled-and-panned');

    await clickLink('Plain link to B');
    await waitForPage('h1:has-text("Page B")');
    const after = await scrollState();
    expect(after).toEqual({ top: 0, left: 0 });
    await expect(page.locator('.toast__message')).toHaveCount(0);
    await shot('02-plain-link-top');
  });

  test('2. Back and Forward restore the positions the reader left', async () => {
    await setScroll(600);
    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');
    const a = await scrollState();
    expect(a.top).toBeGreaterThan(1000);
    expect(a.left).toBeGreaterThan(0);
    await shot('03-back-restores-a');

    const mark = consoleLog.length;
    await page.keyboard.press('Alt+ArrowRight');
    await waitForPage('h1:has-text("Page B")');
    const b = await scrollState();
    if (Math.abs(b.top - 600) > 2) {
      dumpConsole('console after Alt+Right', mark, /onScrollChange\] Called|Restored scroll|Fresh navigation|Navigating|Transition triggered|Syncing currentFile|Rendering to buffer|Crossfade complete|Deep link|navigateBack|navigateForward/);
    }
    expect(Math.abs(b.top - 600)).toBeLessThanOrEqual(2);

    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');
  });

  test('3. deep link aligns "Section two" to the top; Back/Forward keep the heading position', async () => {
    const mark = consoleLog.length;
    await clickLink('Deep link to B');
    await waitForPage('h1:has-text("Page B")', 2000);
    const top = await headingTop('section-two');
    expect(top).not.toBeNull();
    if (Math.abs((top ?? 0) - HEADING_OFFSET) > 2) {
      dumpConsole('console after deep link', mark, /Deep link|onScrollChange\] Called|Restored scroll|Crossfade|Skipping render|Fresh navigation|Rendering to buffer|target not found/);
    }
    expect(Math.abs((top ?? 0) - HEADING_OFFSET)).toBeLessThanOrEqual(2);
    expect((await scrollState()).left).toBe(0);
    expect(consoleSince(mark, /target not found/i)).toEqual([]);
    await shot('04-deep-link-section-two');

    const at = (await scrollState()).top;
    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');
    await page.keyboard.press('Alt+ArrowRight');
    await waitForPage('h1:has-text("Page B")');
    expect(Math.abs((await scrollState()).top - at)).toBeLessThanOrEqual(2);
    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');
  });

  test('4. case-insensitive, digit-leading and percent-encoded fragments', async () => {
    await clickLink('Deep link upper case');
    await waitForPage('h1:has-text("Page B")', 2000);
    expect(Math.abs((await headingTop('section-two') ?? 0) - HEADING_OFFSET)).toBeLessThanOrEqual(2);
    await shot('05-deep-link-case-insensitive');
    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');

    await clickLink('Deep link digit');
    await waitForPage('h1:has-text("Page B")', 2000);
    expect(Math.abs((await headingTop('2-numbered') ?? 0) - HEADING_OFFSET)).toBeLessThanOrEqual(2);
    await shot('06-deep-link-digit');
    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');

    await clickLink('Deep link encoded');
    await waitForPage('h1:has-text("Page B")', 2000);
    expect(Math.abs((await headingTop('café-section') ?? 0) - HEADING_OFFSET)).toBeLessThanOrEqual(2);
    await shot('07-deep-link-encoded');
    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');
  });

  test('5. empty fragment opens at the top without warning; missing fragment warns and opens at the top', async () => {
    let mark = consoleLog.length;
    await clickLink('Empty fragment');
    await waitForPage('h1:has-text("Page B")');
    expect((await scrollState()).top).toBe(0);
    expect(consoleSince(mark, /target not found/i)).toEqual([]);
    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');

    mark = consoleLog.length;
    await clickLink('Deep link missing');
    await waitForPage('h1:has-text("Page B")');
    expect((await scrollState()).top).toBe(0);
    await expect(page.locator('.toast__message')).toHaveCount(0);
    expect(consoleSince(mark, /target not found/i).length).toBeGreaterThan(0);
    await shot('08-missing-fragment-top');
    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');
  });

  test('6. directory link with a fragment still opens the listing', async () => {
    await activateFile('page-a.md', 'h1:has-text("Page A")');
    await clickLink('Docs directory');
    await waitForPage('h1:has-text("docs")');
    await expect(page.locator(`${ACTIVE} a[href$="README.md"]`)).toHaveCount(1);
    await expect(page.locator('.toast__message')).toHaveCount(0);
    await shot('09-directory-with-fragment');
    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');
  });

  test('7. same-page links jump in place without reloading', async () => {
    await activateFile('page-a.md', 'h1:has-text("Page A")');
    const linkTop = await headingTop('a-section-20');
    await setScroll((linkTop ?? 3000) - 100);
    let mark = consoleLog.length;
    await clickLink('Same page setup');
    await page.waitForTimeout(1200);
    expect(consoleSince(mark, /Transition triggered/)).toEqual([]);
    expect(Math.abs((await headingTop('setup') ?? 0) - HEADING_OFFSET)).toBeLessThanOrEqual(2);
    await shot('10-same-page-fragment');

    await setScroll((linkTop ?? 3000) - 100);
    mark = consoleLog.length;
    await clickLink('Same page setup upper');
    await page.waitForTimeout(1200);
    expect(consoleSince(mark, /Transition triggered|target not found/i)).toEqual([]);
    expect(Math.abs((await headingTop('setup') ?? 0) - HEADING_OFFSET)).toBeLessThanOrEqual(2);

    await setScroll((linkTop ?? 3000) - 100, 200);
    mark = consoleLog.length;
    await clickLink('Same page top');
    await page.waitForTimeout(1200);
    expect(consoleSince(mark, /Transition triggered/)).toEqual([]);
    expect(await scrollState()).toEqual({ top: 0, left: 0 });
    await shot('11-same-page-top');
  });

  test('8. Ctrl+click opens a new tab at the top (or at the heading); page A keeps its position', async () => {
    await activateFile('page-a.md', 'h1:has-text("Page A")');
    const linkTop = await headingTop('a-section-20');
    await setScroll((linkTop ?? 3000) - 100);
    const aTop = (await scrollState()).top;

    await clickLink('Plain link to B', { ctrl: true });
    await waitForPage('h1:has-text("Page B")');
    expect(await scrollState()).toEqual({ top: 0, left: 0 });
    await shot('12-ctrl-click-new-tab-top');

    await activateFile('page-a.md', 'h1:has-text("Page A")');
    expect(Math.abs((await scrollState()).top - aTop)).toBeLessThanOrEqual(2);

    // B is already open in a tab: a deep link Ctrl+click focuses it and aligns the heading
    await clickLink('Deep link to B', { ctrl: true });
    await waitForPage('h1:has-text("Page B")', 2000);
    expect(Math.abs((await headingTop('section-two') ?? 0) - HEADING_OFFSET)).toBeLessThanOrEqual(2);
    await shot('13-ctrl-click-deep-link');
  });

  test('9. focusing an already-open tab keeps its scroll position; tab switching keeps both', async () => {
    await setScroll(900);
    const mark = consoleLog.length;
    await activateFile('page-a.md', 'h1:has-text("Page A")');
    const aTop = (await scrollState()).top;
    if (aTop <= 1000) {
      dumpConsole('console after switching to A', mark, /onScrollChange\] Called|Restored scroll|Fresh navigation|Skipping render|Rendering to buffer|Crossfade complete|Transition triggered|Syncing currentFile|Deep link/);
    }
    expect(aTop).toBeGreaterThan(1000);

    // Re-open page B from "outside" (tree / recents / home use the same open-existing-tab path)
    await openInNewTab('page-b.md', 'h1:has-text("Page B")');
    expect(Math.abs((await scrollState()).top - 900)).toBeLessThanOrEqual(2);
    await shot('14-existing-tab-keeps-position');

    await activateFile('page-a.md', 'h1:has-text("Page A")');
    expect(Math.abs((await scrollState()).top - aTop)).toBeLessThanOrEqual(2);
  });

  test('10. history panel entry restores its stored position', async () => {
    // Tab A: navigate to B via a link, leave B at a known position, go back to A
    await activateFile('page-a.md', 'h1:has-text("Page A")');
    const linkTop = await headingTop('a-section-20');
    await setScroll((linkTop ?? 3000) - 100);
    await clickLink('Plain link to B');
    await waitForPage('h1:has-text("Page B")');
    await setScroll(1234);
    await page.keyboard.press('Alt+ArrowLeft');
    await waitForPage('h1:has-text("Page A")');

    await ensureSidebar();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('show-history')));
    await page.waitForSelector('[data-testid="history-panel"]', { timeout: 5000 });
    const items = page.locator('.history-item');
    expect(await items.count()).toBeGreaterThan(1);
    // The newest page B entry of this tab holds the position we left it at
    const bItem = page.locator('.history-item[title$="page-b.md"]').last();
    await bItem.click();
    await waitForPage('h1:has-text("Page B")');
    expect(Math.abs((await scrollState()).top - 1234)).toBeLessThanOrEqual(2);
    await shot('15-history-panel-restore');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('show-files')));
    await page.waitForTimeout(300);
  });

  test('11. Shift+click opens a new window with the heading aligned', async () => {
    await activateFile('page-a.md', 'h1:has-text("Page A")');
    const linkTop = await headingTop('a-section-20');
    await setScroll((linkTop ?? 3000) - 100);

    const [newWindow] = await Promise.all([
      electronApp.waitForEvent('window', { timeout: 20000 }),
      clickLink('Deep link to B', { shift: true }),
    ]);
    await newWindow.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await newWindow.setViewportSize({ width: 1280, height: 800 });
    await waitForPage('h1:has-text("Page B")', 2500, newWindow);
    const top = await headingTop('section-two', newWindow);
    expect(top).not.toBeNull();
    expect(Math.abs((top ?? 0) - HEADING_OFFSET)).toBeLessThanOrEqual(2);
    await shot('16-shift-click-new-window', newWindow);
    await newWindow.close();
    await page.waitForTimeout(500);
  });

  test('12. deep link past a Mermaid diagram stays aligned after the height stabilises', async () => {
    // Fresh tab so the page renders (and the diagram lays out) from scratch
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('menu:close-all')));
    await page.waitForTimeout(500);
    await openInNewTab('page-a.md', 'h1:has-text("Page A")');
    await clickLink('Deep link to B');
    await waitForPage('h1:has-text("Page B")', 2500);
    await expect(page.locator(`${ACTIVE} .mermaid svg, ${ACTIVE} svg[id^="mermaid"]`).first()).toBeVisible();
    expect(Math.abs((await headingTop('section-two') ?? 0) - HEADING_OFFSET)).toBeLessThanOrEqual(2);
    await shot('17-mermaid-realigned');
  });

  test('13. re-render after a disk change keeps the scroll position', async () => {
    // Files opened directly are not watched; watch the fixture folder like an opened folder would be
    await page.evaluate(async (folderPath) => {
      await (window as any).electronAPI.file.watchFolder({
        folderPath,
        filePatterns: ['**/*.md'],
        ignorePatterns: [],
        debounceMs: 300,
      });
    }, FIXTURE_ROOT);
    await page.waitForTimeout(500);
    await setScroll(700);
    const before = (await scrollState()).top;
    const file = path.join(FIXTURE_ROOT, 'page-b.md');
    fs.writeFileSync(file, buildPageB().replace('End of page B.', 'End of page B. Reloaded from disk.'));
    await page.waitForSelector(`${ACTIVE} p:has-text("Reloaded from disk")`, { timeout: 10000 });
    await page.waitForTimeout(1200);
    expect(Math.abs((await scrollState()).top - before)).toBeLessThanOrEqual(2);
    await shot('18-disk-reload-keeps-position');
  });
});

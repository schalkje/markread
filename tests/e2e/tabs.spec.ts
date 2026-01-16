/**
 * E2E Tests: Multi-Tab and Multi-Document Navigation (User Story 3)
 * Tasks: T055-T056
 *
 * These tests verify:
 * - Tab switching with keyboard shortcuts (Ctrl+Tab, Ctrl+1-9)
 * - Navigation history with Alt+Left/Right
 *
 * Note: T057 Split View tests removed - feature not yet activated
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

let electronApp: ElectronApplication;
let page: Page;

// Test markdown files for multiple tabs
const TEST_FILE_1 = `# Document 1

This is the first test document for tab testing.

## Section 1.1
Content for section 1.1

## Section 1.2
Content for section 1.2
`;

const TEST_FILE_2 = `# Document 2

This is the second test document.

## Features
- Tab switching
- Navigation history
- Split view
`;

const TEST_FILE_3 = `# Document 3

Third test document with [link to doc 1](./test-file-1.md).

## More Content
Some additional content here.
`;

test.beforeAll(async () => {
  test.setTimeout(90000);

  // Create test markdown files
  const testDir = path.join(__dirname, '../fixtures');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  fs.writeFileSync(path.join(testDir, 'test-file-1.md'), TEST_FILE_1);
  fs.writeFileSync(path.join(testDir, 'test-file-2.md'), TEST_FILE_2);
  fs.writeFileSync(path.join(testDir, 'test-file-3.md'), TEST_FILE_3);

  // Launch Electron app with built output
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../out/main/index.js')],
    timeout: 60000,
  });

  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

  // Wait for home page to be ready
  await page.waitForSelector('h1:has-text("Welcome to MarkRead")', { timeout: 30000 });
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }

  // Clean up test files
  const testDir = path.join(__dirname, '../fixtures');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

/**
 * T055: E2E test for tab switching
 * Verify Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+1-9 shortcuts (SC-006)
 */
test.describe('T055: Tab Switching', () => {
  test.beforeEach(async () => {
    // Open multiple files in tabs
    const testDir = path.join(__dirname, '../fixtures');

    for (let i = 1; i <= 3; i++) {
      const filePath = path.join(testDir, `test-file-${i}.md`);
      await page.evaluate((fp) => {
        return window.electronAPI?.file?.read({ filePath: fp });
      }, filePath);
      // Wait for specific content to be rendered before opening next
      await page.waitForSelector(`h1:has-text("Document ${i}")`, { timeout: 10000 });
      await page.waitForTimeout(200);
    }
  });

  test('should open multiple tabs', async () => {
    // Verify tab bar exists
    const tabBar = page.locator('[data-testid="tab-bar"]');
    await expect(tabBar).toBeVisible({ timeout: 2000 });

    // Verify 3 tabs are present
    const tabs = page.locator('[data-testid^="tab-"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBe(3);
  });

  test('should switch to next tab with Ctrl+Tab', async () => {
    // Get initial active tab
    const initialActiveTab = await page.locator('.tab--active').getAttribute('data-testid');

    // Press Ctrl+Tab
    await page.keyboard.press('Control+Tab');
    await page.waitForTimeout(100);

    // Verify active tab changed
    const newActiveTab = await page.locator('.tab--active').getAttribute('data-testid');
    expect(newActiveTab).not.toBe(initialActiveTab);
  });

  test('should switch to previous tab with Ctrl+Shift+Tab', async () => {
    // Switch to tab 2 first
    await page.keyboard.press('Control+Tab');
    await page.waitForTimeout(100);

    const currentTab = await page.locator('.tab--active').getAttribute('data-testid');

    // Press Ctrl+Shift+Tab to go back
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);

    // Verify we went back
    const previousTab = await page.locator('.tab--active').getAttribute('data-testid');
    expect(previousTab).not.toBe(currentTab);
  });

  test('should jump to specific tab with Ctrl+1, Ctrl+2, Ctrl+3', async () => {
    // Jump to tab 1 (Ctrl+1)
    await page.keyboard.press('Control+Digit1');
    await page.waitForTimeout(100);

    let activeTab = page.locator('.tab--active');
    let tabText = await activeTab.textContent();
    expect(tabText).toContain('Document 1');

    // Jump to tab 2 (Ctrl+2)
    await page.keyboard.press('Control+Digit2');
    await page.waitForTimeout(100);

    activeTab = page.locator('.tab--active');
    tabText = await activeTab.textContent();
    expect(tabText).toContain('Document 2');

    // Jump to tab 3 (Ctrl+3)
    await page.keyboard.press('Control+Digit3');
    await page.waitForTimeout(100);

    activeTab = page.locator('.tab--active');
    tabText = await activeTab.textContent();
    expect(tabText).toContain('Document 3');
  });

  test('should complete tab switch within 100ms (SC-006)', async () => {
    const startTime = Date.now();

    await page.keyboard.press('Control+Tab');

    // Wait for tab to be active
    await page.waitForSelector('.tab--active', { timeout: 1000 });

    const endTime = Date.now();
    const switchTime = endTime - startTime;

    expect(switchTime).toBeLessThan(100);
  });

  test('should close tab with Ctrl+W', async () => {
    // Get initial tab count
    const initialCount = await page.locator('[data-testid^="tab-"]').count();

    // Close current tab
    await page.keyboard.press('Control+KeyW');
    await page.waitForTimeout(100);

    // Verify tab count decreased
    const newCount = await page.locator('[data-testid^="tab-"]').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should show tab close button on hover', async () => {
    const firstTab = page.locator('[data-testid^="tab-"]').first();

    // Hover over tab
    await firstTab.hover();

    // Verify close button appears
    const closeButton = firstTab.locator('[data-testid="tab-close"]');
    await expect(closeButton).toBeVisible();
  });

  test('should display tab title from file name', async () => {
    const tabs = page.locator('[data-testid^="tab-"]');

    // Check that tab titles match file names
    const tab1Text = await tabs.nth(0).textContent();
    const tab2Text = await tabs.nth(1).textContent();
    const tab3Text = await tabs.nth(2).textContent();

    expect(tab1Text).toContain('test-file-1');
    expect(tab2Text).toContain('test-file-2');
    expect(tab3Text).toContain('test-file-3');
  });
});

/**
 * T056: E2E test for navigation history
 * Verify Alt+Left (back) and Alt+Right (forward), scroll restoration
 */
test.describe('T056: Navigation History', () => {
  test.beforeEach(async () => {
    // Open a file with links
    const testFile = path.join(__dirname, '../fixtures/test-file-3.md');
    await page.evaluate((filePath) => {
      return window.electronAPI?.file?.read({ filePath });
    }, testFile);
    // Wait for specific content to be rendered (not home page)
    await page.waitForSelector('h1:has-text("Document 3")', { timeout: 10000 });
    await page.waitForTimeout(200);
  });

  test('should navigate back with Alt+Left', async () => {
    // Click on a link to navigate
    const link = page.locator('a[href*="test-file-1.md"]').first();
    await link.click();
    await page.waitForTimeout(500);

    // Verify we're on the linked page
    const h1 = await page.locator('h1').first().textContent();
    expect(h1).toContain('Document 1');

    // Navigate back
    await page.keyboard.press('Alt+ArrowLeft');
    await page.waitForTimeout(300);

    // Verify we're back on original page
    const h1After = await page.locator('h1').first().textContent();
    expect(h1After).toContain('Document 3');
  });

  test('should navigate forward with Alt+Right', async () => {
    // Navigate via link
    const link = page.locator('a[href*="test-file-1.md"]').first();
    await link.click();
    await page.waitForTimeout(500);

    // Navigate back
    await page.keyboard.press('Alt+ArrowLeft');
    await page.waitForTimeout(300);

    // Navigate forward
    await page.keyboard.press('Alt+ArrowRight');
    await page.waitForTimeout(300);

    // Verify we're on the linked page again
    const h1 = await page.locator('h1').first().textContent();
    expect(h1).toContain('Document 1');
  });

  test('should restore scroll position when navigating history', async () => {
    // Scroll down on current page
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);

    const scrollBefore = await page.evaluate(() => {
      const viewer = document.querySelector('.markdown-viewer');
      return viewer?.scrollTop || 0;
    });

    expect(scrollBefore).toBeGreaterThan(0);

    // Navigate to another page
    const link = page.locator('a[href*="test-file-1.md"]').first();
    await link.click();
    await page.waitForTimeout(500);

    // Navigate back
    await page.keyboard.press('Alt+ArrowLeft');
    await page.waitForTimeout(300);

    // Verify scroll position was restored
    const scrollAfter = await page.evaluate(() => {
      const viewer = document.querySelector('.markdown-viewer');
      return viewer?.scrollTop || 0;
    });

    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
  });

  test('should disable back button when at start of history', async () => {
    // Try to go back when at start
    await page.keyboard.press('Alt+ArrowLeft');
    await page.waitForTimeout(100);

    // Should still be on same page (no navigation occurred)
    const h1 = await page.locator('h1').first().textContent();
    expect(h1).toContain('Document 3');
  });
});

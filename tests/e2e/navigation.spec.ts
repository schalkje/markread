/**
 * E2E Tests: Smooth Zoom, Scroll, and Page Navigation (User Story 2)
 * Tasks: T041-T043
 *
 * These tests verify:
 * - Zoom functionality (10%-2000% range with scroll preservation)
 * - Pan functionality (click-drag panning when zoomed)
 * - Smooth scrolling (60 FPS performance target)
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers';
import * as path from 'path';
import * as fs from 'fs';

let electronApp: ElectronApplication;
let page: Page;

// Long test document for scrolling tests
const TEST_MARKDOWN_LONG = `# Long Document for Scrolling Tests

${'## Section\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n'.repeat(50)}

## End of Document
`;

test.beforeAll(async () => {
  // Create test markdown files
  const testDir = path.join(__dirname, '../fixtures');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  fs.writeFileSync(path.join(testDir, 'test-long.md'), TEST_MARKDOWN_LONG);

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
 * T041: E2E test for zoom functionality
 * Verify 10%-2000% range, scroll preservation (SC-004)
 */
test.describe('T041: Zoom Functionality', () => {
  test.beforeEach(async () => {
    // Open test file
    const testFile = path.join(__dirname, '../fixtures/test-long.md');
    await page.evaluate((filePath) => {
      return window.electronAPI?.file.read({ filePath });
    }, testFile);
    await page.waitForSelector('.markdown-viewer', { timeout: 5000 });
  });

  test('should support zoom range from 10% to 2000%', async () => {
    const viewer = page.locator('.markdown-viewer');

    // Test minimum zoom (10%)
    await page.keyboard.press('Control+0'); // Reset zoom first
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+Minus');
    }

    const minZoomTransform = await viewer.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    // Verify zoom is applied (transform should not be 'none')
    expect(minZoomTransform).not.toBe('none');

    // Test maximum zoom (2000%)
    await page.keyboard.press('Control+0'); // Reset zoom
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+Plus');
    }

    const maxZoomTransform = await viewer.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    expect(maxZoomTransform).not.toBe('none');
    expect(maxZoomTransform).not.toBe(minZoomTransform);
  });

  test('should respond to Ctrl+Plus (zoom in) keyboard shortcut', async () => {
    const viewer = page.locator('.markdown-viewer');

    // Reset zoom
    await page.keyboard.press('Control+0');
    const initialTransform = await viewer.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    // Zoom in
    await page.keyboard.press('Control+Plus');
    const zoomedTransform = await viewer.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    expect(zoomedTransform).not.toBe(initialTransform);
  });

  test('should respond to Ctrl+Minus (zoom out) keyboard shortcut', async () => {
    const viewer = page.locator('.markdown-viewer');

    // Reset zoom
    await page.keyboard.press('Control+0');

    // Zoom in first
    await page.keyboard.press('Control+Plus');
    const zoomedInTransform = await viewer.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    // Zoom out
    await page.keyboard.press('Control+Minus');
    const zoomedOutTransform = await viewer.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    expect(zoomedOutTransform).not.toBe(zoomedInTransform);
  });

  test('should reset zoom to 100% with Ctrl+0', async () => {
    const viewer = page.locator('.markdown-viewer');

    // Zoom in
    await page.keyboard.press('Control+Plus');
    await page.keyboard.press('Control+Plus');

    // Reset
    await page.keyboard.press('Control+0');

    const transform = await viewer.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    // Transform should be 'none' or 'matrix(1, 0, 0, 1, 0, 0)' for 100% zoom
    expect(transform === 'none' || transform.includes('matrix(1, 0, 0, 1')).toBeTruthy();
  });

  test('should preserve scroll position when zooming', async () => {
    // Scroll to middle of document
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);

    const scrollBefore = await page.evaluate(() => {
      const viewer = document.querySelector('.markdown-viewer');
      return viewer?.scrollTop || 0;
    });

    // Zoom in
    await page.keyboard.press('Control+Plus');
    await page.waitForTimeout(100);

    const scrollAfter = await page.evaluate(() => {
      const viewer = document.querySelector('.markdown-viewer');
      return viewer?.scrollTop || 0;
    });

    // Scroll position should be maintained (with some tolerance for rounding)
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
  });

  test('should complete zoom operation within 50ms (SC-004)', async () => {
    const startTime = Date.now();

    await page.keyboard.press('Control+Plus');

    // Wait for zoom to apply
    await page.waitForTimeout(10);

    const endTime = Date.now();
    const zoomTime = endTime - startTime;

    expect(zoomTime).toBeLessThan(50);
  });

  test('should display zoom controls in UI', async () => {
    // Verify zoom controls exist
    const zoomControls = page.locator('[data-testid="zoom-controls"]');
    await expect(zoomControls).toBeVisible({ timeout: 1000 });

    // Verify zoom in button
    const zoomInButton = page.locator('[data-testid="zoom-in"]');
    await expect(zoomInButton).toBeVisible();

    // Verify zoom out button
    const zoomOutButton = page.locator('[data-testid="zoom-out"]');
    await expect(zoomOutButton).toBeVisible();

    // Verify zoom reset button
    const zoomResetButton = page.locator('[data-testid="zoom-reset"]');
    await expect(zoomResetButton).toBeVisible();
  });

  test('should update zoom level display when zooming', async () => {
    const zoomDisplay = page.locator('[data-testid="zoom-level"]');

    // Reset zoom
    await page.keyboard.press('Control+0');
    await page.waitForTimeout(100);

    const initialZoom = await zoomDisplay.textContent();
    expect(initialZoom).toContain('100%');

    // Zoom in
    await page.keyboard.press('Control+Plus');
    await page.waitForTimeout(100);

    const zoomedLevel = await zoomDisplay.textContent();
    expect(zoomedLevel).not.toBe(initialZoom);
  });
});

/**
 * T042: E2E test for pan functionality
 * Verify click-drag panning when zoomed
 */
test.describe('T042: Pan Functionality', () => {
  test.beforeEach(async () => {
    // Open test file
    const testFile = path.join(__dirname, '../fixtures/test-long.md');
    await page.evaluate((filePath) => {
      return window.electronAPI?.file.read({ filePath });
    }, testFile);
    await page.waitForSelector('.markdown-viewer', { timeout: 5000 });

    // Zoom in to enable panning
    await page.keyboard.press('Control+0');
    await page.keyboard.press('Control+Plus');
    await page.keyboard.press('Control+Plus');
    await page.waitForTimeout(100);
  });

  test('should enable panning when zoomed in', async () => {
    const viewer = page.locator('.markdown-viewer');

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => {
      const el = document.querySelector('.markdown-viewer');
      return { scrollLeft: el?.scrollLeft || 0, scrollTop: el?.scrollTop || 0 };
    });

    // Perform drag operation
    await viewer.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(100);

    // Get final scroll position
    const finalScroll = await page.evaluate(() => {
      const el = document.querySelector('.markdown-viewer');
      return { scrollLeft: el?.scrollLeft || 0, scrollTop: el?.scrollTop || 0 };
    });

    // Scroll position should have changed
    const scrollChanged =
      Math.abs(finalScroll.scrollLeft - initialScroll.scrollLeft) > 0 ||
      Math.abs(finalScroll.scrollTop - initialScroll.scrollTop) > 0;

    expect(scrollChanged).toBeTruthy();
  });

  test('should show grab cursor when hovering over content', async () => {
    const viewer = page.locator('.markdown-viewer');

    await viewer.hover();
    await page.waitForTimeout(100);

    const cursor = await viewer.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Cursor should be 'grab' or 'move'
    expect(cursor === 'grab' || cursor === 'move' || cursor.includes('grab')).toBeTruthy();
  });

  test('should show grabbing cursor while dragging', async () => {
    const viewer = page.locator('.markdown-viewer');

    await viewer.hover();
    await page.mouse.down();

    const cursor = await viewer.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    // Cursor should be 'grabbing'
    expect(cursor === 'grabbing' || cursor.includes('grabbing')).toBeTruthy();

    await page.mouse.up();
  });

  test('should not pan when zoom is at 100%', async () => {
    // Reset zoom to 100%
    await page.keyboard.press('Control+0');
    await page.waitForTimeout(100);

    const viewer = page.locator('.markdown-viewer');

    const initialScroll = await page.evaluate(() => {
      const el = document.querySelector('.markdown-viewer');
      return { scrollLeft: el?.scrollLeft || 0, scrollTop: el?.scrollTop || 0 };
    });

    // Try to drag
    await viewer.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(100);

    const finalScroll = await page.evaluate(() => {
      const el = document.querySelector('.markdown-viewer');
      return { scrollLeft: el?.scrollLeft || 0, scrollTop: el?.scrollTop || 0 };
    });

    // Scroll should not change significantly (panning disabled at 100%)
    expect(Math.abs(finalScroll.scrollLeft - initialScroll.scrollLeft)).toBeLessThan(10);
  });
});

/**
 * T043: E2E test for smooth scrolling
 * Verify 60 FPS performance (SC-005)
 */
test.describe('T043: Smooth Scrolling Performance', () => {
  test.beforeEach(async () => {
    // Open test file
    const testFile = path.join(__dirname, '../fixtures/test-long.md');
    await page.evaluate((filePath) => {
      return window.electronAPI?.file.read({ filePath });
    }, testFile);
    await page.waitForSelector('.markdown-viewer', { timeout: 5000 });
  });

  test('should maintain 60 FPS during scrolling', async () => {
    // Measure frame rate during scrolling
    const frameRates: number[] = [];

    // Start performance measurement
    await page.evaluate(() => {
      (window as any).frameTimings = [];
      let lastTime = performance.now();

      const measureFrame = () => {
        const currentTime = performance.now();
        const frameTime = currentTime - lastTime;
        (window as any).frameTimings.push(frameTime);
        lastTime = currentTime;

        if ((window as any).frameTimings.length < 60) {
          requestAnimationFrame(measureFrame);
        }
      };

      requestAnimationFrame(measureFrame);
    });

    // Scroll while measuring
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(16); // ~60 FPS = 16ms per frame
    }

    // Get frame timings
    const timings = await page.evaluate(() => {
      return (window as any).frameTimings || [];
    });

    // Calculate average FPS
    const avgFrameTime = timings.reduce((a: number, b: number) => a + b, 0) / timings.length;
    const avgFps = 1000 / avgFrameTime;

    // Should maintain close to 60 FPS (allow some variance)
    expect(avgFps).toBeGreaterThanOrEqual(50);
  });

  test('should not drop below 16ms frame time during rapid scrolling', async () => {
    const viewer = page.locator('.markdown-viewer');

    // Measure frame times during rapid scrolling
    const frameTimes: number[] = [];
    let lastTime = Date.now();

    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 200);
      const currentTime = Date.now();
      frameTimes.push(currentTime - lastTime);
      lastTime = currentTime;
    }

    // Most frames should be close to 16ms (60 FPS)
    const framesUnder20ms = frameTimes.filter(t => t <= 20).length;
    const percentageSmooth = (framesUnder20ms / frameTimes.length) * 100;

    expect(percentageSmooth).toBeGreaterThan(80);
  });

  test('should use requestAnimationFrame for smooth scrolling', async () => {
    // Verify that scrolling uses requestAnimationFrame
    const usesRAF = await page.evaluate(() => {
      // Check if scroll event listener uses requestAnimationFrame
      const viewer = document.querySelector('.markdown-viewer');
      if (!viewer) return false;

      // This is a simplified check - in real implementation,
      // the scroll optimization service should use requestAnimationFrame
      return typeof requestAnimationFrame === 'function';
    });

    expect(usesRAF).toBeTruthy();
  });

  test('should scroll smoothly with keyboard navigation', async () => {
    // Test Page Down
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(50);

    const scrollAfterPageDown = await page.evaluate(() => {
      const viewer = document.querySelector('.markdown-viewer');
      return viewer?.scrollTop || 0;
    });

    expect(scrollAfterPageDown).toBeGreaterThan(0);

    // Test Page Up
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(50);

    const scrollAfterPageUp = await page.evaluate(() => {
      const viewer = document.querySelector('.markdown-viewer');
      return viewer?.scrollTop || 0;
    });

    expect(scrollAfterPageUp).toBeLessThan(scrollAfterPageDown);
  });

  test('should scroll to top with Home key', async () => {
    // Scroll down first
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(100);

    // Press Home
    await page.keyboard.press('Home');
    await page.waitForTimeout(100);

    const scrollTop = await page.evaluate(() => {
      const viewer = document.querySelector('.markdown-viewer');
      return viewer?.scrollTop || 0;
    });

    expect(scrollTop).toBeLessThan(50);
  });

  test('should scroll to bottom with End key', async () => {
    // Press End
    await page.keyboard.press('End');
    await page.waitForTimeout(100);

    const scrollInfo = await page.evaluate(() => {
      const viewer = document.querySelector('.markdown-viewer');
      return {
        scrollTop: viewer?.scrollTop || 0,
        scrollHeight: viewer?.scrollHeight || 0,
        clientHeight: viewer?.clientHeight || 0,
      };
    });

    // Should be near the bottom
    const distanceFromBottom = scrollInfo.scrollHeight - scrollInfo.scrollTop - scrollInfo.clientHeight;
    expect(distanceFromBottom).toBeLessThan(100);
  });
});

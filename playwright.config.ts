import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Force sequential execution - each test file launches its own Electron instance
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
});

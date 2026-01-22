import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Only run unit tests, exclude e2e and screenshot tests
    include: ['tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      'tests/e2e/**',
      'tests/screenshots/**'
    ],
    // Use node environment for unit tests
    environment: 'node',
    // Global test utilities
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});

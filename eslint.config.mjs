import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'out/**',
      'build/**',
      '*.tsbuildinfo',
      'release/**',
      'coverage/**',
      '.nyc_output/**',
      'test-results/**',
      'playwright-report/**',
      '*.min.js',
      '*.bundle.js',
      '*.log',
      '.vscode/**',
      '.idea/**',
      '.DS_Store',
      'Thumbs.db',
      // Ignore spec contracts (have intentional test patterns)
      '**/specs/**',
      // Ignore test helper files
      '**/isolated-test.js',
      '**/test-*.js',
      'test-dir/**',
      '**/tests/**/*.spec.ts',
      '**/tests/**/*.test.ts',
      '**/crepo*.js',  // Ignore any corrupted file paths
    ],
  },
  // Base configuration for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        // Additional TypeScript/Electron globals
        NodeJS: 'readonly',
        EventListener: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];

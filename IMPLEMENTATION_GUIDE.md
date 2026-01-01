# Implementation Guide: Electron Redesign

**Feature**: 006-electron-redesign
**Tasks**: See [specs/006-electron-redesign/tasks.md](specs/006-electron-redesign/tasks.md)
**Current Phase**: Phase 1 - Setup

---

## Quick Start Commands

### Step 1: Run Foundation Setup (Phases 1-2)

Execute these commands to set up the foundation:

```bash
# Navigate to project root
cd C:\repo\markread

# Verify you're on the correct branch
git branch --show-current  # Should show: 006-electron-redesign
```

---

## Phase 1: Setup (Tasks T001-T008) - Parallel Execution

**Goal**: Initialize Electron + React + TypeScript project structure

### T001: Create Project Structure

```bash
# Create directory structure per plan.md
mkdir -p src/main src/renderer/components/editor src/renderer/components/sidebar src/renderer/components/command-palette src/renderer/components/settings src/renderer/components/markdown src/renderer/components/search src/renderer/components/help src/renderer/services src/renderer/stores src/renderer/styles src/shared/types src/preload src/assets/icons src/assets/themes src/assets/docs tests/e2e tests/integration tests/unit/main tests/unit/renderer tests/unit/shared build

# Verify structure created
ls src/
```

**Mark complete**: `- [x] T001`

---

### T002: Initialize package.json

Create `package.json` with dependencies from research.md:

```json
{
  "name": "markread",
  "version": "0.1.0",
  "description": "Electron-based markdown viewer with VS Code-like features",
  "main": "dist/main/index.js",
  "author": "MarkRead",
  "license": "MIT",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-builder",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "test": "npm run test:unit && npm run test:e2e",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test:integration": "vitest run tests/integration"
  },
  "dependencies": {
    "electron": "39.2.7",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.5.0",
    "markdown-it": "^14.1.0",
    "markdown-it-task-lists": "^2.1.1",
    "highlight.js": "^11.11.1",
    "mermaid": "^11.12.2",
    "dompurify": "^3.3.1",
    "isomorphic-dompurify": "^2.16.0",
    "chokidar": "^5.0.0",
    "@tanstack/react-virtual": "^3.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "electron-playwright-helpers": "^1.0.0",
    "electron-vite": "^2.0.0",
    "electron-builder": "^24.9.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vitest": "^1.0.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

```bash
# Save the file, then install dependencies
npm install

# This takes 2-3 minutes
```

**Mark complete**: `- [x] T002`

---

### T003: Install Build Tools (Parallel with T004-T007)

Already included in package.json above.

**Mark complete**: `- [x] T003`

---

### T004: Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/renderer/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

Create `tsconfig.node.json` for main process:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node"
  },
  "include": ["src/main/**/*.ts", "src/preload/**/*.ts"]
}
```

**Mark complete**: `- [x] T004`

---

### T005: Setup ESLint and Prettier

Create `.eslintrc.json`:

```json
{
  "root": true,
  "env": {
    "browser": true,
    "node": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2021,
    "parser": "@typescript-eslint/parser",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-console": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off"
  }
}
```

Create `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**Mark complete**: `- [x] T005`

---

### T006: Create electron-vite.config.ts

Create `electron-vite.config.ts`:

```typescript
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
  },
});
```

**Mark complete**: `- [x] T006`

---

### T007: Configure Playwright E2E Testing

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
});
```

**Mark complete**: `- [x] T007`

---

### T008: Create electron-builder.yml

Create `build/electron-builder.yml`:

```yaml
appId: com.markread.app
productName: MarkRead
directories:
  output: release
  buildResources: build
files:
  - dist/**/*
  - package.json
win:
  target:
    - target: nsis
      arch:
        - x64
  icon: build/icon.ico
  artifactName: MarkRead-Setup-${version}.exe
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  installerIcon: build/icon.ico
  uninstallerIcon: build/icon.ico
compression: maximum
```

**Mark complete**: `- [x] T008`

---

## Phase 1 Checkpoint ✅

Verify Phase 1 completion:

```bash
# Should pass with no errors
npm run type-check
npm run lint
```

If successful, Phase 1 is complete!

---

## Phase 2: Foundational (Tasks T009-T020)

**⚠️ CRITICAL**: This phase BLOCKS all user stories. Must complete before any feature work.

### Quick Parallel Execution Strategy

**Parallel Group 1** (can do simultaneously):
- T009: BrowserWindow security config
- T012: CSP setup
- T017: Entity types
- T018: IPC contract types
- T020: Logging

**Parallel Group 2** (after Group 1):
- T013: React app setup
- T014: React Router
- T015: Zustand stores

**Sequential** (depend on above):
- T010: Preload script (depends on T018 IPC types)
- T011: IPC handlers (depends on T017, T018 types)
- T016: Base layout (depends on T013 React app)
- T019: Error handler (depends on T020 logging)

I'll create starter files for these tasks next. Would you like me to:

1. **Generate all Phase 2 foundation files now** (main/index.ts, preload/index.ts, shared types, etc.)
2. **Start with just the first parallel group** (T009, T012, T017, T018, T020)
3. **Create a script to auto-generate the foundation** (faster setup)

---

## For Parallel Team Execution

If you have multiple developers:

**Developer A** (after Phase 2 completes):
- Phase 3: User Story 1 (T021-T040) - Markdown Rendering
- Phase 4: User Story 2 (T041-T054) - Zoom/Scroll/Pan

**Developer B** (after Phase 2 completes):
- Phase 5: User Story 3 (T055-T073) - Multi-Tab
- Phase 6: User Story 4 (T074-T092) - Keyboard Shortcuts

**Developer C** (after Phase 2 completes):
- Phase 7: User Story 5 (T093-T113) - Multi-Folder
- Phase 8: User Story 6 (T114-T126) - Themes

**All together**:
- Phase 9: User Story 7 (T127-T153) - Settings (affects all features)
- Phase 10: Polish (T154-T189)

---

## Progress Tracking

Update [tasks.md](specs/006-electron-redesign/tasks.md) by changing:
- `- [ ]` to `- [x]` for completed tasks

Example:
```markdown
- [x] T001 Create project structure per implementation plan
- [x] T002 Initialize package.json with Electron 39.2.7, React 19.2, TypeScript 5.3.0
- [ ] T003 [P] Install build tools: electron-vite 2.0.0, electron-builder
```

---

**Next**: Complete Phase 1 setup above, then I'll help you with Phase 2 foundation files.

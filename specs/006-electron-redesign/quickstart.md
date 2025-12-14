# Quick Start Guide: MarkRead Electron Redesign

**Feature**: 006-electron-redesign
**Target**: Developers implementing the Electron-based redesign
**Last Updated**: December 14, 2025

---

## Prerequisites

### Required

- **Node.js**: v22.20.0 or later (matches Electron 39 bundled version)
- **npm**: v9+ or **pnpm**: v8+ (recommended for faster installs)
- **Git**: For version control
- **Windows 10/11**: Primary development and testing platform
- **Code editor**: VS Code recommended (with Vue, TypeScript, ESLint extensions)

### Recommended

- **Windows Terminal**: For better command-line experience
- **Vue DevTools**: Browser extension for debugging
- **Electron DevTools**: Built into Electron, no install needed

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/markread.git
cd markread
git checkout 006-electron-redesign
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

**Expected install time**: 2-3 minutes

**Key dependencies installed** (from [research.md](research.md)):
- electron@39.2.7 (Chromium 142, Node 22.20.0)
- vue@^3.4.0 + vue-router + pinia
- markdown-it@^14.1.0
- highlight.js@^11.11.1
- mermaid@^11.12.2
- chokidar@^5.0.0
- @tanstack/vue-virtual@^3.0.0
- @playwright/test (dev)

### 3. Verify Installation

```bash
npm run check
```

This command:
- ✅ Verifies Node.js version
- ✅ Checks TypeScript compilation
- ✅ Runs ESLint
- ✅ Validates package.json

---

## Development Workflow

### Start Development Server

```bash
npm run dev
```

**What happens**:
1. **electron-vite** starts in watch mode
2. Main process compiles to `dist/main/`
3. Renderer process compiles to `dist/renderer/` with HMR
4. Electron app launches automatically
5. Vue DevTools available at `http://localhost:9222`

**Hot Module Replacement (HMR)** active for renderer process (Vue components update without restart).

**Main process changes** require app restart (automatic with nodemon).

### Build for Production

```bash
npm run build
```

Output: `dist/` directory with compiled code

### Package as Installer

```bash
npm run package
```

Output (Windows): `release/MarkRead-Setup-x.y.z.exe`

**Installer size target**: <150MB (see [research.md](research.md) bundle size projection)

### Run Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (Playwright)
npm run test:e2e

# All tests
npm test
```

---

## Project Structure

```
markread/
├── src/
│   ├── main/                  # Node.js main process
│   │   ├── index.ts          # Entry point
│   │   ├── window-manager.ts
│   │   ├── ipc-handlers.ts   # IPC request handlers
│   │   ├── file-watcher.ts
│   │   └── settings-manager.ts
│   │
│   ├── renderer/              # Chromium renderer process
│   │   ├── index.html        # HTML entry
│   │   ├── app.vue           # Root Vue component
│   │   ├── components/       # Vue SFC components
│   │   ├── services/         # Renderer services
│   │   └── styles/           # Global styles
│   │
│   ├── shared/                # Shared types and utilities
│   │   ├── types/            # TypeScript definitions
│   │   ├── constants.ts
│   │   └── utils/
│   │
│   ├── preload/               # Preload scripts (context bridge)
│   │   └── index.ts          # Expose IPC APIs to renderer
│   │
│   └── assets/                # Static assets
│       ├── icons/
│       ├── themes/
│       └── docs/
│
├── tests/
│   ├── e2e/                   # Playwright E2E tests
│   ├── integration/           # Cross-process tests
│   └── unit/                  # Unit tests
│
├── specs/006-electron-redesign/
│   ├── spec.md               # ← Feature specification
│   ├── plan.md               # ← Implementation plan (this workflow)
│   ├── research.md           # ← Technical research
│   ├── data-model.md         # ← Entity definitions
│   ├── quickstart.md         # ← This file
│   └── contracts/            # ← IPC API contracts
│
├── build/                     # Build configuration
│   ├── electron-builder.yml
│   └── notarize.js
│
├── electron-vite.config.ts    # Vite bundler config
├── tsconfig.json              # TypeScript config
├── package.json
└── README.md
```

**Key principle**: Clear separation between **main** (Node.js/OS APIs) and **renderer** (Vue/UI).

---

## Key Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run dev` | Start development server with HMR | Daily development |
| `npm run build` | Compile production build | Pre-packaging |
| `npm run package` | Create Windows installer | Testing installer |
| `npm run lint` | Run ESLint | Before commit |
| `npm run lint:fix` | Auto-fix linting issues | Code cleanup |
| `npm test` | Run all tests | CI/CD, pre-push |
| `npm run type-check` | TypeScript type checking | Before commit |
| `npm run preview` | Preview production build | Pre-release testing |

---

## First Steps

### 1. Understand the Architecture

Read these documents in order:
1. [spec.md](spec.md) - Feature requirements (start here)
2. [research.md](research.md) - Technical decisions and best practices
3. [data-model.md](data-model.md) - Entity definitions
4. [contracts/](contracts/) - IPC API contracts

### 2. Run the App

```bash
npm run dev
```

**Expected behavior**:
- Electron window opens (800x600px minimum)
- Empty state: "Open a folder to get started"
- File menu: Open Folder, Exit
- Help menu: Keyboard Shortcuts (F1)

### 3. Open a Test Folder

1. Press **Ctrl+O** (Open Folder)
2. Select folder with .md files
3. File tree appears in sidebar
4. Click a .md file to open in tab

### 4. Verify Rendering

Open a test markdown file with:
- [x] GitHub Flavored Markdown (tables, task lists)
- [x] Code blocks with syntax highlighting
- [x] Mermaid diagrams
- [x] Images

**Success criteria**: All elements render correctly within 500ms (SC-001).

### 5. Test Keyboard Shortcuts

- **Ctrl+F**: Find in page
- **Ctrl+Shift+P**: Command palette
- **Ctrl+B**: Toggle sidebar
- **Ctrl+Plus/Minus**: Zoom in/out
- **F1**: Keyboard shortcuts reference

### 6. Inspect with DevTools

**Renderer DevTools**: Press **F12** or **Ctrl+Shift+I**
- Vue DevTools panel available
- Inspect Vue component tree
- Check console for errors

**Main Process Debugging**:
```bash
# Add to main/index.ts:
console.log('Main process started');

# View in terminal where `npm run dev` is running
```

---

## Key Concepts

### IPC Communication

All communication between main and renderer uses **secure invoke/handle pattern**:

```typescript
// Renderer → Main (request)
const result = await window.electronAPI.file.read({
  filePath: 'C:\\path\\to\\file.md'
});

// Main → Renderer (event)
window.electronAPI.on('file:changed', (event) => {
  console.log('File changed:', event.filePath);
});
```

**See**: [contracts/](contracts/) for all IPC APIs.

### Context Isolation

Renderer process **cannot** directly access Node.js APIs. All OS/file system operations must go through IPC.

**Security**: `nodeIntegration: false`, `contextIsolation: true` (see [research.md](research.md) Section 6).

### Vue 3 Composition API

MarkRead uses Vue 3 with TypeScript:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const zoom = ref(100);

const zoomPercentage = computed(() => `${zoom.value}%`);
</script>
```

### State Management (Pinia)

Global state managed with Pinia stores:

```typescript
// stores/folders.ts
import { defineStore } from 'pinia';

export const useFoldersStore = defineStore('folders', {
  state: () => ({
    folders: [] as Folder[],
    activeFolder: null as Folder | null
  }),
  actions: {
    addFolder(folder: Folder) {
      this.folders.push(folder);
    }
  }
});
```

### Markdown Rendering Pipeline

```
Raw Markdown
  ↓
markdown-it (parse)
  ↓
Highlight.js (syntax highlighting)
  ↓
Mermaid (diagram wrapping)
  ↓
DOMPurify (sanitize HTML)
  ↓
Render to DOM
```

**See**: [research.md](research.md) Sections 9-13 for configuration details.

---

## Common Tasks

### Add a New IPC Handler

**1. Define contract** in `contracts/your-feature.contract.ts`:

```typescript
export namespace YourFeature {
  export interface DoSomethingRequest {
    channel: 'yourFeature:doSomething';
    payload: { param: string };
  }
  export interface DoSomethingResponse {
    success: boolean;
    result?: string;
  }
}
```

**2. Implement handler** in `src/main/ipc-handlers.ts`:

```typescript
import { ipcMain } from 'electron';

ipcMain.handle('yourFeature:doSomething', async (event, payload) => {
  // Validate input
  // Perform operation
  return { success: true, result: 'done' };
});
```

**3. Expose in preload** in `src/preload/index.ts`:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  yourFeature: {
    doSomething: (payload) => ipcRenderer.invoke('yourFeature:doSomething', payload)
  }
});
```

**4. Call from renderer**:

```typescript
const result = await window.electronAPI.yourFeature.doSomething({ param: 'value' });
```

### Add a New Vue Component

**1. Create component** in `src/renderer/components/YourComponent.vue`:

```vue
<template>
  <div class="your-component">
    <h2>{{ title }}</h2>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  title: string;
}

const props = defineProps<Props>();
</script>

<style scoped>
.your-component {
  padding: 1rem;
}
</style>
```

**2. Import and use** in parent component:

```vue
<template>
  <YourComponent title="Hello" />
</template>

<script setup lang="ts">
import YourComponent from './YourComponent.vue';
</script>
```

### Add a New Setting

**1. Update Settings type** in `src/shared/types/settings.d.ts`:

```typescript
export interface AppearanceSettings {
  // ... existing settings
  newSetting: string;  // Add here
}
```

**2. Update default settings** in `src/main/settings-manager.ts`:

```typescript
const DEFAULT_SETTINGS: Settings = {
  appearance: {
    // ... existing defaults
    newSetting: 'default value'
  }
};
```

**3. Add to Settings UI** in `src/renderer/components/settings/AppearancePanel.vue`:

```vue
<template>
  <SettingRow label="New Setting" description="...">
    <input v-model="settings.appearance.newSetting" />
  </SettingRow>
</template>
```

### Add a Keyboard Shortcut

**1. Define command** in `src/shared/types/commands.d.ts`:

```typescript
export const COMMANDS = {
  // ... existing commands
  YOUR_COMMAND: {
    id: 'your.command',
    label: 'Your Command',
    defaultShortcut: 'CmdOrCtrl+Shift+Y'
  }
};
```

**2. Register handler** in `src/renderer/services/command-service.ts`:

```typescript
commandService.register(COMMANDS.YOUR_COMMAND.id, () => {
  // Command implementation
});
```

**3. Add to menus** in `src/main/menu-builder.ts`:

```typescript
{
  label: 'Your Command',
  accelerator: 'CmdOrCtrl+Shift+Y',
  click: () => { /* Send IPC to trigger command */ }
}
```

---

## Troubleshooting

### App won't start

**Symptom**: `npm run dev` fails or window doesn't open

**Solutions**:
1. Check Node.js version: `node --version` (must be v22.20+)
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check for port conflicts: electron-vite uses port 9222
4. View main process logs in terminal

### HMR not working

**Symptom**: Changes to Vue components don't update without restart

**Solutions**:
1. Ensure file is in `src/renderer/` (HMR only works for renderer)
2. Check for syntax errors in console
3. Restart dev server: `Ctrl+C`, then `npm run dev`

### IPC call fails with "channel not registered"

**Symptom**: `Error: No handler registered for 'channel:name'`

**Solutions**:
1. Verify handler is registered in `src/main/ipc-handlers.ts`
2. Check channel name matches contract exactly (case-sensitive)
3. Ensure main process has started before renderer calls IPC

### TypeScript errors

**Symptom**: Red squiggly lines, type errors in editor

**Solutions**:
1. Run `npm run type-check` to see all errors
2. Update types in `src/shared/types/*.d.ts`
3. Restart TypeScript server in VS Code: **Ctrl+Shift+P** → "TypeScript: Restart TS Server"

### Markdown not rendering

**Symptom**: Markdown file opens but shows raw text or blank

**Solutions**:
1. Check console for errors (F12)
2. Verify markdown-it, Highlight.js, Mermaid loaded
3. Check Content Security Policy (CSP) errors
4. Ensure DOMPurify not blocking content

### File watcher not detecting changes

**Symptom**: External file edits don't trigger reload

**Solutions**:
1. Check `chokidar` is installed: `npm list chokidar`
2. Verify file is in watched folder (check `FileWatcher.watchedPath`)
3. Check ignorePatterns (may be excluding file)
4. Increase debounce interval in settings

### Performance issues

**Symptom**: Slow scrolling, laggy UI, high memory

**Solutions**:
1. Check for large files: Enable "Large File Warning" in settings
2. Reduce open tabs: Close tabs over soft limit (20)
3. Check virtual scrolling activated for large file trees (1000+ files)
4. Profile with Chrome DevTools: **Performance** tab, record, analyze

---

## Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Cold start | <2s | Time from `npm start` to window shown |
| Markdown rendering | <500ms | Complex doc (10+ code blocks, 5+ diagrams) |
| Tab switching | <100ms | Chrome DevTools Performance tab |
| Scrolling FPS | 60 FPS | DevTools FPS meter (Ctrl+Shift+P → "Show FPS") |
| Memory (20 tabs) | <300MB | Chrome DevTools Memory profiler |
| Installer size | <150MB | Check `release/*.exe` size |

**See**: [research.md](research.md) Section 5 for optimization strategies.

---

## Security Checklist

Before committing code, verify:

- [ ] **No `nodeIntegration: true`** in BrowserWindow config
- [ ] **Context isolation enabled** (`contextIsolation: true`)
- [ ] **All IPC handlers validate input** (use Zod schemas)
- [ ] **DOMPurify sanitizes** all markdown HTML
- [ ] **Mermaid `securityLevel: 'strict'`** set
- [ ] **CSP configured** for renderer process
- [ ] **No `eval()` or `Function()`** in renderer code
- [ ] **External links** have `rel="noopener noreferrer"`

**See**: [research.md](research.md) Section 6 for security best practices.

---

## Next Steps

Once comfortable with basics:

1. **Implement a feature** from [spec.md](spec.md) user stories (prioritized P1 → P4)
2. **Write tests** for your feature in `tests/`
3. **Submit PR** following git commit message conventions
4. **Review** [data-model.md](data-model.md) for entity relationships
5. **Explore** [contracts/](contracts/) for IPC API patterns

---

## Getting Help

- **Spec questions**: See [spec.md](spec.md) or ask in team chat
- **Technical decisions**: See [research.md](research.md)
- **Electron docs**: https://www.electronjs.org/docs
- **Vue 3 docs**: https://vuejs.org/guide
- **Debugging**: Use Vue DevTools + Chrome DevTools (F12)

---

**Happy coding! 🚀**

---

**Generated**: December 14, 2025
**Feature**: 006-electron-redesign

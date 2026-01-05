# markread Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-29

## Active Technologies
- TypeScript 5.7 with Node.js (Electron 33.4.11) + React 18.3.1, Zustand 4.5.0, markdown-it 14.1.0, Zod 3.22.0, react-router-dom 6.20.0 (001-git-repo-integration)
- File system cache (AppData folder), OS credential manager (Windows Credential Manager/macOS Keychain/Linux Secret Service) (001-git-repo-integration)

- JavaScript/TypeScript with Node.js + Electron 39.2.7 (main framework), React 18.3.0 (UI framework), Zustand 4.5.0 (state management), markdown-it 14.1.0 (markdown parsing), Highlight.js 11.11.1 (syntax highlighting), Mermaid.js 11.12.2 (diagram rendering), chokidar 5.0.0 (file watching) (006-electron-redesign)
- axios (HTTP client), better-sqlite3 (cache storage), p-retry (exponential backoff), Electron safeStorage API (credential encryption) (001-git-repo-integration)

## Project Structure

```text
src/
tests/
```

## Commands

npm test; npm run lint

## Code Style

JavaScript/TypeScript with Node.js + Electron + React: Follow standard conventions with React functional components and hooks

## Recent Changes
- 001-git-repo-integration: Added TypeScript 5.7 with Node.js (Electron 33.4.11) + React 18.3.1, Zustand 4.5.0, markdown-it 14.1.0, Zod 3.22.0, react-router-dom 6.20.0

- 001-git-repo-integration: Added axios (HTTP client), better-sqlite3 (cache storage), p-retry (exponential backoff), Electron safeStorage API (credential encryption)
- 006-electron-redesign: Added JavaScript/TypeScript with Node.js + Electron 39.2.7 (main framework), React 18.3.0 (UI framework), Zustand 4.5.0 (state management), markdown-it 14.1.0 (markdown parsing), Highlight.js 11.11.1 (syntax highlighting), Mermaid.js 11.12.2 (diagram rendering), chokidar 5.0.0 (file watching)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

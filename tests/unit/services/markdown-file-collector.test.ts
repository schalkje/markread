/**
 * Unit Tests: markdown file collection for folder/repository export (issue #23)
 *
 * Verifies that browsing folder exclusions and export-only exclusions are
 * applied (union) when collecting files, for local folders and repository trees.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  collectMarkdownFilesFromFolder,
  collectMarkdownFilesFromTree,
  extractTitle,
  isMarkdownFile,
} from '../../../src/main/services/export/markdown-file-collector';
import {
  createExportExclusionFilter,
  createExclusionPattern,
} from '../../../src/shared/utils/export-exclusions';
import type { TreeNode } from '../../../src/shared/types/repository';

let root: string;

function write(relative: string, content = '# doc'): void {
  const full = path.join(root, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'markread-collect-'));
  write('README.md');
  write('CLAUDE.md');
  write('Guide.md');
  write('My Docs/Intro.md');
  write('My Docs/COPILOT.md');
  write('My Docs/notes.txt');
  write('My Docs/Deep Dir/deep.md');
  write('.hidden/secret.md');
  write('node_modules/pkg.md');
  write('dist/out.md');
  write('.github/workflow.md');
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const rel = (files: { relativePath: string }[]) =>
  files.map((f) => f.relativePath.replace(/\\/g, '/'));

describe('collectMarkdownFilesFromFolder', () => {
  it('collects markdown files, skipping hidden and built-in excluded folders by default', async () => {
    const files = await collectMarkdownFilesFromFolder(root, { includeSubfolders: true });
    expect(rel(files)).toEqual([
      'CLAUDE.md',
      'Guide.md',
      'README.md',
      'My Docs/COPILOT.md',
      'My Docs/Intro.md',
      'My Docs/Deep Dir/deep.md',
    ]);
    // Sequential export order
    expect(files.map((f) => f.order)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('leaves out files matched by export exclusions (no page, no TOC entry)', async () => {
    const filter = createExportExclusionFilter({
      exportExclusions: [createExclusionPattern('CLAUDE.md'), createExclusionPattern('copilot.md')],
    });
    const files = await collectMarkdownFilesFromFolder(root, { includeSubfolders: true, filter });
    expect(rel(files)).toEqual(['Guide.md', 'README.md', 'My Docs/Intro.md', 'My Docs/Deep Dir/deep.md']);
  });

  it('excludes a folder and everything under it', async () => {
    const filter = createExportExclusionFilter({
      exportExclusions: [createExclusionPattern('My Docs')],
    });
    const files = await collectMarkdownFilesFromFolder(root, { includeSubfolders: true, filter });
    expect(rel(files)).toEqual(['CLAUDE.md', 'Guide.md', 'README.md']);
  });

  it('supports glob patterns for folders nested deeper', async () => {
    const filter = createExportExclusionFilter({
      exportExclusions: [createExclusionPattern('deep*')],
    });
    const files = await collectMarkdownFilesFromFolder(root, { includeSubfolders: true, filter });
    expect(rel(files)).not.toContain('My Docs/Deep Dir/deep.md');
    expect(rel(files)).toContain('My Docs/Intro.md');
  });

  it('honours the user browsing exclusions instead of the built-in list', async () => {
    const filter = createExportExclusionFilter({ browsingExclusions: [] });
    const files = await collectMarkdownFilesFromFolder(root, { includeSubfolders: true, filter });
    // User cleared their browsing exclusions, so node_modules and dist are exported too
    expect(rel(files)).toContain('node_modules/pkg.md');
    expect(rel(files)).toContain('dist/out.md');
    // Hidden folders stay hidden
    expect(rel(files)).not.toContain('.hidden/secret.md');
    expect(rel(files)).not.toContain('.github/workflow.md');
  });

  it('puts default files first, in configured order', async () => {
    const files = await collectMarkdownFilesFromFolder(root, {
      includeSubfolders: false,
      defaultFilesToOpen: [
        { id: '1', filename: 'Guide.md', isEnabled: true },
        { id: '2', filename: 'CLAUDE.md', isEnabled: false },
      ],
    });
    expect(rel(files)).toEqual(['Guide.md', 'CLAUDE.md', 'README.md']);
  });

  it('only collects root files when subfolders are not included', async () => {
    const files = await collectMarkdownFilesFromFolder(root, { includeSubfolders: false });
    expect(rel(files)).toEqual(['CLAUDE.md', 'Guide.md', 'README.md']);
  });
});

function file(p: string): TreeNode {
  return { path: p, type: 'file', size: 1, isMarkdown: isMarkdownFile(p) };
}
function dir(p: string, children: TreeNode[]): TreeNode {
  return { path: p, type: 'directory', size: 0, isMarkdown: false, children };
}

const tree: TreeNode[] = [
  file('README.md'),
  file('CLAUDE.md'),
  dir('docs', [
    file('docs/guide.md'),
    file('docs/AGENTS.md'),
    dir('docs/internal', [file('docs/internal/secret.md')]),
  ]),
  dir('node_modules', [file('node_modules/x.md')]),
];

describe('collectMarkdownFilesFromTree', () => {
  it('flattens a repository tree, files before folders, skipping built-in excluded folders', () => {
    const files = collectMarkdownFilesFromTree(tree, { includeSubfolders: true });
    expect(files.map((f) => f.path)).toEqual([
      'CLAUDE.md',
      'README.md',
      'docs/AGENTS.md',
      'docs/guide.md',
      'docs/internal/secret.md',
    ]);
    expect(files.map((f) => f.relativePath)).toEqual(files.map((f) => f.path));
  });

  it('applies export exclusions to files and folders in repositories too', () => {
    const filter = createExportExclusionFilter({
      exportExclusions: [
        createExclusionPattern('CLAUDE.md'),
        createExclusionPattern('agents.md'),
        createExclusionPattern('internal'),
      ],
    });
    const files = collectMarkdownFilesFromTree(tree, { includeSubfolders: true, filter });
    expect(files.map((f) => f.path)).toEqual(['README.md', 'docs/guide.md']);
    expect(files.map((f) => f.order)).toEqual([0, 1]);
  });

  it('exports a subfolder with paths relative to it', () => {
    const files = collectMarkdownFilesFromTree(tree, { includeSubfolders: true, subfolderPath: 'docs' });
    expect(files.map((f) => f.relativePath)).toEqual(['AGENTS.md', 'guide.md', 'internal/secret.md']);
  });

  it('never excludes the exported subfolder itself, only folders inside it', () => {
    const filter = createExportExclusionFilter({
      exportExclusions: [createExclusionPattern('docs'), createExclusionPattern('internal')],
    });
    const files = collectMarkdownFilesFromTree(tree, { includeSubfolders: true, subfolderPath: 'docs', filter });
    expect(files.map((f) => f.relativePath)).toEqual(['AGENTS.md', 'guide.md']);
  });
});

describe('helpers', () => {
  it('recognises markdown extensions', () => {
    expect(isMarkdownFile('a.md')).toBe(true);
    expect(isMarkdownFile('a.MARKDOWN')).toBe(true);
    expect(isMarkdownFile('a.txt')).toBe(false);
  });

  it('prettifies file names into titles', () => {
    expect(extractTitle('my-file_name.md')).toBe('My File Name');
  });
});

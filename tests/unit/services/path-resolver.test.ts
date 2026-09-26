/**
 * Unit Tests: resolveLinkPath (issue #23 — paths with spaces)
 *
 * Builds a temp folder with names containing spaces, `%`, `#` and non-ASCII
 * characters and checks that hrefs as emitted by markdown-it resolve to the
 * files on disk.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { resolveLinkPath } from '../../../src/main/services/path-resolver';

let root: string;
let basePath: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'markread-resolve-'));
  basePath = path.join(root, 'base.md');
  fs.writeFileSync(basePath, '# base');

  const folder = path.join(root, 'My Folder');
  fs.mkdirSync(folder);
  for (const name of ['My File.md', '100%.md', 'C#.md', 'été.md', 'image one.png']) {
    fs.writeFileSync(path.join(folder, name), name);
  }

  // A file literally named with a percent sequence
  fs.writeFileSync(path.join(root, 'literal%20name.md'), 'literal');

  const withReadme = path.join(root, 'Docs With Readme');
  fs.mkdirSync(withReadme);
  fs.writeFileSync(path.join(withReadme, 'README.md'), '# readme');

  fs.mkdirSync(path.join(root, 'Empty Dir'));
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('resolveLinkPath', () => {
  it('resolves a percent-encoded href to a file in a folder with spaces', async () => {
    const result = await resolveLinkPath(basePath, 'My%20Folder/My%20File.md');
    expect(result.success).toBe(true);
    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(false);
    expect(result.absolutePath).toBe(path.join(root, 'My Folder', 'My File.md'));
  });

  it('resolves a raw href with spaces (as written with <…>)', async () => {
    const result = await resolveLinkPath(basePath, 'My Folder/My File.md');
    expect(result.exists).toBe(true);
    expect(result.absolutePath).toBe(path.join(root, 'My Folder', 'My File.md'));
  });

  it('resolves encoded percent, hash and non-ASCII names', async () => {
    expect((await resolveLinkPath(basePath, 'My%20Folder/100%25.md')).exists).toBe(true);
    expect((await resolveLinkPath(basePath, 'My%20Folder/C%23.md')).exists).toBe(true);
    const nonAscii = await resolveLinkPath(basePath, 'My%20Folder/%C3%A9t%C3%A9.md');
    expect(nonAscii.exists).toBe(true);
    expect(nonAscii.absolutePath).toBe(path.join(root, 'My Folder', 'été.md'));
  });

  it('resolves image references the same way', async () => {
    const result = await resolveLinkPath(basePath, 'My%20Folder/image%20one.png');
    expect(result.exists).toBe(true);
    expect(result.absolutePath).toBe(path.join(root, 'My Folder', 'image one.png'));
  });

  it('falls back to the raw name when the decoded one does not exist', async () => {
    const result = await resolveLinkPath(basePath, 'literal%20name.md');
    expect(result.exists).toBe(true);
    expect(result.absolutePath).toBe(path.join(root, 'literal%20name.md'));
  });

  it('maps a folder with a README to that README', async () => {
    const result = await resolveLinkPath(basePath, 'Docs%20With%20Readme');
    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(false);
    expect(result.absolutePath).toBe(path.join(root, 'Docs With Readme', 'README.md'));
  });

  it('reports a folder without README as a directory for listing', async () => {
    const result = await resolveLinkPath(basePath, 'Empty%20Dir');
    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(true);
    expect(result.absolutePath).toBe(path.join(root, 'Empty Dir'));
  });

  it('returns exists=false (decoded path) for a missing file', async () => {
    const result = await resolveLinkPath(basePath, 'My%20Folder/missing%20file.md');
    expect(result.success).toBe(true);
    expect(result.exists).toBe(false);
    expect(result.absolutePath).toBe(path.join(root, 'My Folder', 'missing file.md'));
  });

  it('resolves relative to the directory of the base file', async () => {
    const nested = path.join(root, 'My Folder', 'My File.md');
    const result = await resolveLinkPath(nested, 'C%23.md');
    expect(result.absolutePath).toBe(path.join(root, 'My Folder', 'C#.md'));
  });

  it('rejects paths that still contain ".." after resolution', async () => {
    const result = await resolveLinkPath(basePath, 'weird..name.md');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/traversal/i);
  });
});

/**
 * Unit Tests: generated directory listing markdown (issue #23)
 *
 * Renders the generated markdown with the same markdown-it options the
 * viewer uses (linkify on) and checks that every entry becomes a real link
 * whose href decodes back to the original file/folder name.
 */

import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import { generateDirectoryListingMarkdown } from '../../../src/shared/utils/directory-listing';
import { decodeLinkPath } from '../../../src/shared/utils/link-paths';

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

function hrefsOf(html: string): string[] {
  return Array.from(html.matchAll(/<a[^>]*href="([^"]*)"/g)).map((m) => m[1]);
}

describe('generateDirectoryListingMarkdown', () => {
  const items = [
    { name: 'Sub Folder', isDirectory: true },
    { name: 'plain', isDirectory: true },
    { name: 'My File.md', isDirectory: false },
    { name: '100%.md', isDirectory: false },
    { name: 'C#.md', isDirectory: false },
    { name: 'été.md', title: 'Été', isDirectory: false },
    { name: 'notes (draft).md', isDirectory: false },
  ];

  it('produces a working link for every entry, including names with spaces', () => {
    const markdown = generateDirectoryListingMarkdown({ dirName: 'Docs', items });
    const html = md.render(markdown);
    const hrefs = hrefsOf(html);

    expect(hrefs).toHaveLength(items.length);
    expect(html).not.toContain('http://');

    const decoded = hrefs.map((h) => decodeLinkPath(h));
    expect(decoded).toEqual([
      'Sub Folder/',
      'plain/',
      'My File.md',
      '100%.md',
      'C#.md',
      'été.md',
      'notes (draft).md',
    ]);
  });

  it('keeps the trailing slash on folder links so the viewer forces a listing', () => {
    const markdown = generateDirectoryListingMarkdown({ dirName: 'Docs', items });
    const hrefs = hrefsOf(md.render(markdown));
    expect(hrefs[0]).toBe('Sub%20Folder/');
    expect(hrefs[0].endsWith('/')).toBe(true);
  });

  it('uses the title as label when present and escapes brackets in labels', () => {
    const markdown = generateDirectoryListingMarkdown({
      dirName: 'Docs',
      items: [{ name: 'x.md', title: 'Spec [v2]', isDirectory: false }],
    });
    const html = md.render(markdown);
    expect(html).toContain('>Spec [v2]</a>');
    expect(hrefsOf(html)).toEqual(['x.md']);
  });

  it('adds a back link to the parent listing only when a title is given', () => {
    const withBack = generateDirectoryListingMarkdown({ dirName: 'Docs', items: [], backLinkTitle: 'Home' });
    expect(hrefsOf(md.render(withBack))).toEqual(['../']);
    expect(withBack).toContain('Back to: Home');

    const withoutBack = generateDirectoryListingMarkdown({ dirName: 'Docs', items: [] });
    expect(hrefsOf(md.render(withoutBack))).toEqual([]);
  });

  it('groups folders before files under their own headings', () => {
    const markdown = generateDirectoryListingMarkdown({ dirName: 'Docs', items });
    expect(markdown.indexOf('## Folders')).toBeLessThan(markdown.indexOf('## Files'));
    expect(markdown.startsWith('# Docs\n')).toBe(true);
  });
});

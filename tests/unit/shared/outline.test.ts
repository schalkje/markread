/**
 * Unit Tests: outline model (issue #25 — outline side panel)
 */

import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import {
  buildOutlineTree,
  collectParentIds,
  countOutlineHeadings,
  createSlugRegistry,
  filterOutlineTree,
  findParentRowIndex,
  flattenOutlineTree,
  headingIdsPlugin,
  slugifyHeading,
  type OutlineHeading,
} from '../../../src/shared/utils/outline';

function render(markdown: string): { html: string; headings: OutlineHeading[] } {
  const md = new MarkdownIt({ typographer: true, html: true });
  md.use(headingIdsPlugin);
  const env: { headings?: OutlineHeading[] } = {};
  const html = md.render(markdown, env);
  return { html, headings: env.headings ?? [] };
}

function h(level: number, text: string, index: number): OutlineHeading {
  return { id: `${slugifyHeading(text)}-${index}`, level, text, index };
}

describe('slugifyHeading', () => {
  it('lowercases and hyphenates like GitHub', () => {
    expect(slugifyHeading('Installation Guide')).toBe('installation-guide');
    expect(slugifyHeading('  Getting Started!  ')).toBe('getting-started');
    expect(slugifyHeading('API (v2.0)')).toBe('api-v20');
  });

  it('drops emoji and keeps non-ASCII letters', () => {
    expect(slugifyHeading('🚀 Quick Start')).toBe('quick-start');
    expect(slugifyHeading('Été à Paris')).toBe('été-à-paris');
  });

  it('falls back when nothing is left', () => {
    expect(slugifyHeading('🎉')).toBe('section');
    expect(slugifyHeading('')).toBe('section');
  });
});

describe('createSlugRegistry', () => {
  it('appends numeric suffixes for duplicates', () => {
    const registry = createSlugRegistry();
    expect(registry.claim('title')).toBe('title');
    expect(registry.claim('title')).toBe('title-1');
    expect(registry.claim('title')).toBe('title-2');
  });

  it('never collides with seeded ids', () => {
    const registry = createSlugRegistry(['intro', 'intro-1']);
    expect(registry.claim('intro')).toBe('intro-2');
    expect(registry.has('intro-1')).toBe(true);
  });
});

describe('headingIdsPlugin', () => {
  it('assigns ids to rendered headings and collects them in env', () => {
    const { html, headings } = render('# Title\n\n## Section One\n\ntext\n\n### Sub');
    expect(html).toContain('<h1 id="title">Title</h1>');
    expect(html).toContain('<h2 id="section-one">Section One</h2>');
    expect(headings).toEqual([
      { id: 'title', level: 1, text: 'Title', index: 0 },
      { id: 'section-one', level: 2, text: 'Section One', index: 1 },
      { id: 'sub', level: 3, text: 'Sub', index: 2 },
    ]);
  });

  it('de-duplicates identical headings', () => {
    const { html, headings } = render('## Duplicate\n\n## Duplicate\n\n## Duplicate');
    expect(headings.map((x) => x.id)).toEqual(['duplicate', 'duplicate-1', 'duplicate-2']);
    expect(html).toContain('id="duplicate-1"');
    expect(html).toContain('id="duplicate-2"');
  });

  it('strips inline markdown but keeps code text and emoji', () => {
    const { headings } = render('## Getting `started` with *emphasis* and a [link](https://x.y) 🚀');
    expect(headings[0].text).toBe('Getting started with emphasis and a link 🚀');
    expect(headings[0].id).toBe('getting-started-with-emphasis-and-a-link');
  });

  it('uses image alt text and ignores inline html', () => {
    const { headings } = render('## Icon ![alt text](img.png) <b>bold</b> done');
    expect(headings[0].text).toBe('Icon alt text bold done');
  });

  it('supports setext headings', () => {
    const { headings } = render('Heading 1\n=========\n\nHeading 2\n---------');
    expect(headings.map((x) => [x.level, x.id])).toEqual([
      [1, 'heading-1'],
      [2, 'heading-2'],
    ]);
  });

  it('starts a fresh registry per render', () => {
    expect(render('# Same').headings[0].id).toBe('same');
    expect(render('# Same').headings[0].id).toBe('same');
  });
});

describe('buildOutlineTree', () => {
  it('nests by relative level (h1 -> h3 -> h2)', () => {
    const tree = buildOutlineTree([h(1, 'Root', 0), h(3, 'Deep', 1), h(2, 'Mid', 2)]);
    expect(tree).toHaveLength(1);
    const root = tree[0];
    expect(root.depth).toBe(0);
    expect(root.children.map((c) => [c.text, c.depth])).toEqual([
      ['Deep', 1],
      ['Mid', 1],
    ]);
  });

  it('handles documents that start below h1 and siblings at the top level', () => {
    const tree = buildOutlineTree([h(2, 'A', 0), h(3, 'A.1', 1), h(2, 'B', 2), h(1, 'Top', 3), h(4, 'Top.x', 4)]);
    expect(tree.map((n) => n.text)).toEqual(['A', 'B', 'Top']);
    expect(tree[0].children.map((n) => n.text)).toEqual(['A.1']);
    expect(tree[2].children.map((n) => [n.text, n.depth])).toEqual([['Top.x', 1]]);
  });

  it('drops headings deeper than the max depth and counts only the rest', () => {
    const headings = [h(1, 'Root', 0), h(2, 'Mid', 1), h(3, 'Deep', 2), h(4, 'Deeper', 3), h(2, 'Mid 2', 4)];
    const tree = buildOutlineTree(headings, 2);
    expect(tree[0].children.map((n) => n.text)).toEqual(['Mid', 'Mid 2']);
    expect(tree[0].children[0].children).toHaveLength(0);
    expect(countOutlineHeadings(headings, 2)).toBe(3);
    expect(countOutlineHeadings(headings, 6)).toBe(5);
  });

  it('clamps out-of-range depths', () => {
    const headings = [h(1, 'Root', 0), h(2, 'Mid', 1)];
    expect(buildOutlineTree(headings, 0)[0].children).toHaveLength(0); // clamped to 1
    expect(buildOutlineTree(headings, 99)[0].children).toHaveLength(1); // clamped to 6
    expect(countOutlineHeadings(headings, Number.NaN)).toBe(2);
  });
});

describe('filterOutlineTree / flattenOutlineTree', () => {
  const tree = buildOutlineTree([
    h(1, 'Guide', 0),
    h(2, 'Install', 1),
    h(3, 'Windows Setup', 2),
    h(3, 'macOS Setup', 3),
    h(2, 'Usage', 4),
  ]);

  it('keeps matching entries and their ancestors, case-insensitively', () => {
    const filtered = filterOutlineTree(tree, 'WINDOWS');
    expect(filtered.map((n) => n.text)).toEqual(['Guide']);
    expect(filtered[0].children.map((n) => n.text)).toEqual(['Install']);
    expect(filtered[0].children[0].children.map((n) => n.text)).toEqual(['Windows Setup']);
  });

  it('hides non-matching descendants of a match', () => {
    const filtered = filterOutlineTree(tree, 'install');
    expect(filtered[0].children[0].children).toHaveLength(0);
  });

  it('returns the whole tree for a blank query', () => {
    expect(filterOutlineTree(tree, '   ')).toBe(tree);
  });

  it('flattens while respecting collapsed ids, and ignores them when forced', () => {
    const collapsed = new Set(['install-1']);
    expect(flattenOutlineTree(tree, collapsed).map((r) => r.node.text)).toEqual(['Guide', 'Install', 'Usage']);
    expect(flattenOutlineTree(tree, collapsed, true).map((r) => r.node.text)).toEqual([
      'Guide',
      'Install',
      'Windows Setup',
      'macOS Setup',
      'Usage',
    ]);
    const installRow = flattenOutlineTree(tree, collapsed)[1];
    expect(installRow.hasChildren).toBe(true);
    expect(installRow.expanded).toBe(false);
  });

  it('lists parent ids and finds the parent row', () => {
    expect(collectParentIds(tree)).toEqual(['guide-0', 'install-1']);
    const rows = flattenOutlineTree(tree, new Set());
    expect(findParentRowIndex(rows, 3)).toBe(1); // macOS Setup -> Install
    expect(findParentRowIndex(rows, 0)).toBe(-1);
  });
});

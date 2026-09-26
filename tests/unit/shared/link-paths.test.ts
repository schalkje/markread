/**
 * Unit Tests: link path helpers (issue #23 — paths with spaces)
 */

import { describe, it, expect } from 'vitest';
import {
  decodeLinkPath,
  encodeLinkDestination,
  toMdFileUrl,
} from '../../../src/shared/utils/link-paths';

describe('decodeLinkPath', () => {
  it('decodes percent-encoded spaces and separators', () => {
    expect(decodeLinkPath('My%20Folder/My%20File.md')).toBe('My Folder/My File.md');
  });

  it('decodes non-ASCII sequences', () => {
    expect(decodeLinkPath('%C3%A9t%C3%A9.md')).toBe('été.md');
  });

  it('decodes encoded hash and percent signs', () => {
    expect(decodeLinkPath('C%23.md')).toBe('C#.md');
    expect(decodeLinkPath('100%25.md')).toBe('100%.md');
  });

  it('returns the raw value for a malformed sequence', () => {
    expect(decodeLinkPath('100%.md')).toBe('100%.md');
    expect(decodeLinkPath('bad%2')).toBe('bad%2');
  });

  it('returns the input unchanged when nothing is encoded', () => {
    expect(decodeLinkPath('plain/file.md')).toBe('plain/file.md');
  });
});

describe('encodeLinkDestination', () => {
  it('encodes spaces', () => {
    expect(encodeLinkDestination('My File.md')).toBe('My%20File.md');
  });

  it('encodes percent, hash and question mark', () => {
    expect(encodeLinkDestination('100%.md')).toBe('100%25.md');
    expect(encodeLinkDestination('C#.md')).toBe('C%23.md');
    expect(encodeLinkDestination('what?.md')).toBe('what%3F.md');
  });

  it('encodes parentheses and other markdown-sensitive characters', () => {
    expect(encodeLinkDestination('notes (draft).md')).toBe('notes%20%28draft%29.md');
    expect(encodeLinkDestination("it's *bold*!.md")).toBe('it%27s%20%2Abold%2A%21.md');
  });

  it('encodes non-ASCII characters as UTF-8', () => {
    expect(encodeLinkDestination('été.md')).toBe('%C3%A9t%C3%A9.md');
  });

  it('round-trips through decodeLinkPath', () => {
    const names = ['My File.md', '100%.md', 'C#.md', 'été.md', 'a (b) [c].md', 'Sub Folder'];
    for (const name of names) {
      expect(decodeLinkPath(encodeLinkDestination(name))).toBe(name);
    }
  });
});

describe('toMdFileUrl', () => {
  it('normalizes backslashes and encodes spaces', () => {
    expect(toMdFileUrl('C:\\Docs\\My Folder\\image.png')).toBe('mdfile:///C:/Docs/My%20Folder/image.png');
  });

  it('escapes hash and question mark so they are not parsed as fragment/query', () => {
    const url = toMdFileUrl('C:/Docs/Issue #1/what?.png');
    expect(url).toBe('mdfile:///C:/Docs/Issue%20%231/what%3F.png');
    expect(url).not.toContain('#');
    expect(url).not.toContain('?');
  });

  it('decodes back to the original path (as the protocol handler does)', () => {
    const original = 'C:/Docs/Issue #1/été/what?.png';
    const url = toMdFileUrl(original);
    expect(decodeURIComponent(url.replace(/^mdfile:\/\/\//, ''))).toBe(original);
  });
});

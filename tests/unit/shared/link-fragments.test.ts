/**
 * Unit Tests: link fragment helpers (issue #29 — new page, go to top / deep links)
 */

import { describe, it, expect } from 'vitest';
import {
  splitHrefFragment,
  decodeFragment,
  isSameFilePath,
  matchHeadingId,
} from '../../../src/shared/utils/link-fragments';

describe('splitHrefFragment', () => {
  it('returns the whole href as path when there is no fragment', () => {
    expect(splitHrefFragment('page-b.md')).toEqual({ path: 'page-b.md', fragment: null });
    expect(splitHrefFragment('../dir/page.md')).toEqual({ path: '../dir/page.md', fragment: null });
  });

  it('splits path and fragment', () => {
    expect(splitHrefFragment('page-b.md#section-two')).toEqual({ path: 'page-b.md', fragment: 'section-two' });
    expect(splitHrefFragment('../dir/page.md#intro')).toEqual({ path: '../dir/page.md', fragment: 'intro' });
  });

  it('percent-decodes the fragment', () => {
    expect(splitHrefFragment('page.md#caf%C3%A9-section')).toEqual({ path: 'page.md', fragment: 'café-section' });
    expect(splitHrefFragment('page.md#section%20two')).toEqual({ path: 'page.md', fragment: 'section two' });
  });

  it('keeps a malformed percent sequence as written', () => {
    expect(splitHrefFragment('page.md#100%')).toEqual({ path: 'page.md', fragment: '100%' });
  });

  it('treats an empty fragment as no fragment', () => {
    expect(splitHrefFragment('page.md#')).toEqual({ path: 'page.md', fragment: null });
  });

  it('leaves the path part encoded for the resolver', () => {
    expect(splitHrefFragment('My%20Folder/My%20File.md#Setup')).toEqual({ path: 'My%20Folder/My%20File.md', fragment: 'Setup' });
  });

  it('keeps trailing slashes on directory links', () => {
    expect(splitHrefFragment('docs/#intro')).toEqual({ path: 'docs/', fragment: 'intro' });
    expect(splitHrefFragment('docs/')).toEqual({ path: 'docs/', fragment: null });
  });

  it('returns an empty path for same-document anchors', () => {
    expect(splitHrefFragment('#setup')).toEqual({ path: '', fragment: 'setup' });
    expect(splitHrefFragment('#2-numbered')).toEqual({ path: '', fragment: '2-numbered' });
    expect(splitHrefFragment('#')).toEqual({ path: '', fragment: null });
  });

  it('splits on the first hash only', () => {
    expect(splitHrefFragment('page.md#a#b')).toEqual({ path: 'page.md', fragment: 'a#b' });
  });
});

describe('decodeFragment', () => {
  it('decodes, falls back on malformed input and maps empty to null', () => {
    expect(decodeFragment('%C3%A9')).toBe('é');
    expect(decodeFragment('bad%2')).toBe('bad%2');
    expect(decodeFragment('')).toBeNull();
  });
});

describe('isSameFilePath', () => {
  it('matches identical paths and ignores separator style', () => {
    expect(isSameFilePath('C:\\docs\\README.md', 'C:/docs/README.md')).toBe(true);
    expect(isSameFilePath('/home/me/docs/README.md', '/home/me/docs/README.md')).toBe(true);
  });

  it('is case-insensitive for Windows paths only', () => {
    expect(isSameFilePath('C:\\Docs\\readme.md', 'c:/docs/README.md')).toBe(true);
    expect(isSameFilePath('\\\\server\\share\\A.md', '//server/share/a.md')).toBe(true);
    expect(isSameFilePath('/home/me/A.md', '/home/me/a.md')).toBe(false);
  });

  it('rejects different files and empty values', () => {
    expect(isSameFilePath('C:/docs/README.md', 'C:/docs/other.md')).toBe(false);
    expect(isSameFilePath('C:/docs/README.md', undefined)).toBe(false);
    expect(isSameFilePath(null, 'C:/docs/README.md')).toBe(false);
  });

  it('ignores a trailing separator and doubled separators', () => {
    expect(isSameFilePath('/home/me/docs/', '/home/me/docs')).toBe(true);
    expect(isSameFilePath('/home//me/docs', '/home/me/docs')).toBe(true);
  });
});

describe('matchHeadingId', () => {
  const ids = ['setup', 'section-two', 'section-two-1', '2-numbered', 'café-section'];

  it('prefers the exact id', () => {
    expect(matchHeadingId(ids, 'section-two')).toBe('section-two');
    expect(matchHeadingId(ids, '2-numbered')).toBe('2-numbered');
  });

  it('falls back to a case-insensitive match', () => {
    expect(matchHeadingId(ids, 'Section-Two')).toBe('section-two');
    expect(matchHeadingId(ids, 'SETUP')).toBe('setup');
    expect(matchHeadingId(ids, 'CAFÉ-SECTION')).toBe('café-section');
  });

  it('does not slugify or otherwise transform the fragment', () => {
    expect(matchHeadingId(ids, 'Section Two')).toBeNull();
    expect(matchHeadingId(ids, 'section_two')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(matchHeadingId(ids, null)).toBeNull();
    expect(matchHeadingId(ids, '')).toBeNull();
    expect(matchHeadingId([], 'setup')).toBeNull();
  });
});

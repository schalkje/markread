/**
 * Unit Tests: export-only exclusion patterns (issue #23)
 */

import { describe, it, expect } from 'vitest';
import {
  matchesExclusionPattern,
  isExcludedFromExport,
  createExportExclusionFilter,
  createExclusionPattern,
  EXPORT_EXCLUSION_PRESETS,
} from '../../../src/shared/utils/export-exclusions';

describe('matchesExclusionPattern', () => {
  it('matches exact names case-insensitively', () => {
    expect(matchesExclusionPattern('CLAUDE.md', 'CLAUDE.md')).toBe(true);
    expect(matchesExclusionPattern('claude.md', 'CLAUDE.md')).toBe(true);
    expect(matchesExclusionPattern('CLAUDE.md', 'copilot.md')).toBe(false);
  });

  it('supports * and ? globs', () => {
    expect(matchesExclusionPattern('review.agent.md', '*.agent.md')).toBe(true);
    expect(matchesExclusionPattern('review.md', '*.agent.md')).toBe(false);
    expect(matchesExclusionPattern('doc1.md', 'doc?.md')).toBe(true);
    expect(matchesExclusionPattern('doc12.md', 'doc?.md')).toBe(false);
  });

  it('treats regex metacharacters in the pattern literally', () => {
    expect(matchesExclusionPattern('a.b', 'a.b')).toBe(true);
    expect(matchesExclusionPattern('axb', 'a.b')).toBe(false);
    expect(matchesExclusionPattern('notes (draft).md', 'notes (*).md')).toBe(true);
  });

  it('never matches an empty or whitespace pattern', () => {
    expect(matchesExclusionPattern('anything', '')).toBe(false);
    expect(matchesExclusionPattern('anything', '   ')).toBe(false);
  });

  it('matches folder names such as .github', () => {
    expect(matchesExclusionPattern('.github', '.github')).toBe(true);
    expect(matchesExclusionPattern('.GitHub', '.github')).toBe(true);
  });
});

describe('isExcludedFromExport', () => {
  it('ignores disabled patterns', () => {
    const patterns = [
      { id: '1', pattern: 'CLAUDE.md', isEnabled: false },
      { id: '2', pattern: 'COPILOT.md', isEnabled: true },
    ];
    expect(isExcludedFromExport('CLAUDE.md', patterns)).toBe(false);
    expect(isExcludedFromExport('COPILOT.md', patterns)).toBe(true);
  });

  it('returns false for an empty or missing list', () => {
    expect(isExcludedFromExport('CLAUDE.md', [])).toBe(false);
    expect(isExcludedFromExport('CLAUDE.md', undefined)).toBe(false);
  });
});

describe('createExportExclusionFilter', () => {
  it('uses the built-in folder list when no browsing exclusions are given', () => {
    const filter = createExportExclusionFilter();
    expect(filter.isFolderExcluded('node_modules')).toBe(true);
    expect(filter.isFolderExcluded('docs')).toBe(false);
    expect(filter.isFileExcluded('README.md')).toBe(false);
  });

  it('respects the user browsing exclusions instead of the built-in list', () => {
    const filter = createExportExclusionFilter({
      browsingExclusions: [{ id: 'a', pattern: 'dist', isEnabled: true }],
    });
    expect(filter.isFolderExcluded('dist')).toBe(true);
    // The user removed node_modules from their browsing list, so export shows it too
    expect(filter.isFolderExcluded('node_modules')).toBe(false);
  });

  it('applies export exclusions to files and folders (union with browsing)', () => {
    const filter = createExportExclusionFilter({
      browsingExclusions: [{ id: 'a', pattern: 'dist', isEnabled: true }],
      exportExclusions: [
        createExclusionPattern('CLAUDE.md'),
        createExclusionPattern('.github'),
        createExclusionPattern('*.agent.md'),
      ],
    });
    expect(filter.isFileExcluded('claude.md')).toBe(true);
    expect(filter.isFileExcluded('review.agent.md')).toBe(true);
    expect(filter.isFileExcluded('guide.md')).toBe(false);
    expect(filter.isFolderExcluded('.github')).toBe(true);
    expect(filter.isFolderExcluded('dist')).toBe(true);
    expect(filter.isFolderExcluded('src')).toBe(false);
  });

  it('does not let browsing folder patterns exclude files', () => {
    const filter = createExportExclusionFilter({
      browsingExclusions: [{ id: 'a', pattern: 'README.md', isEnabled: true }],
    });
    expect(filter.isFileExcluded('README.md')).toBe(false);
  });
});

describe('createExclusionPattern / presets', () => {
  it('creates enabled patterns with unique ids and trimmed text', () => {
    const a = createExclusionPattern('  CLAUDE.md ');
    const b = createExclusionPattern('CLAUDE.md');
    expect(a.pattern).toBe('CLAUDE.md');
    expect(a.isEnabled).toBe(true);
    expect(a.id).not.toBe(b.id);
    expect(a.description).toContain('CLAUDE.md');
  });

  it('offers the agent instruction files as presets', () => {
    expect(EXPORT_EXCLUSION_PRESETS).toEqual(['CLAUDE.md', 'COPILOT.md', 'AGENTS.md']);
  });
});

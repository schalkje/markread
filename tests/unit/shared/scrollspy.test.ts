/**
 * Unit Tests: scrollspy rules (issue #25 — outline side panel)
 */

import { describe, it, expect } from 'vitest';
import { computeActivationLine, isScrolledToBottom, resolveActiveIndex } from '../../../src/shared/utils/scrollspy';

describe('computeActivationLine', () => {
  it('sits at 12% of the viewport, capped at 48px', () => {
    expect(computeActivationLine(300)).toBe(36);
    expect(computeActivationLine(2000)).toBe(48);
  });

  it('stays below the gap between a clicked heading and the heading right after it', () => {
    // 12px navigate offset + ~20px h6 line + 24px collapsed margin
    expect(computeActivationLine(10000)).toBeLessThan(56);
  });
});

describe('isScrolledToBottom', () => {
  it('is true only for a scrollable container at its end', () => {
    expect(isScrolledToBottom(600, 400, 1000)).toBe(true);
    expect(isScrolledToBottom(599, 400, 1000)).toBe(true); // within tolerance
    expect(isScrolledToBottom(500, 400, 1000)).toBe(false);
  });

  it('is never true when the content fits without scrolling', () => {
    expect(isScrolledToBottom(0, 400, 400)).toBe(false);
    expect(isScrolledToBottom(0, 400, 300)).toBe(false);
  });
});

describe('resolveActiveIndex', () => {
  it('activates the last heading that crossed the activation line', () => {
    // tops relative to the viewport top; line at 120
    expect(resolveActiveIndex([-500, -100, 50, 300], 120, false)).toBe(2);
  });

  it('keeps the previous heading active across a gap', () => {
    expect(resolveActiveIndex([-900, 800], 120, false)).toBe(0);
  });

  it('activates nothing before the first heading reaches the line', () => {
    expect(resolveActiveIndex([200, 600], 120, false)).toBe(-1);
    expect(resolveActiveIndex([], 120, false)).toBe(-1);
  });

  it('treats a heading exactly on the line as crossed', () => {
    expect(resolveActiveIndex([-10, 120, 121.5], 120, false)).toBe(1);
  });

  it('forces the last heading when scrolled to the bottom', () => {
    expect(resolveActiveIndex([-300, -50, 250], 120, true)).toBe(2);
  });
});

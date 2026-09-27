// @vitest-environment jsdom
/**
 * Unit Tests: heading DOM helpers (issue #29 — deep links)
 *
 * Runs under jsdom: `findHeadingElement` exact / case-insensitive lookup,
 * `headingScrollTop` arithmetic and the `waitForStableHeight` loop.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  findHeadingElement,
  headingScrollTop,
  scrollHeadingToTop,
  waitForStableHeight,
  HEADING_TOP_OFFSET_PX,
} from '../../../src/renderer/utils/heading-dom';

beforeAll(() => {
  // jsdom has no CSS.escape; a minimal polyfill that handles leading digits
  if (typeof (globalThis as any).CSS === 'undefined' || !(globalThis as any).CSS.escape) {
    (globalThis as any).CSS = {
      escape: (value: string) =>
        value.replace(/^(\d)/, (d) => `\\3${d} `).replace(/[^\w\s-]/g, (c) => `\\${c}`),
    };
  }
});

function container(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('findHeadingElement', () => {
  const el = container(`
    <h1 id="page-b">Page B</h1>
    <h2 id="section-two">Section two</h2>
    <h2 id="2-numbered">2 Numbered</h2>
    <h2 id="café-section">Café section</h2>
    <p id="not-a-heading">paragraph</p>
  `);

  it('finds an exact heading id (including ids starting with a digit)', () => {
    expect(findHeadingElement(el, 'section-two')?.textContent).toBe('Section two');
    expect(findHeadingElement(el, '2-numbered')?.textContent).toBe('2 Numbered');
    expect(findHeadingElement(el, 'café-section')?.textContent).toBe('Café section');
  });

  it('falls back to a case-insensitive heading id match', () => {
    expect(findHeadingElement(el, 'Section-Two')?.id).toBe('section-two');
    expect(findHeadingElement(el, 'PAGE-B')?.id).toBe('page-b');
  });

  it('returns null for an unknown or empty id', () => {
    expect(findHeadingElement(el, 'nope')).toBeNull();
    expect(findHeadingElement(el, '')).toBeNull();
  });

  it('keeps exact matches on non-heading elements (existing behaviour) but not case-insensitive ones', () => {
    expect(findHeadingElement(el, 'not-a-heading')?.tagName).toBe('P');
    expect(findHeadingElement(el, 'NOT-A-HEADING')).toBeNull();
  });
});

describe('headingScrollTop / scrollHeadingToTop', () => {
  it('positions the heading 12px below the container top and clamps at zero', () => {
    const el = container('<h2 id="x">x</h2>');
    const heading = el.querySelector('h2')!;
    el.scrollTop = 500;
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({ top: 340 } as DOMRect);

    // heading is 240px below the container's top edge; scrolled 500 already
    expect(HEADING_TOP_OFFSET_PX).toBe(12);
    expect(headingScrollTop(heading, el)).toBe(500 + 240 - 12);

    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({ top: -450 } as DOMRect);
    expect(headingScrollTop(heading, el)).toBe(0);
  });

  it('scrolls the container with the requested behaviour and returns the position', () => {
    const el = container('<h2 id="x">x</h2>');
    const heading = el.querySelector('h2')!;
    const scrollTo = vi.fn();
    (el as any).scrollTo = scrollTo;
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({ top: 300 } as DOMRect);

    expect(scrollHeadingToTop(heading, el, 'smooth')).toBe(288);
    expect(scrollTo).toHaveBeenCalledWith({ top: 288, behavior: 'smooth' });
  });
});

describe('waitForStableHeight', () => {
  function elementWithHeight(): { el: HTMLElement; set: (h: number) => void } {
    const el = document.createElement('div');
    let height = 100;
    Object.defineProperty(el, 'scrollHeight', { get: () => height, configurable: true });
    return { el, set: (h) => { height = h; } };
  }

  it('fires once the height has been unchanged for two consecutive checks', () => {
    vi.useFakeTimers();
    const { el, set } = elementWithHeight();
    const onStable = vi.fn();
    waitForStableHeight(el, onStable);

    vi.advanceTimersByTime(50); // first sample: 100
    set(200);
    vi.advanceTimersByTime(50); // changed: reset
    vi.advanceTimersByTime(50); // stable 1
    expect(onStable).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50); // stable 2 → fire
    expect(onStable).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(onStable).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('gives up after the maximum number of checks and can be cancelled', () => {
    vi.useFakeTimers();
    const { el, set } = elementWithHeight();
    const onStable = vi.fn();
    waitForStableHeight(el, onStable, { intervalMs: 10, maxChecks: 5 });
    for (let i = 1; i <= 5; i++) {
      set(100 + i); // keeps changing
      vi.advanceTimersByTime(10);
    }
    expect(onStable).toHaveBeenCalledTimes(1);

    const cancelled = vi.fn();
    const cancel = waitForStableHeight(el, cancelled, { intervalMs: 10 });
    vi.advanceTimersByTime(10);
    cancel();
    vi.advanceTimersByTime(1000);
    expect(cancelled).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

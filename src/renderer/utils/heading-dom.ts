/**
 * Heading DOM helpers (issue #25, #29)
 *
 * The markdown-it rule assigns heading ids, but DOMPurify's clobbering filter
 * drops ids that shadow document/form properties (`title`, `location`, ...),
 * and raw-HTML headings never pass through the rule at all. After sanitised
 * HTML is in the DOM we walk the real heading elements, keep the ids that
 * survived and assign the missing ones from the same slug rules, so the outline
 * always links to the ids that are actually rendered.
 */

import {
  createSlugRegistry,
  normalizeHeadingText,
  slugifyHeading,
  type OutlineHeading,
} from '@shared/utils/outline';
import { matchHeadingId } from '@shared/utils/link-fragments';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

/**
 * Gap kept above a heading when it is scrolled to the top of the viewport.
 * Shared by same-document anchors, cross-file deep links and the outline panel.
 */
export const HEADING_TOP_OFFSET_PX = 12;

/**
 * Ensure every heading in `container` has a unique id and return the list in
 * document order. Existing ids are kept unless an earlier heading already uses
 * the same id (a raw-HTML heading can collide with a generated slug); the
 * later duplicate is re-assigned.
 */
export function syncHeadingIds(container: HTMLElement): OutlineHeading[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(HEADING_SELECTOR));
  const existing = elements.map((el) => el.id).filter(Boolean);
  const registry = createSlugRegistry(existing);
  const seen = new Set<string>();

  return elements.map((el, index) => {
    const text = normalizeHeadingText(el.textContent || '');
    if (!el.id || seen.has(el.id)) {
      el.id = registry.claim(slugifyHeading(text));
    }
    seen.add(el.id);
    return { id: el.id, level: headingLevel(el), text, index };
  });
}

/**
 * Locate a heading element by id inside a container (ids may start with digits).
 * Issue #29: falls back to a case-insensitive match against the rendered
 * heading ids, so `#Section-Two` finds the generated `section-two`.
 */
export function findHeadingElement(container: HTMLElement, id: string): HTMLElement | null {
  if (!id) return null;
  const exact = container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (exact) return exact;

  const headings = Array.from(container.querySelectorAll<HTMLElement>(HEADING_SELECTOR)).filter((el) => el.id);
  const matched = matchHeadingId(headings.map((el) => el.id), id);
  return matched ? headings.find((el) => el.id === matched) ?? null : null;
}

/**
 * Top of an element relative to the scroll container's viewport. Uses
 * `getBoundingClientRect` so CSS zoom transforms are accounted for.
 */
export function elementTopInContainer(element: Element, container: HTMLElement): number {
  return element.getBoundingClientRect().top - container.getBoundingClientRect().top;
}

/** The `scrollTop` that puts `target` at the top of `container` (with the shared offset) */
export function headingScrollTop(target: Element, container: HTMLElement): number {
  return Math.max(0, container.scrollTop + elementTopInContainer(target, container) - HEADING_TOP_OFFSET_PX);
}

/** Scroll `container` so `target` sits at the top; returns the position scrolled to */
export function scrollHeadingToTop(target: Element, container: HTMLElement, behavior: 'auto' | 'instant' | 'smooth'): number {
  const top = headingScrollTop(target, container);
  container.scrollTo({ top, behavior });
  return top;
}

/**
 * Issue #29: call `onStable` once the element's scroll height has stopped
 * changing (two consecutive checks) or after `maxChecks` polls (~1s by
 * default). Returns a cancel function.
 */
export function waitForStableHeight(
  element: HTMLElement,
  onStable: () => void,
  options: { intervalMs?: number; maxChecks?: number } = {}
): () => void {
  const intervalMs = options.intervalMs ?? 50;
  const maxChecks = options.maxChecks ?? 20;
  let cancelled = false;
  let checks = 0;
  let lastHeight = -1;
  let stableCount = 0;

  const tick = () => {
    if (cancelled) return;
    checks++;
    const height = element.scrollHeight;
    if (height === lastHeight) {
      stableCount++;
    } else {
      stableCount = 0;
      lastHeight = height;
    }
    if (stableCount >= 2 || checks >= maxChecks) {
      onStable();
      return;
    }
    setTimeout(tick, intervalMs);
  };

  setTimeout(tick, intervalMs);
  return () => {
    cancelled = true;
  };
}

function headingLevel(el: HTMLElement): number {
  return Number(el.tagName.charAt(1)) || 1;
}

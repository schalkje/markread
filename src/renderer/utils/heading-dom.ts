/**
 * Heading DOM helpers (issue #25)
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

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

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

/** Locate a heading element by id inside a container (ids may start with digits) */
export function findHeadingElement(container: HTMLElement, id: string): HTMLElement | null {
  if (!id) return null;
  return container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
}

/**
 * Top of an element relative to the scroll container's viewport. Uses
 * `getBoundingClientRect` so CSS zoom transforms are accounted for.
 */
export function elementTopInContainer(element: Element, container: HTMLElement): number {
  return element.getBoundingClientRect().top - container.getBoundingClientRect().top;
}

function headingLevel(el: HTMLElement): number {
  return Number(el.tagName.charAt(1)) || 1;
}

/**
 * useScrollSpy (issue #25)
 *
 * Tracks which heading is at the reading position of a scroll container.
 * - rAF-throttled scroll listener (one measurement per frame, never per entry)
 * - headings are measured with getBoundingClientRect, so CSS zoom transforms
 *   are respected
 * - activation line / bottom-of-container rules live in shared/utils/scrollspy
 * - `lock(id)` marks an entry active immediately (used on click) and keeps it
 *   until the smooth scroll ends (`scrollend`, with a timeout fallback)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OutlineHeading } from '@shared/utils/outline';
import { computeActivationLine, isScrolledToBottom, resolveActiveIndex } from '@shared/utils/scrollspy';
import { findHeadingElement } from '../utils/heading-dom';

const LOCK_FALLBACK_MS = 1200;

export interface ScrollSpy {
  activeId: string | null;
  /** Mark `id` active now and hold it until the current scroll settles */
  lock: (id: string) => void;
}

export function useScrollSpy(container: HTMLElement | null, headings: OutlineHeading[], enabled: boolean): ScrollSpy {
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const elementsRef = useRef<(HTMLElement | null)[]>([]);
  const lockRef = useRef<string | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const setActiveId = useCallback((id: string | null) => {
    if (activeIdRef.current === id) return;
    activeIdRef.current = id;
    setActiveIdState(id);
  }, []);

  const clearLock = useCallback(() => {
    lockRef.current = null;
    if (lockTimerRef.current !== null) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  // Resolve heading elements once per document (not per scroll frame)
  useEffect(() => {
    clearLock();
    if (!container || headings.length === 0) {
      elementsRef.current = [];
      setActiveId(null);
      return;
    }
    elementsRef.current = headings.map((h) => findHeadingElement(container, h.id));
  }, [container, headings, clearLock, setActiveId]);

  const measure = useCallback(() => {
    rafRef.current = null;
    if (!container || !enabled) return;
    if (lockRef.current) {
      setActiveId(lockRef.current);
      return;
    }

    const elements = elementsRef.current;
    if (elements.length === 0) {
      setActiveId(null);
      return;
    }

    const containerTop = container.getBoundingClientRect().top;
    const line = computeActivationLine(container.clientHeight);
    const atBottom = isScrolledToBottom(container.scrollTop, container.clientHeight, container.scrollHeight);

    // Tops are in document order, so we can stop at the first heading below the line
    const tops: number[] = [];
    for (const el of elements) {
      if (!el) {
        tops.push(Number.POSITIVE_INFINITY);
        continue;
      }
      const top = el.getBoundingClientRect().top - containerTop;
      tops.push(top);
      if (top > line + 1 && !atBottom) break;
    }

    const index = resolveActiveIndex(tops, line, atBottom);
    setActiveId(index >= 0 ? headings[index]?.id ?? null : null);
  }, [container, enabled, headings, setActiveId]);

  const schedule = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    if (!container || !enabled) return undefined;

    const handleScrollEnd = () => {
      if (lockRef.current) {
        clearLock();
        schedule();
      }
    };

    container.addEventListener('scroll', schedule, { passive: true });
    container.addEventListener('scrollend', handleScrollEnd);

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(container);
    if (container.firstElementChild) {
      resizeObserver.observe(container.firstElementChild);
    }

    // Initial measurement plus one after async content (images, diagrams) settles
    schedule();
    const settleTimer = window.setTimeout(schedule, 250);

    return () => {
      container.removeEventListener('scroll', schedule);
      container.removeEventListener('scrollend', handleScrollEnd);
      resizeObserver.disconnect();
      window.clearTimeout(settleTimer);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [container, enabled, schedule, clearLock]);

  useEffect(() => () => clearLock(), [clearLock]);

  const lock = useCallback(
    (id: string) => {
      clearLock();
      lockRef.current = id;
      setActiveId(id);
      lockTimerRef.current = window.setTimeout(() => {
        clearLock();
        schedule();
      }, LOCK_FALLBACK_MS);
    },
    [clearLock, schedule, setActiveId]
  );

  return { activeId, lock };
}

export default useScrollSpy;

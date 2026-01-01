/**
 * TableOfContents Component
 * Tasks: T052, T053
 *
 * Extracts headings from markdown content and provides navigation with:
 * - Hierarchical heading structure (h1-h6)
 * - Click-to-jump functionality with smooth scroll
 * - Current heading highlighting
 * - Keyboard navigation support
 */

import React, { useEffect, useState, useRef } from 'react';
import { smoothScrollTo } from '../../services/scroll-optimizer';
import './TableOfContents.css';

export interface HeadingItem {
  id: string;
  text: string;
  level: number; // 1-6 for h1-h6
  element: HTMLElement;
  offsetTop: number;
}

export interface TableOfContentsProps {
  /** Container element to extract headings from */
  containerRef: React.RefObject<HTMLElement>;
  /** Callback when a heading is clicked */
  onHeadingClick?: (heading: HeadingItem) => void;
  /** Whether to show the table of contents */
  isOpen?: boolean;
  /** Callback when close is requested */
  onClose?: () => void;
}

/**
 * T052: TableOfContents component to extract headings
 * T053: With jump-to-heading functionality and smooth scroll
 */
export const TableOfContents: React.FC<TableOfContentsProps> = ({
  containerRef,
  onHeadingClick,
  isOpen = false,
  onClose,
}) => {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const tocRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract headings from container
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const headingElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6');

    const extractedHeadings: HeadingItem[] = Array.from(headingElements).map((element, index) => {
      const level = parseInt(element.tagName.charAt(1), 10);
      const text = element.textContent || '';

      // Generate or get ID for heading
      let id = element.id;
      if (!id) {
        // Create ID from heading text (slugify)
        id = `heading-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`;
        element.id = id;
      }

      return {
        id,
        text,
        level,
        element: element as HTMLElement,
        offsetTop: (element as HTMLElement).offsetTop,
      };
    });

    setHeadings(extractedHeadings);
  }, [containerRef]);

  // Track active heading based on scroll position
  useEffect(() => {
    if (!containerRef.current || headings.length === 0) return;

    const container = containerRef.current;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollOffset = 100; // Offset for better UX

      // Find the current heading based on scroll position
      let currentHeading: HeadingItem | null = null;

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading.offsetTop <= scrollTop + scrollOffset) {
          currentHeading = heading;
          break;
        }
      }

      setActiveHeadingId(currentHeading?.id || null);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, headings]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // T053: Jump to heading with smooth scroll
  const jumpToHeading = (heading: HeadingItem) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const targetElement = heading.element;

    // Smooth scroll to heading
    smoothScrollTo(container, targetElement.offsetTop - 20, 300);

    // Update active heading
    setActiveHeadingId(heading.id);

    // Callback
    onHeadingClick?.(heading);

    // Clear search
    setSearchQuery('');
  };

  // Filter headings based on search query
  const filteredHeadings = searchQuery
    ? headings.filter((h) =>
        h.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : headings;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose?.();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusNextHeading();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusPreviousHeading();
    }
  };

  const focusNextHeading = () => {
    if (!tocRef.current) return;
    const items = tocRef.current.querySelectorAll('.toc__item');
    const activeIndex = Array.from(items).findIndex(
      (item) => item.classList.contains('toc__item--active')
    );
    const nextIndex = Math.min(activeIndex + 1, items.length - 1);
    (items[nextIndex] as HTMLElement)?.focus();
  };

  const focusPreviousHeading = () => {
    if (!tocRef.current) return;
    const items = tocRef.current.querySelectorAll('.toc__item');
    const activeIndex = Array.from(items).findIndex(
      (item) => item.classList.contains('toc__item--active')
    );
    const prevIndex = Math.max(activeIndex - 1, 0);
    (items[prevIndex] as HTMLElement)?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="toc" ref={tocRef} onKeyDown={handleKeyDown}>
      <div className="toc__header">
        <h3 className="toc__title">Table of Contents</h3>
        <button
          className="toc__close"
          onClick={onClose}
          aria-label="Close table of contents"
          title="Close (Esc)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
          </svg>
        </button>
      </div>

      <div className="toc__search">
        <input
          ref={searchInputRef}
          type="text"
          className="toc__search-input"
          placeholder="Search headings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search headings"
        />
      </div>

      <div className="toc__content">
        {filteredHeadings.length === 0 ? (
          <div className="toc__empty">
            {searchQuery ? 'No matching headings found' : 'No headings in document'}
          </div>
        ) : (
          <ul className="toc__list">
            {filteredHeadings.map((heading) => (
              <li
                key={heading.id}
                className={`toc__item toc__item--level-${heading.level} ${
                  heading.id === activeHeadingId ? 'toc__item--active' : ''
                }`}
                style={{ paddingLeft: `${(heading.level - 1) * 1}rem` }}
              >
                <button
                  className="toc__link"
                  onClick={() => jumpToHeading(heading)}
                  tabIndex={0}
                  title={`Jump to: ${heading.text}`}
                >
                  <span className="toc__link-text">{heading.text}</span>
                  {heading.id === activeHeadingId && (
                    <span className="toc__active-indicator" aria-label="Current section">
                      ●
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="toc__footer">
        <div className="toc__stats">
          {filteredHeadings.length} {filteredHeadings.length === 1 ? 'heading' : 'headings'}
        </div>
        <div className="toc__hint">
          <kbd>↑</kbd> <kbd>↓</kbd> Navigate · <kbd>Esc</kbd> Close
        </div>
      </div>
    </div>
  );
};

export default TableOfContents;

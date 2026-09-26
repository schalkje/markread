/**
 * OutlinePanel (issue #25)
 *
 * Docked, resizable outline of the active document:
 * - header: title, heading count, follow-scroll toggle, collapse/expand all,
 *   move left/right, close
 * - filter box (Esc clears, Ctrl+G focuses it)
 * - collapsible heading tree with relative nesting, scrollspy highlight,
 *   click-to-navigate, ARIA tree semantics and APG keyboard behaviour
 * - empty state, resize handle (right variant) — the stacked variant is
 *   resized by the divider in the sidebar
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildOutlineTree,
  clampOutlineDepth,
  collectParentIds,
  countOutlineHeadings,
  filterOutlineTree,
  findParentRowIndex,
  flattenOutlineTree,
  type OutlineRow,
} from '@shared/utils/outline';
import { useOutlineStore, OUTLINE_MIN_WIDTH, OUTLINE_MAX_WIDTH } from '../../stores/outline';
import { useSettingsStore } from '../../stores/settings';
import { useTabsStore } from '../../stores/tabs';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import { elementTopInContainer, findHeadingElement } from '../../utils/heading-dom';
import './OutlinePanel.css';

/** Gap between the container top and the heading after a click */
const NAVIGATE_TOP_OFFSET_PX = 12;
const INDENT_PER_LEVEL_PX = 20;
const ROW_BASE_PADDING_PX = 8;

export type OutlineVariant = 'right' | 'stacked';

export interface OutlinePanelProps {
  /** 'right' = dedicated panel beside the content, 'stacked' = section inside the sidebar */
  variant: OutlineVariant;
  /** Active tab id (collapse state is kept per tab) */
  tabId: string | null;
  onClose: () => void;
}

const NO_COLLAPSED: ReadonlySet<string> = new Set();

export const OutlinePanel: React.FC<OutlinePanelProps> = ({ variant, tabId, onClose }) => {
  const headings = useOutlineStore((s) => s.headings);
  const scrollContainer = useOutlineStore((s) => s.scrollContainer);
  const filePath = useOutlineStore((s) => s.filePath);
  const filter = useOutlineStore((s) => s.filter);
  const setFilter = useOutlineStore((s) => s.setFilter);
  const followScroll = useOutlineStore((s) => s.followScroll);
  const toggleFollowScroll = useOutlineStore((s) => s.toggleFollowScroll);
  const outlineWidth = useOutlineStore((s) => s.outlineWidth);
  const setOutlineWidth = useOutlineStore((s) => s.setOutlineWidth);
  const sidebarOutlineHeight = useOutlineStore((s) => s.sidebarOutlineHeight);
  const collapsedByTab = useOutlineStore((s) => s.collapsedByTab);
  const toggleCollapsed = useOutlineStore((s) => s.toggleCollapsed);
  const collapseAll = useOutlineStore((s) => s.collapseAll);
  const expandAll = useOutlineStore((s) => s.expandAll);
  const focusFilterRequest = useOutlineStore((s) => s.focusFilterRequest);

  const maxDepth = useSettingsStore((s) => clampOutlineDepth(s.settings.appearance.outlineMaxDepth));
  const outlinePosition = useSettingsStore((s) => s.settings.appearance.outlinePosition ?? 'right');
  const scrollBehavior = useSettingsStore((s) => s.settings.behavior.scrollBehavior ?? 'smooth');

  const filterInputRef = useRef<HTMLInputElement>(null);
  const treeRef = useRef<HTMLUListElement>(null);
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const tree = useMemo(() => buildOutlineTree(headings, maxDepth), [headings, maxDepth]);
  const count = useMemo(() => countOutlineHeadings(headings, maxDepth), [headings, maxDepth]);
  const filteredTree = useMemo(() => filterOutlineTree(tree, filter), [tree, filter]);
  const collapsed: ReadonlySet<string> = (tabId && collapsedByTab.get(tabId)) || NO_COLLAPSED;
  const isFiltering = filter.trim().length > 0;
  const rows = useMemo(() => flattenOutlineTree(filteredTree, collapsed, isFiltering), [filteredTree, collapsed, isFiltering]);

  const documentVersion = useOutlineStore((s) => s.documentVersion);
  const { activeId, lock } = useScrollSpy(scrollContainer, headings, headings.length > 0, documentVersion);

  // Ctrl+G / "Go to heading": focus the filter box
  useEffect(() => {
    if (focusFilterRequest === 0) return;
    const frame = window.requestAnimationFrame(() => {
      filterInputRef.current?.focus();
      filterInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusFilterRequest]);

  // Follow scroll: keep the active entry visible (only if it is rendered)
  useEffect(() => {
    if (!followScroll || !activeId) return;
    const row = rowRefs.current.get(activeId);
    row?.scrollIntoView({ block: 'nearest' });
  }, [activeId, followScroll]);

  // Keep the roving tabindex on something sensible when rows change
  useEffect(() => {
    if (rows.length === 0) {
      setFocusedId(null);
      return;
    }
    if (!focusedId || !rows.some((r) => r.node.id === focusedId)) {
      setFocusedId(activeId && rows.some((r) => r.node.id === activeId) ? activeId : rows[0].node.id);
    }
  }, [rows, focusedId, activeId]);

  const focusRow = useCallback((id: string) => {
    setFocusedId(id);
    rowRefs.current.get(id)?.focus();
  }, []);

  const navigateToHeading = useCallback(
    (id: string) => {
      if (!scrollContainer) return;
      const target = findHeadingElement(scrollContainer, id);
      if (!target) return;

      const top = Math.max(0, scrollContainer.scrollTop + elementTopInContainer(target, scrollContainer) - NAVIGATE_TOP_OFFSET_PX);

      // History entry so Alt+Left returns to where the reader was
      if (tabId && filePath) {
        const tab = useTabsStore.getState().tabs.get(tabId);
        useTabsStore.getState().pushScrollHistoryEntry(tabId, {
          filePath,
          scrollPosition: top,
          scrollLeft: scrollContainer.scrollLeft,
          zoomLevel: tab?.zoomLevel || 100,
          timestamp: Date.now(),
        });
      }

      lock(id);
      scrollContainer.scrollTo({ top, behavior: scrollBehavior });

      // Move focus to the heading for screen readers without disturbing the scroll
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    },
    [scrollContainer, tabId, filePath, lock, scrollBehavior]
  );

  const handleTreeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLUListElement>) => {
      if (rows.length === 0) return;
      const index = Math.max(0, rows.findIndex((r) => r.node.id === focusedId));
      const row = rows[index];

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusRow(rows[Math.min(rows.length - 1, index + 1)].node.id);
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusRow(rows[Math.max(0, index - 1)].node.id);
          break;
        case 'Home':
          event.preventDefault();
          focusRow(rows[0].node.id);
          break;
        case 'End':
          event.preventDefault();
          focusRow(rows[rows.length - 1].node.id);
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (row.hasChildren && !row.expanded && tabId) {
            toggleCollapsed(tabId, row.node.id);
          } else if (row.hasChildren && index + 1 < rows.length) {
            focusRow(rows[index + 1].node.id);
          }
          break;
        case 'ArrowLeft': {
          event.preventDefault();
          if (row.hasChildren && row.expanded && !isFiltering && tabId) {
            toggleCollapsed(tabId, row.node.id);
          } else {
            const parentIndex = findParentRowIndex(rows, index);
            if (parentIndex >= 0) focusRow(rows[parentIndex].node.id);
          }
          break;
        }
        case 'Enter':
        case ' ':
          event.preventDefault();
          navigateToHeading(row.node.id);
          break;
        case 'Escape':
          if (isFiltering) {
            event.preventDefault();
            setFilter('');
          }
          break;
        default:
          break;
      }
    },
    [rows, focusedId, focusRow, tabId, toggleCollapsed, isFiltering, navigateToHeading, setFilter]
  );

  const handleFilterKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (filter) {
          setFilter('');
        } else {
          filterInputRef.current?.blur();
        }
      } else if (event.key === 'ArrowDown' && rows.length > 0) {
        event.preventDefault();
        focusRow(focusedId && rows.some((r) => r.node.id === focusedId) ? focusedId : rows[0].node.id);
      } else if (event.key === 'Enter' && rows.length > 0) {
        event.preventDefault();
        // While filtering, rows also contain ancestors kept for context: go to the first real match
        const query = filter.trim().toLowerCase();
        const target = query ? rows.find((r) => r.node.text.toLowerCase().includes(query)) ?? rows[0] : rows[0];
        navigateToHeading(target.node.id);
      }
    },
    [filter, setFilter, rows, focusRow, focusedId, navigateToHeading]
  );

  // Resize handle (right variant only): drag the left edge
  const handleResizeStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = outlineWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const next = Math.min(OUTLINE_MAX_WIDTH, Math.max(OUTLINE_MIN_WIDTH, startWidth - (e.clientX - startX)));
        setOutlineWidth(next);
      };
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [outlineWidth, setOutlineWidth]
  );

  const handleCollapseAll = useCallback(() => {
    if (tabId) collapseAll(tabId, collectParentIds(tree));
  }, [tabId, collapseAll, tree]);

  const handleExpandAll = useCallback(() => {
    if (tabId) expandAll(tabId);
  }, [tabId, expandAll]);

  const handleTogglePosition = useCallback(() => {
    window.dispatchEvent(new CustomEvent('outline:toggle-position'));
  }, []);

  const style: React.CSSProperties = variant === 'right' ? { width: `${outlineWidth}px` } : { height: `${sidebarOutlineHeight}px` };
  const moveLabel = outlinePosition === 'right' ? 'Move outline to left' : 'Move outline to right';

  return (
    <aside className={`outline-panel outline-panel--${variant}`} style={style} data-testid="outline-panel">
      {variant === 'right' && (
        <div
          className="outline-panel__resize-handle"
          onMouseDown={handleResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize outline"
        />
      )}

      <div className="outline-panel__header">
        <span className="outline-panel__title">Outline</span>
        <span className="outline-panel__count" aria-label={`${count} headings`} title={`${count} headings`}>
          {count}
        </span>
        <div className="outline-panel__actions">
          <button
            type="button"
            className={`outline-panel__action ${followScroll ? 'outline-panel__action--active' : ''}`}
            onClick={toggleFollowScroll}
            aria-pressed={followScroll}
            aria-label="Follow scroll"
            title={followScroll ? 'Follow scroll: on (outline follows the reading position)' : 'Follow scroll: off'}
          >
            <FollowIcon />
          </button>
          <button type="button" className="outline-panel__action" onClick={handleCollapseAll} aria-label="Collapse all" title="Collapse all">
            <CollapseAllIcon />
          </button>
          <button type="button" className="outline-panel__action" onClick={handleExpandAll} aria-label="Expand all" title="Expand all">
            <ExpandAllIcon />
          </button>
          <button type="button" className="outline-panel__action" onClick={handleTogglePosition} aria-label={moveLabel} title={moveLabel}>
            {outlinePosition === 'right' ? <MoveLeftIcon /> : <MoveRightIcon />}
          </button>
          <button type="button" className="outline-panel__action" onClick={onClose} aria-label="Close outline" title="Close outline (Ctrl+Alt+O)">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="outline-panel__filter">
        <input
          ref={filterInputRef}
          type="text"
          className="outline-panel__filter-input"
          placeholder="Filter headings… (Ctrl+G)"
          aria-label="Filter headings"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={handleFilterKeyDown}
          spellCheck={false}
        />
      </div>

      <nav className="outline-panel__body" aria-label="Document outline">
        {headings.length === 0 ? (
          <div className="outline-panel__empty">No headings in this document</div>
        ) : rows.length === 0 ? (
          <div className="outline-panel__empty">No matching headings</div>
        ) : (
          <ul className="outline-tree" role="tree" aria-label="Headings" ref={treeRef} onKeyDown={handleTreeKeyDown}>
            {rows.map((row) => (
              <OutlineItem
                key={row.node.id}
                row={row}
                isActive={row.node.id === activeId}
                isFocused={row.node.id === focusedId}
                registerRef={(el) => {
                  if (el) rowRefs.current.set(row.node.id, el);
                  else rowRefs.current.delete(row.node.id);
                }}
                onNavigate={navigateToHeading}
                onToggle={(id) => tabId && !isFiltering && toggleCollapsed(tabId, id)}
                onFocus={setFocusedId}
              />
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
};

interface OutlineItemProps {
  row: OutlineRow;
  isActive: boolean;
  isFocused: boolean;
  registerRef: (el: HTMLLIElement | null) => void;
  onNavigate: (id: string) => void;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
}

const OutlineItem: React.FC<OutlineItemProps> = React.memo(({ row, isActive, isFocused, registerRef, onNavigate, onToggle, onFocus }) => {
  const { node, hasChildren, expanded } = row;
  const className = [
    'outline-item',
    isActive ? 'outline-item--active' : '',
    hasChildren ? 'outline-item--parent' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li
      ref={registerRef}
      className={className}
      role="treeitem"
      aria-level={node.depth + 1}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-current={isActive ? 'location' : undefined}
      aria-selected={isFocused}
      tabIndex={isFocused ? 0 : -1}
      data-heading-id={node.id}
      data-level={node.level}
      style={{ paddingLeft: `${ROW_BASE_PADDING_PX + node.depth * INDENT_PER_LEVEL_PX}px` }}
      onClick={() => onNavigate(node.id)}
      onFocus={() => onFocus(node.id)}
    >
      <span
        className={`outline-item__chevron ${hasChildren ? '' : 'outline-item__chevron--hidden'} ${expanded ? 'outline-item__chevron--expanded' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) onToggle(node.id);
        }}
        aria-hidden="true"
      >
        ▶
      </span>
      <span className="outline-item__label" title={node.text}>
        {node.text}
      </span>
    </li>
  );
});
OutlineItem.displayName = 'OutlineItem';

/* Inline 16px icons (no icon library in the project) */
const iconProps = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': true } as const;

const FollowIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M8 1.5 4.5 5h2.25v6H4.5L8 14.5 11.5 11H9.25V5h2.25L8 1.5Z" />
  </svg>
);

const CollapseAllIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M2 3h12v1.5H2V3Zm0 4.25h12v1.5H2v-1.5ZM2 11.5h12V13H2v-1.5Z" opacity="0.35" />
    <path d="M8 4.75 5.25 7.5h5.5L8 4.75Zm0 6.5L5.25 8.5h5.5L8 11.25Z" />
  </svg>
);

const ExpandAllIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M2 3h12v1.5H2V3Zm0 4.25h12v1.5H2v-1.5ZM2 11.5h12V13H2v-1.5Z" opacity="0.35" />
    <path d="M8 7.5 5.25 4.75h5.5L8 7.5Zm0 1L5.25 11.25h5.5L8 8.5Z" />
  </svg>
);

const MoveLeftIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M2 2h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm.5 1.5v9H6v-9H2.5Zm5 0v9h6v-9h-6Z" />
    <path d="M7.5 3.5h-5v9h5v-9Z" />
  </svg>
);

const MoveRightIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M2 2h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm.5 1.5v9h6v-9h-6Zm7.5 0v9h3.5v-9H10Z" />
    <path d="M8.5 3.5h5v9h-5v-9Z" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
  </svg>
);

export default OutlinePanel;

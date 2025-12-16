/**
 * TabBar Component
 * Tasks: T060, T063a-T063f, T063m-T063o
 *
 * Displays open tabs with:
 * - Tab titles and close buttons
 * - Active tab highlighting
 * - Click to switch tabs
 * - Horizontal scroll with navigation buttons (T063a-T063b)
 * - Context menu (T063c)
 * - Visual folder distinction (T063e-T063f)
 * - Drag and drop reordering (T063m)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTabsStore } from '../../stores/tabs';
import { useFoldersStore } from '../../stores/folders';
import { TabContextMenu } from './TabContextMenu';
import type { Tab } from '@shared/types/entities.d.ts';
import './TabBar.css';

export interface TabBarProps {
  /** Callback when a tab is clicked */
  onTabClick?: (tabId: string) => void;
  /** Callback when a tab close button is clicked */
  onTabClose?: (tabId: string) => void;
}

/**
 * T060, T063a-T063f, T063m: Enhanced TabBar component
 */
export const TabBar: React.FC<TabBarProps> = ({ onTabClick, onTabClose }) => {
  const tabs = useTabsStore((state) => state.getAllTabs());
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const removeTab = useTabsStore((state) => state.removeTab);
  const reorderTab = useTabsStore((state) => state.reorderTab);
  const duplicateTab = useTabsStore((state) => state.duplicateTab);
  const moveTabToNewWindow = useTabsStore((state) => state.moveTabToNewWindow);
  const tabCount = useTabsStore((state) => state.getTabCount());
  const canAddTab = useTabsStore((state) => state.canAddTab());

  const activeFolderId = useFoldersStore((state) => state.activeFolderId);
  const folders = useFoldersStore((state) => state.folders);

  // T063a: Scroll detection state
  const [showLeftNav, setShowLeftNav] = useState(false);
  const [showRightNav, setShowRightNav] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // T063c: Context menu state
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);

  // T063m: Drag and drop state
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  // T063a: Check if scroll navigation is needed
  const checkScrollNavigation = () => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const hasOverflow = container.scrollWidth > container.clientWidth;
    setShowLeftNav(hasOverflow && container.scrollLeft > 0);
    setShowRightNav(
      hasOverflow && container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  useEffect(() => {
    checkScrollNavigation();
    const container = tabsContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollNavigation);
    window.addEventListener('resize', checkScrollNavigation);

    return () => {
      container.removeEventListener('scroll', checkScrollNavigation);
      window.removeEventListener('resize', checkScrollNavigation);
    };
  }, [tabs]);

  // T063b: Scroll navigation handlers
  const scrollLeft = () => {
    const container = tabsContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const container = tabsContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: 200, behavior: 'smooth' });
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onTabClick?.(tabId);
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    removeTab(tabId);
    onTabClose?.(tabId);
  };

  // T063c: Context menu handlers
  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const handleContextMenuClose = (tabId: string) => {
    removeTab(tabId);
    setContextMenu(null);
  };

  const handleContextMenuDuplicate = (tabId: string) => {
    duplicateTab?.(tabId);
    setContextMenu(null);
  };

  const handleContextMenuMoveToNewWindow = async (tabId: string) => {
    // T163f: Move tab to new window
    const success = await moveTabToNewWindow(tabId);
    if (!success) {
      console.error('Failed to move tab to new window');
    }
    setContextMenu(null);
  };

  // T063m: Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTabId(tabId);
  };

  const handleDragLeave = () => {
    setDragOverTabId(null);
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (draggedTabId && draggedTabId !== targetTabId) {
      const fromIndex = tabs.findIndex((t) => t.id === draggedTabId);
      const toIndex = tabs.findIndex((t) => t.id === targetTabId);
      if (fromIndex !== -1 && toIndex !== -1) {
        reorderTab?.(fromIndex, toIndex);
      }
    }
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const getTabTitle = (tab: Tab): string => {
    // Safety check for filePath
    if (!tab.filePath) {
      return tab.title || 'Untitled';
    }
    const fileName = tab.filePath.split(/[/\\]/).pop() || tab.title;
    return fileName.replace(/\.md$/i, '');
  };

  // T063e: Get folder color for visual distinction
  const getFolderColor = (folderId: string | null): string => {
    if (!folderId) return '#999';
    const folderIndex = folders.findIndex((f) => f.id === folderId);
    const colors = ['#0969da', '#1f883d', '#953800', '#8250df', '#d1242f'];
    return colors[folderIndex % colors.length] || '#999';
  };

  if (tabs.length === 0) {
    return (
      <div className="tab-bar tab-bar--empty" data-testid="tab-bar">
        <div className="tab-bar__empty-state">
          No tabs open. Open a file to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="tab-bar" data-testid="tab-bar">
      {/* T063b: Left scroll button */}
      {showLeftNav && (
        <button
          className="tab-bar__nav tab-bar__nav--left"
          onClick={scrollLeft}
          aria-label="Scroll tabs left"
          data-testid="tab-nav-left"
        >
          ◀
        </button>
      )}

      <div className="tab-bar__tabs" ref={tabsContainerRef}>
        {tabs.map((tab, index) => {
          // T063f: Determine if tab is from active folder
          const isActiveFolder = tab.folderId === activeFolderId;
          const folderColor = getFolderColor(tab.folderId);

          return (
            <div
              key={tab.id}
              className={`tab ${tab.id === activeTabId ? 'tab--active' : ''} ${
                !isActiveFolder ? 'tab--inactive-folder' : ''
              } ${dragOverTabId === tab.id ? 'tab--drag-over' : ''}`}
              data-testid={`tab-${tab.id}`}
              onClick={() => handleTabClick(tab.id)}
              onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={handleDragEnd}
              title={tab.filePath}
              style={{
                '--folder-color': folderColor,
              } as React.CSSProperties}
            >
              {/* T063e: Folder indicator */}
              {tab.folderId && (
                <span
                  className="tab__folder-indicator"
                  style={{ backgroundColor: folderColor }}
                  title={folders.find((f) => f.id === tab.folderId)?.displayName}
                />
              )}

              {/* Direct file indicator */}
              {tab.isDirectFile && (
                <span className="tab__direct-file-icon" title="Direct file (not from folder)">
                  📄
                </span>
              )}

              <span className="tab__title">{getTabTitle(tab)}</span>

              {tab.isDirty && (
                <span className="tab__dirty-indicator" title="Modified">
                  ●
                </span>
              )}

              <button
                className="tab__close"
                onClick={(e) => handleTabClose(e, tab.id)}
                aria-label={`Close ${getTabTitle(tab)}`}
                title="Close tab (Ctrl+W)"
                data-testid="tab-close"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L6 4.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L7.06 6l2.72 2.72a.75.75 0 1 1-1.06 1.06L6 7.06l-2.72 2.72a.75.75 0 0 1-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 0 1 0-1.06z" />
                </svg>
              </button>

              {index < 9 && (
                <span className="tab__shortcut" title={`Ctrl+${index + 1}`}>
                  {index + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* T063b: Right scroll button */}
      {showRightNav && (
        <button
          className="tab-bar__nav tab-bar__nav--right"
          onClick={scrollRight}
          aria-label="Scroll tabs right"
          data-testid="tab-nav-right"
        >
          ▶
        </button>
      )}

      {canAddTab.warning && (
        <div className="tab-bar__warning" title={canAddTab.warning}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575L6.457 1.047zM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
          <span>{tabCount} tabs open</span>
        </div>
      )}

      {/* T063c: Context menu */}
      {contextMenu && (
        <TabContextMenu
          tabId={contextMenu.tabId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleContextMenuClose}
          onDuplicate={handleContextMenuDuplicate}
          onMoveToNewWindow={handleContextMenuMoveToNewWindow}
          onHide={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default TabBar;

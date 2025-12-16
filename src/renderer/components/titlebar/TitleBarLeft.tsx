/**
 * TitleBarLeft Component
 * Task: T159a
 *
 * Left section of title bar:
 * - Burger button (toggles sidebar visibility)
 * - Menu bar (File, Edit, View, Help)
 * - Back/Forward navigation buttons
 */

import React, { useState } from 'react';
import { useActiveTabNavigation, useTabsStore } from '../../stores/tabs';
import './TitleBar.css';

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    label: string;
    action: () => void;
    separator?: boolean;
    disabled?: boolean;
  }>;
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({ isOpen, onClose, items }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="title-bar__dropdown-backdrop" onClick={onClose} />
      <div className="title-bar__dropdown">
        {items.map((item, index) =>
          item.separator ? (
            <div key={index} className="title-bar__dropdown-separator" />
          ) : (
            <button
              key={index}
              className={`title-bar__dropdown-item${item.disabled ? ' title-bar__dropdown-item--disabled' : ''}`}
              onClick={() => {
                if (!item.disabled) {
                  item.action();
                  onClose();
                }
              }}
              disabled={item.disabled}
              type="button"
            >
              {item.label}
            </button>
          )
        )}
      </div>
    </>
  );
};

interface TitleBarLeftProps {
  onToggleSidebar?: () => void;
}

export const TitleBarLeft: React.FC<TitleBarLeftProps> = ({ onToggleSidebar }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { canGoBack, canGoForward, goBack, goForward } = useActiveTabNavigation();

  const handleBurgerClick = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else {
      // Fallback: dispatch custom event for AppLayout to handle
      window.dispatchEvent(new CustomEvent('toggle-sidebar'));
    }
  };

  // T159d: File menu items
  const fileMenuItems = [
    {
      label: 'Open File...',
      action: () => {
        window.electronAPI?.on('menu:open-file', () => {});
        window.dispatchEvent(new CustomEvent('menu:open-file'));
      },
    },
    {
      label: 'Open Folder...',
      action: () => {
        window.electronAPI?.on('menu:open-folder', () => {});
        window.dispatchEvent(new CustomEvent('menu:open-folder'));
      },
    },
    { separator: true, label: '', action: () => {} },
    {
      label: 'Close Current',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:close-current'));
      },
    },
    {
      label: 'Close Folder',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:close-folder'));
      },
    },
    {
      label: 'Close All',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:close-all'));
      },
    },
  ];

  const editMenuItems = [
    {
      label: 'Find in Page...',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:find'));
      },
    },
    {
      label: 'Find in Files...',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:find-in-files'));
      },
    },
  ];

  // Get active tab state for Home button and history display
  const activeTab = useTabsStore((state) =>
    state.activeTabId ? state.tabs.get(state.activeTabId) : undefined
  );
  const isAtHome = !activeTab || activeTab.currentHistoryIndex === 0 || activeTab.navigationHistory.length === 0;

  // Build history items for display (last 5 back, current, next 5 forward)
  const historyItems = React.useMemo(() => {
    if (!activeTab || activeTab.navigationHistory.length === 0) {
      return [{ label: '(No history)', action: () => {}, disabled: true }];
    }

    // Helper function to format file/directory names for history display
    const formatHistoryLabel = (filePath: string): string => {
      const isDirectoryListing = filePath.includes('[Directory Index]');
      if (isDirectoryListing) {
        // Extract directory name and add trailing backslash
        const dirPath = filePath.replace(/[/\\]\[Directory Index\]$/, '');
        const dirName = dirPath.split(/[/\\]/).pop() || 'Unknown';
        return `${dirName}\\`;
      } else {
        // Regular file
        return filePath.split(/[/\\]/).pop() || 'Unknown';
      }
    };

    const items: Array<{ label: string; action: () => void; disabled?: boolean; separator?: boolean }> = [];
    const history = activeTab.navigationHistory;
    const currentIndex = activeTab.currentHistoryIndex;

    // Add "HISTORY:" header
    items.push({ label: `HISTORY (${currentIndex + 1}/${history.length}):`, action: () => {}, disabled: true });

    // Show up to 5 entries before current
    const startIndex = Math.max(0, currentIndex - 5);
    for (let i = startIndex; i < currentIndex; i++) {
      const entry = history[i];
      const displayName = formatHistoryLabel(entry.filePath);
      items.push({
        label: `  ${i}: ${displayName}`,
        action: () => {
          // Navigate to this history position
          const { activeTabId } = useTabsStore.getState();
          if (activeTabId) {
            const tab = useTabsStore.getState().tabs.get(activeTabId);
            if (tab) {
              const newTabs = new Map(useTabsStore.getState().tabs);
              newTabs.set(activeTabId, { ...tab, currentHistoryIndex: i });
              useTabsStore.setState({ tabs: newTabs });
              window.dispatchEvent(new CustomEvent('navigate-to-history', { detail: entry }));
            }
          }
        },
      });
    }

    // Show current entry with marker
    const currentEntry = history[currentIndex];
    const currentDisplayName = formatHistoryLabel(currentEntry.filePath);
    items.push({
      label: `▶ ${currentIndex}: ${currentDisplayName} ◀`,
      action: () => {},
      disabled: true,
    });

    // Show up to 5 entries after current
    const endIndex = Math.min(history.length, currentIndex + 6);
    for (let i = currentIndex + 1; i < endIndex; i++) {
      const entry = history[i];
      const displayName = formatHistoryLabel(entry.filePath);
      items.push({
        label: `  ${i}: ${displayName}`,
        action: () => {
          // Navigate to this history position
          const { activeTabId } = useTabsStore.getState();
          if (activeTabId) {
            const tab = useTabsStore.getState().tabs.get(activeTabId);
            if (tab) {
              const newTabs = new Map(useTabsStore.getState().tabs);
              newTabs.set(activeTabId, { ...tab, currentHistoryIndex: i });
              useTabsStore.setState({ tabs: newTabs });
              window.dispatchEvent(new CustomEvent('navigate-to-history', { detail: entry }));
            }
          }
        },
      });
    }

    return items;
  }, [activeTab?.navigationHistory, activeTab?.currentHistoryIndex]);

  const viewMenuItems = [
    {
      label: 'Back',
      action: () => goBack(),
      disabled: !canGoBack,  // Now a boolean, not a function!
    },
    {
      label: 'Forward',
      action: () => goForward(),
      disabled: !canGoForward,  // Now a boolean, not a function!
    },
    {
      label: 'Home',
      action: () => {
        // Navigate to the first file in history (position 0 in the queue)
        const { activeTabId, tabs } = useTabsStore.getState();
        if (activeTabId) {
          const tab = tabs.get(activeTabId);
          if (tab && tab.navigationHistory.length > 0 && tab.currentHistoryIndex !== 0) {
            const homeEntry = tab.navigationHistory[0];

            // Update the history index to 0
            const newTabs = new Map(tabs);
            newTabs.set(activeTabId, {
              ...tab,
              currentHistoryIndex: 0
            });
            useTabsStore.setState({ tabs: newTabs });

            // Dispatch event to navigate
            window.dispatchEvent(new CustomEvent('navigate-to-history', { detail: homeEntry }));
          }
        }
      },
      disabled: isAtHome,  // Now reactive!
    },
    { separator: true, label: '', action: () => {} },
    ...historyItems,  // Add history display
    { separator: true, label: '', action: () => {} },
    {
      label: 'Toggle Sidebar',
      action: handleBurgerClick,
    },
    {
      label: 'Toggle Full Screen',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:toggle-fullscreen'));
      },
    },
    { separator: true, label: '', action: () => {} },
    {
      label: 'Zoom In',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:zoom-in'));
      },
    },
    {
      label: 'Zoom Out',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:zoom-out'));
      },
    },
    {
      label: 'Reset Zoom',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:zoom-reset'));
      },
    },
  ];

  const helpMenuItems = [
    {
      label: 'Keyboard Shortcuts',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:shortcuts'));
      },
    },
    {
      label: 'About MarkRead',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:about'));
      },
    },
  ];

  return (
    <div className="title-bar__left">
      {/* Burger button */}
      <button
        className="title-bar__button title-bar__burger"
        onClick={handleBurgerClick}
        title="Toggle Sidebar"
        type="button"
      >
        ☰
      </button>

      {/* Menu bar */}
      <div className="title-bar__menubar">
        <div className="title-bar__menu-item">
          <button
            className="title-bar__button"
            onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            type="button"
          >
            File
          </button>
          <MenuDropdown
            isOpen={openMenu === 'file'}
            onClose={() => setOpenMenu(null)}
            items={fileMenuItems}
          />
        </div>

        <div className="title-bar__menu-item">
          <button
            className="title-bar__button"
            onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
            type="button"
          >
            Edit
          </button>
          <MenuDropdown
            isOpen={openMenu === 'edit'}
            onClose={() => setOpenMenu(null)}
            items={editMenuItems}
          />
        </div>

        <div className="title-bar__menu-item">
          <button
            className="title-bar__button"
            onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
            type="button"
          >
            View
          </button>
          <MenuDropdown
            isOpen={openMenu === 'view'}
            onClose={() => setOpenMenu(null)}
            items={viewMenuItems}
          />
        </div>

        <div className="title-bar__menu-item">
          <button
            className="title-bar__button"
            onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
            type="button"
          >
            Help
          </button>
          <MenuDropdown
            isOpen={openMenu === 'help'}
            onClose={() => setOpenMenu(null)}
            items={helpMenuItems}
          />
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="title-bar__nav-buttons">
        <button
          className="title-bar__button title-bar__nav-button"
          onClick={() => goBack()}
          disabled={!canGoBack}
          title="Go Back"
          type="button"
        >
          ◀
        </button>
        <button
          className="title-bar__button title-bar__nav-button"
          onClick={() => goForward()}
          disabled={!canGoForward}
          title="Go Forward"
          type="button"
        >
          ▶
        </button>
      </div>
    </div>
  );
};

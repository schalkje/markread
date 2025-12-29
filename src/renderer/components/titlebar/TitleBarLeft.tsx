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

  // Get active tab state for Home button
  const activeTab = useTabsStore((state) =>
    state.activeTabId ? state.tabs.get(state.activeTabId) : undefined
  );
  const isAtHome = !activeTab || activeTab.currentHistoryIndex === 0 || activeTab.navigationHistory.length === 0;

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
    {
      label: 'Show History',
      action: () => {
        window.dispatchEvent(new CustomEvent('show-history'));
      },
    },
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
    // Document Zoom (Content Only)
    {
      label: 'Document Zoom In (Ctrl+=)',
      action: () => {
        const { activeTabId, updateTabZoomLevel, tabs } = useTabsStore.getState();
        if (activeTabId) {
          const tab = tabs.get(activeTabId);
          if (tab) {
            const newZoom = Math.min(2000, (tab.zoomLevel || 100) + 10);
            updateTabZoomLevel(activeTabId, newZoom);
          }
        }
      },
    },
    {
      label: 'Document Zoom Out (Ctrl+-)',
      action: () => {
        const { activeTabId, updateTabZoomLevel, tabs } = useTabsStore.getState();
        if (activeTabId) {
          const tab = tabs.get(activeTabId);
          if (tab) {
            const newZoom = Math.max(10, (tab.zoomLevel || 100) - 10);
            updateTabZoomLevel(activeTabId, newZoom);
          }
        }
      },
    },
    {
      label: 'Reset Document Zoom (Ctrl+0)',
      action: () => {
        const { activeTabId, updateTabZoomLevel } = useTabsStore.getState();
        if (activeTabId) {
          updateTabZoomLevel(activeTabId, 100);
        }
      },
    },
    { separator: true, label: '', action: () => {} },
    // Application Zoom (Entire UI)
    {
      label: 'Application Zoom In (Ctrl+Alt+=)',
      action: async () => {
        const { useUIStore } = await import('../../stores/ui');
        const { incrementGlobalZoom } = useUIStore.getState();
        incrementGlobalZoom(10);
      },
    },
    {
      label: 'Application Zoom Out (Ctrl+Alt+-)',
      action: async () => {
        const { useUIStore } = await import('../../stores/ui');
        const { incrementGlobalZoom } = useUIStore.getState();
        incrementGlobalZoom(-10);
      },
    },
    {
      label: 'Reset Application Zoom (Ctrl+Alt+0)',
      action: async () => {
        const { useUIStore } = await import('../../stores/ui');
        const { resetGlobalZoom } = useUIStore.getState();
        resetGlobalZoom();
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

/**
 * TitleBarLeft Component
 * Task: T159a
 *
 * Left section of title bar:
 * - Burger button (toggles sidebar visibility)
 * - Menu bar (File, Edit, View, Go, Help)
 * - Back/Forward navigation buttons
 */

import React, { useState } from 'react';
import { useActiveTabNavigation } from '../../stores/tabs';
import './TitleBar.css';

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    label: string;
    action: () => void;
    separator?: boolean;
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
              className="title-bar__dropdown-item"
              onClick={() => {
                item.action();
                onClose();
              }}
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

  const viewMenuItems = [
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

  const goMenuItems = [
    {
      label: 'Back',
      action: () => goBack(),
    },
    {
      label: 'Forward',
      action: () => goForward(),
    },
    { separator: true, label: '', action: () => {} },
    {
      label: 'Go to Line...',
      action: () => {
        window.dispatchEvent(new CustomEvent('menu:go-to-line'));
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
            onClick={() => setOpenMenu(openMenu === 'go' ? null : 'go')}
            type="button"
          >
            Go
          </button>
          <MenuDropdown
            isOpen={openMenu === 'go'}
            onClose={() => setOpenMenu(null)}
            items={goMenuItems}
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
          disabled={!canGoBack()}
          title="Go Back"
          type="button"
        >
          ◀
        </button>
        <button
          className="title-bar__button title-bar__nav-button"
          onClick={() => goForward()}
          disabled={!canGoForward()}
          title="Go Forward"
          type="button"
        >
          ▶
        </button>
      </div>
    </div>
  );
};

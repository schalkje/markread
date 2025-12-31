/**
 * Branch Switcher Component
 *
 * Dropdown to switch between branches for repository folders with:
 * - List of all branches
 * - Active branch highlighting
 * - Default branch indicator
 */

import React, { useState, useRef, useEffect } from 'react';
import { useFoldersStore } from '../../stores/folders';
import './BranchSwitcher.css';

export interface BranchSwitcherProps {
  /** Folder ID of the repository */
  folderId: string;
  /** Callback when branch is switched */
  onBranchChange?: (branch: string) => void;
}

/**
 * Branch switcher component for repository folders
 */
export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({
  folderId,
  onBranchChange,
}) => {
  const folder = useFoldersStore((state) =>
    state.folders.find((f) => f.id === folderId)
  );
  const updateRepositoryBranch = useFoldersStore(
    (state) => state.updateRepositoryBranch
  );

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentBranch = folder?.currentBranch || folder?.defaultBranch;
  const branches = folder?.branches || [];
  const isRepositoryFolder = folder?.type === 'repository' && branches.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    // Only set up listener if this is a repository folder
    if (!isRepositoryFolder) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isRepositoryFolder]);

  // Only show for repository folders - early return AFTER all hooks
  if (!isRepositoryFolder) {
    return null;
  }

  // Handle branch selection
  const handleBranchSelect = async (branchName: string) => {
    setIsOpen(false);

    // Update store
    updateRepositoryBranch(folderId, branchName);

    // Notify parent
    onBranchChange?.(branchName);

    // Trigger file tree reload by dispatching custom event
    window.dispatchEvent(new CustomEvent('repository:branch-changed', {
      detail: { folderId, branch: branchName }
    }));
  };

  return (
    <div className="branch-switcher" ref={dropdownRef} data-testid="branch-switcher">
      <button
        className="branch-switcher__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup="true"
        type="button"
        title={`Current branch: ${currentBranch}`}
      >
        <span className="branch-switcher__icon">🌿</span>
        <span className="branch-switcher__name">{currentBranch}</span>
        <span className="branch-switcher__chevron">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown list */}
      {isOpen && (
        <div className="branch-switcher__dropdown" data-testid="branch-switcher-dropdown">
          {branches.map((branch) => (
            <div
              key={branch.name}
              className={`branch-switcher__item ${
                branch.name === currentBranch ? 'branch-switcher__item--active' : ''
              }`}
              onClick={() => handleBranchSelect(branch.name)}
              data-testid={`branch-item-${branch.name}`}
            >
              <span className="branch-switcher__item-icon">
                {branch.isDefault ? '⭐' : '🌿'}
              </span>
              <div className="branch-switcher__item-info">
                <span className="branch-switcher__item-name">
                  {branch.name}
                  {branch.isDefault && (
                    <span className="branch-switcher__default"> (default)</span>
                  )}
                </span>
                <span className="branch-switcher__item-sha" title={branch.sha}>
                  {branch.sha.substring(0, 7)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BranchSwitcher;

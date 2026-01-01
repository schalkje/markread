/**
 * Find Bar Component
 * Task: T169
 *
 * In-page search with Ctrl+F activation
 * Supports case-sensitive, whole-word, and regex options (FR-042)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSearchStore } from '../../stores/search';
import './FindBar.css';

export interface FindBarProps {
  /** Whether the find bar is visible */
  isVisible: boolean;
  /** Callback when find bar should close */
  onClose: () => void;
  /** Callback to perform search in the active document */
  onFind: (query: string, options: FindOptions) => FindResult;
  /** Callback for find next */
  onFindNext?: () => void;
  /** Callback for find previous */
  onFindPrevious?: () => void;
}

export interface FindOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export interface FindResult {
  currentIndex: number;
  totalMatches: number;
}

/**
 * T169: FindBar component for in-page search
 */
export const FindBar: React.FC<FindBarProps> = ({
  isVisible,
  onClose,
  onFind,
  onFindNext,
  onFindPrevious,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    findInPageQuery,
    findInPageOptions,
    findInPageCurrentIndex,
    findInPageTotalMatches,
    setFindInPageQuery,
    setFindInPageOptions,
    setFindInPageResults,
    clearFindInPage,
    addToHistory,
  } = useSearchStore();

  const [localQuery, setLocalQuery] = useState(findInPageQuery);

  // Focus input when visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isVisible]);

  // Perform search when query or options change
  useEffect(() => {
    if (!localQuery || !isVisible) {
      setFindInPageResults(0, 0);
      return;
    }

    const result = onFind(localQuery, findInPageOptions);
    setFindInPageResults(result.currentIndex, result.totalMatches);

    // Add to history if there are results
    if (result.totalMatches > 0) {
      addToHistory({
        query: localQuery,
        type: 'inPage',
        resultsCount: result.totalMatches,
      });
    }
  }, [localQuery, findInPageOptions, isVisible]);

  const handleClose = () => {
    clearFindInPage();
    setLocalQuery('');
    onClose();
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setLocalQuery(query);
    setFindInPageQuery(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        handleFindPrevious();
      } else {
        handleFindNext();
      }
    }
  };

  const handleFindNext = () => {
    onFindNext?.();
  };

  const handleFindPrevious = () => {
    onFindPrevious?.();
  };

  const toggleOption = (option: keyof FindOptions) => {
    setFindInPageOptions({
      [option]: !findInPageOptions[option],
    });
  };

  if (!isVisible) {
    return null;
  }

  const hasMatches = findInPageTotalMatches > 0;
  const noMatches = localQuery && findInPageTotalMatches === 0;

  return (
    <div className="find-bar" data-testid="find-bar">
      <div className="find-bar__content">
        {/* Search Input */}
        <div className="find-bar__input-container">
          <input
            ref={inputRef}
            type="text"
            className={`find-bar__input ${noMatches ? 'find-bar__input--no-matches' : ''}`}
            placeholder="Find in page..."
            value={localQuery}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            aria-label="Find in page"
          />

          {/* Match Counter */}
          {hasMatches && (
            <span className="find-bar__counter" data-testid="find-bar-counter">
              {findInPageCurrentIndex + 1} of {findInPageTotalMatches}
            </span>
          )}

          {noMatches && (
            <span className="find-bar__no-matches" data-testid="find-bar-no-matches">
              No matches
            </span>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="find-bar__navigation">
          <button
            className="find-bar__button find-bar__button--icon"
            onClick={handleFindPrevious}
            disabled={!hasMatches}
            title="Previous match (Shift+Enter)"
            aria-label="Previous match"
          >
            ▲
          </button>
          <button
            className="find-bar__button find-bar__button--icon"
            onClick={handleFindNext}
            disabled={!hasMatches}
            title="Next match (Enter)"
            aria-label="Next match"
          >
            ▼
          </button>
        </div>

        {/* Options */}
        <div className="find-bar__options">
          <button
            className={`find-bar__option ${findInPageOptions.caseSensitive ? 'find-bar__option--active' : ''}`}
            onClick={() => toggleOption('caseSensitive')}
            title="Match Case"
            aria-label="Match case"
            aria-pressed={findInPageOptions.caseSensitive}
          >
            Aa
          </button>
          <button
            className={`find-bar__option ${findInPageOptions.wholeWord ? 'find-bar__option--active' : ''}`}
            onClick={() => toggleOption('wholeWord')}
            title="Match Whole Word"
            aria-label="Match whole word"
            aria-pressed={findInPageOptions.wholeWord}
          >
            Ab|
          </button>
          <button
            className={`find-bar__option ${findInPageOptions.useRegex ? 'find-bar__option--active' : ''}`}
            onClick={() => toggleOption('useRegex')}
            title="Use Regular Expression"
            aria-label="Use regular expression"
            aria-pressed={findInPageOptions.useRegex}
          >
            .*
          </button>
        </div>

        {/* Close Button */}
        <button
          className="find-bar__close"
          onClick={handleClose}
          title="Close (Escape)"
          aria-label="Close find bar"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default FindBar;

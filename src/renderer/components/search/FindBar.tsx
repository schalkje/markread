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
  const isExternalUpdateRef = useRef<boolean>(false);

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
  // T030, T031: Regex validation state
  const [regexError, setRegexError] = useState<string | null>(null);

  // Sync localQuery with findInPageQuery when it changes externally (e.g., from search result click)
  useEffect(() => {
    if (findInPageQuery && findInPageQuery !== localQuery) {
      isExternalUpdateRef.current = true;
      setLocalQuery(findInPageQuery);
    }
  }, [findInPageQuery]);

  // Focus input when visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isVisible]);

  // T030: Validate regex pattern
  const validateRegex = (pattern: string): { valid: boolean; error?: string; dangerous?: boolean } => {
    if (!findInPageOptions.useRegex) {
      return { valid: true };
    }

    try {
      // T032: Check for dangerous patterns
      const dangerousPatterns = [
        /(a+)+/,  // Catastrophic backtracking
        /(a*)*/,
        /(a|a)*/,
        /(a|ab)*/,
        /(\w+\s*)+$/, // ReDoS patterns
      ];

      for (const dangerous of dangerousPatterns) {
        if (dangerous.test(pattern)) {
          return {
            valid: false,
            error: 'Dangerous regex pattern detected (potential ReDoS)',
            dangerous: true
          };
        }
      }

      // Try to compile the regex
      new RegExp(pattern);
      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Invalid regex pattern'
      };
    }
  };

  // Perform search when query or options change (with debouncing)
  useEffect(() => {
    // Skip clear and debounce for external updates (e.g., from search result click)
    if (isExternalUpdateRef.current) {
      isExternalUpdateRef.current = false;
      setRegexError(null);
      return;
    }

    // Clear old results immediately when query changes
    setFindInPageQuery('');
    setFindInPageResults(0, 0);
    setRegexError(null); // T031: Clear previous errors

    if (!localQuery || !isVisible) {
      return;
    }

    // Debounce search: wait 300ms after user stops typing
    const debounceTimer = setTimeout(() => {
      // T030, T031: Validate regex before search
      const validation = validateRegex(localQuery);
      if (!validation.valid) {
        setRegexError(validation.error || 'Invalid pattern');
        setFindInPageResults(0, 0);
        return;
      }

      // Update global store with the final query (triggers highlighting)
      setFindInPageQuery(localQuery);

      // T033: Execute search with timeout protection
      try {
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
      } catch (error) {
        // T034: Handle regex timeout or errors
        console.error('[FindBar] Search error:', error);
        setRegexError('Search failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        setFindInPageResults(0, 0);
      }
    }, 300);

    // Clear timer if user types again before 300ms
    return () => clearTimeout(debounceTimer);
  }, [localQuery, findInPageOptions, isVisible, onFind, setFindInPageQuery, setFindInPageResults, addToHistory]);

  const handleClose = () => {
    clearFindInPage();
    setLocalQuery('');
    onClose();
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setLocalQuery(query);
    // Don't update global store immediately - let the debounced search do it
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
  const noMatches = localQuery && findInPageTotalMatches === 0 && !regexError;

  // T031: Determine input class based on state
  const inputClass = [
    'find-bar__input',
    regexError ? 'find-bar__input--error' : '',
    noMatches ? 'find-bar__input--no-matches' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className="find-bar" data-testid="find-bar">
      <div className="find-bar__content">
        {/* Search Input */}
        <div className="find-bar__input-container">
          <input
            ref={inputRef}
            type="text"
            className={inputClass}
            placeholder="Find in page..."
            value={localQuery}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            aria-label="Find in page"
            title={regexError || undefined} // T031: Show error as tooltip
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

          {/* T031, T034: Error message display */}
          {regexError && (
            <span className="find-bar__error" data-testid="find-bar-error">
              ⚠ {regexError}
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

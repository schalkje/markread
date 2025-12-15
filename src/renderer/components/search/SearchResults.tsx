/**
 * Search Results Panel Component
 * Task: T171
 *
 * Displays cross-file search results with:
 * - File grouping (FR-044)
 * - Preview snippets with highlighting
 * - Incremental result updates
 * - Search progress indication (FR-043)
 */

import React, { useState, useEffect } from 'react';
import { useSearchStore, SearchResult, SearchMatch } from '../../stores/search';
import './SearchResults.css';

export interface SearchResultsProps {
  /** Whether the search panel is visible */
  isVisible: boolean;
  /** Callback when search panel should close */
  onClose: () => void;
  /** Callback when a search result is clicked */
  onResultClick?: (filePath: string, lineNumber: number) => void;
  /** Callback to start a new search */
  onSearch?: (query: string) => void;
  /** Callback to cancel active search */
  onCancel?: () => void;
}

/**
 * T171: SearchResults component with file grouping and previews
 */
export const SearchResults: React.FC<SearchResultsProps> = ({
  isVisible,
  onClose,
  onResultClick,
  onSearch,
  onCancel,
}) => {
  const {
    activeSearch,
    searchInFilesOptions,
    setSearchInFilesOptions,
    getRecentSearches,
  } = useSearchStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [showOptions, setShowOptions] = useState(false);

  const recentSearches = getRecentSearches(5);

  // Auto-expand files with results
  useEffect(() => {
    if (activeSearch?.results) {
      const newExpanded = new Set(expandedFiles);
      activeSearch.results.forEach((result) => {
        newExpanded.add(result.filePath);
      });
      setExpandedFiles(newExpanded);
    }
  }, [activeSearch?.results]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    onSearch?.(searchQuery);
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const handleResultClick = (filePath: string, lineNumber: number) => {
    onResultClick?.(filePath, lineNumber);
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const toggleOption = (option: keyof typeof searchInFilesOptions) => {
    if (typeof searchInFilesOptions[option] === 'boolean') {
      setSearchInFilesOptions({
        [option]: !searchInFilesOptions[option],
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  const isSearching = activeSearch?.isActive;
  const hasResults = activeSearch && activeSearch.results.length > 0;

  return (
    <div className="search-results" data-testid="search-results">
      {/* Header */}
      <div className="search-results__header">
        <h2 className="search-results__title">Search in Files</h2>
        <button
          className="search-results__close"
          onClick={onClose}
          title="Close search panel"
          aria-label="Close search panel"
        >
          ×
        </button>
      </div>

      {/* Search Input */}
      <div className="search-results__search">
        <div className="search-results__input-container">
          <input
            type="text"
            className="search-results__input"
            placeholder="Search across all files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            disabled={isSearching}
            aria-label="Search query"
          />

          {isSearching ? (
            <button
              className="search-results__button search-results__button--cancel"
              onClick={handleCancel}
              title="Cancel search"
            >
              Cancel
            </button>
          ) : (
            <button
              className="search-results__button search-results__button--search"
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              title="Search (Enter)"
            >
              Search
            </button>
          )}
        </div>

        {/* Options Toggle */}
        <button
          className="search-results__options-toggle"
          onClick={() => setShowOptions(!showOptions)}
          aria-expanded={showOptions}
        >
          Options {showOptions ? '▲' : '▼'}
        </button>

        {/* Search Options */}
        {showOptions && (
          <div className="search-results__options">
            <label className="search-results__option">
              <input
                type="checkbox"
                checked={searchInFilesOptions.caseSensitive}
                onChange={() => toggleOption('caseSensitive')}
              />
              <span>Match Case</span>
            </label>
            <label className="search-results__option">
              <input
                type="checkbox"
                checked={searchInFilesOptions.wholeWord}
                onChange={() => toggleOption('wholeWord')}
              />
              <span>Match Whole Word</span>
            </label>
            <label className="search-results__option">
              <input
                type="checkbox"
                checked={searchInFilesOptions.useRegex}
                onChange={() => toggleOption('useRegex')}
              />
              <span>Use Regular Expression</span>
            </label>
            <label className="search-results__option">
              <input
                type="checkbox"
                checked={searchInFilesOptions.includeHiddenFiles}
                onChange={() => toggleOption('includeHiddenFiles')}
              />
              <span>Include Hidden Files</span>
            </label>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {isSearching && activeSearch && (
        <div className="search-results__progress" data-testid="search-progress">
          <div className="search-results__progress-text">
            Searching: {activeSearch.filesSearched} of {activeSearch.totalFiles} files
          </div>
          <div className="search-results__progress-bar">
            <div
              className="search-results__progress-fill"
              style={{
                width: `${
                  activeSearch.totalFiles > 0
                    ? (activeSearch.filesSearched / activeSearch.totalFiles) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="search-results__progress-stats">
            {activeSearch.resultsFound} results found
          </div>
        </div>
      )}

      {/* Results Summary */}
      {!isSearching && hasResults && (
        <div className="search-results__summary">
          <strong>{activeSearch.resultsFound} results</strong> in{' '}
          <strong>{activeSearch.results.length} files</strong>
        </div>
      )}

      {/* Recent Searches */}
      {!activeSearch && recentSearches.length > 0 && (
        <div className="search-results__recent">
          <h3 className="search-results__recent-title">Recent Searches</h3>
          <div className="search-results__recent-list">
            {recentSearches.map((entry, index) => (
              <button
                key={index}
                className="search-results__recent-item"
                onClick={() => handleRecentSearchClick(entry.query)}
                title={`${entry.query} (${entry.resultsCount || 0} results)`}
              >
                <span className="search-results__recent-query">{entry.query}</span>
                {entry.resultsCount !== undefined && (
                  <span className="search-results__recent-count">
                    {entry.resultsCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      {hasResults && (
        <div className="search-results__list">
          {activeSearch.results.map((result) => (
            <SearchResultFile
              key={result.filePath}
              result={result}
              isExpanded={expandedFiles.has(result.filePath)}
              onToggle={() => toggleFile(result.filePath)}
              onMatchClick={(lineNumber) =>
                handleResultClick(result.filePath, lineNumber)
              }
            />
          ))}
        </div>
      )}

      {/* No Results */}
      {!isSearching && activeSearch && !hasResults && activeSearch.query && (
        <div className="search-results__empty">
          <p>No results found for "{activeSearch.query}"</p>
        </div>
      )}
    </div>
  );
};

/**
 * Individual file result with matches
 */
interface SearchResultFileProps {
  result: SearchResult;
  isExpanded: boolean;
  onToggle: () => void;
  onMatchClick: (lineNumber: number) => void;
}

const SearchResultFile: React.FC<SearchResultFileProps> = ({
  result,
  isExpanded,
  onToggle,
  onMatchClick,
}) => {
  return (
    <div className="search-result-file">
      <button
        className="search-result-file__header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className="search-result-file__chevron">
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="search-result-file__icon">📄</span>
        <span className="search-result-file__name" title={result.filePath}>
          {result.fileName}
        </span>
        <span className="search-result-file__count">
          {result.matches.length} {result.matches.length === 1 ? 'match' : 'matches'}
        </span>
      </button>

      {isExpanded && (
        <div className="search-result-file__matches">
          {result.matches.map((match, index) => (
            <SearchResultMatch
              key={`${match.lineNumber}-${index}`}
              match={match}
              onClick={() => onMatchClick(match.lineNumber)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Individual search match with preview snippet
 */
interface SearchResultMatchProps {
  match: SearchMatch;
  onClick: () => void;
}

const SearchResultMatch: React.FC<SearchResultMatchProps> = ({ match, onClick }) => {
  // Split snippet into before, highlight, and after parts
  const before = match.previewSnippet.slice(0, match.highlightStart);
  const highlighted = match.previewSnippet.slice(
    match.highlightStart,
    match.highlightEnd
  );
  const after = match.previewSnippet.slice(match.highlightEnd);

  return (
    <button
      className="search-result-match"
      onClick={onClick}
      title={`Line ${match.lineNumber}: ${match.lineContent}`}
    >
      <span className="search-result-match__line">{match.lineNumber}</span>
      <span className="search-result-match__content">
        <span className="search-result-match__text">{before}</span>
        <mark className="search-result-match__highlight">{highlighted}</mark>
        <span className="search-result-match__text">{after}</span>
      </span>
    </button>
  );
};

export default SearchResults;

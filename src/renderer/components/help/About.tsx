/**
 * About Dialog Component
 *
 * Displays application information including:
 * - App logo and name
 * - Version number
 * - Description
 * - License and author info
 * - Links to documentation/repository
 */

import React, { useState, useEffect } from 'react';
import './About.css';

// Import images
import logoImage from '../../../../assets/markread-logo.png';
import splashImage from '../../../../assets/markread-splash.png';

export interface AboutProps {
  /** Whether the about dialog is visible */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
}

interface ChangelogEntry {
  category: string;
  items: string[];
}

export const About: React.FC<AboutProps> = ({ isOpen, onClose }) => {
  const [version, setVersion] = useState<string>('');
  const [releaseDate, setReleaseDate] = useState<string | null>(null);
  const [changelog, setChangelog] = useState<ChangelogEntry[] | null>(null);
  const [changelogExpanded, setChangelogExpanded] = useState(false);

  // Fetch version and changelog from main process when dialog opens
  useEffect(() => {
    if (isOpen) {
      window.electronAPI.app.getVersion().then((result) => {
        if (result.success) {
          setVersion(result.version);
        }
      });

      window.electronAPI.app.getChangelog().then((result) => {
        if (result.success && result.changes) {
          setChangelog(result.changes);
          setReleaseDate(result.date || null);
        }
      });
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="about-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div className="about-dialog">
        {/* Close button */}
        <button
          className="about-dialog__close"
          onClick={onClose}
          aria-label="Close"
          title="Close (Esc)"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L8 6.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L9.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06L8 9.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L6.94 8 2.22 3.28a.75.75 0 0 1 0-1.06z" />
          </svg>
        </button>

        {/* Hero section with splash background */}
        <div className="about-dialog__hero">
          <div className="about-dialog__hero-bg">
            <img
              src={splashImage}
              alt="MarkRead"
              className="about-dialog__hero-image"
            />
          </div>
          <div className="about-dialog__hero-content">
            <img
              src={logoImage}
              alt="MarkRead Logo"
              className="about-dialog__logo-image"
            />
            <h1 id="about-title" className="about-dialog__title">
              MarkRead
            </h1>
            <div className="about-dialog__version">
              Version {version || '...'}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="about-dialog__content">
          {/* Tagline */}
          <p className="about-dialog__tagline">
            Your Modern Markdown Companion
          </p>

          {/* Description */}
          <p className="about-dialog__description">
            MarkRead is a powerful, fast, and elegant markdown viewer designed for developers
            and writers who demand the best. Experience your markdown files with beautiful
            rendering, syntax highlighting, and a distraction-free interface.
          </p>

          {/* Features grid */}
          <div className="about-dialog__features">
            <div className="about-dialog__feature">
              <div className="about-dialog__feature-icon">⚡</div>
              <div className="about-dialog__feature-text">
                <h3>Lightning Fast</h3>
                <p>Instant rendering with smooth scrolling</p>
              </div>
            </div>
            <div className="about-dialog__feature">
              <div className="about-dialog__feature-icon">🎨</div>
              <div className="about-dialog__feature-text">
                <h3>Beautiful UI</h3>
                <p>Clean, modern interface with dark mode</p>
              </div>
            </div>
            <div className="about-dialog__feature">
              <div className="about-dialog__feature-icon">🔧</div>
              <div className="about-dialog__feature-text">
                <h3>Powerful Tools</h3>
                <p>Tab management, zoom controls & more</p>
              </div>
            </div>
            <div className="about-dialog__feature">
              <div className="about-dialog__feature-icon">📊</div>
              <div className="about-dialog__feature-text">
                <h3>Rich Content</h3>
                <p>Mermaid diagrams, tables & code blocks</p>
              </div>
            </div>
          </div>

          {/* Info section */}
          <div className="about-dialog__info">
            <div className="about-dialog__info-item">
              <strong>License:</strong> MIT Open Source
            </div>
            <div className="about-dialog__info-item">
              <strong>Author:</strong> MarkRead Team
            </div>
          </div>

          {/* Changelog section */}
          {changelog && changelog.length > 0 && (
            <div className="about-dialog__changelog">
              <button
                className="about-dialog__changelog-toggle"
                onClick={() => setChangelogExpanded(!changelogExpanded)}
                type="button"
              >
                <span className="about-dialog__changelog-title">
                  What&apos;s New in {version}
                  {releaseDate && (
                    <span className="about-dialog__changelog-date">
                      {releaseDate}
                    </span>
                  )}
                </span>
                <svg
                  className={`about-dialog__changelog-arrow ${changelogExpanded ? 'expanded' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {changelogExpanded && (
                <div className="about-dialog__changelog-content">
                  {changelog.map((section, index) => (
                    <div key={index} className="about-dialog__changelog-section">
                      <h4 className="about-dialog__changelog-category">{section.category}</h4>
                      <ul className="about-dialog__changelog-list">
                        {section.items.map((item, itemIndex) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <button
                    className="about-dialog__changelog-link"
                    onClick={() => window.electronAPI.shell.openExternal('https://github.com/schalkje/markread/releases')}
                    type="button"
                  >
                    View full changelog on GitHub
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M3.5 3a.5.5 0 0 0 0 1h3.793L2.146 9.146a.5.5 0 1 0 .708.708L8 4.707V8.5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5h-5z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="about-dialog__footer">
            <p>© {new Date().getFullYear()} MarkRead. All rights reserved.</p>
            <p className="about-dialog__footer-note">
              Built with passion for the markdown community
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;

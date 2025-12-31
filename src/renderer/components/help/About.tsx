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

import React from 'react';
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

export const About: React.FC<AboutProps> = ({ isOpen, onClose }) => {
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
              Version 0.1.0
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

/**
 * MarkdownViewer Component
 * Tasks: T037, T040
 *
 * Displays rendered markdown HTML with:
 * - Syntax highlighting
 * - Mermaid diagrams
 * - Loading and error states
 * - Safe HTML rendering (DOMPurify)
 */

import React, { useEffect, useRef, useState } from 'react';
import { renderMarkdown, renderMermaidDiagrams } from '../../services/markdown-renderer';
import './MarkdownViewer.css';

export interface MarkdownViewerProps {
  /** Markdown content to render */
  content: string;
  /** File path for resolving relative images */
  filePath?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when rendering completes */
  onRenderComplete?: () => void;
}

/**
 * T037: MarkdownViewer component to display rendered HTML
 * T040: With loading state and error handling
 */
export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  filePath,
  isLoading = false,
  error = null,
  onRenderComplete,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (!content || isLoading) return;

    const renderContent = async () => {
      setIsRendering(true);
      setRenderError(null);

      try {
        // Step 1: Convert markdown to HTML
        const html = renderMarkdown(content);

        // Step 2: Insert HTML into DOM
        if (viewerRef.current) {
          viewerRef.current.innerHTML = html;

          // Step 3: Render Mermaid diagrams
          await renderMermaidDiagrams(viewerRef.current);

          // Step 4: Process images with file:// protocol if filePath provided
          if (filePath) {
            await resolveImagePaths(viewerRef.current, filePath);
          }

          // Step 5: Add click handlers for checkboxes (task lists)
          addTaskListHandlers(viewerRef.current);

          // Step 6: Add link handlers for internal navigation
          addLinkHandlers(viewerRef.current);
        }

        setIsRendering(false);
        onRenderComplete?.();
      } catch (err) {
        console.error('Markdown rendering error:', err);
        setRenderError(err instanceof Error ? err.message : 'Failed to render markdown');
        setIsRendering(false);
      }
    };

    renderContent();
  }, [content, filePath, isLoading, onRenderComplete]);

  /**
   * Resolve relative image paths to absolute file:// URLs
   * Uses the file:resolvePath IPC handler (T036)
   */
  const resolveImagePaths = async (container: HTMLElement, baseFilePath: string) => {
    const images = container.querySelectorAll('img[src]');

    for (const img of Array.from(images)) {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('file://')) {
        continue; // Skip absolute URLs
      }

      try {
        // Resolve relative path via IPC
        const result = await window.electronAPI?.file?.resolvePath({
          basePath: baseFilePath,
          relativePath: src,
        });

        if (result?.success && result.absolutePath && result.exists) {
          // Convert to file:// URL
          const fileUrl = `file://${result.absolutePath.replace(/\\/g, '/')}`;
          img.setAttribute('src', fileUrl);
        } else {
          console.warn(`Image not found: ${src}`);
          img.setAttribute('alt', `[Image not found: ${src}]`);
        }
      } catch (err) {
        console.error(`Failed to resolve image path: ${src}`, err);
      }
    }
  };

  /**
   * Add handlers for task list checkboxes
   * Note: Checkboxes are disabled by default (markdown is read-only)
   */
  const addTaskListHandlers = (container: HTMLElement) => {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      // Disable checkboxes (read-only mode)
      checkbox.setAttribute('disabled', 'true');
    });
  };

  /**
   * Add handlers for internal links (same-document anchors)
   */
  const addLinkHandlers = (container: HTMLElement) => {
    const links = container.querySelectorAll('a[href^="#"]');
    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          const target = container.querySelector(href);
          target?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // External links: ensure they open in default browser (T033)
    const externalLinks = container.querySelectorAll('a[href^="http"]');
    externalLinks.forEach((link) => {
      link.setAttribute('rel', 'noopener noreferrer');
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          // Open in system default browser via Electron shell
          try {
            await window.electronAPI?.shell?.openExternal(href);
          } catch (err) {
            console.error('Failed to open external link:', err);
          }
        }
      });
    });
  };

  // T040: Loading state
  if (isLoading || isRendering) {
    return (
      <div className="markdown-viewer markdown-viewer--loading">
        <div className="markdown-viewer__spinner">
          <div className="spinner"></div>
          <p>Loading markdown...</p>
        </div>
      </div>
    );
  }

  // T040: Error state
  if (error || renderError) {
    return (
      <div className="markdown-viewer markdown-viewer--error">
        <div className="markdown-viewer__error">
          <h3>Failed to Render Markdown</h3>
          <p>{error || renderError}</p>
          <button onClick={() => setRenderError(null)}>Retry</button>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="markdown-viewer" ref={viewerRef}>
      {/* Content will be injected here */}
    </div>
  );
};

export default MarkdownViewer;

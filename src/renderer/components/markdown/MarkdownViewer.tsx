/**
 * MarkdownViewer Component
 * Tasks: T037, T040, T047, T048, T049
 *
 * Displays rendered markdown HTML with:
 * - Syntax highlighting
 * - Mermaid diagrams
 * - Loading and error states
 * - Safe HTML rendering (DOMPurify)
 * - Zoom support with scroll preservation (T047)
 * - Pan functionality with click-drag (T048)
 * - Grab cursor styling (T049)
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
  /** Zoom level (10-2000) */
  zoomLevel?: number;
  /** Callback when rendering completes */
  onRenderComplete?: () => void;
  /** Callback when scroll position changes */
  onScrollChange?: (scrollTop: number) => void;
}

/**
 * T037: MarkdownViewer component to display rendered HTML
 * T040: With loading state and error handling
 * T047: With CSS transform scaling and scroll preservation
 * T048: With pan functionality
 * T049: With grab cursor styling
 */
export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  filePath,
  isLoading = false,
  error = null,
  zoomLevel = 100,
  onRenderComplete,
  onScrollChange,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Pan state (T048)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  // T047: Apply zoom with CSS transform and preserve scroll position
  useEffect(() => {
    if (!contentRef.current || !viewerRef.current) return;

    const viewer = viewerRef.current;
    const content = contentRef.current;

    // Store current scroll position
    const scrollTop = viewer.scrollTop;
    const scrollLeft = viewer.scrollLeft;
    const scrollHeight = viewer.scrollHeight;
    const scrollWidth = viewer.scrollWidth;

    // Calculate scroll position ratio (0-1)
    const scrollTopRatio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    const scrollLeftRatio = scrollWidth > 0 ? scrollLeft / scrollWidth : 0;

    // Apply zoom via CSS transform
    const zoomFactor = zoomLevel / 100;
    content.style.transform = `scale(${zoomFactor})`;
    content.style.transformOrigin = 'top left';

    // Restore scroll position (accounting for scale change)
    // Use requestAnimationFrame to ensure layout has updated
    requestAnimationFrame(() => {
      if (viewer && viewer.scrollHeight > 0) {
        viewer.scrollTop = scrollTopRatio * viewer.scrollHeight;
        viewer.scrollLeft = scrollLeftRatio * viewer.scrollWidth;
      }
    });
  }, [zoomLevel]);

  // Render markdown content
  useEffect(() => {
    if (!content || isLoading) return;

    const renderContent = async () => {
      setIsRendering(true);
      setRenderError(null);

      try {
        // Step 1: Convert markdown to HTML
        const html = renderMarkdown(content);

        // Step 2: Insert HTML into DOM
        if (contentRef.current) {
          contentRef.current.innerHTML = html;

          // Step 3: Render Mermaid diagrams
          await renderMermaidDiagrams(contentRef.current);

          // Step 4: Process images with file:// protocol if filePath provided
          if (filePath) {
            await resolveImagePaths(contentRef.current, filePath);
          }

          // Step 5: Add click handlers for checkboxes (task lists)
          addTaskListHandlers(contentRef.current);

          // Step 6: Add link handlers for internal navigation
          addLinkHandlers(contentRef.current);
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

  // T048: Pan functionality with mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only enable panning when zoomed in
    if (zoomLevel <= 100 || !viewerRef.current) return;

    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setScrollStart({
      left: viewerRef.current.scrollLeft,
      top: viewerRef.current.scrollTop,
    });

    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !viewerRef.current) return;

    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;

    viewerRef.current.scrollLeft = scrollStart.left - dx;
    viewerRef.current.scrollTop = scrollStart.top - dy;

    e.preventDefault();
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  // Track scroll changes
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    onScrollChange?.(scrollTop);
  };

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

  // Determine cursor style (T049)
  const getCursorClass = () => {
    if (zoomLevel <= 100) return '';
    if (isPanning) return 'markdown-viewer--grabbing';
    return 'markdown-viewer--grab';
  };

  // Main content
  return (
    <div
      className={`markdown-viewer ${getCursorClass()}`}
      ref={viewerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onScroll={handleScroll}
    >
      <div className="markdown-viewer__content" ref={contentRef}>
        {/* Content will be injected here */}
      </div>
    </div>
  );
};

export default MarkdownViewer;

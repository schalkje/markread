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
import { renderMarkdown, renderMermaidDiagrams, applySyntaxHighlighting } from '../../services/markdown-renderer';
import './MarkdownViewer.css';

export interface MarkdownViewerProps {
  /** Markdown content to render */
  content: string;
  /** File path for resolving relative images and links */
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
  /** Callback when a file link is clicked */
  onFileLink?: (filePath: string) => void;
  /** Callback when zoom level changes (T051i) */
  onZoomChange?: (newZoom: number) => void;
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
  onFileLink,
  onZoomChange,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Pan state (T048, T051l, T051m, T051n)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Touch gesture state (T051j, T051o)
  const [touchState, setTouchState] = useState<{
    initialDistance: number | null;
    initialZoom: number;
    center: { x: number; y: number } | null;
  }>({ initialDistance: null, initialZoom: zoomLevel, center: null });

  // Track zoom target point for zoom-to-cursor/center behavior
  const zoomTargetRef = useRef<{ x: number; y: number; prevZoom: number } | null>(null);

  // Track current zoom level without triggering re-renders (for smooth wheel zoom)
  const currentZoomRef = useRef<number>(zoomLevel);
  const zoomUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Link preview state
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  // Sync currentZoomRef with zoomLevel prop
  useEffect(() => {
    currentZoomRef.current = zoomLevel;
  }, [zoomLevel]);

  // Ref to ensure event listeners always have access to current state setter
  const setHoveredLinkRef = useRef(setHoveredLink);
  useEffect(() => {
    setHoveredLinkRef.current = setHoveredLink;
  }, [setHoveredLink]);

  // Event delegation for link hover and click handling
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    // Handle mouseover for link preview (using event delegation)
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]');
      if (link) {
        const href = link.getAttribute('href');
        if (href) {
          setHoveredLinkRef.current(href);
        }
      }
    };

    // Handle mouseout for link preview
    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]');
      if (link) {
        setHoveredLinkRef.current(null);
      }
    };

    // Handle click for link navigation (using event delegation)
    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      e.preventDefault();

      // Handle internal links (same-document anchors)
      if (href.startsWith('#')) {
        const targetElement = container.querySelector(href);
        targetElement?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // Handle external links: open in default browser
      if (href.startsWith('http://') || href.startsWith('https://')) {
        try {
          await window.electronAPI?.shell?.openExternal(href);
        } catch (err) {
          console.error('Failed to open external link:', err);
        }
        return;
      }

      // Handle relative file links
      if (filePath && onFileLink) {
        try {
          const result = await window.electronAPI?.file?.resolvePath({
            basePath: filePath,
            relativePath: href,
          });

          if (result?.success && result.absolutePath) {
            // Check if it's a directory (no README.md found)
            if (result.isDirectory) {
              console.log(`Opening directory: ${result.absolutePath}`);

              // Get directory listing
              const listingResult = await window.electronAPI?.file?.getDirectoryListing({
                directoryPath: result.absolutePath,
              });

              if (listingResult?.success && listingResult.items) {
                // Extract title from current page for "Back to" link
                const extractFirstHeading = (markdown: string): string | null => {
                  const lines = markdown.split('\n');
                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('#')) {
                      return trimmed.replace(/^#+\s*/, '').trim();
                    }
                  }
                  return null;
                };

                const currentPageTitle = extractFirstHeading(content) || filePath?.split(/[/\\]/).pop()?.replace(/\.(md|markdown)$/i, '') || 'Previous Page';

                // Generate markdown content for directory listing
                const dirName = result.absolutePath.split(/[/\\]/).pop() || 'Directory';
                let markdown = `# ${dirName}\n\n`;

                // Add "Back to" link at the top
                if (filePath) {
                  markdown += `[← Back to: ${currentPageTitle}](${filePath})\n\n---\n\n`;
                }

                // Add directories
                const directories = listingResult.items.filter((item: any) => item.isDirectory);
                if (directories.length > 0) {
                  markdown += '## Folders\n\n';
                  directories.forEach((item: any) => {
                    // Use just the item name since links are relative to the directory being viewed
                    const label = item.title || item.name;
                    markdown += `- [${label}/](${item.name}/)\n`;
                  });
                  markdown += '\n';
                }

                // Add files
                const files = listingResult.items.filter((item: any) => !item.isDirectory);
                if (files.length > 0) {
                  markdown += '## Files\n\n';
                  files.forEach((item: any) => {
                    // Use just the item name since links are relative to the directory being viewed
                    const label = item.title || item.name;
                    markdown += `- [${label}](${item.name})\n`;
                  });
                }

                // Use the actual directory path with a dummy filename for link resolution
                // This ensures path.dirname() in the backend gives us the correct directory
                // Without a filename, path.dirname() would strip the last directory component
                const virtualFilePath = `${result.absolutePath}/[Directory Index]`;

                // Dispatch custom event with directory content
                window.dispatchEvent(new CustomEvent('show-directory-listing', {
                  detail: {
                    directoryPath: result.absolutePath,
                    content: markdown,
                    virtualPath: virtualFilePath,
                  }
                }));
              }
            } else {
              console.log(`Opening relative link: ${href} -> ${result.absolutePath}`);
              onFileLink(result.absolutePath);
            }
          } else {
            console.warn(`Failed to resolve link: ${href}`, result?.error);
          }
        } catch (err) {
          console.error(`Error resolving link: ${href}`, err);
        }
      }
    };

    // Add event listeners to container (event delegation)
    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    container.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
      container.removeEventListener('click', handleClick);
    };
  }, [filePath, onFileLink]);

  // T047: Apply zoom with CSS transform and preserve scroll position
  useEffect(() => {
    if (!contentRef.current || !viewerRef.current) return;

    const viewer = viewerRef.current;
    const content = contentRef.current;

    // Skip if zoom was already applied synchronously (from wheel/touch handler)
    if (currentZoomRef.current === zoomLevel) {
      return;
    }

    // Capture scroll position BEFORE applying transform
    const currentScrollLeft = viewer.scrollLeft;
    const currentScrollTop = viewer.scrollTop;
    const currentScrollHeight = viewer.scrollHeight;
    const currentScrollWidth = viewer.scrollWidth;

    // Apply zoom via CSS transform
    const zoomFactor = zoomLevel / 100;
    content.style.transform = `scale(${zoomFactor})`;
    content.style.transformOrigin = 'top left';

    // Update ref to match
    currentZoomRef.current = zoomLevel;

    // Adjust scroll position after transform
    requestAnimationFrame(() => {
      if (!viewer) return;

      // Check if we have a zoom target point (from mouse/touch zoom)
      if (zoomTargetRef.current) {
        const { x, y, prevZoom } = zoomTargetRef.current;

        // Zoom-to-cursor/center algorithm using captured scroll position
        const rect = viewer.getBoundingClientRect();
        const cursorX = x - rect.left;
        const cursorY = y - rect.top;

        const beforeX = (cursorX + currentScrollLeft) / (prevZoom / 100);
        const beforeY = (cursorY + currentScrollTop) / (prevZoom / 100);

        const afterX = beforeX * (zoomLevel / 100);
        const afterY = beforeY * (zoomLevel / 100);

        viewer.scrollLeft = afterX - cursorX;
        viewer.scrollTop = afterY - cursorY;

        // Clear the zoom target after using it
        zoomTargetRef.current = null;
      } else {
        // No zoom target: use ratio-based scroll preservation (for keyboard/button zoom)
        const scrollTopRatio = currentScrollHeight > 0 ? currentScrollTop / currentScrollHeight : 0;
        const scrollLeftRatio = currentScrollWidth > 0 ? currentScrollLeft / currentScrollWidth : 0;

        if (viewer.scrollHeight > 0) {
          viewer.scrollTop = scrollTopRatio * viewer.scrollHeight;
          viewer.scrollLeft = scrollLeftRatio * viewer.scrollWidth;
        }
      }
    });
  }, [zoomLevel]);

  // Render markdown content
  useEffect(() => {
    if (!content || isLoading) return;

    let isCancelled = false;

    const renderContent = async () => {
      setIsRendering(true);
      setRenderError(null);

      try {
        // Step 1: Convert markdown to HTML
        const html = renderMarkdown(content);

        // Check if cancelled before proceeding
        if (isCancelled) return;
        if (!contentRef.current) {
          setIsRendering(false);
          return;
        }

        // Step 2: Insert HTML into DOM
        contentRef.current.innerHTML = html;

        // Step 3: Render Mermaid diagrams
        await renderMermaidDiagrams(contentRef.current);

        // Check if cancelled after async operation
        if (isCancelled) return;
        if (!contentRef.current) {
          setIsRendering(false);
          return;
        }

        // Step 3.5: Apply syntax highlighting and copy buttons
        // This must happen AFTER HTML is in the DOM for highlightjs-copy to work
        applySyntaxHighlighting(contentRef.current);

        // Step 4: Process images with file:// protocol if filePath provided
        if (filePath) {
          await resolveImagePaths(contentRef.current, filePath);
        }

        // Check if cancelled after async operation
        if (isCancelled) return;
        if (!contentRef.current) {
          setIsRendering(false);
          return;
        }

        // Step 5: Add click handlers for checkboxes (task lists)
        addTaskListHandlers(contentRef.current);

        if (!isCancelled) {
          setIsRendering(false);
          onRenderComplete?.();
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Markdown rendering error:', err);
          setRenderError(err instanceof Error ? err.message : 'Failed to render markdown');
          setIsRendering(false);
        }
      }
    };

    renderContent();

    // Cleanup function to cancel pending operations
    return () => {
      isCancelled = true;
    };
  }, [content, filePath, isLoading, onRenderComplete]);

  // T048, T051l, T051m: Pan functionality with mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only enable panning when zoomed in
    if (zoomLevel <= 100 || !viewerRef.current) return;

    // T051m: Middle-mouse button (button === 1) always pans
    // T051l: Left-click (button === 0) pans when Space is pressed
    // T048: Left-click (button === 0) pans normally when zoomed
    const shouldPan = e.button === 1 || (e.button === 0 && (isSpacePressed || zoomLevel > 100));

    if (shouldPan) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setScrollStart({
        left: viewerRef.current.scrollLeft,
        top: viewerRef.current.scrollTop,
      });

      if (viewerRef.current) {
        viewerRef.current.style.cursor = 'grabbing';
      }

      e.preventDefault();
    }
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
    if (viewerRef.current) {
      viewerRef.current.style.cursor = isSpacePressed ? 'grab' : (zoomLevel > 100 ? 'grab' : '');
    }
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    if (viewerRef.current) {
      viewerRef.current.style.cursor = isSpacePressed ? 'grab' : (zoomLevel > 100 ? 'grab' : '');
    }
  };

  // Track scroll changes
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    onScrollChange?.(scrollTop);
  };

  // T051i: Mouse wheel zoom with Ctrl+Scroll (smooth, synchronous)
  useEffect(() => {
    const container = viewerRef.current;
    const content = contentRef.current;
    if (!container || !content || !onZoomChange) return;

    const handleWheel = (e: WheelEvent) => {
      // Ctrl+Scroll (without Alt) = Content zoom
      if (e.ctrlKey && !e.altKey) {
        e.preventDefault();

        // Get current zoom from ref (not prop, to avoid re-render delays)
        const prevZoom = currentZoomRef.current;

        // Calculate zoom delta (10% per notch)
        const delta = e.deltaY > 0 ? -10 : 10;
        const newZoom = Math.max(10, Math.min(2000, prevZoom + delta));

        // No change, skip
        if (newZoom === prevZoom) return;

        // Get cursor position relative to container
        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        // Calculate the point in content coordinates before zoom
        const beforeX = (cursorX + container.scrollLeft) / (prevZoom / 100);
        const beforeY = (cursorY + container.scrollTop) / (prevZoom / 100);

        // Apply zoom transform synchronously (no waiting for React)
        currentZoomRef.current = newZoom;
        const zoomFactor = newZoom / 100;
        content.style.transform = `scale(${zoomFactor})`;

        // Adjust scroll position synchronously to keep cursor point stable
        const afterX = beforeX * (newZoom / 100);
        const afterY = beforeY * (newZoom / 100);
        container.scrollLeft = afterX - cursorX;
        container.scrollTop = afterY - cursorY;

        // Debounce the state update to reduce re-renders
        if (zoomUpdateTimeoutRef.current) {
          clearTimeout(zoomUpdateTimeoutRef.current);
        }
        zoomUpdateTimeoutRef.current = setTimeout(() => {
          onZoomChange(newZoom);
          zoomUpdateTimeoutRef.current = null;
        }, 100);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (zoomUpdateTimeoutRef.current) {
        clearTimeout(zoomUpdateTimeoutRef.current);
      }
    };
  }, [onZoomChange]);

  // T051j: Touch pinch-to-zoom
  useEffect(() => {
    const container = viewerRef.current;
    if (!container || !onZoomChange) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        setTouchState({
          initialDistance: distance,
          initialZoom: zoomLevel,
          center: { x: centerX, y: centerY },
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchState.initialDistance && touchState.center) {
        e.preventDefault();

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const scale = distance / touchState.initialDistance;
        const newZoom = Math.max(10, Math.min(2000, touchState.initialZoom * scale));

        // Store zoom target for zoom-to-center behavior
        zoomTargetRef.current = {
          x: touchState.center.x,
          y: touchState.center.y,
          prevZoom: zoomLevel,
        };

        // Update zoom (scroll adjustment will happen in useEffect)
        onZoomChange(Math.round(newZoom));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        setTouchState({ initialDistance: null, initialZoom: zoomLevel, center: null });
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoomLevel, onZoomChange, touchState.initialDistance, touchState.initialZoom]);

  // T051l: Space+Drag pan functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && zoomLevel > 100 && viewerRef.current) {
        setIsSpacePressed(true);
        viewerRef.current.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && viewerRef.current) {
        setIsSpacePressed(false);
        if (!isPanning) {
          viewerRef.current.style.cursor = zoomLevel > 100 ? 'grab' : '';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [zoomLevel, isPanning]);

  // T051n: Arrow key nudge pan
  useEffect(() => {
    const container = viewerRef.current;
    if (!container || zoomLevel <= 100) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when content is zoomed and focused
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      e.preventDefault();

      const nudgeAmount = e.shiftKey ? 50 : 10;

      switch (e.key) {
        case 'ArrowUp':
          container.scrollTop -= nudgeAmount;
          break;
        case 'ArrowDown':
          container.scrollTop += nudgeAmount;
          break;
        case 'ArrowLeft':
          container.scrollLeft -= nudgeAmount;
          break;
        case 'ArrowRight':
          container.scrollLeft += nudgeAmount;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomLevel]);

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
          <button onClick={() => setRenderError(null)} type="button">Retry</button>
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

      {/* Link preview overlay in bottom-left corner */}
      {hoveredLink && (
        <div className="markdown-viewer__link-preview">
          <span className="markdown-viewer__link-preview-icon">🔗</span>
          <span className="markdown-viewer__link-preview-url">{hoveredLink}</span>
        </div>
      )}
    </div>
  );
};

export default MarkdownViewer;

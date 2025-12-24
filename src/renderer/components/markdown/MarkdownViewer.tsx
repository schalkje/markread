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
  /** Vertical scroll position to restore */
  scrollTop?: number;
  /** Horizontal scroll position to restore */
  scrollLeft?: number;
  /** Callback when rendering completes */
  onRenderComplete?: () => void;
  /** Callback when scroll position changes */
  onScrollChange?: (scrollTop: number, scrollLeft: number) => void;
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
  scrollTop,
  scrollLeft,
  onRenderComplete,
  onScrollChange,
  onFileLink,
  onZoomChange,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bufferARef = useRef<HTMLDivElement>(null);
  const bufferBRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Double-buffer state for smooth page transitions
  const [activeBuffer, setActiveBuffer] = useState<'A' | 'B'>('A');
  const [preparingBuffer, setPreparingBuffer] = useState<'A' | 'B' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track when prepared buffer is ready for crossfade
  const [preparedBufferReady, setPreparedBufferReady] = useState(false);

  // Optional overlay during transition
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlaySnapshot, setOverlaySnapshot] = useState<string>('');
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Ref to ensure event listeners always have access to current state setter
  const setHoveredLinkRef = useRef(setHoveredLink);
  useEffect(() => {
    setHoveredLinkRef.current = setHoveredLink;
  }, [setHoveredLink]);

  // Track previous filePath to detect navigation
  const previousFilePathRef = useRef<string | undefined>(undefined);

  // Start transition when navigating to a new page or opening first file
  // Use useLayoutEffect to ensure this runs before the render effect
  React.useLayoutEffect(() => {
    console.log('[MarkdownViewer] Navigation detection effect running', {
      currentFilePath: filePath,
      previousFilePath: previousFilePathRef.current,
      activeBuffer,
      preparingBuffer
    });

    // Trigger transition if:
    // 1. FilePath changed from a previous file (navigation)
    // 2. OR this is the first file being loaded (initial mount)
    const isInitialLoad = previousFilePathRef.current === undefined && filePath;
    const isNavigation = previousFilePathRef.current !== undefined && previousFilePathRef.current !== filePath && filePath;

    if (isInitialLoad || isNavigation) {
      console.log('[MarkdownViewer] Transition triggered:', { isInitialLoad, isNavigation });

      // Clear any existing overlay timeout
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = null;
      }

      // Determine which buffer to prepare (the inactive one)
      const bufferToPrepare = activeBuffer === 'A' ? 'B' : 'A';

      console.log('[MarkdownViewer] Preparing buffer:', bufferToPrepare);

      // OVERLAY DISABLED FOR DEBUGGING
      // For navigation: Optionally capture snapshot for overlay
      // if (isNavigation) {
      //   const activeBufferRef = activeBuffer === 'A' ? bufferARef : bufferBRef;
      //   if (activeBufferRef.current) {
      //     const snapshot = activeBufferRef.current.innerHTML;
      //     console.log('[MarkdownViewer] Captured snapshot, length:', snapshot.length);
      //     setOverlaySnapshot(snapshot);
      //     setShowOverlay(true);

      //     // Safety timeout: Force hide overlay after 2 seconds if it gets stuck
      //     overlayTimeoutRef.current = setTimeout(() => {
      //       console.warn('[MarkdownViewer] Overlay safety timeout triggered - forcing dismissal');
      //       setShowOverlay(false);
      //       setOverlaySnapshot('');
      //       // Force complete the transition
      //       setActiveBuffer(bufferToPrepare);
      //       setIsTransitioning(false);
      //       setPreparingBuffer(null);
      //       setPreparedBufferReady(false);
      //     }, 2000);
      //   }
      // } else {
      //   // Initial load - no snapshot
      //   setOverlaySnapshot('');
      //   setShowOverlay(false);
      // }

      // Disable overlay entirely
      setOverlaySnapshot('');
      setShowOverlay(false);

      // Start transition
      setPreparingBuffer(bufferToPrepare);
      setIsTransitioning(true);
      setPreparedBufferReady(false);
    } else {
      console.log('[MarkdownViewer] Transition NOT triggered - condition not met');
    }

    // Update previous filePath
    previousFilePathRef.current = filePath;
  }, [filePath]); // Don't include activeBuffer - it changes during transition and would re-trigger this effect

  // Manage crossfade transition: When prepared buffer is ready, crossfade and swap
  // This is the single source of truth for buffer transitions (SRP - Single Responsibility Principle)
  useEffect(() => {
    console.log('[MarkdownViewer] Crossfade effect check:', {
      isTransitioning,
      preparedBufferReady,
      preparingBuffer,
      willTrigger: isTransitioning && preparedBufferReady && !!preparingBuffer
    });

    if (!isTransitioning || !preparedBufferReady || !preparingBuffer) return;

    console.log('[MarkdownViewer] Prepared buffer ready, starting crossfade', {
      from: activeBuffer,
      to: preparingBuffer
    });

    // Wait for crossfade animation to complete (300ms)
    const crossfadeTimeout = setTimeout(() => {
      console.log('[MarkdownViewer] Crossfade complete, swapping buffers');

      // Swap active buffer
      setActiveBuffer(preparingBuffer);

      // Clean up transition state
      setIsTransitioning(false);
      setPreparingBuffer(null);
      setPreparedBufferReady(false);
      setShowOverlay(false);
      setOverlaySnapshot('');

      // Clear the safety timeout since transition completed successfully
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = null;
      }
    }, 300); // Match CSS transition duration

    return () => {
      clearTimeout(crossfadeTimeout);
      // Also clear safety timeout on cleanup
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = null;
      }
    };
  }, [isTransitioning, preparedBufferReady, preparingBuffer, activeBuffer]);

  // Event delegation for link hover and click handling
  useEffect(() => {
    // Use the active buffer for event handling
    const activeBufferRef = activeBuffer === 'A' ? bufferARef : bufferBRef;
    const container = activeBufferRef.current;
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
  }, [filePath, onFileLink, activeBuffer, content]);

  // T047: Apply zoom with CSS transform and preserve scroll position
  useEffect(() => {
    const activeBufferRef = activeBuffer === 'A' ? bufferARef : bufferBRef;
    if (!activeBufferRef.current || !viewerRef.current) return;

    const viewer = viewerRef.current;
    const content = activeBufferRef.current;

    console.log('[MarkdownViewer] Zoom effect running:', {
      currentZoomRef: currentZoomRef.current,
      zoomLevel,
      willApply: currentZoomRef.current !== zoomLevel
    });

    // Skip if zoom was already applied synchronously (from wheel/touch handler)
    if (currentZoomRef.current === zoomLevel) {
      console.log('[MarkdownViewer] Zoom already applied, skipping');
      return;
    }

    console.log('[MarkdownViewer] Applying zoom transform:', zoomLevel);
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
  }, [zoomLevel, activeBuffer]);

  // Restore scroll position from history (when navigating back/forward)
  useEffect(() => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;

    // Only restore if scrollTop or scrollLeft props are provided AND are non-zero
    // (zero means "start at top" which is default behavior, not restoration)
    const shouldRestoreScroll = (scrollTop !== undefined && scrollTop > 0) ||
                                 (scrollLeft !== undefined && scrollLeft > 0);

    if (shouldRestoreScroll) {
      let retryCount = 0;
      const maxRetries = 20; // Try for up to 1 second (20 * 50ms)
      let lastScrollHeight = 0;
      let stableCount = 0;
      let cancelled = false; // Cancellation flag

      // Wait for content to be fully rendered and stable
      const attemptRestore = () => {
        // Abort if cancelled (user navigated away)
        if (cancelled) {
          console.log('[MarkdownViewer] Scroll restoration cancelled');
          return;
        }

        retryCount++;

        // Check if content dimensions have stabilized
        const currentScrollHeight = viewer.scrollHeight;
        const hasScrollableContent = currentScrollHeight > viewer.clientHeight;

        // Content is stable if height hasn't changed for 2 consecutive checks
        if (currentScrollHeight === lastScrollHeight && hasScrollableContent) {
          stableCount++;
        } else {
          stableCount = 0;
          lastScrollHeight = currentScrollHeight;
        }

        // Restore when content is stable OR we've reached max retries
        if (stableCount >= 2 || retryCount >= maxRetries) {
          // Check if we can scroll to the desired position
          const canScrollToPosition = scrollTop ? (currentScrollHeight - viewer.clientHeight >= scrollTop) : true;

          if (canScrollToPosition || retryCount >= maxRetries) {
            // Content is ready (or we've waited long enough), restore scroll
            if (scrollTop !== undefined && scrollTop > 0) {
              viewer.scrollTop = scrollTop;
              console.log('[MarkdownViewer] Restored scrollTop to:', scrollTop, `(after ${retryCount} attempts, scrollHeight: ${currentScrollHeight})`);
            }
            if (scrollLeft !== undefined && scrollLeft > 0) {
              viewer.scrollLeft = scrollLeft;
              console.log('[MarkdownViewer] Restored scrollLeft to:', scrollLeft);
            }

            // Mark prepared buffer as ready after scroll restoration completes
            if (!cancelled) {
              console.log('[MarkdownViewer] Scroll restoration complete, buffer ready');
              setPreparedBufferReady(true);
            }
          } else {
            // Content not tall enough yet, keep trying
            setTimeout(attemptRestore, 50);
          }
        } else {
          // Content still changing, keep trying
          setTimeout(attemptRestore, 50);
        }
      };

      // Start attempting restoration after zoom is applied
      requestAnimationFrame(() => {
        requestAnimationFrame(attemptRestore);
      });

      // Cleanup: Cancel restoration if component unmounts or dependencies change
      return () => {
        cancelled = true;
      };
    }
  }, [scrollTop, scrollLeft, filePath]); // Trigger when navigating to a new page (removed zoomLevel to avoid conflicts)

  // Track the last render to prevent duplicate renders
  const lastRenderRef = useRef<{ buffer: string; filePath: string } | null>(null);

  // Render markdown content to the preparing buffer
  useEffect(() => {
    if (!content || isLoading) return;

    // Wait for refs to be ready (React needs a render cycle to set refs)
    if (!bufferARef.current || !bufferBRef.current) {
      console.log('[MarkdownViewer] Waiting for buffer refs to be ready...');
      // Retry on next render cycle
      return;
    }

    // Detect race condition: If filePath changed but transition state hasn't updated yet
    // This happens because both effects run on filePath change, but with stale state
    const isFilePathChanging = previousFilePathRef.current !== filePath;
    if (isFilePathChanging && !isTransitioning && !preparingBuffer) {
      console.log('[MarkdownViewer] FilePath changed but transition not started yet, waiting...', {
        previousFilePath: previousFilePathRef.current,
        currentFilePath: filePath,
        isTransitioning,
        preparingBuffer
      });
      // Wait for navigation effect to set up transition state
      return;
    }

    // If transitioning, wait for preparingBuffer to be set
    if (isTransitioning && !preparingBuffer) {
      console.log('[MarkdownViewer] Transitioning but preparingBuffer not set yet, waiting...');
      return;
    }

    // Determine target buffer: preparing buffer if transitioning, otherwise active buffer
    const targetBuffer = preparingBuffer || activeBuffer;
    const targetBufferRef = targetBuffer === 'A' ? bufferARef : bufferBRef;

    // Skip if we're already rendering or just rendered the same content to the same buffer
    if (lastRenderRef.current?.buffer === targetBuffer && lastRenderRef.current?.filePath === filePath) {
      console.log('[MarkdownViewer] Skipping duplicate render to', targetBuffer, 'for', filePath);
      return;
    }

    console.log('[MarkdownViewer] Rendering to buffer:', targetBuffer, { isTransitioning, preparingBuffer, activeBuffer, filePath });

    // Mark this render as in progress
    lastRenderRef.current = { buffer: targetBuffer, filePath: filePath || '' };

    let isCancelled = false;

    const renderContent = async () => {
      const startTime = Date.now();

      setIsRendering(true);
      setRenderError(null);

      try {
        // Step 1: Convert markdown to HTML
        const html = renderMarkdown(content);

        // Check if cancelled before proceeding
        if (isCancelled) return;
        if (!targetBufferRef.current) {
          setIsRendering(false);
          return;
        }

        // Step 2: Insert HTML into DOM (hidden buffer if transitioning)
        targetBufferRef.current.innerHTML = html;

        // Step 3: Render Mermaid diagrams
        await renderMermaidDiagrams(targetBufferRef.current);

        // Check if cancelled after async operation
        if (isCancelled) return;
        if (!targetBufferRef.current) {
          setIsRendering(false);
          return;
        }

        // Step 3.5: Apply syntax highlighting and copy buttons
        // This must happen AFTER HTML is in the DOM for highlightjs-copy to work
        applySyntaxHighlighting(targetBufferRef.current);

        // Step 4: Process images with file:// protocol if filePath provided
        if (filePath) {
          await resolveImagePaths(targetBufferRef.current, filePath);
        }

        // Check if cancelled after async operation
        if (isCancelled) return;
        if (!targetBufferRef.current) {
          setIsRendering(false);
          return;
        }

        // Step 5: Add click handlers for checkboxes (task lists)
        addTaskListHandlers(targetBufferRef.current);

        if (!isCancelled) {
          setIsRendering(false);
          onRenderComplete?.();

          // If no scroll restoration needed (scrollTop/Left are undefined or 0),
          // mark prepared buffer as ready
          const needsScrollRestoration = (scrollTop !== undefined && scrollTop > 0) ||
                                          (scrollLeft !== undefined && scrollLeft > 0);
          console.log('[MarkdownViewer] Rendering complete:', {
            filePath,
            scrollTop,
            scrollLeft,
            needsScrollRestoration,
            willSetBufferReady: !needsScrollRestoration
          });
          if (!needsScrollRestoration) {
            console.log('[MarkdownViewer] No scroll restoration needed, buffer ready');
            setPreparedBufferReady(true);
          } else {
            console.log('[MarkdownViewer] Waiting for scroll restoration to complete...');
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Markdown rendering error:', err);
          setRenderError(err instanceof Error ? err.message : 'Failed to render markdown');
          setIsRendering(false);

          // IMPORTANT: Mark buffer as ready even on error, so overlay doesn't get stuck
          // The error state will be shown to the user via the error UI
          const needsScrollRestoration = (scrollTop !== undefined && scrollTop > 0) ||
                                          (scrollLeft !== undefined && scrollLeft > 0);
          if (!needsScrollRestoration) {
            console.log('[MarkdownViewer] Error occurred, but marking buffer ready to complete transition');
            setPreparedBufferReady(true);
          }
        }
      }
    };

    renderContent();

    // Cleanup function to cancel pending operations
    return () => {
      isCancelled = true;
    };
  }, [content, filePath, isLoading, onRenderComplete, scrollTop, scrollLeft, preparingBuffer, activeBuffer, isTransitioning]);
  // NOTE: filePath is needed for image resolution. Race condition is prevented by using
  // useLayoutEffect for navigation detection, which runs before this effect.

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
    const scrollLeft = e.currentTarget.scrollLeft;
    onScrollChange?.(scrollTop, scrollLeft);
  };

  // T051i: Mouse wheel zoom with Ctrl+Scroll (smooth, synchronous)
  useEffect(() => {
    const container = viewerRef.current;
    const activeBufferRef = activeBuffer === 'A' ? bufferARef : bufferBRef;
    const content = activeBufferRef.current;

    console.log('[MarkdownViewer] Wheel zoom effect setup:', {
      hasContainer: !!container,
      hasContent: !!content,
      hasOnZoomChange: !!onZoomChange
    });

    if (!container || !content || !onZoomChange) {
      console.log('[MarkdownViewer] Wheel zoom NOT registered - missing dependency');
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      // Ctrl+Scroll (without Alt) = Content zoom
      if (e.ctrlKey && !e.altKey) {
        e.preventDefault();
        console.log('[MarkdownViewer] Wheel zoom triggered');

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

        console.log('[MarkdownViewer] Calling onZoomChange with:', newZoom);
        // Debounce the state update to reduce re-renders
        if (zoomUpdateTimeoutRef.current) {
          clearTimeout(zoomUpdateTimeoutRef.current);
        }
        zoomUpdateTimeoutRef.current = setTimeout(() => {
          console.log('[MarkdownViewer] onZoomChange callback executing');
          onZoomChange(newZoom);
          zoomUpdateTimeoutRef.current = null;
        }, 100);
      }
    };

    console.log('[MarkdownViewer] Wheel zoom handler registered');
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      console.log('[MarkdownViewer] Wheel zoom handler unregistered');
      container.removeEventListener('wheel', handleWheel);
      if (zoomUpdateTimeoutRef.current) {
        clearTimeout(zoomUpdateTimeoutRef.current);
      }
    };
  }, [onZoomChange, activeBuffer]);

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
   * Shows user-friendly placeholder for missing/blocked images
   */
  const resolveImagePaths = async (container: HTMLElement, baseFilePath: string) => {
    const images = container.querySelectorAll('img[src]');

    for (const img of Array.from(images)) {
      const src = img.getAttribute('src');
      if (!src) continue;

      // Skip file:// URLs (already resolved)
      if (src.startsWith('file://')) continue;

      // Handle external URLs (http/https) - CSP now allows HTTPS images
      if (src.startsWith('http://') || src.startsWith('https://')) {
        // Add error handler for failed loads (404, network errors, etc.)
        const imgElement = img as HTMLImageElement;
        imgElement.onerror = () => {
          imgElement.style.display = 'inline-block';
          imgElement.style.backgroundColor = '#f6f8fa';
          imgElement.style.border = '1px dashed #d0d7de';
          imgElement.style.padding = '8px';
          imgElement.style.borderRadius = '4px';
          imgElement.style.minWidth = '200px';
          imgElement.style.minHeight = '32px';
          imgElement.alt = `[External image failed to load: ${src}]`;
          imgElement.title = `Failed to load external image: ${src}`;
          // Replace with a data URL placeholder
          imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzIiIGZpbGw9IiNmNmY4ZmEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzU3NjA2YSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgZmFpbGVkPC90ZXh0Pjwvc3ZnPg==';
        };
        continue;
      }

      // Resolve relative paths
      try {
        const result = await window.electronAPI?.file?.resolvePath({
          basePath: baseFilePath,
          relativePath: src,
        });

        if (result?.success && result.absolutePath && result.exists) {
          // Convert to file:// URL
          const fileUrl = `file://${result.absolutePath.replace(/\\/g, '/')}`;
          const imgElement = img as HTMLImageElement;
          imgElement.src = fileUrl;

          // Add error handler in case file:// loading is blocked
          imgElement.onerror = () => {
            imgElement.style.display = 'inline-block';
            imgElement.style.backgroundColor = '#fff3cd';
            imgElement.style.border = '1px dashed #ffc107';
            imgElement.style.padding = '8px';
            imgElement.style.borderRadius = '4px';
            imgElement.alt = `[Image not accessible: ${src}]`;
            imgElement.title = `Image file not accessible: ${result.absolutePath}`;
          };
        } else {
          // Image file doesn't exist - show placeholder
          console.warn(`Image not found: ${src}`, result);
          const imgElement = img as HTMLImageElement;
          imgElement.alt = `[Image not found: ${src}]`;
          imgElement.title = `Image file not found: ${src}`;
          imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmZjNjZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjEyIiBmaWxsPSIjODU2NDA0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
        }
      } catch (err) {
        // Don't let image errors block rendering
        console.error(`Failed to resolve image path: ${src}`, err);
        const imgElement = img as HTMLImageElement;
        imgElement.alt = `[Image error: ${src}]`;
        imgElement.title = `Failed to load image: ${err instanceof Error ? err.message : 'Unknown error'}`;
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

  // Determine buffer classes based on state
  const getBufferClass = (buffer: 'A' | 'B') => {
    const baseClass = 'markdown-viewer__buffer';

    // Check if this is initial load (no previous file)
    const isInitialLoad = previousFilePathRef.current === undefined;

    if (isTransitioning && preparingBuffer) {
      // During transition
      if (buffer === preparingBuffer) {
        // Preparing buffer
        if (preparedBufferReady) {
          // When ready: instant show for initial load, fade-in for navigation
          return isInitialLoad
            ? `${baseClass} ${baseClass}--active`
            : `${baseClass} ${baseClass}--fading-in`;
        } else {
          // While preparing: hidden
          return `${baseClass} ${baseClass}--preparing`;
        }
      } else if (buffer === activeBuffer) {
        // Active buffer during transition
        if (isInitialLoad) {
          // Initial load: keep hidden (no content to show)
          return `${baseClass} ${baseClass}--preparing`;
        } else {
          // Navigation: fade out old content
          return `${baseClass} ${baseClass}--fading-out`;
        }
      }
    }

    // Normal state (not transitioning)
    return buffer === activeBuffer
      ? `${baseClass} ${baseClass}--active`
      : `${baseClass} ${baseClass}--preparing`;
  };

  console.log('[MarkdownViewer] Render state:', {
    activeBuffer,
    preparingBuffer,
    isTransitioning,
    preparedBufferReady,
    showOverlay
  });

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
      {/* Buffer A */}
      <div className={getBufferClass('A')} ref={bufferARef}>
        {/* Content will be injected here */}
      </div>

      {/* Buffer B */}
      <div className={getBufferClass('B')} ref={bufferBRef}>
        {/* Content will be injected here */}
      </div>

      {/* Optional overlay during transition */}
      {showOverlay && overlaySnapshot && (
        <div
          className="markdown-viewer__transition-overlay"
          onClick={() => {
            console.log('[MarkdownViewer] Overlay clicked - force dismissing');
            setShowOverlay(false);
            setOverlaySnapshot('');
            // Force transition to complete if stuck
            if (isTransitioning && preparingBuffer) {
              setActiveBuffer(preparingBuffer);
              setIsTransitioning(false);
              setPreparingBuffer(null);
              setPreparedBufferReady(false);
            }
            // Clear safety timeout
            if (overlayTimeoutRef.current) {
              clearTimeout(overlayTimeoutRef.current);
              overlayTimeoutRef.current = null;
            }
          }}
          title="Click to dismiss overlay (if stuck)"
        >
          <div
            className="markdown-viewer__snapshot"
            dangerouslySetInnerHTML={{ __html: overlaySnapshot }}
          />
          <div className="markdown-viewer__overlay-dismiss">
            Click to dismiss
          </div>
        </div>
      )}

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

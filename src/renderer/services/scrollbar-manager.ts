/**
 * ScrollbarManager Service
 * Coordinates scrollbar state with content scrolling
 *
 * Hybrid approach: Uses native scrolling, custom scrollbars reflect and control state
 */

import React from 'react';

export interface ScrollState {
  /** Vertical scroll position (px) */
  scrollTop: number;

  /** Horizontal scroll position (px) */
  scrollLeft: number;

  /** Total content height (scrollHeight) */
  scrollHeight: number;

  /** Total content width (scrollWidth) */
  scrollWidth: number;

  /** Viewport height (clientHeight) */
  clientHeight: number;

  /** Viewport width (clientWidth) */
  clientWidth: number;

  /** Current zoom level (0.1 - 20.0) */
  zoomLevel: number;
}

export type ScrollStateListener = (state: ScrollState) => void;

/**
 * ScrollbarManager
 * Manages scroll state and coordinates between native scrolling and custom scrollbars
 */
export class ScrollbarManager {
  private state: ScrollState;
  private listeners: Set<ScrollStateListener>;
  private scrollElement: HTMLElement | null;

  constructor() {
    this.state = {
      scrollTop: 0,
      scrollLeft: 0,
      scrollHeight: 0,
      scrollWidth: 0,
      clientHeight: 0,
      clientWidth: 0,
      zoomLevel: 1.0,
    };
    this.listeners = new Set();
    this.scrollElement = null;
  }

  /**
   * Attach to a scrollable element
   * Sets up event listeners for native scroll events
   */
  attach(element: HTMLElement): () => void {
    this.scrollElement = element;
    this.updateDimensions();

    const handleScroll = () => {
      this.updateScrollPosition();
    };

    const handleResize = () => {
      this.updateDimensions();
    };

    // Listen to native scroll events
    element.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Initial update
    this.updateScrollPosition();

    // Return cleanup function
    return () => {
      element.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      this.scrollElement = null;
    };
  }

  /**
   * Update scroll position from native scrolling
   */
  private updateScrollPosition(): void {
    if (!this.scrollElement) return;

    const newState: ScrollState = {
      ...this.state,
      scrollTop: this.scrollElement.scrollTop,
      scrollLeft: this.scrollElement.scrollLeft,
    };

    this.setState(newState);
  }

  /**
   * Update dimensions (content size, viewport size)
   */
  private updateDimensions(): void {
    if (!this.scrollElement) return;

    const newState: ScrollState = {
      ...this.state,
      scrollHeight: this.scrollElement.scrollHeight,
      scrollWidth: this.scrollElement.scrollWidth,
      clientHeight: this.scrollElement.clientHeight,
      clientWidth: this.scrollElement.clientWidth,
    };

    this.setState(newState);
  }

  /**
   * Set scroll position (called by custom scrollbar)
   * Triggers native scrolling
   */
  setScrollPosition(left: number, top: number): void {
    if (!this.scrollElement) return;

    // Use native scrolling
    this.scrollElement.scrollTop = top;
    this.scrollElement.scrollLeft = left;

    // State will be updated by scroll event listener
  }

  /**
   * Set vertical scroll position
   */
  setScrollTop(top: number): void {
    this.setScrollPosition(this.state.scrollLeft, top);
  }

  /**
   * Set horizontal scroll position
   */
  setScrollLeft(left: number): void {
    this.setScrollPosition(left, this.state.scrollTop);
  }

  /**
   * Set zoom level
   */
  setZoomLevel(level: number): void {
    const newState: ScrollState = {
      ...this.state,
      zoomLevel: level,
    };

    this.setState(newState);

    // Update dimensions after zoom changes (content size changes)
    requestAnimationFrame(() => {
      this.updateDimensions();
    });
  }

  /**
   * Scroll to position with optional smooth animation
   */
  scrollTo(left: number, top: number, smooth: boolean = false): void {
    if (!this.scrollElement) return;

    if (smooth) {
      this.scrollElement.scrollTo({
        left,
        top,
        behavior: 'smooth',
      });
    } else {
      this.scrollElement.scrollTop = top;
      this.scrollElement.scrollLeft = left;
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: ScrollStateListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current state
   */
  getState(): ScrollState {
    return { ...this.state };
  }

  /**
   * Calculate maximum scroll positions
   */
  getMaxScroll(): { top: number; left: number } {
    return {
      top: Math.max(0, this.state.scrollHeight - this.state.clientHeight),
      left: Math.max(0, this.state.scrollWidth - this.state.clientWidth),
    };
  }

  /**
   * Check if content is scrollable
   */
  isScrollable(): { vertical: boolean; horizontal: boolean } {
    const max = this.getMaxScroll();
    return {
      vertical: max.top > 0,
      horizontal: max.left > 0,
    };
  }

  /**
   * Force refresh dimensions (call after content changes)
   */
  refresh(): void {
    this.updateDimensions();
  }

  /**
   * Private: Update state and notify listeners
   */
  private setState(newState: ScrollState): void {
    const changed =
      newState.scrollTop !== this.state.scrollTop ||
      newState.scrollLeft !== this.state.scrollLeft ||
      newState.scrollHeight !== this.state.scrollHeight ||
      newState.scrollWidth !== this.state.scrollWidth ||
      newState.clientHeight !== this.state.clientHeight ||
      newState.clientWidth !== this.state.clientWidth ||
      newState.zoomLevel !== this.state.zoomLevel;

    if (!changed) return;

    this.state = newState;

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(newState);
      } catch (err) {
        console.error('ScrollbarManager listener error:', err);
      }
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.listeners.clear();
    this.scrollElement = null;
  }
}

/**
 * React hook for using ScrollbarManager
 */
export function useScrollbarManager(
  element: HTMLElement | null,
  zoomLevel: number
): ScrollState {
  const [state, setState] = React.useState<ScrollState>({
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 0,
    scrollWidth: 0,
    clientHeight: 0,
    clientWidth: 0,
    zoomLevel: 1.0,
  });

  const managerRef = React.useRef<ScrollbarManager | null>(null);

  React.useEffect(() => {
    if (!element) return;

    // Create manager if needed
    if (!managerRef.current) {
      managerRef.current = new ScrollbarManager();
    }

    const manager = managerRef.current;

    // Attach to element
    const detach = manager.attach(element);

    // Subscribe to state changes
    const unsubscribe = manager.subscribe(setState);

    // Cleanup
    return () => {
      detach();
      unsubscribe();
    };
  }, [element]);

  // Update zoom level
  React.useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setZoomLevel(zoomLevel);
    }
  }, [zoomLevel]);

  return state;
}

// Export singleton instance for service-based usage
export const scrollbarManager = new ScrollbarManager();

export default scrollbarManager;

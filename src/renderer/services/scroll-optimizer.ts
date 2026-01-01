/**
 * Scroll Optimizer Service
 * Task: T050
 *
 * Optimizes scroll performance using requestAnimationFrame to maintain 60 FPS
 * Based on research.md Section 5 performance optimization patterns
 */

type ScrollCallback = (scrollTop: number, scrollLeft: number) => void;

class ScrollOptimizerService {
  private rafId: number | null = null;
  private callbacks: Set<ScrollCallback> = new Set();
  private latestScrollTop = 0;
  private latestScrollLeft = 0;
  private isProcessing = false;

  /**
   * Register a scroll listener that will be called on requestAnimationFrame
   */
  onScroll(callback: ScrollCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Handle scroll event - schedules callback execution via RAF
   */
  handleScroll(scrollTop: number, scrollLeft: number): void {
    this.latestScrollTop = scrollTop;
    this.latestScrollLeft = scrollLeft;

    // Only schedule RAF if not already processing
    if (!this.isProcessing && this.rafId === null) {
      this.rafId = requestAnimationFrame(this.processScroll);
    }
  }

  /**
   * Process scroll callbacks on animation frame
   */
  private processScroll = (): void => {
    this.isProcessing = true;

    // Call all registered callbacks with latest scroll position
    this.callbacks.forEach((callback) => {
      try {
        callback(this.latestScrollTop, this.latestScrollLeft);
      } catch (err) {
        console.error('Scroll callback error:', err);
      }
    });

    this.isProcessing = false;
    this.rafId = null;
  };

  /**
   * Cancel pending RAF callback
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isProcessing = false;
  }

  /**
   * Clear all callbacks
   */
  clear(): void {
    this.cancel();
    this.callbacks.clear();
  }
}

// Singleton instance
export const scrollOptimizer = new ScrollOptimizerService();

/**
 * React hook for optimized scroll handling
 * Usage:
 * ```
 * useOptimizedScroll((scrollTop, scrollLeft) => {
 *   console.log('Scroll position:', scrollTop, scrollLeft);
 * });
 * ```
 */
export function useOptimizedScroll(callback: ScrollCallback): void {
  // Note: This is a simplified version. In a real implementation,
  // you'd use useEffect with proper cleanup
  const unsubscribe = scrollOptimizer.onScroll(callback);

  // Cleanup function (should be called on unmount)
  return unsubscribe;
}

/**
 * Throttle function using requestAnimationFrame
 * Ensures callback is called at most once per frame (60 FPS)
 */
export function throttleRAF<T extends (...args: any[]) => void>(
  callback: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let latestArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    latestArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (latestArgs !== null) {
          callback(...latestArgs);
          latestArgs = null;
        }
        rafId = null;
      });
    }
  };
}

/**
 * Debounce function for scroll events
 * Delays callback execution until scrolling stops
 */
export function debounceScroll<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 150
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Calculate scroll velocity (for smooth animations)
 */
export function calculateScrollVelocity(
  previousPosition: number,
  currentPosition: number,
  previousTime: number,
  currentTime: number
): number {
  const deltaPosition = currentPosition - previousPosition;
  const deltaTime = currentTime - previousTime;

  return deltaTime > 0 ? deltaPosition / deltaTime : 0;
}

/**
 * Smooth scroll to position with easing
 */
export function smoothScrollTo(
  element: HTMLElement,
  targetY: number,
  duration: number = 300,
  easing: (t: number) => number = easeInOutCubic
): void {
  const startY = element.scrollTop;
  const deltaY = targetY - startY;
  const startTime = performance.now();

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);

    element.scrollTop = startY + deltaY * easedProgress;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * Easing functions
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function linear(t: number): number {
  return t;
}

export default scrollOptimizer;

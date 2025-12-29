/**
 * CustomScrollbar Component
 * Hybrid scrollbar: Overlays on native scrolling, provides custom UI and overview ruler
 *
 * Design: Option 2 - Hybrid Approach
 * - Uses native scrolling for core functionality (performance, accessibility)
 * - Custom overlay UI for visual consistency and theming
 * - Overview ruler for markers (headings, search results, etc.)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CustomScrollbar.css';

export interface ScrollbarMarker {
  /** Unique identifier */
  id: string;
  /** Position in content (0-1 range, where 0 = top, 1 = bottom) */
  position: number;
  /** Marker type (affects color) */
  type: 'heading' | 'search' | 'error' | 'warning' | 'info';
  /** Optional tooltip */
  tooltip?: string;
}

export interface CustomScrollbarProps {
  /** Scrollbar orientation */
  orientation: 'vertical' | 'horizontal';

  /** Current scroll position (px) from native scrolling */
  scrollPosition: number;

  /** Total scrollable size (scrollHeight or scrollWidth) */
  scrollSize: number;

  /** Viewport size (clientHeight or clientWidth) */
  viewportSize: number;

  /** Callback when user interacts with scrollbar */
  onScrollRequest: (position: number) => void;

  /** Optional: Overview ruler markers */
  markers?: ScrollbarMarker[];

  /** Optional: Show shadows when scrolled away from edges */
  showShadows?: boolean;

  /** Optional: Scrollbar size in px (default: 14 for vertical, 12 for horizontal) */
  size?: number;

  /** Optional: Auto-hide when not hovering (default: true) */
  autoHide?: boolean;

  /** Optional: Minimum thumb size in px (default: 20) */
  minThumbSize?: number;

  /** Optional: Theme */
  theme?: 'light' | 'dark';

  /** Optional: Class name for custom styling */
  className?: string;
}

export const CustomScrollbar: React.FC<CustomScrollbarProps> = ({
  orientation,
  scrollPosition,
  scrollSize,
  viewportSize,
  onScrollRequest,
  markers = [],
  showShadows = true,
  size,
  autoHide = true,
  minThumbSize = 20,
  theme,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ position: number; scrollStart: number } | null>(null);

  const isVertical = orientation === 'vertical';
  const defaultSize = isVertical ? 14 : 12;
  const scrollbarSize = size ?? defaultSize;

  // Calculate scrollable range
  const maxScroll = Math.max(0, scrollSize - viewportSize);
  const hasScroll = maxScroll > 0;

  // Calculate thumb size (as percentage of track)
  const thumbSizePercent = hasScroll
    ? Math.max((minThumbSize / viewportSize) * 100, (viewportSize / scrollSize) * 100)
    : 100;

  // Calculate thumb position (as percentage of track)
  const thumbPositionPercent = hasScroll
    ? (scrollPosition / maxScroll) * (100 - thumbSizePercent)
    : 0;

  // Calculate shadow visibility
  const hasTopShadow = showShadows && scrollPosition > 0;
  const hasBottomShadow = showShadows && scrollPosition < maxScroll - 1; // -1 for float precision

  // Handle thumb drag start
  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    dragStartRef.current = {
      position: isVertical ? e.clientY : e.clientX,
      scrollStart: scrollPosition,
    };

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
  }, [isVertical, scrollPosition]);

  // Handle track click (jump to position)
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (!trackRef.current || e.target !== trackRef.current) return;
    e.preventDefault();

    const rect = trackRef.current.getBoundingClientRect();
    const clickPosition = isVertical
      ? e.clientY - rect.top
      : e.clientX - rect.left;
    const trackSize = isVertical ? rect.height : rect.width;

    // Calculate target scroll position
    const clickPercent = clickPosition / trackSize;
    const targetScroll = clickPercent * maxScroll;

    onScrollRequest(Math.max(0, Math.min(maxScroll, targetScroll)));
  }, [isVertical, maxScroll, onScrollRequest]);

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging || !dragStartRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      const { position: startPosition, scrollStart } = dragStartRef.current!;
      const currentPosition = isVertical ? e.clientY : e.clientX;
      const delta = currentPosition - startPosition;

      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const trackSize = isVertical ? rect.height : rect.width;

      // Convert pixel delta to scroll delta
      const scrollDelta = (delta / trackSize) * scrollSize;
      const targetScroll = scrollStart + scrollDelta;

      onScrollRequest(Math.max(0, Math.min(maxScroll, targetScroll)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isVertical, scrollSize, maxScroll, onScrollRequest]);

  // Handle mouse enter/leave for auto-hide
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setIsHovering(false);
    }
  }, [isDragging]);

  // Don't render if no scroll is needed
  if (!hasScroll) return null;

  // Build class names
  const containerClass = [
    'custom-scrollbar',
    `custom-scrollbar--${orientation}`,
    autoHide && !isHovering && !isDragging ? 'custom-scrollbar--hidden' : 'custom-scrollbar--visible',
    isDragging ? 'custom-scrollbar--dragging' : '',
    theme ? `custom-scrollbar--${theme}` : '',
    hasTopShadow && isVertical ? 'custom-scrollbar--shadow-top' : '',
    hasBottomShadow && isVertical ? 'custom-scrollbar--shadow-bottom' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const thumbStyle: React.CSSProperties = isVertical
    ? {
        height: `${thumbSizePercent}%`,
        top: `${thumbPositionPercent}%`,
      }
    : {
        width: `${thumbSizePercent}%`,
        left: `${thumbPositionPercent}%`,
      };

  return (
    <div
      className={containerClass}
      style={
        isVertical
          ? { width: `${scrollbarSize}px` }
          : { height: `${scrollbarSize}px` }
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="scrollbar"
      aria-orientation={orientation}
      aria-valuenow={Math.round(scrollPosition)}
      aria-valuemin={0}
      aria-valuemax={Math.round(maxScroll)}
    >
      {/* Track */}
      <div
        ref={trackRef}
        className="custom-scrollbar__track"
        onClick={handleTrackClick}
      >
        {/* Overview ruler markers */}
        {markers.length > 0 && (
          <div className="custom-scrollbar__overview">
            {markers.map((marker) => (
              <div
                key={marker.id}
                className={`custom-scrollbar__marker custom-scrollbar__marker--${marker.type}`}
                style={
                  isVertical
                    ? { top: `${marker.position * 100}%` }
                    : { left: `${marker.position * 100}%` }
                }
                title={marker.tooltip}
              />
            ))}
          </div>
        )}

        {/* Thumb */}
        <div
          ref={thumbRef}
          className="custom-scrollbar__thumb"
          style={thumbStyle}
          onMouseDown={handleThumbMouseDown}
        />
      </div>
    </div>
  );
};

export default CustomScrollbar;

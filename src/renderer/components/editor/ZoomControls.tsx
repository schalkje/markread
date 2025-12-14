/**
 * ZoomControls Component
 * Task: T044
 *
 * Provides zoom controls with:
 * - Zoom in button (+)
 * - Zoom out button (-)
 * - Reset button (100%)
 * - Current zoom level display
 */

import React from 'react';
import { useTabsStore } from '../../stores/tabs';
import './ZoomControls.css';

export interface ZoomControlsProps {
  /** Current tab ID to control zoom for */
  tabId: string | null;
  /** Current zoom level (10-2000) */
  zoomLevel?: number;
  /** Callback when zoom changes */
  onZoomChange?: (newZoom: number) => void;
}

/**
 * T044: ZoomControls component with +/- buttons and reset
 */
export const ZoomControls: React.FC<ZoomControlsProps> = ({
  tabId,
  zoomLevel = 100,
  onZoomChange,
}) => {
  const updateTabZoomLevel = useTabsStore((state) => state.updateTabZoomLevel);

  // Zoom step size (10%)
  const ZOOM_STEP = 10;
  const MIN_ZOOM = 10;
  const MAX_ZOOM = 2000;
  const DEFAULT_ZOOM = 100;

  const handleZoomIn = () => {
    if (!tabId) return;

    const newZoom = Math.min(MAX_ZOOM, zoomLevel + ZOOM_STEP);
    updateTabZoomLevel(tabId, newZoom);
    onZoomChange?.(newZoom);
  };

  const handleZoomOut = () => {
    if (!tabId) return;

    const newZoom = Math.max(MIN_ZOOM, zoomLevel - ZOOM_STEP);
    updateTabZoomLevel(tabId, newZoom);
    onZoomChange?.(newZoom);
  };

  const handleZoomReset = () => {
    if (!tabId) return;

    updateTabZoomLevel(tabId, DEFAULT_ZOOM);
    onZoomChange?.(DEFAULT_ZOOM);
  };

  const isAtMinZoom = zoomLevel <= MIN_ZOOM;
  const isAtMaxZoom = zoomLevel >= MAX_ZOOM;
  const isAtDefaultZoom = zoomLevel === DEFAULT_ZOOM;

  return (
    <div className="zoom-controls" data-testid="zoom-controls">
      <button
        className="zoom-controls__button zoom-controls__button--out"
        onClick={handleZoomOut}
        disabled={!tabId || isAtMinZoom}
        aria-label="Zoom out"
        title="Zoom out (Ctrl+-)"
        data-testid="zoom-out"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 7h12v2H2z" />
        </svg>
      </button>

      <button
        className="zoom-controls__reset"
        onClick={handleZoomReset}
        disabled={!tabId || isAtDefaultZoom}
        aria-label="Reset zoom to 100%"
        title="Reset zoom (Ctrl+0)"
        data-testid="zoom-reset"
      >
        <span className="zoom-controls__level" data-testid="zoom-level">
          {Math.round(zoomLevel)}%
        </span>
      </button>

      <button
        className="zoom-controls__button zoom-controls__button--in"
        onClick={handleZoomIn}
        disabled={!tabId || isAtMaxZoom}
        aria-label="Zoom in"
        title="Zoom in (Ctrl++)"
        data-testid="zoom-in"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7 2h2v5h5v2H9v5H7V9H2V7h5z" />
        </svg>
      </button>
    </div>
  );
};

export default ZoomControls;

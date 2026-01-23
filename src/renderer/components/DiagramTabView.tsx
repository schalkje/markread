/**
 * DiagramTabView Component
 * Tasks: T039, T040, T041
 * Full-size diagram view with zoom and pan controls
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import './DiagramTabView.css';

export interface DiagramTabViewProps {
  svgContent: string;
  mermaidCode: string;
  title?: string;
}

const MIN_ZOOM = 25;
const MAX_ZOOM = 400;
const DEFAULT_ZOOM = 100;
const ZOOM_STEP = 25;

export const DiagramTabView: React.FC<DiagramTabViewProps> = ({
  svgContent,
  mermaidCode: _mermaidCode,
  title = 'Diagram',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });

  // T040: Zoom controls
  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const zoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const zoomFit = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const svgEl = contentRef.current.querySelector('svg');
    if (!svgEl) return;

    const svgRect = svgEl.getBoundingClientRect();
    const scaleX = (container.width - 80) / (svgRect.width / (zoom / 100));
    const scaleY = (container.height - 80) / (svgRect.height / (zoom / 100));
    const fitZoom = Math.min(scaleX, scaleY) * 100;

    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(fitZoom))));
    setPanOffset({ x: 0, y: 0 });
  }, [zoom]);

  // T041: Pan controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanStartOffset({ ...panOffset });
    e.preventDefault();
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setPanOffset({
      x: panStartOffset.x + dx,
      y: panStartOffset.y + dy,
    });
  }, [isPanning, panStart, panStartOffset]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          zoomReset();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, zoomReset]);

  return (
    <div className="diagram-tab-view" ref={containerRef}>
      {/* Zoom toolbar */}
      <div className="diagram-tab-view__toolbar">
        <span className="diagram-tab-view__title">{title}</span>
        <div className="diagram-tab-view__controls">
          <button
            type="button"
            className="diagram-tab-view__button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            title="Zoom Out (Ctrl+-)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8Z"/>
            </svg>
          </button>
          <span className="diagram-tab-view__zoom-label">{zoom}%</span>
          <button
            type="button"
            className="diagram-tab-view__button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            title="Zoom In (Ctrl+=)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4Z"/>
            </svg>
          </button>
          <button
            type="button"
            className="diagram-tab-view__button"
            onClick={zoomFit}
            title="Fit to View"
          >
            Fit
          </button>
          <button
            type="button"
            className="diagram-tab-view__button"
            onClick={zoomReset}
            title="Reset (Ctrl+0)"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Diagram content with pan/zoom */}
      <div
        className={`diagram-tab-view__canvas ${isPanning ? 'diagram-tab-view__canvas--panning' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="diagram-tab-view__content"
          ref={contentRef}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
            transformOrigin: 'center center',
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </div>
  );
};

export default DiagramTabView;

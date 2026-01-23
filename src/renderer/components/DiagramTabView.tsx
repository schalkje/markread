/**
 * DiagramTabView Component
 * Tasks: T039, T040, T041
 * Full-size diagram view with zoom and pan controls
 * Zoom is managed by the tab store (shared with header zoom controls)
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTabsStore } from '../stores/tabs';
import './DiagramTabView.css';

export interface DiagramTabViewProps {
  svgContent: string;
  mermaidCode: string;
}

const ZOOM_STEP = 10;

export const DiagramTabView: React.FC<DiagramTabViewProps> = ({
  svgContent,
  mermaidCode: _mermaidCode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });
  const hasFitOnMount = useRef(false);

  // Read zoom from the tab store (shared with header controls)
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const zoom = useTabsStore((state) => {
    const id = state.activeTabId;
    const tab = id ? state.tabs.get(id) : null;
    return tab?.zoomLevel || 100;
  });

  // Trim SVG to its actual content bounds (removes Mermaid's internal padding)
  useEffect(() => {
    if (!contentRef.current) return;
    const svgEl = contentRef.current.querySelector('svg');
    if (!svgEl) return;

    try {
      const bbox = svgEl.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        const pad = 10; // small padding in SVG coordinates
        const x = bbox.x - pad;
        const y = bbox.y - pad;
        const w = bbox.width + pad * 2;
        const h = bbox.height + pad * 2;
        svgEl.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
        svgEl.setAttribute('width', `${w}`);
        svgEl.setAttribute('height', `${h}`);
        svgEl.style.removeProperty('max-width');
      }
    } catch {
      // getBBox may fail if SVG not rendered yet; normalize from viewBox
      const viewBox = svgEl.viewBox?.baseVal;
      if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
        svgEl.setAttribute('width', `${viewBox.width}`);
        svgEl.setAttribute('height', `${viewBox.height}`);
        svgEl.style.removeProperty('max-width');
      }
    }
  }, [svgContent]);

  // Calculate fit-screen zoom level
  const calculateFitZoom = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return null;

    const container = containerRef.current.getBoundingClientRect();
    const svgEl = contentRef.current.querySelector('svg');
    if (!svgEl) return null;

    // Use the SVG's normalized width/height (set by the trim effect above)
    const svgWidth = parseFloat(svgEl.getAttribute('width') || '0');
    const svgHeight = parseFloat(svgEl.getAttribute('height') || '0');

    if (!svgWidth || !svgHeight) return null;

    const padding = 40;
    const scaleX = (container.width - padding) / svgWidth;
    const scaleY = (container.height - padding) / svgHeight;
    const fitZoom = Math.min(scaleX, scaleY) * 100;

    return Math.max(10, Math.min(2000, Math.round(fitZoom)));
  }, []);

  // Apply fit zoom
  const applyFitZoom = useCallback(() => {
    const fitZoom = calculateFitZoom();
    if (fitZoom != null && activeTabId) {
      const { updateTabZoomLevel } = useTabsStore.getState();
      updateTabZoomLevel(activeTabId, fitZoom);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [calculateFitZoom, activeTabId]);

  // Fit on mount (default to fit-screen instead of 100%)
  useEffect(() => {
    if (hasFitOnMount.current) return;
    // Small delay to allow SVG to render and get dimensions
    const timer = setTimeout(() => {
      applyFitZoom();
      hasFitOnMount.current = true;
    }, 50);
    return () => clearTimeout(timer);
  }, [applyFitZoom]);

  // Listen for zoom:fit events from the header
  useEffect(() => {
    const handleZoomFit = () => {
      applyFitZoom();
    };
    window.addEventListener('zoom:fit', handleZoomFit);
    return () => window.removeEventListener('zoom:fit', handleZoomFit);
  }, [applyFitZoom]);

  // Ctrl+wheel zoom (updates tab store)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (!activeTabId) return;
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.max(10, Math.min(2000, zoom + delta));
      const { updateTabZoomLevel } = useTabsStore.getState();
      updateTabZoomLevel(activeTabId, newZoom);
    }
  }, [activeTabId, zoom]);

  // Pan controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  return (
    <div className="diagram-tab-view" ref={containerRef}>
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

/**
 * SplitView Component
 * Task: T070
 *
 * Renders split pane layout with:
 * - Recursive pane tree rendering
 * - Resizable dividers between panes
 * - TabBar and MarkdownViewer for leaf panes
 * - Independent scroll/zoom per pane
 */

import React, { useState, useRef, useEffect } from 'react';
import { usePanesStore } from '../../stores/panes';
import { useTabsStore } from '../../stores/tabs';
import type { Pane } from '@shared/types/entities';
import { TabBar } from './TabBar';
import { MarkdownViewer } from '../markdown/MarkdownViewer';
import { ZoomControls } from './ZoomControls';
import { TableOfContents } from './TableOfContents';
import './SplitView.css';

export interface SplitViewProps {
  /** Root pane to render */
  pane?: Pane;
}

interface PaneViewProps {
  pane: Pane;
  depth?: number;
}

/**
 * Internal component that renders a single pane (potentially with splits)
 */
const PaneView: React.FC<PaneViewProps> = ({ pane, depth = 0 }) => {
  const getPaneState = usePanesStore((state) => state.getPaneState);
  const setPaneScrollPosition = usePanesStore((state) => state.setPaneScrollPosition);
  const setPaneZoomLevel = usePanesStore((state) => state.setPaneZoomLevel);
  const setActivePaneTab = usePanesStore((state) => state.setActivePaneTab);

  const getTab = useTabsStore((state) => state.getTab);
  const getAllTabs = useTabsStore((state) => state.getAllTabs);

  const paneState = getPaneState(pane.id);
  const [showToc, setShowToc] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // If pane has splits, render child panes recursively
  if (pane.splitChildren && pane.splitChildren.length > 0) {
    return (
      <div
        className={`split-pane split-pane--${pane.orientation}`}
        data-testid="split-pane"
      >
        {pane.splitChildren.map((childPane, index) => (
          <React.Fragment key={childPane.id}>
            {index > 0 && <Divider orientation={pane.orientation} />}
            <div
              className="split-pane__child"
              style={{
                flex: `${childPane.sizeRatio} 1 0%`,
              }}
            >
              <PaneView pane={childPane} depth={depth + 1} />
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Leaf pane - render tabs and content
  const allTabs = getAllTabs();
  const paneTabs = allTabs.filter((tab) => pane.tabs.includes(tab.id));
  const activeTab = pane.activeTabId ? getTab(pane.activeTabId) : null;

  const handleTabClick = (tabId: string) => {
    setActivePaneTab(pane.id, tabId);
  };

  const handleScrollChange = (scrollTop: number) => {
    setPaneScrollPosition(pane.id, scrollTop);
  };

  const handleZoomChange = (zoomLevel: number) => {
    setPaneZoomLevel(pane.id, zoomLevel);
  };

  return (
    <div className="pane" data-testid="pane">
      {/* Tab bar for this pane */}
      <TabBar onTabClick={handleTabClick} />

      {/* Content area */}
      <div className="pane__content">
        {activeTab ? (
          <>
            <MarkdownViewer
              content={activeTab.renderCache || '# Loading...'}
              filePath={activeTab.filePath}
              zoomLevel={paneState.zoomLevel}
              onScrollChange={handleScrollChange}
            />

            {/* Zoom controls */}
            <ZoomControls
              tabId={activeTab.id}
              zoomLevel={paneState.zoomLevel}
              onZoomChange={handleZoomChange}
            />

            {/* Table of contents toggle */}
            <button
              className="pane__toc-toggle"
              onClick={() => setShowToc(!showToc)}
              title="Toggle Table of Contents (Ctrl+G)"
              aria-label="Toggle Table of Contents"
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4zm5 0a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6A.5.5 0 0 1 7 4zm0 3a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6A.5.5 0 0 1 7 7zm0 3a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5zM2 10a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2z" />
              </svg>
            </button>

            {/* Table of contents panel */}
            {showToc && (
              <div className="pane__toc-panel" ref={contentRef}>
                <TableOfContents
                  containerRef={contentRef}
                  onHeadingClick={() => setShowToc(false)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="pane__empty-state">
            <p>No active tab in this pane</p>
            <p className="pane__empty-hint">Open a file or drag a tab here</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Resizable divider component
 */
interface DividerProps {
  orientation: 'vertical' | 'horizontal';
}

const Divider: React.FC<DividerProps> = ({ orientation }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // TODO: Calculate new size ratios and update panes store
      // For now, just show visual feedback
      console.log('Dragging divider:', moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`split-divider split-divider--${orientation} ${isDragging ? 'split-divider--dragging' : ''}`}
      data-testid="split-divider"
      onMouseDown={handleMouseDown}
    >
      <div className="split-divider__handle" />
    </div>
  );
};

/**
 * T070: SplitView component with resizable dividers
 */
export const SplitView: React.FC<SplitViewProps> = ({ pane }) => {
  const layout = usePanesStore((state) => state.layout);
  const rootPane = pane || layout.rootPane;

  return (
    <div className="split-view" data-testid="split-view">
      <PaneView pane={rootPane} />
    </div>
  );
};

export default SplitView;

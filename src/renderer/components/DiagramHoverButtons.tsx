/**
 * DiagramHoverButtons Component
 * Tasks: T028, T029
 * Manages hover buttons on mermaid diagrams for copy/download actions
 * Uses a hook-based approach to inject and manage buttons on rendered diagrams
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDiagramActions } from '../hooks/useDiagramActions';

interface DiagramHoverButtonsProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onActionComplete?: (action: string, success: boolean, error?: string) => void;
}

// SVG icons for buttons
const ICONS = {
  png: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6.502 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5Zm-4.5 0a1 1 0 0 1-1-1V1H4a1 1 0 0 0-1 1v8l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .854.353V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2l2.646-2.354L8.5 11.5l4-4V4.5h-3Z"/></svg>',
  svg: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0ZM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1Zm-2 3a.5.5 0 0 1 .5.5v1.938l.445-.669a.5.5 0 1 1 .832.554l-1.082 1.623a.5.5 0 0 1-.832 0l-1.082-1.623a.5.5 0 0 1 .832-.554L7.5 8.938V7a.5.5 0 0 1 .5-.5Z"/></svg>',
  code: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146Zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146Z"/></svg>',
  download: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5Z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3Z"/></svg>',
  openTab: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5Z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5Z"/></svg>',
};

/**
 * Creates the hover button bar HTML to inject into each diagram
 */
function createButtonBarHTML(): string {
  return `<div class="diagram-actions" role="toolbar" aria-label="Diagram actions">
    <button class="diagram-actions__button" data-action="copy-png" title="Copy as PNG" type="button">
      ${ICONS.png}
      <span class="diagram-actions__label">PNG</span>
    </button>
    <button class="diagram-actions__button" data-action="copy-code" title="Copy Code" type="button">
      ${ICONS.code}
      <span class="diagram-actions__label">Code</span>
    </button>
    <button class="diagram-actions__button" data-action="download" title="Save diagram" type="button">
      ${ICONS.download}
      <span class="diagram-actions__label">Save</span>
    </button>
    <button class="diagram-actions__button diagram-actions__button--separator" data-action="open-tab" title="Open in New Tab" type="button">
      ${ICONS.openTab}
      <span class="diagram-actions__label">Tab</span>
    </button>
  </div>`;
}

export function useDiagramHoverButtons({
  containerRef,
  onActionComplete,
}: DiagramHoverButtonsProps): void {
  const { copyAsPNG, copyCode, saveDiagram } = useDiagramActions();
  const observerRef = useRef<MutationObserver | null>(null);
  const timersRef = useRef<Map<HTMLElement, { show?: NodeJS.Timeout; hide?: NodeJS.Timeout }>>(new Map());

  const handleAction = useCallback(async (action: string, diagramElement: HTMLElement) => {
    let result;
    switch (action) {
      case 'copy-png':
        result = await copyAsPNG(diagramElement);
        break;
      case 'copy-code':
        result = await copyCode(diagramElement);
        break;
      case 'download':
        result = await saveDiagram(diagramElement);
        break;
      case 'open-tab': {
        // T042: Dispatch event to open diagram in a new tab
        const svgEl = diagramElement.querySelector('svg');
        const svgContent = svgEl ? svgEl.outerHTML : '';
        const mermaidCode = diagramElement.dataset.mermaidCode
          ? decodeURIComponent(diagramElement.dataset.mermaidCode)
          : '';
        // Find the nearest preceding heading for the tab title
        let heading = '';
        let el: Element | null = diagramElement;
        while (el) {
          el = el.previousElementSibling;
          if (el && /^H[1-6]$/.test(el.tagName)) {
            heading = el.textContent?.trim() || '';
            break;
          }
        }
        window.dispatchEvent(new CustomEvent('diagram:open-tab', {
          detail: { svgContent, mermaidCode, heading },
        }));
        if (onActionComplete) {
          onActionComplete('open-tab', true);
        }
        return;
      }
      default:
        return;
    }

    if (onActionComplete) {
      onActionComplete(
        action,
        result.success,
        result.error?.message
      );
    }
  }, [copyAsPNG, copyCode, saveDiagram, onActionComplete]);

  const attachButtons = useCallback((diagram: HTMLElement) => {
    // Skip if already has buttons
    if (diagram.querySelector('.diagram-actions')) return;

    // Make diagram container position relative for absolute button positioning
    diagram.style.position = 'relative';

    // Insert button bar
    diagram.insertAdjacentHTML('beforeend', createButtonBarHTML());

    const actionsBar = diagram.querySelector('.diagram-actions') as HTMLElement;
    if (!actionsBar) return;

    // T029: Hover timing logic (200ms show, 500ms hide)
    const showDelay = 200;
    const hideDelay = 500;

    const showButtons = () => {
      const timers = timersRef.current.get(diagram);
      if (timers?.hide) {
        clearTimeout(timers.hide);
      }
      const showTimer = setTimeout(() => {
        actionsBar.classList.add('diagram-actions--visible');
      }, showDelay);
      timersRef.current.set(diagram, { ...timers, show: showTimer });
    };

    const hideButtons = () => {
      const timers = timersRef.current.get(diagram);
      if (timers?.show) {
        clearTimeout(timers.show);
      }
      const hideTimer = setTimeout(() => {
        actionsBar.classList.remove('diagram-actions--visible');
      }, hideDelay);
      timersRef.current.set(diagram, { ...timers, hide: hideTimer });
    };

    // Mouse enter/leave on diagram
    diagram.addEventListener('mouseenter', showButtons);
    diagram.addEventListener('mouseleave', hideButtons);

    // Keep visible when hovering over buttons
    actionsBar.addEventListener('mouseenter', () => {
      const timers = timersRef.current.get(diagram);
      if (timers?.hide) {
        clearTimeout(timers.hide);
      }
      actionsBar.classList.add('diagram-actions--visible');
    });
    actionsBar.addEventListener('mouseleave', hideButtons);

    // Button click handlers
    actionsBar.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
      if (button) {
        const action = button.dataset.action;
        if (action) {
          handleAction(action, diagram);
        }
      }
    });
  }, [handleAction]);

  const processContainer = useCallback((container: HTMLElement) => {
    const diagrams = container.querySelectorAll('.mermaid-diagram.mermaid-rendered');
    diagrams.forEach((diagram) => {
      attachButtons(diagram as HTMLElement);
    });
  }, [attachButtons]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Process existing diagrams
    processContainer(container);

    // Watch for new diagrams being rendered
    observerRef.current = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          // Check for newly rendered diagrams
          if (mutation.target instanceof HTMLElement) {
            if (mutation.target.classList.contains('mermaid-rendered')) {
              attachButtons(mutation.target);
            } else {
              const diagrams = mutation.target.querySelectorAll('.mermaid-diagram.mermaid-rendered');
              diagrams.forEach((d) => attachButtons(d as HTMLElement));
            }
          }
        }
      }
    });

    observerRef.current.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observerRef.current?.disconnect();
      // Clear all timers
      timersRef.current.forEach((timers) => {
        if (timers.show) clearTimeout(timers.show);
        if (timers.hide) clearTimeout(timers.hide);
      });
      timersRef.current.clear();
    };
  }, [containerRef, processContainer, attachButtons]);
}

export default useDiagramHoverButtons;

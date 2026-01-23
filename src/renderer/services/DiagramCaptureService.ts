/**
 * Diagram Capture Service
 * Handles capturing mermaid diagrams as PNG or SVG
 */

import html2canvas from 'html2canvas';
import { ClipboardError, ClipboardErrorCode } from '../../shared/types/clipboard';

export interface CaptureOptions {
  scale?: number;
  backgroundColor?: string | null;
}

export class DiagramCaptureService {
  /**
   * Capture diagram as PNG using html2canvas
   */
  async captureAsPNG(
    element: HTMLElement,
    options: CaptureOptions = {}
  ): Promise<Blob> {
    try {
      const canvas = await html2canvas(element, {
        background: options.backgroundColor !== undefined ? options.backgroundColor : undefined,
        scale: options.scale || 2, // High DPI for better quality
        useCORS: true, // Handle external images
        logging: false
      } as any);

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new ClipboardError(
              ClipboardErrorCode.CAPTURE_FAILED,
              'Failed to capture diagram as PNG',
              true
            ));
          }
        }, 'image/png');
      });
    } catch (error) {
      throw new ClipboardError(
        ClipboardErrorCode.CAPTURE_FAILED,
        `Failed to capture diagram: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
    }
  }

  /**
   * Capture diagram as SVG by extracting the SVG element
   */
  captureAsSVG(element: HTMLElement): string {
    const svgElement = element.querySelector('svg');
    
    if (!svgElement) {
      throw new ClipboardError(
        ClipboardErrorCode.CAPTURE_FAILED,
        'No SVG element found in diagram',
        false
      );
    }

    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      // Inline styles for portability
      this.inlineStyles(clonedSvg);

      // Serialize to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);

      // Add XML declaration if not present
      if (!svgString.startsWith('<?xml')) {
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
      }

      return svgString;
    } catch (error) {
      throw new ClipboardError(
        ClipboardErrorCode.CAPTURE_FAILED,
        `Failed to extract SVG: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
    }
  }

  /**
   * Extract mermaid source code from diagram element
   */
  extractMermaidCode(element: HTMLElement): string {
    // Try to get from data attribute first
    const sourceFromData = element.dataset.mermaidSource;
    if (sourceFromData) {
      return sourceFromData;
    }

    // Try to find in a sibling or parent element
    const parentContainer = element.closest('[data-mermaid-source]');
    if (parentContainer instanceof HTMLElement && parentContainer.dataset.mermaidSource) {
      return parentContainer.dataset.mermaidSource;
    }

    // Try to find in a pre/code element near the diagram
    const preElement = element.previousElementSibling;
    if (preElement && preElement.tagName === 'PRE') {
      const codeElement = preElement.querySelector('code');
      if (codeElement) {
        return codeElement.textContent || '';
      }
    }

    throw new ClipboardError(
      ClipboardErrorCode.CAPTURE_FAILED,
      'Could not find mermaid source code for diagram',
      false
    );
  }

  /**
   * Inline styles from stylesheets into SVG for portability
   */
  private inlineStyles(svgElement: SVGElement): void {
    try {
      // Get computed styles for all elements
      const elements = svgElement.querySelectorAll('*');
      
      elements.forEach((el) => {
        if (el instanceof SVGElement) {
          const computedStyle = window.getComputedStyle(el);
          const styleString = this.getRelevantStyles(computedStyle);
          
          if (styleString) {
            el.setAttribute('style', styleString);
          }
        }
      });
    } catch (error) {
      // If style inlining fails, continue without it
      console.warn('Failed to inline SVG styles:', error);
    }
  }

  /**
   * Extract relevant CSS properties from computed style
   */
  private getRelevantStyles(computedStyle: CSSStyleDeclaration): string {
    const relevantProperties = [
      'fill',
      'stroke',
      'stroke-width',
      'font-family',
      'font-size',
      'font-weight',
      'text-anchor',
      'opacity'
    ];

    const styles: string[] = [];

    for (const prop of relevantProperties) {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'normal') {
        styles.push(`${prop}: ${value}`);
      }
    }

    return styles.join('; ');
  }

  /**
   * Get dimensions of an element
   */
  getDimensions(element: HTMLElement): { width: number; height: number } {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height
    };
  }
}

// Singleton instance
let diagramCaptureServiceInstance: DiagramCaptureService | null = null;

export function getDiagramCaptureService(): DiagramCaptureService {
  if (!diagramCaptureServiceInstance) {
    diagramCaptureServiceInstance = new DiagramCaptureService();
  }
  return diagramCaptureServiceInstance;
}

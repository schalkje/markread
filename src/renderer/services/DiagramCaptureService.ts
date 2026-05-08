/**
 * Diagram Capture Service
 * Handles capturing mermaid diagrams as PNG or SVG
 */

import { ClipboardError, ClipboardErrorCode } from '../../shared/types/clipboard';

export interface CaptureOptions {
  scale?: number;
  backgroundColor?: string | null;
}

export class DiagramCaptureService {
  /**
   * Capture diagram as PNG by rendering SVG to canvas
   */
  async captureAsPNG(
    element: HTMLElement,
    options: CaptureOptions = {}
  ): Promise<Blob> {
    const svgElement = element.querySelector('svg');
    if (!svgElement) {
      throw new ClipboardError(
        ClipboardErrorCode.CAPTURE_FAILED,
        'No SVG element found in diagram',
        false
      );
    }

    try {
      const scale = options.scale || 2;

      // Clone SVG and prepare for standalone rendering
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      this.inlineStyles(clonedSvg);
      this.applyExportColors(clonedSvg);

      // Ensure the SVG has explicit dimensions
      const bbox = svgElement.getBoundingClientRect();
      const width = bbox.width;
      const height = bbox.height;
      clonedSvg.setAttribute('width', `${width}`);
      clonedSvg.setAttribute('height', `${height}`);

      // Serialize SVG to data URL
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

      // Draw SVG onto canvas
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas 2d context');
      }

      // Fill with white background
      ctx.fillStyle = options.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new ClipboardError(
                ClipboardErrorCode.CAPTURE_FAILED,
                'Failed to convert canvas to PNG blob',
                true
              ));
            }
          }, 'image/png');
        };
        img.onerror = () => {
          reject(new ClipboardError(
            ClipboardErrorCode.CAPTURE_FAILED,
            'Failed to load SVG as image',
            true
          ));
        };
        img.src = svgDataUrl;
      });
    } catch (error) {
      if (error instanceof ClipboardError) throw error;
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

      // Force dark text and light backgrounds for exported SVG readability
      this.applyExportColors(clonedSvg);

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
   * Force dark text and light backgrounds for exported diagrams,
   * ensuring readability regardless of the current theme.
   */
  private applyExportColors(svgElement: SVGElement): void {
    // Force all text to dark color
    const textElements = svgElement.querySelectorAll('text');
    textElements.forEach((el) => {
      this.setStyleProperty(el, 'fill', '#24292f');
    });

    // Edge label backgrounds: white with slight transparency
    const edgeLabelBgs = svgElement.querySelectorAll('.edgeLabel rect.background');
    edgeLabelBgs.forEach((el) => {
      this.setStyleProperty(el, 'fill', '#ffffff');
      this.setStyleProperty(el, 'fill-opacity', '0.8');
    });

    // Entity boxes: light background
    const entityBoxes = svgElement.querySelectorAll('.entityBox');
    entityBoxes.forEach((el) => {
      this.setStyleProperty(el, 'fill', 'rgba(255, 255, 255, 0.85)');
      this.setStyleProperty(el, 'stroke', '#d0d7de');
    });
  }

  private setStyleProperty(el: Element, prop: string, value: string): void {
    const style = el.getAttribute('style') || '';
    const regex = new RegExp(`${prop}:\\s*[^;]+`);
    if (regex.test(style)) {
      el.setAttribute('style', style.replace(regex, `${prop}: ${value}`));
    } else {
      el.setAttribute('style', style + (style ? '; ' : '') + `${prop}: ${value}`);
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

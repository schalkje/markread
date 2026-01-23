/**
 * useDiagramActions Hook
 * Task: T030
 * Provides action handlers for mermaid diagram interaction buttons
 */

import { useCallback, useState } from 'react';
import { getDiagramCaptureService } from '../services/DiagramCaptureService';
import { getClipboardService } from '../services/ClipboardService';
import type { DiagramActionResult } from '../../shared/types/clipboard';

interface UseDiagramActionsResult {
  copyAsPNG: (element: HTMLElement) => Promise<DiagramActionResult>;
  copyAsSVG: (element: HTMLElement) => Promise<DiagramActionResult>;
  copyCode: (element: HTMLElement) => Promise<DiagramActionResult>;
  downloadSVG: (element: HTMLElement, filename?: string) => Promise<DiagramActionResult>;
  lastResult: DiagramActionResult | null;
}

export function useDiagramActions(): UseDiagramActionsResult {
  const [lastResult, setLastResult] = useState<DiagramActionResult | null>(null);

  const captureService = getDiagramCaptureService();
  const clipboardService = getClipboardService();

  const copyAsPNG = useCallback(async (element: HTMLElement): Promise<DiagramActionResult> => {
    const startTime = performance.now();
    try {
      const pngBlob = await captureService.captureAsPNG(element);
      await clipboardService.copyImage({
        formats: [{ mimeType: 'image/png', data: pngBlob }],
        timestamp: new Date(),
        imageBlob: pngBlob,
        format: 'png',
        dimensions: captureService.getDimensions(element),
      });

      const result: DiagramActionResult = {
        success: true,
        action: { id: 'copy-png', type: 'copy-png', label: 'Copy as PNG', icon: '', handler: async () => {}, enabled: true },
        executionTime: performance.now() - startTime,
      };
      setLastResult(result);
      return result;
    } catch (error) {
      const result: DiagramActionResult = {
        success: false,
        action: { id: 'copy-png', type: 'copy-png', label: 'Copy as PNG', icon: '', handler: async () => {}, enabled: true },
        error: error instanceof Error ? error : new Error('Failed to copy as PNG'),
        executionTime: performance.now() - startTime,
      };
      setLastResult(result);
      return result;
    }
  }, [captureService, clipboardService]);

  const copyAsSVG = useCallback(async (element: HTMLElement): Promise<DiagramActionResult> => {
    const startTime = performance.now();
    try {
      const svgString = captureService.captureAsSVG(element);

      await clipboardService.copyMultiFormat([
        { mimeType: 'text/plain', data: new Blob([svgString], { type: 'text/plain' }) },
        { mimeType: 'text/html', data: new Blob([svgString], { type: 'text/html' }) },
      ]);

      const result: DiagramActionResult = {
        success: true,
        action: { id: 'copy-svg', type: 'copy-svg', label: 'Copy as SVG', icon: '', handler: async () => {}, enabled: true },
        executionTime: performance.now() - startTime,
      };
      setLastResult(result);
      return result;
    } catch (error) {
      const result: DiagramActionResult = {
        success: false,
        action: { id: 'copy-svg', type: 'copy-svg', label: 'Copy as SVG', icon: '', handler: async () => {}, enabled: true },
        error: error instanceof Error ? error : new Error('Failed to copy as SVG'),
        executionTime: performance.now() - startTime,
      };
      setLastResult(result);
      return result;
    }
  }, [captureService, clipboardService]);

  const copyCode = useCallback(async (element: HTMLElement): Promise<DiagramActionResult> => {
    const startTime = performance.now();
    try {
      const code = captureService.extractMermaidCode(element);
      await clipboardService.copyText({
        formats: [{ mimeType: 'text/plain', data: new Blob([code], { type: 'text/plain' }) }],
        timestamp: new Date(),
        plainText: code,
        markdownText: '```mermaid\n' + code + '\n```',
      });

      const result: DiagramActionResult = {
        success: true,
        action: { id: 'copy-code', type: 'copy-code', label: 'Copy Code', icon: '', handler: async () => {}, enabled: true },
        executionTime: performance.now() - startTime,
      };
      setLastResult(result);
      return result;
    } catch (error) {
      const result: DiagramActionResult = {
        success: false,
        action: { id: 'copy-code', type: 'copy-code', label: 'Copy Code', icon: '', handler: async () => {}, enabled: true },
        error: error instanceof Error ? error : new Error('Failed to copy code'),
        executionTime: performance.now() - startTime,
      };
      setLastResult(result);
      return result;
    }
  }, [captureService, clipboardService]);

  const downloadSVG = useCallback(async (element: HTMLElement, filename?: string): Promise<DiagramActionResult> => {
    const startTime = performance.now();
    try {
      const svgString = captureService.captureAsSVG(element);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });

      // Create download link
      const url = URL.createObjectURL(svgBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'diagram.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const result: DiagramActionResult = {
        success: true,
        action: { id: 'download', type: 'download', label: 'Download SVG', icon: '', handler: async () => {}, enabled: true },
        executionTime: performance.now() - startTime,
      };
      setLastResult(result);
      return result;
    } catch (error) {
      const result: DiagramActionResult = {
        success: false,
        action: { id: 'download', type: 'download', label: 'Download SVG', icon: '', handler: async () => {}, enabled: true },
        error: error instanceof Error ? error : new Error('Failed to download SVG'),
        executionTime: performance.now() - startTime,
      };
      setLastResult(result);
      return result;
    }
  }, [captureService]);

  return { copyAsPNG, copyAsSVG, copyCode, downloadSVG, lastResult };
}

export default useDiagramActions;

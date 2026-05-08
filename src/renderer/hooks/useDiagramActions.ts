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
  copyCode: (element: HTMLElement) => Promise<DiagramActionResult>;
  saveDiagram: (element: HTMLElement, filename?: string) => Promise<DiagramActionResult>;
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

  const saveDiagram = useCallback(async (element: HTMLElement, filename?: string): Promise<DiagramActionResult> => {
    const startTime = performance.now();
    try {
      // Generate both SVG and PNG data for the save dialog
      const svgData = captureService.captureAsSVG(element);
      const pngBlob = await captureService.captureAsPNG(element);

      // Convert PNG blob to base64
      const pngArrayBuffer = await pngBlob.arrayBuffer();
      const pngBytes = new Uint8Array(pngArrayBuffer);
      let binary = '';
      for (let i = 0; i < pngBytes.length; i++) {
        binary += String.fromCharCode(pngBytes[i]);
      }
      const pngDataBase64 = btoa(binary);

      const response = await window.exportApi.saveDiagram({
        defaultFilename: filename || 'diagram.svg',
        svgData,
        pngDataBase64,
      });

      if (response.cancelled) {
        const result: DiagramActionResult = {
          success: true,
          action: { id: 'download', type: 'download', label: 'Save Diagram', icon: '', handler: async () => {}, enabled: true },
          executionTime: performance.now() - startTime,
        };
        setLastResult(result);
        return result;
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to save diagram');
      }

      const result: DiagramActionResult = {
        success: true,
        action: { id: 'download', type: 'download', label: 'Save Diagram', icon: '', handler: async () => {}, enabled: true },
        executionTime: performance.now() - startTime,
      };
      setLastResult(result);
      return result;
    } catch (error) {
      const result: DiagramActionResult = {
        success: false,
        action: { id: 'download', type: 'download', label: 'Save Diagram', icon: '', handler: async () => {}, enabled: true },
        error: error instanceof Error ? error : new Error('Failed to save diagram'),
        executionTime: performance.now() - startTime,
      };
      setLastResult(result);
      return result;
    }
  }, [captureService]);

  return { copyAsPNG, copyCode, saveDiagram, lastResult };
}

export default useDiagramActions;

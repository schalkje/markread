/**
 * Marker Extractor Utilities
 * Extracts overview ruler markers from rendered markdown content
 */

import { ScrollbarMarker } from '../components/scrollbar/CustomScrollbar';

/**
 * Extract heading markers from rendered HTML
 * @param container The container element with rendered markdown
 * @param contentHeight Total scrollable height
 * @returns Array of heading markers
 */
export function extractHeadingMarkers(
  container: HTMLElement | null,
  contentHeight: number
): ScrollbarMarker[] {
  if (!container || contentHeight === 0) return [];

  const markers: ScrollbarMarker[] = [];
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headings.forEach((heading, index) => {
    const containerRect = container.getBoundingClientRect();

    // Calculate position relative to container (0-1 range)
    const offsetTop = heading.getBoundingClientRect().top - containerRect.top + container.scrollTop;
    const position = offsetTop / contentHeight;

    // Get heading text for tooltip
    const text = heading.textContent?.trim() || 'Heading';
    const level = heading.tagName.toLowerCase();

    markers.push({
      id: `heading-${index}`,
      position: Math.max(0, Math.min(1, position)), // Clamp to 0-1
      type: 'heading',
      tooltip: `${level.toUpperCase()}: ${text}`,
    });
  });

  return markers;
}

/**
 * Extract search result markers
 * @param container The container element with rendered markdown
 * @param contentHeight Total scrollable height
 * @param searchQuery The search query to find
 * @returns Array of search markers
 */
export function extractSearchMarkers(
  container: HTMLElement | null,
  contentHeight: number,
  searchQuery: string
): ScrollbarMarker[] {
  if (!container || contentHeight === 0 || !searchQuery) return [];

  const markers: ScrollbarMarker[] = [];
  const text = container.textContent || '';
  const query = searchQuery.toLowerCase();

  // Simple text search (can be enhanced with regex support)
  let index = 0;
  let matchIndex = 0;
  const lowerText = text.toLowerCase();

  while ((index = lowerText.indexOf(query, index)) !== -1) {
    // Estimate position based on text position (approximate)
    const position = index / text.length;

    markers.push({
      id: `search-${matchIndex}`,
      position: Math.max(0, Math.min(1, position)),
      type: 'search',
      tooltip: `Match ${matchIndex + 1}: "${searchQuery}"`,
    });

    index += query.length;
    matchIndex++;
  }

  return markers;
}

/**
 * Combine multiple marker arrays, removing duplicates
 * @param markerArrays Arrays of markers to combine
 * @returns Combined and deduplicated markers
 */
export function combineMarkers(...markerArrays: ScrollbarMarker[][]): ScrollbarMarker[] {
  const combined = markerArrays.flat();
  const seen = new Set<string>();
  const unique: ScrollbarMarker[] = [];

  for (const marker of combined) {
    // Create unique key based on position and type
    const key = `${marker.type}-${marker.position.toFixed(4)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(marker);
    }
  }

  // Sort by position
  return unique.sort((a, b) => a.position - b.position);
}

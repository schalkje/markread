/**
 * Generates the markdown shown when a link points at a folder without a
 * README. Kept free of DOM/Electron dependencies so it can be unit tested.
 */

import { encodeLinkDestination } from './link-paths';

export interface DirectoryListingItem {
  /** File or folder name on disk */
  name: string;
  /** Optional display title (e.g. first heading of a markdown file) */
  title?: string;
  isDirectory: boolean;
}

export interface DirectoryListingOptions {
  /** Name of the directory being listed, used as the page heading */
  dirName: string;
  items: DirectoryListingItem[];
  /** When set, a "Back to" link pointing at the parent listing is added */
  backLinkTitle?: string;
}

/** Escape characters that would end or break a markdown link label. */
function escapeLinkLabel(label: string): string {
  return label.replace(/([\\[\]])/g, '\\$1');
}

/**
 * Build the directory listing markdown. Link destinations are percent-encoded
 * so names with spaces, `%`, `#`, parentheses or non-ASCII characters remain
 * clickable links (raw spaces are not parsed as a link by markdown-it, and
 * with `linkify` enabled the tail would be auto-linked to `http://…`).
 */
export function generateDirectoryListingMarkdown({
  dirName,
  items,
  backLinkTitle,
}: DirectoryListingOptions): string {
  let markdown = `# ${dirName}\n\n`;

  if (backLinkTitle) {
    // Trailing slash forces a directory listing (not README.md) for the parent
    markdown += `[← Back to: ${escapeLinkLabel(backLinkTitle)}](../)\n\n---\n\n`;
  }

  const directories = items.filter((item) => item.isDirectory);
  if (directories.length > 0) {
    markdown += '## Folders\n\n';
    for (const item of directories) {
      const label = escapeLinkLabel(item.title || item.name);
      markdown += `- [${label}/](${encodeLinkDestination(item.name)}/)\n`;
    }
    markdown += '\n';
  }

  const files = items.filter((item) => !item.isDirectory);
  if (files.length > 0) {
    markdown += '## Files\n\n';
    for (const item of files) {
      const label = escapeLinkLabel(item.title || item.name);
      markdown += `- [${label}](${encodeLinkDestination(item.name)})\n`;
    }
  }

  return markdown;
}

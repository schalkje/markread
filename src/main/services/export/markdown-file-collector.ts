/**
 * Collects the markdown files that make up a folder or repository export.
 *
 * Extracted from FolderExportService so the walk/flatten logic has no
 * Electron dependency and can be unit tested. Applies the combined
 * exclusion filter (browsing folder exclusions + export-only exclusions)
 * so excluded files never reach the table of contents, page count, or
 * progress total.
 */

import * as fs from 'fs/promises';
import type { Dirent } from 'fs';
import * as path from 'path';
import type { MarkdownFile } from '../../../shared/types/export';
import type { DefaultFileEntry } from '../../../shared/types/entities';
import type { TreeNode } from '../../../shared/types/repository';
import {
  createExportExclusionFilter,
  type ExportExclusionFilter,
} from '../../../shared/utils/export-exclusions';

export const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd'];

export function isMarkdownFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return MARKDOWN_EXTENSIONS.includes(ext);
}

/** Prettify a file name into a document title ("my-file.md" -> "My File") */
export function extractTitle(filename: string): string {
  const name = path.basename(filename, path.extname(filename));
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface CollectOptions {
  includeSubfolders: boolean;
  /** Files listed here come first, in the order given */
  defaultFilesToOpen?: DefaultFileEntry[];
  /** Combined exclusion filter; defaults to the built-in folder exclusions only */
  filter?: ExportExclusionFilter;
}

export interface CollectTreeOptions extends CollectOptions {
  /** When exporting a subfolder of a repository, the path relative to the root */
  subfolderPath?: string;
}

/**
 * Sort items so that enabled `defaultFilesToOpen` entries come first (in
 * their configured order), then the rest alphabetically.
 */
function sortByPriority<T>(
  items: T[],
  getName: (item: T) => string,
  defaultFilesToOpen?: DefaultFileEntry[]
): T[] {
  const sorted = [...items];
  if (!defaultFilesToOpen || defaultFilesToOpen.length === 0) {
    return sorted.sort((a, b) => getName(a).localeCompare(getName(b)));
  }

  const priorityMap = new Map<string, number>();
  defaultFilesToOpen.forEach((entry, index) => {
    if (entry.isEnabled) {
      priorityMap.set(entry.filename.toLowerCase(), index);
    }
  });

  return sorted.sort((a, b) => {
    const aName = getName(a);
    const bName = getName(b);
    const aPriority = priorityMap.get(aName.toLowerCase());
    const bPriority = priorityMap.get(bName.toLowerCase());

    if (aPriority !== undefined && bPriority !== undefined) return aPriority - bPriority;
    if (aPriority !== undefined) return -1;
    if (bPriority !== undefined) return 1;
    return aName.localeCompare(bName);
  });
}

async function walkDirectory(
  currentPath: string,
  rootPath: string,
  files: MarkdownFile[],
  order: number,
  options: CollectOptions,
  filter: ExportExclusionFilter
): Promise<number> {
  let currentOrder = order;
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  const fileEntries = entries.filter(
    (e) => e.isFile() && isMarkdownFile(e.name) && !filter.isFileExcluded(e.name)
  );
  const dirEntries = entries.filter((e) => e.isDirectory());

  const sortedFiles = sortByPriority<Dirent>(fileEntries, (e) => e.name, options.defaultFilesToOpen);
  const sortedDirs = [...dirEntries].sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of sortedFiles) {
    const fullPath = path.join(currentPath, entry.name);
    files.push({
      path: fullPath,
      relativePath: path.relative(rootPath, fullPath),
      title: extractTitle(entry.name),
      content: '',
      order: currentOrder++,
    });
  }

  if (options.includeSubfolders) {
    for (const entry of sortedDirs) {
      // Skip hidden directories and anything excluded by the browsing or export lists
      if (entry.name.startsWith('.') || filter.isFolderExcluded(entry.name)) continue;
      const fullPath = path.join(currentPath, entry.name);
      currentOrder = await walkDirectory(fullPath, rootPath, files, currentOrder, options, filter);
    }
  }

  return currentOrder;
}

/** Collect markdown files from a local folder, files first then subfolders, in export order */
export async function collectMarkdownFilesFromFolder(
  folderPath: string,
  options: CollectOptions
): Promise<MarkdownFile[]> {
  const files: MarkdownFile[] = [];
  const filter = options.filter ?? createExportExclusionFilter();
  await walkDirectory(folderPath, folderPath, files, 0, options, filter);
  return files;
}

function normalizeRepoPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '');
}

/** Flatten a repository tree into markdown files in export order */
export function collectMarkdownFilesFromTree(
  tree: TreeNode[],
  options: CollectTreeOptions
): MarkdownFile[] {
  const files: MarkdownFile[] = [];
  const filter = options.filter ?? createExportExclusionFilter();
  const normalizedSubfolder = options.subfolderPath ? normalizeRepoPath(options.subfolderPath) : '';
  let order = 0;

  const isInsideExportScope = (nodePath: string): boolean =>
    !normalizedSubfolder || nodePath.startsWith(normalizedSubfolder + '/');

  const processNode = (node: TreeNode, currentPath: string = ''): void => {
    const nodePath = currentPath ? `${currentPath}/${node.path.split('/').pop()}` : node.path;
    const normalizedNodePath = normalizeRepoPath(nodePath);
    const nodeName = node.path.split('/').pop() || node.path;

    if (normalizedSubfolder) {
      if (node.type === 'directory') {
        // Keep the subfolder itself, its parents and its children
        if (
          !normalizedNodePath.startsWith(normalizedSubfolder) &&
          !normalizedSubfolder.startsWith(normalizedNodePath)
        ) {
          return;
        }
      } else if (
        !normalizedNodePath.startsWith(normalizedSubfolder + '/') &&
        normalizedNodePath !== normalizedSubfolder
      ) {
        return;
      }
    }

    if (node.type === 'file') {
      if (!isMarkdownFile(node.path) || filter.isFileExcluded(nodeName)) return;

      let relativePath = nodePath;
      if (normalizedSubfolder) {
        relativePath = nodePath.replace(normalizedSubfolder + '/', '').replace(/^\/+/, '');
      }

      files.push({
        path: nodePath, // Virtual path within the repository
        relativePath,
        title: extractTitle(nodeName),
        content: '', // Fetched later by the export service
        order: order++,
      });
      return;
    }

    if (node.type !== 'directory' || !node.children) return;

    // Folder exclusions only apply inside the exported scope, never to the
    // subfolder's own ancestors (which are only traversed to reach it)
    if (isInsideExportScope(normalizedNodePath) && filter.isFolderExcluded(nodeName)) return;

    const shouldRecurse =
      options.includeSubfolders ||
      (normalizedSubfolder && !normalizedNodePath.includes(normalizedSubfolder));

    if (shouldRecurse || !normalizedSubfolder) {
      const fileChildren = node.children.filter((c) => c.type === 'file');
      const dirChildren = node.children.filter((c) => c.type === 'directory');

      const sortedFiles = sortByPriority(fileChildren, (n) => n.path.split('/').pop() || '', options.defaultFilesToOpen);
      const sortedDirs = [...dirChildren].sort((a, b) => a.path.localeCompare(b.path));

      for (const child of sortedFiles) processNode(child, nodePath);
      for (const child of sortedDirs) processNode(child, nodePath);
    }
  };

  const rootFiles = tree.filter((n) => n.type === 'file');
  const rootDirs = tree.filter((n) => n.type === 'directory');

  const sortedRootFiles = sortByPriority(rootFiles, (n) => n.path.split('/').pop() || '', options.defaultFilesToOpen);
  const sortedRootDirs = [...rootDirs].sort((a, b) => a.path.localeCompare(b.path));

  for (const node of sortedRootFiles) processNode(node);
  for (const node of sortedRootDirs) processNode(node);

  return files;
}

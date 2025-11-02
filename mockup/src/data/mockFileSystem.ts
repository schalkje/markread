import { FileNode } from '../types';

export const mockFileSystem: FileNode = {
  id: 'root',
  name: 'Documentation',
  type: 'folder',
  path: '/Documentation',
  children: [
    {
      id: 'getting-started',
      name: 'Getting Started',
      type: 'folder',
      path: '/Documentation/Getting Started',
      children: [
        {
          id: 'intro',
          name: 'Introduction.md',
          type: 'file',
          path: '/Documentation/Getting Started/Introduction.md',
          content: `# Introduction to Markdown Viewer

Welcome to the **Markdown Viewer** - a modern, fluent-designed application for reading and navigating markdown documentation.

## Features

- 📄 **Multi-file support** - Open multiple files in tabs
- 🔍 **Advanced search** - Search within pages or across entire folders
- 🌳 **File tree navigation** - Browse your documentation structure
- ⬅️➡️ **History navigation** - Go back and forward through your reading history
- 📤 **Export to PDF** - Export individual files or entire folders

## Getting Started

1. Browse the file tree on the left
2. Click on any markdown file to open it
3. Use the search box to find content
4. Navigate using the back/forward buttons

Enjoy your reading experience!`
        },
        {
          id: 'installation',
          name: 'Installation.md',
          type: 'file',
          path: '/Documentation/Getting Started/Installation.md',
          content: `# Installation Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v16 or higher)
- npm or yarn package manager
- A modern web browser

## Installation Steps

### Step 1: Clone the Repository

\`\`\`bash
git clone https://github.com/example/markdown-viewer.git
cd markdown-viewer
\`\`\`

### Step 2: Install Dependencies

\`\`\`bash
npm install
# or
yarn install
\`\`\`

### Step 3: Start the Application

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

The application will open at \`http://localhost:3000\`

## Configuration

You can configure the application by editing the \`config.json\` file in the root directory.

### Available Options

- **theme**: Light or dark mode
- **fontSize**: Default font size for markdown content
- **sidebar**: Show or hide sidebar by default`
        }
      ]
    },
    {
      id: 'guides',
      name: 'Guides',
      type: 'folder',
      path: '/Documentation/Guides',
      children: [
        {
          id: 'search-guide',
          name: 'Search Guide.md',
          type: 'file',
          path: '/Documentation/Guides/Search Guide.md',
          content: `# Search Guide

Learn how to effectively search through your markdown documentation.

## In-Page Search

Press \`Ctrl+F\` or use the search box at the top to search within the current page.

### Features:
- **Match highlighting** - All matches are highlighted in yellow
- **Match counter** - Shows current match and total count
- **Navigation** - Use arrows to jump between matches
- **Case sensitivity toggle** - Optional case-sensitive search

## Global Search

Press \`Shift+Ctrl+F\` to search across all markdown files in the current folder.

### How it works:
1. Enter your search term
2. Results appear instantly with file names and previews
3. Click any result to open that file
4. Matches are highlighted when the file opens

## Search Tips

- Use quotes for exact phrases: \`"exact match"\`
- Search is recursive through all subfolders
- Results show context around matches
- Regular expressions are supported

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Ctrl+F\` | In-page search |
| \`Shift+Ctrl+F\` | Global search |
| \`F3\` or \`Enter\` | Next match |
| \`Shift+F3\` | Previous match |
| \`Esc\` | Close search |`
        },
        {
          id: 'navigation-guide',
          name: 'Navigation Guide.md',
          type: 'file',
          path: '/Documentation/Guides/Navigation Guide.md',
          content: `# Navigation Guide

Master the navigation features of the Markdown Viewer.

## File Tree Navigation

The left sidebar shows your documentation structure:

- Click folders to expand/collapse them
- Click files to open them in a new tab
- Right-click for context menu options

## Tab Management

- Multiple files can be open simultaneously
- Click tabs to switch between files
- Close tabs with the × button
- Tabs persist during your session

## History Navigation

Use the browser-style navigation buttons:

### Back Button (⬅️)
Returns to the previously viewed file

### Forward Button (➡️)
Moves forward in your browsing history

### History Dropdown
Click the dropdown to see your full browsing history and jump to any previous file.

## Breadcrumb Navigation

The breadcrumb at the top shows your current location in the file tree. Click any segment to navigate up the folder hierarchy.

## Keyboard Shortcuts

- \`Ctrl+Tab\`: Next tab
- \`Ctrl+Shift+Tab\`: Previous tab
- \`Ctrl+W\`: Close current tab
- \`Alt+←\`: Back
- \`Alt+→\`: Forward`
        },
        {
          id: 'export-guide',
          name: 'Export Guide.md',
          type: 'file',
          path: '/Documentation/Guides/Export Guide.md',
          content: `# Export Guide

Learn how to export your markdown files to PDF format.

## Export Current File

To export the currently open file:

1. Click the **Export** button in the toolbar
2. Select **Export Current File to PDF**
3. Choose your save location
4. The PDF will be generated with proper formatting

## Export Entire Folder

To export all markdown files in a folder:

1. Right-click on a folder in the file tree
2. Select **Export Folder to PDF**
3. All markdown files will be combined into a single PDF
4. Files are ordered alphabetically

## PDF Settings

### Page Layout
- **Paper size**: A4 (default)
- **Margins**: 1 inch on all sides
- **Orientation**: Portrait

### Formatting
- Syntax highlighting for code blocks
- Preserved markdown formatting
- Table of contents (for folder exports)
- Page numbers in footer

## Tips

- Images are embedded in the PDF
- Links are preserved as clickable elements
- Code blocks maintain their formatting
- Tables are properly rendered

## Limitations

- Very large folders may take time to export
- External images require internet connection
- Some advanced markdown features may render differently`
        }
      ]
    },
    {
      id: 'api',
      name: 'API Reference',
      type: 'folder',
      path: '/Documentation/API Reference',
      children: [
        {
          id: 'api-overview',
          name: 'Overview.md',
          type: 'file',
          path: '/Documentation/API Reference/Overview.md',
          content: `# API Reference Overview

This section contains the complete API reference for the Markdown Viewer.

## Core Components

### MarkdownViewer
The main component for rendering markdown content.

**Props:**
- \`content\`: string - The markdown content to render
- \`onLinkClick\`: function - Handler for internal link clicks
- \`searchTerm\`: string - Term to highlight in the content

### FileTree
Component for displaying the file system structure.

**Props:**
- \`rootNode\`: FileNode - Root of the file tree
- \`onFileSelect\`: function - Called when a file is selected
- \`selectedFileId\`: string - Currently selected file ID

### SearchBox
Component for in-page search functionality.

**Props:**
- \`content\`: string - Content to search within
- \`onMatch\`: function - Called with match information
- \`onNavigate\`: function - Called when navigating matches

## Utility Functions

### \`parseMarkdown(content: string): ReactElement\`
Parses markdown string and returns React elements.

### \`exportToPDF(content: string, filename: string): Promise<void>\`
Exports markdown content as a PDF file.

### \`searchInFiles(searchTerm: string, files: FileNode[]): SearchResult[]\`
Searches for a term across multiple files.

## Type Definitions

See the complete type definitions in the \`/types\` directory.`
        }
      ]
    },
    {
      id: 'readme',
      name: 'README.md',
      type: 'file',
      path: '/Documentation/README.md',
      content: `# Markdown Viewer Documentation

Welcome to the comprehensive documentation for the Markdown Viewer application.

## Quick Links

- [Introduction](./Getting%20Started/Introduction.md)
- [Installation](./Getting%20Started/Installation.md)
- [Search Guide](./Guides/Search%20Guide.md)
- [Navigation Guide](./Guides/Navigation%20Guide.md)
- [Export Guide](./Guides/Export%20Guide.md)

## About

This is a modern, Fluent UI-inspired markdown viewer designed for:

✨ **Beautiful reading experience**
🚀 **Fast navigation**
🔍 **Powerful search**
📱 **Responsive design**

## Support

For issues and questions, please visit our GitHub repository or contact support.

---

*Last updated: October 28, 2025*`
    }
  ]
};

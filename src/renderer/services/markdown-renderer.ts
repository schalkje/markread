/**
 * Markdown Renderer Service
 * Tasks: T025-T030
 *
 * Configures and manages markdown rendering pipeline:
 * - markdown-it with GFM plugins (tables, task lists, linkify)
 * - Highlight.js for syntax highlighting (40+ languages)
 * - Mermaid for diagram rendering
 * - DOMPurify for XSS protection
 */

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import DOMPurify from 'isomorphic-dompurify';
// @ts-ignore - markdown-it-task-lists may not have types
import taskLists from 'markdown-it-task-lists';
// @ts-ignore - markdown-it-footnote may not have types
import footnote from 'markdown-it-footnote';
// @ts-ignore - markdown-it-deflist may not have types
import deflist from 'markdown-it-deflist';
// @ts-ignore - highlightjs-copy may not have types
import CopyButtonPlugin from 'highlightjs-copy';

/**
 * T025: Configure markdown-it v14.1.0 with GFM plugins
 */
const md = new MarkdownIt({
  html: true, // Enable raw HTML (sanitized by DOMPurify)
  xhtmlOut: true,
  breaks: true, // Convert \n to <br>
  linkify: true, // Auto-convert URLs to links
  typographer: true, // Enable smartquotes and other typographic replacements

  /**
   * T026: Prepare code blocks for post-render highlighting
   * We don't highlight here because highlightjs-copy needs DOM elements
   * Highlighting is applied in applySyntaxHighlighting() after render
   */
  highlight: (code: string, language: string) => {
    // Just escape HTML - markdown-it will wrap this in <pre><code class="language-xxx">
    // The post-render applySyntaxHighlighting() will do actual highlighting
    return md.utils.escapeHtml(code);
  },
});

/**
 * T025: Enable GFM features via plugins
 */
md.enable([
  'table', // GitHub-style tables
  'strikethrough', // ~~strikethrough~~
]);

// Enable task lists plugin
md.use(taskLists, {
  enabled: true,
  label: true, // Wrap checkbox in label for better UX
  labelAfter: false, // Label before checkbox
});

// Enable footnotes plugin
md.use(footnote);

// Enable definition lists plugin
md.use(deflist);

/**
 * Add copy button plugin for code blocks
 * Provides one-click copy functionality with visual feedback
 */
hljs.addPlugin(
  new CopyButtonPlugin({
    lang: 'en',
  })
);

/**
 * T027: Register 40 common languages for Highlight.js
 * These languages are registered on-demand for better performance
 */
const COMMON_LANGUAGES = [
  // Web technologies
  'javascript',
  'typescript',
  'html',
  'css',
  'scss',
  'less',
  'json',
  'xml',
  'yaml',
  'toml',

  // Systems programming
  'c',
  'cpp',
  'rust',
  'go',
  'zig',

  // Backend languages
  'java',
  'kotlin',
  'scala',
  'csharp',
  'python',
  'ruby',
  'php',
  'perl',
  'r',

  // Scripting
  'bash',
  'shell',
  'powershell',
  'batch',

  // Functional languages
  'haskell',
  'erlang',
  'elixir',
  'ocaml',
  'fsharp',

  // Database & query
  'sql',
  'graphql',

  // Markup & config
  'markdown',
  'latex',
  'dockerfile',
  'nginx',
  'apache',

  // Mobile
  'swift',
  'objectivec',
  'dart',
];

/**
 * Lazy-load language support
 * Only loads language definitions when needed
 */
export function registerLanguage(lang: string): boolean {
  if (COMMON_LANGUAGES.includes(lang)) {
    // Language already registered or will auto-load
    return true;
  }

  try {
    // Attempt to get language (triggers lazy load in Highlight.js)
    return hljs.getLanguage(lang) !== undefined;
  } catch (err) {
    console.warn(`Failed to register language: ${lang}`, err);
    return false;
  }
}

/**
 * T028: Implement custom markdown-it fence rule for Mermaid diagrams
 * Intercept ```mermaid code blocks and convert to renderable format
 */
const defaultFence = md.renderer.rules.fence!;

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = token.info.trim();
  const lang = info.split(/\s+/)[0];

  // Handle Mermaid diagrams specially
  if (lang === 'mermaid') {
    const code = token.content;
    const encodedCode = encodeURIComponent(code);

    // Return a div with data attribute for Mermaid to process
    // Empty placeholder (page is hidden during rendering anyway)
    return `<div class="mermaid-diagram" data-mermaid-code="${encodedCode}"></div>`;
  } 

  // Use default fence rendering for other languages
  return defaultFence(tokens, idx, options, env, self);
};

/**
 * T029: Configure Mermaid v11.12.2 with securityLevel: 'strict'
 * Prevents script execution in diagrams
 * Uses base theme with themeVariables that can be updated dynamically
 * 
 * https://mermaid.js.org/config/theming.html
 * lineColor: color of the connection in ERD diagrams  
 * primaryTextColor: color of the entity titles in ERD diagrams, not the labels of the relations
 * primaryBorderColor: border color of the entities in ERD diagrams, also the color of the label of the relations, BUT THIS IS OVERRIDDEN IN CSS
 */
function initializeMermaidTheme(theme: 'light' | 'dark' = 'light'): void {
  const isDark = theme === 'dark';

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base', // Base theme is the only one that accepts themeVariables
    securityLevel: 'strict',
    themeVariables: {
      // ER Diagram: Row backgrounds (undocumented but functional)
      attributeBackgroundColorOdd: isDark ? '#21262d' : '#f00',
      attributeBackgroundColorEven: isDark ? '#161b22' : '#00f',

      // General colors for entity headers and borders
      primaryColor: isDark ? '#30363d' : '#e1e4e8',
      primaryTextColor: isDark ? '#e6edf3' : '#24292f',
      primaryBorderColor: isDark ? '#6e7681' : '#d0d7de',
      lineColor: isDark ? '#8b949e' : '#6e7681',
      textColor: isDark ? '#c9d1d9' : '#24292f',
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: false,
    },
    sequence: {
      useMaxWidth: true,
    },
  });
}

// Initialize with light theme by default
initializeMermaidTheme('light');

/**
 * Minimal cleanup for edge label backgrounds
 * Only removes the purple background from edge labels
 */
function cleanupMermaidInlineStyles(diagram: HTMLElement): void {
  // Edge labels often have hardcoded purple backgrounds - let CSS control them
  const edgeLabels = diagram.querySelectorAll('.edgeLabel rect.background');
  edgeLabels.forEach((rect) => {
    const element = rect as SVGElement;
    if (element.style.fill) {
      element.style.removeProperty('fill');
    }
  });
}

/**
 * Render Mermaid diagrams in the DOM
 * Should be called after markdown HTML is inserted
 */
export async function renderMermaidDiagrams(container: HTMLElement): Promise<void> {
  const diagrams = container.querySelectorAll('.mermaid-diagram');
  console.log(`[Mermaid] Found ${diagrams.length} diagrams to render`);

  for (let i = 0; i < diagrams.length; i++) {
    const diagram = diagrams[i] as HTMLElement;
    const encodedCode = diagram.dataset.mermaidCode;

    if (!encodedCode) continue;

    const code = decodeURIComponent(encodedCode);

    try {
      console.log(`[Mermaid] Rendering diagram ${i + 1}/${diagrams.length}`);
      // Generate unique ID for Mermaid
      const id = `mermaid-${Date.now()}-${i}`;

      // Render diagram
      const { svg } = await mermaid.render(id, code);

      // Replace text with SVG
      diagram.innerHTML = svg;
      diagram.classList.add('mermaid-rendered');

      // Clean up inline !important styles that interfere with CSS
      cleanupMermaidInlineStyles(diagram);

      console.log(`[Mermaid] Diagram ${i + 1} rendered successfully`);
    } catch (err) {
      console.error('Mermaid rendering error:', err);
      diagram.innerHTML = `<pre class="mermaid-error">Failed to render diagram:\n${md.utils.escapeHtml(
        code
      )}</pre>`;
    }
  }

  console.log('[Mermaid] All diagrams rendered');
}

/**
 * T030: Integrate DOMPurify v3.3.1 sanitization
 * Clean HTML output to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    // Allow common HTML elements for rich markdown
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'a',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'strong',
      'em',
      'del',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'br',
      'hr',
      'img',
      'div',
      'span',
      'input', // For task list checkboxes 
      'label', // For task list labels
      'svg', // For Mermaid diagrams
      'g',
      'path',
      'rect',
      'circle',
      'ellipse',
      'line',
      'polyline',
      'polygon',
      'text',
      'tspan',
      'defs',
      'marker',
      'foreignObject',
      'sup',
      'sub'
    ],

    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'class',
      'id',
      'type',
      'checked',
      'disabled',
      'data-*', // Allow data attributes for Mermaid
      'width',
      'height',
      'style', // Allow inline CSS (DOMPurify sanitizes dangerous CSS)
      'align', // Text/image alignment
      'valign', // Vertical alignment in tables
      'border', // Table borders
      'cellpadding', // Table cell padding
      'cellspacing', // Table cell spacing
      'colspan', // Table column span
      'rowspan', // Table row span
      // SVG attributes for Mermaid diagrams
      'viewBox',
      'xmlns',
      'fill',
      'stroke',
      'stroke-width',
      'transform',
      'd',
      'x',
      'y',
      'x1',
      'y1',
      'x2',
      'y2',
      'cx',
      'cy',
      'r',
      'rx',
      'ry',
      'points',
      'markerWidth',
      'markerHeight',
      'orient',
      'refX',
      'refY',
    ],

    // Security settings
    ALLOW_DATA_ATTR: true, // For Mermaid diagrams
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * T031-T033: Image & link resolution will be handled via custom renderer rules
 * Added in next phase
 */

/**
 * Main render function
 * Converts markdown to safe HTML
 */
export function renderMarkdown(markdown: string): string {
  // Step 1: Parse markdown to HTML
  const rawHtml = md.render(markdown);

  // Step 2: Sanitize HTML with DOMPurify
  const safeHtml = sanitizeHtml(rawHtml);

  return safeHtml;
}

/**
 * Apply syntax highlighting and copy buttons to code blocks
 * This must be called AFTER the HTML is inserted into the DOM
 * because highlightjs-copy plugin works on DOM elements
 */
export function applySyntaxHighlighting(container: HTMLElement): void {
  // Find all code blocks that haven't been processed yet
  const codeBlocks = container.querySelectorAll('pre code:not(.hljs-processed)');

  codeBlocks.forEach((block) => {
    // Mark as processed to avoid double-processing
    block.classList.add('hljs-processed');

    // Apply highlight.js to the element
    // This will trigger the copy button plugin
    hljs.highlightElement(block as HTMLElement);
  });
}

/**
 * Update Mermaid theme when app theme changes
 * Called from theme store
 */
export function updateMermaidTheme(theme: 'light' | 'dark'): void {
  initializeMermaidTheme(theme);
}

export default {
  renderMarkdown,
  renderMermaidDiagrams,
  applySyntaxHighlighting,
  sanitizeHtml,
  registerLanguage,
  updateMermaidTheme,
};

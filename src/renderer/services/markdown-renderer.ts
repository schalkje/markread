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

/**
 * T025: Configure markdown-it v14.1.0 with GFM plugins
 */
const md = new MarkdownIt({
  html: false, // Disable raw HTML for security
  xhtmlOut: true,
  breaks: true, // Convert \n to <br>
  linkify: true, // Auto-convert URLs to links
  typographer: true, // Enable smartquotes and other typographic replacements

  /**
   * T026: Integrate Highlight.js with markdown-it
   * Apply syntax highlighting to code blocks
   */
  highlight: (code: string, language: string) => {
    if (language && hljs.getLanguage(language)) {
      try {
        return hljs.highlight(code, {
          language,
          ignoreIllegals: true,
        }).value;
      } catch (err) {
        console.error(`Highlight.js error for language "${language}":`, err);
      }
    }

    // Fallback: auto-detect language
    try {
      return hljs.highlightAuto(code).value;
    } catch (err) {
      console.error('Highlight.js auto-detection error:', err);
      return md.utils.escapeHtml(code);
    }
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
    // We'll initialize Mermaid after markdown rendering
    return `<div class="mermaid-diagram" data-mermaid-code="${encodedCode}">${md.utils.escapeHtml(code)}</div>`;
  }

  // Use default fence rendering for other languages
  return defaultFence(tokens, idx, options, env, self);
};

/**
 * T029: Configure Mermaid v11.12.2 with securityLevel: 'strict'
 * Prevents script execution in diagrams
 */
mermaid.initialize({
  startOnLoad: false, // We'll manually trigger rendering
  theme: 'default',
  securityLevel: 'strict', // Disable script tags, prevent XSS
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  themeVariables: {
    fontSize: '14px',
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: false, // Disable HTML in labels for security
  },
  sequence: {
    useMaxWidth: true,
  },
});

/**
 * Render Mermaid diagrams in the DOM
 * Should be called after markdown HTML is inserted
 */
export async function renderMermaidDiagrams(container: HTMLElement): Promise<void> {
  const diagrams = container.querySelectorAll('.mermaid-diagram');

  for (let i = 0; i < diagrams.length; i++) {
    const diagram = diagrams[i] as HTMLElement;
    const encodedCode = diagram.dataset.mermaidCode;

    if (!encodedCode) continue;

    const code = decodeURIComponent(encodedCode);

    try {
      // Generate unique ID for Mermaid
      const id = `mermaid-${Date.now()}-${i}`;

      // Render diagram
      const { svg } = await mermaid.render(id, code);

      // Replace text with SVG
      diagram.innerHTML = svg;
      diagram.classList.add('mermaid-rendered');
    } catch (err) {
      console.error('Mermaid rendering error:', err);
      diagram.innerHTML = `<pre class="mermaid-error">Failed to render diagram:\n${md.utils.escapeHtml(
        code
      )}</pre>`;
    }
  }
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
 * Update Mermaid theme when app theme changes
 * Called from theme store
 */
export function updateMermaidTheme(theme: 'light' | 'dark'): void {
  mermaid.initialize({
    theme: theme === 'dark' ? 'dark' : 'default',
  });
}

export default {
  renderMarkdown,
  renderMermaidDiagrams,
  sanitizeHtml,
  registerLanguage,
  updateMermaidTheme,
};

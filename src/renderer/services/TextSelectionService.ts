/**
 * TextSelectionService
 * Tasks: T046-T049
 * Extracts text from DOM selections in plain text, HTML, and markdown formats
 */

export interface SelectionContent {
  plainText: string;
  htmlText: string;
  markdownText: string;
  hasSelection: boolean;
}

export class TextSelectionService {
  /**
   * Get the current text selection within a container element
   */
  getSelection(container?: HTMLElement): SelectionContent {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return { plainText: '', htmlText: '', markdownText: '', hasSelection: false };
    }

    const range = selection.getRangeAt(0);

    // If container is specified, verify selection is within it
    if (container && !container.contains(range.commonAncestorContainer)) {
      return { plainText: '', htmlText: '', markdownText: '', hasSelection: false };
    }

    const plainText = selection.toString();
    if (!plainText.trim()) {
      return { plainText: '', htmlText: '', markdownText: '', hasSelection: false };
    }

    const htmlText = this.extractHtml(range);
    const markdownText = this.htmlToMarkdown(htmlText);

    return { plainText, htmlText, markdownText, hasSelection: true };
  }

  /**
   * Check if there is an active text selection within a container
   */
  hasSelection(container?: HTMLElement): boolean {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
    if (!container) return true;
    const range = selection.getRangeAt(0);
    return container.contains(range.commonAncestorContainer);
  }

  /**
   * T049: Extract HTML from the selection range
   */
  private extractHtml(range: Range): string {
    const fragment = range.cloneContents();
    const wrapper = document.createElement('div');
    wrapper.appendChild(fragment);
    return wrapper.innerHTML;
  }

  /**
   * T048: Convert HTML to approximate markdown syntax
   * Handles common elements produced by markdown-it rendering
   */
  private htmlToMarkdown(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return this.nodeToMarkdown(div).trim();
  }

  private nodeToMarkdown(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = () => Array.from(el.childNodes).map(c => this.nodeToMarkdown(c)).join('');

    switch (tag) {
      case 'h1': return `# ${children()}\n\n`;
      case 'h2': return `## ${children()}\n\n`;
      case 'h3': return `### ${children()}\n\n`;
      case 'h4': return `#### ${children()}\n\n`;
      case 'h5': return `##### ${children()}\n\n`;
      case 'h6': return `###### ${children()}\n\n`;
      case 'p': return `${children()}\n\n`;
      case 'br': return '\n';
      case 'strong':
      case 'b': return `**${children()}**`;
      case 'em':
      case 'i': return `*${children()}*`;
      case 'del':
      case 's': return `~~${children()}~~`;
      case 'code': {
        const text = el.textContent || '';
        if (el.parentElement?.tagName.toLowerCase() === 'pre') {
          return text;
        }
        return `\`${text}\``;
      }
      case 'pre': {
        const codeEl = el.querySelector('code');
        const text = codeEl?.textContent || el.textContent || '';
        const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] || '';
        return `\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
      }
      case 'a': {
        const href = el.getAttribute('href') || '';
        return `[${children()}](${href})`;
      }
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        return `![${alt}](${src})`;
      }
      case 'ul': {
        return Array.from(el.children).map(li => {
          const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
          const prefix = checkbox
            ? (checkbox.checked ? '- [x] ' : '- [ ] ')
            : '- ';
          const content = this.listItemContent(li as HTMLElement, !!checkbox);
          return `${prefix}${content}`;
        }).join('\n') + '\n\n';
      }
      case 'ol': {
        return Array.from(el.children).map((li, i) => {
          const content = this.listItemContent(li as HTMLElement, false);
          return `${i + 1}. ${content}`;
        }).join('\n') + '\n\n';
      }
      case 'li': return children();
      case 'blockquote': {
        const inner = children().trim();
        return inner.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
      }
      case 'hr': return '---\n\n';
      case 'table': return this.tableToMarkdown(el) + '\n\n';
      case 'input': {
        if (el.getAttribute('type') === 'checkbox') {
          return (el as HTMLInputElement).checked ? '[x] ' : '[ ] ';
        }
        return '';
      }
      case 'div':
      case 'span':
      case 'section':
      case 'article':
      case 'main':
      case 'nav':
      case 'header':
      case 'footer':
        return children();
      default:
        return children();
    }
  }

  private listItemContent(li: HTMLElement, hasCheckbox: boolean): string {
    let content = '';
    for (const child of Array.from(li.childNodes)) {
      if (hasCheckbox && child.nodeType === Node.ELEMENT_NODE &&
          (child as HTMLElement).tagName.toLowerCase() === 'input') {
        continue; // Skip checkbox input, already handled by prefix
      }
      content += this.nodeToMarkdown(child);
    }
    return content.trim();
  }

  private tableToMarkdown(table: HTMLElement): string {
    const rows: string[][] = [];
    const headerRow = table.querySelector('thead tr');
    const bodyRows = table.querySelectorAll('tbody tr');

    if (headerRow) {
      const cells = Array.from(headerRow.querySelectorAll('th, td'))
        .map(cell => (cell.textContent || '').trim());
      rows.push(cells);
      rows.push(cells.map(() => '---'));
    }

    bodyRows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td, th'))
        .map(cell => (cell.textContent || '').trim());
      rows.push(cells);
    });

    return rows.map(row => `| ${row.join(' | ')} |`).join('\n');
  }
}

// Singleton
let instance: TextSelectionService | null = null;

export function getTextSelectionService(): TextSelectionService {
  if (!instance) {
    instance = new TextSelectionService();
  }
  return instance;
}

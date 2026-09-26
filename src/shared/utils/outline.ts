/**
 * Outline model (issue #25)
 *
 * Pure helpers shared by the markdown renderer and the outline panel:
 * - GitHub-style heading slugs with de-duplication (`title`, `title-1`, ...)
 * - a markdown-it core rule that assigns `id` attributes to headings and
 *   collects them into `env.headings`
 * - tree building by *relative* nesting (an h3 directly under an h1 is a child
 *   at depth 1, not a grandchild with an empty level between)
 * - case-insensitive filtering that keeps ancestors of matching entries
 *
 * No DOM access here, so everything is unit-testable under node.
 */

export interface OutlineHeading {
  /** Rendered DOM id (matches the `id` attribute of the heading element) */
  id: string;
  /** Heading level 1-6 */
  level: number;
  /** Plain text label (inline markdown stripped, emoji kept) */
  text: string;
  /** Document-order index among all headings */
  index: number;
}

export interface OutlineNode extends OutlineHeading {
  /** Relative nesting depth (0 = root) */
  depth: number;
  children: OutlineNode[];
}

/** A flattened, visible row of the tree (respects collapse state) */
export interface OutlineRow {
  node: OutlineNode;
  hasChildren: boolean;
  expanded: boolean;
}

export const OUTLINE_MIN_DEPTH = 1;
export const OUTLINE_MAX_DEPTH = 6;
const FALLBACK_SLUG = 'section';

/**
 * GitHub-style slug: lowercase, keep letters/numbers/`-`/`_`, spaces become `-`.
 * Emoji and punctuation are dropped. An empty result falls back to `section`.
 */
export function slugifyHeading(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug || FALLBACK_SLUG;
}

export interface SlugRegistry {
  /** Return a unique id for `base` (`base`, `base-1`, `base-2`, ...) and remember it */
  claim(base: string): string;
  has(id: string): boolean;
}

/**
 * Registry that hands out unique ids. Seed it with ids that already exist in
 * the target document so new ids never collide with them.
 */
export function createSlugRegistry(seed?: Iterable<string>): SlugRegistry {
  const used = new Set<string>(seed ?? []);
  return {
    claim(base: string): string {
      let id = base;
      let n = 1;
      while (used.has(id)) {
        id = `${base}-${n++}`;
      }
      used.add(id);
      return id;
    },
    has: (id: string) => used.has(id),
  };
}

/** Minimal structural view of a markdown-it token (avoids a hard type dependency) */
interface TokenLike {
  type: string;
  tag: string;
  content: string;
  children?: TokenLike[] | null;
  attrSet(name: string, value: string): void;
}

/**
 * Plain text of a heading from its inline children: text and inline code are
 * kept verbatim (so emoji survive), breaks become spaces, formatting/link/html
 * wrappers are dropped, images contribute their alt text.
 */
export function headingPlainText(children: TokenLike[] | null | undefined): string {
  if (!children) return '';
  let out = '';
  for (const token of children) {
    switch (token.type) {
      case 'text':
      case 'code_inline':
        out += token.content;
        break;
      case 'softbreak':
      case 'hardbreak':
        out += ' ';
        break;
      case 'image':
        out += headingPlainText(token.children) || token.content;
        break;
      case 'html_inline':
        break;
      default:
        if (token.children) out += headingPlainText(token.children);
    }
  }
  return normalizeHeadingText(out);
}

export function normalizeHeadingText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

interface CoreStateLike {
  tokens: TokenLike[];
  env: { headings?: OutlineHeading[]; [key: string]: unknown };
}

interface MarkdownItLike {
  core: { ruler: { push(name: string, fn: (state: CoreStateLike) => void): void } };
}

/**
 * markdown-it plugin: assign a unique `id` to every heading and expose the
 * list as `env.headings` (pass an `env` object to `md.render(src, env)`).
 */
export function headingIdsPlugin(md: MarkdownItLike): void {
  md.core.ruler.push('heading_ids', (state) => {
    const registry = createSlugRegistry();
    const headings: OutlineHeading[] = [];
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type !== 'heading_open') continue;

      const inline = tokens[i + 1];
      const text = inline && inline.type === 'inline' ? headingPlainText(inline.children) : '';
      const level = Number(token.tag.slice(1)) || 1;
      const id = registry.claim(slugifyHeading(text));

      token.attrSet('id', id);
      headings.push({ id, level, text, index: headings.length });
    }

    state.env.headings = headings;
  });
}

export function clampOutlineDepth(depth: number | undefined | null): number {
  if (typeof depth !== 'number' || Number.isNaN(depth)) return OUTLINE_MAX_DEPTH;
  return Math.min(OUTLINE_MAX_DEPTH, Math.max(OUTLINE_MIN_DEPTH, Math.round(depth)));
}

/**
 * Build the outline tree. Headings deeper than `maxDepth` are dropped entirely
 * (neither shown nor counted). Nesting is relative: each heading becomes a
 * child of the nearest preceding heading with a smaller level.
 */
export function buildOutlineTree(headings: OutlineHeading[], maxDepth: number = OUTLINE_MAX_DEPTH): OutlineNode[] {
  const limit = clampOutlineDepth(maxDepth);
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  for (const heading of headings) {
    if (heading.level > limit) continue;

    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    const node: OutlineNode = { ...heading, depth: stack.length, children: [] };
    if (stack.length > 0) {
      stack[stack.length - 1].children.push(node);
    } else {
      roots.push(node);
    }
    stack.push(node);
  }

  return roots;
}

/** Number of headings that survive the depth limit */
export function countOutlineHeadings(headings: OutlineHeading[], maxDepth: number = OUTLINE_MAX_DEPTH): number {
  const limit = clampOutlineDepth(maxDepth);
  return headings.reduce((count, h) => (h.level <= limit ? count + 1 : count), 0);
}

/**
 * Case-insensitive substring filter. Matching entries and their ancestors stay;
 * non-matching descendants of a match are hidden.
 */
export function filterOutlineTree(nodes: OutlineNode[], query: string): OutlineNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const walk = (list: OutlineNode[]): OutlineNode[] => {
    const kept: OutlineNode[] = [];
    for (const node of list) {
      const children = walk(node.children);
      if (children.length > 0 || node.text.toLowerCase().includes(q)) {
        kept.push({ ...node, children });
      }
    }
    return kept;
  };

  return walk(nodes);
}

/**
 * Flatten the tree into the rows that are visible given the collapsed ids.
 * With `forceExpanded` (used while filtering) collapse state is ignored.
 */
export function flattenOutlineTree(
  nodes: OutlineNode[],
  collapsed: ReadonlySet<string>,
  forceExpanded = false
): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const visit = (list: OutlineNode[]) => {
    for (const node of list) {
      const hasChildren = node.children.length > 0;
      const expanded = !hasChildren || forceExpanded || !collapsed.has(node.id);
      rows.push({ node, hasChildren, expanded });
      if (hasChildren && expanded) visit(node.children);
    }
  };
  visit(nodes);
  return rows;
}

/** Ids of every node that has children (targets for "collapse all") */
export function collectParentIds(nodes: OutlineNode[]): string[] {
  const ids: string[] = [];
  const visit = (list: OutlineNode[]) => {
    for (const node of list) {
      if (node.children.length > 0) {
        ids.push(node.id);
        visit(node.children);
      }
    }
  };
  visit(nodes);
  return ids;
}

/** Index of the nearest ancestor row (a row with a smaller depth) or -1 */
export function findParentRowIndex(rows: OutlineRow[], index: number): number {
  const depth = rows[index]?.node.depth ?? 0;
  for (let i = index - 1; i >= 0; i--) {
    if (rows[i].node.depth < depth) return i;
  }
  return -1;
}

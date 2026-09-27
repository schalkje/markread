/**
 * Link fragment helpers (issue #29 — new page, go to top / cross-file deep links)
 *
 * A markdown link destination may carry a `#fragment` that names a heading in
 * the target page. The file part has to be resolved on its own (the resolver
 * would otherwise stat a file literally named `page.md#heading`) and the
 * fragment travels with the navigation so the heading can be aligned once the
 * page has rendered.
 */

export interface SplitHref {
  /** Everything before the first `#` (still percent-encoded, as written) */
  path: string;
  /** Percent-decoded fragment, or `null` when absent or empty (`page.md#`) */
  fragment: string | null;
}

/** Split an href into its file path and (decoded) fragment */
export function splitHrefFragment(href: string): SplitHref {
  const hashIndex = href.indexOf('#');
  if (hashIndex === -1) {
    return { path: href, fragment: null };
  }
  const path = href.slice(0, hashIndex);
  const rawFragment = href.slice(hashIndex + 1);
  return { path, fragment: decodeFragment(rawFragment) };
}

/** Percent-decode a fragment; malformed sequences are kept as written. Empty → `null`. */
export function decodeFragment(rawFragment: string): string | null {
  if (!rawFragment) return null;
  let decoded = rawFragment;
  try {
    decoded = decodeURIComponent(rawFragment);
  } catch {
    // keep the raw fragment
  }
  return decoded || null;
}

/**
 * Whether two absolute paths refer to the same file. Separators are
 * normalised; the comparison is case-insensitive when either path looks like
 * a Windows path (drive letter or UNC), since those file systems are.
 */
export function isSameFilePath(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const na = normalizeFsPath(a);
  const nb = normalizeFsPath(b);
  if (na === nb) return true;
  if (looksLikeWindowsPath(na) || looksLikeWindowsPath(nb)) {
    return na.toLowerCase() === nb.toLowerCase();
  }
  return false;
}

/**
 * Pick the heading id a fragment refers to: the exact id when present,
 * otherwise the first id that matches case-insensitively (heading ids are
 * lowercase slugs, hand-written links often are not).
 */
export function matchHeadingId(ids: readonly string[], fragment: string | null | undefined): string | null {
  if (!fragment) return null;
  if (ids.includes(fragment)) return fragment;
  const lower = fragment.toLowerCase();
  for (const id of ids) {
    if (id.toLowerCase() === lower) return id;
  }
  return null;
}

function normalizeFsPath(p: string): string {
  let normalized = p.replace(/\\/g, '/');
  // Collapse duplicate separators (but keep a leading `//` for UNC paths)
  normalized = normalized.replace(/(?<!^)\/{2,}/g, '/');
  // Drop a trailing separator
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function looksLikeWindowsPath(normalized: string): boolean {
  return /^[a-zA-Z]:\//.test(normalized) || normalized.startsWith('//');
}

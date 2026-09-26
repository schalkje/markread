/**
 * Link path helpers shared by the renderer and the main process.
 *
 * markdown-it percent-encodes link destinations when it renders them
 * (`[x](<My File.md>)` and `[x](My%20File.md)` both become
 * `href="My%20File.md"`). Anything that turns an href back into a file
 * system path therefore has to decode it, and anything that generates
 * markdown links from real file names has to encode them.
 */

/**
 * Decode a percent-encoded link path.
 * Falls back to the raw value when the sequence is malformed (e.g. a file
 * literally named `100%.md` that was not encoded by markdown-it).
 */
export function decodeLinkPath(relativePath: string): string {
  if (!relativePath.includes('%')) return relativePath;
  try {
    return decodeURIComponent(relativePath);
  } catch {
    return relativePath;
  }
}

/**
 * Encode a single file or folder name for use as a markdown link destination.
 *
 * Encodes everything markdown-it would refuse to parse or would misinterpret:
 * spaces, `%`, `#`, `?`, parentheses, angle brackets and non-ASCII characters.
 * The name must not contain path separators; callers append `/` for folders.
 */
export function encodeLinkDestination(name: string): string {
  return encodeURIComponent(name).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`
  );
}

/**
 * Build an `mdfile:///` URL for an absolute local path.
 * `encodeURI` leaves `#` and `?` alone, which would be parsed as a fragment
 * or query and truncate the path, so those are escaped explicitly.
 */
export function toMdFileUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/');
  return `mdfile:///${encodeURI(normalized).replace(/#/g, '%23').replace(/\?/g, '%3F')}`;
}

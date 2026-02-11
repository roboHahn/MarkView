export interface WikiLinkInfo {
  target: string;
  alias?: string;
}

/**
 * Parse wiki links from markdown content.
 * Supports [[file]] and [[file|alias]] syntax.
 */
export function parseWikiLinks(content: string): WikiLinkInfo[] {
  const re = /\[\[([^\]]+)\]\]/g;
  const links: WikiLinkInfo[] = [];
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    const inner = match[1];
    const pipeIdx = inner.indexOf('|');
    if (pipeIdx >= 0) {
      links.push({
        target: inner.slice(0, pipeIdx).trim(),
        alias: inner.slice(pipeIdx + 1).trim(),
      });
    } else {
      links.push({ target: inner.trim() });
    }
  }

  return links;
}

/**
 * Resolve a wiki link target to a file path.
 * Searches the list of known files for a match (by filename without extension).
 */
export function resolveWikiLink(target: string, knownFiles: string[]): string | null {
  const normalized = target.toLowerCase().replace(/\s+/g, '-');

  for (const file of knownFiles) {
    const filename = file.split(/[\\/]/).pop() ?? '';
    const nameWithoutExt = filename.replace(/\.md$/i, '');
    if (nameWithoutExt.toLowerCase() === normalized) {
      return file;
    }
    // Also try exact match
    if (nameWithoutExt.toLowerCase() === target.toLowerCase()) {
      return file;
    }
  }

  return null;
}

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
// @ts-ignore - markdown-it-katex has no TypeScript type declarations
import markdownItKatex from 'markdown-it-katex';
// @ts-ignore - markdown-it-task-lists has no TypeScript type declarations
import markdownItTaskLists from 'markdown-it-task-lists';
// @ts-ignore - markdown-it-footnote has no TypeScript type declarations
import markdownItFootnote from 'markdown-it-footnote';

function createBaseInstance(): MarkdownIt {
  const instance = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang }).value;
        } catch {
          // fall through to auto-detect
        }
      }
      try {
        return hljs.highlightAuto(str).value;
      } catch {
        return '';
      }
    }
  });

  // Enable KaTeX math rendering: $...$ for inline, $$...$$ for display math
  instance.use(markdownItKatex);

  // Enable task list / checkbox rendering: - [ ] unchecked, - [x] checked
  instance.use(markdownItTaskLists, { enabled: true, label: true });

  // Enable footnotes: [^1] inline reference, [^1]: Footnote text at bottom
  instance.use(markdownItFootnote);

  // Wiki links inline rule: [[target]] or [[target|alias]]
  instance.inline.ruler.push('wiki_link', (state, silent) => {
    const src = state.src.slice(state.pos);
    if (src.charCodeAt(0) !== 0x5B || src.charCodeAt(1) !== 0x5B) return false;

    const closeIdx = src.indexOf(']]', 2);
    if (closeIdx < 0) return false;

    if (!silent) {
      const inner = src.slice(2, closeIdx);
      const pipeIdx = inner.indexOf('|');
      const target = pipeIdx >= 0 ? inner.slice(0, pipeIdx).trim() : inner.trim();
      const alias = pipeIdx >= 0 ? inner.slice(pipeIdx + 1).trim() : target;

      const token = state.push('wiki_link', '', 0);
      token.content = alias;
      token.meta = { target };
    }

    state.pos += closeIdx + 2;
    return true;
  });

  instance.renderer.rules.wiki_link = (tokens, idx) => {
    const token = tokens[idx];
    const target = token.meta?.target ?? '';
    const display = token.content || target;
    return `<a class="wiki-link" data-wiki-target="${instance.utils.escapeHtml(target)}" href="#wiki:${instance.utils.escapeHtml(target)}">${instance.utils.escapeHtml(display)}</a>`;
  };

  // Store original fence renderer
  const defaultFence = instance.renderer.rules.fence || function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };

  // Custom fence renderer for mermaid blocks
  instance.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim() === 'mermaid') {
      return `<div class="mermaid">${token.content}</div>`;
    }
    return defaultFence(tokens, idx, options, env, self);
  };

  return instance;
}

let md = createBaseInstance();

/**
 * Rebuild the markdown-it instance with additional plugins.
 * Call this whenever enabled plugins change.
 */
export function rebuildWithPlugins(markdownPlugins: any[]): void {
  md = createBaseInstance();
  for (const plugin of markdownPlugins) {
    try {
      if (typeof plugin === 'function') {
        md.use(plugin);
      } else if (Array.isArray(plugin)) {
        md.use(plugin[0], plugin[1]);
      }
    } catch (e) {
      console.warn('Failed to apply markdown plugin:', e);
    }
  }
}

export function renderMarkdown(source: string): string {
  return md.render(source);
}

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
// @ts-ignore - markdown-it-katex has no TypeScript type declarations
import markdownItKatex from 'markdown-it-katex';
// @ts-ignore - markdown-it-task-lists has no TypeScript type declarations
import markdownItTaskLists from 'markdown-it-task-lists';
// @ts-ignore - markdown-it-footnote has no TypeScript type declarations
import markdownItFootnote from 'markdown-it-footnote';

const md = new MarkdownIt({
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
md.use(markdownItKatex);

// Enable task list / checkbox rendering: - [ ] unchecked, - [x] checked
md.use(markdownItTaskLists, { enabled: true, label: true });

// Enable footnotes: [^1] inline reference, [^1]: Footnote text at bottom
md.use(markdownItFootnote);

// Wiki links inline rule: [[target]] or [[target|alias]]
md.inline.ruler.push('wiki_link', (state, silent) => {
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

md.renderer.rules.wiki_link = (tokens, idx) => {
  const token = tokens[idx];
  const target = token.meta?.target ?? '';
  const display = token.content || target;
  return `<a class="wiki-link" data-wiki-target="${md.utils.escapeHtml(target)}" href="#wiki:${md.utils.escapeHtml(target)}">${md.utils.escapeHtml(display)}</a>`;
};

// Store original fence renderer
const defaultFence = md.renderer.rules.fence || function (tokens, idx, options, _env, self) {
  return self.renderToken(tokens, idx, options);
};

// Custom fence renderer for mermaid blocks
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.info.trim() === 'mermaid') {
    return `<div class="mermaid">${token.content}</div>`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

export function renderMarkdown(source: string): string {
  return md.render(source);
}

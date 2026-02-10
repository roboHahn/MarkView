import MarkdownIt from 'markdown-it';
// @ts-ignore - markdown-it-katex has no TypeScript type declarations
import markdownItKatex from 'markdown-it-katex';
// @ts-ignore - markdown-it-task-lists has no TypeScript type declarations
import markdownItTaskLists from 'markdown-it-task-lists';
// @ts-ignore - markdown-it-footnote has no TypeScript type declarations
import markdownItFootnote from 'markdown-it-footnote';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

// Enable KaTeX math rendering: $...$ for inline, $$...$$ for display math
md.use(markdownItKatex);

// Enable task list / checkbox rendering: - [ ] unchecked, - [x] checked
md.use(markdownItTaskLists, { enabled: true, label: true });

// Enable footnotes: [^1] inline reference, [^1]: Footnote text at bottom
md.use(markdownItFootnote);

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

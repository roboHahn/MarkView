import type { MarkViewPlugin } from './plugins.svelte';

// ---------------------------------------------------------------------------
// 1. Reading Time Plugin
// ---------------------------------------------------------------------------
export const readingTimePlugin: MarkViewPlugin = {
  id: 'reading-time',
  name: 'Reading Time',
  description: 'Shows estimated reading time at the top of the preview',
  version: '1.0.0',
  enabled: false,
  previewTransform: (html: string) => {
    // Strip HTML tags for word counting
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    const banner = `<div class="plugin-reading-time">${minutes} min read &middot; ${words} words</div>`;
    return banner + html;
  },
};

// ---------------------------------------------------------------------------
// 2. Code Copy Button Plugin
// ---------------------------------------------------------------------------
export const codeCopyPlugin: MarkViewPlugin = {
  id: 'code-copy',
  name: 'Code Copy Button',
  description: 'Adds a copy-to-clipboard button on code blocks in preview',
  version: '1.0.0',
  enabled: false,
  previewTransform: (html: string) => {
    // Wrap each <pre> block with a container that has a copy button
    return html.replace(
      /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
      (_match, attrs, code) => {
        // Decode HTML entities for the clipboard
        const id = 'code-' + Math.random().toString(36).slice(2, 9);
        return `<div class="plugin-code-wrapper"><button class="plugin-copy-btn" onclick="(function(btn){var code=btn.parentElement.querySelector('code');if(code){navigator.clipboard.writeText(code.textContent||'');btn.textContent='Copied!';setTimeout(function(){btn.textContent='Copy'},1500)}})(this)">Copy</button><pre><code${attrs}>${code}</code></pre></div>`;
      }
    );
  },
};

// ---------------------------------------------------------------------------
// 3. Custom Containers Plugin (:::note, :::warning, :::tip, :::danger)
// ---------------------------------------------------------------------------
function customContainersPlugin(md: any): void {
  const containerTypes: Record<string, { label: string }> = {
    note: { label: 'Note' },
    warning: { label: 'Warning' },
    tip: { label: 'Tip' },
    danger: { label: 'Danger' },
    info: { label: 'Info' },
  };

  // Override the fence rule to also check for :::type blocks
  const originalParagraphOpen = md.renderer.rules.paragraph_open;

  // We use a core rule to process ::: blocks before rendering
  md.core.ruler.push('custom_containers', (state: any) => {
    const tokens = state.tokens;
    let i = 0;

    while (i < tokens.length) {
      if (tokens[i].type === 'paragraph_open') {
        const inlineToken = tokens[i + 1];
        if (inlineToken && inlineToken.type === 'inline') {
          const content = inlineToken.content;
          // Check for opening :::type [title]
          const openMatch = content.match(/^:::(note|warning|tip|danger|info)(?:\s+(.+))?$/);
          if (openMatch) {
            const type = openMatch[1];
            const title = openMatch[2] || containerTypes[type]?.label || type;

            // Find closing :::
            let closeIdx = -1;
            for (let j = i + 3; j < tokens.length; j++) {
              if (tokens[j].type === 'paragraph_open') {
                const nextInline = tokens[j + 1];
                if (nextInline && nextInline.type === 'inline' && nextInline.content.trim() === ':::') {
                  closeIdx = j;
                  break;
                }
              }
            }

            if (closeIdx !== -1) {
              // Replace opening paragraph with container open
              const openToken = new state.Token('html_block', '', 0);
              openToken.content = `<div class="plugin-container plugin-container-${md.utils.escapeHtml(type)}"><div class="plugin-container-title">${md.utils.escapeHtml(title)}</div><div class="plugin-container-content">`;

              // Replace opening paragraph (open + inline + close = 3 tokens)
              tokens.splice(i, 3, openToken);

              // Adjust closeIdx after splice
              closeIdx -= 2;

              // Replace closing ::: paragraph with container close
              const closeToken = new state.Token('html_block', '', 0);
              closeToken.content = '</div></div>';

              // Remove closing paragraph (open + inline + close = 3 tokens)
              tokens.splice(closeIdx, 3, closeToken);

              continue;
            }
          }
        }
      }
      i++;
    }
  });
}

export const customContainersPluginDef: MarkViewPlugin = {
  id: 'custom-containers',
  name: 'Custom Containers',
  description: 'Adds :::note, :::warning, :::tip, :::danger, :::info container blocks',
  version: '1.0.0',
  enabled: false,
  markdownPlugin: customContainersPlugin,
};

// ---------------------------------------------------------------------------
// 4. Heading Anchors Plugin
// ---------------------------------------------------------------------------
export const headingAnchorsPlugin: MarkViewPlugin = {
  id: 'heading-anchors',
  name: 'Heading Anchors',
  description: 'Adds clickable anchor links (#) next to headings in preview',
  version: '1.0.0',
  enabled: false,
  previewTransform: (html: string) => {
    return html.replace(
      /<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/g,
      (_match, tag, attrs, content) => {
        // Generate slug from heading content (strip HTML tags)
        const text = content.replace(/<[^>]*>/g, '').trim();
        const slug = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
        return `<${tag}${attrs} id="${slug}">${content}<a class="plugin-heading-anchor" href="#${slug}" aria-label="Link to ${text}">#</a></${tag}>`;
      }
    );
  },
};

// ---------------------------------------------------------------------------
// 5. Highlight Syntax Plugin (==highlighted text==)
// ---------------------------------------------------------------------------
function highlightSyntaxPlugin(md: any): void {
  md.inline.ruler.push('highlight_mark', (state: any, silent: boolean) => {
    const src = state.src.slice(state.pos);
    if (src.charCodeAt(0) !== 0x3D || src.charCodeAt(1) !== 0x3D) return false; // ==

    const closeIdx = src.indexOf('==', 2);
    if (closeIdx < 0) return false;

    if (!silent) {
      const content = src.slice(2, closeIdx);
      const tokenOpen = state.push('highlight_open', 'mark', 1);
      tokenOpen.markup = '==';
      const tokenText = state.push('text', '', 0);
      tokenText.content = content;
      const tokenClose = state.push('highlight_close', 'mark', -1);
      tokenClose.markup = '==';
    }

    state.pos += closeIdx + 2;
    return true;
  });
}

export const highlightPlugin: MarkViewPlugin = {
  id: 'highlight-syntax',
  name: 'Highlight Syntax',
  description: 'Adds ==highlighted text== syntax that renders as <mark> tags',
  version: '1.0.0',
  enabled: false,
  markdownPlugin: highlightSyntaxPlugin,
};

// ---------------------------------------------------------------------------
// 6. Word Counter Plugin
// ---------------------------------------------------------------------------
export const wordCounterPlugin: MarkViewPlugin = {
  id: 'word-counter',
  name: 'Word Counter',
  description: 'Shows word and character count at the bottom of the preview',
  version: '1.0.0',
  enabled: false,
  previewTransform: (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const footer = `<div class="plugin-word-counter">${words} words &middot; ${chars} characters</div>`;
    return html + footer;
  },
};

// ---------------------------------------------------------------------------
// Export all built-in plugins as an array
// ---------------------------------------------------------------------------
export const builtinPlugins: MarkViewPlugin[] = [
  readingTimePlugin,
  codeCopyPlugin,
  customContainersPluginDef,
  headingAnchorsPlugin,
  highlightPlugin,
  wordCounterPlugin,
];

<script lang="ts">
  import { tick } from 'svelte';
  import { renderMarkdown } from '$lib/markdown';
  import type { Theme } from '$lib/theme';
  import { customCss } from '$lib/custom-css.svelte';
  import mermaid from 'mermaid';
  import '../styles/preview.css';
  import '../styles/hljs-theme.css';

  interface Props {
    content: string;
    theme: Theme;
    onScrollChange?: (fraction: number) => void;
    scrollFraction?: number;
  }

  let { content, theme, onScrollChange, scrollFraction }: Props = $props();

  let isInternalScroll = false;

  function handleScroll() {
    if (!previewContainer || !onScrollChange) return;
    const maxScroll = previewContainer.scrollHeight - previewContainer.clientHeight;
    const fraction = maxScroll > 0 ? previewContainer.scrollTop / maxScroll : 0;
    isInternalScroll = true;
    onScrollChange(fraction);
    queueMicrotask(() => { isInternalScroll = false; });
  }

  $effect(() => {
    const f = scrollFraction;
    if (!previewContainer || f === undefined || isInternalScroll) return;
    const maxScroll = previewContainer.scrollHeight - previewContainer.clientHeight;
    if (maxScroll > 0) {
      previewContainer.scrollTop = f * maxScroll;
    }
  });

  let renderedHtml = $state('');
  let previewContainer: HTMLDivElement | undefined = $state(undefined);
  let mermaidId = $state(0);

  // Initialize mermaid (non-reactive, just a one-time setup helper)
  function initMermaid(currentTheme: Theme) {
    mermaid.initialize({
      startOnLoad: false,
      theme: currentTheme === 'dark' ? 'dark' : 'default'
    });
  }

  // Fix known mermaid syntax issues before rendering
  function fixMermaidSyntax(source: string): string {
    // Convert multi-line "note ... end note" blocks to single-line syntax
    // e.g.:
    //   note right of State
    //       Line 1
    //       Line 2
    //   end note
    // becomes:
    //   note right of State : Line 1<br/>Line 2
    return source.replace(
      /note\s+(right|left)\s+of\s+(\S+)\s*\n([\s\S]*?)end\s+note/gi,
      (_match, side, state, content) => {
        const lines = content.trim().split('\n').map((l: string) => l.trim()).filter((l: string) => l);
        return `note ${side} of ${state} : ${lines.join('<br/>')}`;
      }
    );
  }

  function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Debounced rendering of markdown content
  $effect(() => {
    // Access content and theme to track them as dependencies
    const currentContent = content;
    const currentTheme = theme;

    const timer = setTimeout(async () => {
      initMermaid(currentTheme);
      renderedHtml = renderMarkdown(currentContent);

      // Bump mermaid ID so each render gets unique IDs
      mermaidId++;

      // Wait for DOM update, then process mermaid diagrams
      await tick();

      if (previewContainer) {
        const mermaidNodes = previewContainer.querySelectorAll('.mermaid');
        if (mermaidNodes.length > 0) {
          // Process each node individually so one failure doesn't break others
          for (const node of mermaidNodes) {
            const el = node as HTMLElement;
            const original = el.textContent || '';
            // Pre-process to fix known syntax issues
            el.textContent = fixMermaidSyntax(original);
            el.removeAttribute('data-processed');
            try {
              await mermaid.run({ nodes: [el] as unknown as NodeListOf<HTMLElement> });
            } catch (err) {
              // Show raw source with error indicator
              const msg = err instanceof Error ? err.message : 'Syntax error';
              el.innerHTML = `<div class="mermaid-error"><div class="mermaid-error-label">Mermaid error: ${escapeHtml(msg)}</div><pre>${escapeHtml(original)}</pre></div>`;
            }
          }
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  });
</script>

<div class="preview-panel" bind:this={previewContainer} onscroll={handleScroll}>
  {#if customCss.value}
    {@html `<style>${customCss.value}</style>`}
  {/if}
  <div class="preview-content">
    {@html renderedHtml}
  </div>
</div>

<style>
  .preview-panel {
    height: 100%;
    width: 100%;
    overflow-y: auto;
    background: var(--bg-preview);
    padding: 24px;
  }

  .preview-content {
    max-width: 860px;
    margin: 0 auto;
    color: var(--text-primary);
    font-size: 15px;
    line-height: 1.6;
  }
</style>

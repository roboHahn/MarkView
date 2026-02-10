<script lang="ts">
  import { tick } from 'svelte';
  import { renderMarkdown } from '$lib/markdown';
  import type { Theme } from '$lib/theme';
  import mermaid from 'mermaid';
  import '../styles/preview.css';

  interface Props {
    content: string;
    theme: Theme;
  }

  let { content, theme }: Props = $props();

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
          // Clear previous mermaid renders to avoid stale SVGs
          mermaidNodes.forEach((node) => {
            node.removeAttribute('data-processed');
          });
          try {
            await mermaid.run({ nodes: mermaidNodes as NodeListOf<HTMLElement> });
          } catch {
            // Mermaid rendering errors are non-fatal; the raw text
            // remains visible in the div.
          }
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  });
</script>

<div class="preview-panel" bind:this={previewContainer}>
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

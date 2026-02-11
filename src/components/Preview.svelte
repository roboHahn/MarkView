<script lang="ts">
  import { tick } from 'svelte';
  import { renderMarkdown } from '$lib/markdown';
  import type { Theme } from '$lib/theme';
  import { customCss } from '$lib/custom-css.svelte';
  import mermaid from 'mermaid';
  import DiagramViewer from './DiagramViewer.svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { save } from '@tauri-apps/plugin-dialog';
  import '../styles/preview.css';
  import '../styles/hljs-theme.css';

  interface Props {
    content: string;
    theme: Theme;
    onScrollChange?: (fraction: number) => void;
    scrollFraction?: number;
  }

  let { content, theme, onScrollChange, scrollFraction }: Props = $props();

  let activeDiagramSvg: SVGElement | null = $state(null);
  let diagramViewerOpen = $state(false);

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
    //   note right of State : Line 1 Line 2
    // Fix multi-line notes
    let fixed = source.replace(
      /note\s+(right|left)\s+of\s+(\S+)\s*\n([\s\S]*?)end\s+note/gi,
      (_match, side, state, content) => {
        const lines = content.trim().split('\n').map((l: string) => l.trim()).filter((l: string) => l);
        const text = lines.join(' ').replace(/:/g, '#colon;');
        return `note ${side} of ${state} : ${text}`;
      }
    );

    // Fix double quotes inside node labels: [text "quoted" text] → [text #quot;quoted#quot; text]
    // Matches [...] and (...) and {..} node labels containing "
    fixed = fixed.replace(
      /(\w+\s*\[)([^\]]*"[^\]]*)\]/g,
      (_match, prefix, inner) => `${prefix}${inner.replace(/"/g, '#quot;')}]`
    );
    fixed = fixed.replace(
      /(\w+\s*\()([^)]*"[^)]*)\)/g,
      (_match, prefix, inner) => `${prefix}${inner.replace(/"/g, '#quot;')})`
    );
    fixed = fixed.replace(
      /(\w+\s*\{)([^}]*"[^}]*)\}/g,
      (_match, prefix, inner) => `${prefix}${inner.replace(/"/g, '#quot;')}}`
    );

    return fixed;
  }

  function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getSvgStringFromElement(svg: SVGElement): string {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  }

  async function quickExportSvg(svg: SVGElement) {
    try {
      const path = await save({
        filters: [{ name: 'SVG Image', extensions: ['svg'] }],
        defaultPath: 'diagram.svg'
      });
      if (path) {
        const svgString = getSvgStringFromElement(svg);
        await invoke('write_file', { path, content: svgString });
      }
    } catch (err) {
      console.error('SVG export failed:', err);
    }
  }

  async function quickExportPng(svg: SVGElement) {
    try {
      const path = await save({
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
        defaultPath: 'diagram.png'
      });
      if (!path) return;

      const svgString = getSvgStringFromElement(svg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const pixelRatio = 2;
        canvas.width = img.naturalWidth * pixelRatio;
        canvas.height = img.naturalHeight * pixelRatio;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(pixelRatio, pixelRatio);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );
        if (!blob) return;

        const arrayBuffer = await blob.arrayBuffer();
        const data = Array.from(new Uint8Array(arrayBuffer));
        await invoke('write_binary_file', { path, data });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        console.error('Failed to load SVG for PNG export');
      };
      img.src = url;
    } catch (err) {
      console.error('PNG export failed:', err);
    }
  }

  function openDiagramViewer(svg: SVGElement) {
    activeDiagramSvg = svg;
    diagramViewerOpen = true;
  }

  function setupDiagramToolbars() {
    if (!previewContainer) return;

    const mermaidEls = previewContainer.querySelectorAll('.mermaid');
    for (const el of mermaidEls) {
      const htmlEl = el as HTMLElement;

      // Skip if already wrapped
      if (htmlEl.parentElement?.classList.contains('diagram-wrapper')) continue;

      // Skip error diagrams (no shadow root or no SVG)
      const shadow = htmlEl.shadowRoot;
      if (!shadow) continue;
      const svg = shadow.querySelector('svg');
      if (!svg) continue;

      // Wrap the mermaid element
      const wrapper = document.createElement('div');
      wrapper.className = 'diagram-wrapper';
      htmlEl.parentNode?.insertBefore(wrapper, htmlEl);
      wrapper.appendChild(htmlEl);

      // Create toolbar
      const toolbar = document.createElement('div');
      toolbar.className = 'diagram-hover-toolbar';

      const buttons = [
        { label: 'SVG', title: 'Export SVG', action: () => quickExportSvg(svg) },
        { label: 'PNG', title: 'Export PNG', action: () => quickExportPng(svg) },
        { label: '\u26F6', title: 'Fullscreen', action: () => openDiagramViewer(svg) },
      ];

      for (const btn of buttons) {
        const button = document.createElement('button');
        button.className = 'dhover-btn';
        button.textContent = btn.label;
        button.title = btn.title;
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          btn.action();
        });
        toolbar.appendChild(button);
      }

      wrapper.appendChild(toolbar);

      // Click on diagram itself opens fullscreen
      htmlEl.style.cursor = 'pointer';
      htmlEl.addEventListener('click', () => openDiagramViewer(svg));
    }
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
            const fixedSource = fixMermaidSyntax(original);

            // Snapshot body children before mermaid.render() to clean up orphans
            const bodySnapshot = new Set(Array.from(document.body.children));

            try {
              mermaidId++;
              const renderId = 'mermaid-preview-' + mermaidId;
              const { svg } = await mermaid.render(renderId, fixedSource);
              // Use Shadow DOM to isolate mermaid's <style> tags
              // from the host document (prevents breaking click events)
              let shadow = el.shadowRoot;
              if (!shadow) {
                shadow = el.attachShadow({ mode: 'open' });
              }
              shadow.innerHTML = `<style>svg{max-width:100%;height:auto;}</style>${svg}`;
            } catch (err) {
              // Show raw source with error indicator
              const msg = err instanceof Error ? err.message : 'Syntax error';
              el.innerHTML = `<div class="mermaid-error"><div class="mermaid-error-label">Mermaid error: ${escapeHtml(msg)}</div><pre>${escapeHtml(original)}</pre></div>`;
            } finally {
              // Remove any orphan elements mermaid added to body
              Array.from(document.body.children).forEach(child => {
                if (!bodySnapshot.has(child)) child.remove();
              });
            }
          }

          // Set up hover toolbars after all diagrams are rendered
          setupDiagramToolbars();
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

{#if diagramViewerOpen && activeDiagramSvg}
  <DiagramViewer svgElement={activeDiagramSvg} onClose={() => { diagramViewerOpen = false; activeDiagramSvg = null; }} />
{/if}

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

  :global(.diagram-wrapper) {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  :global(.diagram-hover-toolbar) {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 10;
  }

  :global(.diagram-wrapper:hover .diagram-hover-toolbar) {
    opacity: 1;
  }

  :global(.dhover-btn) {
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    opacity: 0.9;
  }

  :global(.dhover-btn:hover) {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  @media print {
    .preview-panel {
      height: auto !important;
      overflow: visible !important;
      background: white !important;
      padding: 15mm !important;
    }

    .preview-content {
      max-width: none !important;
      color: #1e1e2e !important;
      font-size: 12pt;
    }
  }
</style>

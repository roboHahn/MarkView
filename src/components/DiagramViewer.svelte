<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { save } from '@tauri-apps/plugin-dialog';

  interface Props {
    svgElement: SVGElement;
    onClose: () => void;
  }

  let { svgElement, onClose }: Props = $props();

  let scale = $state(1);
  let translateX = $state(0);
  let translateY = $state(0);

  let isPanning = $state(false);
  let panStartX = 0;
  let panStartY = 0;
  let panStartTranslateX = 0;
  let panStartTranslateY = 0;

  let zoomPercent = $derived(Math.round(scale * 100));

  let transformStyle = $derived(
    `transform: translate(${translateX}px, ${translateY}px) scale(${scale})`
  );

  function getSvgString(): string {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  }

  async function exportSvg() {
    try {
      const path = await save({
        filters: [{ name: 'SVG Image', extensions: ['svg'] }],
        defaultPath: 'diagram.svg'
      });
      if (path) {
        const svgString = getSvgString();
        await invoke('write_file', { path, content: svgString });
      }
    } catch (err) {
      console.error('SVG export failed:', err);
    }
  }

  async function exportPng() {
    try {
      const path = await save({
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
        defaultPath: 'diagram.png'
      });
      if (!path) return;

      const svgString = getSvgString();
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

  function zoomIn() {
    scale = Math.min(scale * 1.2, 10);
  }

  function zoomOut() {
    scale = Math.max(scale / 1.2, 0.1);
  }

  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) {
      scale = Math.min(scale * 1.1, 10);
    } else {
      scale = Math.max(scale / 1.1, 0.1);
    }
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartTranslateX = translateX;
    panStartTranslateY = translateY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isPanning) return;
    translateX = panStartTranslateX + (e.clientX - panStartX);
    translateY = panStartTranslateY + (e.clientY - panStartY);
  }

  function handlePointerUp() {
    isPanning = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case '+':
      case '=':
        zoomIn();
        break;
      case '-':
        zoomOut();
        break;
      case '0':
        resetZoom();
        break;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="diagram-viewer-overlay" onclick={onClose}>
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="diagram-viewer-toolbar" onclick={(e) => e.stopPropagation()}>
    <button class="dv-btn" onclick={zoomOut} title="Zoom out (-)">-</button>
    <span class="dv-zoom-label">{zoomPercent}%</span>
    <button class="dv-btn" onclick={zoomIn} title="Zoom in (+)">+</button>
    <button class="dv-btn" onclick={resetZoom} title="Reset zoom (0)">Reset</button>
    <div class="dv-separator"></div>
    <button class="dv-btn" onclick={exportSvg} title="Export as SVG">SVG</button>
    <button class="dv-btn" onclick={exportPng} title="Export as PNG">PNG</button>
    <div class="dv-separator"></div>
    <button class="dv-btn dv-close" onclick={onClose} title="Close (Escape)">&#x2715;</button>
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div
    class="diagram-viewer-canvas"
    onclick={(e) => e.stopPropagation()}
    onwheel={handleWheel}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
  >
    <div class="diagram-viewer-content" style={transformStyle}>
      {@html getSvgString()}
    </div>
  </div>
</div>

<style>
  .diagram-viewer-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .diagram-viewer-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--bg-toolbar, #181825);
    border-bottom: 1px solid var(--border, #313244);
    width: 100%;
    justify-content: center;
    flex-shrink: 0;
  }

  .dv-btn {
    padding: 4px 12px;
    border: 1px solid var(--border, #313244);
    border-radius: 4px;
    background: var(--bg-primary, #1e1e2e);
    color: var(--text-primary, #cdd6f4);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    min-width: 36px;
    text-align: center;
  }

  .dv-btn:hover {
    background: var(--hover-bg, #313244);
    border-color: var(--accent, #89b4fa);
  }

  .dv-close {
    font-size: 16px;
    padding: 4px 10px;
  }

  .dv-zoom-label {
    color: var(--text-secondary, #bac2de);
    font-size: 13px;
    min-width: 48px;
    text-align: center;
    user-select: none;
  }

  .dv-separator {
    width: 1px;
    height: 20px;
    background: var(--border, #313244);
    margin: 0 4px;
  }

  .diagram-viewer-canvas {
    flex: 1;
    overflow: hidden;
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .diagram-viewer-canvas:active {
    cursor: grabbing;
  }

  .diagram-viewer-content {
    transform-origin: center center;
    transition: none;
    user-select: none;
    pointer-events: none;
  }

  .diagram-viewer-content :global(svg) {
    max-width: none;
    max-height: none;
  }
</style>

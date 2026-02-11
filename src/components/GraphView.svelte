<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { buildGraphFromWikiLinks, simulateForceLayout, type GraphData, type GraphNode } from '$lib/graph';

  interface Props {
    currentFolder: string | null;
    currentFile: string | null;
    theme: 'dark' | 'light';
    onFileSelect: (path: string) => void;
    onClose: () => void;
  }

  let { currentFolder, currentFile, theme, onFileSelect, onClose }: Props = $props();

  let graphData = $state<GraphData | null>(null);
  let loading = $state(true);
  let canvasEl: HTMLCanvasElement | undefined = $state(undefined);
  let hoveredNode = $state<GraphNode | null>(null);

  // Pan & zoom
  let offsetX = $state(0);
  let offsetY = $state(0);
  let scale = $state(1);
  let isPanning = $state(false);
  let panStartX = $state(0);
  let panStartY = $state(0);

  const NODE_RADIUS = 20;

  $effect(() => {
    if (currentFolder) {
      loadGraph();
    }
  });

  async function loadGraph() {
    if (!currentFolder) return;
    loading = true;
    try {
      const result = await invoke<{ links: { source_file: string; target: string; alias: string | null }[]; files: string[] }>('scan_wiki_links', { folder: currentFolder });
      const raw = buildGraphFromWikiLinks(result);
      graphData = simulateForceLayout(raw, 800, 600, 150);
    } catch {
      graphData = { nodes: [], edges: [] };
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!canvasEl || !graphData) return;
    render();
  });

  function render() {
    if (!canvasEl || !graphData) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const w = canvasEl.clientWidth;
    const h = canvasEl.clientHeight;
    canvasEl.width = w * window.devicePixelRatio;
    canvasEl.height = h * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    const isDark = theme === 'dark';
    ctx.fillStyle = isDark ? '#1a1a2e' : '#f8f9fa';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2 + offsetX, h / 2 + offsetY);
    ctx.scale(scale, scale);
    ctx.translate(-400, -300);

    // Draw edges
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1.5;
    for (const edge of graphData.edges) {
      const source = graphData.nodes.find(n => n.id === edge.source);
      const target = graphData.nodes.find(n => n.id === edge.target);
      if (!source || !target) continue;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }

    // Draw nodes
    for (const node of graphData.nodes) {
      const isCurrent = node.path === currentFile;
      const isHovered = hoveredNode?.id === node.id;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent
        ? '#4CAF50'
        : isHovered
          ? '#2196F3'
          : isDark ? '#3a3a5c' : '#dee2e6';
      ctx.fill();
      ctx.strokeStyle = isCurrent ? '#66BB6A' : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
      ctx.lineWidth = isCurrent ? 3 : 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = isDark ? '#e0e0e0' : '#333';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = node.label.length > 16 ? node.label.slice(0, 15) + '\u2026' : node.label;
      ctx.fillText(label, node.x, node.y + NODE_RADIUS + 4);
    }

    ctx.restore();
  }

  function getNodeAtPos(clientX: number, clientY: number): GraphNode | null {
    if (!canvasEl || !graphData) return null;
    const rect = canvasEl.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    // Transform client coords to graph coords
    const gx = ((clientX - rect.left) - w / 2 - offsetX) / scale + 400;
    const gy = ((clientY - rect.top) - h / 2 - offsetY) / scale + 300;

    for (const node of graphData.nodes) {
      const dx = gx - node.x;
      const dy = gy - node.y;
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
        return node;
      }
    }
    return null;
  }

  function handleCanvasClick(e: MouseEvent) {
    const node = getNodeAtPos(e.clientX, e.clientY);
    if (node) {
      onFileSelect(node.path);
      onClose();
    }
  }

  function handleCanvasMouseMove(e: MouseEvent) {
    if (isPanning) {
      offsetX += e.movementX;
      offsetY += e.movementY;
      render();
      return;
    }
    const node = getNodeAtPos(e.clientX, e.clientY);
    if (node !== hoveredNode) {
      hoveredNode = node;
      if (canvasEl) {
        canvasEl.style.cursor = node ? 'pointer' : 'grab';
      }
      render();
    }
  }

  function handleCanvasMouseDown(e: MouseEvent) {
    const node = getNodeAtPos(e.clientX, e.clientY);
    if (!node) {
      isPanning = true;
      if (canvasEl) canvasEl.style.cursor = 'grabbing';
    }
  }

  function handleCanvasMouseUp() {
    isPanning = false;
    if (canvasEl) canvasEl.style.cursor = hoveredNode ? 'pointer' : 'grab';
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.1, Math.min(5, scale * factor));
    render();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="graph-overlay">
  <div class="graph-topbar">
    <span class="graph-title">Graph View</span>
    <span class="graph-info">
      {#if graphData}
        {graphData.nodes.length} files, {graphData.edges.length} links
      {/if}
    </span>
    <button class="btn" onclick={onClose}>Close</button>
  </div>

  <div class="graph-body">
    {#if loading}
      <div class="empty-state">Loading graph...</div>
    {:else if !graphData || graphData.nodes.length === 0}
      <div class="empty-state">No files found</div>
    {:else}
      <canvas
        bind:this={canvasEl}
        class="graph-canvas"
        onclick={handleCanvasClick}
        onmousemove={handleCanvasMouseMove}
        onmousedown={handleCanvasMouseDown}
        onmouseup={handleCanvasMouseUp}
        onmouseleave={handleCanvasMouseUp}
        onwheel={handleWheel}
      ></canvas>
    {/if}
  </div>
</div>

<style>
  .graph-overlay {
    position: fixed;
    inset: 0;
    background: var(--bg-primary);
    z-index: 600;
    display: flex;
    flex-direction: column;
  }

  .graph-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    min-height: 44px;
    padding: 0 16px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    gap: 12px;
  }

  .graph-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .graph-info {
    font-size: 12px;
    color: var(--text-muted);
    flex: 1;
  }

  .btn {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
  }

  .btn:hover { background: var(--hover-bg); border-color: var(--accent); }

  .graph-body {
    flex: 1;
    overflow: hidden;
  }

  .graph-canvas {
    width: 100%;
    height: 100%;
    cursor: grab;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    font-size: 16px;
  }
</style>

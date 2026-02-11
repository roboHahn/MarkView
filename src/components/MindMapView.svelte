<script lang="ts">
  import { parseHeadingsToTree, layoutTree, getTreeBounds, type MindMapNode } from '$lib/mindmap';

  interface Props {
    content: string;
    theme: 'dark' | 'light';
    onNavigate: (line: number) => void;
    onClose: () => void;
  }

  let { content, theme, onNavigate, onClose }: Props = $props();

  const NODE_W = 140;
  const NODE_H = 32;

  const levelColors = ['var(--accent)', '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#F44336'];

  let root = $derived.by(() => {
    const tree = parseHeadingsToTree(content);
    layoutTree(tree);
    return tree;
  });

  let bounds = $derived(getTreeBounds(root));
  let hasHeadings = $derived(root.children.length > 0);

  // Pan & zoom state
  let viewBox = $state({ x: 0, y: 0, w: 1000, h: 600 });
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0 });

  $effect(() => {
    if (hasHeadings) {
      const pad = 60;
      viewBox = {
        x: bounds.minX - pad,
        y: bounds.minY - pad,
        w: bounds.maxX - bounds.minX + pad * 2 + NODE_W,
        h: bounds.maxY - bounds.minY + pad * 2,
      };
    }
  });

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const newW = viewBox.w * factor;
    const newH = viewBox.h * factor;
    const dx = (viewBox.w - newW) / 2;
    const dy = (viewBox.h - newH) / 2;
    viewBox = { x: viewBox.x + dx, y: viewBox.y + dy, w: newW, h: newH };
  }

  function handlePointerDown(e: PointerEvent) {
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isPanning) return;
    const svg = (e.currentTarget as SVGSVGElement);
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    const dx = (panStart.x - e.clientX) * scaleX;
    const dy = (panStart.y - e.clientY) * scaleY;
    viewBox = { ...viewBox, x: viewBox.x + dx, y: viewBox.y + dy };
    panStart = { x: e.clientX, y: e.clientY };
  }

  function handlePointerUp() {
    isPanning = false;
  }

  function handleNodeClick(node: MindMapNode) {
    if (node.line > 0) {
      onNavigate(node.line);
      onClose();
    }
  }

  function getColor(level: number): string {
    return levelColors[Math.min(level, levelColors.length - 1)];
  }

  function collectNodes(node: MindMapNode): MindMapNode[] {
    const result = [node];
    for (const child of node.children) {
      result.push(...collectNodes(child));
    }
    return result;
  }

  function collectEdges(node: MindMapNode): { from: MindMapNode; to: MindMapNode }[] {
    const result: { from: MindMapNode; to: MindMapNode }[] = [];
    for (const child of node.children) {
      result.push({ from: node, to: child });
      result.push(...collectEdges(child));
    }
    return result;
  }

  let allNodes = $derived(collectNodes(root));
  let allEdges = $derived(collectEdges(root));

  function edgePath(from: MindMapNode, to: MindMapNode): string {
    const x1 = from.x + NODE_W;
    const y1 = from.y;
    const x2 = to.x;
    const y2 = to.y;
    const cx = (x1 + x2) / 2;
    return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
  }

  function truncate(text: string, maxLen: number): string {
    return text.length > maxLen ? text.slice(0, maxLen - 1) + '\u2026' : text;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="mindmap-overlay">
  <div class="mindmap-topbar">
    <span class="mindmap-title">Mind Map</span>
    <button class="btn" onclick={onClose}>Close</button>
  </div>

  {#if !hasHeadings}
    <div class="empty-state">No headings found in document</div>
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <svg
      class="mindmap-svg"
      viewBox="{viewBox.x} {viewBox.y} {viewBox.w} {viewBox.h}"
      onwheel={handleWheel}
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
    >
      <!-- Edges -->
      {#each allEdges as edge (edge.from.id + '-' + edge.to.id)}
        <path
          d={edgePath(edge.from, edge.to)}
          fill="none"
          stroke={theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
          stroke-width="2"
        />
      {/each}

      <!-- Nodes -->
      {#each allNodes as node (node.id)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <g
          class="mindmap-node"
          transform="translate({node.x}, {node.y - NODE_H / 2})"
          onclick={() => handleNodeClick(node)}
          style="cursor: pointer"
        >
          <rect
            width={NODE_W}
            height={NODE_H}
            rx="6"
            fill={getColor(node.level)}
            opacity="0.9"
          />
          <text
            x={NODE_W / 2}
            y={NODE_H / 2 + 4}
            text-anchor="middle"
            fill="#fff"
            font-size="12"
            font-weight="500"
          >{truncate(node.label, 18)}</text>
        </g>
      {/each}
    </svg>
  {/if}
</div>

<style>
  .mindmap-overlay {
    position: fixed;
    inset: 0;
    background: var(--bg-primary);
    z-index: 600;
    display: flex;
    flex-direction: column;
  }

  .mindmap-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    min-height: 44px;
    padding: 0 16px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
  }

  .mindmap-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
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

  .mindmap-svg {
    flex: 1;
    width: 100%;
    user-select: none;
    -webkit-user-select: none;
  }

  .mindmap-node:hover rect {
    opacity: 1;
    stroke: #fff;
    stroke-width: 2;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 16px;
  }
</style>

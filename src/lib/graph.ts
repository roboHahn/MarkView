export interface GraphNode {
  id: string;
  label: string;
  path: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface WikiLink {
  source_file: string;
  target: string;
  alias: string | null;
}

interface WikiScanResult {
  links: WikiLink[];
  files: string[];
}

/**
 * Build graph data from wiki scan results.
 */
export function buildGraphFromWikiLinks(scanResult: WikiScanResult): GraphData {
  const nodeMap = new Map<string, GraphNode>();

  // Create nodes for all files
  for (const file of scanResult.files) {
    const name = file.split(/[\\/]/).pop() ?? file;
    const label = name.replace(/\.md$/i, '');
    nodeMap.set(file, {
      id: file,
      label,
      path: file,
      x: Math.random() * 600 + 100,
      y: Math.random() * 400 + 100,
      vx: 0,
      vy: 0,
    });
  }

  // Create edges from wiki links
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  for (const link of scanResult.links) {
    const targetNorm = link.target.toLowerCase().replace(/\s+/g, '-');

    // Find matching file
    let targetFile: string | null = null;
    for (const file of scanResult.files) {
      const fname = (file.split(/[\\/]/).pop() ?? '').replace(/\.md$/i, '');
      if (fname.toLowerCase() === targetNorm || fname.toLowerCase() === link.target.toLowerCase()) {
        targetFile = file;
        break;
      }
    }

    if (targetFile && link.source_file !== targetFile) {
      const edgeKey = `${link.source_file}->${targetFile}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({ source: link.source_file, target: targetFile });
      }
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

/**
 * Simple force-directed layout simulation.
 */
export function simulateForceLayout(
  data: GraphData,
  width: number,
  height: number,
  iterations: number = 100
): GraphData {
  const nodes = data.nodes.map(n => ({ ...n }));
  const edges = data.edges;

  const centerX = width / 2;
  const centerY = height / 2;

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const repulsion = 5000 * alpha;
    const attraction = 0.01 * alpha;
    const centerGravity = 0.02 * alpha;

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx += fx;
        nodes[i].vy += fy;
        nodes[j].vx -= fx;
        nodes[j].vy -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (centerX - node.x) * centerGravity;
      node.vy += (centerY - node.y) * centerGravity;
    }

    // Apply velocities with damping
    for (const node of nodes) {
      node.x += node.vx * 0.5;
      node.y += node.vy * 0.5;
      node.vx *= 0.8;
      node.vy *= 0.8;
    }
  }

  return { nodes, edges };
}

export interface MindMapNode {
  id: string;
  label: string;
  level: number;
  line: number;
  children: MindMapNode[];
  x: number;
  y: number;
}

export function parseHeadingsToTree(content: string): MindMapNode {
  const root: MindMapNode = {
    id: 'root',
    label: 'Document',
    level: 0,
    line: 0,
    children: [],
    x: 0,
    y: 0,
  };

  const lines = content.split('\n');
  const stack: MindMapNode[] = [root];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (!match) continue;

    const level = match[1].length;
    const label = match[2].trim();
    const node: MindMapNode = {
      id: `h-${i}`,
      label,
      level,
      line: i + 1,
      children: [],
      x: 0,
      y: 0,
    };

    // Find parent: go up the stack until we find a node with a lower level
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }

  return root;
}

const NODE_WIDTH = 150;
const NODE_HEIGHT = 36;
const H_SPACING = 180;
const V_SPACING = 50;

export function layoutTree(root: MindMapNode): MindMapNode {
  // First pass: compute subtree heights
  function subtreeHeight(node: MindMapNode): number {
    if (node.children.length === 0) return NODE_HEIGHT;
    let total = 0;
    for (const child of node.children) {
      total += subtreeHeight(child);
    }
    total += (node.children.length - 1) * V_SPACING;
    return total;
  }

  // Second pass: assign positions
  function assignPositions(node: MindMapNode, x: number, yStart: number, yEnd: number) {
    node.x = x;
    node.y = (yStart + yEnd) / 2;

    if (node.children.length === 0) return;

    const totalH = subtreeHeight(node);
    const centerY = (yStart + yEnd) / 2;
    let currentY = centerY - totalH / 2;

    for (const child of node.children) {
      const childH = subtreeHeight(child);
      assignPositions(child, x + H_SPACING, currentY, currentY + childH);
      currentY += childH + V_SPACING;
    }
  }

  const totalH = subtreeHeight(root);
  const padding = 40;
  assignPositions(root, padding, padding, padding + totalH);

  return root;
}

export function getTreeBounds(root: MindMapNode): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  function visit(node: MindMapNode) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y - NODE_HEIGHT / 2);
    maxX = Math.max(maxX, node.x + NODE_WIDTH);
    maxY = Math.max(maxY, node.y + NODE_HEIGHT / 2);
    for (const child of node.children) visit(child);
  }

  visit(root);
  return { minX, minY, maxX, maxY };
}

import { ViewPlugin, EditorView } from '@codemirror/view';
import type { ViewUpdate } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

const MINIMAP_WIDTH = 80;
const LINE_HEIGHT = 2;
const LINE_GAP = 1;

class MinimapPlugin {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isDragging = false;

  constructor(readonly view: EditorView) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'cm-minimap';
    this.canvas.width = MINIMAP_WIDTH * window.devicePixelRatio;
    this.canvas.style.width = MINIMAP_WIDTH + 'px';
    this.canvas.style.position = 'absolute';
    this.canvas.style.right = '0';
    this.canvas.style.top = '0';
    this.canvas.style.zIndex = '10';
    this.canvas.style.cursor = 'pointer';
    this.canvas.style.borderLeft = '1px solid var(--border, #333)';
    this.ctx = this.canvas.getContext('2d')!;

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);

    view.dom.style.position = 'relative';
    view.dom.appendChild(this.canvas);

    requestAnimationFrame(() => this.render());
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.geometryChanged) {
      this.render();
    }
  }

  render() {
    const { view, canvas, ctx } = this;
    const doc = view.state.doc;
    const totalLines = doc.lines;
    const totalHeight = totalLines * (LINE_HEIGHT + LINE_GAP);

    const editorHeight = view.dom.clientHeight;
    canvas.style.height = editorHeight + 'px';
    canvas.height = editorHeight * window.devicePixelRatio;
    canvas.width = MINIMAP_WIDTH * window.devicePixelRatio;

    const dpr = window.devicePixelRatio;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, MINIMAP_WIDTH, editorHeight);

    // Background
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(245, 245, 245, 0.9)';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, editorHeight);

    const scale = totalHeight > editorHeight ? editorHeight / totalHeight : 1;

    // Draw lines
    const lineColor = isDark ? 'rgba(180, 180, 180, 0.3)' : 'rgba(80, 80, 80, 0.25)';
    ctx.fillStyle = lineColor;

    for (let i = 1; i <= totalLines; i++) {
      const line = doc.line(i);
      const len = Math.min(line.length, 80);
      const barWidth = (len / 80) * (MINIMAP_WIDTH - 8);
      const y = (i - 1) * (LINE_HEIGHT + LINE_GAP) * scale;

      if (y > editorHeight) break;
      if (barWidth > 0) {
        ctx.fillRect(4, y, barWidth, LINE_HEIGHT * scale);
      }
    }

    // Draw viewport indicator
    const scrollDOM = view.scrollDOM;
    const maxScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight;
    const scrollFraction = maxScroll > 0 ? scrollDOM.scrollTop / maxScroll : 0;

    const visibleFraction = scrollDOM.clientHeight / scrollDOM.scrollHeight;
    const viewportH = Math.max(20, visibleFraction * editorHeight);
    const viewportY = scrollFraction * (editorHeight - viewportH);

    ctx.fillStyle = isDark ? 'rgba(80, 140, 255, 0.15)' : 'rgba(50, 100, 220, 0.12)';
    ctx.fillRect(0, viewportY, MINIMAP_WIDTH, viewportH);
    ctx.strokeStyle = isDark ? 'rgba(80, 140, 255, 0.4)' : 'rgba(50, 100, 220, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, viewportY + 0.5, MINIMAP_WIDTH - 1, viewportH - 1);
  }

  scrollToY = (clientY: number) => {
    const rect = this.canvas.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const scrollDOM = this.view.scrollDOM;
    const maxScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight;
    scrollDOM.scrollTop = fraction * maxScroll;
  };

  onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    this.isDragging = true;
    this.scrollToY(e.clientY);
  };

  onMouseMove = (e: MouseEvent) => {
    if (this.isDragging) {
      this.scrollToY(e.clientY);
    }
  };

  onMouseUp = () => {
    this.isDragging = false;
  };

  destroy() {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.remove();
  }
}

const minimapPlugin = ViewPlugin.fromClass(MinimapPlugin);

export function createMinimapExtension(enabled: boolean): Extension[] {
  if (!enabled) return [];
  return [minimapPlugin];
}

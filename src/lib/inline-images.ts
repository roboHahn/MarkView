import { ViewPlugin, Decoration, WidgetType, EditorView } from '@codemirror/view';
import type { ViewUpdate, DecorationSet } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';

const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return this.src === other.src;
  }

  toDOM(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-inline-image';
    container.style.padding = '4px 0';
    container.style.lineHeight = '0';

    const img = document.createElement('img');
    img.src = this.src;
    img.alt = this.alt;
    img.loading = 'lazy';
    img.style.maxHeight = '200px';
    img.style.maxWidth = '100%';
    img.style.borderRadius = '4px';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.onerror = () => {
      container.style.display = 'none';
    };

    container.appendChild(img);
    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.sliceDoc(from, to);
    let match: RegExpExecArray | null;
    IMAGE_RE.lastIndex = 0;

    // We need to find matches and map them back to absolute positions
    while ((match = IMAGE_RE.exec(text)) !== null) {
      const alt = match[1];
      const src = match[2];
      const matchStart = from + match.index;
      const matchEnd = matchStart + match[0].length;

      // Place widget at the end of the line containing the match
      const line = view.state.doc.lineAt(matchEnd);

      builder.add(
        line.to,
        line.to,
        Decoration.widget({
          widget: new ImageWidget(src, alt),
          block: true,
          side: 1,
        })
      );
    }
  }

  return builder.finish();
}

const inlineImagesPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export function createInlineImagesExtension(enabled: boolean): Extension[] {
  if (!enabled) return [];
  return [inlineImagesPlugin];
}

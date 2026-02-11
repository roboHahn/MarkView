import { foldService } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

export function markdownFoldService() {
  return foldService.of((state: EditorState, lineStart: number, lineEnd: number) => {
    const line = state.doc.lineAt(lineStart);
    const text = line.text;

    // Check for heading: # ... ## ... etc.
    const headingMatch = text.match(/^(#{1,6})\s/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let end = line.to;
      for (let i = line.number + 1; i <= state.doc.lines; i++) {
        const nextLine = state.doc.line(i);
        const nextMatch = nextLine.text.match(/^(#{1,6})\s/);
        if (nextMatch && nextMatch[1].length <= level) {
          end = state.doc.line(i - 1).to;
          break;
        }
        end = nextLine.to;
      }
      if (end > line.to) {
        return { from: line.to, to: end };
      }
    }

    // Check for fenced code block: ```
    if (text.match(/^`{3,}/)) {
      for (let i = line.number + 1; i <= state.doc.lines; i++) {
        const nextLine = state.doc.line(i);
        if (nextLine.text.match(/^`{3,}\s*$/)) {
          return { from: line.to, to: nextLine.to };
        }
      }
    }

    return null;
  });
}

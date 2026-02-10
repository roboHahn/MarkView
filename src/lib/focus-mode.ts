import {
  type Extension,
  type Range,
  RangeSet,
} from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';

/**
 * Line decoration that marks a line as "unfocused" (dimmed).
 * The corresponding CSS class applies reduced opacity with a smooth transition.
 */
const unfocusedLine = Decoration.line({ class: 'cm-unfocused' });

/**
 * Determine the range of line numbers that form the "active paragraph"
 * around the given cursor position. A paragraph is defined as a block
 * of consecutive non-empty lines. Empty lines act as paragraph
 * boundaries.
 *
 * Returns [startLine, endLine] as 1-based line numbers (matching
 * CodeMirror's doc.line() convention).
 */
function getActiveParagraph(
  view: EditorView
): [number, number] | null {
  const state = view.state;
  const { from } = state.selection.main;
  const doc = state.doc;

  const cursorLine = doc.lineAt(from).number;

  // If the cursor is on an empty line, that line alone is the "paragraph"
  if (doc.line(cursorLine).text.trim() === '') {
    return [cursorLine, cursorLine];
  }

  // Walk upward to find the first line of the paragraph
  let startLine = cursorLine;
  while (startLine > 1) {
    const prevLine = doc.line(startLine - 1);
    if (prevLine.text.trim() === '') break;
    startLine--;
  }

  // Walk downward to find the last line of the paragraph
  let endLine = cursorLine;
  while (endLine < doc.lines) {
    const nextLine = doc.line(endLine + 1);
    if (nextLine.text.trim() === '') break;
    endLine++;
  }

  return [startLine, endLine];
}

/**
 * Build a DecorationSet that applies the `cm-unfocused` class to every
 * visible line that is NOT part of the active paragraph.
 */
function buildDecorations(view: EditorView): DecorationSet {
  const paragraph = getActiveParagraph(view);
  const doc = view.state.doc;
  const decorations: Range<Decoration>[] = [];

  // If there is no selection (shouldn't happen, but guard anyway),
  // return empty decorations so nothing is dimmed.
  if (!paragraph) {
    return RangeSet.of([]);
  }

  const [activeStart, activeEnd] = paragraph;

  for (let i = 1; i <= doc.lines; i++) {
    if (i < activeStart || i > activeEnd) {
      const line = doc.line(i);
      decorations.push(unfocusedLine.range(line.from));
    }
  }

  return RangeSet.of(decorations, true);
}

/**
 * ViewPlugin that manages the unfocused-line decorations. It rebuilds
 * decorations whenever the document changes, the viewport changes, or
 * the selection moves (which may change the active paragraph).
 */
const focusModePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

/**
 * Creates a CodeMirror extension that adds the `cm-unfocused` CSS class
 * to all lines that are NOT part of the active paragraph around the
 * cursor position.
 *
 * The active paragraph is defined as consecutive non-empty lines
 * surrounding the cursor. Empty lines act as paragraph boundaries.
 *
 * Designed to be used with a `Compartment` for dynamic toggling:
 *
 * ```ts
 * const focusCompartment = new Compartment();
 * // In extensions array:
 * focusCompartment.of(focusModeExtension(false))
 * // To toggle:
 * view.dispatch({
 *   effects: focusCompartment.reconfigure(focusModeExtension(true))
 * });
 * ```
 *
 * @param enabled - Whether focus mode is currently active
 * @returns A CodeMirror extension (or empty array when disabled)
 */
export function focusModeExtension(enabled: boolean): Extension {
  if (!enabled) {
    return [];
  }

  return [focusModePlugin];
}

import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Creates a CodeMirror extension that enables or disables the browser's
 * built-in spellcheck on the editor's content DOM.
 *
 * When enabled, this sets the `spellcheck="true"` attribute on the
 * `contenteditable` element that CodeMirror uses for input. The browser
 * then applies its native spell-checking UI (red underlines, suggestions
 * via right-click context menu, etc.).
 *
 * Designed to be used with a `Compartment` for dynamic toggling:
 *
 * ```ts
 * const spellCheckCompartment = new Compartment();
 * // In extensions array:
 * spellCheckCompartment.of(spellCheckExtension(false))
 * // To toggle:
 * view.dispatch({
 *   effects: spellCheckCompartment.reconfigure(spellCheckExtension(true))
 * });
 * ```
 *
 * @param enabled - Whether spell checking should be active
 * @returns A CodeMirror extension (or empty array when disabled)
 */
export function spellCheckExtension(enabled: boolean): Extension {
  if (!enabled) {
    return [];
  }

  return EditorView.contentAttributes.of({
    spellcheck: 'true',
    autocorrect: 'on',
  });
}

<script lang="ts">
  import { EditorView, keymap } from '@codemirror/view';
  import { EditorState, Compartment } from '@codemirror/state';
  import { markdown } from '@codemirror/lang-markdown';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
  import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
  import type { Theme } from '$lib/theme';
  import '../styles/codemirror.css';

  interface Props {
    content: string;
    onContentChange: (newContent: string) => void;
    theme: Theme;
    onSave: () => void;
  }

  let { content, onContentChange, theme, onSave }: Props = $props();

  let editorContainer: HTMLDivElement | undefined = $state(undefined);
  let editorView: EditorView | undefined = $state(undefined);
  let themeCompartment = new Compartment();

  // Track whether we are currently dispatching an internal update,
  // so we can ignore the external content prop echo.
  let isInternalUpdate = false;

  function getThemeExtension(currentTheme: Theme) {
    if (currentTheme === 'dark') {
      return [oneDark, syntaxHighlighting(defaultHighlightStyle, { fallback: true })];
    }
    return [syntaxHighlighting(defaultHighlightStyle)];
  }

  function wrapSelection(view: EditorView, wrapper: string) {
    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);
    const wrapped = `${wrapper}${selectedText}${wrapper}`;
    view.dispatch({
      changes: { from, to, insert: wrapped },
      selection: {
        anchor: from + wrapper.length,
        head: to + wrapper.length
      }
    });
  }

  // Create the editor when the container element is available
  $effect(() => {
    if (!editorContainer) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        markdown(),
        history(),
        EditorView.lineWrapping,
        themeCompartment.of(getThemeExtension(theme)),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          {
            key: 'Mod-s',
            run: () => {
              onSave();
              return true;
            }
          },
          {
            key: 'Mod-b',
            run: (view) => {
              wrapSelection(view, '**');
              return true;
            }
          },
          {
            key: 'Mod-i',
            run: (view) => {
              wrapSelection(view, '*');
              return true;
            }
          }
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            isInternalUpdate = true;
            onContentChange(update.state.doc.toString());
            // Reset flag asynchronously so the prop update from the
            // parent is still within the same microtask batch.
            queueMicrotask(() => {
              isInternalUpdate = false;
            });
          }
        })
      ]
    });

    const view = new EditorView({
      state,
      parent: editorContainer
    });

    editorView = view;

    return () => {
      view.destroy();
      editorView = undefined;
    };
  });

  // Sync external content changes (e.g. file switch) into the editor
  $effect(() => {
    // Access content to track it
    const currentContent = content;

    if (!editorView || isInternalUpdate) return;

    const editorContent = editorView.state.doc.toString();
    if (currentContent !== editorContent) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: currentContent
        }
      });
    }
  });

  // Reconfigure theme dynamically when it changes
  $effect(() => {
    // Access theme to track it
    const currentTheme = theme;

    if (!editorView) return;

    editorView.dispatch({
      effects: themeCompartment.reconfigure(getThemeExtension(currentTheme))
    });
  });
</script>

<div class="editor-wrapper" bind:this={editorContainer}></div>

<style>
  .editor-wrapper {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
</style>

<script lang="ts">
  import { EditorView, keymap } from '@codemirror/view';
  import { EditorState, Compartment } from '@codemirror/state';
  import { markdown } from '@codemirror/lang-markdown';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { defaultKeymap, history, historyKeymap, undo, redo } from '@codemirror/commands';
  import { syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap } from '@codemirror/language';
  import { markdownFoldService } from '$lib/markdown-fold';
  import { markdownAutocompletion } from '$lib/autocomplete';
  import { search, searchKeymap, openSearchPanel } from '@codemirror/search';
  import { untrack } from 'svelte';
  import type { Theme } from '$lib/theme';
  import { focusModeExtension } from '$lib/focus-mode';
  import { spellCheckExtension } from '$lib/spellcheck';
  import { createMinimapExtension } from '$lib/minimap';
  import { createInlineImagesExtension } from '$lib/inline-images';
  import '../styles/codemirror.css';
  import '../styles/focus-mode.css';

  interface Props {
    content: string;
    onContentChange: (newContent: string) => void;
    theme: Theme;
    onSave: () => void;
    onScrollChange?: (fraction: number) => void;
    scrollFraction?: number;
    insertCommand?: { type: string; timestamp: number } | null;
    onCommandProcessed?: () => void;
    onImagePaste?: (file: File) => void;
    onSelectionChange?: (text: string) => void;
    focusMode?: boolean;
    spellCheck?: boolean;
    minimapEnabled?: boolean;
    inlineImages?: boolean;
  }

  let {
    content,
    onContentChange,
    theme,
    onSave,
    onScrollChange,
    scrollFraction,
    insertCommand,
    onCommandProcessed,
    onImagePaste,
    onSelectionChange,
    focusMode = false,
    spellCheck = false,
    minimapEnabled = false,
    inlineImages = false,
  }: Props = $props();

  let editorContainer: HTMLDivElement | undefined = $state(undefined);
  let editorView: EditorView | undefined = $state(undefined);
  let themeCompartment = new Compartment();
  let focusCompartment = new Compartment();
  let spellCheckCompartment = new Compartment();
  let minimapCompartment = new Compartment();
  let inlineImagesCompartment = new Compartment();

  // Track whether we are currently dispatching an internal update,
  // so we can ignore the external content prop echo.
  let isInternalUpdate = false;

  // Track whether scroll originated from within the editor,
  // to prevent feedback loops when syncing scroll position.
  let isInternalScroll = false;

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

  function prefixLine(view: EditorView, prefix: string) {
    const { from, to } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    view.dispatch({
      changes: { from: line.from, to: line.from, insert: prefix }
    });
  }

  function insertAtCursor(view: EditorView, text: string, cursorOffset?: number) {
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: {
        anchor: from + (cursorOffset ?? text.length)
      }
    });
  }

  function handleInsertCommand(view: EditorView, type: string) {
    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    switch (type) {
      case 'undo':
        undo(view);
        break;
      case 'redo':
        redo(view);
        break;
      case 'bold':
        wrapSelection(view, '**');
        break;
      case 'italic':
        wrapSelection(view, '*');
        break;
      case 'heading':
        prefixLine(view, '## ');
        break;
      case 'link': {
        const linkText = selectedText || 'text';
        const replacement = `[${linkText}](url)`;
        view.dispatch({
          changes: { from, to, insert: replacement },
          selection: {
            anchor: from + linkText.length + 3,
            head: from + linkText.length + 6
          }
        });
        break;
      }
      case 'image': {
        const altText = selectedText || 'alt text';
        const replacement = `![${altText}](url)`;
        view.dispatch({
          changes: { from, to, insert: replacement },
          selection: {
            anchor: from + altText.length + 4,
            head: from + altText.length + 7
          }
        });
        break;
      }
      case 'code':
        wrapSelection(view, '`');
        break;
      case 'codeblock': {
        const codeContent = selectedText || '';
        const replacement = `\`\`\`\n${codeContent}\n\`\`\``;
        view.dispatch({
          changes: { from, to, insert: replacement },
          selection: {
            anchor: from + 4,
            head: from + 4 + codeContent.length
          }
        });
        break;
      }
      case 'list':
        prefixLine(view, '- ');
        break;
      case 'orderedlist':
        prefixLine(view, '1. ');
        break;
      case 'quote':
        prefixLine(view, '> ');
        break;
      case 'hr':
        insertAtCursor(view, '\n---\n');
        break;
      default:
        // Handle __raw: prefix — insert raw text at cursor
        if (type.startsWith('__raw:')) {
          const rawText = type.slice(6);
          insertAtCursor(view, rawText);
        }
        // Handle __goto: prefix — scroll to line number
        if (type.startsWith('__goto:')) {
          const lineNum = parseInt(type.slice(7), 10);
          if (!isNaN(lineNum) && lineNum > 0) {
            const line = view.state.doc.line(Math.min(lineNum, view.state.doc.lines));
            view.dispatch({
              selection: { anchor: line.from },
              effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
            });
          }
        }
        break;
    }

    view.focus();
  }

  // Create the editor ONCE when the container element mounts.
  // Use untrack() so reactive props (content, theme, etc.) don't cause
  // the editor to be destroyed & recreated (which wipes undo history).
  // Separate $effects below handle syncing content, theme, focusMode, spellCheck.
  $effect(() => {
    if (!editorContainer) return;

    const state = untrack(() => EditorState.create({
      doc: content,
      extensions: [
        markdown(),
        history(),
        search(),
        foldGutter(),
        markdownFoldService(),
        markdownAutocompletion(),
        EditorView.lineWrapping,
        themeCompartment.of(getThemeExtension(theme)),
        focusCompartment.of(focusModeExtension(focusMode)),
        spellCheckCompartment.of(spellCheckExtension(spellCheck)),
        minimapCompartment.of(createMinimapExtension(minimapEnabled)),
        inlineImagesCompartment.of(createInlineImagesExtension(inlineImages)),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...foldKeymap,
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
            queueMicrotask(() => {
              isInternalUpdate = false;
            });
          }
          if (update.selectionSet && onSelectionChange) {
            const { from, to } = update.state.selection.main;
            onSelectionChange(from !== to ? update.state.sliceDoc(from, to) : '');
          }
        }),
        EditorView.domEventHandlers({
          scroll(event, view) {
            if (onScrollChange) {
              const scrollDOM = view.scrollDOM;
              const maxScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight;
              const fraction = maxScroll > 0 ? scrollDOM.scrollTop / maxScroll : 0;
              isInternalScroll = true;
              onScrollChange(fraction);
              queueMicrotask(() => {
                isInternalScroll = false;
              });
            }
          },
          paste(event, view) {
            if (!onImagePaste) return false;
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            const items = clipboardData.items;
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                  event.preventDefault();
                  onImagePaste(file);
                  return true;
                }
              }
            }
            return false;
          }
        })
      ]
    }));

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

  // Sync external scroll fraction into the editor
  $effect(() => {
    const fraction = scrollFraction;

    if (!editorView || fraction === undefined || isInternalScroll) return;

    const scrollDOM = editorView.scrollDOM;
    const maxScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight;
    if (maxScroll > 0) {
      scrollDOM.scrollTop = fraction * maxScroll;
    }
  });

  // Reconfigure focus mode dynamically
  $effect(() => {
    const enabled = focusMode;
    if (!editorView) return;
    editorView.dispatch({
      effects: focusCompartment.reconfigure(focusModeExtension(enabled))
    });
  });

  // Reconfigure spellcheck dynamically
  $effect(() => {
    const enabled = spellCheck;
    if (!editorView) return;
    editorView.dispatch({
      effects: spellCheckCompartment.reconfigure(spellCheckExtension(enabled))
    });
  });

  // Reconfigure minimap dynamically
  $effect(() => {
    const enabled = minimapEnabled;
    if (!editorView) return;
    editorView.dispatch({
      effects: minimapCompartment.reconfigure(createMinimapExtension(enabled))
    });
  });

  // Reconfigure inline images dynamically
  $effect(() => {
    const enabled = inlineImages;
    if (!editorView) return;
    editorView.dispatch({
      effects: inlineImagesCompartment.reconfigure(createInlineImagesExtension(enabled))
    });
  });

  // React to insert commands from toolbar
  $effect(() => {
    const command = insertCommand;

    if (!editorView || !command) return;

    handleInsertCommand(editorView, command.type);
    // Clear the command after processing to prevent re-execution
    onCommandProcessed?.();
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

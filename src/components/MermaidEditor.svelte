<script lang="ts">
  import mermaid from 'mermaid';
  import type { Theme } from '$lib/theme';

  interface Props {
    initialCode: string;
    onSave: (code: string) => void;
    onClose: () => void;
    theme: Theme;
  }

  let { initialCode, onSave, onClose, theme }: Props = $props();

  let code = $state(initialCode);
  let previewHtml = $state('');
  let error: string | null = $state(null);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  let previewEl: HTMLDivElement | undefined = $state(undefined);

  const templates: Record<string, string> = {
    Flowchart: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
    Sequence: `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob
    B-->>A: Hi Alice
    A->>B: How are you?
    B-->>A: Great!`,
    Class: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
    }
    class Dog {
        +fetch() void
    }
    class Cat {
        +purr() void
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
    State: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start
    Processing --> Done : Complete
    Processing --> Error : Fail
    Error --> Idle : Retry
    Done --> [*]`,
    Gantt: `gantt
    title Project Schedule
    dateFormat  YYYY-MM-DD
    section Planning
    Research       :a1, 2024-01-01, 7d
    Design         :a2, after a1, 5d
    section Development
    Implementation :b1, after a2, 14d
    Testing        :b2, after b1, 7d`,
    Pie: `pie title Favorite Languages
    "JavaScript" : 35
    "Python" : 30
    "TypeScript" : 20
    "Rust" : 15`,
  };

  let renderCounter = 0;

  // Fix known mermaid syntax issues (multi-line notes → single-line)
  function fixMermaidSyntax(source: string): string {
    return source.replace(
      /note\s+(right|left)\s+of\s+(\S+)\s*\n([\s\S]*?)end\s+note/gi,
      (_match, side, state, content) => {
        const lines = content.trim().split('\n').map((l: string) => l.trim()).filter((l: string) => l);
        const text = lines.join(' ').replace(/:/g, '#colon;');
        return `note ${side} of ${state} : ${text}`;
      }
    );
  }

  async function renderPreview(source: string) {
    if (!source.trim()) {
      previewHtml = '';
      error = null;
      return;
    }

    // Snapshot body children BEFORE mermaid touches the DOM
    const bodySnapshot = new Set(Array.from(document.body.children));
    const fixedSource = fixMermaidSyntax(source);

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
      });

      renderCounter++;
      const renderId = 'mermaid-ed-' + renderCounter;
      const { svg } = await mermaid.render(renderId, fixedSource);
      previewHtml = svg;
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      // Remove ANY element added to body by mermaid during render
      Array.from(document.body.children).forEach(el => {
        if (!bodySnapshot.has(el)) {
          el.remove();
        }
      });
    }
  }

  // Render SVG preview inside Shadow DOM so mermaid's <style> tags
  // cannot leak into the host document and break button interactions.
  $effect(() => {
    const html = previewHtml; // track reactivity
    if (!previewEl) return;

    let shadow = previewEl.shadowRoot;
    if (!shadow) {
      shadow = previewEl.attachShadow({ mode: 'open' });
    }

    if (html) {
      const bg = theme === 'dark' ? '#1e1e2e' : '#ffffff';
      shadow.innerHTML =
        `<style>
          :host { display:flex; flex:1; }
          .wrap { display:flex; align-items:flex-start; justify-content:center; flex:1; background:${bg}; }
          svg { max-width:100%; height:auto; }
        </style>
        <div class="wrap">${html}</div>`;
    } else {
      shadow.innerHTML = '';
    }
  });

  function scheduleRender() {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      renderPreview(code);
    }, 500);
  }

  // Re-render when code changes (debounced)
  $effect(() => {
    code;
    scheduleRender();
  });

  // Initial render and theme change handling
  $effect(() => {
    theme;
    renderPreview(code);
  });

  // Cleanup debounce timer on destroy
  $effect(() => {
    return () => {
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer);
      }
    };
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSave(code);
    }
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    code = target.value;
  }

  // Standard overlay click handler (same pattern as CommandPalette)
  function handleOverlayClick() {
    onClose();
  }

  function handleModalClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={handleOverlayClick}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal" onclick={handleModalClick}>
    <!-- Top bar -->
    <div class="topbar">
      <span class="topbar-title">Mermaid Editor</span>
      <div class="topbar-actions">
        <button type="button" class="btn btn-primary" onclick={() => onSave(code)}>
          Save
        </button>
        <button type="button" class="btn" onclick={() => onClose()}>
          Close
        </button>
      </div>
    </div>

    <!-- Template buttons -->
    <div class="templates-bar">
      {#each Object.keys(templates) as name (name)}
        <button type="button" class="btn btn-template" onclick={() => { code = templates[name]; }}>
          {name}
        </button>
      {/each}
    </div>

    <!-- Split pane -->
    <div class="split-pane">
      <!-- Code editor -->
      <div class="editor-pane">
        <textarea
          class="code-editor"
          value={code}
          oninput={handleInput}
          spellcheck="false"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          placeholder="Enter mermaid diagram code..."
        ></textarea>
      </div>

      <!-- Splitter -->
      <div class="splitter"></div>

      <!-- Preview pane -->
      <div class="preview-pane">
        {#if error}
          <div class="error-display">
            <span class="error-label">Syntax Error</span>
            <pre class="error-message">{error}</pre>
          </div>
        {/if}
        <div class="preview-shadow-host" bind:this={previewEl}></div>
        {#if !previewHtml && !error}
          <div class="preview-placeholder">
            Enter mermaid code on the left to see a live preview
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    width: 90vw;
    height: 80vh;
    max-width: 1200px;
    background: var(--bg-primary);
    border-radius: 8px;
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    min-height: 44px;
    padding: 0 12px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    user-select: none;
    -webkit-user-select: none;
  }

  .topbar-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .btn:hover {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .btn-primary {
    background: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
  }

  .btn-primary:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }

  .templates-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    flex-shrink: 0;
  }

  .btn-template {
    padding: 2px 10px;
    font-size: 12px;
    white-space: nowrap;
    color: var(--text-secondary);
    border-color: var(--border);
    background: var(--bg-primary);
  }

  .btn-template:hover {
    background: var(--hover-bg);
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .split-pane {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .editor-pane {
    flex: 1;
    display: flex;
    min-width: 0;
  }

  .code-editor {
    width: 100%;
    height: 100%;
    padding: 12px;
    background: var(--bg-editor);
    color: var(--text-primary);
    border: none;
    resize: none;
    outline: none;
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.6;
    tab-size: 4;
    white-space: pre;
    overflow: auto;
  }

  .code-editor::placeholder {
    color: var(--text-muted);
  }

  .splitter {
    width: 1px;
    background: var(--border);
    flex-shrink: 0;
  }

  .preview-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg-preview);
    overflow: auto;
    padding: 16px;
    min-width: 0;
  }

  .preview-shadow-host {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .preview-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--text-muted);
    font-size: 14px;
    text-align: center;
    padding: 24px;
  }

  .error-display {
    padding: 12px;
    margin-bottom: 12px;
    border-radius: 6px;
    background: var(--bg-editor);
    border-left: 3px solid var(--toast-error);
  }

  .error-label {
    display: block;
    color: var(--toast-error);
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .error-message {
    color: var(--toast-error);
    font-size: 13px;
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
    line-height: 1.5;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>

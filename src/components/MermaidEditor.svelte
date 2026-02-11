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
    'ER Diagram': `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    CUSTOMER {
        string name
        string email
        int id
    }
    ORDER {
        int id
        date created
        string status
    }
    LINE_ITEM {
        int quantity
        float price
        string product
    }`,
    'User Journey': `journey
    title My Working Day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me`,
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
    'Git Graph': `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
    branch feature
    checkout feature
    commit
    checkout main
    merge feature`,
    Mindmap: `mindmap
  root((Project))
    Planning
      Requirements
      Timeline
      Budget
    Development
      Frontend
      Backend
      Database
    Testing
      Unit Tests
      Integration
      UAT
    Deployment
      Staging
      Production`,
    Timeline: `timeline
    title History of Technology
    1970 : Unix created
         : C language born
    1980 : IBM PC released
         : MS-DOS
    1990 : World Wide Web
         : Linux kernel
    2000 : Wikipedia launched
         : iPod released
    2010 : Instagram
         : Docker created
    2020 : GPT-3 released
         : Remote work boom`,
    Quadrant: `quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]`,
    'XY Chart': `xychart-beta
    title "Sales Revenue"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9800, 10500]
    line [5000, 6000, 7500, 8200, 9800, 10500]`,
    Sankey: `sankey-beta

Budget,Marketing,30000
Budget,Development,50000
Budget,Operations,20000
Marketing,Social Media,15000
Marketing,Ads,15000
Development,Frontend,25000
Development,Backend,25000
Operations,Hosting,12000
Operations,Support,8000`,
    Block: `block-beta
    columns 3
    a["Frontend"]:3
    block:backend:2
      columns 2
      c["API Server"]
      d["Auth Service"]
    end
    e["Database"]
    a --> backend
    backend --> e`,
    Requirement: `requirementDiagram
    requirement test_req {
        id: 1
        text: The system shall do something
        risk: high
        verifymethod: test
    }
    element test_entity {
        type: simulation
    }
    test_entity - satisfies -> test_req`,
    Packet: `packet-beta
  0-15: "Source Port"
  16-31: "Destination Port"
  32-63: "Sequence Number"
  64-95: "Acknowledgment Number"
  96-99: "Data Offset"
  100-105: "Reserved"
  106-111: "Flags"
  112-127: "Window Size"
  128-143: "Checksum"
  144-159: "Urgent Pointer"`,
    Architecture: `architecture-beta
    group api(cloud)[API Layer]

    service db(database)[Database] in api
    service server(server)[Server] in api
    service disk(disk)[Storage] in api

    db:R -- L:server
    server:R -- L:disk`,
    Kanban: `kanban
  Todo
    Design landing page
      assignee: Alice
    Write API docs
  In Progress
    Build auth module
      assignee: Bob
    Setup CI/CD
  Done
    Project setup
    Database schema`,
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
    gap: 4px;
    padding: 5px 12px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    flex-shrink: 0;
    flex-wrap: wrap;
    max-height: 64px;
  }

  .btn-template {
    padding: 2px 8px;
    font-size: 11px;
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

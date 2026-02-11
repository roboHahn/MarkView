<script lang="ts">
  import mermaid from 'mermaid';
  import nomnoml from 'nomnoml';
  import type { Theme } from '$lib/theme';
  import { engines, getEngine, getDefaultCode, type Engine } from '$lib/diagram-templates';

  interface Props {
    initialCode: string;
    onSave: (code: string, language: string) => void;
    onClose: () => void;
    theme: Theme;
  }

  let { initialCode, onSave, onClose, theme }: Props = $props();

  let selectedEngine: Engine = $state('mermaid');
  let codePerEngine: Record<Engine, string> = $state({
    mermaid: initialCode || getDefaultCode('mermaid'),
    graphviz: getDefaultCode('graphviz'),
    nomnoml: getDefaultCode('nomnoml'),
    wavedrom: getDefaultCode('wavedrom'),
    vegalite: getDefaultCode('vegalite'),
  });
  let previewHtml = $state('');
  let error: string | null = $state(null);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  let previewEl: HTMLDivElement | undefined = $state(undefined);
  let renderCounter = 0;

  // Lazy-loaded engine instances
  let vizInstance: any = null;

  // Current engine info
  let currentEngine = $derived(getEngine(selectedEngine));
  let currentCode = $derived(codePerEngine[selectedEngine]);

  // ── Engine icons (SVG paths) ──
  const engineIcons: Record<Engine, string> = {
    mermaid: '<path d="M1 11 L4 4 L7.5 9 L11 4 L14.5 11" stroke-width="1.8"/><circle cx="1" cy="11" r="1.2" fill="currentColor"/><circle cx="14.5" cy="11" r="1.2" fill="currentColor"/>',
    graphviz: '<circle cx="4" cy="4" r="2" fill="currentColor"/><circle cx="12" cy="4" r="2" fill="currentColor"/><circle cx="8" cy="12" r="2" fill="currentColor"/><line x1="4" y1="6" x2="8" y2="10"/><line x1="12" y1="6" x2="8" y2="10"/><line x1="6" y1="4" x2="10" y2="4"/>',
    nomnoml: '<rect x="2" y="2" width="12" height="5" rx="1"/><line x1="2" y1="5" x2="14" y2="5"/><rect x="2" y="9" width="12" height="5" rx="1"/><line x1="8" y1="7" x2="8" y2="9"/>',
    wavedrom: '<path d="M1 8 Q3 2 5 8 Q7 14 9 8 Q11 2 13 8 Q15 14 15 8" fill="none" stroke-width="1.8"/>',
    vegalite: '<rect x="2" y="8" width="2.5" height="5" fill="currentColor" rx="0.5"/><rect x="5.5" y="5" width="2.5" height="8" fill="currentColor" rx="0.5"/><rect x="9" y="3" width="2.5" height="10" fill="currentColor" rx="0.5"/><rect x="12.5" y="6" width="2.5" height="7" fill="currentColor" rx="0.5"/>',
  };

  // ── Fix known mermaid syntax issues ──
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

  // ── RENDER: Mermaid ──
  async function renderMermaidDiagram(source: string): Promise<string> {
    const bodySnapshot = new Set(Array.from(document.body.children));
    const fixedSource = fixMermaidSyntax(source);

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
      });
      renderCounter++;
      const { svg } = await mermaid.render('mermaid-ed-' + renderCounter, fixedSource);
      return svg;
    } finally {
      Array.from(document.body.children).forEach(el => {
        if (!bodySnapshot.has(el)) el.remove();
      });
    }
  }

  // ── RENDER: Graphviz ──
  async function renderGraphvizDiagram(source: string): Promise<string> {
    if (!vizInstance) {
      const mod = await import('@viz-js/viz');
      const instanceFn = mod.instance || (mod as any).default?.instance;
      vizInstance = await instanceFn();
    }
    return vizInstance.renderString(source, { format: 'svg', engine: 'dot' });
  }

  // ── RENDER: Nomnoml ──
  function renderNomnomlDiagram(source: string): string {
    return nomnoml.renderSvg(source);
  }

  // ── RENDER: WaveDrom ──
  async function renderWavedromDiagram(source: string): Promise<string> {
    const parsed = JSON.parse(source);

    // @ts-ignore
    const wd = await import('wavedrom');
    const wavedrom = wd.default || wd;

    // Approach 1: renderAny + onml stringify (no DOM needed)
    const renderAny = wavedrom.renderAny;
    const skin = wavedrom.waveSkin;
    if (typeof renderAny === 'function' && skin) {
      try {
        // @ts-ignore
        const onmlMod = await import('onml');
        const stringify = onmlMod.default?.stringify || onmlMod.stringify;
        if (typeof stringify === 'function') {
          const result = renderAny(0, parsed, skin);
          return stringify(result);
        }
      } catch { /* fall through to DOM approach */ }
    }

    // Approach 2: DOM rendering — pass element directly (v3 API)
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;visibility:hidden';
    document.body.appendChild(container);

    try {
      const renderFn = wavedrom.renderWaveForm || wavedrom.default?.renderWaveForm;
      if (typeof renderFn === 'function') {
        renderFn(0, parsed, container);
      } else {
        throw new Error('WaveDrom render function not available');
      }

      const svgEl = container.querySelector('svg');
      if (svgEl) return svgEl.outerHTML;
      if (container.innerHTML.includes('<svg')) return container.innerHTML;
      throw new Error('WaveDrom did not produce SVG output');
    } finally {
      container.remove();
    }
  }

  // ── RENDER: Vega-Lite ──
  async function renderVegaLiteDiagram(source: string): Promise<string> {
    const spec = JSON.parse(source);
    const vegaEmbedMod = await import('vega-embed');
    const vegaEmbed = vegaEmbedMod.default;

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;visibility:hidden';
    document.body.appendChild(container);

    try {
      const result = await vegaEmbed(container, spec, { renderer: 'svg', actions: false });
      const svg = await result.view.toSVG();
      result.finalize();
      return svg;
    } finally {
      container.remove();
    }
  }

  // ── Main render dispatcher ──
  async function renderPreview(source: string) {
    if (!source.trim()) {
      previewHtml = '';
      error = null;
      loading = false;
      return;
    }

    loading = true;
    try {
      let svg = '';
      switch (selectedEngine) {
        case 'mermaid': svg = await renderMermaidDiagram(source); break;
        case 'graphviz': svg = await renderGraphvizDiagram(source); break;
        case 'nomnoml': svg = renderNomnomlDiagram(source); break;
        case 'wavedrom': svg = await renderWavedromDiagram(source); break;
        case 'vegalite': svg = await renderVegaLiteDiagram(source); break;
      }
      previewHtml = svg;
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  // Render SVG into Shadow DOM for style isolation
  $effect(() => {
    const html = previewHtml;
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
          .wrap { display:flex; align-items:flex-start; justify-content:center; flex:1; background:${bg}; overflow:auto; }
          svg { max-width:100%; height:auto; }
        </style>
        <div class="wrap">${html}</div>`;
    } else {
      shadow.innerHTML = '';
    }
  });

  // Debounced code change → render
  function scheduleRender() {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => renderPreview(codePerEngine[selectedEngine]), 500);
  }

  $effect(() => {
    codePerEngine[selectedEngine]; // track
    scheduleRender();
  });

  // Re-render on theme or engine change (immediate)
  $effect(() => {
    theme; selectedEngine;
    renderPreview(codePerEngine[selectedEngine]);
  });

  $effect(() => {
    return () => { if (debounceTimer !== undefined) clearTimeout(debounceTimer); };
  });

  // ── Event handlers ──
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSave(codePerEngine[selectedEngine], currentEngine.fence);
    }
  }

  function handleInput(event: Event) {
    codePerEngine[selectedEngine] = (event.target as HTMLTextAreaElement).value;
  }

  function selectEngine(id: Engine) {
    selectedEngine = id;
  }

  function selectTemplate(code: string) {
    codePerEngine[selectedEngine] = code;
  }

  function handleOverlayClick() { onClose(); }
  function handleModalClick(event: MouseEvent) { event.stopPropagation(); }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={handleOverlayClick}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal" onclick={handleModalClick}>
    <!-- ── Top bar ── -->
    <div class="topbar">
      <span class="topbar-title">Diagram Editor</span>
      <div class="topbar-actions">
        <button type="button" class="btn btn-primary" onclick={() => onSave(codePerEngine[selectedEngine], currentEngine.fence)}>
          Save
        </button>
        <button type="button" class="btn" onclick={() => onClose()}>
          Close
        </button>
      </div>
    </div>

    <!-- ── Engine tabs ── -->
    <div class="engine-bar">
      {#each engines as eng (eng.id)}
        <button
          type="button"
          class="engine-tab"
          class:active={selectedEngine === eng.id}
          onclick={() => selectEngine(eng.id)}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            {@html engineIcons[eng.id]}
          </svg>
          <span>{eng.label}</span>
        </button>
      {/each}
    </div>

    <!-- ── Template buttons ── -->
    <div class="templates-bar">
      {#each currentEngine.categories as cat (cat.label)}
        <span class="cat-label">{cat.label}</span>
        {#each cat.items as tmpl (tmpl.name)}
          <button
            type="button"
            class="btn-template"
            class:active={codePerEngine[selectedEngine] === tmpl.code}
            onclick={() => selectTemplate(tmpl.code)}
          >
            {tmpl.name}
          </button>
        {/each}
      {/each}
    </div>

    <!-- ── Split pane ── -->
    <div class="split-pane">
      <!-- Code editor -->
      <div class="editor-pane">
        <textarea
          class="code-editor"
          value={codePerEngine[selectedEngine]}
          oninput={handleInput}
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          placeholder="Enter diagram code..."
        ></textarea>
      </div>

      <div class="splitter"></div>

      <!-- Preview -->
      <div class="preview-pane">
        {#if loading}
          <div class="loading-indicator">
            <div class="spinner"></div>
            <span>Rendering...</span>
          </div>
        {/if}
        {#if error}
          <div class="error-display">
            <span class="error-label">Syntax Error</span>
            <pre class="error-message">{error}</pre>
          </div>
        {/if}
        <div class="preview-shadow-host" bind:this={previewEl}></div>
        {#if !previewHtml && !error && !loading}
          <div class="preview-placeholder">
            Enter diagram code on the left to see a live preview
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
    width: 92vw;
    height: 85vh;
    max-width: 1400px;
    background: var(--bg-primary);
    border-radius: 10px;
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.35);
  }

  /* ── Top bar ── */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    min-height: 44px;
    padding: 0 14px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    user-select: none;
  }

  .topbar-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.3px;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn {
    padding: 5px 14px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn:hover {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .btn-primary {
    background: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
    font-weight: 600;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }

  /* ── Engine tabs ── */
  .engine-bar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px 14px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
  }

  .engine-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .engine-tab:hover {
    color: var(--text-primary);
    background: var(--hover-bg);
  }

  .engine-tab.active {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    font-weight: 600;
  }

  .engine-tab svg {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .engine-tab.active svg {
    opacity: 1;
  }

  /* ── Template buttons ── */
  .templates-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 14px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    flex-shrink: 0;
    flex-wrap: wrap;
    max-height: 62px;
  }

  .cat-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    padding: 2px 6px 2px 8px;
    margin-left: 4px;
    border-left: 2px solid var(--accent);
    user-select: none;
    opacity: 0.7;
  }

  .cat-label:first-child {
    margin-left: 0;
  }

  .btn-template {
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .btn-template:hover {
    background: var(--hover-bg);
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .btn-template.active {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }

  /* ── Split pane ── */
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
    font-size: 13px;
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

  /* ── Loading ── */
  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 8px;
    color: var(--text-muted);
    font-size: 13px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Error ── */
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

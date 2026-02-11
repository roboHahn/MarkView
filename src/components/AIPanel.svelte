<script lang="ts">
  import {
    type AiConfig,
    type AiMessage,
    loadAiConfig,
    saveAiConfig,
    createProvider,
    DEFAULT_MODELS,
  } from '$lib/ai-provider';

  interface Props {
    content: string;
    selectedText: string;
    onInsertText: (text: string) => void;
    onReplaceSelection: (text: string) => void;
    onClose: () => void;
  }

  let { content, selectedText, onInsertText, onReplaceSelection, onClose }: Props = $props();

  // --- Config state ---
  let config: AiConfig = $state(loadAiConfig());
  let configOpen = $state(false);

  // --- Action state ---
  let loading = $state(false);
  let result = $state('');
  let lastAction = $state<'rephrase' | 'diagram' | 'summarize' | 'custom' | 'factcheck' | null>(null);
  let errorMsg = $state('');

  // --- Inputs ---
  let diagramDescription = $state('');
  let customPrompt = $state('');
  let diagramType = $state('mermaid:flowchart');
  let lastDiagramFence = $state('mermaid');

  // --- Diagram type options ---
  const diagramGroups: { engine: string; types: { value: string; label: string; fence: string; hint: string }[] }[] = [
    { engine: 'Mermaid', types: [
      { value: 'mermaid:flowchart', label: 'Flowchart', fence: 'mermaid', hint: 'Use `flowchart TD` syntax.' },
      { value: 'mermaid:sequence', label: 'Sequence', fence: 'mermaid', hint: 'Use `sequenceDiagram` syntax.' },
      { value: 'mermaid:class', label: 'Class Diagram', fence: 'mermaid', hint: 'Use `classDiagram` syntax.' },
      { value: 'mermaid:er', label: 'ER Diagram', fence: 'mermaid', hint: 'Use `erDiagram` syntax.' },
      { value: 'mermaid:state', label: 'State Diagram', fence: 'mermaid', hint: 'Use `stateDiagram-v2` syntax.' },
      { value: 'mermaid:gantt', label: 'Gantt Chart', fence: 'mermaid', hint: 'Use `gantt` syntax.' },
      { value: 'mermaid:pie', label: 'Pie Chart', fence: 'mermaid', hint: 'Use `pie` syntax.' },
      { value: 'mermaid:mindmap', label: 'Mindmap', fence: 'mermaid', hint: 'Use `mindmap` syntax.' },
      { value: 'mermaid:timeline', label: 'Timeline', fence: 'mermaid', hint: 'Use `timeline` syntax.' },
      { value: 'mermaid:gitgraph', label: 'Git Graph', fence: 'mermaid', hint: 'Use `gitGraph` syntax.' },
      { value: 'mermaid:xy', label: 'XY Chart', fence: 'mermaid', hint: 'Use `xychart-beta` syntax.' },
      { value: 'mermaid:quadrant', label: 'Quadrant', fence: 'mermaid', hint: 'Use `quadrantChart` syntax.' },
      { value: 'mermaid:sankey', label: 'Sankey', fence: 'mermaid', hint: 'Use `sankey-beta` syntax.' },
      { value: 'mermaid:block', label: 'Block', fence: 'mermaid', hint: 'Use `block-beta` syntax.' },
      { value: 'mermaid:kanban', label: 'Kanban', fence: 'mermaid', hint: 'Use `kanban` syntax.' },
      { value: 'mermaid:journey', label: 'User Journey', fence: 'mermaid', hint: 'Use `journey` syntax.' },
      { value: 'mermaid:packet', label: 'Packet', fence: 'mermaid', hint: 'Use `packet-beta` syntax.' },
      { value: 'mermaid:requirement', label: 'Requirement', fence: 'mermaid', hint: 'Use `requirementDiagram` syntax.' },
      { value: 'mermaid:architecture', label: 'Architecture', fence: 'mermaid', hint: 'Use `architecture-beta` syntax.' },
    ]},
    { engine: 'Graphviz', types: [
      { value: 'dot:directed', label: 'Directed Graph', fence: 'dot', hint: 'Use `digraph` DOT language.' },
      { value: 'dot:undirected', label: 'Undirected Graph', fence: 'dot', hint: 'Use `graph` DOT language.' },
      { value: 'dot:cluster', label: 'Cluster', fence: 'dot', hint: 'Use `subgraph cluster_` in DOT language.' },
      { value: 'dot:record', label: 'Record/UML', fence: 'dot', hint: 'Use record shape nodes in DOT language.' },
      { value: 'dot:tree', label: 'Tree', fence: 'dot', hint: 'Use hierarchical digraph in DOT language.' },
    ]},
    { engine: 'Nomnoml', types: [
      { value: 'nomnoml:class', label: 'Class Diagram', fence: 'nomnoml', hint: 'Use Nomnoml `[Class|fields|methods]` syntax.' },
      { value: 'nomnoml:component', label: 'Component', fence: 'nomnoml', hint: 'Use Nomnoml `[<package>]` and `[<component>]` syntax.' },
      { value: 'nomnoml:activity', label: 'Activity', fence: 'nomnoml', hint: 'Use Nomnoml `[<start>]`, `[<choice>]`, `[<end>]` syntax.' },
    ]},
    { engine: 'WaveDrom', types: [
      { value: 'wavedrom:signal', label: 'Signal Timing', fence: 'wavedrom', hint: 'Use WaveDrom JSON with `signal` array. Waves use chars: p(clock), 0, 1, x, =, etc.' },
      { value: 'wavedrom:register', label: 'Register', fence: 'wavedrom', hint: 'Use WaveDrom JSON with `reg` array of bit fields.' },
    ]},
    { engine: 'Vega-Lite', types: [
      { value: 'vegalite:bar', label: 'Bar Chart', fence: 'vega-lite', hint: 'Use Vega-Lite JSON spec with `"mark": "bar"`.' },
      { value: 'vegalite:line', label: 'Line Chart', fence: 'vega-lite', hint: 'Use Vega-Lite JSON spec with `"mark": "line"`.' },
      { value: 'vegalite:scatter', label: 'Scatter Plot', fence: 'vega-lite', hint: 'Use Vega-Lite JSON spec with `"mark": "point"`.' },
      { value: 'vegalite:heatmap', label: 'Heatmap', fence: 'vega-lite', hint: 'Use Vega-Lite JSON spec with `"mark": "rect"` and color encoding.' },
      { value: 'vegalite:area', label: 'Area Chart', fence: 'vega-lite', hint: 'Use Vega-Lite JSON spec with `"mark": "area"`.' },
    ]},
  ];

  function getSelectedDiagramType() {
    for (const group of diagramGroups) {
      const found = group.types.find(t => t.value === diagramType);
      if (found) return { engine: group.engine, ...found };
    }
    return { engine: 'Mermaid', value: diagramType, label: 'Diagram', fence: 'mermaid', hint: '' };
  }

  // --- Derived ---
  let modelList = $derived(DEFAULT_MODELS[config.provider] ?? []);
  let hasSelection = $derived(selectedText.length > 0);

  // --- Config handlers ---
  function handleProviderChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as AiConfig['provider'];
    config.provider = val;
    // Set default model for new provider
    config.model = DEFAULT_MODELS[val]?.[0] ?? '';
    if (val === 'ollama') {
      config.apiKey = '';
    }
    saveAiConfig(config);
  }

  function handleApiKeyChange(e: Event) {
    config.apiKey = (e.target as HTMLInputElement).value;
    saveAiConfig(config);
  }

  function handleModelChange(e: Event) {
    config.model = (e.target as HTMLSelectElement).value;
    saveAiConfig(config);
  }

  function handleOllamaUrlChange(e: Event) {
    config.ollamaUrl = (e.target as HTMLInputElement).value;
    saveAiConfig(config);
  }

  // --- AI actions ---
  async function runAction(
    action: 'rephrase' | 'diagram' | 'summarize' | 'custom' | 'factcheck',
    messages: AiMessage[]
  ) {
    loading = true;
    result = '';
    errorMsg = '';
    lastAction = action;

    try {
      const provider = createProvider(config);
      result = await provider.chat(messages);
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function handleRephrase() {
    if (!hasSelection) return;
    runAction('rephrase', [
      { role: 'system', content: 'You are a writing assistant. Rephrase the given text to improve clarity and style while preserving the meaning. Return only the rephrased text, no explanations.' },
      { role: 'user', content: selectedText },
    ]);
  }

  function handleFactCheck() {
    if (!hasSelection) return;
    runAction('factcheck', [
      {
        role: 'system',
        content: `You are a rigorous fact-checker. Analyze the given text and verify each factual claim.

For EACH distinct claim found, output a line in this exact format:
[TRUE] claim text — brief explanation why it's true
[FALSE] claim text — brief explanation why it's false, with the correct fact
[UNCERTAIN] claim text — brief explanation why it cannot be verified

After all claims, add a blank line and a final summary line:
VERDICT: X of Y claims verified as true.

Be concise. Do not add any other text or markdown formatting.`
      },
      { role: 'user', content: selectedText },
    ]);
  }

  function handleSummarize() {
    const text = hasSelection ? selectedText : content;
    if (!text) return;
    runAction('summarize', [
      { role: 'system', content: 'You are a writing assistant. Summarize the given markdown text concisely. Return only the summary in markdown format.' },
      { role: 'user', content: text },
    ]);
  }

  function handleGenerateDiagram() {
    if (!diagramDescription.trim()) return;
    const dt = getSelectedDiagramType();
    lastDiagramFence = dt.fence;

    const enginePrompts: Record<string, string> = {
      'Mermaid': `You are a Mermaid diagram expert. Generate a valid Mermaid ${dt.label} diagram. ${dt.hint} Return ONLY the Mermaid code without any markdown fences or explanations.`,
      'Graphviz': `You are a Graphviz expert. Generate a valid ${dt.label} in DOT language. ${dt.hint} Return ONLY the DOT code without any markdown fences or explanations.`,
      'Nomnoml': `You are a Nomnoml diagram expert. Generate a valid ${dt.label}. ${dt.hint} Return ONLY the Nomnoml code without any markdown fences or explanations.`,
      'WaveDrom': `You are a WaveDrom expert. Generate valid WaveDrom JSON for a ${dt.label}. ${dt.hint} Return ONLY the JSON without any markdown fences or explanations.`,
      'Vega-Lite': `You are a Vega-Lite data visualization expert. Generate a valid Vega-Lite JSON specification for a ${dt.label}. ${dt.hint} Include inline data values. Return ONLY the JSON without any markdown fences or explanations.`,
    };

    runAction('diagram', [
      { role: 'system', content: enginePrompts[dt.engine] || enginePrompts['Mermaid'] },
      { role: 'user', content: diagramDescription },
    ]);
  }

  function handleAskAI() {
    if (!customPrompt.trim()) return;
    const contextText = hasSelection ? selectedText : content;
    const messages: AiMessage[] = [
      { role: 'system', content: 'You are a helpful markdown writing assistant. Respond concisely in markdown format.' },
    ];
    if (contextText) {
      messages.push({ role: 'user', content: `Context:\n${contextText}\n\nQuestion: ${customPrompt}` });
    } else {
      messages.push({ role: 'user', content: customPrompt });
    }
    runAction('custom', messages);
  }

  // --- Accept / Discard ---
  function handleAccept() {
    if (!result) return;

    if (lastAction === 'rephrase') {
      onReplaceSelection(result);
    } else if (lastAction === 'diagram') {
      onInsertText('\n```' + lastDiagramFence + '\n' + result + '\n```\n');
    } else {
      onInsertText(result);
    }

    result = '';
    lastAction = null;
  }

  function handleDiscard() {
    result = '';
    lastAction = null;
    errorMsg = '';
  }
</script>

<div class="ai-panel">
  <div class="ai-header">
    <span class="ai-title">AI Helper</span>
    <button class="ai-config-toggle" onclick={() => configOpen = !configOpen} title="Configure AI">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5l.7 2.1a4.5 4.5 0 011.7 1l2.1-.7 1 1.7-1.4 1.5a4.5 4.5 0 010 1.8l1.4 1.5-1 1.7-2.1-.7a4.5 4.5 0 01-1.7 1L8 14.5l-1.7 0-.7-2.1a4.5 4.5 0 01-1.7-1l-2.1.7-1-1.7 1.4-1.5a4.5 4.5 0 010-1.8L.8 5.6l1-1.7 2.1.7a4.5 4.5 0 011.7-1L6.3 1.5z" /></svg>
    </button>
    <button class="ai-close-btn" onclick={onClose} title="Close">
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" /></svg>
    </button>
  </div>

  {#if configOpen}
    <div class="ai-config">
      <div class="config-row">
        <label for="ai-provider">Provider</label>
        <select id="ai-provider" value={config.provider} onchange={handleProviderChange}>
          <option value="claude">Claude</option>
          <option value="openai">OpenAI</option>
          <option value="ollama">Ollama (local)</option>
        </select>
      </div>

      {#if config.provider !== 'ollama'}
        <div class="config-row">
          <label for="ai-apikey">API Key</label>
          <input
            id="ai-apikey"
            type="password"
            value={config.apiKey}
            onchange={handleApiKeyChange}
            placeholder="Enter API key..."
          />
        </div>
      {:else}
        <div class="config-row">
          <label for="ai-ollama-url">Ollama URL</label>
          <input
            id="ai-ollama-url"
            type="text"
            value={config.ollamaUrl}
            onchange={handleOllamaUrlChange}
            placeholder="http://localhost:11434"
          />
        </div>
      {/if}

      <div class="config-row">
        <label for="ai-model">Model</label>
        <select id="ai-model" value={config.model} onchange={handleModelChange}>
          {#each modelList as m}
            <option value={m}>{m}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}

  <div class="ai-actions">
    <div class="action-section">
      <span class="section-label">Quick Actions</span>
      <div class="action-buttons">
        <button
          class="ai-action-btn"
          onclick={handleRephrase}
          disabled={loading || !hasSelection}
          title={hasSelection ? 'Rephrase selected text' : 'Select text first'}
        >
          Rephrase Selection
        </button>
        <button
          class="ai-action-btn"
          onclick={handleSummarize}
          disabled={loading || (!hasSelection && !content)}
          title="Summarize selected text or entire document"
        >
          Summarize
        </button>
        <button
          class="ai-action-btn fact-check-btn"
          onclick={handleFactCheck}
          disabled={loading || !hasSelection}
          title={hasSelection ? 'Fact-check selected text' : 'Select text first'}
        >
          Fact Check
        </button>
      </div>
    </div>

    <div class="action-section">
      <span class="section-label">Generate Diagram</span>
      <div class="input-group">
        <select class="diagram-type-select" bind:value={diagramType} disabled={loading}>
          {#each diagramGroups as group (group.engine)}
            <optgroup label={group.engine}>
              {#each group.types as t (t.value)}
                <option value={t.value}>{t.label}</option>
              {/each}
            </optgroup>
          {/each}
        </select>
        <textarea
          bind:value={diagramDescription}
          placeholder="Describe a diagram..."
          disabled={loading}
          rows="3"
          onkeydown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerateDiagram(); }}
        ></textarea>
        <button
          class="ai-action-btn"
          onclick={handleGenerateDiagram}
          disabled={loading || !diagramDescription.trim()}
        >
          Generate
        </button>
      </div>
    </div>

    <div class="action-section">
      <span class="section-label">Ask AI</span>
      <div class="input-group">
        <textarea
          bind:value={customPrompt}
          placeholder="Ask anything..."
          disabled={loading}
          rows="3"
          onkeydown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAskAI(); }}
        ></textarea>
        <button
          class="ai-action-btn"
          onclick={handleAskAI}
          disabled={loading || !customPrompt.trim()}
        >
          Ask
        </button>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="ai-loading">
      <div class="spinner"></div>
      <span>Thinking...</span>
    </div>
  {/if}

  {#if errorMsg}
    <div class="ai-error">
      <span>{errorMsg}</span>
      <button class="discard-btn" onclick={handleDiscard}>Dismiss</button>
    </div>
  {/if}

  {#if result}
    <div class="ai-result">
      <div class="result-header">
        <span class="section-label">{lastAction === 'factcheck' ? 'Fact Check' : 'Result'}</span>
        <div class="result-actions">
          {#if lastAction !== 'factcheck'}
            <button class="accept-btn" onclick={handleAccept}>Accept</button>
          {/if}
          <button class="discard-btn" onclick={handleDiscard}>Discard</button>
        </div>
      </div>
      {#if lastAction === 'factcheck'}
        <div class="factcheck-content">
          {#each result.split('\n') as line}
            {#if line.startsWith('[TRUE]')}
              <div class="fc-line fc-true">
                <span class="fc-badge fc-badge-true">TRUE</span>
                <span class="fc-text">{line.replace('[TRUE]', '').trim()}</span>
              </div>
            {:else if line.startsWith('[FALSE]')}
              <div class="fc-line fc-false">
                <span class="fc-badge fc-badge-false">FALSE</span>
                <span class="fc-text">{line.replace('[FALSE]', '').trim()}</span>
              </div>
            {:else if line.startsWith('[UNCERTAIN]')}
              <div class="fc-line fc-uncertain">
                <span class="fc-badge fc-badge-uncertain">???</span>
                <span class="fc-text">{line.replace('[UNCERTAIN]', '').trim()}</span>
              </div>
            {:else if line.startsWith('VERDICT:')}
              <div class="fc-verdict">{line}</div>
            {:else if line.trim()}
              <div class="fc-line"><span class="fc-text">{line}</span></div>
            {/if}
          {/each}
        </div>
      {:else}
        <pre class="result-content">{result}</pre>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ai-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    background: var(--bg-sidebar);
    color: var(--text-primary);
    font-size: 13px;
  }

  .ai-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-toolbar);
    flex-shrink: 0;
  }

  .ai-title {
    font-weight: 600;
    font-size: 13px;
    flex: 1;
  }

  .ai-config-toggle,
  .ai-close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
  }

  .ai-config-toggle:hover,
  .ai-close-btn:hover {
    color: var(--text-primary);
    background: var(--hover-bg);
  }

  /* Config section */
  .ai-config {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .config-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .config-row label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .config-row select,
  .config-row input {
    padding: 4px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-editor);
    color: var(--text-primary);
    font-size: 12px;
    outline: none;
  }

  .config-row select:focus,
  .config-row input:focus {
    border-color: var(--accent);
  }

  /* Actions section */
  .ai-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    flex-shrink: 0;
  }

  .action-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .action-buttons {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .ai-action-btn {
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-editor);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .ai-action-btn:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .ai-action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .input-group input,
  .input-group textarea {
    padding: 5px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-editor);
    color: var(--text-primary);
    font-size: 12px;
    font-family: inherit;
    outline: none;
    resize: vertical;
  }

  .input-group input:focus,
  .input-group textarea:focus,
  .input-group select:focus {
    border-color: var(--accent);
  }

  .diagram-type-select {
    padding: 5px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-editor);
    color: var(--text-primary);
    font-size: 12px;
    font-family: inherit;
    outline: none;
  }

  .diagram-type-select optgroup {
    font-weight: 600;
    color: var(--text-primary);
  }

  .diagram-type-select option {
    font-weight: 400;
    padding: 2px 4px;
  }

  /* Loading */
  .ai-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    color: var(--text-secondary);
    font-size: 12px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Error */
  .ai-error {
    margin: 0 10px;
    padding: 8px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--toast-error) 15%, transparent);
    color: var(--toast-error);
    font-size: 12px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .ai-error span {
    flex: 1;
    word-break: break-word;
  }

  /* Result */
  .ai-result {
    margin: 0 10px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .result-actions {
    display: flex;
    gap: 4px;
  }

  .accept-btn {
    padding: 3px 10px;
    border: 1px solid var(--accent);
    border-radius: 4px;
    background: var(--accent);
    color: white;
    font-size: 11px;
    cursor: pointer;
    font-weight: 600;
  }

  .accept-btn:hover {
    opacity: 0.9;
  }

  .discard-btn {
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-editor);
    color: var(--text-secondary);
    font-size: 11px;
    cursor: pointer;
  }

  .discard-btn:hover {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .result-content {
    padding: 8px;
    margin: 0;
    overflow: auto;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-primary);
    background: var(--bg-editor);
    flex: 1;
    min-height: 60px;
  }

  /* Fact Check button */
  .fact-check-btn {
    background: color-mix(in srgb, #3b82f6 12%, var(--bg-editor));
    border-color: color-mix(in srgb, #3b82f6 40%, var(--border));
  }

  .fact-check-btn:hover:not(:disabled) {
    background: color-mix(in srgb, #3b82f6 25%, var(--bg-editor));
    border-color: #3b82f6;
  }

  /* Fact Check result */
  .factcheck-content {
    padding: 8px;
    overflow: auto;
    background: var(--bg-editor);
    flex: 1;
    min-height: 60px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .fc-line {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 12px;
    line-height: 1.5;
    padding: 4px 6px;
    border-radius: 4px;
  }

  .fc-true {
    background: color-mix(in srgb, #22c55e 8%, transparent);
  }

  .fc-false {
    background: color-mix(in srgb, #ef4444 8%, transparent);
  }

  .fc-uncertain {
    background: color-mix(in srgb, #f59e0b 8%, transparent);
  }

  .fc-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.3px;
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .fc-badge-true {
    background: #22c55e;
    color: #fff;
  }

  .fc-badge-false {
    background: #ef4444;
    color: #fff;
  }

  .fc-badge-uncertain {
    background: #f59e0b;
    color: #fff;
  }

  .fc-text {
    color: var(--text-primary);
    word-break: break-word;
  }

  .fc-verdict {
    margin-top: 4px;
    padding: 6px 8px;
    border-top: 1px solid var(--border);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }
</style>

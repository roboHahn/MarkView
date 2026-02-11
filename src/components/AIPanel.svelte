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
  let lastAction = $state<'rephrase' | 'diagram' | 'summarize' | 'custom' | null>(null);
  let errorMsg = $state('');

  // --- Inputs ---
  let diagramDescription = $state('');
  let customPrompt = $state('');

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
    action: 'rephrase' | 'diagram' | 'summarize' | 'custom',
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
    runAction('diagram', [
      { role: 'system', content: 'You are a Mermaid diagram expert. Generate a valid Mermaid diagram based on the description. Return ONLY the Mermaid code without any markdown fences or explanations.' },
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
      onInsertText('\n```mermaid\n' + result + '\n```\n');
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
      </div>
    </div>

    <div class="action-section">
      <span class="section-label">Generate Diagram</span>
      <div class="input-group">
        <input
          type="text"
          bind:value={diagramDescription}
          placeholder="Describe a diagram..."
          disabled={loading}
          onkeydown={(e) => { if (e.key === 'Enter') handleGenerateDiagram(); }}
        />
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
        <span class="section-label">Result</span>
        <div class="result-actions">
          <button class="accept-btn" onclick={handleAccept}>Accept</button>
          <button class="discard-btn" onclick={handleDiscard}>Discard</button>
        </div>
      </div>
      <pre class="result-content">{result}</pre>
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
  .input-group textarea:focus {
    border-color: var(--accent);
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
</style>

<script lang="ts">
  import { settingsManager } from '$lib/settings.svelte';

  interface Props {
    onClose: () => void;
    theme: 'dark' | 'light';
  }

  let { onClose, theme }: Props = $props();

  let fontSize = $state(settingsManager.settings.fontSize);
  let tabSize = $state(settingsManager.settings.tabSize);
  let wordWrap = $state(settingsManager.settings.wordWrap);
  let autoSave = $state(settingsManager.settings.autoSave);
  let autoSaveDelaySeconds = $state(settingsManager.settings.autoSaveDelay / 1000);
  let minimapEnabled = $state(settingsManager.settings.minimapEnabled);
  let inlineImages = $state(settingsManager.settings.inlineImages);

  function handleFontSizeChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(value) && value >= 10 && value <= 24) {
      fontSize = value;
      settingsManager.update({ fontSize: value });
    }
  }

  function handleTabSizeChange(event: Event) {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    tabSize = value;
    settingsManager.update({ tabSize: value });
  }

  function handleWordWrapChange() {
    wordWrap = !wordWrap;
    settingsManager.update({ wordWrap });
  }

  function handleAutoSaveChange() {
    autoSave = !autoSave;
    settingsManager.update({ autoSave });
  }

  function handleMinimapChange() {
    minimapEnabled = !minimapEnabled;
    settingsManager.update({ minimapEnabled });
  }

  function handleInlineImagesChange() {
    inlineImages = !inlineImages;
    settingsManager.update({ inlineImages });
  }

  function handleAutoSaveDelayChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(value) && value >= 1 && value <= 30) {
      autoSaveDelaySeconds = value;
      settingsManager.update({ autoSaveDelay: value * 1000 });
    }
  }

  function handleReset() {
    settingsManager.reset();
    fontSize = settingsManager.settings.fontSize;
    tabSize = settingsManager.settings.tabSize;
    wordWrap = settingsManager.settings.wordWrap;
    autoSave = settingsManager.settings.autoSave;
    autoSaveDelaySeconds = settingsManager.settings.autoSaveDelay / 1000;
    minimapEnabled = settingsManager.settings.minimapEnabled;
    inlineImages = settingsManager.settings.inlineImages;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

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
    <div class="topbar">
      <span class="topbar-title">Settings</span>
      <button class="btn" onclick={onClose}>Close</button>
    </div>

    <div class="settings-body">
      <div class="setting-row">
        <label class="setting-label" for="setting-font-size">Font Size</label>
        <input
          id="setting-font-size"
          class="setting-input"
          type="number"
          min="10"
          max="24"
          value={fontSize}
          onchange={handleFontSizeChange}
        />
      </div>

      <div class="setting-row">
        <label class="setting-label" for="setting-tab-size">Tab Size</label>
        <select
          id="setting-tab-size"
          class="setting-input"
          value={tabSize}
          onchange={handleTabSizeChange}
        >
          <option value={2}>2</option>
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>

      <div class="setting-row">
        <label class="setting-label" for="setting-word-wrap">Word Wrap</label>
        <button
          id="setting-word-wrap"
          class="toggle"
          class:active={wordWrap}
          onclick={handleWordWrapChange}
          role="switch"
          aria-checked={wordWrap}
        >
          <span class="toggle-knob"></span>
        </button>
      </div>

      <div class="setting-row">
        <label class="setting-label" for="setting-auto-save">Auto-save</label>
        <button
          id="setting-auto-save"
          class="toggle"
          class:active={autoSave}
          onclick={handleAutoSaveChange}
          role="switch"
          aria-checked={autoSave}
        >
          <span class="toggle-knob"></span>
        </button>
      </div>

      <div class="setting-row">
        <label class="setting-label" for="setting-minimap">Minimap</label>
        <button
          id="setting-minimap"
          class="toggle"
          class:active={minimapEnabled}
          onclick={handleMinimapChange}
          role="switch"
          aria-checked={minimapEnabled}
        >
          <span class="toggle-knob"></span>
        </button>
      </div>

      <div class="setting-row">
        <label class="setting-label" for="setting-inline-images">Inline Image Preview</label>
        <button
          id="setting-inline-images"
          class="toggle"
          class:active={inlineImages}
          onclick={handleInlineImagesChange}
          role="switch"
          aria-checked={inlineImages}
        >
          <span class="toggle-knob"></span>
        </button>
      </div>

      {#if autoSave}
        <div class="setting-row">
          <label class="setting-label" for="setting-auto-save-delay">Auto-save Delay (seconds)</label>
          <input
            id="setting-auto-save-delay"
            class="setting-input"
            type="number"
            min="1"
            max="30"
            value={autoSaveDelaySeconds}
            onchange={handleAutoSaveDelayChange}
          />
        </div>
      {/if}

      <div class="setting-footer">
        <button class="btn btn-reset" onclick={handleReset}>Reset to Defaults</button>
      </div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    width: 90vw;
    max-width: 480px;
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

  .settings-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .setting-label {
    font-size: 13px;
    color: var(--text-secondary);
    user-select: none;
    -webkit-user-select: none;
  }

  .setting-input {
    width: 80px;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-editor);
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s;
  }

  .setting-input:focus {
    border-color: var(--accent);
  }

  select.setting-input {
    cursor: pointer;
  }

  .toggle {
    position: relative;
    width: 40px;
    height: 22px;
    border-radius: 11px;
    border: 1px solid var(--border);
    background: var(--bg-editor);
    cursor: pointer;
    padding: 0;
    transition: background 0.2s, border-color 0.2s;
    flex-shrink: 0;
  }

  .toggle.active {
    background: var(--accent);
    border-color: var(--accent);
  }

  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-secondary);
    transition: transform 0.2s, background 0.2s;
  }

  .toggle.active .toggle-knob {
    transform: translateX(18px);
    background: var(--bg-primary);
  }

  .setting-footer {
    margin-top: 8px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-start;
  }

  .btn-reset {
    color: var(--toast-error);
    border-color: var(--toast-error);
  }

  .btn-reset:hover {
    background: var(--toast-error);
    color: var(--bg-primary);
    border-color: var(--toast-error);
  }
</style>

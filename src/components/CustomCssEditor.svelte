<script lang="ts">
  import { customCss } from '$lib/custom-css.svelte';

  interface Props {
    onClose: () => void;
    theme: 'dark' | 'light';
  }

  let { onClose, theme }: Props = $props();

  let cssText = $state(customCss.value);

  function handleApply() {
    customCss.set(cssText);
  }

  function handleReset() {
    customCss.reset();
    cssText = '';
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
      <span class="topbar-title">Custom Preview CSS</span>
      <button class="btn" onclick={onClose}>Close</button>
    </div>

    <div class="editor-body">
      <p class="hint">
        Write custom CSS to style the markdown preview panel. Styles are applied
        inside <code>.preview-content</code> and saved to localStorage.
      </p>

      <textarea
        class="css-textarea"
        placeholder={`.preview-content h1 {\n  color: #e06c75;\n}\n\n.preview-content p {\n  font-size: 16px;\n}`}
        bind:value={cssText}
        spellcheck="false"
      ></textarea>

      <div class="button-row">
        <button class="btn btn-apply" onclick={handleApply}>Apply</button>
        <button class="btn btn-reset" onclick={handleReset}>Reset</button>
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
    max-width: 560px;
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

  .editor-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .hint {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .hint code {
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
    font-size: 0.9em;
    background: var(--bg-editor);
    padding: 0.1em 0.4em;
    border-radius: 3px;
    color: var(--accent);
  }

  .css-textarea {
    width: 100%;
    min-height: 200px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-editor);
    color: var(--text-primary);
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.5;
    resize: vertical;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .css-textarea:focus {
    border-color: var(--accent);
  }

  .css-textarea::placeholder {
    color: var(--text-muted);
    opacity: 0.6;
  }

  .button-row {
    display: flex;
    gap: 8px;
    justify-content: flex-start;
    padding-top: 4px;
  }

  .btn-apply {
    background: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
  }

  .btn-apply:hover {
    opacity: 0.85;
    border-color: var(--accent);
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

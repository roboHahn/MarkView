<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';

  interface Props {
    currentFile: string | null;
    currentFolder: string | null;
    onClose: () => void;
    theme: 'dark' | 'light';
  }

  let { currentFile, currentFolder, onClose, theme }: Props = $props();

  let diffText = $state('');
  let loading = $state(true);
  let error: string | null = $state(null);

  function getFilename(filePath: string | null): string {
    if (!filePath) return 'Unknown';
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'Unknown';
  }

  $effect(() => {
    fetchDiff();
  });

  async function fetchDiff() {
    loading = true;
    error = null;
    diffText = '';

    if (!currentFile || !currentFolder) {
      error = 'No file or folder specified.';
      loading = false;
      return;
    }

    try {
      const result = await invoke<string>('git_diff', {
        folder: currentFolder,
        filePath: currentFile,
      });
      diffText = result;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function classifyLine(line: string): 'addition' | 'deletion' | 'hunk' | 'normal' {
    if (line.startsWith('@@')) return 'hunk';
    if (line.startsWith('+')) return 'addition';
    if (line.startsWith('-')) return 'deletion';
    return 'normal';
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
    <!-- Top bar -->
    <div class="topbar">
      <span class="topbar-title">Diff: {getFilename(currentFile)}</span>
      <div class="topbar-actions">
        <button class="btn" onclick={onClose}>
          Close
        </button>
      </div>
    </div>

    <!-- Diff content -->
    <div class="diff-content">
      {#if loading}
        <div class="diff-status">
          <span class="diff-status-text">Loading diff...</span>
        </div>
      {:else if error}
        <div class="diff-status">
          <span class="diff-error-text">{error}</span>
        </div>
      {:else if !diffText.trim()}
        <div class="diff-status">
          <span class="diff-status-text">No changes</span>
        </div>
      {:else}
        <pre class="diff-pre"><code class="diff-code">{#each diffText.split('\n') as line, i}<div class="diff-line {classifyLine(line)}">{line}</div>{/each}</code></pre>
      {/if}
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
    width: 80vw;
    height: 70vh;
    max-width: 1000px;
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

  .diff-content {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  .diff-status {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 24px;
  }

  .diff-status-text {
    color: var(--text-muted);
    font-size: 14px;
  }

  .diff-error-text {
    color: var(--toast-error);
    font-size: 14px;
  }

  .diff-pre {
    margin: 0;
    padding: 0;
  }

  .diff-code {
    display: block;
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-primary);
  }

  .diff-line {
    padding: 1px 12px;
    white-space: pre;
    min-height: 1.5em;
  }

  .diff-line.addition {
    background: rgba(166, 227, 161, 0.15);
    border-left: 3px solid var(--toast-success);
  }

  .diff-line.deletion {
    background: rgba(243, 139, 168, 0.15);
    border-left: 3px solid var(--toast-error);
  }

  .diff-line.hunk {
    color: var(--accent);
    font-weight: bold;
  }

  .diff-line.normal {
    border-left: 3px solid transparent;
  }
</style>

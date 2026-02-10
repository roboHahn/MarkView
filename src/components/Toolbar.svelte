<script lang="ts">
  import type { Theme } from '$lib/theme';
  import ExportMenu from './ExportMenu.svelte';

  interface Props {
    onOpenFolder: () => void;
    onSave: () => void;
    currentFolder: string | null;
    currentFile: string | null;
    content: string;
    theme: Theme;
  }

  let { onOpenFolder, onSave, currentFolder, currentFile, content, theme }: Props = $props();

  let folderDisplayName = $derived(
    currentFolder ? currentFolder.split(/[\\/]/).pop() ?? currentFolder : null
  );
</script>

<div class="toolbar">
  <div class="toolbar-left">
    <button class="toolbar-btn" onclick={onOpenFolder}>
      <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 3v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H7L5.5 2H2a1 1 0 0 0-1 1z" />
        <path d="M6 8h4" />
        <path d="M8 6v4" />
      </svg>
      <span>Open</span>
    </button>
    <button class="toolbar-btn" onclick={onSave} disabled={!currentFile}>
      <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 2a1 1 0 0 1 1-1h8l4 4v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2z" />
        <path d="M11 1v4H6V1" />
        <path d="M5 9h6" />
        <path d="M5 12h6" />
      </svg>
      <span>Save</span>
    </button>
    <ExportMenu {content} {currentFile} {theme} />
  </div>
  <div class="toolbar-right">
    {#if folderDisplayName}
      <span class="folder-name">{folderDisplayName}</span>
    {/if}
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    height: 40px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    user-select: none;
    -webkit-user-select: none;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
  }

  .toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .toolbar-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .folder-name {
    color: var(--text-muted);
    font-size: 13px;
  }
</style>

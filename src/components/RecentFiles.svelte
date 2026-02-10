<script lang="ts">
  import { recentFiles } from '$lib/recent-files.svelte';

  interface Props {
    onFileSelect: (path: string) => void;
    onFolderSelect: (path: string) => void;
    onClose: () => void;
  }

  let { onFileSelect, onFolderSelect, onClose }: Props = $props();

  function handleItemClick(item: { path: string; type: 'file' | 'folder' }) {
    if (item.type === 'file') {
      onFileSelect(item.path);
    } else {
      onFolderSelect(item.path);
    }
    onClose();
  }

  function handleClear() {
    recentFiles.clear();
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.recent-files')) {
      onClose();
    }
  }

  function formatPath(path: string): string {
    const parts = path.split(/[\\/]/);
    if (parts.length <= 3) return path;
    return '...' + parts.slice(-3).join('/');
  }
</script>

<svelte:document onclick={handleClickOutside} />

<div class="recent-files">
  <div class="recent-dropdown">
    <div class="recent-header">Recent Files</div>

    {#if recentFiles.items.length === 0}
      <div class="recent-empty">No recent files</div>
    {:else}
      <div class="recent-list">
        {#each recentFiles.items as item (item.path + item.timestamp)}
          <button class="recent-item" onclick={() => handleItemClick(item)}>
            <span class="recent-icon">
              {#if item.type === 'folder'}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1.5 2.5h4.667l1.333 2H14.5v9h-13v-11z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                </svg>
              {:else}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 1.5h6l3 3v10h-9v-13z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                  <path d="M9.5 1.5v3h3" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                </svg>
              {/if}
            </span>
            <span class="recent-details">
              <span class="recent-name">{item.name}</span>
              <span class="recent-path">{formatPath(item.path)}</span>
            </span>
          </button>
        {/each}
      </div>

      <div class="recent-footer">
        <button class="recent-clear-btn" onclick={handleClear}>Clear Recent</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .recent-files {
    position: relative;
  }

  .recent-dropdown {
    position: absolute;
    top: 0;
    left: 0;
    min-width: 300px;
    max-height: 400px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .recent-header {
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
  }

  .recent-list {
    overflow-y: auto;
    flex: 1;
  }

  .recent-empty {
    padding: 16px 14px;
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
  }

  .recent-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 14px;
    border: none;
    background: none;
    color: var(--text-primary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
  }

  .recent-item:hover {
    background: var(--hover-bg);
  }

  .recent-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: var(--text-muted);
  }

  .recent-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .recent-name {
    font-size: 13px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .recent-path {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .recent-footer {
    padding: 6px 14px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .recent-clear-btn {
    display: block;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    text-align: center;
  }

  .recent-clear-btn:hover {
    background: var(--hover-bg);
    color: var(--toast-error);
  }
</style>

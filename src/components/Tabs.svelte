<script lang="ts">
  interface Props {
    openFiles: { path: string; name: string; modified: boolean }[];
    activeFile: string | null;
    onSelectTab: (path: string) => void;
    onCloseTab: (path: string) => void;
  }

  let { openFiles, activeFile, onSelectTab, onCloseTab }: Props = $props();
</script>

{#if openFiles.length > 0}
  <div class="tabs-bar">
    {#each openFiles as file (file.path)}
      <button
        class="tab"
        class:active={file.path === activeFile}
        onclick={() => onSelectTab(file.path)}
        title={file.path}
      >
        {#if file.modified}
          <span class="modified-dot"></span>
        {/if}
        <span class="tab-name">{file.name}</span>
        <span
          class="tab-close"
          role="button"
          tabindex="-1"
          onclick={(e: MouseEvent) => { e.stopPropagation(); onCloseTab(file.path); }}
          aria-label="Close tab"
        >
          &times;
        </span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .tabs-bar {
    display: flex;
    align-items: stretch;
    height: 32px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    overflow-y: hidden;
    user-select: none;
    -webkit-user-select: none;
    scrollbar-width: none;
  }

  .tabs-bar::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    height: 100%;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .tab:hover {
    background: var(--hover-bg);
  }

  .tab.active {
    background: var(--active-bg);
    color: var(--text-primary);
    border-bottom-color: var(--accent);
  }

  .modified-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    font-size: 14px;
    line-height: 1;
    color: var(--text-muted);
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
  }

  .tab-close:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .tab.active .tab-close:hover {
    background: var(--border);
  }
</style>

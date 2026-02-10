<script lang="ts">
  import type { FileEntry } from '$lib/types';

  interface Props {
    fileTree: FileEntry[];
    currentFile: string | null;
    onFileSelect: (path: string) => void;
  }

  let { fileTree, currentFile, onFileSelect }: Props = $props();

  let expandedDirs = $state(new Set<string>());

  function toggleDir(path: string) {
    if (expandedDirs.has(path)) {
      expandedDirs.delete(path);
    } else {
      expandedDirs.add(path);
    }
    // Trigger reactivity by reassigning
    expandedDirs = new Set(expandedDirs);
  }
</script>

{#snippet treeNode(entries: FileEntry[], depth: number)}
  {#each entries as entry (entry.path)}
    {#if entry.is_directory}
      <div
        class="tree-item tree-folder"
        style="padding-left: {depth * 16}px"
        onclick={() => toggleDir(entry.path)}
        onkeydown={(e) => { if (e.key === 'Enter') toggleDir(entry.path); }}
        role="treeitem"
        tabindex="0"
        aria-selected={false}
        aria-expanded={expandedDirs.has(entry.path)}
      >
        <span class="tree-icon">{expandedDirs.has(entry.path) ? 'v' : '>'}</span>
        <span class="tree-name">{entry.name}</span>
      </div>
      {#if expandedDirs.has(entry.path) && entry.children}
        {@render treeNode(entry.children, depth + 1)}
      {/if}
    {:else}
      <div
        class="tree-item tree-file"
        class:active={currentFile === entry.path}
        style="padding-left: {depth * 16}px"
        onclick={() => onFileSelect(entry.path)}
        onkeydown={(e) => { if (e.key === 'Enter') onFileSelect(entry.path); }}
        role="treeitem"
        tabindex="0"
        aria-selected={currentFile === entry.path}
      >
        <span class="tree-icon">#</span>
        <span class="tree-name">{entry.name}</span>
      </div>
    {/if}
  {/each}
{/snippet}

<div class="filetree" role="tree">
  {#if fileTree.length === 0}
    <div class="empty-message">No folder open</div>
  {:else}
    {@render treeNode(fileTree, 0)}
  {/if}
</div>

<style>
  .filetree {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--bg-sidebar);
    user-select: none;
    -webkit-user-select: none;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tree-item:hover {
    background: var(--hover-bg);
  }

  .tree-item.active {
    background: var(--active-bg);
    color: var(--text-primary);
  }

  .tree-icon {
    flex-shrink: 0;
    width: 12px;
    font-size: 11px;
    font-family: monospace;
    color: var(--text-muted);
    text-align: center;
  }

  .tree-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tree-folder .tree-name {
    font-weight: 500;
  }

  .empty-message {
    padding: 16px 12px;
    color: var(--text-muted);
    font-size: 13px;
    text-align: center;
  }
</style>

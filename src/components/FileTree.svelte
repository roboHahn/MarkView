<script lang="ts">
  import type { FileEntry } from '$lib/types';

  interface Props {
    fileTree: FileEntry[];
    currentFile: string | null;
    onFileSelect: (path: string) => void;
    onRenameFile: (oldPath: string, newPath: string) => void;
    onDeleteFile: (path: string) => void;
    onCreateFile: (folderPath: string) => void;
  }

  let { fileTree, currentFile, onFileSelect, onRenameFile, onDeleteFile, onCreateFile }: Props = $props();

  let expandedDirs = $state(new Set<string>());
  let contextMenu = $state<{ x: number; y: number; type: 'file' | 'folder'; path: string } | null>(null);
  let renamingPath = $state<string | null>(null);

  function toggleDir(path: string) {
    if (expandedDirs.has(path)) {
      expandedDirs.delete(path);
    } else {
      expandedDirs.add(path);
    }
    // Trigger reactivity by reassigning
    expandedDirs = new Set(expandedDirs);
  }

  function handleContextMenu(e: MouseEvent, type: 'file' | 'folder', path: string) {
    e.preventDefault();
    contextMenu = { x: e.clientX, y: e.clientY, type, path };
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function handleRenameClick() {
    if (contextMenu) {
      renamingPath = contextMenu.path;
      contextMenu = null;
    }
  }

  function handleDeleteClick() {
    if (contextMenu) {
      onDeleteFile(contextMenu.path);
      contextMenu = null;
    }
  }

  function handleNewFileClick() {
    if (contextMenu) {
      onCreateFile(contextMenu.path);
      contextMenu = null;
    }
  }

  function getDirectory(filePath: string): string {
    const sep = filePath.includes('/') ? '/' : '\\';
    const lastSep = filePath.lastIndexOf(sep);
    return lastSep >= 0 ? filePath.substring(0, lastSep) : filePath;
  }

  function handleRenameKeydown(e: KeyboardEvent, oldPath: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename(e.currentTarget as HTMLInputElement, oldPath);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      renamingPath = null;
    }
  }

  function handleRenameBlur(e: FocusEvent, oldPath: string) {
    commitRename(e.currentTarget as HTMLInputElement, oldPath);
  }

  function commitRename(input: HTMLInputElement, oldPath: string) {
    const newName = input.value.trim();
    if (newName && renamingPath) {
      const dir = getDirectory(oldPath);
      const sep = oldPath.includes('/') ? '/' : '\\';
      const newPath = dir + sep + newName;
      if (newPath !== oldPath) {
        onRenameFile(oldPath, newPath);
      }
    }
    renamingPath = null;
  }
</script>

<svelte:document onclick={closeContextMenu} />

{#snippet treeNode(entries: FileEntry[], depth: number)}
  {#each entries as entry (entry.path)}
    {#if entry.is_directory}
      <div
        class="tree-item tree-folder"
        style="padding-left: {depth * 16}px"
        onclick={() => toggleDir(entry.path)}
        oncontextmenu={(e) => handleContextMenu(e, 'folder', entry.path)}
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
        oncontextmenu={(e) => handleContextMenu(e, 'file', entry.path)}
        onkeydown={(e) => { if (e.key === 'Enter') onFileSelect(entry.path); }}
        role="treeitem"
        tabindex="0"
        aria-selected={currentFile === entry.path}
      >
        <span class="tree-icon">#</span>
        {#if renamingPath === entry.path}
          <!-- svelte-ignore a11y_autofocus -->
          <input
            class="rename-input"
            type="text"
            value={entry.name}
            autofocus
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => handleRenameKeydown(e, entry.path)}
            onblur={(e) => handleRenameBlur(e, entry.path)}
          />
        {:else}
          <span class="tree-name">{entry.name}</span>
        {/if}
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

{#if contextMenu}
  <div
    class="context-menu"
    style="left: {contextMenu.x}px; top: {contextMenu.y}px"
    onclick={(e) => e.stopPropagation()}
  >
    {#if contextMenu.type === 'file'}
      <button class="context-menu-item" onclick={handleRenameClick}>Rename</button>
      <button class="context-menu-item context-menu-item--danger" onclick={handleDeleteClick}>Delete</button>
    {:else}
      <button class="context-menu-item" onclick={handleNewFileClick}>New File</button>
    {/if}
  </div>
{/if}

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

  .context-menu {
    position: fixed;
    z-index: 200;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 4px 0;
    min-width: 140px;
  }

  .context-menu-item {
    display: block;
    width: 100%;
    padding: 8px 14px;
    border: none;
    background: none;
    color: var(--text-primary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }

  .context-menu-item:hover {
    background: var(--hover-bg);
  }

  .context-menu-item--danger {
    color: var(--toast-error);
  }

  .rename-input {
    flex: 1;
    min-width: 0;
    padding: 1px 4px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    outline: none;
  }

  .rename-input:focus {
    border-color: var(--accent);
  }
</style>

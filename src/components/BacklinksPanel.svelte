<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';

  interface WikiLink {
    source_file: string;
    target: string;
    alias: string | null;
  }

  interface WikiScanResult {
    links: WikiLink[];
    files: string[];
  }

  interface Props {
    currentFile: string | null;
    currentFolder: string | null;
    onFileSelect: (path: string) => void;
  }

  let { currentFile, currentFolder, onFileSelect }: Props = $props();

  let backlinks = $state<{ file: string; name: string }[]>([]);
  let loading = $state(false);

  // Re-scan when file or folder changes
  $effect(() => {
    const file = currentFile;
    const folder = currentFolder;
    if (file && folder) {
      scanBacklinks(file, folder);
    } else {
      backlinks = [];
    }
  });

  async function scanBacklinks(file: string, folder: string) {
    loading = true;
    try {
      const result = await invoke<WikiScanResult>('scan_wiki_links', { folder });

      // Get current file's name without extension
      const currentName = (file.split(/[\\/]/).pop() ?? '').replace(/\.md$/i, '');

      // Find all files that have wiki links pointing to the current file
      const sources = new Set<string>();
      for (const link of result.links) {
        const target = link.target.toLowerCase().replace(/\s+/g, '-');
        if (
          target === currentName.toLowerCase() ||
          target === currentName.toLowerCase().replace(/\s+/g, '-')
        ) {
          if (link.source_file !== file) {
            sources.add(link.source_file);
          }
        }
      }

      backlinks = Array.from(sources).map(path => ({
        file: path,
        name: path.split(/[\\/]/).pop() ?? path,
      }));
    } catch {
      backlinks = [];
    } finally {
      loading = false;
    }
  }
</script>

<div class="backlinks-panel">
  <div class="backlinks-header">Backlinks</div>

  {#if !currentFile}
    <div class="empty">No file selected</div>
  {:else if loading}
    <div class="empty">Scanning...</div>
  {:else if backlinks.length === 0}
    <div class="empty">No backlinks found</div>
  {:else}
    <div class="backlinks-list">
      {#each backlinks as bl (bl.file)}
        <button class="backlink-item" onclick={() => onFileSelect(bl.file)}>
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 1h7l4 4v10a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z" />
          </svg>
          <span class="backlink-name">{bl.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .backlinks-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .backlinks-header {
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
  }

  .backlinks-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .backlink-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    border: none;
    background: none;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
  }

  .backlink-item:hover {
    background: var(--hover-bg);
  }

  .backlink-item svg {
    flex-shrink: 0;
    color: var(--text-muted);
  }

  .backlink-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty {
    padding: 20px 12px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }
</style>

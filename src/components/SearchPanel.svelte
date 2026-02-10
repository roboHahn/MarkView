<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';

  interface SearchResult {
    file_path: string;
    file_name: string;
    line_number: number;
    line_content: string;
    match_start: number;
    match_end: number;
  }

  interface Props {
    currentFolder: string | null;
    onFileSelect: (path: string) => void;
  }

  let { currentFolder, onFileSelect }: Props = $props();

  let query = $state('');
  let caseSensitive = $state(false);
  let results: SearchResult[] = $state([]);
  let isLoading = $state(false);
  let hasSearched = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined = $state(undefined);

  // Group results by file path
  let groupedResults = $derived.by(() => {
    const groups: Map<string, { fileName: string; items: SearchResult[] }> = new Map();
    for (const result of results) {
      let group = groups.get(result.file_path);
      if (!group) {
        group = { fileName: result.file_name, items: [] };
        groups.set(result.file_path, group);
      }
      group.items.push(result);
    }
    return groups;
  });

  function scheduleSearch() {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    if (!query.trim() || !currentFolder) {
      results = [];
      hasSearched = false;
      isLoading = false;
      return;
    }
    isLoading = true;
    debounceTimer = setTimeout(() => {
      performSearch();
    }, 500);
  }

  async function performSearch() {
    if (!query.trim() || !currentFolder) {
      results = [];
      hasSearched = false;
      isLoading = false;
      return;
    }
    isLoading = true;
    try {
      results = await invoke<SearchResult[]>('search_files', {
        folder: currentFolder,
        query: query.trim(),
        caseSensitive: caseSensitive,
      });
    } catch (err) {
      console.error('Search failed:', err);
      results = [];
    } finally {
      isLoading = false;
      hasSearched = true;
    }
  }

  // Re-trigger search when query or caseSensitive changes
  $effect(() => {
    // Access reactive dependencies
    query;
    caseSensitive;
    currentFolder;
    scheduleSearch();
  });

  function handleResultClick(filePath: string) {
    onFileSelect(filePath);
  }
</script>

<div class="search-panel">
  <div class="search-header">
    <input
      class="search-input"
      type="text"
      placeholder="Search in files..."
      bind:value={query}
    />
    <label class="case-toggle">
      <input
        type="checkbox"
        bind:checked={caseSensitive}
      />
      <span class="case-toggle-label">Aa</span>
    </label>
  </div>

  <div class="search-results">
    {#if isLoading}
      <div class="search-status">Searching...</div>
    {:else if !query.trim()}
      <div class="search-status">Type to search</div>
    {:else if hasSearched && results.length === 0}
      <div class="search-status">No results found</div>
    {:else}
      {#each [...groupedResults] as [filePath, group] (filePath)}
        <div class="result-group">
          <button
            class="result-file-header"
            onclick={() => handleResultClick(filePath)}
            type="button"
          >
            <span class="result-file-name">{group.fileName}</span>
            <span class="result-count">{group.items.length}</span>
          </button>
          {#each group.items as item ('' + item.line_number + ':' + item.match_start)}
            <button
              class="result-line"
              onclick={() => handleResultClick(item.file_path)}
              type="button"
            >
              <span class="line-number">{item.line_number}</span>
              <span class="line-content">{@html highlightMatch(item.line_content, item.match_start, item.match_end)}</span>
            </button>
          {/each}
        </div>
      {/each}
      {#if results.length >= 500}
        <div class="search-status">Results capped at 500</div>
      {/if}
    {/if}
  </div>
</div>

<script lang="ts" module>
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlightMatch(line: string, start: number, end: number): string {
    const before = escapeHtml(line.slice(0, start));
    const match = escapeHtml(line.slice(start, end));
    const after = escapeHtml(line.slice(end));
    return `${before}<mark class="search-match">${match}</mark>${after}`;
  }
</script>

<style>
  .search-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg-sidebar);
    user-select: none;
    -webkit-user-select: none;
  }

  .search-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    padding: 5px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s;
  }

  .search-input::placeholder {
    color: var(--text-muted);
  }

  .search-input:focus {
    border-color: var(--accent);
  }

  .case-toggle {
    display: flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
  }

  .case-toggle input[type="checkbox"] {
    display: none;
  }

  .case-toggle-label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 26px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
    font-family: monospace;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .case-toggle input[type="checkbox"]:checked + .case-toggle-label {
    background: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
  }

  .search-results {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .search-status {
    padding: 16px 12px;
    color: var(--text-muted);
    font-size: 13px;
    text-align: center;
  }

  .result-group {
    border-bottom: 1px solid var(--border);
  }

  .result-file-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 6px 8px;
    background: var(--bg-sidebar);
    border: none;
    cursor: pointer;
    position: sticky;
    top: 0;
    z-index: 1;
    text-align: left;
  }

  .result-file-header:hover {
    background: var(--hover-bg);
  }

  .result-file-name {
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-count {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--hover-bg);
    color: var(--text-muted);
    font-size: 11px;
  }

  .result-line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    padding: 2px 8px 2px 12px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text-secondary);
  }

  .result-line:hover {
    background: var(--hover-bg);
  }

  .line-number {
    flex-shrink: 0;
    min-width: 28px;
    color: var(--text-muted);
    font-size: 11px;
    font-family: monospace;
    text-align: right;
  }

  .line-content {
    font-size: 12px;
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .search-panel :global(.search-match) {
    color: var(--accent);
    font-weight: 700;
    background: none;
  }
</style>

<script lang="ts">
  interface Command {
    id: string;
    name: string;
    shortcut?: string;
    category: string;
  }

  interface Props {
    onExecute: (commandId: string) => void;
    onClose: () => void;
  }

  let { onExecute, onClose }: Props = $props();

  let search = $state('');
  let selectedIndex = $state(0);
  let inputEl: HTMLInputElement | undefined = $state(undefined);
  let listEl: HTMLDivElement | undefined = $state(undefined);

  const commands: Command[] = [
    // File
    { id: 'file.openFolder', name: 'Open Folder', shortcut: 'Ctrl+O', category: 'File' },
    { id: 'file.saveFile', name: 'Save File', shortcut: 'Ctrl+S', category: 'File' },
    { id: 'file.closeTab', name: 'Close Tab', category: 'File' },
    // Edit
    { id: 'edit.bold', name: 'Bold', shortcut: 'Ctrl+B', category: 'Edit' },
    { id: 'edit.italic', name: 'Italic', shortcut: 'Ctrl+I', category: 'Edit' },
    { id: 'edit.insertLink', name: 'Insert Link', category: 'Edit' },
    { id: 'edit.insertImage', name: 'Insert Image', category: 'Edit' },
    { id: 'edit.insertCodeBlock', name: 'Insert Code Block', category: 'Edit' },
    { id: 'edit.insertTable', name: 'Insert Table', category: 'Edit' },
    { id: 'edit.insertHorizontalRule', name: 'Insert Horizontal Rule', category: 'Edit' },
    // View
    { id: 'view.toggleSidebar', name: 'Toggle Sidebar', shortcut: 'Ctrl+B', category: 'View' },
    { id: 'view.toggleZenMode', name: 'Toggle Zen Mode', shortcut: 'F11', category: 'View' },
    { id: 'view.toggleTheme', name: 'Toggle Theme', shortcut: 'Ctrl+,', category: 'View' },
    { id: 'view.toggleFocusMode', name: 'Toggle Focus Mode', category: 'View' },
    // Search
    { id: 'search.searchInFiles', name: 'Search in Files', shortcut: 'Ctrl+Shift+F', category: 'Search' },
    { id: 'search.findInEditor', name: 'Find in Editor', shortcut: 'Ctrl+F', category: 'Search' },
    // Tools
    { id: 'tools.gitDiff', name: 'Git Diff', shortcut: 'Ctrl+D', category: 'Tools' },
    { id: 'tools.settings', name: 'Settings', category: 'Tools' },
    { id: 'tools.emojiPicker', name: 'Emoji Picker', category: 'Tools' },
    { id: 'tools.snippets', name: 'Snippets', category: 'Tools' },
    { id: 'tools.exportHtml', name: 'Export HTML', category: 'Tools' },
    { id: 'tools.printPdf', name: 'Print/PDF', category: 'Tools' },
    // Navigate
    { id: 'navigate.goToLine', name: 'Go to Line', category: 'Navigate' },
  ];

  /**
   * Simple fuzzy match: checks whether all characters in the pattern
   * appear in the target string in order (case-insensitive).
   * Returns a score (lower is better) or -1 if no match.
   */
  function fuzzyMatch(pattern: string, target: string): number {
    const p = pattern.toLowerCase();
    const t = target.toLowerCase();

    if (p.length === 0) return 0;

    let pi = 0;
    let score = 0;
    let lastMatchIndex = -1;

    for (let ti = 0; ti < t.length && pi < p.length; ti++) {
      if (t[ti] === p[pi]) {
        // Bonus for consecutive matches
        if (lastMatchIndex !== -1 && ti === lastMatchIndex + 1) {
          score -= 1;
        }
        // Bonus for matching at start of word
        if (ti === 0 || t[ti - 1] === ' ') {
          score -= 2;
        }
        score += ti; // Prefer earlier matches
        lastMatchIndex = ti;
        pi++;
      }
    }

    // All pattern characters matched
    if (pi === p.length) return score;
    return -1;
  }

  let filtered = $derived.by(() => {
    const query = search.trim();
    if (query === '') return commands;

    const scored: { command: Command; score: number }[] = [];
    for (const command of commands) {
      // Match against command name and category
      const nameScore = fuzzyMatch(query, command.name);
      const catScore = fuzzyMatch(query, command.category + ' ' + command.name);
      const bestScore = nameScore >= 0 && catScore >= 0
        ? Math.min(nameScore, catScore)
        : nameScore >= 0 ? nameScore : catScore;

      if (bestScore >= 0) {
        scored.push({ command, score: bestScore });
      }
    }

    scored.sort((a, b) => a.score - b.score);
    return scored.map((s) => s.command);
  });

  // Reset selection when filter changes
  $effect(() => {
    filtered;
    selectedIndex = 0;
  });

  // Auto-focus the input when mounted
  $effect(() => {
    if (inputEl) {
      inputEl.focus();
    }
  });

  // Scroll selected item into view
  $effect(() => {
    if (!listEl) return;
    const selected = listEl.querySelector('.command-row.selected') as HTMLElement | null;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (filtered.length > 0) {
          selectedIndex = (selectedIndex + 1) % filtered.length;
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (filtered.length > 0) {
          selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (filtered.length > 0 && selectedIndex < filtered.length) {
          executeCommand(filtered[selectedIndex].id);
        }
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  }

  function executeCommand(commandId: string) {
    onExecute(commandId);
    onClose();
  }

  function handleOverlayClick() {
    onClose();
  }

  function handlePaletteClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="command-palette-overlay" onclick={handleOverlayClick}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="command-palette" onclick={handlePaletteClick}>
    <div class="command-search">
      <svg class="search-icon" viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="6.5" cy="6.5" r="5" />
        <line x1="10" y1="10" x2="15" y2="15" />
      </svg>
      <input
        bind:this={inputEl}
        type="text"
        placeholder="Type a command..."
        bind:value={search}
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    <div class="command-list" bind:this={listEl}>
      {#if filtered.length === 0}
        <div class="command-empty">No matching commands</div>
      {:else}
        {#each filtered as command, i (command.id)}
          <button
            class="command-row"
            class:selected={i === selectedIndex}
            onmouseenter={() => { selectedIndex = i; }}
            onclick={() => executeCommand(command.id)}
            type="button"
          >
            <span class="command-category">{command.category}</span>
            <span class="command-name">{command.name}</span>
            {#if command.shortcut}
              <span class="command-shortcut">
                {#each command.shortcut.split('+') as key, k}
                  {#if k > 0}<span class="shortcut-separator">+</span>{/if}
                  <kbd>{key}</kbd>
                {/each}
              </span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .command-palette-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 20vh;
    animation: overlay-fade-in 0.12s ease-out;
  }

  @keyframes overlay-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes palette-slide-in {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .command-palette {
    width: 90vw;
    max-width: 600px;
    max-height: 400px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: palette-slide-in 0.15s ease-out;
  }

  .command-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-toolbar);
    flex-shrink: 0;
  }

  .search-icon {
    flex-shrink: 0;
    color: var(--text-muted);
  }

  .command-search input {
    flex: 1;
    padding: 6px 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
    line-height: 1.4;
  }

  .command-search input::placeholder {
    color: var(--text-muted);
  }

  .command-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .command-list::-webkit-scrollbar {
    width: 6px;
  }

  .command-list::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }

  .command-list::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
  }

  .command-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 14px;
    border: none;
    background: none;
    color: var(--text-primary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background 0.06s;
  }

  .command-row:hover {
    background: var(--hover-bg);
  }

  .command-row.selected {
    background: var(--accent);
    color: #ffffff;
  }

  .command-category {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    font-weight: 600;
    color: var(--text-muted);
    min-width: 58px;
    flex-shrink: 0;
  }

  .command-row.selected .command-category {
    color: rgba(255, 255, 255, 0.7);
  }

  .command-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .command-shortcut {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .command-shortcut kbd {
    display: inline-block;
    padding: 1px 5px;
    font-size: 11px;
    font-family: inherit;
    line-height: 1.4;
    color: var(--text-secondary);
    background: var(--bg-toolbar);
    border: 1px solid var(--border);
    border-radius: 3px;
  }

  .command-row.selected .command-shortcut kbd {
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .shortcut-separator {
    color: var(--text-muted);
    font-size: 10px;
    margin: 0 1px;
  }

  .command-row.selected .shortcut-separator {
    color: rgba(255, 255, 255, 0.5);
  }

  .command-empty {
    padding: 24px 14px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }
</style>

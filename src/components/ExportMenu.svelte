<script lang="ts">
  import { exportToHtml, printDocument } from '$lib/export';

  interface Props {
    content: string;
    currentFile: string | null;
    theme: 'dark' | 'light';
  }

  let { content, currentFile, theme }: Props = $props();

  let isOpen = $state(false);

  let fileName = $derived(
    currentFile ? currentFile.split(/[\\/]/).pop() ?? 'document.md' : 'document.md'
  );

  let isDisabled = $derived(!currentFile);

  function toggleMenu() {
    if (isDisabled) return;
    isOpen = !isOpen;
  }

  function closeMenu() {
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.export-menu')) {
      closeMenu();
    }
  }

  async function handleExportHtml() {
    closeMenu();
    try {
      await exportToHtml(content, fileName, theme);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }

  function handlePrint() {
    closeMenu();
    printDocument();
  }
</script>

<svelte:document onclick={handleClickOutside} />

<div class="export-menu">
  <button
    class="export-btn"
    onclick={toggleMenu}
    disabled={isDisabled}
  >
    Export
  </button>

  {#if isOpen}
    <div class="export-dropdown">
      <button class="export-dropdown-item" onclick={handleExportHtml}>
        Export as HTML
      </button>
      <button class="export-dropdown-item" onclick={handlePrint}>
        Print / Save as PDF
      </button>
    </div>
  {/if}
</div>

<style>
  .export-menu {
    position: relative;
  }

  .export-btn {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .export-btn:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .export-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .export-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 180px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    overflow: hidden;
  }

  .export-dropdown-item {
    display: block;
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

  .export-dropdown-item:hover {
    background: var(--hover-bg);
  }
</style>

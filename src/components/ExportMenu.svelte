<script lang="ts">
  import { exportToHtml, printDocument } from '$lib/export';
  import { exportToDocx } from '$lib/docx-export';

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

  async function handleExportDocx() {
    closeMenu();
    try {
      await exportToDocx(content, fileName);
    } catch (err) {
      console.error('DOCX export failed:', err);
    }
  }
</script>

<svelte:document onclick={handleClickOutside} />

<div class="export-menu">
  <button
    class="export-btn"
    onclick={toggleMenu}
    disabled={isDisabled}
  >
    <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 2v8" />
      <path d="M4 7l4 4 4-4" />
      <path d="M2 13h12" />
    </svg>
    <span>Export</span>
  </button>

  {#if isOpen}
    <div class="export-dropdown">
      <button class="export-dropdown-item" onclick={handleExportHtml}>
        <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 4 1 8 4 12" />
          <polyline points="12 4 15 8 12 12" />
          <line x1="10" y1="3" x2="6" y2="13" />
        </svg>
        <span>Export as HTML</span>
      </button>
      <button class="export-dropdown-item" onclick={handlePrint}>
        <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 5 4 1 12 1 12 5" />
          <rect x="1" y="5" width="14" height="7" rx="1" />
          <rect x="4" y="10" width="8" height="5" />
        </svg>
        <span>Print / Save as PDF</span>
      </button>
      <button class="export-dropdown-item" onclick={handleExportDocx}>
        <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 1h8l3 3v9a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2z" />
          <path d="M5 9h6" />
          <path d="M5 12h4" />
        </svg>
        <span>Export as DOCX</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .export-menu {
    position: relative;
  }

  .export-btn {
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
    min-width: 200px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    overflow: hidden;
  }

  .export-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
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

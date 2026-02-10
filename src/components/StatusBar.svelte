<script lang="ts">
  import type { Theme } from '$lib/theme';

  interface Props {
    currentFile: string | null;
    content: string;
    theme: Theme;
    onToggleTheme: () => void;
  }

  let { currentFile, content, theme, onToggleTheme }: Props = $props();

  let wordCount = $derived(
    content.trim() === '' ? 0 : content.trim().split(/\s+/).length
  );

  let charCount = $derived(content.length);
</script>

<div class="statusbar">
  <div class="statusbar-left">
    <span class="file-path">
      {currentFile ?? 'No file open'}
    </span>
  </div>
  <div class="statusbar-center">
    <span>{wordCount} words</span>
    <span class="separator">|</span>
    <span>{charCount} chars</span>
  </div>
  <div class="statusbar-right">
    <button class="theme-toggle" onclick={onToggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      {#if theme === 'dark'}
        <!-- Sun icon: switch to light -->
        <svg viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2">
          <circle cx="8" cy="8" r="3" />
          <line x1="8" y1="1" x2="8" y2="3" />
          <line x1="8" y1="13" x2="8" y2="15" />
          <line x1="1" y1="8" x2="3" y2="8" />
          <line x1="13" y1="8" x2="15" y2="8" />
          <line x1="3.05" y1="3.05" x2="4.46" y2="4.46" />
          <line x1="11.54" y1="11.54" x2="12.95" y2="12.95" />
          <line x1="3.05" y1="12.95" x2="4.46" y2="11.54" />
          <line x1="11.54" y1="4.46" x2="12.95" y2="3.05" />
        </svg>
      {:else}
        <!-- Moon icon: switch to dark -->
        <svg viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2">
          <path d="M13.5 8.5a5.5 5.5 0 1 1-7-7 4.5 4.5 0 0 0 7 7z" />
        </svg>
      {/if}
    </button>
  </div>
</div>

<style>
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    height: 24px;
    background: var(--bg-statusbar);
    border-top: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-muted);
    user-select: none;
    -webkit-user-select: none;
  }

  .statusbar-left {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-path {
    color: var(--text-muted);
  }

  .statusbar-center {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .separator {
    opacity: 0.4;
  }

  .statusbar-right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
  }

  .theme-toggle {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 12px;
    cursor: pointer;
    padding: 0 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .theme-toggle:hover {
    color: var(--accent-hover);
    opacity: 0.8;
  }
</style>

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
    <button class="theme-toggle" onclick={onToggleTheme}>
      {theme === 'dark' ? 'Light' : 'Dark'}
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
  }

  .theme-toggle:hover {
    color: var(--accent-hover);
    text-decoration: underline;
  }
</style>

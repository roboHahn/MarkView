<script lang="ts">
  import { themes, type ThemeDefinition } from '$lib/themes';

  interface Props {
    currentThemeId: string;
    onSelect: (themeId: string) => void;
    onClose: () => void;
  }

  let { currentThemeId, onSelect, onClose }: Props = $props();

  /** The five representative swatches shown for each theme card. */
  function swatches(t: ThemeDefinition): string[] {
    return [
      t.colors['--bg-primary'],
      t.colors['--bg-editor'],
      t.colors['--accent'],
      t.colors['--text-primary'],
      t.colors['--error'],
    ];
  }

  function handleSelect(id: string) {
    onSelect(id);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  function handleOverlayClick() {
    onClose();
  }

  function handleModalClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={handleOverlayClick}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal" onclick={handleModalClick}>
    <div class="topbar">
      <span class="topbar-title">Choose Theme</span>
      <button class="btn" onclick={onClose}>Close</button>
    </div>

    <div class="theme-grid">
      {#each themes as theme (theme.id)}
        <button
          class="theme-card"
          class:active={currentThemeId === theme.id}
          onclick={() => handleSelect(theme.id)}
        >
          <div class="theme-swatches">
            {#each swatches(theme) as color}
              <span class="swatch" style="background:{color}"></span>
            {/each}
          </div>
          <span class="theme-name">{theme.name}</span>
          <span class="theme-type">{theme.type}</span>
          {#if currentThemeId === theme.id}
            <span class="active-badge">Active</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    width: 90vw;
    max-width: 560px;
    background: var(--bg-primary);
    border-radius: 8px;
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    min-height: 44px;
    padding: 0 12px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    user-select: none;
    -webkit-user-select: none;
  }

  .topbar-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .btn {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .btn:hover {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 16px;
    max-height: 420px;
    overflow-y: auto;
  }

  .theme-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    border: 2px solid var(--border);
    border-radius: 8px;
    background: var(--bg-editor);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    text-align: left;
    font-family: inherit;
  }

  .theme-card:hover {
    border-color: var(--accent);
    background: var(--hover-bg);
  }

  .theme-card.active {
    border-color: var(--accent);
    background: var(--active-bg);
  }

  .theme-swatches {
    display: flex;
    gap: 5px;
  }

  .swatch {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid rgba(128, 128, 128, 0.3);
    flex-shrink: 0;
  }

  .theme-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1;
  }

  .theme-type {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1;
  }

  .active-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--accent);
    line-height: 1;
  }

  .theme-grid::-webkit-scrollbar {
    width: 6px;
  }

  .theme-grid::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }

  .theme-grid::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
  }
</style>

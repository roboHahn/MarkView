<script lang="ts">
  import { pluginManager } from '$lib/plugins.svelte';

  interface Props {
    onClose: () => void;
    theme: 'dark' | 'light';
  }

  let { onClose, theme }: Props = $props();

  let plugins = $derived(pluginManager.plugins);

  function handleToggle(id: string) {
    pluginManager.toggle(id);
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
      <span class="topbar-title">Plugins</span>
      <button class="btn" onclick={onClose}>Close</button>
    </div>

    <div class="plugin-body">
      {#if plugins.length === 0}
        <div class="empty-state">
          <p class="empty-title">No plugins installed</p>
          <p class="empty-desc">Plugins extend MarkView with additional Markdown processing, editor features, and custom commands.</p>
        </div>
      {:else}
        {#each plugins as plugin (plugin.id)}
          <div class="plugin-row">
            <div class="plugin-info">
              <div class="plugin-header">
                <span class="plugin-name">{plugin.name}</span>
                <span class="plugin-version">v{plugin.version}</span>
              </div>
              <p class="plugin-desc">{plugin.description}</p>
            </div>
            <button
              class="toggle"
              class:active={plugin.enabled}
              onclick={() => handleToggle(plugin.id)}
              role="switch"
              aria-checked={plugin.enabled}
              title={plugin.enabled ? 'Disable plugin' : 'Enable plugin'}
            >
              <span class="toggle-knob"></span>
            </button>
          </div>
        {/each}
      {/if}
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
    max-width: 520px;
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

  .plugin-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 0;
    max-height: 420px;
    overflow-y: auto;
  }

  .empty-state {
    text-align: center;
    padding: 24px 16px;
  }

  .empty-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 6px;
  }

  .empty-desc {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.5;
  }

  .plugin-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }

  .plugin-row:last-child {
    border-bottom: none;
  }

  .plugin-info {
    flex: 1;
    min-width: 0;
  }

  .plugin-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 3px;
  }

  .plugin-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .plugin-version {
    font-size: 11px;
    color: var(--text-muted);
  }

  .plugin-desc {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Toggle — matches SettingsPanel toggle */
  .toggle {
    position: relative;
    width: 40px;
    height: 22px;
    border-radius: 11px;
    border: 1px solid var(--border);
    background: var(--bg-editor);
    cursor: pointer;
    padding: 0;
    transition: background 0.2s, border-color 0.2s;
    flex-shrink: 0;
  }

  .toggle.active {
    background: var(--accent);
    border-color: var(--accent);
  }

  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-secondary);
    transition: transform 0.2s, background 0.2s;
  }

  .toggle.active .toggle-knob {
    transform: translateX(18px);
    background: var(--bg-primary);
  }

  .plugin-body::-webkit-scrollbar {
    width: 6px;
  }

  .plugin-body::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }

  .plugin-body::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
  }
</style>

<script lang="ts">
  import { fly } from 'svelte/transition';
  import { toastManager } from '$lib/toast.svelte';

  function icon(type: string): string {
    if (type === 'success') return '\u2713';
    if (type === 'error') return '\u2717';
    return '\u2139';
  }
</script>

{#if toastManager.toasts.length > 0}
  <div class="toast-container">
    {#each toastManager.toasts as toast (toast.id)}
      <div
        class="toast toast-{toast.type}"
        role="alert"
        transition:fly={{ x: 300, duration: 200 }}
      >
        <span class="toast-icon">{icon(toast.type)}</span>
        <span class="toast-message">{toast.message}</span>
        <button
          class="toast-close"
          onclick={() => toastManager.remove(toast.id)}
          aria-label="Close notification"
        >
          &times;
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 360px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 6px;
    background: var(--toast-bg);
    color: var(--text-primary);
    font-size: 13px;
    line-height: 1.4;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    border-left: 3px solid transparent;
  }

  .toast-success {
    border-left-color: var(--toast-success);
  }

  .toast-error {
    border-left-color: var(--toast-error);
  }

  .toast-info {
    border-left-color: var(--accent);
  }

  .toast-icon {
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 700;
  }

  .toast-success .toast-icon {
    color: var(--toast-success);
  }

  .toast-error .toast-icon {
    color: var(--toast-error);
  }

  .toast-info .toast-icon {
    color: var(--accent);
  }

  .toast-message {
    flex: 1;
    min-width: 0;
    word-break: break-word;
  }

  .toast-close {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: 0 2px;
    transition: color 0.15s;
  }

  .toast-close:hover {
    color: var(--text-primary);
  }
</style>

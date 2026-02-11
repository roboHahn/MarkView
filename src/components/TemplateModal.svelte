<script lang="ts">
  import { templateManager, type Template } from '$lib/templates';

  interface Props {
    onSelect: (content: string) => void;
    onSaveTemplate: (name: string) => void;
    onClose: () => void;
  }

  let { onSelect, onSaveTemplate, onClose }: Props = $props();

  let templates = $state(templateManager.getAll());
  let saveTemplateName = $state('');

  function handleSelect(template: Template) {
    onSelect(template.content);
  }

  function handleSave() {
    const name = saveTemplateName.trim();
    if (!name) return;
    onSaveTemplate(name);
    saveTemplateName = '';
    templates = templateManager.getAll();
  }

  function handleDelete(id: string) {
    templateManager.deleteCustom(id);
    templates = templateManager.getAll();
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
      <span class="topbar-title">New from Template</span>
      <button class="btn" onclick={onClose}>Close</button>
    </div>

    <div class="template-grid">
      {#each templates as template (template.id)}
        <button class="template-card" onclick={() => handleSelect(template)}>
          <span class="template-icon">{template.icon}</span>
          <span class="template-name">{template.name}</span>
          <span class="template-desc">{template.description}</span>
          {#if !template.isBuiltIn}
            <button
              class="delete-btn"
              onclick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
              title="Delete template"
            >&times;</button>
          {/if}
        </button>
      {/each}
    </div>

    <div class="save-section">
      <span class="save-label">Save current file as template:</span>
      <div class="save-row">
        <input
          type="text"
          class="save-input"
          placeholder="Template name..."
          bind:value={saveTemplateName}
          onkeydown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
        <button class="btn btn-accent" onclick={handleSave} disabled={!saveTemplateName.trim()}>
          Save
        </button>
      </div>
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
    max-width: 600px;
    max-height: 80vh;
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

  .btn:hover { background: var(--hover-bg); border-color: var(--accent); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-accent { background: var(--accent); color: #fff; border-color: var(--accent); }
  .btn-accent:hover { opacity: 0.9; }

  .template-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 16px;
    overflow-y: auto;
    flex: 1;
  }

  .template-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-primary);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    text-align: center;
    color: var(--text-primary);
    font-size: 13px;
  }

  .template-card:hover {
    border-color: var(--accent);
    background: var(--hover-bg);
  }

  .template-icon { font-size: 28px; }
  .template-name { font-weight: 600; font-size: 13px; }
  .template-desc { font-size: 11px; color: var(--text-muted); }

  .delete-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    background: var(--border);
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn:hover { background: #e53e3e; color: #fff; }

  .save-section {
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    background: var(--bg-toolbar);
  }

  .save-label {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 6px;
    display: block;
  }

  .save-row {
    display: flex;
    gap: 8px;
  }

  .save-input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-editor, var(--bg-primary));
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
  }

  .save-input:focus { border-color: var(--accent); }
</style>

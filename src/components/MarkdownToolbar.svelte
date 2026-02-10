<script lang="ts">
  interface Props {
    onInsert: (type: string) => void;
  }

  let { onInsert }: Props = $props();
</script>

<div class="md-toolbar">
  <div class="btn-group">
    <button class="md-btn bold" onclick={() => onInsert('bold')} title="Bold">B</button>
    <button class="md-btn italic" onclick={() => onInsert('italic')} title="Italic">I</button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn" onclick={() => onInsert('heading')} title="Heading">H</button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn" onclick={() => onInsert('link')} title="Link">Link</button>
    <button class="md-btn" onclick={() => onInsert('image')} title="Image">Image</button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn mono" onclick={() => onInsert('code')} title="Inline Code">Code</button>
    <button class="md-btn mono" onclick={() => onInsert('codeblock')} title="Code Block">```</button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn" onclick={() => onInsert('list')} title="Bullet List">List</button>
    <button class="md-btn mono" onclick={() => onInsert('orderedlist')} title="Ordered List">1.</button>
    <button class="md-btn" onclick={() => onInsert('quote')} title="Blockquote">Quote</button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn mono" onclick={() => onInsert('hr')} title="Horizontal Rule">---</button>
  </div>
</div>

<style>
  .md-toolbar {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 8px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    user-select: none;
    -webkit-user-select: none;
    gap: 2px;
  }

  .btn-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .separator {
    color: var(--border);
    font-size: 14px;
    margin: 0 4px;
    pointer-events: none;
  }

  .md-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }

  .md-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .md-btn:active {
    background: var(--active-bg);
  }

  .md-btn.bold {
    font-weight: 700;
  }

  .md-btn.italic {
    font-style: italic;
  }

  .md-btn.mono {
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
    font-size: 12px;
  }
</style>

<script lang="ts">
  interface Props {
    onInsert: (type: string) => void;
  }

  let { onInsert }: Props = $props();
</script>

<div class="md-toolbar">
  <div class="btn-group">
    <button class="md-btn" onclick={() => onInsert('undo')} title="Undo (Ctrl+Z)">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h7a4 4 0 0 1 0 8H8" />
        <polyline points="6 3 3 6 6 9" />
      </svg>
    </button>
    <button class="md-btn" onclick={() => onInsert('redo')} title="Redo (Ctrl+Shift+Z)">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 6H6a4 4 0 0 0 0 8h2" />
        <polyline points="10 3 13 6 10 9" />
      </svg>
    </button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn" onclick={() => onInsert('bold')} title="Bold">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 2.5h5a3.25 3.25 0 0 1 0 5.5H4V2.5Z" />
        <path d="M4 8h5.5a3.5 3.5 0 0 1 0 5.5H4V8Z" />
        <line x1="4" y1="2.5" x2="4" y2="13.5" />
      </svg>
    </button>
    <button class="md-btn" onclick={() => onInsert('italic')} title="Italic">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="10" y1="2.5" x2="6" y2="13.5" />
        <line x1="6.5" y1="2.5" x2="11.5" y2="2.5" />
        <line x1="4.5" y1="13.5" x2="9.5" y2="13.5" />
      </svg>
    </button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn" onclick={() => onInsert('heading')} title="Heading">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="2.5" x2="3" y2="13.5" />
        <line x1="13" y1="2.5" x2="13" y2="13.5" />
        <line x1="3" y1="8" x2="13" y2="8" />
      </svg>
    </button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn" onclick={() => onInsert('link')} title="Link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.536 3.536 0 0 0-5-5l-1 1" />
        <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.536 3.536 0 0 0 5 5l1-1" />
      </svg>
    </button>
    <button class="md-btn" onclick={() => onInsert('image')} title="Image">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
        <circle cx="5.5" cy="6" r="1.25" />
        <path d="M14.5 10.5l-3.5-3.5-6 6" />
      </svg>
    </button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn" onclick={() => onInsert('code')} title="Inline Code">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="5 4.5 1.5 8 5 11.5" />
        <polyline points="11 4.5 14.5 8 11 11.5" />
        <line x1="9.5" y1="2.5" x2="6.5" y2="13.5" />
      </svg>
    </button>
    <button class="md-btn" onclick={() => onInsert('codeblock')} title="Code Block">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5.5 2.5a2 2 0 0 0-2 2v1.75a1.75 1.75 0 0 1-1.75 1.75 1.75 1.75 0 0 1 1.75 1.75v1.75a2 2 0 0 0 2 2" />
        <path d="M10.5 2.5a2 2 0 0 1 2 2v1.75A1.75 1.75 0 0 0 14.25 8a1.75 1.75 0 0 0-1.75 1.75v1.75a2 2 0 0 1-2 2" />
      </svg>
    </button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn" onclick={() => onInsert('list')} title="Bullet List">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="3" cy="4" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="3" cy="8" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="3" cy="12" r="0.75" fill="currentColor" stroke="none" />
        <line x1="6.5" y1="4" x2="14" y2="4" />
        <line x1="6.5" y1="8" x2="14" y2="8" />
        <line x1="6.5" y1="12" x2="14" y2="12" />
      </svg>
    </button>
    <button class="md-btn" onclick={() => onInsert('orderedlist')} title="Ordered List">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <text x="1.5" y="5.5" fill="currentColor" stroke="none" font-size="5" font-family="sans-serif">1</text>
        <text x="1.5" y="9.5" fill="currentColor" stroke="none" font-size="5" font-family="sans-serif">2</text>
        <text x="1.5" y="13.5" fill="currentColor" stroke="none" font-size="5" font-family="sans-serif">3</text>
        <line x1="6.5" y1="4" x2="14" y2="4" />
        <line x1="6.5" y1="8" x2="14" y2="8" />
        <line x1="6.5" y1="12" x2="14" y2="12" />
      </svg>
    </button>
    <button class="md-btn" onclick={() => onInsert('quote')} title="Blockquote">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="3" x2="3" y2="13" />
        <line x1="7" y1="4.5" x2="13.5" y2="4.5" />
        <line x1="7" y1="8" x2="13.5" y2="8" />
        <line x1="7" y1="11.5" x2="11" y2="11.5" />
      </svg>
    </button>
  </div>
  <span class="separator">|</span>
  <div class="btn-group">
    <button class="md-btn" onclick={() => onInsert('hr')} title="Horizontal Rule">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="2" y1="8" x2="14" y2="8" />
        <line x1="5" y1="5" x2="5" y2="11" />
        <line x1="11" y1="5" x2="11" y2="11" />
      </svg>
    </button>
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
    padding: 0 4px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .md-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .md-btn:active {
    background: var(--active-bg);
  }
</style>

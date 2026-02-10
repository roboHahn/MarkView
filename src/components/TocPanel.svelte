<script lang="ts">
  interface Heading {
    level: number;
    text: string;
    line: number;
  }

  interface Props {
    content: string;
    onNavigate: (line: number) => void;
  }

  let { content, onNavigate }: Props = $props();

  let headings: Heading[] = $derived.by(() => {
    const result: Heading[] = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        result.push({
          level: match[1].length,
          text: match[2].replace(/\s+#+\s*$/, '').trim(),
          line: i + 1,
        });
      }
    }
    return result;
  });
</script>

<div class="toc-panel">
  {#if headings.length === 0}
    <div class="toc-empty">No headings</div>
  {:else}
    <ul class="toc-list">
      {#each headings as heading (heading.line)}
        <li>
          <button
            class="toc-item"
            class:h1={heading.level === 1}
            class:h2={heading.level === 2}
            class:h-deep={heading.level >= 3}
            style="padding-left: {8 + (heading.level - 1) * 16}px"
            onclick={() => onNavigate(heading.line)}
          >
            {heading.text}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .toc-panel {
    height: 100%;
    overflow-y: auto;
    background: var(--bg-sidebar);
  }

  .toc-empty {
    padding: 16px;
    color: var(--text-muted);
    font-size: 13px;
    text-align: center;
  }

  .toc-list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
  }

  .toc-item {
    display: block;
    width: 100%;
    padding: 4px 8px;
    border: none;
    border-left: 2px solid transparent;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 400;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .toc-item:hover {
    background: var(--hover-bg);
    border-left-color: var(--accent);
  }

  .toc-item.h1 {
    font-weight: 600;
    color: var(--text-primary);
  }

  .toc-item.h2 {
    font-weight: 500;
    color: var(--text-primary);
  }

  .toc-item.h-deep {
    font-weight: 400;
    color: var(--text-secondary);
  }
</style>

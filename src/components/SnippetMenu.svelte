<script lang="ts">
  interface Props {
    onInsert: (snippet: string) => void;
    onClose: () => void;
  }

  let { onInsert, onClose }: Props = $props();

  let listening = $state(false);

  // Delay click-outside activation so the opening click doesn't immediately close us
  $effect(() => {
    const frame = requestAnimationFrame(() => { listening = true; });
    return () => { cancelAnimationFrame(frame); listening = false; };
  });

  const snippets = [
    { name: 'Table', icon: '\u229E', template: '| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n' },
    { name: 'Checklist', icon: '\u2611', template: '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n' },
    { name: 'Frontmatter', icon: '---', template: '---\ntitle: \ndate: \ntags: []\n---\n\n' },
    { name: 'Collapsible', icon: '\u25B6', template: '<details>\n<summary>Click to expand</summary>\n\nContent here...\n\n</details>\n' },
    { name: 'Alert/Note', icon: '\uD83D\uDCA1', template: '> [!NOTE]\n> This is a note\n' },
    { name: 'Code Block', icon: '{ }', template: '```language\n// code here\n```\n' },
    { name: 'Image with Caption', icon: '\uD83D\uDDBC', template: '<figure>\n\n![Alt text](url)\n\n<figcaption>Caption</figcaption>\n</figure>\n' },
    { name: 'Footnote', icon: '\u00B9', template: 'Text with footnote[^1].\n\n[^1]: Footnote content.\n' },
  ];

  function handleInsert(template: string) {
    onInsert(template);
    onClose();
  }

  function handleClickOutside(event: MouseEvent) {
    if (!listening) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.snippet-menu')) {
      onClose();
    }
  }
</script>

<svelte:document onclick={handleClickOutside} />

<div class="snippet-menu">
  <div class="snippet-dropdown">
    {#each snippets as snippet}
      <button
        class="snippet-item"
        onclick={() => handleInsert(snippet.template)}
      >
        <span class="snippet-icon">{snippet.icon}</span>
        <span class="snippet-name">{snippet.name}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .snippet-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 200;
  }

  .snippet-dropdown {
    min-width: 200px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  .snippet-item {
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

  .snippet-item:hover {
    background: var(--hover-bg);
  }

  .snippet-icon {
    width: 24px;
    text-align: center;
    flex-shrink: 0;
    font-size: 14px;
  }

  .snippet-name {
    white-space: nowrap;
  }
</style>

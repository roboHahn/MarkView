<script lang="ts">
  interface Props {
    onSelect: (emoji: string) => void;
    onClose: () => void;
  }

  let { onSelect, onClose }: Props = $props();

  let search = $state('');
  let listening = $state(false);

  // Delay click-outside activation so the opening click doesn't immediately close us
  $effect(() => {
    const frame = requestAnimationFrame(() => { listening = true; });
    return () => { cancelAnimationFrame(frame); listening = false; };
  });

  const emojiData = [
    { category: 'Smileys', emojis: ['😀','😂','🤣','😊','😍','🤔','😎','😢','😡','🥳','😴','🤯','🥰','😇','🤩'] },
    { category: 'Hands', emojis: ['👍','👎','👋','🤝','👏','🙌','💪','✌️','🤞','👌'] },
    { category: 'Hearts', emojis: ['❤️','💙','💚','💛','💜','🖤','💔','💕','💖','💗'] },
    { category: 'Animals', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯'] },
    { category: 'Food', emojis: ['🍎','🍕','🍔','🌮','🍣','🍩','☕','🍺','🥗','🍰'] },
    { category: 'Objects', emojis: ['⭐','🔥','💡','📝','📌','🎯','🚀','💻','📱','🔑','⚡','🎉','✅','❌','⚠️'] },
    { category: 'Symbols', emojis: ['💯','♻️','🔒','🔓','🎵','💬','👁️','🏳️','🔔','💤'] },
    { category: 'Arrows', emojis: ['➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','🔄','🔀'] },
  ];

  let filteredData = $derived(
    search.trim() === ''
      ? emojiData
      : emojiData.filter((cat) =>
          cat.category.toLowerCase().includes(search.trim().toLowerCase())
        )
  );

  function handleSelect(emoji: string) {
    onSelect(emoji);
    onClose();
  }

  function handleClickOutside(event: MouseEvent) {
    if (!listening) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-picker')) {
      onClose();
    }
  }

  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:document onclick={handleClickOutside} />

<div class="emoji-picker">
  <div class="emoji-search">
    <input
      type="text"
      placeholder="Search categories..."
      bind:value={search}
      onkeydown={handleSearchKeydown}
    />
  </div>

  <div class="emoji-grid-container">
    {#each filteredData as category}
      <div class="emoji-category">
        <div class="emoji-category-header">{category.category}</div>
        <div class="emoji-grid">
          {#each category.emojis as emoji}
            <button
              class="emoji-btn"
              onclick={() => handleSelect(emoji)}
              title={emoji}
            >
              {emoji}
            </button>
          {/each}
        </div>
      </div>
    {/each}

    {#if filteredData.length === 0}
      <div class="emoji-empty">No matching categories</div>
    {/if}
  </div>
</div>

<style>
  .emoji-picker {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    max-width: 320px;
    max-height: 350px;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    z-index: 200;
    overflow: hidden;
  }

  .emoji-search {
    padding: 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .emoji-search input {
    width: 100%;
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-editor);
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }

  .emoji-search input::placeholder {
    color: var(--text-muted);
  }

  .emoji-search input:focus {
    border-color: var(--accent);
  }

  .emoji-grid-container {
    overflow-y: auto;
    flex: 1;
    padding: 4px;
  }

  .emoji-category {
    margin-bottom: 4px;
  }

  .emoji-category-header {
    font-size: 11px;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 4px 8px;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    padding: 0 4px;
  }

  .emoji-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    font-size: 20px;
    cursor: pointer;
    border-radius: 4px;
    padding: 0;
    transition: background 0.1s;
    line-height: 1;
  }

  .emoji-btn:hover {
    background: var(--hover-bg);
  }

  .emoji-empty {
    padding: 16px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }

  .emoji-grid-container::-webkit-scrollbar {
    width: 6px;
  }

  .emoji-grid-container::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }

  .emoji-grid-container::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
  }
</style>

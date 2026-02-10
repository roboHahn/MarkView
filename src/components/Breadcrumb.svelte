<script lang="ts">
  interface Props {
    currentFile: string | null;
    currentFolder: string | null;
  }

  let { currentFile, currentFolder }: Props = $props();

  const MAX_SEGMENTS = 5;

  let segments = $derived.by(() => {
    if (!currentFile) return [];

    let displayPath = currentFile;

    // Show path relative to currentFolder when available
    if (currentFolder) {
      const normalizedFile = currentFile.replace(/\\/g, '/');
      const normalizedFolder = currentFolder.replace(/\\/g, '/').replace(/\/$/, '');
      if (normalizedFile.startsWith(normalizedFolder + '/')) {
        displayPath = normalizedFile.slice(normalizedFolder.length + 1);
      } else if (normalizedFile.startsWith(normalizedFolder)) {
        displayPath = normalizedFile.slice(normalizedFolder.length);
      }
    }

    const parts = displayPath.split(/[\\/]/).filter((s) => s.length > 0);

    // Truncate long paths from the left
    if (parts.length > MAX_SEGMENTS) {
      return ['...', ...parts.slice(parts.length - MAX_SEGMENTS)];
    }

    return parts;
  });
</script>

{#if currentFile}
  <div class="breadcrumb">
    {#each segments as segment, i}
      {#if i > 0}
        <span class="separator">/</span>
      {/if}
      <span class:filename={i === segments.length - 1}>{segment}</span>
    {/each}
  </div>
{:else}
  <div class="breadcrumb"></div>
{/if}

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    padding: 0 12px;
    height: 24px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
  }

  .separator {
    margin: 0 4px;
    opacity: 0.5;
  }

  .filename {
    color: var(--text-primary);
    font-weight: 500;
  }
</style>

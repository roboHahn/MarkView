<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { formatFileSize, generateImageMarkdown, type ImageData } from '$lib/image-manager';
  import { toastManager } from '$lib/toast.svelte';

  interface Props {
    currentFolder: string | null;
    onInsertImage: (markdown: string) => void;
    onClose: () => void;
  }

  let { currentFolder, onInsertImage, onClose }: Props = $props();

  let images = $state<ImageData[]>([]);
  let thumbnails = $state<Record<string, string>>({});
  let loading = $state(true);
  let filter = $state<'all' | 'used' | 'unused'>('all');
  let searchQuery = $state('');
  let deleteConfirm = $state<string | null>(null);

  let filtered = $derived.by(() => {
    let list = images;
    if (filter === 'used') list = list.filter(i => i.usedIn.length > 0);
    if (filter === 'unused') list = list.filter(i => i.usedIn.length === 0);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }
    return list;
  });

  $effect(() => {
    if (currentFolder) {
      loadImages();
    }
  });

  async function loadImages() {
    if (!currentFolder) return;
    loading = true;
    try {
      const result = await invoke<ImageData[]>('scan_images', { folder: currentFolder });
      images = result;
      // Load thumbnails in background
      for (const img of result) {
        loadThumbnail(img.path);
      }
    } catch (err) {
      toastManager.error('Failed to scan images');
    } finally {
      loading = false;
    }
  }

  async function loadThumbnail(path: string) {
    try {
      const base64 = await invoke<string>('get_image_base64', { path });
      thumbnails = { ...thumbnails, [path]: base64 };
    } catch { /* ignore */ }
  }

  function handleInsert(image: ImageData) {
    // Generate relative path from folder
    let relativePath = image.path;
    if (currentFolder && image.path.startsWith(currentFolder)) {
      relativePath = image.path.slice(currentFolder.length).replace(/^[\\/]/, '');
    }
    const md = generateImageMarkdown(image.name.replace(/\.[^.]+$/, ''), relativePath);
    onInsertImage(md);
    onClose();
  }

  async function handleDelete(path: string) {
    try {
      await invoke('delete_image', { path });
      images = images.filter(i => i.path !== path);
      deleteConfirm = null;
      toastManager.success('Image deleted');
    } catch {
      toastManager.error('Failed to delete image');
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (deleteConfirm) {
        deleteConfirm = null;
      } else {
        onClose();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={onClose}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal" onclick={(e) => e.stopPropagation()}>
    <div class="topbar">
      <span class="topbar-title">Image Gallery</span>
      <div class="topbar-controls">
        <input
          type="text"
          class="search-input"
          placeholder="Filter images..."
          bind:value={searchQuery}
        />
        <select class="filter-select" bind:value={filter}>
          <option value="all">All</option>
          <option value="used">Used</option>
          <option value="unused">Unused</option>
        </select>
        <button class="btn" onclick={onClose}>Close</button>
      </div>
    </div>

    <div class="gallery-body">
      {#if loading}
        <div class="empty-state">Scanning images...</div>
      {:else if filtered.length === 0}
        <div class="empty-state">No images found</div>
      {:else}
        <div class="image-grid">
          {#each filtered as image (image.path)}
            <div class="image-card">
              <button class="image-thumb" onclick={() => handleInsert(image)}>
                {#if thumbnails[image.path]}
                  <img src={thumbnails[image.path]} alt={image.name} />
                {:else}
                  <div class="thumb-placeholder">{image.extension.toUpperCase()}</div>
                {/if}
                {#if image.usedIn.length === 0}
                  <span class="unused-badge">Unused</span>
                {/if}
              </button>
              <div class="image-info">
                <span class="image-name" title={image.name}>{image.name}</span>
                <span class="image-size">{formatFileSize(image.size)}</span>
              </div>
              <div class="image-actions">
                <button class="btn btn-sm" onclick={() => handleInsert(image)}>Insert</button>
                {#if deleteConfirm === image.path}
                  <button class="btn btn-sm btn-danger" onclick={() => handleDelete(image.path)}>Confirm</button>
                  <button class="btn btn-sm" onclick={() => deleteConfirm = null}>Cancel</button>
                {:else}
                  <button class="btn btn-sm btn-danger" onclick={() => deleteConfirm = image.path}>Delete</button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
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
    max-width: 800px;
    max-height: 85vh;
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
    padding: 8px 12px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    gap: 8px;
    flex-wrap: wrap;
  }

  .topbar-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .topbar-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search-input {
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 12px;
    width: 150px;
    outline: none;
  }

  .search-input:focus { border-color: var(--accent); }

  .filter-select {
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    outline: none;
  }

  .btn {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
  }

  .btn:hover { background: var(--hover-bg); border-color: var(--accent); }
  .btn-sm { padding: 2px 8px; font-size: 11px; }
  .btn-danger { color: #e53e3e; border-color: #e53e3e; }
  .btn-danger:hover { background: #e53e3e; color: #fff; }

  .gallery-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .image-card {
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .image-thumb {
    position: relative;
    width: 100%;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-toolbar);
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .image-thumb img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .image-thumb:hover { opacity: 0.85; }

  .thumb-placeholder {
    color: var(--text-muted);
    font-size: 14px;
    font-weight: 600;
  }

  .unused-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 1px 6px;
    background: #e53e3e;
    color: #fff;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
  }

  .image-info {
    padding: 6px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .image-name {
    font-size: 11px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .image-size {
    font-size: 10px;
    color: var(--text-muted);
    flex-shrink: 0;
    margin-left: 4px;
  }

  .image-actions {
    padding: 4px 8px 6px;
    display: flex;
    gap: 4px;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--text-muted);
    font-size: 14px;
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-dialog';
  import { getInitialTheme, setTheme, toggleTheme, type Theme } from '$lib/theme';
  import { toastManager } from '$lib/toast.svelte';
  import { startWatching, stopWatching, type FileChangeEvent } from '$lib/watcher';
  import type { FileEntry } from '$lib/types';
  import Toolbar from '../components/Toolbar.svelte';
  import FileTree from '../components/FileTree.svelte';
  import SearchPanel from '../components/SearchPanel.svelte';
  import GitPanel from '../components/GitPanel.svelte';
  import TocPanel from '../components/TocPanel.svelte';
  import Tabs from '../components/Tabs.svelte';
  import MarkdownToolbar from '../components/MarkdownToolbar.svelte';
  import Editor from '../components/Editor.svelte';
  import Preview from '../components/Preview.svelte';
  import MermaidEditor from '../components/MermaidEditor.svelte';
  import Breadcrumb from '../components/Breadcrumb.svelte';
  import SettingsPanel from '../components/SettingsPanel.svelte';
  import RecentFiles from '../components/RecentFiles.svelte';
  import DiffView from '../components/DiffView.svelte';
  import EmojiPicker from '../components/EmojiPicker.svelte';
  import SnippetMenu from '../components/SnippetMenu.svelte';
  import StatusBar from '../components/StatusBar.svelte';
  import Toast from '../components/Toast.svelte';
  import { settingsManager } from '$lib/settings.svelte';
  import { recentFiles } from '$lib/recent-files.svelte';
  import '../styles/katex-import.css';

  // --- App State ---
  let currentFolder: string | null = $state(null);
  let currentFile: string | null = $state(null);
  let fileTree: FileEntry[] = $state([]);
  let content: string = $state('');
  let theme: Theme = $state('dark');

  // --- Sidebar mode ---
  type SidebarMode = 'files' | 'search' | 'git' | 'toc';
  let sidebarMode: SidebarMode = $state('files');

  // --- Sync scroll ---
  let scrollFraction = $state<number | undefined>(undefined);
  let scrollSource = $state<'editor' | 'preview' | null>(null);

  // --- Markdown toolbar ---
  let insertCommand = $state<{ type: string; timestamp: number } | null>(null);

  // --- Mermaid editor ---
  let mermaidEditorOpen = $state(false);
  let mermaidEditorCode = $state('');

  // --- Zen mode ---
  let zenMode = $state(false);

  // --- Sidebar visibility ---
  let sidebarVisible = $state(true);

  // --- Modals/dropdowns ---
  let settingsOpen = $state(false);
  let recentFilesOpen = $state(false);
  let diffViewOpen = $state(false);
  let emojiPickerOpen = $state(false);
  let snippetMenuOpen = $state(false);

  // --- Tabs (open files) ---
  interface OpenFile {
    path: string;
    name: string;
    content: string;
    originalContent: string;
  }
  let openFiles: OpenFile[] = $state([]);

  let openFileTabs = $derived(
    openFiles.map(f => ({
      path: f.path,
      name: f.name,
      modified: f.content !== f.originalContent,
    }))
  );

  // --- Panel sizing ---
  let fileTreeWidth = $state(220);
  let editorFraction = $state(0.5);

  // --- Splitter dragging ---
  let draggingSplitter: 'tree' | 'editor' | null = $state(null);
  let containerEl: HTMLDivElement | undefined = $state(undefined);

  const MIN_TREE = 150;
  const MIN_EDITOR = 200;
  const MIN_PREVIEW = 200;
  const SPLITTER_WIDTH = 4;

  let editorFr = $derived(Math.round(editorFraction * 1000));
  let previewFr = $derived(Math.round((1 - editorFraction) * 1000));
  let gridColumns = $derived(
    sidebarVisible && !zenMode
      ? `${fileTreeWidth}px ${SPLITTER_WIDTH}px ${editorFr}fr ${SPLITTER_WIDTH}px ${previewFr}fr`
      : `0px 0px ${editorFr}fr ${SPLITTER_WIDTH}px ${previewFr}fr`
  );

  // --- Lifecycle ---
  onMount(() => {
    theme = getInitialTheme();
    setTheme(theme);

    return () => {
      stopWatching().catch(() => {});
    };
  });

  // --- Handlers ---
  async function handleOpenFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === 'string') {
      // Stop previous watcher
      await stopWatching().catch(() => {});

      currentFolder = selected;
      currentFile = null;
      content = '';
      openFiles = [];
      sidebarMode = 'files';

      try {
        fileTree = await invoke<FileEntry[]>('read_directory', { path: selected });
      } catch (err) {
        toastManager.error('Failed to read directory');
        fileTree = [];
      }

      // Start file watcher
      startWatching(selected, handleFileChanges).catch(() => {});
      recentFiles.add(selected, 'folder');
    }
  }

  async function handleFileSelect(path: string) {
    // Check if file is already open in tabs
    const existing = openFiles.find(f => f.path === path);
    if (existing) {
      currentFile = path;
      content = existing.content;
      return;
    }

    try {
      const fileContent = await invoke<string>('read_file', { path });
      const name = path.split(/[\\/]/).pop() ?? path;

      openFiles = [...openFiles, {
        path,
        name,
        content: fileContent,
        originalContent: fileContent,
      }];

      currentFile = path;
      content = fileContent;
      recentFiles.add(path, 'file');
    } catch (err) {
      toastManager.error('Failed to read file');
    }
  }

  function handleSelectTab(path: string) {
    const file = openFiles.find(f => f.path === path);
    if (file) {
      currentFile = path;
      content = file.content;
    }
  }

  function handleCloseTab(path: string) {
    openFiles = openFiles.filter(f => f.path !== path);
    if (currentFile === path) {
      const next = openFiles.length > 0 ? openFiles[openFiles.length - 1] : null;
      if (next) {
        currentFile = next.path;
        content = next.content;
      } else {
        currentFile = null;
        content = '';
      }
    }
  }

  function handleContentChange(newContent: string) {
    content = newContent;
    // Update the content in the open files array
    const idx = openFiles.findIndex(f => f.path === currentFile);
    if (idx !== -1) {
      openFiles[idx].content = newContent;
    }
  }

  async function handleSave() {
    if (!currentFile) return;
    try {
      await invoke('write_file', { path: currentFile, content });
      // Update original content to mark as saved
      const idx = openFiles.findIndex(f => f.path === currentFile);
      if (idx !== -1) {
        openFiles[idx].originalContent = content;
      }
      toastManager.success('File saved');
    } catch (err) {
      toastManager.error('Failed to save file');
    }
  }

  function handleToggleTheme() {
    theme = toggleTheme(theme);
  }

  // --- File watcher ---
  async function handleFileChanges(changes: FileChangeEvent[]) {
    let needsTreeRefresh = false;

    for (const change of changes) {
      if (change.change_type === 'created' || change.change_type === 'deleted') {
        needsTreeRefresh = true;
      }

      // Reload content if the currently open file was modified externally
      if (change.change_type === 'modified' && change.path === currentFile) {
        try {
          const newContent = await invoke<string>('read_file', { path: change.path });
          const file = openFiles.find(f => f.path === change.path);
          if (file && file.content === file.originalContent) {
            // Only auto-reload if user hasn't made unsaved changes
            content = newContent;
            file.content = newContent;
            file.originalContent = newContent;
            toastManager.info('File reloaded (external change)');
          }
        } catch { /* ignore */ }
      }
    }

    if (needsTreeRefresh && currentFolder) {
      try {
        fileTree = await invoke<FileEntry[]>('read_directory', { path: currentFolder });
      } catch { /* ignore */ }
    }
  }

  // --- Drag & Drop ---
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer?.files.length) return;

    const file = e.dataTransfer.files[0];
    const path = (file as any).path as string | undefined;

    if (!path) return;

    // Check if it's a directory or a .md file
    if (path.toLowerCase().endsWith('.md')) {
      await handleFileSelect(path);
    } else {
      // Try to open as folder
      try {
        await stopWatching().catch(() => {});
        currentFolder = path;
        currentFile = null;
        content = '';
        openFiles = [];
        fileTree = await invoke<FileEntry[]>('read_directory', { path });
        startWatching(path, handleFileChanges).catch(() => {});
        toastManager.success('Folder opened');
      } catch {
        toastManager.error('Could not open as folder');
      }
    }
  }

  // --- Splitter drag logic ---
  function onSplitterPointerDown(which: 'tree' | 'editor', e: PointerEvent) {
    draggingSplitter = which;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onSplitterPointerMove(e: PointerEvent) {
    if (!draggingSplitter || !containerEl) return;

    const rect = containerEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalWidth = rect.width;

    if (draggingSplitter === 'tree') {
      let newTreeWidth = x;
      const remaining = totalWidth - newTreeWidth - SPLITTER_WIDTH * 2;
      const editorWidth = remaining * editorFraction;
      const previewWidth = remaining * (1 - editorFraction);

      if (newTreeWidth < MIN_TREE) newTreeWidth = MIN_TREE;
      if (editorWidth < MIN_EDITOR || previewWidth < MIN_PREVIEW) {
        const maxTree = totalWidth - SPLITTER_WIDTH * 2 - MIN_EDITOR - MIN_PREVIEW;
        if (newTreeWidth > maxTree) newTreeWidth = maxTree;
      }
      fileTreeWidth = newTreeWidth;
    } else if (draggingSplitter === 'editor') {
      const editorStart = fileTreeWidth + SPLITTER_WIDTH;
      const remaining = totalWidth - editorStart - SPLITTER_WIDTH;
      const editorWidth = x - editorStart;
      let newFraction = editorWidth / remaining;

      if (editorWidth < MIN_EDITOR) {
        newFraction = MIN_EDITOR / remaining;
      }
      const previewWidth = remaining * (1 - newFraction);
      if (previewWidth < MIN_PREVIEW) {
        newFraction = 1 - MIN_PREVIEW / remaining;
      }

      newFraction = Math.max(0.1, Math.min(0.9, newFraction));
      editorFraction = newFraction;
    }
  }

  function onSplitterPointerUp() {
    draggingSplitter = null;
  }

  // --- Sync scroll handlers ---
  function handleEditorScroll(fraction: number) {
    if (scrollSource === 'preview') return;
    scrollSource = 'editor';
    scrollFraction = fraction;
    queueMicrotask(() => { scrollSource = null; });
  }

  function handlePreviewScroll(fraction: number) {
    if (scrollSource === 'editor') return;
    scrollSource = 'preview';
    scrollFraction = fraction;
    queueMicrotask(() => { scrollSource = null; });
  }

  // --- Markdown toolbar ---
  function handleToolbarInsert(type: string) {
    insertCommand = { type, timestamp: Date.now() };
  }

  // --- File operations ---
  async function handleRenameFile(oldPath: string, newPath: string) {
    try {
      await invoke('rename_file', { oldPath, newPath });
      // Update open tabs if renamed file is open
      const idx = openFiles.findIndex(f => f.path === oldPath);
      if (idx !== -1) {
        openFiles[idx].path = newPath;
        openFiles[idx].name = newPath.split(/[\\/]/).pop() ?? newPath;
      }
      if (currentFile === oldPath) currentFile = newPath;
      if (currentFolder) {
        fileTree = await invoke<FileEntry[]>('read_directory', { path: currentFolder });
      }
      toastManager.success('File renamed');
    } catch (err) {
      toastManager.error('Failed to rename file');
    }
  }

  async function handleDeleteFile(path: string) {
    try {
      await invoke('delete_file', { path });
      // Close tab if open
      handleCloseTab(path);
      if (currentFolder) {
        fileTree = await invoke<FileEntry[]>('read_directory', { path: currentFolder });
      }
      toastManager.success('File deleted');
    } catch (err) {
      toastManager.error('Failed to delete file');
    }
  }

  async function handleCreateFile(folderPath: string) {
    const newPath = folderPath + '\\new-file.md';
    try {
      await invoke('create_file', { path: newPath });
      if (currentFolder) {
        fileTree = await invoke<FileEntry[]>('read_directory', { path: currentFolder });
      }
      await handleFileSelect(newPath);
      toastManager.success('File created');
    } catch (err) {
      toastManager.error('Failed to create file');
    }
  }

  // --- Image paste ---
  async function handleImagePaste(file: File) {
    if (!currentFolder || !currentFile) return;
    try {
      const arrayBuf = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(arrayBuf));
      const ext = file.type.split('/')[1] || 'png';
      const filename = `image-${Date.now()}.${ext}`;
      const savedPath: string = await invoke('save_image', {
        folder: currentFolder,
        filename,
        data,
      });
      // Insert markdown image link relative to assets folder
      insertCommand = { type: '__raw:![image](assets/' + filename + ')', timestamp: Date.now() };
    } catch (err) {
      toastManager.error('Failed to paste image');
    }
  }

  // --- Mermaid editor ---
  function openMermaidEditor() {
    mermaidEditorCode = '```mermaid\ngraph TD\n    A[Start] --> B[End]\n```';
    mermaidEditorOpen = true;
  }

  function handleMermaidSave(code: string) {
    // Insert the mermaid code block at cursor
    insertCommand = { type: '__raw:\n```mermaid\n' + code + '\n```\n', timestamp: Date.now() };
    mermaidEditorOpen = false;
  }

  // --- ToC navigate ---
  function handleTocNavigate(line: number) {
    // Navigate to line in editor - use insertCommand with special type
    insertCommand = { type: '__goto:' + line, timestamp: Date.now() };
  }

  // --- Emoji / Snippet insert ---
  function handleEmojiSelect(emoji: string) {
    insertCommand = { type: '__raw:' + emoji, timestamp: Date.now() };
    emojiPickerOpen = false;
  }

  function handleSnippetInsert(snippet: string) {
    insertCommand = { type: '__raw:' + snippet, timestamp: Date.now() };
    snippetMenuOpen = false;
  }

  // --- Recent files handlers ---
  async function handleRecentFileSelect(path: string) {
    recentFilesOpen = false;
    await handleFileSelect(path);
  }

  async function handleRecentFolderSelect(path: string) {
    recentFilesOpen = false;
    await stopWatching().catch(() => {});
    currentFolder = path;
    currentFile = null;
    content = '';
    openFiles = [];
    sidebarMode = 'files';
    try {
      fileTree = await invoke<FileEntry[]>('read_directory', { path });
      startWatching(path, handleFileChanges).catch(() => {});
    } catch {
      toastManager.error('Failed to read directory');
      fileTree = [];
    }
  }

  // --- Keyboard shortcuts ---
  function handleKeydown(e: KeyboardEvent) {
    // F11 — zen mode
    if (e.key === 'F11') {
      e.preventDefault();
      zenMode = !zenMode;
    }
    // Escape — exit zen mode
    if (e.key === 'Escape' && zenMode) {
      zenMode = false;
    }
    // Ctrl+O — open folder
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      handleOpenFolder();
    }
    // Ctrl+, — toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      handleToggleTheme();
    }
    // Ctrl+Shift+F — focus search
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      sidebarMode = 'search';
    }
    // Ctrl+B — sidebar toggle
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      sidebarVisible = !sidebarVisible;
    }
    // Ctrl+D — diff view
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (currentFile && currentFolder) diffViewOpen = true;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="app-layout"
  bind:this={containerEl}
  onpointermove={onSplitterPointerMove}
  onpointerup={onSplitterPointerUp}
  ondragover={handleDragOver}
  ondrop={handleDrop}
  role="application"
>
  {#if !zenMode}
  <div class="toolbar-area">
    <Toolbar
      onOpenFolder={handleOpenFolder}
      onSave={handleSave}
      currentFolder={currentFolder}
      currentFile={currentFile}
      {content}
      {theme}
    />
    <div class="toolbar-extra">
      <button class="extra-btn" onclick={() => sidebarVisible = !sidebarVisible} title="Toggle Sidebar (Ctrl+B)">
        {sidebarVisible ? '◀' : '▶'}
      </button>
      <div class="extra-btn-group">
        <button class="extra-btn" onclick={() => recentFilesOpen = !recentFilesOpen} title="Recent Files">
          Recent
        </button>
        {#if recentFilesOpen}
          <RecentFiles
            onFileSelect={handleRecentFileSelect}
            onFolderSelect={handleRecentFolderSelect}
            onClose={() => recentFilesOpen = false}
          />
        {/if}
      </div>
      <div class="extra-btn-group">
        <button class="extra-btn" onclick={() => emojiPickerOpen = !emojiPickerOpen} title="Emoji Picker">
          😀
        </button>
        {#if emojiPickerOpen}
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => emojiPickerOpen = false} />
        {/if}
      </div>
      <div class="extra-btn-group">
        <button class="extra-btn" onclick={() => snippetMenuOpen = !snippetMenuOpen} title="Snippets">
          Snippets
        </button>
        {#if snippetMenuOpen}
          <SnippetMenu onInsert={handleSnippetInsert} onClose={() => snippetMenuOpen = false} />
        {/if}
      </div>
      <button class="extra-btn" onclick={() => { if (currentFile && currentFolder) diffViewOpen = true; }} disabled={!currentFile} title="Git Diff (Ctrl+D)">
        Diff
      </button>
      <button class="extra-btn" onclick={() => settingsOpen = true} title="Settings">
        ⚙
      </button>
      <button class="extra-btn" onclick={() => zenMode = true} title="Zen Mode (F11)">
        ⛶
      </button>
    </div>
  </div>
  {/if}

  {#if openFiles.length > 0}
    <div class="tabs-area">
      <Tabs
        openFiles={openFileTabs}
        activeFile={currentFile}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
      />
    </div>
  {/if}

  <div class="main-area" style="grid-template-columns: {gridColumns}">
    <div class="sidebar-panel" class:hidden={!sidebarVisible || zenMode}>
      <div class="sidebar-tabs">
        <button
          class="sidebar-tab"
          class:active={sidebarMode === 'files'}
          onclick={() => sidebarMode = 'files'}
        >Files</button>
        <button
          class="sidebar-tab"
          class:active={sidebarMode === 'search'}
          onclick={() => sidebarMode = 'search'}
        >Search</button>
        <button
          class="sidebar-tab"
          class:active={sidebarMode === 'git'}
          onclick={() => sidebarMode = 'git'}
        >Git</button>
        <button
          class="sidebar-tab"
          class:active={sidebarMode === 'toc'}
          onclick={() => sidebarMode = 'toc'}
        >ToC</button>
      </div>
      <div class="sidebar-content">
        {#if sidebarMode === 'files'}
          <FileTree
            fileTree={fileTree}
            currentFile={currentFile}
            onFileSelect={handleFileSelect}
            onRenameFile={handleRenameFile}
            onDeleteFile={handleDeleteFile}
            onCreateFile={handleCreateFile}
          />
        {:else if sidebarMode === 'search'}
          <SearchPanel
            currentFolder={currentFolder}
            onFileSelect={handleFileSelect}
          />
        {:else if sidebarMode === 'git'}
          <GitPanel currentFolder={currentFolder} />
        {:else if sidebarMode === 'toc'}
          <TocPanel
            {content}
            onNavigate={handleTocNavigate}
          />
        {/if}
      </div>
    </div>

    <div
      class="splitter"
      class:active={draggingSplitter === 'tree'}
      onpointerdown={(e) => onSplitterPointerDown('tree', e)}
      role="separator"
      aria-orientation="vertical"
      tabindex="-1"
    ></div>

    <div class="editor-panel">
      {#if currentFile}
        {#if !zenMode}
          <Breadcrumb {currentFile} {currentFolder} />
        {/if}
        <MarkdownToolbar onInsert={handleToolbarInsert} />
        <Editor
          {content}
          onContentChange={handleContentChange}
          {theme}
          onSave={handleSave}
          onScrollChange={handleEditorScroll}
          scrollFraction={scrollSource === 'preview' ? scrollFraction : undefined}
          {insertCommand}
          onImagePaste={handleImagePaste}
        />
      {:else}
        <div class="panel-placeholder">Select a file to edit</div>
      {/if}
    </div>

    <div
      class="splitter"
      class:active={draggingSplitter === 'editor'}
      onpointerdown={(e) => onSplitterPointerDown('editor', e)}
      role="separator"
      aria-orientation="vertical"
      tabindex="-1"
    ></div>

    <div class="preview-panel">
      {#if currentFile}
        <Preview
          {content}
          {theme}
          onScrollChange={handlePreviewScroll}
          scrollFraction={scrollSource === 'editor' ? scrollFraction : undefined}
        />
      {:else}
        <div class="panel-placeholder">Preview will appear here</div>
      {/if}
    </div>
  </div>

  {#if !zenMode}
  <div class="statusbar-area">
    <StatusBar
      currentFile={currentFile}
      {content}
      {theme}
      onToggleTheme={handleToggleTheme}
    />
  </div>
  {/if}
</div>

{#if settingsOpen}
  <SettingsPanel onClose={() => settingsOpen = false} {theme} />
{/if}

{#if diffViewOpen}
  <DiffView {currentFile} {currentFolder} onClose={() => diffViewOpen = false} {theme} />
{/if}

{#if mermaidEditorOpen}
  <MermaidEditor
    initialCode="graph TD\n    A[Start] --> B[End]"
    onSave={handleMermaidSave}
    onClose={() => mermaidEditorOpen = false}
    {theme}
  />
{/if}

<Toast />

<style>
  .app-layout {
    display: grid;
    grid-template-rows: auto auto auto 1fr auto;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .toolbar-area {
    grid-row: 1;
  }

  .tabs-area {
    grid-row: 2;
  }

  .main-area {
    grid-row: 4;
    display: grid;
    overflow: hidden;
  }

  .statusbar-area {
    grid-row: 5;
  }

  .sidebar-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    background: var(--bg-sidebar);
    flex-shrink: 0;
  }

  .sidebar-tab {
    flex: 1;
    padding: 8px 6px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }

  .sidebar-tab:hover {
    color: var(--text-secondary);
  }

  .sidebar-tab.active {
    color: var(--text-primary);
    border-bottom-color: var(--accent);
  }

  .sidebar-content {
    flex: 1;
    overflow: hidden;
  }

  .editor-panel {
    overflow: hidden;
    background: var(--bg-editor);
    display: flex;
    flex-direction: column;
  }

  .preview-panel {
    overflow: hidden;
    background: var(--bg-preview);
    display: flex;
    flex-direction: column;
  }

  .panel-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    font-size: 14px;
    user-select: none;
    -webkit-user-select: none;
  }

  .splitter {
    width: 4px;
    cursor: col-resize;
    background: var(--border);
    transition: background 0.15s;
    z-index: 10;
  }

  .splitter:hover,
  .splitter.active {
    background: var(--accent);
  }

  .sidebar-panel.hidden {
    display: none;
  }

  .toolbar-extra {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 12px 0 12px;
    height: 32px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
  }

  .extra-btn-group {
    position: relative;
  }

  .extra-btn {
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .extra-btn:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .extra-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>

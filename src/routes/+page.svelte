<script lang="ts">
  import { onMount } from 'svelte';
  import { type Theme } from '$lib/theme';
  import { themes, getTheme, applyTheme, getStoredThemeId, storeThemeId } from '$lib/themes';
  import { toastManager } from '$lib/toast.svelte';
  import { stopWatching } from '$lib/watcher';
  import { customCss } from '$lib/custom-css.svelte';
  import Toolbar from '../components/Toolbar.svelte';
  import FileTree from '../components/FileTree.svelte';
  import SearchPanel from '../components/SearchPanel.svelte';
  import GitPanel from '../components/GitPanel.svelte';
  import TocPanel from '../components/TocPanel.svelte';
  import Tabs from '../components/Tabs.svelte';
  import MarkdownToolbar from '../components/MarkdownToolbar.svelte';
  import Editor from '../components/Editor.svelte';
  import Preview from '../components/Preview.svelte';
  import DiagramEditor from '../components/DiagramEditor.svelte';
  import Breadcrumb from '../components/Breadcrumb.svelte';
  import SettingsPanel from '../components/SettingsPanel.svelte';
  import RecentFiles from '../components/RecentFiles.svelte';
  import DiffView from '../components/DiffView.svelte';
  import EmojiPicker from '../components/EmojiPicker.svelte';
  import SnippetMenu from '../components/SnippetMenu.svelte';
  import CommandPalette from '../components/CommandPalette.svelte';
  import TableEditor from '../components/TableEditor.svelte';
  import PresentationMode from '../components/PresentationMode.svelte';
  import CustomCssEditor from '../components/CustomCssEditor.svelte';
  import ThemePicker from '../components/ThemePicker.svelte';
  import PluginManager from '../components/PluginManager.svelte';
  import AIPanel from '../components/AIPanel.svelte';
  import BacklinksPanel from '../components/BacklinksPanel.svelte';
  import GraphView from '../components/GraphView.svelte';
  import MindMapView from '../components/MindMapView.svelte';
  import TemplateModal from '../components/TemplateModal.svelte';
  import ImageGallery from '../components/ImageGallery.svelte';
  import { templateManager } from '$lib/templates';
  import { pluginManager } from '$lib/plugins.svelte';
  import { builtinPlugins } from '$lib/builtin-plugins';
  import StatusBar from '../components/StatusBar.svelte';
  import Toast from '../components/Toast.svelte';
  import { settingsManager } from '$lib/settings.svelte';
  import { recentFiles } from '$lib/recent-files.svelte';
  import '../styles/katex-import.css';

  // --- Stores ---
  import { workspace } from '$lib/stores/workspace.svelte';
  import { modal, type ModalId } from '$lib/stores/modal.svelte';
  import { layout } from '$lib/stores/layout.svelte';

  // --- Theme state (kept local — tightly coupled to applyTheme) ---
  let theme: Theme = $state('dark');
  let currentThemeId = $state('dark');

  // --- Diagram editor data ---
  let diagramEditorCode = $state('');

  // --- Container ref for splitter ---
  let containerEl: HTMLDivElement | undefined = $state(undefined);

  // --- Lifecycle ---
  onMount(() => {
    currentThemeId = getStoredThemeId() || 'dark';
    const themeDef = getTheme(currentThemeId);
    theme = themeDef.type;
    applyTheme(themeDef);

    for (const plugin of builtinPlugins) {
      pluginManager.register(plugin);
    }

    return () => {
      stopWatching().catch(() => {});
    };
  });

  // --- Theme ---
  function handleToggleTheme() {
    const current = getTheme(currentThemeId);
    const nextType = current.type === 'dark' ? 'light' : 'dark';
    const nextTheme = themes.find(t => t.type === nextType) ?? themes[0];
    handleThemeSelect(nextTheme.id);
  }

  function handleThemeSelect(themeId: string) {
    currentThemeId = themeId;
    const themeDef = getTheme(themeId);
    theme = themeDef.type;
    applyTheme(themeDef);
    storeThemeId(themeId);
  }

  // --- Toolbar insert helpers ---
  function handleToolbarInsert(type: string) {
    workspace.sendInsert(type);
  }

  function handleTableInsert(markdown: string) {
    workspace.sendInsert('__raw:\n' + markdown + '\n');
    modal.close();
  }

  function handleAiInsertText(text: string) {
    workspace.sendInsert('__raw:' + text);
  }

  function handleAiReplaceSelection(text: string) {
    workspace.sendInsert('__raw:' + text);
  }

  function handleTocNavigate(line: number) {
    workspace.sendInsert('__goto:' + line);
  }

  function handleEmojiSelect(emoji: string) {
    workspace.sendInsert('__raw:' + emoji);
    modal.close();
  }

  function handleSnippetInsert(snippet: string) {
    workspace.sendInsert('__raw:' + snippet);
    modal.close();
  }

  // --- Diagram editor ---
  function openDiagramEditor() {
    const sel = workspace.selectedText.trim();
    if (sel) {
      const fenceMatch = sel.match(/^```(\w[\w-]*)\s*\n([\s\S]*?)```\s*$/);
      diagramEditorCode = fenceMatch ? fenceMatch[2].trim() : sel;
    } else {
      diagramEditorCode = 'flowchart TD\n    A[Start] --> B[End]';
    }
    modal.open('diagramEditor');
  }

  function handleDiagramSave(code: string, language: string) {
    workspace.sendInsert('__raw:\n```' + language + '\n' + code + '\n```\n');
    modal.close();
  }

  // --- Recent files ---
  async function handleRecentFileSelect(path: string) {
    modal.close();
    await workspace.selectFile(path);
  }

  async function handleRecentFolderSelect(path: string) {
    modal.close();
    await workspace.openRecentFolder(path);
  }

  // --- Command palette ---
  function handleCommandExecute(commandId: string) {
    switch (commandId) {
      case 'file.openFolder': workspace.openFolder(); break;
      case 'file.save': workspace.save(); break;
      case 'file.closeTab': if (workspace.currentFile) workspace.closeTab(workspace.currentFile); break;
      case 'edit.bold': handleToolbarInsert('bold'); break;
      case 'edit.italic': handleToolbarInsert('italic'); break;
      case 'edit.link': handleToolbarInsert('link'); break;
      case 'edit.image': handleToolbarInsert('image'); break;
      case 'edit.codeblock': handleToolbarInsert('codeblock'); break;
      case 'edit.table': modal.open('tableEditor'); break;
      case 'edit.hr': handleToolbarInsert('hr'); break;
      case 'view.sidebar': layout.toggleSidebar(); break;
      case 'view.zen': layout.toggleZen(); break;
      case 'view.theme': modal.open('themePicker'); break;
      case 'view.focusMode': layout.focusModeEnabled = !layout.focusModeEnabled; break;
      case 'search.files': layout.setSidebarMode('search'); break;
      case 'tools.diff': if (workspace.currentFile && workspace.currentFolder) modal.open('diffView'); break;
      case 'tools.settings': modal.open('settings'); break;
      case 'tools.emoji': modal.open('emojiPicker'); break;
      case 'tools.snippets': modal.open('snippetMenu'); break;
      case 'tools.presentation': if (workspace.content) modal.open('presentation'); break;
      case 'tools.customCss': modal.open('customCss'); break;
      case 'tools.themes': modal.open('themePicker'); break;
      case 'tools.plugins': modal.open('pluginManager'); break;
      case 'tools.mermaid': openDiagramEditor(); break;
      case 'tools.ai': layout.toggleSidebarMode('ai'); break;
      case 'navigate.backlinks': layout.setSidebarMode('backlinks'); break;
      case 'navigate.graphView': if (workspace.currentFolder) modal.open('graphView'); break;
      case 'view.minimap': settingsManager.update({ minimapEnabled: !settingsManager.settings.minimapEnabled }); break;
      case 'view.inlineImages': settingsManager.update({ inlineImages: !settingsManager.settings.inlineImages }); break;
      case 'view.mindMap': if (workspace.content) modal.open('mindMap'); break;
      case 'file.newFromTemplate': modal.open('templateModal'); break;
      case 'file.saveAsTemplate': if (workspace.content) { templateManager.saveCustom('Untitled', workspace.content); toastManager.success('Saved as template'); } break;
      case 'tools.imageGallery': if (workspace.currentFolder) modal.open('imageGallery'); break;
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

    if (path.toLowerCase().endsWith('.md')) {
      await workspace.selectFile(path);
    } else {
      await workspace.openRecentFolder(path);
    }
  }

  // --- Keyboard shortcuts ---
  function handleKeydown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.key === 'F11') { e.preventDefault(); layout.toggleZen(); }
    if (e.key === 'Escape' && layout.zenMode) { layout.zenMode = false; }
    if (ctrl && e.key === 'o') { e.preventDefault(); workspace.openFolder(); }
    if (ctrl && e.key === ',') { e.preventDefault(); handleToggleTheme(); }
    if (ctrl && e.shiftKey && e.key === 'F') { e.preventDefault(); layout.setSidebarMode('search'); }
    if (ctrl && e.key === 'b') { e.preventDefault(); layout.toggleSidebar(); }
    if (ctrl && e.key === 'd') { e.preventDefault(); if (workspace.currentFile && workspace.currentFolder) modal.open('diffView'); }
    if (ctrl && e.shiftKey && e.key === 'P') { e.preventDefault(); modal.toggle('commandPalette'); }
    if (ctrl && e.shiftKey && e.key === 'M') { e.preventDefault(); if (workspace.content) modal.open('presentation'); }
    if (ctrl && e.shiftKey && e.key === 'A') { e.preventDefault(); layout.toggleSidebarMode('ai'); }
    if (ctrl && e.shiftKey && e.key === 'B') { e.preventDefault(); layout.toggleSidebarMode('backlinks'); }
    if (ctrl && e.shiftKey && e.key === 'G') { e.preventDefault(); if (workspace.currentFolder) modal.open('graphView'); }
    if (ctrl && e.shiftKey && e.key === 'N') { e.preventDefault(); modal.open('templateModal'); }
    if (ctrl && e.shiftKey && e.key === 'O') { e.preventDefault(); if (workspace.content) modal.open('mindMap'); }
    if (ctrl && e.shiftKey && e.key === 'I') { e.preventDefault(); if (workspace.currentFolder) modal.open('imageGallery'); }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="app-layout"
  bind:this={containerEl}
  onpointermove={(e) => layout.onDragMove(e, containerEl)}
  onpointerup={() => layout.endDrag()}
  ondragover={handleDragOver}
  ondrop={handleDrop}
  role="application"
>
  {#if !layout.zenMode}
  <div class="toolbar-area">
    <Toolbar
      onOpenFolder={() => workspace.openFolder()}
      onSave={() => workspace.save()}
      currentFolder={workspace.currentFolder}
      currentFile={workspace.currentFile}
      content={workspace.content}
      {theme}
    />
    <div class="toolbar-extra">
      <button class="extra-btn" onclick={() => layout.toggleSidebar()} title="Toggle Sidebar (Ctrl+B)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="14" height="12" rx="2" /><line x1="6" y1="2" x2="6" y2="14" /></svg>
      </button>
      <div class="extra-btn-group">
        <button class="extra-btn" onclick={() => modal.toggle('recentFiles')} title="Recent Files">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5" /><polyline points="8,4 8,8 11,10" /></svg>
        </button>
        {#if modal.isOpen('recentFiles')}
          <RecentFiles
            onFileSelect={handleRecentFileSelect}
            onFolderSelect={handleRecentFolderSelect}
            onClose={() => modal.close()}
          />
        {/if}
      </div>
      <div class="extra-btn-group">
        <button class="extra-btn" onclick={() => modal.toggle('emojiPicker')} title="Emoji Picker">
          😀
        </button>
        {#if modal.isOpen('emojiPicker')}
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => modal.close()} />
        {/if}
      </div>
      <div class="extra-btn-group">
        <button class="extra-btn" onclick={() => modal.toggle('snippetMenu')} title="Snippets">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,4 1,8 4,12" /><polyline points="12,4 15,8 12,12" /><line x1="10" y1="3" x2="6" y2="13" /></svg>
        </button>
        {#if modal.isOpen('snippetMenu')}
          <SnippetMenu onInsert={handleSnippetInsert} onClose={() => modal.close()} />
        {/if}
      </div>
      <button class="extra-btn" onclick={() => { if (workspace.currentFile && workspace.currentFolder) modal.open('diffView'); }} disabled={!workspace.currentFile} title="Git Diff (Ctrl+D)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="1" x2="8" y2="15" /><line x1="3" y1="5" x2="6" y2="5" /><line x1="3" y1="8" x2="6" y2="8" /><line x1="10" y1="8" x2="13" y2="8" /><line x1="11.5" y1="6" x2="11.5" y2="10" /><line x1="3" y1="11" x2="6" y2="11" /></svg>
      </button>
      <button class="extra-btn" class:active-toggle={layout.focusModeEnabled} onclick={() => layout.focusModeEnabled = !layout.focusModeEnabled} title="Focus Mode">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7" /><circle cx="8" cy="8" r="3" /></svg>
      </button>
      <button class="extra-btn" class:active-toggle={layout.spellCheckEnabled} onclick={() => layout.spellCheckEnabled = !layout.spellCheckEnabled} title="Spell Check">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 13l4-10h1l4 10" /><line x1="3.5" y1="9" x2="9.5" y2="9" /><polyline points="11 10 12.5 12 15 8" /></svg>
      </button>
      <button class="extra-btn" onclick={() => modal.open('tableEditor')} disabled={!workspace.currentFile} title="Insert Table">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="14" height="12" rx="1" /><line x1="1" y1="6" x2="15" y2="6" /><line x1="1" y1="10" x2="15" y2="10" /><line x1="6" y1="2" x2="6" y2="14" /><line x1="11" y1="2" x2="11" y2="14" /></svg>
      </button>
      <button class="extra-btn" onclick={() => openDiagramEditor()} disabled={!workspace.currentFile} title="Diagram Editor">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12 L4 4 L8 10 L12 4 L15 12" /><circle cx="1" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /></svg>
      </button>
      <button class="extra-btn" onclick={() => { if (workspace.content) modal.open('presentation'); }} disabled={!workspace.currentFile} title="Presentation Mode (Ctrl+Shift+M)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="14" height="10" rx="1" /><line x1="8" y1="12" x2="8" y2="15" /><line x1="5" y1="15" x2="11" y2="15" /><polygon points="6,5 6,9 10,7" /></svg>
      </button>
      <button class="extra-btn" onclick={() => modal.open('themePicker')} title="Themes">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6" /><path d="M8 2a6 6 0 000 12z" fill="currentColor" opacity="0.3" /></svg>
      </button>
      <button class="extra-btn" onclick={() => modal.open('customCss')} title="Custom Preview CSS">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2l-3 6 3 6" /><path d="M12 2l3 6-3 6" /><line x1="10" y1="1" x2="6" y2="15" /></svg>
      </button>
      <button class="extra-btn" onclick={() => modal.open('pluginManager')} title="Plugins">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="1" width="10" height="6" rx="1" /><line x1="6" y1="7" x2="6" y2="10" /><line x1="10" y1="7" x2="10" y2="10" /><rect x="1" y="10" width="14" height="5" rx="1" /></svg>
      </button>
      <button class="extra-btn" onclick={() => modal.open('templateModal')} title="New from Template (Ctrl+Shift+N)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="1" width="12" height="14" rx="1" /><line x1="5" y1="5" x2="11" y2="5" /><line x1="5" y1="8" x2="9" y2="8" /><line x1="5" y1="11" x2="10" y2="11" /></svg>
      </button>
      <button class="extra-btn" onclick={() => { if (workspace.currentFolder) modal.open('imageGallery'); }} disabled={!workspace.currentFolder} title="Image Gallery (Ctrl+Shift+I)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="14" height="12" rx="1" /><circle cx="5" cy="6" r="1.5" /><polyline points="14,14 10,8 7,12 5,10 2,14" /></svg>
      </button>
      <button class="extra-btn" onclick={() => { if (workspace.content) modal.open('mindMap'); }} disabled={!workspace.currentFile} title="Mind Map (Ctrl+Shift+O)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="8" r="2" /><circle cx="12" cy="4" r="1.5" /><circle cx="12" cy="8" r="1.5" /><circle cx="12" cy="12" r="1.5" /><line x1="6" y1="7" x2="10.5" y2="4" /><line x1="6" y1="8" x2="10.5" y2="8" /><line x1="6" y1="9" x2="10.5" y2="12" /></svg>
      </button>
      <button class="extra-btn" onclick={() => { if (workspace.currentFolder) modal.open('graphView'); }} disabled={!workspace.currentFolder} title="Graph View (Ctrl+Shift+G)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="4" r="2" /><circle cx="12" cy="4" r="2" /><circle cx="8" cy="12" r="2" /><line x1="6" y1="4" x2="10" y2="4" /><line x1="5" y1="5.5" x2="7" y2="10.5" /><line x1="11" y1="5.5" x2="9" y2="10.5" /></svg>
      </button>
      <button class="extra-btn" class:active-toggle={settingsManager.settings.minimapEnabled} onclick={() => settingsManager.update({ minimapEnabled: !settingsManager.settings.minimapEnabled })} title="Toggle Minimap">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="14" height="14" rx="1" /><rect x="10" y="2" width="4" height="12" rx="0.5" opacity="0.4" fill="currentColor" /><line x1="3" y1="4" x2="8" y2="4" /><line x1="3" y1="7" x2="7" y2="7" /><line x1="3" y1="10" x2="8" y2="10" /></svg>
      </button>
      <button class="extra-btn" onclick={() => modal.open('commandPalette')} title="Command Palette (Ctrl+Shift+P)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l-3 4 3 4" /><path d="M12 4l3 4-3 4" /></svg>
      </button>
      <button class="extra-btn" onclick={() => modal.open('settings')} title="Settings">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5l.7 2.1a4.5 4.5 0 011.7 1l2.1-.7 1 1.7-1.4 1.5a4.5 4.5 0 010 1.8l1.4 1.5-1 1.7-2.1-.7a4.5 4.5 0 01-1.7 1L8 14.5l-1.7 0-.7-2.1a4.5 4.5 0 01-1.7-1l-2.1.7-1-1.7 1.4-1.5a4.5 4.5 0 010-1.8L.8 5.6l1-1.7 2.1.7a4.5 4.5 0 011.7-1L6.3 1.5z" /></svg>
      </button>
      <button class="extra-btn" onclick={() => layout.zenMode = true} title="Zen Mode (F11)">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 1,1 5,1" /><polyline points="11,1 15,1 15,5" /><polyline points="15,11 15,15 11,15" /><polyline points="5,15 1,15 1,11" /></svg>
      </button>
    </div>
  </div>
  {/if}

  {#if workspace.openFiles.length > 0}
    <div class="tabs-area">
      <Tabs
        openFiles={workspace.openFileTabs}
        activeFile={workspace.currentFile}
        onSelectTab={(path) => workspace.selectTab(path)}
        onCloseTab={(path) => workspace.closeTab(path)}
      />
    </div>
  {/if}

  <div class="main-area" style="grid-template-columns: {layout.gridColumns}">
    <div class="sidebar-panel" class:hidden={!layout.sidebarVisible || layout.zenMode}>
      <div class="sidebar-tabs">
        <button
          class="sidebar-tab"
          class:active={layout.sidebarMode === 'files'}
          onclick={() => layout.setSidebarMode('files')}
          title="Files"
        ><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3a1 1 0 011-1h4l2 2h5a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1z" /></svg></button>
        <button
          class="sidebar-tab"
          class:active={layout.sidebarMode === 'search'}
          onclick={() => layout.setSidebarMode('search')}
          title="Search"
        ><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="4.5" /><line x1="10" y1="10" x2="14.5" y2="14.5" /></svg></button>
        <button
          class="sidebar-tab"
          class:active={layout.sidebarMode === 'git'}
          onclick={() => layout.setSidebarMode('git')}
          title="Git"
        ><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="4" r="2" /><circle cx="4" cy="13" r="2" /><circle cx="12" cy="7" r="2" /><line x1="4" y1="6" x2="4" y2="11" /><path d="M4 6c0 2 2 3 4 3h2" /></svg></button>
        <button
          class="sidebar-tab"
          class:active={layout.sidebarMode === 'toc'}
          onclick={() => layout.setSidebarMode('toc')}
          title="Table of Contents"
        ><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="3" x2="14" y2="3" /><line x1="5" y1="6.5" x2="14" y2="6.5" /><line x1="5" y1="10" x2="14" y2="10" /><line x1="3" y1="13.5" x2="14" y2="13.5" /></svg></button>
        <button
          class="sidebar-tab"
          class:active={layout.sidebarMode === 'ai'}
          onclick={() => layout.setSidebarMode('ai')}
          title="AI Helper (Ctrl+Shift+A)"
        ><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1v2M4.5 2.5l1 1.7M11.5 2.5l-1 1.7" /><circle cx="8" cy="9" r="5" /><circle cx="6.5" cy="8" r="1" fill="currentColor" /><circle cx="9.5" cy="8" r="1" fill="currentColor" /><path d="M6 11c.5.6 1.2 1 2 1s1.5-.4 2-1" /></svg></button>
        <button
          class="sidebar-tab"
          class:active={layout.sidebarMode === 'backlinks'}
          onclick={() => layout.setSidebarMode('backlinks')}
          title="Backlinks (Ctrl+Shift+B)"
        ><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2H6l-1 4h6l-1 4H6" /><line x1="5" y1="10" x2="4" y2="14" /><line x1="10" y1="10" x2="11" y2="14" /></svg></button>
      </div>
      <div class="sidebar-content">
        {#if layout.sidebarMode === 'files'}
          <FileTree
            fileTree={workspace.fileTree}
            currentFile={workspace.currentFile}
            onFileSelect={(path) => workspace.selectFile(path)}
            onRenameFile={(o, n) => workspace.renameFile(o, n)}
            onDeleteFile={(p) => workspace.deleteFile(p)}
            onCreateFile={(p) => workspace.createFile(p)}
          />
        {:else if layout.sidebarMode === 'search'}
          <SearchPanel
            currentFolder={workspace.currentFolder}
            onFileSelect={(path) => workspace.selectFile(path)}
          />
        {:else if layout.sidebarMode === 'git'}
          <GitPanel currentFolder={workspace.currentFolder} />
        {:else if layout.sidebarMode === 'toc'}
          <TocPanel
            content={workspace.content}
            onNavigate={handleTocNavigate}
          />
        {:else if layout.sidebarMode === 'ai'}
          <AIPanel
            content={workspace.content}
            selectedText={workspace.selectedText}
            onInsertText={handleAiInsertText}
            onReplaceSelection={handleAiReplaceSelection}
            onClose={() => layout.setSidebarMode('files')}
          />
        {:else if layout.sidebarMode === 'backlinks'}
          <BacklinksPanel
            currentFile={workspace.currentFile}
            currentFolder={workspace.currentFolder}
            onFileSelect={(path) => workspace.selectFile(path)}
          />
        {/if}
      </div>
    </div>

    <div
      class="splitter"
      class:hidden={!layout.sidebarVisible || layout.zenMode}
      class:active={layout.draggingSplitter === 'tree'}
      onpointerdown={(e) => layout.startDrag('tree', e)}
      role="separator"
      aria-orientation="vertical"
      tabindex="-1"
    ></div>

    <div class="editor-panel">
      {#if workspace.currentFile}
        {#if !layout.zenMode}
          <Breadcrumb currentFile={workspace.currentFile} currentFolder={workspace.currentFolder} />
        {/if}
        <MarkdownToolbar onInsert={handleToolbarInsert} />
        <Editor
          content={workspace.content}
          onContentChange={(c) => workspace.updateContent(c)}
          {theme}
          onSave={() => workspace.save()}
          onScrollChange={(f) => layout.handleEditorScroll(f)}
          scrollFraction={layout.scrollSource === 'preview' ? layout.scrollFraction : undefined}
          insertCommand={workspace.insertCommand}
          onCommandProcessed={() => workspace.clearInsert()}
          onImagePaste={(f) => workspace.handleImagePaste(f)}
          focusMode={layout.focusModeEnabled}
          spellCheck={layout.spellCheckEnabled}
          minimapEnabled={settingsManager.settings.minimapEnabled}
          inlineImages={settingsManager.settings.inlineImages}
          onSelectionChange={(text) => { workspace.selectedText = text; }}
        />
      {:else}
        <div class="panel-placeholder">Select a file to edit</div>
      {/if}
    </div>

    <div
      class="splitter"
      class:active={layout.draggingSplitter === 'editor'}
      onpointerdown={(e) => layout.startDrag('editor', e)}
      role="separator"
      aria-orientation="vertical"
      tabindex="-1"
    ></div>

    <div class="preview-panel">
      {#if workspace.currentFile}
        <Preview
          content={workspace.content}
          {theme}
          onScrollChange={(f) => layout.handlePreviewScroll(f)}
          scrollFraction={layout.scrollSource === 'editor' ? layout.scrollFraction : undefined}
          onWikiLinkClick={async (target) => {
            if (!workspace.currentFolder) return;
            const files = workspace.fileTree.flatMap(function flatten(f: import('$lib/types').FileEntry): string[] {
              if (f.is_directory && f.children) return f.children.flatMap(flatten);
              return [f.path];
            });
            const normalized = target.toLowerCase().replace(/\s+/g, '-');
            const match = files.find(f => {
              const name = (f.split(/[\\/]/).pop() ?? '').replace(/\.md$/i, '').toLowerCase();
              return name === normalized || name === target.toLowerCase();
            });
            if (match) await workspace.selectFile(match);
            else toastManager.info('File not found: ' + target);
          }}
        />
      {:else}
        <div class="panel-placeholder">Preview will appear here</div>
      {/if}
    </div>
  </div>

  {#if !layout.zenMode}
  <div class="statusbar-area">
    <StatusBar
      currentFile={workspace.currentFile}
      content={workspace.content}
      {theme}
      onToggleTheme={handleToggleTheme}
    />
  </div>
  {/if}
</div>

<!-- Modals: single active modal at a time -->
{#if modal.isOpen('settings')}
  <SettingsPanel onClose={() => modal.close()} {theme} />
{/if}

{#if modal.isOpen('diffView')}
  <DiffView currentFile={workspace.currentFile} currentFolder={workspace.currentFolder} onClose={() => modal.close()} {theme} />
{/if}

{#if modal.isOpen('diagramEditor')}
  <DiagramEditor
    initialCode={diagramEditorCode}
    onSave={handleDiagramSave}
    onClose={() => modal.close()}
    {theme}
  />
{/if}

{#if modal.isOpen('commandPalette')}
  <CommandPalette
    onExecute={handleCommandExecute}
    onClose={() => modal.close()}
  />
{/if}

{#if modal.isOpen('tableEditor')}
  <TableEditor
    onInsert={handleTableInsert}
    onClose={() => modal.close()}
  />
{/if}

{#if modal.isOpen('presentation')}
  <PresentationMode
    content={workspace.content}
    {theme}
    onClose={() => modal.close()}
  />
{/if}

{#if modal.isOpen('customCss')}
  <CustomCssEditor
    onClose={() => modal.close()}
    {theme}
  />
{/if}

{#if modal.isOpen('themePicker')}
  <ThemePicker
    currentThemeId={currentThemeId}
    onSelect={(id) => { handleThemeSelect(id); modal.close(); }}
    onClose={() => modal.close()}
  />
{/if}

{#if modal.isOpen('pluginManager')}
  <PluginManager
    onClose={() => modal.close()}
    {theme}
  />
{/if}

{#if modal.isOpen('graphView')}
  <GraphView
    currentFolder={workspace.currentFolder}
    currentFile={workspace.currentFile}
    {theme}
    onFileSelect={(path) => { workspace.selectFile(path); modal.close(); }}
    onClose={() => modal.close()}
  />
{/if}

{#if modal.isOpen('mindMap')}
  <MindMapView
    content={workspace.content}
    {theme}
    onNavigate={handleTocNavigate}
    onClose={() => modal.close()}
  />
{/if}

{#if modal.isOpen('templateModal')}
  <TemplateModal
    onSelect={(templateContent) => {
      const sep = (workspace.currentFolder ?? '').includes('/') ? '/' : '\\';
      const name = 'untitled-' + Date.now() + '.md';
      const path = (workspace.currentFolder ?? '') + sep + name;
      workspace.openFiles = [...workspace.openFiles, { path, name, content: templateContent, originalContent: '' }];
      workspace.currentFile = path;
      workspace.content = templateContent;
      modal.close();
    }}
    onSaveTemplate={(name) => {
      if (workspace.content) {
        templateManager.saveCustom(name, workspace.content);
        toastManager.success('Template saved: ' + name);
      }
    }}
    onClose={() => modal.close()}
  />
{/if}

{#if modal.isOpen('imageGallery')}
  <ImageGallery
    currentFolder={workspace.currentFolder}
    onInsertImage={(md) => { workspace.sendInsert('__raw:' + md); }}
    onClose={() => modal.close()}
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
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

  .splitter.hidden {
    visibility: hidden;
    pointer-events: none;
  }

  .sidebar-panel.hidden {
    visibility: hidden;
    pointer-events: none;
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
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

  .extra-btn.active-toggle {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  /* Print: show only the preview panel */
  @media print {
    .toolbar-area,
    .tabs-area,
    .toolbar-extra,
    .statusbar-area,
    .sidebar-panel,
    .splitter,
    .editor-panel {
      display: none !important;
    }

    .app-layout {
      display: block !important;
      height: auto !important;
      overflow: visible !important;
    }

    .main-area {
      display: block !important;
      height: auto !important;
      overflow: visible !important;
    }

    .preview-panel {
      display: block !important;
      height: auto !important;
      overflow: visible !important;
      background: white !important;
    }
  }
</style>

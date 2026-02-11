import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { FileEntry } from '$lib/types';
import { toastManager } from '$lib/toast.svelte';
import { startWatching, stopWatching, type FileChangeEvent } from '$lib/watcher';
import { recentFiles } from '$lib/recent-files.svelte';

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  originalContent: string;
}

class WorkspaceStore {
  currentFolder = $state<string | null>(null);
  currentFile = $state<string | null>(null);
  fileTree = $state<FileEntry[]>([]);
  content = $state('');
  openFiles = $state<OpenFile[]>([]);
  selectedText = $state('');

  /** Insert command sent from toolbar/command palette to the editor. */
  insertCommand = $state<{ type: string; timestamp: number } | null>(null);

  /** Derived: tab descriptors for the Tabs component. */
  get openFileTabs() {
    return this.openFiles.map(f => ({
      path: f.path,
      name: f.name,
      modified: f.content !== f.originalContent,
    }));
  }

  // --- File operations ---

  async openFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === 'string') {
      await stopWatching().catch(() => {});

      this.currentFolder = selected;
      this.currentFile = null;
      this.content = '';
      this.openFiles = [];

      try {
        this.fileTree = await invoke<FileEntry[]>('read_directory', { path: selected });
      } catch {
        toastManager.error('Failed to read directory');
        this.fileTree = [];
      }

      startWatching(selected, (changes) => this.handleFileChanges(changes)).catch(() => {});
      recentFiles.add(selected, 'folder');
    }
  }

  async selectFile(path: string) {
    const existing = this.openFiles.find(f => f.path === path);
    if (existing) {
      this.currentFile = path;
      this.content = existing.content;
      return;
    }

    try {
      const fileContent = await invoke<string>('read_file', { path });
      const name = path.split(/[\\/]/).pop() ?? path;

      this.openFiles = [...this.openFiles, {
        path,
        name,
        content: fileContent,
        originalContent: fileContent,
      }];

      this.currentFile = path;
      this.content = fileContent;
      recentFiles.add(path, 'file');
    } catch {
      toastManager.error('Failed to read file');
    }
  }

  selectTab(path: string) {
    const file = this.openFiles.find(f => f.path === path);
    if (file) {
      this.currentFile = path;
      this.content = file.content;
    }
  }

  closeTab(path: string) {
    this.openFiles = this.openFiles.filter(f => f.path !== path);
    if (this.currentFile === path) {
      const next = this.openFiles.length > 0 ? this.openFiles[this.openFiles.length - 1] : null;
      if (next) {
        this.currentFile = next.path;
        this.content = next.content;
      } else {
        this.currentFile = null;
        this.content = '';
      }
    }
  }

  updateContent(newContent: string) {
    this.content = newContent;
    const idx = this.openFiles.findIndex(f => f.path === this.currentFile);
    if (idx !== -1) {
      this.openFiles[idx].content = newContent;
    }
  }

  async save() {
    if (!this.currentFile) return;
    try {
      await invoke('write_file', { path: this.currentFile, content: this.content });
      const idx = this.openFiles.findIndex(f => f.path === this.currentFile);
      if (idx !== -1) {
        this.openFiles[idx].originalContent = this.content;
      }
      toastManager.success('File saved');
    } catch {
      toastManager.error('Failed to save file');
    }
  }

  async renameFile(oldPath: string, newPath: string) {
    try {
      await invoke('rename_file', { oldPath, newPath });
      const idx = this.openFiles.findIndex(f => f.path === oldPath);
      if (idx !== -1) {
        this.openFiles[idx].path = newPath;
        this.openFiles[idx].name = newPath.split(/[\\/]/).pop() ?? newPath;
      }
      if (this.currentFile === oldPath) this.currentFile = newPath;
      await this.refreshTree();
      toastManager.success('File renamed');
    } catch {
      toastManager.error('Failed to rename file');
    }
  }

  async deleteFile(path: string) {
    try {
      await invoke('delete_file', { path });
      this.closeTab(path);
      await this.refreshTree();
      toastManager.success('File deleted');
    } catch {
      toastManager.error('Failed to delete file');
    }
  }

  async createFile(folderPath: string) {
    const sep = folderPath.includes('/') ? '/' : '\\';
    const newPath = folderPath + sep + 'new-file.md';
    try {
      await invoke('create_file', { path: newPath });
      await this.refreshTree();
      await this.selectFile(newPath);
      toastManager.success('File created');
    } catch {
      toastManager.error('Failed to create file');
    }
  }

  async handleImagePaste(file: File) {
    if (!this.currentFolder || !this.currentFile) return;
    try {
      const arrayBuf = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(arrayBuf));
      const ext = file.type.split('/')[1] || 'png';
      const filename = `image-${Date.now()}.${ext}`;
      await invoke('save_image', {
        folder: this.currentFolder,
        filename,
        data,
      });
      this.insertCommand = { type: '__raw:![image](assets/' + filename + ')', timestamp: Date.now() };
    } catch {
      toastManager.error('Failed to paste image');
    }
  }

  sendInsert(type: string) {
    this.insertCommand = { type, timestamp: Date.now() };
  }

  clearInsert() {
    this.insertCommand = null;
  }

  // --- Recent file/folder selection ---

  async openRecentFolder(path: string) {
    await stopWatching().catch(() => {});
    this.currentFolder = path;
    this.currentFile = null;
    this.content = '';
    this.openFiles = [];

    try {
      this.fileTree = await invoke<FileEntry[]>('read_directory', { path });
      startWatching(path, (changes) => this.handleFileChanges(changes)).catch(() => {});
    } catch {
      toastManager.error('Failed to read directory');
      this.fileTree = [];
    }
  }

  // --- Internal helpers ---

  private async refreshTree() {
    if (this.currentFolder) {
      try {
        this.fileTree = await invoke<FileEntry[]>('read_directory', { path: this.currentFolder });
      } catch { /* ignore */ }
    }
  }

  private async handleFileChanges(changes: FileChangeEvent[]) {
    let needsTreeRefresh = false;

    for (const change of changes) {
      if (change.change_type === 'created' || change.change_type === 'deleted') {
        needsTreeRefresh = true;
      }

      if (change.change_type === 'modified' && change.path === this.currentFile) {
        try {
          const newContent = await invoke<string>('read_file', { path: change.path });
          const file = this.openFiles.find(f => f.path === change.path);
          if (file && file.content === file.originalContent) {
            this.content = newContent;
            file.content = newContent;
            file.originalContent = newContent;
            toastManager.info('File reloaded (external change)');
          }
        } catch { /* ignore */ }
      }
    }

    if (needsTreeRefresh) {
      await this.refreshTree();
    }
  }
}

export const workspace = new WorkspaceStore();

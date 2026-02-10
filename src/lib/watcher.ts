import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface FileChangeEvent {
  path: string;
  change_type: 'modified' | 'created' | 'deleted';
}

export type FileChangeCallback = (changes: FileChangeEvent[]) => void;

let unlisten: UnlistenFn | null = null;

/**
 * Starts watching the given folder for `.md` file changes.
 * The Rust backend polls every 2 seconds and emits `file-changes` events
 * whenever files are created, modified, or deleted.
 */
export async function startWatching(folder: string, callback: FileChangeCallback): Promise<void> {
  // Listen for file-changes events from Rust
  unlisten = await listen<FileChangeEvent[]>('file-changes', (event) => {
    callback(event.payload);
  });

  // Start the Rust watcher
  await invoke('start_watching', { folder });
}

/**
 * Stops the background file watcher and removes the event listener.
 */
export async function stopWatching(): Promise<void> {
  await invoke('stop_watching');
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
}

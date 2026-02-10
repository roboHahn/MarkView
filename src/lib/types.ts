export interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileEntry[];
}

export interface AppState {
  currentFolder: string | null;
  currentFile: string | null;
  fileTree: FileEntry[];
  content: string;
  theme: 'dark' | 'light';
}

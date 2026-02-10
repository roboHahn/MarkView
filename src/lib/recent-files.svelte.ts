export interface RecentItem {
  path: string;
  name: string;
  type: 'file' | 'folder';
  timestamp: number;
}

const STORAGE_KEY = 'markview-recent';
const MAX_ITEMS = 20;

class RecentFilesManager {
  items = $state<RecentItem[]>([]);

  constructor() {
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.items = JSON.parse(stored) as RecentItem[];
      }
    } catch {
      this.items = [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch {
      // Storage may be unavailable
    }
  }

  add(path: string, type: 'file' | 'folder') {
    const name = path.split(/[\\/]/).pop() ?? path;
    const item: RecentItem = {
      path,
      name,
      type,
      timestamp: Date.now(),
    };

    // Remove duplicates by path
    this.items = [item, ...this.items.filter((i) => i.path !== path)].slice(0, MAX_ITEMS);
    this.save();
  }

  clear() {
    this.items = [];
    this.save();
  }
}

export const recentFiles = new RecentFilesManager();

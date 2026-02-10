export interface AppSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
}

const STORAGE_KEY = 'markview-settings';

const defaults: AppSettings = {
  fontSize: 15,
  tabSize: 2,
  wordWrap: true,
  autoSave: false,
  autoSaveDelay: 5000,
};

class SettingsManager {
  settings = $state<AppSettings>({ ...defaults });

  constructor() {
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>;
        this.settings = { ...defaults, ...parsed };
      }
    } catch {
      this.settings = { ...defaults };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Storage may be unavailable
    }
  }

  update(partial: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.save();
  }

  reset() {
    this.settings = { ...defaults };
    this.save();
  }
}

export const settingsManager = new SettingsManager();

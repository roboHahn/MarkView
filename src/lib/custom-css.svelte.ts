const STORAGE_KEY = 'markview-custom-css';

class CustomCssManager {
  value = $state('');

  constructor() {
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.value = stored;
      }
    } catch {
      this.value = '';
    }
  }

  set(css: string) {
    this.value = css;
    try {
      localStorage.setItem(STORAGE_KEY, css);
    } catch {
      // Storage may be unavailable
    }
  }

  reset() {
    this.value = '';
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage may be unavailable
    }
  }
}

export const customCss = new CustomCssManager();

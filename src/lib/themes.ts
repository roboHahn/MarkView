export interface ThemeColors {
  '--bg-primary': string;
  '--bg-sidebar': string;
  '--bg-editor': string;
  '--bg-preview': string;
  '--bg-toolbar': string;
  '--bg-statusbar': string;
  '--border': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--accent': string;
  '--accent-hover': string;
  '--hover-bg': string;
  '--active-bg': string;
  '--error': string;
  '--success': string;
  '--scrollbar-thumb': string;
  '--scrollbar-track': string;
  '--toast-bg': string;
  '--toast-error': string;
  '--toast-success': string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: ThemeColors;
}

const THEME_STORAGE_KEY = 'markview-custom-theme';

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

const darkTheme: ThemeDefinition = {
  id: 'dark',
  name: 'Dark',
  type: 'dark',
  colors: {
    '--bg-primary': '#1e1e2e',
    '--bg-sidebar': '#1a1a2e',
    '--bg-editor': '#181825',
    '--bg-preview': '#242438',
    '--bg-toolbar': '#181825',
    '--bg-statusbar': '#11111b',
    '--border': '#313244',
    '--text-primary': '#cdd6f4',
    '--text-secondary': '#bac2de',
    '--text-muted': '#6c7086',
    '--accent': '#89b4fa',
    '--accent-hover': '#74c7ec',
    '--hover-bg': '#313244',
    '--active-bg': '#45475a',
    '--error': '#f38ba8',
    '--success': '#a6e3a1',
    '--scrollbar-thumb': '#45475a',
    '--scrollbar-track': '#1e1e2e',
    '--toast-bg': '#313244',
    '--toast-error': '#f38ba8',
    '--toast-success': '#a6e3a1',
  },
};

const lightTheme: ThemeDefinition = {
  id: 'light',
  name: 'Light',
  type: 'light',
  colors: {
    '--bg-primary': '#ffffff',
    '--bg-sidebar': '#f0f0f0',
    '--bg-editor': '#fafafa',
    '--bg-preview': '#f5f5f5',
    '--bg-toolbar': '#fafafa',
    '--bg-statusbar': '#e8e8e8',
    '--border': '#e0e0e0',
    '--text-primary': '#1e1e2e',
    '--text-secondary': '#444444',
    '--text-muted': '#6c7086',
    '--accent': '#1e66f5',
    '--accent-hover': '#1a5ae0',
    '--hover-bg': '#e8e8e8',
    '--active-bg': '#d0d0d0',
    '--error': '#d32f2f',
    '--success': '#388e3c',
    '--scrollbar-thumb': '#c0c0c0',
    '--scrollbar-track': '#f0f0f0',
    '--toast-bg': '#e8e8e8',
    '--toast-error': '#d32f2f',
    '--toast-success': '#388e3c',
  },
};

const solarizedDarkTheme: ThemeDefinition = {
  id: 'solarized-dark',
  name: 'Solarized Dark',
  type: 'dark',
  colors: {
    '--bg-primary': '#002b36',
    '--bg-sidebar': '#002028',
    '--bg-editor': '#00212b',
    '--bg-preview': '#003847',
    '--bg-toolbar': '#00212b',
    '--bg-statusbar': '#001b24',
    '--border': '#094959',
    '--text-primary': '#839496',
    '--text-secondary': '#93a1a1',
    '--text-muted': '#586e75',
    '--accent': '#268bd2',
    '--accent-hover': '#2aa198',
    '--hover-bg': '#073642',
    '--active-bg': '#094959',
    '--error': '#dc322f',
    '--success': '#859900',
    '--scrollbar-thumb': '#094959',
    '--scrollbar-track': '#002b36',
    '--toast-bg': '#073642',
    '--toast-error': '#dc322f',
    '--toast-success': '#859900',
  },
};

const solarizedLightTheme: ThemeDefinition = {
  id: 'solarized-light',
  name: 'Solarized Light',
  type: 'light',
  colors: {
    '--bg-primary': '#fdf6e3',
    '--bg-sidebar': '#eee8d5',
    '--bg-editor': '#fdf6e3',
    '--bg-preview': '#f5efdc',
    '--bg-toolbar': '#eee8d5',
    '--bg-statusbar': '#e6dfcc',
    '--border': '#d3cbb7',
    '--text-primary': '#657b83',
    '--text-secondary': '#586e75',
    '--text-muted': '#93a1a1',
    '--accent': '#268bd2',
    '--accent-hover': '#2aa198',
    '--hover-bg': '#eee8d5',
    '--active-bg': '#ddd6c1',
    '--error': '#dc322f',
    '--success': '#859900',
    '--scrollbar-thumb': '#c9c1ad',
    '--scrollbar-track': '#eee8d5',
    '--toast-bg': '#eee8d5',
    '--toast-error': '#dc322f',
    '--toast-success': '#859900',
  },
};

const monokaiTheme: ThemeDefinition = {
  id: 'monokai',
  name: 'Monokai',
  type: 'dark',
  colors: {
    '--bg-primary': '#272822',
    '--bg-sidebar': '#1e1f1a',
    '--bg-editor': '#222318',
    '--bg-preview': '#2d2e27',
    '--bg-toolbar': '#222318',
    '--bg-statusbar': '#1a1b16',
    '--border': '#3e3f38',
    '--text-primary': '#f8f8f2',
    '--text-secondary': '#cfcfc2',
    '--text-muted': '#75715e',
    '--accent': '#a6e22e',
    '--accent-hover': '#66d9ef',
    '--hover-bg': '#3e3f38',
    '--active-bg': '#4a4b44',
    '--error': '#f92672',
    '--success': '#a6e22e',
    '--scrollbar-thumb': '#4a4b44',
    '--scrollbar-track': '#272822',
    '--toast-bg': '#3e3f38',
    '--toast-error': '#f92672',
    '--toast-success': '#a6e22e',
  },
};

const nordTheme: ThemeDefinition = {
  id: 'nord',
  name: 'Nord',
  type: 'dark',
  colors: {
    '--bg-primary': '#2e3440',
    '--bg-sidebar': '#272c36',
    '--bg-editor': '#2a303c',
    '--bg-preview': '#333a47',
    '--bg-toolbar': '#2a303c',
    '--bg-statusbar': '#242933',
    '--border': '#3b4252',
    '--text-primary': '#eceff4',
    '--text-secondary': '#d8dee9',
    '--text-muted': '#616e88',
    '--accent': '#88c0d0',
    '--accent-hover': '#81a1c1',
    '--hover-bg': '#3b4252',
    '--active-bg': '#434c5e',
    '--error': '#bf616a',
    '--success': '#a3be8c',
    '--scrollbar-thumb': '#434c5e',
    '--scrollbar-track': '#2e3440',
    '--toast-bg': '#3b4252',
    '--toast-error': '#bf616a',
    '--toast-success': '#a3be8c',
  },
};

const draculaTheme: ThemeDefinition = {
  id: 'dracula',
  name: 'Dracula',
  type: 'dark',
  colors: {
    '--bg-primary': '#282a36',
    '--bg-sidebar': '#21222c',
    '--bg-editor': '#242530',
    '--bg-preview': '#2d2f3d',
    '--bg-toolbar': '#242530',
    '--bg-statusbar': '#1d1e28',
    '--border': '#44475a',
    '--text-primary': '#f8f8f2',
    '--text-secondary': '#e0e0d8',
    '--text-muted': '#6272a4',
    '--accent': '#bd93f9',
    '--accent-hover': '#ff79c6',
    '--hover-bg': '#44475a',
    '--active-bg': '#535669',
    '--error': '#ff5555',
    '--success': '#50fa7b',
    '--scrollbar-thumb': '#535669',
    '--scrollbar-track': '#282a36',
    '--toast-bg': '#44475a',
    '--toast-error': '#ff5555',
    '--toast-success': '#50fa7b',
  },
};

const githubLightTheme: ThemeDefinition = {
  id: 'github-light',
  name: 'GitHub Light',
  type: 'light',
  colors: {
    '--bg-primary': '#ffffff',
    '--bg-sidebar': '#f6f8fa',
    '--bg-editor': '#ffffff',
    '--bg-preview': '#f6f8fa',
    '--bg-toolbar': '#f6f8fa',
    '--bg-statusbar': '#ebeef1',
    '--border': '#d0d7de',
    '--text-primary': '#1f2328',
    '--text-secondary': '#424a53',
    '--text-muted': '#656d76',
    '--accent': '#0969da',
    '--accent-hover': '#0550ae',
    '--hover-bg': '#ebeef1',
    '--active-bg': '#d0d7de',
    '--error': '#cf222e',
    '--success': '#1a7f37',
    '--scrollbar-thumb': '#c0c8d0',
    '--scrollbar-track': '#f6f8fa',
    '--toast-bg': '#ebeef1',
    '--toast-error': '#cf222e',
    '--toast-success': '#1a7f37',
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const themes: ThemeDefinition[] = [
  darkTheme,
  lightTheme,
  solarizedDarkTheme,
  solarizedLightTheme,
  monokaiTheme,
  nordTheme,
  draculaTheme,
  githubLightTheme,
];

/**
 * Retrieve a theme by id. Falls back to the default dark theme.
 */
export function getTheme(id: string): ThemeDefinition {
  return themes.find((t) => t.id === id) ?? darkTheme;
}

/**
 * Apply a theme by setting CSS custom properties on the document root and
 * updating the `data-theme` attribute so the existing CodeMirror theme
 * selection (dark / light) continues to work.
 */
export function applyTheme(theme: ThemeDefinition): void {
  const root = document.documentElement;

  // Set data-theme for CodeMirror and any CSS selectors that rely on it
  root.setAttribute('data-theme', theme.type);

  // Apply every color variable
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Read the stored theme id from localStorage. Returns an empty string when
 * nothing has been persisted yet, letting callers fall back to a default.
 */
export function getStoredThemeId(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Persist the chosen theme id into localStorage.
 */
export function storeThemeId(id: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Storage may be unavailable
  }
}

export interface PluginCommand {
  id: string;
  name: string;
  execute: () => void;
}

export interface MarkViewPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  // Lifecycle hooks
  onActivate?: () => void;
  onDeactivate?: () => void;
  // Extension points
  markdownPlugin?: any; // markdown-it plugin
  editorExtension?: any; // CodeMirror extension
  previewTransform?: (html: string) => string; // transform preview HTML
  commands?: PluginCommand[]; // commands for command palette
}

const STORAGE_KEY = 'markview-plugins-enabled';

class PluginManager {
  plugins = $state<MarkViewPlugin[]>([]);

  constructor() {
    // Enabled state is restored lazily when plugins register themselves.
  }

  // ---------------------------------------------------------------------------
  // Persistence helpers
  // ---------------------------------------------------------------------------

  private loadEnabledMap(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      // ignore
    }
    return {};
  }

  private saveEnabledMap(): void {
    try {
      const map: Record<string, boolean> = {};
      for (const p of this.plugins) {
        map[p.id] = p.enabled;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Storage may be unavailable
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Register a plugin. If there is a persisted enabled/disabled state it will
   * be restored. Otherwise the plugin's initial `enabled` value is used.
   */
  register(plugin: MarkViewPlugin): void {
    // Avoid double-registration
    if (this.plugins.some((p) => p.id === plugin.id)) return;

    // Restore persisted enabled state if available
    const stored = this.loadEnabledMap();
    if (plugin.id in stored) {
      plugin.enabled = stored[plugin.id];
    }

    this.plugins = [...this.plugins, plugin];

    // Fire lifecycle hook if registering as enabled
    if (plugin.enabled && plugin.onActivate) {
      try {
        plugin.onActivate();
      } catch {
        // Prevent a broken plugin from crashing the app
      }
    }

    this.saveEnabledMap();
  }

  /**
   * Enable a plugin by id.
   */
  enable(pluginId: string): void {
    this.plugins = this.plugins.map((p) => {
      if (p.id !== pluginId || p.enabled) return p;
      const updated = { ...p, enabled: true };
      if (updated.onActivate) {
        try {
          updated.onActivate();
        } catch {
          // Prevent a broken plugin from crashing the app
        }
      }
      return updated;
    });
    this.saveEnabledMap();
  }

  /**
   * Disable a plugin by id.
   */
  disable(pluginId: string): void {
    this.plugins = this.plugins.map((p) => {
      if (p.id !== pluginId || !p.enabled) return p;
      if (p.onDeactivate) {
        try {
          p.onDeactivate();
        } catch {
          // Prevent a broken plugin from crashing the app
        }
      }
      return { ...p, enabled: false };
    });
    this.saveEnabledMap();
  }

  /**
   * Toggle a plugin's enabled state.
   */
  toggle(pluginId: string): void {
    const plugin = this.plugins.find((p) => p.id === pluginId);
    if (!plugin) return;
    if (plugin.enabled) {
      this.disable(pluginId);
    } else {
      this.enable(pluginId);
    }
  }

  /**
   * Return a snapshot of all currently enabled plugins.
   */
  getEnabled(): MarkViewPlugin[] {
    return this.plugins.filter((p) => p.enabled);
  }
}

export const pluginManager = new PluginManager();

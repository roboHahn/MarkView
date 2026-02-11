export type SidebarMode = 'files' | 'search' | 'git' | 'toc' | 'ai' | 'backlinks';

const STORAGE_KEY = 'markview-layout';

interface LayoutPrefs {
  fileTreeWidth: number;
  editorFraction: number;
  sidebarVisible: boolean;
  sidebarMode: SidebarMode;
}

const defaults: LayoutPrefs = {
  fileTreeWidth: 220,
  editorFraction: 0.5,
  sidebarVisible: true,
  sidebarMode: 'files',
};

class LayoutStore {
  fileTreeWidth = $state(defaults.fileTreeWidth);
  editorFraction = $state(defaults.editorFraction);
  sidebarVisible = $state(defaults.sidebarVisible);
  sidebarMode = $state<SidebarMode>(defaults.sidebarMode);
  zenMode = $state(false);
  focusModeEnabled = $state(false);
  spellCheckEnabled = $state(false);

  /** Splitter drag state (not persisted). */
  draggingSplitter = $state<'tree' | 'editor' | null>(null);

  // --- Scroll sync ---
  scrollFraction = $state<number | undefined>(undefined);
  scrollSource = $state<'editor' | 'preview' | null>(null);

  static readonly MIN_TREE = 150;
  static readonly MIN_EDITOR = 200;
  static readonly MIN_PREVIEW = 200;
  static readonly SPLITTER_WIDTH = 4;

  get editorFr() {
    return Math.round(this.editorFraction * 1000);
  }

  get previewFr() {
    return Math.round((1 - this.editorFraction) * 1000);
  }

  get gridColumns() {
    const sw = LayoutStore.SPLITTER_WIDTH;
    if (this.sidebarVisible && !this.zenMode) {
      return `${this.fileTreeWidth}px ${sw}px ${this.editorFr}fr ${sw}px ${this.previewFr}fr`;
    }
    return `0px 0px ${this.editorFr}fr ${sw}px ${this.previewFr}fr`;
  }

  constructor() {
    this.load();
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    this.persist();
  }

  toggleZen() {
    this.zenMode = !this.zenMode;
  }

  setSidebarMode(mode: SidebarMode) {
    this.sidebarMode = mode;
    this.persist();
  }

  toggleSidebarMode(mode: SidebarMode) {
    this.sidebarMode = this.sidebarMode === mode ? 'files' : mode;
  }

  // --- Scroll sync helpers ---
  handleEditorScroll(fraction: number) {
    if (this.scrollSource === 'preview') return;
    this.scrollSource = 'editor';
    this.scrollFraction = fraction;
    queueMicrotask(() => { this.scrollSource = null; });
  }

  handlePreviewScroll(fraction: number) {
    if (this.scrollSource === 'editor') return;
    this.scrollSource = 'preview';
    this.scrollFraction = fraction;
    queueMicrotask(() => { this.scrollSource = null; });
  }

  // --- Splitter drag ---
  startDrag(which: 'tree' | 'editor', e: PointerEvent) {
    this.draggingSplitter = which;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  onDragMove(e: PointerEvent, containerEl: HTMLDivElement | undefined) {
    if (!this.draggingSplitter || !containerEl) return;

    const rect = containerEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalWidth = rect.width;
    const { MIN_TREE, MIN_EDITOR, MIN_PREVIEW, SPLITTER_WIDTH } = LayoutStore;

    if (this.draggingSplitter === 'tree') {
      let newTreeWidth = x;
      const remaining = totalWidth - newTreeWidth - SPLITTER_WIDTH * 2;
      const editorWidth = remaining * this.editorFraction;
      const previewWidth = remaining * (1 - this.editorFraction);

      if (newTreeWidth < MIN_TREE) newTreeWidth = MIN_TREE;
      if (editorWidth < MIN_EDITOR || previewWidth < MIN_PREVIEW) {
        const maxTree = totalWidth - SPLITTER_WIDTH * 2 - MIN_EDITOR - MIN_PREVIEW;
        if (newTreeWidth > maxTree) newTreeWidth = maxTree;
      }
      this.fileTreeWidth = newTreeWidth;
    } else if (this.draggingSplitter === 'editor') {
      const editorStart = this.fileTreeWidth + SPLITTER_WIDTH;
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
      this.editorFraction = newFraction;
    }
  }

  endDrag() {
    if (this.draggingSplitter) {
      this.draggingSplitter = null;
      this.persist();
    }
  }

  // --- Persistence ---
  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored) as Partial<LayoutPrefs>;
        if (prefs.fileTreeWidth != null) this.fileTreeWidth = prefs.fileTreeWidth;
        if (prefs.editorFraction != null) this.editorFraction = prefs.editorFraction;
        if (prefs.sidebarVisible != null) this.sidebarVisible = prefs.sidebarVisible;
        if (prefs.sidebarMode != null) this.sidebarMode = prefs.sidebarMode;
      }
    } catch { /* ignore */ }
  }

  private persist() {
    try {
      const prefs: LayoutPrefs = {
        fileTreeWidth: this.fileTreeWidth,
        editorFraction: this.editorFraction,
        sidebarVisible: this.sidebarVisible,
        sidebarMode: this.sidebarMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch { /* ignore */ }
  }
}

export const layout = new LayoutStore();

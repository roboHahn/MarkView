export type ModalId =
  | 'settings'
  | 'recentFiles'
  | 'diffView'
  | 'emojiPicker'
  | 'snippetMenu'
  | 'commandPalette'
  | 'tableEditor'
  | 'presentation'
  | 'customCss'
  | 'themePicker'
  | 'pluginManager'
  | 'graphView'
  | 'mindMap'
  | 'templateModal'
  | 'imageGallery'
  | 'diagramEditor';

class ModalStore {
  active = $state<ModalId | null>(null);

  /** Data payload for the active modal (e.g. diagram editor code). */
  data = $state<Record<string, unknown>>({});

  open(id: ModalId, payload?: Record<string, unknown>) {
    this.active = id;
    this.data = payload ?? {};
  }

  close() {
    this.active = null;
    this.data = {};
  }

  isOpen(id: ModalId): boolean {
    return this.active === id;
  }

  toggle(id: ModalId) {
    if (this.active === id) {
      this.close();
    } else {
      this.open(id);
    }
  }
}

export const modal = new ModalStore();

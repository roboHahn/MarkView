export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

class ToastManager {
  toasts = $state<Toast[]>([]);
  private nextId = 0;

  add(message: string, type: ToastType = 'info', duration = 3000) {
    const id = this.nextId++;
    this.toasts.push({ id, message, type });
    setTimeout(() => this.remove(id), duration);
  }

  remove(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  success(message: string) {
    this.add(message, 'success');
  }

  error(message: string) {
    this.add(message, 'error', 5000);
  }

  info(message: string) {
    this.add(message, 'info');
  }
}

export const toastManager = new ToastManager();

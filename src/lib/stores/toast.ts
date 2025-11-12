import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: ToastAction[];
}

export interface ToastAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

interface ToastStore {
  toasts: Toast[];
}

function createToastStore() {
  const { subscribe, update, set } = writable<ToastStore>({ toasts: [] });

  return {
    subscribe,

    add: (toast: Omit<Toast, 'id'>) => {
      const id = generateId();
      const newToast: Toast = {
        id,
        duration: 5000,
        ...toast
      };

      update(store => ({
        toasts: [...store.toasts, newToast]
      }));

      // Auto-remove after duration (unless persistent)
      if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
        const timeoutId = setTimeout(() => {
          remove(id);
        }, newToast.duration);

        // Store timeout ID for potential cleanup
        (newToast as any)._timeoutId = timeoutId;
      }

      return id;
    },

    remove: (id: string) => remove(id),

    clear: () => set({ toasts: [] }),

    success: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
      return update(store => {
        const id = generateId();
        const newToast: Toast = {
          id,
          type: 'success',
          title,
          message,
          duration: 4000,
          ...options
        };

        setTimeout(() => remove(id), newToast.duration || 4000);

        return {
          toasts: [...store.toasts, newToast]
        };
      });
    },

    error: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
      return update(store => {
        const id = generateId();
        const newToast: Toast = {
          id,
          type: 'error',
          title,
          message,
          duration: 6000,
          persistent: true,
          ...options
        };

        return {
          toasts: [...store.toasts, newToast]
        };
      });
    },

    warning: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
      return update(store => {
        const id = generateId();
        const newToast: Toast = {
          id,
          type: 'warning',
          title,
          message,
          duration: 5000,
          ...options
        };

        setTimeout(() => remove(id), newToast.duration || 5000);

        return {
          toasts: [...store.toasts, newToast]
        };
      });
    },

    info: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
      return update(store => {
        const id = generateId();
        const newToast: Toast = {
          id,
          type: 'info',
          title,
          message,
          duration: 3000,
          ...options
        };

        setTimeout(() => remove(id), newToast.duration || 3000);

        return {
          toasts: [...store.toasts, newToast]
        };
      });
    }
  };
}

export const toastStore = createToastStore();

function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

let toastStoreInstance: any = null;

function remove(id: string) {
  try {
    // Get the current instance if not available
    if (!toastStoreInstance) {
      toastStoreInstance = toastStore;
    }

    if (toastStoreInstance && typeof toastStoreInstance.update === 'function') {
      toastStoreInstance.update(store => {
        if (store && store.toasts && Array.isArray(store.toasts)) {
          return {
            toasts: store.toasts.filter(toast => toast.id !== id)
          };
        }
        return store;
      });
    }
  } catch (error) {
    console.warn('Failed to remove toast notification:', error);
  }
}

// Convenience functions for direct usage
export const toast = {
  success: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    try {
      return toastStore.success(title, message, options);
    } catch (error) {
      console.warn('Toast success failed:', error);
    }
  },

  error: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    try {
      return toastStore.error(title, message, options);
    } catch (error) {
      console.warn('Toast error failed:', error);
    }
  },

  warning: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    try {
      return toastStore.warning(title, message, options);
    } catch (error) {
      console.warn('Toast warning failed:', error);
    }
  },

  info: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    try {
      return toastStore.info(title, message, options);
    } catch (error) {
      console.warn('Toast info failed:', error);
    }
  },

  add: (toast: Omit<Toast, 'id'>) => {
    try {
      return toastStore.add(toast);
    } catch (error) {
      console.warn('Toast add failed:', error);
    }
  },

  remove: (id: string) => {
    try {
      return toastStore.remove(id);
    } catch (error) {
      console.warn('Toast remove failed:', error);
    }
  },

  clear: () => {
    try {
      return toastStore.clear();
    } catch (error) {
      console.warn('Toast clear failed:', error);
    }
  }
};
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    return id;
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = {
  success: (title: string, message?: string, duration = 4000) => {
    return useToastStore.getState().addToast({ type: 'success', title, message, duration });
  },
  error: (title: string, message?: string, duration = 5000) => {
    return useToastStore.getState().addToast({ type: 'error', title, message, duration });
  },
  info: (title: string, message?: string, duration = 4000) => {
    return useToastStore.getState().addToast({ type: 'info', title, message, duration });
  },
  warning: (title: string, message?: string, duration = 4000) => {
    return useToastStore.getState().addToast({ type: 'warning', title, message, duration });
  },
  dismiss: (id: string) => {
    useToastStore.getState().removeToast(id);
  },
};

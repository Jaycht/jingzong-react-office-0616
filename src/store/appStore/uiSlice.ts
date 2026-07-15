import type { StateCreator } from "zustand";
import { localStorageAdapter } from "../adapter";
import type { AppState, UiSlice } from "./types";

let toastId = 0;

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => ({
  toasts: [],
  showToast: (message, type = "info") => {
    const id = String(++toastId);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  modalId: null,
  openModal: (modalId) => set({ modalId }),
  closeModal: () => set({ modalId: null }),

  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  // 深色模式
  darkMode: localStorageAdapter.getItem("jingzong.darkMode", false),
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      localStorageAdapter.setItem("jingzong.darkMode", next);
      return { darkMode: next };
    }),

  lowPerfMode: localStorageAdapter.getItem("jingzong.lowPerfMode", false),
  toggleLowPerfMode: () =>
    set((s) => {
      const next = !s.lowPerfMode;
      localStorageAdapter.setItem("jingzong.lowPerfMode", next);
      return { lowPerfMode: next };
    }),
});

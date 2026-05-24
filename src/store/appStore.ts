import { create } from "zustand";
import type { PageId, Toast, ToastType } from "../types";
import type { MassRecord } from "./massStore";

let toastId = 0;

interface AppState {
  // View
  view: "login" | "register" | "app";
  setView: (v: "login" | "register" | "app") => void;

  // User
  userName: string;
  userRole: string;
  setUser: (name: string, role: string) => void;

  // Page
  currentPage: PageId;
  setCurrentPage: (p: PageId) => void;

  // Toast
  toasts: Toast[];
  showToast: (msg: string, type?: ToastType) => void;
  removeToast: (id: string) => void;

  // Modal
  modalId: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;

  // Drawer
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Low Performance Mode
  lowPerfMode: boolean;
  toggleLowPerfMode: () => void;

  // Edit
  editRecord: MassRecord | null;
  setEditRecord: (r: MassRecord | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "login",
  setView: (view) => set({ view }),

  userName: "",
  userRole: "",
  setUser: (userName, userRole) => set({ userName, userRole }),

  currentPage: "dashboard",
  setCurrentPage: (currentPage) => set({ currentPage }),

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

  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  darkMode: localStorage.getItem("jingzong.darkMode") === "true",
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      localStorage.setItem("jingzong.darkMode", String(next));
      return { darkMode: next };
    }),

  lowPerfMode: localStorage.getItem("jingzong.lowPerfMode") === "true",
  toggleLowPerfMode: () =>
    set((s) => {
      const next = !s.lowPerfMode;
      localStorage.setItem("jingzong.lowPerfMode", String(next));
      return { lowPerfMode: next };
    }),

  editRecord: null,
  setEditRecord: (editRecord) => set({ editRecord }),
}));

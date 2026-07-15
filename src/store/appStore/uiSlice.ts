import type { StateCreator } from "zustand";
import { localStorageAdapter } from "../adapter";
import type { AppState, UiSlice } from "./types";

let toastId = 0;

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set, get) => ({
  toasts: [],
  showToast: (message, type = "info") => {
    const id = String(++toastId);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    // 操作提示音：info 不响，避免过于频繁；success/warning/error 响一声
    const st = get();
    if (st.soundEnabled && type !== "info") {
      playSound(st.soundType);
    }
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

  // ===== 通用设置：显示密度 =====
  uiDensity: localStorageAdapter.getItem<"standard" | "comfortable" | "compact">("jingzong.uiDensity", "standard"),
  setUiDensity: (v) => {
    localStorageAdapter.setItem("jingzong.uiDensity", v);
    set({ uiDensity: v });
  },

  // ===== 通用设置：操作提示音 =====
  soundEnabled: localStorageAdapter.getItem("jingzong.soundEnabled", false),
  setSoundEnabled: (v) => {
    localStorageAdapter.setItem("jingzong.soundEnabled", v);
    set({ soundEnabled: v });
  },
  soundType: localStorageAdapter.getItem("jingzong.soundType", "QQ消息.wav"),
  setSoundType: (v) => {
    localStorageAdapter.setItem("jingzong.soundType", v);
    set({ soundType: v });
  },

  // ===== 通用设置：列表排序 / 启动行为 / 时间格式 =====
  listSort: localStorageAdapter.getItem<"updatedDesc" | "updatedAsc" | "createdDesc" | "createdAsc" | "module">("jingzong.listSort", "updatedDesc"),
  setListSort: (v) => {
    localStorageAdapter.setItem("jingzong.listSort", v);
    set({ listSort: v });
  },
  startupBehavior: localStorageAdapter.getItem<"dashboard" | "last">("jingzong.startupBehavior", "dashboard"),
  setStartupBehavior: (v) => {
    localStorageAdapter.setItem("jingzong.startupBehavior", v);
    set({ startupBehavior: v });
  },
  timeFormat: localStorageAdapter.getItem<"YYYY-MM-DD" | "YYYY/MM/DD">("jingzong.timeFormat", "YYYY-MM-DD"),
  setTimeFormat: (v) => {
    localStorageAdapter.setItem("jingzong.timeFormat", v);
    set({ timeFormat: v });
  },
});

/** 操作提示音：播放 public/audio 下的 wav（失败静默） */
function playSound(name: string) {
  try {
    const audio = new Audio("/audio/" + name);
    audio.volume = 0.5;
    void audio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

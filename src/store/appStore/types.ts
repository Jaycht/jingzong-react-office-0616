import type { PageId, Toast, ToastType } from "../../types";
import type { MassRecord } from "../massStore";

// 会话 / 导航相关状态
export interface SessionSlice {
  view: "login" | "register" | "app";
  setView: (v: "login" | "register" | "app") => void;

  userName: string;
  userRole: string;
  userBadge: string;
  userPhone: string;
  userDepartment: string;
  setUser: (name: string, role: string, extra?: { badge?: string; phone?: string; department?: string }) => void;
  setUserProfile: (p: { name?: string; badge?: string; phone?: string; department?: string }) => void;

  currentPage: PageId;
  setCurrentPage: (p: PageId) => void;
}

// UI 瞬时状态（通知 / 弹窗 / 抽屉 / 主题 / 性能模式）
export interface UiSlice {
  toasts: Toast[];
  showToast: (msg: string, type?: ToastType) => void;
  removeToast: (id: string) => void;

  modalId: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;

  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;

  darkMode: boolean;
  toggleDarkMode: () => void;

  lowPerfMode: boolean;
  toggleLowPerfMode: () => void;
}

// 编辑上下文（供 DrawerNewRecord 等共享）
export interface EditSlice {
  currentTabId: string;
  setCurrentTabId: (tabId: string) => void;

  editRecord: MassRecord | null;
  setEditRecord: (r: MassRecord | null) => void;
}

export type AppState = SessionSlice & UiSlice & EditSlice;

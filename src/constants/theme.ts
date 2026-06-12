import type { ThemeConfig } from "antd";

/* ============================================================
   品牌色 - 经侦蓝
   ============================================================ */
export const BRAND = {
  primary: "#155A8A",
  primaryLight: "#2E7DCA",
  primaryDark: "#0F3A5F",
  success: "#138A63",
  warning: "#D97706",
  error: "#DC2626",
  info: "#155A8A",
} as const;

/* ============================================================
   浅色主题
   ============================================================ */
export const LIGHT_THEME: ThemeConfig = {
  algorithm: undefined, // defaultAlgorithm
  token: {
    colorPrimary: BRAND.primary,
    colorInfo: BRAND.info,
    colorSuccess: BRAND.success,
    colorWarning: BRAND.warning,
    colorError: BRAND.error,
    borderRadius: 8,
  },
  components: {
    Button: { borderRadius: 6 },
    Table: { headerBg: "#F6F8FB", headerColor: "#475569" },
    Tabs: { itemSelectedColor: BRAND.primary, inkBarColor: BRAND.primary },
  },
};

/* ============================================================
   深色主题
   ============================================================ */
export const DARK_THEME: ThemeConfig = {
  algorithm: undefined, // darkAlgorithm
  token: {
    colorPrimary: "#A3C9FF",
    colorInfo: "#A3C9FF",
    colorSuccess: "#6FCF97",
    colorWarning: "#F5A623",
    colorError: "#FF6B6B",
    borderRadius: 8,
  },
  components: {
    Button: { borderRadius: 6 },
    Table: { headerBg: "#1E2023", headerColor: "#C2C6D0" },
    Tabs: { itemSelectedColor: "#A3C9FF", inkBarColor: "#A3C9FF" },
  },
};

/* ============================================================
   图表 & KPI 颜色（与品牌色联动）
   ============================================================ */

/** KPI 卡片渐变背景 */
export const KPI_GRADIENTS = [
  `linear-gradient(135deg,${BRAND.primaryDark},${BRAND.primaryLight})`,
  `linear-gradient(135deg,#0E7C4B,#38A169)`,
  `linear-gradient(135deg,#C2410C,#E67E22)`,
  `linear-gradient(135deg,#6D28D9,#8B5CF6)`,
];

/** 图表通用颜色序列 */
export const CHART_COLORS = [
  BRAND.primaryLight, "#38A169", "#E67E22", "#9C27B0",
  "#00ACC1", "#D32F2F", "#F59E0B", "#6366F1",
];

/** 统计卡片颜色序列 */
export const STAT_COLORS = [
  BRAND.primaryDark, "#38A169", "#E67E22", "#9C27B0",
  "#00ACC1", "#D32F2F",
];

/** KPI 快捷入口渐变 */
export const KPI_ENTRY_GRADIENTS = [
  `linear-gradient(135deg,${BRAND.primaryDark},${BRAND.primaryLight})`,
  `linear-gradient(135deg,#0E7C4B,#38A169)`,
  `linear-gradient(135deg,#C2410C,#E67E22)`,
  `linear-gradient(135deg,#6D28D9,#8B5CF6)`,
  `linear-gradient(135deg,#0369A1,#0EA5E9)`,
  `linear-gradient(135deg,#86198F,#D946EF)`,
  `linear-gradient(135deg,#166534,#22C55E)`,
  `linear-gradient(135deg,#9A3412,#F97316)`,
];

/** 模块名称映射 — 统一从 moduleConfig 导出，此处仅做 re-export 以保持向后兼容 */
export { MODULE_NAMES } from '../moduleConfig';

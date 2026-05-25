export const APP_VERSION = "V2.5.25";
export const VERSION_MAJOR = 2;
export const VERSION_MINOR = 5;
export const VERSION_PATCH = 25;

export const CHANGELOG: string[] = [
  "V2.5.20 修复 - 欢迎页Logo定位修复，低性能模式Logo与表单同行",
  "V2.5.20 优化 - 工作台月度趋势改为每日趋势展示",
  "V2.5.20 优化 - 更新日志改为真实git记录倒序排列",
  "V2.5.19 修复 - 修复Electron白屏#299（内联脚本移到body前执行）",
  "V2.5.19 修复 - 启动脚本杀Chrome防复用窗口，添加--new-window",
  "V2.5.19 修复 - 启动.bat UTF-8编码+检查Chrome常见安装路径",
  "V2.5.18 重构 - 引入React Router + HashRouter导航",
  "V2.5.18 重构 - 侧边栏导航改用React Router",
  "V2.5.18 新增 - 统一的StorageAdapter（安全localStorage读写）",
  "V2.5.18 新增 - 主题配置集中化（LIGHT_THEME/DARK_THEME）",
  "V2.5.18 新增 - ErrorBoundary全局错误捕获",
  "V2.5.18 修复 - 多人使用同一设备时的localStorage冲突",
  "V2.5.18 修复 - Icon组件在React 19下forwardRef渲染问题",
  "V2.5.18 清理 - 删除perfUtils.ts, caseDeadlineUtils.ts等死代码",
  "V2.5.17 修复 - 模块配置moduleConfig编码损坏恢复",
  "V2.5.17 优化 - Vite配置简化，删除rolldownOptions等无效配置",
  "V2.5.16 修复 - 自动登录循环bug",
  "V2.5.16 修复 - 启动.bat文件编码与兼容性",
  "V2.5.15 新增 - Electron无边框桌面应用支持",
  "V2.5.15 新增 - 低性能模式切换开关",
  "V2.5.14 优化 - 欢迎页翻新设计",
  "V2.5.14 优化 - 侧边栏底部操作移至顶部工具栏",
  "V2.5.13 重构 - 登录页单列布局，移除顶栏",
  "V2.5.13 重构 - Kiosk模式支持",
  "V2.5.12 修复 - 编辑表单字段未填充问题",
  "V2.5.11 新增 - 跨模块/中队数据导入导出",
  "V2.5.10 优化 - 报表生成器增加Word导出",
  "V2.5.9 新增 - 工作台QuickEntry快捷入口",
  "V2.5.8 修复 - AnimatePresence与Suspense竞态条件",
  "V2.5.7 优化 - 面板Shell组件重构",
  "V2.5.6 新增 - 日报/周报/月报自动生成",
  "V2.5.5 修复 - 统计图表数据聚合逻辑",
  "V2.5.4 优化 - 搜索功能增强",
  "V2.5.3 新增 - 角色权限管理",
  "V2.5.2 修复 - 附件上传尺寸限制",
  "V2.5.1 优化 - 数据备份恢复功能",
  "V2.5.0 初始化 - 经侦大队工作记录管理系统基础框架",
];

export const BUILD_DATE = "2026-05-26";

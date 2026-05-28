export const APP_VERSION = "V2.6.27";
export const VERSION_MAJOR = 2;
export const VERSION_MINOR = 6;
export const VERSION_PATCH = 27;

export const CHANGELOG: string[] = [
  // ===== V2.6.27 =====
  "V2.6.27 修复 - Statistics 导出报告/明细改为真实 JSON/XLSX 下载 + OperationLog 导出真实调用 exportOperationLog",
  // ===== V2.6.26 =====
  "V2.6.26 修复 - 附件用 useState 替代 Form.useWatch，修复 fileList is not defined + 恢复预览/下载/删除",
  // ===== V2.6.25 =====
  "V2.6.25 修复 - DynamicField 缺少 form 参数导致编辑时 ReferenceError(form is not defined)",
  // ===== V2.6.24 =====
  "V2.6.24 修复 - 登录页Grid恢复+窗口974px+附件表单内展示/删除+档案页删除按钮+Electron下载弹窗+卸载清理",
  // ===== V2.6.23 =====
  "V2.6.23 新增 - 附件存储双模式：Electron 存硬盘文件夹+浏览器存IndexedDB",
  // ===== V2.6.22 =====
  "V2.6.22 修复 - 记住登录凭据对注册用户也生效+Electron窗口控制改用event.sender",
  // ===== V2.6.21 =====
  "V2.6.21 修复 - 登录页宽度修正+更新日志完全替换+重置数据按钮+附件档案直接从IndexedDB读取+附件下载功能",
  // ===== V2.6.20 =====
  "V2.6.20 修复 - 退出登录改用Modal.confirm静态方法+登录页拖拽条+关闭按钮",
  // ===== V2.6.19 =====
  "V2.6.19 修复 - 附件上传getValueFromEvent+响应式登录页+更新日志排序+Electron窗口控制+版本号同步",
  // ===== V2.6.18 =====
  "V2.6.18 修复 - build/installer.nsh StrCpy 缺少 $INSTDIR 导致 electron-builder 构建失败",
  // ===== V2.6.17 =====
  "V2.6.17 修复 - Vite resolve.dedupe 防止 React 实例重复加载",
  // ===== V2.6.16 =====
  "V2.6.16 修复 - 退出登录去掉 Modal.useModal() 确认弹窗，改为直接退出 + 清除 Store 用户状态",
  // ===== V2.6.15 =====
  "V2.6.15 修复 - 退出登录改用 Modal.useModal() + React Router navigate，修复退出无反应",
  "V2.6.15 修复 - Electron 主窗口统一无边框（frame:false），登录页和主页均无标题栏/菜单栏",
  // ===== V2.6.14（从 git V2.6.13 继续）=====
  "V2.6.14 修复 - 21 个 TypeScript 编译错误（Breadcrumb/Drawer/Dashboard/ImportExport/ModulePage/SquadCase/Attachments/Sidebar）",
  "V2.6.14 修复 - scripts/bump-version.js 不再覆盖 src/version.ts",
  "V2.6.14 修复 - ImportExport.tsx localDate 函数缺失（运行时崩溃）",
  "V2.6.14 修复 - Breadcrumb.tsx PLATFORM_NAV.system 不存在",
  "V2.6.14 修复 - Sidebar.tsx WebkitAppRegion 非标准CSS属性",
  "V2.6.14 修复 - DrawerNewRecord.tsx dayjs unknown 类型",
  "V2.6.14 修复 - ModulePage.tsx/SquadCasePage.tsx/Dashboard.tsx 多处类型错误",

  // ===== git 真实提交记录 =====
  "V2.6.13 优化 - 侧边栏改版 + Electron 无边框窗口 + 更新日志真实化",
  "V2.6.13 新增 - 启动.bat 网页版启动脚本",
  "V2.6.12 修复 - 退出登录后自动登录循环",
  "V2.6.11 清理 - .restore-point 移出版本管理",
  "V2.6.10 修复 - lockfile 同步",
  "V2.6.9 修复 - GitHub Actions workflow YAML",
  "V2.6.8 优化 - 登录窗口宽度 520→660",
  "V2.6.7 重构 - main.cjs 单窗口方案",
  "V2.6.6 优化 - 登录窗口复用",
  "V2.6.5 修复 - Electron 文件 .cjs",
  "V2.6.4 新增 - GitHub Actions 自动构建",
  "V2.6.3 修复 - lowPerfMode store",
  "V2.6.2 修复 - 低性能模式菜单",
  "V2.6.1 新增 - 低性能模式",
  "V2.6.0 新增 - Electron 桌面应用 + 安装包",
  "V2.5.4 修复 - 编辑填充所有字段",
  "V2.5.3 修复 - 编辑表单填充 + 中队案件",
  "V2.5.2 优化 - 报告按钮位置",
  "V2.5.1 修复 - 资金分析报告按钮",
  "V2.5.0 新增 - 字段调整 + 文本报告",
  "V2.4.2 修复 - 日报/周报/月报日期",
  "V2.4.1 修复 - 报告下拉 JSX",
  "V2.4.0 新增 - 日报/周报/月报生成器",
  "V2.3.14 优化 - 版权卡片",
  "V2.3.0 新增 - 注册弹窗 Stitch 风格",
  "V2.2.6 优化 - 欢迎页精简",
  "V2.2.1 新增 - Stitch 欢迎页 + 登录表单",
  "V2.2.0 新增 - Stitch 设计集成",
  "V2.1.0 重构 - Dashboard 2.0",
  "V1.0.0 初始 - jingzong-react 快照建立",
];

export const APP_VERSION = "V2.8.0";
export const VERSION_MAJOR = 2;
export const VERSION_MINOR = 8;
export const VERSION_PATCH = 0;

export const CHANGELOG: string[] = [
  // ===== V2.8.0 =====
  "V2.8.0 新增 - 全局搜索（工作台醒目搜索框，搜遍所有模块，结果按模块分组，点击跳转编辑）",
  "V2.8.0 新增 - 到期预警（依据刑诉法自动计算刑拘30天/取保12月/受案7天等法定期限，过期红标/3天橙标/7天黄标）",
  "V2.8.0 新增 - 案件时间轴（侧边栏独立页面，选案件后展示各模块全部记录按时间排列）",
  "V2.8.0 新增 - 数据量概览（环形进度条 + TOP5模块排行 + 存储用量监控）",
  "V2.8.0 新增 - 手机采集模块（调证分析子模块，10字段含自定义下拉，案件编号/名称全局联动）",
  "V2.8.0 新增 - 全软件案件编号/名称联动（任一模块输入后全软件共享，选名称自动填编号，反之亦然）",
  "V2.8.0 新增 - 输入历史记录（所有文本输入框记录历史，点击展现，最新在前，每字段最多20条）",
  "V2.8.0 重构 - 工作台可视化重做（案件类型→ECharts玫瑰图，模块排行→ECharts渐变柱状图，最近动态→时间线列表）",
  "V2.8.0 重构 - 侧边栏'调证分析组'更名为'调证分析'",
  "V2.8.0 移除 - 侧边栏搜索栏 + 子页面搜索栏（统一由全局搜索替代）",
  "V2.8.0 移除 - 各模块专属案件名称/编号匹配（统一走全局联动）",
  // ===== V2.7.10 =====
  "V2.7.10 修复 - 附件删除不同步仍未解决（第三次重写：直接序列化 JSON 字符串后用正则逐条匹配替换，绕开深拷贝/递归/引用问题）",
  // ===== V2.7.9 =====
  "V2.7.9 修复 - 附件删除不同步（重写清理逻辑：JSON 序列化后解析遍历深拷贝）",
  "V2.7.9 修复 - 补充缺失的 V2.7.7/V2.7.8 版本号迭代",
  // ===== V2.7.8 =====
  "V2.7.8 重构 - 账号历史下拉改为自定义组件（始终显示全部账号 + 过滤 + Framer Motion 动画 + 深色卡片样式）",
  // ===== V2.7.7 =====
  "V2.7.7 修复 - 切换历史账号时记住密码无效（改为按账号独立保存密码映射，切换时自动回填）",
  // ===== V2.7.6 =====
  "V2.7.6 重构 - 首页案件类型分布改为泡泡图（径向渐变+光晕高光+弹簧动画）",
  "V2.7.6 重构 - 首页模块活跃排行改为奖牌榜样式（🥇🥈🥉+不同颜色进度条）",
  "V2.7.6 重构 - 统计页各模块记录对比改为圆顶柱状图（渐变+光影效果）",
  "V2.7.6 修复 - 附件档案删除后不同步清理记录中的引用，导致编辑/查看仍显示已删除附件",
  // ===== V2.7.5 =====
  "V2.7.5 重构 - 首页面板重新设计（案件类型分布改为横向进度条 + 模块活跃排行改为排名列表式进度条）",
  "V2.7.5 重构 - 数据统计图表重新设计（各模块记录对比改为横向进度条 + 记录类型分布改为甜甜圈+网格图例）",
  "V2.7.5 新增 - 附件档案多选 + 批量打包下载（JSZip） + 批量删除",
  "V2.7.5 修复 - 附件档案单附件下载按钮引用已删除函数（ReferenceError: handleDownload）",
  // ===== V2.7.4 =====
  "V2.7.4 修复 - 下载不走 Electron 原生保存对话框（精简下载函数，移除多余 toast 和浏览器兜底干扰，确保弹出另存为弹窗）",
  "V2.7.4 新增 - 账号输入框历史下拉（datalist，保存最近的登录账号）",
  "V2.7.4 修复 - 切换账号时自动清除密码框",
  // ===== V2.7.3 =====
  "V2.7.3 修复 - 编辑时附件仍不显示（AttachmentField 初始值依赖 form.setFieldsValue 时序，改为直接从 editRecord 读取）",
  "V2.7.3 修复 - 注册用户丢失（hashPassword Promise 无 catch，Web Crypto 失败时静默不写入 localStorage；新增降级为明文存储）",
  "V2.7.3 新增 - 查看弹窗附件支持下载",
  // ===== V2.7.2 =====
  "V2.7.2 修复 - 编辑/查看时不显示已上传附件（validFieldIds 排除 attachment 类型，safeData 过滤时丢弃了附件字段数据）",
  "V2.7.2 修复 - 查看弹窗不显示附件信息（Descriptions 同样过滤了 attachment 字段）",
  "V2.7.2 优化 - 去掉附件列表中的预览按钮，仅保留下载",
  // ===== V2.7.1 =====
  "V2.7.1 修复 - 附件预览/下载无反应（window.open 在 await 后被浏览器拦截，改为先开窗口再加载数据）",
  "V2.7.1 修复 - 编辑/查看时不显示已上传附件（Form.useWatch 初始值未同步，改为本地 state + 显式同步）",
  "V2.7.1 修复 - 注册用户登录提示账号或密码错误（SHA-256 哈希后，旧存储的明文密码无法匹配；新增格式检测自动兼容新旧格式）",
  "V2.7.1 修复 - 统计页面各模块记录对比不更新（首次挂载后添加强制刷新 + refreshKey 机制）",
  // ===== V2.7.0 =====
  "V2.7.0 架构 - 双窗口改为单窗口（登录态 974x711 ↹ 主页态 1400x900 平滑切换）",
  "V2.7.0 修复 - 登录后用户名始终显示默认'用户'（跨窗口 store 隔离，改为 localStorage 持久化）",
  "V2.7.0 修复 - 点击列表中'编辑'软件崩溃且无法退出（DynamicField 缺少 pendingAttachments 参数 → ReferenceError -> 已补齐 props 传参）",
  "V2.7.0 修复 - 点击列表中'新建'同样崩溃（同上根因：几乎所有模块含附件字段）",
  "V2.7.0 修复 - 记住账号/密码后重启软件账号框为空（saveCredentials 登录时错误删除了凭据）",
  "V2.7.0 修复 - useUnsavedChanges beforeunload 在 Electron 下阻止窗口关闭",
  "V2.7.0 安全 - 注册密码由明文改为 SHA-256 哈希存储",
  "V2.7.0 优化 - 搜索框加入 300ms 防抖",
  "V2.7.0 优化 - 表单提交 loading 保护（mountedRef 防止卸载后 setState）",
  "V2.7.0 优化 - DrawerNewRecord Modal 恢复 Ant Design 原生 closable 关闭按钮",
  "V2.7.0 优化 - ErrorBoundary 新增 onError 回调，方便上层清理状态",
  // ===== V2.6.29 =====
  "V2.6.29 修复 - 关闭按钮 window.close() 兜底（非 Electron 环境可用）",
  "V2.6.29 修复 - DrawerNewRecord/ModalNewUser 外层 ErrorBoundary 包裹，崩溃不影响主界面",
  "V2.6.29 修复 - ErrorBoundary 捕获 DrawerNewRecord 初始化阶段 React 错误",
  // ===== V2.6.28 =====
  "V2.6.28 重构 - 中队案件管理 SquadCasePage 统一为 ModulePage + massStore + DrawerNewRecord",
  "V2.6.28 移除 - caseStore/CaseList/SquadCasePage 死代码",
  "V2.6.28 修复 - DrawerNewRecord 编辑容错增强（key重挂载+字段匹配过滤）",
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

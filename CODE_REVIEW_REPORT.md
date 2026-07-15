# 代码审查报告 — 经侦大队工作记录管理系统

> 项目：`E:\Deployment\WorkBuddy\jingzong-react-office-0616`
> 技术栈：React 19 + TypeScript + Vite 8 + Ant Design 6 + Zustand 5 + ECharts 6 + react-router-dom 6 + Electron
> 审查范围：7 个维度（Bug / 可修复问题 / 性能 / 冗余 / 架构 / UI / 功能增强）
> 审查方式：逐文件静态分析 + 运行时行为推演；关键数据丢失类问题已对照源码逐行核实（见标注 ✅）

---

## 0. 审查结论速览

这是一款**业务完成度与领域建模相当扎实**的桌面应用（模块化字段引擎、IndexedDB 适配器、附件双模式存储、提醒服务、操作日志、便签等）。但存在 **2 个会导致数据永久丢失的严重缺陷**，以及一批"首次渲染读取空缓存"导致核心页面数据永远为 0 的高危问题、多处事件监听泄漏、以及模块配置/搜索/法定时限的"多份并行定义"问题。

**严重程度统计**

| 严重度 | 数量 | 说明 |
|---|---|---|
| 🔴 Critical | 2 | 数据持久化静默丢失 / 升级用户记录跨重启丢失 |
| 🟠 High | 7 | 草稿不保存、4 个页面挂载空读、备份统计读错存储、重复全量扫描、常量重复定义 |
| 🟡 Medium | 16 | 监听泄漏、存储不一致、ECharts 重建、未 memo、上帝文件等 |
| 🟢 Low | 14 | 死代码、空态缺失、类型脆弱点、冗余三元等 |
| **合计** | **39** | 另有 UI 设计方向（维度6）与功能增强（维度7）建议若干 |

---

## 1. 按严重程度排序的问题清单（维度 1–5）

每条格式：`[维度] 严重度 · 文件:行 — 问题描述 → 修复方向`

### 🔴 Critical（数据丢失，必须立即修复）

**C-1 · [维度1/2] 适配器在数据库未就绪时静默丢弃写入**
- 文件：`src/store/adapter/indexedDBAdapter.ts:66-74`（`persist`）、`:92-95`（`setItem`）、`:76-84`（`removeKey`）
- 问题：`IndexedDBAdapter` 构造函数里异步 `initDB()`，但 `setItem`/`removeItem` 先写内存 `cache` 后调用 `persist`/`removeKey`，这两个私有方法首行都是 `if (!this.db) return;`。当 IndexedDB 尚未 `open` 完成（`this.db === null`）时，写入只进内存缓存、**根本不落盘**。
- 影响：任何在 app 启动、IndexedDB `open` 完成之前的写入，在下次重启后**永久丢失**（内存态随进程退出消失）。✅ 已核实。
- 修复：增加 `pendingWrites` 队列，`setItem`/`removeItem` 在 `db===null` 时入队，待 `whenReady()` 完成后再 flush；或强制所有写操作 `await whenReady()`。

**C-2 · [维度1/2] 启动迁移在 `whenReady()` 之前执行，升级用户记录丢失**
- 文件：`src/main.tsx:14`（同步调用 `migrateLocalStorageToIndexedDB()`）、`src/store/massStore.ts:253-270`（`:263` 调 `indexedDBAdapter.setItem`）
- 问题：`main.tsx` 在模块加载阶段**同步**调用迁移。此时 `db` 仍为 `null`，写入因 C-1 被静默丢弃；同时 `MIGRATION_KEY` 已写入 localStorage。下次启动：迁移标记存在不再执行，而 IndexedDB 为空 → **从旧版（localStorage）升级过来的全部工作记录丢失**。✅ 已核实（`main.tsx:14` 同步调用、`massStore.ts:263` 直接 setItem、`Backup.tsx` 同款问题）。
- 影响：高概率真实事故，升级用户记录跨重启即丢。
- 修复：改为 `indexedDBAdapter.whenReady().then(() => migrateLocalStorageToIndexedDB())`；对照 `src/App.tsx` 中 `migrateOldCasesToMassStore()` 已正确用 `whenReady().then(...)`，此处不一致是根因。

### 🟠 High（核心功能/页面错误）

**H-1 · [维度1] 草稿自动保存的 effect 依赖了 `ref.current`，草稿永不保存**
- 文件：`src/components/DrawerNewRecord.tsx:338-356`（依赖数组 `:356`、首次 `count===0` 直接 return 于 `:342`）、`:516`（`onValuesChange` 中 `changeCountRef.current++`）
- 问题：自动保存 effect 依赖数组含 `changeCountRef.current`，但 `onValuesChange` 仅 `changeCountRef.current++` 而不 `setState`，组件不重渲染，effect 依赖不重新求值 → 挂载后几乎只跑一次且首次直接 return，**之后表单任何改动都不触发自动保存**。✅ 已核实 effect 依赖含 `changeCountRef.current`。
- 影响："自动保存草稿"功能实际不可用，填写中断后重开无法恢复。
- 修复：用 state 计数器替代 ref：`<const [changeCount, setChangeCount] = useState(0)>`，`onValuesChange` 中 `setChangeCount(c => c+1)`，依赖数组用 `changeCount`。

**H-2 · [维度1/2] Dashboard 挂载即读取空缓存，默认首页统计/预警永远为 0**
- 文件：`src/pages/Dashboard.tsx:125`（`useMemo(() => getMassRecords(), [])`）、`:127-135`
- 问题：`getMassRecords()` 从 IndexedDB 内存缓存**同步**读取；Dashboard 是懒加载默认页，在 `whenReady()` 完成前就渲染，缓存为空，依赖 `[]` 之后不再重读。✅ 已核实 `:125` 为 `[]` 依赖。
- 影响：用户看到的第一个页面（工作台）记录数、完成率、本月新增、到期预警全部为 0/空，直到手动切页再回来。
- 修复：参照 `Statistics.tsx:34-46` 的 `refreshKey` + `focus` 监听模式，或 `whenReady()` 后再读取 / 订阅"数据就绪"信号。

**H-3 · [维度1/2] DataVolumeGauge 挂载即读空缓存，且 `totalRecords===0` 时整体不渲染**
- 文件：`src/components/DataVolumeGauge.tsx:33-64`（`useMemo(...,[])`）、`:78`（`if (stats.totalRecords === 0) return null;`）
- 问题：同 H-2，依赖 `[]`；首次空读导致 `totalRecords===0` → `return null`，数据概览面板在有数据时也因首次空读被永久隐藏。
- 修复：增加就绪刷新；且不应以"首次读取为 0"作为隐藏条件（应区分"未就绪"与"确实无数据"）。

**H-4 · [维度1/2] DeadlineWarning 挂载即读空缓存，法定期限预警永不显示**
- 文件：`src/components/DeadlineWarning.tsx:131-179`（`useMemo<WarningItem[]>(..., [])`）
- 问题：同 H-2。全站法定期限预警（刑拘 30 日 / 取保 12 月等）在有临近案件时也从不弹出。
- 修复：增加就绪刷新（`focus`/`whenReady` 后 setState）。

**H-5 · [维度1/2] NotificationPanel 挂载即读空缓存，面板统计恒为 0**
- 文件：`src/components/NotificationPanel.tsx:28-35`（`useMemo(...,[])`）
- 问题：同 H-2。"总记录/本月新增/已完成/完成率/活跃模块"恒为 0。
- 修复：增加就绪刷新。

**H-6 · [维度1] Backup 页统计读取已废弃的 localStorage key，记录数永远为 0**
- 文件：`src/pages/Backup.tsx:68-89`（`:70` 为 `localStorage.getItem('jingzong.mass.records')`）、`:102-105`（`loadData`）
- 问题：业务记录已迁移到 IndexedDB（key 仍为 `jingzong.mass.records`，但存于 IndexedDB），`getRecordStats` 仍从 localStorage 读取该 key，恒为空 → 返回 `{ '总记录数': 0 }`。✅ 已核实 `:70`。
- 影响：备份页"各模块记录数/总记录数"恒为 0，误导用户判断数据完整性。
- 修复：改为 `indexedDBAdapter.getItem('jingzong.mass.records', [])` 或 `getMassRecords()`。

**H-7 · [维度3] CaseDetail 同一全量扫描跑了两遍（2×O(N)）**
- 文件：`src/pages/CaseDetail.tsx:127-138`（`relatedRecords`）与 `:141-151`（`timeline`）
- 问题：两个 `useMemo` 各自 `getMassRecords()`，用**完全相同**的过滤逻辑 `Object.values(d).some(v => String(v).toLowerCase().includes(kw))` 遍历全部记录。
- 修复：合并为单次 `useMemo`，一次遍历同时产出 `relatedRecords` 与 `timeline`。

**H-8 · [维度4] `FIELD_LABELS` 大常量在 CaseDetail 与 CaseTimeline 中重复定义**
- 文件：`src/pages/CaseDetail.tsx:22-67`（≈45 行）与 `src/pages/CaseTimeline.tsx:14+`（≈150+ 行，覆盖几乎全部字段）
- 问题：两份 `const FIELD_LABELS: Record<string,string>` 高度重叠、独立维护，极易漂移不一致。
- 修复：抽取到 `src/constants/fieldLabels.ts` 单一导出，两处 import 复用。

### 🟡 Medium（资源泄漏 / 持久化缺口 / 架构 / 性能）

**M-1 · [维度2] 三处 IPC 监听注册后未在 cleanup 移除（监听器泄漏）**
- 文件：`src/hooks/useReminderService.ts:102-112`（注册 `onReminderSnoozed`/`onReminderDismissed`，cleanup 仅 `clearInterval` 于 `:173`）、`src/pages/DailyNotes.tsx:44-60`（`onNoteContentChanged` 无 cleanup）、`src/pages/Backup.tsx:108-138`（`onTriggerQuitBackup` 无 cleanup）
- 问题：StrictMode 下 effect 运行两次会重复注册；卸载/重挂载累积监听，闭包可能变 stale。
- 修复：`electronAPI` 提供对应 `removeListener`/`off`，cleanup 中对称移除。

**M-2 · [维度2] 重置数据未清理独立的附件 IndexedDB，附件文件成孤儿**
- 文件：`src/pages/Backup.tsx:676-677`（`localStorage.clear()` + `indexedDBAdapter.clear()`）
- 问题：附件存于独立 IndexedDB（`jingzong-attachments`，见 `attachmentStore.ts`），重置只清了 localStorage 与业务 IDB，未碰附件库，也未删磁盘实际附件文件（Electron 下）。
- 修复：重置时一并 `attachmentStore.clearAllAttachments()`（含磁盘文件删除）。

**M-3 · [维度1] versionStore 直接返回并可变模块级常量 `DEFAULT_VERSION`**
- 文件：`src/store/versionStore.ts:20-27`（`DEFAULT_VERSION`）、`:29-52`（`loadVersion` 原地修改 `parsed`）、`:67-101`（`bumpVersion` 等）
- 问题：`getItem` 无存储值时直接返回 `DEFAULT_VERSION` 常量引用；`loadVersion` 版本不匹配时对其 `parsed.version = ...` 原地修改 → 污染模块级常量；`bumpVersion` 下次读取又被 `versionMismatch` 重置回 `APP_VERSION` → **版本号自增/追加 changelog 永不可持久化**。
- 修复：`getCurrentVersion()` 始终返回深拷贝（`structuredClone`）；`bumpVersion` 基于副本计算后 `saveVersion`。

**M-4 · [维度2] 恢复备份后内存缓存更新，但 UI/Store 持陈旧快照不刷新**
- 文件：`src/utils/excelUtils.ts:650-703`（`restoreFromJson`）
- 问题：恢复时清 localStorage 与 IDB 并写入备份、重建索引，但 Zustand store 与各组件 `getMassRecords()` 快照不会自动失效（如 `ModulePage` 的 `realRecords` 依赖 `[module, refreshKey]`，`refreshKey` 未变则不重读）。
- 修复：恢复后触发全局刷新信号（dispatch 事件或 `useDataVersion` 计数器）。

**M-5 · [维度3] EChartBox 在 option 变化时反复 dispose + init**
- 文件：`src/pages/Dashboard.tsx:107-114`、`src/pages/Statistics.tsx:17-24`
- 问题：`useEffect(() => {...chart.dispose()}, [option, darkMode])`，每次 option 变化销毁并重建实例。正确模式见 `CaseGraph.tsx:84-91`（只 init 一次 + `setOption`）。
- 修复：拆为"init 一次" + "option 变化时 setOption"；并统一抽取为共享 `src/components/EChartBox.tsx`。

**M-6 · [维度5] `moduleConfig.ts` 是 1456 行上帝文件，案件类型被复制约 12 次**
- 文件：`src/moduleConfig.ts:73-1291`（`fieldsFor`）、重复段如 `:144-174`、`:620-648`、`:720-734`、`:822-852`、`:948-978`
- 问题：完整《刑法案件类型》列表（约 80 项）被原样复制约 12 次；而单一数据源 `src/constants/caseTypes.ts:7`（`CASE_TYPES_FULL`）、`:40`（`CASE_TYPES_EVIDENCE_REPORT`）**根本未被 `moduleConfig.ts` import**。
- 修复：拆 `fieldsFor` 为 `src/moduleConfig/fields/*.ts`（按部门一个文件），所有 `caseType` 选项统一引用 `CASE_TYPES_FULL`/`CASE_TYPES_EVIDENCE_REPORT`，预计砍到 ~600 行并消除 12 处重复。

**M-7 · [维度4] 日期/值格式化函数散落 6+ 文件逐字重复**
- 文件：`src/pages/ModulePage.tsx:70-87`、`src/pages/CaseDetail.tsx:69-106`、`src/pages/Dashboard.tsx:30-43`、`src/components/DeadlineWarning.tsx:32-55`（与 Dashboard 同名同实现）、`src/pages/CaseTimeline.tsx:680-700`、`src/utils/reportGenerator.ts:52-54`
- 问题：同一套"ISO→中文日期""对象/数组安全转字符串"逻辑反复重写；`htmlUtils.ts` 已有 `formatDateValue` 但组件各自重写。
- 修复：建 `src/utils/format.ts`，导出 `formatDate/formatDateTime/formatValue/addDays/addMonths/daysBetween`，全局复用。

**M-8 · [维度3] ModulePage 的 `rows` 与 `dynamicColumns` 未 memo 化**
- 文件：`src/pages/ModulePage.tsx:212-225`（`rows` 组件体内直接计算）、`:227-286`（`dynamicColumns` 含 sorter 闭包，每次渲染重建）
- 问题：勾选/打开详情/切换视图等无关状态变化都触发整表数据重建 + antd Table 列重渲染。
- 修复：`useMemo` 包裹：`rows` 依赖 `[filteredRecords, dataFields, fields]`；`dynamicColumns` 依赖 `[dataFields, module, userRole]`。

**M-9 · [维度3] CaseGraph 搜索时整图重新布局**
- 文件：`src/pages/CaseGraph.tsx:158-162`
- 问题：`search` 变化触发 `setOption(option, true)`（notMerge），力导向图每次按键重算布局，节点跳变且开销大。
- 修复：搜索高亮只更新 `series[0].data` 的 `itemStyle.opacity`（merge），并对 `search` 做 debounce。

**M-10 · [维度4] 模块标签映射多处各自硬编码**
- 文件：`src/components/DataVolumeGauge.tsx:11-23`（`MODULE_LABELS`）、`src/pages/CaseTimeline.tsx`（`MODULE_META`）、`src/components/GlobalSearch.tsx`（`MODULE_INFO`），与 `moduleConfig` 导出的 `MODULE_NAMES` 并存
- 修复：统一从 `src/moduleConfig.ts` 导出一份"模块 ID → 中文名/dept"映射，删除各处副本。

**M-11 · [维度4] 两套并行的 Word 报告生成管线**
- 文件：`src/utils/reportUtils.ts`（`generateFundReport`）、`src/utils/reportGenerator.ts`（`exportModuleReport`）
- 问题：两者都是"拼 HTML → `new Blob([bom+html], {type:'application/msword'})` → `file-saver.saveAs`"，样板高度重叠。
- 修复：抽取共享 `buildDocReport(html, fileName)`，两份报告只保留各自 HTML 拼装逻辑。

**M-12 · [维度5] 业务存储层不统一（3+ 套并存），附件绕过 adapter**
- 文件：`src/store/attachmentStore.ts:52-66`（自建 IDB）、`src/store/massStore.ts:119-165`（`removeAttachmentRefsFromAllRecords` 用正则改 JSON 字符串清理引用）
- 问题：massStore 用 indexedDBAdapter；logs/notes/inputHistory/version 用 localStorageAdapter；attachmentStore 自建 IDB 并落盘，且"记录↔附件"引用靠正则改 JSON，脆弱易错。
- 修复：把附件纳入 `StorageAdapter`（或 adapter 增加 `binary` 能力），提供强一致 API。

**M-13 · [维度5] `appStore` 是"厨房水槽"store，含未被消费的 `searchQuery`**
- 文件：`src/store/appStore.ts:8-56`
- 问题：同时装 UI 视图状态、用户态+持久化、toast、主题、低性能模式、编辑中记录；`searchQuery` 从未被消费（GlobalSearch/CommandPalette 各用本地 state）。
- 修复：拆为 `uiStore` + `sessionStore`，`editRecord` 改为局部 `useRecordEditor`；删除 `searchQuery`。

**M-14 · [维度5] `electronAPI` 类型只在 `App.tsx` 声明，20+ 处用 `(window as any)`**
- 文件：`src/App.tsx:16-36`（声明）、`src/components/Sidebar.tsx:53`、`src/components/LoginPage.tsx:340`、`src/components/DrawerNewRecord.tsx:816` 等
- 问题：preload 改签名不会在编译期报错，易引入运行时崩溃。
- 修复：抽 `src/types/electron.d.ts`（或 `electron/preload.d.ts`）强类型；收敛 `isElectron()` 到 `src/lib/env.ts`。

**M-15 · [维度5] `any` 类型蔓延（约 62 处 / 23 文件）**
- 文件：`src/store/dailyNotesStore.ts:18`、`src/components/DrawerNewRecord.tsx`（13 处）、`src/components/LoginPage.tsx`、`src/components/SharedFormFields.tsx`、`src/utils/excelUtils.ts`、`src/pages/ModulePage.tsx` 等
- 问题：`MassRecordData = Record<string, unknown>` 合理，但跨组件频繁退化为 `any`，`types.ts` 单一真相源未达成。
- 修复：优先为 `DrawerNewRecord` 的 `form` 参数、`AttachmentField`、动态字段值建立窄类型；逐步消除。

**M-16 · [维度5] `src/data.ts` 基本是死代码，`types.ts` 含孤儿类型**
- 文件：`src/data.ts`（仅 `UserManage.tsx:4` 引用空数组 `MOCK_USERS`；`CASE_STATS`/`KANBAN_COLUMNS` 无引用）、`src/types.ts:19-64`（`WorkRecord`/`RecordModule`/`MODULE_LABELS` 与 `moduleConfig` 平行）
- 修复：删除 `data.ts`；`types.ts` 收敛为真正单一类型源（保留 `User`/`MassRecord`/`Notification`/`Toast`）。

### 🟢 Low（正确性问题 / 死代码 / 误导性展示）

**L-1 · [维度4] ModulePage 死代码 `sectionFields`** — `src/pages/ModulePage.tsx:781`：`filter(... && (... || -1 === -1))` 恒真，且 `sectionFields` 计算后从未使用。删除该段（含 `:23-24` 空注释块）。

**L-2 · [维度1] Version 页"增强"类型计数取到 `undefined`** — `src/pages/Version.tsx:98-101`：`statCounts` 无 `增强` 分支 → 卡片显示 `undefined 项`。修复：`?? 0` 或补分支。

**L-3 · [维度1] 更新日志正则只覆盖部分类型** — `src/pages/Version.tsx:24`：`parseChangelogEntry` 仅匹配 `新增|优化|修复|重构|发布|增强`，`功能/安全/架构/清理/构建/测试` 类型被静默丢弃。修复：扩类型集或兜底归"其他"。

**L-4 · [维度1] 用户管理页用硬编码 Mock 数据，未接入真实 store** — `src/pages/UserManage.tsx:49-52`、`:77`、`:95-127`：总用户 48/在线 32 等写死，`MOCK_USERS.map` 渲染，编辑/删除仅弹 toast。修复：接入真实用户 store 或标注为演示页。

**L-5 · [维度4] 导出 Excel 冗余三元（两分支相同）** — `src/utils/excelUtils.ts:216-218`：`tabId ? <X/> : <X/>`。删除三元直接渲染。

**L-6 · [维度1] Sidebar 导航只更新 store 未更新路由** — `src/components/Sidebar.tsx`（多处 `setCurrentPage`）、`src/components/AppLayout.tsx:85-88`（仅 `location → store`）：点击侧栏不改 URL，刷新回到默认页、无法用历史/书签定位。修复：导航时 `navigate('/app/'+id)`。

**L-7 · [维度1] OperationLog/CaseTimeline 日志类型映射遇未定义类型崩溃风险** — `src/pages/OperationLog.tsx:123`、`src/pages/CaseTimeline.tsx:123`：`TYPE_COLORS[log.type].bg` 若类型未覆盖则 `undefined` 访问抛错。修复：`?? 默认`。

**L-8 · [维度3] Statistics 渲染期聚合未 memo** — `src/pages/Statistics.tsx:49-55`（`moduleRecords/thisMonth/lastMonth` 渲染期 `for`+两次 `.filter`）。包裹 `useMemo([records])`。

**L-9 · [维度3] Dashboard 渲染期多次 `.filter` 计数** — `src/pages/Dashboard.tsx:128-130`（`overdue/critical/warningCount` 三次 filter）。合并进 `calcWarnings` 的 `useMemo` 返回。

**L-10 · [维度3] GlobalSearch JSX 内未 memo 的 `getMassRecords()`** — `src/components/GlobalSearch.tsx:426`：`共搜索 {getMassRecords().length} 条记录`。复用已 memo 的 `allRecords`。

**L-11 · [维度3] `import * as echarts` 全量引入（×3）** — `src/pages/Dashboard.tsx:11`、`src/pages/Statistics.tsx:4`、`src/pages/CaseGraph.tsx:8`。改用 `echarts/core` 按需注册或统一 `echarts-for-react`。

**L-12 · [维度4] massStore 5 个近乎相同的包装函数** — `src/store/massStore.ts:184-206`（`getClueProjectNames` 等），全是 `collectUniqueStringValues(moduleId, key)` 薄包装。直接调用底层函数。

**L-13 · [维度5] `electron/main.cjs` 存在两个完全相同的 `note-drag` IPC 处理器** — `:563` 与 `:570` 复制粘贴重复。删除其一。

**L-14 · [维度6] 骨架屏 `.skeleton` 类已定义却几乎未使用** — `src/index.css:390-413`：各业务页（ModulePage/统计图表）缺骨架屏。

**L-15 · [维度6] hover 处理方式不统一** — `Sidebar.tsx:124` 用 framer `whileHover`，`GlobalSearch.tsx:375`、`AppLayout.tsx:125` 用 `onMouseEnter/Leave` 改 style。统一为 CSS `.hover-bg`（已存在于 `index.css:155`）。

---

## 2. 🔗 跨模块关联问题专项汇总

以下问题**横跨多个模块**，应作为系统级任务优先处理：

**C-M1 · 三套搜索 UI 互相重叠（最突出的 cohesion 问题）**
- 涉及：`GlobalSearch.tsx`（定义但**从未挂载**）、`FloatingSearch.tsx`（仅触发按钮）、`CommandPalette.tsx`（Ctrl+K 真正可用的搜索）
- 表现：死代码 + 重复实现（字段标签映射、匹配算法各写一份）
- 建议：保留 `CommandPalette` 作为唯一入口（整合全局记录搜索 + 快捷命令 + 模块跳转），内嵌 `GlobalSearch` 的字段级高亮与分组逻辑；删除 `FloatingSearch` 或降级为顶栏常驻图标。

**C-M2 · 法定期限规则在 3+ 处重复定义且已出现分歧（潜在逻辑 Bug）**
- 涉及：`useReminderService.ts:50-56`（`LEGAL_RULES`）、`DeadlineWarning.tsx:70-121`（`DEADLINE_RULES`）、`Dashboard.tsx:36-43`（`calcWarnings` 的 `rules`）
- 分歧：① "侦查羁押（2个月）"——`DeadlineWarning` 用 `arrestDate`（`:95`），`useReminderService` 却用 `filingDate`（`:53` 注释 `field:'filingDate', days:60`）——**同一法律概念两处字段不同**；② 严重度阈值三处不一致（DeadlineWarning `≤0/≤3/≤7` vs Dashboard `≤0/≤3/其余` vs reminder 只 push 不分级）
- 建议：抽出单一 `src/constants/legalDeadlines.ts`（模块/字段/天数/中文名/严重度函数），三处共用。

**C-M3 · 完整案件类型列表被复制约 12 次（见 M-6）**
- 单一源 `src/constants/caseTypes.ts:7`（`CASE_TYPES_FULL`）、`:40`（`CASE_TYPES_EVIDENCE_REPORT`）未被 `moduleConfig.ts` 引用。统一 import 消灭内联副本。

**C-M4 · 两套设计语言撞车（见维度6 V1/V2）**
- `index.css:458-533`（tactical 皮肤）+ `LoginPage.tsx` 全套 glass/scanline，与政务蓝主系统冲突；`LoginPage.tsx:387` 用注入式 `<style>` 强行覆盖。建议删除战术皮肤、统一主色。

**C-M5 · 多套存储后端并存 + 附件绕过 adapter（见 M-12）**
- indexedDBAdapter / localStorageAdapter / attachmentStore 自建 IDB / massStore 正则清理，数据一致性脆弱。统一 IDB 版本与迁移策略。

**C-M6 · `electronAPI` 类型只在 App.tsx 声明（见 M-14）**
- 20+ 处 `(window as any).electronAPI`，preload 改签名无编译期保护。

**C-M7 · "version" 语义歧义**
- `versionStore` = 应用版本号；`Version.tsx` = 应用关于页；而业务期望的"记录级版本化"完全缺失。命名易误导，新增 `recordVersionStore` 承载记录历史。

**C-M8 · 孤儿/平行定义（见 M-16）**
- `src/data.ts` 死代码；`types.ts` 的 `WorkRecord`/`RecordModule`/`MODULE_LABELS` 与 `moduleConfig` 平行。

---

## 3. 维度 6 — UI 设计方案（按优先级）

当前项目存在**两套撞车的设计语言**，这是 UI 层面最根本问题：主系统"政务蓝"（Sidebar/Dashboard/DrawerNewRecord）协调现代；登录页与命令/通知浮层却是"战术玻璃"赛博朋克风（glass-panel/scanline/smoke/shimmer）。

**V1（P0）废除"战术玻璃"皮肤** — 删除 `index.css:458-533` 的 scanline/smoke/shimmer，登录页并入政务蓝系统，删除 `LoginPage.tsx:387` 注入式 `<style>`。零业务风险，立刻提升"这是一个产品"的观感。

**V2（P0）统一主色** — 当前三个强调色打架：`theme.ts:8` 的 `#2563EB`、DrawerNewRecord/LoginPage 渐变用的 `#155A8A`/`#1E7BB5`、FloatingSearch 的靛紫 `#6366F1`。确立单一 `primary=#2563EB`，`#155A8A` 收为 `primaryDeep` 语义 token，搜索/命令类改回蓝色弃用紫色。

**V3（P1）消灭硬编码十六进制** — `DrawerNewRecord`/`GlobalSearch`/`DeadlineWarning`/`Sidebar` 大量 `style={{background:'#F6F8FB'}}` 等绕过 `index.css` 令牌，深色模式下仍是浅灰底。改用 `--color-*`/`--space-*`/`--radius-*`。

**V4（P1）深色模式补全** — 审计所有 `style={{background:'#fff'}}` 硬编码，统一走 `.dark` 覆盖或 `var()`。

**I1（P1）搜索结果去掉每次按键的 stagger 进场** — `CommandPalette.tsx:548`、`GlobalSearch.tsx:363` 在 `useMemo` 重算时反复 `initial` 进场，输入过程持续重排+重播动画会卡顿。改为一次性入场 + CSS 过渡。

**I2（P2）统一 hover** — 统一为 `.hover-bg`/CSS，移除散落 `onMouseEnter` JS 改写。

**I3（P2）必填标记** — `DrawerNewRecord.tsx:515` 用 `requiredMark="optional"` 把必填标为"可选"，对执法强制字段语义不友好，恢复必填红星。

**R1（P2）响应式** — `DrawerNewRecord.tsx:396` 弹窗固定 `width=960`、栅格写死 `repeat(6,1fr)`（`:545/573`），窄屏溢出/挤压；窄屏降为全宽 + 响应式断点。

**S1（P1）启用骨架屏** — `index.css:390-413` 已定义 `.skeleton` 却几乎未用，覆盖列表/图表加载。

**S2（P1）统一空态** — `EmptyState` 组件仅被 `Drawer.tsx:48` 使用；Dashboard 无数据直接隐藏板块（`DeadlineWarning.tsx:198 return null`），建议全站统一 `EmptyState`。

**S3（P0）顶层 ErrorBoundary** — 当前 `ErrorBoundary` 仅包关键弹窗（`AppLayout.tsx:162`），未包整个 `<App>`，单页崩溃会白屏。

---

## 4. 维度 7 — 功能增强建议（按优先级）

**🔴 P0**
1. **统一三套搜索为单一命令面板**（见 C-M1）— 消除维护重复、提升检索一致性。工作量：中。
2. **记录级版本化（真正的"版本管理"）** — `versionStore` 只是应用版本号（M-3/C-M7）。建议每次 `updateMassRecord` 存前一版快照 `{recordId, version, data, editor, time}`，提供查看历史/对比/回滚，满足执法数据可追溯合规刚需。工作量：中（复用 `StorageAdapter`）。
3. **审计日志增强** — `operationLogStore` 已有 `create/edit/delete/login`（`:17`），`OperationLog` 页应支持按用户/类型/时间筛选、导出、可调保留期（当前硬上限 5000 条 `:33`）。工作量：小。

**🟠 P1**
4. **提醒规则可配置化** — `useReminderService` 仅"法定时限+随手记提醒"。扩展案件节点提醒（移送起诉/法院判决）、约谈回访、到期前 N 天可配置阈值、按角色订阅。工作量：中。
5. **报表生成器产品化** — `reportGenerator` 已能出 Word 日报/周报/月报，`excelUtils` 有 xlsx。建议模板可视化配置 + 周期性自动生成落盘（复用 `main.cjs` 的 `save-json-file`/`get-documents-dir`）+ 按部门/时间段聚合。工作量：中。
6. **导入映射与校验** — 增加字段映射向导、必填校验、重复记录检测（借 `inputHistoryStore` 索引去重）、导入预览。工作量：中。
7. **备份自动化与计划** — `main.cjs` 已有 `trigger-quit-backup` 钩子（目前仅占位），可设定周期自动备份到 attachments 目录 + 备份完整性校验。工作量：中。
8. **统计看板深化** — 涉众风险热力（地域/金额/人数）、资金流向桑基图（结合 `evidence-report`）、同比环比、一键导出图表/看板为图片或 PDF。工作量：中。

**🟡 P2**
9. **案件关系图谱增强** — `CaseGraph`/`CaseTimeline` 接入"人员-账户-案件"三度关系 + 地图（地域 `involvedRegion`）。
10. **附件预览增强** — 图片缩略图、PDF 内联预览（当前 `handlePreview` 用 `window.open`+blob，`DrawerNewRecord.tsx:786`）、大文件进度条。
11. **多用户协同/权限细化** — 已有 `UserRole`（admin/supervisor/user）与字段级 `hiddenForRoles`（`moduleConfig.ts:22`），但无真正多用户隔离；至少做"操作日志按用户归属 + 关键操作二次确认"。
12. **模板库/常用语** — 把 `evidence-report` 的"结论示例"（`DrawerNewRecord.tsx:660-666`）泛化为可配置"填写范例/常用语"库，降低书记员录入负担。

---

## 5. React 生态最佳实践综合建议

- **数据就绪前不要渲染"空"**：所有从异步存储（IndexedDB）同步读取的组件，应订阅"就绪"信号或 `refreshKey`，避免 `useMemo(...,[])` 在空缓存下固化（H-2~H-5、L-8~L-10）。参考 `Statistics.tsx` 的 `focus`/`refreshKey` 模式做成通用 hook。
- **Effect 依赖不能是 `ref.current`**：ref 变更不触发重渲染，依赖它等于无效（H-1）。需要触发 effect 的状态请用 `useState`。
- **响应式订阅用选择器**：项目用 Zustand 选择器良好（`useAppStore(s=>s.x)`），无全局重渲染问题，保持。
- **重计算用 `useMemo` / 重回调用 `useCallback`**：`ModulePage` 的 `rows`/`dynamicColumns`、`CaseDetail` 的双扫描、`Statistics` 聚合都应收口（M-8、H-7、L-8）。
- **Effect 必须对称 cleanup**：注册 IPC 监听/interval/subscription 的组件必须返回清理函数（M-1）。
- **资源释放**：ECharts 实例用共享 `EChartBox`（init 一次 + setOption），避免 dispose+init（M-5）。
- **单一数据源（SSOT）**：模块配置、案件类型、法定时限、模块标签、字段标签、格式化函数都应各自收敛到 `constants/` 或 `utils/` 单一文件，消除多份并行定义（M-6/M-7/M-10/M-16、C-M2/C-M3）。
- **类型即文档**：消除 `any` 蔓延，尤其动态字段容器 `MassRecordData` 的传递链路（M-15）。
- **错误边界兜底**：顶层包 `ErrorBoundary` 防单页崩溃白屏（S3）。

---

## 6. 建议落地顺序（最高杠杆 5 项）

1. **C-1 + C-2（数据丢失）** → 加 `pendingWrites` 队列 + 迁移改为 `whenReady().then(...)`。最高优先级，防真实事故。
2. **H-1（草稿失效）** → ref 改 state 计数器。改动小、价值明确。
3. **H-2~H-5（挂载空读）** → 统一"就绪后刷新"hook。修复默认首页/预警/概览/通知恒为 0。
4. **C-M2（法定时限分歧）** → 抽 `src/constants/legalDeadlines.ts`。修复已存在的提醒/展示不一致 bug。
5. **M-6 + C-M3（moduleConfig 上帝文件 + 案件类型 12 次复制）** → 复用 `caseTypes.ts`，消灭复制漂移。

> 说明：本报告所有文件行号均基于审查时的源码；Critical/High 级数据丢失与挂载空读问题已逐行对照源码核实（✅）。Medium/Low 项由逐文件静态分析得出，建议修复前再次 `git blame` 确认上下文。

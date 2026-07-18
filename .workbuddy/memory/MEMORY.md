# 项目长期记忆：jingzong-react-office-0616（经侦工作记录管理系统）

## 架构约定（改动前先读）
- **moduleConfig 已拆分为目录**：所有模块配置在 `src/moduleConfig/`，对外统一通过 `src/moduleConfig/index.ts`（barrel）导入（`import from '../moduleConfig'`）。子文件：types / fieldHelpers / caseTypes / fieldSchemas / moduleBuilders / departments。`fieldsFor(moduleId, tab)` 的字段数据按部门拆到 `src/moduleConfig/fields/<office|legal|mass|evidence|squad>.ts`（各导出 `fieldsFor<Dept>`），`fieldSchemas.ts` 仅作薄分发器。新增字段走对应部门的 `fieldsFor<Dept>`；案件类型选项只能改 `caseTypes.ts`（CASE_TYPES_FULL / CASE_TYPES_BASIC），不要在别处再内联罪名数组。
- **echarts 集中注册点**：唯一入口是 `src/lib/echarts.ts`（echarts/core + `echarts.use([...])` 按需注册）。任何页面用图表都 `import * as echarts from '../lib/echarts'`。**新增图表类型或组件必须在此同步注册，否则运行期静默失效**。当前已注册：BarChart / PieChart / GraphChart + Tooltip / Legend / Grid / Dataset + CanvasRenderer。
- **版本存储命名**：应用版本在 `src/store/appVersionStore.ts`（原 versionStore.ts 重命名，避免与记录级版本混淆）。

## 发布规范（强制，每次必做）
- **每次修复 bug 或新增功能，必须迭代版本号 + 更新"关于"页更新日志**，不可遗漏（用户硬性要求"每次都要做到"）。
- 版本号单一事实源是 `src/version.ts`（`APP_VERSION` / `VERSION_MAJOR` / `VERSION_MINOR` / `VERSION_PATCH` / `CHANGELOG` 数组）。`appVersionStore.ts` 的 `loadVersion()` 有强制同步逻辑：运行时存储的 `version` 或 `changelog.length` 与源码不一致时，会用 `src/version.ts` 覆盖 —— 因此**只改 `src/version.ts` 即可，"关于"页（Version.tsx）自动反映**。同时 `package.json` 的 `version` 字段须同步（用于 Electron 安装包名），格式不带 V 前缀（如 `2.14.17`）。
- 迭代粒度：bug 修复 / 小优化 → `patch+1`（V2.14.x）；新增功能 / 较大改动 → `minor+1`（V2.x.0）；重大架构变更 → `major+1`。
- `CHANGELOG` 数组**第一项须为最新版本**（`Version.tsx` 的 `buildVersionGroups` 按数组顺序分组、最新在最前）。每条格式：`"V2.14.17 修复 - 一句话描述"`；类型前缀须落在 `parseChangelogEntry` 正则集合（新增/优化/修复/重构/发布/增强/功能/安全/架构/清理/构建/测试）内，否则会归入"其他"。

## 工程注意
- 构建链：Vite 8（rolldown 打包）。`tsc` 对部分括号/JSX 不匹配宽容，但 rolldown 严格报错。**验证必须用 `npm run build`，不能只 typecheck**。
- typecheck 命令：`npm run typecheck`（tsc --noEmit --skipLibCheck）。测试：`npm run test`（vitest，27 用例：draftStore 6 / massStore 4 / moduleConfig 11 / smoke 6）。两者均须 0 错误 / 全过才算绿。
- **存储分层架构（M-12 探查结论）**：统一抽象在 `src/store/adapter/`（接口 `StorageAdapter`，实现 `indexedDBAdapter` 主业务库 `jingzong_db`/kv + `localStorageAdapter`）。`massStore` 等业务 store 都构建在 `indexedDBAdapter` 之上（key 如 `jingzong.mass.records`）。**`attachmentStore` 是独立 IndexedDB `jingzong-attachments`（存二进制 + recordId/moduleId 索引），属合理分库，不要并入主库**。删除附件引用用 `massStore.removeAttachmentRefsFromAllRecords`（结构化递归，非正则）。「重置所有数据」在 `SettingsPage` 需同时清 localStorage + `indexedDB.deleteDatabase('jingzong-attachments')` + `indexedDBAdapter.clear()`。
- 测试：`npm run test` 现 57 用例。indexedDB 在测试环境未定义，indexedDBAdapter 退化为内存 Map 缓存，故可读写。注意 `vitest@4.x` 在本机环境会崩（Cannot read properties of undefined reading 'config'），已固定 `vitest@3.0.8`。

## UI 设计方向（用户偏好，2026-07-13 明确）
- 用户要求各页面/模块 UI「高级感、现代感、高档」，倾向大厂仪表盘风（飞书 / Notion / Linear）：统一留白、细边框（1px var(--color-border)）、较大圆角（12–16px）、柔和阴影（--shadow-sm/md，避免重投影）、线性图标块（lucide 图标放进圆角方块、低透明度底色）、克制协调的配色、字号整体偏大适配年长同事。
- 工作台重设计已落地此方向：`src/index.css` 新增 `.dash/.dash-hero/.dash-action/.dash-kpi/.wb-kpi/.dash-grid-2/.wb-panel/.wb-panel-head/.wb-stat*` 等 class + 响应式媒体查询；后续新页面沿用这些 class 与 token，保持风格统一。

## 产品定位与范围决策（2026-07-16 用户拍板，长期有效）
- **纯单机离线版**：不联网、不做多用户/权限体系、不做账号审核。→ **用户管理（UserManage）整页是演示页（硬编码 DEMO_USERS），必须从侧栏/命令面板隐藏或删除入口**；`sessionSlice.ts` 单用户 localStorage 已满足单机需求，`isFieldVisible` 的 `userRole` 逻辑保留但无需扩展账号系统。
- **官式文书范围澄清**：①「自动填充生成制式文书」不做（内网有专门工具），原 P0-2（Word/PDF 制式文书一键生成）已砍；②但**离线空白模板参考/下载库已加（V2.26.0「文书库」模块）**——内置公安行政法律文书式样(2012版)与刑事法律文书(最新修正版)共 60 份官方空白 PDF，支持分类/搜索/预览/下载，属离线参考资产而非自动生成，与①不冲突。导出仍维持 Excel/CSV/JSON。
- **待做范围（按 2026-07-16 参谋方案；V2.22.0 已落地 P0-3，后续自 V2.22.x 推进）**：
  1. ✅ P0-3 串并案自动识别：已落地（src/utils/caseLinkage.ts 检测引擎 + CaseLinkage 分析页 + 工作台「串并案线索」面板 + 11 单测；一键双向关联持久化至 record.data.linkedRecordIds）。
  2. ❌ P1-4 资金穿透/对手账户分析：**已取消（V2.23.1）**。经评估真正的资金穿透需导入外部银行流水反馈压缩包（多银行 CSV、账户信息表）并做表格结构识别，复杂度过高、投入产出比低，故整体移除 V2.23.0 新增的引擎/页面/工作台面板/单测。若日后真要做，须先立「银行流水压缩包导入 + 多银行 CSV 表格结构识别」独立子项目，不能再当轻量功能提。**下一优先 = P1-5**。
  3. ✅ P1-5 趋势与绩效分析：已落地（V2.24.0，src/utils/performanceStats.ts 纯函数 + Dashboard「办案趋势(近12月)」双轴图 + 「经办人绩效」面板 + 顺手修复案件类型饼图只统计4模块缺陷；16 单测）。**下一优先 = P1-7（录入校验，最小投入防错）或 P2「我的视图/筛选保存」**。
  4. ✅ P1-6 到期主动提醒：已实质落地（useReminderService 通过 Electron 原生通知推送法律时限预警+随手记提醒，带稍后/不再提醒；NotificationPanel 在顶栏/工作台展示；无需再补）。
  5. 🟠 P1-7 录入校验：身份证号/统一社会信用代码 18 位格式校验 + 关键字段必填（当前仅 DrawerNewRecord 有"必填"提示，无格式校验；caseLinkage 已有身份证正则可复用）。
  6. 🟡 P2 体验：我的视图/筛选跨会话保存（localStorage记各模块筛选/排序/默认视图）、批量操作扩展（指派经办人/打标签）、附件全文检索/OCR（长线）、删除撤销(Undo)、万级记录虚拟化或按需聚合、附件内联预览。
  7. ✅ 备份/恢复向导强化（V2.25.0，用户从参谋新增建议清单选定）：项目原有 Backup 页 + AutoBackupPanel + generateBackup/restoreFromJson 已全量备份恢复，且经复查恢复**无丢数据 bug**（IndexedDB 实际键 dailyNotes/mass.records/draft.* 均被写回覆盖）；本次仅增强——Electron 原生保存对话框选路径(可存U盘/文件夹)、备份写 appVersion/idbKeys 清单、恢复前 previewBackupFile 预览确认、恢复成功后自动重载。下一优先仍为 P1-7 录入校验 或 P2 我的视图/筛选保存。
  8. ✅ 离线文书库（V2.27.2 升级，用户从参谋新增建议清单选定）：「文书库」一级模块（src/pages/LegalForms.tsx + PLATFORM_NAV.top 入口 + manifest.json 驱动）。**资源来源（V2.27.2 起定型）**：行政 51 份 + 刑事附件 10 份的 Word/PDF 直接取自用户手动逐份拆分目录 `D:\下载\4202661\4202661`（表格结构原生保真、命名正确，用户给的 51 个数字名文件按内容识别标题重命名、10 个汉字名直接用），不再用 LibreOffice 拆分或 pypdf/pdfplumber 重建（已废弃并清理 pdfplumber）；刑事另保留 19 份核心空白参考模板（按公安部 2020 版式样重建，非官方扫描件）。manifest 现 80 条（行政 51 / 刑事 29）。V2.27.0 分类由「行政/刑事」二元改为**数组多标签 + 通用类**（行政刑事通用 15 种：受案登记表/受案回执/接受证据清单/移送案件通知书/传唤证/询问讯问笔录/笔录/调取证据通知书·清单/鉴定聘请书/收缴追缴物品清单/收取保证金通知书·回执/退还保证金通知书/没收保证金决定书），行政刑事筛选通用文书同时出现。支持文书名/式样号搜索、预览(新窗口)、PDF/Word 下载。其余约 60 种刑事专属文书(律师参与/技术侦查/执行/刑事通用)暂未覆盖，若用户后续提供整本《刑事法律文书式样》来源可精确拆分替换。
- 注：UserManage 演示页、官式文书**自动生成(填充)**、资金穿透/对手账户分析(P1-4) 已确认不做——UserManage 因单机、官式文书自动生成因内网工具替代、P1-4 因外部银行流水压缩包解析复杂度过高；但**离线空白文书模板下载/参考库已落地(V2.26.0 文书库)**，不在此列。后续参谋/复盘不要再提 UserManage 与 P1-4（P1-4 若重提须以独立导入子项目形式）。

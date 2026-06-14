export const APP_VERSION = "V2.13.3";
export const VERSION_MAJOR = 2;
export const VERSION_MINOR = 12;
export const VERSION_PATCH = 3;

export const CHANGELOG: string[] = [
        // ===== V2.13.3 =====
  "V2.13.3 修复 - sanitizeDayjsDeep 放宽检测条件(存在即清洗),防止仅有无的序列化对象漏网",
  "V2.13.3 修复 - handleSubmit 改用 dayjs.isDayjs() 替代手工 / 检测",
  "V2.13.3 修复 - fillCaseDetail/IdNoField 停止写入 dayjs 对象，直接传 ISO 字符串",
// ===== V2.13.2 =====
  "V2.13.2 修复 - sanitizeDayjsDeep 递归清洗 Date 对象→toISOString，修复 $d 为 Date 时 String() 输出非 ISO 格式",
  "V2.13.2 修复 - SharedFormFields parseBirthFromIdNo 加 typeof d.isValid 守卫",
  "V2.13.2 修复 - CaseDetail sectionLabelMap 覆盖全部 listName 的中文映射（如 involvedSubjects→涉案主体统计）",
  "V2.13.2 修复 - 按钮加 position:relative zIndex:1 避免被 fixed 容器遮挡",
  "V2.13.2 修复 - form.setFieldsValue 改为逐字段 setFieldValue + try-catch，单个字段异常不崩全局",
  "V2.13.2 修复 - 编辑模式加载时递归清洗 dayjs 序列化对象($L/$d→ISO字符串)，根治时间轴打开旧记录崩溃",
  "V2.13.2 修复 - CaseDetail 查看页面字段标签全局兜底(fieldLabelMap)，解决所有模块重复节数据英文标签问题",
  "V2.13.2 修复 - CaseDetail 查看页面返回/编辑按钮改用 antd Button，统一按钮样式",
  "V2.13.2 修复 - 8 个页面深色模式全面适配：Statistics/ImportExport/Attachments/OperationLog/Backup/SettingsPage/UserManage/Version",
  "V2.13.2 修复 - 全局排查深色模式白色背景和文字颜色问题，所有硬编码颜色替换为CSS变量",
// ===== V2.13.1 =====
  "V2.13.1 修复 - DrawerNewRecord/SharedFormFields 硬编码颜色全面替换为 CSS 变量，深色模式不再有白色背景",
  "V2.13.1 修复 - GlobalSuspectField onChange 实时同步 form 值，解决提交时值丢失问题",
  "V2.13.1 修复 - Excel 批量导入后自动重建案件/嫌疑人索引，新数据立即可用于自动补全",
// ===== V2.12.11 =====
  "V2.12.11 修复 - 关系图谱添加 useEffect 自动刷新，进入页面时加载最新数据",
  "V2.12.11 修复 - CaseDetail 去掉 motion.div 改用普通 div，修复按钮点击区域不完整问题",
  "V2.12.11 修复 - 编辑模式日期字段不再转回 dayjs 对象，保持 ISO 字符串避免 antd clone 崩溃",
  "V2.12.11 修复 - 修复 CaseDetail 重复 import 声明导致构建失败",
  "V2.12.11 修复 - rebuildSuspectIndex 支持所有模块 suspects repeatable section",
  "V2.12.11 修复 - 输入历史过滤 antd 内部字段（uid/status/size 等）",
  "V2.12.11 修复 - 时间轴排序改用 createdAt 时间戳",
  "V2.12.11 修复 - 图谱搜索保留节点颜色不被覆盖",
  // ===== V2.12.10 =====
  "V2.12.10 修复 - dayjs.isValid() 正确调用为方法而非属性",
  "V2.12.10 修复 - 保存前序列化 dayjs 对象为 ISO 字符串，避免 antd clone 崩溃",
  "V2.12.10 修复 - CaseDetail 字段标签补全 50+ 字段中文映射",
  "V2.12.10 修复 - fmtValue 全面重写：dayjs/附件/日期字符串统一处理",
  // ===== V2.12.9 =====
  "V2.12.9 修复 - Framer Motion v11→v12，修复 React 19 兼容性",
  "V2.12.9 修复 - 移除 DrawerNewRecord/AppLayout 中 AnimatePresence",
  // ===== V2.12.8 =====
  "V2.12.8 修复 - 侧边栏折叠按钮深色模式适配",
  "V2.12.8 修复 - 子页面深色模式白色背景全面覆盖",
  "V2.12.8 修复 - 案件360视图返回/编辑按钮全范围可点击",
  // ===== V2.12.7 =====
  "V2.12.7 新增 - 可拖动搜索按钮（紫色渐变圆形浮动按钮）",
  "V2.12.7 新增 - 快捷操作面板（6个常用模块快捷入口+数据概览）",
  "V2.12.7 修复 - 案件360视图显示 repeatable section 数据",
  "V2.12.7 修复 - 案件时间轴日期改为中文格式",
  // ===== V2.12.6 =====
  "V2.12.6 修复 - 侧边栏边界柔和阴影过渡",
  "V2.12.6 修复 - 子页面白色背景改用 CSS 变量",
  "V2.12.6 修复 - 案件360视图返回按钮修复",
  // ===== V2.12.5 =====
  "V2.12.5 修复 - CaseDetail downloadAttachment 导入路径修复",
  "V2.12.5 修复 - 关系图谱改用 graph-npm 经典风格",
  // ===== V2.12.4 =====
  "V2.12.4 修复 - 统计柱状图改用 dataset-encode0 风格",
  "V2.12.4 修复 - 时间轴数据关联修复",
  // ===== V2.12.3 =====
  "V2.12.3 新增 - 表单智能关联提示",
  "V2.12.3 新增 - 案件360全屏视图",
  // ===== V2.12.2 =====
  "V2.12.2 新增 - 全局命令面板 Ctrl+K",
  "V2.12.2 新增 - Dashboard 改为待办驱动工作台",
  "V2.12.2 新增 - 侧边栏快速新建按钮",
  "V2.12.2 新增 - 模块页卡片/表格双视图切换",
  "V2.12.2 新增 - CSS 设计令牌系统",
  "V2.12.2 新增 - 深色模式全面支持",
  // ===== V2.12.1 =====
  "V2.12.1 新增 - 数据存储迁移到 IndexedDB",
  "V2.12.1 新增 - 表单自动保存草稿",
  "V2.12.1 新增 - 字段级权限控制",
  // ===== V2.12.0 =====
  "V2.12.0 新增 - Electron 自动更新支持",
  "V2.12.0 新增 - 单元测试 17 个",
  "V2.12.0 新增 - Ant Design 主题 token 统一",
  // ===== V2.11.0 =====
  "V2.11.0 新增 - 全局命令面板 (Ctrl+K)",
  "V2.11.0 新增 - Dashboard 改为待办驱动工作台",
  "V2.11.0 新增 - 侧边栏快速新建按钮",
  "V2.11.0 新增 - 模块页支持表格/卡片双视图切换",
  "V2.11.0 新增 - CSS 设计令牌系统",
  "V2.11.0 新增 - 深色模式全面支持",
  "V2.11.0 新增 - 悬浮效果 CSS 工具类",
  "V2.11.0 新增 - 按钮变体系统",
  "V2.11.0 新增 - 骨架屏/加载状态 CSS 动画",
  "V2.11.0 增强 - 侧边栏键盘可访问性",
  "V2.11.0 增强 - Ant Design 主题 token 统一",
  // ===== V2.10.0 =====
  "V2.10.0 新增 - 数据存储迁移到 IndexedDB",
  "V2.10.0 新增 - 表单自动保存草稿",
  "V2.10.0 新增 - 案件关系图谱",
  "V2.10.0 新增 - 字段级权限控制",
  "V2.10.0 增强 - 表格列排序+经办人筛选",
  "V2.10.0 重构 - 统一模块名称映射为单一数据源",
  "V2.10.0 修复 - 草稿自动保存仅触发一次",
  "V2.10.0 修复 - 强制措施数据迁移写入错误存储",
  "V2.10.0 修复 - 附件引用移除计数虚报",
  // ===== V2.9.13 =====
  "V2.9.13 修复 - 查看弹窗 repeatable section 只显示第一条",
];

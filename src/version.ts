/**
 * 版本号单一数据源
 * 每次修改代码时同步更新此文件中的版本号和 changelog
 */

export const APP_VERSION = 'V1.2.5';
export const VERSION_MAJOR = 1;
export const VERSION_MINOR = 2;
export const VERSION_PATCH = 5;

export const CHANGELOG: string[] = [
  '初始版本 V1.2.3 发布',
  '修复：强制措施编辑扁平→嵌套数据自动转换（兼容旧数据格式）',
  '修复：涉案财物编辑白屏（日期字符串→dayjs 转换 + ErrorBoundary 兜底）',
  '修复：squad-coercive / 涉众模块字段去重（移除重复 commonTail）',
  '优化：DrawerNewRecord 编辑预填日期字段兼容 ISO 字符串格式',
  '重构：Dashboard 工作台全面改为 015 可视化大屏风格',
  '优化：所有图表数据源从硬编码 mock 切换为用户录入真实数据',
  '优化：地图自动聚合案件/记录的城市分布数据',
  '新增：强制措施月度趋势图（刑拘/取保/逮捕/监视居住）',
  '新增：下一步工作面板（自动提取各模块记录中的待办内容）',
  '修复：通知面板替换为下一步工作，去除硬编码通知',
  '优化：版权信息/登录页版本号统一从 version.ts 读取',
];

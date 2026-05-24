import type { User, WorkRecord, Notification } from './types';

export const CURRENT_USER: User = {
  id: '1',
  name: '张明',
  account: 'zhangming',
  badge: '31001234',
  role: 'admin',
  roleName: '管理员',
  position: '法制室',
  phone: '138****1234',
  status: 'active',
  lastLogin: '05-19 09:30',
};

export const MOCK_USERS: User[] = [
  { id: '1', name: '张明', account: 'zhangming', badge: '31001234', role: 'admin', roleName: '管理员', position: '法制室', status: 'active', lastLogin: '05-19 09:30' },
  { id: '2', name: '李华', account: 'lihua', badge: '31001235', role: 'supervisor', roleName: '部门主管', position: '涉众办', status: 'active', lastLogin: '05-19 08:15' },
  { id: '3', name: '王强', account: 'wangqiang', badge: '31001236', role: 'user', roleName: '普通用户', position: '资金分析小组', status: 'active', lastLogin: '05-18 17:20' },
  { id: '4', name: '赵丽', account: 'zhaoli', badge: '31001237', role: 'user', roleName: '普通用户', position: '法制室', status: 'maintenance', lastLogin: '05-10 10:00' },
  { id: '5', name: '孙伟', account: 'sunwei', badge: '31001238', role: 'user', roleName: '普通用户', position: '办公室', status: 'disabled', lastLogin: '04-28 14:30' },
];

export const MOCK_RECORDS: WorkRecord[] = [
  { id: '1', type: 'case', title: '李某涉嫌非法吸收公众存款案', date: '05-18', status: 'ongoing', creator: '王警官', amount: 2800 },
  { id: '2', type: 'interview', title: '涉案企业财务负责人约谈', date: '05-19', status: 'ongoing', creator: '赵警官' },
  { id: '3', type: 'meeting', title: '全市经侦专项行动部署会议', date: '05-19', status: 'completed', creator: '张警官' },
  { id: '4', type: 'victim', title: '投资群众来访登记表', date: '05-18', status: 'completed', creator: '钱警官' },
  { id: '5', type: 'fund', title: '涉案账户流水核查', date: '05-18', status: 'ongoing', creator: '孙警官', amount: 0 },
  { id: '6', type: 'case', title: '刘某涉嫌组织领导传销活动案', date: '05-17', status: 'ongoing', creator: '李警官', amount: 960 },
  { id: '7', type: 'case', title: '陈某涉嫌贷款诈骗案', date: '05-16', status: 'overdue', creator: '张警官', amount: 350 },
  { id: '8', type: 'case', title: '赵某涉嫌虚开增值税专用发票案', date: '05-10', status: 'completed', creator: '孙警官', amount: 1200 },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'danger', title: '案件强制措施超期预警', content: '李某涉嫌非法吸存案强制措施将于5月21日到期，请及时处理', time: '05-19 08:00', read: false, source: '法制室系统' },
  { id: '2', type: 'warning', title: '涉众案件月报未提交', content: '截止日期：5月20日，请尽快完成', time: '05-19 08:00', read: false, source: '涉众办' },
  { id: '3', type: 'warning', title: '约谈笔录待归档', content: '涉案企业约谈笔录已超时未归档，请尽快处理', time: '05-18 16:00', read: false, source: '涉众办' },
  { id: '4', type: 'info', title: '软件版本更新通知', content: '软件将于5月20日02:00进行版本更新，预计耗时10分钟', time: '05-19 10:30', read: true, source: '系统' },
  { id: '5', type: 'success', title: 'V1.2.3版本已发布', content: '新增受害人批量导入、搜索性能优化', time: '05-15 10:00', read: true, source: '系统' },
];

export const CASE_STATS = [
  { label: '案件总数', value: '113', change: '+8', up: true, color: '#1B5E9B' },
  { label: '已结案', value: '89', change: '78.8%', up: true, color: '#38A169' },
  { label: '侦办中', value: '17', change: '15.0%', up: false, color: '#E67E22' },
  { label: '超期未结', value: '7', change: '需关注', up: false, color: '#D32F2F' },
];

export const KANBAN_COLUMNS = [
  { id: 'pending', label: '待受理', color: '#9CA3AF', count: 3 },
  { id: 'investigating', label: '侦办中', color: '#1B5E9B', count: 12 },
  { id: 'legal', label: '法制审核', color: '#E67E22', count: 5 },
  { id: 'transfer', label: '待移交', color: '#9C27B0', count: 4 },
  { id: 'closed', label: '已结案', color: '#38A169', count: 89 },
];

export const CHART_BAR_DATA = [
  { label: '法制室', value: 456, color: '#1B5E9B' },
  { label: '涉众办', value: 374, color: '#38A169' },
  { label: '资金组', value: 289, color: '#E67E22' },
  { label: '办公室', value: 252, color: '#9C27B0' },
  { label: '办案民警', value: 198, color: '#00ACC1' },
  { label: '中队内勤', value: 147, color: '#D32F2F' },
];

// 驾驶舱 - 案件趋势（近12月）
export const CASE_TREND = [
  { month: '2025-06', filed: 8, solved: 5 },
  { month: '2025-07', filed: 12, solved: 7 },
  { month: '2025-08', filed: 10, solved: 9 },
  { month: '2025-09', filed: 15, solved: 11 },
  { month: '2025-10', filed: 13, solved: 10 },
  { month: '2025-11', filed: 18, solved: 14 },
  { month: '2025-12', filed: 20, solved: 16 },
  { month: '2026-01', filed: 14, solved: 12 },
  { month: '2026-02', filed: 9, solved: 7 },
  { month: '2026-03', filed: 16, solved: 13 },
  { month: '2026-04', filed: 22, solved: 18 },
  { month: '2026-05', filed: 11, solved: 8 },
];

// 驾驶舱 - 案件类型分布
export const CASE_TYPE_DIST = [
  { name: '非法吸收公众存款', value: 38 },
  { name: '集资诈骗', value: 21 },
  { name: '合同诈骗', value: 17 },
  { name: '组织领导传销', value: 13 },
  { name: '贷款诈骗', value: 8 },
  { name: '其他', value: 16 },
];

// 驾驶舱 - 预警列表
export const ALERT_LIST = [
  { type: 'danger' as const, title: '案件强制措施超期预警', content: '李某涉嫌非法吸存案强制措施将于5月21日到期，请及时处理', time: '2小时前' },
  { type: 'warning' as const, title: '涉众案件月报未提交', content: '截止日期：5月20日，请尽快完成', time: '3小时前' },
  { type: 'warning' as const, title: '约谈笔录待归档', content: '涉案企业约谈笔录已超时未归档，请尽快处理', time: '昨天' },
];

export const DASH_STATS = [
  { label: '本月记录总数', value: '1,286', change: '+12.3%', up: true, color: '#1B5E9B', icon: 'FileText' },
  { label: '已完成', value: '1,089', change: '84.7%', up: true, color: '#38A169', icon: 'CheckCircle' },
  { label: '进行中', value: '197', change: '15.3%', up: false, color: '#E67E22', icon: 'Clock' },
  { label: '超期预警', value: '12', change: '+3', up: false, color: '#D32F2F', icon: 'AlertTriangle' },
];

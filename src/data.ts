import type { User, WorkRecord, Notification } from './types';

export const CURRENT_USER: User = {
  id: '1',
  name: '当前用户',
  account: '',
  badge: '',
  role: 'user',
  roleName: '用户',
  position: '',
  status: 'active',
};

export const MOCK_USERS: User[] = [];

export const MOCK_RECORDS: WorkRecord[] = [];

export const MOCK_NOTIFICATIONS: Notification[] = [];

export const CASE_STATS = [
  { label: '案件总数', value: '0', change: '-', up: true, color: '#1B5E9B' },
  { label: '已结案', value: '0', change: '-', up: true, color: '#38A169' },
  { label: '侦办中', value: '0', change: '-', up: false, color: '#E67E22' },
  { label: '超期未结', value: '0', change: '-', up: false, color: '#D32F2F' },
];

export const KANBAN_COLUMNS = [
  { id: 'pending', label: '待受理', color: '#9CA3AF', count: 0 },
  { id: 'investigating', label: '侦办中', color: '#1B5E9B', count: 0 },
  { id: 'legal', label: '法制审核', color: '#E67E22', count: 0 },
  { id: 'transfer', label: '待移交', color: '#9C27B0', count: 0 },
  { id: 'closed', label: '已结案', color: '#38A169', count: 0 },
];

export const CHART_BAR_DATA = [
  { label: '法制室', value: 0, color: '#1B5E9B' },
  { label: '涉众办', value: 0, color: '#38A169' },
  { label: '资金组', value: 0, color: '#E67E22' },
  { label: '办公室', value: 0, color: '#9C27B0' },
  { label: '办案民警', value: 0, color: '#00ACC1' },
  { label: '中队内勤', value: 0, color: '#D32F2F' },
];

export const CASE_TREND: Array<{ month: string; filed: number; solved: number }> = [];

export const CASE_TYPE_DIST: Array<{ name: string; value: number }> = [];

export const ALERT_LIST: Array<{ type: 'danger' | 'warning'; title: string; content: string; time: string }> = [];

export const DASH_STATS = [
  { label: '本月记录总数', value: '0', change: '-', up: true, color: '#1B5E9B', icon: 'FileText' },
  { label: '已完成', value: '0', change: '-', up: true, color: '#38A169', icon: 'CheckCircle' },
  { label: '进行中', value: '0', change: '-', up: false, color: '#E67E22', icon: 'Clock' },
  { label: '超期预警', value: '0', change: '-', up: false, color: '#D32F2F', icon: 'AlertTriangle' },
];

/**
 * 工作台 Dashboard — 高级感现代风
 * 顶部欢迎区 + 快捷入口 · KPI 概览 · 待办预警 · 数据概览 · 最近动态 · 模块活跃度
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, AlertTriangle, CheckCircle2,
  Activity, Zap, BarChart3, Plus, Network, CalendarClock,
} from "lucide-react";
import * as echarts from '../lib/echarts';
import { getMassRecords, getMassRecordById } from "../store/massStore";
import type { MassRecord } from "../store/massStore";
import { useAppStore } from "../store/appStore";
import { useDataChanged } from "../store/dataEvents";
import { MODULE_NAMES } from "../moduleConfig";
import EChartBox from "../components/EChartBox";
import GlobalSearch from "../components/GlobalSearch";
import { LEGAL_DEADLINE_RULES, getDeadlineSeverity } from '../constants/legalDeadlines';
import { daysBetween } from '../utils/format';

/* ===================== 到期预警计算 ===================== */

interface WarnItem {
  id: string;
  recordId: string;
  moduleId: string;
  caseName: string;
  type: string;
  deadline: string;
  remainingDays: number;
  severity: 'overdue' | 'critical' | 'warning';
}

function calcWarnings(records: MassRecord[]): WarnItem[] {
  const items: WarnItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const rule of LEGAL_DEADLINE_RULES) {
    for (const rec of records.filter((r) => rule.moduleIds.includes(r.moduleId))) {
      const raw = rec.data?.[rule.dateField];
      if (typeof raw !== 'string') continue;
      try {
        const deadline = rule.calcDeadline(raw);
        const remaining = daysBetween(today, new Date(deadline));
        if (remaining > 30) continue;
        const sev = getDeadlineSeverity(remaining);
        const severity: WarnItem['severity'] = sev === 'normal' ? 'warning' : sev;
        items.push({
          id: rec.id + rule.dateField + rule.label, recordId: rec.id, moduleId: rec.moduleId,
          caseName: String(rec.data?.caseName || rec.data?.reportMatter || rec.data?.suspect || '未命名').slice(0, 14),
          type: rule.label, deadline, remainingDays: remaining, severity,
        });
      } catch { /* ignore */ }
    }
  }
  const order: Record<string, number> = { overdue: 0, critical: 1, warning: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity] || a.remainingDays - b.remainingDays);
  return items;
}

/* ===================== KPI 卡片 ===================== */

function KpiCard({ label, value, unit, icon: Icon, color, delay }: {
  label: string; value: string | number; unit: string;
  icon: React.ComponentType<{ size?: number; color?: string }>; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="wb-kpi"
    >
      <div className="wb-kpi-ico" style={{ background: `${color}1A`, color }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div className="wb-kpi-label">{label}</div>
        <div className="wb-kpi-val">
          {value}
          <span className="wb-kpi-unit">{unit}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ===================== 面板头部 ===================== */

function PanelHead({ icon: Icon, color, tint, title, extra }: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string; tint: string; title: string; extra?: React.ReactNode;
}) {
  return (
    <div className="wb-panel-head">
      <div className="wb-panel-ico" style={{ background: tint, color }}>
        <Icon size={16} color={color} />
      </div>
      <span className="wb-panel-title">{title}</span>
      {extra}
    </div>
  );
}

/* ===================== 主组件 ===================== */

export default function Dashboard() {
  const darkMode = useAppStore((s) => s.darkMode);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const openModal = useAppStore((s) => s.openModal);
  const setEditRecord = useAppStore((s) => s.setEditRecord);
  const userName = useAppStore((s) => s.userName);
  const userBadge = useAppStore((s) => s.userBadge);
  const userDepartment = useAppStore((s) => s.userDepartment);
  // 依赖数据版本号：IndexedDB 就绪 / 数据变更后自动重读，避免“首页永远为 0”
  const dataVersion = useDataChanged();
  const records = useMemo(() => getMassRecords(), [dataVersion]);

  const warnings = useMemo(() => calcWarnings(records), [records]);
  const warnCounts = useMemo(() => {
    let overdue = 0, critical = 0, warning = 0;
    for (const w of warnings) {
      if (w.severity === 'overdue') overdue++;
      else if (w.severity === 'critical') critical++;
      else warning++;
    }
    return { overdue, critical, warning };
  }, [warnings]);
  const { overdue, critical } = warnCounts;

  const stats = useMemo(() => {
    const total = records.length;
    const completed = records.filter(r => r.data?.status === '已完成' || r.data?.status === '已办结').length;
    const toSupplement = records.filter(r => r.data?.status === '待补充').length;
    const inProgress = total - completed - toSupplement;
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const thisMonth = records.filter(r => r.createdAt?.startsWith(monthPrefix)).length;
    return { total, completed, toSupplement, inProgress, thisMonth };
  }, [records]);
  const { total, completed, inProgress, thisMonth } = stats;

  const textColor = 'var(--color-text)';
  const mutedColor = 'var(--color-text-secondary)';

  // 模块记录统计
  const moduleRecords: Record<string, number> = {};
  for (const r of records) moduleRecords[r.moduleId] = (moduleRecords[r.moduleId] || 0) + 1;

  // 最近 8 条动态（按创建时间倒序，最新在前）
  const recentActivity = useMemo(() =>
    [...records]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 8)
      .map(r => ({
        moduleId: r.moduleId,
        moduleName: MODULE_NAMES[r.moduleId] || r.moduleId,
        title: String(r.data?.caseName || r.data?.suspect || r.data?.title || ''),
        date: r.createdAt?.slice(0, 10) || '',
      })),
    [records]
  );

  const handleWarnClick = (item: WarnItem) => {
    const rec = getMassRecordById(item.recordId);
    if (rec) { setEditRecord(rec); setCurrentPage(item.moduleId); openModal('newRecord'); }
  };

  const severityColors = {
    overdue: { bg: 'var(--color-danger-bg)', dot: 'var(--color-danger)', label: '已过期' },
    critical: { bg: 'var(--color-warning-bg)', dot: 'var(--color-warning)', label: '紧急' },
    warning: { bg: 'var(--color-info-bg)', dot: 'var(--color-info)', label: '注意' },
  };

  // 案件类型分布图表
  const caseTypes = useMemo(() => {
    const targets = new Set(['mass-statistics', 'legal-report-case', 'legal-case-ledger', 'squad-case']);
    const map: Record<string, number> = {};
    for (const r of records) {
      if (!targets.has(r.moduleId)) continue;
      const val = r.data?.caseType;
      if (typeof val === 'string' && val.trim()) map[val.trim()] = (map[val.trim()] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const PIE_PALETTE = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#DB2777', '#4F46E5'];
  const BAR_PALETTE = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];

  const pieOption = useMemo(() => ({
    tooltip: { trigger: 'item' as const, backgroundColor: darkMode ? '#1a1d25' : '#fff', borderColor: darkMode ? '#374151' : '#E5E7EB', textStyle: { color: textColor } },
    legend: { bottom: 0, textStyle: { color: mutedColor, fontSize: 10 }, type: 'scroll' as const },
    series: [{
      type: 'pie' as const, radius: ['32%', '66%'], center: ['50%', '44%'],
      avoidLabelOverlap: true, padAngle: 2,
      itemStyle: { borderRadius: 5, borderColor: darkMode ? '#1a1d25' : '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c}', fontSize: 10, color: mutedColor, lineHeight: 14 },
      data: caseTypes.length > 0
        ? caseTypes.slice(0, 8).map(([name, value], i) => ({ name: name.length > 6 ? name.slice(0, 6) + '…' : name, value, itemStyle: { color: PIE_PALETTE[i % PIE_PALETTE.length] } }))
        : [{ name: '暂无数据', value: 1, itemStyle: { color: darkMode ? '#374151' : '#E5E7EB' } }],
      animationDuration: 800,
    }],
  }), [caseTypes, darkMode, textColor, mutedColor, PIE_PALETTE]);

  // 模块活跃度柱状图
  const moduleBarData = useMemo(() => {
    const top = Object.entries(moduleRecords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => ({ name: MODULE_NAMES[id] || id, value: count }));
    return top;
  }, [moduleRecords]);

  const barOption = useMemo(() => ({
    tooltip: { trigger: 'axis' as const, backgroundColor: darkMode ? '#1a1d25' : '#fff', borderColor: darkMode ? '#374151' : '#E5E7EB', textStyle: { color: textColor } },
    grid: { left: 10, right: 20, top: 16, bottom: 34, containLabel: true },
    xAxis: { type: 'category' as const, data: moduleBarData.map(d => d.name), axisLabel: { color: mutedColor, fontSize: 10, rotate: 30 }, axisLine: { lineStyle: { color: darkMode ? '#374151' : '#E5E7EB' } } },
    yAxis: { type: 'value' as const, splitLine: { lineStyle: { color: darkMode ? '#2a2e38' : '#F3F4F6' } }, axisLabel: { color: mutedColor, fontSize: 10 } },
    series: [{
      type: 'bar' as const,
      data: moduleBarData.map((d, i) => ({
        value: d.value,
        itemStyle: {
          borderRadius: [5, 5, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: BAR_PALETTE[i % BAR_PALETTE.length] },
            { offset: 1, color: BAR_PALETTE[i % BAR_PALETTE.length] + '33' },
          ]),
        },
      })),
      barWidth: 26,
      label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 600, color: textColor },
    }],
  }), [moduleBarData, darkMode, textColor, mutedColor, BAR_PALETTE]);

  // 欢迎区信息
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 6 ? '凌晨好' : hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const displayName = userName || '用户';
  const subParts = [userBadge ? `警号 ${userBadge}` : '', userDepartment, dateStr].filter(Boolean);
  const avatarText = (displayName || '用').slice(0, 1);

  /* ── 空状态 ── */
  if (total === 0) {
    return (
      <div className="dash">
        <div className="wb-panel" style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: 18, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <TrendingUp size={30} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: textColor, marginBottom: 8 }}>欢迎使用经侦工作台</div>
          <div style={{ fontSize: 13, color: mutedColor, marginBottom: 22 }}>开始录入工作记录后，这里会展示待办预警与统计概览</div>
          <button className="dash-action dash-action-primary" onClick={() => openModal('newRecord')} style={{ height: 42, paddingInline: 22, fontSize: 14 }}>
            <Plus size={16} /> 新建第一条记录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash">

      {/* ── 顶部欢迎区 + 快捷入口 ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="dash-hero">
        <div className="dash-hero-avatar">{avatarText}</div>
        <div>
          <div className="dash-hero-greet">{greet}，{displayName}</div>
          <div className="dash-hero-sub">{subParts.join('　·　')}</div>
        </div>
        <div className="dash-hero-actions">
          <button className="dash-action dash-action-primary" onClick={() => openModal('newRecord')}>
            <Plus size={15} /> 新建记录
          </button>
          <button className="dash-action" onClick={() => setCurrentPage('graph')}>
            <Network size={15} color="var(--color-primary)" /> 案件图谱
          </button>
          <button className="dash-action" onClick={() => setCurrentPage('timeline')}>
            <CalendarClock size={15} color="var(--color-primary)" /> 案件时间轴
          </button>
        </div>
      </motion.div>

      {/* ── 全局检索入口（#128 跨模块统一检索） ── */}
      <div style={{ marginBottom: 16 }}>
        <GlobalSearch />
      </div>

      {/* ── KPI 概览 ── */}
      <div className="dash-kpi">
        <KpiCard label="办理中" value={inProgress} unit="件" icon={Activity} color="#2563EB" delay={0} />
        <KpiCard label="即将到期" value={overdue + critical} unit="件" icon={AlertTriangle} color={overdue > 0 ? '#DC2626' : '#D97706'} delay={0.05} />
        <KpiCard label="已完成" value={completed} unit="件" icon={CheckCircle2} color="#059669" delay={0.1} />
        <KpiCard
          label="本月新增"
          value={thisMonth}
          unit="条"
          icon={TrendingUp}
          color="#7C3AED"
          delay={0.15}
        />
      </div>

      {/* ── 主内容区：待办预警 + 数据概览 ── */}
      <div className="dash-grid-2">

        {/* 待办预警 */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="wb-panel">
          <PanelHead
            icon={AlertTriangle}
            color="var(--color-warning)"
            tint="var(--color-warning-bg)"
            title="待办预警"
            extra={warnings.length > 0 ? (
              <span className="badge badge-danger" style={{ marginLeft: 'auto' }}>{warnings.length} 项</span>
            ) : undefined}
          />
          <div style={{ maxHeight: 330, overflowY: 'auto' }}>
            {warnings.length === 0 ? (
              <div style={{ padding: 44, textAlign: 'center', color: mutedColor, fontSize: 13 }}>
                <CheckCircle2 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div>暂无到期预警，一切正常</div>
              </div>
            ) : (
              <div style={{ padding: '8px 12px' }}>
                {warnings.slice(0, 8).map((item, i) => {
                  const c = severityColors[item.severity];
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.03 }}
                      className="hover-bg"
                      onClick={() => handleWarnClick(item)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 12px', marginBottom: 4, borderRadius: 8, cursor: 'pointer',
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{item.caseName}</div>
                        <div style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>{item.type}</div>
                      </div>
                      <span className={`badge ${item.severity === 'overdue' ? 'badge-danger' : item.severity === 'critical' ? 'badge-warning' : 'badge-info'}`}>
                        {item.remainingDays <= 0 ? '已过期' : `剩${item.remainingDays}天`}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* 数据概览 */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="wb-panel">
          <PanelHead icon={Activity} color="var(--color-primary)" tint="var(--color-primary-bg)" title="数据概览" />
          <div className="wb-panel-body">
            <div className="wb-stat-grid">
              <div className="wb-stat">
                <div className="wb-stat-val" style={{ color: 'var(--color-primary)' }}>{total}</div>
                <div className="wb-stat-label">总记录</div>
              </div>
              <div className="wb-stat">
                <div className="wb-stat-val" style={{ color: 'var(--color-success)' }}>{completed}</div>
                <div className="wb-stat-label">已完成</div>
              </div>
              <div className="wb-stat">
                <div className="wb-stat-val" style={{ color: 'var(--color-info)' }}>{total > 0 ? Math.round(completed / total * 100) + '%' : '0%'}</div>
                <div className="wb-stat-label">完成率</div>
              </div>
            </div>
            <EChartBox option={pieOption} style={{ height: 210 }} />
          </div>
        </motion.div>
      </div>

      {/* ── 底部：最近动态 + 模块活跃度 ── */}
      <div className="dash-grid-2">

        {/* 最近动态 */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="wb-panel">
          <PanelHead icon={Zap} color="var(--color-info)" tint="var(--color-info-bg)" title="最近动态" />
          <div style={{ maxHeight: 270, overflowY: 'auto', padding: '4px 0' }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: mutedColor, fontSize: 12 }}>暂无动态</div>
            ) : (
              <div style={{ position: 'relative', padding: '10px 18px 10px 36px' }}>
                <div style={{ position: 'absolute', left: 20, top: 14, bottom: 14, width: 1.5, background: 'var(--color-primary)', opacity: 0.22 }} />
                {recentActivity.map((a, i) => (
                  <div key={i} style={{ position: 'relative', paddingBottom: i < recentActivity.length - 1 ? 14 : 0, borderBottom: i < recentActivity.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
                    <div style={{ position: 'absolute', left: -24, top: 6, width: 9, height: 9, borderRadius: '50%', background: i < 3 ? 'var(--color-primary)' : 'var(--color-border)', border: '2px solid var(--color-surface)' }} />
                    <div style={{ fontSize: 12, color: mutedColor }}>
                      <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{a.moduleName}</span>
                      <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                      <span>{a.date}</span>
                    </div>
                    <div className="truncate font-medium" style={{ fontSize: 14, color: textColor, marginTop: 3 }}>{a.title || a.moduleName}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* 模块活跃度 */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="wb-panel">
          <PanelHead icon={BarChart3} color="var(--color-success)" tint="var(--color-success-bg)" title="模块活跃度" />
          <div className="wb-panel-body" style={{ minHeight: 210 }}>
            {moduleBarData.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: mutedColor, fontSize: 12 }}>暂无数据</div>
            ) : (
              <EChartBox option={barOption} style={{ height: 230 }} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

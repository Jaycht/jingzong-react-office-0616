import { useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, ArrowUp, ArrowDown,
  Zap, Activity,
  Gavel, FileText, Users, Shield, Database, ClipboardList, Scale, Search
} from "lucide-react";
import * as echarts from 'echarts';
import { getMassRecords } from "../store/massStore";
import type { MassRecord } from "../store/massStore";
import { useAppStore } from "../store/appStore";
import GlobalSearch from "../components/GlobalSearch";
import DeadlineWarning from "../components/DeadlineWarning";
import DataVolumeGauge from "../components/DataVolumeGauge";

const MODULE_NAMES: Record<string, string> = {
  "office-finance-assets": "经费保障", "office-party-attendance": "党建考勤",
  "office-doc-report": "文件报表", "office-cluster": "集群协查",
  "office-other": "其他事项", "mass-clue": "涉众线索",
  "mass-statistics": "涉众统计", "mass-petition": "信访反馈",
  "mass-interview": "约谈管理", "mass-publicity": "宣传工作",
  "legal-report-case": "接报案", "legal-case-ledger": "案件台账",
  "legal-special-action": "专项行动", "legal-assessment": "考核管理",
  "squad-case": "中队案件", "squad-daily": "中队日报",
  "squad-coercive": "强制措施", "squad-property": "涉案财物",
  "evidence-clue": "线索登记", "evidence-request": "调证登记",
  "evidence-freeze": "资金查控", "evidence-phone-collection": "手机采集",
  "evidence-report": "资金分析",
};

const KPI_COLORS = [
  { bg: "linear-gradient(135deg,#1B5E9B,#2E7DCA)" },
  { bg: "linear-gradient(135deg,#0E7C4B,#38A169)" },
  { bg: "linear-gradient(135deg,#C2410C,#E67E22)" },
  { bg: "linear-gradient(135deg,#6D28D9,#8B5CF6)" },
];

const TOP_MODULES = [
  { id: "mass-clue",      label: "涉众线索",    icon: Search,      color: "#2563EB" },
  { id: "squad-case",     label: "中队案件",    icon: Gavel,       color: "#7C3AED" },
  { id: "legal-case-ledger", label: "案件台账", icon: FileText,    color: "#0891B2" },
  { id: "squad-coercive", label: "强制措施",    icon: Shield,      color: "#DC2626" },
  { id: "legal-report-case", label: "报案登记",  icon: ClipboardList, color: "#D97706" },
  { id: "evidence-freeze", label: "资金查控",  icon: Database,    color: "#059669" },
  { id: "office-finance-assets", label: "经费保障", icon: Scale,       color: "#6D28D9" },
  { id: "mass-petition",  label: "信访反馈",    icon: Users,       color: "#E11D48" },
];

/* ===================== 数据计算 ===================== */

function calcKpi(records: MassRecord[]) {
  const total = records.length;
  const completed = records.filter((r) => r.data?.status === "已完成" || r.data?.status === "已办结").length;
  const ongoing = records.filter((r) => {
    const s = r.data?.status;
    return s && s !== "已完成" && s !== "已办结";
  }).length;
  return [
    { label: "总记录数", value: total, unit: "条", trend: total > 0 ? Math.round((total / Math.max(total, 10)) * 100) : 0 },
    { label: "已完成", value: completed, unit: "条", trend: total > 0 ? Math.round((completed / total) * 100) : 0 },
    { label: "进行中", value: ongoing, unit: "条", trend: ongoing > 0 ? Math.round((ongoing / Math.max(total, 1)) * 100) : 0 },
    { label: "完成率", value: total > 0 ? Math.round((completed / total) * 100) : 0, unit: "%", trend: total > 0 ? Math.round((completed / total) * 100) - 5 : 0 },
  ];
}

function caseTypeStats(records: MassRecord[]) {
  const targets = new Set([
    'mass-statistics', 'legal-report-case', 'legal-case-ledger',
    'squad-case', 'squad-daily', 'evidence-request'
  ]);
  const map: Record<string, number> = {};
  for (const r of records) {
    if (!r.data || !targets.has(r.moduleId)) continue;
    const val = r.data.caseType;
    if (typeof val === "string" && val.trim()) {
      map[val.trim()] = (map[val.trim()] || 0) + 1;
    }
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function moduleRanking(records: MassRecord[]) {
  const map: Record<string, number> = {};
  for (const r of records) {
    if (r.moduleId) map[r.moduleId] = (map[r.moduleId] || 0) + 1;
  }
  return Object.entries(map)
    .map(([id, value]) => ({ name: MODULE_NAMES[id] || id, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function recentActivity(records: MassRecord[]) {
  return records.slice(0, 10).map((r) => ({
    moduleName: MODULE_NAMES[r.moduleId] || r.moduleId,
    date: r.createdAt?.slice(0, 10) || "",
    title: r.data?.title || r.data?.name || r.data?.caseName || r.data?.summary || MODULE_NAMES[r.moduleId] || r.moduleId,
  }));
}

/* ===================== 子组件 ===================== */

function KpiCard({ item, index }: { item: ReturnType<typeof calcKpi>[number]; index: number }) {
  const rising = item.trend >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{
        flex: 1, color: "#fff",
        background: KPI_COLORS[index].bg,
        borderRadius: 12, padding: "16px 18px",
        boxShadow: "0 2px 8px rgba(0,0,0,.08)",
      }}
    >
      <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 500, marginBottom: 4 }}>{item.label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{item.value}</span>
        <span style={{ fontSize: 13, opacity: 0.75, fontWeight: 500 }}>{item.unit}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11.5, opacity: 0.9 }}>
        {rising ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        <span>{Math.abs(item.trend)}%</span>
        <span style={{ opacity: 0.7, marginLeft: 4 }}>较上月</span>
      </div>
    </motion.div>
  );
}

function PanelShell({ icon, title, badge, children, darkMode, delay = 0, style }: {
  icon: React.ReactNode; title: string; badge?: string;
  children: React.ReactNode; darkMode: boolean; delay?: number; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{
        background: darkMode ? 'rgba(28, 31, 38, 0.75)' : '#fff',
        borderRadius: 12,
        border: darkMode ? '1px solid rgba(163, 201, 255, 0.12)' : '1px solid #E5E7EB',
        boxShadow: darkMode ? '0 2px 12px rgba(0,0,0,.25)' : '0 1px 4px rgba(0,0,0,.04)',
        backdropFilter: darkMode ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: darkMode ? 'blur(14px)' : 'none',
        overflow: 'hidden', ...style,
      }}
    >
      <div style={{
        padding: '14px 18px',
        borderBottom: darkMode ? '1px solid rgba(66, 71, 79, 0.4)' : '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 600, color: darkMode ? '#e2e2e6' : '#1F2937' }}>{title}</span>
        {badge && (
          <span style={{
            marginLeft: 'auto', fontSize: 10.5, fontWeight: 600,
            padding: '2px 10px', borderRadius: 10,
            background: darkMode ? 'rgba(0, 219, 231, 0.12)' : '#F3F4F6',
            color: darkMode ? '#00dbe7' : '#6B7280',
          }}>{badge}</span>
        )}
      </div>
      {children}
    </motion.div>
  );
}

/* ===================== ECharts 渲染组件 ===================== */

function EChartsWrapper({ option, style }: { option: Record<string, unknown>; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const darkMode = useAppStore((s) => s.darkMode);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option, true);
    const handler = () => chart.resize();
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      chart.dispose();
    };
  }, [option, darkMode]);

  return <div ref={ref} style={{ width: '100%', ...style }} />;
}

/* ===================== 主组件 ===================== */

export default function Dashboard() {
  const { setCurrentPage } = useAppStore();
  const darkMode = useAppStore((s) => s.darkMode);
  const lowPerfMode = useAppStore((s) => s.lowPerfMode);
  const records = getMassRecords();
  const hasData = records.length > 0;

  const kpiData = useMemo(() => calcKpi(records), [records]);
  const caseTypes = useMemo(() => caseTypeStats(records), [records]);
  const ranking = useMemo(() => moduleRanking(records), [records]);
  const activities = useMemo(() => recentActivity(records), [records]);

  const textColor = darkMode ? '#e2e2e6' : '#1F2937';
  const mutedColor = darkMode ? '#8c919a' : '#9CA3AF';
  const borderColor = darkMode ? 'rgba(66,71,79,0.4)' : '#E5E7EB';

  /* ---------- ECharts 主题色 ---------- */
  const CHART_PALETTE = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#6D28D9', '#E11D48', '#0284C7', '#9333EA'];
  const chartTextColor = darkMode ? '#8c919a' : '#6B7280';

  /* 案件类型分布 — 玫瑰图 */
  const pieOption = useMemo(() => ({
    tooltip: { trigger: 'item' as const, backgroundColor: darkMode ? '#1a1d25' : '#fff', borderColor, textStyle: { color: textColor } },
    legend: {
      bottom: 0, textStyle: { color: chartTextColor, fontSize: 10 },
      type: 'scroll' as const,
    },
    series: [{
      type: 'pie' as const,
      radius: ['30%', '65%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      padAngle: 1,
      itemStyle: { borderRadius: 4, borderColor: darkMode ? '#1a1d25' : '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c}', fontSize: 10, color: chartTextColor, lineHeight: 14 },
      labelLine: { length: 8, length2: 10, smooth: true },
      data: caseTypes.length > 0
        ? caseTypes.slice(0, 8).map(([name, value], i) => ({ name: name.length > 6 ? name.slice(0, 6) + '…' : name, value, itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] } }))
        : [{ name: '暂无数据', value: 1, itemStyle: { color: '#E5E7EB' } }],
      animationDuration: 800,
      animationEasing: 'cubicOut' as const,
    }],
  }), [caseTypes, darkMode, textColor, chartTextColor, borderColor]);

  /* 模块活跃排行 — 柱状图 */
  const barOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      backgroundColor: darkMode ? '#1a1d25' : '#fff',
      borderColor, textStyle: { color: textColor },
    },
    grid: { left: 10, right: 20, top: 10, bottom: 10, containLabel: true },
    xAxis: { type: 'value' as const, splitLine: { lineStyle: { color: darkMode ? 'rgba(66,71,79,0.3)' : '#F3F4F6' } }, axisLabel: { color: chartTextColor, fontSize: 10 }, show: true },
    yAxis: {
      type: 'category' as const,
      data: ranking.map((r) => r.name).reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: chartTextColor, fontSize: 10 },
    },
    series: [{
      type: 'bar' as const,
      data: ranking.map((r, i) => ({
        value: r.value,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: CHART_PALETTE[ranking.length - 1 - i] || '#2563EB' },
            { offset: 1, color: (CHART_PALETTE[ranking.length - 1 - i] || '#2563EB') + '44' },
          ]),
          borderRadius: [0, 4, 4, 0],
        },
      })).reverse(),
      barWidth: 18,
      animationDuration: 600,
      animationEasing: 'cubicOut' as const,
      label: {
        show: true, position: 'right' as const,
        fontSize: 11, fontWeight: 700, color: textColor,
        formatter: (params: { value: number }) => String(params.value),
      },
    }],
  }), [ranking, darkMode, textColor, chartTextColor, borderColor]);

  /* ---------- 无数据状态 ---------- */
  if (!hasData) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <GlobalSearch />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
          <div style={{ textAlign: 'center' }}>
            <TrendingUp size={40} color={darkMode ? '#8c919a' : '#D1D5DB'} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: textColor }}>暂无数据</div>
            <div style={{ fontSize: 12, color: mutedColor, marginTop: 4 }}>开始录入工作记录后将在这里展示可视化统计</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* 全局搜索 */}
      <GlobalSearch />

      {/* KPI */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', gap: 14 }}
      >
        {kpiData.map((item, index) => <KpiCard key={item.label} item={item} index={index} />)}
      </motion.div>

      {/* 到期预警 */}
      <DeadlineWarning />

      {/* 图表行 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 案件类型分布 - 玫瑰图 */}
        <PanelShell
          darkMode={darkMode}
          icon={<TrendingUp size={15} color={darkMode ? '#a3c9ff' : '#2E7DCA'}/>}
          title="案件类型分布"
          badge={`${caseTypes.length} 类`}
          delay={0.1}
        >
          <div style={{ padding: '6px 4px 4px' }}>
            <EChartsWrapper
              option={pieOption}
              style={{ height: 230 }}
            />
          </div>
        </PanelShell>

        {/* 模块活跃排行 - 柱状图 */}
        <PanelShell
          darkMode={darkMode}
          icon={<Activity size={15} color={darkMode ? '#00dbe7' : '#E67E22'}/>}
          title="模块活跃排行"
          badge={`${ranking.length} 个`}
          delay={0.14}
        >
          <div style={{ padding: '6px 4px 4px' }}>
            <EChartsWrapper
              option={barOption}
              style={{ height: 230 }}
            />
          </div>
        </PanelShell>
      </div>

      {/* 底部行 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 数据量概览 */}
        <DataVolumeGauge />

        {/* 最近动态 - 时间线风格 */}
        <PanelShell
          darkMode={darkMode}
          icon={<Zap size={15} color={darkMode ? '#a3c9ff' : '#2E7DCA'}/>}
          title="最近动态"
          badge={activities.length > 0 ? `${activities.length} 条` : undefined}
          delay={0.18}
        >
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: mutedColor, fontSize: 12 }}>暂无动态</div>
            ) : (
              <div style={{ position: 'relative', padding: '8px 0 8px 28px' }}>
                {/* 竖线 */}
                <div style={{
                  position: 'absolute', left: 12, top: 12, bottom: 12, width: 1.5,
                  background: `linear-gradient(to bottom, ${darkMode ? '#4B9EFF' : '#2563EB'}, transparent)`,
                  opacity: 0.3,
                }} />
                {activities.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    style={{
                      position: 'relative', paddingBottom: 12,
                      borderBottom: i < activities.length - 1 ? `1px solid ${darkMode ? 'rgba(66,71,79,0.15)' : '#F9FAFB'}` : 'none',
                    }}
                  >
                    {/* 圆点 */}
                    <div style={{
                      position: 'absolute', left: -20, top: 5,
                      width: 8, height: 8, borderRadius: '50%',
                      background: i < 3 ? '#2563EB' : (darkMode ? '#8c919a' : '#D1D5DB'),
                      border: `2px solid ${darkMode ? '#1a1d25' : '#fff'}`,
                    }} />
                    <div style={{ fontSize: 11, color: mutedColor, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, color: darkMode ? '#a3c9ff' : '#4B9EFF' }}>{a.moduleName}</span>
                      <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                      <span>{a.date}</span>
                    </div>
                    <div style={{
                      fontSize: 12.5, color: textColor, fontWeight: 500,
                      lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {String(a.title)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </PanelShell>
      </div>

      {/* 快捷入口 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div style={{
          background: darkMode ? 'rgba(28, 31, 38, 0.75)' : '#fff',
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          boxShadow: darkMode ? '0 2px 12px rgba(0,0,0,.25)' : '0 1px 4px rgba(0,0,0,.04)',
          backdropFilter: darkMode ? 'blur(14px)' : 'none',
          WebkitBackdropFilter: darkMode ? 'blur(14px)' : 'none',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: darkMode ? '1px solid rgba(66, 71, 79, 0.4)' : '1px solid #F3F4F6',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Zap size={15} color={darkMode ? '#a3c9ff' : '#F59E0B'} />
            <span style={{ fontSize: 14, fontWeight: 600, color: textColor }}>快捷入口</span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
            padding: '18px 18px 20px',
          }}>
            {TOP_MODULES.map((m) => {
              const IconComp = m.icon;
              return (
                <motion.div
                  key={m.id}
                  whileHover={{ y: -3 }}
                  onClick={() => setCurrentPage(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', borderRadius: 10,
                    padding: '14px 16px',
                    background: darkMode ? 'rgba(28, 31, 38, 0.6)' : '#fff',
                    border: `1px solid ${borderColor}`,
                    transition: 'all .2s',
                    boxShadow: darkMode ? '0 1px 6px rgba(0,0,0,.2)' : '0 1px 3px rgba(0,0,0,.04)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 4px 16px ${darkMode ? 'rgba(46,125,202,0.15)' : 'rgba(37,99,235,0.1)'}`;
                    e.currentTarget.style.borderColor = m.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = darkMode ? '0 1px 6px rgba(0,0,0,.2)' : '0 1px 3px rgba(0,0,0,.04)';
                    e.currentTarget.style.borderColor = borderColor;
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: darkMode ? 'rgba(163, 201, 255, 0.1)' : `${m.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <IconComp size={17} color={darkMode ? '#a3c9ff' : m.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: textColor }}>{m.label}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

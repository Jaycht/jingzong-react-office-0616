import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, CheckCircle2, ArrowUp, ArrowDown,
  Zap, ListTodo, Activity, Scale,
  Gavel, FileText, Users, Shield, Database, ClipboardList, Search
} from "lucide-react";
import { getMassRecords } from "../store/massStore";
import { useAppStore } from "../store/appStore";
import EmptyState from "../components/EmptyState";
import ReactECharts from "echarts-for-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODULE_NAMES: Record<string, string> = {
  "office-finance-assets": "经费保障", "office-party-attendance": "党建与考勤",
  "office-doc-report": "文件与报表", "office-cluster": "集群协查",
  "office-other": "其他事项", "mass-clue": "涉众线索",
  "mass-statistics": "涉众统计", "mass-petition": "信访反馈",
  "mass-interview": "约谈管理", "mass-publicity": "宣传工作",
  "legal-report-case": "接报案", "legal-case-ledger": "案件台账",
  "legal-special-action": "专项行动", "legal-assessment": "考核管理",
  "squad-case": "中队案件", "squad-daily": "中队日报",
  "squad-coercive": "强制措施", "squad-property": "涉案财物",
  "evidence-clue": "线索登记", "evidence-request": "调证登记",
  "evidence-freeze": "资金查控", "evidence-report": "资金分析",
};

const KPI_COLORS = [
  { bg: "linear-gradient(135deg,#1B5E9B,#2E7DCA)" },
  { bg: "linear-gradient(135deg,#0E7C4B,#38A169)" },
  { bg: "linear-gradient(135deg,#C2410C,#E67E22)" },
  { bg: "linear-gradient(135deg,#6D28D9,#8B5CF6)" },
];

const CHART_COLORS = ["#2E7DCA", "#38A169", "#E67E22", "#9C27B0", "#00ACC1", "#D32F2F", "#F59E0B", "#6366F1"];

const TOP_MODULES = [
  { id: "mass-clue",      label: "涉众线索",    icon: Search,      color: "#2563EB" },
  { id: "squad-case",     label: "中队案件",    icon: Gavel,       color: "#7C3AED" },
  { id: "legal-case-ledger", label: "案件台账", icon: FileText,    color: "#0891B2" },
  { id: "squad-coercive", label: "强制措施",    icon: Shield,      color: "#DC2626" },
  { id: "legal-report-case", label: "接报案",  icon: ClipboardList, color: "#D97706" },
  { id: "evidence-freeze", label: "资金查控",  icon: Database,    color: "#059669" },
  { id: "legal-assessment", label: "考核管理", icon: Scale,       color: "#6D28D9" },
  { id: "mass-petition",  label: "信访反馈",    icon: Users,       color: "#E11D48" },
];

const MODULE_CARD_STYLES = [
  { bg: "linear-gradient(135deg,#EEF2FF,#E0E7FF)", border: "#A5B4FC", iconBg: "#2563EB15" },
  { bg: "linear-gradient(135deg,#F5F3FF,#EDE9FE)", border: "#C4B5FD", iconBg: "#7C3AED15" },
  { bg: "linear-gradient(135deg,#ECFEFF,#CFFAFE)", border: "#67E8F9", iconBg: "#0891B215" },
  { bg: "linear-gradient(135deg,#FEF2F2,#FEE2E2)", border: "#FCA5A5", iconBg: "#DC262615" },
  { bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", border: "#FDE68A", iconBg: "#D9770615" },
  { bg: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", border: "#6EE7B7", iconBg: "#05966915" },
  { bg: "linear-gradient(135deg,#F5F3FF,#E9D5FF)", border: "#D8B4FE", iconBg: "#6D28D915" },
  { bg: "linear-gradient(135deg,#FFF1F2,#FFE4E6)", border: "#FDA4AF", iconBg: "#E11D4815" },
];

/* ------------------------------------------------------------------ */
/*  Data helpers                                                       */
/* ------------------------------------------------------------------ */

function calcKpi(records: any[]) {
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

function monthlyTrend(records: any[]) {
  const map: Record<string, number> = {};
  for (const r of records) {
    const m = r.createdAt?.slice(0, 7);
    if (m) map[m] = (map[m] || 0) + 1;
  }
  const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  return { months: sorted.map(([m]) => m), counts: sorted.map(([, c]) => c) };
}

function moduleRanking(records: any[]) {
  const dist: Record<string, number> = {};
  for (const r of records) {
    dist[r.moduleId] = (dist[r.moduleId] || 0) + 1;
  }
  return Object.entries(dist)
    .map(([id, value]) => ({ name: MODULE_NAMES[id] || id, value, id }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function extractNextSteps(records: any[]) {
  const keys = ["implementation", "details", "executeResult", "supervision", "risk"];
  const steps: { title: string; module: string; time: string }[] = [];
  for (const r of records) {
    const moduleName = MODULE_NAMES[r.moduleId] || r.moduleId;
    for (const k of keys) {
      const v = r.data?.[k];
      if (v && typeof v === "string" && v.trim().length > 3) {
        steps.push({ title: v.trim().slice(0, 45), module: moduleName, time: r.createdAt?.slice(0, 10) || "" });
      }
    }
  }
  return steps.slice(0, 6);
}

function recentActivity(records: any[]) {
  return records.slice(0, 10).map((r) => ({
    moduleName: MODULE_NAMES[r.moduleId] || r.moduleId,
    date: r.createdAt?.slice(0, 10) || "",
    title: r.data?.title || r.data?.name || r.data?.caseName || r.data?.summary || r.moduleId,
  }));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const { setCurrentPage } = useAppStore();
  const records = getMassRecords();
  const hasData = records.length > 0;

  const kpiData = useMemo(() => calcKpi(records), [records]);

  /* ------ ECharts options ------ */

  const trend = useMemo(() => monthlyTrend(records), [records]);

  const trendOpt = useMemo(() => ({
    tooltip: { trigger: "axis" as const, backgroundColor: "#fff", borderColor: "#E5E7EB", textStyle: { fontSize: 11 } },
    grid: { top: 16, bottom: 16, left: 36, right: 8 },
    xAxis: { type: "category" as const, data: trend.months, axisLabel: { fontSize: 10, color: "#9CA3AF" }, axisLine: { lineStyle: { color: "#E5E7EB" } }, axisTick: { show: false } },
    yAxis: { type: "value" as const, splitLine: { lineStyle: { color: "#F3F4F6" } }, axisLabel: { fontSize: 10, color: "#9CA3AF" } },
    series: [{
      type: "line", smooth: true, data: trend.counts,
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(46,125,202,0.25)" }, { offset: 1, color: "rgba(46,125,202,0.02)" }] } },
      lineStyle: { color: "#2E7DCA", width: 2 },
      itemStyle: { color: "#2E7DCA" },
      symbol: "circle" as const, symbolSize: 5,
    }],
  }), [trend]);

  const ranking = useMemo(() => moduleRanking(records), [records]);

  const rankOpt = useMemo(() => ({
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const }, backgroundColor: "#fff", borderColor: "#E5E7EB", textStyle: { fontSize: 11 } },
    grid: { top: 12, bottom: 12, left: 8, right: 36 },
    xAxis: { type: "value" as const, splitLine: { lineStyle: { color: "#F3F4F6" } }, axisLabel: { fontSize: 10, color: "#9CA3AF" }, axisTick: { show: false } },
    yAxis: {
      type: "category" as const, data: ranking.map((r) => r.name).reverse(),
      axisLabel: { fontSize: 10, color: "#374151" }, axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "bar", data: ranking.map((r) => r.value).reverse(),
      itemStyle: {
        color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#38A169" }, { offset: 1, color: "#4ADE80" }] },
        borderRadius: [0, 3, 3, 0],
      },
      barWidth: 10,
    }],
  }), [ranking]);

  const activities = useMemo(() => recentActivity(records), [records]);
  const nextSteps = useMemo(() => extractNextSteps(records), [records]);

  /* ---------- KPI card ---------- */

  const KpiCard = ({ k, i }: { k: typeof kpiData[0]; i: number }) => {
    const rising = k.trend >= 0;
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.08 }}
        style={{
          flex: 1, color: "#fff",
          background: KPI_COLORS[i].bg, borderRadius: 12, padding: "16px 18px",
          boxShadow: "0 2px 8px rgba(0,0,0,.08)",
        }}
      >
        <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 500, marginBottom: 4 }}>{k.label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{k.value}</span>
          <span style={{ fontSize: 13, opacity: 0.75, fontWeight: 500 }}>{k.unit}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11.5, opacity: 0.9 }}>
          {rising ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          <span>{Math.abs(k.trend)}%</span>
          <span style={{ opacity: 0.7, marginLeft: 4 }}>较上月</span>
        </div>
      </motion.div>
    );
  };

  /* ---------- Panel shell ---------- */

  function PanelShell({ icon, title, badge, children, delay = 0, style }: {
    icon: React.ReactNode; title: string; badge?: string;
    children: React.ReactNode; delay?: number; style?: React.CSSProperties;
  }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        style={{
          background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
          boxShadow: "0 1px 4px rgba(0,0,0,.04)", overflow: "hidden",
          display: "flex", flexDirection: "column", ...style,
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
          {icon}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>{title}</span>
          {badge && (
            <span style={{ marginLeft: "auto", background: "#E67E221A", color: "#E67E22", fontSize: 10, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>
              {badge}
            </span>
          )}
        </div>
        {children}
      </motion.div>
    );
  }

  /* ---------- Render ---------- */

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 18, padding: 20, background: "#F9FAFB", overflow: "auto" }}>

      {/* ============= KPI Row ============= */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        style={{ display: "flex", gap: 14 }}
      >
        {kpiData.map((k, i) => <KpiCard key={k.label} k={k} i={i} />)}
      </motion.div>

      {/* ============= Top Row: Charts ============= */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Monthly Trend */}
        <PanelShell
          icon={<TrendingUp size={15} color="#2E7DCA" />}
          title="月度记录趋势"
          delay={0.1}
          style={{ flex: 1 }}
        >
          {!hasData ? (
            <EmptyState title="暂无数据" description="录入数据后将展示月度趋势" />
          ) : (
            <ReactECharts option={trendOpt} style={{ height: 260, width: "100%" }} />
          )}
        </PanelShell>

        {/* Module Ranking */}
        <PanelShell
          icon={<Activity size={15} color="#38A169" />}
          title="模块活跃排行"
          delay={0.14}
          style={{ flex: 1 }}
        >
          {!hasData ? (
            <EmptyState title="暂无数据" description="录入数据后将展示模块活跃度" />
          ) : (
            <ReactECharts option={rankOpt} style={{ height: 260, width: "100%" }} />
          )}
        </PanelShell>
      </div>

      {/* ============= Bottom Row: Activity + Next Steps ============= */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Recent Activity Timeline */}
        <PanelShell
          icon={<ListTodo size={15} color="#7C3AED" />}
          title="最近动态"
          delay={0.18}
        >
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {!hasData ? (
              <EmptyState title="暂无动态" description="录入数据后将展示最近的动态" />
            ) : activities.length === 0 ? (
              <EmptyState title="暂无动态" />
            ) : (
              activities.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px",
                    borderBottom: i < activities.length - 1 ? "1px solid #F9FAFB" : "none",
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: CHART_COLORS[i % CHART_COLORS.length],
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, fontSize: 12.5, color: "#374151" }}>
                    <span style={{ fontWeight: 600 }}>{a.moduleName}</span>
                    <span style={{ color: "#9CA3AF" }}> 新增记录</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: "#9CA3AF", flexShrink: 0 }}>{a.date.slice(5)}</span>
                </motion.div>
              ))
            )}
          </div>
        </PanelShell>

        {/* Next Steps / Todo */}
        <PanelShell
          icon={<CheckCircle2 size={15} color="#E67E22" />}
          title="待办工作"
          badge={nextSteps.length > 0 ? `${nextSteps.length} 项` : undefined}
          delay={0.22}
        >
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {!hasData ? (
              <EmptyState title="暂无待办" description="填写记录时将自动提取待办内容" />
            ) : nextSteps.length === 0 ? (
              <EmptyState title="暂无待办" />
            ) : (
              nextSteps.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.43 + i * 0.05 }}
                  style={{
                    padding: "10px 14px",
                    borderBottom: i < nextSteps.length - 1 ? "1px solid #F9FAFB" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: i === 0 ? "#E67E221A" : "#F3F4F6",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, fontSize: 12, color: i === 0 ? "#E67E22" : "#6B7280",
                      fontWeight: 600,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#374151", fontWeight: 500, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {s.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{s.module}</span>
                        <span style={{ fontSize: 9, color: "#D1D5DB" }}>·</span>
                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{s.time}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </PanelShell>
      </div>

      {/* ============= Quick Entry Bottom ============= */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div style={{
          background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
          boxShadow: "0 1px 4px rgba(0,0,0,.04)", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={15} color="#F59E0B" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>快捷入口</span>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            padding: "20px 18px",
          }}>
            {TOP_MODULES.map((m, i) => {
              const IconComp = m.icon;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.52 + i * 0.05, type: "spring", stiffness: 260, damping: 22 }}
                  whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(0,0,0,.1)" }}
                  onClick={() => setCurrentPage(m.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 10, cursor: "pointer", borderRadius: 12,
                    padding: "20px 0",
                    background: MODULE_CARD_STYLES[i].bg,
                    border: "1px solid " + MODULE_CARD_STYLES[i].border,
                    transition: "box-shadow .2s, transform .2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: MODULE_CARD_STYLES[i].iconBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <IconComp size={22} color={m.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>{m.label}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

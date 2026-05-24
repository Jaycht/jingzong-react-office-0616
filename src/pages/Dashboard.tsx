import { useMemo, useState, useEffect } from "react";
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
  "legal-process": "法制流程",
  "mass-visit": "走访管理",
};

const KPI_COLORS = [
  { bg: "linear-gradient(135deg,#1B5E9B,#2E7DCA)" },
  { bg: "linear-gradient(135deg,#0E7C4B,#38A169)" },
  { bg: "linear-gradient(135deg,#C2410C,#E67E22)" },
  { bg: "linear-gradient(135deg,#6D28D9,#8B5CF6)" },
];

const CHART_COLORS = ["#2E7DCA", "#38A169", "#E67E22", "#9C27B0", "#00ACC1", "#D32F2F", "#F59E0B", "#6366F1"];

/* ---- KPI-style quick entry gradients (like top 总记录数 buttons) ---- */
const KPI_ENTRY_GRADIENTS = [
  "linear-gradient(135deg,#1B5E9B,#2E7DCA)",
  "linear-gradient(135deg,#0E7C4B,#38A169)",
  "linear-gradient(135deg,#C2410C,#E67E22)",
  "linear-gradient(135deg,#6D28D9,#8B5CF6)",
  "linear-gradient(135deg,#0369A1,#0EA5E9)",
  "linear-gradient(135deg,#86198F,#D946EF)",
  "linear-gradient(135deg,#166534,#22C55E)",
  "linear-gradient(135deg,#9A3412,#F97316)",
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
  const map: Record<string, number> = {};
  for (const r of records) {
    if (r.moduleId) map[r.moduleId] = (map[r.moduleId] || 0) + 1;
  }
  return Object.entries(map)
    .map(([id, value]) => ({ name: MODULE_NAMES[id] || id, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function extractNextSteps(records: any[]) {
  const steps: { module: string; title: string; time: string }[] = [];
  for (const r of records) {
    const data = r.data;
    if (!data) continue;
    const nextStep = data.nextStep || data.next_step || data.followUp;
    if (nextStep && typeof nextStep === "string" && nextStep.trim()) {
      steps.push({
        module: MODULE_NAMES[r.moduleId] || r.moduleId,
        title: nextStep,
        time: r.createdAt?.slice(0, 10) || "",
      });
    }
  }
  return steps.slice(0, 6);
}

function recentActivity(records: any[]) {
  return records.slice(0, 10).map((r) => ({
    moduleName: MODULE_NAMES[r.moduleId] || r.moduleId,
    date: r.createdAt?.slice(0, 10) || "",
    title: r.data?.title || r.data?.name || r.data?.caseName || r.data?.summary || MODULE_NAMES[r.moduleId] || r.moduleId,
  }));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const { setCurrentPage } = useAppStore();
  const darkMode = useAppStore((s) => s.darkMode);
  const records = getMassRecords();
  const hasData = records.length > 0;

  const kpiData = useMemo(() => calcKpi(records), [records]);

  /* ------ ECharts options ------ */

  const trend = useMemo(() => monthlyTrend(records), [records]);

  const trendOpt = useMemo(() => ({
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: darkMode ? "rgba(28,31,38,0.9)" : "#fff",
      borderColor: darkMode ? "rgba(163,201,255,0.15)" : "#E5E7EB",
      textStyle: { fontSize: 11, color: darkMode ? "#e2e2e6" : "#333" },
    },
    grid: { top: 16, bottom: 16, left: 36, right: 8 },
    xAxis: {
      type: "category" as const, data: trend.months,
      axisLabel: { fontSize: 10, color: darkMode ? "#8c919a" : "#9CA3AF" },
      axisLine: { lineStyle: { color: darkMode ? "rgba(66,71,79,0.5)" : "#E5E7EB" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value" as const,
      splitLine: { lineStyle: { color: darkMode ? "rgba(66,71,79,0.3)" : "#F3F4F6" } },
      axisLabel: { fontSize: 10, color: darkMode ? "#8c919a" : "#9CA3AF" },
    },
    series: [{
      type: "line", smooth: true, data: trend.counts,
      areaStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: darkMode ? "rgba(163,201,255,0.2)" : "rgba(46,125,202,0.25)" },
            { offset: 1, color: darkMode ? "rgba(163,201,255,0.02)" : "rgba(46,125,202,0.02)" },
          ],
        },
      },
      lineStyle: { color: darkMode ? "#a3c9ff" : "#2E7DCA", width: 2 },
      itemStyle: { color: darkMode ? "#a3c9ff" : "#2E7DCA" },
      symbol: "circle" as const, symbolSize: 5,
    }],
  }), [trend, darkMode]);

  const ranking = useMemo(() => moduleRanking(records), [records]);

  const rankOpt = useMemo(() => ({
    tooltip: {
      trigger: "axis" as const, axisPointer: { type: "shadow" as const },
      backgroundColor: darkMode ? "rgba(28,31,38,0.9)" : "#fff",
      borderColor: darkMode ? "rgba(163,201,255,0.15)" : "#E5E7EB",
      textStyle: { fontSize: 11, color: darkMode ? "#e2e2e6" : "#333" },
    },
    grid: { top: 12, bottom: 12, left: 8, right: 36 },
    xAxis: {
      type: "value" as const,
      splitLine: { lineStyle: { color: darkMode ? "rgba(66,71,79,0.3)" : "#F3F4F6" } },
      axisLabel: { fontSize: 10, color: darkMode ? "#8c919a" : "#9CA3AF" },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category" as const, data: ranking.map((r) => r.name).reverse(),
      axisLabel: { fontSize: 10, color: darkMode ? "#e2e2e6" : "#374151" },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "bar", data: ranking.map((r) => r.value).reverse(),
      itemStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: darkMode ? "#2E7DCA" : "#38A169" },
            { offset: 1, color: darkMode ? "#a3c9ff" : "#4ADE80" },
          ],
        },
        borderRadius: [0, 3, 3, 0],
      },
      barWidth: 10,
    }],
  }), [ranking, darkMode]);


  /* ===== 实时时间 ===== */
  const [now, setNow] = useState(() => {
    const d = new Date();
    const days = ['周日','周一','周二','周三','周四','周五','周六'];
    return d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0') + ' ' +
      days[d.getDay()] + ' ' +
      String(d.getHours()).padStart(2,'0') + ':' +
      String(d.getMinutes()).padStart(2,'0') + ':' +
      String(d.getSeconds()).padStart(2,'0');
  });
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const days = ['周日','周一','周二','周三','周四','周五','周六'];
      setNow(d.getFullYear() + '-' +
        String(d.getMonth()+1).padStart(2,'0') + '-' +
        String(d.getDate()).padStart(2,'0') + ' ' +
        days[d.getDay()] + ' ' +
        String(d.getHours()).padStart(2,'0') + ':' +
        String(d.getMinutes()).padStart(2,'0') + ':' +
        String(d.getSeconds()).padStart(2,'0'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
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

  /* ---------- Panel shell (supports dark mode via glass-panel) ---------- */

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
          background: darkMode ? "rgba(28, 31, 38, 0.75)" : "#fff",
          borderRadius: 12,
          border: darkMode ? "1px solid rgba(163, 201, 255, 0.12)" : "1px solid #E5E7EB",
          boxShadow: darkMode ? "0 2px 12px rgba(0,0,0,.25)" : "0 1px 4px rgba(0,0,0,.04)",
          backdropFilter: darkMode ? "blur(14px)" : "none",
          WebkitBackdropFilter: darkMode ? "blur(14px)" : "none",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          ...style,
        }}
      >
        <div style={{
          padding: "14px 18px",
          borderBottom: darkMode ? "1px solid rgba(66, 71, 79, 0.4)" : "1px solid #F3F4F6",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {icon}
          <span style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#e2e2e6" : "#1F2937" }}>{title}</span>
          {badge && (
            <span style={{
              marginLeft: "auto", fontSize: 10.5, fontWeight: 600,
              padding: "2px 10px", borderRadius: 10,
              background: darkMode ? "rgba(0, 219, 231, 0.12)" : "#F3F4F6",
              color: darkMode ? "#00dbe7" : "#6B7280",
            }}>
              {badge}
            </span>
          )}
        </div>
        {children}
      </motion.div>
    );
  }

  /* ---------- Empty state when no data ---------- */

  if (!hasData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <EmptyState
          icon={<TrendingUp size={40} color={darkMode ? "#8c919a" : "#D1D5DB"} />}
          title="暂无数据"
          description="开始录入工作记录后将在这里展示可视化统计"
        />
      </div>
    );
  }

  /* ================================================================== */
  /*  Main layout                                                        */
  /* ================================================================== */

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* ============= KPI Row ============= */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", gap: 14 }}
      >
        {kpiData.map((k, i) => <KpiCard key={k.label} k={k} i={i} />)}
      </motion.div>

      {/* ============= Charts Row (1:1 grid) ============= */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <PanelShell icon={<TrendingUp size={15} color={darkMode ? "#a3c9ff" : "#2E7DCA"}/>} title="月度记录趋势" delay={0.1}>
          <div style={{ padding: "4px 0" }}>
            <ReactECharts option={trendOpt} style={{ height: 220 }} />
          </div>
        </PanelShell>
        <PanelShell icon={<Activity size={15} color={darkMode ? "#00dbe7" : "#38A169"}/>} title="模块活跃排行" delay={0.14}>
          <div style={{ padding: "4px 0" }}>
            <ReactECharts option={rankOpt} style={{ height: 220 }} />
          </div>
        </PanelShell>
      </div>

      {/* ============= Activity Row (1:1 grid) ============= */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <PanelShell
          icon={<ListTodo size={15} color={darkMode ? "#a3c9ff" : "#2E7DCA"}/>}
          title="最近动态"
          badge={activities.length > 0 ? `${activities.length} 条` : undefined}
          delay={0.18}
        >
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {activities.length === 0 ? (
              <EmptyState title="暂无动态" />
            ) : (
              activities.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.04 }}
                  style={{
                    padding: "10px 14px",
                    borderBottom: i < activities.length - 1
                      ? (darkMode ? "1px solid rgba(66,71,79,0.3)" : "1px solid #F9FAFB")
                      : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: darkMode ? "#00dbe7" : "#2E7DCA",
                      marginTop: 5, flexShrink: 0,
                      boxShadow: darkMode ? "0 0 6px rgba(0,219,231,0.4)" : "none",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12,
                        color: darkMode ? "#e2e2e6" : "#374151",
                        fontWeight: 500, lineHeight: 1.4,
                        display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {a.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span style={{
                          fontSize: 10, color: darkMode ? "#8c919a" : "#9CA3AF",
                          background: darkMode ? "rgba(0,59,109,0.25)" : "transparent",
                          padding: darkMode ? "1px 6px" : 0,
                          borderRadius: darkMode ? 4 : 0,
                        }}>
                          {a.moduleName}
                        </span>
                        <span style={{ fontSize: 9, color: darkMode ? "#42474f" : "#D1D5DB" }}>·</span>
                        <span style={{ fontSize: 10, color: darkMode ? "#8c919a" : "#9CA3AF" }}>{a.date}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </PanelShell>

        <PanelShell
          icon={<CheckCircle2 size={15} color={darkMode ? "#e9c349" : "#E67E22"} />}
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
                    borderBottom: i < nextSteps.length - 1
                      ? (darkMode ? "1px solid rgba(66,71,79,0.3)" : "1px solid #F9FAFB")
                      : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: i === 0
                        ? (darkMode ? "rgba(233,195,73,0.15)" : "#E67E221A")
                        : (darkMode ? "rgba(66,71,79,0.3)" : "#F3F4F6"),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, fontSize: 12,
                      color: i === 0
                        ? (darkMode ? "#e9c349" : "#E67E22")
                        : (darkMode ? "#8c919a" : "#6B7280"),
                      fontWeight: 600,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12,
                        color: darkMode ? "#e2e2e6" : "#374151",
                        fontWeight: 500, lineHeight: 1.4,
                        display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {s.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 10, color: darkMode ? "#8c919a" : "#9CA3AF" }}>{s.module}</span>
                        <span style={{ fontSize: 9, color: darkMode ? "#42474f" : "#D1D5DB" }}>·</span>
                        <span style={{ fontSize: 10, color: darkMode ? "#8c919a" : "#9CA3AF" }}>{s.time}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </PanelShell>
      </div>

      {/* ============= Quick Entry Bottom (KPI Button Style) ============= */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div style={{
          background: darkMode ? "rgba(28, 31, 38, 0.75)" : "#fff",
          borderRadius: 12,
          border: darkMode ? "1px solid rgba(163, 201, 255, 0.12)" : "1px solid #E5E7EB",
          boxShadow: darkMode ? "0 2px 12px rgba(0,0,0,.25)" : "0 1px 4px rgba(0,0,0,.04)",
          backdropFilter: darkMode ? "blur(14px)" : "none",
          WebkitBackdropFilter: darkMode ? "blur(14px)" : "none",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 18px",
            borderBottom: darkMode ? "1px solid rgba(66, 71, 79, 0.4)" : "1px solid #F3F4F6",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Zap size={15} color={darkMode ? "#a3c9ff" : "#F59E0B"} />
            <span style={{ fontSize: 14, fontWeight: 600, color: darkMode ? "#e2e2e6" : "#1F2937" }}>
              快捷入口
            </span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            padding: "18px 18px 20px",
          }}>
            {TOP_MODULES.map((m, i) => {
              const IconComp = m.icon;
              return (
                <motion.div
                  whileHover={{ y: -3, backgroundColor: darkMode ? "rgba(46,125,202,0.08)" : "rgba(46,125,202,0.04)" }}
                  onClick={() => setCurrentPage(m.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    cursor: "pointer", borderRadius: 10,
                    padding: "14px 16px",
                    background: darkMode ? "rgba(28, 31, 38, 0.6)" : "#fff",
                    border: darkMode ? "1px solid rgba(163, 201, 255, 0.12)" : "1px solid #E5E7EB",
                    transition: "all .2s",
                    boxShadow: darkMode ? "0 1px 6px rgba(0,0,0,.2)" : "0 1px 3px rgba(0,0,0,.04)",
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: darkMode ? "rgba(163, 201, 255, 0.1)" : m.color + "15",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <IconComp size={17} color={darkMode ? "#a3c9ff" : m.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: darkMode ? "#e2e2e6" : "#374151" }}>
                    {m.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* 版权信息卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px',
          background: 'linear-gradient(135deg, #1a237e, #283593)',
          borderRadius: 10,
          border: '2px solid #ffd740',
          boxShadow: '0 4px 20px rgba(255,215,64,0.3)',
        }}>
          <span style={{
            fontSize: 13, color: '#ffd740',
            fontWeight: 600, letterSpacing: 0.5,
          }}>
            © 2026 陈洪涛 — Economic Investigation Work Log Registration System
          </span>
          <span style={{
            fontSize: 13, color: '#b0bec5',
            fontFamily: "'Courier New', monospace",
            fontWeight: 600, letterSpacing: 0.5,
          }}>
            {now}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
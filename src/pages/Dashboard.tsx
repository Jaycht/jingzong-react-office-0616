import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, CheckCircle2, ArrowUp, ArrowDown,
  Zap, ListTodo, Activity
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
  { id: "mass-clue", label: "涉众线索", icon: "🔍" },
  { id: "squad-case", label: "中队案件", icon: "📋" },
  { id: "legal-case-ledger", label: "案件台账", icon: "📁" },
  { id: "squad-coercive", label: "强制措施", icon: "⚖️" },
];

const MODULE_CARD_STYLES = [
  { bg: "linear-gradient(135deg,#EBF5FF,#F0F9FF)", border: "#BFDBFE" },
  { bg: "linear-gradient(135deg,#F0FFF4,#ECFDF5)", border: "#BBF7D0" },
  { bg: "linear-gradient(135deg,#FFF7ED,#FFFBEB)", border: "#FED7AA" },
  { bg: "linear-gradient(135deg,#F5F3FF,#EDE9FE)", border: "#DDD6FE" },
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
    moduleId: r.moduleId,
  }));
}

/** Animated counter */
function CountUp({ value }: { value: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
      style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const records = useMemo(() => getMassRecords(), []);
  const kpiData = useMemo(() => calcKpi(records), [records]);
  const { months, counts } = useMemo(() => monthlyTrend(records), [records]);
  const ranking = useMemo(() => moduleRanking(records), [records]);
  const nextSteps = useMemo(() => extractNextSteps(records), [records]);
  const activity = useMemo(() => recentActivity(records), [records]);

  const hasData = records.length > 0;

  /* ------ ECharts options ------ */

  const trendOpt = useMemo(() => ({
    tooltip: { trigger: "axis" as const, backgroundColor: "rgba(255,255,255,.96)", borderWidth: 0 },
    grid: { left: 36, right: 12, top: 28, bottom: 22 },
    xAxis: { type: "category" as const, data: months, axisLine: { lineStyle: { color: "#E5E7EB" } }, axisLabel: { fontSize: 10, color: "#9CA3AF" } },
    yAxis: { type: "value" as const, minInterval: 1, splitLine: { lineStyle: { color: "#F3F4F6", type: "dashed" as const } }, axisLabel: { fontSize: 10, color: "#9CA3AF" } },
    series: [
      {
        name: "记录数",
        type: "line" as const,
        data: counts,
        smooth: true,
        lineStyle: { width: 2.5, color: "#2E7DCA" },
        areaStyle: { color: { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(46,125,202,0.22)" }, { offset: 1, color: "rgba(46,125,202,0.02)" }] } },
        symbol: "circle" as const,
        symbolSize: 7,
        itemStyle: { color: "#2E7DCA", borderWidth: 2, borderColor: "#fff" },
      },
    ],
  }), [months, counts]);

  const rankOpt = useMemo(() => {
    const names = ranking.map((r) => r.name);
    const vals = ranking.map((r) => r.value);
    return {
      tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
      grid: { left: 80, right: 20, top: 8, bottom: 8 },
      xAxis: { type: "value" as const, minInterval: 1, splitLine: { show: false }, axisLabel: { fontSize: 10, color: "#9CA3AF" } },
      yAxis: {
        type: "category" as const,
        data: names,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 11, color: "#374151", fontWeight: 500 },
      },
      series: [{
        type: "bar" as const,
        data: vals.map((v, i) => ({ value: v, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length], borderRadius: [0, 6, 6, 0] as [number, number, number, number] } })),
        barWidth: 18,
        label: { show: true, position: "right" as const, fontSize: 10, color: "#6B7280" },
      }],
    };
  }, [ranking]);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* ============= KPI Row ============= */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}
      >
        {kpiData.map((k, i) => {
          const rising = k.trend >= 0;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, type: "spring", stiffness: 260, damping: 22 }}
              whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,.13)" }}
              style={{
                background: KPI_COLORS[i].bg, borderRadius: 12, padding: "16px 18px",
                color: "#fff", cursor: "default", boxShadow: "0 2px 8px rgba(0,0,0,.08)",
                transition: "box-shadow .2s",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6, letterSpacing: 0.5 }}>{k.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <CountUp value={k.value} />
                <span style={{ fontSize: 13, opacity: 0.75, fontWeight: 500 }}>{k.unit}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11.5, opacity: 0.9 }}>
                {rising ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                <span>{Math.abs(k.trend)}%</span>
                <span style={{ opacity: 0.7, marginLeft: 4 }}>较上月</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ============= Charts Row ============= */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, marginBottom: 18 }}>
        {/* Monthly Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileHover={{ boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}
          style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,.04)", overflow: "hidden", transition: "box-shadow .2s" }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={15} color="#2E7DCA" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>月度记录趋势</span>
            {hasData && <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#9CA3AF" }}>共 {counts.reduce((a, b) => a + b, 0)} 条</span>}
          </div>
          <div style={{ padding: "6px 8px 4px" }}>
            {!hasData ? (
              <EmptyState title="暂无数据" description="新建记录后将自动生成趋势图" />
            ) : (
              <ReactECharts option={trendOpt} style={{ height: 300 }} />
            )}
          </div>
        </motion.div>

        {/* Module Ranking */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}
          style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,.04)", overflow: "hidden", transition: "box-shadow .2s" }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
            <ListTodo size={15} color="#38A169" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>模块活跃排行</span>
            {ranking.length > 0 && <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#9CA3AF" }}>{ranking.length} 个模块</span>}
          </div>
          <div style={{ padding: "6px 8px 4px" }}>
            {!hasData ? (
              <EmptyState title="暂无数据" description="模块使用数据将自动统计" />
            ) : (
              <ReactECharts option={rankOpt} style={{ height: 300 }} />
            )}
          </div>
        </motion.div>
      </div>

      {/* ============= Bottom Row: Activity + Next Steps ============= */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        {/* Recent Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileHover={{ boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}
          style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,.04)", overflow: "hidden", transition: "box-shadow .2s" }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={15} color="#6D28D9" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>最近动态</span>
          </div>
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {!hasData ? (
              <EmptyState title="暂无动态" description="开始记录后动态将在此展示" />
            ) : (
              activity.map((a, i) => (
                <motion.div
                  key={a.moduleId + '-' + a.date + '-' + i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.38 + i * 0.04 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 18px",
                    borderBottom: i < activity.length - 1 ? "1px solid #F9FAFB" : "none",
                    cursor: "default",
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                    {i < activity.length - 1 && (
                      <div style={{ width: 1, height: 20, background: "#E5E7EB", marginTop: 2 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, fontSize: 12.5, color: "#374151" }}>
                    <span style={{ fontWeight: 600 }}>{a.moduleName}</span>
                    <span style={{ color: "#9CA3AF" }}> 新增记录</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: "#9CA3AF", flexShrink: 0 }}>{a.date.slice(5)}</span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}
          style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,.04)", overflow: "hidden", transition: "box-shadow .2s" }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={15} color="#E67E22" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>待办工作</span>
            {nextSteps.length > 0 && (
              <span style={{ marginLeft: "auto", background: "#E67E221A", color: "#E67E22", fontSize: 10, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>
                {nextSteps.length} 项
              </span>
            )}
          </div>
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
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
                      flexShrink: 0, fontSize: 12,
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
        </motion.div>
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
            <span style={{ fontSize: 13, fontWeight: 600 }}>快捷入口</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: "24px 18px", gap: 24 }}>
            {TOP_MODULES.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.52 + i * 0.06, type: "spring", stiffness: 260, damping: 22 }}
                whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(0,0,0,.1)" }}
                onClick={() => setCurrentPage(m.id)}
                style={{
                  width: 160, height: 115,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 10, cursor: "pointer", borderRadius: 12,
                  background: MODULE_CARD_STYLES[i].bg,
                  border: "1px solid " + MODULE_CARD_STYLES[i].border,
                  transition: "box-shadow .2s, transform .2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                }}
              >
                <span style={{ fontSize: 32, lineHeight: 1 }}>{m.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>{m.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

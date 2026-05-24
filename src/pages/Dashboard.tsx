import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, CheckCircle, Clock, AlertTriangle, Briefcase,
  ChartPie, Eye, Users,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { getMassRecords, type MassRecord } from '../store/massStore';
import { APP_VERSION } from '../version';
import EmptyState from '../components/EmptyState';
import ReactECharts from 'echarts-for-react';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

const MODULE_NAMES: Record<string, string> = {
  'office-finance-assets': '经费保障',
  'office-party-attendance': '党建与考勤',
  'office-doc-report': '文件与报表',
  'office-cluster': '集群协查',
  'office-other': '其他事项',
  'mass-clue': '涉众线索登记',
  'mass-statistics': '涉众数据统计',
  'mass-petition': '信访处理反馈',
  'mass-interview': '约谈管理',
  'mass-publicity': '宣传工作',
  'legal-report-case': '接报案登记',
  'legal-case-ledger': '案件总台账',
  'legal-special-action': '专项行动',
  'legal-assessment': '考核管理',
  'squad-case': '中队案件管理',
  'squad-daily': '每日工作记录',
  'squad-coercive': '强制措施登记',
  'squad-property': '涉案财物管理',
  'evidence-clue': '线索登记',
  'evidence-request': '调证登记',
  'evidence-freeze': '资金查控',
  'evidence-report': '资金分析',
};

/* ===== 统计聚合 ===== */
function calcStats(records: MassRecord[]) {
  const total = records.length;
  const completed = records.filter(r => r.data?.status === '已完成' || r.data?.status === '已办结').length;
  const ongoing = records.filter(r => r.data?.status !== '已完成' && r.data?.status !== '已办结' && r.data?.status).length;
  const overdue = records.filter(r => {
    const deadline = r.data?.deadline;
    return deadline && new Date(deadline) < new Date();
  }).length;
  return [
    { label: '本月记录总数', value: String(total || '0'), change: `累计${total}条`, up: true, color: '#1B5E9B' },
    { label: '已完成', value: String(completed), change: total > 0 ? `${Math.round(completed / total * 100)}%` : '0%', up: true, color: '#38A169' },
    { label: '进行中', value: String(ongoing), change: '待办记录', up: false, color: '#E67E22' },
    { label: '超期预警', value: String(overdue), change: '即将/已超期', up: false, color: '#D32F2F' },
  ];
}

/* ===== 提取下一步工作 ===== */
function extractNextSteps(records: MassRecord[]) {
  const keys = ['implementation', 'details', 'executeResult', 'supervision', 'risk'];
  const steps: { title: string; time: string }[] = [];
  for (const r of records) {
    for (const k of keys) {
      const v = r.data?.[k];
      if (v && typeof v === 'string' && v.trim().length > 3)
        steps.push({ title: v.trim().slice(0, 40), time: r.createdAt?.slice(0, 10) || '' });
    }
  }
  return steps.slice(0, 5);
}

export default function Dashboard() {
  const records = useMemo(() => getMassRecords(), []);
  const stats = useMemo(() => calcStats(records), [records]);
  const nextSteps = useMemo(() => extractNextSteps(records), [records]);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
            style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg, #1B5E9B, #2E7DCA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(27,94,155,.3)' }}
          >
            <FileText size={20} color="#fff" />
          </motion.div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#1F2937' }}>工作台</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>经侦大队工作记录管理系统 {APP_VERSION}</div>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards — 实时数据 */}
      <motion.div
        variants={container} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}
      >
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label} variants={item}
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,.1)' }}
            style={{
              background: '#fff', borderRadius: 10, padding: 18,
              boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'flex-start', gap: 13, cursor: 'pointer',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: stat.color }} />
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0] }}
              style={{ width: 44, height: 44, borderRadius: 11, background: stat.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              {i === 0 && <FileText size={19} color={stat.color} />}
              {i === 1 && <CheckCircle size={19} color={stat.color} />}
              {i === 2 && <Clock size={19} color={stat.color} />}
              {i === 3 && <AlertTriangle size={19} color={stat.color} />}
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', fontFamily: 'monospace', lineHeight: 1.2 }}>{stat.value}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                {stat.up ? <ArrowUp size={11} color="#388E3C" /> : <ArrowDown size={11} color="#D32F2F" />}
                <span style={{ fontSize: 11, color: stat.up ? '#388E3C' : '#D32F2F' }}>{stat.change}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>较上月</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recent Records — 实时数据 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', overflow: 'hidden' }}
          >
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Clock size={15} color="#2E7DCA" />最近工作记录
              </div>
            </div>
            <div>
              {records.slice(0, 5).map((r, i) => {
                const Icon = [Briefcase, Eye, FileText, Users, ChartPie][i % 5];
                const colors = [['#EBF5FF', '#1B5E9B'], ['#FFF3E0', '#E67E22'], ['#E8F5E9', '#38A169'], ['#F3E5F5', '#9C27B0'], ['#E0F7FA', '#00ACC1']];
                const [bg, ic] = colors[i % 5];
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.07 }}
                    whileHover={{ background: '#F8FAFC' }}
                    style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 18px', borderBottom: i < 4 ? '1px solid #F3F4F6' : 'none', cursor: 'pointer' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color={ic} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{MODULE_NAMES[r.moduleId] || r.moduleId}</div>
                      <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 1 }}>{r.createdAt?.slice(0, 16).replace('T', ' ') || ''}</div>
                    </div>
                  </motion.div>
                );
              })}
              {records.length === 0 && (
                <div style={{ padding: 30, textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>暂无工作记录</div>
              )}
            </div>
          </motion.div>

          {/* 月度趋势 — 新增可视化 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', overflow: 'hidden' }}
          >
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                <ChartPie size={15} color="#2E7DCA" />月度记录趋势
              </div>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {(() => {
                const map: Record<string, number> = {};
                for (const r of records) {
                  const m = r.createdAt?.slice(0, 7);
                  if (m) map[m] = (map[m] || 0) + 1;
                }
                const months = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
                if (months.length === 0) {
                  return <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: 20 }}>暂无月度数据</div>;
                }
                return (
                  <ReactECharts key={'trend-' + months.length} option={{
                    tooltip: { trigger: 'axis' },
                    grid: { left: '3%', right: '3%', bottom: '3%', top: '8%', containLabel: true },
                    xAxis: { type: 'category', data: months.map(d => d[0].slice(5)), axisLabel: { color: '#6B7280', fontSize: 11 }, axisLine: { lineStyle: { color: '#E5E7EB' } } },
                    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#F3F4F6' } }, axisLabel: { color: '#6B7280', fontSize: 11 } },
                    series: [{
                      type: 'line', smooth: true,
                      symbol: 'circle', symbolSize: 6,
                      lineStyle: { color: '#2E7DCA', width: 2 },
                      areaStyle: { color: 'rgba(46,125,202,0.1)' },
                      data: months.map(d => d[1]),
                    }],
                  }} style={{ height: 150, width: '100%' }} />
                );
              })()}
            </div>
          </motion.div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Alerts */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', overflow: 'hidden' }}
          >
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertTriangle size={15} color="#E67E22" />预警中心
              </div>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                const overdueRecords = records.filter(r => {
                  const deadline = r.data?.deadline;
                  return deadline && new Date(deadline) < new Date();
                });
                if (overdueRecords.length === 0) {
                  return <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: 10 }}>暂无超期预警</div>;
                }
                return overdueRecords.slice(0, 5).map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                    style={{ padding: '11px 13px', background: '#FFEBEE', borderRadius: 8, border: '1px solid rgba(211,47,47,0.2)', display: 'flex', gap: 10, cursor: 'pointer' }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#D32F2F1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AlertTriangle size={14} color="#D32F2F" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1F2937', marginBottom: 2 }}>{MODULE_NAMES[r.moduleId] || r.moduleId}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>期限：{r.data?.deadline?.slice(0, 10)}</div>
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          </motion.div>

          {/* Pie Chart — 从真实数据统计 */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', overflow: 'hidden' }}
          >
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                <ChartPie size={15} color="#2E7DCA" />本月工作分布
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              {(() => {
                const dist: Record<string, number> = {};
                for (const r of records) dist[r.moduleId] = (dist[r.moduleId] || 0) + 1;
                const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
                const total = entries.reduce((s, [, v]) => s + v, 0);
                if (entries.length === 0) {
                  return <EmptyState title="暂无数据" description="还没有工作记录，开始新建第一条吧" />;
                }
                const colors = ['#2E7DCA', '#38A169', '#E67E22', '#9C27B0', '#00ACC1', '#D32F2F'];
                const segments = entries.map((_e, i) => {
                  return `${colors[i % colors.length]} ${entries.slice(0, i).reduce((s, [, x]) => s + x / total * 360, 0)}deg ${entries.slice(0, i + 1).reduce((s, [, x]) => s + x / total * 360, 0)}deg`;
                }).join(', ');
                return (
                  <>
                    <motion.div
                      initial={{ rotate: -90 }}
                      animate={{ rotate: 0 }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
                      style={{
                        width: 110, height: 110, borderRadius: '50%',
                        background: `conic-gradient(${segments})`,
                        flexShrink: 0, position: 'relative',
                      }}
                    >
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 65, height: 65, borderRadius: '50%', background: '#fff' }} />
                    </motion.div>
                    <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {entries.slice(0, 5).map(([name, val], i) => (
                        <motion.div
                          key={name}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.65 + i * 0.08 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />
                          <span style={{ color: '#6B7280' }}>{MODULE_NAMES[name] || name} {Math.round(val / total * 100)}%</span>
                        </motion.div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>

          {/* 下一步工作 */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', overflow: 'hidden' }}
          >
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertTriangle size={15} color="#1B5E9B" />下一步工作
                {nextSteps.length > 0 && <span style={{ background: '#1B5E9B', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>{nextSteps.length}</span>}
              </div>
            </div>
            <div>
              {nextSteps.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>暂无下一步工作</div>
              ) : (
                nextSteps.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 + i * 0.08 }}
                    whileHover={{ background: '#F8FAFC' }}
                    style={{ padding: '10px 14px', borderBottom: i < nextSteps.length - 1 ? '1px solid #F3F4F6' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1B5E9B1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={13} color="#1B5E9B" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>{s.title}</div>
                      <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 1 }}>{s.time}</div>
                    </div>
                    {i < 2 && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#D32F2F', flexShrink: 0, marginTop: 5 }} />}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, FileText, Check, Users, Paperclip, TrendingUp, TrendingDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useAppStore } from "../store/appStore"
import { getMassRecords } from '../store/massStore';
import { getBaseModules } from '../moduleConfig';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } };

export default function Statistics() {
  const showToast = useAppStore((s) => s.showToast);

  // 强制刷新 key：每次挂载时 +1，保证数据从 localStorage 重新读取
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => { setRefreshKey(k => k + 1); }, []);

  // 从 localStorage 读取真实数据（每次 refreshKey 变化时重新读取）
  const [records, setRecords] = useState(() => getMassRecords());
  const [cases, setCases] = useState(() => getMassRecords('squad-case'));
  useEffect(() => {
    // 组件挂载后强制刷新一次（即使 React 复用组件实例）
    setRecords(getMassRecords());
    setCases(getMassRecords('squad-case'));
  }, [refreshKey]);
  // 窗口聚焦时也刷新
  useEffect(() => {
    const onFocus = () => {
      setRecords(getMassRecords());
      setCases(getMassRecords('squad-case'));
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  const modules = useMemo(() => getBaseModules(), []);

  // 按 moduleId 分组统计
  const moduleRecords: Record<string, number> = {};
  for (const r of records) {
    moduleRecords[r.moduleId] = (moduleRecords[r.moduleId] || 0) + 1;
  }

  const totalRecords = records.length;
  const totalCases = cases.length;
  const thisMonth = records.filter((r) => r.createdAt?.startsWith(new Date().toISOString().slice(0, 7))).length;
  const lastMonth = records.filter((r) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const ym = d.toISOString().slice(0, 7);
    return r.createdAt?.startsWith(ym);
  }).length;

  // 带附件的记录数（粗略估计——有 attachment 字段的）
  const attachmentCount = records.filter((r) => {
    const data = r.data || {};
    return Object.values(data).some((v) => typeof v === 'object' && v !== null && 'fileList' in v);
  }).length;

  // 统计数据卡片
  const STATS = [
    { label: '总记录数', value: String(totalRecords + totalCases), change: `本月+${thisMonth}`, up: true, color: '#1B5E9B' },
    { label: '案件总数', value: String(totalCases), change: `累计案件`, up: true, color: '#38A169' },
    { label: '本月新增', value: String(thisMonth), change: `上月${lastMonth}`, up: thisMonth >= lastMonth, color: '#00ACC1' },
    { label: '附件总数', value: String(attachmentCount || records.length), change: '含附件的记录', up: false, color: '#E67E22' },
  ];

  // 各岗位统计（按模块分组）
  const rawModuleStats = modules.map((mod) => {
    const count = moduleRecords[mod.id] || 0;
    return {
      dept: mod.departmentLabel,
      type: mod.label,
      count,
    };
  });
  const moduleStats = rawModuleStats.filter((m) => m.count > 0);

  // 没有数据时只有前面的统计数据，不显示图表的空状态
  const hasData = totalRecords > 0 || totalCases > 0;

  // 各模块记录数的柱状图数据
  const barData = moduleStats.slice(0, 8);
  const maxVal = Math.max(...barData.map(d => d.count), 1);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
            style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg, #1B5E9B, #2E7DCA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(27,94,155,.3)' }}>
            <BarChart3 size={20} color="#fff" />
          </motion.div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#1F2937' }}>数据统计</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>工作数据可视化分析 · 基于本地存储真实数据</div>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => {
            const report = { 生成时间: new Date().toISOString(), 统计数据: [{ 指标: '总记录数', 数值: totalRecords }, { 指标: '案件总数', 数值: totalCases }, { 指标: '本月新增', 数值: thisMonth }], 模块明细: moduleStats.map(m => ({ 部门: m.dept, 模块: m.type, 记录数: m.count })) };
            saveAs(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), `统计报告_${new Date().toISOString().slice(0,10)}.json`);
            showToast('统计报告已导出', 'success');
          }}
          style={{ height: 34, padding: '0 16px', background: '#fff', color: '#1B5E9B', border: '1.5px solid #1B5E9B', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
          <Download size={14} />导出报告
        </motion.button>
      </motion.div>

      {/* Stats - 真实数据，统一字体 */}
      <motion.div variants={container} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {STATS.map((s, i) => (
          <motion.div key={s.label} variants={item} whileHover={{ y: -3 }}
            style={{ background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: s.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {i === 0 && <FileText size={19} color={s.color} />}
              {i === 1 && <Check size={19} color={s.color} />}
              {i === 2 && <Users size={19} color={s.color} />}
              {i === 3 && <Paperclip size={19} color={s.color} />}
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.up ? '#388E3C' : '#9CA3AF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                {s.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {s.change} {s.up ? '↑' : ''}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {hasData && (
        <>
          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            {/* 各模块记录对比 - 横向进度条 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                各模块记录对比 <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>单位：条记录</span>
              </div>
              {barData.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {barData.map((d, i) => {
                    const pct = (d.count / maxVal) * 100;
                    const colors = ['#2563EB','#7C3AED','#0891B2','#059669','#D97706','#DC2626','#6D28D9','#E11D48'];
                    return (
                      <motion.div
                        key={d.type}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.35 + i * 0.05 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                      >
                        <span style={{
                          width: 64, fontSize: 11, fontWeight: 500,
                          color: '#374151', textAlign: 'right', flexShrink: 0,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{d.type}</span>
                        <div style={{ flex: 1, height: 18, background: '#F3F4F6', borderRadius: 9, position: 'relative', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.4 + i * 0.06 }}
                            style={{
                              height: '100%', borderRadius: 9,
                              background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}88)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                              paddingRight: 6, minWidth: 28,
                            }}
                          >
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{d.count}</span>
                          </motion.div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 12 }}>暂无数据</div>
              )}
            </motion.div>

            {/* 记录类型分布 - 甜甜圈+横向图例 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              style={{ background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                记录类型分布 <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>按数量占比</span>
              </div>
              {barData.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  {/* 左侧甜甜圈 */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                    style={{
                      width: 112, height: 112, borderRadius: '50%',
                      flexShrink: 0, position: 'relative',
                      background: (() => {
                        const total = barData.reduce((s, d) => s + d.count, 0) || 1;
                        let deg = 0;
                        const colors = ['#2563EB','#7C3AED','#0891B2','#059669','#D97706','#DC2626','#6D28D9','#E11D48'];
                        const stops = barData.map((d, i) => {
                          const pct = (d.count / total) * 360;
                          const start = deg;
                          deg += pct;
                          return `${colors[i % colors.length]} ${start}deg ${deg}deg`;
                        });
                        return `conic-gradient(${stops.join(', ')})`;
                      })(),
                    }}
                  >
                    {/* 中心空心 */}
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%,-50%)',
                      width: 60, height: 60, borderRadius: '50%',
                      background: '#fff',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#1F2937' }}>{barData.length}</span>
                      <span style={{ fontSize: 8.5, color: '#9CA3AF', marginTop: -1 }}>类</span>
                    </div>
                  </motion.div>
                  {/* 右侧图例：两层网格排列 */}
                  <div style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px 12px',
                  }}>
                    {barData.slice(0, 8).map((d, i) => {
                      const colors = ['#2563EB','#7C3AED','#0891B2','#059669','#D97706','#DC2626','#6D28D9','#E11D48'];
                      const total = barData.reduce((s, d) => s + d.count, 0) || 1;
                      const pct = Math.round((d.count / total) * 100);
                      return (
                        <motion.div
                          key={d.type}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.55 + i * 0.05 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{d.type}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', flexShrink: 0 }}>{pct}%</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 12 }}>暂无数据</div>
              )}
            </motion.div>
          </div>

          {/* Module Stats Table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: '#6B7280' }}>各模块记录统计明细</div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                const wb = XLSX.utils.book_new();
                const rows = moduleStats.map(m => ({ 部门: m.dept, 模块: m.type, 记录数: m.count }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), '模块统计');
                saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), `模块统计明细_${new Date().toISOString().slice(0,10)}.xlsx`);
                showToast('已导出 Excel', 'success');
              }}
                style={{ height: 30, padding: '0 12px', background: '#fff', color: '#1B5E9B', border: '1.5px solid #1B5E9B', borderRadius: 7, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                <Download size={13} />导出
              </motion.button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['部门', '模块', '记录数', '操作'].map((h, i) => (
                      <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {moduleStats.length > 0 ? moduleStats.map((row, i) => (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.04 }}
                      whileHover={{ background: '#F8FAFC' }} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '11px 14px', fontSize: 12.5 }}>{row.dept}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5 }}>{row.type}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5, fontWeight: 600 }}>{row.count}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#9CA3AF' }}>{row.count > 0 ? '有数据' : '无数据'}</td>
                    </motion.tr>
                  )) : (
                    <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>暂无数据，请先在工作模块中新建记录</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {!hasData && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          <BarChart3 size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>暂无统计数据</div>
          <div style={{ fontSize: 13 }}>请先在各个工作模块中新建记录，<br />统计数据将自动生成。</div>
        </div>
      )}
    </div>
  );
}

/**
 * 案件关系图谱 — 高级感设计
 * 深色玻璃态 + 渐变节点 + 发光连线
 */
import { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, RefreshCw, Maximize2, Minimize2, Zap } from 'lucide-react';
import * as echarts from 'echarts';
import { useAppStore } from '../store/appStore';
import { getMassRecords } from '../store/massStore';

interface GraphNode { id: string; name: string; category: number; symbolSize: number; value: number; }
interface GraphLink { source: string; target: string; }

const CATS = [
  { name: '案件', color: '#60A5FA', glow: 'rgba(96,165,250,0.4)', icon: '📁' },
  { name: '嫌疑人', color: '#F87171', glow: 'rgba(248,113,113,0.4)', icon: '👤' },
  { name: '证据/线索', color: '#34D399', glow: 'rgba(52,211,153,0.4)', icon: '🔍' },
];

export default function CaseGraph() {
  const darkMode = useAppStore((s) => s.darkMode);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();
  const [search, setSearch] = useState('');
  const [full, setFull] = useState(false);
  const [rk, setRk] = useState(0);
  const records = useMemo(() => { void rk; return getMassRecords(); }, [rk]);

  const { nodes, links, stats } = useMemo(() => {
    const nm = new Map<string, GraphNode>();
    const ls = new Set<string>();
    const ll: GraphLink[] = [];
    let c = 0, s = 0, e = 0;
    const addN = (id: string, name: string, cat: number, sz: number) => {
      if (nm.has(id)) { const n = nm.get(id)!; n.value++; n.symbolSize = Math.min(n.symbolSize + 3, 55); }
      else { nm.set(id, { id, name, category: cat, symbolSize: sz, value: 1 }); if (cat === 0) c++; else if (cat === 1) s++; else e++; }
    };
    const addL = (a: string, b: string) => { const k = `${a}-${b}`; if (!ls.has(k) && a !== b) { ls.add(k); ll.push({ source: a, target: b }); } };
    for (const r of records) {
      const d = r.data || {};
      const cn = String(d.caseName || '').trim();
      const sn = String(d.suspect || d.suspectName || '').trim();
      const cl = String(d.clueName || d.projectName || '').trim();
      if (cn) addN(`c-${cn}`, cn.length > 8 ? cn.slice(0, 8) + '…' : cn, 0, 38);
      if (sn) { addN(`s-${sn}`, sn.length > 6 ? sn.slice(0, 6) + '…' : sn, 1, 28); if (cn) addL(`c-${cn}`, `s-${sn}`); }
      if (cl) { addN(`e-${cl}`, cl.length > 8 ? cl.slice(0, 8) + '…' : cl, 2, 22); if (cn) addL(`c-${cn}`, `e-${cl}`); }
    }
    return { nodes: Array.from(nm.values()), links: ll, stats: { cases: c, suspects: s, clues: e } };
  }, [records]);

  useEffect(() => {
    if (!chartRef.current) return;
    const ch = echarts.init(chartRef.current);
    chartInstance.current = ch;
    const h = () => ch.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); ch.dispose(); };
  }, []);

  useEffect(() => {
    const ch = chartInstance.current;
    if (!ch) return;
    const dk = darkMode;
    const tc = dk ? '#94a3b8' : '#64748b';

    ch.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: dk ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
        borderColor: dk ? '#334155' : '#e2e8f0', borderWidth: 1,
        padding: [14, 18], extraCssText: 'backdrop-filter:blur(12px);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.15);',
        textStyle: { color: dk ? '#e2e8f0' : '#1e293b', fontSize: 13 },
        formatter: (p: any) => {
          if (p.dataType !== 'node') return '';
          const cat = CATS[p.data.category];
          return `<div style="text-align:center">
            <div style="font-size:24px;margin-bottom:6px">${cat?.icon || '📌'}</div>
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">${p.name}</div>
            <div style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:${cat?.color}15;color:${cat?.color};font-size:11px;font-weight:600">
              <span style="width:6px;height:6px;border-radius:50%;background:${cat?.color}"></span>${cat?.name}
            </div>
            <div style="margin-top:8px;font-size:12px;color:${tc}">关联 ${p.data.value} 条记录</div>
          </div>`;
        },
      },
      legend: {
        data: CATS.map(c => c.name), bottom: 16,
        textStyle: { color: tc, fontSize: 12 },
        itemWidth: 12, itemHeight: 12, itemGap: 24, icon: 'circle',
      },
      animationDuration: 1500,
      animationEasingUpdate: 'cubicInOut',
      series: [{
        type: 'graph', layout: 'force',
        data: nodes.map(n => ({
          ...n,
          label: { show: true, fontSize: 11, fontWeight: 600, color: dk ? '#e2e8f0' : '#1e293b', distance: 10 },
          itemStyle: {
            color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
              { offset: 0, color: '#fff' },
              { offset: 1, color: CATS[n.category]?.color || '#999' },
            ]),
            shadowBlur: 16,
            shadowColor: CATS[n.category]?.glow || 'rgba(0,0,0,0.1)',
            borderWidth: 2,
            borderColor: dk ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
          },
        })),
        links: links.map(l => ({
          ...l,
          lineStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: dk ? 'rgba(96,165,250,0.2)' : 'rgba(96,165,250,0.15)' },
              { offset: 0.5, color: dk ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)' },
              { offset: 1, color: dk ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.15)' },
            ]),
            width: 1.5, curveness: 0.15,
          },
        })),
        categories: CATS.map(c => ({ name: c.name, itemStyle: { color: c.color } })),
        roam: true, draggable: true,
        force: { repulsion: 280, edgeLength: [120, 250], gravity: 0.06, layoutAnimation: true },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 3, opacity: 0.6 },
          itemStyle: { shadowBlur: 24, shadowColor: 'rgba(0,0,0,0.2)' },
        },
        blur: { itemStyle: { opacity: 0.12 }, label: { opacity: 0.2 } },
      }],
    }, true);

    if (search) {
      const mid = new Set(nodes.filter(n => n.name.toLowerCase().includes(search.toLowerCase())).map(n => n.id));
      if (mid.size > 0) ch.setOption({ series: [{ data: nodes.map(n => ({ ...n, itemStyle: { opacity: mid.has(n.id) ? 1 : 0.08 } })) }] });
    }
  }, [nodes, links, darkMode, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex-between">
        <div className="flex items-center gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
          }}>
            <GitBranch size={22} color="#fff" />
          </div>
          <div>
            <div className="text-xl font-bold">案件关系图谱</div>
            <div className="text-sm text-secondary">可视化案件、嫌疑人、证据之间的关联</div>
          </div>
        </div>
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..."
            style={{
              height: 34, paddingInline: 12, borderRadius: 8, border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', color: 'var(--color-text)',
              fontSize: 13, width: 160, outline: 'none', fontFamily: 'inherit',
            }} />
          <button className="btn btn-ghost" onClick={() => setRk(k => k + 1)}><RefreshCw size={14} /></button>
          <button className="btn btn-ghost" onClick={() => setFull(v => !v)}>{full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <div className="flex gap-3">
        {[
          { label: '案件', value: stats.cases, color: '#60A5FA', bg: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' },
          { label: '嫌疑人', value: stats.suspects, color: '#F87171', bg: 'linear-gradient(135deg, #FEF2F2, #FECACA)' },
          { label: '证据/线索', value: stats.clues, color: '#34D399', bg: 'linear-gradient(135deg, #ECFDF5, #A7F3D0)' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: '14px 18px', borderRadius: 12,
            background: darkMode ? 'var(--color-surface)' : s.bg,
            border: darkMode ? '1px solid var(--color-border)' : 'none',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 图表 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{
          background: darkMode ? 'var(--color-surface)' : '#fff',
          borderRadius: 16, border: darkMode ? '1px solid var(--color-border)' : 'none',
          boxShadow: darkMode ? 'none' : '0 4px 24px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
        {nodes.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🕸️</div>
            <div className="text-lg font-semibold" style={{ marginBottom: 8 }}>暂无关联数据</div>
            <div className="text-sm text-muted">录入案件和嫌疑人信息后将自动生成关系图谱</div>
          </div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: full ? 'calc(100vh - 280px)' : 520, transition: 'height 0.3s' }} />
        )}
      </motion.div>

      <div className="text-xs text-muted" style={{ padding: '0 4px' }}>
        💡 拖拽节点 · 滚轮缩放 · 悬停查看关联 · 搜索高亮
      </div>
    </div>
  );
}

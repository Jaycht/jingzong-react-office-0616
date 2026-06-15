/**
 * 案件图谱 — 炫酷力导向关系图
 * 节点分类：案件（蓝）、嫌疑人（绿）、证据线索（金）
 * 支持搜索高亮、拖拽、缩放、全屏
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, RefreshCw, Maximize2, Minimize2, Search, Eye } from 'lucide-react';
import * as echarts from 'echarts';
import { useAppStore } from '../store/appStore';
import { getMassRecords } from '../store/massStore';

/* ===================== 节点分类 ===================== */

const CATS = [
  { name: '案件', color: '#3B82F6', gradient: ['#3B82F6', '#1D4ED8'], shadow: 'rgba(59,130,246,0.5)' },
  { name: '嫌疑人', color: '#10B981', gradient: ['#10B981', '#059669'], shadow: 'rgba(16,185,129,0.5)' },
  { name: '证据/线索', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'], shadow: 'rgba(245,158,11,0.5)' },
];

interface GraphNode { id: string; name: string; category: number; symbolSize: number; value: number; }
interface GraphLink { source: string; target: string; }

/* ===================== 主组件 ===================== */

export default function CaseGraph() {
  const darkMode = useAppStore((s) => s.darkMode);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();
  const [search, setSearch] = useState('');
  const [full, setFull] = useState(false);
  const [rk, setRk] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const records = useMemo(() => { void rk; return getMassRecords(); }, [rk]);

  // 页面加载时自动刷新
  useEffect(() => { setRk(k => k + 1); }, []);

  // 构建图谱数据
  const { nodes, links, stats } = useMemo(() => {
    const nm = new Map<string, GraphNode>();
    const ls = new Set<string>();
    const ll: GraphLink[] = [];
    let c = 0, s = 0, e = 0;
    
    const addN = (id: string, name: string, cat: number, sz: number) => {
      if (nm.has(id)) {
        const n = nm.get(id)!;
        n.value++;
        n.symbolSize = Math.min(n.symbolSize + 4, 60);
      } else {
        nm.set(id, { id, name, category: cat, symbolSize: sz, value: 1 });
        if (cat === 0) c++;
        else if (cat === 1) s++;
        else e++;
      }
    };
    
    const addL = (a: string, b: string) => {
      const k = `${a}-${b}`;
      if (!ls.has(k) && a !== b) {
        ls.add(k);
        ll.push({ source: a, target: b });
      }
    };

    for (const r of records) {
      const d = r.data || {};
      const cn = String(d.caseName || '').trim();
      const cl = String(d.clueName || d.projectName || '').trim();
      
      // 案件节点
      if (cn) addN(`c-${cn}`, cn.length > 12 ? cn.slice(0, 12) + '…' : cn, 0, 42);
      // 线索节点
      if (cl) {
        addN(`e-${cl}`, cl.length > 12 ? cl.slice(0, 12) + '…' : cl, 2, 28);
        if (cn) addL(`c-${cn}`, `e-${cl}`);
      }

      // 提取嫌疑人（多个来源）
      const suspectNames = new Set<string>();
      
      // 顶层嫌疑人字段
      const topSuspect = String(d.suspect || d.suspectName || '').trim();
      if (topSuspect) suspectNames.add(topSuspect);
      
      // suspects repeatable section
      if (Array.isArray(d.suspects)) {
        for (const item of d.suspects) {
          const name = String(item?.suspectName || item?.suspect || '').trim();
          if (name) suspectNames.add(name);
        }
      }
      
      // coerciveMeasures repeatable section
      if (Array.isArray(d.coerciveMeasures)) {
        for (const item of d.coerciveMeasures) {
          const name = String(item?.suspect || item?.suspectName || '').trim();
          if (name) suspectNames.add(name);
        }
      }
      
      // 其他 repeatable section 中可能包含嫌疑人的
      for (const key of Object.keys(d)) {
        if (key === 'suspects' || key === 'coerciveMeasures') continue;
        const val = d[key];
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
          for (const item of val) {
            const name = String((item as any)?.suspectName || (item as any)?.suspect || '').trim();
            if (name) suspectNames.add(name);
          }
        }
      }

      // 添加嫌疑人节点，连到案件
      for (const sn of suspectNames) {
        addN(`s-${sn}`, sn.length > 10 ? sn.slice(0, 10) + '…' : sn, 1, 32);
        if (cn) addL(`c-${cn}`, `s-${sn}`);
      }
    }

    return { nodes: Array.from(nm.values()), links: ll, stats: { cases: c, suspects: s, clues: e } };
  }, [records]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;
    const ch = echarts.init(chartRef.current);
    chartInstance.current = ch;
    const h = () => ch.resize();
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); ch.dispose(); };
  }, []);

  // 更新图表配置
  useEffect(() => {
    const ch = chartInstance.current;
    if (!ch) return;
    const dk = darkMode;

    ch.setOption({
      backgroundColor: 'transparent',
      
      // 提示框
      tooltip: {
        trigger: 'item',
        backgroundColor: dk ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
        borderColor: dk ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: dk ? '#e2e8f0' : '#1e293b', fontSize: 13 },
        extraCssText: 'backdrop-filter:blur(12px);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.18);',
        formatter: (p: any) => {
          if (p.dataType !== 'node') return '';
          const cat = CATS[p.data.category];
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:12px;height:12px;border-radius:50%;background:${cat?.color};display:inline-block"></span><b>${p.name}</b></div><div style="font-size:12px;color:${cat?.color};margin-bottom:4px">${cat?.name}</div><div style="font-size:11px;color:#64748b">关联 ${p.data.value} 条记录</div>`;
        },
      },

      // 图例
      legend: {
        data: CATS.map(c => c.name),
        top: 8,
        right: 16,
        textStyle: { color: dk ? '#94a3b8' : '#64748b', fontSize: 12 },
        itemWidth: 14,
        itemHeight: 14,
        itemGap: 18,
        icon: 'circle',
      },

      // 动画
      animationDuration: 2000,
      animationEasingUpdate: 'quinticInOut',
      
      series: [{
        type: 'graph',
        layout: 'force',
        
        // 节点数据
        data: nodes.map(n => {
          const cat = CATS[n.category];
          return {
            ...n,
            label: {
              show: true,
              position: 'right',
              fontSize: 11,
              fontWeight: 500,
              color: dk ? '#cbd5e1' : '#334155',
              formatter: (p: any) => p.name,
            },
            itemStyle: {
              color: {
                type: 'radial',
                x: 0.3, y: 0.3, r: 0.8,
                colorStops: [
                  { offset: 0, color: cat?.gradient?.[0] || '#999' },
                  { offset: 1, color: cat?.gradient?.[1] || '#666' },
                ],
              },
              borderColor: dk ? '#0f172a' : '#fff',
              borderWidth: 2.5,
              shadowBlur: 16,
              shadowColor: cat?.shadow || 'rgba(0,0,0,0.2)',
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 30,
                shadowColor: cat?.shadow || 'rgba(0,0,0,0.3)',
                borderWidth: 3,
              },
            },
          };
        }),

        // 连线
        links: links.map(l => {
          const _cat = (id: string) => id.startsWith('s-') ? 1 : id.startsWith('e-') ? 0 : 2;
          const sc = _cat(l.source);
          const tc = _cat(l.target);
          let linkColor: string;
          if (dk) {
            if (sc === 0 && tc === 1) linkColor = 'rgba(59,130,246,0.5)';
            else if (sc === 0 && tc === 2) linkColor = 'rgba(245,158,11,0.5)';
            else linkColor = 'rgba(16,185,129,0.5)';
          } else {
            if (sc === 0 && tc === 1) linkColor = 'rgba(59,130,246,0.35)';
            else if (sc === 0 && tc === 2) linkColor = 'rgba(245,158,11,0.35)';
            else linkColor = 'rgba(16,185,129,0.35)';
          }
          return { ...l, lineStyle: { color: linkColor, width: 2, curveness: 0.15 } };
        }),

        categories: CATS.map(c => ({ name: c.name, itemStyle: { color: c.color } })),

        // 交互
        roam: true,
        draggable: true,
        
        // 力导向配置
        force: {
          repulsion: 250,
          edgeLength: [60, 180],
          gravity: 0.05,
          friction: 0.6,
          layoutAnimation: true,
        },

        // 悬停高亮
        emphasis: {
          focus: 'adjacency',
          blurScope: 'global',
          lineStyle: { width: 4 },
        },

        // 未悬停节点淡出
        blur: {
          itemStyle: { opacity: 0.12 },
          label: { opacity: 0.15 },
        },
      }],
    }, true);

    // 搜索高亮
    if (search) {
      const mid = new Set(nodes.filter(n => n.name.toLowerCase().includes(search.toLowerCase())).map(n => n.id));
      if (mid.size > 0) {
        ch.setOption({
          series: [{
            data: nodes.map(n => ({
              ...n,
              itemStyle: {
                ...n.itemStyle,
                opacity: mid.has(n.id) ? 1 : 0.06,
              },
              label: {
                ...n.label,
                opacity: mid.has(n.id) ? 1 : 0.08,
              },
            })),
          }],
        });
      }
    }
  }, [nodes, links, darkMode, search]);

  // 统计数据卡片颜色
  const statCards = [
    { label: '案件', value: stats.cases, cat: 0 },
    { label: '嫌疑人', value: stats.suspects, cat: 1 },
    { label: '证据/线索', value: stats.clues, cat: 2 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 顶部栏 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderRadius: 16,
          background: darkMode ? 'linear-gradient(135deg, #1a1d25, #1e293b)' : 'linear-gradient(135deg, #fff, #f8fafc)',
          border: `1px solid ${darkMode ? '#2a2d35' : '#e2e8f0'}`,
          boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,.2)' : '0 4px 12px rgba(0,0,0,.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* 图标 */}
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            background: 'linear-gradient(135deg, #3B82F6, #10B981, #F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(59,130,246,.35)',
          }}>
            <GitBranch size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: darkMode ? '#f1f5f9' : '#0f172a', letterSpacing: '-0.3px' }}>
              案件图谱
            </div>
            <div style={{ fontSize: 12, color: darkMode ? '#64748b' : '#94a3b8', marginTop: 2 }}>
              力导向图 · 拖拽节点 · 滚轮缩放 · 悬停查看关联
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 搜索框 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 10,
            background: darkMode ? 'rgba(30,41,59,.6)' : '#f8fafc',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          }}>
            <Search size={14} color={darkMode ? '#64748b' : '#94a3b8'} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索节点..."
              style={{
                border: 'none', outline: 'none',
                background: 'transparent', color: darkMode ? '#e2e8f0' : '#334155',
                fontSize: 13, width: 140, fontFamily: 'inherit',
              }}
            />
          </div>
          
          {/* 刷新按钮 */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setRk(k => k + 1)}
            style={{
              width: 38, height: 38, borderRadius: 10,
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              background: 'transparent',
              color: darkMode ? '#94a3b8' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#3B82F6'; e.currentTarget.style.borderColor = '#3B82F6'; }}
            onMouseLeave={e => { e.currentTarget.style.color = darkMode ? '#94a3b8' : '#64748b'; e.currentTarget.style.borderColor = darkMode ? '#334155' : '#e2e8f0'; }}
          >
            <RefreshCw size={16} />
          </motion.button>

          {/* 全屏按钮 */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setFull(v => !v)}
            style={{
              width: 38, height: 38, borderRadius: 10,
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              background: 'transparent',
              color: darkMode ? '#94a3b8' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#3B82F6'; e.currentTarget.style.borderColor = '#3B82F6'; }}
            onMouseLeave={e => { e.currentTarget.style.color = darkMode ? '#94a3b8' : '#64748b'; e.currentTarget.style.borderColor = darkMode ? '#334155' : '#e2e8f0'; }}
          >
            {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </motion.button>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: 14 }}>
        {statCards.map(s => {
          const cat = CATS[s.cat];
          return (
            <motion.div
              key={s.label}
              whileHover={{ y: -2 }}
              style={{
                flex: 1,
                padding: '16px 20px',
                borderRadius: 14,
                background: darkMode
                  ? `linear-gradient(135deg, ${cat.color}15, ${cat.color}08)`
                  : `linear-gradient(135deg, ${cat.color}08, ${cat.color}04)`,
                border: `1px solid ${cat.color}20`,
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer',
                transition: 'all .2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 8px 24px ${cat.shadow}`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: cat.gradient ? `linear-gradient(135deg, ${cat.gradient[0]}, ${cat.gradient[1]})` : cat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${cat.shadow}`,
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#fff',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: cat.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: darkMode ? '#94a3b8' : '#64748b', fontWeight: 500 }}>{s.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 图谱容器 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          borderRadius: 16,
          background: darkMode ? '#0f172a' : '#fff',
          border: `1px solid ${darkMode ? '#1e293b' : '#e2e8f0'}`,
          boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,.25)' : '0 4px 16px rgba(0,0,0,.06)',
          overflow: 'hidden',
        }}
      >
        {nodes.length === 0 ? (
          <div style={{ padding: '100px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 20, opacity: 0.3 }}>🕸️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: darkMode ? '#e2e8f0' : '#1e293b', marginBottom: 8 }}>暂无关联数据</div>
            <div style={{ fontSize: 13, color: darkMode ? '#64748b' : '#94a3b8' }}>
              录入案件和嫌疑人信息后将自动生成关系图谱
            </div>
          </div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: full ? 'calc(100vh - 320px)' : 580, transition: 'height 0.3s' }} />
        )}
      </motion.div>

      {/* 图例说明 */}
      {nodes.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 24, padding: '8px 0',
        }}>
          {CATS.map(cat => (
            <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: `linear-gradient(135deg, ${cat.gradient?.[0]}, ${cat.gradient?.[1]})`,
                boxShadow: `0 0 6px ${cat.shadow}`,
              }} />
              <span style={{ fontSize: 11, color: darkMode ? '#64748b' : '#94a3b8' }}>{cat.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

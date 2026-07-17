/**
 * 资金穿透 / 对手账户分析（P1-4）
 * - 账户雷达：聚合全量记录中的银行账号，标注"疑似对手账户 / 跑分归集账户"
 * - 资金流向图：有向图谱（账户节点 + 层级下行 / 上游→资金账号 流向边，带金额标签）
 * - 点击账户 → 关联记录抽屉 → 复用 CaseDetail 查看详情
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Drawer, Empty } from 'antd';
import {
  Landmark, Search, ZoomIn, ZoomOut, Maximize as FitIcon, RefreshCw,
  Maximize2, Minimize2, AlertTriangle, Waypoints, ArrowLeftRight, Snowflake,
} from 'lucide-react';
import * as echarts from '../lib/echarts';
import { useAppStore } from '../store/appStore';
import { getMassRecordById, type MassRecord } from '../store/massStore';
import { buildFundModel, type FundAccount, type FundEdge } from '../utils/fundPenetration';
import { recTitle } from '../utils/caseLinkage';
import CaseDetail from './CaseDetail';

/* ============================ 工具 ============================ */

function fmt(n: number): string {
  if (!n) return '0';
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

/* ============================ 主组件 ============================ */

export default function FundPenetration() {
  const darkMode = useAppStore((s) => s.darkMode);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  const [search, setSearch] = useState('');
  const [onlyCounterparty, setOnlyCounterparty] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [selected, setSelected] = useState<FundAccount | null>(null);
  const [viewRecord, setViewRecord] = useState<MassRecord | null>(null);
  const [full, setFull] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rk, setRk] = useState(0);

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const degreeRef = useRef<Map<string, number>>(new Map());

  const model = useMemo(() => buildFundModel(), [rk]);

  // 模块筛选选项
  const moduleOptions = useMemo(() => {
    const set = new Set<string>();
    model.accounts.forEach((a) => a.moduleNames.forEach((m) => set.add(m)));
    return Array.from(set);
  }, [model]);

  // 过滤后的账户
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return model.accounts.filter((a) => {
      if (onlyCounterparty && !a.isCounterparty) return false;
      if (moduleFilter !== 'all' && !a.moduleNames.includes(moduleFilter)) return false;
      if (q) {
        const hay = (a.masked + ' ' + a.caseNames.join(' ') + ' ' + a.moduleNames.join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [model, search, onlyCounterparty, moduleFilter]);

  // 过滤后的边（仅保留两端都在可见账户或外部节点）
  const visibleAccounts = useMemo(() => new Set(filtered.map((a) => a.account)), [filtered]);
  const visibleEdges = useMemo(() => {
    const ext = new Set<string>();
    model.edges.forEach((e) => {
      if (!visibleAccounts.has(e.from)) ext.add(e.from);
      if (!visibleAccounts.has(e.to)) ext.add(e.to);
    });
    return model.edges.filter((e) => visibleAccounts.has(e.from) || visibleAccounts.has(e.to) || ext.has(e.from) || ext.has(e.to));
  }, [model, visibleAccounts]);

  /* ----------------------- 图谱渲染 ----------------------- */
  useEffect(() => {
    if (!chartRef.current) return;
    const ch = echarts.init(chartRef.current);
    chartInstance.current = ch;
    const ro = new ResizeObserver(() => ch.resize());
    ro.observe(chartRef.current);
    const onWin = () => ch.resize();
    window.addEventListener('resize', onWin);
    return () => { ro.disconnect(); window.removeEventListener('resize', onWin); ch.dispose(); chartInstance.current = null; };
  }, []);

  useEffect(() => {
    const ch = chartInstance.current;
    if (!ch) return;
    const dk = darkMode;

    // 节点：账户 + 外部/上游节点
    const nodeMap = new Map<string, { id: string; name: string; category: number; symbolSize: number; value: number }>();
    const addNode = (id: string, name: string, cat: number, sz: number) => {
      if (nodeMap.has(id)) { const n = nodeMap.get(id)!; n.value += 1; n.symbolSize = Math.min(n.symbolSize + 3, 64); }
      else nodeMap.set(id, { id, name, category: cat, symbolSize: sz, value: 1 });
    };
    for (const a of filtered) {
      const flow = a.received + a.transferred + a.balance;
      const sz = Math.max(18, Math.min(60, 18 + Math.log10(flow + 10) * 14));
      addNode(a.account, a.masked, a.isCounterparty ? 1 : 0, sz);
    }
    for (const e of visibleEdges) {
      if (!nodeMap.has(e.from)) addNode(e.from, String(e.from).slice(0, 12), 2, 14);
      if (!nodeMap.has(e.to)) addNode(e.to, String(e.to).slice(0, 12), 2, 14);
    }

    const links: FundEdge[] = visibleEdges;
    const degree = new Map<string, number>();
    for (const l of links) { degree.set(l.from, (degree.get(l.from) || 0) + 1); degree.set(l.to, (degree.get(l.to) || 0) + 1); }
    degreeRef.current = degree;

    const CATS = [
      { name: '涉案账户', color: '#6366F1' },
      { name: '疑似对手账户', color: '#F43F5E' },
      { name: '外部/上游', color: '#94A3B8' },
    ];

    const q = search.trim().toLowerCase();

    ch.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: dk ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.96)',
        borderColor: dk ? '#334155' : '#e2e8f0', borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: dk ? '#e2e8f0' : '#1e293b', fontSize: 13 },
        extraCssText: 'backdrop-filter:blur(8px);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);',
        formatter: (p: { dataType?: string; data?: { category?: number; value?: number; name?: string; amount?: number } }) => {
          if (p.dataType !== 'node') return '';
          const node = p.data!;
          const cat = CATS[node.category ?? 0];
          return `<b>${node.name}</b><br/><span style="color:${cat.color}">●</span> ${cat.name}　关联 ${node.value ?? 0} 条`;
        },
      },
      legend: { data: CATS.map((c) => c.name), top: 12, left: 'center', textStyle: { color: dk ? '#94a3b8' : '#64748b', fontSize: 12 }, itemWidth: 14, itemHeight: 14, itemGap: 20, icon: 'circle' },
      animationDuration: 1000,
      series: [{
        type: 'graph',
        layout: 'force',
        zoom,
        center: ['50%', '52%'],
        roam: true,
        draggable: true,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 7,
        force: { repulsion: 340, edgeLength: [120, 240], gravity: 0.06, layoutAnimation: true },
        label: { show: true, position: 'right', fontSize: 11, fontWeight: 600, color: dk ? '#e2e8f0' : '#1e293b', formatter: (p: { name?: string }) => p.name || '' },
        data: Array.from(nodeMap.values()).map((n) => ({
          ...n,
          itemStyle: {
            color: CATS[n.category].color,
            borderColor: dk ? 'rgba(255,255,255,0.18)' : '#fff',
            borderWidth: 3,
            shadowBlur: 14, shadowColor: CATS[n.category].color + '50',
            opacity: q ? (n.name.toLowerCase().includes(q) ? 1 : 0.12) : 1,
          },
        })),
        links: links.map((l) => ({
          source: l.from, target: l.to,
          lineStyle: {
            color: dk ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.28)',
            width: l.amount && l.amount > 0 ? Math.min(6, 2 + Math.log10(l.amount + 10)) : 2,
            curveness: 0.12,
            opacity: q ? (l.from.toLowerCase().includes(q) || l.to.toLowerCase().includes(q) ? 0.9 : 0.06) : 0.85,
          },
          label: { show: !!(l.amount && l.amount > 0), formatter: () => fmt(l.amount as number), fontSize: 10, color: dk ? '#cbd5e1' : '#475569' },
        })),
        categories: CATS.map((c) => ({ name: c.name, itemStyle: { color: c.color, shadowBlur: 8, shadowColor: c.color + '40' } })),
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 }, itemStyle: { shadowBlur: 24 } },
        blur: { itemStyle: { opacity: 0.12 }, label: { opacity: 0.15 } },
      }],
    }, true);
  }, [filtered, visibleEdges, darkMode, zoom, rk, search]);

  useEffect(() => { const ch = chartInstance.current; if (ch) ch.setOption({ series: [{ zoom }] }); }, [zoom]);

  const handleFit = useCallback(() => {
    setZoom(1);
    chartInstance.current?.dispatchAction({ type: 'restore' } as { type: string });
  }, []);

  /* ----------------------- 关联记录抽屉 ----------------------- */
  const relatedRecords = useMemo(() => {
    if (!selected) return [];
    return selected.recordIds
      .map((id) => getMassRecordById(id))
      .filter((r): r is MassRecord => !!r)
      .map((r) => ({
        id: r.id,
        title: recTitle(r.data),
        moduleName: r.moduleId,
        date: String(r.updatedAt || r.createdAt || '').slice(0, 10),
      }));
  }, [selected]);

  const s = model.summary;

  const statsCards = [
    { label: '关联账户', value: s.accountCount, color: '#6366F1', bg: 'rgba(99,102,241,0.12)', icon: Landmark },
    { label: '涉及记录', value: s.recordCount, color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)', icon: ArrowLeftRight },
    { label: '疑似对手账户', value: s.counterpartyCount, color: '#F43F5E', bg: 'rgba(244,63,94,0.12)', icon: AlertTriangle },
    { label: '冻结账户', value: s.frozenCount, color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: Snowflake },
  ];

  return (
    <div className="graph-page">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="graph-head">
        <div className="graph-head-ico" style={{ background: 'linear-gradient(135deg,#0EA5E9,#6366F1)' }}><Landmark size={23} color="#fff" /></div>
        <div>
          <div className="graph-head-title">资金穿透分析</div>
          <div className="graph-head-sub">账户聚合 · 资金流向 · 疑似对手账户研判（金额单位依原始录入混用，仅作研判参考）</div>
        </div>
      </motion.div>

      {/* 工具栏 */}
      <div className="graph-toolbar">
        <div className="gt-group">
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Search size={15} style={{ position: 'absolute', left: 11, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input className="gt-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索账号/案件/模块..." style={{ paddingLeft: 32 }} />
          </div>
        </div>
        <div className="gt-divider" />
        <div className="gt-group">
          <span className="gt-label">模块</span>
          <select className="gt-select" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            <option value="all">全部</option>
            {moduleOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="gt-group">
          <button className={`chip ${onlyCounterparty ? '' : 'off'}`} onClick={() => setOnlyCounterparty((v) => !v)}>
            <AlertTriangle size={13} />仅看对手账户
          </button>
        </div>
        <div className="gt-spacer" />
        <div className="gt-group">
          <div className="zoom-ctrl">
            <button className="zoom-btn" onClick={() => setZoom((z) => Math.max(0.3, +(z / 1.2).toFixed(2)))} title="缩小"><ZoomOut size={15} /></button>
            <span className="zoom-val">{Math.round(zoom * 100)}%</span>
            <button className="zoom-btn" onClick={() => setZoom((z) => Math.min(4, +(z * 1.2).toFixed(2)))} title="放大"><ZoomIn size={15} /></button>
            <button className="zoom-btn" onClick={handleFit} title="适应视图"><FitIcon size={15} /></button>
          </div>
        </div>
        <div className="gt-group">
          <button className="gt-btn" onClick={() => { setRk((k) => k + 1); }} title="重新布局"><RefreshCw size={16} /></button>
          <button className={`gt-btn ${full ? 'active' : ''}`} onClick={() => setFull((v) => !v)} title="全屏画布">
            {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="dash-kpi">
        {statsCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="wb-kpi">
              <div className="graph-stat-ico" style={{ background: c.bg, color: c.color }}><Icon size={22} /></div>
              <div>
                <div className="wb-kpi-val" style={{ color: c.color }}>{c.value}</div>
                <div className="wb-kpi-label">{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 资金流向图 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="wb-panel graph-canvas-panel">
        {filtered.length === 0 ? (
          <div style={{ padding: 90, textAlign: 'center' }}>
            <div style={{ fontSize: 50, marginBottom: 16 }}>💸</div>
            <div className="text-lg font-semibold" style={{ marginBottom: 8, color: 'var(--color-text)' }}>暂无资金穿透数据</div>
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>录入银行账户、资金查控、资金分析（来源/去向）后将自动生成穿透图谱</div>
          </div>
        ) : (
          <div className="graph-canvas-wrap" style={{ borderRadius: 'inherit' }}>
            <div ref={chartRef} className={`graph-canvas ${full ? 'full' : ''}`} />
          </div>
        )}
      </motion.div>

      {/* 账户雷达 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="wb-panel" style={{ marginTop: 16, padding: 18 }}>
        <div className="wb-panel-head" style={{ marginBottom: 14 }}>
          <div className="wb-panel-title"><Waypoints size={18} style={{ color: '#6366F1' }} /> 账户雷达（{filtered.length}）</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>点击任意账户查看关联记录</div>
        </div>
        {filtered.length === 0 ? (
          <Empty description="无匹配账户" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="wb-table">
              <thead>
                <tr>
                  <th>脱敏账号</th>
                  <th>涉及案件</th>
                  <th>记录数</th>
                  <th>接收(估算)</th>
                  <th>转出(估算)</th>
                  <th>余额(估算)</th>
                  <th>冻结</th>
                  <th>判定</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.account} className="wb-hover-row" style={{ cursor: 'pointer' }} onClick={() => setSelected(a)}>
                    <td style={{ fontWeight: 600 }}>{a.masked}</td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {a.caseNames.slice(0, 3).map((c, i) => (
                          <span key={i} className="wb-tag">{c}</span>
                        ))}
                        {a.caseNames.length > 3 && <span className="wb-tag">+{a.caseNames.length - 3}</span>}
                      </div>
                    </td>
                    <td>{a.count}</td>
                    <td>{fmt(a.received)}</td>
                    <td>{fmt(a.transferred)}</td>
                    <td>{fmt(a.balance)}</td>
                    <td>{a.frozenCount > 0 ? <span className="wb-tag danger">{a.frozenCount} 已冻结</span> : (a.partialFrozenCount > 0 ? <span className="wb-tag warn">部分冻结</span> : '—')}</td>
                    <td>
                      {a.isCounterparty
                        ? <span className="wb-tag danger">{a.counterpartyReason}</span>
                        : <span className="wb-tag" style={{ opacity: 0.7 }}>普通账户</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* 关联记录抽屉 */}
      <Drawer
        title={selected ? `关联记录 · ${selected.masked}` : ''}
        placement="right"
        width={460}
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span className="wb-tag" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366F1' }}>涉及 {selected.count} 条记录</span>
              <span className="wb-tag" style={{ background: 'rgba(14,165,233,0.12)', color: '#0EA5E9' }}>跨 {selected.caseCount} 个案件</span>
              {selected.isCounterparty && <span className="wb-tag danger">{selected.counterpartyReason}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {relatedRecords.map((r) => (
                <button key={r.id} className="wb-hover-card" style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                  onClick={() => { const rec = getMassRecordById(r.id); if (rec) setViewRecord(rec); }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{r.moduleName}</span><span>{r.date}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      {/* 复用 CaseDetail 查看记录详情 */}
      {viewRecord && <CaseDetail record={viewRecord} onClose={() => setViewRecord(null)} onOpenRelated={setViewRecord} />}
    </div>
  );
}

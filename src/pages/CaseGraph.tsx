/**
 * 案件关系图谱 — 现代化设计
 * 使用 ECharts 力导向图展示案件-嫌疑人-证据关联
 */
import { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, RefreshCw, Maximize2, Minimize2, Info } from 'lucide-react';
import * as echarts from 'echarts';
import { useAppStore } from '../store/appStore';
import { getMassRecords } from '../store/massStore';
import { MODULE_NAMES } from '../moduleConfig';

interface GraphNode {
  id: string;
  name: string;
  category: number;
  symbolSize: number;
  value: number;
}

interface GraphLink {
  source: string;
  target: string;
}

const CATEGORIES = [
  { name: '案件', itemStyle: { color: '#3B82F6', shadowBlur: 12, shadowColor: 'rgba(59,130,246,0.3)' } },
  { name: '嫌疑人', itemStyle: { color: '#EF4444', shadowBlur: 12, shadowColor: 'rgba(239,68,68,0.3)' } },
  { name: '证据/线索', itemStyle: { color: '#10B981', shadowBlur: 12, shadowColor: 'rgba(16,185,129,0.3)' } },
];

export default function CaseGraph() {
  const darkMode = useAppStore((s) => s.darkMode);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();
  const [searchText, setSearchText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const records = useMemo(() => { void refreshKey; return getMassRecords(); }, [refreshKey]);

  // 构建图谱数据
  const { nodes, links, stats } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const linkSet = new Set<string>();
    const linkList: GraphLink[] = [];
    let caseCount = 0, suspectCount = 0, clueCount = 0;

    const addNode = (id: string, name: string, category: number, size: number) => {
      if (nodeMap.has(id)) {
        const existing = nodeMap.get(id)!;
        existing.value += 1;
        existing.symbolSize = Math.min(existing.symbolSize + 3, 60);
      } else {
        nodeMap.set(id, { id, name, category, symbolSize: size, value: 1 });
        if (category === 0) caseCount++;
        else if (category === 1) suspectCount++;
        else clueCount++;
      }
    };

    const addLink = (source: string, target: string) => {
      const key = `${source}->${target}`;
      if (!linkSet.has(key) && source !== target) {
        linkSet.add(key);
        linkList.push({ source, target });
      }
    };

    for (const rec of records) {
      const data = rec.data || {};
      const caseName = String(data.caseName || '').trim();
      const suspect = String(data.suspect || data.suspectName || '').trim();
      const clueName = String(data.clueName || data.projectName || '').trim();

      if (caseName) {
        const caseId = `case-${caseName}`;
        addNode(caseId, caseName.length > 8 ? caseName.slice(0, 8) + '…' : caseName, 0, 35);
      }
      if (suspect) {
        const suspectId = `suspect-${suspect}`;
        addNode(suspectId, suspect.length > 6 ? suspect.slice(0, 6) + '…' : suspect, 1, 25);
        if (caseName) addLink(`case-${caseName}`, suspectId);
      }
      if (clueName) {
        const clueId = `clue-${clueName}`;
        addNode(clueId, clueName.length > 8 ? clueName.slice(0, 8) + '…' : clueName, 2, 20);
        if (caseName) addLink(`case-${caseName}`, clueId);
      }
    }

    return { nodes: Array.from(nodeMap.values()), links: linkList, stats: { cases: caseCount, suspects: suspectCount, clues: clueCount } };
  }, [records]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;
    const handler = () => chart.resize();
    window.addEventListener('resize', handler);
    return () => { window.removeEventListener('resize', handler); chart.dispose(); };
  }, []);

  // 更新图表
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart) return;

    const isDark = darkMode;
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const bgColor = 'transparent';

    chart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 13 },
        extraCssText: 'backdrop-filter: blur(8px); border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const cat = CATEGORIES[params.data.category];
            return `<div style="margin-bottom:6px;font-weight:600;font-size:14px">${params.name}</div>
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                      <span style="width:8px;height:8px;border-radius:50%;background:${cat?.itemStyle?.color || '#999'}"></span>
                      <span style="font-size:12px;color:${textColor}">${cat?.name || '未知'}</span>
                    </div>
                    <div style="font-size:12px;color:${textColor}">关联 ${params.data.value} 条记录</div>`;
          }
          return '';
        },
      },
      legend: {
        data: CATEGORIES.map(c => c.name),
        bottom: 16,
        textStyle: { color: textColor, fontSize: 12 },
        itemWidth: 12, itemHeight: 12, itemGap: 20,
        icon: 'circle',
      },
      animationDuration: 1200,
      animationEasingUpdate: 'quinticInOut',
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes.map(n => ({
          ...n,
          label: {
            show: true,
            fontSize: 11,
            fontWeight: 500,
            color: isDark ? '#e2e8f0' : '#1e293b',
            distance: 8,
          },
          itemStyle: {
            ...CATEGORIES[n.category]?.itemStyle,
            borderWidth: 2,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
          },
        })),
        links: links.map(l => ({
          ...l,
          lineStyle: {
            color: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)',
            width: 1.5,
            curveness: 0.2,
          },
        })),
        categories: CATEGORIES,
        roam: true,
        draggable: true,
        force: { repulsion: 250, edgeLength: [100, 220], gravity: 0.08 },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 3, color: isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)' },
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.15)' },
        },
        blur: { itemStyle: { opacity: 0.15 }, label: { opacity: 0.3 } },
      }],
    }, true);

    // 搜索高亮
    if (searchText) {
      const matchedIds = new Set(nodes.filter(n => n.name.toLowerCase().includes(searchText.toLowerCase())).map(n => n.id));
      if (matchedIds.size > 0) {
        chart.setOption({
          series: [{ data: nodes.map(n => ({ ...n, itemStyle: { opacity: matchedIds.has(n.id) ? 1 : 0.1 } })) }],
        });
      }
    }
  }, [nodes, links, darkMode, searchText]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 头部 */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex-between">
        <div className="flex items-center gap-3">
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
            <GitBranch size={20} color="#fff" />
          </div>
          <div>
            <div className="text-xl font-bold">案件关系图谱</div>
            <div className="text-sm text-secondary" style={{ marginTop: 2 }}>可视化案件、嫌疑人、证据之间的关联关系</div>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索节点..."
            className="btn btn-ghost"
            style={{ width: 180, textAlign: 'left', paddingLeft: 12 }}
          />
          <button className="btn btn-ghost" onClick={() => setRefreshKey(k => k + 1)} title="刷新">
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-ghost" onClick={() => setIsFullscreen(v => !v)} title="全屏">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <div className="flex gap-3">
        {[
          { label: '案件', value: stats.cases, color: '#3B82F6' },
          { label: '嫌疑人', value: stats.suspects, color: '#EF4444' },
          { label: '证据/线索', value: stats.clues, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 20px', flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}40` }} />
            <div>
              <div className="stat-value" style={{ fontSize: 20, color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 图表容器 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="panel"
        style={{ overflow: 'hidden', transition: 'all 0.3s var(--ease-out)' }}
      >
        {nodes.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <GitBranch size={48} color="var(--color-text-muted)" style={{ marginBottom: 16, opacity: 0.3 }} />
            <div className="text-lg font-semibold" style={{ marginBottom: 8 }}>暂无关联数据</div>
            <div className="text-sm text-muted">录入案件和嫌疑人信息后将自动生成关系图谱</div>
          </div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: isFullscreen ? 'calc(100vh - 300px)' : 520, transition: 'height 0.3s' }} />
        )}
      </motion.div>

      {/* 使用提示 */}
      <div className="flex items-center gap-2 text-sm text-muted" style={{ padding: '0 4px' }}>
        <Info size={14} />
        <span>拖拽节点调整布局 · 滚轮缩放 · 悬停查看关联 · 搜索高亮节点</span>
      </div>
    </div>
  );
}

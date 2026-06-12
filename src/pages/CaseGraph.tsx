/**
 * 案件关系图谱
 * 使用 ECharts 力导向图展示嫌疑人、案件、证据之间的关联关系
 */
import { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
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
  lineStyle: { width: number };
}

const CATEGORIES = [
  { name: '案件', itemStyle: { color: '#2563EB' } },
  { name: '嫌疑人', itemStyle: { color: '#DC2626' } },
  { name: '证据/线索', itemStyle: { color: '#059669' } },
  { name: '模块', itemStyle: { color: '#7C3AED' } },
];

export default function CaseGraph() {
  const darkMode = useAppStore((s) => s.darkMode);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();
  const [searchText, setSearchText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const records = useMemo(() => {
    void refreshKey;
    return getMassRecords();
  }, [refreshKey]);

  // 构建图谱数据
  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const linkSet = new Set<string>();
    const linkList: GraphLink[] = [];

    const addNode = (id: string, name: string, category: number, size: number) => {
      if (nodeMap.has(id)) {
        const existing = nodeMap.get(id)!;
        existing.value += 1;
        existing.symbolSize = Math.min(existing.symbolSize + 2, 60);
      } else {
        nodeMap.set(id, { id, name, category, symbolSize: size, value: 1 });
      }
    };

    const addLink = (source: string, target: string) => {
      const key = `${source}->${target}`;
      if (!linkSet.has(key) && source !== target) {
        linkSet.add(key);
        linkList.push({ source, target, lineStyle: { width: 1 } });
      }
    };

    // 模块节点
    const moduleCounts: Record<string, number> = {};
    for (const r of records) {
      moduleCounts[r.moduleId] = (moduleCounts[r.moduleId] || 0) + 1;
    }
    for (const [mid, count] of Object.entries(moduleCounts)) {
      addNode(`mod-${mid}`, MODULE_NAMES[mid] || mid, 3, Math.min(15 + count * 2, 50));
    }

    // 提取案件和嫌疑人
    for (const rec of records) {
      const data = rec.data || {};
      const caseName = String(data.caseName || '').trim();
      const caseNo = String(data.caseNo || '').trim();
      const suspect = String(data.suspect || data.suspectName || '').trim();

      // 案件节点
      if (caseName) {
        const caseId = `case-${caseName}`;
        addNode(caseId, caseName.length > 10 ? caseName.slice(0, 10) + '…' : caseName, 0, 30);
        addLink(`mod-${rec.moduleId}`, caseId);

        if (caseNo) {
          addLink(caseId, `case-${caseNo}`);
        }
      }

      // 嫌疑人节点
      if (suspect) {
        const suspectId = `suspect-${suspect}`;
        addNode(suspectId, suspect.length > 6 ? suspect.slice(0, 6) + '…' : suspect, 1, 22);
        if (caseName) {
          addLink(`case-${caseName}`, suspectId);
        }
      }

      // 证据/线索
      const clueName = String(data.clueName || data.projectName || '').trim();
      if (clueName) {
        const clueId = `clue-${clueName}`;
        addNode(clueId, clueName.length > 8 ? clueName.slice(0, 8) + '…' : clueName, 2, 18);
        if (caseName) {
          addLink(`case-${caseName}`, clueId);
        }
      }
    }

    return { nodes: Array.from(nodeMap.values()), links: linkList };
  }, [records]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const handler = () => chart.resize();
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      chart.dispose();
    };
  }, []);

  // 更新图表数据
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart) return;

    const textColor = darkMode ? '#8c919a' : '#6B7280';

    chart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: darkMode ? '#1a1d25' : '#fff',
        borderColor: darkMode ? '#374151' : '#E5E7EB',
        textStyle: { color: darkMode ? '#e2e2e6' : '#1F2937', fontSize: 12 },
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return `<b>${params.name}</b><br/>类型: ${CATEGORIES[params.data.category]?.name || '未知'}<br/>关联数: ${params.data.value}`;
          }
          return '';
        },
      },
      legend: {
        data: CATEGORIES.map((c) => c.name),
        bottom: 10,
        textStyle: { color: textColor, fontSize: 11 },
      },
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes.map((n) => ({
          ...n,
          label: {
            show: true,
            fontSize: 10,
            color: darkMode ? '#e2e2e6' : '#1F2937',
          },
        })),
        links: links.map((l) => ({
          ...l,
          lineStyle: {
            ...l.lineStyle,
            color: darkMode ? 'rgba(163, 201, 255, 0.2)' : 'rgba(37, 99, 235, 0.15)',
          },
        })),
        categories: CATEGORIES,
        roam: true,
        draggable: true,
        force: {
          repulsion: 200,
          edgeLength: [80, 200],
          gravity: 0.1,
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 3 },
        },
        blur: {
          itemStyle: { opacity: 0.2 },
        },
      }],
    }, true);

    // 搜索高亮
    if (searchText) {
      const matchedIds = new Set(
        nodes
          .filter((n) => n.name.toLowerCase().includes(searchText.toLowerCase()))
          .map((n) => n.id)
      );
      chart.setOption({
        series: [{
          data: nodes.map((n) => ({
            ...n,
            itemStyle: matchedIds.size > 0 && !matchedIds.has(n.id)
              ? { opacity: 0.15 }
              : undefined,
          })),
        }],
      });
    }
  }, [nodes, links, darkMode, searchText]);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(124,58,237,.24)' }}>
            <GitBranch size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: darkMode ? '#e2e2e6' : '#172033' }}>案件关系图谱</div>
            <div style={{ fontSize: 12, color: darkMode ? '#8c919a' : '#64748B', marginTop: 2 }}>
              展示案件、嫌疑人、证据之间的关联关系 · {nodes.length} 个节点 · {links.length} 条关系
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索节点..."
            style={{
              height: 34, padding: '0 12px', borderRadius: 6, border: `1px solid ${darkMode ? '#374151' : '#D8E1EA'}`,
              background: darkMode ? '#1F2937' : '#fff', color: darkMode ? '#e2e2e6' : '#1F2937',
              fontSize: 13, width: 180, outline: 'none',
            }}
          />
          <button
            onClick={() => { setSearchText(''); setRefreshKey((k) => k + 1); }}
            style={{
              height: 34, padding: '0 12px', borderRadius: 6, border: `1px solid ${darkMode ? '#374151' : '#D8E1EA'}`,
              background: darkMode ? '#1F2937' : '#fff', color: darkMode ? '#e2e2e6' : '#1F2937',
              fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <RotateCcw size={13} /> 刷新
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: darkMode ? 'rgba(28, 31, 38, 0.75)' : '#fff',
          borderRadius: 12,
          border: `1px solid ${darkMode ? 'rgba(163, 201, 255, 0.12)' : '#E5E7EB'}`,
          boxShadow: darkMode ? '0 2px 12px rgba(0,0,0,.25)' : '0 1px 4px rgba(0,0,0,.04)',
          overflow: 'hidden',
        }}
      >
        {nodes.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: darkMode ? '#8c919a' : '#9CA3AF' }}>
            <GitBranch size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>暂无关联数据</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>录入案件和嫌疑人信息后将自动生成关系图谱</div>
          </div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: 600 }} />
        )}
      </motion.div>

      {/* 图例说明 */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
        {CATEGORIES.map((cat) => (
          <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: darkMode ? '#8c919a' : '#6B7280' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.itemStyle.color }} />
            {cat.name}
          </div>
        ))}
      </div>
    </div>
  );
}

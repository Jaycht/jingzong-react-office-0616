import { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { APP_VERSION } from '../version';
import { getMassRecords, type MassRecord } from '../store/massStore';
import { getCases, type SquadCase } from '../store/caseStore';
import { CASE_TYPE_DIST } from '../data';
import { getMockDeadlineAlerts, type SquadCaseDeadlineCheck } from '../utils/caseDeadlineUtils';
import './BigScreen.css';

/* ==================== 数据聚合工具 ==================== */

/** 按 moduleId 分组统计记录数 */
function groupByModule(records: MassRecord[]): { label: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const r of records) {
    map[r.moduleId] = (map[r.moduleId] || 0) + 1;
  }
  // 映射为可读名称
  const moduleNames: Record<string, string> = {
    'squad-coercive': '强制措施',
    'squad-property': '涉案财物',
    'squad-daily': '中队日报',
    'legal-special-action': '专项行动',
    'legal-report-case': '接报案',
    'mass-clue': '线索登记',
    'mass-data': '数据统计',
    'evidence-clue': '证据线索',
  };
  return Object.entries(map)
    .map(([id, value]) => ({ label: moduleNames[id] || id, value }))
    .sort((a, b) => b.value - a.value);
}

/** 按月统计记录数 */
function groupByMonth(records: MassRecord[]): { month: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const r of records) {
    const m = r.createdAt?.slice(0, 7);
    if (m) map[m] = (map[m] || 0) + 1;
  }
  return Object.entries(map)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** 统计强制措施按月/类型分布 */
interface CoerciveStat {
  month: string;
  刑事拘留: number;
  取保候审: number;
  逮捕: number;
  监视居住: number;
  变更措施: number;
}

function groupCoerciveByMonth(records: MassRecord[]): CoerciveStat[] {
  const monthMap: Record<string, CoerciveStat> = {};
  const measureTypes = ['刑事拘留', '取保候审', '逮捕', '监视居住', '变更措施'] as const;

  for (const r of records) {
    const measures = r.data?.coerciveMeasures;
    if (!Array.isArray(measures)) continue;
    const m = r.createdAt?.slice(0, 7);
    if (!m) continue;
    if (!monthMap[m]) {
      monthMap[m] = { month: m, 刑事拘留: 0, 取保候审: 0, 逮捕: 0, 监视居住: 0, 变更措施: 0 };
    }
    for (const item of measures) {
      const type = item.measure as keyof CoerciveStat;
      if (measureTypes.includes(type as any)) {
        (monthMap[m] as any)[type] += 1;
      }
    }
  }

  return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
}

/** 统计本月强制措施各项人数 */
function calcCoerciveThisMonth(records: MassRecord[]) {
  const thisMonth = dayjs().format('YYYY-MM');
  const stats = { 刑事拘留: 0, 取保候审: 0, 逮捕: 0, 监视居住: 0, 变更措施: 0 };
  for (const r of records) {
    if (!r.createdAt?.startsWith(thisMonth)) continue;
    const measures = r.data?.coerciveMeasures;
    if (!Array.isArray(measures)) continue;
    for (const item of measures) {
      const type = item.measure as keyof typeof stats;
      if (type in stats) stats[type] += 1;
    }
  }
  return stats;
}

/** 提取所有记录中的"下一步工作"内容 */
function extractNextSteps(records: MassRecord[], cases: SquadCase[]): { text: string; source: string; time: string }[] {
  const steps: { text: string; source: string; time: string }[] = [];

  // 从记录中的文本字段提取
  const nextStepFields = ['implementation', 'details', 'executeResult', 'supervision', 'risk'];
  for (const r of records) {
    for (const key of nextStepFields) {
      const val = r.data?.[key];
      if (val && typeof val === 'string' && val.trim().length > 5) {
        steps.push({
          text: val.trim().slice(0, 60),
          source: `${r.moduleId} · ${r.tabId}`,
          time: r.createdAt?.slice(0, 10) || '',
        });
      }
    }
  }

  // 从案件中提取
  for (const c of cases) {
    if (c.transferRecord?.trim()) {
      steps.push({
        text: c.transferRecord.trim().slice(0, 60),
        source: c.caseName,
        time: c.updatedAt?.slice(0, 10) || '',
      });
    }
  }

  return steps.slice(0, 15);
}

/* ==================== 数字滚动动画 ==================== */
function useCountUp(target: number, duration = 1500): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

/* ==================== 主组件 ==================== */
export default function BigScreen({ onBack }: { onBack?: () => void }) {
  const [timeStr, setTimeStr] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [alerts] = useState<SquadCaseDeadlineCheck[]>(() => getMockDeadlineAlerts());

  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);
  const chartRef3 = useRef<HTMLDivElement>(null);
  const chartRef4 = useRef<HTMLDivElement>(null);
  const chartRef5 = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // 时钟
  useEffect(() => {
    const tick = () => setTimeStr(dayjs().format('YYYY年M月D日-HH时mm分ss秒'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // 加载中国地图
  useEffect(() => {
    fetch('/china.json')
      .then((r) => r.json())
      .then((geoJson) => {
        echarts.registerMap('china', geoJson as any);
        setMapReady(true);
      })
      .catch(console.error);
  }, []);

  // ===== 实时数据 =====
  const allRecords = useMemo(() => getMassRecords(), []);
  const coerciveRecords = useMemo(() => getMassRecords('squad-coercive'), []);
  const allCases = useMemo(() => getCases(), []);

  const moduleStats = useMemo(() => groupByModule(allRecords), [allRecords]);
  const monthlyStats = useMemo(() => groupByMonth(allRecords), [allRecords]);
  const coerciveStats = useMemo(() => groupCoerciveByMonth(coerciveRecords), [coerciveRecords]);
  const coerciveThisMonth = useMemo(() => calcCoerciveThisMonth(coerciveRecords), [coerciveRecords]);
  const nextSteps = useMemo(() => extractNextSteps(allRecords, allCases), [allRecords, allCases]);

  // ===== Chart 1: 各部门工作量 =====
  useEffect(() => {
    if (!chartRef1.current || moduleStats.length === 0) return;
    const c = echarts.init(chartRef1.current);
    c.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '0%', top: '10px', right: '0%', bottom: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: moduleStats.map((d) => d.label),
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
        axisTick: { show: false },
        axisLabel: { color: 'rgba(255,255,255,.6)', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,.6)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
      },
      series: [{
        type: 'bar',
        data: moduleStats.map((d) => ({
          value: d.value,
          itemStyle: { color: '#2f89cf', barBorderRadius: 5 },
        })),
        barWidth: '35%',
      }],
    });
    const resize = () => c.resize();
    window.addEventListener('resize', resize);
    return () => { c.dispose(); window.removeEventListener('resize', resize); };
  }, [moduleStats]);

  // ===== Chart 2: 月度趋势 =====
  useEffect(() => {
    if (!chartRef2.current || monthlyStats.length === 0) return;
    const c = echarts.init(chartRef2.current);
    c.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', top: '5%', right: '5%', bottom: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: monthlyStats.map((d) => d.month.slice(5)),
        axisLabel: { color: 'rgba(255,255,255,.6)', fontSize: 11 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.2)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,.6)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
      },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: false,
        lineStyle: { color: '#00d887', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0,216,135,0.4)' },
            { offset: 0.8, color: 'rgba(0,216,135,0.1)' },
          ]),
        },
        data: monthlyStats.map((d) => d.count),
      }],
    });
    const resize = () => c.resize();
    window.addEventListener('resize', resize);
    return () => { c.dispose(); window.removeEventListener('resize', resize); };
  }, [monthlyStats]);

  // ===== Chart 3: 强制措施月度趋势折线图 =====
  useEffect(() => {
    if (!chartRef3.current || coerciveStats.length === 0) return;
    const c = echarts.init(chartRef3.current);
    const colors = ['#ff5252', '#f5a623', '#2f89cf', '#27d08a', '#9c27b0'];
    const types = ['刑事拘留', '取保候审', '逮捕', '监视居住', '变更措施'];

    c.setOption({
      tooltip: { trigger: 'axis' },
      legend: {
        data: types,
        textStyle: { color: 'rgba(255,255,255,.5)', fontSize: 11 },
        top: '0%',
      },
      grid: { left: '3%', top: '18%', right: '5%', bottom: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        data: coerciveStats.map((d) => d.month.slice(5)),
        axisLabel: { color: 'rgba(255,255,255,.6)', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.2)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,.6)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
      },
      series: types.map((type, i) => ({
        name: type,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: colors[i], width: 2 },
        data: coerciveStats.map((d) => (d as any)[type] || 0),
      })),
    });
    const resize = () => c.resize();
    window.addEventListener('resize', resize);
    return () => { c.dispose(); window.removeEventListener('resize', resize); };
  }, [coerciveStats]);

  // ===== Chart 4: 案件类型分布饼图 =====
  useEffect(() => {
    if (!chartRef4.current) return;
    const c = echarts.init(chartRef4.current);
    c.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        bottom: '0%', itemWidth: 10, itemHeight: 10,
        data: CASE_TYPE_DIST.map((d) => d.name),
        textStyle: { color: 'rgba(255,255,255,.5)', fontSize: 11 },
      },
      series: [{
        type: 'pie',
        center: ['50%', '42%'],
        radius: ['40%', '60%'],
        color: ['#065aab', '#066eab', '#0682ab', '#0696ab', '#06a0ab', '#06b4ab'],
        label: { show: false },
        labelLine: { show: false },
        data: CASE_TYPE_DIST.map((d) => ({ value: d.value, name: d.name })),
      }],
    });
    const resize = () => c.resize();
    window.addEventListener('resize', resize);
    return () => { c.dispose(); window.removeEventListener('resize', resize); };
  }, []);

  // ===== Chart 5: 罪名分布柱状图 =====
  useEffect(() => {
    if (!chartRef5.current) return;
    const c = echarts.init(chartRef5.current);
    const sorted = [...CASE_TYPE_DIST].sort((a, b) => b.value - a.value).slice(0, 6);
    c.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '0%', top: '10px', right: '0%', bottom: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: sorted.map((d) => d.name),
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
        axisTick: { show: false },
        axisLabel: { color: 'rgba(255,255,255,.6)', fontSize: 10, interval: 0, rotate: 20 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,.6)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
      },
      series: [{
        type: 'bar',
        data: sorted.map((d) => ({ value: d.value, itemStyle: { color: '#2f89cf', barBorderRadius: 5 } })),
        barWidth: '35%',
      }],
    });
    const resize = () => c.resize();
    window.addEventListener('resize', resize);
    return () => { c.dispose(); window.removeEventListener('resize', resize); };
  }, []);

  // ===== 地图 =====
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const c = echarts.init(mapRef.current);
    const provinceData = [
      { name: '北京', value: 79 }, { name: '天津', value: 105 },
      { name: '上海', value: 25 }, { name: '重庆', value: 66 },
      { name: '河北', value: 80 }, { name: '山西', value: 41 },
      { name: '辽宁', value: 50 }, { name: '吉林', value: 56 },
      { name: '黑龙江', value: 63 }, { name: '江苏', value: 50 },
      { name: '浙江', value: 84 }, { name: '安徽', value: 72 },
      { name: '福建', value: 29 }, { name: '江西', value: 54 },
      { name: '山东', value: 65 }, { name: '河南', value: 90 },
      { name: '湖北', value: 127 }, { name: '湖南', value: 60 },
      { name: '广东', value: 38 }, { name: '广西', value: 37 },
      { name: '海南', value: 44 }, { name: '四川', value: 58 },
      { name: '贵州', value: 71 }, { name: '云南', value: 31 },
      { name: '陕西', value: 43 }, { name: '甘肃', value: 99 },
      { name: '青海', value: 57 }, { name: '宁夏', value: 52 },
      { name: '新疆', value: 84 }, { name: '内蒙古', value: 58 },
    ];
    c.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} 件' },
      visualMap: {
        min: 0, max: 150,
        text: ['高', '低'], textStyle: { color: '#fff' },
        inRange: { color: ['#0a2f5a', '#1b5e9b', '#2f89cf', '#5bb8f5', '#a8d8ff'] },
        calculable: true,
      },
      geo: {
        map: 'china',
        label: { show: true, color: '#fff', fontSize: 10 },
        itemStyle: { areaColor: '#0a2f5a', borderColor: '#1a6ea0', borderWidth: 1 },
        emphasis: { itemStyle: { areaColor: '#2f89cf' } },
      },
      series: [{
        name: '案件分布', type: 'map', map: 'china', geoIndex: 0, data: provinceData,
      }],
    });
    const resize = () => c.resize();
    window.addEventListener('resize', resize);
    return () => { c.dispose(); window.removeEventListener('resize', resize); };
  }, [mapReady]);

  // 数字滚动
  const detCount = useCountUp(coerciveThisMonth.刑事拘留, 1000);
  const bailCount = useCountUp(coerciveThisMonth.取保候审, 1000);
  const arrestCount = useCountUp(coerciveThisMonth.逮捕, 1000);
  const survCount = useCountUp(coerciveThisMonth.监视居住, 1000);

  const overdueCount = alerts.filter((a) => a.overallStatus === 'overdue').length;

  return (
    <div className="bigscreen-wrapper">
      {/* ===== 顶部标题 ===== */}
      <div className="bigscreen-head">
        <h1>经侦大队工作记录管理系统 · 数据大屏</h1>
        <div className="head-time">
          {onBack && (
            <span onClick={onBack} style={{
              cursor: 'pointer', marginRight: 16, padding: '2px 12px',
              border: '1px solid rgba(255,255,255,.3)', borderRadius: 4, fontSize: 14,
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#fff'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.3)'; }}
            >← 返回</span>
          )}
          <span id="showTime">{timeStr}</span>
        </div>
      </div>

      {/* ===== 主体 ===== */}
      <div className="bigscreen-main">
        {/* ====== 左侧栏 ====== */}
        <div className="bigscreen-col">
          {/* 各部门工作量 */}
          <div className="bigscreen-box">
            <div className="bigscreen-box-title">各部门工作量</div>
            <div ref={chartRef1} className="bigscreen-chart" />
            <div className="bigscreen-box-foot" />
          </div>

          {/* 月度记录趋势 */}
          <div className="bigscreen-box">
            <div className="bigscreen-box-title">月度记录趋势</div>
            <div ref={chartRef2} className="bigscreen-chart" />
            <div className="bigscreen-box-foot" />
          </div>

          {/* 强制措施月度趋势 */}
          <div className="bigscreen-box">
            <div className="bigscreen-box-title">强制措施月度趋势</div>
            <div ref={chartRef3} className="bigscreen-chart" />
            <div className="bigscreen-box-foot" />
          </div>
        </div>

        {/* ====== 中间栏 ====== */}
        <div className="bigscreen-col-center">
          {/* 核心指标（强制措施） */}
          <div className="bigscreen-bar">
            <div className="bigscreen-bar-box">
              <div className="bigscreen-bar-item">
                <div className="bigscreen-bar-num" style={{ color: '#ff5252' }}>{detCount}</div>
                <div className="bigscreen-bar-label">本月刑事拘留</div>
              </div>
              <div className="bigscreen-bar-item">
                <div className="bigscreen-bar-num" style={{ color: '#f5a623' }}>{bailCount}</div>
                <div className="bigscreen-bar-label">本月取保候审</div>
              </div>
              <div className="bigscreen-bar-item">
                <div className="bigscreen-bar-num" style={{ color: '#2f89cf' }}>{arrestCount}</div>
                <div className="bigscreen-bar-label">本月逮捕</div>
              </div>
              <div className="bigscreen-bar-item">
                <div className="bigscreen-bar-num" style={{ color: '#27d08a' }}>{survCount}</div>
                <div className="bigscreen-bar-label">本月监视居住</div>
              </div>
            </div>
          </div>

          {/* 地图 */}
          <div className="bigscreen-map-area">
            <div className="bigscreen-map-overlay bigscreen-map-ring1">
              <img src="/images/lbx.png" alt="" style={{ width: '100%' }} />
            </div>
            <div className="bigscreen-map-overlay bigscreen-map-ring2">
              <img src="/images/jt.png" alt="" style={{ width: '100%' }} />
            </div>
            <div className="bigscreen-map-overlay bigscreen-map-base">
              <img src="/images/map.png" alt="" style={{ width: '100%' }} />
            </div>
            <div ref={mapRef} className="bigscreen-map-container" />
          </div>

          {/* 罪名分布 */}
          <div className="bigscreen-box">
            <div className="bigscreen-box-title">罪名分布 TOP6</div>
            <div ref={chartRef5} className="bigscreen-chart" />
            <div className="bigscreen-box-foot" />
          </div>
        </div>

        {/* ====== 右侧栏 ====== */}
        <div className="bigscreen-col">
          {/* 超期预警中心 */}
          <div className="bigscreen-box" style={{ flex: '0 0 auto', maxHeight: '40%' }}>
            <div className="bigscreen-box-title">
              超期预警中心
              {overdueCount > 0 && (
                <span style={{
                  display: 'inline-block', marginLeft: 8,
                  padding: '0 8px', background: '#ff5252', color: '#fff',
                  borderRadius: 10, fontSize: 12, lineHeight: '20px',
                }}>
                  {overdueCount} 条超期
                </span>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
              <ul className="bigscreen-alert-list">
                {alerts.map((alert, i) => (
                  <li key={i} className="bigscreen-alert-item">
                    <span className="alert-name">{alert.caseName}</span>
                    <span className={`alert-status alert-status-${alert.overallStatus}`}>
                      {alert.overallStatus === 'overdue' ? `超期${Math.abs(alert.nodes[0]?.daysLeft ?? 0)}天`
                        : alert.overallStatus === 'warning' ? `剩${alert.nodes[0]?.daysLeft ?? '?'}天`
                        : '正常'}
                    </span>
                  </li>
                ))}
                {alerts.length === 0 && (
                  <li style={{ color: 'rgba(255,255,255,.4)', textAlign: 'center', padding: 16 }}>暂无超期预警</li>
                )}
              </ul>
            </div>
            <div className="bigscreen-box-foot" />
          </div>

          {/* 最近工作记录 */}
          <div className="bigscreen-box" style={{ flex: '0 0 auto', maxHeight: '30%' }}>
            <div className="bigscreen-box-title">最近工作记录</div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ul className="bigscreen-alert-list">
                {allRecords.slice(0, 5).map((r, i) => (
                  <li key={i} className="bigscreen-alert-item" style={{ fontSize: 12, textIndent: 0 }}>
                    <span className="alert-name" style={{ textIndent: '0.24rem' }}>
                      {r.moduleId} · {r.tabId}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', flexShrink: 0 }}>
                      {r.createdAt?.slice(5, 10)}
                    </span>
                  </li>
                ))}
                {allRecords.length === 0 && (
                  <li style={{ color: 'rgba(255,255,255,.4)', textAlign: 'center', padding: 16 }}>
                    暂无记录
                  </li>
                )}
              </ul>
            </div>
            <div className="bigscreen-box-foot" />
          </div>

          {/* 下一步工作 */}
          <div className="bigscreen-box" style={{ flex: '0 0 auto', maxHeight: '30%' }}>
            <div className="bigscreen-box-title">下一步工作</div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ul className="bigscreen-alert-list">
                {nextSteps.map((step, i) => (
                  <li key={i} className="bigscreen-alert-item" style={{
                    fontSize: 12, textIndent: 0, flexDirection: 'column',
                    alignItems: 'flex-start', height: 'auto', padding: '6px 10px', lineHeight: 1.4,
                  }}>
                    <span style={{ color: 'rgba(255,255,255,.8)', fontSize: 12 }}>{step.text}</span>
                    <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 10, marginTop: 2 }}>
                      {step.source} · {step.time}
                    </span>
                  </li>
                ))}
                {nextSteps.length === 0 && (
                  <li style={{ color: 'rgba(255,255,255,.4)', textAlign: 'center', padding: 16 }}>
                    暂无下一步工作安排
                  </li>
                )}
              </ul>
            </div>
            <div className="bigscreen-box-foot" />
          </div>
        </div>
      </div>

      {/* ===== 版权 ===== */}
      <div className="bigscreen-copyright">
        经侦大队工作记录管理系统 {APP_VERSION} &nbsp;·&nbsp; 技术支持：陈洪涛
      </div>
    </div>
  );
}

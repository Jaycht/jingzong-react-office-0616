/**
 * 案件时间轴 — 全新设计
 * 选一个案件，按时间顺序展示所有模块的记录
 * 点击记录 → 弹窗查看详情（只展示不跳转）
 */
import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CalendarDays, FileText, Gavel, SearchCheck, Users, Shield, Database, Landmark, BriefcaseBusiness, Eye, X, MapPin, Building2, Hash, User, Briefcase, AlertCircle, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getMassRecords } from '../store/massStore';
import type { MassRecord } from '../store/massStore';
import { getAllCaseNames } from '../store/inputHistoryStore';

/* ===================== 图标映射 ===================== */

const MODULE_ICONS: Record<string, { icon: typeof FileText; color: string; label: string; dept: string }> = {
  'mass-clue': { icon: SearchCheck, color: '#7C3AED', label: '线索登记', dept: '涉众研判' },
  'mass-statistics': { icon: Users, color: '#059669', label: '涉众统计', dept: '涉众研判' },
  'legal-case-ledger': { icon: Scale, color: '#DC2626', label: '案件总台账', dept: '法制室' },
  'squad-daily': { icon: FileText, color: '#2563EB', label: '每日工作记录', dept: '案件中队' },
  'squad-coercive': { icon: Shield, color: '#DC2626', label: '强制措施登记', dept: '案件中队' },
  'squad-case': { icon: BriefcaseBusiness, color: '#0891B2', label: '中队案件管理', dept: '案件中队' },
  'squad-property': { icon: Building2, color: '#D97706', label: '涉案财物管理', dept: '案件中队' },
  'evidence': { icon: SearchCheck, color: '#0891B2', label: '线索核查', dept: '调证分析' },
  'evidence-request': { icon: Database, color: '#0891B2', label: '调证登记', dept: '调证分析' },
  'evidence-freeze': { icon: Database, color: '#059669', label: '资金查控', dept: '调证分析' },
  'evidence-phone-collection': { icon: Database, color: '#0F766E', label: '设备采集', dept: '调证分析' },
  'evidence-report': { icon: SearchCheck, color: '#2563EB', label: '资金分析', dept: '调证分析' },
};

function getModuleMeta(moduleId: string) {
  return MODULE_ICONS[moduleId] || { icon: FileText, color: '#6B7280', label: moduleId, dept: '' };
}

/* ===================== 字段标签映射 ===================== */

const FIELD_LABELS: Record<string, string> = {
  acceptDate: '受理日期', acceptance: '验收情况', acceptedCaseCount: '专项内受理案件数',
  accomplice: '同案人员', accountCount: '涉案账户数', accountNo: '调证账号',
  actualController: '实际控制人', actualDeadline: '实际办结日期', actualLoss: '实际损失金额',
  address: '住址', amount: '报账金额', appeal: '主要诉求', appearance: '体貌特征',
  approvalDate: '审批时间', approver: '审批人', archiveDate: '办结归档日期',
  arrestDate: '逮捕', arrestMethod: '归案方式', arrestedCount: '抓获犯罪嫌疑人数量',
  assetName: '资产名称', assignDate: '交办时间', assignMatter: '交办事项',
  assistOfficer: '协办民警', attachment: '附件材料', bailDate: '取保候审',
  balance: '账户余额', bank: '归属行', bankAccount: '银行账号',
  birthDate: '出生日期', briefCase: '简要案情', briefDescription: '简要说明',
  captureDate: '抓获时间', caseCloseDate: '结案时间', caseFilingDate: '立案时间',
  caseLocation: '案发地', caseName: '经办案件', caseNo: '接报案编号',
  caseSource: '案件来源', caseType: '案件类型', clueName: '交办线索名称',
  collectDate: '采集时间', companyName: '公司名称', compensationPlan: '退赔方案',
  crimeDate: '案发时间', crimeLocation: '案发地', crimeMode: '作案模式',
  criminalDetentionDate: '刑事拘留', currentAddress: '现住址', custodyDate: '羁押时间',
  deadline: '期限届满时间', details: '情况说明', detentionDate: '拘留时间',
  education: '文化程度', emergencyContact: '紧急联系人', executeDate: '执行时间',
  executeResult: '执行情况', expenseCategory: '报账类目', expenseDate: '报账日期',
  filingDate: '立案日期', fundDestination: '资金去向', gender: '性别',
  handler: '经办人', handlingOfficer: '主办民警', hasCriminalRecord: '有无前科',
  holder: '持有人', idNo: '身份证号', incomeModel: '收益模式', isNotified: '是否告知/通知',
  landline: '固定电话', measure: '强制措施类型', notifyDate: '告知/通知时间',
  occupation: '职业', paidAmount: '已兑付金额', penalty: '处罚情况',
  receiveDate: '受理日期', suspect: '嫌疑人', suspectName: '嫌疑人姓名',
  totalInvestment: '投资人总投入本金', totalVictims: '总受害人数',
};

/* ===================== 辅助函数 ===================== */

const SKIP_FIELDS = new Set(['attachment', 'fileList', 'status', 'caseName', 'caseNo', 'title', 'matterName']);
const SECTION_LIST_NAMES = new Set([
  'coerciveMeasures', 'reporters', 'involvedEntities', 'suspects', 'clueSources',
  'involvedSubjects', 'interviewees', 'requestItems', 'enterpriseSubjects',
  'personalSubjects', 'investigationItems', 'fundSources', 'penetrationItems',
  'properties', 'involvedParties',
]);

function recordTitle(rec: MassRecord): string {
  const d = rec.data || {};
  return String(d.caseName || d.suspect || d.reportMatter || d.projectName || d.clueName || d.title || d.matterName || '未命名');
}

function recordDate(rec: MassRecord): string {
  const d = rec.data || {};
  return String(d.collectDate || d.receiveDate || d.filingDate || d.recordDate ||
    d.criminalDetentionDate || d.arrestDate || d.bailDate || d.visitDate || d.createdAt || '').slice(0, 10);
}

/** 格式化日期为中文 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '未知';
  const parts = dateStr.split('-');
  if (parts.length >= 3) return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
  return dateStr;
}

/** 从记录中提取摘要字段 */
function recordSummary(rec: MassRecord): { label: string; value: string }[] {
  const d = rec.data || {};
  const items: { label: string; value: string }[] = [];

  // 普通扁平字段
  for (const [key, raw] of Object.entries(d)) {
    if (SKIP_FIELDS.has(key) || SECTION_LIST_NAMES.has(key)) continue;
    if (raw === null || raw === undefined) continue;
    const str = String(raw).trim();
    if (!str || str === '—' || /^\d{4}-\d{2}-\d{2}T/.test(str)) continue;
    if (Array.isArray(raw) && raw.length === 0) continue;
    if (typeof raw === 'object') continue;
    const label = FIELD_LABELS[key] || key;
    const value = str.length > 20 ? str.slice(0, 20) + '…' : str;
    items.push({ label, value });
  }

  // repeatable section（取第一条）
  for (const listName of SECTION_LIST_NAMES) {
    const arr = d[listName];
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const first = arr[0];
    if (typeof first !== 'object' || !first) continue;
    for (const [key, raw] of Object.entries(first)) {
      if (raw === null || raw === undefined) continue;
      const str = String(raw).trim();
      if (!str || str === '—' || /^\d{4}-\d{2}-\d{2}T/.test(str)) continue;
      if (typeof raw === 'object') continue;
      const label = FIELD_LABELS[key] || key;
      const value = str.length > 20 ? str.slice(0, 20) + '…' : str;
      if (!items.some(i => i.label === label && i.value === value)) {
        items.push({ label, value });
      }
    }
  }

  return items.slice(0, 8);
}

/* ===================== 详情弹窗 ===================== */

interface DetailItem { label: string; value: string; }

function extractAllFields(d: Record<string, unknown>): DetailItem[] {
  const items: DetailItem[] = [];
  
  // 普通字段
  for (const [key, val] of Object.entries(d)) {
    if (SKIP_FIELDS.has(key) || SECTION_LIST_NAMES.has(key)) continue;
    if (val === null || val === undefined) continue;
    const str = String(val).trim();
    if (!str || str === '—' || /^\d{4}-\d{2}-\d{2}T/.test(str)) continue;
    if (Array.isArray(val) && val.length === 0) continue;
    if (typeof val === 'object') {
      // 处理 dayjs-like 对象
      if ((val as any).$d !== undefined || (val as any).$L !== undefined) {
        const d = (val as any).$d;
        if (typeof d === 'string') items.push({ label: FIELD_LABELS[key] || key, value: d });
        else if (d instanceof Date) items.push({ label: FIELD_LABELS[key] || key, value: d.toISOString().slice(0, 10) });
        continue;
      }
      continue;
    }
    const label = FIELD_LABELS[key] || key;
    const value = str.length > 40 ? str.slice(0, 40) + '…' : str;
    items.push({ label, value });
  }

  // repeatable section
  for (const listName of SECTION_LIST_NAMES) {
    const arr = d[listName];
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const sectionLabel = FIELD_LABELS[listName] || listName;
    items.push({ label: sectionLabel, value: `共 ${arr.length} 条` });
    // 显示前 3 条的关键字段
    for (let i = 0; i < Math.min(arr.length, 3); i++) {
      const item = arr[i];
      if (typeof item !== 'object' || !item) continue;
      const subItems: string[] = [];
      for (const [k, v] of Object.entries(item)) {
        if (v === null || v === undefined) continue;
        const str = String(v).trim();
        if (!str || str === '—') continue;
        if (/^\d{4}-\d{2}-\d{2}T/.test(str)) continue;
        if (typeof v === 'object') continue;
        const label = FIELD_LABELS[k] || k;
        subItems.push(`${label}: ${str.length > 15 ? str.slice(0, 15) + '…' : str}`);
      }
      if (subItems.length > 0) {
        items.push({ label: `${sectionLabel} #${i + 1}`, value: subItems.join(' | ') });
      }
    }
    if (arr.length > 3) {
      items.push({ label: '', value: `  ... 还有 ${arr.length - 3} 条` });
    }
  }

  return items;
}

/* ===================== 主组件 ===================== */

export default function CaseTimeline() {
  const darkMode = useAppStore((s) => s.darkMode);
  const showToast = useAppStore((s) => s.showToast);

  const [selectedCase, setSelectedCase] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<MassRecord | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const allCaseNames = useMemo(() => getAllCaseNames(), []);

  const timelineRecords = useMemo(() => {
    if (!selectedCase) return [];
    const all = getMassRecords();
    const kw = selectedCase.toLowerCase();
    const matched = all.filter(r => {
      const d = r.data || {};
      return Object.values(d).some(v => String(v || '').toLowerCase().includes(kw));
    });
    return matched.sort((a, b) => {
      const da = recordDate(a) || a.createdAt;
      const db = recordDate(b) || b.createdAt;
      return da.localeCompare(db);
    });
  }, [selectedCase]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  const bg = darkMode ? '#1a1d25' : '#fff';
  const textColor = darkMode ? '#e2e2e6' : '#1F2937';
  const mutedColor = darkMode ? '#8c919a' : '#9CA3AF';
  const borderColor = darkMode ? 'rgba(66,71,79,0.4)' : '#E5E7EB';
  const cardBg = darkMode ? 'rgba(30,33,40,0.8)' : '#F8FAFC';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
      {/* 头部 */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, padding: '24px 0',
          borderBottom: `2px solid ${darkMode ? '#2a2d35' : '#E5E7EB'}`,
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: 'linear-gradient(135deg, #0F3A5F, #155A8A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(21,90,138,.3)',
        }}>
          <Clock size={24} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: textColor, letterSpacing: '-0.5px' }}>案件时间轴</div>
          <div style={{ fontSize: 13, color: mutedColor, marginTop: 4 }}>按时间顺序追踪案件在所有模块中的办理轨迹</div>
        </div>
      </motion.div>

      {/* 案件选择器 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{
          background: bg, borderRadius: 16,
          border: `1px solid ${borderColor}`,
          padding: '24px', marginBottom: 32,
          boxShadow: darkMode ? '0 4px 16px rgba(0,0,0,.2)' : '0 2px 8px rgba(0,0,0,.06)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: mutedColor, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📂 选择案件
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
          {allCaseNames.length === 0 ? (
            <span style={{ fontSize: 14, color: mutedColor }}>暂无案件数据，请先录入记录</span>
          ) : (
            allCaseNames.map((name) => (
              <motion.button
                key={name}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedCase(name)}
                style={{
                  padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: selectedCase === name
                    ? 'linear-gradient(135deg, #0F3A5F, #155A8A)'
                    : darkMode ? 'rgba(66,71,79,0.25)' : '#F3F4F6',
                  color: selectedCase === name ? '#fff' : textColor,
                  border: selectedCase === name ? 'none' : `1.5px solid ${borderColor}`,
                  transition: 'all .2s',
                  boxShadow: selectedCase === name ? '0 4px 12px rgba(21,90,138,.25)' : 'none',
                }}
              >
                {name}
              </motion.button>
            ))
          )}
        </div>
        {selectedCase && (
          <div style={{ fontSize: 13, color: mutedColor, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            找到 <strong style={{ color: textColor }}>{timelineRecords.length}</strong> 条相关记录
          </div>
        )}
      </motion.div>

      {/* 时间轴 */}
      {selectedCase && (
        <div style={{ position: 'relative' }}>
          {/* 中心竖线 */}
          <div style={{
            position: 'absolute', left: 31, top: 0, bottom: 0, width: 3,
            background: `linear-gradient(to bottom, ${darkMode ? '#4B9EFF' : '#2563EB'}, ${darkMode ? '#1a3a5c' : '#D8E1EA'})`,
            borderRadius: 2,
          }} />

          {timelineRecords.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: mutedColor }}>
              <AlertCircle size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>该案件暂无匹配记录</div>
            </div>
          ) : (
            timelineRecords.map((rec, i) => {
              const meta = getModuleMeta(rec.moduleId);
              const Icon = meta.icon;
              const date = recordDate(rec) || rec.createdAt?.slice(0, 10) || '日期未知';
              const title = recordTitle(rec);
              const summary = recordSummary(rec);
              const isExpanded = expandedSections.has(rec.id);

              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  style={{
                    position: 'relative',
                    marginBottom: 20,
                    paddingLeft: 60,
                  }}
                >
                  {/* 时间轴节点 */}
                  <div style={{
                    position: 'absolute', left: 16, top: 24,
                    width: 28, height: 28, borderRadius: '50%',
                    background: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 0 4px ${darkMode ? '#1a1d25' : '#F0F2F5'}, 0 0 0 1px ${meta.color}`,
                    zIndex: 2,
                  }}>
                    <Icon size={14} color="#fff" />
                  </div>

                  {/* 卡片 */}
                  <motion.div
                    whileHover={{ y: -1, boxShadow: `0 8px 24px ${darkMode ? 'rgba(46,125,202,0.15)' : 'rgba(37,99,235,0.1)'}` }}
                    onClick={() => setSelectedRecord(rec)}
                    style={{
                      borderRadius: 14,
                      background: bg,
                      border: `1px solid ${borderColor}`,
                      padding: '16px 20px',
                      cursor: 'pointer',
                      transition: 'all .2s',
                    }}
                  >
                    {/* 顶部：部门 + 日期 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 6,
                        background: `${meta.color}18`,
                        color: meta.color,
                      }}>
                        {meta.dept} · {meta.label}
                      </span>
                      <span style={{
                        fontSize: 12, color: mutedColor,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <CalendarDays size={12} />
                        {formatDate(date)}
                      </span>
                      <span style={{ fontSize: 11, color: mutedColor, marginLeft: 'auto' }}>
                        #{i + 1}
                      </span>
                    </div>

                    {/* 标题 */}
                    <div style={{ fontSize: 16, fontWeight: 700, color: textColor, marginBottom: 8 }}>
                      {title}
                    </div>

                    {/* 摘要 */}
                    {summary.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                        {summary.map((s, si) => (
                          <span key={si} style={{ fontSize: 12, color: mutedColor }}>
                            <span style={{ color: darkMode ? '#8c919a' : '#9CA3AF', marginRight: 2 }}>{s.label}:</span>
                            <span style={{ color: textColor, fontWeight: 500 }}>{s.value}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 底部提示 */}
                    <div style={{
                      marginTop: 10, fontSize: 11, color: mutedColor,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Eye size={11} /> 点击查看详情
                    </div>
                  </motion.div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* 未选择案件 */}
      {!selectedCase && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: mutedColor }}>
          <Clock size={48} style={{ opacity: 0.25, marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>请选择一个案件</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>系统将自动汇总该案件在所有模块中的办理记录</div>
        </div>
      )}

      {/* 详情弹窗 */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedRecord(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: darkMode ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 700, maxHeight: '85vh',
                background: darkMode ? '#1a1d25' : '#fff',
                borderRadius: 20,
                border: `1px solid ${darkMode ? '#2a2d35' : '#E5E7EB'}`,
                boxShadow: '0 24px 48px rgba(0,0,0,.2)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* 弹窗头部 */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: textColor }}>
                    {recordTitle(selectedRecord)}
                  </div>
                  <div style={{ fontSize: 12, color: mutedColor, marginTop: 4 }}>
                    {getModuleMeta(selectedRecord.moduleId).dept} · {getModuleMeta(selectedRecord.moduleId).label}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    background: 'transparent',
                    color: mutedColor,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = mutedColor; }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* 弹窗内容 */}
              <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
                {/* 基本信息 */}
                <div style={{ fontSize: 12, fontWeight: 700, color: mutedColor, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📋 基本信息
                </div>
                
                {extractAllFields(selectedRecord.data || {}).map((item, i) => {
                  if (!item.label) {
                    // 省略提示
                    return (
                      <div key={i} style={{ fontSize: 12, color: mutedColor, padding: '6px 0' }}>
                        {item.value}
                      </div>
                    );
                  }
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 12, padding: '8px 0',
                      borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                    }}>
                      <div style={{
                        fontSize: 12, color: mutedColor, width: 120, flexShrink: 0,
                        fontWeight: 600,
                      }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 13, color: textColor, wordBreak: 'break-word' }}>
                        {item.value}
                      </div>
                    </div>
                  );
                })}

                {/* 底部 */}
                <div style={{
                  marginTop: 20, padding: '12px 16px', borderRadius: 10,
                  background: darkMode ? 'rgba(66,71,79,0.2)' : '#F9FAFB',
                  border: `1px solid ${borderColor}`,
                  fontSize: 11, color: mutedColor,
                }}>
                  <div>创建时间: {new Date(selectedRecord.createdAt).toLocaleString('zh-CN')}</div>
                  <div>更新时间: {new Date(selectedRecord.updatedAt).toLocaleString('zh-CN')}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

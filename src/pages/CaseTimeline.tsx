/**
 * 案件时间轴
 * 选一个案件名称，按时间线纵向展示该案件在所有模块中的记录
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft, CalendarDays, FileText, Gavel, SearchCheck, Users, Shield, Database, Landmark, BriefcaseBusiness, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getMassRecords } from '../store/massStore';
import type { MassRecord } from '../store/massStore';
import { getAllCaseNames } from '../store/inputHistoryStore';

/** 字段中文标签映射 */
const FIELD_LABELS: Record<string, string> = {
  caseName: '案件名称', caseNo: '案件编号',
  suspect: '嫌疑人', suspectName: '嫌疑人姓名',
  suspectIdNo: '身份证号', suspectPhone: '手机号',
  holder: '持有人', holderIdentity: '持有人身份',
  idNo: '身份证号', phone: '手机号',
  measure: '强制措施类型', executeDate: '执行时间',
  deadline: '期限', executeResult: '执行情况',
  leadOfficer: '主办民警', assistOfficer: '协办民警',
  handler: '经办人', approver: '审批人',
  receiveDate: '受案时间', filingDate: '立案时间',
  caseType: '案件类型', caseSource: '案件来源',
  caseStage: '案件阶段',
  totalAmount: '涉案金额', recoveredAmount: '挽损',
  actualLoss: '实际损失',
  deviceType: '设备类型', deviceBrand: '品牌',
  deviceModel: '型号', collectContent: '采集内容',
  reportMatter: '接报事项', projectName: '项目名称',
  clueName: '线索名称',
  propertyName: '财物名称',
  filingDocNo: '文书号',
  amount: '金额',
  inquiryRecord: '询问', interrogationRecord: '讯问',
  reception: '接待', evidenceObtained: '调证',
  fundFlowAnalysis: '资金流水', documentPreparation: '文书',
  police: '民警',
  nextDayPlan: '次日计划',
  executeResult: '执行情况',
  isNotified: '是否告知', notifyDate: '告知时间',
  approvalDate: '审批时间',
  criminalDetentionDate: '刑拘日期',
  arrestDate: '逮捕日期', bailDate: '取保日期',
  caseSummary: '案情摘要',
  reportAppeal: '报案诉求',
  // 经费保障模块
  expenseCategory: '报账类目',
  traveler: '出差人',
  fundCategory: '经费类目',
  expenseDate: '报账日期',
  reimburseStatus: '报销状态',
  partyMember: '党员姓名',
  period: '缴纳月份',
  payMethod: '缴纳方式',
  publicity: '公示情况',
  contactObject: '往来对象',
  matterDate: '发生时间',
  reason: '往来事由',
  standard: '执行标准',
  participants: '相关人员',
  benefitName: '福利名称',
  grantDate: '发放时间',
  recipients: '发放名单',
  signStatus: '领取签字',
  itemName: '物资名称',
  spec: '规格型号',
  quantity: '数量',
  unitPrice: '单价',
  supplier: '供应商',
  acceptance: '验收情况',
  assetName: '资产名称',
  assetNo: '资产编号',
  actionType: '登记类型',
  responsiblePerson: '责任人',
  actionDate: '发生日期',
};

const MODULE_META: Record<string, { label: string; dept: string; icon: React.ComponentType<{ size?: number; color?: string }>; color: string }> = {
  'office-finance-assets': { label: '经费保障', dept: '大队办公室', icon: Landmark, color: '#6D28D9' },
  'office-party-attendance': { label: '党建考勤', dept: '大队办公室', icon: Landmark, color: '#6D28D9' },
  'office-doc-report': { label: '文件报表', dept: '大队办公室', icon: Landmark, color: '#6D28D9' },
  'office-cluster': { label: '集群协查', dept: '大队办公室', icon: Landmark, color: '#6D28D9' },
  'mass-clue': { label: '涉众线索', dept: '涉众办', icon: Users, color: '#2563EB' },
  'mass-statistics': { label: '涉众统计', dept: '涉众办', icon: Users, color: '#2563EB' },
  'mass-petition': { label: '信访反馈', dept: '涉众办', icon: Users, color: '#2563EB' },
  'mass-interview': { label: '约谈管理', dept: '涉众办', icon: Users, color: '#2563EB' },
  'legal-report-case': { label: '接报案', dept: '法制室', icon: Gavel, color: '#D97706' },
  'legal-case-ledger': { label: '案件台账', dept: '法制室', icon: Gavel, color: '#D97706' },
  'legal-special-action': { label: '专项行动', dept: '法制室', icon: Gavel, color: '#D97706' },
  'squad-case': { label: '中队案件', dept: '案件中队', icon: BriefcaseBusiness, color: '#7C3AED' },
  'squad-daily': { label: '中队日报', dept: '案件中队', icon: BriefcaseBusiness, color: '#7C3AED' },
  'squad-coercive': { label: '强制措施', dept: '案件中队', icon: Shield, color: '#DC2626' },
  'squad-property': { label: '涉案财物', dept: '案件中队', icon: BriefcaseBusiness, color: '#7C3AED' },
  'evidence-clue': { label: '线索登记', dept: '调证分析', icon: SearchCheck, color: '#2563EB' },
  'evidence-request': { label: '调证登记', dept: '调证分析', icon: SearchCheck, color: '#0891B2' },
  'evidence-freeze': { label: '资金查控', dept: '调证分析', icon: Database, color: '#059669' },
  'evidence-phone-collection': { label: '设备采集', dept: '调证分析', icon: Database, color: '#0F766E' },
  'evidence-report': { label: '资金分析', dept: '调证分析', icon: SearchCheck, color: '#2563EB' },
};

/** 从记录中提取最佳展示标题 */
function recordTitle(rec: MassRecord): string {
  const d = rec.data || {};
  return String(d.caseName || d.suspect || d.reportMatter || d.projectName || d.clueName || d.title || d.matterName || '未命名');
}

/** 跳过不展示的字段名 */
const SKIP_FIELDS = new Set([
  'attachment', 'fileList', 'status',
  'caseName', 'caseNo', 'title', 'matterName',
]);

/** 提取记录的关键信息摘要：动态扫描所有字段，用标签映射取值 */
function recordSummary(rec: MassRecord): { label: string; value: string }[] {
  const d = rec.data || {};
  const items: { label: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(d)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (raw === null || raw === undefined) continue;
    const str = String(raw).trim();
    if (!str || str === '—') continue;
    // 跳过 ISO 日期长字符串（已在 recordDate 中展示）
    if (/^\d{4}-\d{2}-\d{2}T/.test(str)) continue;
    // 跳过空数组
    if (Array.isArray(raw) && raw.length === 0) continue;
    // 跳过对象
    if (typeof raw === 'object') continue;
    const label = FIELD_LABELS[key] || key;
    const value = str.length > 30 ? str.slice(0, 30) + '…' : str;
    items.push({ label, value });
  }
  return items.slice(0, 8);
}

/** 获取记录的最佳时间戳 */
function recordDate(rec: MassRecord): string {
  const d = rec.data || {};
  return String(d.collectDate || d.receiveDate || d.filingDate || d.recordDate || d.criminalDetentionDate || d.arrestDate || d.bailDate || d.visitDate || d.createdAt || '').slice(0, 10);
}

export default function CaseTimeline() {
  const darkMode = useAppStore((s) => s.darkMode);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const openModal = useAppStore((s) => s.openModal);
  const setEditRecord = useAppStore((s) => s.setEditRecord);
  const currentPage = useAppStore((s) => s.currentPage);

  const [selectedCase, setSelectedCase] = useState<string>('');

  const allCaseNames = useMemo(() => getAllCaseNames(), []);

  const timelineRecords = useMemo(() => {
    if (!selectedCase) return [];
    const all = getMassRecords();
    const kw = selectedCase.toLowerCase();
    const matched = all.filter((r) => {
      const d = r.data || {};
      return Object.values(d).some((v) => String(v || '').toLowerCase().includes(kw));
    });
    // 按日期排序
    return matched.sort((a, b) => {
      const da = recordDate(a) || a.createdAt;
      const db = recordDate(b) || b.createdAt;
      return da.localeCompare(db);
    });
  }, [selectedCase]);

  const handleNavigate = (record: MassRecord) => {
    setEditRecord(record);
    setCurrentPage(record.moduleId);
    openModal('newRecord');
  };

  const bg = darkMode ? '#1a1d25' : '#fff';
  const textColor = darkMode ? '#e2e2e6' : '#1F2937';
  const mutedColor = darkMode ? '#8c919a' : '#9CA3AF';
  const borderColor = darkMode ? 'rgba(66,71,79,0.4)' : '#E5E7EB';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* 头部 */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'linear-gradient(135deg, #0F3A5F, #155A8A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(21,90,138,.25)',
        }}>
          <Clock size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: textColor }}>案件时间轴</div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>选择案件，查看完整办理时间线</div>
        </div>
      </motion.div>

      {/* 案件选择器 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{
          background: bg, borderRadius: 12,
          border: `1px solid ${borderColor}`,
          padding: '18px 20px', marginBottom: 24,
          boxShadow: darkMode ? '0 2px 12px rgba(0,0,0,.25)' : '0 1px 4px rgba(0,0,0,.04)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: mutedColor, marginBottom: 8 }}>选择案件</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allCaseNames.length === 0 ? (
            <span style={{ fontSize: 13, color: mutedColor }}>暂无案件数据，请先录入记录</span>
          ) : (
            allCaseNames.map((name) => (
              <motion.div
                key={name}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedCase(name)}
                style={{
                  padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                  fontSize: 13, fontWeight: 500,
                  background: selectedCase === name
                    ? 'linear-gradient(135deg, #155A8A, #1B7AB5)'
                    : darkMode ? 'rgba(66,71,79,0.3)' : '#F3F4F6',
                  color: selectedCase === name ? '#fff' : textColor,
                  border: selectedCase === name ? 'none' : `1px solid ${borderColor}`,
                  transition: 'all .15s',
                }}
              >
                {name}
              </motion.div>
            ))
          )}
        </div>
        {selectedCase && (
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 10 }}>
            找到 {timelineRecords.length} 条相关记录
          </div>
        )}
      </motion.div>

      {/* 时间轴 */}
      {selectedCase && (
        <div style={{ position: 'relative', paddingLeft: 40 }}>
          {/* 中心竖线 */}
          <div style={{
            position: 'absolute', left: 19, top: 0, bottom: 0, width: 2,
            background: `linear-gradient(to bottom, ${darkMode ? '#4B9EFF' : '#2563EB'}, ${darkMode ? '#1a3a5c' : '#D8E1EA'})`,
            borderRadius: 1,
          }} />

          {timelineRecords.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: mutedColor, fontSize: 13 }}>
              该案件暂无匹配记录
            </div>
          ) : (
            timelineRecords.map((rec, i) => {
              const meta = MODULE_META[rec.moduleId] || { label: rec.moduleId, dept: '', icon: FileText, color: '#6B7280' };
              const Icon = meta.icon;
              const date = recordDate(rec) || rec.createdAt?.slice(0, 10) || '日期未知';
              const title = recordTitle(rec);
              const summary = recordSummary(rec);

              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleNavigate(rec)}
                  style={{
                    position: 'relative',
                    marginBottom: 16,
                    cursor: 'pointer',
                    padding: '14px 18px',
                    borderRadius: 10,
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,.15)' : '0 1px 3px rgba(0,0,0,.04)',
                    transition: 'all .2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 4px 16px ${darkMode ? 'rgba(46,125,202,0.15)' : 'rgba(37,99,235,0.1)'}`;
                    e.currentTarget.style.borderColor = meta.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = darkMode ? '0 2px 8px rgba(0,0,0,.15)' : '0 1px 3px rgba(0,0,0,.04)';
                    e.currentTarget.style.borderColor = borderColor;
                  }}
                >
                  {/* 时间轴节点 */}
                  <div style={{
                    position: 'absolute', left: -31, top: 18,
                    width: 14, height: 14, borderRadius: '50%',
                    background: meta.color,
                    border: `3px solid ${darkMode ? '#1a1d25' : '#F0F2F5'}`,
                    boxShadow: `0 0 0 2px ${meta.color}44`,
                    zIndex: 1,
                  }} />

                  {/* 内容 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: `${meta.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 4,
                          background: `${meta.color}15`,
                          color: meta.color,
                        }}>
                          {meta.dept} · {meta.label}
                        </span>
                        <span style={{
                          fontSize: 11, color: mutedColor,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <CalendarDays size={11} />
                          {date}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: textColor, marginBottom: 4 }}>
                        {title}
                      </div>
                      {summary.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                          {summary.map((s, si) => (
                            <span key={si} style={{ fontSize: 11.5, color: mutedColor }}>
                              <span style={{ color: darkMode ? '#8c919a' : '#9CA3AF' }}>{s.label}: </span>
                              <span style={{ color: textColor, fontWeight: 500 }}>{s.value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={14} color={mutedColor} style={{ flexShrink: 0, marginTop: 10 }} />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* 底部提示 */}
      {!selectedCase && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: mutedColor }}>
          <Clock size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 14 }}>请从上方选择一个案件</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>系统将自动汇总该案件在所有模块中的办理记录</div>
        </div>
      )}
    </div>
  );
}

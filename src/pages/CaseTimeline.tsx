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

/** 字段中文标签映射（自动生成，覆盖全部字段） */
const FIELD_LABELS: Record<string, string> = {
  acceptDate: '受理日期', acceptance: '验收情况', acceptedCaseCount: '专项内受理案件数',
  accountCount: '涉案账户数', accountNo: '调证账号', achievementHighlight: '战果亮点',
  actionDate: '发生日期', actionName: '专项行动名称', actionType: '登记类型',
  actualController: '实际控制人', actualDeadline: '实际办结日期', actualLoss: '实际损失',
  actualLossAmount: '实际损失总金额', address: '住址', amount: '金额',
  appeal: '主要诉求', approvalDate: '审批时间', approver: '审批人',
  archiveDate: '办结归档日期', archiveStatus: '案卷归档情况', arrestApproved: '逮捕人数',
  arrestCount: '逮捕', arrestDate: '逮捕日期', arrestedCount: '抓获数量',
  arrestedTotal: '抓获总数', assetName: '资产名称', assetNo: '资产编号',
  assetProgress: '资产处置进度', assignDate: '交办时间', assignedUnit: '主办单位',
  assigner: '交办人', assignMatter: '交办事项', assistOfficer: '协办民警',
  attachConclusion: '附件(分析结论)', attachOutflow: '附件(资金去向)', attachOutflowStats: '附件(流出分类)',
  attachSources: '附件(资金来源)', bailCount: '取保', bailDate: '取保日期',
  balance: '账户余额', bank: '开户行', bankAccount: '银行账户',
  bankCard: '银行卡', battleName: '战役名称', battleNo: '战役编号',
  battleType: '战役类型', benefitName: '福利名称', briefCase: '简要案情',
  briefDescription: '简要说明', businessAddress: '实际经营地址', caseCloseDate: '结案时间',
  caseFilingDate: '立案时间', caseLocation: '案发地', caseName: '案件名称',
  caseNo: '案件编号', caseSource: '案件来源', caseStage: '案件阶段',
  caseStatus: '结案/未结案', caseSummary: '简要案情', caseType: '案件类型',
  checkedClueCount: '核查办结线索数', closedClues: '当日办结线索', clueCheck: '线索核查',
  clueDetail: '线索详情', clueName: '线索名称', coerciveMeasuresResult: '采取强制措施情况',
  coerciveReview: '强制措施审核', collectContent: '采集内容', collectDate: '采集时间',
  collectivePetitionBatch: '集体访批次', companions: '陪同人员', companyAccount: '公司账户',
  companyName: '公司名称', compensatedAmount: '退赔金额', compensatedCount: '已退赔人数',
  compensationBatch: '退赔批次', compensationPlan: '退赔方案', conclusionCaseSupport: '案件定性支撑',
  conclusionDeepClue: '待深挖线索', conclusionFlow: '资金流向总结', conclusionNextStep: '下一步工作',
  confiscatedValue: '扣押财物价值', confiscationInfo: '扣押情况', contactObject: '往来对象',
  controllerCount: '实际控制人数量', controlMeasures: '采取稳控措施', cooperateDept: '配合部门',
  cooperateUnit: '协助单位', counterpartyAccount: '对方收款账户', courtJudgmentDate: '法院判决',
  creditCode: '信用代码', crimeDate: '案发时间', crimeDuration: '作案周期',
  crimeForm: '作案形式', crimeLocation: '案发地', crimeMode: '作案模式',
  criminalDetention: '刑拘人数', criminalDetentionCount: '刑拘', criminalDetentionDate: '刑拘日期',
  crossBorder: '跨境转移', crossBorderTransfer: '转移境外/虚拟币', crossRegion: '跨区域情况',
  custodian: '保管人', customOutflow: '用户自定义', dailyExpenses: '日常开销',
  deadline: '期限', deliveredToUnit: '是否交付协办', deliveryStatus: '交付情况',
  deployDate: '部署时间', details: '具体内容', deviceBrand: '设备品牌',
  deviceModel: '具体型号', deviceType: '设备类型', difficultProblems: '难点问题',
  disposalOpinion: '处置意见', distribution: '分发情况', docNo: '文号',
  documentPreparation: '制作文书', dutyDivision: '责任分工', endDate: '结束时间',
  enforcementDefect: '执法瑕疵', enterprise: '涉案企业', enterpriseCheckCount: '企业排查数',
  estimatedUnregistered: '未登记预估人数', evidenceCount: '收集证据数', evidenceDetail: '证据说明',
  evidenceMaterial: '证据材料', evidenceObtained: '调取证据', evidenceReview: '取证合规审核',
  executeAmount: '执行金额', executeDate: '执行时间', executeResult: '执行情况',
  existingShortcomings: '存在短板', expenseCategory: '报账类目', expenseDate: '报账日期',
  expireDate: '到期时间', fakeInvestment: '虚假项目投资', feedback: '反馈情况',
  feedbackCount: '反馈次数', feedbackDate: '反馈日期', feedbackFail: '反馈失败数',
  feedbackMethod: '反馈方式', feedbackResult: '反馈结果', feedbackStatus: '是否反馈',
  feedbackSuccess: '反馈成功数', filedCaseCount: '立案案件数', filingDate: '立案日期',
  filingDocNo: '受/立案文书号', filingReviewOpinion: '立案审核意见', filingStandardization: '立案规范化检查',
  fixedAssets: '购置固定资产', followUpOfficer: '负责稳控民警', freezeAmount: '冻结/解冻金额',
  freezeDate: '冻结/解冻时间', frozenAssetValue: '冻结资产价值', frozenFunds: '冻结资金',
  fugitiveCount: '在逃数', fundAccount: '资金账号', fundAccountDetail: '收款账户信息',
  fundAccountType: '收款账户类型', fundCategory: '经费类目', fundDestination: '资金去向',
  fundFlowAnalysis: '梳理资金流水', fundFlowFeature: '资金流转特征', fundLink: '资金链路',
  fundTransferMethod: '转账方式', fundUpstream: '资金上游', gangLevels: '团伙层级',
  gender: '性别', grantDate: '发放时间', groupRisk: '群体性风险',
  handler: '经办人', handlerPolice: '承办民警', handlingOfficer: '经办民警',
  handlingSquad: '办案中队', handlingUnit: '办案单位', hasExtremeSpeech: '有无极端言论',
  holder: '持有人', holderIdentity: '持有人身份', homeAddress: '家庭地址',
  idNo: '身份证号', implementation: '落实情况', incomeModel: '盈利模式',
  initiator: '行动发起单位', inquiryRecord: '询问笔录', interrogationRecord: '讯问笔录',
  interviewContent: '约谈主要内容', interviewDate: '约谈日期', intervieweeAddress: '现住址',
  intervieweeAge: '年龄', intervieweeAttitude: '对约谈态度', intervieweeGender: '性别',
  intervieweeIdentity: '身份', intervieweeIdNo: '身份证号', intervieweeName: '被约谈人',
  intervieweePhone: '联系电话', interviewForm: '约谈方式', interviewingOfficer: '约谈人',
  interviewMatter: '约谈事项', interviewNo: '约谈编号', interviewPlace: '约谈地点',
  interviewReason: '约谈事由', interviewTime: '约谈时间', investEndDate: '侦查终结',
  investigateAccount: '调证账号', investigateCount: '调证数量', investigatePlatform: '调证平台',
  investigationMeasures: '调查处置措施', investmentAmount: '投资金额', investmentDate: '投资时间',
  involvedCompanyCount: '涉案公司数量', involvedEntity: '涉案主体', involvedLawsuit: '涉法涉诉',
  involvedPhone: '联系电话', involvedPropertyMgmt: '涉案财物管理', involvedRegion: '涉案地域',
  involvedScale: '涉众规模', isAccepted: '是否受理', isElderly: '是否老年人',
  isEmotional: '是否情绪激动', isHardship: '是否困难人员', isNotified: '是否告知',
  issueDate: '下发日期', isVictim: '是否本案受害人', itemName: '物资名称',
  keyPersonCheckCount: '重点人排查数', keyPersonControl: '重点人员稳控', keyPersonnelControl: '重点人员稳控情况',
  largeLossCount: '大额损失人数', lawEnforcementDefects: '执法瑕疵整改', leadDept: '牵头部门',
  leadOfficer: '主办民警', ledgerInfo: '台账建立', legalCoordination: '法制对接',
  legalDeadline: '法定期限', legalRep: '法定代表人', legalReviewCaseCount: '法制审核案件数',
  legalReviewer: '法制审核人', localVictimCount: '本地受害人数', mainAppeal: '信访主要诉求',
  mainStructure: '主要架构', massCase: '是否涉众案件', massCategory: '涉众类别',
  massScale: '涉众规模', massType: '是否涉众型', materialCompleteness: '材料完备情况',
  matterDate: '发生时间', matterName: '事项名称', measure: '强制措施类型',
  meetingDate: '时间', meetingInfo: '动员会议情况', meetingName: '会议名称',
  moneyTransfer: '资金转移/洗白', nextDayPlan: '次日计划', nextFollowUpDate: '下次回访日期',
  nextInvestDirection: '下一步侦查方向', nextSteps: '下一步措施', node: '流程节点',
  nodeDate: '节点时间', noFileCaseInfo: '不予立案情况', noFilingDate: '不予立案日期',
  noFilingReason: '不予立案理由', notifyDate: '告知时间', operatingCosts: '运营成本',
  operationMode: '运营模式', otherAssets: '其他资产', otherOutflow: '其他',
  otherWork: '其他工作', outsideVictimCount: '外地受害人数', overseasCapture: '境外抓捕人数',
  paidAmount: '已兑付金额', participants: '相关人员', participantsCount: '参与人数',
  participateDate: '参与时间', partyMember: '党员姓名', payMethod: '缴纳方式',
  penetrationAccount: '账户名称', penetrationAttr: '账户属性', penetrationBalance: '账户余额',
  penetrationFrozen: '账户冻结状态', penetrationLevel: '层级', penetrationReceived: '接收资金总额',
  penetrationTransferred: '转出资金总额', penetrationType: '账户类型', period: '缴纳月份',
  person: '涉案个人', personalBalance: '账户余额', personalBank: '归属行',
  personalWaste: '嫌疑人个人挥霍', petitionCount: '信访件数', petitionerAge: '年龄',
  petitionerName: '信访人', petitionerPhone: '联系电话', petitionerRegisteredAddress: '户籍地',
  petitionerResidence: '现住地', petitionMatter: '信访事项', petitionNature: '信访性质',
  petitionNo: '信访编号', petitionResolve: '信访问题化解', petitionRiskInfo: '信访隐患排查',
  phone: '手机号', place: '地点', planInfo: '制定方案',
  platform: '调证平台', preliminaryDetail: '初查意见说明', preliminaryOpinion: '初查意见',
  preliminaryReviewOpinion: '初查审核意见', preProsecutionReview: '移送起诉前审核', problemRectification: '问题整改',
  procuratorateProsecuteDate: '检察院起诉', procuratorateReturnDate: '检察院退查', progress: '当前进展',
  progressNote: '进度说明', progressStatus: '办理进度', projectCategory: '项目类别',
  projectName: '项目名称', promisedReturns: '承诺收益', promisedReturnsDetail: '承诺收益说明',
  promotionMethod: '宣传方式', propertyName: '财物名称', prosecutedCount: '移送起诉人数',
  prosecutionCount: '移送起诉', prosecutionDate: '移送起诉日期', publicity: '公示情况',
  publicityDate: '宣传日期', publicityForm: '宣传形式', publicityType: '宣传类型',
  publicityWork: '宣传工作', publicOpinionRisk: '舆情风险', publishLevel: '发布层级',
  publishPlatform: '发布平台', quantity: '数量', readCount: '阅读/播放量',
  reason: '往来事由', receiveDate: '受案日期', receivingOfficer: '接报民警',
  reception: '接待报案/信访', receptionCount: '接访次数', receptionMethod: '接访方式',
  recipients: '发放名单', recordDate: '记录日期', recorder: '记录人',
  recoveredAmount: '挽损金额', recoveryRate: '挽损率', rectificationCount: '整改数',
  rectificationStatus: '整改落实情况', registerDate: '登记日期', registeredVictims: '已登记受害人数',
  reimburseStatus: '报销状态', rejectReason: '不予受理理由', relatedCaseName: '关联案件名称',
  relatedCaseNo: '关联案件编号', relatedPeople: '相关人员', remarks: '备注',
  repeatPetitionCount: '重复访次数', reportAppeal: '报案诉求', reporterAddress: '现住址',
  reporterBirth: '出生日期', reporterConfidential: '是否保密', reporterCooperate: '是否配合',
  reporterGender: '性别', reporterIdentity: '身份', reporterIdNo: '身份证号',
  reporterName: '报案人', reporterPhone: '联系电话', reporterRegisteredAddr: '户籍地',
  reporterRelationship: '与案件关系', reporterWechat: '微信号', reporterWorkplace: '工作单位',
  reportLocation: '接报地点', reportMatter: '接报事项', reportMethod: '接报方式',
  requestDate: '调证日期', requestNo: '调证编号', residentialSurveillanceDate: '监视居住',
  responsibleOfficer: '责任人', responsiblePerson: '责任人', result: '战果',
  returnDate: '返还时间', returnStatus: '返还情况', reviewProblemCount: '审核问题数',
  risk: '风险情况', riskLevel: '风险等级', riskOtherClues: '其他线索',
  riskOtherReporters: '其他报案人', riskRelatedCase: '关联案件', riskResult: '风险处置结果',
  riskStability: '维稳风险', riskUrgency: '紧急程度', satisfaction: '满意度',
  seizedEquity: '股权', seizedProperties: '查扣财产', seizedProperty: '查封房产',
  seizedVehicle: '车辆', seizureInfo: '查封情况', selfAccount: '本人账户',
  selfClueCount: '自行摸排线索数', sentencedCount: '判决人数', signStatus: '领取签字',
  solvedCaseCount: '破案数', spec: '规格型号', specialAction: '专项行动',
  spirit: '会议精神', squad: '采集单位', stabilityWork: '维稳工作',
  standard: '执行标准', standardImprovement: '规范提升情况', startDate: '启动时间',
  statistician: '内勤统计人', stopPayDate: '停止兑付/案发', subjectAddress: '注册/经营地',
  subjectEstablishDate: '成立时间', subjectKeyPersonnel: '骨干/业务员', subjectLegalRep: '法人/代表人',
  subjectName: '公司/个人名称', submitMaterial: '报送材料', summary: '用途摘要',
  superiorClueCount: '上级交办线索数', superiorSupervision: '上级督办情况', supervision: '督促整改情况',
  supervisionCase: '是否挂牌案件', supervisorFeedback: '上级督导反馈', supplier: '供应商',
  suspect: '嫌疑人', suspectAddress: '地址', suspectIdNo: '身份证号',
  suspectName: '姓名', suspectPhone: '手机号', target: '调证目标',
  timeRange: '调证时间范围', totalAmount: '涉案总金额', totalInvestment: '总投入本金',
  totalInvolvedAmount: '涉案总金额(总额)', totalPetitions: '同一案件信访总计', totalVictims: '总受害人数',
  tradePlatform: '交易平台', tradeTime: '交易时间', transferDestination: '流转去向',
  transferDetail: '流转去向说明', transferMethod: '交易方式', transferRecord: '案件移交记录',
  transferUnit: '移交单位', traveler: '出差人', typicalCase: '典型案例',
  uncheckedClueCount: '未办结线索数', uncompensatedInfo: '未退赔情况', undertaker: '承办人',
  unitPrice: '单价', usdtExchange: 'USDT兑换', victimActualLoss: '受害人实际损失',
  victimCount: '受害人数', victimEstimatedCount: '预估受害人数', victimRegisteredCount: '受害人登记人数',
  visitDate: '来访时间', visitorName: '来访人', wantedCount: '追逃人数',
  warningEnterpriseCount: '约谈警示企业数', wechat: '微信', withdraw: '提现',
  workTitle: '稿件/作品名称', writeOffRisk: '维稳风险',
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

/** repeatable section 的 listName 集合（字段数据在数组内） */
const SECTION_LIST_NAMES = new Set([
  'coerciveMeasures', 'reporters', 'involvedEntities',
  'suspects', 'clueSources', 'involvedSubjects',
  'interviewees', 'requestItems', 'enterpriseSubjects',
  'personalSubjects', 'investigationItems', 'fundSources',
  'penetrationItems', 'properties', 'involvedParties',
]);

/**
 * 从记录中提取有值的字段，包括 repeatable section 内的字段
 */
function recordSummary(rec: MassRecord): { label: string; value: string }[] {
  const d = rec.data || {};
  const items: { label: string; value: string }[] = [];

  // 1. 扫描普通扁平字段
  for (const [key, raw] of Object.entries(d)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (raw === null || raw === undefined) continue;
    if (SECTION_LIST_NAMES.has(key)) continue; // repeatable section 单独处理
    const str = String(raw).trim();
    if (!str || str === '—') continue;
    if (/^\d{4}-\d{2}-\d{2}T/.test(str)) continue;
    if (Array.isArray(raw) && raw.length === 0) continue;
    if (typeof raw === 'object') continue;
    const label = FIELD_LABELS[key] || key;
    const value = str.length > 30 ? str.slice(0, 30) + '…' : str;
    items.push({ label, value });
  }

  // 2. 扫描 repeatable section 数组（取第一项中的字段）
  for (const listName of SECTION_LIST_NAMES) {
    const arr = d[listName];
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const first = arr[0];
    if (typeof first !== 'object' || first === null) continue;
    for (const [key, raw] of Object.entries(first)) {
      if (raw === null || raw === undefined) continue;
      const str = String(raw).trim();
      if (!str || str === '—') continue;
      if (/^\d{4}-\d{2}-\d{2}T/.test(str)) continue;
      const label = FIELD_LABELS[key] || key;
      const value = str.length > 30 ? str.slice(0, 30) + '…' : str;
      // 去重：如果扁平字段已经展示了同名的，不再重复
      if (!items.some((i) => i.label === label && i.value === value)) {
        items.push({ label, value });
      }
    }
  }

  return items.slice(0, 10);
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

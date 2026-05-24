/**
 * 刑事案件节点办结期限工具
 * 依据《中华人民共和国刑事诉讼法》各节点法定时限
 */

import dayjs from 'dayjs';

// ========== 法定时限常量（单位：天） ==========

/** 受案→立案：一般3日，最长7日 */
export const DEADLINE_RECEIVE_TO_FILING = 7;

/** 刑拘→提请批捕：一般3日，流窜/多次/结伙作案可延至30日 */
export const DEADLINE_DETENTION_TO_ARREST = 30;

/** 提请批捕→批捕决定：7日 */
export const DEADLINE_ARREST_REVIEW = 7;

/** 逮捕后侦查羁押：一般2个月（60天） */
export const DEADLINE_INVESTIGATION = 60;

/** 侦查终结→移送审查起诉：一般1个月（30天） */
export const DEADLINE_INVEST_END_TO_PROSECUTION = 30;

/** 取保候审：最长12个月（365天） */
export const DEADLINE_BAIL = 365;

/** 监视居住：最长6个月（180天） */
export const DEADLINE_SURVEILLANCE = 180;

// ========== 超期状态枚举 ==========

export type OverdueStatus = 'normal' | 'warning' | 'overdue';

export interface NodeDeadlineCheck {
  nodeName: string;        // 节点名称
  nodeDate: string;        // 节点日期（ISO string）
  deadlineDays: number;    // 法定时限（天）
  status: OverdueStatus;   // 超期状态
  daysLeft: number;        // 剩余天数（负数为超期天数）
  statusText: string;      // 状态文本
}

// ========== 核心计算函数 ==========

/**
 * 计算单个节点的超期状态
 * @param nodeDate 节点日期（ISO 字符串或 dayjs 对象）
 * @param deadlineDays 法定时限（天）
 * @param nodeName 节点名称
 */
export function checkNodeDeadline(
  nodeDate: string | dayjs.Dayjs | undefined | null,
  deadlineDays: number,
  nodeName: string,
): NodeDeadlineCheck | null {
  if (!nodeDate) return null;

  const start = dayjs(nodeDate);
  if (!start.isValid()) return null;

  const now = dayjs();
  const deadlineDate = start.add(deadlineDays, 'day');
  const diffDays = deadlineDate.diff(now, 'day');

  let status: OverdueStatus;
  let statusText: string;

  if (diffDays < 0) {
    // 已超期
    if (Math.abs(diffDays) <= 3) {
      status = 'warning';     // 超期3天内，警告
      statusText = `超期${Math.abs(diffDays)}天`;
    } else {
      status = 'overdue';     // 超期3天以上，严重
      statusText = `已超期${Math.abs(diffDays)}天`;
    }
  } else if (diffDays <= 3) {
    // 3天内到期，预警
    status = 'warning';
    statusText = `还剩${diffDays}天`;
  } else {
    status = 'normal';
    statusText = `还剩${diffDays}天`;
  }

  return {
    nodeName,
    nodeDate: start.format('YYYY-MM-DD'),
    deadlineDays,
    status,
    daysLeft: diffDays,
    statusText,
  };
}

// ========== 案件节点检查（针对 SquadCase 结构） ==========

export interface SquadCaseDeadlineCheck {
  caseName: string;
  caseNo: string;
  nodes: NodeDeadlineCheck[];
  overallStatus: OverdueStatus; // 最严重的那个节点状态
  alertCount: number;          // 超期+预警节点数
}

/**
 * 检查一个案件所有节点的超期状态
 */
export function checkSquadCaseDeadlines(caseData: {
  caseName: string;
  caseNo: string;
  receiveDate?: string | null;
  filingDate?: string | null;
  // 强制措施相关
  criminalDetentionDates?: string[];  // 刑拘日期数组
  arrestDate?: string | null;         // 逮捕日期
  bailDate?: string | null;           // 取保候审日期
  surveillanceDate?: string | null;   // 监视居住日期
  // 后续节点
  investEndDate?: string | null;      // 侦查终结日期
  prosecutionDate?: string | null;    // 移送审查起诉日期
  caseCloseDate?: string | null;      // 结案日期
}): SquadCaseDeadlineCheck {
  const nodes: NodeDeadlineCheck[] = [];

  // 1. 受案→立案节点
  if (caseData.receiveDate && !caseData.filingDate) {
    // 已受案但未立案：检查是否超期
    const check = checkNodeDeadline(caseData.receiveDate, DEADLINE_RECEIVE_TO_FILING, '受案→立案');
    if (check) nodes.push(check);
  }

  // 2. 刑拘节点
  if (caseData.criminalDetentionDates && caseData.criminalDetentionDates.length > 0 && !caseData.arrestDate) {
    // 已刑拘但未批捕：取最早的刑拘日期计算
    const earliestDetention = caseData.criminalDetentionDates
      .filter(d => d)
      .sort()[0];
    if (earliestDetention) {
      const check = checkNodeDeadline(earliestDetention, DEADLINE_DETENTION_TO_ARREST, '刑拘→提请批捕');
      if (check) nodes.push(check);
    }
  }

  // 3. 逮捕→侦查羁押
  if (caseData.arrestDate && !caseData.investEndDate) {
    const check = checkNodeDeadline(caseData.arrestDate, DEADLINE_INVESTIGATION, '逮捕→侦查羁押');
    if (check) nodes.push(check);
  }

  // 4. 取保候审期限
  if (caseData.bailDate && !caseData.caseCloseDate) {
    const check = checkNodeDeadline(caseData.bailDate, DEADLINE_BAIL, '取保候审期限');
    if (check) nodes.push(check);
  }

  // 5. 监视居住期限
  if (caseData.surveillanceDate && !caseData.caseCloseDate) {
    const check = checkNodeDeadline(caseData.surveillanceDate, DEADLINE_SURVEILLANCE, '监视居住期限');
    if (check) nodes.push(check);
  }

  // 6. 侦查终结→移送审查起诉
  if (caseData.investEndDate && !caseData.prosecutionDate) {
    const check = checkNodeDeadline(caseData.investEndDate, DEADLINE_INVEST_END_TO_PROSECUTION, '侦查终结→移送起诉');
    if (check) nodes.push(check);
  }

  // 计算整体状态
  let overallStatus: OverdueStatus = 'normal';
  let alertCount = 0;
  for (const node of nodes) {
    if (node.status === 'overdue') {
      overallStatus = 'overdue';
      alertCount++;
    } else if (node.status === 'warning' && overallStatus !== 'overdue') {
      overallStatus = 'warning';
      alertCount++;
    }
  }

  return {
    caseName: caseData.caseName,
    caseNo: caseData.caseNo,
    nodes,
    overallStatus,
    alertCount,
  };
}

// ========== 模拟数据（用于大屏展示） ==========

export function getMockDeadlineAlerts(): SquadCaseDeadlineCheck[] {
  const now = dayjs();
  return [
    {
      caseName: '李某涉嫌非法吸收公众存款案',
      caseNo: '经侦立〔2026〕018号',
      nodes: [
        {
          nodeName: '逮捕→侦查羁押',
          nodeDate: now.subtract(65, 'day').format('YYYY-MM-DD'),
          deadlineDays: 60,
          status: 'overdue',
          daysLeft: -5,
          statusText: '超期5天',
        },
        {
          nodeName: '刑拘→提请批捕',
          nodeDate: now.subtract(35, 'day').format('YYYY-MM-DD'),
          deadlineDays: 30,
          status: 'overdue',
          daysLeft: -5,
          statusText: '超期5天',
        },
      ],
      overallStatus: 'overdue',
      alertCount: 2,
    },
    {
      caseName: '刘某涉嫌组织领导传销活动案',
      caseNo: '经侦立〔2026〕022号',
      nodes: [
        {
          nodeName: '侦查终结→移送起诉',
          nodeDate: now.subtract(28, 'day').format('YYYY-MM-DD'),
          deadlineDays: 30,
          status: 'warning',
          daysLeft: 2,
          statusText: '还剩2天',
        },
      ],
      overallStatus: 'warning',
      alertCount: 1,
    },
    {
      caseName: '赵某涉嫌虚开增值税专用发票案',
      caseNo: '经侦立〔2026〕015号',
      nodes: [
        {
          nodeName: '取保候审期限',
          nodeDate: now.subtract(300, 'day').format('YYYY-MM-DD'),
          deadlineDays: 365,
          status: 'warning',
          daysLeft: 65,
          statusText: '还剩65天',
        },
      ],
      overallStatus: 'warning',
      alertCount: 1,
    },
    {
      caseName: '陈某涉嫌贷款诈骗案',
      caseNo: '经侦立〔2026〕010号',
      nodes: [
        {
          nodeName: '逮捕→侦查羁押',
          nodeDate: now.subtract(90, 'day').format('YYYY-MM-DD'),
          deadlineDays: 60,
          status: 'overdue',
          daysLeft: -30,
          statusText: '超期30天',
        },
      ],
      overallStatus: 'overdue',
      alertCount: 1,
    },
  ];
}

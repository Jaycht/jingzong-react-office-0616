/**
 * 资金穿透 / 对手账户分析引擎（P1-4）
 * ------------------------------------------------------------------
 * 经侦主业是"查钱"。本引擎扫描全量记录，从各模块的资金相关字段中
 * 抽取并归一化银行账号，按账号聚合出"账户画像"，并依据资金去向分析的层级
 * （penetrationItems）、资金来源（fundSources）、收款账户（fundAccountDetail）
 * 构建有向资金流向边，用于识别"疑似对手账户 / 跑分归集账户"。
 *
 * 主要复用 caseLinkage 的 normBank（统一银行账号归一化）、recTitle、maskValue，
 * 保证与串并案分析的身份键口径一致。
 */

import type { MassRecord } from '../store/massStore';
import { getMassRecords } from '../store/massStore';
import { MODULE_NAMES } from '../moduleConfig';
import { normBank, recTitle, maskValue, KEY_FIELDS } from './caseLinkage';

/* ============================ 类型 ============================ */

export interface FundAccount {
  account: string;          // 归一化账号（原始值，不展示）
  masked: string;           // 脱敏展示
  count: number;            // 引用该账号的记录数
  recordIds: string[];
  moduleIds: string[];
  moduleNames: string[];
  caseNames: string[];      // 关联案件名（去重）
  caseCount: number;        // 跨案件数
  received: number;         // 累计接收资金（估算，单位依原始录入混用）
  transferred: number;      // 累计转出资金
  balance: number;          // 累计账户余额
  freezeAmount: number;     // 涉及冻结/解冻金额合计
  executeAmount: number;    // 涉及执行金额合计
  frozenCount: number;      // 标注"已冻结"的次数
  partialFrozenCount: number;
  levels: number[];         // 出现的资金层级
  /** 疑似对手账户：跨 ≥2 个案件出现，或在 ≥3 条记录中出现 */
  isCounterparty: boolean;
  counterpartyReason: string;
}

export interface FundEdge {
  from: string;             // 账号或"外部"节点（资金上游/主体）
  to: string;               // 账号
  amount?: number;          // 金额（估算）
  caseName: string;
  recordId: string;
  kind: 'penetration' | 'source' | 'receive';
}

export interface FundModel {
  accounts: FundAccount[];
  edges: FundEdge[];
  summary: {
    accountCount: number;
    recordCount: number;
    counterpartyCount: number;
    frozenCount: number;
    totalReceived: number;
    totalTransferred: number;
    totalBalance: number;
  };
}

/* ============================ 工具 ============================ */

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** 解析资金层级：接受 "1级" / "一级" / 1 / "L2" 等，返回数值，无法解析返回 0 */
function parseLevel(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/* ============================ 构建 ============================ */

/**
 * 构建资金穿透模型。
 * @param records 可选，传入则基于该集合（便于测试/局部分析），否则读全量。
 */
export function buildFundModel(records?: MassRecord[]): FundModel {
  const recs = records ?? getMassRecords();
  const map = new Map<string, FundAccount>();
  const edges: FundEdge[] = [];

  const ensure = (account: string): FundAccount => {
    let a = map.get(account);
    if (!a) {
      a = {
        account,
        masked: maskValue('bankAccount', account),
        count: 0,
        recordIds: [],
        moduleIds: [],
        moduleNames: [],
        caseNames: [],
        caseCount: 0,
        received: 0,
        transferred: 0,
        balance: 0,
        freezeAmount: 0,
        executeAmount: 0,
        frozenCount: 0,
        partialFrozenCount: 0,
        levels: [],
        isCounterparty: false,
        counterpartyReason: '',
      };
      map.set(account, a);
    }
    return a;
  };

  const attach = (
    a: FundAccount,
    r: MassRecord,
    title: string,
    inc: {
      received?: number; transferred?: number; balance?: number;
      freezeAmount?: number; executeAmount?: number;
      frozen?: number; partialFrozen?: number; level?: number;
    } = {},
  ) => {
    if (!a.recordIds.includes(r.id)) {
      a.recordIds.push(r.id);
      a.count += 1;
      if (!a.moduleIds.includes(r.moduleId)) {
        a.moduleIds.push(r.moduleId);
        a.moduleNames.push(MODULE_NAMES[r.moduleId] || r.moduleId);
      }
    }
    if (title && !a.caseNames.includes(title)) a.caseNames.push(title);
    a.received += inc.received || 0;
    a.transferred += inc.transferred || 0;
    a.balance += inc.balance || 0;
    a.freezeAmount += inc.freezeAmount || 0;
    a.executeAmount += inc.executeAmount || 0;
    if (inc.frozen) a.frozenCount += inc.frozen;
    if (inc.partialFrozen) a.partialFrozenCount += inc.partialFrozen;
    if (inc.level && inc.level > 0 && !a.levels.includes(inc.level)) a.levels.push(inc.level);
  };

  for (const r of recs) {
    const d = (r.data || {}) as Record<string, unknown>;
    const title = recTitle(d);

    // 1) 顶层银行账号字段（含嵌套数组中的账号）
    const topBank = extractBankAccounts(d);
    // squad 银行卡号（未纳入 caseLinkage 的 KEY_FIELDS，单独处理）
    const card = normBank(String(d.bankCardNo ?? ''));
    if (card) topBank.add(card);

    for (const acc of topBank) {
      attach(ensure(acc), r, title);
    }

    // 顶层冻结/执行金额：归属该记录命中的顶层账号（估算，单位依录入）
    const frAmt = num(d.freezeAmount);
    const exAmt = num(d.executeAmount);
    if ((frAmt || exAmt) && topBank.size > 0) {
      for (const acc of topBank) {
        attach(ensure(acc), r, title, { freezeAmount: frAmt, executeAmount: exAmt });
      }
    }

    // 2) 资金去向分析（penetrationItems）：按层级构建下行流向
    const pen = Array.isArray(d.penetrationItems) ? (d.penetrationItems as Record<string, unknown>[]) : [];
    const penNodes: { account: string; level: number; received: number; transferred: number }[] = [];
    for (const item of pen) {
      const acc = normBank(String(item?.penetrationAccount ?? ''));
      if (!acc) continue;
      const level = parseLevel(item?.penetrationLevel);
      const received = num(item?.penetrationReceived);
      const transferred = num(item?.penetrationTransferred);
      const balance = num(item?.penetrationBalance);
      const frozen = String(item?.penetrationFrozen ?? '') === '已冻结' ? 1 : 0;
      const partial = String(item?.penetrationFrozen ?? '') === '部分冻结' ? 1 : 0;
      attach(ensure(acc), r, title, { received, transferred, balance, frozen, partialFrozen: partial, level });
      penNodes.push({ account: acc, level, received, transferred });
    }
    // 按层级连边：同记录内 第N层 → 第N+1层
    if (penNodes.length > 1) {
      const byLevel = new Map<number, string[]>();
      for (const n of penNodes) {
        if (n.level <= 0) continue;
        const arr = byLevel.get(n.level) || [];
        arr.push(n.account);
        byLevel.set(n.level, arr);
      }
      const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);
      for (let i = 0; i < levels.length - 1; i++) {
        const cur = byLevel.get(levels[i])!;
        const next = byLevel.get(levels[i + 1])!;
        for (const a of cur) {
          for (const b of next) {
            const amt = (penNodes.find((n) => n.account === b)?.received)
              || (penNodes.find((n) => n.account === b)?.transferred) || undefined;
            edges.push({ from: a, to: b, amount: amt, caseName: title, recordId: r.id, kind: 'penetration' });
          }
        }
      }
    }

    // 3) 资金来源分析（fundSources）：资金上游 → 资金账号
    const src = Array.isArray(d.fundSources) ? (d.fundSources as Record<string, unknown>[]) : [];
    for (const item of src) {
      const acc = normBank(String(item?.fundAccount ?? ''));
      const upstream = String(item?.fundUpstream ?? '').trim();
      if (acc) attach(ensure(acc), r, title);
      if (upstream) {
        edges.push({ from: upstream, to: acc || '未知账户', caseName: title, recordId: r.id, kind: 'source' });
      }
    }

    // 4) 涉众收款账户（fundAccountDetail）：主体 → 收款账户
    const detail = normBank(String(d.fundAccountDetail ?? ''));
    if (detail) {
      attach(ensure(detail), r, title);
      edges.push({ from: title || '主体', to: detail, caseName: title, recordId: r.id, kind: 'receive' });
    }
  }

  // 收尾：计算跨案件判定与排序
  const accounts = Array.from(map.values()).map((a) => {
    a.caseCount = new Set(a.caseNames).size;
    const reasons: string[] = [];
    if (a.caseCount >= 2) reasons.push(`跨 ${a.caseCount} 个案件出现`);
    if (a.count >= 3) reasons.push(`涉及 ${a.count} 条记录`);
    a.isCounterparty = reasons.length > 0;
    a.counterpartyReason = reasons.join('；');
    return a;
  });

  accounts.sort((a, b) => {
    if (a.isCounterparty !== b.isCounterparty) return a.isCounterparty ? -1 : 1;
    const fa = a.received + a.transferred + a.balance;
    const fb = b.received + b.transferred + b.balance;
    return fb - fa || b.count - a.count;
  });

  const involved = new Set<string>();
  let counterpartyCount = 0;
  let frozenCount = 0;
  let totalReceived = 0, totalTransferred = 0, totalBalance = 0;
  for (const a of accounts) {
    a.recordIds.forEach((id) => involved.add(id));
    if (a.isCounterparty) counterpartyCount += 1;
    if (a.frozenCount > 0) frozenCount += 1;
    totalReceived += a.received;
    totalTransferred += a.transferred;
    totalBalance += a.balance;
  }

  return {
    accounts,
    edges,
    summary: {
      accountCount: accounts.length,
      recordCount: involved.size,
      counterpartyCount,
      frozenCount,
      totalReceived,
      totalTransferred,
      totalBalance,
    },
  };
}

/** 从数据对象递归抽取所有银行账号（归一化、去重） */
function extractBankAccounts(obj: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string' && KEY_FIELDS.bankAccount.includes(k)) {
        const n = normBank(v);
        if (n) out.add(n);
      } else if (v && typeof v === 'object') {
        walk(v);
      }
    }
  };
  walk(obj);
  return out;
}

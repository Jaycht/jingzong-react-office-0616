import { describe, it, expect } from 'vitest';
import { buildFundModel } from '../utils/fundPenetration';
import type { MassRecord } from '../store/massStore';

function rec(id: string, moduleId: string, data: Record<string, unknown>): MassRecord {
  return { id, moduleId, tabId: moduleId + '-1', data, createdAt: '2026-01-01', updatedAt: '2026-01-02' };
}

describe('资金穿透分析引擎', () => {
  it('聚合银行账号并归一化', () => {
    const records = [
      rec('r1', 'evidence-report', {
        caseName: '张三案',
        penetrationItems: [
          { penetrationAccount: '6228 4800 1234 5678', penetrationLevel: '1级', penetrationReceived: '100', penetrationTransferred: '20', penetrationBalance: '80', penetrationFrozen: '已冻结' },
        ],
      }),
    ];
    const m = buildFundModel(records);
    expect(m.accounts.length).toBe(1);
    expect(m.accounts[0].account).toBe('6228480012345678'); // 空格已归一化
    expect(m.accounts[0].received).toBe(100);
    expect(m.accounts[0].frozenCount).toBe(1);
    expect(m.accounts[0].isCounterparty).toBe(false);
  });

  it('按穿透层级构建下行流向边', () => {
    const records = [
      rec('r2', 'evidence-report', {
        caseName: '李四案',
        penetrationItems: [
          { penetrationAccount: '1111222233334444', penetrationLevel: 1, penetrationReceived: '500' },
          { penetrationAccount: '5555666677778888', penetrationLevel: 2, penetrationReceived: '480' },
        ],
      }),
    ];
    const m = buildFundModel(records);
    expect(m.accounts.length).toBe(2);
    const edge = m.edges.find((e) => e.kind === 'penetration');
    expect(edge).toBeTruthy();
    expect(edge!.from).toBe('1111222233334444');
    expect(edge!.to).toBe('5555666677778888');
    expect(edge!.amount).toBe(480);
  });

  it('跨案件出现判定为疑似对手账户', () => {
    const records = [
      rec('r3', 'evidence-report', { caseName: '案件A', penetrationItems: [{ penetrationAccount: '9999000011112222', penetrationLevel: 1 }] }),
      rec('r4', 'squad-case', { caseName: '案件B', bankCardNo: '9999 0000 1111 2222' }),
      rec('r5', 'mass-clue', { caseName: '案件C', fundAccountDetail: '9999000011112222' }),
    ];
    const m = buildFundModel(records);
    const acc = m.accounts.find((a) => a.account === '9999000011112222');
    expect(acc).toBeTruthy();
    expect(acc!.count).toBe(3);
    expect(acc!.caseCount).toBe(3);
    expect(acc!.isCounterparty).toBe(true);
    expect(acc!.counterpartyReason).toContain('跨 3 个案件');
  });

  it('资金来源构建上游→资金账号边', () => {
    const records = [
      rec('r6', 'evidence-report', {
        caseName: '王五案',
        fundSources: [{ fundUpstream: '某支付平台', fundAccount: '6666777788889999' }],
      }),
    ];
    const m = buildFundModel(records);
    const srcEdge = m.edges.find((e) => e.kind === 'source');
    expect(srcEdge).toBeTruthy();
    expect(srcEdge!.from).toBe('某支付平台');
    expect(srcEdge!.to).toBe('6666777788889999');
  });

  it('汇总统计正确', () => {
    const records = [
      rec('r7', 'evidence-report', {
        caseName: '赵六案',
        penetrationItems: [
          { penetrationAccount: '1212343456567878', penetrationLevel: 1, penetrationReceived: '200', penetrationTransferred: '50', penetrationBalance: '150' },
        ],
      }),
      rec('r8', 'evidence-report', { caseName: '钱七案', penetrationItems: [{ penetrationAccount: '1212343456567878', penetrationLevel: 1 }] }),
    ];
    const m = buildFundModel(records);
    expect(m.summary.accountCount).toBe(1);
    expect(m.summary.recordCount).toBe(2);
    expect(m.summary.totalReceived).toBe(200);
    expect(m.summary.totalTransferred).toBe(50);
    expect(m.summary.totalBalance).toBe(150);
    expect(m.summary.counterpartyCount).toBe(1);
  });
});

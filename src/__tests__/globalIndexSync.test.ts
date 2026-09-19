import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDBAdapter } from '../store/adapter';
import { saveMassRecord, rebuildGlobalIndexes, getMassRecords } from '../store/massStore';
import {
  rebuildCaseIndex,
  recordFieldValues,
  getFieldHistory,
  getAllCaseNames,
  getAllCaseNos,
  getCaseNosByName,
  getCaseNamesByNo,
  getCaseDetail,
  getSuspectInfo,
} from '../store/inputHistoryStore';

/** 一条最小可用的记录 */
function rec(data: Record<string, unknown>, moduleId = 'evidence-request') {
  return { moduleId, data };
}

describe('rebuildCaseIndex —— 案件 / 线索索引', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('建立案件编号 ⇄ 案件名称双向映射，并保留案件详情用于自动填充', () => {
    rebuildCaseIndex([
      rec({
        caseNo: 'A3703231200002024065002',
        caseName: '宋曼非法吸收公众存款案',
        leadOfficer: '陈洪涛',
        receiveDate: '2026-03-11',
      }),
    ]);

    expect(getAllCaseNames()).toContain('宋曼非法吸收公众存款案');
    expect(getAllCaseNos()).toContain('A3703231200002024065002');
    expect(getCaseNosByName('宋曼非法吸收公众存款案')).toEqual(['A3703231200002024065002']);
    expect(getCaseNamesByNo('A3703231200002024065002')).toEqual(['宋曼非法吸收公众存款案']);
    const detail = getCaseDetail('A3703231200002024065002');
    expect(detail?.leadOfficer).toBe('陈洪涛');
    expect(detail?.receiveDate).toBe('2026-03-11');
  });

  it('线索字段（clueName / clueNo）同样进索引 —— 线索调证的记录不再联想不到', () => {
    rebuildCaseIndex([
      rec({ clueNo: 'XS-001', clueName: '格力沂源可疑资金线索' }),
    ]);

    expect(getAllCaseNames()).toContain('格力沂源可疑资金线索');
    expect(getAllCaseNos()).toContain('XS-001');
    expect(getCaseNosByName('格力沂源可疑资金线索')).toEqual(['XS-001']);
    expect(getCaseNamesByNo('XS-001')).toEqual(['格力沂源可疑资金线索']);
  });

  it('只有名称没有编号也不丢：名称进池、编号列表为空', () => {
    rebuildCaseIndex([rec({ caseName: '仅名称的案件' })]);
    expect(getAllCaseNames()).toContain('仅名称的案件');
    expect(getCaseNosByName('仅名称的案件')).toEqual([]);
  });

  it('同名多编号 / 同编号多名去重累积，不覆盖', () => {
    rebuildCaseIndex([
      rec({ caseNo: 'A1', caseName: '同名案' }),
      rec({ caseNo: 'A2', caseName: '同名案' }),
      rec({ caseNo: 'A1', caseName: '同名案' }), // 重复项应被去重
    ]);
    expect(getCaseNosByName('同名案')).toEqual(['A1', 'A2']);
  });
});

describe('recordFieldValues —— 批量写入输入历史池', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('一次写入多个字段，空值跳过，最新在前且去重', () => {
    recordFieldValues([
      ['requestNo', '220240101000000000001'],
      ['caseName', '宋曼案'],
      ['requestNo', ''], // 空值直接跳过
    ]);
    expect(getFieldHistory('requestNo')).toEqual(['220240101000000000001']);
    expect(getFieldHistory('caseName')).toEqual(['宋曼案']);

    recordFieldValues([['caseName', '宋曼案'], ['caseName', '同润案']]);
    // 已存在的值移到最前，不产生重复项
    expect(getFieldHistory('caseName')).toEqual(['同润案', '宋曼案']);
  });
});

describe('rebuildGlobalIndexes —— 批量导入后的统一收尾', () => {
  beforeEach(() => {
    localStorage.clear();
    indexedDBAdapter.clear();
  });

  it('导入（saveMassRecord）后的案件与嫌疑人立即全项目可见、可自动填充', () => {
    // 模拟「从平台粘贴导入」：只调 saveMassRecord，不经过抽屉表单
    saveMassRecord('evidence-request', 'evidence-request-1', {
      caseNo: 'A3703231200002024065002',
      caseName: '宋曼非法吸收公众存款案',
      requestNo: '220240101000000000001',
    });
    saveMassRecord('squad-case', 'squad-case-1', {
      caseName: '同润置业案',
      suspects: [{ suspectName: '孙彬', suspectIdNo: '370323199001010011', suspectPhone: '13800000000' }],
    });

    expect(getAllCaseNames()).not.toContain('宋曼非法吸收公众存款案');

    rebuildGlobalIndexes();

    expect(getMassRecords()).toHaveLength(2);
    expect(getAllCaseNames()).toContain('宋曼非法吸收公众存款案');
    expect(getAllCaseNames()).toContain('同润置业案');
    expect(getCaseNosByName('宋曼非法吸收公众存款案')).toEqual(['A3703231200002024065002']);
    // 嫌疑人索引一并重建（选/填姓名自动填充身份证、手机号）
    expect(getSuspectInfo('孙彬')?.idNo).toBe('370323199001010011');
    expect(getSuspectInfo('孙彬')?.phone).toBe('13800000000');
  });

  it('空库调用不抛错，且清空后的索引为空（删除记录后索引不残留）', () => {
    rebuildGlobalIndexes();
    expect(getAllCaseNames()).toEqual([]);
    expect(getAllCaseNos()).toEqual([]);
  });
});

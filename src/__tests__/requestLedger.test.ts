import { describe, it, expect } from 'vitest';
import {
  REQUEST_LIST_COLUMNS,
  REQUEST_STATUS_FIELD,
  REQUEST_STATUS_OPTIONS,
  LEDGER_HEADERS,
  buildLedgerDraft,
  buildLedgerResult,
  expandRequestLines,
  isFreeTextRemarks,
  ledgerCaseName,
  ledgerCaseNo,
  ledgerEditField,
  mergeInlineEdit,
  normalizeRequestStatus,
  pickRequestValue,
  requestStatusOf,
  splitStatusAndRemarks,
  statusFromPlatform,
  toLedgerDate,
} from '../utils/requestLedger';

// 台账口径单一事实源回归：导出、列表、粘贴导入三处共用这些取值函数，
// 任何一处口径漂移都会让「列表所见 ≠ 导出所得」。
// 注意：**导出模板十列（LEDGER_HEADERS）与列表工作列（REQUEST_LIST_COLUMNS）刻意不同** ——
// 列表按录入需要定制，导出永远对齐单位模板。

describe('台账导出十列（单位模板，恒定不变）', () => {
  it('列名与《资金查控情况登记台账（周五报送）》逐字一致', () => {
    expect([...LEDGER_HEADERS]).toEqual([
      '序号', '案件（线索）名称', '申请时间', '申请事由', '申请人',
      '申请单号', '反馈时间', '查控结果', '请求查控人', '备注',
    ]);
  });

  it('列表改列不影响导出台头（两套定义各自独立）', () => {
    // 列表不含「申请事由」，导出必须仍然保留
    expect(REQUEST_LIST_COLUMNS.map((c) => c.title)).not.toContain('申请事由');
    expect([...LEDGER_HEADERS]).toContain('申请事由');
  });
});

describe('列表工作列（表头由涛哥 2026-09-19 重定）', () => {
  it('十列 + 表格首列「序号」= 列表十一列，顺序逐字一致', () => {
    expect(['序号', ...REQUEST_LIST_COLUMNS.map((c) => c.title)]).toEqual([
      '序号',
      '案件（线索）名称',
      '线索\\案件编号',
      '申请时间',
      '申请单位',
      '申请人',
      '申请单号',
      '反馈时间',
      '查控结果',
      '请求查控人',
      '备注',
    ]);
  });

  it('每列都可点改（「查控结果」为三项数字特例）', () => {
    const noEdit = REQUEST_LIST_COLUMNS.filter((c) => !c.edit).map((c) => c.title);
    expect(noEdit).toEqual([]);
    const resultCol = REQUEST_LIST_COLUMNS.find((c) => c.title === '查控结果');
    expect(resultCol?.edit?.type).toBe('result');
    // 结果列不走单一字段，而是写 feedback* 三项
    expect(resultCol?.edit?.field).toBeUndefined();
    // 每一项都带提示语，用户点开知道在改什么
    expect(REQUEST_LIST_COLUMNS.every((c) => !!c.edit?.hint)).toBe(true);
  });

  it('「申请单位」复用协查单位下拉字段（含自定义添加键）', () => {
    const col = REQUEST_LIST_COLUMNS.find((c) => c.title === '申请单位');
    expect(col?.edit?.type).toBe('select');
    expect(col?.edit?.field).toBe('cooperateUnit');
  });

  it('「反馈时间」点击即以当前日期初始化', () => {
    const col = REQUEST_LIST_COLUMNS.find((c) => c.title === '反馈时间');
    expect(col?.edit?.field).toBe('feedbackDate');
    expect(col?.edit?.initNow).toBe(true);
    // 只有反馈时间有这个行为，避免误伤申请时间
    const others = REQUEST_LIST_COLUMNS.filter((c) => c.title !== '反馈时间' && c.edit?.initNow);
    expect(others).toEqual([]);
  });
});

describe('行内编辑：草稿与写回键', () => {
  it('buildLedgerDraft 取到可编辑列的原始值（状态列取状态，不搬自由备注）', () => {
    const draft = buildLedgerDraft({
      caseName: '12.22串通投标案',
      caseNo: 'A3703666',
      requestDate: '2026-07-23',
      applicant: '张三',
      requestNo: 'R1',
      feedbackDate: '2026-07-25',
      feedbackPending: 2, feedbackSuccess: 1739, feedbackFail: 146,
      requester: '李四',
      cooperateUnit: '一中队',
      requestStatus: '已反馈',
      remarks: '已交付',
    });
    expect(draft).toMatchObject({
      caseName: '12.22串通投标案',
      caseNo: 'A3703666',
      requestDate: '2026-07-23',
      applicant: '张三',
      requestNo: 'R1',
      feedbackDate: '2026-07-25',
      feedbackPending: 2, feedbackSuccess: 1739, feedbackFail: 146,
      requester: '李四',
      cooperateUnit: '一中队',
      requestStatus: '已反馈',
    });
    // 自由备注不参与状态草稿：草稿里不该出现 remarks 键
    expect('remarks' in draft).toBe(false);
  });

  it('buildLedgerDraft：备注是自由文本时状态草稿为空（别把备注搬进状态字段）', () => {
    expect(buildLedgerDraft({ remarks: '微信支付宝调取' })[REQUEST_STATUS_FIELD]).toBe('');
    // 旧标注串则要迁移成那一档
    expect(buildLedgerDraft({ remarks: '申请状态：已审批；报文状态：已发送' })[REQUEST_STATUS_FIELD]).toBe('已发送');
  });

  it('buildLedgerDraft 缺数字字段时补 0，避免数字框空白', () => {
    const draft = buildLedgerDraft({ requestNo: 'R1' });
    expect(draft.feedbackPending).toBe(0);
    expect(draft.feedbackSuccess).toBe(0);
    expect(draft.feedbackFail).toBe(0);
    expect(draft.applicant).toBe('');
  });

  it('旧 requestItems 数据也能取到草稿值（申请时间/单号）', () => {
    const draft = buildLedgerDraft({
      feedbackPending: 1,
      requestItems: [{ requestDate: '2026-07-23', requestNo: 'LEGACY-1' }],
    });
    expect(draft.requestDate).toBe('2026-07-23');
    expect(draft.requestNo).toBe('LEGACY-1');
  });

  it('ledgerEditField：主字段有值写主字段', () => {
    const edit = REQUEST_LIST_COLUMNS.find((c) => c.title === '案件（线索）名称')!.edit!;
    expect(ledgerEditField({ caseName: '某案', clueName: '某线索' }, edit)).toBe('caseName');
  });

  it('ledgerEditField：线索调证（只有 clueName）写 clueName，不污染案件字段', () => {
    const edit = REQUEST_LIST_COLUMNS.find((c) => c.title === '案件（线索）名称')!.edit!;
    expect(ledgerEditField({ clueName: '某线索' }, edit)).toBe('clueName');
  });

  it('ledgerEditField：线索编号同理写 clueNo', () => {
    const edit = REQUEST_LIST_COLUMNS.find((c) => c.title === '线索\\案件编号')!.edit!;
    expect(ledgerEditField({ clueNo: 'XS-001' }, edit)).toBe('clueNo');
    expect(ledgerEditField({ caseNo: 'A1', clueNo: 'XS-001' }, edit)).toBe('caseNo');
  });
});

describe('行内编辑落库：mergeInlineEdit', () => {
  it('新数据结构：草稿覆盖扁平字段，其余字段保持不动', () => {
    const next = mergeInlineEdit({ requestNo: 'R1', applyReason: '' }, { applyReason: '政保查询' });
    expect(next).toEqual({ requestNo: 'R1', applyReason: '政保查询' });
  });

  it('支持把字段清空（不会被旧 requestItems 的值顶回来）', () => {
    const next = mergeInlineEdit(
      { requestNo: '', requestItems: [{ requestNo: 'OLD-1' }] },
      { requestNo: '' },
    );
    expect(next.requestItems).toBeUndefined();
    expect(pickRequestValue(next, 'requestNo')).toBe('');
  });

  it('旧数据只有一条 requestItems 时完成扁平化并删除该段', () => {
    const next = mergeInlineEdit(
      { caseName: '某案', requestItems: [{ requestNo: 'OLD-1', requestDate: '2026-07-01' }] },
      { requestNo: 'NEW-1' },
    );
    expect(next.requestItems).toBeUndefined();
    expect(next.requestNo).toBe('NEW-1');
  });

  it('旧数据有多条 requestItems 时保留其余条目，避免丢申请单', () => {
    const next = mergeInlineEdit(
      { requestItems: [{ requestNo: 'R1' }, { requestNo: 'R2' }] },
      { requestNo: 'R1-fixed' },
    );
    expect(Array.isArray(next.requestItems)).toBe(true);
    expect((next.requestItems as Record<string, unknown>[]).map((i) => i.requestNo)).toEqual(['R1-fixed', 'R2']);
    // 导出的多行展开能力保留
    expect(expandRequestLines(next)).toHaveLength(2);
  });

  it('不修改传入的原对象（纯函数）', () => {
    const src = { requestNo: 'R1' };
    const next = mergeInlineEdit(src, { requestNo: 'R2' });
    expect(src.requestNo).toBe('R1');
    expect(next.requestNo).toBe('R2');
  });
});

describe('toLedgerDate：归一化为 yyyy/MM/dd', () => {
  it('yyyy-MM-dd 转台账格式', () => {
    expect(toLedgerDate('2026-07-23')).toBe('2026/07/23');
  });

  it('纯日期串不做时区换算（改期不改日）', () => {
    expect(toLedgerDate('2026-01-01')).toBe('2026/01/01');
    expect(toLedgerDate('2026-7-3')).toBe('2026/07/03');
    expect(toLedgerDate('2026-12-31 00:00')).toBe('2026/12/31');
  });

  it('带时区的 ISO 串按本地时区取日期，不会差一天', () => {
    // 早期版本把本地 0 点存成了 UTC ISO（东八区 07-23 00:00 → 07-22T16:00Z），
    // 若直接截前 10 位就会导出成 07/22。这里按本地时区还原，期望值与运行环境一致。
    const iso = '2026-07-22T16:00:00.000Z';
    const d = new Date(iso);
    const expected = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    expect(toLedgerDate(iso)).toBe(expected);
  });

  it('空值返回空串', () => {
    expect(toLedgerDate('')).toBe('');
    expect(toLedgerDate(undefined)).toBe('');
    expect(toLedgerDate(null)).toBe('');
  });
});

describe('buildLedgerResult：查控结果拼接', () => {
  it('三项齐全时按 未反馈/成功/失败 顺序拼接', () => {
    expect(buildLedgerResult({ feedbackPending: 2, feedbackSuccess: 1739, feedbackFail: 146 }))
      .toBe('未反馈2 成功1739 失败146');
  });

  it('为 0 的项不出现', () => {
    expect(buildLedgerResult({ feedbackPending: 0, feedbackSuccess: 3, feedbackFail: 7 })).toBe('成功3 失败7');
    expect(buildLedgerResult({ feedbackSuccess: 28 })).toBe('成功28');
  });

  it('三者皆 0 时返回破折号', () => {
    expect(buildLedgerResult({})).toBe('—');
    expect(buildLedgerResult(undefined)).toBe('—');
  });
});

describe('pickRequestValue：新扁平字段优先，旧 requestItems 回退', () => {
  it('扁平字段直接命中', () => {
    expect(pickRequestValue({ requestNo: '3703666120260723081857' }, 'requestNo')).toBe('3703666120260723081857');
  });

  it('扁平字段为空时回退旧版 requestItems[0]', () => {
    const legacy = { requestNo: '', requestItems: [{ requestNo: 'LEGACY-1', requestDate: '2026-07-23' }] };
    expect(pickRequestValue(legacy, 'requestNo')).toBe('LEGACY-1');
    expect(pickRequestValue(legacy, 'requestDate')).toBe('2026-07-23');
  });

  it('两边都没有时返回空串，不抛异常', () => {
    expect(pickRequestValue(undefined, 'applicant')).toBe('');
    expect(pickRequestValue({}, 'applicant')).toBe('');
  });
});

describe('ledgerCaseName / ledgerCaseNo：案件与线索互为回退', () => {
  it('案件调证取 caseName', () => {
    expect(ledgerCaseName({ caseName: '12.22串通投标案', clueName: 'X线索' })).toBe('12.22串通投标案');
  });

  it('线索调证取 clueName', () => {
    expect(ledgerCaseName({ clueName: 'X线索' })).toBe('X线索');
  });

  it('都没有时回退到编号', () => {
    expect(ledgerCaseName({ caseNo: 'A1234567890123456' })).toBe('A1234567890123456');
  });

  it('线索\\案件编号：案件取 caseNo，线索取 clueNo', () => {
    expect(ledgerCaseNo({ caseNo: 'A3703666' })).toBe('A3703666');
    expect(ledgerCaseNo({ clueNo: 'XS-2026-001' })).toBe('XS-2026-001');
    // 案件编号优先（同一记录两套都填时按案件调证口径）
    expect(ledgerCaseNo({ caseNo: 'A3703666', clueNo: 'XS-2026-001' })).toBe('A3703666');
    expect(ledgerCaseNo(undefined)).toBe('');
  });
});

describe('expandRequestLines：申请单维度展开', () => {
  it('新数据（扁平）恒展开为 1 行', () => {
    const lines = expandRequestLines({ requestNo: 'R1', requestDate: '2026-07-23', applyReason: '刑警专案查询' });
    expect(lines).toHaveLength(1);
    expect(lines[0].requestNo).toBe('R1');
    expect(lines[0].applyReason).toBe('刑警专案查询');
  });

  it('旧数据（requestItems 多条）按申请单逐行展开', () => {
    const lines = expandRequestLines({
      caseName: '某案',
      requestItems: [{ requestNo: 'R1' }, { requestNo: 'R2' }],
    });
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.requestNo)).toEqual(['R1', 'R2']);
  });

  it('旧数据缺字段时用顶层值兜底', () => {
    const lines = expandRequestLines({ requestItems: [{ requestNo: 'R1' }], applyReason: '政保查询' });
    expect(lines[0].applyReason).toBe('政保查询');
  });
});

describe('调证状态（「备注」列口径）：整列只呈现一档', () => {
  it('四档常量与业务约定一致', () => {
    expect([...REQUEST_STATUS_OPTIONS]).toEqual(['已提交', '已审批', '已发送', '已反馈']);
  });

  it('statusFromPlatform：报文状态为 已发送/已反馈 时以报文状态为准', () => {
    expect(statusFromPlatform('已审批', '已发送')).toBe('已发送');
    expect(statusFromPlatform('已审批', '已反馈')).toBe('已反馈');
    expect(statusFromPlatform('已提交', '已反馈')).toBe('已反馈');
  });

  it('statusFromPlatform：报文状态无信息时采用申请状态', () => {
    expect(statusFromPlatform('已审批', '')).toBe('已审批');
    expect(statusFromPlatform('已审批', undefined)).toBe('已审批');
    expect(statusFromPlatform('待审批', '')).toBe('已提交');
    expect(statusFromPlatform('未审批', '')).toBe('已提交');
    // 「已接收」＝报文已送达但尚无反馈 → 归到「已发送」
    expect(statusFromPlatform('已审批', '已接收')).toBe('已发送');
  });

  it('statusFromPlatform：两边都无信息时返回空串', () => {
    expect(statusFromPlatform('', '')).toBe('');
    expect(statusFromPlatform(undefined, undefined)).toBe('');
  });

  it('statusFromPlatform：未收录的异常状态原样保留，不硬塞进四档', () => {
    expect(statusFromPlatform('已审批', '发送失败')).toBe('已审批');
    expect(statusFromPlatform('审批拒绝', '')).toBe('审批拒绝');
  });

  it('requestStatusOf：旧标注串整体折叠成一档', () => {
    expect(requestStatusOf({ remarks: '申请状态：已审批；报文状态：已反馈；案件校验状态：校验通过' })).toBe('已反馈');
    expect(requestStatusOf({ remarks: '申请状态：已审批；报文状态：已发送' })).toBe('已发送');
    expect(requestStatusOf({ remarks: '申请状态：已审批；案件校验状态：校验通过' })).toBe('已审批');
    expect(requestStatusOf({ remarks: '申请状态：待审批' })).toBe('已提交');
  });

  it('requestStatusOf：已是四档之一原样返回，自由备注不丢', () => {
    expect(requestStatusOf({ remarks: '已反馈' })).toBe('已反馈');
    expect(requestStatusOf({ remarks: '微信支付宝调取' })).toBe('微信支付宝调取');
    expect(requestStatusOf({ remarks: '' })).toBe('');
    expect(requestStatusOf(undefined)).toBe('');
  });

  it('requestStatusOf：优先取 requestStatus 字段，旧数据回退解析备注', () => {
    // V2.48.0 起状态独立存字段
    expect(requestStatusOf({ requestStatus: '已发送' })).toBe('已发送');
    expect(requestStatusOf({ requestStatus: '待审批' })).toBe('已提交');
    // 字段与备注同时有值 → 以字段为准
    expect(requestStatusOf({ requestStatus: '已发送', remarks: '微信支付宝调取' })).toBe('已发送');
    // 字段为空 → 回退解析旧备注里的标注串
    expect(requestStatusOf({ remarks: '申请状态：已审批；报文状态：已反馈' })).toBe('已反馈');
  });

  it('requestStatusOf：兼容旧 requestItems 里的备注', () => {
    expect(requestStatusOf({ requestItems: [{ remarks: '申请状态：已审批；报文状态：已发送' }] })).toBe('已发送');
  });

  it('splitStatusAndRemarks：旧标注串迁到状态、备注清空；自由备注原样留在备注', () => {
    // 旧标注串 → 状态迁移、备注清空（那串不是备注）
    expect(splitStatusAndRemarks({ remarks: '申请状态：已审批；报文状态：已反馈；案件校验状态：校验通过' }))
      .toEqual({ status: '已反馈', remarks: '' });
    // V2.47 期间备注里只存了一个状态词 → 同样迁移
    expect(splitStatusAndRemarks({ remarks: '已发送' })).toEqual({ status: '已发送', remarks: '' });
    // 自由备注保留，状态留空
    expect(splitStatusAndRemarks({ remarks: '微信支付宝调取' })).toEqual({ status: '', remarks: '微信支付宝调取' });
    // 已有独立状态字段：字段为准，自由备注保留
    expect(splitStatusAndRemarks({ requestStatus: '已反馈', remarks: '微信支付宝调取' }))
      .toEqual({ status: '已反馈', remarks: '微信支付宝调取' });
    // 字段有值而备注还是旧标注串 → 顺手清掉那串
    expect(splitStatusAndRemarks({ requestStatus: '已反馈', remarks: '申请状态：已审批；报文状态：已反馈' }))
      .toEqual({ status: '已反馈', remarks: '' });
    expect(splitStatusAndRemarks(undefined)).toEqual({ status: '', remarks: '' });
  });

  it('备注列取状态值、编辑写 requestStatus 字段', () => {
    const col = REQUEST_LIST_COLUMNS.find((c) => c.key === 'listRemarks');
    expect(col?.get({ requestStatus: '已发送' })).toBe('已发送');
    expect(col?.get({ remarks: '申请状态：已审批；报文状态：已发送' })).toBe('已发送');
    expect(col?.edit?.field).toBe(REQUEST_STATUS_FIELD);
    expect(col?.edit?.type).toBe('select');
    expect(col?.edit?.options).toEqual(['已提交', '已审批', '已发送', '已反馈']);
    expect(col?.edit?.initFromStatus).toBe(true);
    // 草稿必须是「已反馈」，不能把整串标注带进下拉框
    expect(buildLedgerDraft({ remarks: '申请状态：已审批；报文状态：已反馈；案件校验状态：校验通过' })[REQUEST_STATUS_FIELD])
      .toBe('已反馈');
  });

  it('mergeInlineEdit：改状态时清掉备注里的旧标注串，但不碰用户的自由备注', () => {
    const migrated = mergeInlineEdit(
      { remarks: '申请状态：已审批；报文状态：已发送' },
      { [REQUEST_STATUS_FIELD]: '已反馈' },
    );
    expect(migrated[REQUEST_STATUS_FIELD]).toBe('已反馈');
    expect(migrated.remarks).toBe('');

    const kept = mergeInlineEdit({ remarks: '微信支付宝调取' }, { [REQUEST_STATUS_FIELD]: '已反馈' });
    expect(kept.remarks).toBe('微信支付宝调取');
  });

  it('isFreeTextRemarks：只有自由文本才算（自动「已反馈」不得冲掉用户备注）', () => {
    expect(isFreeTextRemarks('微信支付宝调取')).toBe(true);
    expect(isFreeTextRemarks('已反馈')).toBe(false);
    expect(isFreeTextRemarks('申请状态：已审批')).toBe(false);
    expect(isFreeTextRemarks('')).toBe(false);
  });

  it('normalizeRequestStatus：别名归并，未收录词原样', () => {
    expect(normalizeRequestStatus('待审批')).toBe('已提交');
    expect(normalizeRequestStatus('审批中')).toBe('已提交');
    expect(normalizeRequestStatus('审批通过')).toBe('已审批');
    expect(normalizeRequestStatus('已接收')).toBe('已发送');
    expect(normalizeRequestStatus('未发送')).toBe('未发送');
  });
});

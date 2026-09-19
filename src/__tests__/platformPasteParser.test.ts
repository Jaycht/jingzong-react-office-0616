import { describe, it, expect } from 'vitest';
import { parsePlatformPaste, CONTROL_TYPES } from '../utils/platformPasteParser';

// 平台复制出来的真实样本（节选 3 条），使用 \t 还原 TSV 结构
const SAMPLE = [
  '序号\t操作\t申请状态\t报文状态\t案件校验状态\t案件编号\t案件名称\t查控类型\t任务\t申请单号\t创建时间',
  '任务\t未反馈\t反馈成功\t反馈失败',
  '\t1\t查看详情状态\t已审批\t已发送\t\tA3703231200002024065002\t',
  '6.12非法吸收公众存款案',
  '冻结申请\t1\t0\t0\t0\t3703666320260918093859\t2026-09-18 09:42:02',
  '\t2\t查看详情状态重新发起\t已审批\t已发送\t\tA3703231200002025045001\t',
  '4.07合同诈骗案',
  '常规查询\t1\t0\t0\t0\t3703666320260917204202\t2026-09-17 20:42:02',
  '\t3\t查看详情状态重新发起反馈\t已审批\t已反馈\t\tA3703231200002026050005\t',
  '申金明涉嫌合同诈骗案',
  '常规查询\t3\t0\t3\t0\t3703666320260917162059\t2026-09-17 16:20:59',
].join('\n');

describe('parsePlatformPaste', () => {
  it('解析出全部记录', () => {
    const rows = parsePlatformPaste(SAMPLE);
    expect(rows.length).toBe(3);
  });

  it('正确解析第 1 条（冻结申请 / 多行错位）', () => {
    const rows = parsePlatformPaste(SAMPLE);
    const r = rows[0];
    expect(r.caseNo).toBe('A3703231200002024065002');
    expect(r.caseName).toBe('6.12非法吸收公众存款案');
    expect(r.controlType).toBe('冻结申请');
    expect(r.requestNo).toBe('3703666320260918093859');
    expect(r.requestDate).toBe('2026-09-18');
    expect(r.pending).toBe(0);
    expect(r.success).toBe(0);
    expect(r.fail).toBe(0);
    expect(r.applyStatus).toBe('已审批');
    expect(r.messageStatus).toBe('已发送');
  });

  it('正确解析含反馈数的第 3 条', () => {
    const rows = parsePlatformPaste(SAMPLE);
    const r = rows[2];
    expect(r.caseNo).toBe('A3703231200002026050005');
    expect(r.caseName).toBe('申金明涉嫌合同诈骗案');
    expect(r.controlType).toBe('常规查询');
    expect(r.pending).toBe(0);
    expect(r.success).toBe(3);
    expect(r.fail).toBe(0);
    expect(r.messageStatus).toBe('已反馈');
  });

  it('查控类型词表与用户确认一致', () => {
    expect(CONTROL_TYPES).toEqual(['常规查询', '冻结申请', '继续冻结申请', '解除冻结申请']);
  });

  it('空输入返回空数组', () => {
    expect(parsePlatformPaste('')).toEqual([]);
    expect(parsePlatformPaste('   \n  ')).toEqual([]);
  });

  it('缺少申请单号/时间的残缺行被丢弃', () => {
    const bad = '\t9\t查看详情状态\t已审批\t已发送\t\tA3703231200002026045999\t\n普通案\n冻结申请\t1\t0\t0\t0';
    const rows = parsePlatformPaste(bad);
    expect(rows.length).toBe(0);
  });

  it('HTML 剪贴板（表格）也能解析', () => {
    const html =
      '<table><tr><td>序号</td><td>操作</td><td>申请状态</td><td>报文状态</td><td>案件校验状态</td><td>案件编号</td><td>案件名称</td><td>查控类型</td><td>任务</td><td>未反馈</td><td>反馈成功</td><td>反馈失败</td><td>申请单号</td><td>创建时间</td></tr>' +
      '<tr><td>1</td><td>查看详情状态</td><td>已审批</td><td>已发送</td><td></td><td>A3703231200002024065002</td><td>6.12非法吸收公众存款案</td><td>冻结申请</td><td>1</td><td>0</td><td>0</td><td>0</td><td>3703666320260918093859</td><td>2026-09-18 09:42:02</td></tr></table>';
    const rows = parsePlatformPaste(html);
    expect(rows.length).toBe(1);
    expect(rows[0].requestNo).toBe('3703666320260918093859');
    expect(rows[0].controlType).toBe('冻结申请');
  });
});

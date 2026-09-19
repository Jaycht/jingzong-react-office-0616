import { describe, expect, it } from 'vitest';
import { DEMO_FLAG, clearDemoData, countDemoData, seedDemoData } from '../utils/demoSeeder';
import { getMassRecords, isDemoRecord } from '../store/massStore';
import { getDailyNotes } from '../store/dailyNotesStore';

describe('演示数据生成器', () => {
  it('覆盖全部业务页签，并为调证登记生成台账口径的申请单', () => {
    clearDemoData();
    const r = seedDemoData(1);

    expect(r.tabs).toBeGreaterThan(35);          // 5 科室 × 23 模块的页签总数
    expect(r.records).toBeGreaterThanOrEqual(r.tabs);
    expect(r.notes).toBeGreaterThan(0);

    const stat = countDemoData();
    expect(stat.records).toBe(r.records);
    expect(stat.notes).toBe(r.notes);

    // 调证登记固定生成 3 条，且带台账关键列
    const reqs = getMassRecords('evidence-request').filter(isDemoRecord);
    expect(reqs.length).toBe(3);
    for (const rec of reqs) {
      expect(String(rec.data.caseName || '').length).toBeGreaterThan(0);
      expect(String(rec.data.requestNo || '')).toMatch(/^DZ/);
      expect(['已提交', '已审批', '已发送', '已反馈']).toContain(String(rec.data.requestStatus));
    }
  });

  it('演示标记写在记录顶层，不污染 data（否则会作为字段显示在时间轴/详情里）', () => {
    clearDemoData();
    seedDemoData(1);

    for (const rec of getMassRecords()) {
      expect(rec.demo).toBe(true);
      expect(rec.data[DEMO_FLAG]).toBeUndefined();
    }
  });

  it('为可重复段生成多条（嫌疑人信息等「可多次添加」的结构可测）', () => {
    clearDemoData();
    const r = seedDemoData(1);
    expect(r.sectionItems).toBeGreaterThan(0);

    const squad = getMassRecords('squad-case');
    expect(squad.length).toBeGreaterThan(0);
    const rec = squad.find((x) => Array.isArray(x.data.suspects));
    expect(rec).toBeTruthy();
    const suspects = rec!.data.suspects as Array<Record<string, unknown>>;
    expect(suspects.length).toBeGreaterThanOrEqual(2);           // 一次生成多条
    for (const s of suspects) {
      expect(String(s.suspectName || '')).toMatch(/^[\u4e00-\u9fa5]某某$/);
      expect(String(s.suspectIdNo || '').length).toBeGreaterThan(0);
    }
    // 段内字段不再写进记录主表（与抽屉保存口径一致）
    expect(rec!.data.suspectName).toBeUndefined();
  });

  it('人员姓名与公司名称均已脱敏，不出现真实姓名与真实品牌', () => {
    clearDemoData();
    seedDemoData(1);

    const REAL_NAMES = ['宋曼', '张晓慧', '高文利', '齐劭豪', '孙彬', '张文伟'];
    const BRANDS = ['格力', '同润', '恒泰', '鑫源', '源通', '华为', '荣耀', '小米', 'OPPO', 'vivo', 'iPhone'];

    const text = JSON.stringify(getMassRecords().map((r) => r.data));
    for (const n of REAL_NAMES) expect(text).not.toContain(n);
    for (const b of BRANDS) expect(text).not.toContain(b);
  });

  it('随手记带 demo 标记，可被识别与清除', () => {
    clearDemoData();
    seedDemoData(1);
    expect(getDailyNotes().filter((n) => n.demo).length).toBeGreaterThan(0);

    const cleared = clearDemoData();
    expect(cleared.records).toBeGreaterThan(0);
    expect(cleared.notes).toBeGreaterThan(0);
    expect(countDemoData()).toEqual({ records: 0, notes: 0 });
  });

  it('重复生成不会互相干扰，清除时一次清干净', () => {
    clearDemoData();
    seedDemoData(1);
    seedDemoData(1);
    const twice = countDemoData().records;
    expect(twice).toBeGreaterThan(0);

    clearDemoData();
    expect(countDemoData()).toEqual({ records: 0, notes: 0 });
    expect(getMassRecords().filter(isDemoRecord)).toHaveLength(0);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { csvToString, exportModuleToExcel, importExcelToModule } from '../utils/excelUtils';
import { saveMassRecord, getMassRecords } from '../store/massStore';
import { indexedDBAdapter } from '../store/adapter';
import { resolveFieldLabel, deriveRecordTitle, pickTitleFieldId } from '../utils/fieldIndex';

const HEADERS = ['项目名称', '受害人姓名', '性别', '身份证号', '联系电话', '投资金额', '登记日期'];

// 拦截 file-saver 的 saveAs，把生成的 Blob 抓出来用于回读校验
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
import { saveAs } from 'file-saver';

describe('csvToString（受害人信息 CSV 导出）', () => {
  it('表头与数据按行分隔（\\r\\n），每项信息落在对应表头列', () => {
    const rows = [
      { '项目名称': '某集资诈骗案', '受害人姓名': '李某某', '性别': '男', '身份证号': '', '联系电话': '1234523423', '投资金额': '', '登记日期': '2026/06/07' },
    ];
    const csv = csvToString(HEADERS, rows);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(HEADERS.join(','));
    expect(lines[1]).toBe('某集资诈骗案,李某某,男,,1234523423,,2026/06/07');
  });

  it('含逗号或换行的字段被双引号包裹，避免破坏列结构', () => {
    const rows = [
      { '项目名称': 'A,B 系列案', '受害人姓名': '张三', '性别': '男', '身份证号': '', '联系电话': '1', '投资金额': '', '登记日期': '2026/01/01' },
    ];
    const csv = csvToString(HEADERS, rows);
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('"A,B 系列案",张三,男,,1,,2026/01/01');
  });

  it('空值保留逗号占位，行数随数据增加', () => {
    const rows = [
      { '项目名称': '案1', '受害人姓名': '甲', '性别': '女', '身份证号': '', '联系电话': '111', '投资金额': '5000', '登记日期': '2026/02/02' },
      { '项目名称': '案2', '受害人姓名': '乙', '性别': '男', '身份证号': '', '联系电话': '222', '投资金额': '', '登记日期': '2026/03/03' },
    ];
    const csv = csvToString(HEADERS, rows);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe('案2,乙,男,,222,,2026/03/03');
  });

  it('默认不带 BOM，withBom 时带 UTF-8 BOM', () => {
    expect(csvToString(HEADERS, []).startsWith('﻿')).toBe(false);
    expect(csvToString(HEADERS, [], { withBom: true }).startsWith('﻿')).toBe(true);
  });
});

const MASS_MODULE = 'mass-statistics';
const MASS_TAB = 'mass-statistics-1';
const MASS_TAB_LABEL = '统计记录';

/** 读取最近一次 saveAs 抓到的 XLSX 工作簿 */
async function lastWorkbook(): Promise<XLSX.WorkBook> {
  const blob = vi.mocked(saveAs).mock.calls.at(-1)![0] as Blob;
  const buf = await blob.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

/** 清空 mass 模块全部记录，保证测试相互隔离 */
function clearMassRecords() {
  indexedDBAdapter.clear('jingzong.mass.records');
}

describe('模块 Excel 导出 / 导入（可重复段往返）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMassRecords();
  });

  it('带可重复段的记录导出为「1 行」，而非按明细展开成多行（修复数据重复）', async () => {
    saveMassRecord(MASS_MODULE, MASS_TAB, {
      caseName: '某非吸案',
      caseNo: 'A001',
      involvedSubjects: [
        { companyName: '甲置业有限公司', involvedCompanyCount: 1 },
        { companyName: '乙实业有限公司', involvedCompanyCount: 2 },
      ],
    });

    exportModuleToExcel(MASS_MODULE, MASS_TAB);
    const wb = await lastWorkbook();
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    // 关键断言：1 条记录 = 1 行（不会出现主字段重复成 2 行）
    expect(rows).toHaveLength(1);
    const row = rows[0] as Record<string, unknown>;
    expect(row['案件名称']).toBe('某非吸案');
    // 两个涉案主体都落在同一行的编号列里
    expect(row['涉案主体统计|公司名称|1']).toBe('甲置业有限公司');
    expect(row['涉案主体统计|公司名称|2']).toBe('乙实业有限公司');
  });

  it('导出文件再次导入时，完全相同的记录被自动跳过（skipped），不产生重复', async () => {
    saveMassRecord(MASS_MODULE, MASS_TAB, {
      caseName: '某非吸案',
      caseNo: 'A001',
      involvedSubjects: [
        { companyName: '甲置业有限公司', involvedCompanyCount: 1 },
        { companyName: '乙实业有限公司', involvedCompanyCount: 2 },
      ],
    });

    exportModuleToExcel(MASS_MODULE, MASS_TAB);
    const wb = await lastWorkbook();
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const file = new File([wbout], 't.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const res = await importExcelToModule(file, MASS_MODULE, MASS_TAB);
    // 数据完全相同 → 跳过 1 条，成功 0（证明导入重建的签名与库中一致）
    expect(res.skipped).toBe(1);
    expect(res.success).toBe(0);
    expect(getMassRecords(MASS_MODULE).filter((r) => r.tabId === MASS_TAB)).toHaveLength(1);
  });

  it('手工构建的含编号列的工作簿导入后，可重复段被正确还原为数组（导入端逆向解析）', async () => {
    const headers = [
      '案件名称', '案件编号',
      '涉案主体统计|涉案公司数量|1', '涉案主体统计|公司名称|1',
      '涉案主体统计|涉案公司数量|2', '涉案主体统计|公司名称|2',
    ];
    const row = {
      '案件名称': '新案', '案件编号': 'B009',
      '涉案主体统计|涉案公司数量|1': 3, '涉案主体统计|公司名称|1': '丙科技有限公司',
      '涉案主体统计|涉案公司数量|2': 1, '涉案主体统计|公司名称|2': '丁商贸有限公司',
    };
    const ws = XLSX.utils.json_to_sheet([row], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, MASS_TAB_LABEL);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const file = new File([wbout], 't2.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const res = await importExcelToModule(file, MASS_MODULE, MASS_TAB);
    expect(res.success).toBe(1);
    const recs = getMassRecords(MASS_MODULE).filter((r) => r.tabId === MASS_TAB);
    expect(recs).toHaveLength(1);
    const data = recs[0].data as Record<string, unknown>;
    expect(data['caseName']).toBe('新案');
    const items = data['involvedSubjects'] as Array<Record<string, unknown>>;
    expect(Array.isArray(items)).toBe(true);
    expect(items).toHaveLength(2);
    expect(items[0].companyName).toBe('丙科技有限公司');
    expect(items[1].companyName).toBe('丁商贸有限公司');
  });
});

// ===================== Task 11：标题「未命名」+ 字段显示英文 修复验证 =====================
// 根因：展示层（CaseTimeline / CaseDetail / GlobalSearch）曾各自维护手写 FIELD_LABELS，
// 法制室「考核管理」的 objectName/responsible/baseScore/deductItem 等从未登记，于是
// 界面把字段 id 原样当标签显示（英文）；标题只认有限字段链，objectName 不在链中 → 整屏「未命名」。
// 改用 fieldIndex 从字段定义派生标签 + TITLE_FIELD_CHAIN 兜底，以下用例钉死修复不回归。
describe('字段标签解析 / 标题推导（Task 11 修复）', () => {
  it('legal-assessment 的 objectName 应解析为中文标签，而非原样英文 id', () => {
    const label = resolveFieldLabel('objectName', 'legal-assessment');
    // 该字段在考核对象(被考核单位/个人)/结果登记(被考核对象)/整改建议(整改对象)三个页签复用同一 id，
    // 取哪个中文标签取决于「后定义覆盖」，但关键是：绝不能再原样显示英文字段 id。
    expect(label).not.toBe('objectName');
    expect(['被考核单位/个人', '被考核对象', '整改对象']).toContain(label);
  });

  it('考核模块的 responsible / baseScore / deductItem 均有中文标签（不漏字段）', () => {
    expect(resolveFieldLabel('responsible', 'legal-assessment')).toBe('责任人');
    expect(resolveFieldLabel('baseScore', 'legal-assessment')).toBe('基础分');
    expect(resolveFieldLabel('deductItem', 'legal-assessment')).toBe('扣分项');
  });

  it('含 objectName 的记录不应再显示「未命名」，标题取该字段值', () => {
    const data = { objectName: '某某中队' } as Record<string, unknown>;
    expect(pickTitleFieldId(data, 'legal-assessment')).toBe('objectName');
    expect(deriveRecordTitle(data, 'legal-assessment')).toBe('某某中队');
  });

  it('空记录仍兜底为「未命名」（行为不变，避免误判）', () => {
    expect(deriveRecordTitle({}, 'legal-assessment')).toBe('未命名');
    expect(deriveRecordTitle(undefined, 'legal-assessment')).toBe('未命名');
  });
});


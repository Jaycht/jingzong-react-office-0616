/**
 * 导入导出 + 备份恢复共享工具函数
 *
 * Excel 为主（用户日常操作），JSON 为辅（完整备份/恢复）
 *
 * 扁平化策略（V2.52.0 起）：
 * - 1 条记录 = 1 行（彻底消除「主字段重复 N 次」导致的导出重复假象）
 * - 无 repeatable section → 仅顶层字段列
 * - 有 repeatable section → 顶层字段 + 每个段按「段名|字段名|序号」编号列展开
 *   （如「涉案主体统计|公司名称|1」「涉案主体统计|涉案金额|1」…）
 *   编号上限取本次导出所有记录里该段的最大明细数；空白模板回退为固定 3 槽。
 * - 导入端逆向解析编号列还原成明细数组，从而「导出→改→再导入」可无损往返。
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { findModule, getBaseModules } from '../moduleConfig';
import { getMassRecords, saveMassRecord, rebuildGlobalIndexes } from '../store/massStore';
import { getOperationLogs } from '../store/operationLogStore';
import { recordFieldValues } from '../store/inputHistoryStore';
import type { FieldDefinition } from '../moduleConfig';
import { localStorageAdapter, indexedDBAdapter } from "../store/adapter";
import type { MassRecord } from '../store/massStore';
import { exportAttachmentSnapshot, importAttachmentSnapshot } from '../store/attachmentStore';
import { notifyDataChanged } from '../store/dataEvents';
import { APP_VERSION } from '../version';
import {
  LEDGER_HEADERS, LEDGER_TITLE, LEDGER_COL_WIDTHS,
  buildLedgerResult, expandRequestLines, ledgerCaseName, requestStatusOf, toLedgerDate,
} from './requestLedger';

// ─── 类型 ─────────────────────────────────────────────

interface ParsedFields {
  /** 顶层的非 section 字段（如 案件名称、受案日期） */
  topLevel: FieldDefinition[];
  /** repeatable section 列表 */
  sections: Array<{
    section: FieldDefinition;
    fields: FieldDefinition[];
  }>;
  /** 非 repeatable 的 section（纯分组，展开时只读取它后面的字段作为顶层字段） */
  groups: Array<{
    section: FieldDefinition;
    fields: FieldDefinition[];
  }>;
}

type RowData = Record<string, unknown>;
type RepeatableItem = Record<string, unknown>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

/**
 * 本地时区的「yyyy-MM-dd_HH-mm-ss」时间戳，用于导出文件名，避免：
 * 1) 同一天多次导出文件名重复（涛哥反馈）；
 * 2) 旧代码用 toISOString() 取的是 UTC 日期，中国时区 0:00–8:00 会显示成前一天。
 */
function localTimestamp(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}

// ─── 字段结构解析 ────────────────────────────────────

/** 解析字段定义，分离出顶层字段和各 repeatable section 的子字段 */
function parseFieldDefs(fields: FieldDefinition[]): ParsedFields {
  const result: ParsedFields = { topLevel: [], sections: [], groups: [] };
  let currentRepeatable: { section: FieldDefinition; fields: FieldDefinition[] } | null = null;

  for (const f of fields) {
    if (f.type === 'section') {
      currentRepeatable = null;
      if (f.repeatable) {
        currentRepeatable = { section: f, fields: [] };
        result.sections.push(currentRepeatable);
      } else {
        result.groups.push({ section: f, fields: [] });
      }
    } else if (f.type === 'attachment') {
      // 附件在导出中忽略（仅输出文件名计数）
    } else {
      if (currentRepeatable) {
        currentRepeatable.fields.push(f);
      } else {
        result.topLevel.push(f);
      }
    }
  }
  return result;
}

// ─── 可重复段 schema ───────────────────────────────

/** 段名 / 字段名 / 序号 三段的固定分隔符（确保不出现在中文 label 中） */
const SECTION_SEP = '|';
/** 空白模板 / 空数据导出时，每个可重复段默认预留的填写槽位数 */
const DEFAULT_TEMPLATE_SECTION_SLOTS = 3;

interface RepeatableSection {
  section: FieldDefinition;
  fields: FieldDefinition[];
  listName: string;
}

/** 取出某 tab 的全部可重复段（含 listName） */
function getRepeatableSections(fields: FieldDefinition[]): RepeatableSection[] {
  const parsed = parseFieldDefs(fields);
  return parsed.sections.map((s) => ({
    section: s.section,
    fields: s.fields,
    listName: s.section.listName || 'items',
  }));
}

/** 计算本次导出各段需要展开的最大明细数 */
function computeMaxItems(records: MassRecord[], sections: RepeatableSection[]): Record<string, number> {
  const max: Record<string, number> = {};
  for (const s of sections) max[s.listName] = 0;
  for (const rec of records) {
    const data = rec.data || {};
    for (const s of sections) {
      const raw = data[s.listName];
      const arr = Array.isArray(raw) ? raw : [];
      if (arr.length > (max[s.listName] || 0)) max[s.listName] = arr.length;
    }
  }
  return max;
}

/** 解析各段编号上限：有数据取数据最大值，无数据回退为默认槽位（空白模板也好填） */
function resolveMaxItems(sections: RepeatableSection[], records: MassRecord[]): Record<string, number> {
  if (records.length > 0) return computeMaxItems(records, sections);
  const m: Record<string, number> = {};
  for (const s of sections) m[s.listName] = DEFAULT_TEMPLATE_SECTION_SLOTS;
  return m;
}

// ─── Excel 表头生成 ─────────────────────────────────

/** 由字段定义 + 各段编号上限生成 Excel 表头（标签数组） */
function buildHeaders(fields: FieldDefinition[], sections: RepeatableSection[], maxItems: Record<string, number>): string[] {
  const parsed = parseFieldDefs(fields);
  const headers: string[] = parsed.topLevel.map((f) => f.label);
  for (const s of sections) {
    const n = maxItems[s.listName] || 0;
    for (let j = 1; j <= n; j++) {
      for (const f of s.fields) {
        headers.push(`${s.section.label}${SECTION_SEP}${f.label}${SECTION_SEP}${j}`);
      }
    }
  }
  return headers;
}

/** 获取模块所有 tab 的字段 + label 映射 */
function getModuleTabs(moduleId: string): Array<{ tabId: string; label: string; fields: FieldDefinition[] }> {
  const mod = findModule(moduleId, getBaseModules());
  if (!mod) return [];
  return mod.tabs.map((t) => ({ tabId: t.id, label: t.label, fields: t.fields || [] }));
}

// ─── 数据扁平化 ─────────────────────────────────────

/**
 * 将单条 MassRecord 展平为「一行」Excel 数据。
 * 可重复段按「段名|字段名|序号」编号列展开，序号上限由 maxItems 统一（保证同表同列）。
 * 1 条记录永远只产出 1 行 —— 这是消除导出重复、并保证导入往返无损的关键。
 */
function flattenRecord(
  record: MassRecord,
  fields: FieldDefinition[],
  sections: RepeatableSection[],
  maxItems: Record<string, number>,
): RowData {
  const parsed = parseFieldDefs(fields);
  const data = record.data || {};

  // 顶层字段
  const row: RowData = {};
  for (const f of parsed.topLevel) {
    row[f.label] = data[f.id] ?? '';
  }

  // 可重复段：编号列展开
  for (const s of sections) {
    const raw = data[s.listName];
    const arr = Array.isArray(raw) ? raw : [];
    const n = maxItems[s.listName] || arr.length;
    for (let j = 1; j <= n; j++) {
      const item =
        arr[j - 1] && typeof arr[j - 1] === 'object' && arr[j - 1] !== null
          ? (arr[j - 1] as RepeatableItem)
          : {};
      for (const f of s.fields) {
        row[`${s.section.label}${SECTION_SEP}${f.label}${SECTION_SEP}${j}`] = item[f.id] ?? '';
      }
    }
  }

  return row;
}

// ─── Excel 写入（导出） ────────────────────────────

/** 创建工作簿并触发下载 */
function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, filename);
}

/** 安全的下载辅助：优先 saveAs，回退创建临时 <a> 标签 */
function safeDownload(wb: XLSX.WorkBook, filename: string) {
  let wbout: ArrayBuffer;
  try {
    wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  } catch (writeErr) {
    console.error('[excelUtils] XLSX.write 失败:', writeErr);
    return;
  }
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  try {
    saveAs(blob, filename);
  } catch {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (fallbackErr) {
      console.error('[excelUtils] 浏览器下载失败:', fallbackErr);
    }
  }
}

/**
 * 导出指定模块的全部数据到 Excel
 * @param moduleId 模块 ID
 * @param tabId 可选，指定标签页
 */
export function exportModuleToExcel(moduleId: string, tabId?: string): void {
  const tabs = getModuleTabs(moduleId);
  if (tabs.length === 0) {
    console.warn(`[excelUtils] 未找到模块: ${moduleId}`);
    return;
  }

  const wb = XLSX.utils.book_new();
  const records = getMassRecords(moduleId);

  // 按 tab 分组导出
  const targetTabs = tabId ? tabs.filter((t) => t.tabId === tabId) : tabs;

  for (const tab of targetTabs) {
    const tabRecords = records.filter((r) => r.tabId === tab.tabId);

    if (tabRecords.length === 0 && !tabId) continue;

    const sections = getRepeatableSections(tab.fields);
    const maxItems = resolveMaxItems(sections, tabRecords);
    const headers = buildHeaders(tab.fields, sections, maxItems);
    if (headers.length === 0) continue;

    // 展平所有记录（1 条记录 = 1 行）
    const allRows: RowData[] = [];
    for (const rec of tabRecords) {
      allRows.push(flattenRecord(rec, tab.fields, sections, maxItems));
    }

    // 如果没有数据，建一个空模板行，便于后续填表导入
    if (allRows.length === 0) {
      const emptyRow: RowData = {};
      for (const h of headers) emptyRow[h] = '';
      allRows.push(emptyRow);
    }

    const ws = XLSX.utils.json_to_sheet(allRows, { header: headers });

    // 设置列宽
    ws['!cols'] = headers.map(() => ({ wch: 16 }));

    // 工作表名最多 31 字符
    const sheetName = tab.label.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const module = findModule(moduleId, getBaseModules());
  const filename = `${module?.label || moduleId}_${localTimestamp()}.xlsx`;
  downloadWorkbook(wb, filename);
}

/**
 * 导出所有模块的全部数据到 Excel（数据中心“全部记录”）
 * 每个模块一个 sheet，sheet 名取模块名简称
 */
export function exportAllModulesToExcel(): void {
  try {
    const allRecords = getMassRecords();
    const wb = XLSX.utils.book_new();

    if (allRecords.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['暂无数据']]);
      XLSX.utils.book_append_sheet(wb, ws, '说明');
      safeDownload(wb, `全部工作记录_${localTimestamp()}.xlsx`);
      return;
    }

    const grouped: Record<string, MassRecord[]> = {};
    for (const r of allRecords) {
      if (!grouped[r.moduleId]) grouped[r.moduleId] = [];
      grouped[r.moduleId].push(r);
    }

    const allModules = getBaseModules();

    for (const [moduleId, records] of Object.entries(grouped)) {
      const mod = allModules.find((m) => m.id === moduleId);
      const tabs = mod?.tabs || [];

      for (const tab of tabs) {
        try {
          const fields = tab.fields || [];
          const sections = getRepeatableSections(fields);
          const maxItems = resolveMaxItems(sections, records);
          const headers = buildHeaders(fields, sections, maxItems);
          if (headers.length === 0) continue;

          const tabRecords = records.filter((r) => r.tabId === tab.id);
          if (tabRecords.length === 0) continue;

          const allRows: RowData[] = [];
          for (const rec of tabRecords) {
            allRows.push(flattenRecord(rec, fields, sections, maxItems));
          }

          if (allRows.length === 0) continue;

          const ws = XLSX.utils.json_to_sheet(allRows, { header: headers });
          ws['!cols'] = headers.map(() => ({ wch: 16 }));

          const sheetName = `${mod?.label || moduleId}_${tab.label}`.slice(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        } catch (tabErr) {
          console.warn(`[excelUtils] 导出模块 ${moduleId} 标签 ${tab.label} 时跳过:`, tabErr);
        }
      }
    }

    safeDownload(wb, `全部工作记录_${localTimestamp()}.xlsx`);
  } catch (err) {
    console.error('[excelUtils] exportAllModulesToExcel error:', err);
  }
}

/**
 * 导出选中的记录到 Excel
 * @param recordIds 要导出的记录 ID 数组
 * @param moduleId 模块 ID
 * @param tabId 标签页 ID
 */
export function exportSelectedRecords(recordIds: string[], moduleId: string, tabId: string): void {
  const allRecords = getMassRecords(moduleId);
  const selected = allRecords.filter((r) => recordIds.includes(r.id) && r.tabId === tabId);
  if (selected.length === 0) return;

  const tabs = getModuleTabs(moduleId);
  const tab = tabs.find((t) => t.tabId === tabId);
  if (!tab) return;

  const mod = findModule(moduleId, getBaseModules());
  const sections = getRepeatableSections(tab.fields);
  const maxItems = resolveMaxItems(sections, selected);
  const headers = buildHeaders(tab.fields, sections, maxItems);
  if (headers.length === 0) return;

  const allRows: RowData[] = [];
  for (const rec of selected) {
    allRows.push(flattenRecord(rec, tab.fields, sections, maxItems));
  }

  const ws = XLSX.utils.json_to_sheet(allRows, { header: headers });
  ws['!cols'] = headers.map(() => ({ wch: 16 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tab.label.slice(0, 31));
  downloadWorkbook(wb, `${mod?.label || moduleId}_选中记录_${localTimestamp()}.xlsx`);
}

/**
 * 导出案件台账到 Excel
 */
export function exportCasesToExcel(): void {
  // 迁移后 squad-case 使用 massStore，复用通用导出
  exportModuleToExcel('squad-case', 'squad-case-1');
}

/**
 * 导出「资金查控情况登记台账」（单位周五报送模板）
 * 十列口径与列表页、粘贴导入共用 utils/requestLedger，保证「列表所见 = 导出所得」。
 * 一条调证登记展开为若干「申请单」行（兼容旧版 requestItems 多申请单数据）。
 *
 * 注：getMassRecords 已按 moduleId 过滤，无需再按 tabId 过滤 ——
 * evidence-request 为 singleModule，真实 tabId 是 'evidence-request-1'，
 * 若误按 'evidence-request' 过滤会把正常登记的记录全部漏掉。
 */
export function exportRequestLedger(): void {
  const records = getMassRecords('evidence-request');
  const aoa: (string | number)[][] = [[LEDGER_TITLE], [...LEDGER_HEADERS]];

  let idx = 0;
  for (const rec of records) {
    const data = (rec.data || {}) as Record<string, unknown>;
    const caseName = ledgerCaseName(data);
    const result = buildLedgerResult(data);
    const feedbackDate = toLedgerDate(data.feedbackDate);
    // 「备注」＝ 调证状态（四档之一）：与列表取同一个函数，
    // 旧数据里「申请状态：X；报文状态：Y」的标注串导出时也会折叠成一档，
    // 保证「列表所见即导出所得」。
    const remarks = requestStatusOf(data);

    for (const line of expandRequestLines(data)) {
      idx++;
      aoa.push([
        idx,
        caseName,
        toLedgerDate(line.requestDate),
        String(line.applyReason ?? ''),
        String(line.applicant ?? ''),
        String(line.requestNo ?? ''),
        feedbackDate,
        result,
        String(line.requester ?? ''),
        remarks,
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // 标题行合并 A1:J1
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
  ws['!cols'] = LEDGER_COL_WIDTHS.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '资金查控台账');
  safeDownload(wb, `资金查控情况登记台账_${localTimestamp()}.xlsx`);
}

/**
 * 下载指定模块的空模板（仅表头，无数据）。
 * 模板是「便捷录入」的核心载体：无数据时导出空白表 → 用户在 Excel 里填好 → 再导入即生成记录。
 * 每个模板工作簿额外附一张「填写说明」表，把用法写进文件本身，导入时该表会被自动忽略。
 */
export function downloadModuleTemplate(moduleId: string, tabId?: string): void {
  const tabs = getModuleTabs(moduleId);
  if (tabs.length === 0) return;

  const wb = XLSX.utils.book_new();

  const targetTabs = tabId ? tabs.filter((t) => t.tabId === tabId) : tabs;

  for (const tab of targetTabs) {
    const sections = getRepeatableSections(tab.fields);
    // 模板无数据：用默认槽位（3）展开可重复段列，保证用户有列可填
    const maxItems = resolveMaxItems(sections, []);
    const headers = buildHeaders(tab.fields, sections, maxItems);
    if (headers.length === 0) continue;

    const emptyRow: RowData = {};
    for (const h of headers) emptyRow[h] = '';

    const ws = XLSX.utils.json_to_sheet([emptyRow], { header: headers });
    ws['!cols'] = headers.map(() => ({ wch: 16 }));
    const sheetName = `${tab.label}模板`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 附填写说明表（导入时按表名忽略）
    const guide = buildTemplateGuide(tab.label, sections);
    const guideWs = XLSX.utils.aoa_to_sheet(guide);
    guideWs['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, guideWs, '填写说明');
  }

  const mod = findModule(moduleId, getBaseModules());
  const filename = `${mod?.label || moduleId}_导入模板_${localTimestamp()}.xlsx`;
  downloadWorkbook(wb, filename);
}

/** 生成模板「填写说明」表内容（二维数组） */
function buildTemplateGuide(tabLabel: string, sections: RepeatableSection[]): (string | number)[][] {
  const lines: (string | number)[][] = [
    ['【导入模板填写说明】'],
    [`本表是「${tabLabel}」的空白录入模板，按以下步骤即可批量生成记录：`],
    ['1. 在「' + tabLabel + '模板」工作表中，每一行对应一条记录；先填好各列（列名即字段名）。'],
    ['2. 普通字段（如案件名称、日期）每列填一个值；日期请填 yyyy-MM-dd 文本。'],
    ['3. 可重复段（一个记录下有多条明细，如嫌疑人、涉案主体）已按「段名|字段名|序号」展开为编号列：'],
  ];
  if (sections.length > 0) {
    for (const s of sections) {
      lines.push([`   · ${s.section.label}：最多可填 ${DEFAULT_TEMPLATE_SECTION_SLOTS} 条，列如「${s.section.label}|${s.fields[0]?.label || '字段'}|1」、「${s.section.label}|${s.fields[0]?.label || '字段'}|2」…`]);
    }
    lines.push(['   若实际多于 ' + DEFAULT_TEMPLATE_SECTION_SLOTS + ' 条，可分多行（每行仍是同一条记录的延续，靠相同的主字段识别）或多次导入。']);
  } else {
    lines.push(['   本模块没有可重复段，直接逐列填写即可。']);
  }
  lines.push(['4. 保存为 .xlsx 后，回到本系统的「导入导出」页，选本模块导入即可。']);
  lines.push(['5. 导入时系统会自动跳过与已有记录完全相同的行，避免重复；其余一律新增。']);
  lines.push(['注意：本「填写说明」表无需修改，导入时会被自动忽略。']);
  return lines;
}

/** 表名是否为导入时应忽略的说明类表 */
function isGuideSheet(name: string): boolean {
  return /说明|README|readme|填写说明/.test(name);
}

// ─── Excel 读取（导入） ────────────────────────────

/**
 * Excel 导入收尾：导入进来的值并入全局历史池，并重建「案件/线索、嫌疑人」全局索引。
 *
 * 导入是**绕过抽屉表单的批量写入**，不调用它的话，导入的案件信息只在本模块可见，
 * 别的模块的案件名称/编号下拉看不到、选不中，也自动填充不了。
 */
function finalizeExcelImport(
  entries: Array<readonly [string, string]>,
  success: number,
): void {
  if (success <= 0) return;
  recordFieldValues(entries);
  rebuildGlobalIndexes();
}

/**
 * 解析导入的 Excel 文件并保存到指定模块
 * @param file 上传的文件
 * @param moduleId 目标模块 ID
 * @param tabId 可选目标标签页 ID
 * @returns 导入统计
 */
export async function importExcelToModule(
  file: File,
  moduleId: string,
  tabId?: string,
): Promise<{ success: number; failed: number; skipped: number; errors: string[] }> {
  const result = { success: 0, failed: 0, skipped: 0, errors: [] as string[] };
  // 导入值 → 全局历史池（循环里攒，最后一次性落盘）
  const historyEntries: Array<readonly [string, string]> = [];

  // ── squad-case：数据已迁移到 massStore ──
  if (moduleId === 'squad-case') {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      // 跳過「填写说明」等说明类表，取第一个数据表
      const sheetName = wb.SheetNames.find((n) => !isGuideSheet(n)) || wb.SheetNames[0];
      if (!sheetName) { result.errors.push('Excel 文件中没有工作表'); return result; }
      const ws = wb.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: true });
      if (jsonRows.length === 0) { result.errors.push('Excel 文件中没有有效数据'); return result; }

      // Excel 列名 → 字段映射
      const LABEL_TO_FIELD: Record<string, string> = {
        '案件编号': 'caseNo', '案件名称': 'caseName', '案件类型': 'caseType',
        '涉案金额(万元)': 'totalAmount', '受害人数': 'victimCount',
        '案件来源': 'caseSource', '受案日期': 'receiveDate', '立案日期': 'filingDate',
        '承办人': 'leadOfficer', '协办人': 'assistOfficer',
        '结案日期': 'caseCloseDate', '办理状态': 'progressStatus',
        '受/立案文书号': 'filingDocNo', '不予立案日期': 'noFilingDate',
        '主办民警': 'leadOfficer', '协办民警': 'assistOfficer',
        '涉案总金额(万)': 'totalAmount', '涉案总金额（万元）': 'totalAmount',
      };

      for (const row of jsonRows) {
        try {
          const data: Record<string, string> = {};
          for (const [label, value] of Object.entries(row)) {
            const field = LABEL_TO_FIELD[label];
            if (field) data[field] = String(value ?? '');
          }
          if (!data.caseName && !data.caseNo) {
            result.failed++;
            result.errors.push('缺少案件名称或案件编号');
            continue;
          }
          saveMassRecord('squad-case', 'squad-case-1', data);
          for (const [k, v] of Object.entries(data)) {
            historyEntries.push([k, String(v ?? '')]);
          }
          result.success++;
        } catch {
          result.failed++;
        }
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : '导入 squad-case 失败');
    }
    finalizeExcelImport(historyEntries, result.success);
    return result;
  }

  // ── 通用导入流程 ──
  const tabs = getModuleTabs(moduleId);
  if (tabs.length === 0) {
    result.errors.push(`未找到模块: ${moduleId}`);
    return result;
  }

  const targetTabs = tabId ? tabs.filter((t) => t.tabId === tabId) : tabs;

  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    for (const tab of targetTabs) {
      // 找匹配的 sheet（按标签名匹配），跳过「填写说明」等说明类表
      const sheetName = wb.SheetNames.find(
        (name) => !isGuideSheet(name) && (name.includes(tab.label) || tab.label.includes(name)),
      );
      if (!sheetName) continue;

      const ws = wb.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<RowData>(ws, { defval: '', raw: true });
      if (jsonRows.length === 0) continue;

      // 构建 label → fieldId 映射；取出可重复段结构（用于解析编号列）
      const fieldMap = buildFieldLabelMap(tab.fields);
      const sections = getRepeatableSections(tab.fields);

      // 已存在记录签名集合：用于「完全相同的记录自动跳过」，避免把导出文件原样再导一遍产生重复
      const existingSigs = new Set(
        getMassRecords(moduleId)
          .filter((r) => r.tabId === tab.tabId)
          .map((r) => recordSignature(r.data || {})),
      );

      for (const row of jsonRows) {
        try {
          const data: RowData = {};
          // 段明细暂存：listName -> (序号 -> fieldId->value)
          const sectionBuckets: Record<string, Record<number, RowData>> = {};

          for (const [label, value] of Object.entries(row)) {
            const sec = parseSectionHeader(label, sections);
            if (sec) {
              // 保留原始类型（数字/日期），仅用 String 判空；不要主动 stringify，否则会破坏数值型字段的签名一致性与数据保真
              const v = value ?? '';
              if (!sectionBuckets[sec.listName]) sectionBuckets[sec.listName] = {};
              if (!sectionBuckets[sec.listName][sec.index]) sectionBuckets[sec.listName][sec.index] = {};
              sectionBuckets[sec.listName][sec.index][sec.fieldId] = v;
              continue;
            }
            const fieldId = fieldMap[label];
            if (fieldId) data[fieldId] = value;
          }

          // 还原可重复段数组（仅保留有非空字段的槽位）
          for (const s of sections) {
            const bucket = sectionBuckets[s.listName];
            if (!bucket) continue;
            const maxIdx = Math.max(0, ...Object.keys(bucket).map((k) => Number(k)));
            const arr: RepeatableItem[] = [];
            for (let j = 1; j <= maxIdx; j++) {
              const item = bucket[j];
              if (item && Object.values(item).some((v) => String(v ?? '').trim() !== '')) {
                arr.push(item);
              }
            }
            if (arr.length > 0) data[s.listName] = arr;
          }

          // 完全相同的记录跳过
          const sig = recordSignature(data);
          if (existingSigs.has(sig)) {
            result.skipped++;
            continue;
          }

          saveMassRecord(moduleId, tab.tabId, data);
          for (const [k, v] of Object.entries(data)) {
            if (typeof v === 'string') historyEntries.push([k, v]);
          }
          result.success++;
        } catch (err) {
          result.failed++;
          result.errors.push(`行 ${result.success + result.failed}: ${getErrorMessage(err)}`);
        }
      }
    }
  } catch (err) {
    result.errors.push(`文件解析失败: ${getErrorMessage(err)}`);
  }

  finalizeExcelImport(historyEntries, result.success);
  return result;
}

/** 从字段定义构建 label → id 映射 */
function buildFieldLabelMap(fields: FieldDefinition[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of fields) {
    if (f.type !== 'section' && f.type !== 'attachment') {
      map[f.label] = f.id;
    }
  }
  return map;
}

/** 解析「段名|字段名|序号」形式的导出列头，逆向还原为段明细的一格 */
function parseSectionHeader(
  label: string,
  sections: RepeatableSection[],
): { listName: string; fieldId: string; index: number } | null {
  const parts = label.split(SECTION_SEP);
  if (parts.length !== 3) return null;
  const [sl, fl, idxStr] = parts;
  if (!/^\d+$/.test(idxStr)) return null;
  const s = sections.find((x) => x.section.label === sl);
  if (!s) return null;
  const f = s.fields.find((x) => x.label === fl);
  if (!f) return null;
  return { listName: s.listName, fieldId: f.id, index: parseInt(idxStr, 10) };
}

/**
 * 规范化任意值为稳定字符串：数组保持元素顺序；对象按键名排序（与插入顺序无关），
 * 且跳过空字符串 / 空数组 / 内部键（__ 开头）——与 recordSignature 顶层过滤口径一致，
 * 这样「抽屉表单保存的记录」与「导出→再导入重建的记录」（后者会多出大量空字段键）
 * 也能生成完全相同的签名，导入时才不会漏判「完全相同的记录」。
 */
function canonical(v: unknown): string {
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return '[' + v.map(canonical).join(',') + ']';
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o)
      .filter((k) => {
        if (k.startsWith('__')) return false;
        const val = o[k];
        if (val == null) return false;
        if (typeof val === 'string' && val.trim() === '') return false;
        if (Array.isArray(val) && val.length === 0) return false;
        return true;
      })
      .sort();
    return '{' + keys.map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',') + '}';
  }
  return JSON.stringify(v);
}

/**
 * 记录签名：把一条记录的「非空字段」规范化为稳定字符串，用于导入时识别「完全相同的记录」并跳过，
 * 防止把「导出文件原样再导入」变成加倍重复。内部键（__demo 等）不参与签名。
 */
function recordSignature(data: Record<string, unknown>): string {
  const entries: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('__')) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      entries.push([k, canonical(v)]);
    } else if (typeof v === 'string') {
      if (v.trim() === '') continue;
      entries.push([k, v]);
    } else if (v != null) {
      entries.push([k, String(v)]);
    }
  }
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return entries.map(([k, v]) => `${k}=${v}`).join('␟');
}

// ─── JSON 备份与恢复 ───────────────────────────────

const BACKUP_META_KEY = 'jingzong.backup.meta';

interface BackupMeta {
  id: string;
  name: string;
  time: string;
  size: string;
  type: 'auto' | 'manual';
}

/**
 * 生成全量 JSON 备份
 * 读取所有 jingzong.* 开头的 localStorage key + IndexedDB 中的数据
 */
/**
 * 生成全量 JSON 备份
 * 读取所有 jingzong.* 开头的 localStorage key + IndexedDB 中的数据
 * @returns true=备份已生成，false=用户取消或失败
 */
export async function generateBackup(): Promise<boolean> {
  const data: RowData = {};

  // 1) 读取 localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('jingzong.')) {
      try {
        data[key] = localStorageAdapter.getItem(key, '');
      } catch {
        data[key] = localStorageAdapter.getItem<string>(key, "");
      }
    }
  }

  // 2) 读取 IndexedDB 中的数据（dailyNotes、massRecords、drafts 等）
  const idbKeys = indexedDBAdapter.keys('jingzong.');
  for (const key of idbKeys) {
    try {
      const val = indexedDBAdapter.getItem(key, null);
      if (val !== null && val !== undefined) {
        data[key] = val;
      }
    } catch {}
  }

  const attachments = await exportAttachmentSnapshot();

  const backup = {
    version: '2.1',
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    idbKeys,
    data,
    attachments,
  };

  const json = JSON.stringify(backup, null, 2);
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
  const defaultName = `jingzong_备份_${timestamp}.json`.replace(/[\\/:*?"<>|]/g, '-');

  // Electron 环境：弹出原生保存对话框，让用户选择任意路径（如 U 盘/备份文件夹）
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
  if (api?.showSaveDialog) {
    try {
      const buffer = Array.from(new TextEncoder().encode(json));
      const res = await api.showSaveDialog(defaultName, buffer);
      if (res.canceled) return false;
      if (res.success) {
        saveBackupMeta(timestamp);
        return true;
      }
      // 写入失败则回退到浏览器下载
    } catch {
      // 回退到浏览器下载
    }
  }

  // 浏览器环境（或非 Electron）回退：直接触发下载到默认下载目录
  const blob = new Blob([json], { type: 'application/json' });
  saveAs(blob, defaultName);
  saveBackupMeta(timestamp);
  return true;
}

/** 备份文件头部预览信息（用于恢复前确认弹窗） */
export interface BackupPreview {
  valid: boolean;
  createdAt?: string;
  appVersion?: string;
  recordCount?: number;
  attachmentCount: number;
  sizeLabel: string;
  error?: string;
}

/** 解析备份文件头部，提取元信息（不依赖附件二进制大小，仅统计数量） */
export async function previewBackupFile(file: File): Promise<BackupPreview> {
  const sizeKB = file.size / 1024;
  const sizeLabel = sizeKB < 1024 ? `${sizeKB.toFixed(0)}KB` : `${(sizeKB / 1024).toFixed(1)}MB`;
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    if (!backup || typeof backup !== 'object' || !backup.data) {
      return { valid: false, attachmentCount: 0, sizeLabel, error: '无效的备份文件格式' };
    }
    const data = backup.data as Record<string, unknown>;
    const records = Array.isArray(data['jingzong.mass.records'])
      ? (data['jingzong.mass.records'] as unknown[]).length
      : undefined;
    const attachments = Array.isArray(backup.attachments) ? backup.attachments.length : 0;
    return {
      valid: true,
      createdAt: backup.createdAt,
      appVersion: backup.appVersion,
      recordCount: records,
      attachmentCount: attachments,
      sizeLabel,
    };
  } catch (err) {
    return {
      valid: false,
      attachmentCount: 0,
      sizeLabel,
      error: err instanceof Error ? err.message : '备份文件解析失败',
    };
  }
}

/** 记录备份到 localStorage 元信息列表 */
function saveBackupMeta(timestamp: string): void {
  const metas = getBackupMetas();
  const meta: BackupMeta = {
    id: `backup-${Date.now()}`,
    name: `手动备份_${timestamp.replace(/[_:-]/g, '')}`,
    time: new Date().toISOString().slice(0, 16).replace('T', ' '),
    size: '—',
    type: 'manual',
  };
  metas.unshift(meta);
  // 保留最近 30 条
  while (metas.length > 30) metas.pop();
  localStorageAdapter.setItem(BACKUP_META_KEY, metas);
}

/** 获取备份元信息列表 */
export function getBackupMetas(): BackupMeta[] {
  try {
    const raw = localStorageAdapter.getItem(BACKUP_META_KEY, "[]");
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return JSON.parse(raw);
    return [];
  } catch {
    return [];
  }
}

/** 删除一条备份元信息 */
export function deleteBackupMeta(id: string): void {
  const metas = getBackupMetas().filter((m) => m.id !== id);
  localStorageAdapter.setItem(BACKUP_META_KEY, metas);
}

/**
 * 从 JSON 文件恢复数据
 */
export async function restoreFromJson(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    if (!backup.version || !backup.data || typeof backup.data !== 'object') {
      return { success: false, message: '无效的备份文件格式' };
    }

    // 需要写回 IndexedDB 的 key 列表：优先使用备份时记录的清单，
    // 旧备份无此字段则回退到已知键（dailyNotes/mass.records），并兜底 draft.*，避免漏恢复。
    const backupIdbKeys: string[] = Array.isArray(backup.idbKeys)
      ? backup.idbKeys
      : ['jingzong.dailyNotes', 'jingzong.mass.records'];

    // —— 非破坏性恢复（V2.41.17 修复 #3/#4）——
    // 1) 先对当前数据做内存快照；写回失败则整体回滚，绝不「先清空再失败」导致数据全丢。
    const snapshotLocal: Record<string, unknown> = {};
    const snapshotIdb: Record<string, unknown> = {};
    for (const k of localStorageAdapter.keys('jingzong.')) {
      snapshotLocal[k] = localStorageAdapter.getItem(k, null);
    }
    for (const k of indexedDBAdapter.keys('jingzong.')) {
      snapshotIdb[k] = indexedDBAdapter.getItem(k, null);
    }
    const rollback = () => {
      localStorageAdapter.clear('jingzong.');
      indexedDBAdapter.clear('jingzong.');
      for (const [k, v] of Object.entries(snapshotLocal)) {
        if (v !== null && v !== undefined) localStorageAdapter.setItem(k, v);
      }
      for (const [k, v] of Object.entries(snapshotIdb)) {
        if (v !== null && v !== undefined) indexedDBAdapter.setItem(k, v);
      }
    };

    try {
      // 2) 清空并写回备份数据
      localStorageAdapter.clear('jingzong.');
      indexedDBAdapter.clear('jingzong.');

      let count = 0;
      for (const [key, value] of Object.entries(backup.data)) {
        if (key.startsWith('jingzong.') && value !== undefined) {
          // 写入 localStorage
          localStorageAdapter.setItem(key, value);
          count++;

          // 写入 IndexedDB（业务主存储）：以备份清单为准，兼容旧备份再兜底 draft.*
          if (backupIdbKeys.includes(key) || key.startsWith('jingzong.draft.')) {
            indexedDBAdapter.setItem(key, value);
          }
        }
      }

      // 3) 重建索引
      try {
        const { rebuildCaseIndex, rebuildSuspectIndex } = await import('../store/inputHistoryStore');
        const records = indexedDBAdapter.getItem('jingzong.mass.records', []);
        if (Array.isArray(records) && records.length > 0) {
          rebuildCaseIndex(records);
          rebuildSuspectIndex(records);
        }
      } catch { /* ignore */ }

      // 4) 附件恢复：失败不致命，仅提示，不再因附件问题导致整库数据丢失
      let attachmentMessage = '';
      if (Array.isArray(backup.attachments)) {
        try {
          const attachmentCount = await importAttachmentSnapshot(backup.attachments);
          attachmentMessage = `，${attachmentCount} 个附件`;
        } catch (attErr) {
          console.warn('[restore] 附件恢复失败，已保留其他数据：', attErr);
          attachmentMessage = '（附件恢复失败，已保留其余数据）';
        }
      }

      // 通知各依赖 getMassRecords() 的组件重新读取（仪表盘/预警等）
      notifyDataChanged();

      return { success: true, message: `成功恢复 ${count} 项数据${attachmentMessage}` };
    } catch (writeErr) {
      // 写回阶段出错：回滚到快照，原数据不丢失
      try { rollback(); } catch { /* ignore */ }
      return { success: false, message: `恢复失败，已回滚至恢复前状态（原数据未丢失）：${getErrorMessage(writeErr)}` };
    }
  } catch (err) {
    return { success: false, message: `恢复失败: ${getErrorMessage(err)}` };
  }
}

// ─── CSV / JSON 导出辅助 ────────────────────────────

/** 导出操作日志为 JSON（读取 operationLogStore 中的真实数据） */
export function exportOperationLog(): void {
  const logs = getOperationLogs();
  const json = logs.length > 0 ? JSON.stringify(logs, null, 2) : JSON.stringify([]);
  const blob = new Blob([json], { type: 'application/json' });
  saveAs(blob, `操作日志_${localTimestamp()}.json`);
}

/** 将表头与行数据序列化为 CSV 文本（表头为第一行，每条数据一行，\r\n 分隔，确保每项信息落在对应表头列） */
export function csvToString(headers: string[], rows: RowData[], options?: { withBom?: boolean }): string {
  const csvRows = [headers.join(',')];
  for (const row of rows) {
    const vals = headers.map((h) => {
      const v = row[h] ?? '';
      const str = String(v);
      // 含逗号、引号或换行时包裹，避免破坏列结构
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(vals.join(','));
  }
  const text = csvRows.join('\r\n');
  return options?.withBom ? '\uFEFF' + text : text;
}

/** 导出 CSV 文件（用于"受害人信息CSV"等场景） */
export function exportCsv(headers: string[], rows: RowData[], filename: string): void {
  const blob = new Blob([csvToString(headers, rows, { withBom: true })], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}_${localTimestamp()}.csv`);
}


/**
 * 字段索引 —— 从 moduleConfig 的字段定义派生的「字段 id → 中文标签」索引。
 *
 * 为什么需要它：
 *   CaseDetail / GlobalSearch / CaseTimeline 过去各自维护一份**手写**的 FIELD_LABELS 映射
 *   （src/constants/fieldLabels.ts），字段一多就必然漏 —— 法制室「考核管理」的
 *   objectName / objectType / responsible / baseScore / deductItem、大队办公室
 *   「公文处理」的 docTitle / docType / urgentLevel / handleStatus、党建与考勤的
 *   lifeName / lifeDate / lifeType / rectification 从来没有被登记过，
 *   于是界面把字段 id 原样当成标签显示出来，用户看到的就是一串英文。
 *
 * 字段的真名只有一个来源 —— moduleConfig 里的字段定义（f('objectName', '被考核对象')）。
 * 这里把它抽成索引：任何模块新增字段都自动带上中文标签，不需要再维护第二份映射表。
 * 手写的 FIELD_LABELS 仅作为「定义里查不到的历史字段」的兜底保留。
 */

import { getBaseModules } from '../moduleConfig';
import type { FieldDefinition } from '../moduleConfig';

/** 把模块所有页签的字段拍平（保持定义顺序），不含 section 分组标记本身 */
const moduleFieldsCache = new Map<string, FieldDefinition[]>();

export function getModuleFields(moduleId: string): FieldDefinition[] {
  const cached = moduleFieldsCache.get(moduleId);
  if (cached) return cached;
  const mod = getBaseModules().find((m) => m.id === moduleId);
  const out: FieldDefinition[] = [];
  if (mod) {
    for (const tab of mod.tabs) {
      for (const f of tab.fields || []) {
        if (f.type !== 'section') out.push(f);
      }
    }
  }
  moduleFieldsCache.set(moduleId, out);
  return out;
}

/** 单模块的 字段id → label（同名 id 在各模块 label 不同时，以本模块定义为准） */
const moduleLabelCache = new Map<string, Record<string, string>>();

export function getModuleFieldLabels(moduleId: string): Record<string, string> {
  const cached = moduleLabelCache.get(moduleId);
  if (cached) return cached;
  const map: Record<string, string> = {};
  for (const f of getModuleFields(moduleId)) {
    if (f.label) map[f.id] = f.label;
  }
  moduleLabelCache.set(moduleId, map);
  return map;
}

/** 全库 字段id → label（模块间同名 id 取先出现的定义） */
let allLabelsCache: Record<string, string> | null = null;

export function getAllFieldLabels(): Record<string, string> {
  if (allLabelsCache) return allLabelsCache;
  const map: Record<string, string> = {};
  for (const mod of getBaseModules()) {
    for (const tab of mod.tabs) {
      for (const f of tab.fields || []) {
        if (f.type === 'section') continue;
        if (f.label && !map[f.id]) map[f.id] = f.label;
      }
    }
  }
  allLabelsCache = map;
  return map;
}

/**
 * 解析字段中文标签：本模块字段定义 → 全库字段定义 → 手写兜底映射 → 原样返回 id。
 * @param fieldId 字段 id（或 section 内的字段 id）
 * @param moduleId 记录所属模块（可省，省则只查全库定义）
 * @param fallback 手写兜底映射（如 CaseTimeline 的历史 FIELD_LABELS）
 */
export function resolveFieldLabel(
  fieldId: string,
  moduleId?: string,
  fallback?: Record<string, string>,
): string {
  if (moduleId) {
    const hit = getModuleFieldLabels(moduleId)[fieldId];
    if (hit) return hit;
  }
  const all = getAllFieldLabels()[fieldId];
  if (all) return all;
  const fb = fallback?.[fieldId];
  if (fb) return fb;
  return fieldId;
}

/** 可重复段（repeatable section）的 listName → 该段字段定义 */
export function getModuleSections(moduleId: string): Array<{ listName: string; label: string; fields: FieldDefinition[] }> {
  const mod = getBaseModules().find((m) => m.id === moduleId);
  const out: Array<{ listName: string; label: string; fields: FieldDefinition[] }> = [];
  if (!mod) return out;
  for (const tab of mod.tabs) {
    let current: { listName: string; label: string; fields: FieldDefinition[] } | null = null;
    for (const f of tab.fields || []) {
      if (f.type === 'section') {
        current = f.repeatable && f.listName ? { listName: f.listName, label: f.label, fields: [] } : null;
        if (current) out.push(current);
      } else if (current) {
        current.fields.push(f);
      }
    }
  }
  return out;
}

/** 模块里全部可重复段的 listName（用于判断某个 data 键是不是明细数组） */
export function getModuleSectionListNames(moduleId: string): string[] {
  return getModuleSections(moduleId).map((s) => s.listName);
}

/* ===================== 记录标题推导 ===================== */

/**
 * 标题字段优先链（按业务语义从强到弱，跨模块通用）。
 *
 * 「未命名」的根因：CaseTimeline / CaseDetail 过去只认
 * caseName / suspect / reportMatter / projectName / clueName / title / matterName，
 * 而法制室「考核管理」的标题是 objectName（被考核对象）、大队办公室「公文处理」是
 * docTitle（公文标题）、党建与考勤是 lifeName（组织生活名称）—— 这些一条都不命中，
 * 于是整屏卡片都显示「未命名」。链尾再接一层「该模块字段定义里第一个有值的文本字段」，
 * 以后新模块不必再回来登记标题字段名。
 */
export const TITLE_FIELD_CHAIN = [
  'caseName', 'clueName', 'objectName', 'docTitle', 'lifeName', 'meetingName',
  'matterName', 'reportMatter', 'title', 'actionName', 'projectName', 'docName',
  'companyName', 'enterpriseName', 'involvedEntity', 'suspectName', 'suspect',
  'subjectName', 'reporterName', 'visitorName', 'name',
];

const isNonEmpty = (v: unknown): boolean =>
  (typeof v === 'string' && v.trim() !== '') || (typeof v === 'number' && Number.isFinite(v));

/** 命中标题的字段 id；找不到返回 null */
export function pickTitleFieldId(data: Record<string, unknown> | undefined, moduleId?: string): string | null {
  const d = data || {};
  for (const k of TITLE_FIELD_CHAIN) {
    if (isNonEmpty(d[k])) return k;
  }
  if (moduleId) {
    for (const f of getModuleFields(moduleId)) {
      if (f.type !== 'text' && f.type !== 'textarea') continue;
      if (isNonEmpty(d[f.id])) return f.id;
    }
  } else {
    for (const [k, v] of Object.entries(d)) {
      if (k.startsWith('__')) continue;
      if (typeof v === 'string' && v.trim() !== '') return k;
    }
  }
  return null;
}

/** 记录标题：优先链 → 模块字段定义 → 「未命名」 */
export function deriveRecordTitle(data: Record<string, unknown> | undefined, moduleId?: string): string {
  const key = pickTitleFieldId(data, moduleId);
  if (!key) return '未命名';
  const v = String((data || {})[key] ?? '').trim();
  return v || '未命名';
}

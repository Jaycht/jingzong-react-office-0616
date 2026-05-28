/**
 * 涉众模块数据存储
 * 使用 localStorage 持久化涉众模块记录，并写入操作日志。
 */

import { localStorageAdapter } from './adapter';
import { addOperationLog } from './operationLogStore';
import { useAppStore } from './appStore';

const STORAGE_KEY = 'jingzong.mass.records';

export type MassRecordData = Record<string, unknown>;

export interface MassRecord {
  id: string;
  moduleId: string;
  tabId: string;
  data: MassRecordData;
  createdAt: string;
  updatedAt: string;
}

function currentUser(): string {
  try {
    return useAppStore.getState().userName || 'system';
  } catch {
    return 'system';
  }
}

export function getMassRecords(moduleId?: string): MassRecord[] {
  const all = localStorageAdapter.getItem<MassRecord[]>(STORAGE_KEY, []);
  return moduleId ? all.filter((record) => record.moduleId === moduleId) : all;
}

export function saveMassRecord(moduleId: string, tabId: string, data: MassRecordData): MassRecord {
  const records = getMassRecords();
  const now = new Date().toISOString();
  const record: MassRecord = {
    id: `mass-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    moduleId,
    tabId,
    data,
    createdAt: now,
    updatedAt: now,
  };

  records.unshift(record);
  localStorageAdapter.setItem(STORAGE_KEY, records);
  addOperationLog({
    user: currentUser(),
    action: '新建',
    detail: `新建记录 (${moduleId}/${tabId})`,
    ip: 'local',
    type: 'create',
  });

  return record;
}

export function updateMassRecord(id: string, data: MassRecordData): MassRecord | null {
  const records = getMassRecords();
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return null;

  records[index] = {
    ...records[index],
    data,
    updatedAt: new Date().toISOString(),
  };

  localStorageAdapter.setItem(STORAGE_KEY, records);
  addOperationLog({
    user: currentUser(),
    action: '更新',
    detail: `更新记录 (${records[index].moduleId})`,
    ip: 'local',
    type: 'edit',
  });

  return records[index];
}

export function deleteMassRecord(id: string): void {
  const records = getMassRecords().filter((record) => record.id !== id);
  localStorageAdapter.setItem(STORAGE_KEY, records);
  addOperationLog({
    user: currentUser(),
    action: '删除',
    detail: `删除记录 ${id}`,
    ip: 'local',
    type: 'delete',
  });
}

export function deleteMassRecords(ids: string[]): void {
  const idSet = new Set(ids);
  const records = getMassRecords().filter((record) => !idSet.has(record.id));
  localStorageAdapter.setItem(STORAGE_KEY, records);
  addOperationLog({
    user: currentUser(),
    action: '批量删除',
    detail: `批量删除 ${ids.length} 条记录`,
    ip: 'local',
    type: 'delete',
  });
}

/**
 * 递归遍历对象，移除所有匹配 attachmentIds 的附件引用
 */
function removeAttachmentRefsDeep(obj: unknown, ids: Set<string>): boolean {
  if (!obj || typeof obj !== 'object') return false;
  let changed = false;

  if (Array.isArray(obj)) {
    // 情况 A：数组元素是附件对象 { uid: 'att-xxx', name: '...', ... }
    if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null && 'uid' in obj[0]) {
      const filtered = obj.filter((item: any) => !ids.has(item.uid));
      if (filtered.length !== obj.length) {
        obj.length = 0;
        obj.push(...filtered);
        changed = true;
      }
    }
    // 情况 B：数组元素是普通对象（如 repeatable section 的行），递归其所有属性
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        for (const key of Object.keys(item)) {
          if (removeAttachmentRefsDeep((item as Record<string, unknown>)[key], ids)) {
            changed = true;
          }
        }
      }
    }
  } else {
    // 普通对象：遍历所有属性
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      if (removeAttachmentRefsDeep((obj as Record<string, unknown>)[key], ids)) {
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * 从所有记录中移除指定附件 ID 的引用
 * 递归遍历所有层级，支持普通字段和 repeatable section 嵌套
 */
export function removeAttachmentRefsFromAllRecords(attachmentIds: Set<string>): number {
  if (attachmentIds.size === 0) return 0;

  const records = getMassRecords();
  let cleanedCount = 0;

  for (const record of records) {
    if (!record.data) continue;
    // 深拷贝一份 data，避免直接修改原始对象
    const dataCopy = JSON.parse(JSON.stringify(record.data));
    if (removeAttachmentRefsDeep(dataCopy, attachmentIds)) {
      record.data = dataCopy;
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    localStorageAdapter.setItem(STORAGE_KEY, records);
  }
  return cleanedCount;
}

function collectUniqueStringValues(moduleId: string, key: string): string[] {
  const records = getMassRecords(moduleId);
  const values = new Set<string>();

  for (const record of records) {
    const raw = record.data?.[key];
    if (typeof raw === 'string') {
      const normalized = raw.trim();
      if (normalized) {
        values.add(normalized);
      }
    }
  }

  return Array.from(values);
}

export function getClueProjectNames(): string[] {
  return collectUniqueStringValues('mass-clue', 'projectName');
}

export function getLegalReportMatters(): string[] {
  return collectUniqueStringValues('legal-report-case', 'reportMatter');
}

export function getEvidenceClueNames(): string[] {
  return collectUniqueStringValues('evidence-clue', 'clueName');
}

// ─── 中队案件数据兼容 ────────────────────────────

/** 获取 squad-case 案件名称列表（去重） */
export function getSquadCaseNames(): string[] {
  return collectUniqueStringValues('squad-case', 'caseName');
}

/** 获取 squad-case 案件编号列表（去重） */
export function getSquadCaseNos(): string[] {
  return collectUniqueStringValues('squad-case', 'caseNo');
}

const SQUAD_CASE_MIGRATED_KEY = 'jingzong.squad-cases.migrated.v1';

/**
 * 将旧 caseStore 数据迁移到 massStore
 * 幂等：迁移完成后设置标记，不会重复迁移
 */
export function migrateOldCasesToMassStore(): void {
  try {
    if (localStorage.getItem(SQUAD_CASE_MIGRATED_KEY)) return;
    const oldRaw = localStorage.getItem('jingzong.squad.cases');
    if (!oldRaw) { localStorage.setItem(SQUAD_CASE_MIGRATED_KEY, '1'); return; }
    const oldCases = JSON.parse(oldRaw);
    if (!Array.isArray(oldCases) || oldCases.length === 0) {
      localStorage.setItem(SQUAD_CASE_MIGRATED_KEY, '1');
      return;
    }
    const records = getMassRecords();
    const now = new Date().toISOString();
    let count = 0;
    for (const c of oldCases) {
      if (!c.id || !c.caseName) continue;
      if (records.some(r => r.data?.__oldCaseId === c.id)) continue;
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = c;
      records.push({
        id: `mass-squad-case-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        moduleId: 'squad-case',
        tabId: 'squad-case-1',
        data: { ...rest, __oldCaseId: c.id },
        createdAt: c.createdAt || now,
        updatedAt: now,
      });
      count++;
    }
    if (count > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    localStorage.setItem(SQUAD_CASE_MIGRATED_KEY, '1');
    console.log(`[migration] 已迁移 ${count} 条旧案件数据到 massStore`);
  } catch (err) {
    console.warn('[migration] 案件数据迁移失败:', err);
  }
}

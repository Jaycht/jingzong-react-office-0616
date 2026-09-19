/**
 * 涉众模块数据存储
 * 使用 IndexedDB 持久化涉众模块记录（自动迁移旧 localStorage 数据），并写入操作日志。
 */

import { indexedDBAdapter } from './adapter';
import { addOperationLog } from './operationLogStore';
import { useAppStore } from './appStore';
import { rebuildCaseIndex, rebuildSuspectIndex } from './inputHistoryStore';
import { deleteAttachmentsByRecord, getAllAttachments, deleteAttachment } from './attachmentStore';
import { notifyDataChanged } from './dataEvents';

const STORAGE_KEY = 'jingzong.mass.records';
const MIGRATION_KEY = 'jingzong.mass.migratedToIDB.v1';

export type MassRecordData = Record<string, unknown>;

export interface MassRecord {
  id: string;
  moduleId: string;
  tabId: string;
  data: MassRecordData;
  createdAt: string;
  updatedAt: string;
  /**
   * 演示数据标记（V2.50.0）。
   * 刻意放在记录顶层而不是写进 data —— 早期版本把标记写在 data.__demo 里，
   * 结果因为时间轴 / 案件详情是「遍历 data 的所有键」来展示字段的，
   * 这个内部标记就被当成一条业务字段显示出来（`__demo` 在界面里渲染成「—demo」）。
   * 放到顶层后展示层天然看不到它，标签/详情/导出/时间轴一并干净。
   */
  demo?: boolean;
}

/** 内部元数据键前缀：`__xxx` 只服务程序内部，不是业务字段，展示层一律跳过 */
export const INTERNAL_KEY_PREFIX = '__';

/** 是否为程序内部元数据键（如 __oldCaseId），列表 / 时间轴 / 详情 / 关联匹配都不应展示 */
export function isInternalKey(key: string): boolean {
  return key.startsWith(INTERNAL_KEY_PREFIX);
}

/**
 * 是否为演示数据。
 * V2.50.0 起标记写在记录顶层 `demo`；同时兼容 V2.49.0 生成的旧演示数据（data.__demo）。
 */
export function isDemoRecord(record: MassRecord): boolean {
  return record.demo === true || record.data?.__demo !== undefined;
}

function currentUser(): string {
  try {
    return useAppStore.getState().userName || 'system';
  } catch {
    return 'system';
  }
}

export function getMassRecords(moduleId?: string): MassRecord[] {
  const all = indexedDBAdapter.getItem<MassRecord[]>(STORAGE_KEY, []);
  return moduleId ? all.filter((record) => record.moduleId === moduleId) : all;
}

/** 按 id 查找单条记录（L-12：替代散落的 getMassRecords().find，避免重复全量读取） */
export function getMassRecordById(id: string): MassRecord | undefined {
  return indexedDBAdapter.getItem<MassRecord[]>(STORAGE_KEY, []).find((record) => record.id === id);
}

/**
 * 新建记录。
 * @param opts.demo 标记为演示数据（不写进 data，见 MassRecord.demo）
 */
export function saveMassRecord(
  moduleId: string,
  tabId: string,
  data: MassRecordData,
  opts?: { demo?: boolean },
): MassRecord {
  const records = getMassRecords();
  const now = new Date().toISOString();
  const record: MassRecord = {
    id: `mass-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    moduleId,
    tabId,
    data,
    createdAt: now,
    updatedAt: now,
    ...(opts?.demo ? { demo: true } : {}),
  };

  records.unshift(record);
  indexedDBAdapter.setItem(STORAGE_KEY, records);
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

  indexedDBAdapter.setItem(STORAGE_KEY, records);
  addOperationLog({
    user: currentUser(),
    action: '更新',
    detail: `更新记录 (${records[index].moduleId})`,
    ip: 'local',
    type: 'edit',
  });

  return records[index];
}

/**
 * 全库全局索引重建：从 IndexedDB 全量记录重算「案件/线索 ⇄ 编号」与「嫌疑人」两个联动池，
 * 并广播数据变更事件让依赖 getMassRecords 的页面刷新。
 *
 * 凡是不经过抽屉表单的**批量写入**（平台粘贴导入 / Excel 导入 / 备份恢复等）都必须
 * 写完调用它一次：否则新写入的案件、线索、嫌疑人不会进入全局池 ——
 * 其它模块的案件名称/编号下拉看不到、选不中，也就谈不上「选中后自动填充」。
 * 单条写入由调用方（抽屉保存、列表行内编辑）就地重建，不走这里以免重复全量扫描。
 */
export function rebuildGlobalIndexes(): void {
  const records = getMassRecords();
  rebuildCaseIndex(records);
  rebuildSuspectIndex(records);
  notifyDataChanged();
}

export function deleteMassRecord(id: string): void {
  const records = getMassRecords().filter((record) => record.id !== id);
  indexedDBAdapter.setItem(STORAGE_KEY, records);
  rebuildCaseIndex(records);
  rebuildSuspectIndex(records);
  // 联动清理该记录关联的附件（异步、尽力而为，不阻塞删除主流程）
  deleteAttachmentsByRecord(id).catch(() => {});
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
  indexedDBAdapter.setItem(STORAGE_KEY, records);
  rebuildCaseIndex(records);
  rebuildSuspectIndex(records);
  // 联动清理批量删除记录关联的附件
  ids.forEach((id) => deleteAttachmentsByRecord(id).catch(() => {}));
  addOperationLog({
    user: currentUser(),
    action: '批量删除',
    detail: `批量删除 ${ids.length} 条记录`,
    ip: 'local',
    type: 'delete',
  });
}

/**
 * 清理孤儿附件：recordId 为 'pending'（上传后未保存）或已无对应记录的附件。
 * 返回清理数量。
 */
export async function cleanupOrphanAttachments(): Promise<number> {
  const all = await getAllAttachments();
  if (all.length === 0) return 0;
  const validIds = new Set(getMassRecords().map((r) => r.id));
  let removed = 0;
  for (const att of all) {
    if (att.recordId === 'pending' || !validIds.has(att.recordId)) {
      await deleteAttachment(att.id);
      removed++;
    }
  }
  return removed;
}

/**
 * 递归遍历数据树，移除任意层级（含数组元素）中 uid 命中附件 ID 的引用对象。
 * 用结构化遍历替代原来的「JSON 字符串 + 正则」外科手术，
 * 避免尾逗号清理失败、嵌套对象/数组被误伤等隐患（M-12）。
 */
function stripAttachmentRefs(
  node: unknown,
  ids: Set<string>,
): { value: unknown; removed: number; drop: boolean } {
  if (Array.isArray(node)) {
    const out: unknown[] = [];
    let removed = 0;
    for (const item of node) {
      const r = stripAttachmentRefs(item, ids);
      if (r.drop) {
        removed += r.removed; // 整个元素即附件引用对象，丢弃
        continue;
      }
      removed += r.removed;
      out.push(r.value);
    }
    return { value: out, removed, drop: false };
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    // 该对象自身即为附件引用（含 uid 且命中）
    if (typeof obj.uid === 'string' && ids.has(obj.uid)) {
      return { value: undefined, removed: 1, drop: true };
    }
    let removed = 0;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const r = stripAttachmentRefs(obj[key], ids);
      if (r.drop) {
        removed += r.removed; // 该属性值是附件引用对象，整段移除
        continue;
      }
      removed += r.removed;
      out[key] = r.value;
    }
    return { value: out, removed, drop: false };
  }
  return { value: node, removed: 0, drop: false };
}

/**
 * 从所有记录中移除指定附件 ID 的引用（M-12：结构化遍历，替代正则 JSON 重写）
 * 通过适配器读取/写入，兼容 IndexedDB 存储
 */
export function removeAttachmentRefsFromAllRecords(attachmentIds: Set<string>): number {
  if (attachmentIds.size === 0) return 0;

  const records = getMassRecords();
  if (records.length === 0) return 0;

  let totalRemoved = 0;
  let anyModified = false;

  for (const record of records) {
    const res = stripAttachmentRefs(record.data, attachmentIds);
    if (res.removed === 0) continue;
    // 退化情况：整条 data 自身即附件引用对象，不整体销毁，仅跳过
    if (res.drop) continue;
    record.data = res.value as MassRecordData;
    totalRemoved += res.removed;
    anyModified = true;
  }

  if (anyModified) {
    indexedDBAdapter.setItem(STORAGE_KEY, records);
  }

  return totalRemoved;
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
    if (count > 0) indexedDBAdapter.setItem(STORAGE_KEY, records);
    localStorage.setItem(SQUAD_CASE_MIGRATED_KEY, '1');
    console.log(`[migration] 已迁移 ${count} 条旧案件数据到 massStore`);
  } catch (err) {
    console.warn('[migration] 案件数据迁移失败:', err);
  }
}

/**
 * 从 localStorage 迁移旧版 mass records 到 IndexedDB
 * 幂等：迁移后设置标记，不会重复执行
 */
export function migrateLocalStorageToIndexedDB(): void {
  try {
    if (localStorage.getItem(MIGRATION_KEY)) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }
    const records = JSON.parse(raw);
    if (Array.isArray(records) && records.length > 0) {
      indexedDBAdapter.setItem(STORAGE_KEY, records);
      console.log(`[migration] 已迁移 ${records.length} 条记录从 localStorage 到 IndexedDB`);
    }
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch (err) {
    console.warn('[migration] localStorage → IndexedDB 迁移失败:', err);
  }
}

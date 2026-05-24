// 涉众模块数据存储
// 使用 localStorage 持久化涉众各模块（线索登记、数据统计等）的记录

const STORAGE_KEY = 'jingzong.mass.records';

export interface MassRecord {
  id: string;
  moduleId: string;
  tabId: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/** 获取涉众记录，可按 moduleId 筛选 */
export function getMassRecords(moduleId?: string): MassRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: MassRecord[] = JSON.parse(raw);
    if (!Array.isArray(all)) return [];
    return moduleId ? all.filter((r) => r.moduleId === moduleId) : all;
  } catch {
    return [];
  }
}

/** 保存一条涉众记录 */
export function saveMassRecord(
  moduleId: string,
  tabId: string,
  data: Record<string, any>,
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
  };
  records.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return record;
}

/** 更新一条涉众记录 */
export function updateMassRecord(
  id: string,
  data: Record<string, any>,
): MassRecord | null {
  const records = getMassRecords();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return null;
  records[index] = {
    ...records[index],
    data,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return records[index];
}

/** 删除一条涉众记录 */
export function deleteMassRecord(id: string): void {
  const records = getMassRecords().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/** 批量删除涉众记录 */
export function deleteMassRecords(ids: string[]): void {
  const idSet = new Set(ids);
  const records = getMassRecords().filter((r) => !idSet.has(r.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/** 获取涉众线索登记中所有已录入的项目名称（去重） */
export function getClueProjectNames(): string[] {
  const clueRecords = getMassRecords('mass-clue');
  const names = new Set<string>();
  for (const r of clueRecords) {
    const name = r.data?.projectName?.trim();
    if (name) names.add(name);
  }
  return Array.from(names);
}

/** 获取接报案登记中所有已录入的接报事项（去重） */
export function getLegalReportMatters(): string[] {
  const reportRecords = getMassRecords('legal-report-case');
  const matters = new Set<string>();
  for (const r of reportRecords) {
    const m = r.data?.reportMatter?.trim();
    if (m) matters.add(m);
  }
  return Array.from(matters);
}

/** 获取线索登记中已录入的交办线索名称（去重） */
export function getEvidenceClueNames(): string[] {
  const clueRecords = getMassRecords('evidence-clue');
  const names = new Set<string>();
  for (const r of clueRecords) {
    const n = r.data?.clueName?.trim();
    if (n) names.add(n);
  }
  return Array.from(names);
}

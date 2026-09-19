/**
 * 文书库 / 典法查阅 的可管理化存储（V2.49.0）
 *
 * 背景：内置的 79 份公安文书与 80 部法律法规都固化在构建产物里（public/forms、public/laws），
 * 实际使用中会遇到「收集不全」和「有更新」两类情况，因此需要支持手动补充与修订。
 *
 * 设计要点：
 * 1. **内置条目不动**：构建产物只读，改不了也不该改。对内置条目的「编辑」与「删除」都记录在
 *    本地覆盖层（formEdits / lawEdits），渲染时合并 —— 删掉只是隐藏，随时可从回收站恢复。
 * 2. **自定义条目**：上传的文件由主进程落到数据目录（jingzong_data/legal），条目元数据存这里。
 * 3. **回收站**：删除先入回收站，恢复即还原；只有「彻底删除 / 清空回收站」才会删磁盘文件。
 * 4. 管理员密码默认 JDZZ3231268，可在管理面板里修改。
 */
import { indexedDBAdapter } from './adapter';

const STORAGE_KEY = 'jingzong.legalLibrary.v1';

/** 初始管理员密码（仅作本地门禁，非安全边界） */
export const DEFAULT_ADMIN_PASSWORD = 'JDZZ3231268';

export type LegalKind = 'form' | 'law';

/** 文书条目（内置与自定义同构，用 builtin 区分） */
export interface FormEntry {
  id: string;
  title: string;
  category: string[];
  shiyang?: string;
  /** 内置为 /forms/xxx.pdf 相对路径；自定义为磁盘绝对路径 */
  file?: string;
  word?: string;
  builtin?: boolean;
}

/** 法条条目 */
export interface LawEntry {
  id: string;
  title: string;
  category: string;
  categoryName: string;
  /** 内置为分类内相对 txt 路径；自定义为磁盘绝对路径 */
  file: string;
  source?: string;
  sourceUrl?: string;
  version?: string;
  effectiveDate?: string;
  articles?: number;
  pending?: boolean;
  timeline?: { date: string; label: string }[];
  builtin?: boolean;
}

export interface RecycleItem {
  rid: string;
  kind: LegalKind;
  /** 被删除的是内置条目还是自定义条目 */
  builtin: boolean;
  targetId: string;
  title: string;
  /** 删除时的完整条目快照，用于恢复 */
  snapshot: Record<string, unknown>;
  /** 关联的磁盘文件（自定义条目专有），彻底删除时才真正清理 */
  files: string[];
  deletedAt: string;
}

export interface LibraryState {
  customForms: FormEntry[];
  customLaws: LawEntry[];
  formEdits: Record<string, Partial<FormEntry>>;
  lawEdits: Record<string, Partial<LawEntry>>;
  recycle: RecycleItem[];
  adminPassword: string;
}

const EMPTY: LibraryState = {
  customForms: [],
  customLaws: [],
  formEdits: {},
  lawEdits: {},
  recycle: [],
  adminPassword: DEFAULT_ADMIN_PASSWORD,
};

export function getLibrary(): LibraryState {
  const raw = indexedDBAdapter.getItem<LibraryState>(STORAGE_KEY, EMPTY);
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  return {
    customForms: Array.isArray(raw.customForms) ? raw.customForms : [],
    customLaws: Array.isArray(raw.customLaws) ? raw.customLaws : [],
    formEdits: raw.formEdits && typeof raw.formEdits === 'object' ? raw.formEdits : {},
    lawEdits: raw.lawEdits && typeof raw.lawEdits === 'object' ? raw.lawEdits : {},
    recycle: Array.isArray(raw.recycle) ? raw.recycle : [],
    adminPassword: raw.adminPassword || DEFAULT_ADMIN_PASSWORD,
  };
}

export function saveLibrary(state: LibraryState): void {
  indexedDBAdapter.setItem(STORAGE_KEY, state);
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── 纯函数：合并内置与本地覆盖（可单测） ───────────────

/** 已被删除（移入回收站）的内置条目 id 集合 */
export function removedBuiltinIds(state: LibraryState, kind: LegalKind): Set<string> {
  return new Set(state.recycle.filter((r) => r.kind === kind && r.builtin).map((r) => r.targetId));
}

/**
 * 合并文书列表：内置列表 → 去掉已删除 → 应用编辑覆盖 → 追加自定义条目。
 * 自定义条目排在内置之后，方便用户一眼看到自己补充的内容。
 */
export function mergeForms(builtin: FormEntry[], state: LibraryState): FormEntry[] {
  const removed = removedBuiltinIds(state, 'form');
  const base = builtin
    .filter((f) => !removed.has(f.id))
    .map((f) => ({ ...f, ...(state.formEdits[f.id] || {}) }));
  return [...base, ...state.customForms];
}

export interface LawManifest {
  generatedAt: string;
  totalLaws: number;
  categories: { id: string; name: string; count: number }[];
  laws: LawEntry[];
}

/** 合并法条清单：保留原分类顺序，自定义新增的分类追加在后面，并重算各分类数量 */
export function mergeLawManifest(manifest: LawManifest | null, state: LibraryState): LawManifest | null {
  if (!manifest) return null;
  const removed = removedBuiltinIds(state, 'law');
  const base = (manifest.laws || [])
    .filter((l) => !removed.has(l.id))
    .map((l) => ({ ...l, ...(state.lawEdits[l.id] || {}) }));
  const laws = [...base, ...state.customLaws];

  // 重算分类：沿用原顺序与名称，自定义引入的新分类按出现顺序追加
  const order = (manifest.categories || []).map((c) => c.id);
  const nameById = new Map((manifest.categories || []).map((c) => [c.id, c.name]));
  const countById = new Map<string, number>();
  for (const l of laws) {
    countById.set(l.category, (countById.get(l.category) || 0) + 1);
    if (!nameById.has(l.category)) nameById.set(l.category, l.categoryName || l.category);
    if (!order.includes(l.category)) order.push(l.category);
  }
  const categories = order
    .filter((id) => (countById.get(id) || 0) > 0)
    .map((id) => ({ id, name: nameById.get(id) || id, count: countById.get(id) || 0 }));

  return {
    ...manifest,
    totalLaws: laws.length,
    categories,
    laws,
  };
}

// ─── 写操作 ───────────────────────────────────────────

export function addCustomForm(entry: Omit<FormEntry, 'builtin'>): FormEntry {
  const state = getLibrary();
  const full: FormEntry = { ...entry, builtin: false };
  state.customForms = [full, ...state.customForms];
  saveLibrary(state);
  return full;
}

export function addCustomLaw(entry: Omit<LawEntry, 'builtin'>): LawEntry {
  const state = getLibrary();
  const full: LawEntry = { ...entry, builtin: false };
  state.customLaws = [full, ...state.customLaws];
  saveLibrary(state);
  return full;
}

/** 编辑任意条目：内置的记覆盖，自定义的直接改 */
export function updateEntry(
  kind: LegalKind,
  id: string,
  patch: Record<string, unknown>,
  builtin: boolean,
): void {
  const state = getLibrary();
  if (kind === 'form') {
    if (builtin) {
      state.formEdits[id] = { ...(state.formEdits[id] || {}), ...(patch as Partial<FormEntry>) };
    } else {
      state.customForms = state.customForms.map((f) => (f.id === id ? { ...f, ...(patch as Partial<FormEntry>) } : f));
    }
  } else {
    if (builtin) {
      state.lawEdits[id] = { ...(state.lawEdits[id] || {}), ...(patch as Partial<LawEntry>) };
    } else {
      state.customLaws = state.customLaws.map((l) => (l.id === id ? { ...l, ...(patch as Partial<LawEntry>) } : l));
    }
  }
  saveLibrary(state);
}

/** 删除（移入回收站）：内置条目从列表中隐藏，自定义条目从列表移出，文件保留待彻底删除 */
export function moveToRecycle(
  kind: LegalKind,
  entry: Record<string, unknown>,
  builtin: boolean,
  files: string[] = [],
): RecycleItem {
  const state = getLibrary();
  const targetId = String(entry.id);
  const item: RecycleItem = {
    rid: uid('rec'),
    kind,
    builtin,
    targetId,
    title: String(entry.title || targetId),
    snapshot: entry,
    files,
    deletedAt: new Date().toISOString(),
  };
  state.recycle = [item, ...state.recycle];
  if (!builtin) {
    if (kind === 'form') state.customForms = state.customForms.filter((f) => f.id !== targetId);
    else state.customLaws = state.customLaws.filter((l) => l.id !== targetId);
  }
  saveLibrary(state);
  return item;
}

/** 从回收站恢复：内置条目移除隐藏记录，自定义条目按快照放回列表 */
export function restoreFromRecycle(rid: string): RecycleItem | null {
  const state = getLibrary();
  const item = state.recycle.find((r) => r.rid === rid);
  if (!item) return null;
  state.recycle = state.recycle.filter((r) => r.rid !== rid);
  if (!item.builtin) {
    if (item.kind === 'form') {
      const restored = { ...(item.snapshot as unknown as FormEntry), id: item.targetId };
      state.customForms = [restored, ...state.customForms.filter((f) => f.id !== item.targetId)];
    } else {
      const restored = { ...(item.snapshot as unknown as LawEntry), id: item.targetId };
      state.customLaws = [restored, ...state.customLaws.filter((l) => l.id !== item.targetId)];
    }
  }
  saveLibrary(state);
  return item;
}

/** 彻底删除回收站条目：返回需要从磁盘清理的文件路径 */
export function purgeRecycle(rid: string): string[] {
  const state = getLibrary();
  const item = state.recycle.find((r) => r.rid === rid);
  if (!item) return [];
  state.recycle = state.recycle.filter((r) => r.rid !== rid);
  // 内置条目被彻底删除 = 永久隐藏，需保留隐藏标记（否则会再次出现）
  if (item.builtin) {
    const hide: RecycleItem = { ...item, rid: uid('hide'), files: [], snapshot: {} };
    state.recycle = [hide, ...state.recycle];
    saveLibrary(state);
    return [];
  }
  saveLibrary(state);
  return item.files || [];
}

/** 清空回收站：返回需要清理的磁盘文件（内置条目的永久隐藏标记会保留） */
export function emptyRecycle(): string[] {
  const state = getLibrary();
  const files: string[] = [];
  const keepHidden: RecycleItem[] = [];
  for (const item of state.recycle) {
    if (item.builtin) {
      // 内置条目不能「取消删除」，否则会重新出现在列表里 —— 保留隐藏标记
      keepHidden.push({ ...item, rid: uid('hide'), files: [], snapshot: {} });
    } else {
      files.push(...(item.files || []));
    }
  }
  state.recycle = keepHidden;
  saveLibrary(state);
  return files;
}

// ─── 管理员密码 ───────────────────────────────────────
export function verifyAdminPassword(password: string): boolean {
  const state = getLibrary();
  return password.trim() === (state.adminPassword || DEFAULT_ADMIN_PASSWORD);
}

export function setAdminPassword(password: string): void {
  const state = getLibrary();
  state.adminPassword = password.trim() || DEFAULT_ADMIN_PASSWORD;
  saveLibrary(state);
}

export function resetAdminPassword(): void {
  const state = getLibrary();
  state.adminPassword = DEFAULT_ADMIN_PASSWORD;
  saveLibrary(state);
}

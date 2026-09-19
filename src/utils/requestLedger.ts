/**
 * 调证登记 ⇄《资金查控情况登记台账（周五报送）》口径单一事实源
 *
 * 两套列定义，**互不影响**：
 * - 导出（excelUtils.exportRequestLedger）＝ `LEDGER_HEADERS` 台账十列（单位模板，永远不动）
 * - 列表（ModulePage）＝ `REQUEST_LIST_COLUMNS` 台账工作列（按业务需要定制，
 *   含「线索\案件编号」「申请单位」等台账外列，不含「申请事由」）
 * 两边共用取值函数（pickRequestValue / toLedgerDate / buildLedgerResult），
 * 所以口径一致，但**列可以各改各的** —— 改列表不会动到导出模板。
 *
 * 数据兼容：调证信息早期存放在可重复段 `requestItems` 里（一条记录多个申请单），
 * 现改为扁平字段（一条记录 = 一个申请单）。所有读取都优先扁平字段、
 * 为空时回退 `requestItems[0]`，旧记录不会丢。
 */

export type RequestData = Record<string, unknown>;

/** 台账标题（导出时合并首行 A1:J1） */
export const LEDGER_TITLE = '资金查控情况登记台账';

/** 台账 Sheet1 十列，与单位模板逐字一致 */
export const LEDGER_HEADERS: readonly string[] = [
  '序号',
  '案件（线索）名称',
  '申请时间',
  '申请事由',
  '申请人',
  '申请单号',
  '反馈时间',
  '查控结果',
  '请求查控人',
  '备注',
];

/** 台账列宽（导出用，单位模板实测值） */
export const LEDGER_COL_WIDTHS: readonly number[] = [10, 26, 15, 14, 12, 24, 15, 25, 20, 20];

/**
 * 「备注」列的调证状态四档 —— 该列整列只呈现其中之一。
 *
 * 平台给的是两段状态（申请状态 / 报文状态），业务上其实是同一条状态的推进链：
 * 已提交 → 已审批 → 已发送 → 已反馈。故导入时就折叠为一档，
 * 列表与抽屉里也都只让选一档，避免「一格里塞两段状态」看不清当前进度。
 */
export const REQUEST_STATUS_OPTIONS = ['已提交', '已审批', '已发送', '已反馈'] as const;
export type RequestStatus = (typeof REQUEST_STATUS_OPTIONS)[number];

/**
 * 调证状态的**存储字段**。
 * V2.48.0 起状态从「备注」里独立出来：`requestStatus` 存状态，`remarks` 恢复成真正的备注（自由文本）。
 * 旧数据（状态塞在 remarks 的标注串里）读取时自动回退解析，打开抽屉/点格编辑时迁移。
 */
export const REQUEST_STATUS_FIELD = 'requestStatus';

/**
 * 平台 / 历史文案 → 四档状态 的别名表。
 * 顺序敏感：先长后短，「已审批」必须排在「审批中 / 未审批」之前（否则被 substring 抢走）。
 * 未收录的词（发送失败 / 未发送 / 校验失败 / 审批拒绝…）原样返回：
 * 既不丢信息，也不会被误判成正常推进中的状态。
 */
const STATUS_ALIASES: ReadonlyArray<readonly [string, RequestStatus]> = [
  ['已审批', '已审批'],
  ['审批通过', '已审批'],
  ['已反馈', '已反馈'],
  ['已接收', '已发送'],
  ['已发送', '已发送'],
  ['已提交', '已提交'],
  ['待审批', '已提交'],
  ['未审批', '已提交'],
  ['审批中', '已提交'],
];

/**
 * 列的行内编辑定义：点单元格即可就地改，无需打开抽屉。
 * - `field`   写入的扁平字段（type='result' 时省略，改为写 feedback* 三项）
 * - `altField` 备选字段：主字段为空、备选有值时写备选（线索调证走 clueName / clueNo）
 * - `initNow` 进入编辑时以「当前日期」初始化（反馈时间：点一下就是当下）
 * - `hint`    单元格悬停提示，告诉用户这一格点开能干什么
 */
export interface LedgerColumnEdit {
  field?: string;
  altField?: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'result';
  editWidth?: number;
  initNow?: boolean;
  hint?: string;
  /** select 固定选项（缺省时回退到字段定义里的 options） */
  options?: string[];
  /** select 自定义选项存储键（缺省时回退到字段定义的 customOptionKey） */
  customOptionKey?: string;
  /** 编辑初值取「可归一的调证状态」而非原始字段值（自由备注不会被搬进状态字段） */
  initFromStatus?: boolean;
}

/** 列表一列：标题、取值、行内编辑元数据 */
export interface LedgerColumn {
  key: string;
  title: string;
  width: number;
  get: (d: RequestData) => string;
  edit?: LedgerColumnEdit;
}

/**
 * 列表工作列（表头由涛哥 2026-09-19 重定）：
 * 序号 / 案件（线索）名称 / 线索·案件编号 / 申请时间 / 申请单位 / 申请人 /
 * 申请单号 / 反馈时间 / 查控结果 / 请求查控人 / 备注
 *
 * 「序号」由表格首列承担，不进本表。
 * 与导出台账（LEDGER_HEADERS）**故意不同**：列表加了编号、申请单位，去掉了申请事由，
 * 但导出模板一字不改 —— 列表只影响录入效率，导出仍按单位模板十列。
 */
export const REQUEST_LIST_COLUMNS: readonly LedgerColumn[] = [
  {
    key: 'listName',
    title: '案件（线索）名称',
    width: 220,
    get: (d) => ledgerCaseName(d),
    edit: { field: 'caseName', altField: 'clueName', type: 'text', editWidth: 240, hint: '点击修改案件（线索）名称' },
  },
  {
    key: 'listCaseNo',
    title: '线索\\案件编号',
    width: 160,
    get: (d) => ledgerCaseNo(d),
    edit: { field: 'caseNo', altField: 'clueNo', type: 'text', editWidth: 180, hint: '点击填写案件编号 / 线索编号' },
  },
  {
    key: 'listRequestDate',
    title: '申请时间',
    width: 110,
    get: (d) => toLedgerDate(pickRequestValue(d, 'requestDate')),
    edit: { field: 'requestDate', type: 'date', editWidth: 132, hint: '点击选择申请时间' },
  },
  {
    key: 'listApplyUnit',
    title: '申请单位',
    width: 130,
    get: (d) => String(pickRequestValue(d, 'cooperateUnit') ?? ''),
    // 复用「协查单位」下拉：选项与自定义添加项都走该字段的 customOptionKey
    edit: { field: 'cooperateUnit', type: 'select', editWidth: 170, hint: '点击选择申请单位（可下拉底部自定义添加）' },
  },
  {
    key: 'listApplicant',
    title: '申请人',
    width: 96,
    get: (d) => String(pickRequestValue(d, 'applicant') ?? ''),
    edit: { field: 'applicant', type: 'text', editWidth: 116, hint: '点击填写申请人' },
  },
  {
    key: 'listRequestNo',
    title: '申请单号',
    width: 170,
    get: (d) => String(pickRequestValue(d, 'requestNo') ?? ''),
    edit: { field: 'requestNo', type: 'text', editWidth: 190, hint: '点击修改申请单号' },
  },
  {
    key: 'listFeedbackDate',
    title: '反馈时间',
    width: 110,
    get: (d) => toLedgerDate(pickRequestValue(d, 'feedbackDate')),
    // 点一下就是「现在」：反馈到账当下登记，省掉选日期这一步；要别的日期在弹层里改
    edit: { field: 'feedbackDate', type: 'date', editWidth: 132, initNow: true, hint: '点击即填入今天（可在弹层改成实际反馈日期）' },
  },
  {
    key: 'listResult',
    title: '查控结果',
    width: 150,
    get: (d) => buildLedgerResult(d),
    edit: { type: 'result', editWidth: 340, hint: '点击填写「未反馈 / 成功 / 失败」三项数量' },
  },
  {
    key: 'listRequester',
    title: '请求查控人',
    width: 110,
    get: (d) => String(pickRequestValue(d, 'requester') ?? ''),
    edit: { field: 'requester', type: 'text', editWidth: 130, hint: '点击填写请求查控人' },
  },
  {
    key: 'listRemarks',
    title: '备注',
    width: 120,
    // 这一列呈现的是**调证状态**（四档之一）：平台导入时把「申请状态：X；报文状态：Y」
    // 折叠成四档之一，手工录入即下拉里选的那一档。
    // 数据存 `requestStatus` 字段（V2.48.0 起与自由备注 remarks 分开）。
    get: (d) => requestStatusOf(d),
    edit: {
      field: REQUEST_STATUS_FIELD,
      type: 'select',
      editWidth: 150,
      options: [...REQUEST_STATUS_OPTIONS],
      customOptionKey: 'evidence.request.requestStatus',
      initFromStatus: true,
      hint: '点击选择调证状态：已提交 / 已审批 / 已发送 / 已反馈（下拉底部可自定义添加）',
    },
  },
];

/** 查控结果三项（行内编辑用） */
export const FEEDBACK_KEYS = ['feedbackPending', 'feedbackSuccess', 'feedbackFail'] as const;

/** 行内编辑草稿：可编辑列的当前原始值（date 保持 ISO 串，交给控件转换） */
export function buildLedgerDraft(data: RequestData | undefined): RequestData {
  const d = data || {};
  const draft: RequestData = {};
  for (const col of REQUEST_LIST_COLUMNS) {
    const edit = col.edit;
    if (!edit) continue;
    if (edit.type === 'result') {
      for (const k of FEEDBACK_KEYS) {
        const v = pickRequestValue(d, k);
        draft[k] = v === '' || v == null ? 0 : v;
      }
      continue;
    }
    if (!edit.field) continue;
    // 用实际写回键（可能是 altField）作草稿键，否则线索调证会读到空值
    const key = ledgerEditField(d, edit);
    // initFromStatus：初值取「可归一的调证状态」（旧标注串迁移过来、自由备注不搬）
    draft[key] = edit.initFromStatus ? requestStatusDraft(d) : pickRequestValue(d, key);
  }
  return draft;
}

/**
 * 「备注」列的编辑初值：只有能归一成状态的值才作为状态初值。
 * - 已有 `requestStatus` 字段 → 用它；
 * - 旧数据备注里是标注串 / 裸状态词 → 迁移成那一档；
 * - 备注是用户自由文本（「微信支付宝调取」）→ 返回空，别把备注搬进状态字段。
 */
export function requestStatusDraft(data: RequestData | undefined): string {
  const explicit = normalizeRequestStatus(pickRequestValue(data, REQUEST_STATUS_FIELD));
  if (explicit) return explicit;
  const shown = requestStatusOf(data);
  return (REQUEST_STATUS_OPTIONS as readonly string[]).includes(shown) ? shown : '';
}

/** 决定字段写回哪个键：主字段为空而备选有值时写备选，避免线索调证记录被写成案件字段 */
export function ledgerEditField(data: RequestData | undefined, edit: LedgerColumnEdit): string {
  const d = data || {};
  if (edit.altField && !d[edit.field || ''] && d[edit.altField]) return edit.altField;
  return edit.field || '';
}

/**
 * 行内编辑落库合并：扁平字段直接覆盖，并处理旧版 `requestItems` 兼容。
 *
 * 旧记录的申请信息存在可重复段 `requestItems` 里，而 `pickRequestValue`
 * 会在扁平字段为空时回退到 `requestItems[0]` —— 这会让「清空某字段」失效
 * （显示仍是旧值）。故这里把草稿合并进第 1 条；只有一条时直接删除该段
 * 完成扁平化迁移，多条时保留其余条目以免丢数据。
 */
export function mergeInlineEdit(data: RequestData | undefined, draft: RequestData): RequestData {
  const base: RequestData = { ...(data || {}) };
  Object.assign(base, draft);
  // 在列表里改了「调证状态」时，顺手清掉旧数据塞在备注里的标注串
  // （「申请状态：X；报文状态：Y」本来就不是备注，留着会让抽屉的备注框显示一长串）。
  if (REQUEST_STATUS_FIELD in draft) {
    const rawRemarks = String(base.remarks ?? '').trim();
    if (rawRemarks && !isFreeTextRemarks(rawRemarks)) base.remarks = '';
  }
  const legacy = Array.isArray(base.requestItems) ? (base.requestItems as RequestData[]) : null;
  if (legacy && legacy.length > 0) {
    if (legacy.length === 1) {
      delete base.requestItems;
    } else {
      base.requestItems = legacy.map((it, i) => (i === 0 ? { ...it, ...draft } : it));
    }
  }
  return base;
}

/** 旧版数据：调证信息曾存放在可重复段 requestItems 中 */
function requestItemsOf(data: RequestData | undefined): RequestData[] {
  const items = data?.requestItems;
  return Array.isArray(items) ? (items as RequestData[]) : [];
}

/** 取调证字段值：优先扁平字段，为空时回退旧版 requestItems[0] */
export function pickRequestValue(data: RequestData | undefined, key: string): unknown {
  const d = data || {};
  const v = d[key];
  if (v != null && v !== '') return v;
  const first = requestItemsOf(d)[0];
  const fv = first?.[key];
  return fv == null || fv === '' ? '' : fv;
}

/** 案件（线索）名称：案件调证取 caseName，线索调证取 clueName，互为回退 */
export function ledgerCaseName(data: RequestData | undefined): string {
  const d = data || {};
  const name = d.caseName || d.clueName || d.caseNo || d.clueNo || '';
  return String(name);
}

/** 线索\案件编号：案件调证取 caseNo，线索调证取 clueNo，互为回退 */
export function ledgerCaseNo(data: RequestData | undefined): string {
  const d = data || {};
  return String(d.caseNo || d.clueNo || '');
}

/**
 * yyyy-MM-dd / ISO 时间 → yyyy/MM/dd（台账模板格式）
 *
 * 关键：**纯日期串不做时区换算**。早期版本把 DatePicker 选中的本地 0 点存成了
 * UTC ISO（如本地 2026-07-23 → 2026-07-22T16:00:00.000Z），若直接截前 10 位会
 * 差一天。故：无时区标记的串直接取字面日期；带 Z / 偏移量的一律按本地时区取日期。
 */
export function toLedgerDate(v: unknown): string {
  if (!v) return '';
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s);
  const pad = (n: string) => String(Number(n)).padStart(2, '0');
  if (m && !hasZone) return `${m[1]}/${pad(m[2])}/${pad(m[3])}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}/${pad(String(d.getMonth() + 1))}/${pad(String(d.getDate()))}`;
  }
  return m ? `${m[1]}/${pad(m[2])}/${pad(m[3])}` : s;
}

/** 查控结果：「未反馈x 成功y 失败z」；三者皆 0 时返回 — */
export function buildLedgerResult(data: RequestData | undefined): string {
  const d = data || {};
  const pending = Number(d.feedbackPending ?? 0) || 0;
  const success = Number(d.feedbackSuccess ?? 0) || 0;
  const fail = Number(d.feedbackFail ?? 0) || 0;
  const parts: string[] = [];
  if (pending > 0) parts.push(`未反馈${pending}`);
  if (success > 0) parts.push(`成功${success}`);
  if (fail > 0) parts.push(`失败${fail}`);
  return parts.length ? parts.join(' ') : '—';
}

/** 台账「申请单」维度的一行（旧记录可能一条含多个申请单） */
export interface LedgerRequestLine {
  requestDate: unknown;
  applyReason: unknown;
  applicant: unknown;
  requestNo: unknown;
  controlType: unknown;
  requester: unknown;
}

/** 把一条调证登记展开为若干申请单行：新数据恒 1 行，旧 requestItems 数据按条展开 */
export function expandRequestLines(data: RequestData | undefined): LedgerRequestLine[] {
  const d = data || {};
  const items = requestItemsOf(d);
  if (items.length > 0) {
    return items.map((it) => ({
      requestDate: it.requestDate ?? d.requestDate,
      applyReason: it.applyReason ?? d.applyReason,
      applicant: it.applicant ?? d.applicant,
      requestNo: it.requestNo ?? d.requestNo,
      controlType: it.controlType ?? d.controlType,
      requester: it.requester ?? d.requester,
    }));
  }
  return [
    {
      requestDate: d.requestDate,
      applyReason: d.applyReason,
      applicant: d.applicant,
      requestNo: d.requestNo,
      controlType: d.controlType,
      requester: d.requester,
    },
  ];
}

// ─── 调证状态（「备注」列口径） ────────────────────────

/**
 * 任意文案 → 四档状态。
 * 已是四档之一原样返回；命中别名返回归并后的档位；都不命中则原样返回（自定义值 / 异常状态）。
 */
export function normalizeRequestStatus(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if ((REQUEST_STATUS_OPTIONS as readonly string[]).includes(s)) return s;
  for (const [alias, target] of STATUS_ALIASES) {
    if (s.includes(alias)) return target;
  }
  return s;
}

/** 从「申请状态：X；报文状态：Y」这类标注串里取某个标签后面的值 */
function extractLabeled(text: string, label: string): string {
  const m = text.match(new RegExp(`${label}\\s*[:：]\\s*([^\\s；;，,、|]+)`));
  return m ? m[1] : '';
}

/**
 * 平台两段状态 → 一档状态。
 *
 * 规则（涛哥 2026-09-19 定）：**报文状态有「已发送 / 已反馈」时以报文状态为准**；
 * 报文状态没有这两档（无信息 / 未发送 / 发送失败…）时，优先采用申请状态
 * （未审批 / 待审批 / 已提交 → 已提交；已审批 → 已审批）。
 */
export function statusFromPlatform(applyStatus?: unknown, messageStatus?: unknown): string {
  const msg = normalizeRequestStatus(messageStatus);
  if (msg === '已发送' || msg === '已反馈') return msg;
  const app = normalizeRequestStatus(applyStatus);
  if (app) return app;
  return msg;
}

/**
 * 「备注」列的展示口径：整列只呈现**一个**状态。
 *
 * 取数三条路：
 * 1. `requestStatus` 字段有值（V2.48.0 起的存储位置）→ 归一后直接用；
 * 2. 为空时回退解析旧的 `remarks` 标注串（「申请状态：X；报文状态：Y；案件校验状态：Z」）；
 * 3. 既不是四档也解析不出标注（用户自己写的备注，如「微信支付宝调取」）→ 原样展示，不丢信息。
 */
export function requestStatusOf(data: RequestData | undefined): string {
  const explicit = String(pickRequestValue(data, REQUEST_STATUS_FIELD) ?? '').trim();
  if (explicit) return normalizeRequestStatus(explicit);

  const raw = String(pickRequestValue(data, 'remarks') ?? '').trim();
  if (!raw) return '';
  if ((REQUEST_STATUS_OPTIONS as readonly string[]).includes(raw)) return raw;

  const msg = extractLabeled(raw, '报文状态');
  const app = extractLabeled(raw, '申请状态');
  if (msg) {
    const n = normalizeRequestStatus(msg);
    if (n === '已发送' || n === '已反馈') return n;
  }
  if (app) return normalizeRequestStatus(app);
  if (msg) return normalizeRequestStatus(msg);
  return normalizeRequestStatus(raw);
}

/**
 * 把一条记录的「状态」与「备注」分开 —— 用于抽屉打开旧记录时的迁移。
 *
 * - `requestStatus` 有值：直接用它，`remarks` 原样当备注（新旧数据都走这条）；
 * - `remarks` 是旧标注串 / 裸状态（如「申请状态：已审批；报文状态：已反馈」）：状态迁到 `requestStatus`，
 *   备注清空（那串本来就不是备注）；
 * - `remarks` 是用户手写的自由文本：留在备注里，状态留空。
 */
export function splitStatusAndRemarks(data: RequestData | undefined): { status: string; remarks: string } {
  const raw = String(pickRequestValue(data, 'remarks') ?? '').trim();
  const explicit = normalizeRequestStatus(pickRequestValue(data, REQUEST_STATUS_FIELD));
  // 只有**用户手写的自由文本**才算备注；旧标注串 / 裸状态词都不是备注
  const note = isFreeTextRemarks(raw) ? raw : '';
  if (explicit) return { status: explicit, remarks: note };
  if (!note) return { status: raw ? requestStatusOf(data) : '', remarks: '' };
  return { status: '', remarks: note };
}

/**
 * 备注是否为「自由文本」（既非空、也无法归一到状态 —— 例如「微信支付宝调取」）。
 *
 * 用途：抽屉保存时「填了反馈信息 → 备注自动置已反馈」的兜底 ——
 * 用户亲手写的备注不能被自动规则冲掉，只有空备注或状态类备注才允许自动改写。
 */
export function isFreeTextRemarks(v: unknown): boolean {
  const raw = String(v ?? '').trim();
  if (!raw) return false;
  if ((REQUEST_STATUS_OPTIONS as readonly string[]).includes(raw)) return false;
  if (extractLabeled(raw, '申请状态') || extractLabeled(raw, '报文状态')) return false;
  return normalizeRequestStatus(raw) === raw;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { App, DatePicker, Dropdown, Empty, Select, Table, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  CalendarPlus, Check, CheckCircle2, Clock, Columns3, Download, Eye, FileText, LayoutGrid,
  List, Pen, Plus, Printer, RefreshCw, Rows3, Search, Trash2, Upload, X,
} from 'lucide-react';
import { useAppStore } from "../store/appStore"
import { findModule, filterVisibleFields, type FieldDefinition } from '../moduleConfig';
import { useCustomModules } from '../customModules';
import { deleteMassRecord, deleteMassRecords, getMassRecords, updateMassRecord } from '../store/massStore';
import type { MassRecord } from '../store/massStore';
import { exportModuleToExcel, exportSelectedRecords, importExcelToModule } from '../utils/excelUtils';
import { rebuildCaseIndex, rebuildSuspectIndex, recordFieldValues } from '../store/inputHistoryStore';
import { exportModuleReport } from '../utils/reportGenerator';
import { generateFundReport } from '../utils/reportUtils';
import CaseDetail from './CaseDetail';
import InlineEditCell from '../components/InlineEditCell';
import { formatValue, formatBySetting, toDateStr } from '../utils/format';
import { buildLedgerDraft, ledgerEditField, mergeInlineEdit, REQUEST_LIST_COLUMNS } from '../utils/requestLedger';

type FieldValue = string | number | boolean | null | undefined | string[] | Record<string, unknown>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败';
}

/** 状态徽标的归一化类别（用于着色） */
type StatusKind = 'done' | 'warning' | 'danger' | 'info';

/**
 * 真实状态字段识别：select 类型且标签含这些关键字。
 * 用于替代原来恒取 data.status 的假「办理中」徽标。
 */
const STATUS_LABEL_HINTS = ['状态', '进度', '结案', '归档', '报销', '反馈', '整改', '结果', '办理', '审批', '审核', '处理', '进展', '环节', '阶段', '情况', '流转'];

function findStatusField(fields: FieldDefinition[]): FieldDefinition | null {
  // 1) 标签命中关键字
  const byLabel = fields.find((f) => f.type === 'select' && STATUS_LABEL_HINTS.some((h) => f.label.includes(h)));
  if (byLabel) return byLabel;
  // 2) id 命中（常见命名）
  const byId = fields.find((f) => f.type === 'select' && /^(status|state|approvalStatus|handleStatus|procStatus|caseStatus|flowStatus)$/i.test(f.id));
  if (byId) return byId;
  // 3) 单选字段且标签以「状态/情况」结尾的兜底
  return fields.find((f) => f.type === 'select' && /(状态|情况|进度|结果)$/.test(f.label)) || null;
}

function mapStatusKind(value: string): StatusKind {
  const v = (value || '').trim();
  const done = ['已结案', '已办结', '已完成', '已反馈', '已报销', '息诉罢访', '化解', '通过', '合格', '归档', '无需整改', '已整改', '正常'];
  const danger = ['超期', '逾期', '已过期', '异常', '退回', '不通过', '不合格', '未化解', '仍有越级上访苗头', '重点管控'];
  const warning = ['待补充', '待报销', '未反馈', '未结案', '未办结', '整改中', '初查中', '办理中', '进行中', '调查中', '迟到', '缺勤', '待公示', '未整改'];
  if (done.includes(v)) return 'done';
  if (danger.includes(v)) return 'danger';
  if (warning.includes(v)) return 'warning';
  return 'info';
}

/** 从记录真实状态字段派生徽标；无状态字段返回 null（不显示假徽标） */
function deriveStatus(rec: MassRecord, fields: FieldDefinition[]): { label: string; kind: StatusKind } | null {
  const sf = findStatusField(fields);
  if (!sf) return null;
  const val = rec.data?.[sf.id];
  if (val == null || String(val).trim() === '') return null;
  return { label: String(val), kind: mapStatusKind(String(val)) };
}

/** 取字段定义中前 N 个数据字段（跳过 section / attachment） */
function getDataFields(fields: FieldDefinition[], n = 6): FieldDefinition[] {
  const dataFields = fields.filter((f) => f.type !== 'section' && f.type !== 'attachment');
  // 如果是 repeatable section 模块，从 section 内的字段取
  if (dataFields.length === 0) {
    const sectionFields = getRepeatableSectionFields(fields);
    return sectionFields.slice(0, n);
  }
  return dataFields.slice(0, n);
}

/**
 * 调证登记列表列 = 录入工作列（序号 / 案件（线索）名称 / 线索·案件编号 / 申请时间 /
 * 申请单位 / 申请人 / 申请单号 / 反馈时间 / 查控结果 / 请求查控人 / 备注）。
 * 列定义（标题 / 取值 / 行内编辑元数据）统一来自 utils/requestLedger 的
 * REQUEST_LIST_COLUMNS —— **列表只为录入效率服务，导出模板不受影响**：
 * 导出仍按单位《资金查控情况登记台账（周五报送）》十列（LEDGER_HEADERS）。
 */

/** 从记录中获取值，支持 repeatable section 嵌套取值 */
function getFieldValue(rec: MassRecord, fieldId: string, fields: FieldDefinition[]): FieldValue {
  const val = rec.data?.[fieldId];
  if (val !== undefined && val !== null) return val as FieldValue;

  // 尝试从 repeatable section 数组中取值
  for (const f of fields) {
    if (f.type === 'section' && f.repeatable) {
      const listName = f.listName || 'items';
      const arr = rec.data?.[listName];
      if (Array.isArray(arr) && arr.length > 0) {
        const itemVal = arr[0][fieldId];
        if (itemVal !== undefined && itemVal !== null) return itemVal;
      }
    }
  }
  return undefined;
}

/** 取 repeatable section 内的字段列表 */
function getRepeatableSectionFields(fields: FieldDefinition[]): FieldDefinition[] {
  const result: FieldDefinition[] = [];
  let inSection = false;
  for (const f of fields) {
    if (f.type === 'section' && f.repeatable) { inSection = true; continue; }
    if (f.type === 'section' && !f.repeatable && inSection) break;
    if (inSection && f.type !== 'section' && f.type !== 'attachment') result.push(f);
  }
  return result;
}

/** 时间戳截取到分钟：2026-05-23 09:41 */
function fmtTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

export default function ModulePage() {
  const { modal } = App.useApp();
  const currentPage = useAppStore((s) => s.currentPage);
  const openModal = useAppStore((s) => s.openModal);
  const showToast = useAppStore((s) => s.showToast);
  const modalId = useAppStore((s) => s.modalId);
  const editRecord = useAppStore((s) => s.editRecord);
  const setEditRecord = useAppStore((s) => s.setEditRecord);
  const setCurrentTabId = useAppStore((s) => s.setCurrentTabId);
  const userRole = useAppStore((s) => s.userRole);
  const { allModules } = useCustomModules();
  const module = useMemo(() => findModule(currentPage, allModules), [allModules, currentPage]);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 案件360°全屏视图
  const [caseDetail, setCaseDetail] = useState<MassRecord | null>(null);
  // 多选
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // ─── 筛选状态 ───
  const [filterText, setFilterText] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterHandler, setFilterHandler] = useState<string | null>(null);
  const [filterCase, setFilterCase] = useState<string | null>(null);
  const [filterPerson, setFilterPerson] = useState<string | null>(null);
  const [filterBattle, setFilterBattle] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [dense, setDense] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

  const activeTab = module
    ? activeTabs[module.id] && module.tabs.some((tab) => tab.id === activeTabs[module.id])
      ? activeTabs[module.id]
      : module.tabs[0]?.id || ''
    : '';

  // 从 localStorage 读取真实数据
  const [refreshKey, setRefreshKey] = useState(0);
  const realRecords = useMemo(() => {
    if (!module) return [];
    void refreshKey;
    return getMassRecords(module.id);
  }, [module, refreshKey]);

  // 编辑/新建保存后刷新列表
  const prevEditRef = useRef(editRecord);
  useEffect(() => {
    if (prevEditRef.current && !editRecord) {
      setRefreshKey(k => k + 1);
    }
    prevEditRef.current = editRecord;
  }, [editRecord]);

  // 新建弹窗关闭后（无 editRecord）也刷新
  const prevModalRef = useRef(modalId);
  useEffect(() => {
    if (prevModalRef.current === 'newRecord' && modalId === null) {
      setRefreshKey(k => k + 1);
    }
    prevModalRef.current = modalId;
  }, [modalId]);

  if (!module) {
    return (
      <div className="panel" style={{ minHeight: 420, display: 'grid', placeItems: 'center' }}>
        <Empty description="当前模块不存在或已被删除" />
      </div>
    );
  }

  const active = module.tabs.find((tab) => tab.id === activeTab) || module.tabs[0];

  // 列表默认排序：受全局「列表排序」设置驱动
  const listSort = useAppStore((s) => s.listSort);
  const activeRecords = useMemo(() => {
    const list = realRecords.filter((r) => r.tabId === activeTab);
    const cmp: Record<typeof listSort, (a: typeof list[number], b: typeof list[number]) => number> = {
      updatedDesc: (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''),
      updatedAsc: (a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''),
      createdDesc: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
      createdAsc: (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''),
      module: (a, b) => a.moduleId.localeCompare(b.moduleId),
    };
    return [...list].sort(cmp[listSort]);
  }, [realRecords, activeTab, listSort]);

  // ─── 字段与派生（必须先于 filteredRecords 定义，避免 statusByRecord 暂时性死区报错） ──
  const fields = active?.fields || [];
  const visibleFields = useMemo(() => filterVisibleFields(fields, userRole), [fields, userRole]);
  const dataFields = useMemo(() => getDataFields(visibleFields, 6), [visibleFields]);

  // 调证登记：列表直接呈现《资金查控情况登记台账（周五报送）》口径（列定义在 utils/requestLedger），
  // 其中「备注」列即调证状态。故它**不参与**通用的「状态徽标 / 状态筛选 / 已办结 KPI」——
  // 否则会凭空多出「办理中 / 待补充 / 已办结」三个与调证口径不搭的筛选项。
  const isRequestLedger = module.id === 'evidence-request';

  // 派生每条记录的真实状态（徽标 / 统计 / 筛选共用单一数据源）
  // 注意：基于模块全部字段(fields)而非可见列(visibleFields)，避免状态列被隐藏后状态全部丢失
  const statusByRecord = useMemo(() => {
    const m = new Map<string, { label: string; kind: StatusKind } | null>();
    if (isRequestLedger) return m;
    for (const rec of realRecords) m.set(rec.id, deriveStatus(rec, fields));
    return m;
  }, [realRecords, fields, isRequestLedger]);
  const hasStatusField = !isRequestLedger && !!findStatusField(fields);

  // ─── 筛选逻辑 ────────────────────────────────
  const filteredRecords = useMemo(() => {
    let list = activeRecords;
    if (filterText.trim()) {
      const kw = filterText.trim().toLowerCase();
      list = list.filter((r) =>
        Object.values(r.data || {}).some((v) =>
          v != null && String(v).toLowerCase().includes(kw)
        )
      );
    }
    if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
      const start = filterDateRange[0].valueOf();
      const end = filterDateRange[1].valueOf();
      list = list.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        return t >= start && t <= end;
      });
    }
    if (filterStatus) {
      list = list.filter((r) => {
        const s = statusByRecord.get(r.id) ?? null;
        if (filterStatus === '已完成') return s?.kind === 'done';
        if (filterStatus === '待补充') return s?.kind === 'warning';
        return (s?.kind ?? 'info') !== 'done'; // 办理中 = 非已办结
      });
    }
    if (filterHandler) {
      list = list.filter((r) => {
        const h = String(r.data?.handler || r.data?.handlerName || '');
        return h === filterHandler;
      });
    }
    if (filterCase) {
      list = list.filter((r) => String(r.data?.caseName || '').trim() === filterCase);
    }
    if (filterPerson) {
      list = list.filter((r) => {
        const pn = String(r.data?.suspect || r.data?.subjectName || r.data?.reporterName || r.data?.name || r.data?.personName || '').trim();
        return pn === filterPerson;
      });
    }
    if (filterBattle) {
      list = list.filter((r) => String(r.data?.battleType || '') === filterBattle);
    }
    return list;
  }, [activeRecords, filterText, filterDateRange, filterStatus, filterHandler, filterCase, filterPerson, filterBattle, statusByRecord]);

  interface DynamicRow {
    key: string;
    code: string;
    [fieldId: string]: unknown;
    _handler: string;
    _status: { label: string; kind: StatusKind } | null;
    _updatedAt: string;
    _record: MassRecord;
  }

  const rows = useMemo<DynamicRow[]>(() => filteredRecords.map((rec, index) => {
    const row: DynamicRow = {
      key: rec.id,
      code: String(index + 1).padStart(4, '0'),
      _handler: String(rec.data?.handler || rec.data?.handlerName || '—'),
      _status: statusByRecord.get(rec.id) ?? null,
      _updatedAt: fmtTime(rec.updatedAt),
      _record: rec,
    };
    for (const f of dataFields) {
      row[f.id] = formatValue(getFieldValue(rec, f.id, fields));
    }
    return row;
  }), [filteredRecords, dataFields, fields]);

  // 可切换显示的列（编号与操作始终固定）
  const toggleableCols = useMemo(() => {
    // 调证登记：列设置项 = 列表工作列（与表格表头同一口径）
    if (module.id === 'evidence-request') {
      return REQUEST_LIST_COLUMNS.map((c) => ({ key: c.key, label: c.title }));
    }
    const arr = dataFields.map((f) => ({ key: f.id, label: f.label }));
    if (module.departmentId === 'office') arr.push({ key: '_handler', label: '经办人' });
    arr.push({ key: '_updatedAt', label: '更新时间' });
    return arr;
  }, [dataFields, module]);

  const colMenuItems = useMemo(() => toggleableCols.map((c) => ({ key: c.key, label: c.label })), [toggleableCols]);
  const visibleColKeys = useMemo(() => toggleableCols.filter((c) => !hiddenCols.has(c.key)).map((c) => c.key), [toggleableCols, hiddenCols]);

  // 打印态：必须在 dynamicColumns 之前声明，否则 useMemo 闭包访问到尚未初始化的 printing（TDZ 报错）
  const [printing, setPrinting] = useState(false);

  // ─── 行内编辑：点「哪一格」改「哪一格」 ────────────────────────
  // 原来是「点行 → 案件 360° 全屏视图 → 再点编辑 → 抽屉」，改一个字段要四步；
  // 后改为点行整行变控件（一行里所有列同时变输入框，容易误改、也不清楚在改什么）。
  // 现在：点某一格只把这一格换成控件，其余列保持只读；点到别的格 / 行外自动保存当前格。
  // 「操作」列的 查看 / 编辑 / 删除 按钮保持不变（抽屉仍负责附件等复杂字段）。
  const [inlineId, setInlineId] = useState<string | null>(null);
  /** 正在编辑的列 key（配合 inlineId 定位唯一单元格） */
  const [inlineField, setInlineField] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<Record<string, unknown>>({});

  /**
   * 同步态的编辑定位：state 更新是异步的，而「点行外自动提交」与
   * 「点另一格先提交上一格」可能在同一 tick 内先后触发 commitInline，
   * 用 state 判断会重复提交（两次写库 + 两次提示）。故用 ref 保存唯一真值。
   */
  const inlineStateRef = useRef<{ id: string | null; field: string | null }>({ id: null, field: null });

  /** 可编辑字段：附件与分组没有单值控件，行内不改（附件仍在抽屉里管） */
  const isFieldEditable = (t: FieldDefinition['type']) => t !== 'section' && t !== 'attachment';

  /** 行内编辑草稿：一律取记录原始存储值（不能用 formatValue 的展示值，金额会带千分位） */
  const buildDraft = (rec: MassRecord): Record<string, unknown> => {
    if (isRequestLedger) return buildLedgerDraft((rec.data || {}) as Record<string, unknown>);
    const draft: Record<string, unknown> = {};
    for (const f of dataFields) {
      if (!isFieldEditable(f.type)) continue;
      draft[f.id] = getFieldValue(rec, f.id, fields) ?? '';
    }
    return draft;
  };

  const exitInline = () => {
    inlineStateRef.current = { id: null, field: null };
    setInlineId(null);
    setInlineField(null);
    setInlineDraft({});
  };

  /** 提交当前单元格；与库中数据一致时静默退出，不写库也不弹提示 */
  const commitInline = () => {
    const id = inlineStateRef.current.id;
    if (!id) return;
    const rec = realRecords.find((r) => r.id === id);
    const draft = inlineDraft;
    exitInline();
    if (!rec) return;
    const prev = (rec.data || {}) as Record<string, unknown>;
    const next = isRequestLedger ? mergeInlineEdit(prev, draft) : { ...prev, ...draft };
    if (JSON.stringify(next) === JSON.stringify(prev)) return;
    updateMassRecord(rec.id, next);
    // 行内改的值同样要进全局池：案件名称/编号由 rebuildCaseIndex 兜底，
    // 但线索名称/线索编号这类只认历史池的字段，不写就联想不到。
    recordFieldValues(
      Object.entries(draft)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        .map(([k, v]) => [k, v] as const)
    );
    const all = getMassRecords();
    rebuildCaseIndex(all);
    rebuildSuspectIndex(all);
    setRefreshKey((k) => k + 1);
    showToast('已保存修改', 'success');
  };

  /**
   * 点某格进入该格编辑。若已有别的格在编辑，先把它存了。
   * `initNow` 为真时（反馈时间）以**当前日期**初始化 —— 点一下就是当下。
   */
  const startInlineCell = (row: DynamicRow, fieldKey: string, initNow?: boolean) => {
    if (printing) return;
    const cur = inlineStateRef.current;
    if (cur.id === row.key && cur.field === fieldKey) return;
    if (cur.id) commitInline();
    const draft = buildDraft(row._record);
    if (initNow) {
      const col = REQUEST_LIST_COLUMNS.find((c) => c.key === fieldKey);
      const edit = col?.edit;
      if (edit?.field) {
        const writeKey =
          ledgerEditField((row._record.data || {}) as Record<string, unknown>, edit) || edit.field;
        draft[writeKey] = toDateStr(new Date());
      }
    }
    inlineStateRef.current = { id: row.key, field: fieldKey };
    setInlineDraft(draft);
    setInlineId(row.key);
    setInlineField(fieldKey);
  };

  // 编辑态点「行外」（侧栏 / 其他区域 / 分页）自动提交，避免改一半切走丢数据。
  // 日期与下拉的弹层是 portal 到 body 的，必须排除，否则选项还没点完就被提交。
  // 用 ref 读最新闭包，事件只挂一次。
  const commitRef = useRef<() => void>(() => {});
  commitRef.current = commitInline;
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!inlineStateRef.current.id) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('.mp-row-editing') || t.closest('.ant-picker-dropdown') || t.closest('.ant-select-dropdown')) return;
      commitRef.current();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const dynamicColumns = useMemo<ColumnsType<DynamicRow>>(() => {
    const base: ColumnsType<DynamicRow> = [
      {
        title: isRequestLedger ? '序号' : '编号',
        dataIndex: 'code',
        ...(printing ? {} : { width: 60, fixed: 'left' as const }),
        sorter: (a: DynamicRow, b: DynamicRow) => Number(a.code) - Number(b.code),
        // 台账序号为纯数字（1、2、3…），去掉列表编号的 4 位补零
        ...(isRequestLedger ? { render: (v: string) => String(Number(v)) } : {}),
      },
      ...(isRequestLedger
        ? REQUEST_LIST_COLUMNS.map((c) => {
            // 列表列一律直接从记录原文取值（与导出共用同一批取值函数，口径不漂）
            const val = (row: DynamicRow) => c.get((row._record.data || {}) as Record<string, unknown>);
            const edit = c.edit;
            // 只有「正在编辑的那一格」变控件，其余列保持只读
            const cellEditing = !printing && !!edit && inlineId !== null && inlineField === c.key;
            return {
              title: c.title,
              dataIndex: c.key,
              // 编辑态给控件留出更宽的列，且不能 ellipsis，否则输入框被裁
              ...(printing
                ? {}
                : cellEditing
                  ? { width: edit?.editWidth || c.width }
                  : { width: c.width, ellipsis: true }),
              render: (_: unknown, row: DynamicRow) => {
                const text = val(row);
                if (!edit) return text;
                if (!printing && inlineId === row.key && inlineField === c.key) {
                  if (edit.type === 'result') {
                    return (
                      <InlineEditCell
                        type="result"
                        resultValues={inlineDraft}
                        onChange={() => {}}
                        onResultChange={(k, v) => setInlineDraft((d) => ({ ...d, [k]: v == null ? '' : v }))}
                        onCommit={commitInline}
                        onCancel={exitInline}
                      />
                    );
                  }
                  // 写回键：主字段为空而备选有值时写备选（线索调证不写成案件字段）
                  const writeKey = ledgerEditField((row._record.data || {}) as Record<string, unknown>, edit) || edit.field;
                  if (!writeKey) return text;
                  // 下拉选项优先取**列定义自带**的 options / customOptionKey（台账口径单一事实源），
                  // 缺省再回退字段定义（申请单位复用「协查单位」下拉与自定义添加）
                  const fd = edit.field ? fields.find((x) => x.id === edit.field) : undefined;
                  return (
                    <InlineEditCell
                      type={edit.type}
                      value={inlineDraft[writeKey]}
                      options={edit.options ?? fd?.options}
                      customOptionKey={edit.customOptionKey ?? fd?.customOptionKey}
                      onChange={(v) => setInlineDraft((d) => ({ ...d, [writeKey]: v }))}
                      onCommit={commitInline}
                      onCancel={exitInline}
                    />
                  );
                }
                return (
                  <span
                    className="mp-cell-edit"
                    title={edit.hint || '点击修改'}
                    onClick={(e) => { e.stopPropagation(); startInlineCell(row, c.key, edit.initNow); }}
                  >
                    {text || <span className="mp-cell-empty">—</span>}
                  </span>
                );
              },
              sorter: (a: DynamicRow, b: DynamicRow) => val(a).localeCompare(val(b), 'zh-Hans-CN'),
            };
          })
        : dataFields.map((f) => {
        // 调证登记：案件/线索调证共用列表列，按记录实际取值在 case*/clue* 间回退，避免线索记录空白
        const isRequestInfo = module.id === 'evidence-request' && ['caseNo', 'caseName', 'caseSource', 'caseType'].includes(f.id);
        const neutralTitle = isRequestInfo
          ? ({ caseNo: '编号', caseName: '名称', caseSource: '来源', caseType: '类型' } as Record<string, string>)[f.id]
          : f.label;
        const editable = isFieldEditable(f.type);
        // 只有被点中的那一格进入编辑态
        const cellEditing = !printing && editable && inlineId !== null && inlineField === f.id;
        return {
          title: neutralTitle,
          dataIndex: f.id,
          ...(printing
            ? {}
            : cellEditing
              ? { width: f.type === 'date' || f.type === 'select' ? 170 : 140 }
              : { width: 120, ellipsis: true }),
          render: (_v: unknown, record: DynamicRow) => {
            // 该行该列正在编辑 → 换成控件（附件列没有单值控件，保持只读展示）
            if (!printing && inlineId === record.key && inlineField === f.id && editable) {
              return (
                <InlineEditCell
                  type={f.type as 'text' | 'textarea' | 'number' | 'date' | 'select'}
                  value={inlineDraft[f.id]}
                  options={f.options}
                  customOptionKey={f.customOptionKey}
                  onChange={(v) => setInlineDraft((d) => ({ ...d, [f.id]: v }))}
                  onCommit={commitInline}
                  onCancel={exitInline}
                />
              );
            }
            const main = (record as Record<string, unknown>)[f.id];
            let text = '';
            if (main != null && main !== '') text = String(main);
            else if (isRequestInfo) {
              // 线索调证记录：案件字段为空时回退到同名的 clue* 字段
              const alt = (record as Record<string, unknown>)['clue' + f.id.slice(4)];
              text = alt != null && alt !== '' ? String(alt) : '';
            } else {
              text = main == null ? '' : String(main);
            }
            if (!editable) return text;
            return (
              <span
                className="mp-cell-edit"
                title="点击修改"
                onClick={(e) => { e.stopPropagation(); startInlineCell(record, f.id); }}
              >
                {text || <span className="mp-cell-empty">—</span>}
              </span>
            );
          },
          sorter: (a: DynamicRow, b: DynamicRow) => {
            const va = a[f.id];
            const vb = b[f.id];
            if (va == null && vb == null) return 0;
            if (va == null) return -1;
            if (vb == null) return 1;
            if (f.type === 'number') return Number(va) - Number(vb);
            return String(va).localeCompare(String(vb));
          },
          defaultSortOrder: f.type === 'date' ? ('descend' as const) : undefined,
        };
      })),
      ...(module.departmentId === 'office' && !isRequestLedger
        ? [{ title: '经办人' as const, dataIndex: '_handler' as const, ...(printing ? {} : { width: 80, ellipsis: true }),
            sorter: (a: DynamicRow, b: DynamicRow) => a._handler.localeCompare(b._handler) }]
        : []),
      ...(isRequestLedger
        ? []
        : [{ title: '更新时间', dataIndex: '_updatedAt', ...(printing ? {} : { width: 130 }), sorter: (a: DynamicRow, b: DynamicRow) => a._updatedAt.localeCompare(b._updatedAt), defaultSortOrder: 'descend' as const, render: (v: string) => formatBySetting(v, { withTime: true }) }]),
      {
        title: '操作',
        dataIndex: '_action',
        ...(printing ? {} : { width: 200, fixed: 'right' as const }),
        className: 'mp-act-col',
        render: (_: unknown, record: DynamicRow) => {
          const editing = !printing && inlineId === record.key;
          return (
            <div className="mp-act-col">
              {/* 有格子在编辑时，额外给保存 / 放弃两个出口（回车与 Esc 同样有效）；
                  查看 / 编辑 / 删除 恒定保留 */}
              {editing && (
                <>
                  <button className="mp-act-btn primary" title="保存修改（回车）" onClick={(e) => { e.stopPropagation(); commitInline(); }}>
                    <Check size={16} />
                  </button>
                  <button className="mp-act-btn" title="放弃修改（Esc）" onClick={(e) => { e.stopPropagation(); exitInline(); }}>
                    <X size={16} />
                  </button>
                </>
              )}
              <button className="mp-act-btn" title="查看" onClick={(e) => { e.stopPropagation(); setCaseDetail(record._record); }}>
                <Eye size={16} />
              </button>
              <button className="mp-act-btn" title="编辑（完整表单）" onClick={(e) => { e.stopPropagation(); setEditRecord(record._record); openModal('newRecord'); }}>
                <Pen size={16} />
              </button>
              <button className="mp-act-btn danger" title="删除" onClick={(e) => { e.stopPropagation(); handleDeleteSingle(record._record); }}>
                <Trash2 size={16} />
              </button>
            </div>
          );
        },
      },
    ];
    return base.filter((col) => {
      const k = (col as { dataIndex?: unknown }).dataIndex;
      if (typeof k === 'string') return !hiddenCols.has(k);
      return true;
    });
  },
  // inlineId / inlineField / inlineDraft 必须进依赖：列的 render 闭包要读到当前编辑的
  // 单元格与草稿，否则点格进入编辑后表格不会重渲染成编辑态。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [dataFields, module, fields, hiddenCols, printing, isRequestLedger, inlineId, inlineField, inlineDraft]);

  // ─── 经办人选项 ───────────────────────────────
  const handlerOptions = useMemo(() => {
    const handlers = Array.from(new Set(
      activeRecords
        .map((r) => String(r.data?.handler || r.data?.handlerName || '').trim())
        .filter(Boolean)
    )).sort();
    return handlers.map((h) => ({ label: h, value: h }));
  }, [activeRecords]);

  // ─── 案件选项（按案件筛选） ───────────────────
  const caseOptions = useMemo(() => {
    const names = Array.from(new Set(
      activeRecords.map((r) => String(r.data?.caseName || '').trim()).filter(Boolean)
    )).sort();
    return names.map((n) => ({ label: n, value: n }));
  }, [activeRecords]);

  // ─── 人员选项（按人员筛选：嫌疑人/主体/举报人/姓名等） ──
  const personOptions = useMemo(() => {
    const names = Array.from(new Set(
      activeRecords
        .map((r) => String(r.data?.suspect || r.data?.subjectName || r.data?.reporterName || r.data?.name || r.data?.personName || '').trim())
        .filter(Boolean)
    )).sort();
    return names.map((n) => ({ label: n, value: n }));
  }, [activeRecords]);

  // ─── 战役类型筛选（仅含 battleType 字段的模块，如「集群战役」：集群/协同/协查边界隔离） ──
  const hasBattleType = fields.some((f) => f.id === 'battleType');
  const battleOptions = useMemo(() => {
    if (!hasBattleType) return [];
    const opts = ['集群', '协同', '协查'];
    return opts.map((c) => ({ label: c, value: c }));
  }, [hasBattleType]);

  // ─── 状态筛选 chip ────────────────────────────
  const statusChips = [
    { label: '办理中', value: '办理中', color: 'var(--color-primary)' },
    { label: '待补充', value: '待补充', color: 'var(--color-warning)' },
    { label: '已办结', value: '已完成', color: 'var(--color-success)' },
  ];

  // ─── KPI 统计 ─────────────────────────────────
  const total = realRecords.length;
  const thisMonth = realRecords.filter((r) => {
    if (!r.createdAt) return false;
    const d = new Date(); const pad = (n: number) => String(n).padStart(2, '0');
    const cur = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    const cd = new Date(r.createdAt); const rec = cd.getFullYear() + '-' + pad(cd.getMonth() + 1);
    return cur === rec;
  }).length;
  const done = realRecords.filter((r) => (statusByRecord.get(r.id)?.kind ?? null) === 'done').length;
  const ongoing = total - done;
  const kpis = [
    { label: '全部记录', value: total, icon: FileText, color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
    { label: '本月新增', value: thisMonth, icon: CalendarPlus, color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
    { label: '已办结', value: done, icon: CheckCircle2, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    { label: '办理中', value: ongoing, icon: Clock, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  ];

  // ─── 选择 / 列切换辅助 ────────────────────────
  const toggleSelect = (key: React.Key) =>
    setSelectedRowKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const toggleCol = (key: string) =>
    setHiddenCols((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const clearFilters = () => { setFilterText(''); setFilterDateRange(null); setFilterStatus(null); setFilterHandler(null); setFilterCase(null); setFilterPerson(null); setFilterBattle(null); };

  // ─── 导入处理 ─────────────────────────────────
  const handleImport = async (file: File) => {
    try {
      const result = await importExcelToModule(file, module.id, activeTab);
      if (result.success > 0) {
        showToast(`成功导入 ${result.success} 条记录${result.failed > 0 ? `，${result.failed} 条失败` : ''}`, result.failed > 0 ? 'warning' : 'success');
        setRefreshKey(k => k + 1);
      } else {
        showToast(result.errors[0] || '导入失败', 'error');
      }
    } catch (err) {
      showToast(`导入出错: ${getErrorMessage(err)}`, 'error');
    }
  };

  // ─── 删除处理 ─────────────────────────────────
  const handleDeleteSingle = (record: MassRecord) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除该记录吗？删除后不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteMassRecord(record.id);
        setRefreshKey(k => k + 1);
        showToast('记录已删除', 'success');
      },
    });
  };

  const handleBatchDelete = () => {
    const ids = selectedRowKeys as string[];
    if (ids.length === 0) return;
    modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${ids.length} 条记录吗？删除后不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteMassRecords(ids);
        setSelectedRowKeys([]);
        setRefreshKey(k => k + 1);
        showToast(`已删除 ${ids.length} 条记录`, 'success');
      },
    });
  };

  const handleExportSelected = () => {
    const ids = selectedRowKeys as string[];
    if (ids.length === 0) {
      showToast('请先勾选要导出的记录', 'warning');
      return;
    }
    exportSelectedRecords(ids, module.id, activeTab);
    showToast(`正在导出 ${ids.length} 条记录...`, 'info');
  };

  const handleBatchStatus = () => {
    const sf = findStatusField(fields);
    if (!sf) {
      showToast('当前模块没有状态字段，无法批量改状态', 'warning');
      return;
    }
    const ids = selectedRowKeys as string[];
    if (ids.length === 0) return;
    let target = '';
    const opts = (sf.options || []).map((o) =>
      typeof o === 'string' ? { label: o, value: o } : { label: (o as { label: string }).label, value: (o as { value: string }).value }
    );
    modal.confirm({
      title: '批量修改状态',
      content: (
        <Select
          style={{ width: '100%', marginTop: 8 }}
          placeholder={`选择要设为的状态（${sf.label}）`}
          options={opts}
          onChange={(v: string) => { target = v; }}
        />
      ),
      okText: '应用',
      onOk: () => {
        if (!target) {
          showToast('请先选择状态', 'warning');
          return;
        }
        ids.forEach((id) => updateMassRecord(id, { [sf.id]: target }));
        setRefreshKey((k) => k + 1);
        showToast(`已将 ${ids.length} 条记录状态设为「${target}」`, 'success');
      },
    });
  };

  const printStyleRef = useRef<HTMLStyleElement | null>(null);

  /** 汇总当前生效的筛选条件，用于打印页眉展示 */
  const buildPrintFilters = (): string[] => {
    const f: string[] = [];
    if (filterText.trim()) f.push(`关键词「${filterText.trim()}」`);
    if (filterDateRange && filterDateRange[0] && filterDateRange[1])
      f.push(`日期 ${filterDateRange[0].format('YYYY-MM-DD')} ~ ${filterDateRange[1].format('YYYY-MM-DD')}`);
    if (filterStatus) f.push(`状态「${filterStatus}」`);
    if (filterHandler) f.push(`经办人「${filterHandler}」`);
    if (filterCase) f.push(`案件「${filterCase}」`);
    if (filterPerson) f.push(`人员「${filterPerson}」`);
    if (filterBattle) f.push(`战役「${filterBattle}」`);
    return f;
  };

  const handlePrintList = (orientation: 'auto' | 'portrait' | 'landscape' = 'auto') => {
    setPrinting(true);
    // 等待 printing 态重渲染（表格关闭分页、展示全部行）后再唤起打印
    setTimeout(() => {
      // 统计可见列数（排除选择列与操作列），自动判定横向
      const ths = document.querySelectorAll('.ant-table-thead th');
      let visibleCols = 0;
      ths.forEach((th) => {
        const cls = (th as HTMLElement).className || '';
        if (cls.includes('ant-table-selection-column') || cls.includes('mp-act-col')) return;
        visibleCols++;
      });
      const useLandscape = orientation === 'landscape' || (orientation === 'auto' && visibleCols > 8);
      // 注入 @page 方向（覆盖默认纵向），打印结束后移除
      const style = document.createElement('style');
      style.id = 'print-orientation';
      style.textContent = useLandscape
        ? '@page { size: A4 landscape; margin: 10mm; }'
        : '@page { size: A4 portrait; margin: 12mm; }';
      document.head.appendChild(style);
      printStyleRef.current = style;
      window.print();
    }, 80);
  };

  useEffect(() => {
    const onAfter = () => {
      setPrinting(false);
      if (printStyleRef.current) {
        printStyleRef.current.remove();
        printStyleRef.current = null;
      }
    };
    window.addEventListener('afterprint', onAfter);
    return () => window.removeEventListener('afterprint', onAfter);
  }, []);

  return (
    <div>
      {/* 打印专用页眉：屏幕态隐藏，打印态显示模块名+类目+筛选条件+时间+条数 */}
      <div className="print-list-header">
        <div className="plh-title">{module?.label} · 记录列表</div>
        <div className="plh-sub">{module?.departmentLabel} · 当前类目：{active?.label || module?.label}</div>
        <div className="plh-meta">
          <span>打印时间：{dayjs().format('YYYY-MM-DD HH:mm')}</span>
          <span>共 {rows.length} 条</span>
          {buildPrintFilters().length > 0 && (
            <span>筛选条件：{buildPrintFilters().join('；')}</span>
          )}
        </div>
      </div>
      {/* 头部 */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mp-head"
      >
        <div className="mp-head-ico"><FileText size={22} /></div>
        <div>
          <div className="mp-head-title">{module.label}</div>
          <div className="mp-head-sub">{module.departmentLabel} · 当前类目：{active?.label || module.label}</div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = '';
          }}
        />
      </motion.div>

      {/* KPI 卡 */}
      <div className="mp-kpi-row">
        {kpis.map((k) => {
          const Ico = k.icon;
          return (
            <div key={k.label} className="wb-kpi">
              <div className="wb-kpi-ico" style={{ background: k.bg, color: k.color }}>
                <Ico size={22} />
              </div>
              <div>
                <div className="wb-kpi-label">{k.label}</div>
                <div className="wb-kpi-val">{k.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 工具栏：按功能分 4 区 */}
      <div className="mp-toolbar">
        {/* 区1 视图切换 */}
        <div className="mp-tb-group">
          <span className="mp-tb-label">视图</span>
          <div className="mp-seg">
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
              <List size={14} /> 表格
            </button>
            <button className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')}>
              <LayoutGrid size={14} /> 卡片
            </button>
          </div>
        </div>
        <div className="mp-tb-sep" />

        {/* 区2 主操作 */}
        <div className="mp-tb-group">
          <span className="mp-tb-label">操作</span>
          <button
            className="mp-btn primary"
            onClick={() => { if (module && activeTab) setCurrentTabId(activeTab); openModal('newRecord'); }}
          >
            <Plus size={16} /> 新建{active?.label || module.label}
          </button>
          <button className="mp-btn" title="按本页字段导出 Excel（文件名带日期时分秒，同日多次导出不重名）；也可先在「导入导出」页下载本模块空白模板，填好后导入快速录入" onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} /> 导入
          </button>
          <button className="mp-btn" title="导出本页数据为 Excel（文件名含 yyyy-MM-dd_HH-mm-ss，同日多次导出不会重名）；导出文件可在「导入导出」页改后重新导入" onClick={() => { exportModuleToExcel(module.id, activeTab); showToast('正在生成 Excel...', 'info'); }}>
            <Download size={15} /> 导出
          </button>
          {module.id === 'evidence-report' ? (
            <button className="mp-btn" onClick={() => {
              try { generateFundReport(); showToast('正在生成资金分析报告...', 'info'); }
              catch (err) { showToast(getErrorMessage(err), 'error'); }
            }}>
              <FileText size={15} /> 资金分析报告
            </button>
          ) : (
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'daily', icon: <FileText size={13} />, label: '生成日报' },
                  { key: 'weekly', icon: <FileText size={13} />, label: '生成周报' },
                  { key: 'monthly', icon: <FileText size={13} />, label: '生成月报' },
                ],
                onClick: ({ key }) => {
                  if (!module) return;
                  try {
                    exportModuleReport(module, key as 'daily' | 'weekly' | 'monthly');
                    showToast('正在导出' + module.label + '的' + (key === 'daily' ? '日报' : key === 'weekly' ? '周报' : '月报'));
                  } catch (err) {
                    showToast(getErrorMessage(err), 'error');
                  }
                },
              }}
            >
              <button className="mp-btn"><FileText size={15} /> 生成报告</button>
            </Dropdown>
          )}
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'auto', icon: <Printer size={13} />, label: '打印（自动方向）' },
                { key: 'portrait', icon: <FileText size={13} />, label: '纵向 A4' },
                { key: 'landscape', icon: <FileText size={13} />, label: '横向 A4' },
              ],
              onClick: ({ key }) => handlePrintList(key as 'auto' | 'portrait' | 'landscape'),
            }}
          >
            <button className="mp-btn"><Printer size={15} /> 打印当前列表</button>
          </Dropdown>
        </div>
        <div className="mp-tb-sep" />

        {/* 区3 筛选 */}
        <div className="mp-tb-group">
          <span className="mp-tb-label">筛选</span>
          <div className="mp-search">
            <Search size={14} />
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="关键词搜索..."
            />
          </div>
          <DatePicker.RangePicker
            value={filterDateRange}
            onChange={(dates) => setFilterDateRange(dates)}
            placeholder={['开始日期', '结束日期']}
            style={{ height: 36 }}
          />
          {hasStatusField && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {statusChips.map((c) => (
                <button
                  key={c.value}
                  className={`mp-chip ${filterStatus === c.value ? 'on' : ''}`}
                  onClick={() => setFilterStatus(filterStatus === c.value ? null : c.value)}
                >
                  <span className="dot" style={{ background: c.color }} /> {c.label}
                </button>
              ))}
            </div>
          )}
          {handlerOptions.length > 0 && (
            <Select
              value={filterHandler}
              onChange={(v) => setFilterHandler(v)}
              allowClear
              placeholder="经办人筛选"
              style={{ width: 140, height: 36 }}
              options={handlerOptions}
            />
          )}
          {caseOptions.length > 0 && (
            <Select
              value={filterCase}
              onChange={(v) => setFilterCase(v)}
              allowClear
              placeholder="按案件筛选"
              style={{ width: 170, height: 36 }}
              options={caseOptions}
            />
          )}
          {personOptions.length > 0 && (
            <Select
              value={filterPerson}
              onChange={(v) => setFilterPerson(v)}
              allowClear
              placeholder="按人员筛选"
              style={{ width: 150, height: 36 }}
              options={personOptions}
            />
          )}
          {hasBattleType && (
            <Select
              value={filterBattle}
              onChange={(v) => setFilterBattle(v)}
              allowClear
              placeholder="按战役类型筛选"
              style={{ width: 160, height: 36 }}
              options={battleOptions}
            />
          )}
          {(filterText || filterDateRange || filterStatus || filterHandler || filterCase || filterPerson || filterBattle) && (
            <button className="mp-btn" onClick={clearFilters}>
              清除筛选
            </button>
          )}
        </div>

        {/* 区4 显示控制（右对齐） */}
        <div className="mp-tb-group mp-tb-right">
          <span className="mp-tb-label">显示</span>
          <button
            className={`mp-btn icon ${dense ? 'active' : ''}`}
            title={dense ? '切换为舒适密度' : '切换为紧凑密度'}
            onClick={() => setDense((d) => !d)}
          >
            <Rows3 size={16} />
          </button>
          <Dropdown
            trigger={['click']}
            menu={{
              selectable: true,
              multiple: true,
              selectedKeys: visibleColKeys,
              items: colMenuItems,
              onClick: ({ key }) => toggleCol(key),
            }}
          >
            <button className="mp-btn icon" title="显示列"><Columns3 size={16} /></button>
          </Dropdown>
        </div>
      </div>

      {/* 选择条 */}
      {selectedRowKeys.length > 0 && (
        <div className="mp-selbar">
          <span>已选 {selectedRowKeys.length} 项</span>
          <button className="mp-btn" onClick={handleBatchStatus}><RefreshCw size={14} /> 批量改状态</button>
          <button className="mp-btn" onClick={handleBatchDelete}><Trash2 size={14} /> 批量删除</button>
          <button className="mp-btn" onClick={handleExportSelected}><Download size={14} /> 导出选中</button>
          <button className="mp-btn" onClick={() => setSelectedRowKeys([])}>取消选择</button>
        </div>
      )}

      <div className="panel" style={{ overflow: 'hidden' }}>
        {module.tabs.length > 1 && (
          <div style={{ padding: '14px 16px 0', background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border-light)' }}>
            <style>{`
              .work-template-tabs .ant-tabs-nav { margin: 0; }
              .work-template-tabs .ant-tabs-tab {
                border-radius: 7px 7px 0 0 !important;
                background: var(--color-surface-hover) !important;
                border-color: var(--color-border) !important;
                padding: 8px 16px !important;
                font-weight: 700;
                color: var(--color-text-secondary) !important;
              }
              .work-template-tabs .ant-tabs-tab-active {
                background: var(--color-primary-bg) !important;
                border-color: var(--color-primary) !important;
                box-shadow: 0 -2px 10px rgba(21,90,138,.16);
              }
              .work-template-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: var(--color-primary) !important; }
              .dark .work-template-tabs .ant-tabs-tab { color: var(--color-text-secondary) !important; }
              .dark .work-template-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: var(--color-primary) !important; }
            `}</style>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: 8 }}>请选择记录类型</div>
            <Tabs
              className="work-template-tabs"
              type="card"
              activeKey={active?.id}
              onChange={(tabId) => {
                setActiveTabs((prev) => (module ? { ...prev, [module.id]: tabId } : prev));
                if (module) setCurrentTabId(tabId);
              }}
              items={module.tabs.map((tab) => ({ key: tab.id, label: tab.label }))}
            />
          </div>
        )}
        <div style={{ padding: 16, borderTop: '1px solid var(--color-border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>共 {rows.length} 条 · {dataFields.length} 个字段</span>
          </div>

          {rows.length === 0 ? (
            /* 空状态 */
            <div className="mp-empty">
              <div className="mp-empty-ico"><FileText size={26} color="var(--color-primary)" /></div>
              <div className="mp-empty-title">暂无数据</div>
              <div className="mp-empty-sub">点击右上角「新建{active?.label || module.label}」开始录入</div>
              <button className="mp-btn primary" onClick={() => { if (module && activeTab) setCurrentTabId(activeTab); openModal('newRecord'); }}>
                <Plus size={15} /> 立即新建
              </button>
            </div>
          ) : viewMode === 'card' ? (
            /* 卡片视图 */
            <div className="mp-grid">
              {rows.map((row) => {
                const Ico = row._status?.kind === 'done' ? CheckCircle2 : FileText;
                const icoBg = row._status
                  ? row._status.kind === 'done' ? 'var(--color-success-bg)'
                  : row._status.kind === 'warning' ? 'var(--color-warning-bg)'
                  : row._status.kind === 'danger' ? 'var(--color-danger-bg)'
                  : 'var(--color-primary-bg)'
                  : 'var(--color-primary-bg)';
                const icoColor = row._status
                  ? row._status.kind === 'done' ? 'var(--color-success)'
                  : row._status.kind === 'warning' ? 'var(--color-warning)'
                  : row._status.kind === 'danger' ? 'var(--color-danger)'
                  : 'var(--color-primary)'
                  : 'var(--color-primary)';
                return (
                <div
                  key={row.key}
                  className={`mp-card ${selectedRowKeys.includes(row.key) ? 'sel' : ''}`}
                  onClick={() => { setEditRecord(row._record); openModal('newRecord'); }}
                >
                  <div className="mp-card-top">
                    <input
                      type="checkbox"
                      className="mp-card-check"
                      checked={selectedRowKeys.includes(row.key)}
                      onChange={() => toggleSelect(row.key)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="mp-card-ico" style={{ background: icoBg, color: icoColor }}>
                      <Ico size={21} />
                    </div>
                    <div className="mp-card-title-wrap">
                      <div className="mp-card-title truncate">
                        {dataFields.slice(0, 2).map((f) => row[f.id]).filter(Boolean).join(' · ') || '未命名记录'}
                      </div>
                      <div className="mp-card-sub">#{row.code}</div>
                    </div>
                    {row._status ? (
                      <span className={`badge ${row._status.kind === 'done' ? 'badge-success' : row._status.kind === 'warning' ? 'badge-warning' : row._status.kind === 'danger' ? 'badge-danger' : 'badge-info'}`}>
                        {row._status.label}
                      </span>
                    ) : null}
                  </div>
                  <div className="mp-card-rows">
                    {dataFields.slice(0, 4).map((f) => (
                      <div key={f.id} className="mp-card-kv">
                        <span className="mp-card-k">{f.label}</span>
                        <span className="mp-card-v">{formatValue(row[f.id]) || '—'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mp-card-foot">
                    <span className="mp-card-time"><Clock size={13} />{row._updatedAt}</span>
                    <button className="mp-card-act" title="查看" onClick={(e) => { e.stopPropagation(); setCaseDetail(row._record); }}>
                      <Eye size={15} />
                    </button>
                    <button className="mp-card-act" title="编辑" onClick={(e) => { e.stopPropagation(); setEditRecord(row._record); openModal('newRecord'); }}>
                      <Pen size={15} />
                    </button>
                    <button className="mp-card-act danger" title="删除" onClick={(e) => { e.stopPropagation(); handleDeleteSingle(row._record); }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            /* 表格视图 */
            <div className={`mp-table-wrap ${dense ? 'dense' : ''}`}>
              <Table<DynamicRow>
                size={dense ? 'small' : 'middle'}
                columns={dynamicColumns}
                dataSource={rows}
                rowKey="key"
                pagination={
                  printing
                    ? false
                    : {
                        pageSize: dense ? 15 : 10,
                        showSizeChanger: true,
                        pageSizeOptions: [10, 20, 50],
                        showTotal: (t) => `共 ${t} 条`,
                      }
                }
                scroll={printing ? undefined : { x: 'max-content' }}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }}
                rowClassName={(row) => (inlineId === row.key ? 'mp-row-editing' : '')}
              />
            </div>
          )}
        </div>
      </div>

      {/* 案件 360° 全屏视图 */}
      {caseDetail && (
        <CaseDetail record={caseDetail} onClose={() => setCaseDetail(null)} onOpenRelated={setCaseDetail} />
      )}
    </div>
  );
}

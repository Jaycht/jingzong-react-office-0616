/**
 * 文书库 / 典法查阅 管理面板（V2.50.0）
 *
 * 一个面板同时服务两个库（用 kind 区分），两种打开方式 / 权限按动作分级：
 *  - `mode='upload'`：**只弹上传表单**（从页面「上传」入口进来），不弹管理页面
 *  - `mode='manage'`：弹管理页面（条目列表 + 回收站），页内「上传新条目」按钮亦可上传
 *  - **上传**（手动补充条目）**不需要密码** —— 收集毕竟不全或有更新，随时可补
 *  - **编辑 / 删除 / 回收站操作**需要管理员密码（默认 JDZZ3231268，可在面板内改）
 *  - 删除先进回收站，可从回收站恢复到原有位置，或彻底删除 / 清空回收站
 *
 * 密码门按动作触发：进门不拦人，点到需要权限的按钮时才弹框，
 * 验过一次后在本次面板打开期间保持解锁。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Input, Select, Button, Divider, Table, Tabs, Tag, Modal } from 'antd';
import type { TableProps } from 'antd';
import {
  Lock, Upload, Pencil, Trash2, RotateCcw, XCircle, ShieldCheck, ShieldAlert, Plus, FileText,
} from 'lucide-react';
import { isElectron } from '../lib/env';
import {
  getLibrary, uid, verifyAdminPassword, setAdminPassword,
  mergeForms, mergeLawManifest, addCustomForm, addCustomLaw, updateEntry,
  moveToRecycle, restoreFromRecycle, purgeRecycle, emptyRecycle,
  DEFAULT_ADMIN_PASSWORD,
  type LegalKind, type FormEntry, type LawManifest, type RecycleItem,
} from '../store/legalLibraryStore';
import { localStorageAdapter } from '../store/adapter';
import { BRAND } from '../constants/theme';

interface Props {
  open: boolean;
  onClose: () => void;
  kind: LegalKind;
  /** 数据变更后通知页面重新合并渲染 */
  onChanged: () => void;
  /**
   * 打开方式：
   *  - 'upload'：只显示上传表单（页面「上传」入口）
   *  - 'manage'：显示管理页面（页面「管理」入口），默认值
   */
  mode?: 'manage' | 'upload';
}

interface Row {
  key: string;
  id: string;
  title: string;
  categoryText: string;
  builtin: boolean;
  raw: Record<string, unknown>;
  files: string[];
}

/** 内置清单里的分类回退（清单拉取失败时也有候选项） */
const FALLBACK_FORM_CATS = ['通用', '行政', '刑事'];
const FALLBACK_LAW_CATS = [
  '公安专项法律', '刑事法律', '司法解释', '国家赔偿', '宪法·根本法', '监察法',
  '治安管理处罚法', '行政法律', '经侦管辖', '指导性文件', '民商法律', '经济法规',
  '劳动·社保', '其他法律',
];

const base = import.meta.env.BASE_URL || '/';
const assetUrl = (file: string) => base + file.replace(/^\//, '');

/** 把文件转成 number[]（IPC 传输用） */
async function fileToArray(file: File): Promise<number[]> {
  const buf = await file.arrayBuffer();
  return Array.from(new Uint8Array(buf));
}

/* ===================== 分类下拉（多选 + 自定义添加） ===================== */

/**
 * 分类选择器：下拉式选择，可在弹层底部「自定义添加」新分类
 * （与项目里「协查单位 / 调证状态」下拉的自定义添加同一套做法与存储约定）。
 * multiple=true 时多选（文书常用多个分类），否则单选（法条一个分类）。
 */
function CategorySelect({
  value, onChange, options, multiple, storageKey, placeholder, mode,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  multiple: boolean;
  storageKey: string;
  placeholder: string;
  mode?: 'tags' | 'multiple';
}) {
  const [newOption, setNewOption] = useState('');
  const [customOptions, setCustomOptions] = useState<string[]>(() => {
    try {
      const stored = localStorageAdapter.getItem<string[]>(storageKey, []);
      return Array.isArray(stored) ? stored.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });

  const allOptions = useMemo(
    () => Array.from(new Set([...options, ...customOptions])),
    [options, customOptions],
  );

  const saveNewOption = () => {
    const v = newOption.trim();
    if (!v) return;
    if (!allOptions.includes(v)) {
      const next = [...customOptions, v];
      setCustomOptions(next);
      localStorageAdapter.setItem(storageKey, next);
    }
    onChange(multiple ? Array.from(new Set([...value, v])) : [v]);
    setNewOption('');
  };

  const selectProps = {
    showSearch: true,
    allowClear: true,
    style: { width: '100%' },
    placeholder,
    value: multiple ? value : value[0],
    options: allOptions.map((o) => ({ label: o, value: o })),
    onChange: (v: unknown) => {
      if (multiple) onChange(Array.isArray(v) ? (v as string[]) : []);
      else onChange(v ? [String(v)] : []);
    },
    // 输入即查（分类项不多，用内置过滤更直观）
    filterOption: (input: string, option?: { label?: string; value?: string }) =>
      String(option?.label ?? option?.value ?? '').toLowerCase().includes(input.toLowerCase()),
  };

  return (
    <Select
      {...selectProps}
      // tags 允许直接输入新分类并回车创建；multiple 则是标准多选
      mode={mode === 'tags' ? 'tags' : multiple ? 'multiple' : undefined}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '6px 0' }} />
          <div className="mp-inline-addopt">
            <Input
              size="small"
              value={newOption}
              placeholder="自定义添加分类"
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onPressEnter={saveNewOption}
            />
            <Button size="small" type="primary" onClick={saveNewOption}>添加</Button>
          </div>
        </>
      )}
    />
  );
}

/* ===================== 主组件 ===================== */

export default function LegalLibraryManager({ open, onClose, kind, onChanged, mode = 'manage' }: Props) {
  const { modal } = App.useApp();
  const [unlocked, setUnlocked] = useState(false);

  // 按动作触发的密码门
  const [gateOpen, setGateOpen] = useState(false);
  const [gateLabel, setGateLabel] = useState('');
  const [gatePwd, setGatePwd] = useState('');
  const [gateError, setGateError] = useState('');
  const gateRunRef = useRef<(() => void) | null>(null);

  const [builtinForms, setBuiltinForms] = useState<FormEntry[]>([]);
  const [builtinManifest, setBuiltinManifest] = useState<LawManifest | null>(null);
  const [tick, setTick] = useState(0);          // 本地刷新信号
  const [kw, setKw] = useState('');
  const [busy, setBusy] = useState(false);

  // 新增/编辑表单
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<string[]>([]);
  const [formExtra, setFormExtra] = useState('');   // 文书=式样；法条=版本/效力
  const [fileBuf, setFileBuf] = useState<{ name: string; buf: number[] } | null>(null);
  const [wordBuf, setWordBuf] = useState<{ name: string; buf: number[] } | null>(null);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const uploading = mode === 'upload';

  // 打开时重新拉取内置清单（同时给分类下拉提供候选项）
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const url = kind === 'form' ? assetUrl('forms/manifest.json') : assetUrl('laws/manifest.json');
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (kind === 'form') setBuiltinForms(Array.isArray(data) ? data : []);
        else setBuiltinManifest(data as LawManifest);
      })
      .catch(() => { /* 清单拉取失败时仍可管理自定义条目，分类用内置回退清单 */ });
    return () => { alive = false; };
  }, [open, kind, tick]);

  const library = useMemo(() => (open ? getLibrary() : null), [open, tick]);

  /** 分类下拉候选项：优先取内置清单里真实出现过的分类，其次回退常量 */
  const categoryOptions = useMemo(() => {
    if (kind === 'form') {
      const set = new Set<string>();
      for (const f of builtinForms) for (const c of f.category || []) if (c) set.add(c);
      return set.size > 0 ? Array.from(set) : FALLBACK_FORM_CATS;
    }
    const fromManifest = (builtinManifest?.categories || []).map((c) => c.name).filter(Boolean);
    return fromManifest.length > 0 ? fromManifest : FALLBACK_LAW_CATS;
  }, [kind, builtinForms, builtinManifest]);

  // 合并后的条目（与页面看到的完全一致）
  const rows: Row[] = useMemo(() => {
    if (!library) return [];
    if (kind === 'form') {
      return mergeForms(builtinForms, library).map((f) => ({
        key: f.id,
        id: f.id,
        title: f.title,
        categoryText: (f.category || []).join(' / '),
        builtin: f.builtin !== false,
        raw: f as unknown as Record<string, unknown>,
        files: [f.file, f.word].filter(Boolean) as string[],
      }));
    }
    const merged = mergeLawManifest(builtinManifest, library);
    return (merged?.laws || []).map((l) => ({
      key: l.id,
      id: l.id,
      title: l.title,
      categoryText: l.categoryName || l.category,
      builtin: l.builtin !== false,
      raw: l as unknown as Record<string, unknown>,
      files: l.file ? [l.file] : [],
    }));
  }, [library, builtinForms, builtinManifest, kind]);

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(k) || r.categoryText.toLowerCase().includes(k));
  }, [rows, kw]);

  const recycleItems = library?.recycle ?? [];
  const hiddenCount = recycleItems.filter((r) => r.builtin).length;

  // ─── 权限：按动作验密 ────────────────────────────────
  const requireAdmin = useCallback((label: string, run: () => void) => {
    if (unlocked) { run(); return; }
    gateRunRef.current = run;
    setGateLabel(label);
    setGatePwd('');
    setGateError('');
    setGateOpen(true);
  }, [unlocked]);

  const submitGate = () => {
    if (!verifyAdminPassword(gatePwd)) {
      setGateError('密码不正确');
      return;
    }
    setUnlocked(true);
    setGateOpen(false);
    setGatePwd('');
    const run = gateRunRef.current;
    gateRunRef.current = null;
    run?.();
  };

  const changePassword = () => {
    modal.confirm({
      title: '修改管理员密码',
      content: (
        <div style={{ paddingTop: 8 }}>
          <Input.Password
            placeholder="输入新的管理员密码"
            onChange={(e) => { (window as unknown as { __newPwd?: string }).__newPwd = e.target.value; }}
          />
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
            默认为 {DEFAULT_ADMIN_PASSWORD}，留空则恢复默认值。
          </div>
        </div>
      ),
      okText: '保存',
      cancelText: '取消',
      onOk: () => {
        const v = (window as unknown as { __newPwd?: string }).__newPwd;
        setAdminPassword(v || DEFAULT_ADMIN_PASSWORD);
        delete (window as unknown as { __newPwd?: string }).__newPwd;
      },
    });
  };

  const resetForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormTitle('');
    setFormCategory([]);
    setFormExtra('');
    setFileBuf(null);
    setWordBuf(null);
  };

  /** 打开「新增」表单（清空编辑态）—— 上传不需要密码 */
  const startCreate = useCallback(() => {
    setEditing(null);
    setFormTitle('');
    setFormCategory([]);
    setFormExtra('');
    setFileBuf(null);
    setWordBuf(null);
    setFormOpen(true);
  }, []);

  // 「上传」入口：打开即直接进上传表单，不弹管理页面
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && uploading && !wasOpenRef.current) startCreate();
    wasOpenRef.current = open;
  }, [open, uploading, startCreate]);

  /** 关闭整个面板（上传模式下取消表单也走这里） */
  const handleClose = useCallback(() => {
    resetForm();
    setGateOpen(false);
    onClose();
  }, [onClose]);

  /** 表单取消：上传模式直接关闭面板；管理模式只收表单 */
  const handleFormCancel = () => {
    if (uploading) { handleClose(); return; }
    resetForm();
  };

  const startEdit = (row: Row) => {
    requireAdmin(`编辑「${row.title}」`, () => {
      setFormOpen(true);
      setEditing(row);
      setFormTitle(row.title);
      setFormCategory(
        kind === 'form'
          ? ((row.raw.category as string[]) || [])
          : [String(row.raw.categoryName || row.raw.category || '')],
      );
      setFormExtra(
        kind === 'form'
          ? String(row.raw.shiyang || '')
          : [row.raw.version, row.raw.source].filter(Boolean).join(' · '),
      );
      setFileBuf(null);
      setWordBuf(null);
    });
  };

  const handleDelete = (row: Row) => {
    requireAdmin(`删除「${row.title}」`, () => {
      modal.confirm({
        title: '移入回收站',
        content: `确定删除「${row.title}」吗？删除后可在回收站中恢复${row.builtin ? '（内置条目仅隐藏，随时可恢复）' : ''}。`,
        okText: '删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => {
          const files = row.builtin ? [] : row.files.filter((f) => f && f.startsWith('/') === false);
          moveToRecycle(kind, row.raw, row.builtin, files);
          reload();
          onChanged();
        },
      });
    });
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      modal.warning({ title: '请填写名称', content: '文书 / 法条名称不能为空。' });
      return;
    }
    if (!editing && !fileBuf) {
      modal.warning({ title: '请选择文件', content: kind === 'form' ? '请上传 PDF 文件（Word 可选）。' : '请上传 txt 文本文件。' });
      return;
    }
    if (!editing && kind === 'law' && formCategory.length === 0) {
      modal.warning({ title: '请选择分类', content: '法条需要指定一个分类（可在下拉底部自定义添加）。' });
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        // 编辑：不改内容文件，只改元数据（内置条目记覆盖）
        const patch: Record<string, unknown> = { title: formTitle.trim() };
        if (kind === 'form') {
          patch.category = formCategory.length ? formCategory : ['通用'];
          patch.shiyang = formExtra.trim();
        } else {
          const cn = formCategory[0] || '其他法律';
          patch.category = cn;
          patch.categoryName = cn;
        }
        updateEntry(kind, editing.id, patch, editing.builtin);
      } else if (kind === 'form') {
        const saved = await window.electronAPI.saveLegalFile(fileBuf!.buf, fileBuf!.name, 'forms');
        if (!saved.success || !saved.filePath) throw new Error(saved.error || '文件保存失败');
        let wordPath = '';
        if (wordBuf) {
          const w = await window.electronAPI.saveLegalFile(wordBuf.buf, wordBuf.name, 'forms');
          if (w.success && w.filePath) wordPath = w.filePath;
        }
        addCustomForm({
          id: uid('cform'),
          title: formTitle.trim(),
          category: formCategory.length ? formCategory : ['通用'],
          shiyang: formExtra.trim(),
          file: saved.filePath,
          word: wordPath,
        });
      } else {
        const saved = await window.electronAPI.saveLegalFile(fileBuf!.buf, fileBuf!.name, 'laws');
        if (!saved.success || !saved.filePath) throw new Error(saved.error || '文件保存失败');
        const cn = formCategory[0] || '其他法律';
        addCustomLaw({
          id: uid('claw'),
          title: formTitle.trim(),
          category: cn,
          categoryName: cn,
          file: saved.filePath,
          version: formExtra.trim(),
        });
      }
      resetForm();
      reload();
      onChanged();
      // 上传入口进来的：存完就关掉整个弹窗，回到列表页
      if (uploading) onClose();
      else modal.success({ title: '已保存', content: `「${formTitle.trim()}」已加入清单。` });
    } catch (e) {
      modal.error({ title: '保存失败', content: e instanceof Error ? e.message : '未知错误' });
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = (rid: string, title: string) => {
    requireAdmin(`恢复「${title}」`, () => {
      restoreFromRecycle(rid);
      reload();
      onChanged();
    });
  };

  const handlePurge = (rid: string, title: string) => {
    requireAdmin(`彻底删除「${title}」`, () => {
      modal.confirm({
        title: '彻底删除',
        content: `「${title}」将被永久删除且无法恢复，确定继续？`,
        okText: '彻底删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => {
          const files = purgeRecycle(rid);
          files.forEach((p) => { window.electronAPI?.deleteAttachmentFile?.(p).catch(() => {}); });
          reload();
          onChanged();
        },
      });
    });
  };

  const handleEmpty = () => {
    requireAdmin('清空回收站', () => {
      modal.confirm({
        title: '清空回收站',
        content: '回收站中的自定义条目及其文件将被永久删除，且无法恢复。内置条目的隐藏记录会保留。确定继续？',
        okText: '清空',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => {
          const files = emptyRecycle();
          files.forEach((p) => { window.electronAPI?.deleteAttachmentFile?.(p).catch(() => {}); });
          reload();
          onChanged();
        },
      });
    });
  };

  const pickFile = async (f: File | undefined, target: 'main' | 'word') => {
    if (!f) return;
    if (target === 'main' && kind === 'law' && !/\.txt$/i.test(f.name)) {
      modal.warning({ title: '格式不支持', content: '法条正文请上传 .txt 文本文件。' });
      return;
    }
    const buf = await fileToArray(f);
    if (target === 'main') setFileBuf({ name: f.name, buf });
    else setWordBuf({ name: f.name, buf });
  };

  // ─── 渲染 ───────────────────────────────────────────
  const columns: TableProps<Row>['columns'] = [
    {
      title: '名称',
      dataIndex: 'title',
      render: (t: string, r: Row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <FileText size={14} color={BRAND.primary} />
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{t}</span>
          {!r.builtin && <Tag color="blue" style={{ marginInlineEnd: 0 }}>自定义</Tag>}
        </div>
      ),
    },
    { title: '分类', dataIndex: 'categoryText', width: 200 },
    {
      title: '来源',
      width: 100,
      render: (_: unknown, r: Row) => (r.builtin ? <Tag>内置</Tag> : <Tag color="blue">新增</Tag>),
    },
    {
      title: '操作',
      width: 150,
      render: (_: unknown, r: Row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="dash-action" style={{ padding: '4px 10px' }} onClick={() => startEdit(r)} title="编辑需管理员密码">
            <Pencil size={13} /> 编辑
          </button>
          <button className="dash-action" style={{ padding: '4px 10px' }} onClick={() => handleDelete(r)} title="删除需管理员密码">
            <Trash2 size={13} /> 删除
          </button>
        </div>
      ),
    },
  ];

  const recycleColumns: TableProps<RecycleItem>['columns'] = [
    { title: '名称', dataIndex: 'title' },
    { title: '类型', width: 110, render: (_: unknown, r: RecycleItem) => (r.kind === 'form' ? '文书' : '法条') },
    { title: '来源', width: 100, render: (_: unknown, r: RecycleItem) => (r.builtin ? <Tag>内置</Tag> : <Tag color="blue">自定义</Tag>) },
    {
      title: '删除时间',
      width: 180,
      render: (_: unknown, r: RecycleItem) => new Date(r.deletedAt).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      width: 190,
      render: (_: unknown, r: RecycleItem) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="dash-action" style={{ padding: '4px 10px' }} onClick={() => handleRestore(r.rid, r.title)}>
            <RotateCcw size={13} /> 恢复
          </button>
          <button className="dash-action" style={{ padding: '4px 10px' }} onClick={() => handlePurge(r.rid, r.title)} disabled={r.builtin}>
            <XCircle size={13} /> 彻底删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* 管理页面：只有从「管理」入口进来才弹（不再和上传表单叠在一起弹） */}
      {!uploading && (
        <Modal
          open={open}
          onCancel={handleClose}
          footer={null}
          width={980}
          centered
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={17} color={BRAND.primary} />
              <span>{kind === 'form' ? '文书库管理' : '典法查阅管理'}</span>
            </div>
          }
          styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
        >
          <div>
            {!isElectron() && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--color-warning-bg)', color: 'var(--color-text-secondary)', fontSize: 12.5, marginBottom: 12 }}>
                当前不在客户端环境中运行，文件上传与「用系统程序打开」不可用，条目编辑与回收站仍可正常使用。
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
              background: unlocked ? 'var(--color-success-bg)' : 'var(--color-primary-bg)',
              fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 12,
            }}>
              {unlocked ? <ShieldCheck size={14} color="var(--color-success)" /> : <ShieldAlert size={14} color={BRAND.primary} />}
              <span>
                {unlocked
                  ? '管理员已解锁：编辑、删除与回收站操作可直接进行。'
                  : '上传新条目无需密码（页面「上传」入口可直达）；编辑、删除与回收站操作需要管理员密码（首次点击时提示输入，验证一次后在本次面板内保持解锁）。'}
              </span>
            </div>

            <Tabs
              items={[
                {
                  key: 'items',
                  label: `条目管理（${rows.length}）`,
                  children: (
                    <div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                        <Input
                          allowClear
                          placeholder="搜索名称 / 分类"
                          value={kw}
                          onChange={(e) => setKw(e.target.value)}
                          style={{ width: 240 }}
                        />
                        <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                          共 {filtered.length} 条
                        </span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                          <button className="dash-action" onClick={() => requireAdmin('修改管理员密码', changePassword)}>
                            {unlocked ? <ShieldCheck size={14} /> : <Lock size={14} />} 修改密码
                          </button>
                          <button className="dash-action dash-action-primary" onClick={startCreate} title="上传不需要密码">
                            <Plus size={14} /> 上传新条目
                          </button>
                        </div>
                      </div>

                      <Table
                        size="small"
                        rowKey="key"
                        dataSource={filtered}
                        columns={columns}
                        pagination={{ pageSize: 10, size: 'small', showSizeChanger: false }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'recycle',
                  label: `回收站（${recycleItems.length}）`,
                  children: (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                          共 {recycleItems.length} 条{hiddenCount > 0 ? `（其中 ${hiddenCount} 条为内置条目的隐藏记录，恢复即重新显示）` : ''}
                        </span>
                        <button className="dash-action" style={{ marginLeft: 'auto' }} onClick={handleEmpty} disabled={recycleItems.length === 0}>
                          <Trash2 size={14} /> 清空回收站
                        </button>
                      </div>
                      <Table
                        size="small"
                        rowKey="rid"
                        dataSource={recycleItems}
                        columns={recycleColumns}
                        pagination={{ pageSize: 10, size: 'small', showSizeChanger: false }}
                        locale={{ emptyText: '回收站是空的' }}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Modal>
      )}

      {/* 按动作触发的管理员密码门 */}
      <Modal
        open={gateOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={15} color={BRAND.primary} />
            <span>需要管理员密码</span>
          </div>
        }
        okText="确定"
        cancelText="取消"
        width={400}
        onOk={submitGate}
        onCancel={() => { setGateOpen(false); gateRunRef.current = null; }}
      >
        <div style={{ paddingTop: 4 }}>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
            「{gateLabel}」属于管理操作，请输入管理员密码继续（上传新条目不需要密码）。
          </div>
          <Input.Password
            autoFocus
            placeholder="请输入管理员密码"
            value={gatePwd}
            onChange={(e) => { setGatePwd(e.target.value); setGateError(''); }}
            onPressEnter={submitGate}
            status={gateError ? 'error' : undefined}
          />
          {gateError && <div style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 6 }}>{gateError}</div>}
        </div>
      </Modal>

      {/* 上传 / 编辑表单（独立于管理页面；从「上传」入口进来时只有它） */}
      <Modal
        open={formOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={15} color={BRAND.primary} />
            <span>{editing ? '编辑条目' : kind === 'form' ? '上传新文书' : '上传新法条'}</span>
          </div>
        }
        okText={busy ? '保存中…' : '保存'}
        cancelText="取消"
        confirmLoading={busy}
        onOk={handleSave}
        onCancel={handleFormCancel}
        width={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>名称 *</div>
            <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder={kind === 'form' ? '如：协助查询存款通知书' : '如：中华人民共和国反有组织犯罪法'} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
              {kind === 'form' ? '分类（可多选）*' : '分类 *'}
            </div>
            <CategorySelect
              value={formCategory}
              onChange={setFormCategory}
              options={categoryOptions}
              multiple={kind === 'form'}
              storageKey={`jingzong.selectOptions.legalCategory.${kind}`}
              placeholder={kind === 'form' ? '选择或输入分类，可多选' : '选择或输入分类'}
            />
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
              下拉列表底部可在「自定义添加分类」里输入新分类后回车/点添加。
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
              {kind === 'form' ? '式样号（可选）' : '版本 / 出处（可选）'}
            </div>
            <Input value={formExtra} onChange={(e) => setFormExtra(e.target.value)} placeholder={kind === 'form' ? '如：式样五' : '如：2021年施行，现行有效'} />
          </div>

          {!editing && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                {kind === 'form' ? 'PDF 文件 *（Word 可选）' : '法条文本 *（.txt）'}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="dash-action" style={{ cursor: 'pointer' }}>
                  <Upload size={14} /> {fileBuf ? '重新选择' : '选择文件'}
                  <input
                    type="file"
                    accept={kind === 'form' ? '.pdf' : '.txt'}
                    style={{ display: 'none' }}
                    onChange={(e) => { void pickFile(e.target.files?.[0], 'main'); e.target.value = ''; }}
                  />
                </label>
                <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>{fileBuf ? fileBuf.name : '未选择'}</span>
                {kind === 'form' && (
                  <>
                    <label className="dash-action" style={{ cursor: 'pointer' }}>
                      <Upload size={14} /> Word
                      <input
                        type="file"
                        accept=".doc,.docx"
                        style={{ display: 'none' }}
                        onChange={(e) => { void pickFile(e.target.files?.[0], 'word'); e.target.value = ''; }}
                      />
                    </label>
                    <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>{wordBuf ? wordBuf.name : '可选'}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

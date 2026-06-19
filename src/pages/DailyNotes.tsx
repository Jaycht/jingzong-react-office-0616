/**
 * 日常随手记 - 简单 CRUD 页面
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { StickyNote, Plus, Trash2, Download, Upload, Bell, X, Calendar } from 'lucide-react';
import { Modal, Input, Select, DatePicker, Switch, Tag } from 'antd';
import { useAppStore } from '../store/appStore';
import { getDailyNotes, createDailyNote, updateDailyNote, deleteDailyNote, getCustomTypes, saveCustomTypes, type DailyNote } from '../store/dailyNotesStore';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const REPEAT_OPTIONS = [
  { value: 'none', label: '不重复' }, { value: '30min', label: '每30分钟' },
  { value: '1hour', label: '每小时' }, { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' }, { value: 'monthly', label: '每月' },
];

export default function DailyNotes() {
  const showToast = useAppStore((s) => s.showToast);
  const [notes, setNotes] = useState<DailyNote[]>(() => getDailyNotes());
  const [filterType, setFilterType] = useState('');
  const [editingNote, setEditingNote] = useState<DailyNote | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [customTypes, setCustomTypes] = useState<string[]>(() => getCustomTypes());
  const [newType, setNewType] = useState('');
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchDate, setBatchDate] = useState(dayjs());
  const [batchType, setBatchType] = useState('一般工作');

  const filteredNotes = useMemo(() => {
    let list = notes;
    if (filterType) list = list.filter((n) => n.type === filterType);
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [notes, filterType]);

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除', content: '删除后不可恢复，确定要删除吗？',
      okText: '删除', okButtonProps: { danger: true }, cancelText: '取消',
      onOk: () => { deleteDailyNote(id); setNotes(getDailyNotes()); showToast('已删除', 'success'); },
    });
  };

  const handleExport = () => {
    if (filteredNotes.length === 0) { showToast('没有可导出的数据', 'warning'); return; }
    const rows = filteredNotes.map((n) => ({ 日期: n.date, 标题: n.title, 类型: n.type, 内容: n.contents.join('\n'), 备注: n.notes, 创建时间: n.createdAt }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), '随手记');
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), `随手记_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    showToast(`已导出 ${filteredNotes.length} 条记录`, 'success');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        let count = 0;
        for (const row of rows) {
          const r = row as Record<string, string>;
          createDailyNote({ date: r['日期'] || dayjs().format('YYYY-MM-DD'), title: r['标题'] || '', type: r['类型'] || '一般工作', contents: r['内容'] ? String(r['内容']).split('\n') : [''], notes: r['备注'] || '' });
          count++;
        }
        setNotes(getDailyNotes()); showToast(`成功导入 ${count} 条记录`, 'success');
      } catch { showToast('导入失败', 'error'); }
    };
    input.click();
  };

  const handleAddType = () => {
    if (!newType.trim()) return;
    if (customTypes.includes(newType.trim())) { showToast('类型已存在', 'warning'); return; }
    const next = [...customTypes, newType.trim()];
    setCustomTypes(next); saveCustomTypes(next); setNewType(''); showToast('类型已添加', 'success');
  };

  const handleDeleteType = (t: string) => { const next = customTypes.filter((x) => x !== t); setCustomTypes(next); saveCustomTypes(next); };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(124,58,237,.3)' }}>
          <StickyNote size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>日常随手记</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>快速记录 · 批量录入 · 导入导出</div>
        </div>
      </motion.div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={() => setShowNew(true)} style={{ gap: 6 }}><Plus size={14} /> 新建记录</button>
        <button className="btn btn-ghost" onClick={() => setBatchMode(!batchMode)} style={{ gap: 6 }}><StickyNote size={14} /> {batchMode ? '退出批量' : '批量录入'}</button>
        <button className="btn btn-ghost" onClick={handleExport} style={{ gap: 6 }}><Download size={14} /> 导出</button>
        <button className="btn btn-ghost" onClick={handleImport} style={{ gap: 6 }}><Upload size={14} /> 导入</button>
        <button className="btn btn-ghost" onClick={() => setShowTypeManager(true)} style={{ gap: 6 }}>类型管理</button>
        <div style={{ flex: 1 }} />
        <Select value={filterType} onChange={setFilterType} allowClear placeholder="按类型筛选" style={{ width: 140, height: 34 }} options={customTypes.map((t) => ({ label: t, value: t }))} />
      </div>

      {batchMode && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>批量录入模式</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <DatePicker value={batchDate} onChange={(d) => d && setBatchDate(d)} style={{ width: 140 }} />
            <Select value={batchType} onChange={setBatchType} style={{ width: 130 }} options={customTypes.map((t) => ({ label: t, value: t }))} />
          </div>
          <BatchEntry date={batchDate.format('YYYY-MM-DD')} type={batchType} onCreated={() => setNotes(getDailyNotes())} />
        </motion.div>
      )}

      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="font-semibold" style={{ fontSize: 14 }}>记录列表</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>共 {filteredNotes.length} 条</span>
        </div>
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {filteredNotes.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>暂无记录</div>
          ) : filteredNotes.map((n) => (
            <div key={n.id} className="hover-bg" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer' }}
              onClick={() => setEditingNote(n)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="purple">{n.type}</Tag>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{n.title || '无标题'}</span>
                {n.reminder?.enabled && <Bell size={12} color="var(--color-warning)" />}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>{n.date}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.contents?.[0] || n.notes || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(showNew || editingNote) && (
        <NoteModal note={editingNote} customTypes={customTypes}
          onClose={() => { setShowNew(false); setEditingNote(null); }}
          onSaved={() => { setNotes(getDailyNotes()); setShowNew(false); setEditingNote(null); }} />
      )}

      {showTypeManager && (
        <Modal open title="类型管理" onCancel={() => setShowTypeManager(false)} footer={null} width={400}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="输入新类型名称" onPressEnter={handleAddType} style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={handleAddType}>添加</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {customTypes.map((t) => (<Tag key={t} closable onClose={() => handleDeleteType(t)} color="purple">{t}</Tag>))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function BatchEntry({ date, type, onCreated }: { date: string; type: string; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const showToast = useAppStore((s) => s.showToast);
  const handleSave = () => {
    if (!title.trim()) { showToast('请输入标题', 'warning'); return; }
    createDailyNote({ date, title: title.trim(), type, contents: content ? [content] : [''] });
    setTitle(''); setContent(''); onCreated(); showToast('已添加', 'success');
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" style={{ flex: 1 }} />
      <Input.TextArea value={content} onChange={(e) => setContent(e.target.value)} placeholder="内容（可选）" autoSize={{ minRows: 1, maxRows: 3 }} style={{ flex: 2 }} />
      <button className="btn btn-primary btn-sm" onClick={handleSave} style={{ height: 34 }}>添加</button>
    </div>
  );
}

function NoteModal({ note, customTypes, onClose, onSaved }: { note: DailyNote | null; customTypes: string[]; onClose: () => void; onSaved: () => void }) {
  const showToast = useAppStore((s) => s.showToast);
  const [date, setDate] = useState(dayjs(note?.date || undefined));
  const [title, setTitle] = useState(note?.title || '');
  const [type, setType] = useState(note?.type || '一般工作');
  const [contents, setContents] = useState<string[]>(note?.contents?.length ? note.contents : ['']);
  const [reminderEnabled, setReminderEnabled] = useState(note?.reminder?.enabled || false);
  const [reminderTime, setReminderTime] = useState(dayjs(note?.reminder?.time || undefined));
  const [reminderRepeat, setReminderRepeat] = useState(note?.reminder?.repeat || 'none');
  const [notesText, setNotesText] = useState(note?.notes || '');

  const handleSave = () => {
    if (!title.trim()) { showToast('请输入标题', 'warning'); return; }
    const data = { date: date.format('YYYY-MM-DD'), title: title.trim(), type, contents: contents.filter((c) => c.trim()), reminder: { enabled: reminderEnabled, time: reminderTime.toISOString(), repeat: reminderRepeat }, notes: notesText };
    if (note) { updateDailyNote(note.id, data); showToast('已更新', 'success'); } else { createDailyNote(data); showToast('已创建', 'success'); }
    onSaved();
  };

  return (
    <Modal open title={note ? '编辑记录' : '新建记录'} onCancel={onClose} width={600} onOk={handleSave} okText={note ? '更新' : '保存'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <DatePicker value={date} onChange={(d) => d && setDate(d)} style={{ flex: 1 }} />
          <Select value={type} onChange={setType} style={{ flex: 1 }} options={customTypes.map((t) => ({ label: t, value: t }))} />
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>具体内容</div>
          {contents.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <Input.TextArea value={c} onChange={(e) => { const next = [...contents]; next[i] = e.target.value; setContents(next); }} placeholder={`内容 ${i + 1}`} autoSize={{ minRows: 1, maxRows: 3 }} style={{ flex: 1 }} />
              {contents.length > 1 && (<button className="btn btn-sm btn-ghost" onClick={() => setContents(contents.filter((_, idx) => idx !== i))}><X size={12} /></button>)}
            </div>
          ))}
          <button className="btn btn-sm btn-ghost" onClick={() => setContents([...contents, ''])} style={{ gap: 4 }}><Plus size={12} /> 添加内容</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch checked={reminderEnabled} onChange={setReminderEnabled} />
          <span style={{ fontSize: 13 }}>设置提醒</span>
          {reminderEnabled && (<>
            <DatePicker showTime value={reminderTime} onChange={(d) => d && setReminderTime(d)} style={{ width: 180 }} />
            <Select value={reminderRepeat} onChange={setReminderRepeat} style={{ width: 120 }} options={REPEAT_OPTIONS} />
          </>)}
        </div>
        <Input.TextArea value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="备注（可选）" autoSize={{ minRows: 2, maxRows: 4 }} />
      </div>
    </Modal>
  );
}

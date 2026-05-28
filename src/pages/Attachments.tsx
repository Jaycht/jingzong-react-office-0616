import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileArchive, FileText, Image, File, Download, Search, Trash2, CheckSquare, Square } from 'lucide-react';
import JSZip from 'jszip';
import { getAllAttachments, getAttachment, downloadAttachment, deleteAttachment } from '../store/attachmentStore';
import { getBaseModules } from '../moduleConfig';
import type { AttachmentRecord } from '../store/attachmentStore';
import { useAppStore } from '../store/appStore';
import { removeAttachmentRefsFromAllRecords } from '../store/massStore';

const FILE_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileText,
  xlsx: FileText,
  jpg: Image,
  jpeg: Image,
  png: Image,
  gif: Image,
  zip: FileArchive,
  rar: FileArchive,
  '7z': FileArchive,
};

function getFileIcon(filename: string) {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  const Icon = FILE_ICONS[ext] || File;
  return <Icon size={16} color="#6B7280" />;
}

interface AttachmentDisplayItem {
  id: string;
  moduleLabel: string;
  fileName: string;
  recordDate: string;
}

export default function Attachments() {
  const showToast = useAppStore((s) => s.showToast);
  const [searchVal, setSearchVal] = useState('');
  const [dbAttachments, setDbAttachments] = useState<AttachmentRecord[]>([]);
  // 多选：存储选中项的 id 集合
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const modules = useMemo(() => getBaseModules(), []);

  const loadAttachments = useCallback(() => {
    getAllAttachments().then((list) => setDbAttachments(list)).catch(() => {});
  }, []);

  useEffect(() => { loadAttachments(); }, [loadAttachments]);

  const attachmentItems: AttachmentDisplayItem[] = useMemo(() => {
    return dbAttachments.map((att) => {
      const mod = modules.find((m) => m.id === att.moduleId);
      const d = new Date(att.uploadedAt);
      const pad = (n: number) => String(n).padStart(2, '0');
      return {
        id: att.id,
        moduleLabel: mod?.label || att.moduleId || '未知模块',
        fileName: att.fileName || '未命名文件',
        recordDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      };
    });
  }, [dbAttachments, modules]);

  const filtered = useMemo(() => {
    if (!searchVal) return attachmentItems;
    const q = searchVal.toLowerCase();
    return attachmentItems.filter((a) =>
      a.fileName.toLowerCase().includes(q) || a.moduleLabel.includes(q)
    );
  }, [attachmentItems, searchVal]);

  // 全选/取消全选
  const allFilteredIds = useMemo(() => new Set(filtered.map(a => a.id)), [filtered]);
  const allSelected = filtered.length > 0 && filtered.every(a => selectedIds.has(a.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  // 批量打包下载
  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return;
    showToast('正在打包 ' + selectedIds.size + ' 个附件...', 'info');
    try {
      const zip = new JSZip();
      for (const id of selectedIds) {
        const att = await getAttachment(id);
        if (!att || att.data.byteLength === 0) {
          console.warn('[Attachments] 跳过空附件:', id);
          continue;
        }
        zip.file(att.fileName, att.data, { binary: true });
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipBuffer = await zipBlob.arrayBuffer();

      if ((window as any).electronAPI?.showSaveDialog) {
        const result = await (window as any).electronAPI.showSaveDialog(
          '附件打包_' + new Date().toISOString().slice(0, 10) + '.zip',
          Array.from(new Uint8Array(zipBuffer))
        );
        if (!result.success && !result.canceled) {
          showToast('保存失败: ' + (result.error || '未知错误'), 'error');
          return;
        }
      } else {
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '附件打包_' + new Date().toISOString().slice(0, 10) + '.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
      showToast('打包完成，共 ' + selectedIds.size + ' 个附件', 'success');
      setSelectedIds(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      showToast('打包失败: ' + msg, 'error');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确认删除选中的 ${selectedIds.size} 个附件？删除后不可恢复。`)) return;
    const idsToDelete = new Set(selectedIds);
    for (const id of idsToDelete) {
      try {
        await deleteAttachment(id);
      } catch (err) {
        console.warn('[Attachments] 删除失败:', err);
      }
    }
    // 同步清理所有记录中的引用，使编辑/查看不再显示已删除的附件
    const cleaned = removeAttachmentRefsFromAllRecords(idsToDelete);
    setSelectedIds(new Set());
    loadAttachments();
    showToast(`已删除 ${idsToDelete.size} 个附件` + (cleaned > 0 ? `，已清理 ${cleaned} 条记录中的引用` : ''), 'success');
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!window.confirm(`确认删除附件「${fileName}」？`)) return;
    try {
      await deleteAttachment(id);
      removeAttachmentRefsFromAllRecords(new Set([id]));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      loadAttachments();
    } catch (err) {
      console.warn('[Attachments] 删除失败:', err);
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
            style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg, #1B5E9B, #2E7DCA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(27,94,155,.3)' }}>
            <FileArchive size={20} color="#fff" />
          </motion.div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#1F2937' }}>附件档案</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>所有工作记录中的附件材料 · 集中查看</div>
          </div>
        </div>
      </motion.div>

      <div style={{ background: '#fff', border: '1px solid #D8E1EA', borderRadius: 8, padding: 16 }}>
        {/* 搜索栏 */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', maxWidth: 400, flex: 1 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="搜索文件名或模块名称..."
              style={{
                width: '100%', height: 36, paddingLeft: 34, paddingRight: 12,
                border: '1.5px solid #D8E1EA', borderRadius: 6, fontSize: 13,
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.size > 0 && (
          <div style={{
            background: '#F0F7FF', border: '1px solid #B9D4E6', borderRadius: 8,
            padding: '8px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 13, color: '#155A8A', fontWeight: 600 }}>
              已选 {selectedIds.size} 项
            </span>
            <div
              onClick={handleBatchDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                fontSize: 12, color: '#155A8A', background: 'rgba(21,90,138,0.08)',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(21,90,138,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(21,90,138,0.08)'; }}
            >
              <Download size={13} /> 批量下载
            </div>
            <div
              onClick={handleBatchDelete}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                fontSize: 12, color: '#DC2626', background: 'rgba(220,38,38,0.08)',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; }}
            >
              <Trash2 size={13} /> 批量删除
            </div>
            <div
              onClick={() => setSelectedIds(new Set())}
              style={{ marginLeft: 'auto', fontSize: 12, color: '#64748B', cursor: 'pointer', textDecoration: 'underline' }}
            >
              取消选择
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <FileArchive size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>
              {attachmentItems.length === 0 ? '暂无附件材料' : '未找到匹配的附件'}
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>
              {attachmentItems.length === 0
                ? '在各个工作模块中新建记录时上传附件，附件将自动归档到此处。'
                : '请尝试其他搜索关键词'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
              共 {filtered.length} 个附件文件
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* 表头：全选 */}
              <div
                onClick={toggleSelectAll}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '6px 14px', cursor: 'pointer', userSelect: 'none',
                  fontSize: 12, color: '#64748B',
                }}
              >
                {allSelected ? <CheckSquare size={14} color="#155A8A" /> : <Square size={14} color="#94A3B8" />}
                <span>全选</span>
              </div>
              {filtered.map((att, i) => {
                const checked = selectedIds.has(att.id);
                return (
                  <motion.div
                    key={att.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 6,
                      border: '1px solid #EDF2F7',
                      background: checked ? '#F0F7FF' : (i % 2 === 0 ? '#FAFBFC' : '#fff'),
                      transition: 'background .15s',
                    }}
                  >
                    {/* 多选框 */}
                    <div
                      onClick={() => toggleSelect(att.id)}
                      style={{ cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                    >
                      {checked
                        ? <CheckSquare size={16} color="#155A8A" />
                        : <Square size={16} color="#CBD5E1" />
                      }
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {getFileIcon(att.fileName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {att.fileName}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 1 }}>
                        {att.moduleLabel} · {att.recordDate}
                      </div>
                    </div>
                    {/* 下载按钮 */}
                    <div
                      onClick={async () => { try { await downloadAttachment(att.id); } catch (err) { const msg = err instanceof Error ? err.message : '未知错误'; showToast('下载失败: ' + msg, 'error'); } }}
                      style={{
                        width: 30, height: 30, borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#9CA3AF',
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#1B5E9B'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}
                      title="下载附件"
                    >
                      <Download size={14} />
                    </div>
                    {/* 删除按钮 */}
                    <div
                      onClick={() => handleDelete(att.id, att.fileName)}
                      style={{
                        width: 30, height: 30, borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#9CA3AF',
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}
                      title="删除附件"
                    >
                      <Trash2 size={14} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

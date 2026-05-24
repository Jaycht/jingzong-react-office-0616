import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileArchive, FileText, Image, File, Download, Search } from 'lucide-react';
import { getMassRecords } from '../store/massStore';
import { getBaseModules } from '../moduleConfig';

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

export default function Attachments() {
  const [searchVal, setSearchVal] = useState('');

  // 从所有记录中查找有 attachment 数据的记录
  const allRecords = useMemo(() => getMassRecords(), []);
  const modules = useMemo(() => getBaseModules(), []);

  const attachments = useMemo(() => {
    const result: Array<{
      moduleLabel: string;
      recordId: string;
      fieldLabel: string;
      fileName: string;
      recordDate: string;
    }> = [];

    for (const rec of allRecords) {
      const mod = modules.find((m) => m.id === rec.moduleId);
      const data = rec.data || {};

      // 查找 attachment 类型字段
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && 'fileList' in (value as any)) {
          const fileList = (value as any).fileList;
          if (Array.isArray(fileList)) {
            for (const file of fileList) {
              result.push({
                moduleLabel: mod?.label || rec.moduleId,
                recordId: rec.id,
                fieldLabel: key,
                fileName: file.name || '未命名文件',
                recordDate: rec.createdAt?.slice(0, 10) || '—',
              });
            }
          }
        }
      }
    }

    return result;
  }, [allRecords]);

  const filtered = useMemo(() => {
    if (!searchVal) return attachments;
    return attachments.filter((a) =>
      a.fileName.toLowerCase().includes(searchVal.toLowerCase()) ||
      a.moduleLabel.includes(searchVal)
    );
  }, [attachments, searchVal]);

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
        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', maxWidth: 400 }}>
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

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <FileArchive size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>
              {attachments.length === 0 ? '暂无附件材料' : '未找到匹配的附件'}
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>
              {attachments.length === 0
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
              {filtered.map((att, i) => (
                <motion.div
                  key={`${att.recordId}-${att.fileName}-${i}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 6,
                    border: '1px solid #EDF2F7',
                    background: i % 2 === 0 ? '#FAFBFC' : '#fff',
                  }}
                >
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
                  <div
                    onClick={() => {
                      // 前端预览模式，实际附件存储在 IndexedDB 中
                    }}
                    style={{
                      width: 30, height: 30, borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#9CA3AF',
                      transition: 'all .15s',
                    }}
                    title="下载附件"
                  >
                    <Download size={14} />
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

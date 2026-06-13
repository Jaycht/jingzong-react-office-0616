import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Download, Upload, RefreshCw, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from "../store/appStore"
import { generateBackup, getBackupMetas, deleteBackupMeta, restoreFromJson } from '../utils/excelUtils';

interface BackupMeta {
  id: string;
  name: string;
  time: string;
  type: 'auto' | 'manual';
}

/** 获取 localStorage 中所有 jingzong.* 数据的总大小（估算） */
function estimateDataSize(): string {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('jingzong.')) {
      total += localStorage.getItem(key)?.length || 0;
    }
  }
  if (total < 1024) return `${total}B`;
  if (total < 1024 * 1024) return `${(total / 1024).toFixed(0)}KB`;
  return `${(total / (1024 * 1024)).toFixed(1)}MB`;
}

/** 估算各模块记录数 */
function getRecordStats(): Record<string, number> {
  try {
    const raw = localStorage.getItem('jingzong.mass.records');
    if (!raw) return { 总记录数: 0 };
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) return { 总记录数: 0 };
    const counts: Record<string, number> = { 总记录数: records.length };
    const moduleCounts: Record<string, number> = {};
    for (const r of records) {
      moduleCounts[r.moduleId] = (moduleCounts[r.moduleId] || 0) + 1;
    }
    // 取前 5 个最多的模块显示
    const sorted = Object.entries(moduleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    for (const [modId, count] of sorted) {
      counts[modId] = count;
    }
    return counts;
  } catch {
    return { 总记录数: 0 };
  }
}

export default function Backup() {
  const showToast = useAppStore((s) => s.showToast);
  const [backups, setBackups] = useState<BackupMeta[]>(() => getBackupMetas());
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);
  const [stats, setStats] = useState<Record<string, number>>(() => getRecordStats());

  // 加载备份列表和数据统计
  const loadData = () => {
    setBackups(getBackupMetas());
    setStats(getRecordStats());
  };

  const handleBackup = () => {
    generateBackup();
    showToast('备份已生成并下载', 'success');
    // 稍后刷新列表（下载需要时间，延迟刷新）
    setTimeout(loadData, 500);
  };

  const handleRestore = () => {
    // 创建隐藏的 file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setRestoring(true);
      setRestoreResult(null);
      try {
        const result = await restoreFromJson(file);
        setRestoreResult(result);
        if (result.success) {
          showToast(result.message, 'success');
          loadData();
        } else {
          showToast(result.message, 'error');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '恢复失败';
        setRestoreResult({ success: false, message });
        showToast(`恢复失败: ${message}`, 'error');
      } finally {
        setRestoring(false);
      }
    };
    input.click();
  };

  const handleDelete = (id: string) => {
    deleteBackupMeta(id);
    setBackups((prev) => prev.filter((b) => b.id !== id));
    showToast('备份记录已删除', 'info');
  };

  const handleDownloadBackup = () => {
    // 重新生成当前数据的备份并下载
    generateBackup();
    showToast('正在重新生成备份...', 'info');
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
          style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg, #1B5E9B, #2E7DCA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(27,94,155,.3)' }}>
          <Database size={20} color="#fff" />
        </motion.div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>备份与恢复</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>数据备份 · 恢复点管理 · 自动备份计划</div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* 左侧：备份状态 + 操作 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 数据概览 */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>数据概览</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, padding: '10px 12px', background: '#EBF5FF', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1B5E9B' }}>{stats['总记录数'] ?? 0}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>总记录数</div>
              </div>
              <div style={{ flex: 1, padding: '10px 12px', background: '#E8F5E9', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#388E3C' }}>{estimateDataSize()}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>数据大小</div>
              </div>
              <div style={{ flex: 1, padding: '10px 12px', background: '#FFF3E0', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#E67E22' }}>{backups.length}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>备份次数</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
              {Object.entries(stats).filter(([k]) => k !== '总记录数').map(([modId, count]) => (
                <span key={modId} style={{
                  fontSize: 10.5, padding: '1px 8px', borderRadius: 10,
                  background: '#F3F4F6', color: '#6B7280',
                }}>
                  {modId.slice(0, 16)}: {count}
                </span>
              ))}
            </div>
          </motion.div>

          {/* 操作按钮 */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ display: 'flex', gap: 10 }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleBackup}
              style={{
                flex: 1, height: 40, background: '#2E7DCA', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6, fontFamily: 'inherit',
              }}>
              <Upload size={14} />立即备份
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleRestore}
              disabled={restoring}
              style={{
                flex: 1, height: 40, background: restoring ? '#F3F4F6' : '#fff',
                color: restoring ? '#9CA3AF' : '#1B5E9B',
                border: restoring ? '1px solid #E5E7EB' : '1.5px solid #1B5E9B',
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: restoring ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6, fontFamily: 'inherit',
              }}>
              <RefreshCw size={14} />{restoring ? '恢复中...' : '从文件恢复'}
            </motion.button>
          </motion.div>

          {/* 自动备份状态 */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>自动备份设置</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '12px 14px', background: '#E8F5E9', borderRadius: 8, border: '1px solid #A5D6A7' }}>
              <CheckCircle size={18} color="#388E3C" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#388E3C' }}>自动备份已启用</div>
                <div style={{ fontSize: 11.5, color: '#6B7280' }}>刷新页面或关闭浏览器前建议手动备份</div>
              </div>
            </div>
            {[
              { label: '存储位置', value: '浏览器 localStorage' },
              { label: '备份格式', value: 'JSON 完整数据' },
              { label: '数据范围', value: '所有 jingzong.* 记录' },
              { label: '备份保留数', value: '最近 30 个版本' },
            ].map((item) => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: 12.5,
              }}>
                <span style={{ color: '#6B7280' }}>{item.label}</span>
                <span style={{ fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#FFF8E1', borderRadius: 6, fontSize: 11.5, color: '#E67E22', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>前端原型仅使用浏览器本地存储，清除浏览器数据会丢失所有记录。请定期手动备份。</span>
            </div>
          </motion.div>

          {/* 恢复结果提示 */}
          <AnimatePresence>
            {restoreResult && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  padding: '12px 14px', borderRadius: 8,
                  background: restoreResult.success ? '#E8F5E9' : '#FFEBEE',
                  border: `1px solid ${restoreResult.success ? '#A5D6A7' : '#EF9A9A'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {restoreResult.success
                    ? <CheckCircle size={16} color="#388E3C" />
                    : <AlertCircle size={16} color="#DC2626" />
                  }
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: restoreResult.success ? '#388E3C' : '#DC2626',
                  }}>
                    {restoreResult.success ? '恢复成功' : '恢复失败'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                  {restoreResult.message}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setRestoreResult(null)}
                  style={{
                    marginTop: 8, padding: '4px 12px', background: 'none',
                    border: '1px solid #D8E1EA', borderRadius: 4, fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  关闭
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 右侧：备份记录列表 */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid #E5E7EB', fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>历史备份记录</span>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>
              {backups.length > 0 ? `共 ${backups.length} 条` : '暂无备份'}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
            {backups.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                <Database size={32} color="#D1D5DB" style={{ marginBottom: 8 }} />
                <div>暂无备份记录</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>点击「立即备份」创建第一个备份</div>
              </div>
            ) : (
              backups.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  whileHover={{ background: '#F8FAFC' }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 16px',
                    borderBottom: i < backups.length - 1 ? '1px solid #F3F4F6' : 'none',
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: b.type === 'auto' ? '#EBF5FF' : '#FFF3E0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Clock size={14} color={b.type === 'auto' ? '#1B5E9B' : '#E67E22'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{b.time} · {b.type === 'auto' ? '自动备份' : '手动备份'}</div>
                  </div>
                  <span style={{
                    fontSize: 10.5, padding: '1px 7px', borderRadius: 8,
                    background: '#E8F5E9', color: '#388E3C', fontWeight: 600, flexShrink: 0,
                  }}>
                    成功
                  </span>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={handleDownloadBackup}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                      <Download size={13} />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(b.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D32F2F', padding: 4 }}>
                      <Trash2 size={13} />
                    </motion.button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}


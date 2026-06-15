import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Download, Upload, RefreshCw, Trash2, Clock, CheckCircle, AlertCircle, Settings2, Save, HardDrive } from 'lucide-react';
import { useAppStore } from "../store/appStore"
import { generateBackup, getBackupMetas, deleteBackupMeta, restoreFromJson } from '../utils/excelUtils';
import { getMassRecords } from '../store/massStore';

interface BackupMeta {
  id: string;
  name: string;
  time: string;
  type: 'auto' | 'manual';
}

/** 自动备份配置 */
interface AutoBackupConfig {
  enabled: boolean;
  intervalHours: number;  // 0 = 不启用定时
  backupOnSave: boolean;  // 录入数据后备份
  backupOnClose: boolean; // 关闭时备份
}

const AUTO_BACKUP_CONFIG_KEY = 'jingzong.autoBackup.config';

const INTERVAL_OPTIONS = [
  { label: '不启用', value: 0 },
  { label: '每 6 小时', value: 6 },
  { label: '每 12 小时', value: 12 },
  { label: '每天 1 次', value: 24 },
  { label: '每 2 天', value: 48 },
  { label: '每 3 天', value: 72 },
  { label: '每周 1 次', value: 168 },
];

/** 获取自动备份配置 */
function getAutoBackupConfig(): AutoBackupConfig {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { enabled: true, intervalHours: 24, backupOnSave: true, backupOnClose: true };
}

/** 保存自动备份配置 */
function saveAutoBackupConfig(config: AutoBackupConfig): void {
  localStorage.setItem(AUTO_BACKUP_CONFIG_KEY, JSON.stringify(config));
}

/** 判断上次备份距今是否超过间隔 */
function shouldBackup(config: AutoBackupConfig): boolean {
  const lastBackup = localStorage.getItem('jingzong.autoBackup.lastTime');
  if (!lastBackup || config.intervalHours <= 0) return false;
  const last = parseInt(lastBackup, 10);
  const now = Date.now();
  return (now - last) >= config.intervalHours * 60 * 60 * 1000;
}

/** 标记一次备份 */
function markBackup(): void {
  localStorage.setItem('jingzong.autoBackup.lastTime', String(Date.now()));
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

/** 模块 ID 到中文名称的映射 */
const MODULE_NAMES: Record<string, string> = {
  'mass-clue': '线索登记', 'mass-statistics': '涉众统计', 'legal-case-ledger': '案件总台账',
  'squad-daily': '每日工作记录', 'squad-coercive': '强制措施登记', 'squad-case': '中队案件管理',
  'squad-property': '涉案财物管理', 'evidence': '线索核查', 'evidence-request': '调证登记',
  'evidence-freeze': '资金查控', 'evidence-phone-collection': '设备采集', 'evidence-report': '资金分析',
};

/** 估算各模块记录数 */
function getRecordStats(): Record<string, number> {
  try {
    const raw = localStorage.getItem('jingzong.mass.records');
    if (!raw) return { '总记录数': 0 };
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) return { '总记录数': 0 };
    const counts: Record<string, number> = { '总记录数': records.length };
    const moduleCounts: Record<string, number> = {};
    for (const r of records) {
      const cn = MODULE_NAMES[r.moduleId] || r.moduleId;
      moduleCounts[cn] = (moduleCounts[cn] || 0) + 1;
    }
    const sorted = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [name, count] of sorted) counts[name] = count;
    return counts;
  } catch {
    return { '总记录数': 0 };
  }
}

export default function Backup() {
  const showToast = useAppStore((s) => s.showToast);
  const [backups, setBackups] = useState<BackupMeta[]>(() => getBackupMetas());
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);
  const [stats, setStats] = useState<Record<string, number>>(() => getRecordStats());
  const [config, setConfig] = useState<AutoBackupConfig>(() => getAutoBackupConfig());
  const [autoBackupRunning, setAutoBackupRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // 加载备份列表和数据统计
  const loadData = () => {
    setBackups(getBackupMetas());
    setStats(getRecordStats());
  };

  // 执行备份
  const doBackup = (type: 'auto' | 'manual') => {
    generateBackup();
    markBackup();
    if (type === 'auto') {
      const meta: BackupMeta = {
        id: `auto-${Date.now()}`,
        name: `自动备份 ${new Date().toLocaleString('zh-CN')}`,
        time: new Date().toLocaleString('zh-CN'),
        type: 'auto',
      };
      // 写入备份元数据
      const metas = getBackupMetas();
      metas.unshift(meta);
      localStorage.setItem('jingzong.backup.metas', JSON.stringify(metas.slice(0, 30)));
      setBackups(metas.slice(0, 30));
    }
    if (type === 'manual') showToast('备份已生成并下载', 'success');
    setTimeout(loadData, 500);
  };

  // 自动备份定时器
  useEffect(() => {
    const cfg = getAutoBackupConfig();
    if (!cfg.enabled || cfg.intervalHours <= 0) return;

    // 检查是否需要备份
    if (shouldBackup(cfg)) {
      doBackup('auto');
    }

    // 定时检查
    timerRef.current = setInterval(() => {
      const currentCfg = getAutoBackupConfig();
      if (!currentCfg.enabled || currentCfg.intervalHours <= 0) return;
      if (shouldBackup(currentCfg)) {
        doBackup('auto');
      }
    }, cfg.intervalHours * 60 * 60 * 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // 页面关闭时备份
  useEffect(() => {
    const cfg = getAutoBackupConfig();
    if (!cfg.backupOnClose) return;
    const handleBeforeUnload = () => { doBackup('auto'); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 更新配置
  const updateConfig = (key: keyof AutoBackupConfig, value: AutoBackupConfig[keyof AutoBackupConfig]) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    saveAutoBackupConfig(next);
    showToast('备份设置已保存', 'success');
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
            style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB' }}>
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
              {Object.entries(stats).filter(([k]) => k !== '总记录数').map(([modName, count]) => (
                <span key={modName} style={{
                  fontSize: 10.5, padding: '1px 8px', borderRadius: 10,
                  background: '#F3F4F6', color: '#6B7280',
                }}>
                  {modName}: {count}
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

          {/* 自动备份设置 */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings2 size={14} color="#1B5E9B" />
              自动备份设置
            </div>
            
            {/* 定时备份间隔 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: mutedColor, marginBottom: 6 }}>定时备份间隔</div>
              <select
                value={config.intervalHours}
                onChange={e => updateConfig('intervalHours', Number(e.target.value))}
                style={{
                  width: '100%', height: 34, padding: '0 10px',
                  borderRadius: 8, border: '1px solid #D9D9D9',
                  fontSize: 12.5, color: textColor, background: '#fff',
                  outline: 'none', cursor: 'pointer',
                }}
              >
                {INTERVAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 录入数据后备份 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 10px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
              <input
                type="checkbox"
                checked={config.backupOnSave}
                onChange={e => updateConfig('backupOnSave', e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#166534' }}>录入数据后自动备份</div>
                <div style={{ fontSize: 11, color: '#86EFAC' }}>新建或更新记录后立即生成备份</div>
              </div>
            </div>

            {/* 关闭时备份 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
              <input
                type="checkbox"
                checked={config.backupOnClose}
                onChange={e => updateConfig('backupOnClose', e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1E40AF' }}>关闭软件时自动备份</div>
                <div style={{ fontSize: 11, color: '#93C5FD' }}>防止意外断电或崩溃导致数据丢失</div>
              </div>
            </div>

            {/* 说明 */}
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF7ED', borderRadius: 6, fontSize: 11, color: '#9A3412', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <HardDrive size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>自动备份仅保存在浏览器本地，不占用服务器空间。建议定期手动备份到电脑硬盘。</span>
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


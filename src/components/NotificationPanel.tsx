/**
 * 最近操作通知面板
 * 右侧可收起的面板，显示最近操作记录（与工作台预警不重复）
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getMassRecords } from '../store/massStore';
import { MODULE_NAMES } from '../moduleConfig';

function fmtTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export default function NotificationPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const darkMode = useAppStore((s) => s.darkMode);
  const setEditRecord = useAppStore((s) => s.setEditRecord);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const openModal = useAppStore((s) => s.openModal);

  // 最近 12 条操作记录（按更新时间排序）
  const recentOps = useMemo(() => {
    const records = getMassRecords();
    return records
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 12)
      .map(r => ({
        id: r.id,
        moduleId: r.moduleId,
        moduleName: MODULE_NAMES[r.moduleId] || r.moduleId,
        title: String(r.data?.caseName || r.data?.suspect || r.data?.title || ''),
        time: r.updatedAt,
        record: r,
      }));
  }, []);

  const handleClick = (item: typeof recentOps[0]) => {
    setEditRecord(item.record);
    setCurrentPage(item.moduleId);
    openModal('newRecord');
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0, zIndex: 50 }}>
      {/* 折叠/展开按钮 */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setCollapsed(v => !v)}
        style={{
          position: 'absolute', left: -32, top: 12,
          width: 28, height: 28, padding: 0, borderRadius: '6px 0 0 6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 51,
        }}
        title={collapsed ? '展开操作记录' : '收起操作记录'}
      >
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="panel"
            style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* 标题 */}
            <div className="panel-header" style={{ flexShrink: 0 }}>
              <Activity size={14} color="var(--color-primary)" />
              <span className="font-semibold" style={{ fontSize: 13 }}>最近操作</span>
              <span className="badge badge-primary" style={{ marginLeft: 'auto', fontSize: 10 }}>{recentOps.length}</span>
            </div>

            {/* 列表 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
              {recentOps.length === 0 ? (
                <div style={{ padding: '28px 12px', textAlign: 'center' }}>
                  <Clock size={24} color="var(--color-text-muted)" style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>暂无操作记录</div>
                </div>
              ) : (
                recentOps.map((item) => (
                  <div
                    key={item.id}
                    className="hover-bg"
                    onClick={() => handleClick(item)}
                    style={{ padding: '8px 10px', marginBottom: 4, borderRadius: 6, cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span className="badge badge-info" style={{ fontSize: 10 }}>{item.moduleName}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{fmtTime(item.time)}</span>
                    </div>
                    <div className="truncate" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>
                      {item.title || '无标题'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

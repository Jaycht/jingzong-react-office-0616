import { motion } from 'framer-motion';
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react';
import { useApp } from '../App';
import { MOCK_NOTIFICATIONS } from '../data';

const ICON_MAP = { danger: AlertTriangle, warning: AlertTriangle, info: Info, success: CheckCircle };
const COLOR_MAP: Record<string, string> = { danger: '#D32F2F', warning: '#E67E22', info: '#1B5E9B', success: '#388E3C' };
const BG_MAP: Record<string, string> = { danger: '#FFEBEE', warning: '#FFF3E0', info: '#EBF5FF', success: '#E8F5E9' };

export default function MessagesPage() {
  const { showToast } = useApp();

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
            style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg, #1B5E9B, #2E7DCA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(27,94,155,.3)' }}>
            <Bell size={20} color="#fff" />
          </motion.div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>消息通知</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>系统通知 · 预警提醒 · 版本更新</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => showToast('已全部标记为已读', 'success')}
            style={{ height: 34, padding: '0 14px', background: '#fff', color: '#1B5E9B', border: '1.5px solid #1B5E9B', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <CheckCheck size={14} />全部已读
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: '#6B7280' }}>未读消息 <strong style={{ color: '#D32F2F' }}>3</strong> 条</div>
        </div>
        <div>
          {MOCK_NOTIFICATIONS.map((n, i) => {
            const Icon = ICON_MAP[n.type as keyof typeof ICON_MAP];
            const color = COLOR_MAP[n.type] || '#1B5E9B';
            const bg = BG_MAP[n.type] || '#EBF5FF';
            return (
              <motion.div
                key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                whileHover={{ background: '#F8FAFC' }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 13, padding: '14px 16px',
                  borderBottom: i < MOCK_NOTIFICATIONS.length - 1 ? '1px solid #F3F4F6' : 'none',
                  cursor: 'pointer', position: 'relative',
                }}>
                {!n.read && <div style={{ position: 'absolute', top: 18, left: 6, width: 7, height: 7, borderRadius: '50%', background: '#D32F2F' }} />}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{ width: 42, height: 42, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                  <Icon size={18} color={color} />
                </motion.div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4, color: n.read ? '#6B7280' : '#1F2937' }}>{n.title}</div>
                  <div style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.6, marginBottom: 5 }}>{n.content}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{n.source} · {n.time}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); showToast('已标记为已读', 'success'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                    <CheckCheck size={15} />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); showToast('消息已删除', 'info'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

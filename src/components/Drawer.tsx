import { motion } from 'framer-motion';
import { X, Eye, Pen, Download, Trash2, Clock } from 'lucide-react';
import { useAppStore } from "../store/appStore"

interface Props { onClose: () => void; }

export default function Drawer({ onClose }: Props) {
    const showToast = useAppStore((s) => s.showToast);

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(2px)', zIndex: 500 }}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 38 }}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(480px, 95vw)',
          background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,.12)',
          zIndex: 501, display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>工作记录详情</div>
            <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2 }}>李某涉嫌非法吸收公众存款案 · 法制室</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Status */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <span style={{ padding: '3px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 600, background: '#EBF5FF', color: '#1B5E9B' }}>
              <Clock size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />侦办中
            </span>
            <span style={{ padding: '3px 12px', borderRadius: 10, fontSize: 11.5, background: '#FFF3E0', color: '#E67E22' }}>涉案金额：2800万元</span>
          </div>

          {/* Fields */}
          {[
            { label: '案件编号', value: 'JZ-2026-0089' },
            { label: '案件名称', value: '李某涉嫌非法吸收公众存款案' },
            { label: '案件类型', value: '非法吸收公众存款' },
            { label: '涉案金额', value: '2800万元' },
            { label: '案发时间', value: '2026-04-15' },
            { label: '报案时间', value: '2026-04-16 09:30' },
            { label: '案发地点', value: '北京市朝阳区' },
            { label: '承办人', value: '王警官（31001236）' },
            { label: '案件状态', value: '侦办中 — 强制措施执行中' },
            { label: '报案人', value: '李某（报案人）' },
            { label: '报案人联系方式', value: '138****1234' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #F3F4F6', gap: 10 }}
            >
              <div style={{ width: 110, fontSize: 12.5, color: '#9CA3AF', flexShrink: 0 }}>{item.label}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1F2937', flex: 1 }}>{item.value}</div>
            </motion.div>
          ))}

          {/* Timeline */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} color="#2E7DCA" />案件时间线
            </div>
            {[
              { date: '2026-04-16 09:30', event: '报案人报案，法制室受理', type: 'info' },
              { date: '2026-04-16 14:00', event: '立案审批通过', type: 'success' },
              { date: '2026-04-17 10:00', event: '采取刑事拘留强制措施', type: 'warning' },
              { date: '2026-04-20 09:00', event: '提请检察院批准逮捕', type: 'info' },
              { date: '2026-04-28 16:30', event: '检察院批准逮捕', type: 'success' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2E7DCA', flexShrink: 0, marginTop: 2 }} />
                  {i < 4 && <div style={{ width: 1, flex: 1, background: '#E5E7EB', minHeight: 20 }} />}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{item.date}</div>
                  <div style={{ fontSize: 12.5, color: '#1F2937' }}>{item.event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 8 }}>
          {[Eye, Pen, Download, Trash2].map((Icon, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (i === 0) onClose();
                else if (i === 1) showToast('进入编辑模式...', 'info');
                else if (i === 2) showToast('正在生成文档...', 'info');
                else showToast('确认删除此记录？', 'warning');
              }}
              style={{
                flex: 1, height: 38, borderRadius: 8, border: i === 3 ? '1.5px solid #FFCDD2' : '1.5px solid #E5E7EB',
                background: i === 3 ? '#FFEBEE' : '#fff',
                color: i === 3 ? '#D32F2F' : '#6B7280',
                fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontFamily: 'inherit',
              }}
            >
              <Icon size={13} />
              {['', '编辑', '导出', '删除'][i]}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

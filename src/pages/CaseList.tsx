import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, Upload, Download, Eye, Pen, Trash2 } from 'lucide-react';
import { useAppStore } from "../store/appStore"
import { CASE_STATS, KANBAN_COLUMNS } from '../data';
import { exportCasesToExcel, importExcelToModule } from '../utils/excelUtils';

const CASES = [
  { id: 'JZ-2026-0089', name: '李某涉嫌非法吸收公众存款案', type: '非法吸存', amount: 2800, person: '王警官', status: 'ongoing', date: '05-18', tag: '侦办中' },
  { id: 'JZ-2026-0088', name: '刘某涉嫌组织领导传销活动案', type: '传销', amount: 960, person: '李警官', status: 'ongoing', date: '05-17', tag: '侦办中' },
  { id: 'JZ-2026-0085', name: '陈某涉嫌贷款诈骗案', type: '贷款诈骗', amount: 350, person: '张警官', status: 'legal', date: '05-16', tag: '法制审核' },
  { id: 'JZ-2026-0079', name: '赵某涉嫌虚开增值税专用发票案', type: '虚开发票', amount: 1200, person: '孙警官', status: 'closed', date: '05-10', tag: '已结案' },
  { id: 'JZ-2026-0075', name: '王某涉嫌合同诈骗案', type: '合同诈骗', amount: 500, person: '赵警官', status: 'pending', date: '05-09', tag: '待受理' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  ongoing: { bg: '#EBF5FF', color: '#1B5E9B', dot: '#1B5E9' },
  legal: { bg: '#FFF3E0', color: '#E67E22', dot: '#E67E22' },
  closed: { bg: '#E8F5E9', color: '#388E3C', dot: '#388E3C' },
  pending: { bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
};

const KANBAN_DATA: Record<string, typeof CASES> = {
  pending: [CASES[4]],
  investigating: [CASES[0], CASES[1]],
  legal: [CASES[2]],
  transfer: [],
  closed: [CASES[3]],
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardItem = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } };

export default function CaseList() {
    const openModal = useAppStore((s) => s.openModal);
  const openDrawer = useAppStore((s) => s.openDrawer);
  const showToast = useAppStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState<'kanban' | 'table'>('kanban');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCaseImport = async (file: File) => {
    try {
      const result = await importExcelToModule(file, 'squad-case');
      if (result.success > 0) {
        showToast(`成功导入 ${result.success} 条案件`, 'success');
      } else {
        showToast(result.errors[0] || '导入失败', 'error');
      }
    } catch (err: any) {
      showToast(`导入出错: ${err.message}`, 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
            style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg, #1B5E9B, #2E7DCA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(27,94,155,.3)' }}
          >
            <Briefcase size={20} color="#fff" />
          </motion.div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#1F2937' }}>案件管理</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>法制室 · 案件总台账 / 法制审核 / 案件呈请</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCaseImport(file);
              e.target.value = '';
            }}
          />
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => fileInputRef.current?.click()}
            style={{ height: 34, padding: '0 14px', background: '#fff', color: '#1B5E9B', border: '1.5px solid #1B5E9B', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
          >
            <Upload size={14} />导入
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => {
              exportCasesToExcel();
              showToast('正在生成案件台账...', 'info');
            }}
            style={{ height: 34, padding: '0 14px', background: '#fff', color: '#1B5E9B', border: '1.5px solid #1B5E9B', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
          >
            <Download size={14} />导出
          </motion.button>
          <motion.button whileHover={{ scale: 1.04, boxShadow: '0 4px 14px rgba(27,94,155,.3)' }} whileTap={{ scale: 0.97 }}
            onClick={() => openModal('newRecord')}
            style={{ height: 34, padding: '0 18px', background: '#2E7DCA', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
          >
            <Plus size={15} />新建案件
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={container} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}
      >
        {CASE_STATS.map((s) => (
          <motion.div
            key={s.label} variants={cardItem}
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,.1)' }}
            style={{ background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 11, background: s.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Briefcase size={19} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: '#1F2937' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.color, marginTop: 2 }}>{s.change}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#fff', padding: 4, borderRadius: 9, border: '1px solid #E5E7EB', width: 'fit-content' }}>
        {[['kanban', '看板视图'], ['table', '表格视图']].map(([v, label]) => (
          <motion.button
            key={v}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(v as 'kanban' | 'table')}
            style={{
              padding: '5px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              background: activeTab === v ? '#2E7DCA' : 'transparent',
              color: activeTab === v ? '#fff' : '#6B7280', transition: 'all .2s',
            }}
          >
            {label}
          </motion.button>
        ))}
      </div>

      {/* Kanban */}
      <AnimatePresence>
        {activeTab === 'kanban' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, minHeight: 300 }}
          >
            {KANBAN_COLUMNS.map((col, ci) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.08 }}
                style={{ width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ padding: '10px 14px', background: '#fff', borderRadius: '10px 10px 0 0', border: '1px solid #E5E7EB', borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    {col.label}
                  </div>
                  <span style={{ background: '#F3F4F6', fontSize: 11, padding: '1px 7px', borderRadius: 9, fontWeight: 600 }}>{col.count}</span>
                </div>
                <div style={{ background: '#F8FAFC', flex: 1, borderRadius: '0 0 10px 10px', border: '1px solid #E5E7EB', borderTop: 'none', padding: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {(KANBAN_DATA[col.id] || []).map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: ci * 0.08 + i * 0.06 }}
                      whileHover={{ y: -2, boxShadow: '0 6px 16px rgba(0,0,0,.1)' }}
                      onClick={openDrawer}
                      style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #E5E7EB', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.05)' }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.5, marginBottom: 6 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>涉案金额：<strong style={{ color: '#1F2937' }}>¥{c.amount}万</strong></div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>报案时间：{c.date}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: STATUS_COLORS[c.status].bg, color: STATUS_COLORS[c.status].color }}>
                          {c.tag}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <AnimatePresence>
        {activeTab === 'table' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', overflow: 'hidden' }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: '#6B7280' }}>共 <strong style={{ color: '#1F2937' }}>113</strong> 条案件记录</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input placeholder="搜索案件..." style={{ height: 30, padding: '0 10px', border: '1.5px solid #E5E7EB', borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['案件编号', '案件名称', '案件类型', '涉案金额', '承办人', '当前状态', '更新时间', '操作'].map((h, i) => (
                      <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CASES.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.06 }}
                      whileHover={{ background: '#F8FAFC' }}
                      style={{ borderBottom: '1px solid #F3F4F6' }}
                    >
                      <td style={{ padding: '11px 14px', fontSize: 12, fontFamily: 'monospace' }}>{c.id}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5, fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '11px 14px', fontSize: 11.5 }}>
                        <span style={{ padding: '2px 9px', borderRadius: 10, fontSize: 10.5, fontWeight: 600, background: STATUS_COLORS[c.status].bg, color: STATUS_COLORS[c.status].color }}>{c.type}</span>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5, fontWeight: 600 }}>¥{c.amount.toLocaleString()}万</td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5 }}>{c.person}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5 }}>
                        <span style={{ padding: '2px 9px', borderRadius: 10, fontSize: 10.5, fontWeight: 600, background: STATUS_COLORS[c.status].bg, color: STATUS_COLORS[c.status].color }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: STATUS_COLORS[c.status].dot, display: 'inline-block', marginRight: 4 }} />
                          {c.tag}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 11.5, color: '#9CA3AF' }}>{c.date}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[Eye, Pen, Trash2].map((Icon, i) => (
                            <motion.button
                              key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={openDrawer}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, color: i === 2 ? '#D32F2F' : '#9CA3AF', fontSize: 12.5 }}
                            >
                              <Icon size={13} />
                            </motion.button>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#6B7280' }}>
              <div>第 1 页，共 12 页</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['上一页', '1', '2', '3', '...', '12', '下一页'].map((p, i) => (
                  <button key={i} style={{ width: 30, height: 30, border: '1px solid #E5E7EB', background: i === 1 ? '#2E7DCA' : '#fff', color: i === 1 ? '#fff' : '#6B7280', borderRadius: 6, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {p === '上一页' ? '<' : p === '下一页' ? '>' : p}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';
import { getCurrentVersion, bumpVersion, setVersionChangelog } from '../store/versionStore';
import { useApp } from '../App';

const LEGACY_UPDATES = [
  { version: 'V1.2.2', date: '2026-04-28', type: '优化', items: ['新增自定义字段功能', '支持多角色权限管理', '新增操作日志导出', '法制审核流程优化'], fix: ['修复附件上传失败问题'] },
  { version: 'V1.2.1', date: '2026-04-10', type: '修复', items: ['新增应急处置模块', '新增报表管理模块'], fix: ['修复部分字段无法保存', '修复搜索结果排序问题'] },
  { version: 'V1.2.0', date: '2026-03-25', type: '新功能', items: ['全新UI界面重构', '新增数据统计可视化', '新增自动备份功能', '新增多语言支持'], fix: [] },
];

const CHANGELOG = [
  { label: '新增', color: '#388E3C', bg: '#E8F5E9', count: 24 },
  { label: '优化', color: '#1B5E9B', bg: '#EBF5FF', count: 18 },
  { label: '修复', color: '#E67E22', bg: '#FFF3E0', count: 31 },
];

export default function Version() {
  const { showToast } = useApp();
  const [verRefresh, setVerRefresh] = useState(0);
  const versionInfo = useMemo(() => getCurrentVersion(), [verRefresh]);

  // 合并版本更新日志
  const allUpdates = useMemo(() => {
    const currentEntry = {
      version: versionInfo.version,
      date: versionInfo.updatedAt,
      type: '当前版本' as const,
      items: versionInfo.changelog.slice(-5),
      fix: [] as string[],
    };
    return [currentEntry, ...LEGACY_UPDATES];
  }, [versionInfo]);

  const handleBump = () => {
    const v = bumpVersion('版本功能优化');
    setVerRefresh(k => k + 1);
    showToast(`版本已更新至 ${v.version}`, 'success');
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* ===== 关于信息 ===== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
          boxShadow: '0 1px 4px rgba(0,0,0,.06)',
          padding: '40px 24px 32px',
          marginBottom: 22,
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
          style={{ marginBottom: 20 }}
        >
          <img
            src="/logo.png"
            alt="经侦大队"
            style={{ width: 280, height: 280, objectFit: 'contain' }}
          />
        </motion.div>

        {/* 主标题 + 版本号 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 6, letterSpacing: 1 }}
        >
          经侦大队工作记录管理系统
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{
            fontSize: 32, fontWeight: 900, color: '#155A8A',
            marginBottom: 8, letterSpacing: 2,
            fontFamily: "'Courier New', monospace",
          }}
        >
          {versionInfo.version}
        </motion.div>

        {/* 副标题 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: 13, color: '#6B7280', marginBottom: 22, letterSpacing: 0.5 }}
        >
          Economic Investigation Work Log Registration System
        </motion.div>

        {/* 分隔线 */}
        <div style={{ width: 60, height: 2, background: 'linear-gradient(90deg, transparent, #1B5E9B, transparent)', margin: '0 auto 22px' }} />

        {/* 制作人 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{ fontSize: 14, color: '#374151', marginBottom: 18, fontWeight: 500 }}
        >
          制作人：陈洪涛 © 版权所有
        </motion.div>

        {/* 版权声明 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            fontSize: 12.5, color: '#4B5563', lineHeight: 1.8,
            maxWidth: 720, margin: '0 auto 14px', textAlign: 'center',
          }}
        >
          版权声明：本软件及相关文档（含报告模板、表格模板）仅供公安经侦部门内部离线使用，未经许可，不得复制、传播、修改或用于其他非经侦工作场景。
        </motion.div>

        {/* 免责声明 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{
            fontSize: 12.5, color: '#4B5563', lineHeight: 1.8,
            maxWidth: 720, margin: '0 auto 18px', textAlign: 'center',
          }}
        >
          免责声明：本软件仅用于经侦案件工作日志登记、案件管理及报告生成，所有数据均存储于本地离线设备，软件开发者及制作人不对数据使用过程中的违规操作承担责任，使用者需严格遵守公安数据安全管理规定。
        </motion.div>

        {/* Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}
        >
          Copyright © 2026 经侦大队工作记录管理系统. All Rights Reserved.
        </motion.div>
      </motion.div>

      {/* ===== 更新统计 ===== */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        {CHANGELOG.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
            style={{ flex: 1, background: '#fff', borderRadius: 9, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: c.color }}>{c.count}</div>
            <div>
              <div style={{ fontSize: 11.5, color: '#6B7280' }}>{c.label}数</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>历史版本累计</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ===== 更新日志 ===== */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid #E5E7EB', fontSize: 13, fontWeight: 700, color: '#1F2937' }}>更新日志</div>
        <div>
          {allUpdates.map((u, i) => (
            <motion.div key={u.version} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 + i * 0.08 }}
              style={{ padding: '16px 18px', borderBottom: i < allUpdates.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#1F2937' }}>{u.version}</span>
                  <span style={{ fontSize: 10.5, padding: '1px 8px', borderRadius: 8, background: '#EBF5FF', color: '#1B5E9B', fontWeight: 600 }}>{u.type}</span>
                </div>
                <span style={{ fontSize: 11.5, color: '#9CA3AF' }}>{u.date}</span>
              </div>
              {u.items.length > 0 && (
                <div style={{ marginBottom: u.fix.length > 0 ? 6 : 0 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>新增/优化</div>
                  {u.items.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                      <ArrowRight size={12} color="#388E3C" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, color: '#4B5563' }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
              {u.fix.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>Bug 修复</div>
                  {u.fix.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                      <CheckCircle size={12} color="#E67E22" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, color: '#4B5563' }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

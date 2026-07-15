import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Power, Monitor, ShieldCheck, Boxes,
  PieChart, TableProperties, FileArchive, ScrollText, DatabaseBackup,
} from 'lucide-react';
import { Switch } from 'antd';
import { useAppStore } from '../store/appStore';

import SettingsPage from './SettingsPage';
import Statistics from './Statistics';
import ImportExport from './ImportExport';
import Attachments from './Attachments';
import OperationLog from './OperationLog';
import Backup from './Backup';
import Version from './Version';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

type TabId = 'general' | 'modules' | 'statistics' | 'importExport' | 'attachments' | 'operationLog' | 'backup' | 'about';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number; color?: string }>; tint: string }[] = [
  { id: 'general', label: '通用设置', icon: Settings, tint: '#6366F1' },
  { id: 'modules', label: '模块与字段', icon: Boxes, tint: '#8B5CF6' },
  { id: 'statistics', label: '统计分析', icon: PieChart, tint: '#0EA5E9' },
  { id: 'importExport', label: '导入导出', icon: TableProperties, tint: '#14B8A6' },
  { id: 'attachments', label: '附件档案', icon: FileArchive, tint: '#F59E0B' },
  { id: 'operationLog', label: '操作日志', icon: ScrollText, tint: '#64748B' },
  { id: 'backup', label: '备份恢复', icon: DatabaseBackup, tint: '#10B981' },
  { id: 'about', label: '关于软件', icon: ShieldCheck, tint: '#2563EB' },
];

export default function SystemSettings() {
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [autoStart, setAutoStart] = useState(false);
  const [closeToTray, setCloseToTray] = useState(() => {
    try { return localStorage.getItem('jingzong.closeToTray') !== 'false'; } catch { return true; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isElectron) {
      window.electronAPI.getAutoStart().then((v: boolean) => setAutoStart(v)).catch(() => {});
    }
  }, []);

  const handleAutoStart = async (checked: boolean) => {
    setLoading(true);
    try {
      if (isElectron) {
        const result = await window.electronAPI.setAutoStart(checked);
        setAutoStart(result);
      }
    } catch {}
    setLoading(false);
  };

  const handleCloseToTray = (checked: boolean) => {
    setCloseToTray(checked);
    try { localStorage.setItem('jingzong.closeToTray', String(checked)); } catch {}
  };

  const textColor = darkMode ? '#E6EAF2' : '#1F2937';
  const textMuted = darkMode ? '#8A94A6' : '#6B7280';
  const borderColor = darkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
  const railBg = darkMode ? '#11161d' : '#F8FAFC';
  const contentBg = darkMode ? '#0E131A' : '#FFFFFF';

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680 }}>
            <Section title="启动与窗口" icon={<Power size={16} />}>
              <SettingRow
                title="开机自动启动"
                desc="系统启动时自动运行程序"
                extra={
                  isElectron ? (
                    <Switch checked={autoStart} onChange={handleAutoStart} loading={loading} />
                  ) : (
                    <span style={{ fontSize: 11, color: textMuted }}>仅桌面版</span>
                  )
                }
              />
              {isElectron && (
                <SettingRow
                  title="关闭时最小化到托盘"
                  desc="点击关闭按钮时隐藏到系统托盘，双击托盘图标恢复"
                  extra={<Switch checked={closeToTray} onChange={handleCloseToTray} />}
                />
              )}
            </Section>
            <Section title="显示" icon={<Monitor size={16} />}>
              <SettingRow
                title="深色模式"
                desc="切换浅色/深色界面主题"
                extra={<Switch checked={darkMode} onChange={toggleDarkMode} />}
              />
            </Section>
          </div>
        );
      case 'modules': return <SettingsPage />;
      case 'statistics': return <Statistics />;
      case 'importExport': return <ImportExport />;
      case 'attachments': return <Attachments />;
      case 'operationLog': return <OperationLog />;
      case 'backup': return <Backup />;
      case 'about': return <Version />;
      default: return null;
    }
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366F1, #818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(99,102,241,.3)' }}>
          <Settings size={22} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: textColor }}>系统设置</div>
          <div style={{ fontSize: 12.5, color: textMuted, marginTop: 1 }}>通用 · 模块 · 数据 · 备份 · 关于</div>
        </div>
      </motion.div>

      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        {/* 左侧标签导航 */}
        <div style={{ flexShrink: 0, width: 212, background: railBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: 10, position: 'sticky', top: 4 }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 11,
                  padding: '11px 12px', marginBottom: 4, cursor: 'pointer',
                  borderRadius: 10, border: 'none', textAlign: 'left', fontFamily: 'inherit',
                  background: active ? (darkMode ? 'rgba(99,102,241,.16)' : 'rgba(99,102,241,.10)') : 'transparent',
                  transition: 'background .15s',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,.05)' : '#EEF2F8'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? tab.tint : (darkMode ? 'rgba(255,255,255,.06)' : '#EEF2F8'), boxShadow: active ? `0 4px 12px ${tab.tint}55` : 'none' }}>
                  <Icon size={18} color={active ? '#fff' : textMuted} />
                </span>
                <span style={{ fontSize: 14.5, fontWeight: active ? 700 : 500, color: active ? (darkMode ? '#C7D2FE' : '#4338CA') : textColor, whiteSpace: 'nowrap' }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 右侧内容 */}
        <div style={{ flex: 1, minWidth: 0, background: contentBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: 20, overflow: 'auto' }}>
          {renderTab()}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const darkMode = useAppStore((s) => s.darkMode);
  const borderColor = darkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
  return (
    <div style={{ background: 'var(--color-surface, #fff)', border: `1px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${borderColor}` }}>
        <span style={{ color: 'var(--pri)' }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{title}</span>
      </div>
      <div style={{ padding: '4px 16px' }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ title, desc, extra }: { title: string; desc: string; extra: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ flex: 1, marginRight: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{desc}</div>
      </div>
      {extra}
    </div>
  );
}

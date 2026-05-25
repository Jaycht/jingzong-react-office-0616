import { useMemo, useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, Database, Settings, ShieldCheck, Menu, User, KeyRound, LogOut, Search, Moon, Sun } from 'lucide-react';
import { Modal, Switch } from "antd";
import { useAppStore } from "../store/appStore"
import { DEPARTMENTS, PLATFORM_NAV } from '../moduleConfig';
import { useCustomModules } from '../customModules';

interface Props {
  onOpenProfile: () => void;
  onOpenPassword: () => void;
}

export default function Sidebar({ onOpenProfile, onOpenPassword }: Props) {
    const currentPage = useAppStore((s) => s.currentPage);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const userName = useAppStore((s) => s.userName);
  const userRole = useAppStore((s) => s.userRole);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const lowPerfMode = useAppStore((s) => s.lowPerfMode);
  const toggleLowPerfMode = useAppStore((s) => s.toggleLowPerfMode);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const { customModules } = useCustomModules();
  const [expanded, setExpanded] = useState<string | null>('office');

  // 自动折叠逻辑：窗口 < 900px 时自动折叠
  const autoCollapse = useCallback(() => {
    return window.innerWidth < 900;
  }, []);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("jingzong.sidebar.collapsed");
      if (saved !== null) return saved === "true";
    } catch { /* ignore */ }
    return autoCollapse();
  });

  // 窗口变化时自动切换
  useEffect(() => {
    const onResize = () => {
      const shouldCollapse = autoCollapse();
      setCollapsed((prev) => {
        // 只有跨越阈值时才自动切换，不覆盖用户手动设置
        if (shouldCollapse && !prev) return true;
        if (!shouldCollapse && prev) {
          // 恢复用户上次的手动设置
          try {
            const saved = localStorage.getItem("jingzong.sidebar.collapsed");
            return saved === "true";
          } catch { return false; }
        }
        return prev;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [autoCollapse]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem("jingzong.sidebar.collapsed", String(next));
      return next;
    });
  }, []);

  const SIDEBAR_WIDTH_EXPANDED = 226;
  const SIDEBAR_WIDTH_COLLAPSED = 60;

  const departments = useMemo(() => {
    return DEPARTMENTS.map((dept) => ({
      ...dept,
      modules: [
        ...dept.modules,
        ...customModules.filter((module) => module.departmentId === dept.id),
      ],
    }));
  }, [customModules]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const renderPlatformItem = (item: typeof PLATFORM_NAV.top[number]) => {
    const Icon = item.icon;
    const active = currentPage === item.id;
    return (
      <motion.div
        key={item.id}
        whileHover={{ background: 'rgba(255,255,255,0.08)' }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setCurrentPage(item.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '13px 14px', cursor: 'pointer',
          borderLeft: '3px solid',
          borderLeftColor: active ? '#7DD3FC' : 'transparent',
          background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        }}
      >
        <Icon size={15} color={active ? '#fff' : 'rgba(255,255,255,0.72)'} style={{ flexShrink: 0 }} />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: 13, color: active ? '#fff' : 'rgba(255,255,255,0.72)', flex: 1, whiteSpace: 'nowrap' }}
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <motion.div
      animate={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: '#0F3A5F', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', flexShrink: 0, position: 'relative',
      }}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleCollapsed}
        style={{
          position: 'absolute', top: 14, right: -12, zIndex: 10,
          width: 24, height: 24, borderRadius: '50%', background: '#fff',
          border: '1px solid #D8E1EA', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,.16)',
        }}
      >
        <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
          <ChevronLeft size={13} color="#64748B" />
        </motion.div>
      </motion.button>

      {/* Search bar */}
      {!collapsed && (
        <div style={{ padding: '10px 10px 4px', position: 'relative' }}>
          <Search size={13} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 18, top: 18, zIndex: 1 }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索..."
            style={{
              width: '100%', height: 30, paddingLeft: 28, paddingRight: 8,
              borderRadius: 4, border: 'none', outline: 'none',
              background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12,
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      <div className="sb" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0' }}>
        {PLATFORM_NAV.top.map(renderPlatformItem)}

        {departments.map((dept) => {
          const Icon = dept.icon;
          const isExpanded = expanded === dept.id;
          const childActive = dept.modules.some((module) => currentPage === module.id);

          return (
            <div key={dept.id}>
              <motion.div
                whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.99 }}
                onClick={() => toggleExpand(dept.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '13px 14px', cursor: 'pointer',
                  borderLeft: '3px solid',
                  borderLeftColor: childActive || isExpanded ? '#7DD3FC' : 'transparent',
                  background: childActive || isExpanded ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
              >
                <Icon size={15} color={childActive || isExpanded ? '#fff' : 'rgba(255,255,255,0.72)'} style={{ flexShrink: 0 }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: 13, color: childActive || isExpanded ? '#fff' : 'rgba(255,255,255,0.72)', flex: 1, whiteSpace: 'nowrap' }}
                    >
                      {dept.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && (
                  <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} style={{ flexShrink: 0 }}>
                    <ChevronDown size={13} color="rgba(255,255,255,0.5)" />
                  </motion.div>
                )}
              </motion.div>

              <AnimatePresence>
                {isExpanded && !collapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    {dept.modules.map((module) => {
                      const active = currentPage === module.id;
                      return (
                        <motion.div
                          key={module.id}
                          whileHover={{ background: 'rgba(255,255,255,0.07)' }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setCurrentPage(module.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 9,
                            padding: '11px 14px 11px 42px',
                            cursor: 'pointer', position: 'relative',
                            background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                          }}
                        >
                          <div style={{ position: 'absolute', left: 24, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.08)' }} />
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#7DD3FC' : 'rgba(255,255,255,0.32)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, color: active ? '#fff' : 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {module.label}
                          </span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <NavGroup
          id="data-center"
          label="数据中心"
          icon={Database}
          expanded={expanded}
          collapsed={collapsed}
          currentPage={currentPage}
          items={PLATFORM_NAV.data}
          onToggle={toggleExpand}
          onNavigate={setCurrentPage}
        />
        <NavGroup
          id="system"
          label="系统管理"
          icon={Settings}
          expanded={expanded}
          collapsed={collapsed}
          currentPage={currentPage}
          items={PLATFORM_NAV.system}
          onToggle={toggleExpand}
          onNavigate={setCurrentPage}
        />
        {renderPlatformItem({ id: 'version', label: '版权信息', icon: ShieldCheck })}
      </div>

      {/* User section at bottom */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)', padding: collapsed ? '8px 0' : '8px 10px',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px 8px', color: '#fff' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{(userName || '用')[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName || '用户'}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{userRole}</div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: collapsed ? 'column' : 'row', gap: 2, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <UserAction icon={User} label="个人" collapsed={collapsed} onClick={onOpenProfile} />
          <UserAction icon={KeyRound} label="密码" collapsed={collapsed} onClick={onOpenPassword} />
          {!collapsed && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.5)' }} onClick={toggleDarkMode}>
                {darkMode ? <Sun size={12} /> : <Moon size={12} />}
                <span>{darkMode ? '浅色' : '深色'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.5)' }} onClick={toggleLowPerfMode}>
                <span>{lowPerfMode ? '⚡' : '🐢'}</span>
                <span>{lowPerfMode ? '高性能' : '低性能'}</span>
              </div>
            </>
          )}
        </div>
        <div style={{ padding: collapsed ? '4px 0' : '2px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          onClick={() => {
            Modal.confirm({
              title: '确认退出登录？',
              content: '退出后需要重新登录。',
              okText: '退出',
              cancelText: '取消',
              onOk: () => {
                try {
                  const raw = localStorage.getItem("jingzong.login.v1");
                  if (raw) { const saved = JSON.parse(raw); saved.autoLogin = false; localStorage.setItem("jingzong.login.v1", JSON.stringify(saved)); }
                } catch {}
                useAppStore.getState().setView("login");
                useAppStore.getState().showToast("已退出登录", "info");
              },
            });
          }}
        >
          <LogOut size={12} />
          {!collapsed && <span>退出登录</span>}
        </div>
      </div>
    </motion.div>
  );
}

function UserAction({ icon: Icon, label, collapsed, onClick }: { icon: any; label: string; collapsed: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 4, padding: collapsed ? '6px 0' : '4px 6px', borderRadius: 4,
        cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 11,
        flex: collapsed ? 0 : 1,
      }}
    >
      <Icon size={12} />
      {!collapsed && <span>{label}</span>}
    </div>
  );
}

interface NavGroupProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  expanded: string | null;
  collapsed: boolean;
  currentPage: string;
  items: Array<{ id: string; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }>;
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
}

function NavGroup({ id, label, icon: Icon, expanded, collapsed, currentPage, items, onToggle, onNavigate }: NavGroupProps) {
  const isExpanded = expanded === id;
  const childActive = items.some((item) => currentPage === item.id);

  return (
    <div>
      <motion.div
        whileHover={{ background: 'rgba(255,255,255,0.08)' }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onToggle(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '13px 14px', cursor: 'pointer',
          borderLeft: '3px solid',
          borderLeftColor: childActive || isExpanded ? '#7DD3FC' : 'transparent',
          background: childActive || isExpanded ? 'rgba(255,255,255,0.1)' : 'transparent',
        }}
      >
        <Icon size={15} color={childActive || isExpanded ? '#fff' : 'rgba(255,255,255,0.72)'} style={{ flexShrink: 0 }} />
        {!collapsed && <span style={{ fontSize: 13, color: childActive || isExpanded ? '#fff' : 'rgba(255,255,255,0.72)', flex: 1, whiteSpace: 'nowrap' }}>{label}</span>}
        {!collapsed && (
          <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} style={{ flexShrink: 0 }}>
            <ChevronDown size={13} color="rgba(255,255,255,0.5)" />
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {isExpanded && !collapsed && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            {items.map((item) => {
              const active = currentPage === item.id;
              const ChildIcon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  whileHover={{ background: 'rgba(255,255,255,0.07)' }}
                  onClick={() => onNavigate(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px 11px 42px', cursor: 'pointer', background: active ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                >
                  <ChildIcon size={13} color={active ? '#fff' : 'rgba(255,255,255,0.6)'} />
                  <span style={{ fontSize: 12.5, color: active ? '#fff' : 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>{item.label}</span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

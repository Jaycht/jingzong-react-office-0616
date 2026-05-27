import { useMemo, useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, Database, ShieldCheck, User, KeyRound, LogOut, Search, Moon, Sun } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore"
import { DEPARTMENTS, PLATFORM_NAV } from '../moduleConfig';
import { useCustomModules } from '../customModules';
import { APP_VERSION } from '../version';

interface Props {
  onOpenProfile: () => void;
  onOpenPassword: () => void;
}

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}>;

export default function Sidebar({ onOpenProfile, onOpenPassword }: Props) {
  const navigate = useNavigate();
  const currentPage = useAppStore((s) => s.currentPage);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const userName = useAppStore((s) => s.userName);
  const userRole = useAppStore((s) => s.userRole);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const lowPerfMode = useAppStore((s) => s.lowPerfMode);
  const toggleLowPerfMode = useAppStore((s) => s.toggleLowPerfMode);
  const customAvatar = (() => { try { return localStorage.getItem("jingzong.avatar"); } catch { return null; } })();
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const { customModules } = useCustomModules();
  const [expanded, setExpanded] = useState<string | null>('office');

  const autoCollapse = useCallback(() => window.innerWidth < 900, []);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("jingzong.sidebar.collapsed");
      if (saved !== null) return saved === "true";
    } catch { /* ignore */ }
    return autoCollapse();
  });

  useEffect(() => {
    const onResize = () => {
      const shouldCollapse = autoCollapse();
      setCollapsed((prev) => {
        if (shouldCollapse && !prev) return true;
        if (!shouldCollapse && prev) {
          try { const saved = localStorage.getItem("jingzong.sidebar.collapsed"); return saved === "true"; } catch { return false; }
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

  const toggleExpand = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  const handleLogout = () => {
    try {
      localStorage.removeItem("jingzong.login.v1");
    } catch {
      // Continue even if storage cleanup fails.
    }
    useAppStore.getState().setUser("", "");
    navigate("/login");
    useAppStore.getState().showToast("已退出登录", "info");
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
          padding: '10px 14px', cursor: 'pointer',
          borderLeft: '3px solid',
          borderLeftColor: active ? '#7DD3FC' : 'transparent',
          background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        }}
      >
        <Icon size={15} color={active ? '#fff' : 'rgba(255,255,255,0.72)'} style={{ flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ fontSize: 13, color: active ? '#fff' : 'rgba(255,255,255,0.72)', flex: 1, whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        )}
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
      }}>
      {/* Electron 无边框窗口拖拽区域 */}
      {/* @ts-expect-error WebkitAppRegion is Electron-only CSS property */}
      <div style={{ WebkitAppRegion: 'drag' as any, height: 30, flexShrink: 0 }} />

      {/* 折叠按钮 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleCollapsed}
        style={{
          position: 'absolute', top: 32, right: -12, zIndex: 10,
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

      {/* 搜索栏 */}
      {!collapsed && (
        <div style={{ padding: '4px 10px 2px', position: 'relative' }}>
          <Search size={13} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 18, top: 12, zIndex: 1 }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索..."
            style={{
              width: '100%', height: 28, paddingLeft: 28, paddingRight: 8,
              borderRadius: 4, border: 'none', outline: 'none',
              background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12,
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* 用户信息区域 */}
      {!collapsed && (
        <div style={{ padding: "14px 14px 8px" }}>
          {/* 第1行：头像 + 名称 + 退出 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {customAvatar ? (
              <img src={customAvatar} alt="avatar" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#4B9EFF,#2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}>
                {(userName || "用")[0]}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {userName || "用户"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                {userRole || "普通用户"}
              </div>
            </div>
            <ActionBtn icon={LogOut} label="退出" onClick={handleLogout} />
          </div>
          {/* 第2行：个人信息 + 修改密码 */}
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            <ActionBtn icon={User} label="个人信息" onClick={onOpenProfile} />
            <ActionBtn icon={KeyRound} label="修改密码" onClick={onOpenPassword} />
          </div>
          {/* 第3行：深色模式 + 性能模式 */}
          <div style={{ display: "flex", gap: 4 }}>
            <ActionBtn icon={darkMode ? Sun : Moon} label={darkMode ? "浅色模式" : "深色模式"} onClick={toggleDarkMode} />
            <ActionBtn icon={() => <span style={{fontSize:13}}>{lowPerfMode ? "⚡" : "🐢"}</span>} label={lowPerfMode ? "高性能" : "低性能"} onClick={toggleLowPerfMode} />
          </div>
        </div>
      )}
      {/* 折叠状态用户工具栏 */}
      {collapsed && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0 8px", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {customAvatar ? (
              <img src={customAvatar} alt="avatar" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#4B9EFF,#2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                {(userName || "用")[0]}
              </div>
            )}
          <ToolbarIcon icon={User} title="个人信息" onClick={onOpenProfile} />
          <ToolbarIcon icon={KeyRound} title="修改密码" onClick={onOpenPassword} />
          <ToolbarIcon icon={darkMode ? Sun : Moon} title={darkMode ? "浅色" : "深色"} onClick={toggleDarkMode} />
          <ToolbarIcon icon={() => <span style={{fontSize:11}}>{lowPerfMode ? "⚡" : "🐢"}</span>} title={lowPerfMode ? "高性能" : "低性能"} onClick={toggleLowPerfMode} />
          <ToolbarIcon icon={LogOut} title="退出" onClick={handleLogout} />
        </div>
      )}
      {/* 分隔线 */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0 14px" }} />

      {/* 侧边栏主导航区域 */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 2 }}>
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
                  padding: '10px 14px', cursor: 'pointer',
                  borderLeft: '3px solid',
                  borderLeftColor: childActive || isExpanded ? '#7DD3FC' : 'transparent',
                  background: childActive || isExpanded ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
              >
                <Icon size={15} color={childActive || isExpanded ? '#fff' : 'rgba(255,255,255,0.72)'} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ fontSize: 13, color: childActive || isExpanded ? '#fff' : 'rgba(255,255,255,0.72)', flex: 1, whiteSpace: 'nowrap' }}>
                    {dept.label}
                  </span>
                )}
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
                            padding: '9px 14px 9px 42px',
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
        
        {/* 版权信息入口 */}
        {renderPlatformItem({ id: 'version', label: '版权信息', icon: ShieldCheck })}
      </div>

      {/* 底部版权 */}
      {!collapsed && (
        <div style={{
          padding: '4px 14px 8px', flexShrink: 0,
          fontSize: 10, color: 'rgba(255,255,255,0.25)',
          textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)',
          fontFamily: "'JetBrains Mono',monospace",
        }}>
          {APP_VERSION} &copy; 2026
        </div>
      )}
    </motion.div>
  );
}

/** 带文字标签的操作按钮 */
function ActionBtn({ icon: Icon, label, onClick }: { icon: IconComponent; label: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
        color: 'rgba(255,255,255,0.55)', fontSize: 11,
        whiteSpace: 'nowrap', transition: 'all .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
    >
      <Icon size={14} /><span>{label}</span>
    </div>
  );
}

/** 紧凑工具栏图标按钮 */
function ToolbarIcon({ icon: Icon, title, onClick }: { icon: IconComponent; title: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'rgba(255,255,255,0.45)', flexShrink: 0,
        fontSize: 12,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
    >
      <Icon size={15} />
    </div>
  );
}

interface NavGroupProps {
  id: string;
  label: string;
  icon: IconComponent;
  expanded: string | null;
  collapsed: boolean;
  currentPage: string;
  items: Array<{ id: string; label: string; icon: IconComponent }>;
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
          padding: '10px 14px', cursor: 'pointer',
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
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px 9px 42px', cursor: 'pointer', background: active ? 'rgba(255,255,255,0.1)' : 'transparent' }}
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

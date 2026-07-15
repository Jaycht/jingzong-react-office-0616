import { useMemo, useState, useEffect, useCallback } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronLeft, Settings, User, LogOut, Plus,
  Sun, Moon, Gauge,
} from "lucide-react";
import { Modal } from "antd";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { DEPARTMENTS, PLATFORM_NAV } from "../moduleConfig";
import { useCustomModules } from "../customModules";
import { APP_VERSION } from "../version";
import { BRAND } from "../constants/theme";

interface Props {
  onOpenProfile: () => void;
}

type IconComponent = React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;

export default function Sidebar({ onOpenProfile }: Props) {
  const navigate = useNavigate();
  const currentPage = useAppStore((s) => s.currentPage);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const userName = useAppStore((s) => s.userName);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const lowPerfMode = useAppStore((s) => s.lowPerfMode);
  const toggleLowPerfMode = useAppStore((s) => s.toggleLowPerfMode);
  const customAvatar = (() => { try { return localStorage.getItem("jingzong.avatar"); } catch { return null; } })();
  const avatarSrc = customAvatar || "/avatar-default.jpg";
  const { customModules } = useCustomModules();

  const SIDEBAR_WIDTH_EXPANDED = 268;
  const SIDEBAR_WIDTH_COLLAPSED = 76;

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
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [autoCollapse]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem("jingzong.sidebar.collapsed", String(next));
      return next;
    });
  }, []);

  // 业务模块分组（部门 + 自定义模块）
  const departments = useMemo(() => {
    return DEPARTMENTS.map((dept) => ({
      ...dept,
      modules: [
        ...dept.modules,
        ...customModules.filter((module) => module.departmentId === dept.id),
      ],
    }));
  }, [customModules]);

  const OVERVIEW = PLATFORM_NAV.top;
  const SYSTEM: { id: string; label: string; icon: IconComponent }[] = [
    { id: "systemSettings", label: "系统设置", icon: Settings },
  ];

  // 当前激活模块所属部门，自动展开
  const activeDeptId = useMemo(() => {
    const all = departments.flatMap((d) => d.modules.map((m) => ({ id: d.id, mid: m.id })));
    return all.find((x) => x.mid === currentPage)?.id || null;
  }, [departments, currentPage]);

  const [expanded, setExpanded] = useState<string | null>(activeDeptId || "office");
  useEffect(() => { if (activeDeptId) setExpanded(activeDeptId); }, [activeDeptId]);

  const toggleExpand = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  const isElectron = typeof window !== "undefined" && window.electronAPI?.isElectron;

  const handleLogout = () => {
    Modal.confirm({
      title: "确认退出登录？",
      content: "退出后需要重新登录。",
      okText: "退出",
      cancelText: "取消",
      onOk: () => {
        try {
          const raw = localStorage.getItem("jingzong.login.v1");
          if (raw) {
            const saved = JSON.parse(raw);
            saved.autoLogin = false;
            localStorage.setItem("jingzong.login.v1", JSON.stringify(saved));
          }
        } catch { /* ignore */ }
        useAppStore.getState().setUser("", "");
        if (isElectron) window.electronAPI?.resizeToLogin();
        navigate("/login");
        useAppStore.getState().showToast("已退出登录", "info");
      },
    });
  };

  // 主题色板
  const surface = darkMode ? "#11161d" : "#ffffff";
  const surfaceSoft = darkMode ? "rgba(255,255,255,0.04)" : "#F8FAFC";
  const borderColor = darkMode ? "rgba(255,255,255,0.08)" : "#EAEFF5";
  const textColor = darkMode ? "#E6EAF2" : "#1F2937";
  const textMuted = darkMode ? "#8A94A6" : "#6B7280";
  const hoverBg = darkMode ? "rgba(255,255,255,0.06)" : "#F1F5F9";
  const pillBg = darkMode ? "rgba(37,99,235,0.18)" : "rgba(37,99,235,0.10)";

  // 激活指示（共享 layoutId，自动在各级导航间滑动）
  const ActivePill = () => (
    <motion.span
      layoutId="nav-active"
      transition={{ type: "spring", stiffness: 500, damping: 38 }}
      style={{
        position: "absolute", inset: 0, borderRadius: 12, background: pillBg,
        pointerEvents: "none",
      }}
    />
  );

  // 图标块：大厂仪表盘风格的圆角彩色图标块，比裸线图标更醒目、不简陋
  const IconTile = ({ Icon, active }: { Icon: IconComponent; active: boolean }) => (
    <span style={{
      width: 38, height: 38, borderRadius: 11, flexShrink: 0, position: "relative", zIndex: 1,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: active ? BRAND.primary : (darkMode ? "rgba(255,255,255,0.05)" : "#EEF2F8"),
      boxShadow: active
        ? "0 6px 16px rgba(37,99,235,.35)"
        : "inset 0 0 0 1px rgba(37,99,235,.07)",
      transition: "background .18s, box-shadow .18s",
    }}>
      <Icon size={20} color={active ? "#fff" : textMuted} />
    </span>
  );

  const renderNavItem = (
    item: { id: string; label: string; icon: IconComponent },
    indent = false
  ) => {
    const Icon = item.icon;
    const active = currentPage === item.id;
    return (
      <motion.div
        key={item.id}
        role="button"
        tabIndex={0}
        aria-current={active ? "page" : undefined}
        whileTap={{ scale: 0.98 }}
        onClick={() => setCurrentPage(item.id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCurrentPage(item.id); } }}
        style={{
          position: "relative", display: "flex", alignItems: "center", gap: 12,
          padding: indent ? "10px 12px 10px 44px" : "9px 12px", cursor: "pointer",
          outline: "none", borderRadius: 12, overflow: "hidden",
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = hoverBg; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
      >
        {active && <ActivePill />}
        {indent && (
          <span style={{ position: "absolute", left: 26, top: 0, bottom: 0, width: 1, background: borderColor }} />
        )}
        <IconTile Icon={Icon} active={active} />
        {!collapsed && (
          <span style={{ fontSize: 15, color: active ? BRAND.primary : textColor, fontWeight: active ? 700 : 500, flex: 1, whiteSpace: "nowrap", position: "relative", zIndex: 1 }}>
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
        background: surface,
        display: "flex", flexDirection: "column", overflow: "visible", flexShrink: 0,
        position: "relative",
        borderRight: `1px solid ${borderColor}`,
        boxShadow: darkMode
          ? "1px 0 10px rgba(0,0,0,.45)"
          : "1px 0 14px rgba(15,23,42,.05)",
      }}
    >
      {/* 左侧渐变装饰条 */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${BRAND.primaryLight}, ${BRAND.primaryDark})`, opacity: 0.9 }} />

      {/* Electron 拖拽区 */}
      <div style={{ WebkitAppRegion: "drag", height: 30, flexShrink: 0 }} />

      {/* 折叠按钮 */}
      <button
        type="button"
        onClick={toggleCollapsed}
        style={{
          position: "absolute", top: 32, right: -13, zIndex: 20,
          width: 26, height: 26, borderRadius: "50%",
          background: surface, border: `1px solid ${borderColor}`, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,.5)" : "0 2px 8px rgba(15,23,42,.12)",
          color: textMuted,
        }}
      >
        <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
          <ChevronLeft size={13} />
        </motion.div>
      </button>

      {/* 品牌头 */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: collapsed ? "4px 0 4px 19px" : "4px 16px 12px" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${BRAND.primaryLight}, ${BRAND.primaryDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0, boxShadow: "0 4px 12px rgba(37,99,235,.35)" }}>
          经
        </div>
        {!collapsed && (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: textColor, letterSpacing: "-0.01em" }}>经侦工作记录</div>
            <div style={{ fontSize: 10.5, color: textMuted, letterSpacing: "0.06em" }}>ECONOMIC INVESTIGATION</div>
          </div>
        )}
      </div>

      {/* 用户信息卡 */}
      {!collapsed ? (
        <div
          style={{
            margin: "0 12px 10px", padding: 12, borderRadius: 12,
            background: surfaceSoft, border: `1px solid ${borderColor}`,
            textAlign: "center",
          }}
        >
          <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
            <img
              src={avatarSrc}
              alt="avatar"
              onClick={onOpenProfile}
              style={{
                width: 64, height: 64, borderRadius: "50%", objectFit: "cover",
                cursor: "pointer", border: "2px solid #fff",
                boxShadow: darkMode
                  ? "0 6px 18px rgba(0,0,0,.4)"
                  : "0 6px 18px rgba(15,23,42,.15)",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 16, fontWeight: 700, color: textColor,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {userName || "用户"}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "center" }}>
            <MiniBtn icon={User} label="资料" onClick={onOpenProfile} active />
            <MiniBtn icon={darkMode ? Sun : Moon} label={darkMode ? "浅色" : "深色"} onClick={toggleDarkMode} />
            <MiniBtn icon={LogOut} label="退出" onClick={handleLogout} danger />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0 10px", borderBottom: `1px solid ${borderColor}` }}>
          <img
            src={avatarSrc}
            alt="avatar"
            onClick={onOpenProfile}
            style={{
              width: 42, height: 42, borderRadius: "50%", objectFit: "cover",
              cursor: "pointer", border: "2px solid #fff",
              boxShadow: darkMode ? "0 3px 10px rgba(0,0,0,.4)" : "0 3px 10px rgba(15,23,42,.15)",
            }}
          />
          <ToolbarIcon icon={darkMode ? Sun : Moon} title={darkMode ? "浅色模式" : "深色模式"} onClick={toggleDarkMode} />
          <ToolbarIcon icon={Gauge} title={lowPerfMode ? "高性能模式" : "低性能模式"} onClick={toggleLowPerfMode} />
          <ToolbarIcon icon={LogOut} title="退出登录" onClick={handleLogout} />
        </div>
      )}

      {/* 导航区 */}
      <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 12px 12px" }}>
        <SectionLabel text="概览" collapsed={collapsed} />
        {OVERVIEW.map((item) => renderNavItem(item))}

        <SectionLabel text="业务模块" collapsed={collapsed} />
        {departments.map((dept) => {
          const Icon = dept.icon;
          const isExpanded = expanded === dept.id;
          const childActive = dept.modules.some((m) => currentPage === m.id);
          const active = childActive;
          return (
            <div key={dept.id}>
              <motion.div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleExpand(dept.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(dept.id); } }}
                style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", cursor: "pointer", outline: "none", borderRadius: 12, overflow: "hidden" }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {active && <ActivePill />}
                <IconTile Icon={Icon} active={active} />
                {!collapsed && (
                  <span style={{ fontSize: 15, color: active ? BRAND.primary : textColor, fontWeight: active ? 700 : 500, flex: 1, whiteSpace: "nowrap", position: "relative", zIndex: 1 }}>
                    {dept.label}
                  </span>
                )}
                {!collapsed && (
                  <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} style={{ flexShrink: 0, position: "relative", zIndex: 1 }}>
                    <ChevronDown size={15} color={textMuted} />
                  </motion.div>
                )}
              </motion.div>
              <AnimatePresence>
                {isExpanded && !collapsed && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>
                    {dept.modules.map((m) => renderNavItem({ id: m.id, label: m.label, icon: m.icon ?? dept.icon }, true))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <SectionLabel text="系统" collapsed={collapsed} />
        {SYSTEM.map((item) => renderNavItem(item))}
      </div>

      {/* 底部：新建 + 版本 */}
      {!collapsed && (
        <div style={{ padding: "10px 12px 12px", borderTop: `1px solid ${borderColor}` }}>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 6px 18px rgba(37,99,235,.32)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => useAppStore.getState().openModal("newRecord")}
            style={{
              width: "100%", height: 46, borderRadius: 12, border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryLight})`, color: "#fff",
              fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 7, boxShadow: "0 3px 12px rgba(37,99,235,.25)",
            }}
          >
            <Plus size={18} /> 新建记录
          </motion.button>
          <div style={{ marginTop: 9, textAlign: "center", fontSize: 11, color: textMuted, fontFamily: "'JetBrains Mono',monospace" }}>
            {APP_VERSION} &copy; 2026
          </div>
        </div>
      )}
    </motion.div>
  );
}

/** 概览/系统/业务 分组标题 */
function SectionLabel({ text, collapsed }: { text: string; collapsed: boolean }) {
  const darkMode = useAppStore((s) => s.darkMode);
  if (collapsed) {
    return <div style={{ height: 1, background: darkMode ? "rgba(255,255,255,.08)" : "#EAEFF5", margin: "10px 8px" }} />;
  }
  return (
    <div style={{ fontSize: 12.5, fontWeight: 800, color: darkMode ? "#7A8599" : "#94A0B0", letterSpacing: "0.08em", padding: "12px 14px 7px", textTransform: "uppercase" }}>
      {text}
    </div>
  );
}

/** 展开态用户信息卡内的小按钮 */
function MiniBtn({ icon: Icon, label, onClick, active, danger }: { icon: IconComponent; label: string; onClick: () => void; active?: boolean; danger?: boolean }) {
  const darkMode = useAppStore((s) => s.darkMode);
  return (
    <div
      onClick={onClick}
      title={label}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        padding: "8px 4px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
        color: danger ? "#DC2626" : active ? BRAND.primary : darkMode ? "#9AA4B2" : "#64748B",
        background: active ? (darkMode ? "rgba(37,99,235,.14)" : "rgba(37,99,235,.08)") : "transparent",
        transition: "background .15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? "rgba(220,38,38,.1)" : (darkMode ? "rgba(255,255,255,.06)" : "#EEF2F7"); }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? (darkMode ? "rgba(37,99,235,.14)" : "rgba(37,99,235,.08)") : "transparent"; }}
    >
      <Icon size={15} />
      <span>{label}</span>
    </div>
  );
}

/** 折叠态工具栏图标 */
function ToolbarIcon({ icon: Icon, title, onClick }: { icon: IconComponent; title: string; onClick: () => void }) {
  const darkMode = useAppStore((s) => s.darkMode);
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: darkMode ? "#C2C9D6" : "#6B7280", flexShrink: 0, fontSize: 12,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "rgba(255,255,255,.08)" : "#EEF2F7"; e.currentTarget.style.color = darkMode ? "#fff" : "#111827"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = darkMode ? "#C2C9D6" : "#6B7280"; }}
    >
      <Icon size={17} />
    </div>
  );
}

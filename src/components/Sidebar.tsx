import { useMemo, useState } from 'react';
import type React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, Database, Settings, ShieldCheck } from 'lucide-react';
import { useAppStore } from "../store/appStore"
import { DEPARTMENTS, PLATFORM_NAV } from '../moduleConfig';
import { useCustomModules } from '../customModules';

export default function Sidebar() {
    const currentPage = useAppStore((s) => s.currentPage);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const { customModules } = useCustomModules();
  const [expanded, setExpanded] = useState<string | null>('office');
  const [collapsed, setCollapsed] = useState(false);

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
      animate={{ width: collapsed ? 60 : 226 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: '#0F3A5F', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', flexShrink: 0, position: 'relative',
      }}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setCollapsed((value) => !value)}
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

      <div className="sb" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0 40px' }}>
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
    </motion.div>
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

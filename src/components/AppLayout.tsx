import { lazy, Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "antd";
import { useLocation } from "react-router-dom";
import { useAppStore } from "../store/appStore"
import Sidebar from "./Sidebar";
import ProfileModal from "./ProfileModal";
import PasswordModal from "./PasswordModal";
import DrawerNewRecord from "./DrawerNewRecord";
import ModalNewUser from "./ModalNewUser";
import Drawer from "./Drawer";
import Breadcrumb from "./Breadcrumb";
import ErrorBoundary from "./ErrorBoundary";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const Statistics = lazy(() => import("../pages/Statistics"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const OperationLog = lazy(() => import("../pages/OperationLog"));
const ImportExport = lazy(() => import("../pages/ImportExport"));
const Backup = lazy(() => import("../pages/Backup"));
const Version = lazy(() => import("../pages/Version"));
const Attachments = lazy(() => import("../pages/Attachments"));
const PlaceholderPage = lazy(() => import("../pages/PlaceholderPage"));
const ModulePage = lazy(() => import("../pages/ModulePage"));

const CaseTimeline = lazy(() => import("../pages/CaseTimeline"));

const PAGES: Record<string, React.FC> = {
  dashboard: Dashboard, statistics: Statistics,
  settings: SettingsPage, operationLog: OperationLog,
  importExport: ImportExport, backup: Backup, version: Version,
  attachments: Attachments,
  timeline: CaseTimeline,
  interview: PlaceholderPage, meeting: PlaceholderPage, victim: PlaceholderPage,
  clue: PlaceholderPage, fund: PlaceholderPage, daily: PlaceholderPage,
  party: PlaceholderPage, report: PlaceholderPage, userSettings: PlaceholderPage,
  'legal-assessment': PlaceholderPage,
};

const isElectron = typeof window !== "undefined" && window.electronAPI?.isElectron;

const winControls = {
  min: () => (window as any).electronAPI?.minimize(),
  max: () => (window as any).electronAPI?.maximize(),
  close: () => {
    Modal.confirm({
      title: '确认退出？',
      content: '确定要关闭程序吗？未保存的数据将会丢失。',
      okText: '退出',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        if ((window as any).electronAPI?.close) {
          (window as any).electronAPI.close();
        } else {
          try { window.close(); } catch {}
        }
      },
    });
  },
};

export default function AppLayout() {
    const modalId = useAppStore((s) => s.modalId);
  const closeModal = useAppStore((s) => s.closeModal);
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const closeDrawer = useAppStore((s) => s.closeDrawer);
  const darkMode = useAppStore((s) => s.darkMode);
  const location = useLocation();
  const currentPage = useAppStore((s) => s.currentPage);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);

  useEffect(() => {
    const path = location.pathname.replace("/app/", "") || "dashboard";
    setCurrentPage(path);
  }, [location.pathname, setCurrentPage]);
  const editRecord = useAppStore((s) => s.editRecord);
  const setEditRecord = useAppStore((s) => s.setEditRecord);

  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const Page = PAGES[currentPage] || ModulePage;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: darkMode ? 'var(--stitch-surface-container-low)' : '#F0F2F5' }}>
      {/* Electron 无边框窗口拖拽条 + 窗口控制 */}
      {isElectron && (
        <div
          style={{
            height: 28, flexShrink: 0, display: 'flex', alignItems: 'center',
            WebkitAppRegion: 'drag' as any,
            background: darkMode ? '#0a1a2e' : '#F0F2F5',
            paddingLeft: 12,
            borderBottom: darkMode ? 'none' : '1px solid #E5E7EB',
          }}
        >
          <span style={{ fontSize: 11, color: darkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF', fontFamily: "'JetBrains Mono',monospace", flex: 1 }}>
            经侦大队工作记录管理系统
          </span>
          {/* 窗口控制按钮（不可拖拽） */}
          <div style={{ WebkitAppRegion: 'no-drag' as any, display: 'flex', gap: 2, paddingRight: 4 }}>
            <div onClick={winControls.min} title="最小化" style={{ width: 32, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9CA3AF', fontSize: 12 }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>─</div>
            <div onClick={winControls.max} title="最大化" style={{ width: 32, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9CA3AF', fontSize: 11 }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>□</div>
            <div onClick={winControls.close} title="关闭" style={{ width: 32, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 13 }} onMouseEnter={e => { e.currentTarget.style.background = '#E81123'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>×</div>
          </div>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <Sidebar
        onOpenProfile={() => setProfileOpen(true)}
        onOpenPassword={() => setPasswordOpen(true)}
      />
      <div className="content-area" style={{
        flex: 1, overflow: 'auto', padding: '16px 20px',
        background: darkMode ? 'var(--stitch-surface-container-low)' : '#F0F2F5',
      }}>
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Breadcrumb />
            <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>加载中...</div>}>
              <Page />
            </Suspense>
          </motion.div>
      </div>
      </div>

      <AnimatePresence>
        {modalId === 'newRecord' && (
          <ErrorBoundary>
          <DrawerNewRecord
            key={editRecord?.id || 'new'}
            onClose={() => { closeModal(); setEditRecord(null); }}
            editRecord={editRecord}
          />
          </ErrorBoundary>
        )}
        {modalId === 'newUser' && <ErrorBoundary><ModalNewUser onClose={closeModal} /></ErrorBoundary>}
      </AnimatePresence>

      <AnimatePresence>
        {drawerOpen && <Drawer onClose={closeDrawer} />}
      </AnimatePresence>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

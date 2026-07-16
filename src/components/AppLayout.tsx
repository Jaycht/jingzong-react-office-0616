import { lazy, Suspense, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Modal } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore"
import Sidebar from "./Sidebar";
import PageSkeleton from "./PageSkeleton";
import ProfileModal from "./ProfileModal";
import DrawerNewRecord from "./DrawerNewRecord";
import ModalNewUser from "./ModalNewUser";
import Drawer from "./Drawer";
import Breadcrumb from "./Breadcrumb";
import ErrorBoundary from "./ErrorBoundary";
import CommandPalette from "./CommandPalette";
import NotificationPanel from "./NotificationPanel";
import GlobalSearch from "./GlobalSearch";
import { Command } from "lucide-react";
import { useReminderService } from "../hooks/useReminderService";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const OperationLog = lazy(() => import("../pages/OperationLog"));
const ImportExport = lazy(() => import("../pages/ImportExport"));
const Backup = lazy(() => import("../pages/Backup"));
const Version = lazy(() => import("../pages/Version"));
const Attachments = lazy(() => import("../pages/Attachments"));
const PlaceholderPage = lazy(() => import("../pages/PlaceholderPage"));
const ModulePage = lazy(() => import("../pages/ModulePage"));

const CaseTimeline = lazy(() => import("../pages/CaseTimeline"));
const CaseGraph = lazy(() => import("../pages/CaseGraph"));
const DailyNotes = lazy(() => import("../pages/DailyNotes"));
const SystemSettings = lazy(() => import("../pages/SystemSettings"));

const PAGES: Record<string, React.FC> = {
  dashboard: Dashboard,
  settings: SettingsPage, operationLog: OperationLog,
  importExport: ImportExport, backup: Backup, version: Version,
  attachments: Attachments,
  timeline: CaseTimeline,
  graph: CaseGraph,
  dailyNotes: DailyNotes,
  systemSettings: SystemSettings,
  interview: PlaceholderPage, meeting: PlaceholderPage, victim: PlaceholderPage,
  clue: PlaceholderPage, fund: PlaceholderPage, daily: PlaceholderPage,
  party: PlaceholderPage, report: PlaceholderPage, userSettings: PlaceholderPage,
  'legal-assessment': PlaceholderPage,
};

const isElectron = typeof window !== "undefined" && window.electronAPI?.isElectron;

const winControls = {
  min: () => window.electronAPI?.minimize(),
  max: () => window.electronAPI?.maximize(),
  close: () => {
    Modal.confirm({
      title: '确认退出？',
      content: '确定要关闭程序吗？未保存的数据将会丢失。',
      okText: '退出',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        if (window.electronAPI?.close) {
          window.electronAPI.close();
        } else {
          try { window.close(); } catch {}
        }
      },
    });
  },
};

export default function AppLayout() {
  useReminderService();

  const modalId = useAppStore((s) => s.modalId);
  const closeModal = useAppStore((s) => s.closeModal);
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const closeDrawer = useAppStore((s) => s.closeDrawer);
  const darkMode = useAppStore((s) => s.darkMode);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = useAppStore((s) => s.currentPage);

  // 外部导航（浏览器前进/后退、书签、手动改地址、刷新直达）时，用 URL 单向回写 store。
  // 必须在「store→URL」同步之前声明，确保挂载时先以 URL 为准，避免被默认页覆盖。
  useEffect(() => {
    const applyFromUrl = () => {
      const hash = window.location.hash || "";
      const urlPage =
        hash.replace(/^#\/app\//, "").replace(/^#\/?/, "") || "dashboard";
      if (urlPage !== useAppStore.getState().currentPage) {
        useAppStore.getState().setCurrentPage(urlPage);
      }
    };
    applyFromUrl(); // 挂载即采纳 URL（刷新 / 书签直达）
    window.addEventListener("hashchange", applyFromUrl);
    return () => window.removeEventListener("hashchange", applyFromUrl);
  }, []);

  // 单向同步：store.currentPage 为唯一事实源，URL 仅作镜像（支持刷新与历史记录）。
  // 不再反向用 effect 把 URL 写回 store，避免「URL↔store」双向回环导致的
  // "Maximum update depth exceeded" 死循环（根因：两 effect 同拍触发、快照不一致）。
  useEffect(() => {
    const urlPage = location.pathname.replace("/app/", "") || "dashboard";
    if (urlPage !== currentPage) {
      navigate("/app/" + currentPage, { replace: true });
    }
  }, [currentPage, location.pathname, navigate]);

  // 持久化当前模块，供「启动行为=上次模块」恢复
  useEffect(() => {
    try { localStorage.setItem("jingzong.lastPage", currentPage); } catch { /* ignore */ }
  }, [currentPage]);

  // 启动行为：无 hash（全新打开）时，若设为「上次模块」则恢复
  useEffect(() => {
    const sb = useAppStore.getState().startupBehavior;
    if (sb === "last" && !window.location.hash) {
      const last = (() => { try { return localStorage.getItem("jingzong.lastPage"); } catch { return null; } })();
      if (last && last !== "dashboard") {
        useAppStore.getState().setCurrentPage(last);
      }
    }
  }, []);

  const editRecord = useAppStore((s) => s.editRecord);
  const setEditRecord = useAppStore((s) => s.setEditRecord);

  const [profileOpen, setProfileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const Page = PAGES[currentPage] || ModulePage;

  return (
    <div className="app-shell" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: darkMode ? 'var(--stitch-surface-container-low)' : '#F0F2F5' }}>
      {isElectron && (
        <div
          className="electron-titlebar"
          style={{
            height: 34, flexShrink: 0, display: 'flex', alignItems: 'center',
            WebkitAppRegion: 'drag',
            background: darkMode ? '#0a1a2e' : '#F0F2F5',
            paddingLeft: 14,
            borderBottom: darkMode ? 'none' : '1px solid #E5E7EB',
          }}
        >
          <span style={{ fontSize: 12, lineHeight: 1, color: darkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF', fontFamily: "'JetBrains Mono',monospace", flex: 1 }}>
            经侦大队工作记录管理系统
          </span>
          <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', gap: 2, paddingRight: 4 }}>
            <div onClick={winControls.min} title="最小化" style={{ width: 32, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9CA3AF', fontSize: 12 }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>─</div>
            <div onClick={winControls.max} title="最大化" style={{ width: 32, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9CA3AF', fontSize: 11 }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>□</div>
            <div onClick={winControls.close} title="关闭" style={{ width: 32, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9CA3AF', fontSize: 13 }} onMouseEnter={e => { e.currentTarget.style.background = '#E81123'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}>×</div>
          </div>
        </div>
      )}

      {/* ── 顶部常驻栏：全局检索（常驻所有页面）+ 命令面板入口 ── */}
      <div
        className="app-topbar"
        style={{
          position: 'relative', height: 'auto', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 16, padding: '10px 20px',
          background: darkMode ? '#0e1626' : '#fff',
          borderBottom: darkMode ? '1px solid rgba(163,201,255,0.1)' : '1px solid #E5E7EB',
        }}
      >
        <div style={{ width: '100%', maxWidth: 720 }}>
          <GlobalSearch />
        </div>
        <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="wb-hover-ghost"
            onClick={() => setCmdOpen(true)}
            title="打开命令面板（Ctrl / ⌘ + K）"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 36, padding: '0 12px', borderRadius: 10,
              border: darkMode ? '1px solid rgba(163,201,255,0.18)' : '1px solid #E5E7EB',
              background: 'transparent', color: darkMode ? '#c8ccd4' : '#4B5563',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Command size={15} />
            <span>命令面板</span>
            <kbd style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, border: darkMode ? '1px solid rgba(163,201,255,0.2)' : '1px solid #E5E7EB', color: darkMode ? '#8c919a' : '#9CA3AF' }}>⌘K</kbd>
          </button>
        </div>
      </div>

      <div className="app-main-row" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <Sidebar
        onOpenProfile={() => setProfileOpen(true)}
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
            <Suspense fallback={<PageSkeleton />}>
              <Page />
            </Suspense>
          </motion.div>
      </div>
      <NotificationPanel />
      </div>

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

      {drawerOpen && <Drawer onClose={closeDrawer} />}

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}

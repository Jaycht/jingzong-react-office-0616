import { lazy, Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dropdown, Modal, Switch } from "antd";
import { Search, Landmark, User, KeyRound, LogOut } from "lucide-react";
import { useAppStore } from "../store/appStore"
import Sidebar from "./Sidebar";
import ProfileModal from "./ProfileModal";
import PasswordModal from "./PasswordModal";
import DrawerNewRecord from "./DrawerNewRecord";
import ModalNewUser from "./ModalNewUser";
import Drawer from "./Drawer";
import Breadcrumb from "./Breadcrumb";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const CaseList = lazy(() => import("../pages/CaseList"));
const Statistics = lazy(() => import("../pages/Statistics"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const OperationLog = lazy(() => import("../pages/OperationLog"));
const ImportExport = lazy(() => import("../pages/ImportExport"));
const Backup = lazy(() => import("../pages/Backup"));
const Version = lazy(() => import("../pages/Version"));
const Attachments = lazy(() => import("../pages/Attachments"));
const PlaceholderPage = lazy(() => import("../pages/PlaceholderPage"));
const SquadCasePage = lazy(() => import("../pages/SquadCasePage"));
const ModulePage = lazy(() => import("../pages/ModulePage"));

const PAGES: Record<string, React.FC> = {
  dashboard: Dashboard, caseList: CaseList, statistics: Statistics,
  settings: SettingsPage, operationLog: OperationLog,
  importExport: ImportExport, backup: Backup, version: Version,
  attachments: Attachments,
  interview: PlaceholderPage, meeting: PlaceholderPage, victim: PlaceholderPage,
  clue: PlaceholderPage, fund: PlaceholderPage, daily: PlaceholderPage,
  party: PlaceholderPage, report: PlaceholderPage, userSettings: PlaceholderPage,
  'legal-assessment': PlaceholderPage,
  'squad-case': SquadCasePage,
};

export default function AppLayout() {
  // 底部时间实时更新
  useEffect(() => {
    const el = document.getElementById('footer-datetime');
    if (!el) return;
    function update() {
      const now = new Date();
      const days = ['周日','周一','周二','周三','周四','周五','周六'];
      el.textContent = now.getFullYear() + '-' +
        String(now.getMonth()+1).padStart(2,'0') + '-' +
        String(now.getDate()).padStart(2,'0') + ' ' +
        days[now.getDay()] + ' ' +
        String(now.getHours()).padStart(2,'0') + ':' +
        String(now.getMinutes()).padStart(2,'0') + ':' +
        String(now.getSeconds()).padStart(2,'0');
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
    const modalId = useAppStore((s) => s.modalId);
  const closeModal = useAppStore((s) => s.closeModal);
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const closeDrawer = useAppStore((s) => s.closeDrawer);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const currentPage = useAppStore((s) => s.currentPage);
  const userName = useAppStore((s) => s.userName);
  const userRole = useAppStore((s) => s.userRole);
  const editRecord = useAppStore((s) => s.editRecord);
  const setEditRecord = useAppStore((s) => s.setEditRecord);
  const logout = () => { useAppStore.getState().setView("login"); useAppStore.getState().showToast("已退出登录", "info"); }
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const Page = PAGES[currentPage] || ModulePage;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: darkMode ? 'var(--stitch-surface-container-low)' : '#F0F2F5' }}>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          height: 54, background: darkMode ? 'var(--stitch-primary-container)' : '#0F3A5F',
          display: 'flex', alignItems: 'center', padding: '0 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,.2)', flexShrink: 0, zIndex: 200,
          position: 'relative', gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', flexShrink: 0 }}>
          <Landmark size={22} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, whiteSpace: 'nowrap' }}>经侦大队工作记录管理系统</span>
        </div>

        <div style={{ flex: 1, maxWidth: 480, position: 'relative', margin: '0 24px' }}>
          <Search size={14} color="rgba(255,255,255,0.6)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索工作记录、案件、受害人..."
            style={{
              width: '100%', height: 34, paddingLeft: 36, paddingRight: 12,
              borderRadius: 6, border: 'none', outline: 'none',
              background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 13,
              fontFamily: 'inherit', transition: 'background .2s', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.background = 'rgba(255,255,255,0.28)')}
            onBlur={e => (e.target.style.background = 'rgba(255,255,255,0.18)')}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <Dropdown
            menu={{
              items: [
                { key: 'profile', icon: <User size={13} />, label: '个人信息' },
                { key: 'password', icon: <KeyRound size={13} />, label: '修改密码' },
                { type: 'divider' },
                { key: 'darkmode', icon: null, label: <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 12 }}>暗色模式<Switch size="small" checked={darkMode} /></span> },
                { type: 'divider' },
                { key: 'logout', icon: <LogOut size={13} />, label: '退出登录', danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'profile') setProfileOpen(true);
                else if (key === 'password') setPasswordOpen(true);
                else if (key === 'darkmode') toggleDarkMode();
                else if (key === 'logout') {
                  Modal.confirm({
                    title: '确认退出登录？',
                    content: '退出后需要重新登录。',
                    okText: '退出',
                    cancelText: '取消',
                    onOk: logout,
                  });
                }
              },
            }}
            placement="bottomRight"
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              padding: '4px 8px', borderRadius: 6,
              background: 'rgba(255,255,255,0.1)', color: '#fff',
            }}>
              <User size={15} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{userName || '用户'}</span>
              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)' }}>{userRole}</span>
            </div>
          </Dropdown>
        </div>
      </motion.div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <div className="content-area" style={{
          flex: 1, overflow: 'auto', padding: 20,
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
          <DrawerNewRecord
            onClose={() => { closeModal(); setEditRecord(null); }}
            editRecord={editRecord}
          />
        )}
        {modalId === 'newUser' && <ModalNewUser onClose={closeModal} />}
      </AnimatePresence>

      <AnimatePresence>
        {drawerOpen && <Drawer onClose={closeDrawer} />}
      </AnimatePresence>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      {/* 底部版权信息（无边框窗口用）*/}
      <div style={{
        height: 28, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: darkMode ? '#0D1117' : '#0F3A5F',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11, letterSpacing: 0.5,
        borderTop: darkMode ? '1px solid rgba(66,71,79,0.3)' : '1px solid rgba(255,255,255,0.08)',
        gap: 12,
        userSelect: 'none',
      }}>
        <span>© 2026 陈洪涛 — Economic Investigation Work Log Registration System</span>
        <span style={{ color: 'rgba(255,255,255,0.35)' }}>|</span>
        <span id="footer-datetime"></span>
      </div>
    </div>
  );
}






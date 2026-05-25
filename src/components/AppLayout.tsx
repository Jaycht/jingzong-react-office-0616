import { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    const modalId = useAppStore((s) => s.modalId);
  const closeModal = useAppStore((s) => s.closeModal);
  const drawerOpen = useAppStore((s) => s.drawerOpen);
  const closeDrawer = useAppStore((s) => s.closeDrawer);
  const darkMode = useAppStore((s) => s.darkMode);
  const currentPage = useAppStore((s) => s.currentPage);
  const editRecord = useAppStore((s) => s.editRecord);
  const setEditRecord = useAppStore((s) => s.setEditRecord);

  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const Page = PAGES[currentPage] || ModulePage;

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', background: darkMode ? 'var(--stitch-surface-container-low)' : '#F0F2F5' }}>
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
    </div>
  );
}

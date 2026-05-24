import { useState, useCallback, createContext, useContext } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from './components/Toaster';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AppLayout from './components/AppLayout';
import BigScreen from './pages/BigScreen';
import type { PageId, Toast, ToastType } from './types';
import type { MassRecord } from './store/massStore';

type AppView = 'login' | 'register' | 'app' | 'bigscreen';

interface AppContextType {
  showToast: (msg: string, type?: ToastType) => void;
  currentPage: PageId;
  setCurrentPage: (p: PageId) => void;
  userName: string;
  userRole: string;
  modalId: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;
  openDrawer: () => void;
  logout: () => void;
  openBigScreen: () => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
  editRecord: MassRecord | null;
  setEditRecord: (r: MassRecord | null) => void;

}

const AppContext = createContext<AppContextType | null>(null);
export const useApp = () => useContext(AppContext)!;

let toastId = 0;

export default function App() {
  const [view, setView] = useState<AppView>('login');
  const openBigScreen = useCallback(() => setView('bigscreen'), []);
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modalId, setModalId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<MassRecord | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = String(++toastId);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleLogin = useCallback(() => {
    setView('app');
    showToast('登录成功，欢迎回来，张明！', 'success');
  }, [showToast]);

  // handleRegister is used by RegisterPage onBack callback
  const _handleRegister = useCallback(() => {
    setView('login');
    showToast('注册成功！请等待管理员审核', 'success');
  }, [showToast]);

  const openModal = useCallback((id: string) => setModalId(id), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeModal = useCallback(() => setModalId(null), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleLogout = useCallback(() => {
    setView('login');
    showToast('已退出登录', 'info');
  }, [showToast]);

  const ctx: AppContextType = {
    showToast, currentPage, setCurrentPage, modalId,
    userName: '张明', userRole: '法制室 · 管理员',
    openModal, closeModal, openDrawer, logout: handleLogout, openBigScreen, toasts, removeToast,
    editRecord, setEditRecord,
  };

  return (
    <AppContext.Provider value={ctx}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#155A8A',
            colorInfo: '#155A8A',
            colorSuccess: '#138A63',
            colorWarning: '#D97706',
            colorError: '#DC2626',
            borderRadius: 8,
            fontFamily: '"Microsoft YaHei UI","PingFang SC","Noto Sans SC",sans-serif',
          },
          components: {
            Button: { borderRadius: 6 },
            Table: { headerBg: '#F6F8FB', headerColor: '#475569' },
            Tabs: { itemSelectedColor: '#155A8A', inkBarColor: '#155A8A' },
          },
        }}
      >
      <div style={{ fontFamily: '"Microsoft YaHei UI","PingFang SC","Noto Sans SC",sans-serif', minHeight: '100vh' }}>
        <AnimatePresence mode="wait">
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <LoginPage onLogin={handleLogin} onRegister={() => setView('register')} />
            </motion.div>
          )}
          {view === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <RegisterPage onBack={_handleRegister} />
            </motion.div>
          )}
          {view === 'app' && (
            <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <AppLayout modalId={modalId} closeModal={closeModal} drawerOpen={drawerOpen} closeDrawer={closeDrawer} />
            </motion.div>
          )}
          {view === 'bigscreen' && (
            <motion.div key="bigscreen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} style={{ width: '100vw', height: '100vh' }}>
              <BigScreen onBack={() => setView('app')} />
            </motion.div>
          )}
        </AnimatePresence>
        <Toaster toasts={toasts} removeToast={removeToast} />
      </div>
      </ConfigProvider>
    </AppContext.Provider>
  );
}

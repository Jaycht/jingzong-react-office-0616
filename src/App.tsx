import { ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "./components/Toaster";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import AppLayout from "./components/AppLayout";
import { useAppStore } from "./store/appStore";

// Electron 环境检测
declare global {
  interface Window {
    electronAPI?: {
      switchToMain: () => void;
      closeLogin: () => void;
      isElectron: boolean;
    };
  }
}

export default function App() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setUser = useAppStore((s) => s.setUser);
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);
  const darkMode = useAppStore((s) => s.darkMode);

  const isElectron = typeof window !== "undefined" && window.electronAPI?.isElectron;

  const handleLogin = (name: string, role: string) => {
    setUser(name, role);
    setView("app");
    // Electron 环境：关闭登录窗口，打开主窗口
    if (isElectron) {
      window.electronAPI!.switchToMain();
    }
  };

  const handleCloseLogin = () => {
    if (isElectron) {
      window.electronAPI!.closeLogin();
    }
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#155A8A",
          colorInfo: "#155A8A",
          colorSuccess: "#138A63",
          colorWarning: "#D97706",
          colorError: "#DC2626",
          borderRadius: 8,
        },
        components: {
          Button: { borderRadius: 6 },
          Table: { headerBg: "#F6F8FB", headerColor: "#475569" },
          Tabs: { itemSelectedColor: "#155A8A", inkBarColor: "#155A8A" },
        },
      }}
    >
      <div className={darkMode ? "theme-dark" : ""} style={{ minHeight: "100vh" }}>
        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.div key="login" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              {/* Electron 无边框窗口关闭按钮 */}
              {isElectron && (
                <div
                  onClick={handleCloseLogin}
                  style={{
                    position: "fixed", top: 12, right: 16, zIndex: 9999,
                    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 6, cursor: "pointer", color: "#64748B", fontSize: 16, fontWeight: 700,
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; }}
                  title="关闭"
                >
                  ✕
                </div>
              )}
              <LoginPage onLogin={handleLogin} onRegister={() => setView("register")} />
            </motion.div>
          )}
          {view === "register" && (
            <motion.div key="register" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <RegisterPage onBack={() => setView("login")} />
            </motion.div>
          )}
          {view === "app" && (
            <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <AppLayout />
            </motion.div>
          )}
        </AnimatePresence>
        <Toaster toasts={toasts} removeToast={removeToast} />
      </div>
    </ConfigProvider>
  );
}

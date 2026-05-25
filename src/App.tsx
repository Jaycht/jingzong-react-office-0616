import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Toaster } from "./components/Toaster";
import { LIGHT_THEME, DARK_THEME } from "./constants/theme";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import AppLayout from "./components/AppLayout";
import { useAppStore } from "./store/appStore";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";

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

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAppStore((s) => s.setUser);
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);
  const darkMode = useAppStore((s) => s.darkMode);
  const lowPerfMode = useAppStore((s) => s.lowPerfMode);

  const isElectron = typeof window !== "undefined" && window.electronAPI?.isElectron;
  const isLoginPage = location.pathname === "/login" || location.pathname === "/";

  const handleLogin = (name: string, role: string) => {
    setUser(name, role);
    // Electron: close login window, switch to main
    if (isElectron) {
      window.electronAPI!.switchToMain();
    }
    navigate("/app/dashboard", { replace: true });
  };

  const handleCloseLogin = () => {
    if (isElectron) {
      window.electronAPI!.closeLogin();
    }
  };

  return (
    <div className={(darkMode ? "theme-dark " : "") + (lowPerfMode ? "low-perf-mode" : "")} style={{ minHeight: "100vh" }}>
      <MotionConfig reducedMotion={lowPerfMode ? "always" : "never"}>
      <Routes>
          <Route path="/login" element={
            <motion.div key="login" {...(lowPerfMode ? { initial: false, animate: true, transition: { duration: 0 } } : { initial: { opacity: 0, x: -40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 40 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } })}>
              {isElectron && (
                <div
                  onClick={handleCloseLogin}
                  style={{ position: "fixed", top: 12, right: 16, zIndex: 9999, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, cursor: "pointer", color: "#64748B", fontSize: 16, fontWeight: 700, transition: "all .15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; }}
                  title="关闭"
                >✕</div>
              )}
              <LoginPage onLogin={handleLogin} onRegister={() => navigate("/register")} />
            </motion.div>
          } />
          <Route path="/register" element={
            <motion.div key="register" {...(lowPerfMode ? { initial: false, animate: true, transition: { duration: 0 } } : { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } })}>
              <RegisterPage onBack={() => navigate("/login")} />
            </motion.div>
          } />
          <Route path="/app/*" element={
            <motion.div key="app" {...(lowPerfMode ? { initial: false, animate: true, transition: { duration: 0 } } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } })}>
              <AppLayout />
            </motion.div>
          } />
          <Route path="*" element={<LoginPage onLogin={handleLogin} onRegister={() => navigate("/register")} />} />
        </Routes>
      <Toaster toasts={toasts} removeToast={removeToast} />
      </MotionConfig>
    </div>
  );
}

export default function App() {
  const darkMode = useAppStore((s) => s.darkMode);

  return (
    <ConfigProvider locale={zhCN} theme={darkMode ? DARK_THEME : LIGHT_THEME}>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </ConfigProvider>
  );
}

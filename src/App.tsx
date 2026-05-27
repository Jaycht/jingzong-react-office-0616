import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { motion, MotionConfig } from "framer-motion";
import { HashRouter, Route, Routes, useNavigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import { Toaster } from "./components/Toaster";
import { DARK_THEME, LIGHT_THEME } from "./constants/theme";
import { useAppStore } from "./store/appStore";

declare global {
  interface Window {
    electronAPI?: {
      switchToMain: () => void;
      closeLogin: () => void;
      isElectron: boolean;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      saveAttachmentFile: (buffer: number[], fileName: string, moduleId: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      readAttachmentFile: (filePath: string) => Promise<{ success: boolean; buffer?: ArrayBuffer; error?: string }>;
      deleteAttachmentFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      getAttachmentsDir: () => Promise<string>;
    };
  }
}

function AppContent() {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);
  const darkMode = useAppStore((s) => s.darkMode);
  const lowPerfMode = useAppStore((s) => s.lowPerfMode);

  const isElectron = typeof window !== "undefined" && window.electronAPI?.isElectron;

  const handleLogin = (name: string, role: string) => {
    setUser(name, role);
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
    <div
      className={(darkMode ? "theme-dark " : "") + (lowPerfMode ? "low-perf-mode" : "")}
      style={{ minHeight: "100vh" }}
    >
      <MotionConfig reducedMotion={lowPerfMode ? "always" : "never"}>
        <Routes>
          <Route
            path="/login"
            element={
              <motion.div
                key="login"
                {...(lowPerfMode
                  ? { initial: false, animate: true, transition: { duration: 0 } }
                  : {
                      initial: { opacity: 0, x: -40 },
                      animate: { opacity: 1, x: 0 },
                      exit: { opacity: 0, x: 40 },
                      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                    })}
              >
                  <LoginPage onLogin={handleLogin} onRegister={() => navigate("/register")} />
              </motion.div>
            }
          />
          <Route
            path="/register"
            element={
              <motion.div
                key="register"
                {...(lowPerfMode
                  ? { initial: false, animate: true, transition: { duration: 0 } }
                  : {
                      initial: { opacity: 0, x: 40 },
                      animate: { opacity: 1, x: 0 },
                      exit: { opacity: 0, x: -40 },
                      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                    })}
              >
                <RegisterPage onBack={() => navigate("/login")} />
              </motion.div>
            }
          />
          <Route
            path="/app/*"
            element={
              <motion.div
                key="app"
                {...(lowPerfMode
                  ? { initial: false, animate: true, transition: { duration: 0 } }
                  : {
                      initial: { opacity: 0 },
                      animate: { opacity: 1 },
                      transition: { duration: 0.4 },
                    })}
              >
                <AppLayout />
              </motion.div>
            }
          />
          <Route
            path="*"
            element={<LoginPage onLogin={handleLogin} onRegister={() => navigate("/register")} />}
          />
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

import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "./components/Toaster";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import AppLayout from "./components/AppLayout";
import { useAppStore } from "./store/appStore";

export default function App() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setUser = useAppStore((s) => s.setUser);
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  const handleLogin = (name: string, role: string) => {
    setUser(name, role);
    setView("app");
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
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
      <div style={{ minHeight: "100vh" }}>
        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.div key="login" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
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

import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { APP_VERSION } from "../version";

interface Props {
  onLogin: (name: string, role: string) => void;
  onRegister: () => void;
}

const STORAGE_KEY = "jingzong.login.v1";

interface SavedCredentials {
  account: string;
  password: string;
  remember: boolean;
  autoLogin: boolean;
}

function loadCredentials(): SavedCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { account: "", password: "", remember: false, autoLogin: false };
}

function saveCredentials(data: SavedCredentials): void {
  if (data.remember) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export default function LoginPage({ onLogin, onRegister }: Props) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [ready, setReady] = useState(false);

  // 加载保存的登录凭据
  useEffect(() => {
    const saved = loadCredentials();
    if (saved.remember) {
      setAccount(saved.account);
      setPassword(saved.password);
      setRemember(true);
      setAutoLogin(saved.autoLogin);
    }
    setReady(true);
  }, []);

  // 自动登录：如果开启了自动登录，页面加载后直接登录
  const tryAutoLogin = useCallback(() => {
    const saved = loadCredentials();
    if (saved.autoLogin && saved.account && saved.password) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        onLogin(saved.account, "用户");
      }, 400);
      return true;
    }
    return false;
  }, [onLogin]);

  useEffect(() => {
    if (ready) {
      tryAutoLogin();
    }
  }, [ready, tryAutoLogin]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!account || !password) {
      setError("请输入账号和密码");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      setLoading(false);
      saveCredentials({ account, password, remember, autoLogin });
      onLogin(account, "用户");
    }, 600);
  };

  const handleRememberChange = (checked: boolean) => {
    setRemember(checked);
    if (!checked) setAutoLogin(false);
  };

  if (!ready) {
    return null;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1B5E9B 0%, #2E7DCA 55%, #4A90D9 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute", borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }}
          initial={{ width: 200 + i * 120, height: 200 + i * 120, opacity: 0.3 }}
          animate={{ width: [200 + i * 120, 300 + i * 120, 200 + i * 120], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
        />
      ))}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "32px 32px", pointerEvents: "none",
      }} />

      {loading && autoLogin ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ color: "#fff", fontSize: 16, zIndex: 1, textAlign: "center" }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.2)",
              borderTopColor: "#fff",
              margin: "0 auto 16px",
            }}
          />
          正在自动登录...
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: "#fff", borderRadius: 20, padding: "44px 44px 36px",
            width: 440, maxWidth: "95vw", position: "relative", zIndex: 1,
            boxShadow: "0 8px 40px rgba(0,0,0,.2), 0 2px 8px rgba(0,0,0,.1)",
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
            style={{
              width: 160, height: 160,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 10px",
            }}
          >
            <img
              src="/ECID1.png"
              alt="经侦大队工作记录管理系统"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ textAlign: "center", marginBottom: 28 }}
          >
            <div style={{ fontSize: 21, fontWeight: 700, color: "#0F3A5F", letterSpacing: 2, marginBottom: 6 }}>
              经侦大队工作记录管理系统
            </div>
            <div style={{ fontSize: 11.5, color: "#6B7280", letterSpacing: 1.5, fontWeight: 500 }}>
              Economic Investigation Work Log Registration System
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: "#FFF5F5", border: "1px solid #FED7D7",
                    borderRadius: 8, padding: "9px 13px",
                    display: "flex", alignItems: "center", gap: 7,
                    fontSize: 12.5, color: "#D32F2F", overflow: "hidden",
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              style={{ display: "flex", flexDirection: "column", gap: 5 }}
            >
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>用户账号 <span style={{ color: "#D32F2F" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <User size={14} color="#9CA3AF" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={account} onChange={(e) => setAccount(e.target.value)}
                  style={{ width: "100%", height: 42, paddingLeft: 38, border: "1.5px solid #D1D5DB", borderRadius: 8, fontSize: 13, outline: "none", transition: "border-color .2s", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={(e) => { e.target.style.borderColor = "#2E7DCA"; e.target.style.boxShadow = "0 0 0 3px rgba(46,125,202,.13)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#D1D5DB"; e.target.style.boxShadow = "none"; }}
                  placeholder="请输入账号"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              style={{ display: "flex", flexDirection: "column", gap: 5 }}
            >
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>登录密码 <span style={{ color: "#D32F2F" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <Lock size={14} color="#9CA3AF" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", height: 42, paddingLeft: 38, paddingRight: 38, border: "1.5px solid #D1D5DB", borderRadius: 8, fontSize: 13, outline: "none", transition: "border-color .2s", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={(e) => { e.target.style.borderColor = "#2E7DCA"; e.target.style.boxShadow = "0 0 0 3px rgba(46,125,202,.13)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#D1D5DB"; e.target.style.boxShadow = "none"; }}
                  placeholder="请输入密码"
                />
                <button type="button" onClick={() => setShowPwd((p) => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
                  {showPwd ? <EyeOff size={15} color="#9CA3AF" /> : <Eye size={15} color="#9CA3AF" />}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6B7280", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => handleRememberChange(e.target.checked)}
                  style={{ accentColor: "#1B5E9B" }}
                />
                记住密码
              </label>
              {remember && (
                <motion.label
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  style={{ display: "flex", alignItems: "center", gap: 6, color: "#6B7280", cursor: "pointer", overflow: "hidden" }}
                >
                  <input
                    type="checkbox"
                    checked={autoLogin}
                    onChange={(e) => setAutoLogin(e.target.checked)}
                    style={{ accentColor: "#1B5E9B" }}
                  />
                  自动登录（下次打开直接进入系统）
                </motion.label>
              )}
            </motion.div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 12 }}>
              <button type="button" onClick={onRegister} style={{ background: "none", border: "none", color: "#2E7DCA", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                注册账号
              </button>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.01, boxShadow: "0 4px 16px rgba(27,94,155,.3)" }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              style={{
                height: 46, background: "linear-gradient(135deg, #1B5E9B, #2E7DCA)",
                color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600,
                letterSpacing: 3, cursor: loading ? "not-allowed" : "pointer",
                position: "relative", overflow: "hidden", fontFamily: "inherit",
                opacity: loading ? 0.85 : 1,
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>
                {loading ? "登录中..." : "登 录 系 统"}
              </span>
            </motion.button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid #E5E7EB", fontSize: 11, color: "#9CA3AF", lineHeight: 1.7 }}>
            <div>版本 {APP_VERSION} &nbsp;·&nbsp; 技术支持：陈洪涛</div>
            <div>本系统用于经侦大队日常工作记录、岗位台账、案件流转、附件归档和数据导出备份管理。</div>
            <div>Copyright 2026 经侦大队工作记录管理系统. All Rights Reserved.</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

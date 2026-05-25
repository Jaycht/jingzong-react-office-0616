import { useState, useEffect, useCallback, useRef } from "react";
import type { FormEvent } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { APP_VERSION } from "../version";
import { useAppStore } from "../store/appStore";
import RegisterPage from "./RegisterPage";

interface Props {
  onLogin: (name: string, role: string) => void;
  onRegister: () => void;
}

const STORAGE_KEY = "jingzong.login.v1";
interface SavedCredentials {
  account: string; password: string;
  rememberAccount: boolean; remember: boolean; autoLogin: boolean;
}
function loadCredentials(): SavedCredentials {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return { account: "", password: "", rememberAccount: false, remember: false, autoLogin: false };
}
function saveCredentials(data: SavedCredentials): void {
  if (data.remember) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  else localStorage.removeItem(STORAGE_KEY);
}

export default function LoginPage({ onLogin, onRegister }: Props) {
  const lowPerfMode = useAppStore((s) => s.lowPerfMode);
  const toggleLowPerfMode = useAppStore((s) => s.toggleLowPerfMode);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberAccount, setRememberAccount] = useState(false);
  const [remember, setRemember] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [ready, setReady] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const saved = loadCredentials();
    if (saved.rememberAccount) setAccount(saved.account);
    if (saved.remember) { setPassword(saved.password); setRemember(true); setAutoLogin(saved.autoLogin); }
    setReady(true);
  }, []);

  const tryAutoLogin = useCallback(() => {
    if (autoLogin && ready && account && password) {
      setLoading(true);
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem("jingzong.users.v1") || "[]");
        const found = users.find((u: any) => u.account === account && u.password === password);
        if (found) {
          onLogin(found.name, found.roleName || found.role);
        } else {
          onLogin(account, "user");
        }
        setLoading(false);
      }, 300);
    }
  }, [autoLogin, ready, account, password, onLogin]);

  useEffect(() => { tryAutoLogin(); }, [tryAutoLogin]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!account.trim()) { setError("请输入账号"); return; }
    if (!password) { setError("请输入密码"); return; }
    setLoading(true);
    saveCredentials({ account, password, rememberAccount, remember, autoLogin });

    // Try local user database first
    const users = JSON.parse(localStorage.getItem("jingzong.users.v1") || "[]");
    const found = users.find((u: any) => u.account === account && u.password === password);
    if (found) {
      setTimeout(() => { setLoading(false); onLogin(found.name, found.roleName || found.role); }, 400);
      return;
    }

    // Fallback: name + role pattern
    const patterns: Record<string, string> = {
      admin: "管理员", manager: "部门主管", user: "普通用户",
    };
    const role = patterns[account] || "普通用户";
    setTimeout(() => { setLoading(false); onLogin(account, role); }, 400);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "#0F3A5F", overflow: "hidden",
      justifyContent: "center", alignItems: "center",
    }}>
      <div style={{
        width: "min(400px, 94vw)", maxHeight: "100vh", overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "20px 16px",
      }}>
        {/* Logo */}
        <img src="./logo.png" alt="" style={{
          width: "min(120px, 30vw)", height: "auto", objectFit: "contain",
          marginBottom: 12,
        }} />

        {/* Title */}
        <div style={{
          fontSize: 18, fontWeight: 700, color: "#fff",
          marginBottom: 6, textAlign: "center",
        }}>
          经侦大队工作记录管理系统
        </div>
        <div style={{
          fontSize: 12, color: "rgba(255,255,255,0.5)",
          marginBottom: 24, textAlign: "center",
        }}>
          v{APP_VERSION.replace("V","")}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            width: "100%", padding: "8px 12px", marginBottom: 12,
            background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: 6, color: "#FCA5A5", fontSize: 12.5,
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Account */}
          <div style={{ position: "relative" }}>
            <User size={15} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
            <input
              value={account} onChange={e => setAccount(e.target.value)}
              placeholder="账号"
              style={{
                width: "100%", height: 40, paddingLeft: 36, paddingRight: 12,
                borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
                outline: "none", background: "rgba(255,255,255,0.08)", color: "#fff",
                fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(163,201,255,0.5)"; e.target.style.background = "rgba(255,255,255,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
            />
          </div>

          {/* Password */}
          <div style={{ position: "relative" }}>
            <Lock size={15} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
            <input
              type={showPwd ? "text" : "password"}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="密码"
              style={{
                width: "100%", height: 40, paddingLeft: 36, paddingRight: 36,
                borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
                outline: "none", background: "rgba(255,255,255,0.08)", color: "#fff",
                fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(163,201,255,0.5)"; e.target.style.background = "rgba(255,255,255,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
            />
            <div
              onClick={() => setShowPwd(!showPwd)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex" }}
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </div>
          </div>

          {/* Options */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
              <input type="checkbox" checked={rememberAccount} onChange={e => setRememberAccount(e.target.checked)} style={{ accentColor: "#2E7DCA", width: 13, height: 13, cursor: "pointer" }} />
              记住账号
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: "#2E7DCA", width: 13, height: 13, cursor: "pointer" }} />
              记住密码
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
              <input type="checkbox" checked={lowPerfMode} onChange={toggleLowPerfMode} style={{ accentColor: "#2E7DCA", width: 13, height: 13, cursor: "pointer" }} />
              低性能模式
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", height: 40, borderRadius: 6, border: "none",
              background: loading ? "rgba(46,125,202,0.5)" : "#2E7DCA",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", marginTop: 4,
            }}
          >
            {loading ? "登录中..." : "登 录"}
          </button>
        </form>

        {/* Register */}
        <div style={{ marginTop: 16, fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>
          没有账号？
          <span
            onClick={() => setShowRegister(true)}
            style={{ color: "#7DD3FC", cursor: "pointer", marginLeft: 4 }}
          >
            注册新账号
          </span>
        </div>

        {/* Performance hint */}
        {!lowPerfMode && (
          <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
            提示：如界面卡顿，请勾选"低性能模式"
          </div>
        )}
      </div>

      {/* Register Modal */}
      {showRegister && <RegisterPage onBack={() => setShowRegister(false)} />}
    </div>
  );
}

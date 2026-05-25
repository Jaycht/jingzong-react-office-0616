import { useState, useEffect, useCallback, useRef } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
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
  const now = useCurrentTime();

  useEffect(() => {
    const saved = loadCredentials();
    if (saved.rememberAccount) setAccount(saved.account);
    if (saved.remember) { setPassword(saved.password); setRemember(true); setAutoLogin(saved.autoLogin); }
    setReady(true);
  }, []);

  const tryAutoLogin = useCallback(() => {
    const saved = loadCredentials();
    if (saved.autoLogin && saved.account && saved.password) {
      setLoading(true);
      setTimeout(() => { setLoading(false); onLogin(saved.account, "用户"); }, 400);
      return true;
    }
    return false;
  }, [onLogin]);

  useEffect(() => { if (ready) tryAutoLogin(); }, [ready, tryAutoLogin]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!account || !password) { setError("请输入账号和密码"); return; }
    setLoading(true); setError("");

    const users = JSON.parse(localStorage.getItem("jingzong.users.v1") || "[]");
    const found = users.find((u: any) => u.account === account && u.password === password);
    if (found) {
      setTimeout(() => { setLoading(false); onLogin(found.name, found.roleName || found.role); }, 400);
      return;
    }
    const patterns: Record<string, string> = { admin: "管理员", manager: "部门主管", user: "普通用户" };
    const role = patterns[account] || "普通用户";
    setTimeout(() => {
      setLoading(false);
      saveCredentials({ account, password, rememberAccount: rememberAccount || remember, remember, autoLogin });
      onLogin(account, role);
    }, 600);
  };

  const handleRememberChange = (checked: boolean) => {
    setRemember(checked);
    if (checked) setRememberAccount(true);
    if (!checked) setAutoLogin(false);
  };

  if (!ready) return null;

  const inputBase: React.CSSProperties = {
    width: "100%", height: 44, paddingLeft: 40, paddingRight: 14,
    background: "rgba(12,14,17,0.8)", border: "1.5px solid #42474f",
    borderRadius: 8, fontSize: 13.5, color: "#e2e2e6",
    outline: "none", transition: "border-color .25s, box-shadow .25s",
    fontFamily: "inherit", boxSizing: "border-box",
  };

  /* ---- 低性能模式：简化所有特效 ---- */
  const bgStyle = lowPerfMode
    ? { background: "#111316" }
    : {
        background: "#111316",
        backgroundImage: [
          "radial-gradient(rgba(0, 59, 109, 0.25) 1px, transparent 1px)",
          "linear-gradient(to right, rgba(0, 59, 109, 0.06) 1px, transparent 1px)",
          "linear-gradient(to bottom, rgba(0, 59, 109, 0.06) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "32px 32px, 128px 128px, 128px 128px",
      };

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        position: "relative", overflow: "auto",
        fontFamily: "'Noto Sans SC','Microsoft YaHei','PingFang SC',sans-serif",
        ...bgStyle,
      }}
    >
      {/* 扫描线特效（低性能模式下隐藏） */}
      {!lowPerfMode && <div className="scanline-overlay" />}

      {/* 主内容区域 — 固定宽度布局 */}
      <main style={{
        flex: 1, padding: "clamp(16px, 3vw, 32px)", maxWidth: 1200,
        margin: "0 auto", width: "100%",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", position: "relative", zIndex: 10,
      }}>
        {/* 三列等宽布局：登录区 | 警纪文字 | Logo区 */}
        <section style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(380px, 440px) minmax(160px, 1fr) minmax(300px, 1fr)",
          gap: "clamp(16px, 3vw, 40px)",
          alignItems: "center",
          marginBottom: "clamp(24px, 5vw, 48px)",
        }}>
          {/* ===== 左列：系统状态徽标 + 标题 + 登录表单 ===== */}
          <div style={{ minWidth: 0 }}>
            {/* 系统状态徽标 */}
            {!lowPerfMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="shimmer-btn"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "4px 12px 4px 10px", borderRadius: 20,
                  background: "rgba(0,59,109,0.35)", border: "1px solid rgba(163,201,255,0.15)",
                  marginBottom: 16, fontSize: 10.5,
                  color: "#00dbe7", fontFamily: "'JetBrains Mono',monospace",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00dbe7", display: "inline-block", animation: "pulse 2s infinite" }} />
                System Online &middot; v{APP_VERSION.replace("V","")}
              </motion.div>
            )}

            {/* 标题 */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              style={{
                fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 700, lineHeight: 1.2,
                letterSpacing: "-0.02em", marginBottom: 6,
              }}
            >
              <span style={{ color: "#a3c9ff" }}>经侦大队工作记录管理系统</span>
            </motion.h2>

            {!lowPerfMode && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                style={{ fontSize: 14, lineHeight: 1.6, color: "#c2c6d0", marginBottom: 24, maxWidth: 420 }}
              >
                数智赋能经侦履职，数据镌刻办案征程。
              </motion.p>
            )}

            {/* 登录表单 — 固定宽度不缩放 */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380 }}
            >
              {/* 错误提示 */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(255,75,75,0.12)", border: "1px solid rgba(255,75,75,0.25)", color: "#ffb4ab", fontSize: 12 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 账号 */}
              <div style={{ position: "relative" }}>
                <User size={15} color="#8c919a" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
                <input value={account} onChange={e => setAccount(e.target.value)} placeholder="账号" style={inputBase}
                  onFocus={e => { e.target.style.borderColor = "#a3c9ff"; e.target.style.boxShadow = "0 0 0 3px rgba(163,201,255,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#42474f"; e.target.style.boxShadow = "none"; }} />
              </div>

              {/* 密码 */}
              <div style={{ position: "relative" }}>
                <Lock size={15} color="#8c919a" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
                <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" style={{ ...inputBase, paddingRight: 38 }}
                  onFocus={e => { e.target.style.borderColor = "#a3c9ff"; e.target.style.boxShadow = "0 0 0 3px rgba(163,201,255,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#42474f"; e.target.style.boxShadow = "none"; }} />
                <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
                  {showPwd ? <EyeOff size={14} color="#8c919a" /> : <Eye size={14} color="#8c919a" />}
                </button>
              </div>

              {/* 选项行：记住账号 / 记住密码 / 低性能模式 */}
              <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "#c2c6d0", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input type="checkbox" checked={rememberAccount} onChange={e => { setRememberAccount(e.target.checked); if (!e.target.checked && !remember) localStorage.removeItem(STORAGE_KEY); }} style={{ accentColor: "#a3c9ff", width: 12, height: 12 }} />
                  记住账号
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input type="checkbox" checked={remember} onChange={e => handleRememberChange(e.target.checked)} style={{ accentColor: "#a3c9ff", width: 12, height: 12 }} />
                  记住密码
                </label>
                {remember && (
                  <motion.label initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    <input type="checkbox" checked={autoLogin} onChange={e => setAutoLogin(e.target.checked)} style={{ accentColor: "#a3c9ff", width: 12, height: 12 }} />
                    自动登录
                  </motion.label>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginLeft: "auto" }}>
                  <input type="checkbox" checked={lowPerfMode} onChange={toggleLowPerfMode} style={{ accentColor: "#a3c9ff", width: 12, height: 12 }} />
                  低性能
                </label>
              </div>

              {/* 登录按钮 + 注册 */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} disabled={loading}
                  className={lowPerfMode ? "" : "shimmer-btn"}
                  style={{
                    flex: 1, height: 44,
                    background: loading ? "rgba(0,59,109,0.5)" : "linear-gradient(135deg,#003b6d,#0a5090)",
                    color: "#e2e2e6", border: "1px solid rgba(163,201,255,0.15)",
                    borderRadius: 8, fontSize: 14, fontWeight: 600,
                    letterSpacing: 3, cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit", position: "relative", overflow: "hidden",
                  }}
                >
                  <span style={{ position: "relative", zIndex: 1 }}>{loading ? "登录中..." : "登 录"}</span>
                </motion.button>
                <button type="button" onClick={() => setShowRegister(true)} style={{ background: "none", border: "none", color: "#a3c9ff", cursor: "pointer", fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  注册
                </button>
              </div>
            </motion.form>
          </div>

          {/* ===== 中列：严禁饮酒八项规定 ===== */}
          {!lowPerfMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 1.5 }}
              style={{ textAlign: "center" }}
            >
              <motion.div
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  fontSize: "clamp(11px, 1.2vw, 13px)",
                  lineHeight: 2.2,
                  color: "rgba(194, 198, 208, 0.4)",
                  fontFamily: "'JetBrains Mono','Noto Sans SC',monospace",
                  letterSpacing: "0.08em",
                  userSelect: "none",
                }}
              >
                严禁工作日早、中午饮酒<br/>
                严禁酒后执行公务<br/>
                严禁安保、执法期间饮酒<br/>
                严禁携警械、涉密文件、着警服饮酒<br/>
                严禁在公安内部场所饮酒<br/>
                严禁参加影响公正履职酒局<br/>
                严禁酗酒滋事<br/>
                严禁其他涉酒违纪行为。
              </motion.div>
            </motion.div>
          )}

          {/* ===== 右列：Logo + 实时时钟面板 ===== */}
          {!lowPerfMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
            >
              {/* 大Logo */}
              <img
                src="./logo.png" alt="System Logo"
                style={{
                  width: "min(80%, 300px)", height: "auto",
                  filter: "drop-shadow(0 0 40px rgba(0,59,109,0.5))",
                }}
              />

              {/* 实时时钟面板 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="glass-panel"
                style={{ padding: "14px 24px", borderRadius: 12, textAlign: "center" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00dbe7", display: "inline-block", animation: "pulse 2s infinite" }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#00dbe7", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    欢迎使用
                  </span>
                </div>
                <div style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 700, color: "#e2e2e6", fontFamily: "'JetBrains Mono',monospace" }}>
                  {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}:{String(now.getSeconds()).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 10, color: "#c2c6d0", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                  系统运行中
                </div>
              </motion.div>
            </motion.div>
          )}
        </section>

        {/* ===== 底部三张特性卡片 ===== */}
        {!lowPerfMode && (
          <section style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "clamp(10px, 2vw, 16px)",
          }}>
            {[
              { icon: "\u26A1", title: "快速录入", desc: "毫秒级响应，支持快捷键触发。专为高压环境下的瞬间灵感捕捉而设计。", accent: "#a3c9ff" },
              { icon: "\uD83D\uDCCA", title: "深度分析", desc: "自动生成周报与月报。基于本地算法的个人产出可视化，洞察每一项任务的耗时分布。", accent: "#00dbe7" },
              { icon: "\uD83D\uDD12", title: "本地加密", desc: "数据存储于本地，多重加密保护。完全脱离云端，确保绝对的数据隐私与主权。", accent: "#e9c349" },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.12, duration: 0.6 }}
                className="glass-panel corner-accent"
                style={{ padding: "clamp(16px, 2vw, 24px)", borderRadius: 12, position: "relative" }}
              >
                <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,59,109,0.2)", borderRadius: 8, marginBottom: 14, fontSize: 20 }}>{card.icon}</div>
                <h3 style={{ fontSize: "clamp(14px, 1.5vw, 18px)", fontWeight: 600, color: "#e2e2e6", marginBottom: 6 }}>{card.title}</h3>
                <p style={{ fontSize: "clamp(11px, 1.2vw, 13px)", lineHeight: 1.6, color: "#c2c6d0" }}>{card.desc}</p>
              </motion.div>
            ))}
          </section>
        )}

        {/* ===== 页脚版权 ===== */}
        <div style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "clamp(8px, 1.5vw, 16px) 0 0", marginTop: "clamp(12px, 2vw, 24px)",
        }}>
          <span style={{ fontSize: "clamp(10px, 1vw, 12px)", color: "rgba(226,226,230,0.35)", fontFamily: "'JetBrains Mono',monospace" }}>
            © 2026 陈洪涛 — Economic Investigation Work Log Registration System
          </span>
          <span style={{ fontSize: "clamp(10px, 1vw, 12px)", color: "rgba(226,226,230,0.35)", fontFamily: "'JetBrains Mono',monospace" }}>
            {now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, "0")}-{String(now.getDate()).padStart(2, "0")} {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}:{String(now.getSeconds()).padStart(2, "0")}
          </span>
        </div>
      </main>

      {/* 注册弹窗 */}
      <AnimatePresence>
        {showRegister && <RegisterPage onBack={() => setShowRegister(false)} />}
      </AnimatePresence>
    </div>
  );
}

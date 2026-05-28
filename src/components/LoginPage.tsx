import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { APP_VERSION } from "../version";
import { useAppStore } from "../store/appStore";
import { hashPassword, verifyPassword } from "../utils/crypto";

interface Props {
  onLogin: (name: string, role: string) => void;
  onRegister: () => void;
}

const STORAGE_KEY = "jingzong.login.v1";

interface SavedCredentials {
  account: string;
  password: string;
  rememberAccount: boolean;
  remember: boolean;
  autoLogin: boolean;
}

interface StoredUser {
  account: string;
  password: string;
  name: string;
  role?: string;
  roleName?: string;
}

const DEFAULT_CREDENTIALS: SavedCredentials = {
  account: "",
  password: "",
  rememberAccount: false,
  remember: false,
  autoLogin: false,
};

// 已登录过的账号历史，用于输入框自动补全
const ACCOUNT_HISTORY_KEY = 'jingzong.accountHistory.v1';
const ACCOUNT_PASSWORDS_KEY = 'jingzong.accountPasswords.v1';

/** 按账号保存密码（记住密码时用，便于切换历史账号时回填） */
function loadAccountPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ACCOUNT_PASSWORDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveAccountPassword(account: string, password: string): void {
  if (!account) return;
  try {
    const all = loadAccountPasswords();
    all[account] = password;
    localStorage.setItem(ACCOUNT_PASSWORDS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function loadAccountHistory(): string[] {
  try {
    const raw = localStorage.getItem(ACCOUNT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAccountToHistory(account: string): void {
  if (!account) return;
  try {
    const history = loadAccountHistory();
    const next = [account, ...history.filter(a => a !== account)].slice(0, 20);
    localStorage.setItem(ACCOUNT_HISTORY_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

const DEFAULT_ROLE_BY_ACCOUNT: Record<string, string> = {
  admin: "管理员",
  manager: "部门主管",
  user: "普通用户",
};

function loadCredentials(): SavedCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CREDENTIALS, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore malformed local cache and fall back to defaults.
  }
  return DEFAULT_CREDENTIALS;
}

function saveCredentials(data: SavedCredentials): void {
  // 记住账号 或 记住密码任一勾选则保存
  // 注：仅当用户显式取消所有勾选时才删除凭据，登录时不删除
  if (data.rememberAccount || data.remember) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem("jingzong.users.v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

const DISCIPLINE_RULES = [
  "严禁工作日早、中午饮酒",
  "严禁酒后执行公务",
  "严禁安保、执法期间饮酒",
  "严禁携警械、涉密文件、着警服饮酒",
  "严禁在公安内部场所饮酒",
  "严禁参加影响公正履职酒局",
  "严禁酗酒滋事",
  "严禁其他涉酒违纪行为",
];

const FEATURE_CARDS = [
  {
    icon: "\u26A1",
    title: "快速录入",
    desc: "面向高频业务登记场景，突出首屏直达与模板化填写，减少重复操作。",
  },
  {
    icon: "\uD83D\uDCCA",
    title: "统计分析",
    desc: "围绕台账、趋势和部门分布做本地统计，为日报、周报、月报输出打底。",
  },
  {
    icon: "\uD83D\uDD12",
    title: "本地存储",
    desc: "当前数据以本地存储为主，适合内网和单机环境，也便于后续接入安装包方案。",
  },
];

export default function LoginPage({ onLogin, onRegister }: Props) {
  const lowPerfMode = useAppStore((s) => s.lowPerfMode);
  const toggleLowPerfMode = useAppStore((s) => s.toggleLowPerfMode);
  const savedCredentials = loadCredentials();
  const now = useCurrentTime();

  const accountHistory = useMemo(() => loadAccountHistory(), []);

  const [account, setAccount] = useState(
    savedCredentials.rememberAccount ? savedCredentials.account : ""
  );
  const [password, setPassword] = useState(
    savedCredentials.remember ? savedCredentials.password : ""
  );
  // 当用户切换账号时，从已保存的密码映射中回填密码
  const handleAccountChange = (val: string) => {
    setAccount(val);
    const savedPwds = loadAccountPasswords();
    if (savedPwds[val]) {
      setPassword(savedPwds[val]);
      setRemember(true);
      setRememberAccount(true);
    } else {
      setPassword("");
    }
  };
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rememberAccount, setRememberAccount] = useState(savedCredentials.rememberAccount);
  const [remember, setRemember] = useState(savedCredentials.remember);
  const [autoLogin, setAutoLogin] = useState(savedCredentials.autoLogin);
  const [autoLoginPending, setAutoLoginPending] = useState(
    savedCredentials.autoLogin && !!savedCredentials.account && !!savedCredentials.password
  );

  const loading = submitting || autoLoginPending;

  useEffect(() => {
    if (!autoLoginPending) return;

    const timer = window.setTimeout(async () => {
      setAutoLoginPending(false);
      // 自动登录也验证用户是否存在
      const users = loadUsers();
      const userByAccount = users.find((user) => user.account === savedCredentials.account);
      if (userByAccount && userByAccount.status !== "pending") {
        const pwdMatch = await verifyPassword(savedCredentials.password, userByAccount.password);
        if (pwdMatch) {
          saveAccountToHistory(savedCredentials.account);
          onLogin(userByAccount.name, userByAccount.roleName || userByAccount.role || "普通用户");
          return;
        }
      }
      // 内置默认账号（admin/manager/user）
      if (DEFAULT_ROLE_BY_ACCOUNT[savedCredentials.account]) {
        saveAccountToHistory(savedCredentials.account);
        onLogin(savedCredentials.account, DEFAULT_ROLE_BY_ACCOUNT[savedCredentials.account]);
      }
      // 不匹配任何用户则静默失败，等待手动登录
    }, 400);

    return () => window.clearTimeout(timer);
  }, [autoLoginPending, onLogin, savedCredentials.account]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!account || !password) {
      setError("请输入账号和密码");
      return;
    }

    setSubmitting(true);
    setError("");

    // 立即保存凭据（在异步操作之前），确保关闭/刷新前已落盘
    saveCredentials({
      account,
      password,
      rememberAccount: rememberAccount || remember,
      remember,
      autoLogin,
    });
    // 同时按账号保存密码，供历史账号切换时回填
    if (remember || rememberAccount) {
      saveAccountPassword(account, password);
    }

    (async () => {
      const users = loadUsers();

      // 先用账号查找用户
      const userByAccount = users.find((user) => user.account === account);
      let found = null;

      if (userByAccount) {
        // 兼容新旧密码格式：明文 or SHA-256 哈希
        const pwdMatch = await verifyPassword(password, userByAccount.password);
        if (pwdMatch) {
          found = userByAccount;
        }
      }

      window.setTimeout(() => {
        setSubmitting(false);

        // 已注册但待审核的用户不能登录
        if (found && found.status === "pending") {
          setError("账号正在等待管理员审核");
          return;
        }

        // 验证用户是否存在
        if (!found && !DEFAULT_ROLE_BY_ACCOUNT[account]) {
          setError("账号或密码错误");
          return;
        }

        if (found) {
          // 已注册用户：使用注册时的真实姓名
          saveAccountToHistory(account);
          onLogin(found.name, found.roleName || found.role || "普通用户");
        } else {
          // 内置默认账号（admin/manager/user）
          saveAccountToHistory(account);
          onLogin(account, DEFAULT_ROLE_BY_ACCOUNT[account]);
        }
      }, 600);
    })();
  };

  const handleRememberChange = (checked: boolean) => {
    setRemember(checked);
    if (checked) setRememberAccount(true);
    if (!checked) setAutoLogin(false);
  };

  const inputBase: CSSProperties = {
    width: "100%",
    height: 44,
    paddingLeft: 40,
    paddingRight: 14,
    background: "rgba(12,14,17,0.8)",
    border: "1.5px solid #42474f",
    borderRadius: 8,
    fontSize: 13.5,
    color: "#e2e2e6",
    outline: "none",
    transition: "border-color .25s, box-shadow .25s",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const bgStyle = lowPerfMode
    ? { backgroundColor: "#111316" }
    : {
        backgroundColor: "#111316",
        backgroundImage: [
          "radial-gradient(rgba(0, 59, 109, 0.25) 1px, transparent 1px)",
          "linear-gradient(to right, rgba(0, 59, 109, 0.06) 1px, transparent 1px)",
          "linear-gradient(to bottom, rgba(0, 59, 109, 0.06) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "32px 32px, 128px 128px, 128px 128px",
      };

  const isElectron = typeof window !== "undefined" && (window as any).electronAPI?.isElectron;

  const handleCloseLoginPage = () => {
    if ((window as any).electronAPI?.close) {
      (window as any).electronAPI.close();
    } else {
      try { window.close(); } catch { /* not supported */ }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "'Noto Sans SC','Microsoft YaHei','PingFang SC',sans-serif",
        ...bgStyle,
      }}
    >
      {/* Electron 无边框窗口拖拽条 + 关闭按钮 */}
      {isElectron && (
        <div
          style={{
            height: 28, flexShrink: 0, display: 'flex', alignItems: 'center',
            WebkitAppRegion: 'drag' as any,
            background: '#0a1420',
            paddingLeft: 12,
          }}
        >
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono',monospace", flex: 1 }}>
            经侦大队工作记录管理系统
          </span>
          <div style={{ WebkitAppRegion: 'no-drag' as any, display: 'flex', paddingRight: 4 }}>
            <div onClick={handleCloseLoginPage} title="关闭"
              style={{ width: 36, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E81123'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >×</div>
          </div>
        </div>
      )}

      {!lowPerfMode && <div className="scanline-overlay" />}

      <main
        style={{
          flex: 1,
          padding: "clamp(16px, 3vw, 32px)",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <section
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: lowPerfMode
              ? "minmax(340px, 440px) minmax(240px, 1fr)"
              : "minmax(380px, 440px) minmax(140px, 1fr) minmax(260px, 1fr)",
            gap: lowPerfMode ? "clamp(12px, 2vw, 24px)" : "clamp(16px, 3vw, 40px)",
            alignItems: "center",
            marginBottom: "clamp(24px, 5vw, 48px)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {!lowPerfMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="shimmer-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "4px 12px 4px 10px",
                  borderRadius: 20,
                  background: "rgba(0,59,109,0.35)",
                  border: "1px solid rgba(163,201,255,0.15)",
                  marginBottom: 16,
                  fontSize: 10.5,
                  color: "#00dbe7",
                  fontFamily: "'JetBrains Mono',monospace",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#00dbe7",
                    display: "inline-block",
                    animation: "pulse 2s infinite",
                  }}
                />
                System Online · v{APP_VERSION.replace("V", "")}
              </motion.div>
            )}

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              style={{
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                marginBottom: 6,
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
                面向日常登记、台账沉淀与报表输出的本地工作台，先把数据记准，再把协同做顺。
              </motion.p>
            )}

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380 }}
            >
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      background: "rgba(255,75,75,0.12)",
                      border: "1px solid rgba(255,75,75,0.25)",
                      color: "#ffb4ab",
                      fontSize: 12,
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ position: "relative" }}>
                <User
                  size={15}
                  color="#8c919a"
                  style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", zIndex: 1 }}
                />
                <input
                  value={account}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  placeholder="账号"
                  list="account-history"
                  style={inputBase}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#a3c9ff";
                    e.target.style.boxShadow = "0 0 0 3px rgba(163,201,255,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#42474f";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* 账号历史补全下拉 */}
              <datalist id="account-history">
                {accountHistory.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>

              <div style={{ position: "relative" }}>
                <Lock
                  size={15}
                  color="#8c919a"
                  style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", zIndex: 1 }}
                />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  style={{ ...inputBase, paddingRight: 38 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#a3c9ff";
                    e.target.style.boxShadow = "0 0 0 3px rgba(163,201,255,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#42474f";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                  }}
                >
                  {showPwd ? <EyeOff size={14} color="#8c919a" /> : <Eye size={14} color="#8c919a" />}
                </button>
              </div>

              <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "#c2c6d0", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={rememberAccount}
                    onChange={(e) => {
                      setRememberAccount(e.target.checked);
                      if (!e.target.checked && !remember) {
                        clearCredentials();
                      }
                    }}
                    style={{ accentColor: "#a3c9ff", width: 12, height: 12 }}
                  />
                  记住账号
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => handleRememberChange(e.target.checked)}
                    style={{ accentColor: "#a3c9ff", width: 12, height: 12 }}
                  />
                  记住密码
                </label>
                {remember && (
                  <motion.label
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={autoLogin}
                      onChange={(e) => setAutoLogin(e.target.checked)}
                      style={{ accentColor: "#a3c9ff", width: 12, height: 12 }}
                    />
                    自动登录
                  </motion.label>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginLeft: "auto" }}>
                  <input
                    type="checkbox"
                    checked={lowPerfMode}
                    onChange={toggleLowPerfMode}
                    style={{ accentColor: "#a3c9ff", width: 12, height: 12 }}
                  />
                  低性能
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className={lowPerfMode ? "" : "shimmer-btn"}
                  style={{
                    flex: 1,
                    height: 44,
                    background: loading ? "rgba(0,59,109,0.5)" : "linear-gradient(135deg,#003b6d,#0a5090)",
                    color: "#e2e2e6",
                    border: "1px solid rgba(163,201,255,0.15)",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: 3,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span style={{ position: "relative", zIndex: 1 }}>{loading ? "登录中..." : "登 录"}</span>
                </motion.button>
                <button
                  type="button"
                  onClick={onRegister}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#a3c9ff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  注册
                </button>
              </div>
            </motion.form>
          </div>

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
                {DISCIPLINE_RULES.map((rule) => (
                  <div key={rule}>{rule}</div>
                ))}
              </motion.div>
            </motion.div>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <img
              src="./logo.png"
              alt="System Logo"
              style={{
                width: "min(80%, 280px)",
                height: "auto",
                filter: "drop-shadow(0 0 40px rgba(0,59,109,0.5))",
              }}
            />

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="glass-panel"
              style={{ padding: "14px 24px", borderRadius: 12, textAlign: "center" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 4 }}>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#00dbe7",
                    display: "inline-block",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10,
                    color: "#00dbe7",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  欢迎使用
                </span>
              </div>
              <div
                style={{
                  fontSize: "clamp(22px, 3vw, 32px)",
                  fontWeight: 700,
                  color: "#e2e2e6",
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}:
                {String(now.getSeconds()).padStart(2, "0")}
              </div>
              <div style={{ fontSize: 10, color: "#c2c6d0", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                系统运行中
              </div>
            </motion.div>
          </div>
        </section>

        {!lowPerfMode && (
          <section
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "clamp(10px, 2vw, 16px)",
            }}
          >
            {FEATURE_CARDS.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.12, duration: 0.6 }}
                className="glass-panel corner-accent"
                style={{ padding: "clamp(16px, 2vw, 24px)", borderRadius: 12, position: "relative" }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,59,109,0.2)",
                    borderRadius: 8,
                    marginBottom: 14,
                    fontSize: 20,
                  }}
                >
                  {card.icon}
                </div>
                <h3 style={{ fontSize: "clamp(14px, 1.5vw, 18px)", fontWeight: 600, color: "#e2e2e6", marginBottom: 6 }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: "clamp(11px, 1.2vw, 13px)", lineHeight: 1.6, color: "#c2c6d0" }}>{card.desc}</p>
              </motion.div>
            ))}
          </section>
        )}

        <div
          style={{
            width: "100%",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            padding: "clamp(8px, 1.5vw, 16px) 0 0",
            marginTop: "clamp(12px, 2vw, 24px)",
          }}
        >
          <span
            style={{
              fontSize: "clamp(10px, 1vw, 12px)",
              color: "rgba(226,226,230,0.35)",
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            © 2026 陈洪涛 · 经侦大队工作记录管理系统 {APP_VERSION}
          </span>
          <span
            style={{
              fontSize: "clamp(10px, 1vw, 12px)",
              color: "rgba(226,226,230,0.35)",
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            {now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, "0")}-
            {String(now.getDate()).padStart(2, "0")} {String(now.getHours()).padStart(2, "0")}:
            {String(now.getMinutes()).padStart(2, "0")}:{String(now.getSeconds()).padStart(2, "0")}
          </span>
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
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
  rememberAccount: boolean;
  remember: boolean;
  autoLogin: boolean;
}

function loadCredentials(): SavedCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { account: "", password: "", rememberAccount: false, remember: false, autoLogin: false };
}

function saveCredentials(data: SavedCredentials): void {
  if (data.remember) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/* ---- Animated Waves Canvas Component ---- */
function WavesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let offset = 0;
    let animId: number;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Grid overlay
      ctx!.strokeStyle = "rgba(163, 201, 255, 0.04)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < canvas!.width; i += 24) {
        ctx!.beginPath(); ctx!.moveTo(i, 0); ctx!.lineTo(i, canvas!.height); ctx!.stroke();
      }
      for (let i = 0; i < canvas!.height; i += 24) {
        ctx!.beginPath(); ctx!.moveTo(0, i); ctx!.lineTo(canvas!.width, i); ctx!.stroke();
      }

      // Primary wave (blue)
      ctx!.strokeStyle = "#a3c9ff";
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      for (let x = 0; x < canvas!.width; x++) {
        const noise = Math.sin(x * 0.01 + offset * 0.5) * 4;
        const y = canvas!.height / 2 + Math.sin(x * 0.03 + offset) * (12 + noise);
        if (x === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      // Tertiary pulse wave (cyan)
      ctx!.strokeStyle = "#00dbe7";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      for (let x = 0; x < canvas!.width; x++) {
        const pulse = Math.pow(Math.sin(x * 0.01 - offset * 2), 10) * 16;
        const y = canvas!.height / 2 + Math.cos(x * 0.05 + offset * 1.5) * 6 + pulse;
        if (x === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      offset += 0.035;
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", opacity: 0.5,
      }}
    />
  );
}

export default function LoginPage({ onLogin, onRegister }: Props) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberAccount, setRememberAccount] = useState(false);
  const [remember, setRemember] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [ready, setReady] = useState(false);

  // Load saved credentials
  useEffect(() => {
    const saved = loadCredentials();
    if (saved.rememberAccount) {
      setAccount(saved.account);
    }
    if (saved.remember) {
      setPassword(saved.password);
      setRemember(true);
      setAutoLogin(saved.autoLogin);
    }
    setReady(true);
  }, []);

  // Auto login
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
      saveCredentials({ account, password, rememberAccount: rememberAccount || remember, remember, autoLogin });
      onLogin(account, "用户");
    }, 600);
  };

  const handleRememberChange = (checked: boolean) => {
    setRemember(checked);
    if (checked) setRememberAccount(true);
    if (!checked) setAutoLogin(false);
  };

  if (!ready) {
    return null;
  }

  return (
    <div
      className="tactical-grid-bg"
      style={{
        minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        fontFamily: "'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif",
      }}
    >
      {/* Scanline overlay */}
      <div className="scanline-overlay" />

      {/* Smoke background */}
      <div className="smoke-bg" />

      {/* Animated waves */}
      <WavesCanvas />

      {/* Floating radial rings */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute", borderRadius: "50%",
            border: "1px solid rgba(163, 201, 255, 0.06)",
            pointerEvents: "none",
          }}
          initial={{ width: 180 + i * 140, height: 180 + i * 140, opacity: 0.2 }}
          animate={{
            width: [180 + i * 140, 260 + i * 140, 180 + i * 140],
            opacity: [0.2, 0.45, 0.2],
          }}
          transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}

      {/* Login Card - Glass Panel */}
      {loading && autoLogin ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ color: "#e2e2e6", fontSize: 16, zIndex: 10, textAlign: "center" }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid rgba(163, 201, 255, 0.2)",
              borderTopColor: "#a3c9ff",
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
          className="glass-panel corner-accent"
          style={{
            width: 420, maxWidth: "92vw",
            borderRadius: 16,
            padding: "36px 32px 28px",
            zIndex: 10,
            position: "relative",
          }}
        >
          {/* System status badge */}
          <div
            className="shimmer-btn"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "5px 14px 5px 12px",
              borderRadius: 20,
              background: "rgba(0, 59, 109, 0.35)",
              border: "1px solid rgba(163, 201, 255, 0.15)",
              marginBottom: 20,
              fontSize: 11,
              color: "#00dbe7",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00dbe7", display: "inline-block", animation: "pulse 2s infinite" }} />
            System Online · v{APP_VERSION.replace("V", "")}
          </div>

          {/* Title */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: "#e2e2e6",
              letterSpacing: 1, marginBottom: 4,
              fontFamily: "'Hanken Grotesk', 'Noto Sans SC', sans-serif",
            }}>
              经侦大队
            </h1>
            <p style={{ fontSize: 13, color: "#c2c6d0", fontWeight: 400 }}>
              工作记录管理系统 · 登录
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    padding: "8px 12px", borderRadius: 8,
                    background: "rgba(255, 75, 75, 0.12)",
                    border: "1px solid rgba(255, 75, 75, 0.25)",
                    color: "#ffb4ab", fontSize: 12,
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Account */}
            <div style={{ position: "relative" }}>
              <User size={16} color="#8c919a" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
              <input
                value={account}
                onChange={e => setAccount(e.target.value)}
                placeholder="账号"
                style={{
                  width: "100%", height: 46,
                  paddingLeft: 40, paddingRight: 14,
                  background: "rgba(12, 14, 17, 0.8)",
                  border: "1.5px solid #42474f",
                  borderRadius: 10, fontSize: 13.5, color: "#e2e2e6",
                  outline: "none", transition: "border-color .25s, box-shadow .25s",
                  fontFamily: "inherit", boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#a3c9ff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(163, 201, 255, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#42474f";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div style={{ position: "relative" }}>
              <Lock size={16} color="#8c919a" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码"
                style={{
                  width: "100%", height: 46,
                  paddingLeft: 40, paddingRight: 38,
                  background: "rgba(12, 14, 17, 0.8)",
                  border: "1.5px solid #42474f",
                  borderRadius: 10, fontSize: 13.5, color: "#e2e2e6",
                  outline: "none", transition: "border-color .25s, box-shadow .25s",
                  fontFamily: "inherit", boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#a3c9ff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(163, 201, 255, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#42474f";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((p) => !p)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  padding: 4, display: "flex", alignItems: "center",
                }}
              >
                {showPwd ? <EyeOff size={15} color="#8c919a" /> : <Eye size={15} color="#8c919a" />}
              </button>
            </div>

            {/* Remember options */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#c2c6d0", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={rememberAccount}
                  onChange={(e) => {
                    setRememberAccount(e.target.checked);
                    if (!e.target.checked && !remember) {
                      localStorage.removeItem(STORAGE_KEY);
                    }
                  }}
                  style={{ accentColor: "#a3c9ff" }}
                />
                记住用户名
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#c2c6d0", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => handleRememberChange(e.target.checked)}
                  style={{ accentColor: "#a3c9ff" }}
                />
                记住密码
              </label>
              {remember && (
                <motion.label
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  style={{ display: "flex", alignItems: "center", gap: 6, color: "#c2c6d0", cursor: "pointer", overflow: "hidden" }}
                >
                  <input
                    type="checkbox"
                    checked={autoLogin}
                    onChange={(e) => setAutoLogin(e.target.checked)}
                    style={{ accentColor: "#a3c9ff" }}
                  />
                  自动登录（下次打开直接进入系统）
                </motion.label>
              )}
            </motion.div>

            {/* Register link */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 12 }}>
              <button
                type="button"
                onClick={onRegister}
                style={{
                  background: "none", border: "none",
                  color: "#a3c9ff", cursor: "pointer",
                  fontSize: 12, fontFamily: "inherit",
                }}
              >
                注册账号
              </button>
            </div>

            {/* Submit button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="shimmer-btn"
              style={{
                height: 48,
                background: "linear-gradient(135deg, #003b6d, #0a5090)",
                color: "#e2e2e6",
                border: "1px solid rgba(163, 201, 255, 0.15)",
                borderRadius: 10, fontSize: 15, fontWeight: 600,
                letterSpacing: 4, cursor: loading ? "not-allowed" : "pointer",
                position: "relative", overflow: "hidden",
                fontFamily: "inherit",
                opacity: loading ? 0.8 : 1,
                boxShadow: "0 4px 16px rgba(0, 59, 109, 0.3)",
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>
                {loading ? "登录中..." : "登 录 系 统"}
              </span>
            </motion.button>
          </form>

          {/* Footer */}
          <div style={{
            textAlign: "center", marginTop: 22, paddingTop: 16,
            borderTop: "1px solid rgba(66, 71, 79, 0.5)",
            fontSize: 10.5, color: "#8c919a", lineHeight: 1.8,
          }}>
            <div>版本 {APP_VERSION} · 技术支持：陈洪涛</div>
            <div>经侦大队日常工作记录管理</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
              Copyright 2026 All Rights Reserved.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

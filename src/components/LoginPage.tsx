import { useState, useEffect, useCallback, useRef } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { APP_VERSION } from "../version";

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

/* ---- Current time hook ---- */
function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
}

/* ---- Current DateTime display ---- */
function DateTimeDisplay() {
  const now = useCurrentTime();
  const days = ["日","一","二","三","四","五","六"];
  const y = now.getFullYear();
  const mo = String(now.getMonth()+1).padStart(2,"0");
  const d = String(now.getDate()).padStart(2,"0");
  const day = days[now.getDay()];
  const h = String(now.getHours()).padStart(2,"0");
  const mi = String(now.getMinutes()).padStart(2,"0");
  const s = String(now.getSeconds()).padStart(2,"0");
  return (
    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#c2c6d0" }}>
      {y}-{mo}-{d} 周{day} {h}:{mi}:{s}
    </span>
  );
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
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
    setTimeout(() => {
      setLoading(false);
      saveCredentials({ account, password, rememberAccount: rememberAccount||remember, remember, autoLogin });
      onLogin(account, "用户");
    }, 600);
  };

  const handleRememberChange = (checked: boolean) => {
    setRemember(checked);
    if (checked) setRememberAccount(true);
    if (!checked) setAutoLogin(false);
  };

  if (!ready) return null;

  const inputBase: React.CSSProperties = {
    width: "100%", height: 46, paddingLeft: 40, paddingRight: 14,
    background: "rgba(12,14,17,0.8)", border: "1.5px solid #42474f",
    borderRadius: 10, fontSize: 13.5, color: "#e2e2e6",
    outline: "none", transition: "border-color .25s, box-shadow .25s",
    fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        position: "relative", overflow: "auto",
        fontFamily: "'Noto Sans SC','Microsoft YaHei','PingFang SC',sans-serif",
        cursor: "none",
        background: "#111316",
        backgroundImage: [
          "radial-gradient(rgba(0, 59, 109, 0.25) 1px, transparent 1px)",
          "linear-gradient(to right, rgba(0, 59, 109, 0.06) 1px, transparent 1px)",
          "linear-gradient(to bottom, rgba(0, 59, 109, 0.06) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "32px 32px, 128px 128px, 128px 128px",
      }}
    >
      {/* Scanline overlay */}
      <div className="scanline-overlay" />

      {/* Custom cursor */}
      <div style={{ position:"fixed", width:20, height:20, border:"1px solid #00dbe7", borderRadius:"50%", pointerEvents:"none", zIndex:9999, transform:"translate(-50%,-50%)", transition:"transform 0.1s ease" }} id="cursor" />
      <div style={{ position:"fixed", width:4, height:4, background:"#00dbe7", borderRadius:"50%", pointerEvents:"none", zIndex:9999, transform:"translate(-50%,-50%)" }} id="cursor-dot" />

      {/* Main Content */}
      <main style={{ flex:1, padding:"32px", maxWidth:1440, margin:"0 auto", width:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", zIndex:10 }}>

        {/* Hero Section */}
        <section style={{ width:"100%", display:"flex", flexDirection:"row", alignItems:"center", justifyContent:"space-between", gap:48, marginBottom:80, marginTop:40, flexWrap:"wrap" }}>

          {/* Left: Welcome text + Login form */}
          <div style={{ maxWidth:520, textAlign:"left" }}>
            {/* System Online badge */}
            <motion.div
              initial={{ opacity:0, y:-10 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.1, duration:0.6, ease:[0.22,1,0.36,1] }}
              className="shimmer-btn"
              style={{
                display:"inline-flex", alignItems:"center", gap:7,
                padding:"5px 14px 5px 12px", borderRadius:20,
                background:"rgba(0,59,109,0.35)", border:"1px solid rgba(163,201,255,0.15)",
                marginBottom:24, fontSize:11,
                color:"#00dbe7", fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:"0.08em", textTransform:"uppercase",
              }}
            >
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#00dbe7", display:"inline-block", animation:"pulse 2s infinite" }} />
              System Online &middot; v{APP_VERSION.replace("V","")}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.2, duration:0.7, ease:[0.22,1,0.36,1] }}
              style={{
                fontFamily:"'Hanken Grotesk','Noto Sans SC',sans-serif",
                fontSize:48, fontWeight:700, lineHeight:1.2,
                color:"#e2e2e6", marginBottom:24, letterSpacing:"-0.02em",
              }}
            >
              欢迎进入<br/>
              <span style={{ color:"#a3c9ff" }}>经侦大队工作记录管理系统</span>
            </motion.h2>

            <motion.p
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.3, duration:0.7, ease:[0.22,1,0.36,1] }}
              style={{ fontSize:16, lineHeight:1.6, color:"#c2c6d0", marginBottom:36, maxWidth:480 }}
            >
              系统已就绪。记录每一刻的成长，打造个人高效工作流。
              专为追求极致精准的专业人员设计的本地化日志记录系统。
            </motion.p>

            {/* Login Form */}
            <motion.form
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.4, duration:0.7, ease:[0.22,1,0.36,1] }}
              onSubmit={handleSubmit}
              style={{ display:"flex", flexDirection:"column", gap:14, maxWidth:400 }}
            >
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity:0, height:0 }}
                    animate={{ opacity:1, height:"auto" }}
                    exit={{ opacity:0, height:0 }}
                    style={{ padding:"8px 12px", borderRadius:8, background:"rgba(255,75,75,0.12)", border:"1px solid rgba(255,75,75,0.25)", color:"#ffb4ab", fontSize:12 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Account input */}
              <div style={{ position:"relative" }}>
                <User size={16} color="#8c919a" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", zIndex:1 }} />
                <input
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  placeholder="账号"
                  style={inputBase}
                  onFocus={e => { e.target.style.borderColor="#a3c9ff"; e.target.style.boxShadow="0 0 0 3px rgba(163,201,255,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor="#42474f"; e.target.style.boxShadow="none"; }}
                />
              </div>

              {/* Password input */}
              <div style={{ position:"relative" }}>
                <Lock size={16} color="#8c919a" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", zIndex:1 }} />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="密码"
                  style={{ ...inputBase, paddingRight:38 }}
                  onFocus={e => { e.target.style.borderColor="#a3c9ff"; e.target.style.boxShadow="0 0 0 3px rgba(163,201,255,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor="#42474f"; e.target.style.boxShadow="none"; }}
                />
                <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                  {showPwd ? <EyeOff size={15} color="#8c919a" /> : <Eye size={15} color="#8c919a" />}
                </button>
              </div>

              {/* Checkboxes */}
              <div style={{ display:"flex", gap:16, fontSize:12, color:"#c2c6d0", flexWrap:"wrap" }}>
                <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}>
                  <input type="checkbox" checked={rememberAccount} onChange={e => { setRememberAccount(e.target.checked); if(!e.target.checked && !remember) localStorage.removeItem(STORAGE_KEY); }} style={{ accentColor:"#a3c9ff" }} />
                  记住账号
                </label>
                <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}>
                  <input type="checkbox" checked={remember} onChange={e => handleRememberChange(e.target.checked)} style={{ accentColor:"#a3c9ff" }} />
                  记住密码
                </label>
                {remember && (
                  <motion.label initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}>
                    <input type="checkbox" checked={autoLogin} onChange={e => setAutoLogin(e.target.checked)} style={{ accentColor:"#a3c9ff" }} />
                    自动登录
                  </motion.label>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:4 }}>
                <motion.button
                  type="submit"
                  whileHover={{ scale:1.01 }}
                  whileTap={{ scale:0.98 }}
                  disabled={loading}
                  className="shimmer-btn"
                  style={{
                    flex:1, height:48,
                    background:"linear-gradient(135deg,#003b6d,#0a5090)",
                    color:"#e2e2e6", border:"1px solid rgba(163,201,255,0.15)",
                    borderRadius:10, fontSize:15, fontWeight:600,
                    letterSpacing:4, cursor:loading?"not-allowed":"pointer",
                    position:"relative", overflow:"hidden",
                    fontFamily:"inherit", opacity:loading?0.8:1,
                    boxShadow:"0 4px 16px rgba(0,59,109,0.3)",
                  }}
                >
                  <span style={{ position:"relative", zIndex:1 }}>{loading ? "登录中..." : "登 录 系 统"}</span>
                </motion.button>
                <button type="button" onClick={onRegister} style={{ background:"none", border:"none", color:"#a3c9ff", cursor:"pointer", fontSize:12, fontFamily:"inherit", whiteSpace:"nowrap" }}>
                  注册账号
                </button>
              </div>
            </motion.form>
          </div>

          {/* Right: Logo + 欢迎使用 panel */}
          <motion.div
            initial={{ opacity:0, scale:0.95 }}
            animate={{ opacity:1, scale:1 }}
            transition={{ delay:0.5, duration:0.7, ease:[0.22,1,0.36,1] }}
            style={{ position:"relative", maxWidth:480, width:"100%" }}
          >
            {/* Logo image */}
            <div style={{ position:"relative", zIndex:10, textAlign:"center" }}>
              <img
                alt="System Logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCD7giNZgPNRriHQbRUywupsZnEQ5iplcizEkCe1zScsriPFITdX_VYiOkA0qJMGk1IhA1QqVYT8lGNw5A8fZbraZ7M-OU3MXFU-9608WToRI0iDMaKaOvu07u2SJqhRoQPKfGinQ_RpLfa1C9NSHnjoI__uj-5bBo1_W_km1RApKKqn15ZAOuY1eW-4582BpAZ9eXQAUuheUchG29XDLb7aL1UmS3JAfTDW_rJuWtumIy5LrK6iPgdHt037ZFpwaJONXiuOOBfLK5I"
                style={{ width:"80%", maxWidth:350, filter:"drop-shadow(0 0 50px rgba(0,59,109,0.6))", display:"block", margin:"0 auto" }}
              />
            </div>

            {/* 纪律警示文字 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1.5 }}
              style={{
                marginTop: -20,
                textAlign: "center",
                position: "relative",
                zIndex: 10,
              }}
            >
              <motion.div
                animate={{ opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  fontSize: 11,
                  lineHeight: 1.9,
                  color: "rgba(194, 198, 208, 0.2)",
                  fontFamily: "'JetBrains Mono','Noto Sans SC',monospace",
                  letterSpacing: "0.05em",
                  maxWidth: 380,
                  margin: "0 auto",
                  userSelect: "none",
                }}
              >
                严禁工作日早、中午饮酒
                <br/>严禁酒后执行公务
                <br/>严禁安保、执法期间饮酒
                <br/>严禁携警械、涉密文件、着警服饮酒
                <br/>严禁在公安内部场所饮酒
                <br/>严禁参加影响公正履职酒局
                <br/>严禁酗酒滋事
                <br/>严禁其他涉酒违纪行为。
              </motion.div>
            </motion.div>

            {/* 欢迎使用 panel */}
            <motion.div
              initial={{ opacity:0, x:20 }}
              animate={{ opacity:1, x:0 }}
              transition={{ delay:0.6, duration:0.6 }}
              className="glass-panel"
              style={{
                position:"absolute", top:-20, right:-20, zIndex:20,
                padding:"16px 20px", borderRadius:12,
                border:"1px solid rgba(0,219,231,0.3)",
                animation:"float 6s ease-in-out infinite",
              }}
            >
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#00dbe7", display:"inline-block", animation:"pulse 2s infinite" }} />
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#00dbe7", letterSpacing:"0.08em", textTransform:"uppercase" }}>
                    欢迎使用
                  </span>
                </div>
                <div style={{ fontSize:28, fontWeight:700, color:"#e2e2e6", fontFamily:"'Hanken Grotesk',sans-serif" }}>
                  {now.getHours().toString().padStart(2,"0")}:{now.getMinutes().toString().padStart(2,"0")}
                </div>
                <span style={{ fontSize:11, color:"#c2c6d0", fontFamily:"'JetBrains Mono',monospace" }}>
                  系统运行中
                </span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Feature Cards */}
        <section style={{ width:"100%", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:80 }}>
          {[
            { icon:"\u26A1", title:"快速录入", desc:"毫秒级响应，支持快捷键触发。专为高压环境下的瞬间灵感捕捉而设计。", accent:"#a3c9ff" },
            { icon:"\uD83D\uDCCA", title:"深度分析", desc:"自动生成周报与月报。基于本地算法的个人产出可视化，洞察每一项任务的耗时分布。", accent:"#00dbe7" },
            { icon:"\uD83D\uDD12", title:"本地加密", desc:"数据存储于本地，多重加密保护。完全脱离云端，确保绝对的数据隐私与主权。", accent:"#e9c349" },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.7+i*0.12, duration:0.6, ease:[0.22,1,0.36,1] }}
              className="glass-panel corner-accent"
              style={{ padding:28, borderRadius:12, position:"relative" }}
            >
              <div style={{ width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,59,109,0.2)", borderRadius:10, marginBottom:20, fontSize:24, transition:"transform .2s" }}>
                {card.icon}
              </div>
              <h3 style={{ fontFamily:"'Hanken Grotesk','Noto Sans SC',sans-serif", fontSize:20, fontWeight:600, color:"#e2e2e6", marginBottom:10 }}>{card.title}</h3>
              <p style={{ fontSize:14, lineHeight:1.6, color:"#c2c6d0" }}>{card.desc}</p>
            </motion.div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        background:"rgba(12,14,17,0.8)", backdropFilter:"blur(12px)",
        borderTop:"1px solid #42474f",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"14px 32px", width:"100%", position:"fixed", bottom:0, zIndex:50,
      }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#e2e2e6" }}>
          &copy; 2026 陈洪涛 &mdash; Economic Investigation Work Log Registration System
        </div>
        <div>
          <DateTimeDisplay />
        </div>
      </footer>

      {/* Custom cursor JS */}
      <script
        dangerouslySetInnerHTML={{
          __html: "document.addEventListener('mousemove',function(e){var c=document.getElementById('cursor');var d=document.getElementById('cursor-dot');if(c){c.style.left=e.clientX+'px';c.style.top=e.clientY+'px'}if(d){d.style.left=e.clientX+'px';d.style.top=e.clientY+'px'}});document.addEventListener('mousedown',function(e){var p=document.createElement('div');p.style.cssText='position:fixed;border:1px solid #00dbe7;border-radius:50%;pointer-events:none;z-index:9998;animation:radar-out 1s ease-out forwards;left:'+e.clientX+'px;top:'+e.clientY+'px';document.body.appendChild(p);setTimeout(function(){p.remove()},1000);var c=document.getElementById('cursor');if(c)c.style.transform='translate(-50%,-50%) scale(0.8)'});document.addEventListener('mouseup',function(){var c=document.getElementById('cursor');if(c)c.style.transform='translate(-50%,-50%) scale(1)'});"
        }}
      />
    </div>
  );
}

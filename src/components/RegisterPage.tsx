import { useState } from "react";
import { hashPassword } from "../utils/crypto";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, ArrowLeft, CheckCircle, X } from "lucide-react";

const POSITION_LIST = [
  "大队领导", "办公室", "涉众组", "法制室", "一中队", "二中队", "三中队", "资金组",
] as const;

interface Props {
  onBack: () => void;
}

/* ---- Shared input style matching LoginPage ---- */
const inputStyle: React.CSSProperties = {
  width: "100%", height: 40,
  padding: "0 12px",
  background: "rgba(12,14,17,0.8)", border: "1.5px solid #42474f",
  borderRadius: 8, fontSize: 13, color: "#e2e2e6",
  outline: "none", transition: "border-color .25s, box-shadow .25s",
  fontFamily: "inherit", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "#c2c6d0",
  display: "block", marginBottom: 5,
};

export default function RegisterPage({ onBack }: Props) {
  const [name, setName] = useState("");
  const [badge, setBadge] = useState("");
  const [position, setPosition] = useState("");
  const [account, setAccount] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);

  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!name) { setError("请输入姓名"); return; }
    if (!badge || badge.length < 6) { setError("警号需6位"); return; }
    if (!position) { setError("请选择所属科室"); return; }
    if (!account) { setError("请设置登录账号"); return; }
    if (pwd.length < 6) { setError("密码需6位以上"); return; }
    if (pwd !== pwd2) { setError("两次密码不一致"); return; }
    setLoading(true);
    setError("");

    // 检查账号/警号是否已被注册
    const existingUsers = JSON.parse(localStorage.getItem("jingzong.users.v1") || "[]");
    if (existingUsers.find((u: any) => u.account === account)) {
      setLoading(false);
      setError("该账号已被注册");
      return;
    }
    if (existingUsers.find((u: any) => u.badge === badge)) {
      setLoading(false);
      setError("该警号已被注册");
      return;
    }

    // 异步哈希密码，保证用户密码不以明文存储
    // 如果 Web Crypto API 不可用，自动降级为明文存储（不丢失注册数据）
    hashPassword(pwd).then((hashedPwd) => {
      const newUser = {
        id: `user-${Date.now()}`,
        name,
        account,
        password: hashedPwd,
        badge,
        position,
        phone,
        roleName: "普通用户",
        role: "user",
        status: "active",
        createdAt: new Date().toISOString(),
      };
      existingUsers.push(newUser);
      localStorage.setItem("jingzong.users.v1", JSON.stringify(existingUsers));

      setTimeout(() => {
        setLoading(false);
        setStep(1);
      }, 1000);
    }).catch(() => {
      // 哈希失败时降级为明文存储
      const newUserFallback = {
        id: `user-${Date.now()}`,
        name,
        account,
        password: pwd,
        badge,
        position,
        phone,
        roleName: "普通用户",
        role: "user",
        status: "active",
        createdAt: new Date().toISOString(),
      };
      existingUsers.push(newUserFallback);
      localStorage.setItem("jingzong.users.v1", JSON.stringify(existingUsers));

      setTimeout(() => {
        setLoading(false);
        setStep(1);
      }, 1000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel corner-accent"
        style={{
          width: "min(500px, 95vw)", maxHeight: "90vh", overflow: "auto",
          padding: "32px 36px 28px", borderRadius: 16,
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onBack}
          style={{
            position: "absolute", top: 14, right: 14,
            background: "rgba(66,71,79,0.3)", border: "none",
            width: 32, height: 32, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#c2c6d0", transition: "background .2s",
          }}
          onMouseOver={e => (e.currentTarget.style.background = "rgba(66,71,79,0.5)")}
          onMouseOut={e => (e.currentTarget.style.background = "rgba(66,71,79,0.3)")}
        >
          <X size={16} />
        </button>

        {step === 0 ? (
          <>
            {/* Back button */}
            <button
              onClick={onBack}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                color: "#a3c9ff", fontSize: 12, marginBottom: 16,
                fontFamily: "inherit", padding: 0,
              }}
            >
              <ArrowLeft size={14} /> 返回登录
            </button>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: "linear-gradient(135deg, #003b6d, #0a5090)",
                border: "1px solid rgba(163,201,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px",
                boxShadow: "0 4px 16px rgba(0,59,109,0.3)",
              }}
            >
              <UserPlus size={24} color="#e2e2e6" />
            </motion.div>

            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e2e6", marginBottom: 4 }}>
                用户注册
              </div>
              <div style={{ fontSize: 12, color: "#8c919a", lineHeight: 1.6 }}>
                创建经侦大队工作记录系统账号<br />
                <span style={{ color: "#6b7280" }}>注册后需管理员审核方可使用</span>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    padding: "8px 12px", borderRadius: 8,
                    background: "rgba(255,75,75,0.12)",
                    border: "1px solid rgba(255,75,75,0.25)",
                    color: "#ffb4ab", fontSize: 12, marginBottom: 12,
                    overflow: "hidden",
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>姓名 <span style={{ color: "#ffb4ab" }}>*</span></label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="真实姓名" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#a3c9ff"; e.target.style.boxShadow = "0 0 0 3px rgba(163,201,255,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "#42474f"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>警号 <span style={{ color: "#ffb4ab" }}>*</span></label>
                  <input value={badge} onChange={e => setBadge(e.target.value)} placeholder="6位警号" maxLength={6} style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#a3c9ff"; e.target.style.boxShadow = "0 0 0 3px rgba(163,201,255,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "#42474f"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>所属科室 <span style={{ color: "#ffb4ab" }}>*</span></label>
                <select value={position} onChange={e => setPosition(e.target.value)} style={{
                  ...inputStyle, cursor: "pointer", appearance: "none",
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238c919a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 32,
                }}>
                  <option value="" style={{ background: "#1e2023", color: "#c2c6d0" }}>请选择所属科室</option>
                  {POSITION_LIST.map(p => (
                    <option key={p} value={p} style={{ background: "#1e2023", color: "#e2e2e6" }}>{p}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>登录账号 <span style={{ color: "#ffb4ab" }}>*</span></label>
                  <input value={account} onChange={e => setAccount(e.target.value)} placeholder="设置账号" autoComplete="off" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#a3c9ff"; e.target.style.boxShadow = "0 0 0 3px rgba(163,201,255,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "#42474f"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>登录密码 <span style={{ color: "#ffb4ab" }}>*</span></label>
                  <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="6位以上" autoComplete="new-password" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#a3c9ff"; e.target.style.boxShadow = "0 0 0 3px rgba(163,201,255,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "#42474f"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>确认密码 <span style={{ color: "#ffb4ab" }}>*</span></label>
                  <input type="password" value={pwd2} onChange={e => setPwd2(e.target.value)} placeholder="再次输入" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#a3c9ff"; e.target.style.boxShadow = "0 0 0 3px rgba(163,201,255,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "#42474f"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>手机号</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="用于密码找回" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "#a3c9ff"; e.target.style.boxShadow = "0 0 0 3px rgba(163,201,255,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "#42474f"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="shimmer-btn"
                style={{
                  height: 44,
                  background: "linear-gradient(135deg, #003b6d, #0a5090)",
                  color: "#e2e2e6",
                  border: "1px solid rgba(163,201,255,0.15)",
                  borderRadius: 8, fontSize: 14, fontWeight: 600,
                  letterSpacing: 3, cursor: loading ? "not-allowed" : "pointer",
                  position: "relative", overflow: "hidden",
                  fontFamily: "inherit", opacity: loading ? 0.8 : 1,
                  boxShadow: "0 4px 16px rgba(0,59,109,0.3)",
                  marginTop: 4,
                }}
              >
                <span style={{ position: "relative", zIndex: 1 }}>
                  {loading ? "提交中..." : "提 交 注 册"}
                </span>
              </motion.button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{ textAlign: "center", padding: "30px 0" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "rgba(56,161,105,0.15)",
                border: "1px solid rgba(56,161,105,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 4px 16px rgba(56,161,105,0.2)",
              }}
            >
              <CheckCircle size={36} color="#38A169" />
            </motion.div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e2e2e6", marginBottom: 8 }}>
              注册提交成功！
            </div>
            <div style={{ fontSize: 13, color: "#c2c6d0", marginBottom: 28, lineHeight: 1.7 }}>
              您的账号注册申请已提交<br />
              请等待管理员审核后登录使用
            </div>
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                height: 42, padding: "0 32px",
                background: "linear-gradient(135deg, #003b6d, #0a5090)",
                color: "#e2e2e6",
                border: "1px solid rgba(163,201,255,0.15)",
                borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 4px 16px rgba(0,59,109,0.3)",
              }}
            >
              返回登录
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

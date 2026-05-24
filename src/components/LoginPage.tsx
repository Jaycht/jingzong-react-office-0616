import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { APP_VERSION } from '../version';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

export default function LoginPage({ onLogin, onRegister }: Props) {
  const [account, setAccount] = useState('zhangming');
  const [password, setPassword] = useState('123456');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);

  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!account || !password) { setError('请输入账号和密码'); return; }
    setLoading(true);
    setError('');
    setTimeout(() => {
      setLoading(false);
      if (account === 'zhangming' && password === '123456') onLogin();
      else setError('账号或密码错误，请重新输入');
    }, 900);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1B5E9B 0%, #2E7DCA 55%, #4A90D9 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated background circles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute', borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }}
          initial={{ width: 200 + i * 120, height: 200 + i * 120, opacity: 0.3 }}
          animate={{ width: [200 + i * 120, 300 + i * 120, 200 + i * 120], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
        />
      ))}

      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '32px 32px', pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: '#fff', borderRadius: 20, padding: '44px 44px 36px',
          width: 440, maxWidth: '95vw', position: 'relative', zIndex: 1,
          boxShadow: '0 8px 40px rgba(0,0,0,.2), 0 2px 8px rgba(0,0,0,.1)',
        }}
      >
        {/* 软件 Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            width: 160, height: 160,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px',
          }}
        >
          <img
            src="/ECID1.png"
            alt="经侦大队工作记录管理系统"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ textAlign: 'center', marginBottom: 28 }}
        >
          <div style={{ fontSize: 21, fontWeight: 700, color: '#0F3A5F', letterSpacing: 2, marginBottom: 6 }}>
            经侦大队工作记录管理系统
          </div>
          <div style={{ fontSize: 11.5, color: '#6B7280', letterSpacing: 1.5, fontWeight: 500 }}>
            Economic Investigation Work Log Registration System
          </div>
        </motion.div>

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: '#FFF5F5', border: '1px solid #FED7D7',
                  borderRadius: 8, padding: '9px 13px',
                  display: 'flex', alignItems: 'center', gap: 7,
                  fontSize: 12.5, color: '#D32F2F', overflow: 'hidden',
                }}
              >
                <ShieldCheck size={14} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Account */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
          >
            <label style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>用户账号 <span style={{ color: '#D32F2F' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <User size={14} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={account} onChange={e => setAccount(e.target.value)}
                style={{ width: '100%', height: 42, paddingLeft: 38, paddingRight: 12, border: '1.5px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', transition: 'border-color .2s', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#2E7DCA', e.target.style.boxShadow = '0 0 0 3px rgba(46,125,202,.13)')}
                onBlur={e => (e.target.style.borderColor = '#D1D5DB', e.target.style.boxShadow = 'none')}
                placeholder="请输入账号"
              />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
          >
            <label style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>登录密码 <span style={{ color: '#D32F2F' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', height: 42, paddingLeft: 38, paddingRight: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', transition: 'border-color .2s', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#2E7DCA', e.target.style.boxShadow = '0 0 0 3px rgba(46,125,202,.13)')}
                onBlur={e => (e.target.style.borderColor = '#D1D5DB', e.target.style.boxShadow = 'none')}
                placeholder="请输入密码"
              />
              <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                {showPwd ? <EyeOff size={15} color="#9CA3AF" /> : <Eye size={15} color="#9CA3AF" />}
              </button>
            </div>
          </motion.div>



          {/* Options */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6B7280', cursor: 'pointer' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#1B5E9B' }} />
              记住密码
            </label>
            <button type="button" onClick={onRegister} style={{ background: 'none', border: 'none', color: '#2E7DCA', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', textDecoration: 'none' }}>
              注册账号？
            </button>
          </motion.div>

          {/* Submit */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.01, boxShadow: '0 4px 16px rgba(27,94,155,.3)' }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            style={{
              height: 46, background: 'linear-gradient(135deg, #1B5E9B, #2E7DCA)',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
              letterSpacing: 3, cursor: loading ? 'not-allowed' : 'pointer',
              position: 'relative', overflow: 'hidden', fontFamily: 'inherit',
              opacity: loading ? 0.85 : 1,
            }}
          >
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
                    animation: 'shimmer 1.4s infinite',
                  }}
                />
              )}
            </AnimatePresence>
            <span style={{ position: 'relative', zIndex: 1 }}>
              {loading ? '登录中...' : '登 录 系 统'}
            </span>
          </motion.button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #E5E7EB', fontSize: 11, color: '#9CA3AF', lineHeight: 1.7 }}>
          <div>版本 {APP_VERSION} &nbsp;·&nbsp; 技术支持：陈洪涛</div>
          <div>本系统用于经侦大队日常工作记录、岗位台账、案件流转、附件归档和数据导出备份管理。</div>
          <div>Copyright © 2026 经侦大队工作记录管理系统. All Rights Reserved.</div>
        </div>
      </motion.div>

      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
    </div>
  );
}

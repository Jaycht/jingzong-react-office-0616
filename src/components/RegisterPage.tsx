import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, ArrowLeft, CheckCircle } from 'lucide-react';

const POSITION_LIST = [
  '大队领导', '办公室', '涉众办', '法制室', '一中队', '二中队', '三中队',
] as const;

interface Props { onBack: () => void; }

export default function RegisterPage({ onBack }: Props) {
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('');
  const [position, setPosition] = useState('');
  const [account, setAccount] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);

  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!name) { setError('请输入姓名'); return; }
    if (!badge || badge.length < 6) { setError('警号需为6位'); return; }
    if (!position) { setError('请选择所属科室'); return; }
    if (!account) { setError('请设置登录账号'); return; }
    if (pwd.length < 6) { setError('密码需6位以上'); return; }
    if (pwd !== pwd2) { setError('两次密码不一致'); return; }
    setLoading(true);
    setError('');
    setTimeout(() => {
      setLoading(false);
      setStep(1);
    }, 1000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1B5E9B 0%, #2E7DCA 55%, #4A90D9 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#fff', borderRadius: 20, padding: '36px 40px',
          width: 460, maxWidth: '95vw', position: 'relative', zIndex: 1,
          boxShadow: '0 8px 40px rgba(0,0,0,.2)',
        }}
      >
        {step === 0 ? (
          <>
            {/* Back button */}
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', fontSize: 13, marginBottom: 20, fontFamily: 'inherit' }}>
              <ArrowLeft size={14} /> 返回登录
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #1B5E9B, #2E7DCA)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 4px 16px rgba(27,94,155,.3)' }}
            >
              <UserPlus size={26} color="#fff" />
            </motion.div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1B5E9B', marginBottom: 4 }}>用户注册</div>
              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
                创建经侦大队工作记录系统账号<br />
                <span style={{ color: '#9CA3AF' }}>注册后需管理员审核方可使用</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: '#D32F2F', marginBottom: 12, overflow: 'hidden' }}
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="姓名 *" value={name} onChange={setName} placeholder="真实姓名" />
                <Field label="警号 *" value={badge} onChange={v => setBadge(v)} placeholder="6位警号" maxLength={6} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', display: 'block', marginBottom: 5 }}>所属科室 <span style={{ color: '#D32F2F' }}>*</span></label>
                <select value={position} onChange={e => setPosition(e.target.value)} style={{ width: '100%', height: 38, padding: '0 10px', border: '1.5px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">请选择所属科室</option>
                  {POSITION_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="登录账号 *" value={account} onChange={setAccount} placeholder="设置账号" />
                <Field label="登录密码 *" value={pwd} onChange={setPwd} placeholder="6位以上" type="password" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="确认密码 *" value={pwd2} onChange={setPwd2} placeholder="再次输入" type="password" />
                <Field label="手机号" value={phone} onChange={setPhone} placeholder="用于密码找回" />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                style={{ height: 44, background: 'linear-gradient(135deg, #1B5E9B, #2E7DCA)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, letterSpacing: 2, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.8 : 1, marginTop: 4 }}
              >
                {loading ? '提交中...' : '提 交 注 册'}
              </motion.button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ textAlign: 'center', padding: '30px 0' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 16px rgba(56,161,105,.25)' }}
            >
              <CheckCircle size={36} color="#388E3C" />
            </motion.div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>注册提交成功！</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 28, lineHeight: 1.7 }}>
              您的账号注册申请已提交<br />
              请等待管理员审核后登录使用
            </div>
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ height: 42, padding: '0 32px', background: '#1B5E9B', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              返回登录
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', maxLength }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; maxLength?: number;
}) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', display: 'block', marginBottom: 5 }}>{label}</label>
      <input
        value={value}
        type={type}
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', height: 38, padding: '0 10px', border: '1.5px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
      />
    </div>
  );
}

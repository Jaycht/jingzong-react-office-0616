import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Landmark, User, KeyRound, LogOut } from 'lucide-react';
import { Dropdown, Modal, Form, Input, Select } from 'antd';
import { useApp } from '../App';
import Sidebar from './Sidebar';
import Dashboard from '../pages/Dashboard';
import CaseList from '../pages/CaseList';
import Statistics from '../pages/Statistics';
import SettingsPage from '../pages/SettingsPage';
import OperationLog from '../pages/OperationLog';
import ImportExport from '../pages/ImportExport';
import Backup from '../pages/Backup';
import Version from '../pages/Version';
import Attachments from '../pages/Attachments';
import PlaceholderPage from '../pages/PlaceholderPage';
import SquadCasePage from '../pages/SquadCasePage';
import ModulePage from '../pages/ModulePage';
import DrawerNewRecord from './DrawerNewRecord';
import ModalNewUser from './ModalNewUser';
import Drawer from './Drawer';

const PAGES: Record<string, React.FC> = {
  dashboard: Dashboard, caseList: CaseList, statistics: Statistics,
  settings: SettingsPage, operationLog: OperationLog,
  importExport: ImportExport, backup: Backup, version: Version,
  attachments: Attachments,
  interview: PlaceholderPage, meeting: PlaceholderPage, victim: PlaceholderPage,
  clue: PlaceholderPage, fund: PlaceholderPage, daily: PlaceholderPage,
  party: PlaceholderPage, report: PlaceholderPage, userSettings: PlaceholderPage,
  'legal-assessment': PlaceholderPage,
  'squad-case': SquadCasePage,
};

interface Props {
  modalId: string | null;
  closeModal: () => void;
  drawerOpen: boolean;
  closeDrawer: () => void;
}

export default function AppLayout({ modalId, closeModal, drawerOpen, closeDrawer }: Props) {
  const { currentPage, setCurrentPage, userName, userRole, showToast, logout, editRecord, setEditRecord } = useApp();
  const [searchVal, setSearchVal] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm] = Form.useForm();

  const Page = PAGES[currentPage] || ModulePage;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F0F2F5' }}>
      {/* Top Nav */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          height: 54, background: '#0F3A5F',
          display: 'flex', alignItems: 'center', padding: '0 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,.2)', flexShrink: 0, zIndex: 200,
          position: 'relative', gap: 16,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', flexShrink: 0 }}>
          <Landmark size={22} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, whiteSpace: 'nowrap' }}>经侦大队工作记录管理系统</span>
        </div>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 480, position: 'relative', margin: '0 24px' }}>
          <Search size={14} color="rgba(255,255,255,0.6)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="搜索工作记录、案件、受害人..."
            style={{
              width: '100%', height: 34, paddingLeft: 36, paddingRight: 12,
              borderRadius: 6, border: 'none', outline: 'none',
              background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 13,
              fontFamily: 'inherit', transition: 'background .2s', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.background = 'rgba(255,255,255,0.28)')}
            onBlur={e => (e.target.style.background = 'rgba(255,255,255,0.18)')}
          />
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>


          {/* User Dropdown */}
          <Dropdown
            menu={{
              items: [
                { key: 'profile', icon: <User size={13} />, label: '个人信息' },
                { key: 'password', icon: <KeyRound size={13} />, label: '修改密码' },
                { type: 'divider' },
                { key: 'logout', icon: <LogOut size={13} />, label: '退出登录', danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'profile') setProfileOpen(true);
                else if (key === 'password') setPasswordOpen(true);
                else if (key === 'logout') {
                  Modal.confirm({
                    title: '确认退出登录？',
                    content: '退出后需要重新登录。',
                    okText: '退出',
                    cancelText: '取消',
                    onOk: logout,
                  });
                }
              },
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <motion.div
              whileHover={{ background: 'rgba(255,255,255,0.15)' }}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 10px', borderRadius: 8, cursor: 'pointer' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#fff' }}>
                {userName[0]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{userName}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>{userRole}</span>
              </div>
            </motion.div>
          </Dropdown>
        </div>
      </motion.div>

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, overflowY: 'auto', padding: 22, background: '#F4F7FA' }} className="content-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Page />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modalId === 'newRecord' && (
          <DrawerNewRecord
            onClose={() => {
              closeModal();
              setEditRecord(null);
            }}
            editRecord={editRecord}
          />
        )}
        {modalId === 'newUser' && <ModalNewUser onClose={closeModal} />}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && <Drawer onClose={closeDrawer} />}
      </AnimatePresence>

      {/* 个人信息 Modal */}
      <Modal
        title="个人信息"
        open={profileOpen}
        onCancel={() => setProfileOpen(false)}
        footer={null}
        width={460}
        destroyOnClose
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="姓名" name="name" initialValue={userName}>
            <Input />
          </Form.Item>
          <Form.Item label="警号" name="badge">
            <Input placeholder="请输入警号" />
          </Form.Item>
          <Form.Item label="手机号" name="phone">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item label="所属科室" name="department">
            <Select
              placeholder="请选择所属科室"
              options={[
                { label: '大队领导', value: '大队领导' },
                { label: '办公室', value: '办公室' },
                { label: '涉众办', value: '涉众办' },
                { label: '法制室', value: '法制室' },
                { label: '一中队', value: '一中队' },
                { label: '二中队', value: '二中队' },
                { label: '三中队', value: '三中队' },
              ]}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button onClick={() => setProfileOpen(false)}
              style={{ height: 34, padding: '0 16px', background: '#fff', border: '1px solid #D8E1EA', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              取消
            </button>
            <button onClick={() => { showToast('个人信息已保存', 'success'); setProfileOpen(false); }}
              style={{ height: 34, padding: '0 16px', background: '#155A8A', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              保存
            </button>
          </div>
        </Form>
      </Modal>

      {/* 修改密码 Modal */}
      <Modal
        title="修改密码"
        open={passwordOpen}
        onCancel={() => setPasswordOpen(false)}
        footer={null}
        width={420}
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="原密码" name="oldPassword" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password placeholder="请输入原密码" />
          </Form.Item>
          <Form.Item label="新密码" name="newPassword" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button onClick={() => setPasswordOpen(false)}
              style={{ height: 34, padding: '0 16px', background: '#fff', border: '1px solid #D8E1EA', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              取消
            </button>
            <button
              onClick={() => {
                passwordForm.validateFields().then(() => {
                  showToast('密码修改成功', 'success');
                  passwordForm.resetFields();
                  setPasswordOpen(false);
                }).catch(() => {});
              }}
              style={{ height: 34, padding: '0 16px', background: '#155A8A', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
            >
              确认修改
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

import { Modal, Form, Input, Select } from 'antd';
import { useApp } from '../App';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ open, onClose }: Props) {
  const { userName, showToast } = useApp();

  return (
    <Modal title="个人信息" open={open} onCancel={onClose} footer={null} width={460} destroyOnClose>
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
          <button onClick={onClose}
            style={{ height: 34, padding: '0 16px', background: '#fff', border: '1px solid #D8E1EA', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            取消
          </button>
          <button onClick={() => { showToast('个人信息已保存', 'success'); onClose(); }}
            style={{ height: 34, padding: '0 16px', background: '#155A8A', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            保存
          </button>
        </div>
      </Form>
    </Modal>
  );
}

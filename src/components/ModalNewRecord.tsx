import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, DatePicker, Divider, Form, Input, InputNumber, Modal, Select, Space, Upload } from 'antd';
import { InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { useAppStore } from "../store/appStore"
import { findModule, type FieldDefinition } from '../moduleConfig';
import { useCustomModules } from '../customModules';

interface Props { onClose: () => void; }

export default function ModalNewRecord({ onClose }: Props) {
    const currentPage = useAppStore((s) => s.currentPage);
  const showToast = useAppStore((s) => s.showToast);
  const { allModules } = useCustomModules();
  const currentModule = useMemo(() => findModule(currentPage, allModules), [allModules, currentPage]);
  const [selectedModuleId, setSelectedModuleId] = useState(currentModule?.id || allModules[0]?.id || '');
  const [selectedTabId, setSelectedTabId] = useState(currentModule?.tabs[0]?.id || allModules[0]?.tabs[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [form] = Form.useForm();

  const handleClose = () => {
    if (isDirty) {
      Modal.confirm({
        title: '信息未保存',
        content: '您填写的记录信息尚未保存，确定要退出吗？',
        okText: '确定退出',
        cancelText: '继续填写',
        onOk: () => { setIsDirty(false); onClose(); },
      });
    } else {
      onClose();
    }
  };

  const selectedModule = findModule(selectedModuleId, allModules) || allModules[0];
  const selectedTab = selectedModule?.tabs.find((tab) => tab.id === selectedTabId) || selectedModule?.tabs[0];
  const fields = selectedTab?.fields || [];
  const expenseCategory = Form.useWatch('expenseCategory', form);
  const visibleFields = fields.filter((field) => isFieldVisible(field, expenseCategory));
  const showTemplateSelector = Boolean(selectedModule && !selectedModule.hideTemplateSelector && selectedModule.tabs.length > 1);
  const scopedModules = currentModule
    ? allModules.filter((module) => module.departmentId === currentModule.departmentId)
    : allModules;

  const handleModuleChange = (value: string) => {
    const nextModule = findModule(value, allModules);
    setSelectedModuleId(value);
    setSelectedTabId(nextModule?.tabs[0]?.id || '');
    form.resetFields();
    setIsDirty(false);
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      setSaving(true);
      setTimeout(() => {
        setSaving(false);
        setIsDirty(false);
        showToast(`${selectedModule.label} · ${selectedTab?.label || '记录'} 已创建`, 'success');
        onClose();
      }, 500);
    } catch {
      showToast('请补充必填字段', 'warning');
    }
  };

  return (
    <Modal
      open
      width={760}
      title="新建工作记录"
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>取消</Button>,
        <Button key="submit" type="primary" icon={<PlusOutlined />} loading={saving} onClick={handleSubmit}>创建记录</Button>,
      ]}
      styles={{ body: { paddingTop: 12 } }}
    >
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ background: '#F6F8FB', border: '1px solid #D8E1EA', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 6 }}>当前记录类型</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#172033' }}>{selectedModule?.departmentLabel} · {selectedModule?.label} · {selectedTab?.label}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{selectedModule?.description}</div>
        </div>

        <Form form={form} layout="vertical" requiredMark="optional" onValuesChange={() => setIsDirty(true)}>
          <div style={{ display: 'grid', gridTemplateColumns: showTemplateSelector ? '1fr 1fr' : '1fr', gap: 14 }}>
            <Form.Item label="所属模块" required>
              <Select value={selectedModuleId} onChange={handleModuleChange} showSearch optionFilterProp="label">
                {scopedModules.map((module) => (
                  <Select.Option key={module.id} value={module.id} label={`${module.departmentLabel} ${module.label}`}>
                    {module.departmentLabel} · {module.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {showTemplateSelector && (
              <Form.Item label="记录模板" required>
                <Select value={selectedTabId} onChange={(value) => { setSelectedTabId(value); form.resetFields(); }}>
                  {selectedModule?.tabs.map((tab) => (
                    <Select.Option key={tab.id} value={tab.id}>{tab.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
            {visibleFields.map((field) => (
              <div key={field.id} style={
                field.type === 'textarea' || field.type === 'attachment' || field.type === 'section'
                  ? { gridColumn: '1 / -1' }
                  : (['inquiryRecord', 'interrogationRecord', 'reception'].includes(field.id)
                    ? { gridColumn: 'span 2' }
                    : { gridColumn: 'span 3' })
              }>
                <DynamicField field={field} />
              </div>
            ))}
          </div>
        </Form>
      </motion.div>
    </Modal>
  );
}

function isFieldVisible(field: FieldDefinition, expenseCategory?: string) {
  if (field.id === 'caseName') return expenseCategory === '差旅费';
  if (field.id === 'fundCategory') return Boolean(expenseCategory && !['办公经费', '差旅费'].includes(expenseCategory));
  return true;
}

function DynamicField({ field }: { field: FieldDefinition }) {
  const rules = field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined;

  if (field.type === 'section') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 0 4px', marginTop: 8,
        borderBottom: '1px solid #D8E1EA',
      }}>
        <div style={{ width: 3, height: 18, background: '#155A8A', borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#172033' }}>{field.label}</span>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Form.Item name={field.id} label={field.label} rules={rules}>
        <Input.TextArea rows={4} placeholder={`请输入${field.label}`} />
      </Form.Item>
    );
  }

  if (field.type === 'date') {
    return (
      <Form.Item name={field.id} label={field.label} rules={rules}>
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
    );
  }

  if (field.type === 'number') {
    return (
      <Form.Item name={field.id} label={field.label} rules={rules}>
        <InputNumber style={{ width: '100%' }} placeholder={`请输入${field.label}`} />
      </Form.Item>
    );
  }

  if (field.type === 'select') {
    return (
      <Form.Item name={field.id} label={field.label} rules={rules}>
        <PersistedSelect field={field} />
      </Form.Item>
    );
  }

  if (field.type === 'attachment') {
    return (
      <Form.Item name={field.id} label={field.label} valuePropName="fileList">
        <Upload.Dragger beforeUpload={() => false} multiple>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">点击或拖拽附件到此处</p>
          <p className="ant-upload-hint">支持 PDF、Word、图片、压缩包等材料，当前为前端原型暂存。</p>
        </Upload.Dragger>
      </Form.Item>
    );
  }

  // 多人输入字段（可添加多条记录）
  if (['inquiryRecord', 'interrogationRecord', 'reception', 'evidenceObtained', 'fundFlowAnalysis', 'documentPreparation', 'coerciveMeasuresResult', 'closedClues', 'clueCheck', 'legalCoordination', 'stabilityWork', 'specialAction', 'publicityWork', 'otherWork'].includes(field.id)) {
    return <MultiPersonField field={field} />;
  }

  // 案件编号字段统一使用格式提示
  const customPlaceholder = field.id === 'caseNo'
    ? 'A3703231200002026******'
    : `请输入${field.label}`;
  return (
    <Form.Item name={field.id} label={field.label} rules={rules}>
      <Input placeholder={customPlaceholder} />
    </Form.Item>
  );
}

/* ===================== 多人输入 ===================== */

/** 三个姓名类字段(询问笔录/讯问笔录/接待报案/信访人)用compact窄框 */
const NAME_FIELDS = ['inquiryRecord', 'interrogationRecord', 'reception'];

function MultiPersonInput({ value, onChange, compact }: { value?: string; onChange?: (val: string) => void; compact?: boolean }) {
  const [items, setItems] = useState<string[]>(() => {
    if (!value) return [''];
    return value.split('、').filter(Boolean);
  });

  const sync = (next: string[]) => {
    setItems(next);
    onChange?.(next.filter(Boolean).join('、'));
  };

  const addItem = () => sync([...items, '']);
  const removeItem = (i: number) => {
    const next = items.filter((_, idx) => idx !== i);
    sync(next.length === 0 ? [''] : next);
  };
  const updateItem = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    sync(next);
  };

  const itemStyle: React.CSSProperties = compact
    ? { display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }
    : { display: 'flex', alignItems: 'center', gap: 2, width: '100%' };

  const inputStyle: React.CSSProperties = compact
    ? { width: 80, textAlign: 'center' as const }
    : { flex: 1, minWidth: 80 };

  return (
    <div style={{
      display: 'flex',
      flexDirection: compact ? 'row' : 'column',
      flexWrap: compact ? 'wrap' : undefined,
      gap: 8,
      alignItems: compact ? 'center' : 'stretch',
    }}>
      {items.map((item, i) => (
        <div key={i} style={itemStyle}>
          <Input value={item} onChange={(e) => updateItem(i, e.target.value)} style={inputStyle} />
          {items.length > 1 && (
            <div
              onClick={() => removeItem(i)}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#FEE2E2', color: '#DC2626',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                lineHeight: 1, flexShrink: 0,
              }}
              title="移除"
            >
              ×
            </div>
          )}
        </div>
      ))}
      <div
        onClick={addItem}
        style={{
          width: 32, height: 32, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px dashed #CBD5E1', color: '#64748B',
          fontSize: 20, fontWeight: 400, cursor: 'pointer',
          transition: 'all .15s', userSelect: 'none', flexShrink: 0,
          alignSelf: compact ? 'center' : 'flex-start',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#155A8A'; (e.currentTarget as HTMLDivElement).style.color = '#155A8A'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#CBD5E1'; (e.currentTarget as HTMLDivElement).style.color = '#64748B'; }}
        title="添加一项"
      >
        +
      </div>
    </div>
  );
}

function MultiPersonField({ field }: { field: FieldDefinition }) {
  const rules = field.required
    ? [{ required: true, message: `请填写${field.label}` }]
    : undefined;
  return (
    <Form.Item name={field.id} label={field.label} rules={rules}>
      <MultiPersonInput compact={NAME_FIELDS.includes(field.id)} />
    </Form.Item>
  );
}

function PersistedSelect({ field, value, onChange }: { field: FieldDefinition; value?: any; onChange?: (value: any) => void }) {
  const storageKey = field.customOptionKey ? `jingzong.selectOptions.${field.customOptionKey}` : '';
  const [newOption, setNewOption] = useState('');
  const [customOptions, setCustomOptions] = useState<string[]>(() => {
    if (!storageKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const options = Array.from(new Set([...(field.options || []), ...customOptions]));

  const saveCustomValue = (value: string) => {
    if (!storageKey) return;
    const normalized = value.trim();
    if (!normalized || options.includes(normalized)) return;
    setCustomOptions((prev) => {
      const next = Array.from(new Set([...prev, normalized]));
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    setNewOption('');
  };

  if (field.customOptionKey) {
    return (
      <Select
        value={value}
        onChange={onChange}
        showSearch
        placeholder={`请选择${field.label}`}
        options={options.map((option) => ({ label: option, value: option }))}
        dropdownRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: '8px 0' }} />
            <Space style={{ padding: '0 8px 8px', width: '100%' }}>
              <Input
                value={newOption}
                placeholder={`新增${field.label}`}
                onChange={(event) => setNewOption(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
              <Button type="primary" onClick={() => saveCustomValue(newOption)}>
                添加
              </Button>
            </Space>
          </>
        )}
      />
    );
  }

  return (
    <Select value={value} onChange={onChange} placeholder={`请选择${field.label}`} options={options.map((option) => ({ label: option, value: option }))} />
  );
}

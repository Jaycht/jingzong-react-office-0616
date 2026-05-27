import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Button, DatePicker, Form, Input, InputNumber,
  Modal, Select, Space, Upload,
} from 'antd';
import dayjs from 'dayjs';
import { InboxOutlined, PlusOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';

import { useUnsavedChanges } from '../utils/useUnsavedChanges';
import { useAppStore } from '../store/appStore';
import { findModule, type FieldDefinition } from '../moduleConfig';
import { useCustomModules } from '../customModules';
import { saveMassRecord, updateMassRecord } from '../store/massStore';
import ErrorBoundary from './ErrorBoundary';
import {
  CaseNameAutoComplete, CaseNameMatchClue, CaseNameMatchReport,
  CaseNameMatchSquad, CaseNoMatchSquad,
  MultiPersonField, PersistedSelect,
} from './SharedFormFields';
import { saveAttachment } from '../store/attachmentStore';

interface Props { onClose: () => void; editRecord?: import('../store/massStore').MassRecord | null; }

export default function DrawerNewRecord({ onClose, editRecord }: Props) {
  useUnsavedChanges(true);
  
    const currentPage = useAppStore((s) => s.currentPage);
  const showToast = useAppStore((s) => s.showToast);
  const { allModules } = useCustomModules();
  const currentModule = useMemo(() => findModule(currentPage, allModules), [allModules, currentPage]);
  const [selectedModuleId, setSelectedModuleId] = useState(
    editRecord?.moduleId || currentModule?.id || allModules[0]?.id || ''
  );
  const [selectedTabId, setSelectedTabId] = useState(
    editRecord?.tabId || currentModule?.tabs[0]?.id || allModules[0]?.tabs[0]?.id || ''
  );
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  const selectedModule = findModule(selectedModuleId, allModules) || allModules[0];
  const selectedTab = selectedModule?.tabs.find((tab) => tab.id === selectedTabId) || selectedModule?.tabs[0];
  const allFields = useMemo(() => selectedTab?.fields ?? [], [selectedTab]);

  // Build steps from section fields
  const steps = useMemo(() => {
    const sections: { label: string; fields: FieldDefinition[]; repeatable?: boolean; listName?: string }[] = [];
    let buffer: FieldDefinition[] = [];
    let label = '基本信息';
    let repeatable = false;
    let listName: string | undefined;
    for (const f of allFields) {
      if (f.type === 'section') {
        if (buffer.length > 0) sections.push({ label, fields: buffer, repeatable, listName });
        label = f.label;
        repeatable = f.repeatable ?? false;
        listName = f.listName;
        buffer = [];
      } else {
        buffer.push(f);
      }
    }
    if (buffer.length > 0) sections.push({ label, fields: buffer, repeatable, listName });
    return sections;
  }, [allFields]);

  const hasSections = steps.length > 1;
  const totalSteps = steps.length;
  const currentStepMeta = steps[currentStep];
  const stepFields = currentStepMeta?.fields || [];
  const stepRepeatable = currentStepMeta?.repeatable ?? false;
  const stepListName = currentStepMeta?.listName || 'items';

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

  const handleModuleChange = (value: string) => {
    const nextModule = findModule(value, allModules);
    setSelectedModuleId(value);
    setSelectedTabId(nextModule?.tabs[0]?.id || '');
    form.resetFields();
    setIsDirty(false);
    setCurrentStep(0);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (isEditing && editRecord) {
        updateMassRecord(editRecord.id, values);
        setTimeout(() => {
          setSaving(false);
          setIsDirty(false);
          showToast(`${selectedModule?.label} · ${selectedTab?.label || '记录'} 已更新`, 'success');
          onClose();
        }, 300);
      } else {
        saveMassRecord(selectedModuleId, selectedTabId, values);
        setTimeout(() => {
          setSaving(false);
          setIsDirty(false);
          showToast(`${selectedModule?.label} · ${selectedTab?.label || '记录'} 已创建`, 'success');
          onClose();
        }, 300);
      }
    } catch {
      showToast('请补充必填字段', 'warning');
    }
  };

  // Unused variable removed — field visibility filtering not needed for step wizard
  // 编辑模式：预填表单
  const isEditing = !!editRecord;
  useEffect(() => {
    if (editRecord && allFields.length > 0) {
      // 延迟一帧确保表单字段已挂载
      const timer = setTimeout(() => {
        try {
          // 将存储数据转换为表单兼容格式
          const formData: Record<string, unknown> = {};

          // 1. 处理 repeatable section 数据（嵌套结构）
          //    兼容旧版扁平数据结构 → 自动转换为嵌套格式
          for (const f of allFields) {
            if (f.type === 'section' && f.repeatable && f.listName) {
              const listData = editRecord.data?.[f.listName];
              if (Array.isArray(listData) && listData.length > 0) {
                // 将嵌套数据中的日期字符串 → dayjs 对象，防止 Ant Design DatePicker 报错
                const converted = listData.map((item: Record<string, unknown>) => {
                  const copy: Record<string, unknown> = { ...item };
                  for (const df of allFields) {
                    if (df.type === 'date' && typeof copy[df.id] === 'string') {
                      const d = dayjs(copy[df.id] as string);
                      copy[df.id] = d.isValid() ? d : undefined;
                    }
                  }
                  return copy;
                });
                formData[f.listName] = converted;
              } else {
                // 旧版扁平数据：收集该 section 下的所有字段值组装为一个数组元素
                  const collected: Record<string, unknown> = {};
                let hasFlatData = false;
                for (const innerF of allFields) {
                  if (innerF.type === 'section' || innerF.type === 'attachment') continue;
                  const val = editRecord.data?.[innerF.id];
                  if (val !== undefined && val !== null) {
                    try {
                      if (innerF.type === 'date') {
                        if (typeof val === 'string') {
                          const d = dayjs(val);
                          collected[innerF.id] = d.isValid() ? d : undefined;
                          if (d.isValid()) hasFlatData = true;
                        } else if (dayjs.isDayjs(val)) {
                          collected[innerF.id] = val;
                          hasFlatData = true;
                        }
                      } else {
                        collected[innerF.id] = val;
                        hasFlatData = true;
                      }
                    } catch {
                      // 跳过单个字段转换异常
                    }
                  }
                }
                if (hasFlatData) {
                  formData[f.listName] = [collected];
                }
              }
            }
          }

          // 2. 处理所有普通字段
          //    repeatable section 数据已通过 listName 存入 formData
          //    普通字段按 ID 直接填充，互不冲突
          for (const f of allFields) {
            if (f.type === 'section' || f.type === 'attachment') continue;
            const raw = editRecord.data?.[f.id];
            if (raw === undefined || raw === null) continue;
            if (f.type === 'date' && typeof raw === 'string') {
              const d = dayjs(raw);
              formData[f.id] = d.isValid() ? d : undefined;
            } else if (f.multiple && typeof raw === 'string') {
              formData[f.id] = [raw];
            } else {
              formData[f.id] = raw;
            }
          }
          form.setFieldsValue(formData);
        } catch (err) {
          console.warn('[DrawerNewRecord] setFieldsValue error:', err);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [allFields, editRecord, form]);

  const showTemplateSelector = Boolean(selectedModule && !selectedModule.hideTemplateSelector && selectedModule.tabs.length > 1);
  const scopedModules = currentModule
    ? allModules.filter((m) => m.departmentId === currentModule.departmentId)
    : allModules;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <ErrorBoundary>
    <Modal
      open
      width={960}
      closable={false}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            {isEditing ? '编辑工作记录' : '新建工作记录'} · {selectedModule?.label}
          </span>
          <div
            onClick={handleClose}
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6,
              background: '#F3F4F6',
              color: '#6B7280',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#E5E7EB'; (e.currentTarget as HTMLDivElement).style.color = '#374151'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLDivElement).style.color = '#6B7280'; }}
          >
            ✕
          </div>
        </div>
      }
      maskClosable={false}
      onCancel={handleClose}
      centered
      styles={{ body: { height: '72vh', overflow: 'auto', padding: 0 } }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button onClick={handleClose} style={{ height: 36, paddingInline: 18 }}>取消</Button>
          </Space>
          <Space>
            {!isFirstStep && (
              <Button icon={<LeftOutlined />} onClick={() => setCurrentStep((s) => s - 1)} style={{ height: 36, paddingInline: 18 }}>
                上一步
              </Button>
            )}
            {isLastStep ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={saving}
                onClick={handleSubmit}
                style={{ height: 36, paddingInline: 20 }}
              >
                创建记录
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<RightOutlined />}
                onClick={() => setCurrentStep((s) => s + 1)}
                style={{ height: 36, paddingInline: 20 }}
              >
                下一步
              </Button>
            )}
          </Space>
        </div>
      }
    >
      {/* ===== Top step indicator ===== */}
      {hasSections && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {steps.map((step, i) => {
            const active = i === currentStep;
            const done = i < currentStep;
            return (
              <div
                key={i}
                onClick={() => setCurrentStep(i)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                  textAlign: 'center', fontSize: 13,
                  background: active ? '#E6F1F8' : done ? '#E8F5E9' : '#F8FAFC',
                  color: active ? '#155A8A' : done ? '#138A63' : '#94A3B8',
                  fontWeight: active ? 700 : 400,
                  border: active ? '1px solid #155A8A' : '1px solid transparent',
                  transition: 'all .15s',
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {done ? '✓ ' : ''}步骤 {i + 1}
                </div>
                <div style={{ marginTop: 2 }}>{step.label}</div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ overflow: 'auto', padding: '0 24px 16px' }}>
        {/* Module/Template selector */}
            <div style={{
              background: '#F6F8FB', border: '1px solid #D8E1EA', borderRadius: 8,
              padding: 14, marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 6 }}>
                {selectedModule?.departmentLabel} · {selectedModule?.label} · {selectedTab?.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#172033', marginBottom: 8 }}>
                {hasSections ? steps[currentStep]?.label : '基本信息'}
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <Form.Item label="所属模块" style={{ marginBottom: 0 }}>
                  <Select value={selectedModuleId} onChange={handleModuleChange} showSearch optionFilterProp="label" style={{ width: 280 }}>
                    {scopedModules.map((mod) => (
                      <Select.Option key={mod.id} value={mod.id} label={`${mod.departmentLabel} ${mod.label}`}>
                        {mod.departmentLabel} · {mod.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                {showTemplateSelector && (
                  <Form.Item label="记录模板" style={{ marginBottom: 0 }}>
                    <Select value={selectedTabId} onChange={(value) => { setSelectedTabId(value); form.resetFields(); setCurrentStep(0); }} style={{ width: 220 }}>
                      {selectedModule?.tabs.map((tab) => (
                        <Select.Option key={tab.id} value={tab.id}>{tab.label}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
                {hasSections && (
                  <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8', alignSelf: 'flex-end', paddingBottom: 4 }}>
                    {stepFields.length} 个字段 · 第 {currentStep + 1}/{totalSteps} 步
                  </div>
                )}
              </div>
            </div>

            {/* Fields for current step */}
            <Form
              form={form}
              layout="vertical"
              requiredMark="optional"
              onValuesChange={() => setIsDirty(true)}
            >
              {stepRepeatable ? (
                <Form.List name={stepListName}>
                  {(subFields, { add, remove }) => (
                    <>
                      {subFields.length === 0 && (
                        <Button type="dashed" onClick={() => add({})} block icon={<PlusOutlined />} style={{ height: 40, marginBottom: 16 }}>
                          添加{steps[currentStep]?.label}
                        </Button>
                      )}
                      {subFields.map(({ key, name: idx }) => (
                        <div key={key} style={{
                          border: '1px solid #E2E8F0', borderRadius: 8, padding: 16,
                          marginBottom: 16, background: '#FAFBFC',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#155A8A' }}>
                              {steps[currentStep]?.label} #{idx + 1}
                            </span>
                            {subFields.length > 1 && (
                              <Button type="text" danger size="small" onClick={() => remove(idx)}>删除</Button>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
                            {stepFields.map((field) => (
                              <div
                                key={field.id}
                                style={
                                  field.type === 'textarea' || field.type === 'attachment'
                                    ? { gridColumn: '1 / -1' }
                                    : { gridColumn: 'span 3' }
                                }
                              >
                                <DynamicField field={field} moduleId={selectedModuleId} subName={idx} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {subFields.length > 0 && (
                        <Button type="dashed" onClick={() => add({})} block icon={<PlusOutlined />} style={{ height: 40, marginBottom: 16 }}>
                          添加{steps[currentStep]?.label}
                        </Button>
                      )}
                    </>
                  )}
                </Form.List>
              ) : (
                // 所有步骤字段同时渲染、用 display 切换可见性，保证 antd Form.Item 永不卸载
                steps.map((step, si) => (
                  <motion.div
                    key={si}
                    initial={false}
                    animate={{ opacity: si === currentStep ? 1 : 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: si === currentStep ? '' : 'none' }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
                      {step.fields.map((field) => (
                        <div
                          key={field.id}
                          style={
                            field.type === 'textarea' || field.type === 'attachment'
                              ? { gridColumn: '1 / -1' }
                              : (['inquiryRecord', 'interrogationRecord', 'reception'].includes(field.id)
                                ? { gridColumn: 'span 2' }
                                : { gridColumn: 'span 3' })
                          }
                        >
                          <DynamicField field={field} moduleId={selectedModuleId} />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </Form>
          </div>
      </Modal>
    </ErrorBoundary>
  );
}

/* ===================== Field components ===================== */

function DynamicField({ field, moduleId, subName }: { field: FieldDefinition; moduleId: string; subName?: number }) {
  const name = subName !== undefined ? [subName, field.id] : field.id;
  // 涉众数据统计 → 案件名称自动匹配涉众线索项目名称
  if (moduleId === 'mass-statistics' && field.id === 'caseName') {
    return <CaseNameAutoComplete field={field} subName={subName} />;
  }
  // 调证登记 → 案件名称匹配线索登记中的交办线索名称
  if (moduleId === 'evidence-request' && field.id === 'caseName') {
    return <CaseNameMatchClue field={field} subName={subName} />;
  }
  // 资金分析 → 案件名称匹配线索登记中的交办线索名称
  if (moduleId === 'evidence-report' && field.id === 'caseName') {
    return <CaseNameMatchClue field={field} subName={subName} />;
  }
  // 法制室·案件总台账 → 案件名称匹配接报案登记的接报事项
  if (moduleId === 'legal-case-ledger' && field.id === 'caseName') {
    return <CaseNameMatchReport field={field} subName={subName} />;
  }
  // 每日工作记录 → 案件编号匹配中队案件管理
  if (moduleId === 'squad-daily' && field.id === 'caseNo') {
    return <CaseNoMatchSquad field={field} subName={subName} />;
  }
  // 每日工作记录 / 强制措施登记 → 案件名称匹配中队案件管理
  if ((moduleId === 'squad-daily' || moduleId === 'squad-coercive') && field.id === 'caseName') {
    return <CaseNameMatchSquad field={field} subName={subName} />;
  }

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
    // 资金分析结论字段定制提示词
    let textareaPlaceholder = `请输入${field.label}`;
    if (moduleId === 'evidence-report') {
      if (field.id === 'conclusionFlow') textareaPlaceholder = '示例：本案累计吸收资金 1.2 亿元，其中 72% 用于兑付前期投资人返利，11% 被嫌疑人用于个人挥霍购置房产，8% 用于平台运营成本，6% 通过虚拟币转移至境外，未发现资金投入真实经营项目。';
      else if (field.id === 'conclusionCaseSupport') textareaPlaceholder = '示例：资金未用于生产经营，主要用于拆东墙补西墙的返利，符合集资诈骗 “非法占有目的” 的认定标准。';
      else if (field.id === 'conclusionDeepClue') textareaPlaceholder = '发现 3 个跑分账户，需进一步追查上游卡农；境外转移的 200 万 USDT，需对接跨境资金追查机制';
      else if (field.id === 'conclusionNextStep') textareaPlaceholder = '请明确下一步工作计划和具体措施';
    }
    return (
      <Form.Item name={name} label={field.label} rules={rules}>
        <Input.TextArea rows={4} placeholder={textareaPlaceholder} />
      </Form.Item>
    );
  }

  if (field.type === 'date') {
    return (
      <Form.Item name={name} label={field.label} rules={rules}>
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
    );
  }

  if (field.type === 'number') {
    return (
      <Form.Item name={name} label={field.label} rules={rules}>
        <InputNumber style={{ width: '100%' }} placeholder={`请输入${field.label}`} />
      </Form.Item>
    );
  }

  if (field.type === 'select') {
    return (
      <Form.Item name={name} label={field.label} rules={rules}>
        <PersistedSelect field={field} />
      </Form.Item>
    );
  }

  if (field.type === 'attachment') {
    return (
      <Form.Item name={name} label={field.label} valuePropName="fileList">
        <Upload.Dragger
          beforeUpload={async (file) => {
            // 保存到 IndexedDB
            try {
              const recordId = `pending-${Date.now()}`;
              await saveAttachment(recordId, moduleId, field.id, file);
              console.log(`[attachment] 已保存: ${file.name}`);
            } catch (err) {
              console.warn('[attachment] 保存失败:', err);
            }
            return false; // 阻止实际 HTTP 上传
          }}
          multiple
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">点击或拖拽附件到此处</p>
          <p className="ant-upload-hint">支持 PDF、Word、图片、压缩包等材料，文件存储于浏览器本地 IndexedDB。</p>
        </Upload.Dragger>
      </Form.Item>
    );
  }

  // 多人输入字段（对应 moduleConfig 中 squad-daily 模块的特定字段）
  // 这些字段在设计上允许多个姓名/值，以"、"分隔存储
  const MULTI_PERSON_FIELDS = new Set([
    'inquiryRecord', 'interrogationRecord', 'reception',
    'evidenceObtained', 'fundFlowAnalysis', 'documentPreparation',
    'coerciveMeasuresResult', 'closedClues', 'clueCheck',
    'legalCoordination', 'stabilityWork', 'specialAction',
    'publicityWork', 'otherWork', 'seizedProperty', 'seizedVehicle',
    'seizedEquity', 'otherAssets', 'companyAccount', 'bankAccount',
    'personalBank', 'personalBalance',
  ]);
  if (MULTI_PERSON_FIELDS.has(field.id)) {
    return <MultiPersonField field={field} />;
  }

  // 特定字段的自定义 placeholder 提示
  const PLACEHOLDER_MAP: Record<string, Record<string, string>> = {
    caseNo: { _: 'A3703231200002026******' },
    'evidence-freeze': {
      suspect: '批量冻结可填写：***等**人',
      bankAccount: '批量冻结可填写：***等**个账号，详见附件',
    },
    'evidence-report': {
      investigateAccount: '***等***个',
    },
  };
  const customPlaceholder = PLACEHOLDER_MAP[field.id]?.[moduleId]
    || PLACEHOLDER_MAP[field.id]?.['_']
    || PLACEHOLDER_MAP[moduleId]?.[field.id]
    || `请输入${field.label}`;
  return (
    <Form.Item name={name} label={field.label} rules={rules}>
      <Input placeholder={customPlaceholder} />
    </Form.Item>
  );
}

/* ===================== 字段组件已迁移至 SharedFormFields.tsx ===================== */

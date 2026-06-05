/**
 * 共享表单字段组件
 * 消除 DrawerNewRecord.tsx 中多份重复的 AutoComplete/MultiPerson 组件
 */
import { useMemo, useState } from 'react';
import { AutoComplete, Button, Divider, Form, Input, Select, Space } from 'antd';
import { localStorageAdapter } from "../store/adapter";
import type { FieldDefinition } from '../moduleConfig';
import { getClueProjectNames, getLegalReportMatters, getEvidenceClueNames, getSquadCaseNames, getSquadCaseNos } from '../store/massStore';
import { getFieldHistory, getAllCaseNames, getAllCaseNos, getCaseNamesByNo, getCaseNosByName, getAllSuspectNames, getSuspectInfo } from '../store/inputHistoryStore';

type SelectValue = string | string[] | undefined;

/* ===================== 通用 AutoComplete 字段 ===================== */

interface AutoCompleteFieldProps {
  field: FieldDefinition;
  /** 获取选项列表的函数（每次调用重新读取数据） */
  getOptions: () => string[];
  placeholder?: string;
  subName?: number;
}

/** 通用 AutoComplete 字段组件，消除 5 份重复的 AutoComplete 组件 */
export function AutoCompleteField({ field, getOptions, placeholder, subName }: AutoCompleteFieldProps) {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const options = useMemo(() => {
    // refreshKey 变化时重新读取数据
    void refreshKey;
    const items = getOptions();
    return items.map((item) => ({ value: item, label: item }));
  }, [getOptions, refreshKey]);

  const rules = field.required
    ? [{ required: true, message: `请填写${field.label}` }]
    : undefined;
  const fieldName = subName !== undefined ? [subName, field.id] : field.id;

  return (
    <Form.Item name={fieldName} label={field.label} rules={rules}>
      <AutoComplete
        open={open}
        onFocus={() => { setOpen(true); setRefreshKey((k) => k + 1); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        options={options}
        placeholder={placeholder || `请输入${field.label}`}
        filterOption={(inputValue, option) =>
          (option?.value?.toUpperCase() ?? '').includes(inputValue.toUpperCase())
        }
        style={{ width: '100%' }}
      />
    </Form.Item>
  );
}

/** 涉众数据统计 - 案件名称自动匹配涉众线索 */
export function CaseNameAutoComplete({ field, subName }: { field: FieldDefinition; subName?: number }) {
  return (
    <AutoCompleteField
      field={field}
      subName={subName}
      getOptions={getClueProjectNames}
      placeholder="请输入案件名称，可匹配涉众项目"
    />
  );
}

/** 法制室·案件总台账 - 匹配接报事项 */
export function CaseNameMatchReport({ field, subName }: { field: FieldDefinition; subName?: number }) {
  return (
    <AutoCompleteField
      field={field}
      subName={subName}
      getOptions={getLegalReportMatters}
      placeholder="请输入案件名称，可匹配接报事项"
    />
  );
}

/** 调证/资金分析 - 匹配线索名称 */
export function CaseNameMatchClue({ field, subName }: { field: FieldDefinition; subName?: number }) {
  return (
    <AutoCompleteField
      field={field}
      subName={subName}
      getOptions={getEvidenceClueNames}
      placeholder="请输入案件名称，可匹配线索登记中的交办线索名称"
    />
  );
}

/** 每日工作记录 - 案件编号匹配中队案件 */
export function CaseNoMatchSquad({ field, subName }: { field: FieldDefinition; subName?: number }) {
  const getCaseNos = useMemo(() => () => getSquadCaseNos(), []);
  return (
    <AutoCompleteField
      field={field}
      subName={subName}
      getOptions={getCaseNos}
      placeholder="A3703231200002026******"
    />
  );
}

/** 每日工作记录/强制措施 - 案件名称匹配中队案件 */
export function CaseNameMatchSquad({ field, subName }: { field: FieldDefinition; subName?: number }) {
  const getCaseNames = useMemo(() => () => getSquadCaseNames(), []);
  return (
    <AutoCompleteField
      field={field}
      subName={subName}
      getOptions={getCaseNames}
      placeholder="请输入案件名称，可匹配中队案件"
    />
  );
}

/* ===================== 多人输入字段 ===================== */

/** 姓名类字段(询问笔录/讯问笔录/接待报案/信访人)用compact横向排列 */
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

export function MultiPersonField({ field }: { field: FieldDefinition }) {
  const rules = field.required
    ? [{ required: true, message: `请填写${field.label}` }]
    : undefined;
  return (
    <Form.Item name={field.id} label={field.label} rules={rules}>
      <MultiPersonInput compact={NAME_FIELDS.includes(field.id)} />
    </Form.Item>
  );
}

/* ===================== 持久化 Select（支持自定义选项） ===================== */

export function PersistedSelect({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value?: SelectValue;
  onChange?: (value: SelectValue) => void;
}) {
  const multiple = field.multiple ?? false;
  const storageKey = field.customOptionKey ? `jingzong.selectOptions.${field.customOptionKey}` : '';
  const [newOption, setNewOption] = useState('');
  const [customOptions, setCustomOptions] = useState<string[]>(() => {
    if (!storageKey) return [];
    try {
      const stored = localStorageAdapter.getItem<string[]>(storageKey, []);
      return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : [];
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
      localStorageAdapter.setItem(storageKey, next);
      return next;
    });
    setNewOption('');
  };

  if (field.customOptionKey) {
    return (
      <Select
        value={value}
        onChange={onChange}
        mode={multiple ? 'multiple' : undefined}
        showSearch
        placeholder={`请选择${field.label}`}
        options={options.map((o) => ({ label: o, value: o }))}
        dropdownRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: '8px 0' }} />
            <Space style={{ padding: '0 8px 8px', width: '100%' }}>
              <Input
                value={newOption}
                placeholder={`新增${field.label}`}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
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
    <Select value={value} onChange={onChange} mode={multiple ? 'multiple' : undefined} showSearch placeholder={`请选择${field.label}`} options={options.map((o) => ({ label: o, value: o }))} />
  );
}

/* ===================== 输入历史 AutoComplete ===================== */

interface InputWithHistoryProps {
  field: FieldDefinition;
  placeholder?: string;
  /** 额外选项，合并到历史记录中一起展示 */
  extraOptions?: string[];
  /** 选择时的回调 */
  onSelect?: (value: string) => void;
  /** Form.Item 注入的值与变更回调 */
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * 带输入历史自动补全的文本输入框
 * 在已有 AutoComplete 匹配的基础上，额外展示该字段的历史输入记录
 */
export function InputWithHistory({ field, placeholder, extraOptions, onSelect, value, onChange }: InputWithHistoryProps) {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const options = useMemo(() => {
    void refreshKey;
    const history = getFieldHistory(field.id);
    const merged = [
      ...(extraOptions || []),
      ...history,
    ];
    // 去重保留顺序
    return Array.from(new Set(merged)).map((item) => ({ value: item, label: item }));
  }, [field.id, extraOptions, refreshKey]);

  return (
    <AutoComplete
      value={value}
      onChange={(val: string) => onChange?.(val)}
      open={open}
      onFocus={() => { setOpen(true); setRefreshKey((k) => k + 1); }}
      onBlur={() => setTimeout(() => setOpen(false), 200)}
      onSelect={(val: string) => onSelect?.(val)}
      options={options}
      placeholder={placeholder || `请输入${field.label}`}
      filterOption={(inputValue, option) =>
        (option?.value?.toUpperCase() ?? '').includes(inputValue.toUpperCase())
      }
      style={{ width: '100%' }}
    />
  );
}

/* ===================== 全局案件名称/编号联动 ===================== */

/**
 * 全局案件名称字段
 * 展示所有模块中已保存的案件名称，选择后自动填充案件编号
 */
export function GlobalCaseNameField({ field, subName, moduleLabel }: {
  field: FieldDefinition;
  subName?: number;
  moduleLabel?: string;
}) {
  const [value, setValue] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // 将 form 实例提到组件顶层，不能在回调中调用 useFormInstance
  let form: any = null;
  try { form = Form.useFormInstance(); } catch { /* 无 Form 上下文时降级 */ }

  const caseNoField = subName !== undefined ? [subName, 'caseNo'] : 'caseNo';
  const caseNoKey = typeof caseNoField === 'string' ? caseNoField : caseNoField[1];

  const options = useMemo(() => {
    void refreshKey;
    const names = getAllCaseNames();
    return names.map((name) => ({ value: name, label: name }));
  }, [refreshKey]);

  const rules = field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined;
  const fieldName = subName !== undefined ? [subName, field.id] : field.id;

  const doFillCaseNo = (nameValue: string) => {
    if (!form) return;
    const relatedNos = getCaseNosByName(nameValue);
    if (relatedNos.length > 0) {
      form.setFieldsValue({ [caseNoKey]: relatedNos[0] });
    }
  };

  const handleChange = (val: string) => {
    setValue(val);
    // 通知 Form 当前字段值已变化（补上 Form.Item 的自控缺口）
    if (form) {
      const nameKey = typeof fieldName === 'string' ? fieldName : fieldName[1];
      form.setFieldsValue({ [nameKey]: val });
    }
    // 无论选择还是填写，只要输入内容精确匹配了某个已保存的案件名称，就自动填充编号
    doFillCaseNo(val);
  };

  const handleSelect = (selectedValue: string) => {
    setValue(selectedValue);
    if (form) {
      const nameKey = typeof fieldName === 'string' ? fieldName : fieldName[1];
      form.setFieldsValue({ [nameKey]: selectedValue });
    }
    doFillCaseNo(selectedValue);
  };

  return (
    <Form.Item name={fieldName} label={field.label} rules={rules}>
      <AutoComplete
        value={value}
        onChange={handleChange}
        open={open}
        onFocus={() => { setOpen(true); setRefreshKey((k) => k + 1); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onSelect={handleSelect}
        options={options}
        placeholder="请输入案件名称（全软件数据共享）"
        filterOption={(inputValue, option) =>
          (option?.value?.toUpperCase() ?? '').includes(inputValue.toUpperCase())
        }
        style={{ width: '100%' }}
      />
    </Form.Item>
  );
}

/**
 * 全局案件编号字段
 * 展示所有模块中已保存的案件编号，选择后自动填充案件名称
 */
export function GlobalCaseNoField({ field, subName }: {
  field: FieldDefinition;
  subName?: number;
}) {
  const [value, setValue] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // 将 form 实例提到组件顶层
  let form: any = null;
  try { form = Form.useFormInstance(); } catch { /* 无 Form 上下文时降级 */ }

  const caseNameField = subName !== undefined ? [subName, 'caseName'] : 'caseName';
  const caseNameKey = typeof caseNameField === 'string' ? caseNameField : caseNameField[1];

  const options = useMemo(() => {
    void refreshKey;
    const nos = getAllCaseNos();
    return nos.map((no) => ({ value: no, label: no }));
  }, [refreshKey]);

  const rules = field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined;
  const fieldName = subName !== undefined ? [subName, field.id] : field.id;

  const doFillCaseName = (noValue: string) => {
    if (!form) return;
    const relatedNames = getCaseNamesByNo(noValue);
    if (relatedNames.length > 0) {
      form.setFieldsValue({ [caseNameKey]: relatedNames[0] });
    }
  };

  const handleChange = (val: string) => {
    setValue(val);
    // 通知 Form 当前字段值已变化
    if (form) {
      const key = typeof fieldName === 'string' ? fieldName : fieldName[1];
      form.setFieldsValue({ [key]: val });
    }
    // 输入内容精确匹配已保存案件编号时，自动填充名称
    doFillCaseName(val);
  };

  const handleSelect = (selectedValue: string) => {
    setValue(selectedValue);
    if (form) {
      const key = typeof fieldName === 'string' ? fieldName : fieldName[1];
      form.setFieldsValue({ [key]: selectedValue });
    }
    doFillCaseName(selectedValue);
  };

  return (
    <Form.Item name={fieldName} label={field.label} rules={rules}>
      <AutoComplete
        value={value}
        onChange={handleChange}
        open={open}
        onFocus={() => { setOpen(true); setRefreshKey((k) => k + 1); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onSelect={handleSelect}
        options={options}
        placeholder="请输入案件编号（全软件数据共享）"
        filterOption={(inputValue, option) =>
          (option?.value?.toUpperCase() ?? '').includes(inputValue.toUpperCase())
        }
        style={{ width: '100%' }}
      />
    </Form.Item>
  );
}

/* ===================== 设备品牌字段（联动设备类型） ===================== */

const HARDDRIVE_BRANDS = ['三星', '希捷', '西部数据', '铠侠', '东芝', '金士顿', '致钛', '英睿达', '闪迪', '威刚', '联想'];
const PHONE_BRANDS = ['华为', '苹果', '小米', 'VIVO', 'OPPO', '三星', '荣耀', '中兴', '联想', '魅族', '红米', '一加', '真我', 'iQOO', '摩托罗拉'];

/** 设备品牌字段：根据设备类型动态切换下拉选项 */
export function DeviceBrandField({ field, subName }: { field: FieldDefinition; subName?: number }) {
  const form = Form.useFormInstance();
  const deviceType = Form.useWatch('deviceType', form);
  const [newOption, setNewOption] = useState('');
  const storageKey = 'jingzong.selectOptions.phone.deviceBrand';
  const [customOptions, setCustomOptions] = useState<string[]>(() => {
    try { const stored = localStorageAdapter.getItem<string[]>(storageKey, []); return Array.isArray(stored) ? stored : []; } catch { return []; }
  });

  const brands = deviceType === '硬盘' ? HARDDRIVE_BRANDS : deviceType === '手机' ? PHONE_BRANDS : [];
  const allOptions = Array.from(new Set([...brands, ...customOptions]));

  const saveCustom = (val: string) => {
    const v = val.trim();
    if (!v || allOptions.includes(v)) return;
    setCustomOptions(prev => {
      const next = Array.from(new Set([...prev, v]));
      localStorageAdapter.setItem(storageKey, next);
      return next;
    });
    setNewOption('');
  };

  const rules = field.required ? [{ required: true, message: `请选择${field.label}` }] : undefined;
  const fieldName = subName !== undefined ? [subName, field.id] : field.id;

  return (
    <Form.Item name={fieldName} label={field.label} rules={rules}>
      <Select
        showSearch
        placeholder={deviceType ? `请选择${field.label}` : '请先选择设备类型'}
        disabled={!deviceType}
        options={allOptions.map(o => ({ label: o, value: o }))}
        dropdownRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: '8px 0' }} />
            <Space style={{ padding: '0 8px 8px', width: '100%' }}>
              <Input
                value={newOption}
                placeholder={`新增${field.label}`}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <Button type="primary" onClick={() => saveCustom(newOption)}>添加</Button>
            </Space>
          </>
        )}
      />
    </Form.Item>
  );
}

/* ===================== 全局嫌疑人联动字段 ===================== */

/**
 * 全局嫌疑人姓名字段
 * 展示所有模块中已保存的嫌疑人，选择/填写后自动填充身份证号、手机号、地址
 */
export function GlobalSuspectField({ field, subName }: {
  field: FieldDefinition;
  subName?: number;
}) {
  const [value, setValue] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  let form: any = null;
  try { form = Form.useFormInstance(); } catch { /* 降级 */ }

  const options = useMemo(() => {
    void refreshKey;
    const names = getAllSuspectNames();
    return names.map((name) => ({ value: name, label: name }));
  }, [refreshKey]);

  const rules = field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined;
  const fieldName = subName !== undefined ? [subName, field.id] : field.id;

  /** 填充关联的嫌疑人信息 */
  const fillSuspectRelated = (suspectName: string) => {
    if (!form) return;
    const info = getSuspectInfo(suspectName);
    if (!info) return;

    const thisFieldId = typeof fieldName === 'string' ? fieldName : fieldName[1];
    const isInSuspectsSection = thisFieldId === 'suspectName';

    const kv: Record<string, string> = {};

    if (isInSuspectsSection) {
      // squad-case 的嫌疑人 section 内：字段名带 suspect 前缀
      if (info.idNo)   kv.suspectIdNo = info.idNo;
      if (info.phone)  kv.suspectPhone = info.phone;
      if (info.address) kv.suspectAddress = info.address;
    } else {
      // 平铺模式（资金查控、强制措施、设备采集等）：用 idNo / phone
      if (info.idNo)   kv.idNo = info.idNo;
      if (info.phone)  kv.phone = info.phone;
    }

    if (Object.keys(kv).length > 0) {
      form.setFieldsValue(kv);
    }
  };

  const handleChange = (val: string) => {
    setValue(val);
    if (form) {
      const key = typeof fieldName === 'string' ? fieldName : fieldName[1];
      form.setFieldsValue({ [key]: val });
    }
    fillSuspectRelated(val);
  };

  const handleSelect = (selectedValue: string) => {
    setValue(selectedValue);
    if (form) {
      const key = typeof fieldName === 'string' ? fieldName : fieldName[1];
      form.setFieldsValue({ [key]: selectedValue });
    }
    fillSuspectRelated(selectedValue);
  };

  return (
    <Form.Item name={fieldName} label={field.label} rules={rules}>
      <AutoComplete
        value={value}
        onChange={handleChange}
        open={open}
        onFocus={() => { setOpen(true); setRefreshKey((k) => k + 1); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onSelect={handleSelect}
        options={options}
        placeholder="请输入嫌疑人姓名（跨模块共享）"
        filterOption={(inputValue, option) =>
          (option?.value?.toUpperCase() ?? '').includes(inputValue.toUpperCase())
        }
        style={{ width: '100%' }}
      />
    </Form.Item>
  );
}

/* ===================== 持有人自动补全（引用嫌疑人数据池） ===================== */

/**
 * 持有人姓名字段
 * 数据源包含所有已保存的嫌疑人姓名，方便选取，但不联动填充其他字段
 */
export function HolderAutoComplete({ field, subName }: {
  field: FieldDefinition;
  subName?: number;
}) {
  const [value, setValue] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  let form: any = null;
  try { form = Form.useFormInstance(); } catch { /* 降级 */ }

  const options = useMemo(() => {
    void refreshKey;
    const suspectNames = getAllSuspectNames();
    return suspectNames.map((name) => ({ value: name, label: name }));
  }, [refreshKey]);

  const rules = field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined;
  const fieldName = subName !== undefined ? [subName, field.id] : field.id;

  const handleChange = (val: string) => {
    setValue(val);
    if (form) {
      const key = typeof fieldName === 'string' ? fieldName : fieldName[1];
      form.setFieldsValue({ [key]: val });
    }
  };

  const handleSelect = (selectedValue: string) => {
    setValue(selectedValue);
    if (form) {
      const key = typeof fieldName === 'string' ? fieldName : fieldName[1];
      form.setFieldsValue({ [key]: selectedValue });
    }
  };

  return (
    <Form.Item name={fieldName} label={field.label} rules={rules}>
      <AutoComplete
        value={value}
        onChange={handleChange}
        open={open}
        onFocus={() => { setOpen(true); setRefreshKey((k) => k + 1); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onSelect={handleSelect}
        options={options}
        placeholder="请输入持有人姓名（可匹配嫌疑人）"
        filterOption={(inputValue, option) =>
          (option?.value?.toUpperCase() ?? '').includes(inputValue.toUpperCase())
        }
        style={{ width: '100%' }}
      />
    </Form.Item>
  );
}


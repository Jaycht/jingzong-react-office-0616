/**
 * 共享表单字段组件
 * 消除 DrawerNewRecord.tsx 中多份重复的 AutoComplete/MultiPerson 组件
 */
import { useMemo, useState } from 'react';
import { AutoComplete, Button, Divider, Form, Input, Select, Space } from 'antd';
import { localStorageAdapter } from "../store/adapter";
import type { FieldDefinition } from '../moduleConfig';
import { getClueProjectNames, getLegalReportMatters, getEvidenceClueNames } from '../store/massStore';
import { getCases } from '../store/caseStore';

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
  const getCaseNos = useMemo(() => () => getCases().map((c) => c.caseNo).filter(Boolean) as string[], []);
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
  const getCaseNames = useMemo(() => () => getCases().map((c) => c.caseName).filter(Boolean) as string[], []);
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

export function PersistedSelect({ field, value, onChange }: { field: FieldDefinition; value?: any; onChange?: (value: any) => void }) {
  const multiple = field.multiple ?? false;
  const storageKey = field.customOptionKey ? `jingzong.selectOptions.${field.customOptionKey}` : '';
  const [newOption, setNewOption] = useState('');
  const [customOptions, setCustomOptions] = useState<string[]>(() => {
    if (!storageKey) return [];
    try {
      const raw = localStorageAdapter.getItem<Array<any>>(storageKey, null);
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
    <Select value={value} onChange={onChange} mode={multiple ? 'multiple' : undefined} placeholder={`请选择${field.label}`} options={options.map((o) => ({ label: o, value: o }))} />
  );
}


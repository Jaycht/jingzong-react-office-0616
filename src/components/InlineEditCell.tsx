/**
 * 列表行内编辑器（ModulePage 专用）
 *
 * 点单元格即原地进入编辑（只改这一格）：文本直接改、日期点开日期选择器、
 * 下拉选值（支持下拉底部自定义添加）、数字用数字框，
 * 「查控结果」拆成未反馈 / 成功 / 失败三个带小标题的数字框。
 * Enter / 点 ✓ 提交，Esc / 点 ✗ 取消。
 *
 * 日期值统一存**本地日期串 yyyy-MM-dd**：早期存 ISO（toISOString）会把本地 0 点
 * 写成前一天 16:00Z，导出台账时差一天，故此处一律用 toDateStr 取本地日期。
 */
import { useState } from 'react';
import type { KeyboardEvent, ReactNode, SyntheticEvent } from 'react';
import { Button, DatePicker, Divider, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { localStorageAdapter } from '../store/adapter';
import { toDateStr } from '../utils/format';

export type InlineEditorType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'result';

interface Props {
  type: InlineEditorType;
  /** 当前值（date 为 yyyy-MM-dd 字符串，number 为数字或空串） */
  value?: unknown;
  /** select 固定选项 */
  options?: string[];
  /** select 自定义选项存储键：传入则在弹层底部提供「自定义添加」 */
  customOptionKey?: string;
  onChange: (v: unknown) => void;
  /** Enter / ✓：提交 */
  onCommit: () => void;
  /** Esc / ✗：放弃修改 */
  onCancel: () => void;
  /** type='result'：三项数字的当前值 */
  resultValues?: Record<string, unknown>;
  onResultChange?: (key: string, v: number | null) => void;
}

/** 「查控结果」三项的显示名 —— 必须显式标出，否则用户分不清哪个是成功/失败/未反馈 */
const RESULT_ITEMS = [
  ['feedbackPending', '未反馈'],
  ['feedbackSuccess', '成功'],
  ['feedbackFail', '失败'],
] as const;

function toDateValue(v: unknown): dayjs.Dayjs | null {
  if (v == null || v === '') return null;
  const d = dayjs(String(v));
  return d.isValid() ? d : null;
}

function toNumberValue(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function InlineEditCell({
  type, value, options, customOptionKey, onChange, onCommit, onCancel, resultValues, onResultChange,
}: Props) {
  const stop = (e: SyntheticEvent) => e.stopPropagation();

  const storageKey = customOptionKey ? `jingzong.selectOptions.${customOptionKey}` : '';
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

  /** 自定义添加：写入与抽屉「协查单位」同一个存储键，两处下拉互通 */
  const saveNewOption = () => {
    const v = newOption.trim();
    if (!v) return;
    const next = Array.from(new Set([...customOptions, v]));
    setCustomOptions(next);
    if (storageKey) localStorageAdapter.setItem(storageKey, next);
    setNewOption('');
    onChange(v);
  };

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  let editor: ReactNode;
  switch (type) {
    case 'textarea':
      editor = (
        <Input.TextArea
          size="small"
          autoFocus
          autoSize={{ minRows: 1, maxRows: 5 }}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'number':
      editor = (
        <InputNumber
          size="small"
          autoFocus
          style={{ width: '100%' }}
          value={toNumberValue(value)}
          onChange={(v) => onChange(v == null ? '' : v)}
        />
      );
      break;
    case 'date':
      editor = (
        <DatePicker
          size="small"
          autoFocus
          allowClear
          format="YYYY-MM-DD"
          style={{ width: '100%' }}
          value={toDateValue(value)}
          onChange={(d) => onChange(d && d.isValid() ? toDateStr(d.toDate()) : '')}
        />
      );
      break;
    case 'select': {
      const allOptions = Array.from(new Set([...(options || []), ...customOptions]));
      editor = (
        <Select
          size="small"
          autoFocus
          allowClear
          showSearch
          style={{ width: '100%' }}
          value={value == null || value === '' ? undefined : String(value)}
          options={allOptions.map((o) => ({ label: o, value: o }))}
          onChange={(v) => onChange(v == null ? '' : v)}
          dropdownRender={
            storageKey
              ? (menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '6px 0' }} />
                    <div className="mp-inline-addopt">
                      <Input
                        size="small"
                        value={newOption}
                        placeholder="自定义添加"
                        onChange={(e) => setNewOption(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        onPressEnter={saveNewOption}
                      />
                      <Button size="small" type="primary" onClick={saveNewOption}>
                        添加
                      </Button>
                    </div>
                  </>
                )
              : undefined
          }
        />
      );
      break;
    }
    case 'result':
      editor = (
        <div className="mp-inline-result">
          {RESULT_ITEMS.map(([key, label]) => (
            <label key={key} className="mp-inline-result-item">
              <span className="mp-inline-result-label">{label}</span>
              <InputNumber
                size="small"
                min={0}
                precision={0}
                style={{ width: '100%' }}
                value={toNumberValue(resultValues?.[key])}
                onChange={(v) => onResultChange?.(key, v ?? null)}
              />
            </label>
          ))}
        </div>
      );
      break;
    default:
      editor = (
        <Input
          size="small"
          autoFocus
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <div className="mp-inline-editor" onClick={stop} onMouseDown={stop} onKeyDown={handleKey}>
      {editor}
    </div>
  );
}

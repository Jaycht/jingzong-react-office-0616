/**
 * 演示数据面板（V2.49.0）
 *
 * 放在「系统设置 → 数据管理」下：一键为全部业务子项生成示例条目，便于测试与演示；
 * 也可一键清除（只删带标记的演示数据，真实数据不受影响）。
 */
import { useEffect, useState } from 'react';
import { App } from 'antd';
import { FlaskConical, Trash2, RefreshCw, Database } from 'lucide-react';
import { seedDemoData, clearDemoData, countDemoData, DEFAULT_PER_TAB } from '../utils/demoSeeder';
import { useAppStore } from '../store/appStore';

const PER_TAB_OPTIONS = [
  { value: 1, label: '1 条' },
  { value: 2, label: '2 条（推荐）' },
  { value: 3, label: '3 条' },
  { value: 5, label: '5 条' },
];

export default function DemoDataPanel() {
  const { modal } = App.useApp();
  const showToast = useAppStore((s) => s.showToast);
  const [perTab, setPerTab] = useState(DEFAULT_PER_TAB);
  const [busy, setBusy] = useState(false);
  const [stat, setStat] = useState(() => countDemoData());

  const refresh = () => setStat(countDemoData());
  useEffect(() => { refresh(); }, []);

  const handleSeed = () => {
    modal.confirm({
      title: '生成演示数据',
      content: '将为每个业务子项生成示例条目（含日常随手记），并写入全局案件/线索/嫌疑人池。确认继续？',
      okText: '生成',
      cancelText: '取消',
      onOk: () => {
        setBusy(true);
        setTimeout(() => {
          try {
            const r = seedDemoData(perTab);
            refresh();
            showToast(`已生成演示数据：${r.tabs} 个页签、${r.records} 条记录（含 ${r.sectionItems} 条嫌疑人/主体等明细）、${r.notes} 条随手记`, 'success');
          } catch (e) {
            showToast('生成失败：' + (e instanceof Error ? e.message : '未知错误'), 'error');
          } finally {
            setBusy(false);
          }
        }, 30);
      },
    });
  };

  const handleClear = () => {
    modal.confirm({
      title: '清除演示数据',
      content: `将删除全部带演示标记的数据（当前：业务记录 ${stat.records} 条、随手记 ${stat.notes} 条），真实数据不受影响。确认清除？`,
      okText: '清除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        try {
          const r = clearDemoData();
          refresh();
          showToast(`已清除演示数据：${r.records} 条记录、${r.notes} 条随手记`, 'success');
        } catch (e) {
          showToast('清除失败：' + (e instanceof Error ? e.message : '未知错误'), 'error');
        }
      },
    });
  };

  const hasDemo = stat.records > 0 || stat.notes > 0;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
        <FlaskConical size={15} />
        <span>演示数据</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.75, marginBottom: 16 }}>
        一键为全部业务子项（大队办公室、涉众办、法制室、案件中队、调证分析下的每个页签）生成贴合业务的示例条目，
        嫌疑人信息、涉众主体这类可多次添加的明细段同样会生成多条；另附几篇日常随手记。
        演示条目均带标记、<b>不参与到期预警</b>，可一键清除，与真实数据互不影响。
      </div>

      {/* 当前状态 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8,
          background: hasDemo ? 'var(--color-success-bg)' : 'var(--color-surface-hover)',
          border: `1px solid ${hasDemo ? 'var(--color-success)' : 'var(--color-border)'}`,
          marginBottom: 16,
        }}
      >
        <Database size={16} color={hasDemo ? 'var(--color-success)' : 'var(--color-text-muted)'} />
        <span style={{ fontSize: 13, fontWeight: 600, color: hasDemo ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
          {hasDemo
            ? `当前库内有演示数据：业务记录 ${stat.records} 条、随手记 ${stat.notes} 条`
            : '当前库内没有演示数据'}
        </span>
      </div>

      {/* 生成条数 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
          每个页签生成条数
        </label>
        <select
          value={perTab}
          onChange={(e) => setPerTab(Number(e.target.value))}
          disabled={busy}
          style={{
            width: '100%', height: 34, padding: '0 10px', borderRadius: 6,
            border: '1px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit',
          }}
        >
          {PER_TAB_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="dash-action dash-action-primary" onClick={handleSeed} disabled={busy}>
          <RefreshCw size={15} /> {busy ? '生成中…' : '生成演示数据'}
        </button>
        <button className="dash-action" onClick={handleClear} disabled={busy || !hasDemo}>
          <Trash2 size={15} /> 清除演示数据
        </button>
      </div>
    </div>
  );
}

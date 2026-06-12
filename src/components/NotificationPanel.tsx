/**
 * Deadline 预警通知面板
 * 右侧可收起的通知面板，在任何页面都能看到即将到期的案件
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getMassRecords } from '../store/massStore';
import { MODULE_NAMES } from '../moduleConfig';

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d: Date, n: number) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function toStr(d: Date) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function calcRemaining(deadline: Date) { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.floor((deadline.getTime() - t.getTime()) / 86400000); }

interface WarnItem {
  id: string;
  recordId: string;
  moduleId: string;
  caseName: string;
  type: string;
  remainingDays: number;
  severity: 'overdue' | 'critical' | 'warning';
}

function calcWarnings(records: MassRecord[]): WarnItem[] {
  const rules = [
    { mids: ['legal-report-case', 'legal-case-ledger', 'squad-case'], f: 'receiveDate', t: '受案→立案', calc: (d: string) => toStr(addDays(new Date(d), 7)) },
    { mids: ['squad-coercive', 'legal-case-ledger'], f: 'criminalDetentionDate', t: '刑事拘留', calc: (d: string) => toStr(addDays(new Date(d), 30)) },
    { mids: ['squad-coercive', 'legal-case-ledger', 'squad-case'], f: 'arrestDate', t: '侦查羁押', calc: (d: string) => toStr(addMonths(new Date(d), 2)) },
    { mids: ['squad-coercive', 'legal-case-ledger'], f: 'bailDate', t: '取保候审', calc: (d: string) => toStr(addMonths(new Date(d), 12)) },
    { mids: ['squad-case', 'legal-case-ledger'], f: 'filingDate', t: '立案侦查', calc: (d: string) => toStr(addMonths(new Date(d), 2)) },
  ];
  const items: WarnItem[] = [];
  for (const rule of rules) {
    for (const rec of records.filter(r => rule.mids.includes(r.moduleId))) {
      const raw = rec.data?.[rule.f];
      if (typeof raw !== 'string') continue;
      try {
        const deadline = rule.calc(raw);
        const remaining = calcRemaining(new Date(deadline));
        if (remaining > 30) continue;
        const severity: WarnItem['severity'] = remaining <= 0 ? 'overdue' : remaining <= 3 ? 'critical' : 'warning';
        items.push({
          id: rec.id + rule.f, recordId: rec.id, moduleId: rec.moduleId,
          caseName: String(rec.data?.caseName || rec.data?.suspect || '未命名').slice(0, 10),
          type: rule.t, remainingDays: remaining, severity,
        });
      } catch { /* ignore */ }
    }
  }
  const order: Record<string, number> = { overdue: 0, critical: 1, warning: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity] || a.remainingDays - b.remainingDays);
  return items;
}

type MassRecord = import('../store/massStore').MassRecord;

export default function NotificationPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const darkMode = useAppStore((s) => s.darkMode);
  const setEditRecord = useAppStore((s) => s.setEditRecord);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const openModal = useAppStore((s) => s.openModal);

  const warnings = useMemo(() => calcWarnings(getMassRecords()), []);
  const total = warnings.length;
  const overdue = warnings.filter(w => w.severity === 'overdue').length;

  const handleClick = (item: WarnItem) => {
    const rec = getMassRecords().find(r => r.id === item.recordId);
    if (rec) { setEditRecord(rec); setCurrentPage(item.moduleId); openModal('newRecord'); }
  };

  const severityConfig = {
    overdue: { bg: 'var(--color-danger-bg)', dot: 'var(--color-danger)' },
    critical: { bg: 'var(--color-warning-bg)', dot: 'var(--color-warning)' },
    warning: { bg: 'var(--color-info-bg)', dot: 'var(--color-info)' },
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0, zIndex: 50 }}>
      {/* 折叠/展开按钮 */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setCollapsed(v => !v)}
        style={{
          position: 'absolute', left: -32, top: 12,
          width: 28, height: 28, padding: 0, borderRadius: '6px 0 0 6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 51,
        }}
        title={collapsed ? '展开预警面板' : '收起预警面板'}
      >
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="panel"
            style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* 标题 */}
            <div className="panel-header" style={{ flexShrink: 0 }}>
              <AlertTriangle size={14} color="var(--color-warning)" />
              <span className="font-semibold" style={{ fontSize: 13 }}>预警通知</span>
              {total > 0 && (
                <span className="badge badge-danger" style={{ marginLeft: 'auto', fontSize: 10 }}>{total}</span>
              )}
            </div>

            {/* 列表 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
              {total === 0 ? (
                <div style={{ padding: '28px 12px', textAlign: 'center' }}>
                  <CheckCircle2 size={24} color="var(--color-success)" style={{ marginBottom: 8, opacity: 0.6 }} />
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>暂无预警</div>
                </div>
              ) : (
                warnings.slice(0, 12).map((item) => {
                  const c = severityConfig[item.severity];
                  return (
                    <div
                      key={item.id}
                      className="hover-bg"
                      onClick={() => handleClick(item)}
                      style={{ padding: '8px 10px', marginBottom: 4, borderRadius: 6, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                        <span className="truncate font-medium" style={{ fontSize: 12, flex: 1 }}>{item.caseName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.type}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: c.dot }}>
                          {item.remainingDays <= 0 ? '已过期' : `${item.remainingDays}天`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { getDailyNotes } from '../store/dailyNotesStore';
import { getMassRecords } from '../store/massStore';

const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron;

const DISMISSED_KEY = 'jingzong.reminder.dismissed';
const SNOOZED_KEY = 'jingzong.reminder.snoozed';
const SCHEDULED_KEY = 'jingzong.reminder.scheduled';

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function addDismissed(id: string) {
  const s = getDismissed();
  s.add(id);
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s])); } catch {}
}

function getSnoozed(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SNOOZED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function setSnoozed(id: string, time: number) {
  const s = getSnoozed();
  s[id] = time;
  try { localStorage.setItem(SNOOZED_KEY, JSON.stringify(s)); } catch {}
}

function removeSnoozed(id: string) {
  const s = getSnoozed();
  delete s[id];
  try { localStorage.setItem(SNOOZED_KEY, JSON.stringify(s)); } catch {}
}

function getScheduled(): Set<string> {
  try {
    const raw = localStorage.getItem(SCHEDULED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markScheduled(id: string) {
  const s = getScheduled();
  s.add(id);
  try { localStorage.setItem(SCHEDULED_KEY, JSON.stringify([...s])); } catch {}
}

function clearScheduled(id: string) {
  const s = getScheduled();
  s.delete(id);
  try { localStorage.setItem(SCHEDULED_KEY, JSON.stringify([...s])); } catch {}
}

export function scheduleSnooze(id: string, title: string, body: string, minutes: number) {
  const delayMs = minutes * 60 * 1000;
  setSnoozed(id, Date.now() + delayMs);
  clearScheduled(id);
  if (isElectron) {
    (window as any).electronAPI.scheduleReminder(`snooze-${id}`, title, body, delayMs);
  }
}

const LEGAL_RULES: Array<{ label: string; field: string; days: number }> = [
  { label: '受案→立案', field: 'receiveDate', days: 7 },
  { label: '刑事拘留', field: 'criminalDetentionDate', days: 30 },
  { label: '侦查羁押', field: 'filingDate', days: 60 },
  { label: '取保候审', field: 'bailDate', days: 365 },
  { label: '监视居住', field: 'residentialSurveillanceDate', days: 180 },
];

function parseDateField(val: any): Date | null {
  if (!val) return null;
  if (typeof val === 'string') { const d = new Date(val); return isNaN(d.getTime()) ? null : d; }
  if (val.$d) { const d = new Date(val.$d); return isNaN(d.getTime()) ? null : d; }
  if (val._isValid && val.toDate) { const d = val.toDate(); return isNaN(d.getTime()) ? null : d; }
  return null;
}

function checkLegalDeadlines(records: any[]): Array<{ id: string; title: string; body: string }> {
  const alerts: Array<{ id: string; title: string; body: string }> = [];
  const now = new Date();

  for (const rec of records) {
    const data = rec.data || rec;
    const suspects = data.suspects || [];

    for (const rule of LEGAL_RULES) {
      const targets = suspects.length > 0 ? suspects : [data];
      for (const target of targets) {
        const dateVal = target[rule.field];
        const d = parseDateField(dateVal);
        if (!d) continue;

        const deadline = new Date(d);
        deadline.setDate(deadline.getDate() + rule.days);
        const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 7 && diffDays >= -30) {
          const caseName = data.caseName || data.caseNo || '';
          const suspectName = target.suspectName || '';
          const suffix = suspectName ? ` ${suspectName}` : '';
          alerts.push({
            id: `legal-${rec.id}-${rule.field}-${suspectName || 'main'}`,
            title: '法律时限预警',
            body: `${caseName}${suffix} ${rule.label}剩余${diffDays}天（${deadline.toLocaleDateString('zh-CN')}届满）`,
          });
        }
      }
    }
  }
  return alerts;
}

function fireNotification(id: string, title: string, body: string, delayMs: number) {
  const api = (window as any).electronAPI;
  if (!api) return;
  clearScheduled(id);
  api.scheduleReminder(id, title, body, delayMs);
  markScheduled(id);
}

export function useReminderService() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isElectron) return;

    function checkDailyReminders() {
      try {
        const notes = getDailyNotes();
        const dismissed = getDismissed();
        const snoozed = getSnoozed();
        const scheduled = getScheduled();
        const now = Date.now();

        for (const note of notes) {
          if (!note.reminder?.enabled || !note.reminder?.time) continue;
          if (dismissed.has(note.id)) continue;

          const reminderTime = new Date(note.reminder.time).getTime();
          if (isNaN(reminderTime)) continue;

          if (snoozed[note.id] && now < snoozed[note.id]) continue;
          if (snoozed[note.id] && now >= snoozed[note.id]) removeSnoozed(note.id);

          if (scheduled.has(note.id)) continue;

          const delayMs = Math.max(0, reminderTime - now);
          fireNotification(
            note.id,
            '日常随手记提醒',
            `${note.title || '未命名记录'} - ${note.type}`,
            delayMs,
          );
        }
      } catch {}
    }

    function checkLegal() {
      try {
        const records = getMassRecords();
        if (!records.length) return;
        const alerts = checkLegalDeadlines(records);
        const dismissed = getDismissed();
        const scheduled = getScheduled();

        for (const alert of alerts) {
          if (dismissed.has(alert.id)) continue;
          if (scheduled.has(alert.id)) continue;
          fireNotification(alert.id, alert.title, alert.body, 100);
        }
      } catch {}
    }

    checkDailyReminders();
    checkLegal();

    intervalRef.current = setInterval(() => {
      checkDailyReminders();
      checkLegal();
    }, 15 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}

export function dismissReminder(id: string) {
  addDismissed(id);
  clearScheduled(id);
  if (isElectron) {
    (window as any).electronAPI.cancelReminder({ id });
  }
}

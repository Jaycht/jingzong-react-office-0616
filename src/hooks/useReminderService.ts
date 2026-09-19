import { useEffect, useRef } from 'react';
import { getDailyNotes } from '../store/dailyNotesStore';
import { getMassRecords, isDemoRecord, type MassRecord } from '../store/massStore';

import { isElectron as isElectronEnv } from '../lib/env';
import { LEGAL_DEADLINE_RULES } from '../constants/legalDeadlines';

const DISMISSED_KEY = 'jingzong.reminder.dismissed';
const TRIGGERED_KEY = 'jingzong.reminder.triggered';
const SNOOZED_KEY = 'jingzong.reminder.snoozed';

/**
 * 会话标识：渲染进程每次加载（= 每次启动软件）都不同。
 * 「下次登录提醒」就是把提醒标记成「本会话内不再提醒」，下次启动时会话标识变了、
 * 标记自然失效，提醒重新弹出 —— 不需要额外的定时器或持久化清理。
 */
const SESSION_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * 「下次登录提醒」的哨兵值。
 * 复用既有的 notif-snooze 通道回传（minutes 语义上表示稍后几分钟），
 * 用 -1 表示「本次不再提醒，下次登录再提醒」，避免为一个按钮新增一条 IPC 通道。
 */
export const SNOOZE_UNTIL_NEXT_LAUNCH = -1;

/** 稍后提醒存的是绝对时间戳；「下次登录提醒」存的是当前会话标识 */
type SnoozeValue = number | { session: string };

function getDismissed(): Set<string> {
  try { const raw = localStorage.getItem(DISMISSED_KEY); return raw ? new Set(JSON.parse(raw)) : new Set(); }
  catch { return new Set(); }
}

function addDismissed(id: string) {
  const s = getDismissed(); s.add(id);
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s])); } catch {}
}

function getTriggered(): Record<string, number> {
  try { const raw = localStorage.getItem(TRIGGERED_KEY); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}

function markTriggered(id: string) {
  const s = getTriggered(); s[id] = Date.now();
  try { localStorage.setItem(TRIGGERED_KEY, JSON.stringify(s)); } catch {}
}

function getSnoozed(): Record<string, SnoozeValue> {
  try { const raw = localStorage.getItem(SNOOZED_KEY); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}

function setSnoozed(id: string, value: SnoozeValue) {
  const s = getSnoozed();
  s[id] = value;
  try { localStorage.setItem(SNOOZED_KEY, JSON.stringify(s)); } catch {}
}

/** 该提醒当前是否处于「不再提醒」状态（定时稍后 或 本次登录内不再提醒） */
function isSnoozed(id: string, snoozed: Record<string, SnoozeValue>, now: number): boolean {
  const v = snoozed[id];
  if (v === undefined || v === null) return false;
  if (typeof v === 'number') return now < v;
  if (typeof v === 'object' && typeof v.session === 'string') return v.session === SESSION_ID;
  return false;
}

export function snoozeReminder(id: string, minutes: number) {
  if (minutes === SNOOZE_UNTIL_NEXT_LAUNCH) {
    // 「下次登录提醒」：本次运行不再打扰，下次启动重新提醒
    setSnoozed(id, { session: SESSION_ID });
    return;
  }
  setSnoozed(id, Date.now() + minutes * 60 * 1000);
}

export function dismissReminder(id: string) {
  addDismissed(id);
}

function checkLegalDeadlines(records: MassRecord[]): Array<{ id: string; title: string; body: string }> {
  const alerts: Array<{ id: string; title: string; body: string }> = [];
  for (const rec of records) {
    // 演示数据不产生到期预警（一键生成演示数据后不该瞬间弹出一屏预警）
    if (isDemoRecord(rec)) continue;
    const data = (rec.data || rec) as Record<string, unknown>;
    const suspects = (data.suspects as unknown[]) || [];
    // 统一以 legalDeadlines 单一数据源为准（C-M2）：含模块范围与正确的日期字段
    for (const rule of LEGAL_DEADLINE_RULES) {
      if (!rule.moduleIds.includes(rec.moduleId)) continue;
      const targets: unknown[] = suspects.length > 0 ? suspects : [data];
      for (const target of targets) {
        const targetObj = target as Record<string, unknown>;
        const raw = targetObj[rule.dateField];
        if (!raw || typeof raw !== 'string') continue;
        try {
          const deadline = new Date(rule.calcDeadline(raw));
          if (isNaN(deadline.getTime())) continue;
          const diffDays = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 7 && diffDays >= -30) {
            const caseName = String(data.caseName ?? data.caseNo ?? '');
            const suspectName = String(targetObj.suspectName ?? '');
            alerts.push({
              id: `legal-${rec.id}-${rule.id}-${suspectName || 'main'}`,
              title: '法律时限预警',
              body: `${caseName}${suspectName ? ' ' + suspectName : ''} ${rule.label}剩余${diffDays}天`,
            });
          }
        } catch { /* ignore */ }
      }
    }
  }
  return alerts;
}

export function useReminderService() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isElectronEnv()) return;

    // 监听通知窗口的"稍后提醒"和"不再提醒"操作
    const api = window.electronAPI;
    const cleanups: Array<() => void> = [];
    if (api.onReminderSnoozed) {
      cleanups.push(api.onReminderSnoozed((data: { minutes: number; noteId: string }) => {
        if (data && data.noteId) snoozeReminder(data.noteId, data.minutes);
      }));
    }
    if (api.onReminderDismissed) {
      cleanups.push(api.onReminderDismissed((data: { noteId: string }) => {
        if (data && data.noteId) dismissReminder(data.noteId);
      }));
    }

    function check() {
      const dismissed = getDismissed();
      const triggered = getTriggered();
      const snoozed = getSnoozed();
      const now = Date.now();

      // 日常随手记提醒
      try {
        const notes = getDailyNotes();
        for (const note of notes) {
          if (!note.reminder?.enabled || !note.reminder?.time) continue;
          if (dismissed.has(note.id)) continue;
          if (isSnoozed(note.id, snoozed, now)) continue;

          const reminderTime = new Date(note.reminder.time).getTime();
          if (isNaN(reminderTime)) continue;
          if (now < reminderTime) continue;

          const repeat = note.reminder.repeat || 'none';
          const lastTriggered = triggered[note.id] || 0;
          let cooldownMs = 60000;

          if (repeat === 'daily') cooldownMs = 24 * 60 * 60 * 1000;
          else if (repeat === 'weekly') cooldownMs = 7 * 24 * 60 * 60 * 1000;
          else if (repeat === 'monthly') cooldownMs = 30 * 24 * 60 * 60 * 1000;
          else if (repeat === '30min') cooldownMs = 30 * 60 * 1000;
          else if (repeat === '1hour') cooldownMs = 60 * 60 * 1000;

          if (now - lastTriggered < cooldownMs) continue;

          api.showReminder(
            '日常随手记提醒',
            `${note.title || '未命名记录'} - ${note.type}`,
            note.reminder.sound || '',
            note.id,
            { type: note.type, priority: note.priority, date: note.date },
          );
          markTriggered(note.id);
        }
      } catch {}

      // 法律时限预警 — 冷却 24 小时，每天最多提醒一次
      try {
        const records = getMassRecords();
        if (records.length > 0) {
          const alerts = checkLegalDeadlines(records);
          for (const alert of alerts) {
            if (dismissed.has(alert.id)) continue;
            if (isSnoozed(alert.id, snoozed, now)) continue;
            const lastTriggered = triggered[alert.id] || 0;
            if (now - lastTriggered < 24 * 60 * 60 * 1000) continue;
            // noteId 传预警 id：通知窗口据此提供「不再提醒 / 下次登录提醒」，
            // kind=legal 让窗口渲染这两档（而非随手记的「稍后 5 分钟」）
            api.showReminder(alert.title, alert.body, '', alert.id, { kind: 'legal' });
            markTriggered(alert.id);
          }
        }
      } catch {}
    }

    check();
    intervalRef.current = setInterval(check, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cleanups.forEach((fn) => typeof fn === 'function' && fn());
    };
  }, []);
}

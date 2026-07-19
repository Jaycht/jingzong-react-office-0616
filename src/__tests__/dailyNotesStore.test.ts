import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDailyNotes,
  createDailyNote,
  updateDailyNote,
  deleteDailyNote,
} from '../store/dailyNotesStore';

/**
 * #1 回归测试：随手记的"建库即见"同步读写语义。
 * 根因是 UI 层保存后未刷新列表（已用 try/finally 修复），
 * 这里锁定底层前提——createDailyNote 后 getDailyNotes 必须立即包含新记录，
 * 否则即便列表刷新也读不到带提醒的新记录。
 */
describe('dailyNotesStore — 随手记同步读写（#1 回归）', () => {
  beforeEach(() => {
    for (const n of getDailyNotes()) deleteDailyNote(n.id);
  });

  it('带提醒新建记录后，getDailyNotes 立即包含该记录（同步缓存）', () => {
    const before = getDailyNotes().length;
    const note = createDailyNote({
      title: '带提醒的备忘',
      date: '2026-07-19',
      type: '一般工作',
      reminder: { enabled: true, time: new Date(Date.now() + 60000).toISOString(), repeat: 'none', sound: 'QQ消息.wav' },
    });
    const after = getDailyNotes();
    expect(after.length).toBe(before + 1);
    expect(after.some((n) => n.id === note.id && n.reminder?.enabled)).toBe(true);
  });

  it('updateDailyNote 立即反映在读取结果中', () => {
    const note = createDailyNote({ title: '原', date: '2026-07-19' });
    updateDailyNote(note.id, { title: '改后' });
    const found = getDailyNotes().find((n) => n.id === note.id);
    expect(found?.title).toBe('改后');
  });

  it('deleteDailyNote 立即移除记录', () => {
    const note = createDailyNote({ title: '删', date: '2026-07-19' });
    const before = getDailyNotes().length;
    deleteDailyNote(note.id);
    expect(getDailyNotes().length).toBe(before - 1);
    expect(getDailyNotes().some((n) => n.id === note.id)).toBe(false);
  });
});

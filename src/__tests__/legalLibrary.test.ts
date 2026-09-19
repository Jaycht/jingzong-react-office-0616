import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_ADMIN_PASSWORD,
  addCustomForm,
  addCustomLaw,
  emptyRecycle,
  getLibrary,
  mergeForms,
  mergeLawManifest,
  moveToRecycle,
  purgeRecycle,
  restoreFromRecycle,
  saveLibrary,
  setAdminPassword,
  updateEntry,
  verifyAdminPassword,
  type FormEntry,
  type LawManifest,
  type LibraryState,
} from '../store/legalLibraryStore';

const EMPTY: LibraryState = {
  customForms: [],
  customLaws: [],
  formEdits: {},
  lawEdits: {},
  recycle: [],
  adminPassword: DEFAULT_ADMIN_PASSWORD,
};

const BUILTIN_FORMS: FormEntry[] = [
  { id: '/forms/行政/受案登记表.pdf', title: '受案登记表', category: ['通用'], shiyang: '式样一', file: '/forms/行政/受案登记表.pdf', builtin: true },
  { id: '/forms/行政/传唤证.pdf', title: '传唤证', category: ['通用'], shiyang: '', file: '/forms/行政/传唤证.pdf', builtin: true },
];

const BUILTIN_MANIFEST: LawManifest = {
  generatedAt: '2026-07-18',
  totalLaws: 2,
  categories: [
    { id: '刑事', name: '刑事法律', count: 1 },
    { id: '司法解释', name: '司法解释', count: 1 },
  ],
  laws: [
    { id: '刑事/刑法', title: '刑法', category: '刑事', categoryName: '刑事法律', file: '刑事/刑法.txt', builtin: true },
    { id: '司法解释/解释一', title: '解释一', category: '司法解释', categoryName: '司法解释', file: '司法解释/解释一.txt', builtin: true },
  ],
};

beforeEach(() => {
  saveLibrary({ ...EMPTY, formEdits: {}, lawEdits: {}, recycle: [] });
});

describe('mergeForms：内置 + 本地覆盖', () => {
  it('无覆盖时原样返回内置条目', () => {
    const out = mergeForms(BUILTIN_FORMS, getLibrary());
    expect(out.map((f) => f.title)).toEqual(['受案登记表', '传唤证']);
  });

  it('编辑内置条目只改展示，不改原始清单', () => {
    updateEntry('form', '/forms/行政/传唤证.pdf', { title: '传唤证（2026版）' }, true);
    const out = mergeForms(BUILTIN_FORMS, getLibrary());
    expect(out.find((f) => f.id === '/forms/行政/传唤证.pdf')?.title).toBe('传唤证（2026版）');
    // 原始数组不被污染
    expect(BUILTIN_FORMS[1].title).toBe('传唤证');
  });

  it('删除内置条目 = 隐藏，不改变内置清单', () => {
    moveToRecycle('form', BUILTIN_FORMS[1] as unknown as Record<string, unknown>, true);
    const out = mergeForms(BUILTIN_FORMS, getLibrary());
    expect(out.map((f) => f.title)).toEqual(['受案登记表']);
  });

  it('自定义条目追加在内置之后', () => {
    addCustomForm({ id: 'cform-1', title: '协助查询存款通知书', category: ['行政'], file: 'D:\\jingzong_data\\legal\\forms\\x.pdf' });
    const out = mergeForms(BUILTIN_FORMS, getLibrary());
    expect(out).toHaveLength(3);
    expect(out[2].title).toBe('协助查询存款通知书');
    expect(out[2].builtin).toBe(false);
  });
});

describe('mergeLawManifest：分类数量重算', () => {
  it('新增自定义法条后 totalLaws 与分类计数同步', () => {
    addCustomLaw({ id: 'claw-1', title: '反有组织犯罪法', category: '刑事', categoryName: '刑事法律', file: 'D:\\legal\\a.txt' });
    const out = mergeLawManifest(BUILTIN_MANIFEST, getLibrary());
    expect(out?.totalLaws).toBe(3);
    expect(out?.categories.find((c) => c.id === '刑事')?.count).toBe(2);
  });

  it('自定义引入新分类时追加到分类列表', () => {
    addCustomLaw({ id: 'claw-2', title: '内部办案规范', category: '内部规范', categoryName: '内部规范', file: 'D:\\legal\\b.txt' });
    const out = mergeLawManifest(BUILTIN_MANIFEST, getLibrary());
    const ids = out?.categories.map((c) => c.id) ?? [];
    expect(ids).toContain('内部规范');
    expect(ids[ids.length - 1]).toBe('内部规范');
  });

  it('删除内置法条后计数同步下降', () => {
    moveToRecycle('law', BUILTIN_MANIFEST.laws[1] as unknown as Record<string, unknown>, true);
    const out = mergeLawManifest(BUILTIN_MANIFEST, getLibrary());
    expect(out?.totalLaws).toBe(1);
    expect(out?.categories.map((c) => c.id)).toEqual(['刑事']);
  });
});

describe('回收站', () => {
  it('自定义条目删除后可恢复原样', () => {
    const entry = addCustomForm({ id: 'cform-9', title: '自定义文书', category: ['通用'], file: 'D:\\legal\\c.pdf' });
    moveToRecycle('form', entry as unknown as Record<string, unknown>, false, ['D:\\legal\\c.pdf']);
    expect(mergeForms(BUILTIN_FORMS, getLibrary())).toHaveLength(2);

    const item = getLibrary().recycle[0];
    restoreFromRecycle(item.rid);
    const out = mergeForms(BUILTIN_FORMS, getLibrary());
    expect(out.map((f) => f.title)).toContain('自定义文书');
  });

  it('恢复内置条目后重新出现在列表中', () => {
    moveToRecycle('form', BUILTIN_FORMS[1] as unknown as Record<string, unknown>, true);
    const rid = getLibrary().recycle[0].rid;
    restoreFromRecycle(rid);
    expect(mergeForms(BUILTIN_FORMS, getLibrary())).toHaveLength(2);
  });

  it('彻底删除自定义条目会交出磁盘文件，内置条目则保留隐藏记录', () => {
    const entry = addCustomForm({ id: 'cform-8', title: '临时文书', category: ['通用'], file: 'D:\\legal\\d.pdf' });
    const item = moveToRecycle('form', entry as unknown as Record<string, unknown>, false, ['D:\\legal\\d.pdf']);
    const files = purgeRecycle(item.rid);
    expect(files).toEqual(['D:\\legal\\d.pdf']);
    expect(getLibrary().recycle).toHaveLength(0);

    // 内置条目的「彻底删除」= 永久隐藏，不能回到列表
    const bi = moveToRecycle('form', BUILTIN_FORMS[0] as unknown as Record<string, unknown>, true);
    purgeRecycle(bi.rid);
    expect(mergeForms(BUILTIN_FORMS, getLibrary()).map((f) => f.title)).toEqual(['传唤证']);
  });

  it('清空回收站只清自定义条目，内置条目隐藏标记保留', () => {
    addCustomForm({ id: 'cform-7', title: '待清理', category: ['通用'], file: 'D:\\legal\\e.pdf' });
    const custom = getLibrary().customForms[0];
    moveToRecycle('form', custom as unknown as Record<string, unknown>, false, ['D:\\legal\\e.pdf']);
    moveToRecycle('form', BUILTIN_FORMS[0] as unknown as Record<string, unknown>, true);

    const files = emptyRecycle();
    expect(files).toEqual(['D:\\legal\\e.pdf']);
    expect(mergeForms(BUILTIN_FORMS, getLibrary()).map((f) => f.title)).toEqual(['传唤证']);
  });
});

describe('管理员密码', () => {
  it('初始密码为 JDZZ3231268', () => {
    expect(DEFAULT_ADMIN_PASSWORD).toBe('JDZZ3231268');
    expect(verifyAdminPassword(DEFAULT_ADMIN_PASSWORD)).toBe(true);
    expect(verifyAdminPassword('wrong')).toBe(false);
  });

  it('修改后立即生效', () => {
    setAdminPassword('newpass123');
    expect(verifyAdminPassword('newpass123')).toBe(true);
    expect(verifyAdminPassword(DEFAULT_ADMIN_PASSWORD)).toBe(false);
    // 存空值则回退默认密码
    setAdminPassword('   ');
    expect(verifyAdminPassword(DEFAULT_ADMIN_PASSWORD)).toBe(true);
  });
});

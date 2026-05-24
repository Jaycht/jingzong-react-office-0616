/**
 * 版本管理存储
 * 版本号从 ../version 统一读取，每次修改递增
 */

import { APP_VERSION, VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH, CHANGELOG } from '../version';

const STORAGE_KEY = 'jingzong.version.v1';

export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  updatedAt: string;
  changelog: string[];
}

const DEFAULT_VERSION: VersionInfo = {
  version: APP_VERSION,
  major: VERSION_MAJOR,
  minor: VERSION_MINOR,
  patch: VERSION_PATCH,
  updatedAt: new Date().toISOString().slice(0, 10),
  changelog: [...CHANGELOG],
};

function loadVersion(): VersionInfo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // 首次使用，写入默认版本
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VERSION));
      return DEFAULT_VERSION;
    }
    const parsed = JSON.parse(raw);

    // ===== 版本号自动迁移 =====
    // 如果 localStorage 中的版本号与源码版本号不一致，说明代码已更新
    if (parsed.version !== APP_VERSION) {
      // 保留旧 changelog
      const oldChangelog: string[] = parsed.changelog || [];
      // 追加 CHANGELOG 中尚未记录的条目（排除旧版本已经有的）
      const existingEntries = new Set(oldChangelog);
      const newEntries = CHANGELOG.filter((entry) => !existingEntries.has(entry));
      if (newEntries.length > 0) {
        oldChangelog.push(...newEntries);
      } else {
        // 如果没有新条目，加一条通用迁移记录
        oldChangelog.push(`自动升级至 ${APP_VERSION}`);
      }
      parsed.version = APP_VERSION;
      parsed.major = VERSION_MAJOR;
      parsed.minor = VERSION_MINOR;
      parsed.patch = VERSION_PATCH;
      parsed.updatedAt = new Date().toISOString().slice(0, 10);
      parsed.changelog = oldChangelog;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed;
  } catch {
    return DEFAULT_VERSION;
  }
}

function saveVersion(v: VersionInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

let _versionCache: VersionInfo | null = null;

/** 获取当前版本信息 */
export function getCurrentVersion(): VersionInfo {
  if (!_versionCache) {
    _versionCache = loadVersion();
  }
  return { ..._versionCache };
}

/** 递增版本号（patch+1），并记录变更 */
export function bumpVersion(changeDescription?: string): VersionInfo {
  const v = getCurrentVersion();
  v.patch += 1;
  v.version = `V${v.major}.${v.minor}.${v.patch}`;
  v.updatedAt = new Date().toISOString().slice(0, 10);
  if (changeDescription) {
    v.changelog.push(changeDescription);
  }
  saveVersion(v);
  _versionCache = v;
  return { ...v };
}

/** 递增 minor 版本号 */
export function bumpMinorVersion(changeDescription?: string): VersionInfo {
  const v = getCurrentVersion();
  v.minor += 1;
  v.patch = 0;
  v.version = `V${v.major}.${v.minor}.${v.patch}`;
  v.updatedAt = new Date().toISOString().slice(0, 10);
  if (changeDescription) {
    v.changelog.push(changeDescription);
  }
  saveVersion(v);
  _versionCache = v;
  return { ...v };
}

/** 设置版本说明并保存 */
export function setVersionChangelog(entry: string): void {
  const v = getCurrentVersion();
  v.changelog.push(entry);
  saveVersion(v);
  _versionCache = v;
}

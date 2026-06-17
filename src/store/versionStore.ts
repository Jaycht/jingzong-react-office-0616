/**
 * 版本管理存储
 * 版本号从 ../version 统一读取，每次修改递增
 */

import { APP_VERSION, VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH, CHANGELOG } from '../version';
import { localStorageAdapter } from './adapter';

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
  const parsed = localStorageAdapter.getItem<VersionInfo>(STORAGE_KEY, DEFAULT_VERSION);

  // 如果 localStorage 中的版本号与源码版本号不一致，说明代码已更新
  // 直接使用源码 CHANGELOG 完全替换，不做合并
  // 避免旧版残留条目（如 V1.2.x）和错误排序一直存在
  if (parsed.version !== APP_VERSION) {
    parsed.version = APP_VERSION;
    parsed.major = VERSION_MAJOR;
    parsed.minor = VERSION_MINOR;
    parsed.patch = VERSION_PATCH;
    parsed.updatedAt = new Date().toISOString().slice(0, 10);
    parsed.changelog = [...CHANGELOG];
    localStorageAdapter.setItem(STORAGE_KEY, parsed);
  }

  return parsed;
}

function saveVersion(v: VersionInfo): void {
  localStorageAdapter.setItem(STORAGE_KEY, v);
}

let _versionCache: VersionInfo | null = null;

/** 获取当前版本信息 */
export function getCurrentVersion(): VersionInfo {
  // 每次都重新检查版本号，确保 changelog 始终与源码同步
  return loadVersion();
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

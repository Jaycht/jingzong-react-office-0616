/**
 * 构建前版本自动递增脚本
 * 用法：node scripts/bump-version.js
 * 功能：补丁位 +1 → 更新 package.json → 更新 src/version.ts（仅版本号+构建日期）
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// 1. 读 package.json
const pkgPath = resolve(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
const oldVersion = pkg.version;
const newPatch = patch + 1;
const newVersion = `${major}.${minor}.${newPatch}`;

// 2. 写回 package.json
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

// 3. 更新 src/version.ts（仅版本号和构建日期，changelog 由 versionStore.ts 运行时管理）
const verPath = resolve(ROOT, 'src', 'version.ts');
const now = new Date();
const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

// 读取现有 version.ts 保留 CHANGELOG
const existingVer = readFileSync(verPath, 'utf-8');
const changelogMatch = existingVer.match(/CHANGELOG: string\[\] = (\[[\s\S]*?\]);/);
const existingChangelog = changelogMatch ? changelogMatch[1] : '[]';

const versionTs = `export const APP_VERSION = "V${newVersion}";
export const VERSION_MAJOR = ${major};
export const VERSION_MINOR = ${minor};
export const VERSION_PATCH = ${newPatch};

export const CHANGELOG: string[] = ${existingChangelog};

export const BUILD_DATE = "${dateStr}";
`;

writeFileSync(verPath, versionTs, 'utf-8');

console.log(`✔ 版本已递增：${oldVersion} → ${newVersion}`);

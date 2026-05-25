/**
 * 构建前版本自动递增脚本
 * 用法：node scripts/bump-version.js
 * 功能：补丁位 +1 → 更新 package.json → 更新 src/version.ts → 追加 changelog
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

// 3. 写 src/version.ts
const verPath = resolve(ROOT, 'src', 'version.ts');

const now = new Date();
const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const changelogEntry = `V${newVersion} 更新 - ${dateStr} 构建版本`;

const versionTs = `export const APP_VERSION = "V${newVersion}";
export const VERSION_MAJOR = ${major};
export const VERSION_MINOR = ${minor};
export const VERSION_PATCH = ${newPatch};

export const CHANGELOG: string[] = [
  "${changelogEntry}",
  "V2.5.4 统一 - 版本号统一为 2.5.4，修复网页版白屏问题",
  "V2.1.0 新增 - Dashboard 工作台可视化图表升级（月度趋势/工作分布/案件类型）",
  "V2.0.6 新增 - 表单刷新保护（beforeunload），防止数据丢失",
  "V2.0.5 新增 - 暗色模式切换，记住密码/自动登录功能",
  "V2.0.4 优化 - 表格列排序，操作日志自动埋点（增删改操作）",
  "V2.0.3 优化 - 侧边栏折叠状态持久化，面包屑导航，EmptyState 空状态组件",
  "V2.0.2 优化 - 搜索框接入全局搜索，支持实时过滤模块记录",
  "V2.0.1 重构 - AppContext 替换为 Zustand 状态管理，渲染性能优化",
  "V2.0.0 重构 - 清除所有默认 mock 数据，系统全新初始化，登录页通用化",
  "V1.2.5 优化 - Dashboard 工作台可视化升级，图表数据源切换为真实数据",
  "V1.2.4 修复 - 强制措施编辑扁平→嵌套数据自动转换，涉案财物编辑白屏修复",
  "V1.2.3 发布 - 新增受害人批量导入、搜索性能优化",
  "V1.2.2 优化 - 新增自定义字段功能，支持多角色权限管理，新增操作日志导出",
  "V1.2.1 修复 - 新增应急处置模块，新增报表管理模块，修复字段保存问题",
  "V1.2.0 发布 - 全新UI界面重构，新增数据统计可视化，新增自动备份功能",
];

export const BUILD_DATE = "${dateStr}";
`;

writeFileSync(verPath, versionTs, 'utf-8');

console.log(`✅ 版本已递增：${oldVersion} → ${newVersion}`);

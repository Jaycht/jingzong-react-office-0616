/**
 * 构建后处理：将所有 JS/CSS 内联到 index.html → 输出 standalone.html
 * 替换 import.meta 为 polyfill，使其可在 file:// 协议下直接运行
 * 同时生成 启动.bat，用浏览器 --app 模式创建无边框窗口
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const htmlPath = resolve(distDir, 'index.html');

if (!existsSync(htmlPath)) {
  console.error('❌ 未找到 dist/index.html，请先运行 npm run build');
  process.exit(1);
}

let html = readFileSync(htmlPath, 'utf-8');
const assetsDir = resolve(distDir, 'assets');

// 1. 内联所有 CSS
html = html.replace(
  /<link rel="stylesheet" crossorigin href="\.\/assets\/([^"]+\.css)">/g,
  (_, filename) => {
    const cssPath = resolve(assetsDir, filename);
    if (!existsSync(cssPath)) return '';
    const css = readFileSync(cssPath, 'utf-8');
    return `<style>\n${css}\n</style>`;
  }
);

// 2. 读取 JS 文件内容，替换 import.meta
let jsContent = '';
html = html.replace(
  /<script type="module" crossorigin src="\.\/assets\/([^"]+)"><\/script>/g,
  (_, filename) => {
    const jsPath = resolve(assetsDir, filename);
    if (!existsSync(jsPath)) return '';
    jsContent = readFileSync(jsPath, 'utf-8');
    jsContent = jsContent
      .replace(/\bimport\.meta\b/g, '({url:globalThis.location&&globalThis.location.href||""})');
    return `<script>\n${jsContent}\n</script>`;
  }
);

// 3. 写入 standalone.html
const outPath = resolve(distDir, 'standalone.html');
writeFileSync(outPath, html, 'utf-8');
console.log(`✅ 已生成自包含 HTML：${outPath}`);

// 4. 生成 启动.bat — 用 Edge/Chrome 的 --app 模式创建无边框窗口
const batPath = resolve(distDir, '启动.bat');
const batContent = `@echo off
chcp 65001 >nul
title Jingzong Work Log System

set "FILE=%~dp0standalone.html"

REM --- Chrome install paths (user install first) ---
set "CHROME1=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"
set "CHROME2=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
set "CHROME3=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"

if exist "%CHROME1%" start "" "%CHROME1%" --app="%FILE%" --no-first-run & exit
if exist "%CHROME2%" start "" "%CHROME2%" --app="%FILE%" --no-first-run & exit
if exist "%CHROME3%" start "" "%CHROME3%" --app="%FILE%" --no-first-run & exit

REM --- Fallback: chrome in PATH ---
start "" chrome --app="%FILE%" --no-first-run
exit
`;
writeFileSync(batPath, batContent, 'utf-8');
console.log(`✅ 已生成启动脚本：${batPath}`);
console.log(`   将 dist/ 整个文件夹发给同事，双击「启动.bat」即可使用`);

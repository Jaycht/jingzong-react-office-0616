/**
 * 构建后处理：将所有 JS/CSS 内联到 index.html → 输出 standalone.html
 * 替换 import.meta 为 polyfill，使其可在 file:// 协议下直接运行
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
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

// 读取 assets 目录
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
    // 替换 import.meta 为 polyfill
    // 在非模块上下文中，import.meta 不可用，改为模拟对象
    jsContent = jsContent
      .replace(/\bimport\.meta\b/g, '({url:globalThis.location&&globalThis.location.href||""})');
    return `<script>\n${jsContent}\n</script>`;
  }
);

// 3. 写入 standalone.html
const outPath = resolve(distDir, 'standalone.html');
writeFileSync(outPath, html, 'utf-8');

console.log(`✅ 已生成自包含 HTML：${outPath}`);
console.log(`   双击 ${outPath} 即可在浏览器中打开`);

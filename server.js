/**
 * 经侦大队工作记录管理系统 — 桌面启动器
 * 双击 server.js 或用 start.bat 启动
 *
 * 功能：启动本地 HTTP 服务器 → 用 Chrome/Edge 无壳窗口打开
 *       （无地址栏、无标签栏，外观跟普通软件一样）
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 51730;
const DIST_DIR = path.join(__dirname, 'dist');

// ---- 检查 dist ----
if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error('ERROR: dist/index.html not found. Run: npm run build:web');
  process.exit(1);
}

// ---- MIME 映射 ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.ttf':  'font/ttf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

// ---- HTTP 服务器 ----
const server = http.createServer((req, res) => {
  const safeDir = DIST_DIR;
  let filePath = path.join(safeDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!filePath.startsWith(safeDir)) { res.writeHead(403); res.end(); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(safeDir, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(500); res.end(); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// ---- 找浏览器 ----
function findBrowser() {
  const candidates = [
    process.env.ProgramFiles + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['LocalAppData'] + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env.ProgramFiles + '\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env['LocalAppData'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  try {
    const r = execSync('where chrome', { encoding: 'utf8', timeout: 3000 }).split('\n')[0].trim();
    if (r && fs.existsSync(r)) return r;
  } catch (e) { /* not found */ }
  try {
    const r = execSync('where msedge', { encoding: 'utf8', timeout: 3000 }).split('\n')[0].trim();
    if (r && fs.existsSync(r)) return r;
  } catch (e) { /* not found */ }
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ---- 启动 ----
server.listen(PORT, () => {
  console.log('============================================');
  console.log('  Jingzong Work Log System');
  console.log('============================================');
  console.log('  Server started: http://localhost:' + PORT);

  const browser = findBrowser();
  if (!browser) {
    console.log('  Chrome/Edge not found.');
    console.log('  Open http://localhost:' + PORT + ' in your browser.');
    return;
  }

  // --app= 模式：无地址栏、无标签栏
  const app = spawn(browser, [
    '--kiosk=http://localhost:' + PORT + '/',
    '--no-default-browser-check',
    '--no-first-run',
  ], { stdio: 'ignore' });

  app.on('exit', () => {
    console.log('  Window closed. Stopping server...');
    server.close(() => process.exit(0));
  });
});

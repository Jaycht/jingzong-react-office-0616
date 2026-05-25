/**
 * 缁忎睛澶ч槦宸ヤ綔璁板綍绠＄悊绯荤粺 鈥?妗岄潰鍚姩鍣?
 * 鍙屽嚮 server.js 鎴栫敤 start.bat 鍚姩
 *
 * 鍔熻兘锛氬惎鍔ㄦ湰鍦?HTTP 鏈嶅姟鍣?鈫?鐢?Chrome/Edge 鏃犲３绐楀彛鎵撳紑
 *       锛堟棤鍦板潃鏍忋€佹棤鏍囩鏍忥紝澶栬璺熸櫘閫氳蒋浠朵竴鏍凤級
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

// ---- 妫€鏌?dist ----
if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error('ERROR: dist/index.html not found. Run: npm run build:web');
  process.exit(1);
}

// ---- MIME 鏄犲皠 ----
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

// ---- HTTP 鏈嶅姟鍣?----
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

// ---- 鎵炬祻瑙堝櫒 ----
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

// ---- 鍚姩 ----
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

  // --app= 妯″紡锛氭棤鍦板潃鏍忋€佹棤鏍囩鏍?
  const app = spawn(browser, [
    '--app=http://localhost:' + PORT + '/',
    '--no-default-browser-check',
    '--no-first-run',
  ], { stdio: 'ignore' });

  app.on('exit', () => {
    console.log('  Window closed. Stopping server...');
    server.close(() => process.exit(0));
  });
});


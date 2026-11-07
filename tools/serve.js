#!/usr/bin/env node
// Local dev server for JIZURA (Node only, no packages needed).
//   node tools/serve.js [--port 8765] [--no-open] [--no-watch]
// - builds the browser editions into _site/ (python build.py with JIZURA_OUT=_site, so the committed pages stay untouched)
// - serves _site/ (falling back to the repo root for JIZURA_AE.jsx, the CEP zip, etc.) at http://localhost:8765/
// - watches src/ app/ vendor/ VERSION: on save it rebuilds and the open browser tabs reload by themselves
// No Content-Length on responses (chunked transfer): filtering software such as AdGuard injects a <script> into local
// pages but keeps the original Content-Length, which cuts off the end of the 2.4 MB page (and stalls python -m http.server).
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '_site');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const portArg = args.indexOf('--port');
let port = portArg >= 0 ? +args[portArg + 1] : 8765;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.jsx': 'application/octet-stream', '.zip': 'application/zip',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4',
};
const RELOAD = '<script>(function(){try{var e=new EventSource("/__reload");e.onmessage=function(){location.reload()}}catch(_){}})()</script>';

// ---------- build ----------
let building = false, again = false;
const clients = new Set();
function python() { return process.platform === 'win32' ? 'python' : 'python3'; }
function build() {
  if (building) { again = true; return; }
  building = true;
  const t0 = Date.now();
  const p = spawn(python(), ['build.py'], {
    cwd: ROOT, env: { ...process.env, JIZURA_OUT: '_site', PYTHONUTF8: '1' }, stdio: ['ignore', 'ignore', 'pipe'],
  });
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  p.on('error', (e) => { console.error('[build] python を起動できません:', e.message); building = false; });
  p.on('close', (code) => {
    building = false;
    if (code === 0) {
      console.log(`[build] OK (${((Date.now() - t0) / 1000).toFixed(1)}s) ${new Date().toLocaleTimeString()}`);
      for (const c of clients) c.write('data: reload\n\n');
    } else {
      console.error('[build] 失敗しました（前回のビルドのまま配信します）\n' + err.trim().split('\n').slice(-12).join('\n'));
    }
    if (again) { again = false; build(); }
  });
}

// ---------- watch ----------
function watch() {
  let timer = null;
  const kick = (what) => { clearTimeout(timer); timer = setTimeout(() => { console.log('[watch] 変更:', what); build(); }, 250); };
  for (const d of ['src', 'app', 'vendor']) {
    const dir = path.join(ROOT, d);
    if (!fs.existsSync(dir)) continue;
    fs.watch(dir, { recursive: true }, (_, f) => {
      if (!f || /__pycache__|\.pyc$|~$|\.swp$/.test(f)) return;
      kick(d + '/' + f);
    });
  }
  fs.watch(path.join(ROOT, 'VERSION'), () => kick('VERSION'));
}

// ---------- serve ----------
function resolveIn(base, urlPath) {
  const p = path.resolve(base, '.' + urlPath);
  return p === base || p.startsWith(base + path.sep) ? p : null;
}
function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}
const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return send(res, 400, 'text/plain', 'bad request'); }
  if (urlPath === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(': hi\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (/(^|\/)\.git(\/|$)/.test(urlPath)) return send(res, 404, 'text/plain', 'not found');
  for (const base of [OUT, ROOT]) {
    let file = resolveIn(base, urlPath);
    if (!file || !fs.existsSync(file)) continue;
    if (fs.statSync(file).isDirectory()) {
      if (!urlPath.endsWith('/')) { res.writeHead(301, { Location: urlPath + '/' }); return res.end(); }
      file = path.join(file, 'index.html');
      if (!fs.existsSync(file)) continue;
    }
    const ext = path.extname(file).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    if (ext === '.html') {
      let html = fs.readFileSync(file, 'utf8');
      const i = html.lastIndexOf('</body>');
      html = i >= 0 ? html.slice(0, i) + RELOAD + html.slice(i) : html + RELOAD;
      return send(res, 200, type, html);
    }
    const buf = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    return res.end(buf);
  }
  send(res, 404, 'text/plain; charset=utf-8', 'not found: ' + urlPath);
});

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true, windowsVerbatimArguments: process.platform === 'win32' }).unref();
}

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && portArg < 0 && port < 8790) { port++; server.listen(port, '127.0.0.1'); return; }
  console.error('サーバーを起動できません:', e.message); process.exit(1);
});
server.on('listening', () => {
  const url = `http://localhost:${port}/`;
  console.log(`JIZURA ローカル: ${url}  （英語版 ${url}en/）  終了は Ctrl+C`);
  if (!flag('--no-open')) openBrowser(url);
});

// first build, then serve
console.log('[build] ビルド中…');
const first = spawn(python(), ['build.py'], { cwd: ROOT, env: { ...process.env, JIZURA_OUT: '_site', PYTHONUTF8: '1' }, stdio: ['ignore', 'ignore', 'inherit'] });
first.on('error', (e) => { console.error('python が見つかりません（Python 3 を入れてください）:', e.message); process.exit(1); });
first.on('close', (code) => {
  if (code !== 0 && !fs.existsSync(path.join(OUT, 'index.html'))) { console.error('[build] 失敗しました'); process.exit(1); }
  console.log(code === 0 ? '[build] OK' : '[build] 失敗（前回のビルドで配信します）');
  if (!flag('--no-watch')) watch();
  server.listen(port, '127.0.0.1');
});

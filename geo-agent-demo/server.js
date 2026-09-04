// GEO-Agent Studio 本地代理
// 用法：
//   node server.js                     # 启动 http://localhost:5173
//   LLM_API_KEY=sk-xxx node server.js  # 服务端持有 Key，浏览器无需填写
// 说明：静态托管本目录 demo，并把 /api/llm/chat/completions 转发到目标 LLM，
//       从而规避浏览器直连 DeepSeek 等服务的 CORS 跨域问题。

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const DIR = __dirname;
// 服务端 Key：优先级高于浏览器传来的 Key
const SERVER_KEY = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || '';

function cors(origin) {
  const allowOrigin = !origin || origin === 'null' ? '*' : origin;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

function serveStatic(req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  if (p === '/favicon.ico') { res.writeHead(204, cors(req.headers.origin)); res.end(); return; }
  const filePath = path.resolve(DIR, '.' + p);
  if (!filePath.startsWith(path.resolve(DIR))) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.md': 'text/plain; charset=utf-8',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

function proxyChat(req, res, body) {
  const origin = req.headers.origin || '';
  let baseUrl = body.baseUrl || process.env.LLM_BASE_URL || '';
  delete body.baseUrl;
  if (!baseUrl) {
    res.writeHead(400, Object.assign({ 'Content-Type': 'application/json' }, cors(origin)));
    res.end(JSON.stringify({ error: { message: '缺少 baseUrl，请确认 demo 已配置 API Base URL（或设置 LLM_BASE_URL 环境变量）' } }));
    return;
  }
  const key = SERVER_KEY || (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!key) {
    res.writeHead(401, Object.assign({ 'Content-Type': 'application/json' }, cors(origin)));
    res.end(JSON.stringify({ error: { message: '未提供 API Key：请在设置中填写，或用 LLM_API_KEY 环境变量在服务端配置' } }));
    return;
  }

  const url = new URL(baseUrl.replace(/\/+$/, '') + '/chat/completions');
  const payload = JSON.stringify(body);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + key,
    'Content-Length': Buffer.byteLength(payload)
  };
  const lib = url.protocol === 'https:' ? https : http;
  const upstream = lib.request(url, { method: 'POST', headers }, (up) => {
    res.writeHead(up.statusCode || 502, Object.assign({ 'Content-Type': up.headers['content-type'] || 'application/json' }, cors(origin)));
    up.pipe(res);
  });
  upstream.on('error', (e) => {
    res.writeHead(502, Object.assign({ 'Content-Type': 'application/json' }, cors(origin)));
    res.end(JSON.stringify({ error: { message: '代理请求失败：' + e.message } }));
  });
  upstream.write(payload);
  upstream.end();
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors(req.headers.origin)); res.end(); return;
  }
  if (req.url.split('?')[0] === '/api/llm/chat/completions' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => (raw += c));
    req.on('end', () => {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch (e) { body = {}; }
      proxyChat(req, res, body);
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`GEO-Agent Studio 本地代理已启动`);
  console.log(`  访问: http://localhost:${PORT}/`);
  console.log(`  代理: POST http://localhost:${PORT}/api/llm/chat/completions`);
  console.log(SERVER_KEY ? '  已使用服务端 LLM_API_KEY（浏览器无需填 Key）' : '  未设置服务端 Key（将使用浏览器填写的 Key）');
});

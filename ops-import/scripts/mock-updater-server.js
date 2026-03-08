#!/usr/bin/env node
const http = require('http');
const { URL } = require('url');

const PORT = Number(process.env.MOCK_UPDATER_PORT || 8788);
const ADMIN_TOKEN = process.env.MOCK_ADMIN_TOKEN || 'admin-token';
const CLIENT_TOKEN = process.env.MOCK_CLIENT_TOKEN || 'client-token';

const state = {
  artifacts: new Map(),
  releases: new Map(),
};

function send(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': String(body.length) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (u.pathname === '/health') {
    return send(res, 200, { ok: true, service: 'mock-updater-server' });
  }

  if (u.pathname === '/admin/upload-installer' && req.method === 'POST') {
    if ((req.headers['x-admin-token'] || '') !== ADMIN_TOKEN) return send(res, 401, { ok: false, error: 'unauthorized' });
    const fileName = u.searchParams.get('fileName') || 'Carapace-Setup.exe';
    const body = await readBody(req);
    state.artifacts.set(fileName, body);
    return send(res, 200, { ok: true, path: `/artifacts/${encodeURIComponent(fileName)}`, size: body.length });
  }

  if (u.pathname === '/admin/publish' && req.method === 'POST') {
    if ((req.headers['x-admin-token'] || '') !== ADMIN_TOKEN) return send(res, 401, { ok: false, error: 'unauthorized' });
    const raw = (await readBody(req)).toString('utf8') || '{}';
    const payload = JSON.parse(raw);
    const key = `${payload.platform || 'win'}:${payload.channel || 'stable'}`;
    state.releases.set(key, payload);
    return send(res, 200, { ok: true, release: payload });
  }

  if (u.pathname === '/updates/check') {
    const token = u.searchParams.get('token') || '';
    if (token !== CLIENT_TOKEN) return send(res, 401, { ok: false, error: 'unauthorized' });
    const platform = u.searchParams.get('platform') || 'win';
    const channel = u.searchParams.get('channel') || 'stable';
    const version = u.searchParams.get('version') || '0.0.0';
    const key = `${platform}:${channel}`;
    const release = state.releases.get(key);
    if (!release) return send(res, 200, { ok: true, updateAvailable: false, reason: 'no release' });
    const updateAvailable = release.version !== version;
    return send(res, 200, { ok: true, updateAvailable, latest: release.version, url: release.url, notes: release.notes || '' });
  }

  return send(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-updater] http://127.0.0.1:${PORT}`);
  console.log(`[mock-updater] admin token: ${ADMIN_TOKEN}`);
  console.log(`[mock-updater] client token: ${CLIENT_TOKEN}`);
});

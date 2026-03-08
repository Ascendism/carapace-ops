#!/usr/bin/env node
/**
 * Local Ops Bridge
 * - Binds to localhost only.
 * - Injects stored tokens so calls never need raw tokens at call sites.
 * - Bridges to remote Carapace Ops Control API + DigitalOcean billing endpoint.
 *
 * Config path (default): secrets/ops-bridge.local.json
 * Override: OPS_BRIDGE_CONFIG=/absolute/path.json
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', 'secrets', 'ops-bridge.local.json');
const CONFIG_PATH = process.env.OPS_BRIDGE_CONFIG ? path.resolve(process.env.OPS_BRIDGE_CONFIG) : DEFAULT_CONFIG_PATH;

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function loadConfig() {
  const cfg = readJsonSafe(CONFIG_PATH, null);
  if (!cfg || typeof cfg !== 'object') throw new Error(`Missing/invalid config: ${CONFIG_PATH}`);
  if (!cfg.serverBaseUrl) throw new Error('config.serverBaseUrl is required');
  return cfg;
}

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': String(body.length) });
  res.end(body);
}

async function requestJson(url, { method = 'GET', headers = {}, body = null, timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method, headers, body, signal: controller.signal });
    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    return { ok: r.ok, status: r.status, json };
  } finally {
    clearTimeout(t);
  }
}

function authHeaders(config, role) {
  if (role === 'admin') return { 'x-admin-token': String(config.adminToken || '') };
  if (role === 'agent') return { 'x-agent-token': String(config.agentToken || '') };
  if (role === 'client') return { 'x-update-token': String(config.clientToken || '') };
  return {};
}

async function handle(req, res) {
  const config = loadConfig();
  const u = new URL(req.url, 'http://127.0.0.1');
  const serverBase = String(config.serverBaseUrl).replace(/\/$/, '');

  if (u.pathname === '/health') {
    return sendJson(res, 200, { ok: true, service: 'local-ops-bridge', configPath: CONFIG_PATH });
  }

  if (u.pathname === '/bridge/server/health') {
    const out = await requestJson(`${serverBase}/health`);
    return sendJson(res, out.status || 500, out.json || { ok: false });
  }

  if (u.pathname === '/bridge/admin/upload-installer' && req.method === 'POST') {
    const fileName = u.searchParams.get('fileName') || 'Carapace-Setup.exe';
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const out = await requestJson(`${serverBase}/admin/upload-installer?fileName=${encodeURIComponent(fileName)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream', ...authHeaders(config, 'admin') },
      body,
      timeoutMs: 300000,
    });
    return sendJson(res, out.status || 500, out.json || { ok: false });
  }

  if (u.pathname === '/bridge/admin/publish' && req.method === 'POST') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const out = await requestJson(`${serverBase}/admin/publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(config, 'admin') },
      body: raw || '{}',
    });
    return sendJson(res, out.status || 500, out.json || { ok: false });
  }

  if (u.pathname === '/bridge/updates/check') {
    const platform = u.searchParams.get('platform') || 'win';
    const channel = u.searchParams.get('channel') || 'stable';
    const version = u.searchParams.get('version') || '';
    const out = await requestJson(`${serverBase}/updates/check?platform=${encodeURIComponent(platform)}&channel=${encodeURIComponent(channel)}&version=${encodeURIComponent(version)}&token=${encodeURIComponent(config.clientToken || '')}`);
    return sendJson(res, out.status || 500, out.json || { ok: false });
  }

  if (u.pathname === '/bridge/ops/tasks') {
    const role = u.searchParams.get('role') === 'agent' ? 'agent' : 'admin';
    const status = u.searchParams.get('status') || '';
    const qs = status ? `?status=${encodeURIComponent(status)}&token=${encodeURIComponent(role === 'agent' ? config.agentToken : config.adminToken)}` : `?token=${encodeURIComponent(role === 'agent' ? config.agentToken : config.adminToken)}`;
    const out = await requestJson(`${serverBase}/ops/tasks${qs}`);
    return sendJson(res, out.status || 500, out.json || { ok: false });
  }

  if (u.pathname === '/bridge/ops/tasks/create' && req.method === 'POST') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const out = await requestJson(`${serverBase}/ops/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders(config, 'admin') },
      body: raw || '{}',
    });
    return sendJson(res, out.status || 500, out.json || { ok: false });
  }

  if (u.pathname === '/bridge/github/repos') {
    const org = u.searchParams.get('org') || '';
    const out = await requestJson(`${serverBase}/ops/github/repos?org=${encodeURIComponent(org)}&token=${encodeURIComponent(config.adminToken || '')}`);
    return sendJson(res, out.status || 500, out.json || { ok: false });
  }

  if (u.pathname === '/bridge/github/pulls') {
    const owner = u.searchParams.get('owner') || '';
    const repo = u.searchParams.get('repo') || '';
    const state = u.searchParams.get('state') || 'open';
    const out = await requestJson(`${serverBase}/ops/github/pulls?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&state=${encodeURIComponent(state)}&token=${encodeURIComponent(config.adminToken || '')}`);
    return sendJson(res, out.status || 500, out.json || { ok: false });
  }

  if (u.pathname === '/bridge/cloud/do/usage') {
    const out = await requestJson(`${serverBase}/ops/cloud/digitalocean/usage?token=${encodeURIComponent(config.adminToken || '')}`);
    return sendJson(res, out.status || 500, out.json || { ok: false });
  }

  return sendJson(res, 404, { ok: false, error: 'route not found' });
}

function main() {
  const cfg = loadConfig();
  const port = Number(cfg.localPort || process.env.OPS_BRIDGE_PORT || 8799);
  const host = '127.0.0.1';
  const s = http.createServer((req, res) => {
    handle(req, res).catch((err) => sendJson(res, 500, { ok: false, error: String(err?.message || err) }));
  });
  s.listen(port, host, () => {
    console.log(`[ops-bridge] listening on http://${host}:${port}`);
    console.log(`[ops-bridge] config: ${CONFIG_PATH}`);
    console.log(`[ops-bridge] target: ${cfg.serverBaseUrl}`);
  });
}

main();

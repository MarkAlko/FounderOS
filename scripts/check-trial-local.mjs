#!/usr/bin/env node
/**
 * Boot a loopback trial and print HTTP status codes only.
 * Reads the handoff file. Does not print it.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const secretFile = process.env.GLADOS_TRIAL_SECRET_FILE || '/cursor/stores/self/founderos-trial.env';
const port = process.env.TRIAL_CHECK_PORT || '4102';
const raw = readFileSync(secretFile, 'utf8');
const fileEnv = {};
for (const line of raw.split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i <= 0) continue;
  fileEnv[line.slice(0, i)] = line.slice(i + 1);
}
const password = fileEnv.TRIAL_PASSWORD;
if (!password || !fileEnv.GLADOS_PASSWORD_HASH || !fileEnv.GLADOS_SESSION_SECRET) {
  process.stderr.write('handoff file is missing required keys\n');
  process.exit(1);
}

const childEnv = {
  ...process.env,
  GLADOS_TRIAL: '1',
  GLADOS_PASSWORD_HASH: fileEnv.GLADOS_PASSWORD_HASH,
  GLADOS_SESSION_SECRET: fileEnv.GLADOS_SESSION_SECRET,
  GLADOS_HOST: '127.0.0.1',
  PORT: port,
};
delete childEnv.TRIAL_PASSWORD;

const child = spawn(process.execPath, ['scripts/serve.mjs', 'dev'], {
  env: childEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
child.stdout.on('data', (b) => { log += b; });
child.stderr.on('data', (b) => { log += b; });

const base = `http://127.0.0.1:${port}`;
async function waitReady() {
  const start = Date.now();
  while (Date.now() - start < 90000) {
    try {
      const res = await fetch(`${base}/api/auth/check`);
      if (res.status) return;
    } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server did not answer');
}

function cookieOf(res) {
  const set = res.headers.getSetCookie?.() || [];
  const rawCookie = set.find((c) => c.startsWith('glados_session=')) || res.headers.get('set-cookie') || '';
  return rawCookie.split(';')[0];
}

try {
  await waitReady();
  const anonPage = await fetch(`${base}/finances`, { redirect: 'manual' });
  const anonApi = await fetch(`${base}/api/connections`);
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const cookie = cookieOf(login);
  const authedPage = await fetch(`${base}/`, { headers: { cookie }, redirect: 'manual' });
  const authedApi = await fetch(`${base}/api/connections`, { headers: { cookie } });
  const blocked = await fetch(`${base}/api/wizard/send`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: '{}',
  });
  const lines = [
    `anon_page ${anonPage.status}`,
    `anon_api ${anonApi.status}`,
    `login ${login.status}`,
    `authed_page ${authedPage.status}`,
    `authed_api ${authedApi.status}`,
    `blocked_send ${blocked.status}`,
  ];
  process.stdout.write(lines.join('\n') + '\n');
  const ok = anonPage.status === 307 || anonPage.status === 302
    && anonApi.status === 401
    && login.status === 200
    && authedPage.status === 200
    && authedApi.status === 200
    && blocked.status === 403;
  if (!ok) process.exitCode = 1;
} catch (err) {
  process.stderr.write(`trial check failed: ${err instanceof Error ? err.message : 'error'}\n`);
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  setTimeout(() => child.kill('SIGKILL'), 2000);
}

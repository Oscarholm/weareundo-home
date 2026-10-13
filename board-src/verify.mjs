#!/usr/bin/env node
// Verify a board pack survives StaticCrypt before it goes out to the board.
//
//   node board-src/verify.mjs 202610
//
// Renders board-src/ → a temp dir, encrypts the chosen pack with a THROWAWAY
// password, serves it over localhost (WebCrypto needs a secure context, so
// file:// will not do), unlocks it in headless Chrome and reports what the
// board would actually see: slide count, broken images, fonts, CSP violations.
//
// Never needs — and never asks for — the real board password. The repo salt in
// .staticrypt.json is read but not modified.

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const meeting = process.argv[2];
if (!/^[0-9]{6}$/.test(meeting || '')) {
  console.error('usage: node board-src/verify.mjs <yyyymm>');
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'board-verify-'));
const PASSWORD = 'throwaway-verify-password';

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].find((p) => fs.existsSync(p));

if (!CHROME) {
  console.error('No Chrome/Chromium found — install one or verify by hand in a browser.');
  process.exit(1);
}

const cleanup = [];
const done = async (code) => {
  for (const fn of cleanup.reverse()) { try { fn(); } catch {} }
  // Chrome keeps writing to its profile for a moment after SIGTERM, so retry.
  await new Promise((r) => setTimeout(r, 500));
  try { fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
  process.exit(code);
};

// 1. render + encrypt with the throwaway password
console.log(`Rendering and encrypting ${meeting} with a throwaway password…`);
const staged = path.join(TMP, 'staged');
execFileSync('node', ['board-src/render.mjs', '--out', staged], { cwd: ROOT, stdio: 'pipe' });

const src = path.join(staged, meeting, 'index.html');
if (!fs.existsSync(src)) {
  console.error(`No rendered pack at board-src/${meeting}/index.html`);
  await done(1);
}

const encDir = path.join(TMP, 'enc');
const saltBefore = fs.readFileSync(path.join(ROOT, '.staticrypt.json'), 'utf8');
execFileSync('npx', ['staticrypt', src, '-d', encDir, '--short', '--remember', '30'], {
  cwd: ROOT,
  stdio: 'pipe',
  env: { ...process.env, STATICRYPT_PASSWORD: PASSWORD },
});
if (fs.readFileSync(path.join(ROOT, '.staticrypt.json'), 'utf8') !== saltBefore) {
  console.error('! .staticrypt.json changed during verify — restore it before committing');
}

const encrypted = path.join(encDir, 'index.html');
const plainSize = fs.statSync(src).size;
const encSize = fs.statSync(encrypted).size;

// 2. serve it — WebCrypto is unavailable on file://, so localhost is required
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(encrypted));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
cleanup.push(() => server.close());
const url = `http://localhost:${server.address().port}/index.html`;

// 3. unlock it in headless Chrome
const profile = path.join(TMP, 'profile');
const port = 9333;
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
cleanup.push(() => chrome.kill());

const waitFor = async (fn, ms = 20000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try { return await fn(); } catch { await new Promise((r) => setTimeout(r, 300)); }
  }
  throw new Error('timed out waiting for Chrome');
};

const tab = await waitFor(async () => {
  const r = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!r.ok) throw new Error('not ready');
  return r.json();
});

const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const violations = [];
const send = (method, params = {}) => new Promise((res) => {
  const i = ++id;
  pending.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === 'Log.entryAdded') {
    const t = m.params.entry.text || '';
    if (/content security policy|refused to/i.test(t)) violations.push(t);
  }
};
await new Promise((res) => { ws.onopen = res; });
await send('Log.enable');
await send('Runtime.enable');

const ev = async (expr) =>
  (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

await new Promise((r) => setTimeout(r, 3000));
const lockedTitle = await ev('document.title');

// submit the real password form, exactly as a director would
await ev(`(()=>{const i=document.getElementById('staticrypt-password');
  i.value=${JSON.stringify(PASSWORD)};
  document.getElementById('staticrypt-form').dispatchEvent(
    new Event('submit',{cancelable:true,bubbles:true}));})()`);
await new Promise((r) => setTimeout(r, 10000));

const title = await ev('document.title');
const slides = await ev('document.querySelectorAll(".slide").length');
const imgs = await ev('document.querySelectorAll("img").length');
const broken = await ev('[...document.querySelectorAll("img")].filter(i=>i.complete&&i.naturalWidth===0).length');
const fonts = await ev('document.fonts.size');
const fontStatus = await ev('document.fonts.status');

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`
  pack            ${mb(plainSize)} plain → ${mb(encSize)} encrypted
  unlocked        ${lockedTitle !== title ? 'yes' : 'NO — still on the password screen'}
  title           ${title}
  slides          ${slides}
  images          ${imgs} (${broken} broken)
  fonts           ${fonts} (${fontStatus})
  CSP violations  ${violations.length}`);
violations.slice(0, 10).forEach((v) => console.log(`    ${v}`));

const ok = slides > 0 && broken === 0 && violations.length === 0 && lockedTitle !== title;
console.log(ok ? '\nPASS — pack unlocks and renders.\n' : '\nFAIL — do not ship this pack.\n');
await done(ok ? 0 : 1);

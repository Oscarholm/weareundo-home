#!/usr/bin/env node
// Reads board-src/<yyyymm>/materials.json and injects:
//   - a <details> "Detailed reads" block into the matching meeting card on
//     the board index, replacing <!-- DETAILED_READS:<yyyymm> -->
//   - a "Detailed reads" appendix section into the meeting pack, replacing
//     <!-- DETAILED_READS -->
// Markers without a corresponding materials.json are simply removed.
// Output goes under --out (default .board-staged/), which build.sh feeds to staticcrypt.

import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const next = process.argv[i + 1];
    if (next && !next.startsWith('--')) { args[k] = next; i++; } else { args[k] = true; }
  }
}

const SRC = path.resolve('board-src');
const OUT = path.resolve(args.out || '.board-staged');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
}[c]));

const isSafeUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);

function readMaterials(dir) {
  const p = path.join(dir, 'materials.json');
  if (!fs.existsSync(p)) return null;
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { throw new Error(`${p}: invalid JSON — ${e.message}`); }
  if (!Array.isArray(parsed)) throw new Error(`${p}: expected an array of entries`);
  for (const m of parsed) {
    if (!m.title) throw new Error(`${p}: entry missing "title"`);
    if (!isSafeUrl(m.url)) throw new Error(`${p}: entry "${m.title}" has missing or non-http(s) "url"`);
  }
  return parsed;
}

function renderIndexExpand(items) {
  const rows = items.map((m) => {
    const kind = m.kind ? `<span class="read-kind">${esc(m.kind)}</span>` : '';
    const rel = m.related_to ? `<span class="read-rel">${esc(m.related_to)}</span>` : '';
    return `<li><a class="read-link" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${esc(m.title)} ↗</a>${kind}${rel}</li>`;
  }).join('');
  const label = items.length === 1 ? '1 detailed read' : `${items.length} detailed reads`;
  return `<details class="meeting-reads"><summary>${label}</summary><ul>${rows}</ul></details>`;
}

function renderPackPage(meetingId, items) {
  const cards = items.map((m) => {
    const kind = esc(m.kind || 'Reference');
    const rel = m.related_to ? `<div class="rr">Re: ${esc(m.related_to)}</div>` : '';
    return `<div class="read-card">
        <div class="rk">${kind}</div>
        <div class="rb">
          <div class="rt">${esc(m.title)}</div>
          ${rel}
        </div>
        <a class="rg" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Open ↗</a>
      </div>`;
  }).join('\n      ');
  return `
<!-- ============ DETAILED READS (generated) ============ -->
<section class="page">
  <div class="hd"><span class="sec">Detailed Reads</span><div class="meta"><span>Euraser Board · ${esc(meetingId)}</span><span>Reference</span><span>Strictly Confidential</span></div></div>
  <div class="body">
    <div class="secstrip"><span class="sn">REFERENCE</span><span class="st">Detailed Reads</span><span class="tm">Open in Drive</span></div>
    <h2 class="title">Detailed reads</h2>
    <p class="lede">Supporting documents referenced throughout this pack. Access is gated by Drive sharing &mdash; anyone with the link within the board circle.</p>
    <div class="reads-list">
      ${cards}
    </div>
  </div>
  <div class="ft"><span class="serif">Answers, Not Guesswork</span><span class="mid">Euraser Holdings — Board · Detailed Reads</span><span class="serif">We Remove Tattoos</span></div>
</section>
`;
}

function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }

function processIndex(byMeeting) {
  const inPath = path.join(SRC, 'index.html');
  const outPath = path.join(OUT, 'index.html');
  let html = fs.readFileSync(inPath, 'utf8');
  html = html.replace(/<!--\s*DETAILED_READS:([0-9]{6})\s*-->/g, (_, id) => {
    const items = byMeeting[id];
    return items && items.length ? renderIndexExpand(items) : '';
  });
  mkdirp(path.dirname(outPath));
  fs.writeFileSync(outPath, html);
  console.log(`  rendered → ${path.relative(process.cwd(), outPath)}`);
}

function processPack(meetingId, items) {
  const inPath = path.join(SRC, meetingId, 'index.html');
  const outDir = path.join(OUT, meetingId);
  const outPath = path.join(outDir, 'index.html');
  if (!fs.existsSync(inPath)) {
    console.log(`  ! skip ${meetingId} (no index.html)`);
    return;
  }
  let html = fs.readFileSync(inPath, 'utf8');
  html = html.replace(/<!--\s*DETAILED_READS\s*-->/g, () =>
    items && items.length ? renderPackPage(meetingId, items) : ''
  );
  mkdirp(outDir);
  fs.writeFileSync(outPath, html);
  console.log(`  rendered → ${path.relative(process.cwd(), outPath)}`);
}

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
mkdirp(OUT);

const meetingDirs = fs.readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^[0-9]{6}$/.test(d.name))
  .map((d) => d.name)
  .sort();

const byMeeting = {};
for (const id of meetingDirs) {
  byMeeting[id] = readMaterials(path.join(SRC, id));
}

processIndex(byMeeting);
for (const id of meetingDirs) processPack(id, byMeeting[id]);

console.log(`Staged → ${path.relative(process.cwd(), OUT)}`);

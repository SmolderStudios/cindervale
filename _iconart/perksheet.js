/* A/B sheet for the generated perk icons, against the SVG they would replace.
 *     node _iconart/perksheet.js
 *
 * Three columns per perk: the current hand-drawn SVG, then painted, then emblem.
 * Each shown at 30px — the size on the shop card — and large.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const CUT = path.join(__dirname, 'perkcut');
const raw = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');

/* the SVGs currently in the game, and the perk name each belongs to */
const svg = {}, label = {};
for (const m of raw.matchAll(/\n\s*(slp_[a-z_]+):\s*("(?:[^"\\]|\\.)*")/g)) svg[m[1]] = JSON.parse(m[2]);
for (const m of raw.matchAll(/ic:'(slp_[a-z_]+)',[\s\S]{0,200}?name:("[^"]+"|'[^']+')/g)) label[m[1]] = m[2].slice(1, -1);

const uri = f => 'data:image/png;base64,' + fs.readFileSync(path.join(CUT, f)).toString('base64');
const has = f => fs.existsSync(path.join(CUT, f));
const ids = Object.keys(svg);

const opt = (id, st) => {
  const f = id + '__' + st + '.png';
  if (!has(f)) return '<td class="miss">—</td>';
  const u = uri(f);
  return `<td><div class="cell">
    <span class="big"><img src="${u}"></span>
    <span class="tile"><img src="${u}"></span></div></td>`;
};

const html = `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#181109;color:#ead9b5;font:13px/1.4 ui-monospace,Consolas,monospace;padding:20px 24px 40px}
.ev-icon{width:1em;height:1em;display:inline-block;vertical-align:-0.12em}
h1{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#c79b4e;margin-bottom:4px}
.sub{color:#8a7350;margin-bottom:16px}
table{border-collapse:collapse}
th{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8a7350;padding:8px 14px}
td{padding:7px 14px;vertical-align:middle}
.nm{color:#c79b4e;text-align:right;white-space:nowrap}
.cell{display:flex;align-items:center;gap:12px;padding:10px 13px;border-radius:8px;
  background:#1a130e;border:1px solid #3f3124}
.big{font-size:76px;line-height:0}
.big img{width:76px;height:76px;object-fit:contain}
.tile{font-size:30px;line-height:0}
.tile img{width:30px;height:30px;object-fit:contain}
.miss{color:#5a4a30}
</style>
<h1>Perk icons — current SVG vs generated</h1>
<div class="sub">each shown large, then at 30px, which is the size on the shop card</div>
<table><tr><th></th><th>now (svg)</th><th>painted</th><th>emblem</th></tr>
${ids.map(id => `<tr>
  <td class="nm">${label[id] || id}</td>
  <td><div class="cell"><span class="big">${svg[id]}</span><span class="tile">${svg[id]}</span></div></td>
  ${opt(id, 'painted')}${opt(id, 'emblem')}
</tr>`).join('')}
</table>`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1000, height: 900, deviceScaleFactor: 2 });
  await p.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: path.join(__dirname, '_perkicons.png'), fullPage: true });
  console.log('shot _perkicons.png  (' + ids.length + ' perks)');
  await b.close();
})();

/* Compact contact sheet — many icons per row, so a whole family fits on one screen.
 *
 *     node _iconart/grid.js _sheet_tools family:tools
 *     node _iconart/grid.js _sheet_gear  slot:helmet
 *     node _iconart/grid.js _sheet_x     id1,id2,id3
 *
 * gearsheet.js gives one row per item, which is right for judging three versions
 * side by side and useless for reviewing sixty-six: it produced a 14,000px column
 * nobody can look at. This shows each icon once, at the chosen style, on the real
 * satchel tile — big enough to recognise, small enough that a family reads as a
 * family and a tier that came back the wrong colour stands out of the row.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const OUT = process.argv[2] || '_grid';
const SEL = process.argv[3] || 'family:gear';
const CUT = path.join(__dirname, 'cut');
/* CVTILE=200 renders fewer per row and bigger, for actually inspecting a slot
   rather than skimming it. */
const TILE = +(process.env.CVTILE || 132);
const picks = JSON.parse(fs.readFileSync(path.join(__dirname, 'picks.json'), 'utf8'));

function one(SEL) {
  if (SEL.startsWith('family:')) {
    const { FAMILIES } = require('./subjects');
    const f = FAMILIES[SEL.slice(7)];
    if (!f) throw new Error('families: ' + Object.keys(require('./subjects').FAMILIES).join(', '));
    return f.map(s => s.id);
  }
  if (SEL.startsWith('slot:')) return require('./gear.json').filter(g => g.s === SEL.slice(5)).map(g => g.id);
  if (SEL.startsWith('set:')) {
    const { GEAR_MAT } = require('./subjects3');
    const want = SEL.slice(4);
    const ORDER = { weapon: 0, shield: 1, helmet: 2, chest: 3, legs: 4, gloves: 5, boots: 6, cape: 7 };
    const slot = Object.fromEntries(require('./gear.json').map(g => [g.id, g.s]));
    return Object.entries(GEAR_MAT).filter(([, m]) => m === want).map(([id]) => id)
      .sort((a, b) => (ORDER[slot[a]] ?? 9) - (ORDER[slot[b]] ?? 9));
  }
  return SEL.split(',');
}
const IDS = [...new Set(SEL.split('+').flatMap(one))];
const KEPT = new Set(IDS.filter(id => !picks[id]));   // not packed = still SVG in the game

/* Names straight from the game, so a mislabelled tile is impossible. */
const raw = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');
const name = {};
for (const id of IDS) {
  const m = new RegExp(id + ":\\s*\\{\\s*name:\\s*('[^']*'|\"[^\"]*\")").exec(raw);
  name[id] = m ? m[1].slice(1, -1) : id;
}

const tile = id => {
  const style = picks[id] || 'painted';
  const f = path.join(CUT, id + '__' + style + '.png');
  const alt = path.join(CUT, id + '__' + (style === 'painted' ? 'emblem' : 'painted') + '.png');
  const use = fs.existsSync(f) ? f : (fs.existsSync(alt) ? alt : null);
  if (!use) return `<div class="t miss">${id}</div>`;
  const u = 'data:image/png;base64,' + fs.readFileSync(use).toString('base64');
  return `<div class="t">
    <div class="art"><img src="${u}"></div>
    <div class="sm"><img src="${u}"></div>
    <div class="nm">${name[id]}${KEPT.has(id) ? ' <span class="kept">svg</span>' : ''}</div></div>`;
};

const html = `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#140d07;color:#ead9b5;font:12px/1.35 ui-monospace,Consolas,monospace;padding:20px 22px 34px}
h1{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#c79b4e;margin-bottom:3px}
.sub{color:#8a7350;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(${TILE}px,1fr));gap:10px}
.t{background:linear-gradient(180deg,#221810,#170f09);border:1px solid #3f3124;border-radius:8px;
  padding:10px 8px 8px;text-align:center;position:relative}
.art{height:${Math.round(TILE*0.72)}px;display:flex;align-items:center;justify-content:center}
.art img{width:${Math.round(TILE*0.72)}px;height:${Math.round(TILE*0.72)}px;object-fit:contain}
.sm{position:absolute;top:7px;right:7px;width:15px;height:15px}
.sm img{width:15px;height:15px;object-fit:contain}
.nm{margin-top:6px;color:#a08a64;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.miss{color:#7a4a30;padding:30px 8px}
.kept{color:#c4543a}
</style>
<h1>${SEL} &mdash; ${IDS.length} icons</h1>
<div class="sub">large, with the real 15px satchel size in the corner of each tile</div>
<div class="grid">${IDS.map(tile).join('')}</div>`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1240, height: 900, deviceScaleFactor: 2 });
  await p.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 400));
  await p.screenshot({ path: path.join(__dirname, OUT + '.png'), fullPage: true });
  await b.close();
  const kb = fs.statSync(path.join(__dirname, OUT + '.png')).size / 1024;
  console.log('shot ' + OUT + '.png  (' + IDS.length + ' icons, ' + kb.toFixed(0) + ' KB)');
})();

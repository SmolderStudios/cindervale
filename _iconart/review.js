/* Build a self-contained review page for the gear art.
 *
 *     node _iconart/review.js        ->  _iconart/review.html
 *
 * A flat PNG contact sheet cannot be zoomed in the side panel, which is the whole
 * point when the question is "does this read at 15px and still look right at 200".
 * So: one HTML file, every icon embedded, with a set picker and a size slider.
 *
 * Icons go in at 128px WebP. The cut/ PNGs are ~25 KB each and 233 of them would
 * make a 6 MB page that takes a visible moment to open; WebP at q0.85 lands the
 * whole thing near 2 MB with no visible difference at these sizes.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const CUT = path.join(__dirname, 'cut');
const RECOL = path.join(__dirname, 'recol_cut');
const GEAR = require('./gear.json');
const { GEAR_MAT } = require('./subjects3');
const picks = JSON.parse(fs.readFileSync(path.join(__dirname, 'picks.json'), 'utf8'));

/* Sets in ladder order, so the picker reads as progression rather than alphabet. */
const METAL = ['bronze', 'iron', 'steel', 'mithril', 'cobalt', 'runite', 'starsteel',
  'gravesteel', 'moltensteel', 'voidsteel', 'dawn'];
const HIDE = ['roughhide', 'chitinweave', 'wolfhide', 'warband', 'ogrehide', 'trollhide',
  'drakehide', 'demonhide', 'wraithhide', 'emberhide', 'voidhide', 'sunweave',
  'silkwoven', 'cinder', 'barrow'];
const SLOT_ORDER = { weapon: 0, shield: 1, helmet: 2, chest: 3, legs: 4, gloves: 5, boots: 6, cape: 7 };

const slot = Object.fromEntries(GEAR.map(g => [g.id, g.s]));
const name = Object.fromEntries(GEAR.map(g => [g.id, g.n]));

const groups = [];
for (const m of [...METAL, ...HIDE]) {
  const ids = Object.entries(GEAR_MAT).filter(([, v]) => v === m).map(([id]) => id)
    .sort((a, b) => (SLOT_ORDER[slot[a]] ?? 9) - (SLOT_ORDER[slot[b]] ?? 9));
  if (ids.length) groups.push({ key: m, label: m + ' (' + ids.length + ')', ids });
}
/* Anything on no ladder is a boss drop — its own group, reviewed last. */
const loose = GEAR.map(g => g.id).filter(id => !GEAR_MAT[id])
  .sort((a, b) => (SLOT_ORDER[slot[a]] ?? 9) - (SLOT_ORDER[slot[b]] ?? 9));
if (loose.length) groups.push({ key: 'uniques', label: 'boss drops (' + loose.length + ')', ids: loose });

const ENC = `async (uri) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(img, 0, 0, 128, 128);
  return c.toDataURL('image/webp', 0.85);
}`;

(async () => {
  const br = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const p = await br.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle('(' + ENC + ')');

  const art = {};
  const recoloured = new Set();
  const all = [...new Set(groups.flatMap(g => g.ids))];
  for (const id of all) {
    const style = picks[id] || 'painted';
    /* recol_cut holds the ladder derived from one master per slot; it wins when present */
    let f = path.join(RECOL, id + '__painted.png');
    if (!fs.existsSync(f)) f = path.join(CUT, id + '__' + style + '.png');
    if (!fs.existsSync(f)) f = path.join(CUT, id + '__' + (style === 'painted' ? 'emblem' : 'painted') + '.png');
    if (!fs.existsSync(f)) continue;
    if (f.startsWith(RECOL)) recoloured.add(id);
    const uri = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    art[id] = await p.evaluate((g, u) => g(u), fn, uri);
  }
  await br.close();

  const data = JSON.stringify({ groups, art, name, slot, recol: [...recoloured] });
  const html = `<!doctype html><meta charset="utf-8"><title>Cindervale gear art</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#140d07;color:#ead9b5;font:13px/1.45 ui-monospace,Consolas,monospace}
header{position:sticky;top:0;z-index:5;background:#140d07f2;backdrop-filter:blur(6px);
  border-bottom:1px solid #3f3124;padding:12px 16px 10px}
h1{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#c79b4e;margin-bottom:9px}
.sets{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}
.sets button{background:#1a130e;border:1px solid #3f3124;color:#a08a64;border-radius:6px;
  padding:5px 10px;font:inherit;font-size:11.5px;cursor:pointer}
.sets button:hover{border-color:#6a5230;color:#ead9b5}
.sets button.on{border-color:#c79b4e;color:#f0c772;background:#241708}
.ctl{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:#8a7350;font-size:11.5px}
.ctl input[type=range]{width:190px;accent-color:#c79b4e}
.ctl label{display:flex;align-items:center;gap:7px;cursor:pointer}
main{padding:16px}
.grid{display:grid;gap:10px}
.t{background:linear-gradient(180deg,#221810,#170f09);border:1px solid #3f3124;
  border-radius:8px;padding:10px 8px 8px;text-align:center;position:relative}
.t img{image-rendering:auto;object-fit:contain;display:block;margin:0 auto}
.px{position:absolute;top:6px;right:6px;width:15px;height:15px}
.px img{width:15px;height:15px}
.nm{margin-top:7px;color:#a08a64;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sl{color:#6f5c40;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase}
.rc{color:#5f8f5f}
.zoom{position:fixed;inset:0;background:#0b0704ee;display:none;align-items:center;
  justify-content:center;flex-direction:column;gap:14px;z-index:20;cursor:zoom-out}
.zoom.on{display:flex}
.zoom img{width:min(74vmin,560px);height:min(74vmin,560px);object-fit:contain}
.zoom .cap{color:#c79b4e;letter-spacing:.1em}
</style>
<header>
  <h1>Cindervale &mdash; gear art review</h1>
  <div class="sets" id="sets"></div>
  <div class="ctl">
    <label>size <input type="range" id="size" min="15" max="240" value="120"><span id="sizev">120px</span></label>
    <label><input type="checkbox" id="tile" checked> show real 15px</label>
    <span id="count"></span>
    <span style="color:#6f5c40">click an icon to zoom</span>
  </div>
</header>
<main><div class="grid" id="grid"></div></main>
<div class="zoom" id="zoom"><img id="zimg"><div class="cap" id="zcap"></div></div>
<script>
const D = ${data};
let cur = D.groups[0].key;
const R = new Set(D.recol || []);
const $ = i => document.getElementById(i);

D.groups.forEach(g => {
  const b = document.createElement('button');
  b.textContent = g.label; b.dataset.k = g.key;
  b.onclick = () => { cur = g.key; draw(); };
  $('sets').appendChild(b);
});

function draw() {
  const g = D.groups.find(x => x.key === cur);
  [...$('sets').children].forEach(b => b.classList.toggle('on', b.dataset.k === cur));
  const s = +$('size').value;
  $('sizev').textContent = s + 'px';
  $('count').textContent = g.ids.length + ' pieces';
  $('grid').style.gridTemplateColumns = 'repeat(auto-fill,minmax(' + Math.max(96, s + 34) + 'px,1fr))';
  $('grid').innerHTML = g.ids.map(id => {
    const a = D.art[id];
    if (!a) return '<div class="t">' + id + '<div class="nm">no art</div></div>';
    return '<div class="t" data-id="' + id + '">'
      + '<img src="' + a + '" style="width:' + s + 'px;height:' + s + 'px">'
      + ($('tile').checked ? '<span class="px"><img src="' + a + '"></span>' : '')
      + '<div class="nm">' + (D.name[id] || id) + '</div>'
      + '<div class="sl">' + (D.slot[id] || '') + (R.has(id) ? ' <span class="rc">recol</span>' : '') + '</div></div>';
  }).join('');
}
$('size').oninput = draw;
$('tile').onchange = draw;
$('grid').onclick = e => {
  const t = e.target.closest('.t'); if (!t || !t.dataset.id) return;
  $('zimg').src = D.art[t.dataset.id];
  $('zcap').textContent = (D.name[t.dataset.id] || t.dataset.id) + '  ·  ' + t.dataset.id;
  $('zoom').classList.add('on');
};
$('zoom').onclick = () => $('zoom').classList.remove('on');
addEventListener('keydown', e => { if (e.key === 'Escape') $('zoom').classList.remove('on'); });
draw();
</script>`;

  const out = path.join(__dirname, 'review.html');
  fs.writeFileSync(out, html);
  console.log('review.html  ' + (Buffer.byteLength(html) / 1048576).toFixed(2) + ' MB, ' +
    Object.keys(art).length + ' icons, ' + groups.length + ' sets');
})();

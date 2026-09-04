/* Compare generated gear art against the SVG it would replace.
 *
 *     node _iconart/gearsheet.js _gear_probe id1,id2,id3
 *     node _iconart/gearsheet.js _gear_probe          (uses the probe set)
 *
 * Four columns: the SVG in the game now, then painted, then emblem. Each shown
 * large and then at the two sizes that actually matter — 31px is the biggest an
 * item icon ever renders (.act-icon) and 15px is the satchel grid, which is where
 * a player spends their time. A gear icon that only reads at 76px has failed.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const OUT = process.argv[2] || '_gear_probe';
const PROBE = ['bronze_helm', 'drake_helm', 'runite_chest', 'troll_legs', 'starsteel_boots',
  'mithril_gloves', 'dawnmantle', 'steel_buckler', 'warlord_bulwark',
  'bronze_sword', 'voidsteel_sword', 'grave_cleaver', 'starfang'];

/* Third argument is either a comma list of ids, or family:<name> / slot:<name>.
   233 gear items in one sheet is unreadable — reviewing a slot at a time is how
   you actually notice that one tier in a ladder came back the wrong colour. */
function resolveIds(a) {
  if (!a) return PROBE;
  if (a.startsWith('family:')) {
    const { FAMILIES } = require('./subjects');
    const f = FAMILIES[a.slice(7)];
    if (!f) throw new Error('families: ' + Object.keys(FAMILIES).join(', '));
    return f.map(s => s.id);
  }
  if (a.startsWith('slot:')) {
    const want = a.slice(5);
    return require('./gear.json').filter(g => g.s === want).map(g => g.id);
  }
  return a.split(',');
}
const IDS = resolveIds(process.argv[3]);

const CUT = path.join(__dirname, 'cut');
const raw = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');

/* Gear icons are BUILT, not stored: ICONS holds `bronze_sword: _swordSVGwpn(CR_PAL.bronze)`,
   so grepping the source for a `<svg` string finds nothing and the "now" column
   comes back empty. Boot the game and ask iconHTML() instead. */
const { JSDOM } = require(path.join(__dirname, '..', 'node_modules', 'jsdom'));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
let svg = {}, name = {};

async function loadLive() {
  const dom = new JSDOM(raw, { url: 'http://localhost/?cvdev=1', runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); } });
  await new Promise(r => setTimeout(r, 2500));
  const out = dom.window.eval('(function(){var o={};' + JSON.stringify(IDS) +
    '.forEach(function(id){o[id]={s:(typeof iconHTML==="function"?iconHTML(id):"")||"",' +
    'n:(ITEMS[id]&&ITEMS[id].name)||id};});return JSON.stringify(o);})()');
  const live = JSON.parse(out);
  for (const id of IDS) { svg[id] = live[id].s; name[id] = live[id].n; }
  dom.window.close();
}

const uri = f => 'data:image/png;base64,' + fs.readFileSync(path.join(CUT, f)).toString('base64');
const has = f => fs.existsSync(path.join(CUT, f));

const cell = inner => `<td><div class="cell">
  <span class="big">${inner}</span><span class="m31">${inner}</span><span class="m15">${inner}</span></div></td>`;
const opt = (id, st) => {
  const f = id + '__' + st + '.png';
  if (!has(f)) return '<td class="miss">not generated</td>';
  const img = `<img src="${uri(f)}">`;
  return cell(img);
};

const buildHtml = () => `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#181109;color:#ead9b5;font:13px/1.4 ui-monospace,Consolas,monospace;padding:20px 24px 40px}
.ev-icon{width:1em;height:1em;display:inline-block;vertical-align:-0.12em}
h1{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#c79b4e;margin-bottom:4px}
.sub{color:#8a7350;margin-bottom:16px}
table{border-collapse:collapse}
th{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8a7350;padding:8px 12px}
td{padding:6px 12px;vertical-align:middle}
.nm{color:#c79b4e;text-align:right;white-space:nowrap}
.cell{display:flex;align-items:center;gap:14px;padding:9px 12px;border-radius:8px;
  background:linear-gradient(180deg,#221810,#170f09);border:1px solid #3f3124}
.big{font-size:74px;line-height:0}.big img{width:74px;height:74px;object-fit:contain}
.m31{font-size:31px;line-height:0}.m31 img{width:31px;height:31px;object-fit:contain}
.m15{font-size:15px;line-height:0}.m15 img{width:15px;height:15px;object-fit:contain}
.miss{color:#7a4a30}
</style>
<h1>Gear probe — the SVG in the game now vs generated</h1>
<div class="sub">each shown large, then at 31px (the biggest an item icon ever renders) and 15px (the satchel grid)</div>
<table><tr><th></th><th>now (svg)</th><th>painted</th><th>emblem</th></tr>
${IDS.map(id => `<tr>
  <td class="nm">${name[id]}</td>
  ${svg[id] ? cell(svg[id]) : '<td class="miss">no svg found</td>'}
  ${opt(id, 'painted')}${opt(id, 'emblem')}
</tr>`).join('')}
</table>`;

(async () => {
  await loadLive();
  const missing = IDS.filter(id => !svg[id]);
  if (missing.length) console.log('no live icon for: ' + missing.join(', '));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2 });
  await p.setContent(buildHtml(), { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: path.join(__dirname, OUT + '.png'), fullPage: true });
  await b.close();
  console.log('shot ' + OUT + '.png  (' + IDS.length + ' items)');
})();

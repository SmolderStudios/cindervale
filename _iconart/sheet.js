/* Judge the icons where they actually live.
 *
 *     node _iconart/sheet.js [out.png]
 *
 * The monster pass's hardest lesson: art that looks great on a white grid can die
 * completely on the real surface. So this rebuilds the satchel tile — the game's
 * own panel colour, the tile gradient, the rim/under insets — and shows every icon
 * at the sizes measure.js found on screen:
 *
 *     12px  output chip     15px  satchel grid     19px  drop row     31px  activity card
 *
 * 15px is the one that matters. If it does not read there, it does not ship.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const CUT = path.join(__dirname, process.env.CVCUT || 'cut');
const OUT = path.join(__dirname, process.argv[2] || '_sheet.png');

const files = fs.readdirSync(CUT).filter(f => f.endsWith('.png'));
const ids = [...new Set(files.map(f => f.replace(/__(painted|emblem)\.png$/, '')))].sort();
const uri = f => 'data:image/png;base64,' + fs.readFileSync(path.join(CUT, f)).toString('base64');
const hasF = f => fs.existsSync(path.join(CUT, f));

/* Sizes straight out of measure.js, at 2x so the sheet is legible on a screen. */
const SIZES = [12, 15, 19, 31];
const K = 2;

function block(id, st) {
  const f = id + '__' + st + '.png';
  if (!hasF(f)) return '<td class="miss">—</td>';
  const u = uri(f);
  return '<td><div class="row">'
    + SIZES.map(s => `<span class="tile" style="width:${s*K + 10}px;height:${s*K + 10}px">
         <img src="${u}" style="width:${s*K}px;height:${s*K}px"></span>`).join('')
    + `<span class="big"><img src="${u}"></span>`
    + '</div></td>';
}

const html = `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#181109;color:#ead9b5;
  font:12px/1.3 ui-monospace,Consolas,monospace;padding:18px}
h1{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#a08a64;margin-bottom:4px}
.sub{color:#7a6446;margin-bottom:14px}
table{border-collapse:collapse}
th{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8a7350;padding:7px 10px}
td{padding:6px 10px;vertical-align:middle}
.id{color:#c79b4e;text-align:right;white-space:nowrap;font-size:12px}
.row{display:flex;align-items:center;gap:9px}
/* the real satchel tile: panel ground, lit top, rim + under insets */
.tile{display:grid;place-items:center;border-radius:6px;
  background:linear-gradient(180deg,#2a1d10,#1a1108);
  box-shadow:inset 0 1px 0 rgba(214,170,96,.17), inset 0 -1px 0 rgba(0,0,0,.55)}
.big{display:grid;place-items:center;width:84px;height:84px;border-radius:8px;
  background:linear-gradient(180deg,#2a1d10,#1a1108);
  box-shadow:inset 0 1px 0 rgba(214,170,96,.17), inset 0 -1px 0 rgba(0,0,0,.55)}
.big img{width:72px;height:72px}
.miss{color:#5a4a30}
.lbl{font-size:9px;color:#7a6446;text-align:center}
</style>
<h1>Item icons on the real satchel tile</h1>
<div class="sub">sizes are the game's own, doubled for this sheet: 12px chip &middot; 15px satchel &middot; 19px drop row &middot; 31px activity card &middot; then large</div>
<table>
<tr><th></th><th>painted</th><th>emblem</th></tr>
${ids.map(id => `<tr><td class="id">${id}</td>${block(id,'painted')}${block(id,'emblem')}</tr>`).join('')}
</table>`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1080, height: 900, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: OUT, fullPage: true });
  console.log('shot ' + path.basename(OUT) + '  (' + ids.length + ' items)');
  await b.close();
})();

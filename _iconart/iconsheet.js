/* Contact sheet for hand-authored SVG chrome icons.
 *
 *     node _iconart/iconsheet.js slp_        every ICONS entry with that prefix
 *
 * Exists because ten slayer perk icons went into the game in the same build they
 * were written in, with no preview. Any new art gets rendered and shown first —
 * SVG chrome included, not just generated raster art.
 *
 * Shows each at the size it is actually used (30px on the shop card) and large,
 * on the real card background, because a 30px icon and a 200px icon are different
 * drawings and only one of them is the one that ships.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const PREFIX = process.argv[2] || 'slp_';
const raw = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');

/* Pull the entries straight out of ICONS so the sheet cannot drift from the game. */
const icons = {};
const re = new RegExp('\\n\\s*(' + PREFIX + '[a-z_]+):\\s*("(?:[^"\\\\]|\\\\.)*")', 'g');
for (const m of raw.matchAll(re)) icons[m[1]] = JSON.parse(m[2]);
const keys = Object.keys(icons);
if (!keys.length) { console.error('no ICONS entries matching ' + PREFIX); process.exit(1); }

/* Label from the perk that uses each icon, so the sheet names them as a player would. */
const labels = {};
for (const m of raw.matchAll(/ic:'([a-z_]+)',[\s\S]{0,200}?name:("[^"]+"|'[^']+')/g)) {
  labels[m[1]] = m[2].slice(1, -1);
}

const cell = k => `<figure>
  <div class="card">
    <span class="big">${icons[k]}</span>
    <span class="real">${icons[k]}</span>
  </div>
  <figcaption>${labels[k] || k}<em>${k}</em></figcaption>
</figure>`;

const html = `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#181109;color:#ead9b5;font:13px/1.4 ui-monospace,Consolas,monospace;padding:20px}
/* The game's own rule. Without it the icons size to nothing: .ev-icon is 1em and
   an <svg> with no width/height collapses, so the first run of this sheet showed
   ten empty cards. */
.ev-icon{width:1em;height:1em;display:inline-block;vertical-align:-0.12em}
h1{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#c79b4e;margin-bottom:4px}
.sub{color:#8a7350;margin-bottom:18px}
.row{display:flex;flex-wrap:wrap;gap:14px}
figure{width:190px}
.card{display:flex;align-items:center;gap:14px;padding:14px;border-radius:8px;
  background:#1a130e;border:1px solid #3f3124}
.big{font-size:96px;line-height:0;filter:drop-shadow(0 3px 6px rgba(0,0,0,.6))}
.real{font-size:30px;line-height:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))}
figcaption{margin-top:7px;color:#e7dcc4;font-size:13px}
figcaption em{display:block;font-style:normal;color:#7a6a4a;font-size:11px;margin-top:2px}
</style>
<h1>Slayer perk icons</h1>
<div class="sub">each shown large, then at 30px — the size it renders on the shop card</div>
<div class="row">${keys.map(cell).join('')}</div>`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1080, height: 800, deviceScaleFactor: 2 });
  await p.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 400));
  const out = path.join(__dirname, '_icons_' + PREFIX.replace(/_$/, '') + '.png');
  await p.screenshot({ path: out, fullPage: true });
  console.log('shot ' + path.basename(out) + '  (' + keys.length + ' icons)');
  await b.close();
})();

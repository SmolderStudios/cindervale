// Contact sheet of the guild emblems + scenes, so the cover art can be composed
// from what actually exists rather than from guesses about it.
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const REPO = path.join(__dirname, '..');
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

const IDS = ['furrow', 'timber', 'delvers', 'deepwater', 'emberforge',
             'ashen', 'facet', 'legion', 'night', 'quiethand'];

const cell = (id, dir, cls) => {
  const p = path.join(REPO, '_guildsimple', dir, id + '.png');
  if (!fs.existsSync(p)) return '';
  return `<figure class="${cls}"><img src="${b64(p)}"><figcaption>${id}</figcaption></figure>`;
};

const html = `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#140c05;color:#c9ae7d;font:13px/1.3 ui-monospace,Consolas,monospace;padding:18px}
h2{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#8a7350;margin:16px 0 8px}
.row{display:flex;flex-wrap:wrap;gap:10px}
figure{text-align:center}
figcaption{margin-top:4px;font-size:11px;color:#8a7350}
.em img{width:150px;height:150px;display:block;border:1px solid #3a2a14}
.em.scr img{mix-blend-mode:screen;background:#2a1a0c}
.sc img{width:300px;display:block;border:1px solid #3a2a14}
</style>
<h2>emblems — art/ 512x512, as-is on their own black</h2>
<div class="row">${IDS.map(i => cell(i, 'art', 'em')).join('')}</div>
<h2>emblems — same files, mix-blend-mode:screen over a brown ground</h2>
<div class="row">${IDS.map(i => cell(i, 'art', 'em scr')).join('')}</div>
<h2>scenes — scenes/ 1152x384</h2>
<div class="row">${IDS.map(i => cell(i, 'scenes', 'sc')).join('')}</div>`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1700, height: 1000, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 400));
  await p.screenshot({ path: path.join(__dirname, 'guildsheet.png'), fullPage: true });
  console.log('shot guildsheet.png');
  await b.close();
})();

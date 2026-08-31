/* Contact sheet of whatever is in raw/, big enough to judge the art itself.
 *     node _iconart/probesheet.js [outfile.png]
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const RAW = path.join(__dirname, 'raw');
const OUT = path.join(__dirname, process.argv[2] || '_probe.png');

const files = fs.readdirSync(RAW).filter(f => f.endsWith('.png'));
const ids = [...new Set(files.map(f => f.replace(/__(painted|emblem)\.png$/, '')))];
const uri = f => 'data:image/png;base64,' + fs.readFileSync(path.join(RAW, f)).toString('base64');

const cell = (id, st) => {
  const f = id + '__' + st + '.png';
  if (!fs.existsSync(path.join(RAW, f))) return '<div class="miss">—</div>';
  return `<img src="${uri(f)}">`;
};

const html = `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#141414;color:#c9ae7d;font:12px/1.3 ui-monospace,Consolas,monospace;padding:16px}
table{border-collapse:collapse}
th{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#8a7350;padding:6px}
td{padding:5px;text-align:center}
img{width:210px;height:210px;display:block;border:1px solid #333;background:#222}
.miss{width:210px;height:210px;display:grid;place-items:center;border:1px dashed #444;color:#555}
.id{font-size:12px;color:#c9ae7d;text-align:right;padding-right:10px;white-space:nowrap}
</style>
<table>
<tr><th></th><th>painted</th><th>emblem</th></tr>
${ids.map(id => `<tr><td class="id">${id}</td><td>${cell(id, 'painted')}</td><td>${cell(id, 'emblem')}</td></tr>`).join('')}
</table>`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
  const p = await b.newPage();
  await p.setViewport({ width: 700, height: 900, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: OUT, fullPage: true });
  console.log('shot ' + path.basename(OUT) + '  (' + ids.length + ' items)');
  await b.close();
})();

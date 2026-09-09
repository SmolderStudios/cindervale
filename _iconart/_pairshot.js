/* Blow up a few tiles so an edge artefact is actually visible. */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const DIR = 'C:/Users/Jordan/Desktop/Cindervale/store/achievement icons';
const IDS = process.argv.slice(2);
const uri = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

let h = '<style>body{background:#1b2838;margin:0;padding:22px;font:13px "Segoe UI",system-ui;color:#c7d5e0}'
  + '.r{display:flex;align-items:center;gap:16px;margin-bottom:16px}'
  + '.r img{image-rendering:pixelated;border-radius:6px}'
  + '.b{width:192px;height:192px}.s{width:64px;height:64px}'
  + 'b{color:#fff}</style>';
for (const id of IDS) {
  h += '<div class="r">'
    + '<img class="b" src="' + uri(path.join(DIR, id + '.png')) + '">'
    + '<img class="b" src="' + uri(path.join(DIR, id + '_locked.png')) + '">'
    + '<img class="s" src="' + uri(path.join(DIR, id + '.png')) + '">'
    + '<div><b>' + id + '</b><br>3x unlocked / 3x locked / real 64px</div></div>';
}
(async () => {
  const br = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const p = await br.newPage();
  await p.setViewport({ width: 700, height: 400, deviceScaleFactor: 2 });
  await p.setContent(h, { waitUntil: 'load' });
  await p.screenshot({ path: path.join(__dirname, '_iconart', '_pairshot.png'), fullPage: true });
  await br.close();
  console.log('ok');
})();

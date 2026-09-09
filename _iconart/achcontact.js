/* Prove the Steam pairs at the size Steam shows them.
 *
 *     node _iconart/achcontact.js
 *
 * Sixty emblems that read beautifully at 250px are not sixty emblems that read at
 * 64. This lays every pair out at exactly 64x64 on the Steam page's own dark grey,
 * unlocked beside locked, which is the only honest check.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const DIR = 'C:/Users/Jordan/Desktop/Cindervale/store/achievement icons';

/* Every tile in the folder, not just the ids that came off a drawn sheet. The two
   hidden achievements take their tile from the game's own icon, so a sheet-driven
   list is exactly the list that would never show them. */
const IDS = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.png') && !f.endsWith('_locked.png') && !f.startsWith('_'))
  .map(f => f.slice(0, -4));

const uri = f => fs.existsSync(f) ? 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') : null;

let h = '<style>body{background:#1b2838;margin:0;padding:20px;font:12px "Segoe UI",system-ui;color:#c7d5e0}'
  + 'h1{font-size:17px;color:#fff;margin:0 0 3px}.s{color:#8f98a0;margin-bottom:16px;font-size:12px}'
  + '.g{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}'
  + '.c{background:#16202d;border-radius:4px;padding:8px 10px;display:flex;align-items:center;gap:9px}'
  + '.c img{width:64px;height:64px;image-rendering:auto;flex:none}'
  + '.n{min-width:0}.n b{color:#fff;font-size:12px;display:block}.n i{color:#8f98a0;font-style:normal;font-size:11px}'
  + '</style>';
h += '<h1>Cindervale achievement icons at Steam size</h1>'
  + '<div class="s">64x64, on the Steam achievement page background. Colour = unlocked, grey = locked.</div><div class="g">';
let missing = 0;
for (const id of IDS) {
  const a = uri(path.join(DIR, id + '.png')), b = uri(path.join(DIR, id + '_locked.png'));
  if (!a) { missing++; continue; }
  h += '<div class="c"><img src="' + a + '"><img src="' + b + '">'
    + '<div class="n"><b>' + id + '</b><i>unlocked / locked</i></div></div>';
}
h += '</div>';

(async () => {
  const br = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const p = await br.newPage();
  await p.setViewport({ width: 1240, height: 900, deviceScaleFactor: 2 });
  await p.setContent(h, { waitUntil: 'load' });
  await p.screenshot({ path: path.join(DIR, '_contact_sheet_new.png'), fullPage: true });
  await br.close();
  console.log('wrote ' + DIR + '/_contact_sheet_new.png  (' + (IDS.length - missing) + ' pairs)');
})().catch(e => { console.error(e); process.exit(1); });

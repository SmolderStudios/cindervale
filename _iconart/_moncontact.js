/* One flat PNG of every monster cut on the real panel brown, big enough that a
 * halo or a clipped leg is actually visible.
 *
 *     node _iconart/_moncontact.js            -> _shots/moncontact1.png ...
 *     CVCUT=cut_seg node _iconart/_moncontact.js
 *
 * The HTML contact page is several megabytes and neither the preview pane nor a
 * single read can take it. A flat image can.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const SHEETS = path.join(__dirname, 'sheets');
const CUT = path.join(__dirname, process.env.CVCUT || 'cut_mon');
const OUT = path.join(__dirname, '..', '_shots');
const COLS = 6, PER = 24, TILE = 210;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  /* Optional sheet-name arguments narrow it to one batch, so a raid pass does not
     render three pages of blanks for the 57 zone monsters. */
  const want = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const ids = [];
  for (const f of fs.readdirSync(SHEETS).filter(f => /^mon_.*\.txt$/.test(f)).sort()) {
    if (want.length && want.indexOf(f.replace(/\.txt$/, '')) < 0) continue;
    for (const id of fs.readFileSync(path.join(SHEETS, f), 'utf8').split(/\s+/).filter(Boolean)) ids.push(id);
  }

  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  let page = 0;
  for (let s = 0; s < ids.length; s += PER) {
    const part = ids.slice(s, s + PER);
    const rows = Math.ceil(part.length / COLS);
    await p.setViewport({ width: COLS * TILE, height: rows * (TILE + 22) });
    await p.setContent(`<style>
html,body{margin:0;background:#241a12;font:13px Georgia,serif;color:#f0dcc2}
.g{display:grid;grid-template-columns:repeat(${COLS},${TILE}px)}
.c{width:${TILE}px;text-align:center}
.c i{display:block;width:${TILE}px;height:${TILE}px;background-size:contain;
  background-repeat:no-repeat;background-position:center;outline:1px solid #3d2c1d;outline-offset:-1px}
.c b{display:block;font-weight:400;font-size:13px;line-height:22px}
</style><div class="g">` + part.map(id => {
      const f = path.join(CUT, id + '__painted.png');
      const u = fs.existsSync(f) ? 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') : '';
      return `<div class="c"><i style="background-image:url(${u})"></i><b>${id.replace(/_/g, ' ')}</b></div>`;
    }).join('') + '</div>', { waitUntil: 'load' });
    const out = path.join(OUT, 'moncontact' + (++page) + '.png');
    await p.screenshot({ path: out });
    console.log(out + '  ' + (fs.statSync(out).size / 1024).toFixed(0) + 'K');
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

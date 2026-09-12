/* Contact review of the keyed monster art, small enough for the preview pane.
 *
 *     node _iconart/_monreview.js            -> _monreview.html in the repo root
 *
 * Re-encodes each cut to 96px WebP purely for the review page: 57 PNGs at 256px is
 * several megabytes and the pane refuses anything near one. Groups by zone in SHEET
 * ORDER, because the thing most worth checking is not quality but LABELLING: if a
 * sheet came back in a different order than its id list, every name on it is wrong
 * and the game would ship a wolf called a lich.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const CUT = path.join(__dirname, process.env.CVCUT || 'cut_mon');
const SHEETS = path.join(__dirname, 'sheets');
const OUT = path.join(__dirname, '..', '_monreview.html');

const ENC = `async (uri, S, Q) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.clearRect(0, 0, S, S); x.drawImage(img, 0, 0, S, S);
  return c.toDataURL('image/webp', Q);
}`;

const PAGE = (css, body, page) => `<!doctype html><meta charset="utf-8"><title>Monster art review</title><style>
body{margin:0;padding:14px 18px;background:#120d0a;color:#e8d4bd;font:13px Georgia,serif}
h1{font-size:17px;margin:0 0 4px;color:#d8a95c}
h2{font-size:13px;margin:16px 0 7px;color:#a89076;letter-spacing:.09em;text-transform:uppercase;
  border-bottom:1px solid #3d2c1d;padding-bottom:5px;font-weight:400}
.row{display:flex;gap:10px;flex-wrap:wrap}
.c{width:120px;text-align:center}
.c i{display:block;width:120px;height:120px;border-radius:9px;border:1px solid #3d2c1d;
  background-color:#1d150f;background-size:contain;background-repeat:no-repeat;background-position:center bottom}
.c b{display:block;font-size:11.5px;font-weight:400;color:#e8d4bd;margin-top:3px}
.c s{color:#d8604a;text-decoration:none;font-size:11px}
.c.miss i{border-color:#7a4038}
${css}</style>
<h1>Monster art, page ${page} of 3. Keyed at 256px, shown at 120. Checking the NAME under each one.</h1>
${body}`;

(async () => {
  const groups = fs.readdirSync(SHEETS).filter(f => /^mon_.*\.txt$/.test(f)).sort().map(f => ({
    zone: f.replace(/^mon_|\.txt$/g, ''),
    ids: fs.readFileSync(path.join(SHEETS, f), 'utf8').split('\n').map(s => s.trim()).filter(Boolean)
  }));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const enc = await p.evaluateHandle(`(${ENC})`);

  /* Three pages of four zones. One tall page has to be scaled to fit the preview
     pane and the labels stop being readable, which defeats the point. */
  let css = '', body = '', missing = [], page = 1, done = 0;
  const flush = () => {
    fs.writeFileSync(OUT.replace('.html', page + '.html'), PAGE(css, body, page), 'utf8');
    css = ''; body = ''; page++;
  };
  for (const g of groups) {
    body += `<h2>${g.zone.replace(/_/g, ' ')}</h2><div class="row">`;
    for (const id of g.ids) {
      const f = path.join(CUT, id + '__painted.png');
      if (!fs.existsSync(f)) { missing.push(id); body += `<div class="c miss"><i></i><b>${id}</b><s>no cut</s></div>`; continue; }
      const uri = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
      const out = await p.evaluate((fn, u, S, q) => fn(u, S, q), enc, uri, 96, 0.8);
      css += `.i-${id}{background-image:url(${out})}\n`;
      body += `<div class="c"><i class="i-${id}"></i><b>${id.replace(/_/g, ' ')}</b></div>`;
    }
    body += '</div>';
    if (++done % 4 === 0) flush();
  }
  if (body) flush();
  await b.close();


  for (let i = 1; i < page; i++) console.log('wrote _monreview' + i + '.html  '
    + (fs.statSync(OUT.replace('.html', i + '.html')).size / 1024).toFixed(0) + 'K');
  console.log(''
    + (missing.length ? '  MISSING: ' + missing.join(', ') : ''));
})();

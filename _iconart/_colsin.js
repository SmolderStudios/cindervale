/* Column gutters WITHIN one horizontal band. Object rows on a hand-made sheet are
   not aligned to each other, so the only reliable column edges are the ones measured
   inside the row being cut. */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const SHEET = path.resolve(__dirname, process.argv[2]);
const BANDS = process.argv.slice(3).map(s => s.split('-').map(Number));
const WORK = `async (uri, BANDS) => {
  const img = new Image(); img.src = uri; await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const px = x.getImageData(0, 0, W, H).data;
  const lum = i => (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
  const bg = [0, W-1, (H-1)*W, W*H-1].map(lum).reduce((a,b)=>a+b,0) / 4;
  const ink = i => px[i*4+3] > 24 && lum(i) < bg - 8;
  return BANDS.map(([y0, y1]) => {
    const cols = [];
    for (let X = 0; X < W; X++) { let n = 0; for (let y = y0; y <= y1; y++) if (ink(y*W+X)) n++; cols.push(n); }
    const out = []; let s = -1;
    for (let i = 0; i < W; i++) { if (cols[i] === 0) { if (s < 0) s = i; } else if (s >= 0) { if (i - s >= 3) out.push([s, i-1]); s = -1; } }
    if (s >= 0) out.push([s, W-1]);
    return out;
  });
}`;
(async () => {
  const uri = 'data:image/png;base64,' + fs.readFileSync(SHEET).toString('base64');
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const p = await b.newPage();
  const r = await p.evaluate(new Function('return ' + WORK)(), uri, BANDS);
  await b.close();
  r.forEach((g, i) => console.log(BANDS[i].join('-') + ':  ' + g.map(q => q[0] + '-' + q[1]).join('  ')));
})().catch(e => { console.error(e); process.exit(1); });

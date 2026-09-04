/* Print the row (or column) ink profile of a sheet as coarse runs, for the sheets
   where nothing is fully blank — captions sit close enough to the art below that
   _lines.js finds no gutter at all. A run of rows whose coverage is under a percent
   is a gutter for slicing purposes even if a stray antialiased pixel keeps it from
   being literally empty. */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const SHEET = path.resolve(__dirname, process.argv[2] || '');
const AXIS = process.argv[3] || 'rows';
const COV = +(process.argv[4] || 0.004);
const MIN = +(process.argv[5] || 2);
const WORK = `async (uri, AXIS, COV, MIN) => {
  const img = new Image(); img.src = uri; await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const px = x.getImageData(0, 0, W, H).data;
  const lum = i => (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
  const bg = [0, W-1, (H-1)*W, W*H-1].map(lum).reduce((a,b)=>a+b,0) / 4;
  const ink = i => px[i*4+3] > 24 && lum(i) < bg - 8;
  const a = [];
  if (AXIS === 'rows') for (let y = 0; y < H; y++) { let n = 0; for (let X = 0; X < W; X++) if (ink(y*W+X)) n++; a.push(n/W); }
  else for (let X = 0; X < W; X++) { let n = 0; for (let y = 0; y < H; y++) if (ink(y*W+X)) n++; a.push(n/H); }
  const out = []; let s = -1;
  for (let i = 0; i < a.length; i++) { if (a[i] <= COV) { if (s < 0) s = i; } else if (s >= 0) { if (i - s >= MIN) out.push([s, i-1]); s = -1; } }
  if (s >= 0 && a.length - s >= MIN) out.push([s, a.length-1]);
  return out;
}`;
(async () => {
  const uri = 'data:image/png;base64,' + fs.readFileSync(SHEET).toString('base64');
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const p = await b.newPage();
  const r = await p.evaluate(new Function('return ' + WORK)(), uri, AXIS, COV, MIN);
  await b.close();
  console.log(`${path.basename(SHEET)} ${AXIS} coverage<=${COV} run>=${MIN}`);
  console.log(r.map(q => q[0] + '-' + q[1]).join('  '));
})().catch(e => { console.error(e); process.exit(1); });

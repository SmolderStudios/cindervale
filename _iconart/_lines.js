/* Probe a contact sheet for its RULED GRID LINES.
 *
 * Several of Jordan's sheets came back as a drawn table — thin dark rules between
 * every cell, sometimes with a header row of tier names and a label column of slot
 * names. slice.js divides a rectangle into equal cells, which is exactly right for a
 * bare sheet and exactly wrong here: the rules sit ON the cell boundaries, so every
 * crop picks up two vertical hairlines and the horizontal tightening pass then snaps
 * to the full cell width.
 *
 * So measure the rules first and feed slice.js a --crop that starts inside them.
 * A rule is a row (or column) whose ink coverage is near-total; artwork never is.
 *
 *     node _iconart/_lines.js sheets/leather1.png
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const SHEET = path.resolve(__dirname, process.argv[2] || '');
const THRESH = +(process.argv[3] || 0.75);
/* Rows of a sheet rarely line up with each other, so measure ONE band at a time:
   `--crop 0,488,1536,971` reports the gutters of the second row only. Coordinates
   are reported back in the original image's frame, ready to paste into slice.js. */
const CROP = ((process.argv.indexOf('--crop') > 0 ? process.argv[process.argv.indexOf('--crop') + 1] : '') || '')
  .split(',').map(Number).filter(n => !isNaN(n));

const WORK = `async (uri, THRESH, CROP) => {
  const img = new Image(); img.src = uri; await img.decode();
  const cx0 = CROP.length >= 2 ? CROP[0] : 0, cy0 = CROP.length >= 2 ? CROP[1] : 0;
  const cx1 = CROP.length >= 4 ? CROP[2] : img.width, cy1 = CROP.length >= 4 ? CROP[3] : img.height;
  const W = cx1 - cx0, H = cy1 - cy0;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, cx0, cy0, W, H, 0, 0, W, H);
  const px = x.getImageData(0, 0, W, H).data;
  const lum = i => (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
  const bg = [0, W-1, (H-1)*W, W*H-1].map(lum).reduce((a,b)=>a+b,0) / 4;
  const INK = bg - 8;
  const ink = i => px[i*4+3] > 24 && lum(i) < INK;

  const rows = [], cols = [];
  for (let y = 0; y < H; y++) { let n = 0; for (let X = 0; X < W; X++) if (ink(y*W+X)) n++; rows.push(n/W); }
  for (let X = 0; X < W; X++) { let n = 0; for (let y = 0; y < H; y++) if (ink(y*W+X)) n++; cols.push(n/H); }

  const runs = (a, t) => { const out = []; let s = -1;
    for (let i = 0; i < a.length; i++) { if (a[i] >= t) { if (s < 0) s = i; } else if (s >= 0) { out.push([s, i-1]); s = -1; } }
    if (s >= 0) out.push([s, a.length-1]); return out; };
  /* The mirror image of a rule is a GUTTER — a run with no ink at all. Sheets that
     came back without table lines still need their real column edges measured,
     because the objects are not evenly spaced and a uniform grid slices a boot in
     half. Report gutters wider than a few pixels so a --crop can be read straight off. */
  const gaps = a => { const out = []; let s = -1;
    for (let i = 0; i < a.length; i++) { if (a[i] === 0) { if (s < 0) s = i; } else if (s >= 0) { if (i - s >= 4) out.push([s, i-1]); s = -1; } }
    if (s >= 0 && a.length - s >= 4) out.push([s, a.length-1]); return out; };
  return { W, H, bg: Math.round(bg), hrules: runs(rows, THRESH), vrules: runs(cols, THRESH),
           ox: cx0, oy: cy0, hgaps: gaps(rows), vgaps: gaps(cols) };
}`;

(async () => {
  const uri = 'data:image/png;base64,' + fs.readFileSync(SHEET).toString('base64');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  const r = await page.evaluate(new Function('return ' + WORK)(), uri, THRESH, CROP);
  await browser.close();
  console.log(`${path.basename(SHEET)}  ${r.W}x${r.H}  backdrop ${r.bg}  (rule threshold ${THRESH})`);
  const sx = p => (p[0] + r.ox) + '-' + (p[1] + r.ox), sy = p => (p[0] + r.oy) + '-' + (p[1] + r.oy);
  console.log('  horizontal rules (y):', r.hrules.map(sy).join('  ') || '(none)');
  console.log('  vertical rules   (x):', r.vrules.map(sx).join('  ') || '(none)');
  console.log('  blank rows       (y):', r.hgaps.map(sy).join('  ') || '(none)');
  console.log('  blank cols       (x):', r.vgaps.map(sx).join('  ') || '(none)');
})().catch(e => { console.error(e); process.exit(1); });

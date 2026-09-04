/* Blow a handful of cut icons up on the real panel brown, so an edge artefact is
 * visible at all. Everything else in this folder looks at icons either at 128px on a
 * contact sheet or at 20px in the game; a 1-2px halo hides in both.
 *
 *     node _iconart/_fringe.js out.png id1 id2 id3 ...
 *     CVCUT=cut_before node _iconart/_fringe.js ...
 *
 * Also prints the measurement behind the picture: mean luma of the outermost ring of
 * opaque pixels against the mean of the interior. A clean key has them close; a white
 * matte left in the antialiasing shows up as a much brighter ring.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const OUT = path.resolve(process.argv[2] || '_fringe.png');
const IDS = process.argv.slice(3);
const CUT = path.join(__dirname, process.env.CVCUT || 'cut');
const SCALE = +(process.env.CVSCALE || 4);
const PANEL = '#241a12';   // the satchel tile, sampled from the running game

const files = IDS.map(id => {
  const f = path.join(CUT, id + '__painted.png');
  if (!fs.existsSync(f)) { console.error('missing ' + f); process.exit(1); }
  return { id, uri: 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') };
});

const WORK = `async (files, SCALE, PANEL) => {
  const out = [];
  const strip = document.createElement('div');
  strip.style.cssText = 'display:flex;gap:12px;padding:12px;background:' + PANEL;
  for (const f of files) {
    const img = new Image(); img.src = f.uri; await img.decode();
    const W = img.width, H = img.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    const px = x.getImageData(0, 0, W, H).data;
    const A = i => px[i*4+3];
    const lum = i => (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
    let ring = 0, rn = 0, inner = 0, inn = 0;
    for (let y = 1; y < H-1; y++) for (let X = 1; X < W-1; X++) {
      const i = y*W + X; if (A(i) < 200) continue;
      const edge = A(i-1) < 40 || A(i+1) < 40 || A(i-W) < 40 || A(i+W) < 40;
      if (edge) { ring += lum(i); rn++; } else { inner += lum(i); inn++; }
    }
    out.push({ id: f.id, ring: rn ? +(ring/rn).toFixed(1) : 0, inner: inn ? +(inner/inn).toFixed(1) : 0, rn });
    const cell = document.createElement('div');
    cell.style.cssText = 'text-align:center;font:11px monospace;color:#c8a97a';
    const big = document.createElement('canvas');
    big.width = W * SCALE; big.height = H * SCALE;
    const bx = big.getContext('2d');
    bx.imageSmoothingEnabled = false;
    bx.drawImage(c, 0, 0, big.width, big.height);
    big.style.cssText = 'display:block;width:' + (W*SCALE) + 'px;image-rendering:pixelated';
    cell.appendChild(big);
    const cap = document.createElement('div'); cap.textContent = f.id; cell.appendChild(cap);
    strip.appendChild(cell);
  }
  document.body.style.margin = '0';
  document.body.appendChild(strip);
  return out;
}`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 200 + files.length * (128 * SCALE + 12), height: 128 * SCALE + 60 });
  const stats = await p.evaluate(new Function('return ' + WORK)(), files, SCALE, PANEL);
  const el = await p.$('body > div');
  await el.screenshot({ path: OUT });
  await b.close();
  for (const s of stats) console.log(s.id.padEnd(22) + 'edge ring ' + String(s.ring).padStart(6) +
    '   interior ' + String(s.inner).padStart(6) + '   delta ' + (s.ring - s.inner).toFixed(1));
  console.log('wrote ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });

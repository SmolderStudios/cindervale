/* Key the generated backdrop to alpha, trim, and downscale to an icon.
 *
 *     node _iconart/key.js            raw/*.png -> cut/*.png (128px, transparent)
 *     node _iconart/key.js --size 160
 *
 * The backdrop is flat white or flat near-black (recipe.js picks per item by the
 * subject's own value, because a pale subject on white loses its edges). Which one
 * a given file used is decided here by sampling its corners rather than by trusting
 * subjects.js — a prompt can be ignored, a corner cannot.
 *
 * Flood fill inward from the border, never a global threshold: a global cut also
 * removes the white highlight ON a silver bar and the black core of a coal lump.
 * Only backdrop connected to the edge goes.
 *
 * Then trim to the subject's bounding box and letterbox it back into a square with
 * a small margin, so a long fish and a squat gem end up optically the same weight
 * in the grid instead of the fish being 40% smaller for having a wide silhouette.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const RAW = path.join(__dirname, 'raw');
const CUT = path.join(__dirname, 'cut');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SIZE = +(arg('--size') || 128);
const MARGIN = 0.05;          // fraction of the square left empty around the subject

const WORK = `async (uri, SIZE, MARGIN) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const W = c.width, H = c.height, N = W * H;
  const d = x.getImageData(0, 0, W, H), px = d.data;

  // luma, and which way the backdrop goes — sample the four corners
  const lum = new Uint8Array(N);
  for (let i = 0; i < N; i++) lum[i] = (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
  const corners = [0, W-1, (H-1)*W, N-1].map(i => lum[i]);
  const cornerMean = corners.reduce((a,b)=>a+b,0) / 4;
  const onWhite = cornerMean > 127;
  // tolerance around the corner value, generous enough for gradient banding
  const isBack = onWhite ? (v => v > 214) : (v => v < 46);

  // flood fill from every border pixel
  const bg = new Uint8Array(N);
  const st = [];
  for (let X = 0; X < W; X++) { st.push(X); st.push((H-1)*W + X); }
  for (let Y = 0; Y < H; Y++) { st.push(Y*W); st.push(Y*W + W - 1); }
  while (st.length) {
    const i = st.pop();
    if (bg[i] || !isBack(lum[i])) continue;
    bg[i] = 1;
    const X = i % W, Y = (i / W) | 0;
    if (X > 0)     st.push(i - 1);
    if (X < W - 1) st.push(i + 1);
    if (Y > 0)     st.push(i - W);
    if (Y < H - 1) st.push(i + W);
  }
  let cut = 0;
  for (let i = 0; i < N; i++) if (bg[i]) { px[i*4+3] = 0; cut++; }
  x.putImageData(d, 0, 0);

  // bounding box of what survived
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let i = 0; i < N; i++) {
    if (px[i*4+3] < 16) continue;
    const X = i % W, Y = (i / W) | 0;
    if (X < x0) x0 = X; if (X > x1) x1 = X;
    if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
  }
  if (x1 < 0) return { err: 'nothing survived the key' };
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

  // letterbox into a square so every icon carries the same optical weight
  const o = document.createElement('canvas');
  o.width = o.height = SIZE;
  const ox = o.getContext('2d');
  ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high';
  const avail = SIZE * (1 - MARGIN * 2);
  const s = Math.min(avail / bw, avail / bh);
  const dw = bw * s, dh = bh * s;
  ox.drawImage(c, x0, y0, bw, bh, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);
  return {
    out: o.toDataURL('image/png'),
    cutPct: Math.round(cut / N * 100),
    onWhite,
    fill: Math.round(bw * bh / N * 100),      // how much of the frame the subject used
    aspect: +(bw / bh).toFixed(2),
  };
}`;

(async () => {
  fs.mkdirSync(CUT, { recursive: true });
  const files = fs.readdirSync(RAW).filter(f => f.endsWith('.png'));
  if (!files.length) { console.log('nothing in raw/'); return; }
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle(`(${WORK})`);

  const report = [];
  for (const f of files) {
    const uri = 'data:image/png;base64,' + fs.readFileSync(path.join(RAW, f)).toString('base64');
    const r = await p.evaluate((fn, uri, SIZE, MARGIN) => fn(uri, SIZE, MARGIN), fn, uri, SIZE, MARGIN);
    if (r.err) { console.log(f.padEnd(32) + 'FAILED — ' + r.err); report.push({ f, err: r.err }); continue; }
    fs.writeFileSync(path.join(CUT, f), Buffer.from(r.out.split(',')[1], 'base64'));
    report.push({ f, cutPct: r.cutPct, onWhite: r.onWhite, fill: r.fill, aspect: r.aspect });
    // a backdrop that barely came away means the key missed; flag it loudly
    const warn = r.cutPct < 25 ? '   <-- only ' + r.cutPct + '% removed, check it' : '';
    console.log(f.padEnd(32) + (r.onWhite ? 'white' : 'black') + '  cut ' + String(r.cutPct).padStart(2) +
      '%  subject ' + String(r.fill).padStart(2) + '%  ar ' + r.aspect + warn);
  }
  fs.writeFileSync(path.join(CUT, '_key.json'), JSON.stringify(report, null, 1));
  const bad = report.filter(r => r.err || r.cutPct < 25);
  console.log('\n' + (report.length - bad.length) + '/' + report.length + ' keyed cleanly at ' + SIZE + 'px -> ' + CUT);
  if (bad.length) console.log('needs a look: ' + bad.map(r => r.f).join(', '));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

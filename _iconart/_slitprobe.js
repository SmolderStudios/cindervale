/* Why does a white sliver survive between a pair of boots? Measure the enclosed
 * region instead of guessing at the threshold again. */
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const file = process.argv[2] || 'bronze_boots__painted.png';

const WORK = `async (uri) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const W = c.width, H = c.height, N = W * H;
  const px = x.getImageData(0, 0, W, H).data;
  const lum = new Uint8Array(N);
  for (let i = 0; i < N; i++) lum[i] = (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
  const onWhite = ((lum[0] + lum[W-1] + lum[(H-1)*W] + lum[N-1]) / 4) > 127;
  const isBack = onWhite ? (v => v > 214) : (v => v < 46);
  const bg = new Uint8Array(N), st = [];
  for (let X = 0; X < W; X++) { st.push(X); st.push((H-1)*W + X); }
  for (let Y = 0; Y < H; Y++) { st.push(Y*W); st.push(Y*W + W - 1); }
  while (st.length) { const i = st.pop(); if (bg[i] || !isBack(lum[i])) continue; bg[i] = 1;
    const X = i % W, Y = (i / W) | 0;
    if (X > 0) st.push(i-1); if (X < W-1) st.push(i+1);
    if (Y > 0) st.push(i-W); if (Y < H-1) st.push(i+W); }
  // enclosed regions the border fill could not reach, at the CURRENT threshold
  const holeBack = onWhite ? (v => v > 226) : (v => v < 22);
  const seen = new Uint8Array(N); const out = [];
  for (let s0 = 0; s0 < N; s0++) {
    if (bg[s0] || seen[s0] || !holeBack(lum[s0])) continue;
    const q = [s0]; seen[s0] = 1; let n = 0, lo = 255, hi = 0, sum = 0;
    let minX = W, maxX = 0, minY = H, maxY = 0;
    while (q.length) { const i = q.pop(); n++; sum += lum[i];
      if (lum[i] < lo) lo = lum[i]; if (lum[i] > hi) hi = lum[i];
      const X = i % W, Y = (i / W) | 0;
      if (X < minX) minX = X; if (X > maxX) maxX = X;
      if (Y < minY) minY = Y; if (Y > maxY) maxY = Y;
      const p = j => { if (!seen[j] && !bg[j] && holeBack(lum[j])) { seen[j] = 1; q.push(j); } };
      if (X > 0) p(i-1); if (X < W-1) p(i+1); if (Y > 0) p(i-W); if (Y < H-1) p(i+W); }
    if (n > 40) out.push({ n, lo, hi, range: hi - lo, mean: Math.round(sum/n),
      w: maxX-minX+1, h: maxY-minY+1, cutByCurrentRule: (n >= Math.max(10, N*0.0002) && (hi-lo) < 12) });
  }
  return { N, onWhite, regions: out.sort((a,b)=>b.n-a.n).slice(0,6) };
}`;
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage(); await p.setContent('<body></body>');
  const uri = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'raw', file)).toString('base64');
  const r = await p.evaluate((fn, u) => eval('(' + fn + ')')(u), WORK, uri);
  console.log(file + '   backdrop ' + (r.onWhite ? 'white' : 'black'));
  for (const g of r.regions)
    console.log('  region ' + String(g.n).padStart(6) + 'px  ' + g.w + 'x' + g.h +
      '  lum ' + g.lo + '-' + g.hi + ' (range ' + g.range + ', mean ' + g.mean + ')  cut: ' + g.cutByCurrentRule);
  await b.close();
})();

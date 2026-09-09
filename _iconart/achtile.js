/* Build FINISHED SQUARE Steam achievement tiles from the drawn emblems.
 *
 *     node _iconart/achtile.js
 *     node _iconart/achtile.js --size 64
 *
 * The cutouts uploaded to Steam with a white halo: key.js flood-fills the white
 * backdrop away but the ANTIALIASED edge pixels are a blend of subject and white,
 * and a half-white pixel over a dark page is a white line. _fringe.js measures
 * that; nothing fixed it.
 *
 * Two things happen here.
 *
 *   UNMATTE. The backdrop was pure white and we know each pixel's alpha, so the
 *   blend is exactly invertible: observed = true*a + 255*(1-a), therefore
 *   true = (observed - 255*(1-a)) / a. That is a recovery, not a fudge - no
 *   eroding, no darkening, no losing a pixel off the silhouette.
 *
 *   TILE. Steam shows these as squares on a dark page, so they are drawn AS
 *   squares: a dark ground, a category-tinted border, rounded corners, emblem
 *   centred. A designed tile beats a floating cutout at 64px, and it means the
 *   edge never has to be invisible in the first place.
 *
 * Locked keeps the tile and drains the emblem, so the shape still reads and only
 * the colour tells you that you have it.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const CUT = path.join(__dirname, 'cut');
const OUT = 'C:/Users/Jordan/Desktop/Cindervale/store/achievement icons';
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SIZE = +(arg('--size') || 64);

/* One accent per category, so the eight groups read as a designed set. */
const CAT = {
  early:      '#c98a3c',
  skilling:   '#6fae4b',
  combat:     '#c0433c',
  ranged:     '#5fb9a6',
  sailing:    '#4d9bb0',
  guild:      '#8f96b8',
  collection: '#9a63c8',
  endgame:    '#d8b23c',
};

const WORK = `async (uri, size, accent, locked) => {
  const img = new Image(); img.src = uri; await img.decode();

  /* 1. UNMATTE the emblem off white, at its own resolution, before any scaling. */
  const s1 = document.createElement('canvas'); s1.width = img.width; s1.height = img.height;
  const c1 = s1.getContext('2d', { willReadFrequently: true });
  c1.drawImage(img, 0, 0);
  const d = c1.getImageData(0, 0, img.width, img.height), px = d.data;
  for (let i = 0; i < img.width * img.height; i++) {
    const a = px[i*4+3] / 255;
    if (a <= 0.004) { px[i*4+3] = 0; continue; }
    if (a < 0.999) {
      for (let k = 0; k < 3; k++) {
        const v = (px[i*4+k] - 255 * (1 - a)) / a;
        px[i*4+k] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
    if (locked) {
      const g = (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
      const v = Math.round(g * 0.42);
      px[i*4] = px[i*4+1] = px[i*4+2] = v;
    }
  }
  c1.putImageData(d, 0, 0);

  /* 2. THE TILE. Drawn big and downscaled once, so the border stays crisp. */
  const S = size * 4;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const x = c.getContext('2d');
  const r = S * 0.16;
  const round = (ctx, X, Y, W, H, R) => {
    ctx.beginPath();
    ctx.moveTo(X + R, Y);
    ctx.arcTo(X + W, Y, X + W, Y + H, R);
    ctx.arcTo(X + W, Y + H, X, Y + H, R);
    ctx.arcTo(X, Y + H, X, Y, R);
    ctx.arcTo(X, Y, X + W, Y, R);
    ctx.closePath();
  };

  const g = x.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, locked ? '#181818' : '#2a1d10');
  g.addColorStop(1, locked ? '#0e0e0e' : '#140d07');
  round(x, 0, 0, S, S, r); x.fillStyle = g; x.fill();

  /* a soft pool of the accent behind the emblem, so the tile is not flat */
  if (!locked) {
    const rg = x.createRadialGradient(S/2, S*0.46, S*0.05, S/2, S*0.46, S*0.55);
    rg.addColorStop(0, accent + '2e'); rg.addColorStop(1, accent + '00');
    round(x, 0, 0, S, S, r); x.fillStyle = rg; x.fill();
  }

  /* 3. the emblem, contained so nothing gets cropped */
  const pad = S * 0.13, box = S - pad * 2;
  const sc = Math.min(box / s1.width, box / s1.height);
  const w = s1.width * sc, h = s1.height * sc;
  x.imageSmoothingQuality = 'high';
  x.drawImage(s1, (S - w) / 2, (S - h) / 2, w, h);

  /* 4. border last, so the emblem can never sit on top of it */
  x.lineWidth = S * 0.045;
  x.strokeStyle = locked ? '#3a3a3a' : accent;
  round(x, x.lineWidth/2, x.lineWidth/2, S - x.lineWidth, S - x.lineWidth, r - x.lineWidth/2);
  x.stroke();

  const out = document.createElement('canvas'); out.width = size; out.height = size;
  const o = out.getContext('2d');
  o.imageSmoothingQuality = 'high';
  o.drawImage(c, 0, 0, size, size);
  return out.toDataURL('image/png');
}`;

(async () => {
  /* categories from the game, so a recategorised achievement retints itself */
  const raw = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
  const dom = new JSDOM(raw, { url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); } });
  await new Promise(r => setTimeout(r, 2600));
  const ACH = JSON.parse(dom.window.eval(
    `JSON.stringify(ACHIEVEMENTS.map(function(a){ return {id:a.id, cat:a.cat}; }))`));

  const br = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const p = await br.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle('(' + WORK + ')');

  let n = 0; const missing = [], noCat = [];
  for (const a of ACH) {
    const src = path.join(CUT, a.id + '__painted.png');
    if (!fs.existsSync(src)) { missing.push(a.id); continue; }
    const accent = CAT[a.cat];
    if (!accent) { noCat.push(a.id + ' (' + a.cat + ')'); continue; }
    const uri = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');
    for (const locked of [false, true]) {
      const url = await p.evaluate((g, u, s, ac, l) => g(u, s, ac, l), fn, uri, SIZE, accent, locked);
      fs.writeFileSync(path.join(OUT, a.id + (locked ? '_locked' : '') + '.png'),
        Buffer.from(url.split(',')[1], 'base64'));
      n++;
    }
  }
  await br.close();
  console.log('wrote ' + n + ' tiles at ' + SIZE + 'x' + SIZE + ' -> ' + OUT);
  if (missing.length) console.log('  no emblem cut for: ' + missing.join(', ') + '  (kept whatever was there)');
  if (noCat.length) console.log('  NO ACCENT for category: ' + noCat.join(', '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

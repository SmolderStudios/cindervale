/* Write the Steam achievement icon PAIRS from the keyed emblems.
 *
 *     node _iconart/achsteam.js            all 60
 *     node _iconart/achsteam.js --dry      list, write nothing
 *
 * Steam wants two 64x64 PNGs per achievement: unlocked in colour and locked in
 * grey. Only the unlocked one is drawn - the locked one is DERIVED here, the same
 * way recolour.js derives a whole tier ladder from one base, so the pair can never
 * drift apart and nobody has to draw sixty grey copies.
 *
 * Naming is `<id>.png` / `<id>_locked.png`, which is what the previous generator
 * used and what the Steamworks uploader expects to be matched against the API Name.
 *
 * The locked recipe: desaturate fully, pull to ~40% brightness, keep the alpha and
 * therefore the silhouette. A player scanning the page reads the shape either way
 * and the colour is what tells them they have it.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const CUT = path.join(__dirname, 'cut');
const OUT = 'C:/Users/Jordan/Desktop/Cindervale/store/achievement icons';
const DRY = process.argv.includes('--dry');
const SIZE = 64;

const IDS = ['ach_a', 'ach_b', 'ach_c', 'ach_d'].flatMap(s =>
  fs.readFileSync(path.join(__dirname, 'sheets', s + '.txt'), 'utf8')
    .split(/\r?\n/).map(x => x.trim()).filter(Boolean));

/* Fit the emblem into a 64x64 square with a little air, then optionally drain it.
   Contain, not cover: an antlered skull is wider than it is tall and cropping it
   to a square would take the antlers off. */
const WORK = `async (uri, size, locked) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high';
  const pad = Math.round(size * 0.04);
  const box = size - pad * 2;
  const s = Math.min(box / img.width, box / img.height);
  const w = img.width * s, h = img.height * s;
  x.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  if (locked) {
    const d = x.getImageData(0, 0, size, size), px = d.data;
    for (let i = 0; i < size * size; i++) {
      if (px[i*4+3] < 8) continue;
      const g = (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
      const v = Math.round(g * 0.40);
      px[i*4] = px[i*4+1] = px[i*4+2] = v;
    }
    x.putImageData(d, 0, 0);
  }
  return c.toDataURL('image/png');
}`;

(async () => {
  if (!DRY) fs.mkdirSync(OUT, { recursive: true });
  const br = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const p = await br.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle('(' + WORK + ')');

  let n = 0; const missing = [];
  for (const id of IDS) {
    const src = path.join(CUT, id + '__painted.png');
    if (!fs.existsSync(src)) { missing.push(id); continue; }
    const uri = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');
    for (const locked of [false, true]) {
      const url = await p.evaluate((g, u, s, l) => g(u, s, l), fn, uri, SIZE, locked);
      const file = path.join(OUT, id + (locked ? '_locked' : '') + '.png');
      if (!DRY) fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      n++;
    }
  }
  await br.close();
  console.log((DRY ? 'would write ' : 'wrote ') + n + ' files (' + IDS.length + ' pairs) at ' + SIZE + 'x' + SIZE);
  console.log('  -> ' + OUT);
  if (missing.length) console.log('  NO CUT FOR: ' + missing.join(', '));
})().catch(e => { console.error(e); process.exit(1); });

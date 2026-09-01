/* Encode chosen icons to WebP data URIs and report what they cost.
 *
 *     node _iconart/pack.js                     every id, defaulting to the emblem cut
 *     node _iconart/pack.js --picks picks.json  {"iron_bar":"painted", ...}
 *     node _iconart/pack.js --style painted     one style for everything
 *     node _iconart/pack.js --size 96 --q 0.82
 *
 * Writes pack.json ({id: "data:image/webp;base64,..."}) for inject.js.
 *
 * SIZE IS THE WHOLE POINT OF THIS FILE. cindervale.html is a single self-contained
 * document that the Electron wrapper re-downloads IN FULL on every version change,
 * with a 6 second hard abort that is not an idle timeout — miss it and the player
 * silently falls back to cache and stops receiving updates with no error at all.
 * The file is already ~6.2 MB (~8.7 Mbps needed). So this prints the added weight
 * and what it does to that number BEFORE anything is injected, and it is why the
 * default is 96px WebP rather than the 128px PNGs in cut/.
 *
 * 96px is not arbitrary: measure.js puts the largest on-screen item icon at 31px,
 * so 96 still leaves 3x for a retina panel.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const CUT = path.join(__dirname, 'cut');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SIZE = +(arg('--size') || 96);
const Q = +(arg('--q') || 0.82);
const DEFAULT_STYLE = arg('--style') || 'emblem';
const PICKS = arg('--picks');
const OUTJSON = path.join(__dirname, arg('--out') || 'pack.json');

const GAME = path.join(__dirname, '..', 'cindervale.html');
const ABORT_MS = 6000;   // the wrapper's hard fetch abort

const ENC = `async (uri, SIZE, Q) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(img, 0, 0, SIZE, SIZE);
  return c.toDataURL('image/webp', Q);
}`;

(async () => {
  const files = fs.readdirSync(CUT).filter(f => f.endsWith('.png'));
  const ids = [...new Set(files.map(f => f.replace(/__(painted|emblem)\.png$/, '')))].sort();
  const picks = PICKS && fs.existsSync(PICKS) ? JSON.parse(fs.readFileSync(PICKS, 'utf8')) : {};

  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle(`(${ENC})`);

  const pack = {}; const rows = [];
  for (const id of ids) {
    const style = picks[id] || DEFAULT_STYLE;
    let f = path.join(CUT, id + '__' + style + '.png');
    if (!fs.existsSync(f)) {                       // fall back rather than drop the item
      const alt = style === 'emblem' ? 'painted' : 'emblem';
      f = path.join(CUT, id + '__' + alt + '.png');
      if (!fs.existsSync(f)) { console.log('SKIP ' + id + ' — no cut on disk'); continue; }
    }
    const uri = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    const out = await p.evaluate((fn, u, S, q) => fn(u, S, q), fn, uri, SIZE, Q);
    pack[id] = out;
    rows.push({ id, style, bytes: Buffer.byteLength(out) });
  }
  await b.close();

  fs.writeFileSync(OUTJSON, JSON.stringify(pack, null, 0));
  const total = rows.reduce((a, r) => a + r.bytes, 0);
  const before = fs.statSync(GAME).size;
  /* inject.js REPLACES any existing pack rather than appending, so the file does
     not grow by the whole pack — it grows by the difference. Measuring the block
     already in the game keeps this honest; the naive "before + total" over-reported
     by the size of the previous pass. */
  const OPEN = '/* ==ITEM-ART-START== */', CLOSE = '/* ==ITEM-ART-END== */';
  const html = fs.readFileSync(GAME, 'utf8');
  const a0 = html.indexOf(OPEN), b0 = html.indexOf(CLOSE);
  const existing = (a0 >= 0 && b0 > a0) ? (b0 + CLOSE.length - a0) : 0;
  const after = before - existing + total;
  const mb = n => (n / 1048576).toFixed(2) + ' MB';
  const mbps = n => ((n * 8) / (ABORT_MS / 1000) / 1e6).toFixed(1);

  rows.sort((a, b2) => b2.bytes - a.bytes);
  console.log(`${rows.length} icons at ${SIZE}px webp q${Q}`);
  console.log('  heaviest: ' + rows.slice(0, 5).map(r => r.id + ' ' + (r.bytes / 1024).toFixed(1) + 'K').join(', '));
  console.log('  mean ' + (total / rows.length / 1024).toFixed(1) + 'K, total ' + mb(total));
  console.log('\nfile size impact (the wrapper aborts the whole fetch at 6s):');
  console.log('  cindervale.html now   ' + mb(before) + '   needs ' + mbps(before) + ' Mbps');
  console.log('  with this pack        ' + mb(after) + '   needs ' + mbps(after) + ' Mbps');
  console.log('  added                 ' + mb(after - before) + '   (+' + (mbps(after) - mbps(before)).toFixed(1) + ' Mbps)' +
    (existing ? '   [replaces a ' + mb(existing) + ' block already in the file]' : ''));
  console.log('\nwrote ' + path.basename(OUTJSON));
})().catch(e => { console.error(e); process.exit(1); });

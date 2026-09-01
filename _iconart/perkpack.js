/* Swap the hand-drawn perk SVGs for the generated painted art.
 *
 *     node _iconart/perkpack.js            painted -> the game
 *     node _iconart/perkpack.js --style emblem
 *
 * Writes into the SAME ==SLAYER-PERK-ICONS== block perkicons.js used, so this is a
 * straight replacement rather than a second definition — two ICONS entries with one
 * key would silently leave whichever loaded last, which is exactly the kind of thing
 * that looks fine until it does not.
 *
 * NOTE: running perkicons.js again would put the SVGs back. It is kept for the
 * authoring history; this is the live source now.
 *
 * 96px WebP: these render at 30px on the shop card, so that is 3x for a retina
 * panel and anything more is bytes nobody sees.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const GAME = path.join(__dirname, '..', 'cindervale.html');
const CUT = path.join(__dirname, 'perkcut');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const STYLE = arg('--style') || 'painted';
const SIZE = 96, Q = 0.85;

const OPEN = '  /* ==SLAYER-PERK-ICONS-START== */';
const CLOSE = '  /* ==SLAYER-PERK-ICONS-END== */';

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
  let s = fs.readFileSync(GAME, 'utf8');
  const a = s.indexOf(OPEN), b = s.indexOf(CLOSE);
  if (a < 0 || b < a) throw new Error('perk icon block not found');

  /* Take the ids from the block being replaced, so a perk cannot be dropped by
     this swap without the count check below noticing. */
  const oldBlock = s.slice(a, b);
  const ids = [...oldBlock.matchAll(/\n\s*(slp_[a-z_]+):/g)].map(m => m[1]);
  if (!ids.length) throw new Error('no perk ids in the existing block');

  const br = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await br.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle(`(${ENC})`);

  const out = {};
  for (const id of ids) {
    let f = path.join(CUT, id + '__' + STYLE + '.png');
    if (!fs.existsSync(f)) {
      const alt = STYLE === 'painted' ? 'emblem' : 'painted';
      f = path.join(CUT, id + '__' + alt + '.png');
      if (!fs.existsSync(f)) throw new Error('no cut for ' + id);
      console.log('  ' + id + ': no ' + STYLE + ', fell back to ' + alt);
    }
    const uri = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    out[id] = await p.evaluate((fn, u, S, q) => fn(u, S, q), fn, uri, SIZE, Q);
  }
  await br.close();
  if (Object.keys(out).length !== ids.length) throw new Error('lost a perk in the swap');

  const block = OPEN + '\n' +
    '  /* Generated art, replacing the hand-drawn SVGs that were here.\n' +
    '     Sized by .ev-icon off the parent font-size exactly as the SVGs were, so no\n' +
    '     render site changed. Re-make with _iconart/perkart.js -> key.js -> perkpack.js. */\n' +
    ids.map(id => '  ' + id + ': ' + JSON.stringify(
      '<img class="ev-icon art-perk" alt="" loading="lazy" src="' + out[id] + '">') + ',').join('\n') +
    '\n' + CLOSE;

  s = s.slice(0, a) + block + s.slice(b + CLOSE.length);

  if (!s.includes('.ev-icon.art-perk{')) {
    const css = '\n.ev-icon.art-perk{object-fit:contain;image-rendering:auto;vertical-align:middle}\n';
    const last = s.lastIndexOf('</style>');
    s = s.slice(0, last) + css + s.slice(last);
  }
  fs.writeFileSync(GAME, s);
  const bytes = Object.values(out).reduce((n, v) => n + v.length, 0);
  console.log('swapped ' + ids.length + ' perk icons to ' + STYLE + ', ' + (bytes / 1024).toFixed(0) + ' KB');
})().catch(e => { console.error(e); process.exit(1); });

/* Replace the in-game header crest with the wrapper's high-res icon.
 *
 *     node _iconart/brandmark.js
 *
 * The header mark was a 64x64 PNG rendered at 32 CSS px. That looks like 2x
 * headroom and is not: applyRootZoom scales the whole UI, so on a wide window the
 * mark lays out at ~45 CSS px, which is ~90 device pixels on a 2x display. A 64px
 * source is being upscaled about 1.4x, and it shows worst along the hard bottom
 * edge of the crest.
 *
 * icon256.png in the wrapper is the same artwork at 256px — the master the Windows
 * .ico is built from. Downscaled to 192 it covers the largest real render with room
 * to spare, and 192 rather than 256 because nothing on screen is ever that big.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const GAME = path.join(__dirname, '..', 'cindervale.html');
const SRC = 'C:/Users/Jordan/Desktop/OLD EMBERVALE/Embervale Idle Dev/icon256.png';
const SIZE = 192, Q = 0.92;

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
  if (!fs.existsSync(SRC)) throw new Error('icon256.png not found at ' + SRC);
  const br = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await br.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const uri = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');
  const out = await p.evaluate((fn, u, S, q) => eval('(' + fn + ')')(u, S, q), ENC, uri, SIZE, Q);
  await br.close();

  let s = fs.readFileSync(GAME, 'utf8');
  const re = /(<img class="brand-mark"[^>]*src=")(data:image\/[a-z+]+;base64,[^"]+)(")/;
  const m = re.exec(s);
  if (!m) throw new Error('brand-mark img not found');
  const before = Buffer.from(m[2].split(',')[1], 'base64').length;
  s = s.replace(re, '$1' + out + '$3');

  /* The old 64px source was rendered at 32px, so nothing forced it to look sharp.
     Keep the CSS size the same — this is a source-resolution fix, not a resize. */
  fs.writeFileSync(GAME, s);
  console.log('header crest: 64px PNG (' + (before / 1024).toFixed(1) + ' KB)'
    + ' -> ' + SIZE + 'px WebP (' + (Buffer.byteLength(out) / 1024).toFixed(1) + ' KB)');
})().catch(e => { console.error(e); process.exit(1); });

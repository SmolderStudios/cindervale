/* Pack the three Slayer Master portraits into the game.
 *
 *     node _iconart/masterpack.js            inject
 *     node _iconart/masterpack.js --remove   take back out
 *
 * The art bleeds in from the LEFT of the master row and fades under the text, so
 * nothing that has to be read sits on top of a busy image. That fade is a CSS
 * gradient over the art rather than baked into the PNG, so the row keeps working
 * if the card colour ever changes.
 *
 * Sized 260x180 rather than the 768x512 generated: the slot is ~190 CSS px wide
 * and the art is cropped to it, so anything more is bytes nobody sees. Idempotent
 * — re-running replaces the block.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const GAME = path.join(__dirname, '..', 'cindervale.html');
const SRC = path.join(__dirname, 'slayer');
const OPEN = '/* ==SLAYER-MASTER-ART-START== */', CLOSE = '/* ==SLAYER-MASTER-ART-END== */';
const MAP = { novice: 'master_novice', expert: 'master_expert', master: 'master_general' };
const W = 260, H = 180, Q = 0.82;

let s = fs.readFileSync(GAME, 'utf8');
const a = s.indexOf(OPEN), b = s.indexOf(CLOSE);
if (a >= 0 && b > a) s = s.slice(0, a) + s.slice(b + CLOSE.length + 1);

if (process.argv.includes('--remove')) {
  fs.writeFileSync(GAME, s);
  console.log('master art removed');
  process.exit(0);
}

const ENC = `async (uri, W, H, Q) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  // cover: fill the slot, crop the overflow, bias upward so faces survive
  const sc = Math.max(W / img.width, H / img.height);
  const dw = img.width * sc, dh = img.height * sc;
  x.drawImage(img, (W - dw) / 2, (H - dh) * 0.34, dw, dh);
  return c.toDataURL('image/webp', Q);
}`;

(async () => {
  const br = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await br.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle(`(${ENC})`);

  const art = {};
  for (const key of Object.keys(MAP)) {
    const f = path.join(SRC, MAP[key] + '.png');
    if (!fs.existsSync(f)) throw new Error('missing ' + f);
    const uri = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    art[key] = await p.evaluate((fn, u, W, H, Q) => fn(u, W, H, Q), fn, uri, W, H, Q);
  }
  await br.close();

  const block = `
${OPEN}
/* Painted portraits for the three Slayer Masters, keyed by master.key. The row
   falls back to its icon for any key not in here, so a partial set still renders. */
const SLAYER_MASTER_ART={
${Object.keys(art).map(k => '  ' + JSON.stringify(k) + ':' + JSON.stringify(art[k])).join(',\n')}
};
${CLOSE}
`;
  const anchor = 'const SLAYER_MASTERS=[';
  if (!s.includes(anchor)) throw new Error('anchor not found');
  s = s.replace(anchor, block + '\n' + anchor);
  fs.writeFileSync(GAME, s);
  const bytes = Object.values(art).reduce((n, v) => n + v.length, 0);
  console.log('injected 3 master portraits, ' + (bytes / 1024).toFixed(0) + ' KB at ' + W + 'x' + H);
})().catch(e => { console.error(e); process.exit(1); });

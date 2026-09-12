/* Re-encode an art pack that is ALREADY in the game, in place, at a smaller size.
 *
 *     node _iconart/_shrinkpack.js ART_PET 128 0.8
 *     node _iconart/_shrinkpack.js ART_PET 128 0.8 --dry
 *
 * Needed because a pack can be encoded far larger than anything ever draws it,
 * and there is no source folder to re-run the normal injector from. ART_PET was
 * 25 portraits at 256px for a card that renders them at 76px, which is 3.4x more
 * pixels than the screen can use and a fifth of a megabyte of a file with a hard
 * ceiling on it (the wrapper aborts a fetch at 6 seconds, so size is a delivery
 * constraint, not a nicety).
 *
 * Decodes each embedded webp, redraws it at the new size and re-encodes. That is
 * lossy on top of lossy, so only ever go DOWN by a real factor, never re-run this
 * repeatedly at the same size.
 *
 * Same guards as injectmon.js: parse by line, refuse to write unless every entry
 * round-trips, and --dry first.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const GAME = path.join(__dirname, '..', 'cindervale.html');

const PACK = process.argv[2];
const SIZE = +process.argv[3];
const Q = +(process.argv[4] || 0.8);
const DRY = process.argv.includes('--dry');
if (!PACK || !SIZE) { console.error('usage: _shrinkpack.js <PACK> <size> [quality] [--dry]'); process.exit(1); }

const ENC = `async (uri, S, Q) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.clearRect(0, 0, S, S); x.drawImage(img, 0, 0, S, S);
  return { out: c.toDataURL('image/webp', Q), w: img.width, h: img.height };
}`;

const kb = n => (n / 1024).toFixed(1) + 'K';

function parseBlock(body) {
  const out = {};
  let n = 0;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const t = line.endsWith(',') ? line.slice(0, -1) : line;
    if (t[0] !== '"') return null;
    const sep = t.indexOf('":"');
    if (sep < 0 || t[t.length - 1] !== '"') return null;
    out[t.slice(1, sep)] = t.slice(sep + 3, t.length - 1);
    n++;
  }
  return { map: out, lines: n };
}

(async () => {
  let html = fs.readFileSync(GAME, 'utf8');
  const before = Buffer.byteLength(html);
  const OPEN = '  var ' + PACK + '={';
  const head = html.indexOf(OPEN);
  if (head < 0) throw new Error(PACK + ' block not found');
  const tail = html.indexOf('\n  };', head);
  const body = html.slice(head + OPEN.length, tail);
  const parsed = parseBlock(body);
  if (!parsed) throw new Error(PACK + ' has a line this parser does not understand; writing nothing');
  const map = parsed.map;
  const expect = (body.match(/":"<img/g) || []).length;
  const had = Object.keys(map).length;
  if (!had || had !== expect || parsed.lines !== expect)
    throw new Error(PACK + ' parse mismatch: ' + had + ' ids from ' + parsed.lines
                    + ' lines, block holds ' + expect + '. Writing nothing.');

  const b = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const enc = await p.evaluateHandle(`(${ENC})`);

  let was = 0, now = 0;
  for (const id of Object.keys(map)) {
    const tag = map[id];
    const m = /src=\\"(data:image\/webp;base64,[^\\]+)\\">$/.exec(tag);
    if (!m) { await b.close(); throw new Error(id + ' did not round-trip; writing nothing'); }
    const cls = /class=\\"([^\\]+)\\"/.exec(tag);
    const r = await p.evaluate((fn, u, S, q) => fn(u, S, q), enc, m[1], SIZE, Q);
    if (r.w <= SIZE) { console.log('  ' + id.padEnd(22) + 'already ' + r.w + 'px, left alone'); now += m[1].length; was += m[1].length; continue; }
    was += m[1].length; now += r.out.length;
    map[id] = '<img class=\\"' + (cls ? cls[1] : 'ev-icon') + '\\" alt=\\"\\" loading=\\"lazy\\" src=\\"' + r.out + '\\">';
    console.log('  ' + id.padEnd(22) + r.w + 'px ' + kb(m[1].length) + '  ->  ' + SIZE + 'px ' + kb(r.out.length));
  }
  await b.close();

  const keys = Object.keys(map).sort();
  const rebuilt = '\n' + keys.map(k => '"' + k + '":"' + map[k] + '"').join(',\n') + '\n';
  html = html.slice(0, head + OPEN.length) + rebuilt + html.slice(tail);
  console.log('\n' + PACK + ': ' + keys.length + ' entries, ' + kb(was) + ' -> ' + kb(now)
              + ' of image data at ' + SIZE + 'px q' + Q);
  if (DRY) { console.log('--dry: nothing written'); return; }
  fs.writeFileSync(GAME, html);
  const after = Buffer.byteLength(html);
  console.log('cindervale.html ' + (before / 1048576).toFixed(2) + ' -> ' + (after / 1048576).toFixed(2)
              + ' MB  (' + (after > before ? '+' : '') + kb(after - before) + ')');
})().catch(e => { console.error(e.message); process.exit(1); });

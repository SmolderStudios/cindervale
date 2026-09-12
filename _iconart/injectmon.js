/* Painted MONSTER art + arena backdrops -> cindervale.html.
 *
 *     node _iconart/injectmon.js                 cut_mon/*.png -> ART_MON (merge)
 *     node _iconart/injectmon.js --bg <file> <id>   one 2:3 plate -> ZONE_BG[id]
 *     node _iconart/injectmon.js --dry            report, write nothing
 *
 * Why this exists: inject.js owns the ITEM block and REPLACES it wholesale from
 * pack.json. Monster art is a different block, a different size (256px, against
 * the items' 96px, because the arena draws a portrait at 358px), and it arrives a
 * handful at a time, so this one MERGES: it parses the ids already in the block,
 * adds or overwrites only the ones on disk, and leaves every other portrait byte
 * for byte as it was. An id with no entry keeps its inline SVG, which is what
 * makes a half-finished art pass still boot.
 *
 * PARSE THE ENTRIES BY LINE, never with a lazy regex. Every value is an <img>
 * tag whose attributes are escaped quotes, so a `"(<img[^\n]*?)",?` pattern ends
 * at the first \" inside the tag and truncates all 57 portraits to `<img class=\`.
 * That is exactly what the first version of this file did to the game (caught by
 * node --check, restored from git). Hence the guard below: if the number of
 * entries parsed does not match the number of entries in the block, write nothing.
 *
 * Pipeline for a monster sheet:
 *     node _iconart/cutall.js <sheet>                     -> raw/
 *     cp the new raw files into raw_mon/
 *     CVRAW=raw_mon CVCUT=cut_mon node _iconart/key.js --size 256
 *     node _iconart/injectmon.js
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const GAME = path.join(__dirname, '..', 'cindervale.html');
const CUT  = path.join(__dirname, process.env.CVCUT || 'cut_mon');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const DRY = process.argv.includes('--dry');
const MON_SIZE = 256, MON_Q = 0.8;
const BG_W = 560, BG_H = 818, BG_Q = 0.82;   // matches the twelve zone plates already in

/* Square encode for a portrait: the cut is already trimmed and letterboxed. */
const ENC_SQ = `async (uri, S, Q) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.clearRect(0, 0, S, S); x.drawImage(img, 0, 0, S, S);
  return c.toDataURL('image/webp', Q);
}`;
/* Cover-crop for a backdrop: keep the BOTTOM, where the empty floor the creature
   stands on lives, and take the overflow off the top. */
const ENC_BG = `async (uri, W, H, Q) => {
  const img = new Image(); img.src = uri; await img.decode();
  const s = Math.max(W / img.width, H / img.height);
  const sw = Math.round(W / s), sh = Math.round(H / s);
  const sx = Math.round((img.width - sw) / 2), sy = img.height - sh;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  return c.toDataURL('image/webp', Q);
}`;

const kb = n => (n / 1024).toFixed(1) + 'K';

/* One entry per line: "id":"<img ...>", with a trailing comma on all but the last.
   Returns null if anything about the block does not look the way it should. */
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

  const bgFile = arg('--bg'), bgId = bgFile ? process.argv[process.argv.indexOf('--bg') + 2] : null;
  const files = fs.existsSync(CUT) ? fs.readdirSync(CUT).filter(f => f.endsWith('.png')) : [];
  if (!files.length && !bgFile) { console.log('nothing to do: ' + CUT + ' is empty and no --bg given'); return; }

  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const encSq = await p.evaluateHandle(`(${ENC_SQ})`);
  const encBg = await p.evaluateHandle(`(${ENC_BG})`);
  const bail = async (msg) => { await b.close(); throw new Error(msg); };

  /* ── monster portraits ───────────────────────────────────────────────────── */
  if (files.length) {
    const OPEN = '  var ART_MON={';
    const head = html.indexOf(OPEN);
    const tail = html.indexOf('\n  };', head);
    if (head < 0 || tail < 0) await bail('ART_MON block not found');
    const body = html.slice(head + OPEN.length, tail);
    const parsed = parseBlock(body);
    if (!parsed) await bail('ART_MON has a line this parser does not understand; writing nothing');
    const existing = parsed.map;
    const had = Object.keys(existing).length;
    const expect = (body.match(/":"<img/g) || []).length;
    if (!had || had !== expect || parsed.lines !== expect)
      await bail('ART_MON parse mismatch: ' + had + ' ids from ' + parsed.lines + ' lines, block holds '
                 + expect + '. Writing nothing.');
    /* Every value must still be a whole img tag; a truncated one is the old bug. */
    for (const k in existing)
      if (!/^<img .*src=\\"data:image\/webp;base64,.+\\">$/.test(existing[k]))
        await bail('existing portrait ' + k + ' did not round-trip; writing nothing');

    for (const f of files) {
      const id = f.replace(/__(painted|emblem)\.png$/, '').replace(/\.png$/, '');
      const uri = 'data:image/png;base64,' + fs.readFileSync(path.join(CUT, f)).toString('base64');
      const out = await p.evaluate((fn, u, S, q) => fn(u, S, q), encSq, uri, MON_SIZE, MON_Q);
      existing[id] = '<img class=\\"ev-icon art-mon\\" alt=\\"\\" loading=\\"lazy\\" src=\\"' + out + '\\">';
      console.log('  ' + id.padEnd(24) + kb(out.length));
    }
    const keys = Object.keys(existing).sort();
    const rebuilt = '\n' + keys.map(k => '"' + k + '":"' + existing[k] + '"').join(',\n') + '\n';
    html = html.slice(0, head + OPEN.length) + rebuilt + html.slice(tail);
    console.log('ART_MON: ' + had + ' -> ' + keys.length + ' portraits (' + files.length + ' written at '
                + MON_SIZE + 'px q' + MON_Q + ')');
  }

  /* ── one arena backdrop ──────────────────────────────────────────────────── */
  if (bgFile) {
    if (!bgId) await bail('--bg needs a file AND a zone id');
    const uri = 'data:image/png;base64,' + fs.readFileSync(bgFile).toString('base64');
    const out = await p.evaluate((fn, u, W, H, q) => fn(u, W, H, q), encBg, uri, BG_W, BG_H, BG_Q);
    const anchor = 'const ZONE_BG={';
    const at = html.indexOf(anchor);
    if (at < 0) await bail('ZONE_BG not found');
    const old = new RegExp('"' + bgId + '":"data:image/webp;base64,[A-Za-z0-9+/=]+",?');
    if (old.test(html)) html = html.replace(old, '');           // replace, never stack
    html = html.slice(0, at + anchor.length) + '"' + bgId + '":"' + out + '",' + html.slice(at + anchor.length);
    console.log('ZONE_BG["' + bgId + '"]: ' + BG_W + 'x' + BG_H + ' webp q' + BG_Q + ', ' + kb(out.length));
  }

  await b.close();
  if (DRY) { console.log('--dry: nothing written'); return; }
  fs.writeFileSync(GAME, html, 'utf8');
  const after = Buffer.byteLength(html);
  console.log('cindervale.html ' + (before / 1048576).toFixed(2) + ' -> ' + (after / 1048576).toFixed(2)
              + ' MB  (' + (after >= before ? '+' : '') + ((after - before) / 1024).toFixed(0) + 'K)');
})();

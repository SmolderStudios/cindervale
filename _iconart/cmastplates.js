/* Painted Combat Mastery plates: cut them off a sheet, and merge them into CMAST_ART.
 *
 *     node _iconart/cmastplates.js cut cmast_sorcery          sheet -> cut/cmast/*.png + pack.cmast_sorcery.json
 *     node _iconart/cmastplates.js merge --pack pack.cmast_sorcery.json --dry
 *     node _iconart/cmastplates.js merge --pack pack.cmast_sorcery.json
 *
 * The fifty plates of 0.9.123.15 were cut by _cmasticons.js in the trailer kit
 * (Desktop/Cindervale/tools/trailer-kit), straight into _cmastpreview/art.json, and put
 * into the game once by hand. Nothing in _iconart wrote CMAST_ART until the Sorcery
 * column (0.9.127.11). This is that tool, and it cuts the way that one did, so the
 * thirteen sit on the board like the fifty:
 *
 *   - the sheet is ALREADY transparent. ChatGPT gives these back as white and grey on
 *     an alpha of nothing (they look black in a viewer that does not show alpha), so
 *     there is no backdrop to key. The cell is trimmed to its alpha box (alpha > 12),
 *     padded 6% a side to a square, halved down until it is no more than twice the
 *     target (one big drawImage turns a 3 px outline into grey mush), and drawn at
 *     160 px as WebP at q 0.90. Same numbers as _cmasticons.js.
 *   - the cells are MEASURED, not an equal grid. _cmasticons.js divided a 4x3 sheet
 *     into equal cells, which was right for the five sheets it read. The Sorcery sheet
 *     is 5x3 with its columns spaced to nothing in particular: an equal cut puts the
 *     line for column 2 at x 324, through the open book of cell 1, which runs to 353.
 *     Each row is given as a y band and its column edges, measured from the gaps where
 *     alpha never passes 12 (see PLAN).
 *
 * MERGE, never replace: the fifty have no sheet in this repo to be rebuilt from. The
 * literal is found with _litend.js (a "};" search once wrote thirteen node paintings
 * into PASSIVE_TIPS), it must read back through JSON.stringify byte for byte before
 * anything is touched, and nothing is written unless every entry that was there,
 * the frames and the background read back whole and unchanged afterwards.
 */
'use strict';
const fs = require('fs'), path = require('path');
const literalEnd = require('./_litend.js');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const has = k => process.argv.includes(k);
const SIZE = 160, PAD = 0.06, Q = 0.90, ALPHA = 12;

/* One entry a sheet. `rows` are [y0, y1] bands (inclusive) and `xs` the column edges
   inside each band; ids run in reading order, and `_spare` is a cell left out. */
const PLAN = {
  /* Sheet U of PROMPTS-magic.md, 1619x971, delivered 2026-10-14. Rows split at the
     alpha gutters y 326-331 and 636-642; each column edge is the middle of the gap
     between two cells in that row. Cells 14 and 15 are the prompt's two spares. */
  cmast_sorcery: { sheet: 'sheets/cmast_sorcery.png', ids: 'sheets/cmast_sorcery.txt',
    rows: [ { y: [0, 328],   xs: [0, 368, 648, 968, 1264, 1619] },
            { y: [329, 639], xs: [0, 335, 663, 955, 1294, 1619] },
            { y: [640, 970], xs: [0, 345, 661, 966, 1295, 1619] } ] },
};

const fail = m => { console.error('cmastplates: ' + m + '. Nothing written.'); process.exit(1); };
const CMD = process.argv[2];

/* ── cut ───────────────────────────────────────────────────────────────────── */
async function cut(name) {
  const P = PLAN[name]; if (!P) fail('no plan entry "' + name + '" (have: ' + Object.keys(PLAN).join(', ') + ')');
  const ids = fs.readFileSync(path.join(__dirname, P.ids), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const cells = [];
  for (const r of P.rows) for (let c = 0; c + 1 < r.xs.length; c++) cells.push([r.xs[c], r.y[0], r.xs[c + 1] - 1, r.y[1]]);
  if (cells.length !== ids.length) fail('the plan has ' + cells.length + ' cells and the id list ' + ids.length);
  const puppeteer = require(KIT + '/node_modules/puppeteer-core');
  const uri = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, P.sheet)).toString('base64');
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const p = await b.newPage();
  const res = await p.evaluate(async (uri, cells, SIZE, PAD, Q, ALPHA) => {
    const img = new Image(); img.src = uri; await img.decode();
    const out = [];
    for (const [x0, y0, x1, y1] of cells) {
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, x0, y0, cw, ch, 0, 0, cw, ch);
      const d = g.getImageData(0, 0, cw, ch).data;
      let bx0 = cw, by0 = ch, bx1 = -1, by1 = -1, maxChroma = 0;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const i = (y * cw + x) * 4;
        if (d[i + 3] > ALPHA) {
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
          if (d[i + 3] > 128) maxChroma = Math.max(maxChroma, Math.max(d[i], d[i+1], d[i+2]) - Math.min(d[i], d[i+1], d[i+2]));
        }
      }
      if (bx1 < 0) { out.push(null); continue; }
      /* the alpha box must not touch the cell edge: if it does, the cell cut through art */
      const touches = [bx0 === 0, by0 === 0, bx1 === cw - 1, by1 === ch - 1];
      const w = bx1 - bx0 + 1, h = by1 - by0 + 1, side = Math.max(w, h);
      const sq = document.createElement('canvas'); sq.width = sq.height = Math.round(side * (1 + PAD * 2));
      sq.getContext('2d').drawImage(c, bx0, by0, w, h, Math.round((sq.width - w) / 2), Math.round((sq.height - h) / 2), w, h);
      let cur = sq;
      while (cur.width > SIZE * 2) {
        const n = document.createElement('canvas'); n.width = n.height = Math.round(cur.width / 2);
        const ng = n.getContext('2d'); ng.imageSmoothingQuality = 'high'; ng.drawImage(cur, 0, 0, n.width, n.height); cur = n;
      }
      const fin = document.createElement('canvas'); fin.width = fin.height = SIZE;
      const fg = fin.getContext('2d'); fg.imageSmoothingQuality = 'high'; fg.drawImage(cur, 0, 0, SIZE, SIZE);
      out.push({ webp: fin.toDataURL('image/webp', Q), png: fin.toDataURL('image/png'), box: [x0 + bx0, y0 + by0, x0 + bx1, y0 + by1], touches, maxChroma });
    }
    return out;
  }, uri, cells, SIZE, PAD, Q, ALPHA);
  await b.close();

  const dir = path.join(__dirname, 'cut', 'cmast'); fs.mkdirSync(dir, { recursive: true });
  const pack = {}; let bad = 0;
  ids.forEach((id, k) => {
    const r = res[k];
    if (id.startsWith('_spare')) { console.log('  ' + id.padEnd(10) + ' skipped'); return; }
    if (!r) { console.log('  ' + id.padEnd(10) + ' EMPTY CELL'); bad++; return; }
    const edge = r.touches.map((t, i) => t ? 'LTRB'[i] : '').join('');
    if (edge) bad++;
    pack[id] = r.webp;
    fs.writeFileSync(path.join(dir, id + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    console.log('  ' + id.padEnd(10) + ' art ' + r.box.join(',').padEnd(20) + ' webp ' + (Buffer.from(r.webp.split(',')[1], 'base64').length / 1024).toFixed(1) + ' KB'
      + '  max chroma ' + r.maxChroma + (edge ? '   <-- ART TOUCHES THE CELL EDGE (' + edge + '): re-measure' : ''));
  });
  if (bad) fail(bad + ' cell(s) are empty or cut through art');
  const out = path.join(__dirname, 'pack.' + name + '.json');
  fs.writeFileSync(out, JSON.stringify(pack));
  const bytes = Object.values(pack).reduce((s, v) => s + v.length, 0);
  console.log(Object.keys(pack).length + ' plates at ' + SIZE + 'px webp q' + Q + ', ' + (bytes / 1024).toFixed(0) + ' KB in the file -> ' + path.basename(out) + ', previews in cut/cmast/');
}

/* ── merge ─────────────────────────────────────────────────────────────────── */
function merge() {
  const PACK = path.resolve(__dirname, arg('--pack') || fail('--pack <pack.json> is required'));
  const IN = arg('--in') ? path.resolve(arg('--in')) : path.join(__dirname, '..', 'cindervale.html');
  const OUT = arg('--out') ? path.resolve(arg('--out')) : IN;
  const DRY = has('--dry');
  const pack = JSON.parse(fs.readFileSync(PACK, 'utf8'));
  const pids = Object.keys(pack);
  if (!pids.length) fail('the pack is empty');
  for (const id of pids) {
    if (!/^[a-z0-9_]+$/.test(id)) fail('odd id in the pack: ' + id);
    if (!/^data:image\/webp;base64,[A-Za-z0-9+\/=]+$/.test(pack[id])) fail(id + ' is not a webp data URI');
  }
  const read = s => {
    const START = 'const CMAST_ART=';
    const at = s.indexOf(START);
    if (at < 0) fail('no CMAST_ART literal');
    if (s.indexOf(START, at + 1) >= 0) fail('CMAST_ART is declared twice');
    const open = at + START.length;
    if (s[open] !== '{') fail('CMAST_ART does not open with {');
    const close = literalEnd(s, open);
    if (close < 0) fail('the CMAST_ART literal never closes');
    if (s[close + 1] !== ';') fail('the CMAST_ART literal is not followed by ;');
    const lit = s.slice(open, close + 1);
    let o; try { o = JSON.parse(lit); } catch (e) { fail('CMAST_ART is not JSON: ' + e.message); }
    if (JSON.stringify(o) !== lit) fail('CMAST_ART does not read back through JSON.stringify byte for byte, so a rewrite would move entries');
    if (!o.icons || !o.frames || typeof o.bg !== 'string') fail('CMAST_ART has no icons, frames or bg');
    return { open, close, lit, o };
  };
  const s = fs.readFileSync(IN, 'utf8');
  const A = read(s);
  const live = A.o.icons, liveIds = Object.keys(live);
  for (const id of liveIds) if (!/^data:image\/webp;base64,/.test(live[id])) fail(id + ' in CMAST_ART.icons is not a painted webp');
  const fresh = pids.filter(id => !(id in live));
  const swapped = pids.filter(id => (id in live) && live[id] !== pack[id]);
  const same = pids.filter(id => (id in live) && live[id] === pack[id]);
  const icons = Object.assign({}, live);              // keeps the live order; new ids go after
  for (const id of pids) icons[id] = pack[id];
  const next = Object.assign({}, A.o, { icons });
  const lit2 = JSON.stringify(next);
  const s2 = s.slice(0, A.open) + lit2 + s.slice(A.close + 1);

  /* the gate: read the new file back the same way and compare against what was live */
  const B = read(s2);
  const ent = (id, v) => JSON.stringify(id) + ':' + JSON.stringify(v);
  let moved = 0;
  for (const id of liveIds) {
    if (pids.indexOf(id) >= 0) continue;
    if (B.o.icons[id] !== live[id] || B.lit.indexOf(ent(id, live[id])) < 0) moved++;
  }
  if (moved) fail(moved + ' entries that are not in the pack would change');
  if (Object.keys(B.o.icons).length !== liveIds.length + fresh.length) fail('read back ' + Object.keys(B.o.icons).length + ' plates, expected ' + (liveIds.length + fresh.length));
  for (const id of pids) if (B.o.icons[id] !== pack[id]) fail(id + ' did not land as packed');
  if (JSON.stringify(B.o.frames) !== JSON.stringify(A.o.frames) || B.o.bg !== A.o.bg) fail('the frames or the background would change');
  if (B.lit.indexOf(JSON.stringify(A.o.frames)) < 0 || B.lit.indexOf(JSON.stringify(A.o.bg)) < 0) fail('the frames or the background do not read back whole');
  if (s2.slice(0, A.open) !== s.slice(0, A.open) || s2.slice(A.open + lit2.length) !== s.slice(A.close + 1)) fail('something outside the literal would change');

  const kb = n => (n / 1024).toFixed(0) + ' KB';
  console.log('live ' + liveIds.length + ' plates, pack ' + pids.length + ':  ' + fresh.length + ' new, ' + swapped.length + ' replaced, ' + same.length + ' already identical');
  console.log((liveIds.length - swapped.length) + ' live plates, the 5 frames and the background untouched, byte for byte.  literal ' + kb(A.lit.length) + ' -> ' + kb(lit2.length) + '  (+' + kb(lit2.length - A.lit.length) + ')');
  if (swapped.length) console.log('replaced: ' + swapped.join(', '));
  if (DRY) { console.log('dry run: nothing written'); return; }
  fs.writeFileSync(OUT, s2);
  console.log('merged into ' + path.basename(OUT) + ', now ' + fs.statSync(OUT).size + ' bytes');
}

if (CMD === 'cut') cut(process.argv[3]).catch(e => { console.error(e); process.exit(1); });
else if (CMD === 'merge') merge();
else { console.error('usage: node _iconart/cmastplates.js cut <plan entry> | merge --pack <pack.json> [--dry]'); process.exit(1); }

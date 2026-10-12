/* Merge a pack of painted item icons into the live ART_ITEM block, leaving every
 * other entry in it byte for byte as it is.
 *
 *     node _iconart/mergeitems.js --pack pack.magic.json --dry     say what would happen
 *     node _iconart/mergeitems.js --pack pack.magic.json           do it
 *     node _iconart/mergeitems.js --pack p.json --in a.html --out b.html
 *
 * WHY NOT inject.js. inject.js rewrites the whole block from a full pack, and a full
 * pack is no longer the same bytes: on this machine's Chrome every one of the 873
 * icons encodes differently from what is live (gate54.js, 0.9.124.54: 0 identical,
 * +0.37 MB). So a new batch cannot go in by re-packing everything. splice54.js
 * answered that for icons that already had an entry; this is the same idea for ids
 * that are NEW, which is every batch of new items from here on.
 *
 * Pack only the new ids (a picks file that names just them, --out pack.<name>.json)
 * and merge that. The block is read BY LINE and nothing is written unless every
 * entry that was there reads back whole and unchanged: injectmon.js once truncated
 * all 57 monster portraits with a lazy regex, and node --check was the only thing
 * that noticed.
 *
 * Entries stay sorted by id, as inject.js writes them, so a full re-inject one day
 * would produce the same order.
 */
'use strict';
const fs = require('fs'), path = require('path');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const has = k => process.argv.includes(k);
const PACK = path.resolve(__dirname, arg('--pack') || 'pack.json');
const IN = arg('--in') ? path.resolve(arg('--in')) : path.join(__dirname, '..', 'cindervale.html');
const OUT = arg('--out') ? path.resolve(arg('--out')) : IN;
const DRY = has('--dry');
const OPEN = '/* ==ITEM-ART-START== */', CLOSE = '/* ==ITEM-ART-END== */';
const fail = m => { console.error('mergeitems: ' + m + '. Nothing written.'); process.exit(1); };

const pack = JSON.parse(fs.readFileSync(PACK, 'utf8'));
const packIds = Object.keys(pack);
if (!packIds.length) fail('the pack is empty (a --picks path that does not resolve packs nothing and still says "wrote")');
for (const id of packIds) {
  if (!/^[A-Za-z0-9_]+$/.test(id)) fail('odd id in the pack: ' + id);
  if (!/^data:image\/webp;base64,[A-Za-z0-9+\/=]+$/.test(pack[id])) fail(id + ' is not a webp data URI');
}

const s = fs.readFileSync(IN, 'utf8');
const a = s.indexOf(OPEN), b = s.indexOf(CLOSE);
if (a < 0 || b < a) fail('no item art block in ' + path.basename(IN));
if (s.indexOf(OPEN, a + 1) >= 0 || s.indexOf(CLOSE, b + 1) >= 0) fail('more than one item art block');
const block = s.slice(a, b);
const EOL = block.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const lines = block.split(EOL);
const head = lines.indexOf('  var ART_ITEM={');
if (head < 0) fail('the block has no "  var ART_ITEM={" line');
let tail = -1;
for (let i = head + 1; i < lines.length; i++) if (lines[i] === '  };') { tail = i; break; }
if (tail < 0) fail('the ART_ITEM literal never closes');

/* one entry a line:  "id":"<img class=\"ev-icon art-item\" alt=\"\" loading=\"lazy\" src=\"data:...\">"  */
const mk = (id, uri) => JSON.stringify(id) + ':' + JSON.stringify('<img class="ev-icon art-item" alt="" loading="lazy" src="' + uri + '">');
const live = new Map(), order = [];
let blanks = 0;
for (let i = head + 1; i < tail; i++) {
  let l = lines[i];
  if (l === '') { blanks++; continue; }
  if (l.endsWith(',')) l = l.slice(0, -1);
  let id, val;
  try { const o = JSON.parse('{' + l + '}'); const k = Object.keys(o); if (k.length !== 1) throw 0; id = k[0]; val = o[id]; } catch (e) { fail('line ' + (i + 1) + ' of the block is not one entry: ' + l.slice(0, 60)); }
  const m = /^<img class="ev-icon art-item" alt="" loading="lazy" src="(data:image\/webp;base64,[A-Za-z0-9+\/=]+)">$/.exec(val);
  if (!m) fail(id + ' is not an art-item img');
  if (mk(id, m[1]) !== l) fail(id + ' does not read back as it is written');     // the round trip
  if (live.has(id)) fail(id + ' is in the block twice');
  live.set(id, l); order.push(id);
}
const sorted = order.slice().sort();
if (JSON.stringify(sorted) !== JSON.stringify(order)) fail('the live block is not sorted by id, so a sorted merge would move entries');

const fresh = packIds.filter(id => !live.has(id));
const swapped = packIds.filter(id => live.has(id) && live.get(id) !== mk(id, pack[id]));
const same = packIds.filter(id => live.has(id) && live.get(id) === mk(id, pack[id]));
const next = new Map(live);
for (const id of packIds) next.set(id, mk(id, pack[id]));
const ids = Array.from(next.keys()).sort();
const body = ids.map((id, i) => next.get(id) + (i < ids.length - 1 ? ',' : ''));
const outLines = lines.slice(0, head + 1).concat(body, blanks ? [''] : [], lines.slice(tail));
const outBlock = outLines.join(EOL);

/* the gate: read the new block back the same way and compare against what was live */
{ const back = new Map(); const L = outBlock.split(EOL); const h = L.indexOf('  var ART_ITEM={'); let t = -1;
  for (let i = h + 1; i < L.length; i++) if (L[i] === '  };') { t = i; break; }
  for (let i = h + 1; i < t; i++) { let l = L[i]; if (l === '') continue; if (l.endsWith(',')) l = l.slice(0, -1); const o = JSON.parse('{' + l + '}'); const k = Object.keys(o)[0]; back.set(k, l); }
  if (back.size !== live.size + fresh.length) fail('read back ' + back.size + ' entries, expected ' + (live.size + fresh.length));
  let moved = 0; for (const [id, l] of live) if (packIds.indexOf(id) < 0 && back.get(id) !== l) moved++;
  if (moved) fail(moved + ' entries that are not in the pack would change');
  for (const id of packIds) if (back.get(id) !== mk(id, pack[id])) fail(id + ' did not land as packed');
}

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log('live ' + live.size + ' icons, pack ' + packIds.length + ':  ' + fresh.length + ' new, ' + swapped.length + ' replaced, ' + same.length + ' already identical');
console.log((live.size - swapped.length) + ' live entries untouched, byte for byte.  block ' + kb(block.length) + ' -> ' + kb(outBlock.length) + '  (+' + kb(outBlock.length - block.length) + ')');
if (swapped.length) console.log('replaced: ' + swapped.join(', '));
if (DRY) { console.log('dry run: nothing written'); process.exit(0); }
fs.writeFileSync(OUT, s.slice(0, a) + outBlock + s.slice(b));
console.log('merged into ' + path.basename(OUT) + ', now ' + (fs.statSync(OUT).size / 1048576).toFixed(2) + ' MB');

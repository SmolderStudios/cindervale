/* Swap ONLY the cleaned jewelry icons into the live ART_ITEM block (0.9.124.54).
 *
 *     node _iconart/splice54.js _iconart/pack54.json
 *
 * Why not inject.js: a full pack re-encodes all 873 icons, and on this machine's
 * Chrome the bytes no longer match the live block (gate54: 0 identical, +0.37 MB).
 * So this replaces the data URI of each id in cutfix/ in place, one line each, and
 * checks that every other entry is byte-identical before and after.
 */
'use strict';
const fs = require('fs'), path = require('path');
const GAME = path.join(__dirname, '..', 'cindervale.html');
const pack = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, 'pack54.json'), 'utf8'));
const ids = fs.readdirSync(path.join(__dirname, 'cutfix')).map(f => f.replace('__painted.png', ''));
let s = fs.readFileSync(GAME, 'utf8');
const A = s.indexOf('/* ==ITEM-ART-START== */'), B = s.indexOf('/* ==ITEM-ART-END== */');
if (A < 0 || B < A) throw new Error('art block not found');
const re = /^"([a-zA-Z0-9_]+)":"<img class=\\"ev-icon art-item\\"[^>]*?src=\\"(data:image\/webp;base64,[A-Za-z0-9+\/=]+)\\"/gm;
const read = txt => { const out = {}; let m; re.lastIndex = 0; while ((m = re.exec(txt))) out[m[1]] = m[2]; return out; };
const before = read(s.slice(A, B));
let block = s.slice(A, B), done = 0;
for (const id of ids) {
  if (!before[id]) throw new Error('not in the live block: ' + id);
  if (!pack[id] || !/^data:image\/webp;base64,/.test(pack[id])) throw new Error('not in the pack: ' + id);
  const n = block.split(before[id]).length - 1;
  if (n !== 1) throw new Error(id + ': live data URI found ' + n + ' times');
  block = block.replace(before[id], () => pack[id]);
  done++;
}
const after = read(block);
const keys = Object.keys(before);
const changed = keys.filter(k => before[k] !== after[k]);
const bad = changed.filter(k => ids.indexOf(k) < 0);
if (Object.keys(after).length !== keys.length || bad.length) throw new Error('gate failed: ' + JSON.stringify({after: Object.keys(after).length, before: keys.length, bad}));
s = s.slice(0, A) + block + s.slice(B);
fs.writeFileSync(GAME, s);
const kb = x => Math.round(x.length / 1024 * 10) / 10;
console.log('spliced', done, 'icons; identical', keys.length - changed.length, '; changed', changed.length,
  '; jewelry bytes', kb(ids.map(k => before[k]).join('')) + 'K ->', kb(ids.map(k => after[k]).join('')) + 'K');

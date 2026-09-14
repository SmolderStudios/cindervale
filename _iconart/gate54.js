/* Gate for the jewelry cleanup inject (0.9.124.54): compare a pack against the live
 * ART_ITEM block. Every live id must be present; only the named ids may differ.
 *     node _iconart/gate54.js _iconart/pack54.json
 */
'use strict';
const fs = require('fs'), path = require('path');
const pack = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, 'pack54.json'), 'utf8'));
const html = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');
const a = html.indexOf('/* ==ITEM-ART-START== */'), b = html.indexOf('/* ==ITEM-ART-END== */');
const block = html.slice(a, b);
const live = {};
const re = /^"([a-zA-Z0-9_]+)":"<img class=\\"ev-icon art-item\\"[^>]*?src=\\"(data:image\/webp;base64,[A-Za-z0-9+\/=]+)\\"/gm;
let m; while ((m = re.exec(block))) live[m[1]] = m[2];
const cutfix = fs.readdirSync(path.join(__dirname, 'cutfix')).map(f => f.replace('__painted.png', ''));
const same = [], changed = [], missing = [], extra = [];
for (const id in live) {
  if (!(id in pack)) { missing.push(id); continue; }
  (pack[id] === live[id] ? same : changed).push(id);
}
for (const id in pack) if (!(id in live)) extra.push(id);
const unexpected = changed.filter(id => cutfix.indexOf(id) < 0);
const jewelSame = cutfix.filter(id => same.indexOf(id) >= 0);
console.log('live', Object.keys(live).length, 'pack', Object.keys(pack).length);
console.log('identical', same.length, 'changed', changed.length, 'missing', missing.length, 'extra', extra.length);
console.log('changed but not jewelry:', unexpected.length, unexpected.slice(0, 20).join(','));
console.log('jewelry unchanged:', jewelSame.join(','));
if (missing.length) console.log('missing:', missing.slice(0, 20).join(','));
if (extra.length) console.log('extra:', extra.slice(0, 20).join(','));
process.exit(missing.length || extra.length || unexpected.length ? 1 : 0);

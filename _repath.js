/* Repoint every hardcoded Desktop path at the new Cindervale/ tree.
 *
 *     node _repath.js --dry     list what would change
 *     node _repath.js           write it
 *
 * The trailer kit alone is referenced ~96 times across the art scripts (KIT and
 * CHROME constants), so this is a scripted replace rather than a hand edit. Order
 * matters: the longest old path is replaced first, or a shorter prefix eats it.
 */
'use strict';
const fs = require('fs'), path = require('path');
const DRY = process.argv.includes('--dry');
const D = 'C:/Users/Jordan/Desktop';

/* longest first */
const MAP = [
  ['OLD EMBERVALE/Embervale Idle Dev', 'Cindervale/wrapper'],
  ['Cindervale Idle Official',         'Cindervale/builds'],
  ['Cindervale Store Assets',          'Cindervale/store'],
  ['Cindervale Steam Assets 811',      'Cindervale/archive/steam-assets-811'],
  ['Embervale Idle Official',          'Cindervale/archive/embervale-official'],
  ['cindervale-trailer-kit',           'Cindervale/tools/trailer-kit'],
  ['cindervale-mobile-probe',          'Cindervale/tools/mobile-probe'],
  ['cindervale-ad-kit',                'Cindervale/tools/ad-kit'],
  ['cindervale-art',                   'Cindervale/archive/art-library'],
  ['Cindervale Icons',                 'Cindervale/icons-inbox'],
  ['OLD EMBERVALE',                    'Cindervale/archive/old-embervale'],
];

/* Both slash styles appear, and the backslash form also appears doubled inside
   JS string literals. Build every spelling of every mapping. */
function variants(oldRel, newRel) {
  const of = D + '/' + oldRel, nf = D + '/' + newRel;
  const ob = of.replace(/\//g, '\\'), nb = nf.replace(/\//g, '\\');
  return [
    [of, nf],                                     // forward slashes
    [ob, nb],                                     // backslashes
    [ob.replace(/\\/g, '\\\\'), nb.replace(/\\/g, '\\\\')],  // escaped in a JS literal
  ];
}

const TARGETS = [];
function walk(dir, depth) {
  if (depth > 6) return;
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/^(node_modules|\.git|browsers|cut|raw|recol_cut|out|output|dist|win-unpacked)$/i.test(e.name)) continue;
      walk(p, depth + 1);
    } else if (/\.(js|json|md|bat|vdf|txt|html)$/i.test(e.name)) {
      if (e.name === '_repath.js') continue;
      TARGETS.push(p);
    }
  }
}
walk('C:/code/embervale', 0);
walk(D + '/Cindervale/store', 0);
walk(D + '/Cindervale/wrapper', 0);
walk(D + '/steamworks_sdk_164/sdk/tools/ContentBuilder/scripts', 0);
walk(D + '/Cindervale/archive', 0);
walk(D + '/Cindervale/tools/ad-kit', 0);
walk(D + '/Cindervale/icons-inbox', 0);

let filesChanged = 0, hits = 0;
const perFolder = {};
for (const f of TARGETS) {
  let s; try { s = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
  const before = s;
  for (const [oldRel, newRel] of MAP) {
    for (const [a, b] of variants(oldRel, newRel)) {
      if (s.includes(a)) {
        const n = s.split(a).length - 1;
        hits += n;
        perFolder[oldRel] = (perFolder[oldRel] || 0) + n;
        s = s.split(a).join(b);
      }
    }
  }
  if (s !== before) {
    filesChanged++;
    if (!DRY) fs.writeFileSync(f, s);
    console.log((DRY ? '  would fix  ' : '  fixed      ') + f.replace(/\\/g, '/'));
  }
}
console.log('\n' + (DRY ? 'WOULD CHANGE' : 'CHANGED') + ': ' + filesChanged + ' files, ' + hits + ' references');
Object.entries(perFolder).sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log('   ' + String(v).padStart(4) + '  ' + k));

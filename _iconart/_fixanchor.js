/* inject.js pinned the art block right after the monster pack (==ART-PACK-END==),
 * which sits ABOVE the gear icon generators. Those run ICONS[id]=... in loops, so
 * every re-injection silently reverted 135 of the 666 icons to SVG — the file
 * parsed, the game booted, and a fifth of the art simply was not applied.
 *
 * The block has to be the LAST thing that writes ICONS. This moves the anchor to a
 * dedicated marker placed after the final writer, so a future ICONS writer added
 * below it is a visible edit rather than a silent revert.
 */
'use strict';
const fs = require('fs');

/* 1. put a dedicated marker in the game file, after the last ICONS writer */
const GAME = __dirname + '/../cindervale.html';
let g = fs.readFileSync(GAME, 'utf8');
const MARK = '/* ==ICONS-DONE== */';
if (!g.includes(MARK)) {
  const tail = "  if(SAIL_IMG[_hk]) ICONS['sl_h'+_hi]='<img class=\"ev-icon\" src=\"'+SAIL_IMG[_hk]+'\" alt=\"\">';\n}";
  const at = g.indexOf(tail);
  if (at < 0) throw new Error('last ICONS writer not found');
  const note = '\n\n/* Everything above this line may write ICONS. The generated item art block is\n' +
    '   injected BELOW it, because whichever assignment runs last wins — and the gear\n' +
    '   icons are built by loops, so an art block placed above them is thrown away.\n' +
    '   _audit_tests.js fails if anything writes ICONS after the block. */\n' + MARK;
  g = g.slice(0, at + tail.length) + note + g.slice(at + tail.length);
}

/* 2. drop the stale stub comment from the earlier hand-move */
const stub = g.indexOf('/* Item art used to sit here.');
if (stub >= 0) {
  const end = g.indexOf('*/', stub) + 2;
  g = g.slice(0, stub) + g.slice(end);
}
fs.writeFileSync(GAME, g);

/* 3. repoint inject.js at the new marker */
const F = __dirname + '/inject.js';
let s = fs.readFileSync(F, 'utf8');
const o = "const ANCHOR = '/* ==ART-PACK-END== */';";
const n = "/* NOT ==ART-PACK-END==: that sits above the gear icon generators, which build\n" +
  "   ICONS[id] in loops and would overwrite 135 of the icons injected here. The\n" +
  "   block has to come after every ICONS writer. */\n" +
  "const ANCHOR = '/* ==ICONS-DONE== */';";
if (!s.includes(o)) throw new Error('anchor line not found in inject.js');
fs.writeFileSync(F, s.replace(o, n));
console.log('anchor moved below every ICONS writer');

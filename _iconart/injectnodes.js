/* Splice painted tree-node art into the NODE_ART literal.
 *
 *     node _iconart/injectnodes.js --pack pack_nodes.json
 *
 * NODE_ART is the one art block in the file that had no producing tool: the original
 * 160 were injected once by hand, which is fine exactly once and awful the second
 * time. Thieving was the second time. This is that tool.
 *
 * It MERGES rather than replaces — unlike inject.js, which owns its whole ART_ITEM
 * block and rewrites it. NODE_ART has no such fence, and the 160 that are already in
 * there have no sheet on disk to rebuild from, so a replace would destroy them.
 * An id already present is overwritten in place; a new id is appended.
 */
'use strict';
const fs = require('fs'), path = require('path');
const literalEnd = require('./_litend.js');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const PACK = path.resolve(__dirname, arg('--pack') || 'pack_nodes.json');
const FILE = arg('--in') || path.join(__dirname, '..', 'cindervale.html');

const pack = JSON.parse(fs.readFileSync(PACK, 'utf8'));
let s = fs.readFileSync(FILE, 'utf8');

const START = 'const NODE_ART={';
const i = s.indexOf(START);
if (i < 0) { console.error('no NODE_ART literal'); process.exit(1); }

/* Brace-match to find the close. The first cut of this looked for the next newline
   followed by "};" instead, which is how SKILL_ART is formatted and is NOT how
   NODE_ART is: its last entry closes on its own line right after the string. So the
   search sailed 16,000 lines past the literal and appended thirteen paintings to the
   end of PASSIVE_TIPS, which parsed as a doubled comma and took the whole file down. */
const j = literalEnd(s, i + START.length - 1);
if (j < 0) { console.error('NODE_ART literal never closes'); process.exit(1); }

let body = s.slice(i + START.length, j);
const BACKSLASH = String.fromCharCode(92);
const q = BACKSLASH + '"';                 // an escaped quote, inside a JS string literal
const wrap = uri => '<img class=' + q + 'ev-icon art-node' + q + ' alt=' + q + q
                  + ' loading=' + q + 'lazy' + q + ' src=' + q + uri + q + '>';

/* Walk the existing value by hand rather than by regex. The values are JSON strings
   full of escaped quotes, and a character class that has to contain a backslash is
   exactly the kind of thing that survives review and then does not survive the shell. */
const valueEnd = (str, from) => {
  for (let i = from; i < str.length; i++) {
    if (str[i] === BACKSLASH) { i++; continue; }
    if (str[i] === '"') return i;
  }
  return -1;
};

let replaced = 0, added = 0;
for (const id of Object.keys(pack)) {
  const entry = '"' + id + '":"' + wrap(pack[id]) + '"';
  const key = '"' + id + '":"';
  const at = body.indexOf(key);
  if (at >= 0) {
    const end = valueEnd(body, at + key.length);
    body = body.slice(0, at) + entry + body.slice(end + 1);
    replaced++;
  } else {
    const tail = body.replace(/\s*$/, '');
    body = tail + (/[,{]$/.test(tail) ? '' : ',') + '\n' + entry;
    added++;
  }
}

s = s.slice(0, i + START.length) + body + s.slice(j);
fs.writeFileSync(FILE, s, 'utf8');
console.log(`NODE_ART: ${replaced} replaced, ${added} added  (file now ${(Buffer.byteLength(s) / 1048576).toFixed(2)} MB)`);

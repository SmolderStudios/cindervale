/* Scan EVERY player-facing string in the game for wording Jordan has ruled out.
 *
 *     node _iconart/copycheck.js            whole file
 *     node _iconart/copycheck.js --slayer   just the slayer region
 *
 * Two separate faults, both of which he has now called out by name:
 *
 *   FLAVOUR STANDING IN FOR A FACT — "pays more", "heavier purses", "trains
 *   harder". Reads like prose, tells you nothing, and the number it is hiding is
 *   usually right there in the data.
 *
 *   CODE VOCABULARY — "on-task", "attune", "the assignable pool", "gates", "proc",
 *   "tick", "stack". These are variable names that escaped into the UI. A player
 *   has no way to learn them, because they only exist in the source.
 *
 * Item `desc` flavour is EXEMPT and skipped: those are meant to read like prose
 * ("no mine on the coast yields it"). The rule is for text that explains a
 * mechanic — panel copy, tooltips, button labels, toasts, perk and upgrade
 * descriptions.
 */
'use strict';
const fs = require('fs'), path = require('path');
const raw = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');
const SLAYER_ONLY = process.argv.includes('--slayer');

/* Word-boundary matched, so "attunement" is caught but "pool" inside "poolside"
   is not, and "stack" does not fire on "stacks of logs" in an item name. */
const FLAVOUR = [
  'pays more', 'pays out', 'pays twice', 'heavier', 'purses', 'better pay',
  'yields', 'binds to', 'quarry', 'closes your wounds', 'as you go',
  'far more often', 'a chance at', 'seasoned', 'for good',
];
/* NOT on this list, deliberately: stacks, stacking, buff, crit, cooldown, tier,
   XP. Jordan: "stacking makes sense, i like stacks... but stacking is normal."
   These are ordinary game words a player already knows. The list below is for
   words that only exist in the SOURCE — variable names that escaped into the UI. */
const CODE = [
  'on-task', 'on task kill', 'attune', 'attuned', 'attunement', 'reattune',
  'assignable', 'gates the', 'gated', 'proc', 'procs', 'per tick', 'ticks',
  'roll on the', 'rolls on the', 'the pool', 'drop pool', 'loot table',
  'additive', 'threshold', 'flagged', 'boolean',
];

const hit = (text, words) => words.filter(w => {
  const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z])' + esc + '($|[^a-z])', 'i').test(text);
});

/* Player-facing string sites. Item/monster `desc` is deliberately absent. */
const SITES = [
  ['toast',    /\btoast\(\s*[`'"]([^`'"]{10,160})[`'"]/g],
  ['log',      /\bcmbLog\(\s*[`'"]([^`'"]{10,160})[`'"]/g],
  ['notify',   /logNotification\([^,]+,[^,]+,\s*[`'"]([^`'"]{10,160})[`'"]/g],
  ['tooltip',  /data-tip="([^"]{10,200})"/g],
  ['perk/desc',/\bdesc:\s*(?:'([^']{10,200})'|"([^"]{10,200})")/g],
  ['blurb',    /\bblurb:\s*'([^']{10,200})'/g],
  ['hint',     /\bshowHint\([^,]*,\s*[`'"]([^`'"]{10,200})[`'"]/g],
  ['label',    /\blab:\s*'([^']{4,60})'/g],
  ['sub',      /\bsub:\s*'([^']{6,120})'/g],
];

let region = raw;
if (SLAYER_ONLY) {
  const a = raw.indexOf('const SLAYER_FAMILIES');
  const b = raw.indexOf('/* ════ END COMBAT MASTERY VIEW');
  region = raw.slice(a, b > a ? b : a + 200000);
}

const seen = new Set();
const rows = [];
for (const [where, re] of SITES) {
  for (const m of region.matchAll(re)) {
    const text = (m[1] || m[2] || '').trim();
    if (!text || seen.has(where + '|' + text)) continue;
    seen.add(where + '|' + text);
    const f = hit(text, FLAVOUR), c = hit(text, CODE);
    if (f.length || c.length) rows.push({ where, text, f, c });
  }
}

console.log(seen.size + ' player-facing strings scanned' + (SLAYER_ONLY ? ' (slayer only)' : '') + '\n');
if (!rows.length) { console.log('nothing flagged — all plain'); process.exit(0); }

const byKind = { code: rows.filter(r => r.c.length), flavour: rows.filter(r => !r.c.length && r.f.length) };
for (const kind of ['code', 'flavour']) {
  if (!byKind[kind].length) continue;
  console.log((kind === 'code' ? 'CODE VOCABULARY' : 'FLAVOUR INSTEAD OF A FACT') + '  (' + byKind[kind].length + ')');
  for (const r of byKind[kind]) {
    console.log('  [' + (kind === 'code' ? r.c : r.f).join(', ') + ']  ' + r.where);
    console.log('      ' + (r.text.length > 130 ? r.text.slice(0, 130) + '…' : r.text));
  }
  console.log('');
}
console.log(rows.length + ' flagged');
process.exit(rows.length ? 1 : 0);

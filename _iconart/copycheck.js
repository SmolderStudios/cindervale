/* Read every player-facing slayer string back and flag vague wording.
 *
 *     node _iconart/copycheck.js
 *
 * Jordan's rule (and my own note, which I broke writing these): say the mechanic
 * the way you would say it out loud. The words below are the ones that read as
 * flavour standing in for a fact — "pays more" instead of the number, "harder"
 * instead of what gets harder, "purses" instead of gold.
 *
 * Flags are advisory. A monster called Bloodhound is a name, not vague; the rule
 * is for text that EXPLAINS a mechanic.
 */
'use strict';
const fs = require('fs'), path = require('path');
const raw = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');

/* Words that hide a mechanic behind flavour, and jargon only the code knows. */
const VAGUE = [
  'pays more', 'pays out', 'pays twice', 'heavier', 'purse', 'harder', 'better pay',
  'yields', 'binds to', 'attune', 'quarry', 'on-task', 'closes your wounds',
  'deadliest', 'seasoned', 'gates the', 'for good', 'a chance at', 'sometimes',
  'as you go', 'shorter lists', 'far more often', 'the pool', 'assignable',
  'abandon', 'fresh one', 'roll on the', 'starter bounties',
];

function grab(name) {
  const s = raw.indexOf('const ' + name + '=[');
  if (s < 0) return '';
  return raw.slice(s, raw.indexOf('\n];', s));
}

const strings = [];
const push = (where, re, src) => {
  for (const m of src.matchAll(re)) strings.push({ where, text: m[1] });
};
push('perk desc',    /desc:'([^']+)'/g,            grab('SLAYER_PERKS'));
push('tier',         /sub:'([^']+)'/g,             grab('SLAYER_TIERS'));
push('master',       /blurb:'([^']+)'/g,           grab('SLAYER_MASTERS'));
push('cache',        /desc:'([^']+)'/g,            grab('SLAYER_CACHE'));
push('unlock',       /desc:("[^"]+"|'[^']+')/g,    grab('SLAYER_UNLOCKS'));

/* Panel copy and messages live inline, so scan the slayer region of the file. */
const a = raw.indexOf('const SLAYER_FAMILIES');
const b = raw.indexOf('/* ════ END COMBAT MASTERY VIEW');
const region = raw.slice(a, b > a ? b : a + 200000);
for (const m of region.matchAll(/toast\((?:`|')([^`']{12,120})(?:`|')\)/g)) strings.push({ where: 'toast', text: m[1] });
for (const m of region.matchAll(/cmbLog\((?:`|")([^`"]{12,120})(?:`|")/g)) strings.push({ where: 'log', text: m[1] });
for (const m of region.matchAll(/card\('[^']+','([^']{12,200})'/g)) strings.push({ where: 'action card', text: m[1] });

let bad = 0;
console.log(strings.length + ' player-facing slayer strings\n');
for (const s of strings) {
  const hits = VAGUE.filter(v => s.text.toLowerCase().includes(v));
  if (hits.length) { bad++; console.log('  VAGUE [' + hits.join(', ') + ']  ' + s.where + ': ' + s.text); }
}
console.log(bad ? '\n' + bad + ' still vague' : '\nnothing flagged — all plain');
process.exit(bad ? 1 : 0);

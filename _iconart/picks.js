/* Choose a style per item, and decide what should not be replaced at all.
 *
 *     node _iconart/picks.js   ->  _iconart/picks.json  for pack.js --picks
 *
 * THERE IS ONLY ONE STYLE NOW. Everything in raw/ came off the ChatGPT contact
 * sheets, painted, cut by slice.js — one lighting setup and one palette per sheet,
 * which is the whole reason that route replaced local generation. The old two-horse
 * race is over, so this file is nearly a formality; it stays because pack.js takes a
 * picks map and because the tables below are the right place to record a subject that
 * came back wrong.
 *
 * What used to be here, and why it is gone:
 *   - an "emblem" style, generated locally alongside painted. Z-Image-Turbo at cfg 2.4
 *     answers the strongest noun in its prior and ignores negatives, so rat_fang came
 *     back as a whole rat, wyrmscale as a dragon, and every *_buckler as a steel heater
 *     shield. Thirty-five items were on emblem purely as damage control. All of them
 *     are drawn correctly on the sheets now.
 *   - an automatic fallback keyed off verify.js's flags. verify measures whether an icon
 *     is READABLE — luminance, contrast, coverage, hue — and has no idea whether the
 *     picture is of the right THING, which is exactly the failure that mattered. Its
 *     report was also measured against art that no longer exists.
 *
 * Subject errors still have to be caught BY EYE, on the review grids, and recorded in
 * the two tables below. Both are empty on purpose: every id that was in them has been
 * redrawn, and re-adding one should mean someone looked at the new art and rejected it.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { ALL } = require('./subjects');

/* Style override, for the day a second style exists again. */
const OVERRIDE = {};

/* Where the sheet art is the wrong object, so the hand-drawn SVG stays. Leaving an id
   out of the pack is all it takes: the art block sits below every ICONS writer, and an
   id it does not mention keeps whatever the game already built. One icon in the old
   style beats an icon of the wrong thing.
   As each id lands here it must ALSO be added to SVG_OK in _audit_tests.js. */
const KEEP_SVG = {};

const has = (id, st) => fs.existsSync(path.join(__dirname, 'cut', id + '__' + st + '.png'));

const picks = {};
const tally = { painted: 0, emblem: 0, manual: 0, kept: 0, nofile: [] };
for (const s of ALL) {
  if (KEEP_SVG[s.id]) { tally.kept++; continue; }
  if (OVERRIDE[s.id] && has(s.id, OVERRIDE[s.id])) {
    picks[s.id] = OVERRIDE[s.id]; tally.manual++;
  } else if (has(s.id, 'painted')) {
    picks[s.id] = 'painted';
  } else {
    tally.nofile.push(s.id); continue;
  }
  tally[picks[s.id]]++;
}

/* Every override has to name a real subject, or a typo silently does nothing. */
const known = new Set(ALL.map(s => s.id));
const bogus = [...Object.keys(OVERRIDE), ...Object.keys(KEEP_SVG)].filter(id => !known.has(id));
if (bogus.length) throw new Error('override for unknown id: ' + bogus.join(', '));

fs.writeFileSync(path.join(__dirname, 'picks.json'), JSON.stringify(picks, null, 1));
console.log(Object.keys(picks).length + ' picks -> picks.json');
console.log('  painted ' + tally.painted + '   emblem ' + tally.emblem + ' (' + tally.manual + ' manual)');
if (tally.kept) {
  console.log('  keeping the existing SVG for ' + tally.kept + ':');
  for (const [id, why] of Object.entries(KEEP_SVG)) console.log('    ' + id + ' — ' + why);
}
if (tally.nofile.length) {
  console.log('  NO CUT FILE for ' + tally.nofile.length + ' (these keep their SVG by default):');
  console.log('    ' + tally.nofile.join(' '));
}

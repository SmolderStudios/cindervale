/* Rewrite the gear vocabulary short.
 *
 * Jordan rejected most of the gear: "they look like double in one pic, dont look
 * like any armor, have white in between the gaps, void is just black". Putting the
 * rejected icons beside the batch-1/2 art he approved made the cause obvious.
 *
 *   approved  "A single brilliant cut ruby gemstone, deep red, sharp facets catching light"
 *   mine      "A single empty rigid armour cuirass standing by itself on nothing, one
 *              moulded chest piece, rounded shoulder pauldrons, riveted plate edges,
 *              flared skirt at the waist, hollow and unworn, made of moltensteel, dark
 *              iron split by glowing molten orange seams"
 *
 * Twelve words against forty. Every extra clause buys detail, and detail is what
 * turns a game icon into a render — at 15px it is mud either way. The approved
 * families are terse, so the gear becomes terse.
 *
 * Three specific things fixed alongside:
 *   - "empty leather trouser legs hanging from a wide belt" IS a description of
 *     jeans, which is exactly what came back. Leg armour is greaves.
 *   - "standing by itself on nothing" stands a breastplate up like a person, which
 *     is why the chests came back as full armoured figures.
 *   - "rounded dome, T shaped visor slot, flared neck guard" is a motorcycle helmet.
 */
'use strict';
const fs = require('fs');
const F = __dirname + '/subjects3.js';
let lines = fs.readFileSync(F, 'utf8').split('\n');

/* Replace a `const NAME = { ... };` block by name — text anchors kept breaking as
   earlier fixes moved the surrounding comments. */
function replaceBlock(name, body) {
  const i = lines.findIndex(l => l.startsWith('const ' + name + ' = {'));
  if (i < 0) throw new Error('no block ' + name);
  let j = i;
  while (j < lines.length && lines[j].trim() !== '};') j++;
  if (j >= lines.length) throw new Error('unterminated ' + name);
  lines.splice(i, j - i + 1, ...body.split('\n'));
}

replaceBlock('SHAPE', `const SHAPE = {
  helmet: 'A single medieval knight helm, one solid piece with a narrow dark eye slit',
  chest:  'A single breastplate, curved chest armour with shoulder guards, hollow and empty',
  legs:   'A single pair of armoured leg greaves, two curved shin plates side by side',
  boots:  'A single pair of armoured boots side by side',
  gloves: 'A single armoured gauntlet, wide flared cuff, fingers curled',
  cape:   'A single hanging cloak, heavy folds, clasp at the top',
  shield: 'A single shield seen face on, raised boss at its centre',
};`);

replaceBlock('SLOT_NEG', `const SLOT_NEG = {
  helmet: 'motorcycle helmet, crash helmet, modern, hoodie, skull, face, head, person',
  chest:  'person, body, torso, legs, full suit of armour, standing figure, t shirt, mannequin',
  legs:   'trousers, jeans, denim, leggings, full suit of armour, person, standing figure',
  boots:  'person, legs, standing figure',
  gloves: 'hand, arm, person, mitten',
  cape:   'person, figure, mannequin',
  shield: 'person',
  weapon: 'two weapons, a pair of weapons, crossed weapons, duplicate, helmet, head, person',
};`);

replaceBlock('SOFT', `const SOFT = {
  helmet: 'A single soft leather hood, the open cowl facing the viewer',
  chest:  'A single sleeveless leather jerkin, laced front, hollow and empty',
  legs:   'A single pair of leather leg guards, two padded shin wraps side by side',
  gloves: 'A single leather bracer, one wide wrapped forearm cuff',
  boots:  'A single pair of soft leather boots side by side',
};`);

replaceBlock('SOFT_NEG', `const SOFT_NEG = {
  helmet: 'metal helmet, visor, motorcycle helmet, skull, face, head, person',
  chest:  'metal plate, cuirass, t shirt, person, torso, head, arms',
  legs:   'trousers, jeans, denim, leggings, metal greaves, boots, person, standing figure',
  gloves: 'metal gauntlet, hand, arm, person',
  boots:  'metal plate, person, legs, standing figure',
};`);

replaceBlock('WEAPON', `const WEAPON = {
  slash:  'A single sword, blade pointing up, crossguard and wrapped grip',
  stab:   'A single dagger, short blade pointing up, small crossguard',
  crush:  'A single war hammer, one blunt block at the top of a long haft',
  slash2: 'A single huge two handed greatsword, one long blade pointing up',
  crush2: 'A single huge two handed maul, one blunt block at the top of a long haft',
};`);

replaceBlock('MATERIAL', `const MATERIAL = {
  bronze:      M('warm brown gold bronze'),
  iron:        M('dull grey iron'),
  steel:       M('bright silver steel', { pale: true }),
  mithril:     M('luminous sky blue mithril'),
  cobalt:      M('deep vivid blue cobalt'),
  runite:      M('rich emerald green runite'),
  starsteel:   M('pale violet white starsteel', { pale: true }),
  gravesteel:  M('tarnished grey green steel'),
  moltensteel: M('black iron cracked with glowing orange', { dark: true }),
  voidsteel:   M('black metal edged in violet light', { dark: true }),
  dawn:        M('radiant pale gold', { pale: true }),
  barrow:      M('tarnished grave silver'),
  emberforged: M('blackened iron veined with orange forge light', { dark: true }),

  roughhide:   H('coarse tan leather'),
  chitinweave: H('glossy chestnut brown chitin', { dark: true }),
  chitin:      H('glossy chestnut brown chitin', { dark: true }),
  wolfhide:    H('brown leather with grey wolf fur trim'),
  warband:     H('scarred brown leather with red war cord', { dark: true }),
  ogrehide:    H('thick pale grey hide', { pale: true }),
  trollhide:   H('brown leather mottled with sickly green'),
  drakehide:   H('bronze red scaled hide'),
  demonhide:   H('cracked crimson hide with black studs', { dark: true }),
  wraithhide:  H('translucent ghost grey hide', { pale: true }),
  emberhide:   H('charred black hide cracked with ember orange', { dark: true }),
  emberweave:  H('charred black hide cracked with ember orange', { dark: true }),
  cinder:      H('ash grey cloth with orange sparks'),
  voidhide:    H('black hide seamed with violet light', { dark: true }),
  sunweave:    H('warm white and pale gold cloth', { pale: true }),
  bone:        H('pale ivory bone plates', { pale: true }),
  grave:       H('grey rotted burial linen'),
  silkwoven:   H('pale iridescent silk', { pale: true }),
};`);

let s = lines.join('\n');
/* The material phrase is a colour now, so "made of" reads wrong. */
s = s.replace("shape + small + ', made of ' + mat.w", "shape + small + ', ' + mat.w");
s = s.replace("', a small round buckler rather than a full shield'", "', a small round buckler'");
fs.writeFileSync(F, s);
console.log('gear vocabulary rewritten short');

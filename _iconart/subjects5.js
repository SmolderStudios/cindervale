/* Batch 3 — the hunting quarry added in 0.9.121.20, plus the two other things that
 * batch needs pictures of.
 *
 * WHY THE PROMPTS LOOK DIFFERENT TO BATCH 2. Every hide prompt in subjects2.js said
 * the right words — "A single folded slab of thick mottled green grey hide" — and
 * came back as a picture of an ogre. Wolf Pelt came back as a wolf's head, Ironfang's
 * Pelt as a standing beast, and ratskin ("a single small square of raw pink grey
 * hide") as a literal small pink square. verify.js cannot see any of it: a painting
 * of a wolf scores perfectly on luminance, contrast, coverage and hue.
 *
 * The fix is to state the ABSENCE of the animal, not just the presence of the skin,
 * and to name the shape explicitly so there is something concrete to draw. Both are
 * in SHAPE below, and every pelt here reuses it verbatim.
 *
 * These nineteen were generated as ONE labelled 5x4 sheet rather than nineteen
 * separate runs — see slice.js. One pass means one lighting setup and one palette
 * across the whole family, which no amount of per-item prompting gets you.
 */
'use strict';
const S = (id, p, opt) => Object.assign({ id, p }, opt || {});

/* The sentence that does the work. "Flat", "spread out", "from directly above" and
   the four leg flaps give the model a shape; the "just the empty skin" clause is
   what stops it drawing the animal the id is named after.
 *
 * STYLE clause added after the first sheet came back PHOTOREAL — individually
 * rendered hairs, smooth photographic gradients, the look of a scanned hide rather
 * than a painted icon. It read as belonging to a different game beside the existing
 * item art, which is chunky and simplified. Naming what to avoid is not enough here:
 * "not photorealistic" alone still produces a photograph with the word "painted"
 * somewhere in its DNA. What works is telling it how much detail to SPEND — broad
 * strokes instead of hairs, a few value steps instead of a gradient. */
/* The style language that used to live here is now in recipe.js STYLES.painted, so
 * every subject in the library gets it, not just this batch. Left as a note because
 * the WHY matters: naming the style did nothing, naming the detail budget worked. */
const PELT = 'A flat stretched animal pelt lying spread out, seen from directly above,'
  + ' roughly symmetrical, with four short leg flaps at the corners and a small neck'
  + ' flap at the top. Just the empty skin — no head, no face, no living animal. ';

/* Cured leather is a DIFFERENT object and must not borrow the pelt sentence, or the
   tannery output and its input become the same picture. */
const ROLL = 'A single rolled bundle of tanned leather standing on end, tied around'
  + ' the middle with a cord. Just the leather roll. ';

const HIDES = [
  // ── already in the game; regenerated because batch 2 drew the creature ──
  S('ratskin',       PELT + 'Ragged small skin, dull pink-grey, worn thin, torn edges'),
  S('wolf_pelt',     PELT + 'Thick grey wolf fur, silver-tipped'),
  S('ogre_hide',     PELT + 'Thick mottled green-grey, warty and heavy'),
  S('troll_hide',    PELT + 'Warty olive-green, lichen-crusted, stiff as bark'),
  S('drake_hide',    PELT + 'Bronze-red overlapping scales, faintly warm'),
  S('demonhide',     PELT + 'Deep red-black, cracked with faint ember glow in the splits', { dark: true }),
  S('ironfang_pelt', PELT + 'Dark iron-grey fur with a metallic sheen, scarred across the back', { dark: true }),

  // ── the twelve hunting-ground beasts (0.9.121.20) ──
  S('boar_hide',     PELT + 'Coarse brown bristles, thick across the shoulders'),
  S('timber_pelt',   PELT + 'Grey-brown wolf fur, shorter and rougher than a dire wolf'),
  S('stag_hide',     PELT + 'Tan hide with pale dappled spots, supple'),
  S('lynx_pelt',     PELT + 'Tawny fur with dark broken spots'),
  S('bear_pelt',     PELT + 'Shaggy thick white fur, heavy', { pale: true }),
  S('leopard_pelt',  PELT + 'Pale smoke-grey fur with dark rosettes', { pale: true }),
  S('elk_hide',      PELT + 'Thick tan-grey neck hide, ridged where the coat sheds'),
  S('mammoth_hide',  PELT + 'Banded brown-grey under coarse wool, very thick'),
  S('jackal_pelt',   PELT + 'Lean ash-streaked tan fur'),
  S('cinder_hide',   PELT + 'Bristled ash-brown, faint heat in the colour'),
  S('stalker_pelt',  PELT + 'Soft dust-grey fur, almost featureless'),
  S('rhino_hide',    PELT + 'Grey-red armour plates, thick slabs like shield bosses'),
];

/* NOT YET GENERATED — the rest of what 0.9.121.20 added, and the strays batch 2 got
   wrong the same way. Listed so picks.js knows the ids exist and so the prompts are
   written down; pack.js skips any id with no file in cut/, so carrying them here
   costs nothing until the art lands. */
const PENDING = [
  // cured leathers: Wolfhide came back as a square with a wolf's head on it,
  // Ogrehide and Demonhide as squares with a human silhouette, Voidhide as an hourglass.
  S('rough_leather',  ROLL + 'Tan-brown leather'),
  S('chitin_leather', ROLL + 'Dark amber leather, glossy'),
  S('wolf_leather',   ROLL + 'Grey leather'),
  S('ogre_leather',   ROLL + 'Mottled green-grey leather'),
  S('troll_leather',  ROLL + 'Olive-green leather'),
  S('drake_leather',  ROLL + 'Bronze-red leather'),
  S('demon_leather',  ROLL + 'Deep red-black leather', { dark: true }),
  S('wraith_leather', ROLL + 'Pale translucent grey leather', { pale: true }),
  S('ember_leather',  ROLL + 'Charred black leather veined with orange', { dark: true }),
  S('void_leather',   ROLL + 'Near-black leather shot with violet', { dark: true }),

  // batch 2 drew a ghost, a fluffy animal with a face, a fish and a knight.
  S('wraithcloth',     'A single length of tattered pale grey shroud cloth hanging, edges dissolving into threads. Cloth only — no ghost, no figure, nothing wearing it.', { pale: true }),
  S('frostfur',        'A single loose tuft of thick white fur rimed with frost crystals, lying by itself. Fur only — no animal, no face.', { pale: true }),
  S('abyssal_scale',   'A single large fish scale on its own, deep blue-green, iridescent, one pointed edge. One scale — not a fish.'),
  S('leviathan_scale', 'A single enormous armoured scale, slate blue-grey, deep growth ridges across it. One scale — not a creature, not armour on a body.'),

  /* The hunter's kit and the three dishes — sheets/gear.txt, a 3x3.
     These go in the SAME sheet as each other on purpose: nine objects painted in one
     pass share a palette and a light, and the six kit pieces have to look like one
     set of gear rather than six unrelated icons. Every prompt names what the thing is
     WORN AS or CUT FROM, because "bracers" alone gets you a pair of gauntlets and
     "haunch" alone gets you a whole roast dinner on a platter. */
  S('briar_cloak',      'A single short hooded cloak of brown hide with a shaggy fur collar, hanging on its own, seen flat from the front, spread slightly. Empty — nobody wearing it.'),
  S('lynx_bracers',     'A single pair of short forearm bracers cut from spotted tawny hide, cross-laced with leather cord, standing upright side by side. Forearm wraps only — not gloves, not gauntlets, no hands.'),
  S('elk_striders',     'A single pair of tall tan hide boots standing upright side by side, laced high up the shin, soft soles.'),
  /* pale:true, or the key eats it. White fur on the default white backdrop lost its
     edges and the flood fill chewed 28% of the mantle into holes — the exact failure
     recipe.js documents as the reason backdrops are chosen per-subject by value. */
  S('frostpelt_mantle', 'A single heavy shoulder mantle of shaggy white fur, wide across the shoulders and tapering to a point, hanging on its own, seen flat from the front. Empty — nobody wearing it.', { pale: true }),
  S('stalker_hood',     'A single deep pointed hood of dust-grey pelt, empty and slack, hanging on its own, seen from the front. Nothing inside it — no face, no head, only shadow in the opening.'),
  /* Do not say "shield". Two takes that did came back as a steel-rimmed heater with a
     red face, and adding "no metal, no steel rim, no boss, not red" changed nothing —
     at cfg 2.4 Turbo is not reading the negatives, it is reading the noun and
     answering with the genre default. Same fix as the pelts: describe the OBJECT and
     leave the word that carries the wrong prior out of the sentence entirely. */
  S('rhino_bulwark',    'A single primitive tribal round war shield made of thick grey-brown animal hide stretched over a wooden frame, a ring of wood showing around the rim, leather cord lashings, seen flat from the front. Hide and rough wood only — no steel, no iron rim, no metal boss.'),

  S('boar_roast',   'A single roasted haunch of meat on one bone, crisp browned skin, the bone sticking out at the top, resting on nothing. One piece of meat only — no plate, no board, no garnish.'),
  S('elk_haunch',   'A single smoked haunch of dark meat on one bone, deep mahogany crust, the bone sticking out at the top, resting on nothing. One piece of meat only — no plate, no board.'),
  S('rhino_steak',  'A single thick cut steak, dark seared crust with a red centre showing at the edge, lying on its own. One cut of meat only — no plate, no board, no garnish.'),
];

module.exports = { FAMILIES3C: { hunt_hides: HIDES, hunt_pending: PENDING } };

/* The prompt contract for item icons.
 *
 * MEASURED FIRST (node _iconart/measure.js): an item icon renders at
 *
 *     12px  in an activity card's output chip   (.chip)
 *     15px  in the satchel grid                 (.inv-ic)
 *     19px  in drop rows and tooltips           (.icon)
 *     31px  at its very largest                 (.act-icon)
 *
 * That is the whole brief. At 15px there is no such thing as detail — there is a
 * silhouette, two or three values, and a colour. Everything in SHARED below exists
 * to buy silhouette clarity, and every prompt should name ONE object filling the
 * frame, never a pile, a scene, or a container of things.
 *
 * Carried over from the monster pass (see the monster-art-generation memory), all
 * of it paid for in wasted batches:
 *   - Z-Image-Turbo, not SDXL. SDXL will not isolate a subject; it invents a
 *     plinth, a forest, a sunset behind everything. No negative battery stops it.
 *   - cfg 2.4. Turbo's default 1.5 barely reads the style clause at all, so style
 *     words become decoration on a prompt being ignored. cfg 4 is the far cliff:
 *     black voids and coin-sized subjects.
 *   - Negative the medium AND the render engines. Realism answers to many names,
 *     and the first monster pass came back photographic because the negative
 *     prompt never once said "photorealistic".
 *   - VALUE-INVERSE BACKDROP. Key-out walks in from the border, so a pale subject
 *     on white loses its edges and the fill eats holes through it. Dark subjects
 *     get a white backdrop, pale ones get near-black. Per item, via subjects.js.
 *   - Never a magenta chroma key: it tints the subject pink.
 */
'use strict';

/* Two directions to choose between, per Jordan's "generate 2 of each". They are
   deliberately far apart rather than two shades of the same idea — the monster
   pass found Turbo has essentially one house style and the widest real spread you
   can get out of it is painted vs graphic. */
const STYLES = {
  /* Reads as a sibling of the painted monster and pet art already in the game. */
  painted: {
    label: 'Painted',
    /* The last three lines are batch 3 (0.9.121.20). The clause above them had always
       said "stylised" and "painted", and the output was still coming back as rendered
       texture — smooth photographic gradients and individually drawn hairs. Saying
       "not photorealistic" does nothing on its own; what moved it was telling the model
       how much detail to SPEND. Flat value steps and broad strokes are instructions it
       can act on, where "stylised" is a label it can apply to a photograph.
       Proven on the hunter's kit and the three dishes before going library-wide. */
    clause: ', stylised painted fantasy game item icon, chunky exaggerated proportions,'
      + ' bold simplified forms, thick confident brush strokes, strong rim light tracing'
      + ' the silhouette, deep shadow opposite, rich saturated colour, high value contrast,'
      + ' single object centred and filling the frame,'
      + ' three or four flat value steps rather than smooth gradients,'
      + ' texture suggested with a few broad strokes and never drawn strand by strand,'
      + ' painterly illustration, not photorealistic, not a photograph, not a 3D render,'
      + ' not a scanned texture',
  },
  /* Maximum legibility at 15px: fewer shapes, flatter fill, a drawn edge holding
     the silhouette together the way the outgoing SVGs did. */
  emblem: {
    label: 'Emblem',
    clause: ', bold graphic fantasy game item icon, flat poster colour, very few large shapes,'
      + ' the silhouette held by OUTLINE, minimal interior detail, crisp edges,'
      + ' strong clean shape reading instantly at small size, single object centred and'
      + ' filling the frame, vector poster look',
  },
};

/* The satchel tile is a dark gradient sitting around L 30/255. A black object with
   a black outline on it is a hole, not an icon — verify.js flagged coal, shadowwood
   and the void gems for exactly this. The monster pass hit the same wall on the
   arena band and found it is a LIGHTING fix, not a keying one: keep the palette
   dark, put the VALUE in a rim that traces the silhouette.
   So the outline word is chosen per subject, not fixed by the style.

   The rim is EMBER ORANGE, not white, for two reasons. Keying: these subjects sit
   on a white backdrop (a dark body keys cleanly against white), and a pale rim
   would merge straight into it and be eaten by the flood fill. Palette: ember is
   the game's own accent, so a lit edge reads as belonging rather than as a sticker
   glow. */
const OUTLINE = {
  normal: 'a thick dark outline',
  /* A rim alone draws the edge but leaves the body black, and at 15px a black body
     with a thin edge still reads as a hole. These also need a LIT top surface so
     there is some actual value in the shape. */
  dark:   'a thin warm ember orange rim tracing the outline, and a mid tone body colour '
        + 'a few steps lighter than black so the object reads as an object',
};

/* Realism has many names; so does "put my object in a scene". */
const NEG = [
  // medium / realism
  'photograph, photorealistic, photoreal, realistic, hyperrealistic, macro photo, dslr,',
  'octane render, unreal engine, blender, 3d render, cgi, raytraced, studio product shot,',
  // scene contamination — the failure mode SDXL could never be argued out of
  'background scenery, landscape, sky, horizon, ground, floor, table, plinth, pedestal,',
  'shelf, basket, crate, bowl, container, person, figure, creature, character,',
  // hands specifically: a size simile in the prompt ("fist sized") got DRAWN — copper
  // ore came back as a clenched fist. Fixed in subjects.js, negated here as well.
  'hand, hands, fist, fingers, knuckles, arm, holding, grip,',
  // and the face pareidolia it left behind on iron ore
  'face, eyes, skull, mask, symmetrical features,',
  // shape contamination: "trapezoid bar shape" produced tubs, cubes and slabs
  // instead of ingots — negate the solids it kept reaching for
  'cube, brick, block, box, dice, bucket, tub, barrel, pot, wedge, pyramid,',
  // multiplicity — a "pile of ore" is mud at 15px
  'multiple objects, collection, set, group, pile, heap, scattered, tiled, grid, collage,'
  + ' two of the same object, a pair of identical items, crossed pair, duplicate, mirrored copy,',
  // chrome
  'text, letters, numbers, watermark, signature, logo, label, border, frame, vignette,',
  'drop shadow, reflection, mirror, glare,',
  // small-size killers
  'busy, cluttered, intricate fine detail, thin lines, low contrast, washed out, blurry, noisy',
].join(' ');

/* A subject can drop terms from NEG. Batch 1 negated bowl/container/bottle-ish
   words to stop ore turning up in a basket; batch 2 has stews that ARE a bowl and
   potions that ARE a bottle, and leaving those negated fights the prompt. Declaring
   it per subject beats keeping two negative lists in sync.
     S('bone_stew', '...', { allow: ['bowl', 'container'] }) */
function negFor(subject) {
  const allow = subject.allow || [];
  let out = NEG;
  for (const t of allow) out = out.replace(new RegExp(String.raw`\b${t}\b,?\s*`, 'g'), '');
  /* Per-subject additions. The gear probe needed these: "domed skull, heavy brow
     ridge" in a helmet prompt drew an actual skull inside the helmet, and "leg
     greaves standing side by side" drew a whole suit of armour. Same literal
     reading that turned "fist sized" into a clenched fist — the fix is to say it
     in the negative as well as to stop saying it in the positive. */
  if (subject.neg) out = out + ', ' + subject.neg;
  return out;
}

/* The backdrop is a keying aid, not art. Chosen per item by expected value. */
const BACKDROP = {
  light: ' , isolated on a plain flat pure white background',
  /* Said three ways because once was not enough: pearl_band, silkweave_band and
     diamond_amulet all came back on WHITE despite being pale, and a pale subject on
     white loses its edges to the flood fill. cooked_minnow went further and
     invented a mid GREY, which matches neither key threshold and removes nothing. */
  dark:  ' , isolated on a plain flat pure black background, solid black backdrop, no grey, no white',
};

const MODEL = 'ZImage/SwarmUI_Z-Image-Turbo-FP8Mix';

/* Square, generous enough to downscale from. 31px is the largest render and the
   art is shown at 2x on a retina panel, so 512 -> 128 keeps plenty in hand. */
const GEN = { width: 1024, height: 1024, steps: 12, cfgscale: 2.4, model: MODEL };

function buildPrompt(subject, styleKey) {
  const st = STYLES[styleKey];
  if (!st) throw new Error('unknown style ' + styleKey);
  const back = BACKDROP[subject.pale ? 'dark' : 'light'];
  let clause = st.clause.replace('OUTLINE', OUTLINE[subject.dark ? 'dark' : 'normal']);
  // painted already asks for a rim; for a dark body, say how much it matters
  if (subject.dark && styleKey === 'painted') {
    clause += ', no glowing hotspot and no light source inside the object, just a thin'
            + ' edge and a readable mid tone body, not a black silhouette';
  }
  return subject.p + clause + back;
}

module.exports = { STYLES, NEG, BACKDROP, OUTLINE, MODEL, GEN, buildPrompt, negFor };

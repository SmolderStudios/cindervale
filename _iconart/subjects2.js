/* Batch 2 — cooked food, potions, jewellery, monster drops, tanned leather and
 * alchemy reagents. Merged into subjects.js, so every tool picks these up with no
 * change: gen, key, verify, sheet, picker, pack, inject.
 *
 * Same rules as batch 1, and they are not style preferences — they come from the
 * 15px satchel tile that measure.js found:
 *   - ONE object. Never a pile, never a set.
 *   - Shape first, then material, then colour.
 *   - A tier family shares ONE silhouette and separates on colour. That is why
 *     every ring below starts from the same RING sentence and every potion from
 *     the same VIAL sentence — at 15px the shape is all you have, so it has to be
 *     the constant and the colour has to be the variable.
 *   - `dark: true` on anything with a near-black body: it gets an ember rim and a
 *     lit upper surface instead of a dark outline, or it is a hole on the tile.
 *   - `pale: true` on light-valued objects: they key against a black backdrop.
 *
 * `allow` is new here. Batch 1's negative prompt bans bowl/container outright to
 * stop ore turning up in a basket, but a stew IS a bowl and a potion IS a bottle.
 * Listing the term in `allow` strips it from NEG for that subject only — see
 * negFor() in recipe.js — which beats maintaining two negative lists.
 */
'use strict';
const S = (id, p, opt) => Object.assign({ id, p }, opt || {});

/* ── cooked fish: the raw silhouette, grilled ────────────────────────────────── */
const COOKED = 'A single cooked fish, side on, head to the left, golden brown grilled skin with dark char marks,';
const FOOD = [
  S('cooked_minnow',    COOKED + ' very small and slender', { pale: true }),
  S('cooked_sardine',   COOKED + ' small, crisp silver brown skin', { pale: true }),
  S('cooked_trout',     COOKED + ' speckled olive and gold'),
  S('cooked_tuna',      COOKED + ' thick muscular body, deep brown'),
  S('cooked_salmon',    COOKED + ' pink flesh showing through crisp skin'),
  S('cooked_swordfish', COOKED + ' long flat bill, thick steak like body'),
  S('cooked_shark',     COOKED + ' large, slate grey and brown'),
  S('cooked_voideel',   COOKED + ' long eel body, charred near black with a faint violet sheen', { dark: true }),

  S('ships_biscuit',  'A single round hardtack ship biscuit, pale dry cracker with pricked holes, one bite missing', { pale: true }),
  S('salt_cod',       'A single dried split salt cod fillet, a stiff pale board of salted fish', { pale: true }),
  S('marrow_broth',   'A single wooden bowl of steaming pale marrow broth, one curl of steam above it', { allow: ['bowl', 'container'] }),
  S('ratmeat_skewer', 'A single wooden skewer threaded with three chunks of roasted meat, char marks'),
  S('silk_poultice',  'A single folded pad of pale silk dressing tied with a cord, faint green salve showing', { pale: true }),
  S('goblin_jerky',   'A single curled strip of dark dried jerky, salt crusted'),
  S('bone_stew',      'A single wooden bowl of thick brown stew with one bone standing in it', { allow: ['bowl', 'container'] }),
  S('wolf_jerky',     'A single thick strip of dark red dried wolf meat, coarse grain', { dark: true }),
  S('ogre_roast',     'A single huge roasted joint of meat on the bone, glazed dark brown'),
  S('troll_stew',     'A single wooden bowl of murky green troll stew, lumps breaking the surface', { allow: ['bowl', 'container'] }),
  S('drake_roast',    'A single roasted joint of drake meat on the bone, blackened glaze, faint ember glow in the char'),
  S('infernal_roast', 'A single roasted joint of meat on the bone wreathed in low orange flame, blackened crust'),
];

/* ── potions: one bottle, colour is the effect, tier is intensity ────────────── */
const VIAL = 'A single stoppered glass potion bottle with a cork, round belly and short neck, filled with';
const P = (id, fill, opt) => S(id, VIAL + ' ' + fill,
  Object.assign({ allow: ['bowl', 'container'] }, opt || {}));
const POTIONS = [
  P('swiftness_i',    'bright yellow green liquid'),
  P('swiftness_iii',  'vivid glowing yellow green liquid, brighter and swirling'),
  P('wisdom_i',       'clear blue liquid'),
  P('wisdom_iii',     'vivid glowing sapphire blue liquid, brighter and swirling'),
  P('bountiful_i',    'rich leaf green liquid'),
  P('bountiful_iii',  'vivid glowing emerald liquid, brighter and swirling'),
  P('vitality',       'warm rose pink liquid with a soft inner light'),
  P('heal_draught_1', 'pale red liquid'),
  P('heal_draught_2', 'clear crimson liquid'),
  P('heal_draught_3', 'deep glowing scarlet liquid'),
  P('heal_draught_4', 'brilliant glowing ruby liquid, gold banding on the glass'),
  P('honed_edge_1',   'burnt orange liquid'),
  P('honed_edge_2',   'vivid glowing amber orange liquid'),
  P('ironhide_1',     'cool steel grey blue liquid'),
  P('ironhide_2',     'bright glowing steel blue liquid'),
  P('berserker_1',    'dark blood red liquid'),
  P('berserker_2',    'violent glowing crimson liquid with rising bubbles'),
  S('warriors_brew', 'A single stoppered glass potion bottle with three joined chambers holding red, orange and blue liquid, one cork',
    { allow: ['bowl', 'container'] }),
  S('philosophers_drop', 'A single tiny slender glass vial of luminous liquid gold, gold filigree on the glass',
    { pale: true, allow: ['bowl', 'container'] }),
];

/* ── jewellery: three silhouettes, one per form; the stone is the variable ───── */
const RING    = 'A single gold ring seen at a three quarter angle, plain band, one large faceted';
const AMULET  = 'A single amulet, a fine gold chain looped above a round faceted';
const PENDANT = 'A single pendant on a short gold chain, one large teardrop cut';
const STONES = [
  ['sapphire',   'deep blue sapphire',                    {}],
  ['emerald',    'deep green emerald',                    {}],
  ['ruby',       'vivid scarlet ruby',                    {}],
  ['diamond',    'clear white diamond',                   { pale: true }],
  ['amethyst',   'violet amethyst',                       {}],
  ['dragon',     'molten orange dragonstone',             {}],
  ['bloodstone', 'dark green bloodstone flecked red',     {}],
  ['void',       'near black void gem shot with violet light', { dark: true }],
];
const JEWELLERY = [
  ...STONES.map(([k, d, o]) => S(k + '_ring',   RING + ' ' + d + ' set on top', o)),
  ...STONES.map(([k, d, o]) => S(k + '_amulet', AMULET + ' ' + d, o)),
  /* The void one is `void_jewel`, not `void_pendant` — the game's own id. */
  ...STONES.map(([k, d, o]) => S(k === 'void' ? 'void_jewel' : k + '_pendant', PENDANT + ' ' + d, o)),

  S('warren_signet',    'A single heavy bronze signet ring engraved with a rat skull, three quarter view'),
  S('silkweave_band',   'A single pale silver ring wound with fine spider silk threads, three quarter view', { pale: true }),
  S('warband_torc',     'A single open bronze neck torc with blunt animal head terminals'),
  S('soulbound_amulet', 'A single amulet on a dark chain holding a pale glowing soul wisp in a bone setting'),
  S('alpha_fang_ring',  'A single dark iron ring set with a curved white wolf fang, three quarter view'),
  S('mountain_locket',  'A single heavy stone locket carved with a mountain peak, on a short chain'),
  S('sanctum_signet',   'A single gold signet ring engraved with a burning sigil, faint ember light in the cuts'),
  S('pearl_band',       'A single slim silver ring set with one round white pearl, three quarter view', { pale: true }),
  S('drowned_locket',   'A single tarnished brass locket crusted with barnacles, on a corroded chain'),
  S('tidebound_ring',   'A single ring of green sea glass and silver, three quarter view'),
  S('abyssal_pendant',  'A single pendant holding a dark blue green abyssal stone with a faint cold glow'),
  S('drowned_jewel',    'A single ornate waterlogged crown jewel, gold setting furred with green algae'),
  S('crown_jewel',      'A single large ornate cut gemstone in a gold crown setting, brilliant white and gold', { pale: true }),
  S('sailors_locket',   'A single small brass locket shaped like a ship wheel, on a short chain'),
  S('tidebound_pearl',  'A single large iridescent sea pearl with a faint green sheen', { pale: true }),
  S('abyssal_pearl',    'A single large dark pearl, near black with an oily violet iridescence', { dark: true }),
];

/* ── tanned leather: one rolled hide, palette per beast ──────────────────────── */
/* NOT "a rolled bundle tied with a cord" — that came back as a drawstring pouch,
   which is a bag, not leather. A folded square with a cut edge and a turned corner
   reads as worked hide at any size. */
const HIDE = 'A single thick folded square of tanned leather, one corner turned back to show the cut edge, seen from a slight angle,';
const LEATHER = [
  S('rough_leather',  HIDE + ' plain tan brown hide'),
  S('chitin_leather', HIDE + ' hard glossy dark amber chitin plates worked into it'),
  S('wolf_leather',   HIDE + ' grey wolf hide with coarse fur along one edge'),
  S('ogre_leather',   HIDE + ' thick mottled green grey hide'),
  S('troll_leather',  HIDE + ' warty olive green hide', { dark: true }),
  S('drake_leather',  HIDE + ' scaled bronze red drake hide'),
  S('demon_leather',  HIDE + ' deep red black hide with faint ember cracks', { dark: true }),
  S('wraith_leather', HIDE + ' pale grey translucent hide with a faint cold glow', { pale: true }),
  S('ember_leather',  HIDE + ' charred black hide veined with glowing orange', { dark: true }),
  S('void_leather',   HIDE + ' near black hide shot with violet light', { dark: true }),
];

/* ── alchemy reagents ───────────────────────────────────────────────────────── */
const REAGENTS = [
  S('birds_nest',     'A single woven twig birds nest holding one speckled egg'),
  S('ancient_seed',   'A single large gnarled seed pod, dark husk split to show a faint gold glow inside'),
  S('ember_resin',    'A single blob of glowing orange tree resin, warm and translucent'),
  S('shadow_crystal', 'A single jagged crystal of shadow, near black with a violet core', { dark: true }),
  S('abyssal_scale',  'A single large fish scale, deep blue green with an iridescent sheen'),
  S('golden_spore',   'A single luminous golden spore puffball with a soft glow around it', { pale: true }),
  S('void_essence',   'A single small round flask of swirling black and violet essence', { dark: true, allow: ['bowl', 'container'] }),
  S('arcane_dust',    'A small conical heap of fine violet blue arcane dust, faint sparks rising'),
  S('mana_essence',   'A single floating orb of luminous pale blue mana', { pale: true }),
  S('rune_fragment',  'A single broken shard of grey stone carved with one glowing rune'),
  S('ash',            'A small conical heap of soft grey ash'),
  S('energy_crystal', 'A single bright yellow crystal shard crackling with light', { pale: true }),
  S('stamina_shard',  'A single pale green crystal shard with a soft inner glow', { pale: true }),
];

/* ── monster drops: bespoke, but grouped so like reads like ──────────────────── */
const DROPS = [
  // rat warrens
  S('rat_tail',        'A single severed rat tail, long pink grey and ringed, curled once'),
  S('gnawed_bone',     'A single short gnawed bone with chew marks at both ends', { pale: true }),
  S('ratskin',         'A single small square of raw pink grey hide, edges ragged'),
  S('rat_fang',        'A single curved yellow rat fang, root end blunt', { pale: true }),
  S('royal_rat_sigil', 'A single small tarnished gold sigil stamped with a crowned rat'),
  // spider hollow
  S('spider_silk',     'A single loose skein of pale spider silk, fine threads', { pale: true }),
  S('chitin',          'A single curved plate of hard dark amber chitin armour'),
  S('chitin_shard',    'A single jagged splinter of glossy dark chitin', { dark: true }),
  S('venom_sac',       'A single translucent green venom sac, taut and glistening'),
  S('spinneret',       'A single dark segmented spider spinneret organ, fine bristles at the tip'),
  S('silken_sigil',    'A single pale sigil disc woven from spider silk, spiral pattern', { pale: true }),
  // goblin cave
  S('goblin_ear',      'A single severed pointed green goblin ear'),
  S('goblin_tooth',    'A single crooked yellow goblin tooth', { pale: true }),
  S('tribal_fetish',   'A single crude tribal fetish of bound sticks, feathers and a bead'),
  S('shaman_tooth',    'A single long tooth carved with crude runes, threaded on a cord', { pale: true }),
  S('warchief_banner', 'A single tattered goblin war banner on a short broken pole, crude red sigil', { dark: true }),
  // skeleton crypt
  S('cursed_dust',     'A small conical heap of grey green cursed dust, faint wisps rising'),
  S('soul_shard',      'A single jagged shard of pale blue soul glass, glowing softly', { pale: true }),
  S('ectoplasm',       'A single blob of translucent pale green ectoplasm, dripping', { pale: true }),
  S('lich_phylactery', 'A single small black iron reliquary box bound in chains, sickly green light in its seams', { dark: true }),
  S('ancient_bone',    'A single long weathered bone, cracked and grey with age', { pale: true }),
  S('bone_charm',      'A single charm of small bones bound with cord into a rough star', { pale: true }),
  S('runed_bone',      'A single long bone carved with glowing blue runes', { pale: true }),
  // wolves
  S('wolf_fang',       'A single long curved white wolf fang', { pale: true }),
  S('wolf_pelt',       'A single folded grey wolf pelt, thick fur'),
  S('alpha_claw',      'A single large black curved claw, hooked and worn', { dark: true }),
  S('howling_horn',    'A single curved animal horn banded with leather at the mouthpiece'),
  S('pack_eye',        'A single amber wolf eye, slit pupil, faintly glowing'),
  S('ironfang_pelt',   'A single folded pelt of dark iron grey fur with a metallic sheen'),
  S('moonstone_eye',   'A single round pale moonstone with a soft blue white glow', { pale: true }),
  S('warhound_fang',   'A single heavy blunt fang, scarred and chipped', { pale: true }),
  // ogres and trolls
  S('splintered_club', 'A single crude wooden club, splintered at the head, bound with cord'),
  S('ogre_hide',       'A single folded slab of thick mottled green grey hide'),
  S('troll_hide',      'A single folded slab of warty olive green hide'),
  S('seer_idol',       'A single squat carved stone idol with a single closed eye'),
  /* "dark red veined with deeper red" gave it no value range at all — both styles
     came back as a flat maroon blob that even the ember rim could not lift. The
     wet highlight is what supplies the contrast. */
  S('gorestone',       'A single blood red stone with a bright wet highlight across its top face and deep crimson veins below', { dark: true }),
  S('warlord_totem',   'A single tall carved totem of bone and dark wood topped with a skull'),
  S('tyrant_heart',    'A single huge dark red heart, still and glistening', { dark: true }),
  S('granite_core',    'A single rounded core of grey granite with a faint inner light'),
  S('granite_sigil',   'A single flat grey stone disc carved with a mountain sigil'),
  S('mountain_heart',  'A single fist of pale veined stone with a warm golden light in its cracks'),
  // drakes and demons
  S('wyrmscale',       'A single large bronze red drake scale, ridged and hard'),
  S('drake_hide',      'A single folded slab of scaled bronze red drake hide'),
  S('dragon_fang',     'A single huge curved ivory dragon fang', { pale: true }),
  S('ember_crest',     'A single bony crest plate glowing with ember orange along its ridges'),
  S('dragonheart',     'A single large dark red heart wreathed in faint orange fire'),
  S('demonhide',       'A single folded slab of deep red black hide with faint ember cracks', { dark: true }),
  S('infernal_crest',  'A single horned black crest plate cracked with molten orange light', { dark: true }),
  S('hellheart',       'A single blackened heart burning from within with orange fire', { dark: true }),
  // wraiths, barrows and void
  S('grave_iron',      'A single corroded bar of grave iron, pitted and stained'),
  S('barrow_dust',     'A small conical heap of fine grey barrow dust, faint pale wisps'),
  S('wraithcloth',     'A single length of tattered pale grey shroud cloth, edges dissolving', { pale: true }),
  S('shade_ember',     'A single floating ember of cold violet fire', { dark: true }),
  S('void_cinder',     'A single black cinder shot through with violet light', { dark: true }),
  S('voidheart',       'A single dark crystalline heart pulsing with violet light', { dark: true }),
  S('beast_sinew',     'A single coil of pale dried sinew cord', { pale: true }),
  S('rock_salt',       'A single chunk of coarse white rock salt crystal', { pale: true }),
  S('gull_egg',        'A single speckled pale blue gull egg', { pale: true }),
];

const FAMILIES = { food: FOOD, potions: POTIONS, jewellery: JEWELLERY,
                   leather: LEATHER, reagents: REAGENTS, drops: DROPS };

module.exports = { FAMILIES, ALL: Object.values(FAMILIES).flat() };

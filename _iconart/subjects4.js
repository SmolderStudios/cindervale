/* Batch 3b — everything that is not combat gear: tools, seeds, skill outfits,
 * cut gems, tanned leather, the sailing hoard, and the loose drops.
 *
 * Same rules as subjects.js. The systematic families (seeds, outfits, gem grades,
 * leather, most tool lines) are generated from one shape sentence plus a palette,
 * so a family cannot drift apart the way the bars did. The sailing hoard is all
 * one-offs and is written out by hand.
 *
 * Two things the gear pass taught, applied here:
 *   - Never a body part as a scale reference. "fist sized" drew an actual fist.
 *   - Say the form ONCE, in the shape sentence. Material words that carry a form
 *     noun ("bronze plate") put armour on a sword.
 */
'use strict';
const S = (id, p, opt) => Object.assign({ id, p }, opt || {});
const ROD_NEG = 'person, figure, human, fisherman, man, standing figure, silhouette of a person';
const OUTFIT_NEG = 'person, figure, human, man, woman, wizard, body, head, model, mannequin, animal, creature';

/* ── seeds: one pouch, palette per crop ──────────────────────────────────────
   Drawing the actual seed fails at 15px — a seed is a dot. The pouch gives every
   one of the seventeen the same readable silhouette, and the colour of what is
   spilling out is what separates them. */
const SEED_SHAPE = 'A single small drawstring cloth seed pouch tied at the neck, leaning open at the top with one sprouting seed showing at the mouth, ';
const SEEDS = [
  ['wildberry_seed',  'coarse tan cloth, a fat dark red berry seed at the mouth'],
  ['bloodcap_seed',   'coarse tan cloth, a deep blood red mushroom spore at the mouth'],
  ['herb_seed',       'coarse tan cloth, a plain green herb seed at the mouth'],
  ['witchhazel_seed', 'grey green cloth, a knotted yellow witchhazel seed at the mouth'],
  ['sunroot_seed',    'warm ochre cloth, a bright golden root seed at the mouth'],
  ['frostcrocus_seed','pale blue white cloth, a frost rimed ice blue seed at the mouth', { pale: true }],
  ['moonflower_seed', 'deep indigo cloth, a pale silver white seed glowing faintly at the mouth'],
  ['nightshade_seed', 'near black cloth, a glossy purple black berry seed at the mouth', { dark: true }],
  ['ashbloom_seed',   'ash grey cloth, a charcoal seed dusted with white ash at the mouth'],
  ['voidbloom_seed',  'near black cloth, a violet seed with rift light bleeding from it at the mouth', { dark: true }],
  ['tearmoss_seed',   'damp grey cloth, a pale blue green moss spore beaded with water at the mouth', { pale: true }],
  ['thornvine_seed',  'dark green cloth stuck with thorns, a barbed brown seed at the mouth'],
  ['dewleaf_seed',    'pale green cloth, a translucent dew beaded leaf seed at the mouth', { pale: true }],
  ['emberbloom_seed', 'charred cloth, a glowing ember orange seed at the mouth', { dark: true }],
  ['starfern_seed',   'deep blue cloth, a pale violet white seed scattered with star glints'],
  ['moonpetal_seed',  'silver grey cloth, a luminous pearl white petal seed at the mouth', { pale: true }],
  ['voidmoss_seed',   'near black cloth, a violet black moss spore at the mouth', { dark: true }],
].map(([id, tail, o]) => S(id, SEED_SHAPE + tail, o));

/* ── what those seeds grow into ── */
const PRODUCE = [
  S('wild_herb',    'A single cutting of wild herb, a bundle of narrow green leaves on one short stem, bound with twine'),
  S('garden_root',  'A single pulled root vegetable, pale tapering root with the leafy green top still on', { pale: true }),
  S('sunbloom',     'A single golden flower head seen face on, broad overlapping petals, warm amber centre'),
  S('moonflower',   'A single pale silver white flower head seen face on, narrow pointed petals glowing faintly', { pale: true }),
  S('voidbloom',    'A single near black flower head seen face on, narrow petals with violet rift light between them', { dark: true }),
];

/* ── skill outfits: work clothes, deliberately soft and civilian so they never
   read as the combat gear in the same satchel. Shape by slot, colour and one
   telling detail by trade. ── */
const OUTFIT_SHAPE = {
  hat:   'A single hat standing alone on nothing, seen from a front three quarter angle, ',
  chest: 'A single sleeveless work garment hanging empty, seen from the front, shoulders squared, ',
  legs:  'A single pair of work trousers hanging empty, legs together, seen from the front, ',
  boots: 'A single pair of work boots standing side by side, seen from a front three quarter angle, ',
};
const TRADE = {
  wc: ['wc', 'russet brown wool and worn tan leather, a lumberjack cut, wood chips caught in the weave'],
  mi: ['mi', 'soot stained grey canvas and dark leather, a miner cut, ore dust ground into it'],
  fi: ['fi', 'oiled sea green canvas and pale rope, an angler cut, water beading on the surface'],
  fo: ['fo', 'moss green linen and soft brown leather, a herbalist cut, dried sprigs tucked into it'],
  sm: ['sm', 'heavy blackened leather scorched brown at the edges, a blacksmith cut, spark burns across it', { dark: true }],
  co: ['co', 'crisp cream white cotton, a kitchen cut, one clean flour smudge'],
  al: ['al', 'deep plum purple cloth, an alchemist cut, faint potion stains at the hem', { dark: true }],
  fm: ['fm', 'charred crimson and orange cloth, a pyromancer cut, embers glowing in the singed edges'],
  ag: ['ag', 'light dove grey cloth and thin pale leather, a runner cut, cut close and light', { pale: true }],
  jw: ['jw', 'deep teal velvet and polished brass fittings, a jeweller cut, tiny gem chips glinting on it', { dark: true }],
  fa: ['fa', 'faded straw yellow linen and earth brown leather, a farmhand cut, soil worn into it'],
  cr: ['cr', 'thick oxblood leather and dull brass rivets, a craftsman cut, tool scars across it', { dark: true }],
};
/* Two pieces are not clothing at all and have to say so, or the generator dresses
   a mannequin in a magnifying glass. */
const OUTFIT_OVERRIDE = {
  jw_hat: S('jw_hat', 'A single jeweller loupe, a small brass magnifying eyepiece on a short folding arm, lying by itself', { neg: 'animal, creature, bear, person, face' }),
  cr_hat: S('cr_hat', 'A single pair of leather and brass workshop goggles with round smoked glass lenses, standing alone'),
};
const OUTFITS = [];
for (const [pre, [, words, o]] of Object.entries(TRADE))
  for (const slot of ['hat', 'chest', 'legs', 'boots']) {
    const id = pre + '_' + slot;
    const base = OUTFIT_OVERRIDE[id] || S(id, OUTFIT_SHAPE[slot] + words + ', empty and laid out by itself, nobody wearing it', o);
    OUTFITS.push(Object.assign({}, base, { neg: OUTFIT_NEG }));
  }

/* ── cut gems: grade decides the shape, gem decides the colour ────────────────
   Three grades of the same stone must differ in SILHOUETTE, not just in polish —
   at 15px "chipped" and "flawless" of one colour are otherwise the same dot. */
const GRADE = {
  chip:   'A single small rough chipped gemstone, irregular broken facets, one dull corner missing, ',
  polish: 'A single cut and polished oval gemstone seen face on, clean bevelled facets, bright specular star, ',
  flaw:   'A single large flawless brilliant cut gemstone seen face on, many sharp facets, radiating inner light and a halo, ',
};
const GEMHUE = {
  sanguine: ['deep blood red', null],
  verdant:  ['rich emerald green', null],
  azure:    ['vivid sapphire blue', null],
  topaz:    ['warm golden amber', null],
  onyx:     ['glossy black with a violet sheen', { dark: true }],
};
const GEMCUTS = [];
for (const [g, [hue, o]] of Object.entries(GEMHUE))
  for (const gr of ['chip', 'polish', 'flaw'])
    GEMCUTS.push(S(g + '_' + gr, GRADE[gr] + hue, o));

/* ── tanned leather: one folded hide, palette per beast. Same family logic as the
   bars — the shape sentence is shared verbatim so the ten read as one ladder. ── */
const HIDE_SHAPE = 'A single folded rectangle of tanned leather lying flat, one corner turned back to show the underside, stitched edge, ';
const LEATHERS = [
  ['rough_leather',  'coarse undyed tan hide, rough grain'],
  ['chitin_leather', 'glossy chestnut brown, hard chitin plates set into the surface'],
  ['wolf_leather',   'grey hide with coarse wolf fur along the turned back corner'],
  ['ogre_leather',   'thick pale grey hide, heavy pores, crude stitching', { pale: true }],
  ['troll_leather',  'mottled green hide, warty thickened patches'],
  ['drake_leather',  'bronze red hide covered in small overlapping scales'],
  ['demon_leather',  'cracked crimson hide with faint heat glowing in the cracks'],
  ['wraith_leather', 'translucent ghost grey hide, the turned corner fading to nothing', { pale: true }],
  ['ember_leather',  'charred black hide cracked open with ember orange light beneath', { dark: true }],
  ['void_leather',   'near black hide drinking the light, thin violet seams', { dark: true }],
].map(([id, tail, o]) => S(id, HIDE_SHAPE + tail, o));

/* ── tools ────────────────────────────────────────────────────────────────────
   Eleven lines, six tiers each. Most lines keep one silhouette and swap palette,
   but smithing, cooking and alchemy genuinely change object across their tiers
   (tongs, then an anvil, then a forge) because that is what the game calls them —
   so those are written out rather than generated. */
const TIER_MAT = {
  bronze:    ['warm brown gold bronze, dark patina', null],
  iron:      ['dull grey forged iron, dark pitting', null],
  steel:     ['bright silver grey polished steel', { pale: true }],
  cobalt:    ['deep vivid cobalt blue metal, cold highlights', null],
  eclipse:   ['near black eclipse metal ringed with a thin cold white corona', { dark: true }],
  everflame: ['blackened metal wrapped in living orange flame', { dark: true }],
};
const TOOL_SHAPE = {
  axe:  'A single felling axe, one broad curved bit at the top of a long wooden haft, ',
  pick: 'A single mining pick, one pointed head at the top of a long wooden haft, ',
};
const TOOLS = [];
for (const [t, shape] of Object.entries(TOOL_SHAPE))
  for (const [mat, [words, o]] of Object.entries(TIER_MAT))
    TOOLS.push(S(mat + '_' + t, shape + words, o));
/* the axe and pick ids are <mat>_axe / <mat>_pick, except everflame which reads
   the other way round in the game's own table */
for (const t of ['axe', 'pick']) {
  const i = TOOLS.findIndex(x => x.id === 'everflame_' + t);
  if (i < 0) { const j = TOOLS.findIndex(x => x.id === 'everflame_' + t); void j; }
}

const TOOLS_REST = [
  /* fishing rods — one bent rod, tip toward the top right */
  S('cane_rod',   'A single fishing rod lying diagonally, tapering bamboo pole, small reel, line and hook', { neg: ROD_NEG }),
  S('iron_rod',   'A single fishing rod lying diagonally across the frame, a long tapering dark iron pole with a small reel just above the grip and a thin line running from the tip down to one curved hook', { neg: ROD_NEG }),
  S('crystal_rod','A single fishing rod lying diagonally across the frame, a long tapering clear pale crystal pole with a small reel just above the grip and a thin line running from the tip down to one curved hook', { pale: true, neg: ROD_NEG }),
  S('moonrod',    'A single fishing rod lying diagonally across the frame, a long tapering silver white softly glowing pole with a small reel just above the grip and a thin line running from the tip down to one curved hook', { pale: true, neg: ROD_NEG }),
  S('voidrod',    'A single fishing rod lying diagonally across the frame, a long tapering near black pole burning with bright violet rift light with a small reel just above the grip and a thin line running from the tip down to one curved hook', { dark: true, neg: ROD_NEG }),
  S('everflame_rod', 'A single fishing rod lying diagonally across the frame, a long tapering blackened pole wrapped in living orange flame with a small reel just above the grip and a thin line running from the tip down to one curved hook', { dark: true, neg: ROD_NEG }),
  /* foraging bags — one satchel, flap toward the viewer */
  S('foraging_pouch',  'A single small leather belt pouch, flap buckled down, plain tan hide'),
  S('herbalist_kit',   'A single leather satchel with the flap open, small bundled herbs and glass phials showing inside'),
  S('druid_satchel',   'A single moss green satchel bound in living vine, small leaves growing along the strap'),
  S('void_pouch',      'A single near black satchel, the mouth opening onto violet rift light instead of an interior', { dark: true }),
  S('eclipse_satchel', 'A single leather shoulder bag with a buckled flap, charcoal ringed with cold white light', { dark: true }),
  S('everflame_satchel','A single blackened satchel wrapped in living orange flame', { dark: true }),
  /* smithing — the line genuinely changes object per tier */
  S('iron_tongs',    'A single pair of blacksmith tongs seen from the side, long dark iron arms, jaws closed at the top', { dark: true }),
  S('steel_anvil',   'A single blacksmith anvil seen from the side, heavy silver grey steel, horn pointing left'),
  S('master_forge',  'A single small stone forge seen from the front, arched mouth full of glowing orange coals', { dark: true }),
  S('master_bellows','A single blacksmith air bellows seen from the side, a wide flat triangular pleated leather bag, two long wooden handles at the wide end and a narrow brass air nozzle at the point', { neg: 'bell, church bell, ship bell, chime, dome' }),
  S('eclipse_forge', 'A single small stone forge seen from the front, arched mouth full of cold white eclipse light', { dark: true }),
  S('everflame_forge','A single small stone forge seen from the front, arched mouth pouring living orange flame', { dark: true }),
  /* cooking */
  S('copper_pan',    'A single frying pan seen from a raised three quarter angle, bright hammered copper, long handle to the lower right'),
  S('iron_pan',      'A single frying pan seen from a raised three quarter angle, black cast iron, long handle to the lower right', { dark: true }),
  S('ember_stove',   'A single small iron cooking stove seen from the front, its door open on glowing orange embers', { dark: true }),
  S('void_stove',    'A single small iron cooking stove seen from the front, its door open on violet rift light', { dark: true }),
  S('eclipse_hearth','A single stone hearth seen from the front, cold white eclipse light burning in the grate', { dark: true }),
  S('everflame_hearth','A single stone hearth seen from the front, living orange flame pouring out of the grate', { dark: true }),
  /* alchemy */
  S('stone_mortar',    'A single stone mortar and pestle seen from a raised three quarter angle, rough pale grey stone bowl, pestle resting in it', { pale: true }),
  S('iron_mortar',     'A single iron mortar and pestle seen from a raised three quarter angle, dark grey metal bowl, pestle resting in it'),
  S('crystal_mortar',  'A single clear crystal mortar and pestle seen from a raised three quarter angle, pale translucent bowl', { pale: true }),
  S('void_alembic',    'A single glass alembic still, round base and a long curved neck, filled with swirling violet void light', { dark: true }),
  S('eclipse_crucible','A single squat crucible on three legs, dark stone brimming with cold white eclipse light', { dark: true }),
  S('everflame_crucible','A single squat crucible on three legs, blackened stone brimming with living orange flame', { dark: true }),
  /* firemaking */
  S('flint',        'A single piece of grey flint struck against a curved steel striker, one bright spark leaping off'),
  S('iron_tinder',  'A single small iron tinderbox with its lid open, char cloth and a striker inside'),
  S('ember_tinder', 'A single small iron tinderbox with its lid open, live orange embers glowing inside', { dark: true }),
  S('void_tinder',  'A single small iron tinderbox with its lid open, violet rift light spilling out', { dark: true }),
  S('eclipse_tinder','A single small dark tinderbox with its lid open, cold white eclipse light spilling out', { dark: true }),
  S('everflame_tinder','A single small blackened tinderbox with its lid open, living orange flame pouring out', { dark: true }),
  /* agility — soft boots, deliberately lighter than the armoured sabatons in gear */
  S('leather_boots', 'A single pair of soft low leather running shoes standing side by side, plain tan hide, no armour'),
  S('iron_runners',  'A single pair of soft running boots standing side by side, dark leather with iron shin straps'),
  S('swift_boots',   'A single pair of soft running boots standing side by side, pale grey leather with small feathered wings at the heels', { pale: true }),
  S('wind_treads',   'A single pair of soft running boots standing side by side, sky blue leather trailing thin streaks of moving air'),
  S('eclipse_treads','A single pair of soft running boots standing side by side, near black leather ringed with a cold white corona', { dark: true }),
  S('everflame_treads','A single pair of soft running boots standing side by side, blackened leather wrapped in living orange flame', { dark: true }),
  /* jeweler — a lens on a handle, palette per tier */
  S('copper_lens',  'A single round magnifying lens on a short handle, warm copper rim, clear glass'),
  S('silver_lens',  'A single round magnifying lens on a short handle, bright silver rim, clear glass', { pale: true }),
  S('crystal_lens', 'A single round magnifying lens on a short handle, faceted crystal rim throwing rainbow glints', { pale: true }),
  S('void_lens',    'A single round magnifying lens on a short handle, near black rim, violet rift light instead of glass', { dark: true }),
  S('eclipse_lens', 'A single round magnifying lens on a short handle, dark rim ringed with a cold white corona', { dark: true }),
  S('everflame_lens','A single round magnifying lens on a short handle, blackened rim wrapped in living orange flame', { dark: true }),
  /* farming — one trowel, palette per tier */
  S('wooden_trowel',  'A single garden trowel, broad carved wooden scoop, wooden handle', { neg: 'two trowels, crossed pair, shovel, spade' }),
  S('iron_trowel',    'A single garden trowel, dull grey iron scoop, wooden handle', { neg: 'two trowels, crossed pair, shovel, spade' }),
  S('mithril_trowel', 'A single garden trowel, luminous sky blue mithril scoop, pale handle', { neg: 'two trowels, crossed pair, shovel, spade' }),
  S('ancient_trowel', 'A single garden trowel, weathered gold scoop cut with faded runes', { neg: 'two trowels, crossed pair, shovel, spade' }),
  S('eclipse_trowel', 'A single garden trowel, near black scoop ringed with a cold white corona', { dark: true, neg: 'two trowels, crossed pair, shovel, spade' }),
  S('everflame_trowel','A single garden trowel, blackened scoop wrapped in living orange flame', { dark: true, neg: 'two trowels, crossed pair, shovel, spade' }),
];

/* ── monster drops and crafting materials that were never given art ── */
const DROPS = [
  S('tanned_hide',      'A single rolled bundle of plain tanned leather tied with cord, standing on end'),
  S('rusted_blade',     'A single broken sword blade, snapped off above the guard, thick orange rust eating the steel'),
  S('crude_cleaver',    'A single crude cleaver seen from the side, a rough rectangular iron blade with a chipped edge, rag wound grip'),
  S('rib_plate',        'A single curved plate of pale rib bone, ridged along its length', { pale: true }),
  S('frostfur',         'A single tuft of thick white fur rimed with frost crystals', { pale: true }),
  S('ogre_tusk',        'A single thick curved yellowed tusk, broad root at the base tapering to a blunt point', { pale: true }),
  S('troll_blood',      'A single stoppered glass vial standing upright, filled with thick dark green blood'),
  S('cinder_gland',     'A single fleshy dark red organ sac with hot orange light glowing inside it', { dark: true }),
  S('brimstone',        'A single rough broken lump of brimstone, sulphur yellow crust over a dull red core'),
  S('molten_bar',       'A single long metal ingot lying flat seen from a raised three quarter angle, dark iron split by glowing molten orange seams', { dark: true }),
  S('emberweave',       'A single folded square of charred black cloth, ember orange light glowing between the threads', { dark: true }),
  S('drakeforged_rune', 'A single flat stone rune tablet standing upright, one bronze red rune cut into it and glowing'),
  S('voidsteel_bar',    'A single long metal ingot lying flat seen from a raised three quarter angle, near black metal with violet rift light in the seams', { dark: true }),
  S('voidweave',        'A single folded square of near black cloth, violet rift light glowing between the threads', { dark: true }),
  S('riftshard',        'A single jagged shard of violet black crystal standing on end, rift light bleeding from its edges', { dark: true }),
  S('dawnshard',        'A single jagged shard of radiant pale gold crystal standing on end, warm white light pouring off it', { pale: true }),
  S('crown_fragment',   'A single broken piece of a gold crown, two bent spires and a cracked setting where a stone is missing'),
  S('warlord_aegis',    'A single enormous tower shield seen face on and filling the frame, scarred black iron, brass rivets', { dark: true }),
  S('emberwyrm_eye',    'A single large round dragon eye gem, molten orange iris, black slit pupil', { dark: true }),
];

/* ── the sailing hoard. All one-offs — a trove is a story, not a tier. ── */
const SAILING = [
  S('trove_shallows',  'A single fat leather coin purse crusted with white barnacles, drawstring pulled tight, one gold coin showing'),
  S('trove_wracks',    'A single tarnished bronze ship bell hanging from its yoke, deep green verdigris in the mouth'),
  S('trove_mist',      'A single thick leather bound almanac lying closed, brass corner caps, damp swollen pages'),
  S('trove_far',       'A single enormous curved scale, iridescent deep blue green, ridged along one edge'),
  S('trove_odd',       'A single brass ship lantern with a steady warm flame burning inside the glass', { dark: true }),
  S('chart_gravekeel', 'A single rolled sea chart tied with cord, one corner unrolled to show a coastline and a wreck marked in red'),
  S('chart_gibbet',    'A single rolled sea chart tied with cord, one corner unrolled to show a coastline and a gallows marked in black'),
  S('chart_crown',     'A single rolled sea chart tied with cord, one corner unrolled to show a coastline and a drowned crown marked in gold'),
  S('chart_voidmaw',   'A single rolled sea chart tied with cord, one corner unrolled to show open water and a violet spiral marked at its centre'),
  S('salt_iron',       'A single long metal ingot lying flat seen from a raised three quarter angle, pale grey iron furred with white salt crystals', { pale: true }),
  S('krakenbone',      'A single curved length of pale sea bone, porous and ridged, tapering to a point', { pale: true }),
  S('tidewrought',     'A single fist of blue green sea glass and coral fused together, faint light pulsing at its centre'),
  S('cannon_barrel',   'A single short cannon barrel lying flat, dark pitted bronze, reinforcing rings along it, muzzle to the right'),
  S('spet_sailing',    'A single storm petrel in flight seen from the side, dark wings spread, white rump', { dark: true }),
  S('cape_sailing',    'A single heavy oilskin sea cloak hanging from a shoulder clasp, dark blue green, water beading on it', { dark: true }),
  S('barnacle_iron',   'A single rough lump of dark iron crusted over with white barnacles'),
  S('tide_glass',      'A single smooth tumbled piece of pale sea green glass, edges worn round and frosted', { pale: true }),
  S('kelp_frond',      'A single long ribbon of dark green kelp, one wide frond curling back on itself'),
  S('wrack_timber',    'A single short length of splintered ship timber, grey weathered wood, one rusted iron nail through it'),
  S('tarred_rope',     'A single tight coil of thick black tarred rope lying flat', { dark: true }),
  S('salvaged_powder', 'A single small wooden powder keg standing upright, iron bands, dark grey powder spilling from the bung'),
  S('ship_bell',       'A single cracked bronze ship bell hanging from its yoke, a long split running up from the rim'),
  S('drowned_ledger',  'A single waterlogged ledger lying closed, swollen grey pages, ink running down the edges'),
  S('mistglass',       'A single smooth pale grey glass sphere with slow white mist turning inside it', { pale: true }),
  S('fogweed',         'A single sprig of pale grey green weed, soft blurred leaves trailing thin mist', { pale: true }),
  S('spire_stone',     'A single tall narrow shard of dark basalt standing on end, sharp fluted sides', { dark: true }),
  S('siren_scale',     'A single large iridescent scale, shifting green blue violet, one pointed edge'),
  S('drowned_coin',    'A single old gold coin seen face on, worn blank in the centre, green verdigris and salt around the rim'),
  S('voidwood',        'A single short cut billet of near black driftwood, violet rift light in the grain', { dark: true }),
  S('leviathan_scale', 'A single enormous armoured scale, slate blue grey, deep growth ridges across it'),
  S('starfall_cinder', 'A single rough lump of meteoric cinder, charred black crust cracked open on white star light', { dark: true }),
];

/* LEATHERS is defined above but deliberately NOT exported — see the note in
   FAMILIES3B. It stays as documentation of what batch 2 already covers. */
const FAMILIES3B = {
  seeds: SEEDS, produce: PRODUCE, outfits: OUTFITS, gemcuts: GEMCUTS,
  tools: TOOLS.concat(TOOLS_REST), drops3: DROPS, sailing: SAILING,
};

module.exports = { FAMILIES3B, ALL3B: Object.values(FAMILIES3B).flat() };

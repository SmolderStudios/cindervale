/* Batch 3 — gear. 233 items across eight slots and ten tiers.
 *
 * Hand-writing 233 prompts would guarantee drift: two Mithril pieces described in
 * slightly different words come back as two different metals, and the ladder stops
 * reading as a ladder. So the shape comes from the SLOT and the colour comes from
 * the MATERIAL, both shared verbatim across every item that uses them — the same
 * fix that got the ten bars looking like one family after four of them came back
 * as tubs and cubes.
 *
 * Material is matched off the item's own name. Anything matching nothing has to
 * appear in UNIQUE, and the build throws if it does not: a silent fallback to a
 * generic prompt is how a boss drop ends up looking like a vendor sword.
 */
'use strict';
const GEAR = require('./gear.json');

/* ── one silhouette per slot, stated as a shape and nothing else ──────────────
   Every piece in a slot shares this sentence word for word. At 15px the slot is
   the only thing a player can actually read, so the slots have to sit further
   apart from each other than the tiers do. */
const SHAPE = {
  helmet: 'A single closed battle helmet seen from a front three quarter angle, domed skull, heavy brow ridge, narrow dark eye slit, standing alone',
  chest:  'A single empty breastplate seen from the front, broad chest, squared shoulders, waist tapering in, standing alone on nothing',
  legs:   'A single pair of armoured leg greaves standing upright side by side, knee plates facing the viewer',
  boots:  'A single pair of armoured boots standing side by side seen from a front three quarter angle, thick soles, shin cuffs',
  gloves: 'A single armoured gauntlet seen from a three quarter angle, wide flared cuff toward the viewer, fingers curled inward',
  cape:   'A single cloak hanging from a shoulder clasp at the top, heavy fabric falling in deep vertical folds, hem swinging wide',
  shield: 'A single shield seen face on and filling the frame, raised central boss, banded rim',
};

/* Weapons split by damage type — a sword and a hammer share nothing useful. */
const WEAPON = {
  slash:  'A single straight sword seen edge on from the side, blade pointing up, plain crossguard, wrapped grip, round pommel',
  stab:   'A single dagger seen edge on from the side, short broad tapering blade pointing up, small crossguard, wrapped grip',
  crush:  'A single war hammer seen from the side, heavy squared head at the top, long haft running down',
  slash2: 'A single two handed greatsword seen edge on from the side, long broad blade pointing up, long grip, heavy crossguard',
  crush2: 'A single two handed maul seen from the side, huge blunt head at the top, long thick haft running down',
};

/* ── the two ladders. Metal and hide are deliberately different constructions,
   not just different colours: a player should be able to tell plate from leather
   before they can tell which tier it is. ── */
const M = (words, opt) => Object.assign({ w: words, kind: 'metal' }, opt || {});
const H = (words, opt) => Object.assign({ w: words, kind: 'hide' }, opt || {});

const MATERIAL = {
  bronze:      M('hammered bronze, warm brown gold metal, dark patina in the recesses'),
  iron:        M('plain forged iron, dull grey metal, dark pitting and soot'),
  steel:       M('polished steel, cool bright silver grey metal, clean hard highlights', { pale: true }),
  mithril:     M('mithril, luminous sky blue metal with a pale silver sheen'),
  cobalt:      M('cobalt, deep vivid blue metal with bright cold highlights'),
  runite:      M('runite, rich emerald green metal with a dark oiled sheen'),
  starsteel:   M('starsteel, pale violet white metal scattered with tiny star glints', { pale: true }),
  gravesteel:  M('gravesteel, cold grey green metal streaked with grave rust and verdigris'),
  moltensteel: M('moltensteel, dark iron split by glowing molten orange seams', { dark: true }),
  voidsteel:   M('voidsteel, near black metal with a violet sheen and thin purple rift light in the seams', { dark: true }),
  dawn:        M('dawnsteel, radiant pale gold metal haloed in warm white light', { pale: true }),
  barrow:      M('barrow, tarnished grave silver hung with faded burial cloth'),
  emberforged: M('emberforged, blackened iron veined with hot orange forge light', { dark: true }),

  roughhide:   H('rough undyed leather, coarse tan hide, crude stitching and iron rivets'),
  chitinweave: H('layered insect chitin plates lashed over dark leather, glossy chestnut brown shell'),
  chitin:      H('layered insect chitin plates lashed over dark leather, glossy chestnut brown shell'),
  wolfhide:    H('grey wolf pelt over stitched leather, coarse fur trim at the edges'),
  warband:     H('scarred brown warband leather hung with bone tokens and red war cord'),
  ogrehide:    H('thick pale ogre hide, heavy crude stitching, bone studs', { pale: true }),
  trollhide:   H('mottled green troll hide over dark leather, warty thickened plates'),
  drakehide:   H('overlapping bronze red drake scales stitched to dark leather'),
  demonhide:   H('cracked crimson demon hide, black horn studs, faint heat in the cracks'),
  wraithhide:  H('ghostly translucent grey wraith hide, tattered edges fading out'),
  emberhide:   H('charred black hide cracked open with glowing ember orange light beneath', { dark: true }),
  emberweave:  H('charred black hide cracked open with glowing ember orange light beneath', { dark: true }),
  cinder:      H('ash grey cinderweave cloth shot with drifting orange sparks'),
  voidhide:    H('near black void hide drinking the light, thin violet rift seams', { dark: true }),
  sunweave:    H('woven sunweave cloth, warm white and pale gold, softly glowing', { pale: true }),
  bone:        H('lashed bone plates, pale ivory, bound with dark cord', { pale: true }),
  grave:       H('grey rotted burial linen over dark leather'),
  silkwoven:   H('fine pale silk weave, iridescent sheen, light as air', { pale: true }),
};

/* Longest key first, so "gravesteel" is never eaten by "grave" and "chitinweave"
   never by "chitin". */
const NAMEMAP = {
  roughhide: 'roughhide', chitinweave: 'chitinweave', chitin: 'chitin', wolfhide: 'wolfhide',
  ogrehide: 'ogrehide', trollhide: 'trollhide', drakehide: 'drakehide', demonhide: 'demonhide',
  wraithweave: 'wraithhide', wraithhide: 'wraithhide', emberhide: 'emberhide', voidhide: 'voidhide', sunweave: 'sunweave',
  warband: 'warband', silkwoven: 'silkwoven', cinderweave: 'cinder', cindermantle: 'cinder',
  emberforged: 'emberforged', emberweave: 'emberweave',
  gravesteel: 'gravesteel', moltensteel: 'moltensteel', voidsteel: 'voidsteel',
  starsteel: 'starsteel', mithril: 'mithril', cobalt: 'cobalt', runite: 'runite',
  bronze: 'bronze', iron: 'iron', steel: 'steel', barrow: 'barrow',
  dawnward: 'dawn', dawnsteel: 'dawn', dawn: 'dawn', bone: 'bone', grave: 'grave',
};

/* Bosses' drops. These are the pieces a player remembers, so they get their own
   description rather than the ladder's. Anything that matches no material and is
   not listed here stops the build. */
const UNIQUE = {
  plague_fang_dagger: ['A single dagger seen edge on from the side, an enormous yellowed rat fang lashed to a rough iron tang, the edge weeping a sour green', { pale: true }],
  rat_queen_crown: ['A single small crooked crown of dark iron and gnawed bone, set with one dull red stone'],
  chitin_maul: ['A single war hammer seen from the side, the head a solid block of glossy chestnut insect chitin, dark lashed haft'],
  widow_crown: ['A single spiked black crown, thin barbed spider legs curling up from the band', { dark: true }],
  warchief_crown: ['A single heavy chieftain crown of scarred iron hung with red war cord and small bones'],
  warcleaver: ['A single heavy cleaver seen from the side, broad rectangular chipped steel blade, bound leather grip'],
  lich_crown: ['A single tall thin crown of blackened bone spires, cold blue witchlight in the gaps', { dark: true }],
  bone_reaper: ['A single curved scythe blade of pale bone on a short dark haft', { pale: true }],
  soulbinder_hammer: ['A single war hammer seen from the side, blue soul light bleeding from the runes cut into its dark head', { dark: true }],
  bone_plate_cuirass: ['A single empty breastplate of lashed pale rib bone, standing alone on nothing', { pale: true }],
  ironfang_skull: ['A single wolf skull worn as a helm, pale bone, iron fangs set in the jaw', { pale: true }],
  ironfang_claws: ['A single set of four curved iron claws mounted on a leather hand strap'],
  pack_leader_vest: ['A single sleeveless vest of grey wolf pelt and dark leather, standing alone on nothing'],
  pack_alpha_cape: ['A single wolf pelt cloak hanging from a bone clasp, the wolf head forming the hood at the top'],
  warlord_skull: ['A single horned war helm made from a huge bleached skull, heavy curved horns', { pale: true }],
  warlord_bulwark: ['A single enormous tower shield seen face on and filling the frame, scarred black iron, brass rivets', { dark: true }],
  troll_king_skull: ['A single crude helm made from a huge green tinged troll skull, jaw hanging open'],
  troll_maul: ['A single two handed maul seen from the side, the head a raw boulder lashed to a thick tree haft'],
  wyrmfang_blade: ['A single sword seen edge on from the side, the blade one long curved dragon fang, bronze red'],
  emberwyrm_skull: ['A single dragon skull worn as a helm, blackened bone with hot orange light in the eye sockets', { dark: true }],
  doomblade: ['A single sword seen edge on from the side, black blade edged in creeping orange fire', { dark: true }],
  forgebreaker: ['A single two handed maul seen from the side, an anvil shaped glowing forge head, dark haft', { dark: true }],
  cinderfang: ['A single dagger seen edge on from the side, ash grey blade trailing live sparks'],
  slagbreaker: ['A single war hammer seen from the side, the head a lump of cooling slag glowing at its core', { dark: true }],
  demonlord_skull: ['A single horned demon skull worn as a helm, black bone, long back swept horns, violet light in the sockets', { dark: true }],
  voidrend: ['A single dagger seen edge on from the side, the blade a tear of pure black with violet light along its edge', { dark: true }],
  voidcleaver: ['A single two handed greatsword seen edge on from the side, near black blade splitting into violet rift light', { dark: true }],
  voidedge: ['A single sword seen edge on from the side, near black blade with a thin violet cutting edge', { dark: true }],
  riftcrusher: ['A single war hammer seen from the side, the head a collapsing knot of violet void light caged in dark iron', { dark: true }],
  voidheart_shroud: ['A single hooded robe hanging empty, near black cloth with a violet glow at the breast', { dark: true }],
  voidforged_greaves: ['A single pair of armoured leg greaves standing upright side by side, near black metal with violet seams', { dark: true }],
  voidshroud: ['A single cloak hanging from a shoulder clasp, near black cloth dissolving into violet mist at the hem', { dark: true }],
  abyssal_aegis: ['A single shield seen face on and filling the frame, black iron ringed with violet rift light', { dark: true }],
  nullward: ['A single shield seen face on and filling the frame, a flat disc of absolute black with a thin white rim', { dark: true }],
  riftshadow_cowl: ['A single deep hood hanging empty, near black cloth, violet light where the face should be', { dark: true }],
  wraithbound_cowl: ['A single deep hood hanging empty, translucent grey cloth fading to nothing at the hem', { pale: true }],
  grave_cleaver: ['A single two handed cleaver seen from the side, an enormous rectangular pitted grave iron blade, bound haft'],
  barrow_blade: ['A single sword seen edge on from the side, tarnished grave silver blade, burial cloth wound round the grip'],
  barrow_dagger: ['A single dagger seen edge on from the side, tarnished grave silver blade, burial cloth wound round the grip'],
  barrow_maul: ['A single war hammer seen from the side, tarnished grave silver head, burial cloth wound round the haft'],
  barrow_shield: ['A single shield seen face on and filling the frame, tarnished grave silver, a faded burial sigil across it'],
  barrow_chest: ['A single empty breastplate seen from the front, tarnished grave silver plate hung with faded burial cloth, standing alone on nothing'],
  barrow_legs: ['A single pair of armoured leg greaves standing upright side by side, tarnished grave silver'],
  graveshroud_vest: ['A single sleeveless vest of grey rotted burial linen over dark leather, standing alone on nothing'],
  emberforged_aegis: ['A single empty breastplate seen from the front, blackened iron veined with hot orange forge light, standing alone on nothing', { dark: true }],
  emberforged_blade: ['A single sword seen edge on from the side, blackened blade veined with hot orange forge light', { dark: true }],
  emberforged_greaves: ['A single pair of armoured leg greaves standing upright side by side, blackened iron veined with hot orange forge light', { dark: true }],
  dawnbreaker: ['A single sword seen edge on from the side, radiant pale gold blade haloed in warm white light', { pale: true }],
  starfang: ['A single dagger seen edge on from the side, pale violet white blade scattered with star glints', { pale: true }],
  worldsunder_maul: ['A single two handed maul seen from the side, a colossal pale gold head trailing warm light', { pale: true }],
  sunpiercer: ['A single long thin rapier seen edge on from the side, radiant pale gold needle blade, swept guard', { pale: true }],
  dawnreaper: ['A single two handed greatsword seen edge on from the side, one long radiant pale gold blade', { pale: true }],
  aegis_of_dawn: ['A single shield seen face on and filling the frame, radiant pale gold, a sunburst across it', { pale: true }],
  dawnmantle: ['A single cloak hanging from a shoulder clasp, warm white and pale gold cloth glowing softly', { pale: true }],
  cindermantle: ['A single cloak hanging from a shoulder clasp, ash grey cloth shot with drifting orange sparks'],
  cinderguard: ['A single shield seen face on and filling the frame, ash grey iron with live embers along the rim'],
};

const NAMEKEYS = Object.keys(NAMEMAP).sort((a, b) => b.length - a.length);

function matFor(item) {
  const n = item.n.toLowerCase().replace(/[^a-z]/g, '');
  for (const k of NAMEKEYS) if (n.includes(k)) return MATERIAL[NAMEMAP[k]];
  return null;
}

function shapeFor(item) {
  if (item.s !== 'weapon') return SHAPE[item.s] || null;
  return (item.two && WEAPON[item.d + '2']) || WEAPON[item.d] || null;
}

const GEAR_SUBJECTS = GEAR.map(it => {
  const u = UNIQUE[it.id];
  if (u) return Object.assign({ id: it.id, p: u[0] }, u[1] || {});
  const mat = matFor(it), shape = shapeFor(it);
  if (!mat) throw new Error('no material for ' + it.id + ' (' + it.n + ') — add it to NAMEMAP or UNIQUE');
  if (!shape) throw new Error('no shape for ' + it.id + ' (slot ' + it.s + ', damage ' + it.d + ')');
  const opt = {};
  if (mat.pale) opt.pale = true;
  if (mat.dark) opt.dark = true;
  /* Say buckler out loud or it comes back the size of a tower shield. */
  const small = /buckler/i.test(it.n) ? ', a small round buckler rather than a full shield' : '';
  return Object.assign({ id: it.id, p: shape + small + ', made of ' + mat.w }, opt);
});

module.exports = { GEAR: GEAR_SUBJECTS, SHAPE, WEAPON, MATERIAL };

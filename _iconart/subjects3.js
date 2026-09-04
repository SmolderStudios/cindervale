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
  helmet: 'A single medieval knight helm, one solid piece with a narrow dark eye slit',
  chest:  'A single breastplate, curved chest armour with shoulder guards, hollow and empty',
  legs:   'A single pair of matching armour plates standing upright side by side, each with a rounded knee guard at the top and a riveted rim, tapering to a straight cut edge at the bottom',
  boots:  'A single pair of armoured boots side by side seen from the front',
  gloves: 'A single armoured gauntlet, wide flared cuff, fingers curled',
  cape:   'A single hanging cloak, heavy folds, clasp at the top',
  shield: 'A single shield seen face on, raised boss at its centre',
};

/* Said in the negative as well, because the positive alone did not hold. */
const SLOT_NEG = {
  helmet: 'motorcycle helmet, crash helmet, modern, hoodie, skull, face, head, person',
  chest:  'person, body, torso, legs, full suit of armour, standing figure, t shirt, mannequin',
  legs:   'boots, shoes, footwear, feet, toes, boot toe, ankle boot, trousers, jeans, denim, leggings, full suit of armour, whole body, torso, chest plate, helmet, person, standing figure',
  boots:  'person, legs, standing figure',
  gloves: 'hand, arm, person, mitten, cup, tumbler, drinking glass, tube, vase',
  cape:   'person, figure, mannequin',
  shield: 'person',
  weapon: 'two weapons, a pair of weapons, crossed weapons, duplicate, helmet, head, person',
};

/* The hide ladder gets its own silhouettes. A Cowl is a hood, a Jerkin is not a
   cuirass, and Bracers are forearm guards rather than gauntlets — the game's own
   names say so, and drawing them as plate in brown made leather look like painted
   metal. Chosen by the MATERIAL's kind, so it cannot disagree with the palette. */
const SOFT = {
  helmet: 'A single soft leather hood, the open cowl facing the viewer',
  chest:  'A single sleeveless leather jerkin, laced front, hollow and empty',
  legs:   'A single pair of leather shin guards, two padded wraps side by side, knee down to ankle, each ending in a flat straight cut edge at the bottom',
  gloves: 'A single soft leather glove, fingers curled, wide cuff at the wrist',
  boots:  'A single pair of soft leather boots side by side seen from the front',
};
const SOFT_NEG = {
  helmet: 'metal helmet, visor, motorcycle helmet, skull, face, head, person',
  chest:  'metal plate, cuirass, t shirt, person, torso, head, arms',
  legs:   'trousers, jeans, denim, leggings, metal greaves, boots, person, standing figure',
  gloves: 'metal gauntlet, plate, cup, tumbler, drinking glass, tube, hand of a person, arm',
  boots:  'metal plate, person, legs, standing figure',
};

/* Weapons split by damage type — a sword and a hammer share nothing useful. */
const WEAPON = {
  slash:  'A single longsword, exactly one blade, only one weapon in the picture, held point up, narrow straight blade running the full height of the frame, small crossguard',
  stab:   'A single dagger, exactly one blade, only one weapon in the picture, held point up, one short tapered blade, small round pommel, no crossguard',
  crush:  'A single blacksmith sledgehammer, one huge square head at the top, short thick handle',
  slash2: 'A single enormous two handed greatsword, exactly one blade, only one weapon in the picture, held point up, very long broad blade running the full height of the frame, long grip',
  crush2: 'A single enormous two handed sledgehammer, one massive square head at the top, thick handle',
};

/* ── the two ladders. Metal and hide are deliberately different constructions,
   not just different colours: a player should be able to tell plate from leather
   before they can tell which tier it is. ── */
const M = (words, opt) => Object.assign({ w: words, kind: 'metal' }, opt || {});
const H = (words, opt) => Object.assign({ w: words, kind: 'hide' }, opt || {});

const MATERIAL = {
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
  bronze_dagger: ['A single dagger standing straight upright and vertical, one blade only pointing up, short tapered blade, round pommel, warm brown gold bronze', {neg:'heraldry, coat of arms, emblem, crest, insignia, crossed daggers, two daggers, X shape, diagonal'}],
  bronze_sword: ['A single longsword, exactly one blade, only one weapon in the picture, held point up, narrow straight blade running the full height of the frame, small crossguard, the blade itself is warm brown gold bronze, not steel', {neg:'silver blade, steel blade, two weapons, crossed pair, person'}],
  bronze_chest: ['A single breastplate, curved chest armour with two matching shoulder guards, symmetrical, hollow and empty, warm brown gold bronze', {neg:'lopsided, asymmetrical, one shoulder, person, torso'}],
  steel_legs: ['A single pair of leg greaves side by side, two curved shin plates only, no torso, bright silver steel', {pale:true,neg:'full suit of armour, whole body, torso, chest plate, helmet, person, standing figure'}],
  plague_fang_dagger: ['A single dagger, the blade one huge yellowed rat fang, sour green edge', {pale:true}],
  rat_queen_crown: ['A single small crooked iron crown set with one dull red stone'],
  chitin_maul: ['A single war hammer, one glossy chestnut chitin block on a long haft'],
  widow_crown: ['A single black crown, thin barbed spider legs curling up from the band', {dark:true}],
  warchief_crown: ['A single heavy iron chieftain crown hung with red cord and small bones'],
  warcleaver: ['A single heavy cleaver, one broad chipped steel blade, bound grip'],
  lich_crown: ['A single tall crown of blackened bone spires, cold blue light between them', {dark:true}],
  bone_reaper: ['A single scythe, one long curved pale bone blade on a dark haft', {pale:true,neg:'person, figure, death, reaper'}],
  soulbinder_hammer: ['A single war hammer, exactly one weapon in the picture, one blunt block at the top of a long haft, dark iron block cut with blue glowing runes', {dark:true,neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod, orb, sphere'}],
  bone_plate_cuirass: ['A single curved chest breastplate made of pale ivory plates, hollow and empty', {pale:true,neg:'skull, head, face, bone pile, ribcage of a creature'}],
  ironfang_skull: ['A single wolf skull helm, pale bone with iron fangs', {pale:true}],
  ironfang_claws: ['A single set of four curved iron claws mounted on a narrow leather strap', {neg:'glove, gauntlet, hand, mitten, person'}],
  pack_leader_vest: ['A single sleeveless vest of grey wolf pelt, hollow and empty'],
  pack_alpha_cape: ['A single wolf pelt cloak, the wolf head forming the hood at the top'],
  warlord_skull: ['A single horned war helm made from a bleached skull, heavy curved horns', {pale:true}],
  warlord_bulwark: ['A single huge tower shield seen face on, scarred black iron, brass rivets', {dark:true}],
  troll_king_skull: ['A single crude helm made from a green tinged troll skull'],
  troll_maul: ['A single huge two handed axe, exactly one weapon in the picture, one broad blade at the top of a long haft, one rough grey boulder lashed on instead of a blade', {neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod, axe blade'}],
  wyrmfang_blade: ['A single sword, the blade one long curved bronze red dragon fang'],
  emberwyrm_skull: ['A single dragon skull helm, blackened bone with orange light in the sockets', {dark:true}],
  doomblade: ['A single sword, exactly one blade, only one weapon in the picture, blade pointing up, crossguard and wrapped grip, black blade edged in orange fire', {dark:true,neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod, circle, disc'}],
  forgebreaker: ['A single huge two handed axe, exactly one weapon in the picture, one broad blade at the top of a long haft, molten orange axe blade', {dark:true,neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod'}],
  cinderfang: ['A single dagger, ash grey blade trailing sparks'],
  slagbreaker: ['A single war hammer, exactly one weapon in the picture, one blunt block at the top of a long haft, glowing orange slag block', {dark:true,neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod'}],
  demonlord_skull: ['A single horned demon skull helm, black bone, violet light in the sockets', {dark:true}],
  voidrend: ['A single dagger, the blade a tear of pure black edged in violet', {dark:true}],
  voidcleaver: ['A single huge two handed greatsword, exactly one blade, only one weapon in the picture, one long blade pointing up, black blade split by violet light', {dark:true,neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod'}],
  voidedge: ['A single sword, exactly one blade, only one weapon in the picture, blade pointing up, crossguard and wrapped grip, black blade with a thin violet cutting edge', {dark:true,neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod, rune, glyph, symbol'}],
  riftcrusher: ['A single war hammer, exactly one weapon in the picture, one blunt block at the top of a long haft, dark iron block caging violet light', {dark:true,neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod, lollipop, orb, staff, wand'}],
  voidheart_shroud: ['A single sleeveless black robe hanging empty on nothing, a violet glow at the chest', {dark:true,neg:'person, figure, body, head, hood, standing figure'}],
  voidforged_greaves: ['A single pair of leg greaves side by side, black metal with violet seams', {dark:true,neg:'full suit of armour, person, torso, head, standing figure'}],
  voidshroud: ['A single hanging cloak, black cloth dissolving into violet mist at the hem', {dark:true}],
  abyssal_aegis: ['A single curved chest breastplate, black iron ringed with violet light, hollow and empty', {dark:true,neg:'shield, buckler, person, body'}],
  nullward: ['A single shield seen face on, black disc inside a thick bright white rim', {dark:true}],
  riftshadow_cowl: ['A single soft hood, black cloth, violet light where the face would be', {dark:true}],
  wraithbound_cowl: ['A single soft hood, translucent grey cloth fading out at the hem', {pale:true}],
  grave_cleaver: ['A single huge two handed axe, exactly one weapon in the picture, one broad blade at the top of a long haft, one broad pitted grey iron cleaver blade', {neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod, kitchen knife, butcher'}],
  barrow_blade: ['A single sword, tarnished grave silver blade, cloth wound round the grip'],
  barrow_dagger: ['A single dagger, tarnished grave silver blade, cloth wound round the grip'],
  barrow_maul: ['A single war hammer, exactly one weapon in the picture, one blunt block at the top of a long haft, tarnished grave silver block', {neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod'}],
  barrow_shield: ['A single shield seen face on, tarnished grave silver, a faded sigil across it'],
  barrow_chest: ['A single breastplate, tarnished grave silver hung with faded cloth, hollow and empty'],
  barrow_legs: ['A single pair of armoured leg greaves side by side, tarnished grave silver'],
  graveshroud_vest: ['A single sleeveless vest of grey rotted burial linen, hollow and empty'],
  emberforged_aegis: ['A single breastplate, blackened iron veined with orange forge light, hollow and empty', {dark:true}],
  emberforged_blade: ['A single sword, blackened blade veined with orange forge light', {dark:true}],
  emberforged_greaves: ['A single pair of armoured leg greaves side by side, blackened iron veined with orange', {dark:true}],
  dawnbreaker: ['A single sword, radiant pale gold blade haloed in warm light', {pale:true}],
  starfang: ['A single dagger, exactly one blade, only one weapon in the picture, short blade pointing up, small crossguard, pale violet white with star glints', {pale:true,neg:'person, figure, standing figure, head, hood, robe, holding, two weapons, crossed pair, stand, rack, tripod'}],
  worldsunder_maul: ['A single huge two handed maul, one colossal pale gold block on a long haft', {pale:true}],
  sunpiercer: ['A single recurve bow, radiant pale gold limbs, a drawn thread of white light', {pale:true}],
  dawnreaper: ['A single two handed scythe, one long curved pale gold blade on a haft', {pale:true}],
  aegis_of_dawn: ['A single shield seen face on, radiant pale gold with a sunburst across it', {pale:true}],
  dawnmantle: ['A single hanging cloak, warm white and pale gold cloth, softly glowing', {pale:true}],
  cindermantle: ['A single hanging cloak, ash grey cloth shot with orange sparks'],
  cinderguard: ['A single shield seen face on, ash grey iron with embers along the rim'],
};

const NAMEKEYS = Object.keys(NAMEMAP).sort((a, b) => b.length - a.length);

function matFor(item) {
  const n = item.n.toLowerCase().replace(/[^a-z]/g, '');
  for (const k of NAMEKEYS) if (n.includes(k)) return MATERIAL[NAMEMAP[k]];
  return null;
}

function shapeFor(item, mat) {
  if (item.s !== 'weapon') {
    const soft = mat && mat.kind === 'hide' && SOFT[item.s];
    return soft || SHAPE[item.s] || null;
  }
  return (item.two && WEAPON[item.d + '2']) || WEAPON[item.d] || null;
}

const GEAR_SUBJECTS = GEAR.map(it => {
  const u = UNIQUE[it.id];
  if (u) {
    /* A unique still belongs to its slot: five unique war hammers came back as
       helmets because they set their own opts and so inherited no negative. */
    const uo = Object.assign({}, u[1] || {});
    if (!uo.neg && SLOT_NEG[it.s]) uo.neg = SLOT_NEG[it.s];
    return Object.assign({ id: it.id, p: u[0] }, uo);
  }
  const mat = matFor(it), shape = shapeFor(it, mat);
  if (!mat) throw new Error('no material for ' + it.id + ' (' + it.n + ') — add it to NAMEMAP or UNIQUE');
  if (!shape) throw new Error('no shape for ' + it.id + ' (slot ' + it.s + ', damage ' + it.d + ')');
  const opt = {};
  if (mat.pale) opt.pale = true;
  if (mat.dark) opt.dark = true;
  const negTable = (mat.kind === 'hide' && SOFT[it.s]) ? SOFT_NEG : SLOT_NEG;
  if (negTable[it.s]) opt.neg = negTable[it.s];
  /* Say buckler out loud or it comes back the size of a tower shield. */
  const small = /buckler/i.test(it.n) ? ', a small round buckler' : '';
  return Object.assign({ id: it.id, p: shape + small + ', ' + mat.w }, opt);
});

/* id -> material key, for verify.js. A unique gets null: its colour is its own. */
const GEAR_MAT = {};
for (const it of GEAR) {
  const nm = it.n.toLowerCase().replace(/[^a-z]/g, '');
  GEAR_MAT[it.id] = (NAMEKEYS.find(k => nm.includes(k)) || null) && NAMEMAP[NAMEKEYS.find(k => nm.includes(k))];
}

module.exports = { GEAR: GEAR_SUBJECTS, SHAPE, WEAPON, MATERIAL, GEAR_MAT };

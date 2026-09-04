/* The 56 bespoke boss-drop prompts, cut to the same length as everything else.
 *
 * The terse rewrite only touched SHAPE / SOFT / WEAPON / MATERIAL, so every UNIQUE
 * kept its 30-40 word original — which is why Bone Plate Cuirass and Barrow Legs
 * still came back as whole armoured figures while the tiered pieces beside them
 * came out right. "standing alone on nothing" was still in there, and that phrase
 * is what stands a breastplate up like a person.
 *
 * Same rules as the rest: name the object, give it ONE feature and a colour, stop.
 */
'use strict';
const fs = require('fs');
const F = __dirname + '/subjects3.js';
let lines = fs.readFileSync(F, 'utf8').split('\n');

const U = {
  plague_fang_dagger: ["A single dagger, the blade one huge yellowed rat fang, sour green edge", { pale: true }],
  rat_queen_crown: ["A single small crooked iron crown set with one dull red stone"],
  chitin_maul: ["A single war hammer, one glossy chestnut chitin block on a long haft"],
  widow_crown: ["A single black crown, thin barbed spider legs curling up from the band", { dark: true }],
  warchief_crown: ["A single heavy iron chieftain crown hung with red cord and small bones"],
  warcleaver: ["A single heavy cleaver, one broad chipped steel blade, bound grip"],
  lich_crown: ["A single tall crown of blackened bone spires, cold blue light between them", { dark: true }],
  bone_reaper: ["A single scythe, one long curved pale bone blade on a dark haft", { pale: true }],
  soulbinder_hammer: ["A single war hammer, one dark runed block bleeding blue light, long haft", { dark: true }],
  bone_plate_cuirass: ["A single breastplate of lashed pale rib bone, hollow and empty", { pale: true }],
  ironfang_skull: ["A single wolf skull helm, pale bone with iron fangs", { pale: true }],
  ironfang_claws: ["A single set of four curved iron claws on a leather hand strap"],
  pack_leader_vest: ["A single sleeveless vest of grey wolf pelt, hollow and empty"],
  pack_alpha_cape: ["A single wolf pelt cloak, the wolf head forming the hood at the top"],
  warlord_skull: ["A single horned war helm made from a bleached skull, heavy curved horns", { pale: true }],
  warlord_bulwark: ["A single huge tower shield seen face on, scarred black iron, brass rivets", { dark: true }],
  troll_king_skull: ["A single crude helm made from a green tinged troll skull"],
  troll_maul: ["A single two handed maul, one raw boulder lashed to a thick haft"],
  wyrmfang_blade: ["A single sword, the blade one long curved bronze red dragon fang"],
  emberwyrm_skull: ["A single dragon skull helm, blackened bone with orange light in the sockets", { dark: true }],
  doomblade: ["A single sword, black blade edged in creeping orange fire", { dark: true }],
  forgebreaker: ["A single huge two handed greataxe, one molten axe bit on a long dark haft", { dark: true }],
  cinderfang: ["A single dagger, ash grey blade trailing sparks"],
  slagbreaker: ["A single war hammer, one glowing slag block on a long haft", { dark: true }],
  demonlord_skull: ["A single horned demon skull helm, black bone, violet light in the sockets", { dark: true }],
  voidrend: ["A single dagger, the blade a tear of pure black edged in violet", { dark: true }],
  voidcleaver: ["A single huge two handed greatsword, black blade split by violet light", { dark: true }],
  voidedge: ["A single sword, black blade with a thin violet cutting edge", { dark: true }],
  riftcrusher: ["A single war hammer, one caged knot of violet light on a long haft", { dark: true }],
  voidheart_shroud: ["A single hooded robe, hollow and empty, black cloth with a violet glow", { dark: true }],
  voidforged_greaves: ["A single pair of armoured leg greaves side by side, black metal with violet seams", { dark: true }],
  voidshroud: ["A single hanging cloak, black cloth dissolving into violet mist at the hem", { dark: true }],
  abyssal_aegis: ["A single shield seen face on, black iron ringed with violet light", { dark: true }],
  nullward: ["A single shield seen face on, black disc inside a thick bright white rim", { dark: true }],
  riftshadow_cowl: ["A single soft hood, black cloth, violet light where the face would be", { dark: true }],
  wraithbound_cowl: ["A single soft hood, translucent grey cloth fading out at the hem", { pale: true }],
  grave_cleaver: ["A single huge two handed cleaver, one pitted grey iron blade on a long haft"],
  barrow_blade: ["A single sword, tarnished grave silver blade, cloth wound round the grip"],
  barrow_dagger: ["A single dagger, tarnished grave silver blade, cloth wound round the grip"],
  barrow_maul: ["A single war hammer, one tarnished grave silver block on a long haft"],
  barrow_shield: ["A single shield seen face on, tarnished grave silver, a faded sigil across it"],
  barrow_chest: ["A single breastplate, tarnished grave silver hung with faded cloth, hollow and empty"],
  barrow_legs: ["A single pair of armoured leg greaves side by side, tarnished grave silver"],
  graveshroud_vest: ["A single sleeveless vest of grey rotted burial linen, hollow and empty"],
  emberforged_aegis: ["A single breastplate, blackened iron veined with orange forge light, hollow and empty", { dark: true }],
  emberforged_blade: ["A single sword, blackened blade veined with orange forge light", { dark: true }],
  emberforged_greaves: ["A single pair of armoured leg greaves side by side, blackened iron veined with orange", { dark: true }],
  dawnbreaker: ["A single sword, radiant pale gold blade haloed in warm light", { pale: true }],
  starfang: ["A single dagger, pale violet white blade scattered with star glints", { pale: true }],
  worldsunder_maul: ["A single huge two handed maul, one colossal pale gold block on a long haft", { pale: true }],
  sunpiercer: ["A single recurve bow, radiant pale gold limbs, a drawn thread of white light", { pale: true }],
  dawnreaper: ["A single two handed scythe, one long curved pale gold blade on a haft", { pale: true }],
  aegis_of_dawn: ["A single shield seen face on, radiant pale gold with a sunburst across it", { pale: true }],
  dawnmantle: ["A single hanging cloak, warm white and pale gold cloth, softly glowing", { pale: true }],
  cindermantle: ["A single hanging cloak, ash grey cloth shot with orange sparks"],
  cinderguard: ["A single shield seen face on, ash grey iron with embers along the rim"],
};

const i = lines.findIndex(l => l.startsWith('const UNIQUE = {'));
if (i < 0) throw new Error('no UNIQUE block');
let j = i;
while (j < lines.length && lines[j].trim() !== '};') j++;
if (j >= lines.length) throw new Error('unterminated UNIQUE');

/* Every id that was there must still be there — losing one silently means a boss
   drop quietly falls back to the tiered ladder's generic sword. */
const had = lines.slice(i, j).join('\n').match(/^  ([a-z0-9_]+):/gm).map(m => m.trim().slice(0, -1));
const missing = had.filter(id => !U[id]);
if (missing.length) throw new Error('dropped from UNIQUE: ' + missing.join(', '));
const added = Object.keys(U).filter(id => !had.includes(id));
if (added.length) throw new Error('not previously in UNIQUE: ' + added.join(', '));

const body = ['const UNIQUE = {'];
for (const id of had) {
  const [p, o] = U[id];
  body.push('  ' + id + ": ['" + p.replace(/'/g, "\\'") + "'" + (o ? ', ' + JSON.stringify(o).replace(/"/g, '') : '') + '],');
}
body.push('};');
lines.splice(i, j - i + 1, ...body);
fs.writeFileSync(F, lines.join('\n'));
console.log('rewrote ' + had.length + ' unique prompts short');

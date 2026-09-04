/* One-off: every prompt fix the family grids turned up. Kept next to the pipeline
 * so the reasoning survives, since each of these is a re-learnable trap.
 */
'use strict';
const fs = require('fs');

/* ── weapons ──────────────────────────────────────────────────────────────────
   Every UNIQUE crush weapon came back as a HELMET: Chitin Maul, Slagbreaker,
   Riftcrusher, Soulbinder Hammer, Barrow Maul. All five phrase it as "the head a
   <material>", which makes "head" the subject noun. Same literal reading that drew
   a skull from "domed skull" and a clenched fist from "fist sized". The TIERED
   hammers are all correct because their sentence anchors it with "long haft
   running down" — so the uniques get that same skeleton. */
let b = fs.readFileSync(__dirname + '/subjects3.js', 'utf8');
const W = [
  ["chitin_maul: ['A single war hammer seen from the side, the head a solid block of glossy chestnut insect chitin, dark lashed haft'],",
   "chitin_maul: ['A single war hammer seen from the side, a solid block of glossy chestnut insect chitin at the top, long dark lashed haft running down'],"],
  ["soulbinder_hammer: ['A single war hammer seen from the side, blue soul light bleeding from the runes cut into its dark head', { dark: true }],",
   "soulbinder_hammer: ['A single war hammer seen from the side, a heavy squared dark block at the top cut with runes bleeding blue soul light, long haft running down', { dark: true }],"],
  ["slagbreaker: ['A single war hammer seen from the side, the head a lump of cooling slag glowing at its core', { dark: true }],",
   "slagbreaker: ['A single war hammer seen from the side, a lump of cooling slag glowing at its core at the top, long haft running down', { dark: true }],"],
  ["riftcrusher: ['A single war hammer seen from the side, the head a collapsing knot of violet void light caged in dark iron', { dark: true }],",
   "riftcrusher: ['A single war hammer seen from the side, a knot of violet void light caged in dark iron at the top, long haft running down', { dark: true }],"],
  ["barrow_maul: ['A single war hammer seen from the side, tarnished grave silver head, burial cloth wound round the haft'],",
   "barrow_maul: ['A single war hammer seen from the side, a heavy squared block of tarnished grave silver at the top, burial cloth wound round the long haft running down'],"],
];
for (const [x, y] of W) { if (!b.includes(x)) throw new Error('weapon: ' + x.slice(0, 44)); b = b.replace(x, y); }

/* And say it in the negative too, for every weapon. */
b = b.replace("  shield: '',\n};",
              "  shield: '',\n  weapon: 'helmet, helm, mask, head, face, person, armour, crossed swords',\n};");
if (!b.includes("weapon: 'helmet, helm")) throw new Error('weapon neg not inserted');
b = b.replace("  if (SLOT_NEG[it.s]) opt.neg = SLOT_NEG[it.s];", "  if (SLOT_NEG[it.s]) opt.neg = SLOT_NEG[it.s];");
fs.writeFileSync(__dirname + '/subjects3.js', b);

/* ── outfits ──────────────────────────────────────────────────────────────────
   The Alchemist and Pyromancer hoods and boots came back as whole robed PEOPLE,
   and the Runner's Cap as a running man. "robe cloth" and "a runner cut" in a
   garment prompt summon the wearer, so every outfit now states nobody is in it —
   in the prompt and in the negative. */
let a = fs.readFileSync(__dirname + '/subjects4.js', 'utf8');
a = a.replace("'deep plum purple robe cloth, an alchemist cut, faint potion stains at the hem'",
              "'deep plum purple cloth, an alchemist cut, faint potion stains at the hem'");
a = a.replace("'charred crimson and orange robe cloth, a pyromancer cut, embers glowing in the singed edges'",
              "'charred crimson and orange cloth, a pyromancer cut, embers glowing in the singed edges'");
const oldPush = "    OUTFITS.push(OUTFIT_OVERRIDE[id] || S(id, OUTFIT_SHAPE[slot] + words, o));";
const newPush = "    const base = OUTFIT_OVERRIDE[id] || S(id, OUTFIT_SHAPE[slot] + words + ', empty and laid out by itself, nobody wearing it', o);\n" +
  "    OUTFITS.push(Object.assign({}, base, { neg: OUTFIT_NEG }));";
if (!a.includes(oldPush)) throw new Error('outfit push not found');
a = a.replace(oldPush, newPush);

/* ── fishing rods ─────────────────────────────────────────────────────────────
   Four of the seven came back as human figures: a bending pole with a line
   hanging off it is a picture of somebody fishing unless you say otherwise. */
const ROD = 'A single fishing rod lying diagonally across the frame, a long tapering ';
const TAIL = ' with a small reel just above the grip and a thin line running from the tip down to one curved hook';
const R = [
  ["S('cane_rod',   'A single fishing rod seen from the side, a slender bamboo pole bending toward the top, line hanging from the tip, cork grip'),",
   "S('cane_rod',   '" + ROD + "bamboo pole" + TAIL + "', { neg: ROD_NEG }),"],
  ["S('iron_rod',   'A single fishing rod seen from the side, a dark iron pole bending toward the top, line hanging from the tip, leather grip'),",
   "S('iron_rod',   '" + ROD + "dark iron pole" + TAIL + "', { neg: ROD_NEG }),"],
  ["S('crystal_rod','A single fishing rod seen from the side, a clear pale crystal pole bending toward the top, line hanging from the tip', { pale: true }),",
   "S('crystal_rod','" + ROD + "clear pale crystal pole" + TAIL + "', { pale: true, neg: ROD_NEG }),"],
  ["S('moonrod',    'A single fishing rod seen from the side, a silver white pole bending toward the top, glowing softly, line hanging from the tip', { pale: true }),",
   "S('moonrod',    '" + ROD + "silver white softly glowing pole" + TAIL + "', { pale: true, neg: ROD_NEG }),"],
  ["S('voidrod',    'A single fishing rod seen from the side, a near black pole bending toward the top, bright violet rift light burning along its whole length, the rod running corner to corner and filling the whole frame', { dark: true }),",
   "S('voidrod',    '" + ROD + "near black pole burning with bright violet rift light" + TAIL + "', { dark: true, neg: ROD_NEG }),"],
  ["S('everflame_rod', 'A single fishing rod seen from the side, a blackened pole wrapped in orange flame, bending toward the top', { dark: true }),",
   "S('everflame_rod', '" + ROD + "blackened pole wrapped in living orange flame" + TAIL + "', { dark: true, neg: ROD_NEG }),"],
  /* Drew a church bell. The word is one letter away from one. */
  ["S('master_bellows','A single blacksmith bellows seen from the side, pleated leather body, wooden handles and a brass nozzle'),",
   "S('master_bellows','A single blacksmith air bellows seen from the side, a wide flat triangular pleated leather bag, two long wooden handles at the wide end and a narrow brass air nozzle at the point', { neg: 'bell, church bell, ship bell, chime, dome' }),"],
];
for (const [x, y] of R) { if (!a.includes(x)) throw new Error('tool: ' + x.slice(0, 44)); a = a.replace(x, y); }

/* The loupe came back as a bear holding a magnifier. */
a = a.replace("jw_hat: S('jw_hat', 'A single jeweller\\'s loupe, a small brass magnifying eyepiece on a folding arm, standing alone'),",
  "jw_hat: S('jw_hat', 'A single jeweller loupe, a small brass magnifying eyepiece on a short folding arm, lying by itself', { neg: 'animal, creature, bear, person, face' }),");

a = a.replace("const S = (id, p, opt) => Object.assign({ id, p }, opt || {});",
  "const S = (id, p, opt) => Object.assign({ id, p }, opt || {});\n" +
  "const ROD_NEG = 'person, figure, human, fisherman, man, standing figure, silhouette of a person';\n" +
  "const OUTFIT_NEG = 'person, figure, human, man, woman, wizard, body, head, model, mannequin, animal, creature';");
fs.writeFileSync(__dirname + '/subjects4.js', a);
console.log('weapons, outfits, rods, bellows and the loupe all fixed');

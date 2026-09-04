/* Build _iconart/PROMPTS.md — the ChatGPT sheet briefs for a full item-art redo.
 *   node _iconart/_mkprompts.js
 * Item lists are generated from subjects.js so nothing is missed; the design briefs
 * are hand-written, because the whole point is that each set gets its OWN look. */
'use strict';
const fs = require('fs'), path = require('path');
const { FAMILIES } = require('./subjects');
const items = require('./items.json');
const nameOf = {}; for (const r of items) nameOf[r.id] = r.name;

const byId = {}; for (const fam of Object.values(FAMILIES)) for (const s of fam) byId[s.id] = s;
const N = id => nameOf[id] || id;

/* An id's NATURAL section is the family it was originally authored into, not the family
   it sits in now. subjects5/6 supersede earlier prompts by moving those ids into
   `hunt_hides` / `hunt_pending` / `audit_fixes`, which is right for generation order and
   wrong for sheet layout — it would scatter 80 items (every buckler, every cured leather,
   the whole dust family, half the monster drops) out of the sheets they belong on.
   Resolve against the raw modules so each item lands where a player would look for it. */
const RAW = Object.assign({},
  require('./subjects2').FAMILIES,
  { gear: require('./subjects3').GEAR },
  require('./subjects4').FAMILIES3B);
const rawFam = {};
for (const [k, v] of Object.entries(RAW)) for (const s of v) rawFam[s.id] = k;
const NEW_HOME = {           // ids that never existed before batch 3/4
  hunt_hides: 'hunt_hides',
  briar_cloak: 'gear', lynx_bracers: 'gear', elk_striders: 'gear',
  frostpelt_mantle: 'gear', stalker_hood: 'gear', rhino_bulwark: 'gear',
  boar_roast: 'food', elk_haunch: 'food', rhino_steak: 'food',
  /* Authored inline in subjects.js rather than in subjects2/3/4, so rawFam cannot see
     them and they fell out of their own families into the Leftovers bin. Named here so
     they ride on the sheet a player would expect them on. */
  ember_dust: 'drops', gem_dust: 'drops', starfall_bar: 'bars',
};

/* MISSED BY A SHEET THAT IS ALREADY DRAWN. These four belong to the gems and herbs
   sheets, which were generated before the orphan routing above existed — so they are
   not on those images and never will be. They get their own catch-up sheet at the very
   end rather than being silently listed under a family whose art is already finished.
   When another sheet completes with items outstanding, add them here. */
const MISSED = ['cut_bloodstone', 'void_shard', 'moonpetal', 'voidmoss'];
const famOf = {};
for (const [k, v] of Object.entries(FAMILIES)) for (const s of v) {
  famOf[s.id] = (k === 'audit_fixes' || k === 'hunt_pending')
    ? (rawFam[s.id] || NEW_HOME[s.id] || k)
    : k;
}
const MISSED_SET = new Set(MISSED);
/* MISSED ids are held out of every family sheet so they can only appear on the catch-up
   sheet — otherwise they would be listed under gems/herbs, whose art is already done,
   and quietly never get drawn. */
const idsIn = (...names) => Object.keys(famOf)
  .filter(id => names.includes(famOf[id]) && !MISSED_SET.has(id)).sort();

/* Short "what the object IS" note per id, pulled from the existing subject prompt's
   first clause — enough for ChatGPT to draw the right thing without me retyping 674. */
const gist = id => {
  const p = (byId[id] && byId[id].p) || '';
  const first = p.split(/,|\.\s/)[0].replace(/^A single /i, '').trim();
  return first.length > 78 ? first.slice(0, 75) + '…' : first;
};

const SLOT = /_(helm|helmet|chest|plate|cuirass|vest|jerkin|legs|greaves|chaps|gloves|bracers|gauntlets|boots|treads|runners|striders|shoes|shield|buckler|cape|cowl|aegis|bulwark)$/;
const setsOf = famIds => {
  const out = {};
  famIds.forEach(id => { const m = id.match(SLOT); if (!m) return;
    const k = id.slice(0, id.length - m[0].length); (out[k] = out[k] || []).push(id); });
  return out;
};
const gearIds = idsIn('gear');
const SETS = setsOf(gearIds);
const setMembers = k => (SETS[k] || []);

/* ── the design briefs. This is the answer to "raid armours all look the same": the
   old prompts were ONE template per slot with the colour swapped, so every helm in
   the game is the same knight helm in a different hue. Each set now gets its own
   silhouette language, and the slot only says which piece of it you are looking at. */
const SET_BRIEF = {
  bronze:      'CRUDE AND EARLY. Thick uneven hand-hammered plate, visible dimples, big round rivets, edges slightly wavy and asymmetric, leather straps showing at the joins. Warm reddish brown-gold. It should look like a first attempt by a village smith.',
  iron:        'PLAIN AND FUNCTIONAL. Flat unadorned surfaces, simple horizontal banding, square-cut edges, plain buckles. Dull grey, almost no shine. Utterly undecorated — the point of this set is that it has no personality.',
  steel:       'THE CLASSIC KNIGHT. Clean symmetrical plate with shallow vertical fluting, a raised centre ridge, crisp bevelled edges catching a bright specular line. Bright silver. Polished and formal.',
  mithril:     'LIGHT AND ELEGANT. Thin layered plates with scalloped lower edges, slender proportions, fine etched line-work, small blue gemstone accents. Luminous sky blue with a soft inner glow. Looks like it weighs nothing.',
  cobalt:      'ANGULAR AND HEAVY. Big faceted geometric plates meeting at hard creases, sharp shoulder points, thick blocky proportions. Deep vivid blue with hard highlight edges along every facet. Brutal and architectural.',
  runite:      'ORGANIC AND CARVED. Flowing curved plate edges, swirling engraved vine-like grooves across every surface, rounded organic shapes. Rich emerald green with darker engraving. Grown rather than forged.',
  starsteel:   'CELESTIAL. Slender upswept spires and points, small star and burst motifs engraved into the surfaces, thin delicate framing. Pale violet-white metal with a cold soft glow and tiny sparkle points.',
  voidsteel:   'JAGGED AND UNSTABLE. Broken angular plate with cracked fissures running through it, torn edges, pieces that look as if they are pulling apart. Near-black metal with violet rift light burning in every crack.',
  gravesteel:  'GRAVE-ROBBED. Tarnished corroded plate, pitted and stained, small bone fragments and grave-nails set into the surfaces, tattered cloth wrappings hanging off the edges. Grey-green tarnish over dull steel.',
  moltensteel: 'INDUSTRIAL AND HOT. Blackened crusted iron with slag build-up on the surfaces, heavy squared-off proportions, thick seams. Molten orange light bleeding from the cracks and along the seam lines.',
  barrow:      'BURIAL REGALIA. Tarnished grave-silver plate with bone inlay along the edges, engraved burial sigils, long tattered grey funeral cloth hanging from every piece. Cold, pale, and old.',
  dawnward:    'RADIANT AND CEREMONIAL. Smooth pale gold plate with engraved sunburst motifs, feathered fanning edges at the shoulders and cuffs, warm light glowing from the engraving. Bright and holy.',
  sunweave:    'WOVEN, NOT FORGED. Layered gold cloth and fine chain, draping folds rather than rigid plate, embroidered sun motifs, soft edges. This set must NOT read as metal armour.',
  emberforged: 'FORGE-BORN. Blackened hammered iron with a rough scale-like surface texture, heavy square proportions, orange forge light glowing in the deep seams and under the plate edges.',
  voidforged:  'Same language as voidsteel — near-black cracked metal, violet rift light in every fissure, torn asymmetric edges.',
  dawnsteel:   'Same language as dawnward — pale gold, engraved sunbursts, warm light in the engraving.',

  rough:   'LEATHER, not plate. Soft supple hide with visible stitching along every seam, buckled straps, rolled edges. Plain tan-brown, worn and scuffed.',
  chitin:  'LEATHER, not plate. Overlapping hard glossy insect-shell plates sewn onto soft backing, each plate edge raised and catching light. Dark amber, wet-looking.',
  wolf:    'LEATHER, not plate. Grey hide with the fur left on at the collar, cuffs and hems, rawhide lacing, rough-cut edges.',
  ogre:    'LEATHER, not plate. Thick coarse mottled green-grey hide, crude oversized stitching, heavy and stiff.',
  troll:   'LEATHER, not plate. Warty olive-green hide crusted with pale lichen patches, stiff as bark, uneven surface.',
  drake:   'LEATHER, not plate. Bronze-red scaled hide with the scales still overlapping across the surface, warm and faintly glossy.',
  demon:   'LEATHER, not plate. Deep red-black hide cracked with faint ember glow in the splits, iron studs along the edges.',
  wraith:  'LEATHER, not plate. Pale translucent grey hide that looks half-there, edges dissolving into wisps, cold and insubstantial.',
  ember:   'LEATHER, not plate. Charred black hide veined with glowing orange between the panels, crusted and heat-cracked.',
  void:    'LEATHER, not plate. Near-black hide shot with violet light along every seam, edges frayed into shadow.',
};

const SLOT_LINE = {
  helm:    'a HELMET on its own, empty, seen three-quarter from the front, the face opening a clear dark hollow. No head, no face, nobody wearing it.',
  chest:   'a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it.',
  plate:   'a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it.',
  cuirass: 'a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it.',
  vest:    'a SLEEVELESS CHEST PIECE on its own, empty, hanging upright and seen flat from the front. No arms, no head, no legs.',
  jerkin:  'a SLEEVELESS CHEST PIECE on its own, empty, hanging upright and seen flat from the front. No arms, no head, no legs.',
  aegis:   'a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs.',
  legs:    'a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no belt, no feet, no boots.',
  greaves: 'a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no feet, no boots.',
  chaps:   'a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no feet, no boots.',
  gloves:  'a PAIR OF GLOVES standing upright side by side, empty, fingers visible, wide cuff at the wrist. No hands, no arms.',
  bracers: 'a PAIR OF FOREARM BRACERS standing upright side by side, open tubes, laced up the front. No fingers, no hands — these are not gloves.',
  boots:   'a PAIR OF BOOTS standing upright side by side, empty, complete with soles and toes.',
  treads:  'a PAIR OF LOW SHOES standing upright side by side, empty, soft soled.',
  runners: 'a PAIR OF LOW SHOES standing upright side by side, empty, soft soled.',
  striders:'a PAIR OF TALL BOOTS standing upright side by side, empty, laced high.',
  shield:  'a TALL SHIELD seen flat face-on, filling the frame, one solid face. Nobody holding it.',
  buckler: 'a SMALL ROUND DISC held flat face-on, perfectly circular with a domed knob at the exact centre and rivets around the rim. The outline is a plain circle — it never narrows or comes to a point. Do NOT draw a tall pointed knight shield.',
  bulwark: 'a BROAD SHIELD seen flat face-on, filling the frame. Nobody holding it.',
  cape:    'a CLOAK hanging on its own, seen flat from the front, heavy folds, a clasp at the throat. Empty — nobody wearing it.',
  cowl:    'a HOOD on its own, empty and slack, turned three-quarter so the OPEN MOUTH of the hood is a clear dark hollow with the far inner wall visible behind it. Not a solid dome.',
};
const slotOf = id => { const m = id.match(SLOT); return m ? m[1] : null; };

const MASTER = `You are drawing item icons for a dark-fantasy RPG inventory. I will give you one
SHEET at a time. Draw every item on that sheet in ONE image, as a labelled grid, on a
single flat pure-white background, with the item's short label in small plain text
under each cell.

STYLE — identical on every sheet, this is the whole point
Hand-painted stylised fantasy game icon. Bold clean shapes with a dark ink outline
holding the silhouette. Flat cel-like shading — three or four value steps, NOT smooth
gradients. Chunky slightly exaggerated proportions. Strong rim light along one edge,
deep shadow opposite. Rich saturated colour.

It must read as a painted game icon, NOT a photograph, NOT photorealistic, NOT a 3D
render, NOT a scanned texture study. Use LESS detail than feels right: each icon is
displayed to players at about 20 pixels, so the silhouette and two or three big shapes
are all that survive. Never draw fur strand by strand or scales one at a time.

FRAMING
Exactly ONE object per cell, centred, filling about 90% of its cell. Never a pile,
never a scene, never a container of other things. No plinth, no table, no ground line,
no landscape, no hands, nobody holding or wearing anything.

BACKGROUND
Flat pure white, edge to edge, behind the whole sheet. No gradient, no vignette, no
drop shadow under the objects.

A few names are deliberately misleading — "Moonstone Eye" is a gemstone, not the moon
and not an eyeball. Where a name reads oddly, draw the object, not the thing it is
named after.`;

/* That last line used to be four lines of shouting about never drawing the creature an
   item is named after. It was aimed at the wrong model. Z-Image-Turbo at cfg 2.4 is the
   one that answers the strongest noun from its prior — it drew an ogre for ogre_hide, a
   rat for rat_fang, a dragon for wyrmscale. The sheets ChatGPT returned had none of that
   problem on the first attempt. Keep one line for the handful of genuinely ambiguous
   names and spend the rest of the prompt budget on the style, which IS where its first
   sheet came back wrong (photoreal fur). The long version lives in AUDIT.md, where it
   belongs, for whenever the local pipeline is used again. */

const sheets = [];
const S = (title, note, ids, grid) => sheets.push({ title, note, ids, grid });

// ── materials ────────────────────────────────────────────────────────────────────
S('Bars, ores, logs & fire',
  'The SMELTED ladder bars — Bronze, Iron, Steel, Mithril, Cobalt, Runite, Starsteel, '
  + 'Gold, Silver — are one identical ingot in different metals: same shape, same angle, '
  + 'same highlight, colour is the only difference.\n\n'
  + 'The bars that are NOT smelted from ore — Voidsteel and Starfall — must NOT use that '
  + 'ingot shape. Give each its own form so it reads as rare on sight: Voidsteel a cracked '
  + 'jagged block with violet light in the fissures, Starfall a rough unfinished lump still '
  + 'white-hot with sparks lifting off it. Neither is a tidy cast ingot.\n\n'
  + 'Ores are lumpy raw rock with the metal showing in veins. Logs are cross-cut sections '
  + 'with visible end grain, not whole trees.',
  idsIn('bars','ores','logs','fire'), '6x5');
S('Gems — rough and cut', 'Rough gems are lumpy uncut mineral chunks with a crystalline face; cut gems are faceted and symmetrical with sharp highlights. The two groups must not look alike.',
  idsIn('gems_rough','gems_cut','gemcuts'), '6x6');
S('Herbs, produce & seeds', 'Herbs are cut sprigs with leaves and a stem. Seeds are small closed cloth pouches with a few seeds spilled at the mouth — the pouch colour is the only thing that separates them, so make it strong.',
  idsIn('herbs','produce','seeds'), '6x6');
S('Fish & cooked food', 'Raw fish are whole and wet-looking with a visible eye; cooked dishes are browned, charred or plated cuts. A cooked item must never look raw.',
  idsIn('fish','food'), '5x5');
S('Potions & reagents', 'Every potion is a stoppered glass bottle — vary the BOTTLE SHAPE as well as the liquid colour so they are told apart at 20px. Reagents are raw substances, not bottles.',
  idsIn('potions','reagents'), '6x6');
S('Monster drops', 'These are BODY PARTS AND TROPHIES, never the creature. A fang is one tooth. A claw is one claw. A scale is one flat scale. An eye is one eyeball. If the name contains an animal, the animal must not appear.',
  idsIn('drops','drops3'), '7x7');
S('Hunting hides', 'Each is a flat stretched pelt seen from directly above, four short leg flaps at the corners, a neck flap at the top. Just the empty skin — no head, no face, no animal. They differ ONLY by fur colour and marking.',
  idsIn('hunt_hides'), '5x4');
S('Sailing & the sea', 'Nautical salvage and sea materials. Nothing here is a ship or a scene — each is one small object recovered from the water.',
  idsIn('sailing'), '6x5');
S('Jewellery', 'Rings are open bands seen three-quarter with the hole clearly visible. Amulets and pendants hang from a visible chain. The gem is the accent, not the whole icon.',
  idsIn('jewellery'), '7x6');

// ── tools & outfits ──────────────────────────────────────────────────────────────
const tools = idsIn('tools');
S('Tools I — axes, picks, rods', 'One tool per cell, standing upright, nobody holding it. The HEAD shape says which tool it is; the tier says only what it is made of.',
  tools.slice(0, 32), '6x6');
S('Tools II — the rest', 'Same rules. A "rod" is a fishing rod: a long thin tapering pole with a line, not a staff and not a man holding one.',
  tools.slice(32), '6x6');
const outfits = idsIn('outfits');
S('Skilling outfits I', 'Empty clothing hanging on nothing, seen flat from the front. No body, no head, no mannequin. Each profession must read from its colour and its props.',
  outfits.slice(0, 24), '6x4');
S('Skilling outfits II', 'Same rules.', outfits.slice(24), '6x4');

/* ── armour ───────────────────────────────────────────────────────────────────────
   Two different jobs, so two different sheet shapes.

   The CRAFTED LADDER (bronze → starsteel) is supposed to be one design recoloured up
   the tiers — that is what a tier ladder is for, and Jordan is happy with it. So those
   are grouped BY SLOT: all seven helms on one sheet, all seven chests on the next.
   Drawing the whole tier run in one pass is the only reliable way to get seven pieces
   that are genuinely the same object in seven colours; asking for them set by set is
   what lets them drift.

   The UNIQUE sets are the opposite job. Those get a sheet each and a brief whose whole
   purpose is to make them share nothing with the ladder or with each other. */
const LADDER = ['bronze','iron','steel','mithril','cobalt','runite','starsteel'];
const LADDER_SLOTS = ['helm','chest','legs','gloves','boots','shield','buckler','cape'];
const LADDER_COLOUR = {
  bronze: 'warm reddish brown-gold', iron: 'dull grey, almost no shine',
  steel: 'bright polished silver', mithril: 'luminous sky blue',
  cobalt: 'deep vivid blue', runite: 'rich emerald green',
  starsteel: 'pale violet-white with a faint glow',
};
for (const slot of LADDER_SLOTS) {
  const ids = LADDER.map(t => t + '_' + slot).filter(id => byId[id]);
  if (!ids.length) continue;
  sheets.push({
    title: 'Crafted ladder — ' + slot + ' (7 tiers)',
    note: 'ONE design, seven colours. Every cell on this sheet is THE SAME OBJECT, drawn '
        + 'identically, differing only in metal colour. Do not restyle it up the tiers, do '
        + 'not add ornament to the later ones, do not change the silhouette. A player must '
        + 'see instantly that these are the same piece at seven ranks.\n\n'
        + 'The shared design: ' + (SLOT_LINE[slot] || '') + ' Clean symmetrical plate, a '
        + 'raised centre ridge, crisp bevelled edges, simple rivets. No engraving, no gems, '
        + 'no glow on any of them.',
    ids, grid: '4x2', ladder: true,
  });
}

const UNIQUE_SETS = ['voidsteel','gravesteel','moltensteel','barrow','dawnward','sunweave','emberforged'];
for (const k of UNIQUE_SETS) {
  const ids = setMembers(k); if (!ids.length) continue;
  sheets.push({ title: 'Unique set — ' + k, note: SET_BRIEF[k] || '', ids,
    grid: ids.length <= 4 ? '4x1' : ids.length <= 6 ? '3x2' : '4x2', armour: true });
}

/* Leather is its own ladder — same argument as the metal one, grouped by slot. */
const LEATHER = ['rough','chitin','wolf','ogre','troll','drake','demon','wraith','ember','void'];
for (const slot of ['helm','chest','legs','gloves','boots']) {
  const ids = LEATHER.map(t => t + '_' + slot).filter(id => byId[id]);
  if (!ids.length) continue;
  sheets.push({
    title: 'Leather ladder — ' + slot + ' (' + ids.length + ' hides)',
    note: 'ONE design, one per hide. Every cell is THE SAME PIECE in a different leather, '
        + 'differing only in hide colour and surface. LEATHER, never plate: soft supple '
        + 'material, visible stitching along every seam, buckled straps, rolled edges.\n\n'
        + (SLOT_LINE[slot] || ''),
    ids, grid: ids.length <= 5 ? '5x1' : '5x2', ladder: true,
  });
}
const emitted = new Set(); sheets.forEach(sh => sh.ids.forEach(i => emitted.add(i)));
const loose = gearIds.filter(id => SLOT.test(id) && !emitted.has(id));
S('Armour — one-off pieces', 'These do not belong to a set. Each needs its own look; do not make them match anything.', loose, '5x4');
const weapons = gearIds.filter(id => !SLOT.test(id));
for (let i = 0; i < weapons.length; i += 24) {
  S('Weapons ' + (Math.floor(i / 24) + 1), 'Each weapon stands upright, point or head at the top, filling the frame top to bottom, alone on nothing. The HEAD or BLADE shape says which weapon it is — a maul has a blunt block, an axe has a curved blade, a hammer is square. Nobody holding it, no hands, no arms.', weapons.slice(i, i + 24), '6x4');
}

/* The cured leathers — the tannery's output. Their own sheet because they are the one
   family where the INPUT and the OUTPUT must not look alike: the raw hides are flat
   stretched pelts, so these have to read as processed stock, not as skins. */
S('Cured leathers', 'These are the tannery OUTPUT, not the raw hides. Every one is the same '
  + 'object — a rolled bundle of tanned leather standing on end, tied round the middle with '
  + 'a cord — differing only in the leather. They must NOT look like the flat stretched '
  + 'pelts on the hides sheet; a player has to tell raw from cured at a glance.',
  idsIn('leather'), '5x2');

/* Anything the section logic did not place, PLUS the ids held out of finished sheets.
   Emitted last, and the coverage check below fails loudly if this misses anything. */
{
  const placed = new Set(); sheets.forEach(sh => sh.ids.forEach(i => placed.add(i)));
  const orphans = Object.keys(famOf).filter(id => !placed.has(id)).sort();
  if (orphans.length) {
    S('THE ONES WE MISSED — catch-up sheet',
      'These were left off sheets that are already drawn, so they need their own pass.\n\n'
      + 'Four of them belong with families you have already done — draw them to MATCH those\n'
      + 'sheets, not as a fresh style:\n'
      + '  · Cut Bloodstone and Void Shard must sit beside the cut gems on the gems sheet —\n'
      + '    same faceted treatment, same lighting, same size in frame.\n'
      + '  · Moonpetal and Riftmoss must sit beside the herbs — same botanical treatment.\n\n'
      + 'Nothing here is a new look. Consistency with the finished sheets is the whole job.',
      orphans, orphans.length <= 8 ? '4x2' : orphans.length <= 12 ? '4x3' : '6x5');
  }
}

// ── emit ─────────────────────────────────────────────────────────────────────────
let md = '# Item art — full redo prompt pack\n\n';
md += 'Paste **the style block** once at the start of a ChatGPT conversation, then feed it\n';
md += 'one sheet at a time. Save each result to the Desktop and I will slice it:\n\n';
md += '```bash\nnode _iconart/slice.js sheets/<name>.png sheets/<name>.txt --grid <cols>x<rows>\n```\n\n';
md += '`slice.js` does not read the captions — the ORDER in each list below is the contract.\n\n';
md += '---\n\n## The style block\n\n````\n' + MASTER + '\n````\n\n---\n\n';
md += '## Sheets\n\n| # | sheet | items | grid |\n|---|---|---|---|\n';
sheets.forEach((s, i) => { md += '| ' + (i + 1) + ' | ' + s.title + ' | ' + s.ids.length + ' | ' + s.grid + ' |\n'; });
md += '\n**' + sheets.reduce((a, s) => a + s.ids.length, 0) + ' items across ' + sheets.length + ' sheets.**\n\n---\n\n';

sheets.forEach((s, i) => {
  md += '### Sheet ' + (i + 1) + ' — ' + s.title + '\n\n';
  md += '`' + s.ids.length + ' items · grid ' + s.grid + '`\n\n';
  md += '````\n';
  md += 'SHEET: ' + s.title + '\n';
  md += 'Grid ' + s.grid + ', labelled, flat white background, house style as given.\n\n';
  if (s.note) md += s.note + '\n\n';
  if (s.armour) {
    md += 'SET LOOK — every piece on this sheet shares it:\n' + (SET_BRIEF[s.ids[0].replace(SLOT, '')] || s.note) + '\n\n';
    md += 'This set must NOT look like any other armour set in the game. The colour is the\n';
    md += 'least important part of its identity; the shapes are what separate it.\n\n';
    md += 'CELLS:\n';
    s.ids.forEach((id, k) => { const sl = slotOf(id);
      md += ' ' + String(k + 1).padStart(2) + '. ' + N(id).padEnd(26) + ' — ' + (SLOT_LINE[sl] || gist(id)) + '\n'; });
  } else {
    md += 'CELLS:\n';
    s.ids.forEach((id, k) => { md += ' ' + String(k + 1).padStart(2) + '. ' + N(id).padEnd(26) + ' — ' + gist(id) + '\n'; });
  }
  md += '````\n\n';
  md += '<details><summary>id order for <code>sheets/' + s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.txt</code></summary>\n\n```\n';
  s.ids.forEach(id => { md += id + '\n'; });
  md += '```\n</details>\n\n---\n\n';
});

fs.writeFileSync(path.join(__dirname, 'PROMPTS.md'), md);

// and write the id lists so slice.js can be pointed straight at them
const dir = path.join(__dirname, 'sheets'); fs.mkdirSync(dir, { recursive: true });
/* NEVER clobber a list that has already been reconciled against a real sheet. Once art
   comes back, its id list gets hand-adjusted — cells appended that ChatGPT added off the
   brief, `_spare` padding so the count matches the grid — and slice.js matches purely by
   POSITION. Rewriting one of those from the generator would silently shift every id by a
   cell and mislabel the whole sheet. The reconciled files are marked by "real" in their
   header comment; this refuses to touch them. */
let wrote = 0, kept = [];
sheets.forEach(s => {
  const f = s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.txt';
  const p = path.join(dir, f);
  if (fs.existsSync(p) && /^#.*\breal\b/.test(fs.readFileSync(p, 'utf8').split('\n')[0])) {
    kept.push(f); return;
  }
  fs.writeFileSync(p, '# ' + s.title + ' — grid ' + s.grid + '\n' + s.ids.join('\n') + '\n');
  wrote++;
});
if (kept.length) console.log('kept (already reconciled to real art): ' + kept.join(', '));
console.log('wrote ' + wrote + ' id lists');
console.log('PROMPTS.md: ' + sheets.length + ' sheets, ' + sheets.reduce((a, s) => a + s.ids.length, 0) + ' items');
console.log('id lists -> _iconart/sheets/');

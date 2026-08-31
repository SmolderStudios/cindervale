/* One bespoke description per item, plus the value flag that picks its backdrop.
 *
 * `pale: true` means the OBJECT is light-valued, so it gets a near-black backdrop
 * — a pale subject on white loses its edges and the key-out fill walks straight
 * into it. See recipe.js.
 *
 * Rules for writing these, all of them enforced by the 15px render size:
 *   - ONE object. Never "a pile of", never "three of". A pile is mud at 15px.
 *   - Name the SHAPE first, then the material, then the colour. The silhouette is
 *     the only thing that survives; colour is what separates tiers within a family.
 *   - Tier families share a silhouette on purpose (the game's own icon rule: one
 *     base shape, palette swaps per tier), so the logs are all the same cut billet
 *     and the bars are all the same ingot. Do not let a tier invent a new shape.
 */
'use strict';

const S = (id, p, opt) => Object.assign({ id, p }, opt || {});

/* ── logs: one short cut billet, bark on, end grain toward the viewer ────────── */
const LOGS = [
  S('pine_log',     'A single short cut log of pale pine, rough bark, pale cream end grain facing the viewer, resin sheen', { pale: true }),
  S('oak_log',      'A single short cut log of oak, deeply furrowed grey brown bark, warm honey end grain facing the viewer'),
  S('ironbark_log', 'A single short cut log of ironbark, hard slate grey plated bark, cold steel grey end grain facing the viewer'),
  S('ember_log',    'A single short cut log of emberwood, charred black bark cracked open with glowing orange embers in the fissures, hot amber end grain facing the viewer', { dark: true }),
  S('frost_log',    'A single short cut log of frostwood, frost rimed pale blue white bark, ice crystals along the pale end grain facing the viewer', { pale: true }),
  S('shadow_log',   'A single short cut log of shadowwood, near black bark drinking the light, faint violet end grain facing the viewer', { dark: true }),
  S('ancient_log',  'A single short cut log of ancient goldenwood, gnarled mossy bark veined with faint gold, luminous pale gold end grain facing the viewer', { pale: true }),
];

/* ── ores: one broken rock with the mineral showing in it ────────────────────────
   NEVER write "fist sized" here, or any other body part used as a scale reference.
   Z-Image drew it literally: copper_ore came back as a clenched human fist, and
   iron_ore picked up knuckle shapes that read as a face at 15px. Say "rough broken
   lump" and let the framing carry the scale. */
const ORES = [
  S('copper_ore',    'A single rough broken lump of raw copper ore, grey rock studded with bright orange copper mineral and green verdigris'),
  S('tin_ore',       'A single rough broken lump of raw tin ore, grey rock studded with dull silver white metallic flecks', { pale: true }),
  S('iron_ore',      'A single rough broken lump of raw iron ore, grey rock heavy with rust red oxidised iron'),
  S('coal',          'A single rough broken lump of coal, glossy black fractured facets catching a hard highlight', { dark: true }),
  S('gold_ore',      'A single rough broken lump of raw gold ore, grey quartz rock laced with bright yellow gold veins'),
  S('mithril_ore',   'A single rough broken lump of raw mithril ore, dark rock laced with luminous sky blue metallic veins', { dark: true }),
  S('silver_ore',    'A single rough broken lump of raw silver ore, pale grey rock threaded with bright white silver veins', { pale: true }),
  S('cobalt_ore',    'A single rough broken lump of raw cobalt ore, pale grey rock threaded with vivid bright cobalt blue mineral', { dark: true }),
  S('runite_ore',    'A single rough broken lump of raw runite ore, dark rock threaded with glowing emerald green metal'),
  S('starsteel_ore', 'A single rough broken lump of raw starsteel ore, dark meteoric rock shot through with pale violet white metal and tiny star glints', { dark: true }),
  S('gem_dust',      'A small conical heap of fine sparkling gem dust, prismatic pale glitter', { pale: true }),
];

/* ── bars: one long ingot, lying flat, same casting every tier ─────────────────
   "trapezoid bar shape" was the bug. It reads as the END PROFILE, so cobalt came
   back as a tub seen end-on and runite, mithril and silver as cubes and slabs —
   Jordan's note that four of the ten "don't look like a bar". The shape has to be
   stated as a LENGTH: long, lying flat, seen from a raised three quarter angle.
   Every tier shares this sentence verbatim; only the metal words after it change,
   which is what keeps the ladder reading as one family. */
const BAR = 'A single long rectangular cast metal ingot lying flat, clearly longer than it is'
  + ' wide, gently tapered sides and a flat top face, seen from a raised three quarter angle,';
const BARS = [
  S('bronze_bar',     BAR + ' warm reddish bronze, softly polished top face'),
  S('iron_bar',       BAR + ' dull dark grey iron, hammered surface'),
  S('steel_bar',      BAR + ' cool blue grey polished steel', { pale: true }),
  S('gold_bar',       BAR + ' rich yellow gold, mirror bright top face', { pale: true }),
  S('silver_bar',     BAR + ' bright white silver, mirror bright top face', { pale: true }),
  S('mithril_bar',    BAR + ' luminous sky blue mithril with a faint inner glow'),
  S('cobalt_bar',     BAR + ' vivid bright cobalt blue metal'),
  S('runite_bar',     BAR + ' glowing emerald green metal'),
  S('starsteel_bar',  BAR + ' pale violet white metal with tiny star glints', { pale: true }),
  S('starfall_bar',   BAR + ' molten white gold metal wreathed in faint falling sparks', { pale: true }),
];

/* ── fish: one whole fish, side on, head to the left ─────────────────────────── */
const FISH = [
  S('raw_minnow',    'A single small silver minnow fish, side on, head to the left, bright pale scales', { pale: true }),
  S('raw_sardine',   'A single sardine fish, side on, head to the left, blue green back and silver belly', { pale: true }),
  S('raw_trout',     'A single speckled brown trout, side on, head to the left, olive back with rust spots'),
  S('raw_tuna',      'A single tuna, side on, head to the left, steel blue back, muscular torpedo body'),
  S('raw_salmon',    'A single salmon, side on, head to the left, silver flank flushed pink'),
  S('raw_swordfish', 'A single swordfish with its long flat bill, side on, head to the left, dark blue back', { dark: true }),
  S('raw_shark',     'A single small shark, side on, head to the left, slate grey back and pale belly'),
  S('raw_voideel',   'A single eel of living shadow, side on, head to the left, near black body with faint violet glow along its length', { dark: true }),
];

/* ── herbs: one sprig or cap, never a bunch ──────────────────────────────────── */
const HERBS = [
  S('wildberries',  'A single small cluster of deep red wild berries on a short green stem with two leaves'),
  S('bloodcap',     'A single mushroom with a deep blood red domed cap and a pale stalk'),
  S('thornvine',    'A single curling length of thorny green vine, sharp black thorns'),
  S('witchhazel',   'A single sprig of witch hazel, spidery yellow ribbon petals on a grey twig', { pale: true }),
  S('dewleaf',      'A single broad green leaf beaded with bright dew drops'),
  S('frostcrocus',  'A single pale ice blue crocus flower, frost on its petals', { pale: true }),
  S('emberbloom',   'A single flower with glowing ember orange petals, faint smoke curling from it'),
  S('nightshade',   'A single sprig of nightshade, small dark purple bell flowers and a black berry', { dark: true }),
  S('sunroot',      'A single golden yellow taproot with fine hairs, cut top showing bright flesh', { pale: true }),
  S('ashbloom',     'A single grey white ash coloured flower, powdery petals', { pale: true }),
  S('starfern',     'A single frond of fern with tiny luminous pale blue star lights along it'),
  S('tearmoss',     'A single tuft of soft blue green moss beaded with clear droplets'),
  S('moonpetal',    'A single luminous white moon flower with a pale silver glow', { pale: true }),
  S('voidmoss',     'A single tuft of near black moss shot with faint violet light', { dark: true }),
];

/* ── firemaking oddments ─────────────────────────────────────────────────────── */
const FIRE = [
  S('charcoal',   'A single stick of charcoal, matte black charred wood, one broken end', { dark: true }),
  S('ember_dust', 'A small conical heap of glowing ember orange dust, hot sparks rising from it'),
  S('driftwood',  'A single piece of sea bleached driftwood, smooth pale twisted grain', { pale: true }),
  S('deep_amber', 'A single teardrop of deep amber resin, warm translucent orange gold with a trapped spark inside'),
];

/* ── gems: rough first, then the faceted cut of the same stone ───────────────── */
const GEMS_ROUGH = [
  S('sapphire',     'A single rough uncut sapphire crystal, deep blue, rocky matrix still on one side'),
  S('emerald',      'A single rough uncut emerald crystal, deep green, rocky matrix still on one side'),
  S('ruby',         'A single rough uncut ruby crystal, vivid bright scarlet red, rocky matrix still on one side'),
  S('diamond',      'A single rough uncut diamond crystal, clear white, rocky matrix still on one side', { pale: true }),
  S('amethyst',     'A single rough uncut amethyst crystal, violet purple, rocky matrix still on one side'),
  S('dragon_gem',   'A single rough uncut dragonstone crystal, molten orange red with an inner fire, rocky matrix on one side'),
  S('bloodstone',   'A single rough uncut bloodstone, dark green stone flecked with blood red, rocky matrix on one side', { dark: true }),
  S('void_crystal', 'A single rough uncut void crystal, near black with violet light trapped inside, rocky matrix on one side', { dark: true }),
  S('pearl',        'A single large round pearl, soft iridescent white lustre', { pale: true }),
];

const GEMS_CUT = [
  S('cut_sapphire',   'A single brilliant cut sapphire gemstone, deep blue, sharp facets catching light'),
  S('cut_emerald',    'A single emerald cut gemstone, deep green, sharp step facets catching light'),
  S('cut_ruby',       'A single brilliant cut ruby gemstone, deep red, sharp facets catching light'),
  S('cut_diamond',    'A single brilliant cut diamond, clear white, sharp facets throwing prismatic sparks', { pale: true }),
  S('cut_amethyst',   'A single brilliant cut amethyst gemstone, violet purple, sharp facets catching light'),
  S('cut_dragon',     'A single brilliant cut dragonstone, molten orange red with inner fire, sharp facets'),
  S('cut_bloodstone', 'A single cabochon cut bloodstone, polished dark green domed stone flecked blood red', { dark: true }),
  S('cut_void',       'A single brilliant cut void gemstone, near black with violet light in its depths, sharp facets', { dark: true }),
  S('void_shard',     'A single jagged shard of void glass, near black with violet light along its broken edges', { dark: true }),
];

/* Batch 2 lives in its own file purely for length; merging here means every tool
   — gen, key, verify, sheet, picker, pack — sees one list and needs no change. */
const BATCH2 = require('./subjects2').FAMILIES;

const FAMILIES = Object.assign({
  logs: LOGS, ores: ORES, bars: BARS, fish: FISH,
  herbs: HERBS, fire: FIRE, gems_rough: GEMS_ROUGH, gems_cut: GEMS_CUT,
}, BATCH2);

/* An id drawn twice would silently overwrite one of the two in every downstream
   map, and nothing else would complain. */
(function(){
  const seen = new Set();
  for (const fam of Object.values(FAMILIES)) for (const s of fam) {
    if (seen.has(s.id)) throw new Error('duplicate subject id: ' + s.id);
    seen.add(s.id);
  }
})();

const ALL = Object.values(FAMILIES).flat();

/* A cheap guard: an id that is not a real item would generate art nothing can use. */
function verifyAgainst(itemsJsonPath) {
  const rows = require(itemsJsonPath);
  const known = new Set(rows.map(r => r.id));
  const missing = ALL.filter(s => !known.has(s.id)).map(s => s.id);
  return missing;
}

module.exports = { FAMILIES, ALL, verifyAgainst };

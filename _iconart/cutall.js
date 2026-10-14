/* Re-cut EVERY contact sheet into raw/, in one command.
 *
 *     node _iconart/cutall.js            all sheets
 *     node _iconart/cutall.js bars gems  just those
 *     node _iconart/cutall.js --list     print the plan and stop
 *
 * The per-sheet geometry is the part that cannot be re-derived from the files: a
 * layout is a fact about a picture Jordan generated in a chat window, and reading it
 * back off the image takes a person looking at it. Recording it here is what makes a
 * slicer change — the caption trim, the run-count text test — a one-line re-run
 * instead of an afternoon of re-measuring.
 *
 * ORDER MATTERS. Later sheets overwrite earlier ones, and two pairs deliberately
 * overlap: the gems sheet re-draws four ores that also appear on the bars sheet, and
 * `hides2` is a later pass over the same nineteen pelts as `pelts3`. In both cases
 * the newer upload wins, so it is cut last. Check the upload times in
 * `Desktop/cindervale icons` before reordering anything.
 *
 * Three kinds of entry:
 *   rowcols  — items per row; column edges are MEASURED inside each row. The default,
 *              and right for any sheet whose rows are evenly spaced vertically.
 *   grid     — a plain COLSxROWS division, for ruled tables and evenly packed sheets.
 *   rows     — explicit y bands (and sometimes x edges), for sheets whose row pitch
 *              wanders: an equal division puts a cut through the artwork on some rows
 *              and not others, which is worse than either being wrong everywhere.
 */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const S = 'sheets/';

/* A RULED sheet cut one cell at a time (the gear half of Magic, 0.9.127.11). `xs` and
   `ys` are the rules as measured, each [first, last] pixel of its dark core; every
   cell becomes its own 1x1 cut that starts 2 px past one rule and stops 3 px short of
   the next. Measured on all six of those sheets: a rule's soft edge is one pixel
   wide, so 2 px takes none of it, and less is cut from the art than any --inset
   would take (on sheet P the Gravecall Staff runs to 3 px from the frame).
   A `_spare` id is a cell the sheet leaves empty: it is skipped, not cut. */
function ruled(ids, xs, ys) {
  const L = ids.split(/\s+/).filter(Boolean), rows = [];
  let k = 0;
  for (let r = 0; r + 1 < ys.length; r++) for (let c = 0; c + 1 < xs.length && k < L.length; c++, k++) {
    if (L[k].startsWith('_spare')) continue;
    rows.push({ ids: L[k], crop: [xs[c][1] + 2, ys[r][1] + 2, xs[c + 1][0] - 2, ys[r + 1][0] - 2].join(','), grid: '1x1' });
  }
  if (k !== L.length) throw new Error('ruled(): ' + L.length + ' ids for ' + k + ' cells');
  return rows;
}

const PLAN = [

  /* ---- plain sheets, rows evenly spaced ------------------------------------ */
  { name: 'bars',     sheet: 'bars.png',     ids: 'bars-ores-logs-fire.txt',  rowcols: [6,6,6,6,6,1] },
  { name: 'gems',     sheet: 'gems.png',     ids: 'gems-rough-and-cut.txt',   rowcols: [6,6,6,6,6,5] },
  { name: 'herbs',    sheet: 'herbs.png',    ids: 'herbs-produce-seeds.txt',  rowcols: [6,6,6,6,6,4] },
  { name: 'potions',  sheet: 'potions.png',  ids: 'potions-reagents.txt',     rowcols: [6,6,6,7,5,2] },
  { name: 'food',     sheet: 'food.png',     ids: 'fish-cooked-food.txt',     rowcols: [5,5,5,5,5,5,1] },
  { name: 'tools1',   sheet: 'tools1.png',   ids: 'tools-i-axes-picks-rods.txt', rowcols: [6,6,6,6,6,2] },
  { name: 'tools2',   sheet: 'tools2.png',   ids: 'tools-ii-the-rest.txt',    rowcols: [6,6,6,6,6,4] },
  { name: 'sailing',  sheet: 'sailing.png',  ids: 'sailing-the-sea.txt',      rowcols: [6,6,6,6,7] },
  { name: 'jewel',    sheet: 'jewellery.png',ids: 'jewellery.txt',            rowcols: [7,7,7,7,7,5] },
  { name: 'outfits1', sheet: 'outfits1.png', ids: 'skilling-outfits-i.txt',   rowcols: [6,6,6,6] },
  { name: 'outfits2', sheet: 'outfits2.png', ids: 'skilling-outfits-ii.txt',  rowcols: [6,6,6,6] },

  /* ---- pelts. pelts3 first, hides2 (the later upload) last ------------------ */
  { name: 'pelts3',   sheet: 'pelts3.png',   ids: 'hunting-hides.txt',        rowcols: [5,5,5,4] },
  { name: 'hides2',   sheet: 'hides2.png',   ids: 'hides.txt',                grid: '5x4' },

  /* ---- crafted ladder: one sheet per slot, 4 over 3 ------------------------- */
  { name: 'ld_helm',  sheet: 'lad_helm.png', ids: 'crafted-ladder-helm-7-tiers-.txt',    rowcols: [4,3] },
  { name: 'ld_cape',  sheet: 'lad_cape.png', ids: 'crafted-ladder-cape-7-tiers-.txt',    rowcols: [4,3] },
  { name: 'ld_buck',  sheet: 'lad_buckler.png', ids: 'crafted-ladder-buckler-7-tiers-.txt', rowcols: [4,3] },
  { name: 'ld_shld',  sheet: 'lad_shield.png',  ids: 'crafted-ladder-shield-7-tiers-.txt',  rowcols: [4,3] },

  /* ---- unique sets --------------------------------------------------------- */
  { name: 'gravesteel',  sheet: 'set_gravesteel.png',  ids: 'unique-set-gravesteel.txt',  rowcols: [3,3] },
  /* The last two sets to be drawn — prompts are in PROMPTS.md. */
  { name: 'barrow',      sheet: 'set_barrow.png',      ids: 'unique-set-barrow.txt',      rowcols: [3,3] },
  /* Drawn as a ruled table, so crop inside the frame — the corner pixels sit ON the
     black rule and the backdrop detector would read the sheet as a dark one. */
  { name: 'emberforged', sheet: 'set_emberforged.png', ids: 'unique-set-emberforged.txt',
    grid: '2x1', inset: 8, crop: '4,4,1770,882' },
  { name: 'voidsteel',   sheet: 'set_voidsteel.png',   ids: 'unique-set-voidsteel.txt',   rowcols: [4,3] },
  { name: 'moltensteel', sheet: 'set_moltensteel.png', ids: 'unique-set-moltensteel.txt', rowcols: [4,3] },
  { name: 'dawnward',    sheet: 'set_dawnward.png',    ids: 'unique-set-dawnward.txt',    rowcols: [4] },
  /* Sunweave's four garments trail tassels that close the gaps between them, so the
     measured gutters put two edges inside one robe. Column edges given outright. */
  { name: 'sunweave',    sheet: 'set_sunweave.png',    ids: 'unique-set-sunweave.txt',
    grid: '4x1', colx: '27,486,1042,1493,1945', crop: '0,40,1983,770' },

  /* ---- ruled tables: the rules sit on the cell edges, so inset past them ---- */
  { name: 'w1', sheet: 'w1.png', ids: 'weapons-1.txt', grid: '6x4', inset: 8, crop: '2,2,1534,1022' },
  { name: 'w2', sheet: 'w2.png', ids: 'weapons-2.txt', grid: '6x4', inset: 8, crop: '2,2,1534,1022' },
  { name: 'w3', sheet: 'w3.png', ids: 'weapons-3.txt', grid: '6x4', inset: 8, crop: '2,2,1534,1022' },
  { name: 'w4', sheet: 'w4.png', ids: 'weapons-4.txt', grid: '5x1', inset: 8, crop: '2,2,1534,418' },
  { name: 'cured',    sheet: 'curedleather.png', ids: 'cured-leathers.txt', grid: '5x2', inset: 8, crop: '4,4,1980,789' },
  { name: 'leftover', sheet: 'leftovers.png',    ids: 'the-ones-we-missed-catch-up-sheet.txt', grid: '4x1', inset: 8, crop: '4,4,1770,450' },
  /* The Spire's three sheets (0.9.124.27). Ruled 2x2 tables at 1254px, so crop
     inside the outer rule and inset past the centre cross. */
  { name: 'spire_spoils', sheet: 'spire_spoils.png', ids: 'spire_spoils.txt', grid: '2x2', inset: 8, crop: '4,4,1250,1250' },
  { name: 'spire_procs',  sheet: 'spire_procs.png',  ids: 'spire_procs.txt',  grid: '2x2', inset: 8, crop: '4,4,1250,1250' },
  { name: 'spire_gear',   sheet: 'spire_gear.png',   ids: 'spire_gear.txt',   grid: '2x2', inset: 8, crop: '4,4,1250,1250' },
  /* The gauntlets' two-line caption fooled the caption trim into cutting the pair
     down to its cuffs. Given a crop of their own that stops above the caption, and
     cut after the sheet so it wins. */
  /* The nine Sundered Spire natives (0.9.124.28). Ruled 3x3 at 1254px, MONSTER art:
     keyed at 256px into cut_mon/ and packed into ART_MON, not the item block. */
  { name: 'spire_natives', sheet: 'spire_natives.png', ids: 'spire_natives.txt', grid: '3x3', inset: 8, crop: '4,4,1250,1250' },
  /* THE 57 ZONE MONSTERS ARE NOT CUT HERE ANY MORE. Use:
       node _iconart/_monseg.js              (writes cut_mon/ straight at 256px)
     The twelve rectangle entries that used to sit here were measured by hand and
     every one of the three defects Jordan reported on 2026-09-12 came out of the
     rectangle itself, not the measurement:
       a band edge is one straight line across the sheet, so a creature hanging
       below it lost everything under the line (the rat queen, the ogre seer);
       a rectangle keeps whatever else falls inside it, so a neighbour's wing tip
       and the caption ChatGPT paints under a cell ("Ogre Grunt") rode along;
       and key.js only de-mattes pixels brighter than its own 214 backdrop cut, so
       the antialiased ramp kept full opacity and put a white rind on nearly all
       of them.
     _monseg.js keys the page, labels every blob of ink, drops the caption glyphs,
     groups the blobs per creature and draws only that creature's own pixels. A
     shape cannot clip itself and cannot carry a neighbour it is not joined to. */
  { name: 'spire_gauntlets', sheet: 'spire_gear.png', rows: [
    { ids: 'stonewright_gauntlets', crop: '632,632,1250,1112', grid: '1x1' },
  ]},

  /* ---- sheets whose ROW PITCH wanders: explicit bands ----------------------- */
  /* The crafted ladder arrived as a labelled matrix, 7 tiers across by 4 slots down,
     with a header row and a label column that are not cells. Row heights differ by up
     to 40px because each slot's artwork is a different shape. */
  { name: 'matrix', sheet: 'ladder_matrix.png', rows: [
    { ids: 'bronze_legs iron_legs steel_legs mithril_legs cobalt_legs runite_legs starsteel_legs', crop: '105,59,1505,297', grid: '7x1' },
    { ids: 'bronze_chest iron_chest steel_chest mithril_chest cobalt_chest runite_chest starsteel_chest', crop: '105,297,1505,546', grid: '7x1' },
    { ids: 'bronze_gloves iron_gloves steel_gloves mithril_gloves cobalt_gloves runite_gloves starsteel_gloves', crop: '105,546,1505,743', grid: '7x1' },
    { ids: 'bronze_boots iron_boots steel_boots mithril_boots cobalt_boots runite_boots starsteel_boots', crop: '105,743,1505,960', grid: '7x1' },
  ]},

  /* Leather ladder: 5 hides across, 5 slots down, drawn as a ruled table with a header
     row of hide names and a label column of slot names. Rules measured with _lines.js. */
  { name: 'leather1', sheet: 'leather1.png', inset: 6, grid: '5x1', rows: [
    { ids: 'rough_helm chitin_helm wolf_helm ogre_helm troll_helm',           crop: '87,59,1308,285' },
    { ids: 'rough_chest chitin_chest wolf_chest ogre_chest troll_chest',      crop: '87,287,1308,517' },
    { ids: 'rough_legs chitin_legs wolf_legs ogre_legs troll_legs',           crop: '87,519,1308,757' },
    { ids: 'rough_boots chitin_boots wolf_boots ogre_boots troll_boots',      crop: '87,759,1308,964' },
    { ids: 'rough_gloves chitin_gloves wolf_gloves ogre_gloves troll_gloves', crop: '87,966,1308,1185' },
  ]},
  { name: 'leather2', sheet: 'leather2.png', inset: 6, grid: '5x1', rows: [
    { ids: 'drake_helm demon_helm wraith_helm ember_helm void_helm',           crop: '87,61,1308,288' },
    { ids: 'drake_chest demon_chest wraith_chest ember_chest void_chest',      crop: '87,292,1308,517' },
    { ids: 'drake_legs demon_legs wraith_legs ember_legs void_legs',           crop: '87,522,1308,757' },
    { ids: 'drake_boots demon_boots wraith_boots ember_boots void_boots',      crop: '87,761,1308,961' },
    { ids: 'drake_gloves demon_gloves wraith_gloves ember_gloves void_gloves', crop: '87,965,1308,1173' },
  ]},

  /* One-off armour: ruled 5x4, but the four rows are 249 / 267 / 255 / 299 tall. Bands
     stop above each caption rather than below it — a caption inside the crop is only
     ever removed by the trim heuristics, and not needing them is better. */
  { name: 'oneoff', sheet: 'oneoff.png', inset: 7, grid: '5x1', rows: [
    { ids: 'abyssal_aegis bone_plate_cuirass chitin_plate cinderweave_cowl dawnsteel_buckler', crop: '4,14,1211,263' },
    { ids: 'elk_striders emberhide_vest graveshroud_vest lynx_bracers pack_alpha_cape',        crop: '4,314,1211,581' },
    { ids: 'pack_leader_vest ratskin_cape rhino_bulwark riftshadow_cowl silkwoven_cape',       crop: '4,633,1211,888' },
    { ids: 'voidforged_greaves warband_cape warlord_bulwark wraithbound_cowl wraithweave_cape',crop: '4,930,1211,1229' },
  ]},

  /* Monster drops: 7 across, eleven rows, and the row pitch drifts from 113 to 130px
     because the artwork heights differ. Both the y bands and the x edges are measured
     per row (see _prof.js / _colsin.js); the last two rows overlap vertically, so the
     seven items of row 10 are cut one at a time. */
  { name: 'drops', sheet: 'drops.png', rows: [
    { ids: 'alpha_claw ancient_bone barrow_dust beast_sinew bone_charm brimstone chitin', crop: '0,15,1254,123', grid: '7x1', colx: '17,188,364,545,708,877,1055,1227' },
    { ids: 'chitin_shard cinder_gland crown_fragment crude_cleaver cursed_dust dawnshard dragon_fang', crop: '0,152,1254,255', grid: '7x1', colx: '18,184,363,541,692,890,1042,1226' },
    { ids: 'dragonheart drakeforged_rune ectoplasm ember_crest ember_dust emberweave emberwyrm_eye', crop: '0,281,1254,381', grid: '7x1', colx: '16,186,347,534,700,870,1058,1227' },
    { ids: 'frostfur gem_dust gnawed_bone goblin_ear goblin_tooth gorestone granite_core', crop: '0,409,1254,503', grid: '7x1', colx: '13,178,352,524,695,856,1041,1219' },
    { ids: 'granite_sigil grave_iron gull_egg hellheart howling_horn infernal_crest lich_phylactery', crop: '0,531,1254,629', grid: '7x1', colx: '17,168,358,511,676,862,1039,1223' },
    { ids: 'molten_bar moonstone_eye mountain_heart ogre_tusk pack_eye rat_fang rat_tail', crop: '0,656,1254,744', grid: '7x1', colx: '17,184,344,514,691,857,1027,1213' },
    { ids: 'rib_plate riftshard rock_salt royal_rat_sigil runed_bone rusted_blade seer_idol', crop: '0,766,1254,857', grid: '7x1', colx: '17,183,340,512,675,862,1054,1214' },
    { ids: 'shade_ember shaman_tooth silken_sigil soul_shard spider_silk spinneret splintered_club', crop: '0,884,1254,965', grid: '7x1', colx: '23,181,327,517,668,864,1039,1223' },
    { ids: 'tanned_hide tribal_fetish troll_blood tyrant_heart venom_sac void_cinder voidheart', crop: '0,989,1254,1074', grid: '7x1', colx: '16,183,343,488,679,855,1037,1213' },
    { ids: 'voidsteel_bar',   crop: '15,1094,168,1172',   grid: '1x1' },
    { ids: 'voidweave',       crop: '168,1094,338,1172',  grid: '1x1' },
    { ids: 'warchief_banner', crop: '338,1094,502,1188',  grid: '1x1' },
    { ids: 'warhound_fang',   crop: '502,1094,670,1172',  grid: '1x1' },
    { ids: 'warlord_aegis',   crop: '670,1094,852,1196',  grid: '1x1' },
    { ids: 'warlord_totem',   crop: '852,1094,1044,1196', grid: '1x1' },
    { ids: 'wolf_fang',       crop: '1044,1094,1211,1172',grid: '1x1' },
    { ids: 'wraithcloth',     crop: '12,1188,176,1233',   grid: '1x1' },
    { ids: 'wyrmscale',       crop: '176,1188,290,1233',  grid: '1x1' },
  ]},

  /* ---- Magic and Runecrafting (0.9.127.6): fourteen sheets, 87 icons ---------
     Captioned sheets with clean blank rows between each row of artwork and its
     caption (measured: the art bands and the caption bands never touch). So every
     row is given as a band that stops above its caption, the columns are found
     inside it (rowcols: the second row holds three, spaced to nothing in particular
     on the cloth and staves sheets), and nothing is trimmed (noeat).
     noeat is not optional here. The caption trim reads "text" as many short ink runs
     in a row, and four hanging tails on a pair of wraps are exactly that: the first
     cut took the tails off every wrap, straight across.
     The banner (rn_banner.png) is not cut here; banner.js takes it whole. */
  { name: 'mg_runes', sheet: 'mg_runes.png', noeat: true, rows: [
    { ids: 'runestone ash_rune soot_rune char_rune cinder_rune', crop: '0,84,1536,424', rowcols: [5] },
    { ids: 'kiln_rune forge_rune crucible_rune starfall_rune',   crop: '0,546,1536,878', rowcols: [4] },
  ]},
  { name: 'mg_wands', sheet: 'mg_wands.png', noeat: true, rows: [
    { ids: 'pine_wand oak_wand ironbark_wand ember_wand', crop: '0,37,1536,424', rowcols: [4] },
    { ids: 'frost_wand shadow_wand ancient_wand',         crop: '0,538,1536,925', rowcols: [3] },
  ]},
  { name: 'mg_staves', sheet: 'mg_staves.png', noeat: true, rows: [
    { ids: 'pine_staff oak_staff ironbark_staff ember_staff', crop: '0,0,1224,580', rowcols: [4] },
    { ids: 'frost_staff shadow_staff ancient_staff',          crop: '0,629,1224,1215', rowcols: [3] },
  ]},
  { name: 'mg_cloth', sheet: 'mg_cloth.png', noeat: true, rows: [
    { ids: 'linen spidersilk gravecloth rimeweave', crop: '0,98,1536,406', rowcols: [4] },
    { ids: 'seercloth stoneweave wyrmsilk',         crop: '0,539,1536,861', rowcols: [3] },
  ]},
  { name: 'mg_hood', sheet: 'mg_hood.png', noeat: true, rows: [
    { ids: 'linen_hood spidersilk_hood gravecloth_hood rimeweave_hood', crop: '0,27,1536,440', rowcols: [4] },
    { ids: 'seercloth_hood stoneweave_hood wyrmsilk_hood',              crop: '0,534,1536,942', rowcols: [3] },
  ]},
  { name: 'mg_robe', sheet: 'mg_robe.png', noeat: true, rows: [
    { ids: 'linen_robe spidersilk_robe gravecloth_robe rimeweave_robe', crop: '0,17,1536,436', rowcols: [4] },
    { ids: 'seercloth_robe stoneweave_robe wyrmsilk_robe',              crop: '0,514,1536,936', rowcols: [3] },
  ]},
  { name: 'mg_leggings', sheet: 'mg_leggings.png', noeat: true, rows: [
    { ids: 'linen_leggings spidersilk_leggings gravecloth_leggings rimeweave_leggings', crop: '0,16,1536,410', rowcols: [4] },
    { ids: 'seercloth_leggings stoneweave_leggings wyrmsilk_leggings',                  crop: '0,492,1536,893', rowcols: [3] },
  ]},
  { name: 'mg_wraps', sheet: 'mg_wraps.png', noeat: true, rows: [
    { ids: 'linen_wraps spidersilk_wraps gravecloth_wraps rimeweave_wraps', crop: '0,37,1536,421', rowcols: [4] },
    { ids: 'seercloth_wraps stoneweave_wraps wyrmsilk_wraps',               crop: '0,511,1536,893', rowcols: [3] },
  ]},
  { name: 'mg_slippers', sheet: 'mg_slippers.png', noeat: true, rows: [
    { ids: 'linen_slippers spidersilk_slippers gravecloth_slippers rimeweave_slippers', crop: '0,136,1536,425', rowcols: [4] },
    { ids: 'seercloth_slippers stoneweave_slippers wyrmsilk_slippers',                  crop: '0,556,1536,853', rowcols: [3] },
  ]},
  /* No captions on these three. */
  { name: 'mg_elements', sheet: 'mg_elements.png', noeat: true, rows: [
    { ids: 'el_fire el_frost el_storm el_shadow', crop: '0,20,2172,681', rowcols: [4] },
  ]},
  { name: 'rn_skill', sheet: 'rn_skill.png', noeat: true, rows: [
    { ids: 'runecrafting', crop: '0,0,1254,1254', grid: '1x1' },
  ]},
  { name: 'rn_cape', sheet: 'rn_cape.png', noeat: true, rows: [
    { ids: 'cape_runecrafting', crop: '0,0,1145,1374', grid: '1x1' },
  ]},
  /* The sixteen tree plates: four rows of four, no captions, the rows a few pixels
     apart (the third and fourth are ONE blank row apart, at y 890). These are node
     art, not item art: packed at 112px through picks_nodes and injectnodes.js. */
  { name: 'rn_nodes', sheet: 'rn_nodes.png', noeat: true, rows: [
    { ids: 'rn_speed rn_xp rn_double rn_save',         crop: '0,8,1271,315', rowcols: [4] },
    { ids: 'rn_batch rn_acc rn_thrift rn_dmg',         crop: '0,316,1271,605', rowcols: [4] },
    { ids: 'rn_sure rn_bind rn_brand rn_gm_speed',     crop: '0,606,1271,890', rowcols: [4] },
    { ids: 'rn_gm_xp rn_gm_save rn_endless rn_cape',   crop: '0,890,1271,1208', rowcols: [4] },
  ]},

  /* ---- Magic, the gear half (0.9.127.11): six sheets, 46 icons ----------------
     Sheets O to T of PROMPTS-magic.md. Five came back as ruled tables and one (the
     Sunder Rune) as a single picture. None has captions, so each cell was checked
     against its prompt's description instead: all six are in the prompt's order.
     Rules measured with a 93%-dark line test; see ruled() above. */
  { name: 'mg_finds_zone', sheet: 'mg_finds_zone.png', noeat: true, rows: ruled(
    'gnawbone_wand briarwood_wand webspinner_staff fetish_staff gravecaller frostbrand_staff moonhowl_wand seers_eye mossheart_wand cinderspine ashglass_staff brimstone_sceptre',
    [[0,0],[362,363],[724,724],[1086,1087],[1447,1447]], [[0,0],[361,361],[717,717],[1085,1085]]) },
  /* Five across and two down, the last cell empty. */
  { name: 'mg_finds_raid', sheet: 'mg_finds_raid.png', noeat: true, rows: ruled(
    'gravecall_staff barrow_wand slagfire_staff emberglass_wand riftcaller nullspire_wand dawncaller starcall_wand faultline _spare',
    [[0,0],[356,357],[710,710],[1063,1064],[1417,1418],[1772,1773]], [[0,0],[442,443],[885,886]]) },
  { name: 'mg_sunder', sheet: 'mg_sunder.png', noeat: true, rows: [
    { ids: 'sunder_rune', crop: '0,0,1322,1190', grid: '1x1' },
  ]},
  { name: 'mg_raidrobes', sheet: 'mg_raidrobes.png', noeat: true, rows: ruled(
    'runebound_hood runebound_robe runebound_leggings runebound_wraps runebound_slippers '
    + 'drakerune_hood drakerune_robe drakerune_leggings drakerune_wraps drakerune_slippers '
    + 'riftwoven_hood riftwoven_robe riftwoven_leggings riftwoven_wraps riftwoven_slippers',
    [[0,0],[307,308],[614,615],[921,921],[1228,1228],[1535,1535]], [[0,0],[341,341],[682,682],[1023,1023]]) },
  { name: 'mg_dawnveil', sheet: 'mg_dawnveil.png', noeat: true, rows: ruled(
    'dawnveil_hood dawnveil_robe dawnveil_leggings dawnveil_slippers',
    [[0,1],[542,543],[1085,1086],[1628,1629],[2170,2171]], [[0,1],[722,723]]) },
  { name: 'mg_wyrd', sheet: 'mg_wyrd.png', noeat: true, rows: ruled(
    'wyrd_chip wyrd_polish wyrd_flaw arcane_draught_1 arcane_draught_2',
    [[0,0],[434,434],[868,869],[1302,1303],[1737,1737],[2171,2171]], [[0,0],[723,723]]) },
];

const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const LIST = process.argv.includes('--list');
const TMP = path.join(__dirname, 'sheets', '_cutall.txt');

function slice(sheet, idsFile, opts) {
  const argv = [path.join(__dirname, 'slice.js'), S + sheet, S + idsFile];
  if (opts.grid) argv.push('--grid', opts.grid);
  if (opts.rowcols) argv.push('--rowcols', opts.rowcols.join(','));
  if (opts.colx) argv.push('--colx', opts.colx);
  if (opts.crop) argv.push('--crop', opts.crop);
  if (opts.inset) argv.push('--inset', String(opts.inset));
  if (opts.noeat) argv.push('--noeat');
  if (LIST) { console.log('    node ' + argv.map(a => path.basename(a)).join(' ')); return 0; }
  const out = execFileSync('node', argv, { encoding: 'utf8' });
  return (out.match(/^ {2}wrote/gm) || []).length;
}

let total = 0;
for (const p of PLAN) {
  if (only.length && !only.includes(p.name)) continue;
  /* A plan entry can name a sheet that has not been generated yet — barrow and
     emberforged are in the list so the geometry is decided in advance, not so a
     full re-cut dies on a missing file. Say so and carry on. */
  if (!LIST && !fs.existsSync(path.join(__dirname, S, p.sheet))) {
    console.log(p.name + '  (' + p.sheet + ')  -- no sheet yet, skipped');
    continue;
  }
  let n = 0;
  console.log(p.name + '  (' + p.sheet + ')');
  if (p.rows) {
    for (const r of p.rows) {
      fs.writeFileSync(TMP, r.ids.split(/\s+/).join('\n') + '\n');
      n += slice(p.sheet, '_cutall.txt', { grid: r.rowcols ? null : (r.grid || p.grid), rowcols: r.rowcols, crop: r.crop, colx: r.colx, inset: r.inset || p.inset, noeat: r.noeat || p.noeat });
    }
  } else {
    n = slice(p.sheet, p.ids, p);
  }
  total += n;
  if (!LIST) console.log('  ' + n + ' cut');
}
if (!LIST) {
  fs.rmSync(TMP, { force: true });
  console.log('\n' + total + ' icons -> raw/');
  /* Never suggest picks.js here. It rebuilds picks.json from the retired SwarmUI
     subject list, and the next inject silently drops every icon added since. */
  console.log('next:  node _iconart/key.js, add the new ids to _iconart/picks.json BY HAND, node _iconart/pack.js --picks _iconart/picks.json, diff the pack against the live block, node _iconart/inject.js');
}

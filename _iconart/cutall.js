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
      n += slice(p.sheet, '_cutall.txt', { grid: r.grid || p.grid, crop: r.crop, colx: r.colx, inset: r.inset || p.inset });
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
  console.log('next:  node _iconart/key.js && node _iconart/picks.js && node _iconart/pack.js && node _iconart/inject.js');
}

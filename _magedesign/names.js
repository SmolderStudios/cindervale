/* Facts the page prints that are not balance numbers: display names, what each
   material is used for today, what each monster already drops, and the stats of
   the gear named in the copy. Read off the real game with the prototype on top,
   written to names.json for build.js.

       node _magedesign/names.js
*/
'use strict';
const fs = require('fs'), path = require('path');
const boot = require('./_boot');
boot().then(({ ev }) => {
  const out = JSON.parse(ev(`(function(){
    var MD = MAGE_DESIGN, o = { item: {}, skill: {}, uses: {}, made: {}, mon: {}, gear: {}, drops: {} };
    for (var id in ITEMS) o.item[id] = ITEMS[id].name;
    for (var sk in SKILLS) o.skill[sk] = SKILLS[sk].name;
    /* what uses, and what makes, every input of every Runecrafting act, before Magic */
    var want = {};
    SKILLS.runecrafting.acts.forEach(function (a) { for (var k in a.inp) want[k] = 1; });
    MD.POTIONS.forEach(function (p) { for (var k in p.inp) want[k] = 1; });
    ['ash', 'charcoal', 'ember_dust', 'runestone', 'runed_bone', 'drakeforged_rune', 'riftshard', 'barrow_dust', 'arcane_dust', 'rune_fragment', 'mana_essence'].forEach(function (k) { want[k] = 1; });
    for (var m in want) { o.uses[m] = []; o.made[m] = []; }
    for (var s in SKILLS) SKILLS[s].acts.forEach(function (a) {
      var mine = s === 'runecrafting' || a.id === 'mi_rs' || /^al_arcane/.test(a.id || '') || (a.out && (a.out.arcane_draught_1 || a.out.arcane_draught_2));
      for (var k in (a.inp || {})) if (want[k] && !mine) o.uses[k].push({ skill: SKILLS[s].name, act: a.name, n: a.inp[k], lvl: a.lvl });
      for (var k2 in (a.out || {})) if (want[k2] && !mine) o.made[k2].push({ skill: SKILLS[s].name, act: a.name, n: a.out[k2], lvl: a.lvl });
    });
    /* monster drop sources for the same materials */
    for (var mid in MONSTER_DROPS) (MONSTER_DROPS[mid] || []).forEach(function (d) {
      if (!want[d.id]) return;
      var mm = MONSTERS.filter(function (x) { return x.id === mid; })[0]; if (!mm) return;
      (o.drops[d.id] = o.drops[d.id] || []).push({ who: mm.name, zone: getZone(mm.zone).name, lvl: mm.lvl, chance: d.chance, boss: !!mm.boss });
    });
    MONSTERS.forEach(function (x) { o.mon[x.id] = { name: x.name, lvl: x.lvl, zone: getZone(x.zone).name, boss: !!x.boss }; });
    ['cobalt_chest', 'cobalt_helm', 'trollhide_chest', 'troll_chest', 'seercloth_robe', 'frost_staff', 'kiln_rune', 'cobalt_buckler', 'dawnsteel_buckler', 'stonewright_gauntlets', 'faultward']
      .forEach(function (g) { if (COMBAT_GEAR_STATS[g]) o.gear[g] = { name: ITEMS[g] && ITEMS[g].name, st: COMBAT_GEAR_STATS[g] }; });
    o.zones = ZONES.map(function (z) { return { id: z.id, name: z.name, lvl: z.lvl || z.unlockLvl || 0, hunt: !!z.hunt }; });
    o.guilds = GUILDS.map(function (g) { return { id: g.id, name: g.name, skills: g.skills || g.skill || null }; });
    o.capes = Object.keys(SKILL_CAPE).length;
    o.raids = RAIDS.map(function (r) { return { id: r.id, name: r.name, lvl: r.unlockLvl, stages: (r.stages || []).length, gear: (r.gearDrops || []).map(function (d) { return [d.id, d.chance]; }) }; });
    o.spireGear = (typeof SPIRE_GEAR !== 'undefined') ? SPIRE_GEAR.slice() : [];
    o.ach = ACHIEVEMENTS.length;
    o.actCounts = {}; for (var sk2 in SKILLS) o.actCounts[sk2] = SKILLS[sk2].acts.length;
    o.treeNodes = {}; for (var tk in TREES) o.treeNodes[tk] = TREES[tk].length;
    return JSON.stringify(o);
  })()`));
  fs.writeFileSync(path.join(__dirname, 'names.json'), JSON.stringify(out, null, 1));
  console.log('names.json  ' + Object.keys(out.item).length + ' items, ' + Object.keys(out.uses).length + ' materials traced');
  process.exit(0);
}).catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });

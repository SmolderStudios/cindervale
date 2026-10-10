/* The Magic design page, sections 12 to 17 and the footer. */
'use strict';

exports.partC = function (c, h) {
  const { R, MD, META, N } = c, T = R.tables, nm = c.nm, inp = c.inp, kk = c.kk, pc = c.pc;
  const out = [];
  const B = R.best, bf = l => B.find(x => x.label === l);
  const AC = N.actCounts;

  /* ── 12 everything it plugs into ─────────────────────────────────────────── */
  const sorcRows = MD.SORC.concat(MD.SORC_BRIDGE).map(n => ({ cls: n.id === 'gs_t3' ? 'rule-top' : '', cells: [[n.name, 'nm'], [n.hybrid ? 'bridge to Warfare' : 'Sorcery', 'd'], [n.max, 'm'], [`<span class="game">${n.desc}</span>`, '']] }));
  const touch = META._touch || R.touch;
  const touchRows = touch.map(t => [[`<code>${t.fn}</code>`, ''], [t.kind === 'edit' ? `${t.edits} line${t.edits > 1 ? 's' : ''} changed` : 'wrapped', 'm'], [t.why, 'd']]);
  const fnCount = new Set(touch.map(t => t.fn)).size;
  const raidBest = T.raidEl.map(r => { const n = {}; r.stages.forEach(s => { n[s.weakEl] = (n[s.weakEl] || 0) + 1; }); const k = Object.keys(n).sort((a, b) => n[b] - n[a])[0]; return `${r.name.replace(/^The /, '')}: ${h.cap(k)}, ${n[k]} of ${r.stages.length} stages`; }).join('; ');
  const castsW = R.parity[3].wand.castsHr, castsS = R.parity[3].staff.castsHr;

  out.push(h.sec('12', 'plugs', 'Everything it plugs into', 'One line each. Every one of these reads a weapon, a damage stat or a combat level.', `
  ${h.facts([
      ['Combat Mastery', 'A fifth column, Sorcery: 30 points, and a 4 point bridge to Warfare. Magic levels pay for all 34.', `One point at every third Magic level and a second at 99. The board goes from ${R.structure.cmastCapNow} to ${R.structure.newCap} and what can be earned rises by the same ${R.structure.pointsFromMagic}, so the audit's rule that the two match still holds. The tree key is <code>sorc</code>, because <code>magic</code> is Warfare. Any-weapon nodes follow the staff through the <code>_dk</code> gate, which gets a third branch. Nodes are below.`],
      ['Enchants', 'A new stat, Magic damage ("of the Seer"), and a staff pool.', `The same base numbers as the Attack and Ranged damage enchants (${T.ench.stat.gear} on gear and ${T.ench.stat.jewel} on jewellery, before tier and roll). Staves and wands roll from Magic damage, crit chance, crit damage and lifesteal, and the unique enchant on one is Magic damage. Head and hands gain it as a sixth stat and jewellery as an eighth, so every other roll in those two pools gets a little rarer, as it did when Ranged damage went in. Three key lists in <code>combatEnchantBonuses</code> drop a stat they do not know in silence.`],
      ['Gems', `${MD.GEM.n}: +${MD.GEM.tiers.map(t => Math.round(t[2] * 100)).join(', +')}% Magic damage.`, 'The twin of Hawkseye. Two key lists in <code>combatSocketBonuses</code>. Sanguine gems, which are damage with any weapon, follow the staff with no change.'],
      ['Potions and food', `${MD.POTIONS.map(p => `${p.n}: +${p.mpow} Magic Power for ${p.sec / 60} minutes, Alchemy ${p.lvl}`).join('. ')}.`, `The twin of the Hawkeye pair, from ${inp(MD.POTIONS[0].inp)}, which Farming grows from level 40. ${nm('warriors_brew')} gains +3 Magic Power beside its other stats. A potion stat has to be in seven key lists to work and five more places to be seen; the Hawkeye Draught is missing from those five today. Strength from a potion or food does not reach a spell. It does reach a bow, as a stated exception: question 14 asks whether Magic should have the same one.`],
      ['Capes', 'Every cape with Strength carries the same Magic Power.', `As they carry Ranged Strength. The Runecrafter's Cape is the fifteenth skill cape and its tree node doubles a batch of runes.`],
      ['Sets', `Dawnveil, four pieces: +${Math.round(MD.DAWNVEIL.set.critChance * 100)}% crit chance and +${Math.round(MD.DAWNVEIL.set.dmgBoost * 100)}% damage.`, 'The third Empyrean set, beside Dawnward and Sunweave. Set bonuses that are damage with any weapon follow the staff. The Iron Legion title bonus that says melee stays melee.'],
      ['Raids', 'Rally, Ruin and Brace work as they are. The spell bar stays live.', `Ruin multiplies whatever you hit with. Styles and gear lock while a fight is active and a raid runs as one fight, so a fighter keeps one damage type for the run. A mage does not have to: with the bar live, one who watches can match each stage. Left alone, each raid has an element that is right for about half of it: ${raidBest}. Question 7.`],
      ['Momentum', `A staff charges the three abilities about ${Math.round((1 - castsS / castsW) * 100)}% slower than a wand.`, 'Momentum is 7 for every hit that lands and a staff lands fewer, harder hits. Any slow weapon has this handicap today. Question 11.'],
      ['Spire and Ascension', 'Ascension raises Magic Power on a piece with its other numbers.', 'One line in <code>gearStats</code>, beside Ranged Strength. The per-rank bonuses are crit, lifesteal and health, so nothing is added. A floor that borrows a zone or raid monster copies its elements with its weakness. Section 14 has the wall.'],
      ['Slayer', 'Nothing.', 'Tasks count kills by family, whatever killed them.'],
      ['Guilds', 'A seat for Runecrafting, and a requirement check that knows about Magic.', '<code>gdReqMet</code> sends only the four melee stat names to a combat level, so a quest that asks for a Ranged or Magic level cannot be met. One line, and it fixes Ranged too.'],
      ['Achievements and Steam', 'Six proposed: Magic 99, Runecrafting 99, a kill with each element in one zone, a full set of robes, a raid cleared with a staff, the Spire to floor 30 with a staff.', `Each is a row in the Steam schema and an icon, and the schema upload is its own step. "Full Board" would need Magic 99 once the board has a fifth column: question 8. ${h.prov}`],
      ['Offline combat', 'Spends runes while you are away, and stops when they are gone.', `<code>offlineCombatResolve</code> has no ammunition in it, so a bow is free offline today. One function: charge the quiver for the kills the time away earned, at the spell you left it casting, less what was kept, and cap the kills at what the quiver could pay for. The weakness is counted; the four element effects are not, to keep the offline sum simple. Question 10. ${h.prov}`],
      ['The demo', 'Capped with no new code.', 'The level 10 cap is one generic line in <code>grantCombatXp</code>, so a new combat stat is capped the day it exists, and skills are capped the same way. A demo player gets Ash Runes, a Pine Wand and Staff, Linen robes and Fire. All ten monsters in the two demo zones are weak to Fire. Frost is the first thing the full game adds, at Magic 12.'],
      ['Classes', 'No new class.', 'A wand is a light weapon, so it is the Rogue weapon and gets the light weapon crit. A staff is heavy, so it is the Berserker weapon. A Guardian holds a wand and a buckler, or a full shield with the penalty a dagger already takes.'],
      ['Compendium and satchel', 'Nothing new to build.', 'New items appear when first held, as now. Runes sort with arrows, cloth with materials, robes, wands and staves with gear.'],
      ['Wiki', 'The tables are automatic. An Elements page is new.', '<code>_wikigen.js</code> walks the skill and stat lists. The monster pages need a weak element and a resisted one beside the damage type.'],
      ['Main menu', 'The save slot shows the wrong combat level for anything but melee.', '<code>mmSummary</code> averages the four melee stats. It should call <code>combatLevel()</code>. A Ranged gap, fixed in passing.'],
      ['Effects bar', 'A line for Magic Power, and the one Ranged Strength never got.', 'The bar and the status chips list each potion stat by name and know neither.']
    ])}
  <details class="fold"><summary>The Sorcery column and its bridge: ${MD.SORC.length + MD.SORC_BRIDGE.length} nodes, ${R.structure.sorc + R.structure.bridge} points</summary>
  ${h.tbl(['Node', 'Where', 'Ranks', 'As the game would say it'], sorcRows, { min: 820 })}</details>
  <p class="tblnote">The column is Marksman's shape and sizes, node for node, so the two are worth the same. Every node is wired in the prototype and spent in the best in slot build in section 14. The three single nodes on the fifth row (Echo, Attunement and Rune Keeper) are Magic's own. Names and flavour are ${h.prov}.</p>
  <details class="fold"><summary>The ${fnCount} functions the prototype changes, and why</summary>
  ${h.tbl(['Function', 'How', 'Why'], touchRows, { min: 820 })}</details>
  <p class="tblnote">This is the real change list. Each edit in the prototype is an exact string that has to be found in the game's source or the prototype refuses to start, so the list cannot drift from build ${R.build}. Of the ${fnCount}, ${new Set((R.touch || []).map(t => t.fn)).size} are rules and ${fnCount - new Set((R.touch || []).map(t => t.fn)).size} are screens. Not in the list because the prototype did not need them: offline combat, the potion key lists, the guild check, the main menu and the effects bar.</p>`));

  /* ── 13 saves ─────────────────────────────────────────────────────────────── */
  out.push(h.sec('13', 'saves', 'Saves', 'Every new field, its default, and its guard. No save is wiped and none changes.', `
  ${h.tbl(['Field', 'Default', 'Guard in <code>normalizeState</code>', 'Note'], [
      [['<code>state.combatXp.magic</code>', ''], ['0', 'm'], ['Set to 0 when missing or not a number', 'm'], ['Level 1. <code>combatXp.ranged</code> shipped without a guard at first.', 'd']],
      [['<code>state.combatElement</code>', ''], ['\'fire\'', 'm'], ['Set to Fire when missing, unknown, or above the Magic level', 'm'], ['So a save can never sit on an element it has not unlocked.', 'd']],
      [['<code>state.combatSpell</code>', ''], ['\'surge\'', 'm'], ['Set to the biggest size when missing or unknown', 'm'], ['The size the player asked for. What is cast is that, or the biggest the loaded rune powers, whichever is smaller, so the default is always full strength.', 'd']],
      [['<code>state.xp.runecrafting</code>', ''], ['0', 'm'], ['Set to 0 when missing', 'm'], ['The loop that seeds every skill covers it once the skill is in the <code>SKILLS</code> literal. Guarded anyway.', 'd']],
      [['<code>state.tree.runecrafting</code>', ''], ['{}', 'm'], ['Created when missing', 'm'], ['Tree ranks, in the map every skill has.', 'd']],
      [['<code>state.combatEquipped.quiver</code>', ''], ['unchanged', 'm'], ['none', 'm'], ['Holds a rune id where it holds an arrow id. No new slot: question 6.', 'd']],
      [['<code>state.combatPresets.magic</code>', ''], ['absent', 'm'], ['none', 'm'], ['The Magic loadout. The tile reads an empty preset the way the other two do.', 'd']],
      [['<code>state.cmast.s_*</code>, <code>gs_*</code>', ''], ['absent, which is 0', 'm'], ['none', 'm'], ['Sorcery ranks, in the map the other four columns use.', 'd']],
      [['<code>state.cmastGranted</code>', ''], ['unchanged', 'm'], ['none', 'm'], ['Magic levels add to it as they are earned. No save has a Magic level, so there is nothing to back-pay.', 'd']]
    ], { min: 900 })}
  ${h.facts([
      ['Combat level', `No save moves. ${h.n(R.level.seen)} tried.`, 'Section 02. This is the assertion to put in <code>_audit_tests.js</code> first, before anything else is built.'],
      ['Frozen things', 'None of them is touched.', 'No storage key, no <code>app.setName</code>, no <code>appId</code>, no URL. No item id is renamed and no existing stat key changes meaning.'],
      ['Names, checked', 'Every new name was searched for in the file before it was used. All of these have no hits today.', '<code>rn_</code> (acts and tree nodes), <code>runecrafting</code>, <code>runestone</code>, <code>sorc</code>, <code>s_t1</code> to <code>s_cap</code>, <code>gs_</code>, <code>mpow</code>, <code>magicDmg</code>, <code>runeSave</code>, <code>runePow</code>, <code>weakEl</code>, <code>resistEl</code>, <code>combatElement</code>, <code>combatSpell</code>, <code>spellSize</code>, <code>runeClass</code>, <code>usingMagic</code>, <code>.cel-</code>, <code>el_fire</code> and its three siblings, <code>wyrd</code>, <code>arcane_draught</code>, <code>mi_rs</code>, <code>dawnveil</code>, any id ending <code>_wand</code> or <code>_staff</code>.'],
      ['Three near misses', 'Worth knowing before the build.', '<b style="display:inline">magic</b> is taken twice: it is the Warfare tree key and the stat name, which is why the column is <code>sorc</code>. <b style="display:inline">_rune</b> already ends one id, Drakeforged Rune, a raid material, so runes are recognised by their ammunition kind and never by name. <b style="display:inline">cloth</b> appears 19 times as a colour key inside icon palettes; no item carries it, so it is free as an armour flag.']
    ])}`));

  /* ── 14 balance ───────────────────────────────────────────────────────────── */
  const D = R.dressed;
  const dRows = D.map(x => [[`Lv ${x.lv}`, 'm'], [`T${x.tier}`, 'm'], [h.f1(x.melee.dps), 'm'], [h.f1(x.bow.dps), 'm'], [h.f1(x.staff.fire), 'new'], [x.staffVsBow + '%', 'has'],
    [h.f1(x.xbowBuckler.dps), 'm'], [h.f1(x.wand.fire), 'new'], [x.wandVsXbowB + '%', 'has'], [h.pct(x.staffLeather.dps, x.staff.dps), 'bad'], [h.pct(x.staffPlate.dps, x.staff.dps), 'bad'], [`${x.staff.s.def} / ${x.bow.s.def} / ${x.melee.s.def}`, 'm']]);
  const fRows = R.fights.map((f, i) => { const r = R.real[i], w = f.rows;
    return [[`Lv ${f.lv}`, 'm'], [f.mon, 'nm'], [`${h.el(f.weakEl)} ${f.resistEl ? '/ ' + h.el(f.resistEl) : ''}`, ''], [r.staffVsBow + '%', 'has'], [r.wandBareVsBow + '%', 'has'], [r.wandVsXbow + '%', 'has'], [r.staffVsWandBare + '%', 'm'],
      [`${h.f1(w.staff_weak.dps)} / ${h.f1(w.staff.dps)} / ${h.f1(w.staff_resist.dps)}`, 'new'], [`${kk(w.staff.takenHr)} / ${kk(w.bow.takenHr)} / ${kk(w.melee.takenHr)}`, 'm'], [r.bowVsSword + '%', 'd']]; });
  const xRows = R.xp.map(x => [[`Lv ${x.lv}`, 'm'], [x.mon, 'nm'], [kk(x.melee), 'm'], [kk(x.bow), 'm'], [kk(x.wand), 'new'], [kk(x.staff), 'new'], [x.wandPct + '%', 'has'], [x.staffPct + '%', 'has'], [x.bowPct + '%', 'd']]);
  const plum = bf('FULL: Plummet + Sundershaft');
  const kindN = { melee: 'melee', ranged: 'ranged', magic: 'magic' };
  const bRow = (x, base, name) => [[name || x.label.replace(/^[A-Za-z0-9% ]+: /, '').replace(/^\s*\+ /, ''), 'nm'], [kindN[x.kind], x.kind === 'magic' ? 'new' : 'd'], [h.n(x.dps[500]), x.kind === 'magic' ? 'new' : 'm'], [h.n(x.dps[1000]), 'm'], [h.n(x.dps[2000]), 'm'], [base ? h.pct(x.dps[500], base.dps[500]) : '', 'has']];
  const bestRows = [{ grp: 'Everything on: best gear, every enchant at a 40% roll, flawless gems, the Mastery board, the skill tree and cape, full Ascension &middot; share of Plummet' }]
    .concat(B.filter(x => /^FULL/.test(x.label)).map(x => bRow(x, plum)))
    .concat([{ grp: 'Faultline with an element chosen &middot; share of Faultline above' }])
    .concat([['  + Fire burning: Faultline', 'Fire Surge, on a monster that is neither weak nor resistant'], ['  + Storm: Faultline', 'Storm Surge, the same'], ['  + a weakness hit: Faultline', 'Any element the monster is weak to'], ['  + a resisted element: Faultline', 'An element it resists']].map(p => bRow(bf(p[0]), bf('FULL: Faultline + Sunder Rune'), p[1])))
    .concat([{ grp: 'Faultline casting a smaller spell with the same Sunder Runes, Fire burning &middot; share of the Surge' }])
    .concat([['size wave: Faultline', 'Fire Wave, 3 runes'], ['size blast: Faultline', 'Fire Blast, 2 runes'], ['size bolt: Faultline', 'Fire Bolt, 1 rune']].map(p => bRow(bf(p[0]), bf('  + Fire burning: Faultline'), p[1])))
    .concat([{ grp: 'The same two builds with one thing changed &middot; Faultline as a share of Plummet in the same state' }]);
  [['no gems', 'No gems'], ['no board', 'No Mastery board'], ['brew', `With ${nm('warriors_brew')}`], ['90% rolls', 'Enchants at a 90% roll'], ['new stats', 'Enchants picked for crit damage and accuracy too']].forEach(([k, n]) => {
    const a = bf(k + ': Plummet + Sundershaft'), b = bf(k + ': Faultline + Sunder Rune');
    bestRows.push(bRow(a, null, n + ': Plummet')); bestRows.push(bRow(b, a, n + ': Faultline'));
  });
  bestRows.push({ grp: 'With a class &middot; share of the Rogue with Plummet' });
  bestRows.push(bRow(bf('rogue: Plummet + Sundershaft'), null, 'Rogue: Plummet')); bestRows.push(bRow(bf('rogue: Starcall Wand + buckler'), bf('rogue: Plummet + Sundershaft'), 'Rogue: Starcall Wand and buckler'));
  bestRows.push(bRow(bf('berserker: Faultline + Sunder Rune'), bf('rogue: Plummet + Sundershaft'), 'Berserker: Faultline'));
  const wRows = []; for (let i = 0; i < R.walls.length; i += 2) { const a = R.walls[i], b = R.walls[i + 1]; wRows.push([[a.label, 'nm'], [a.lethal, /staff|wand/.test(a.label) ? 'new' : 'm'], [a.slow, 'm'], [b.lethal, /staff|wand/.test(a.label) ? 'new' : 'm'], [b.slow, 'm'], [a.lethal <= a.slow && b.lethal <= b.slow ? 'lethality' : 'fight length', 'has']]); }
  const checks = R.checks.map(k => `<div><span class="${k.ok ? 'ok' : 'no'}">${k.ok ? 'pass' : 'FAIL'}</span><span>${h.esc(k.what.trim())}${k.detail ? `<i>${h.esc(k.detail)}</i>` : ''}</span></div>`).join('');

  out.push(h.sec('14', 'balance', 'Balance, measured', `${R.checks.length} checks, ${R.checks.filter(x => !x.ok).length} failing. Run it yourself: <code>node _magedesign/sim.js</code>`, `
  <p class="lead">The simulator boots the real game, lays the prototype over it and asks the game's own functions for every number: <code>playerAccuracy</code>, <code>playerMaxHit</code>, <code>playerSwingMs</code>, <code>actMs</code>, <code>spireScale</code>, the enchant, gem, Mastery and Ascension code. The sword, shortbow, longbow and crossbow columns reproduce <code>_rangedsim.js</code>, <code>_rangedstr.js</code> and <code>_wall.js</code> to the digit, because those weapons run through functions the prototype does not touch. Sections 03, 04, 07 and 08 have the weapon, spell, rune and skill tables. The rest is here.</p>
  <h3 class="sh">Dressed in crafted gear ${h.meas}</h3>
  <p class="lead">The weapon test wears nothing. This one wears the crafted armour of the tier and counts crit: a fighter in plate with a shield, an archer in leather, a mage in cloth. Damage a second against that harness's level-scaled Defence, Fire on.</p>
  ${h.tbl(['', 'Tier', 'Sword and shield, plate', 'Bow, leather', 'Staff, cloth', 'staff of bow', 'Crossbow and buckler', 'Wand and buckler', 'wand of crossbow', 'Staff in leather', 'Staff in plate', 'Defence: cloth / leather / plate'], dRows, { min: 1200 })}
  <p class="tblnote">A staff in cloth is ${Math.min(...D.map(x => x.staffVsBow))} to ${Math.max(...D.map(x => x.staffVsBow))}% of a bow in leather. A wand with a buckler is ${Math.min(...D.map(x => x.wandVsXbowB))} to ${Math.max(...D.map(x => x.wandVsXbowB))}% of a crossbow with one: the check allows 108 there, because a wand is a light weapon and crits and a crossbow is heavy and does not. Both ranged styles are well ahead of the sword and shield, and take more damage for it. That is leather against plate, as the game has it today, and Magic sits on the bow's side of it with less Defence again.</p>
  <h3 class="sh">On real monsters ${h.meas}</h3>
  <p class="lead">Forty simulated hours each, with every fighter at the Agility of its own combat level, in a loop that copies the fight: damage past a kill is wasted, a burn cannot land the killing hit, effects clear when the monster dies. The loop agrees with the closed form to ${Math.max(...R.fights.map(f => Math.abs(f.validate - 100))).toFixed(1)}% on a monster that cannot die.</p>
  ${h.tbl(['', 'Monster', 'Weak / resists', 'Staff of bow', 'Wand, empty hand, of bow', 'Wand and buckler of crossbow and buckler', 'Staff of wand', 'Staff dps: weak / neutral / resisted', 'Damage taken an hour: staff / bow / sword', 'Bow of sword and shield, today'], fRows, { min: 1240 })}
  <h3 class="sh">Combat XP an hour ${h.meas}</h3>
  ${h.tbl(['', 'Monster', 'Sword and shield', 'Bow', 'Wand', 'Staff', 'Wand of bow', 'Staff of bow', 'Bow of sword, today'], xRows, { min: 900 })}
  <p class="tblnote">Magic XP is ${Math.min(...R.xp.map(x => Math.min(x.wandPct, x.staffPct)))} to ${Math.max(...R.xp.map(x => Math.max(x.wandPct, x.staffPct)))}% of Ranged XP on the same monster. XP follows damage, so the last column is the same leather against plate gap as above: an archer already earns ${+(Math.min(...R.xp.map(x => x.bowPct)) - 100).toFixed(1)} to ${+(Math.max(...R.xp.map(x => x.bowPct)) - 100).toFixed(1)}% more combat XP an hour than a fighter with a shield. Magic does not widen it.</p>
  <h3 class="sh">Best in slot, level 99 ${h.meas}</h3>
  <p class="lead">The shape of <code>_rangedstr.js</code>: damage a second against Defence 500, 1000 and 2000, with weapon effects that are not a second hit left out for everybody.</p>
  ${h.tbl(['Build', '', 'Defence 500', '1000', '2000', 'Share, at 500'], bestRows, { min: 900 })}
  <p class="tblnote">Faultline is ${R.bestSummary.staffVsBow}% of Plummet at Defence 500, ${R.bestSummary.staffVsBow1000}% at 1000 and ${R.bestSummary.staffVsBow2000}% at 2000: a bow's accuracy holds up better against the deepest Spire floors, and a staff hits harder against everything else. The Starcall Wand with a buckler is ${R.bestSummary.wandVsBow}%. Dawnreaper, the two-handed sword, is far ahead of all of them, as it is today.</p>
  <h3 class="sh">The Spire wall ${h.meas}</h3>
  ${h.tbl(['Build', 'Floor where it becomes lethal', 'Floor where a fight passes four minutes', 'Fully ascended: lethal', 'four minutes', 'What stops the climb'], wRows, { min: 900 })}
  <p class="tblnote"><code>_wall.js</code>'s definition, on its own floors. Every mage row is between floors 25 and 65 and lethality is the limit in every one, the two rules <code>_spiretest.js</code> holds melee and the archer to. Frost does not move it: the wall is tested five floors apart and what Frost saves is less than one step.</p>
  <h3 class="sh">All ${R.checks.length} checks</h3>
  <div class="checks">${checks}</div>
  <h3 class="sh">What was not simulated</h3>
  ${h.facts([
      ['Provisional', 'Numbers that follow an anchor but were not run.', 'Zone unique weapons, and raid staves and wands at tier 7 to 9. Raid robes at tier 7 to 9. Raid and Spire elements, stage by stage. The Arcane Draught. Stormcrest Aerie. Sorcery node names.'],
      ['Design only', 'Not in the prototype at all.', 'Offline rune spending. Sunder Runes on Spire boss floors. Momentum by attack time. Three Runecrafting nodes: Close Cutting, Bound Twice and the cape. Achievements. The cast flash.'],
      ['Not attempted', 'Outside what this page was asked for.', 'A mage in a raid, stage by stage with the three abilities. Mixed builds, such as a staff with melee Mastery. Hardcore and accelerated characters, whose drop dial multiplies the new rows as it does the old.']
    ])}`, true));

  /* ── 15 icons and bytes ──────────────────────────────────────────────────── */
  const A = R.art, NI = R.structure.newItems;
  const ic = [
    ['Runes', NI.runes.length, 'item', 'Eight grades and the Sunder Rune. One stone, nine glows.'],
    ['Runestone', 1, 'item', 'The quarried blank.'],
    ['Crafted wands', NI.wands.length, 'item', 'One silhouette, seven woods.'],
    ['Crafted staves', NI.staves.length, 'item', 'One silhouette, seven woods.'],
    ['Dropped staves and wands', NI.drops.length, 'item', 'Thirteen zone uniques (one waits for the Aerie), eight raid weapons, Faultline. Each its own shape.'],
    ['Cloth', NI.cloth.length, 'item', 'Seven bolts. The three raid cloths are painted already.'],
    ['Robe pieces', NI.robes.length, 'item', 'Ten cloths by five pieces, and four Dawnveil.'],
    ['Wyrdstone gems', 3, 'item', 'Chipped, Polished, Flawless.'],
    ['Arcane Draughts', 2, 'item', 'Two bottles.'],
    ['Element marks', 4, 'item', 'Fire, Frost, Storm, Shadow. Used on the buttons, the monster card and the log.'],
    ['Runecrafting rail icon', 1, 'item', 'The Magic stat icon is painted already and is not on this list.'],
    ['Runecrafter’s Cape', 1, 'item', ''],
    ['Runecrafting banner', 1, 'banner', '1536 by 177.'],
    ['Tree plates', MD.RN_TREE.length, 'node', 'Sixteen nodes.'],
    ['Sorcery plates', MD.SORC.length + MD.SORC_BRIDGE.length, 'node', 'Eleven and two. Mastery art is two large images today, so how these land depends on how that sheet is cut: the least certain line here.'],
    ['Achievements', 6, 'ach', 'If all six are kept.']
  ];
  let icons = 0, bytes = 0;
  const icRows = ic.map(r => { const b = r[1] * A[r[2]].mean; icons += r[1]; bytes += b; return [[r[0], 'nm'], [r[1], 'm'], [`${h.n(A[r[2]].mean)} <span class="d">(${A[r[2]].n} in the file)</span>`, 'm'], [h.n(b / 1024) + ' KB', 'new'], [r[3], 'd']]; });
  icRows.push({ cls: 'rule-top', cells: [['All of it', 'nm'], [icons, 'm'], ['', ''], [h.n(bytes / 1024) + ' KB', 'new'], ['', '']] });
  const head = 12 * 1024 * 1024 - R.bytes, mbps = b => (b * 8 / 6 / 1e6).toFixed(1);
  c.icons = icons; c.artBytes = bytes;

  out.push(h.sec('15', 'art', 'Icons and bytes', 'No art was made. This is the list, and what it would add.', `
  ${h.tbl(['Family', 'Icons', 'Mean size of that kind today, bytes', 'Adds about', 'Note'], icRows, { min: 900 })}
  ${h.facts([
      ['The file', `${h.n(R.bytes)} bytes today. About ${h.n(bytes / 1024)} KB of art and 60 to 80 KB of code and data on top.`, `That is ${(R.bytes / 1e6).toFixed(2)} MB to about ${((R.bytes + bytes + 70000) / 1e6).toFixed(2)} MB, or ${Math.round((bytes + 70000) / R.bytes * 100)}% larger. An old wrapper, which gives up after six seconds, needs ${mbps(R.bytes)} Mbps today and would need ${mbps(R.bytes + bytes + 70000)}.`],
      ['The ceiling', `<code>_audit_tests.js</code> fails the file at 12 MB, and it is ${h.n(head / 1024)} KB short of that now.`, 'The rules alone, with no art at all, nearly fill it. The first slice that carries icons cannot ship without the ceiling moving in the same commit. Question 13.'],
      ['How it arrives', 'In slices, with the build order.', 'Section 16 gives the icon count for each slice, so no single push carries the lot. Robes are the largest family and there is no cheap cut in them: a mage with no cloth for hands and feet is back in leather. The slices that can wait longest are 5 and 9.'],
      ['Until it is painted', 'Every item must be painted or marked pending.', 'The audit asserts it. The prototype uses flat placeholders, which is what a pending entry would show.']
    ])}`));

  /* ── 16 build order ───────────────────────────────────────────────────────── */
  const itemKB = n => Math.round(n * A.item.mean / 1024);
  const ph = (n, title, text, ship) => `<div class="phase"><span class="ph">${n}</span><div><h4>${title}</h4><p>${text}</p></div><div class="ship">${ship}</div></div>`;
  out.push(h.sec('16', 'order', 'Build order', 'Nine slices. Each ships on its own and leaves the game whole.', `
  <div class="phases">
    ${ph('01', 'The rules nobody sees', 'The Magic stat, the combat level formula, the save guards, Magic damage and Magic Power through every place that sums a stat, and the demo cap. Nothing can be equipped yet, so nothing on screen changes. The simulator in this folder becomes <code>_magesim.js</code> and joins the four harnesses, with the "no save moves" assertion first.', 'no art<br>no visible change')}
    ${ph('02', 'A wand, a rune and Fire', 'The playable core. Runecrafting as a whole skill (it cannot ship without its 98 point tree, rail row and cape): Quarry runestone, eight runes, seven wands, seven staves. Casting: the three styles, the four spell sizes, the runes spent on every cast, the stop when they run out, the fit rule, the spell bar under the health bar, the Magic line under Training, the loaded count on the health bar for runes and arrows, the item cards, the Magic loadout tile, and the Magic damage enchant with its staff pool, so a staff can never roll Attack. One element, Fire, always on: Fire Bolt to Fire Surge. This slice alone is a complete third way to fight.', `42 icons, about ${itemKB(25) + Math.round((A.banner.mean + 16 * A.node.mean) / 1024)} KB<br>the ceiling moves here`)}
    ${ph('03', 'Elements', 'Frost, Storm and Shadow, the four buttons, and the pass over every monster, raid stage and Spire monster. The chips on the monster card, the two tags in the Monster Log, the colour on damage numbers. This is the slice that makes Magic its own thing, and the one to cut if the identity is wrong.', `4 icons, about ${itemKB(4)} KB`)}
    ${ph('04', 'Robes', `Seven cloths, thirty-five robe pieces, the cost of casting in plate and leather, and rune saving on cloth. Magic Power on bucklers, capes and Stonewright Gauntlets. Before this slice a mage fights in leather at ${Math.min(...R.dressed.map(x => Math.round(x.staffLeather.dps / x.staff.dps * 100)))} to ${Math.max(...R.dressed.map(x => Math.round(x.staffLeather.dps / x.staff.dps * 100)))}% strength, which is honest but not where it should sit for long.`, `42 icons, about ${itemKB(42)} KB`)}
    ${ph('05', 'Zone drops', 'Twelve unique wands and staves, one a zone, and runes from the six monsters that cast. No new rules: rows on drop tables that already exist.', `12 icons, about ${itemKB(12)} KB`)}
    ${ph('06', 'The Sorcery column', 'Eleven nodes, the bridge to Warfare, the points from Magic levels, and whatever the answer to the board width is. Any-weapon nodes already follow the staff from slice 1.', '13 plates, size uncertain')}
    ${ph('07', 'The gem and the potion', 'Wyrdstone, and the Arcane Draught through all seven key lists and the five places a potion is shown. The Hawkeye Draught gets those five in the same change.', `5 icons, about ${itemKB(5)} KB`)}
    ${ph('08', 'Raids and the Spire', 'Eight raid weapons, three raid cloths as fifteen robe pieces, Dawnveil, Faultline, Sunder Runes on boss floors, and Ascension on Magic Power. The last slice that needs balance work: run the wall again here.', `29 icons, about ${itemKB(29)} KB`)}
    ${ph('09', 'Away, and the loose ends', 'Offline combat spends runes and arrows and stops when they run out, with the Welcome Back line. The main menu combat level, the guild requirement check, the effects bar. Achievements and the Steam schema. The two stale sentences in the wiki.', `6 icons, about ${Math.round(6 * A.ach.mean / 1024)} KB`)}
  </div>
  <p class="tblnote">Slices 1 to 4 ship together as one release, so there is never a build where a mage has no cloth to wear or no element to choose: <code>BUILD-PROMPT.md</code> in this folder is the brief for that session. Everything after 4 can be reordered or dropped without leaving a hole. The icon counts add up to the ${icons} in section 15, with the Aerie wand held back until the Aerie is live.</p>`));

  /* ── 17 decide ────────────────────────────────────────────────────────────── */
  const qd = (title, body, dec, left) => `<div><b>${title}</b><span>${body}</span><i style="color:var(--good)">Decided: ${dec}</i><u>Still open: ${left}</u></div>`;
  const q = (title, body, rec, no) => `<div><b>${title}</b><span>${body}</span><i>Recommended: ${rec}</i><u>If no: ${no}</u></div>`;
  const plain = R.parity.map(x => Math.round(Math.min(x.wand.dps, x.staff.dps) / x.melee.dps * 1000) / 10);
  const ifArrow = c.sum.ifArrow, costShare = c.sum.costShare, SS = R.sizeSummary;
  out.push(h.sec('17', 'decide', 'What I need you to decide', 'Every open call, with what I would do and what changes if you say no.', `
  <div class="ask">
    ${q('1. Is this the identity: four elements, chosen between fights?', 'It is the only part of the design that is not Ranged with a different icon, and it costs a monster pass and four buttons.', 'yes.', `slice 3 is not built and Magic ships with one damage type. Without Fire it sits at ${Math.min(...plain)} to ${Math.max(...plain)}% of melee, so the wand cast speed moves from ${MD.FAMILIES.wand.swingMult} to 0.85 to give the 3% back. Section 04 and the Monster Log tags go.`)}
    ${q('2. Is Runecrafting a fifteenth skill?', `${R.structure.actTotal} acts, a 98 point tree, a cape, a rail row and a banner.`, 'yes.', `runes and robes become Crafting tabs (${AC.crafting} acts becomes ${AC.crafting + 65}) and wands and staves become Fletching tabs. There is no tree, so rune saving tops out near 30% and the batch has to grow from ${MD.RUNE_BATCH} to about ${Math.round(MD.RUNE_BATCH * (1 - 0.305) / (1 - MD.RUNE_SAVE_CAP) / 5) * 5} to keep a finished mage where section 07 has it. Nineteen icons and the bill in section 08 are saved.`)}
    ${q('3. Do robes need Defence or Magic?', 'All armour needs Defence today.', 'Defence. One rule, and the Warded style has a reason to exist.', 'robes gate on Magic, a pure mage wears the best cloth with Defence 1, and Warded is the style nobody picks. Nothing else moves.')}
    ${q('4. What should casting in plate cost?', `As designed: ${MD.ARMOUR.perDef * 100}% damage for each point of Defence that is not cloth, to ${Math.round((1 - MD.ARMOUR.floor) * 100)}%. Full plate is about half damage at level 99.`, 'as designed. It is the one number that makes robes matter.', 'a softer slope (0.2%) lets a mage wear leather for nearly nothing, and robes are then only worth their rune saving. A harder one makes plate useless rather than expensive.')}
    ${q('5. What should a rune cost against an arrow?', `As designed a full-size cast costs ${Math.min(...costShare)} to ${Math.max(...costShare)}% of the work of the arrow of its tier, which is what keeps a finished mage with a staff inside 95 to 105% of melee with the cost taken off. A finished archer is at ${Math.min(...R.net.map(x => x.rows[3].bow))} to ${Math.max(...R.net.map(x => x.rows[3].bow))}%.`, 'as designed, because you asked for the band to hold with the cost taken off.', `at the arrow's price the batch drops from ${MD.RUNE_BATCH} to about ${Math.round(MD.RUNE_BATCH * costShare.reduce((a, b) => a + b, 0) / costShare.length / 100)} and a finished staff is ${Math.min(...ifArrow)} to ${Math.max(...ifArrow)}%. Magic and Ranged then cost the same to feed, and neither is in the band.`)}
    ${q('6. Do runes share the quiver slot?', 'One slot holds whatever your weapon spends.', 'yes. No thirteenth slot on the doll and no change to saved loadouts.', 'a rune pouch of its own means a bow and a staff can both stay loaded when you swap, at the cost of a new slot in the doll, the loadout format and every list of body slots.')}
    ${qd('7. Can the spell change during a fight?', 'The first two drafts locked the size and the element with the style buttons. You asked for the spell to be easy to pick in combat.', 'yes. The spell bar works while the fight runs and a change applies from the next cast.', 'raids and the Spire. Gear and style lock mid-fight today, so a fighter keeps one damage type for a whole raid and hits the weakness on about half of its stages (3 of 6, 4 of 6, 4 of 7, 3 of 8). A mage who leaves the bar alone gets the same half. One who watches it can hit the weakness on every stage, which is worth about 7% over a run. I have left it live, because that is what you asked for and raids are the part of the game that already rewards watching. If it should not be so, the bar locks in a raid and on the Spire only: one condition.')}
    ${q('8. Where do the 34 Sorcery points come from?', 'From Magic levels: one every third level and a second at 99. The board can then only be filled by a character with Magic 99.', 'Magic levels. It keeps the board exactly fillable and gives a non-mage a reason to cast.', 'the points need another source, such as more Spire floors, or the column shrinks. "Full Board" stays reachable without Magic.')}
    ${q('9. How should five Mastery columns fit?', `The board needs ${((META.mastery || {}).info || {}).boardNeeds || 1702} px and the panel shows ${((META.mastery || {}).info || {}).panelShows || 1366}. The mock-up is drawn at ${Math.round((((META.mastery || {}).info || {}).scale || 0.8) * 100)}%.`, 'draw it smaller, as mocked, and look at it before deciding. It is the one mock-up I am not sure reads well.', 'it scrolls sideways, which it can do today, and the new column starts off-screen. Or the gutters narrow and all five fit at full size, which needs a layout pass.')}
    ${q('10. Should offline combat spend runes and arrows?', 'It spends neither today. A bow is free while you are away.', 'yes, for both, in slice 9. It is the only thing that makes rune saving worth a tree.', 'runes only cost anything while the game is open. An idle mage never needs to carve one, and half of section 07 is decoration. Ranged stays as it is.')}
    ${q('11. Should Momentum follow attack time?', `It is 7 a landed hit, so a staff charges abilities about ${Math.round((1 - castsS / castsW) * 100)}% slower than a wand. Any slow weapon has the same handicap now.`, 'pay Momentum in proportion to attack time, for every weapon. Not simulated.', 'leave it. A wand is then the raid weapon and a staff the everyday one, which is at least a difference.')}
    ${q('12. Which guild takes Runecrafting?', 'The Ashen Circle has Alchemy and Foraging. The Delvers has Mining alone. Fletching and Agility have none.', 'The Ashen Circle. It is the arcane one.', 'The Delvers gets a second skill, or Runecrafting has no guild, as Fletching does not.')}
    ${q('13. Where does the file size ceiling go?', `The audit stops the file at 12 MB and there are ${h.n(head / 1024)} KB left. The whole design is about ${h.n((bytes + 70000) / 1024)} KB.`, 'raise it to 13.5 MB with slice 2 and watch it, as you do now.', `slices 2 to 8 cannot ship their icons. The other route is a pass on the largest images already in the file, to buy the room back.`)}
    ${q('14. Should Strength from potions and food reach a spell?', 'It reaches a bow, as a stated exception. As designed it does not reach a spell, and the Arcane Draught is the Magic potion.', 'no. Magic starts with a clean split.', `one line, and every Strength potion is worth the same to all three styles. The Arcane Draught is then worth less than it looks.`)}
    ${q('15. Fix the Ranged gaps in the same slices?', 'No arrows spent offline, no loaded count in the arena, the wrong combat level on the save slot, guild requirements that cannot ask for Ranged, a Hawkeye Draught the effects bar does not show.', 'yes. Each is in a function Magic has to touch anyway.', 'Magic ships with the same five gaps, and they are fixed twice later.')}
    ${q('16. The names.', 'Runes: Ash, Soot, Char, Cinder, Kiln, Forge, Crucible, Starfall, Sunder. Cloth: Linen, Spidersilk, Gravecloth, Rimeweave, Seercloth, Stoneweave, Wyrmsilk, Runebound, Drakerune, Riftwoven, Dawnveil. Spell sizes: Bolt, Blast, Wave, Surge. Styles: Focused, Swift, Warded. The column: Sorcery. The gem: Wyrdstone.', 'keep them. The rune names are a heat ladder so none of them is an element. My one doubt is Bolt, which is also what a crossbow fires; Spark or Dart would do the same job.', 'they are strings in one file. Change any of them now for nothing.')}
    ${qd('17. Is this the spell ladder you meant?', `Four sizes of each element, spending 1 to 4 runes a cast. The rune decides the biggest spell it can power, and you can always cast a smaller one. Each size down saves a rune and costs ${SS.steps[0]} to ${SS.steps[1]}% of the hit.`, 'yes, with the condition that it is easy to pick in the combat screen. That is the spell bar in section 11.', 'nothing, unless the bar is not what you meant by easy. Number keys 1 to 4 for the size and Shift with 1 to 4 for the element are free in the game today and would cost a few lines.')}
  </div>`));

  out.push(`<div class="w foot">
  <p><b>How this was made.</b> Four scripts in <code>_magedesign/</code>. <code>sim.js</code> boots build ${R.build} in jsdom as the desktop game, lays <code>design.js</code> and <code>overlay.js</code> over it, and writes every number on this page to <code>results.json</code>. <code>shoot.js</code> does the same in headless Chrome with <code>ui.js</code> on top and photographs it. <code>names.js</code> reads display names and what each material is used for today. <code>build.js</code> prints this page from all of it, and refuses to write it if a number comes out missing. Change a number in <code>design.js</code>, run the four, and the page and its pictures follow.</p>
  <p><b>What was not touched.</b> <code>cindervale.html</code> was read and never written. The build was not bumped. Nothing was committed or pushed. No art was made.</p>
  <p>Measured ${R.when} against build ${R.build}, ${h.n(R.bytes)} bytes.</p>
</div>`);
  return out.join('\n');
};

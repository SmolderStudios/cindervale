/* The Magic design page, sections 08 to 11. Sections 12 on are in page3.js. */
'use strict';

exports.partB = function (c, h) {
  const { R, MD, META, N } = c, T = R.tables;
  const out = [];
  const nm = id => N.item[id] || id;
  const inp = o => Object.keys(o || {}).map(k => `${nm(k)} &times;${o[k]}`).join(' + ');
  const kk = x => x >= 10000 ? Math.round(x / 1000) + 'k' : (x >= 1000 ? (x / 1000).toFixed(1) + 'k' : String(Math.round(x)));
  const pc = x => +(x * 100).toFixed(2) + '%';
  c.nm = nm; c.inp = inp; c.kk = kk; c.pc = pc;

  /* ── 08 Runecrafting ─────────────────────────────────────────────────────── */
  const CATS = [
    ['runes', 'Runes', 'What a cast spends. A batch is 40 for each rune the biggest spell spends: 40 to 160.'],
    ['wands', 'Wands', 'One-handed. Logs, one batch of the runes of the tier, and Arcane Dust from tier 3.'],
    ['staves', 'Staves', 'Two-handed. Two batches of runes. Four levels after the wand of the same wood.'],
    ['cloth', 'Cloth', 'Flax for Linen, then Spider Silk and one thing from the zone of the tier.'],
    ['robes', 'Robes', 'Hood, robe, leggings, wraps and slippers, in ten cloths.']
  ];
  const byCat = k => T.acts.filter(a => a.cat === k);
  const catRows = CATS.map(([k, n, what]) => {
    const a = byCat(k);
    return [[n, 'nm'], [a.length, 'm'], [`${Math.min(...a.map(x => x.lvl))} to ${Math.max(...a.map(x => x.lvl))}`, 'm'], [what, 'd'], [`${kk(Math.min(...a.map(x => x.xph)))} to ${kk(Math.max(...a.map(x => x.xph)))}`, 'm']];
  });
  const actRows = [];
  CATS.forEach(([k, n]) => {
    actRows.push({ grp: `${n} &middot; ${byCat(k).length} acts` });
    byCat(k).forEach(a => actRows.push([[a.name, 'nm'], [a.lvl, 'm'], [a.sec + 's', 'm'], [a.xp, 'm'], [inp(a.inp), 'd'], [inp(a.out), 'd'], [kk(a.xph), 'm']]));
  });
  const X = R.skillXp;
  const xpRows = X.rows.map(r => [[`Lv ${r.lv}`, 'm'], [kk(r.runecrafting.xph), 'new'], [r.runecrafting.act, 'd'], [kk(r.fletching.xph), 'm'], [r.fletching.act, 'd'], [r.vsFletching + '%', 'has'],
    [kk(r.runesOnly.xph), 'm'], [kk(r.jeweler.xph), 'm'], [kk(r.smithing.xph), 'm'], [kk(r.crafting.xph), 'm']]);
  const UNWIRED = ['rn_batch', 'rn_bind', 'rn_cape'];
  const gate = n => n.req >= 75 ? `Runecrafting ${n.req}${n.reqCape ? ', with the cape' : ''}` : (n.req ? `${n.req} points spent` : 'open from the start');
  const each = n => n.per ? n.text.replace('{v}', n.per) : n.text;
  const full = n => n.per ? n.text.replace('{v}', +(n.per * n.max).toFixed(1)) : '';
  const treeRows = MD.RN_TREE.map(n => ({ cls: n.id === 'rn_gm_speed' ? 'rule-top' : '', cells: [[n.name, 'nm'], [n.max, 'm'], [gate(n), 'm'], [`<span class="game">${each(n)}</span>`, ''], [full(n), 'd'], [n.generic ? 'existing node code' : (UNWIRED.indexOf(n.id) >= 0 ? 'new, design only' : 'new, in the prototype'), n.generic ? 'has' : (UNWIRED.indexOf(n.id) >= 0 ? 'bad' : 'new')]] }));
  const baseSum = MD.RN_TREE.filter(n => n.req < 75).reduce((s, n) => s + n.max, 0);
  const AC = N.actCounts;
  const quarryPct = Math.round(X.rows[0].quarry / X.rows[0].copper * 100);

  out.push(h.sec('08', 'runecrafting', 'Runecrafting: the fifteenth skill', 'Recommended. Runes, wands, staves, cloth and robes.', `
  <p class="lead"><b>Make it a skill.</b> Everything a mage casts and wears comes out of one bench: ${R.structure.actTotal} acts in five tabs. Fletching, which does the same job for an archer, has ${AC.fletching}. The other place those acts could go is Crafting, which already has ${AC.crafting}.</p>
  ${h.facts([
      ['Precedent', 'Ranged got Fletching.', 'A bow is a Fletching item made from Woodcutting logs and Smithing heads. A staff is a Runecrafting item made from Woodcutting logs and runes. The two styles read the same way on the skill rail.'],
      ['Its own loop', 'Stone from Mining, fuel from Firemaking, silk from the Spider Hollow.', `One new Mining act quarries Runestone (${quarryPct}% of copper's XP, so it is never the Mining pick). The fuel is what a fire already leaves behind: ash, charcoal and Ember Dust. Charcoal has no use in the game today.`],
      ['Where rune saving lives', 'The tree holds 75 of the 85 points of rune saving.', 'Fletching holds arrow recovery the same way. Without a tree the ceiling cannot be reached, and the rune price in section 07 would have to fall to about a fifth to keep a finished mage in the band.'],
      ['What it costs', 'A rail row, a banner, a cape, sixteen tree plates and a list of places that count skills.', 'The whole bill is at the end of this section. It is the price of one Fletching.']
    ])}
  <h3 class="sh">The acts</h3>
  ${h.tbl(['Tab', 'Acts', 'Levels', 'What', 'XP an hour at its own level, no tree'], catRows, { min: 760 })}
  <details class="fold"><summary>All ${R.structure.actTotal} acts: level, time, XP, what goes in, what comes out</summary>
  ${h.tbl(['Act', 'Lv', 'Time', 'XP', 'Uses', 'Makes', 'XP an hour'], actRows, { min: 900 })}</details>
  <p class="tblnote">Every input exists in the game today or is made earlier in this list: the simulator checks each one. Robes are named as Crafting names armour (the piece, no verb). Wands and staves are the XP acts, as bows are in Fletching; carving runes alone is slower XP on purpose, because it is the act that runs all day.</p>
  <h3 class="sh">XP an hour against its neighbours ${h.meas}</h3>
  ${h.tbl(['', 'Runecrafting', 'best act', 'Fletching', 'best act', 'of Fletching', 'Runes only', 'Jeweler', 'Smithing', 'Crafting'], xpRows, { min: 1080 })}
  <p class="tblnote">Best act at each level, no tree, read from the game's own <code>actMs</code> and XP numbers. Level 1 to 99 takes ${X.hours.runecrafting} hours of the best act against Fletching's ${X.hours.fletching}, Jeweler's ${X.hours.jeweler}, Smithing's ${X.hours.smithing} and Crafting's ${X.hours.crafting}. Carving runes and nothing else takes ${X.hours.runesOnly}. With every tree node the peak is ${kk(X.peak.runecrafting)} an hour against Fletching's ${kk(X.peak.fletching)}. Those hours do not count gathering the logs, stone and silk.</p>
  <h3 class="sh">The tree: 98 points, sixteen nodes</h3>
  ${h.tbl(['Node', 'Ranks', 'Opens', 'Each rank, as the game would say it', 'Maxed', 'Code'], treeRows, { min: 980 })}
  <p class="tblnote">Sixteen nodes, ${R.structure.cols} columns, never more than ${R.structure.maxAbreast} abreast: the same shape Fletching uses, so it sits on the Forge Rail with no layout work (section 11 has it drawn). The eleven base nodes take ${baseSum} points, which is level ${baseSum + 1}, so the Grandmaster nodes are already open when the base is full. No idle points. Six nodes are covered by the generic node code and ten are new effects. Seven of the ten are wired in the prototype and measured in the best in slot build. Close Cutting, Bound Twice and the cape are design only. The prices in section 07 count none of the nodes that make a batch bigger or cheaper, so a finished rune costs less than that table says.</p>
  <h3 class="sh">The bill for a fifteenth skill</h3>
  ${h.tbl(['Place', 'What it needs', 'Why it is on the list'], [
      [['<code>SKILLS</code>', ''], ['An entry in the literal itself, not pushed in later', 'mw'], ['Three passes run at parse time and seed the XP an hour buffers. Fletching was pushed late and its XP an hour froze.', 'd']],
      [['Skill rail', ''], ['<code>RAIL_GROUP</code>, <code>SKILL_ACCENT</code>, <code>SK_PFX</code> = <code>rn</code>, one rail icon', 'mw'], ['A fifteenth row. The rail scrolls already.', 'd']],
      [['Banner', ''], ['<code>SKILL_ART</code>, one 1536 by 177 image', 'mw'], ['Every skill panel has one.', 'd']],
      [['Tree', ''], ['<code>TREES.runecrafting</code>, sixteen <code>NODE_ART</code> plates', 'mw'], ['The boot check measures every tree at exactly 98.', 'd']],
      [['Cape', ''], ['<code>SKILL_CAPE</code>, a shop row, a body slot entry, one icon', 'mw'], ['The last tree node needs it. Fletching shipped without a cape and its capstone could not be bought.', 'd']],
      [['Guild', ''], ['A seat in <code>GUILDS</code> and verbs in <code>GD_VERB</code>', 'mw'], ['Optional: Fletching and Agility have no guild today. Question 12.', 'd']],
      [['Achievements', ''], ['A level 99 award beside <code>fletch_99</code>', 'mw'], [`Total level tops out at ${14 * 99} today and ${15 * 99} with a fifteenth skill.`, 'd']],
      [['Items', ''], ['<code>itemCat</code>, <code>catOrder</code>, <code>itemCompCat</code>, <code>famOf</code>', 'mw'], ['Runes sit with arrows, cloth with materials, robes and staves with gear. Any bucket missing from <code>catOrder</code> sorts to the front in silence.', 'd']],
      [['Acts', ''], ['Declared above the line where <code>sortAllActs()</code> runs', 'mw'], ['The audit fails the file if anything is added to an acts array below it.', 'd']],
      [['Harnesses', ''], ['<code>_validate.js</code> pins 14 skills. <code>_audit_tests.js</code> pins a skill panel list, the exact list of unused materials, and that every item is painted or marked pending', 'mw'], ['Each fails on the first run and each is a one-line change.', 'd']],
      [['Wiki', ''], ['Nothing for the tables. Two sentences of prose are stale', 'mw'], ['<code>_wikigen.js</code> walks <code>SKILLS</code>, but it still says "12 skilling disciplines" and that Magic and Ranged are on the way.', 'd']]
    ], { min: 900 })}
  <div class="callout"><b>What Fletching shipped without, so Runecrafting's checklist has it.</b>
  <p>From the notes and the audit: XP an hour that froze; a stringing act that was the best XP in the skill; arrows with no source; nothing that fitted the quiver; no cape, so the capstone could not be bought; a level 1 bow that needed level 20 flax; a hardcoded skill count; no achievements; bows gated on Attack; ten tree nodes that did nothing; a combat stat with no save guard. The simulator in this folder asserts the two it can: every input of every act exists in the game, and the tree sums to 98 in Fletching's shape. The rest is the checklist for the build.</p>
  <p>Fletching still has no tool, pet or outfit. Runecrafting would ship the same way and they can come later for both.</p></div>`, true));

  /* ── 09 the chain and the sinks ──────────────────────────────────────────── */
  const eatRows = R.upkeep.map((u, i) => {
    const r = MD.RUNES[u.tier - 1], fk = Object.keys(r.fuel)[0];
    const per = casts => { const b = casts / MD.RUNE_BATCH; return `${Math.round(b * r.stone)} Runestone, ${Math.round(b * r.fuel[fk])} ${nm(fk)}`; };
    return [[`Lv ${u.lv}`, 'm'], [`${r.n} Rune <span class="d">${u.spell}, ${u.cls} a cast</span>`, 'nm'], [h.n(u.castsWand), 'm'], [per(u.castsWand), 'm'], [h.n(u.castsStaff), 'm'], [per(u.castsStaff), 'm']];
  });
  const usesToday = id => { const u = N.uses[id] || []; return u.length ? u.slice(0, 2).map(x => `${x.skill}: ${x.act}`).join('; ') + (u.length > 2 ? `, and ${u.length - 2} more` : '') : '<span class="bad">nothing</span>'; };
  const from = id => {
    const d = N.drops[id] || [], m = N.made[id] || [];
    if (m.length) return m[0].skill + (m.length > 1 ? `, ${m.length} acts` : `: ${m[0].act}`);
    if (d.length) return d.slice(0, 3).map(x => `${x.who} ${pc(x.chance)}`).join(', ') + (d.length > 3 ? `, and ${d.length - 3} more` : '');
    return OTHER[id] || '';
  };
  const OTHER = { moonflower: 'Farming: the Nightbloom crop, Lv 40', wraithcloth: 'The Sunken Barrow, 2 to 4 a clear', runed_bone: 'The Sunken Barrow, 1 a clear',
    emberweave: 'The Emberforge Deep, 2 to 4 a clear', drakeforged_rune: 'The Emberforge Deep, 1 a clear', voidweave: 'The Abyssal Throne, 2 to 4 a clear', riftshard: 'The Abyssal Throne, 1 a clear' };
  const setCost = cl => { const bolts = MD.CLOTH_PER_PIECE.reduce((a, b) => a + b, 0); return cl.bolt ? Object.keys(cl.bolt).map(k => `${nm(k)} &times;${cl.bolt[k] * bolts}`).join(' and ') : `${nm(cl.cloth)} &times;${bolts} and ${nm(cl.rune)} &times;1`; };
  const sinkRows = [
    ['ash', 'Runes at tier 1 and 2. One or two a batch.'],
    ['charcoal', 'Runes at tier 3 and 4. One a batch. Its first use.'],
    ['ember_dust', 'Runes at tier 5 to 8. One a batch.'],
    ['flax', 'Linen. A set of Linen robes is ' + setCost(MD.CLOTH[0]) + '.'],
    ['spider_silk', 'Every cloth from tier 2 to 7. A set is ' + setCost(MD.CLOTH[1]) + ' at tier 2 and ' + setCost(MD.CLOTH[6]) + ' at tier 7.'],
    ['cursed_dust', 'Gravecloth, tier 3.'], ['frostfur', 'Rimeweave, tier 4.'], ['seer_idol', 'Seercloth, tier 5.'], ['granite_core', 'Stoneweave, tier 6.'], ['cinder_gland', 'Wyrmsilk, tier 7.'],
    ['wraithcloth', 'Runebound robes. A set is ' + setCost(MD.CLOTH[7]) + '.'], ['emberweave', 'Drakerune robes.'], ['voidweave', 'Riftwoven robes.'],
    ['runed_bone', 'The Runebound Robe. Its first use.'], ['drakeforged_rune', 'The Drakerune Robe. Its first use.'], ['riftshard', 'The Riftwoven Robe. Its first use.'],
    ['arcane_dust', `Wands and staves from tier 3: 4 to 20 each. All fourteen together take ${R.reagents.magicSpendsOnce.arcane_dust}.`],
    ['moonflower', 'Arcane Draught, three a brew.'], ['ashbloom', 'Arcane Draught II, one a brew.']
  ].map(([id, what]) => [[nm(id), 'nm'], [from(id), 'd'], [usesToday(id), 'd'], [what, 'mw']]);
  const left = ['abyssal_scale', 'barrow_dust', 'ember_resin', 'energy_crystal', 'goblin_ear', 'golden_spore', 'splintered_club', 'stamina_shard', 'void_essence'].map(nm).join(', ');

  out.push(h.sec('09', 'chain', 'How it is made, and what gets a use', 'The whole chain, and every existing material it draws on.', `
  ${h.tbl(['Step', 'Skill', 'Act', 'Goes in', 'Comes out'], [
      [['1', 'm'], ['Mining', 'nm'], [`${T.quarry.name} <span class="d">Lv ${T.quarry.lvl}, ${T.quarry.ms / 1000}s, ${T.quarry.xp} XP</span>`, ''], ['nothing', 'd'], ['Runestone', 'new']],
      [['2', 'm'], ['Firemaking', 'nm'], ['Nothing new', 'd'], ['logs', 'd'], ['Ash from every log, Charcoal from Firemaking 12, Ember Dust from 40. Already in the game.', 'd']],
      [['3', 'm'], ['Runecrafting', 'nm'], ['Carve runes', ''], ['Runestone &times;1 to 3 and one fuel', 'mw'], [`${MD.RUNE_BATCH} runes for each rune the biggest spell spends: ${MD.RUNE_BATCH} to ${MD.RUNE_BATCH * 4}`, 'new']],
      [['4', 'm'], ['Runecrafting', 'nm'], ['Bind a wand or a staff', ''], [`Logs &times;${MD.FAMILIES.wand.logs} or &times;${MD.FAMILIES.staff.logs}, one batch of the runes of its tier for a wand and two for a staff, Arcane Dust from tier 3`, 'mw'], ['A wand or a staff', 'new']],
      [['5', 'm'], ['Runecrafting', 'nm'], ['Weave cloth', ''], ['Flax &times;3, or Spider Silk &times;3 to 5 and one zone material', 'mw'], ['One bolt of cloth', 'new']],
      [['6', 'm'], ['Runecrafting', 'nm'], ['Make a robe piece', ''], [`Cloth &times;${MD.CLOTH_PER_PIECE.join(', ')} for hood, robe, leggings, wraps, slippers`, 'mw'], ['A robe piece. Thirteen bolts make the set.', 'new']],
      [['7', 'm'], ['Runecrafting', 'nm'], ['Raid robes', ''], ['The raid cloth leather already uses, and the raid material nothing uses, in the robe', 'mw'], ['Runebound, Drakerune, Riftwoven', 'new']],
      [['8', 'm'], ['Alchemy', 'nm'], ['Brew an Arcane Draught', ''], [MD.POTIONS.map(p => inp(p.inp)).join(' &nbsp;/&nbsp; '), 'mw'], [`+${MD.POTIONS[0].mpow} or +${MD.POTIONS[1].mpow} Magic Power`, 'new']]
    ], { min: 900 })}
  <h3 class="sh">What an hour of casting the biggest spell eats, with nothing saved</h3>
  ${h.tbl(['', 'Rune', 'Wand, casts', 'and that is', 'Staff, casts', 'and that is'], eatRows, { min: 820 })}
  <h3 class="sh">Every existing material Magic uses</h3>
  ${h.tbl(['Material', 'Comes from', 'Used today by', 'Magic uses it for'], sinkRows, { min: 940 })}
  ${h.facts([
      ['Spider Silk', 'The Spider Hollow becomes somewhere you go back to.', 'One Alchemy poultice uses silk today. Every cloth above Linen is silk and one thing from the zone of its tier, so a level 82 mage making Wyrmsilk needs the Wyvern Roost for the glands and about two hundred kills in the Spider Hollow, of things that die in one hit, for the silk. This is the one place the design sends a high-level player to a low zone on purpose. If that is unwelcome, each cloth can take its own zone hide instead: one line a cloth.'],
      ['Enchanting', 'Magic takes no Rune Fragments and no Mana Essence.', `Those are the two reagents an enchant is short of (section 00). Binding every crafted wand and staff once takes ${R.reagents.magicSpendsOnce.arcane_dust} Arcane Dust, about ${Math.round(R.reagents.magicSpendsOnce.arcane_dust / R.reagents.dustHr * 60)} minutes of Alchemy for a maxed character. A mage enchants gear at the price everyone pays.`],
      ['The audit', 'Four names leave the list of unused materials.', `Charcoal, Runed Bone, Drakeforged Rune and Riftshard. That list is asserted exactly, so it changes in the same commit. Nine stay unused after Magic: ${left}.`]
    ])}`, true));

  /* ── 10 drops ─────────────────────────────────────────────────────────────── */
  const does = d => {
    const o = [];
    if (d.aff) o.push(`+${Math.round(d.aff.dmg * 100)}% damage with ${h.cap(d.aff.el)}`);
    if (d.wfx && d.wfx.poison) o.push('a hit can poison the monster');
    if (d.wfx && d.wfx.burn) o.push('a hit can set the monster on fire, whatever the element');
    if (d.wfx && d.wfx.stun) o.push(`${Math.round(d.wfx.stun.chance * 100)}% of hits stun for ${d.wfx.stun.dur} seconds`);
    if (d.wfx && d.wfx.cleave) o.push(`${Math.round(d.wfx.cleave.chance * 100)}% of casts hit twice`);
    if (d.ubonus) Object.keys(d.ubonus).forEach(k => o.push(`+${Math.round(d.ubonus[k] * 100)}% ${({ lifesteal: 'lifesteal', critChance: 'crit chance', magicDmg: 'Magic damage' })[k] || k}`));
    return o.join(', ');
  };
  const stat = d => `${d.atk}${d.mpow ? ' / +' + d.mpow : ''}${d.crit ? ` <span class="d">${h.f1(d.crit * 100)}% crit</span>` : ''}`;
  const zoneU = T.drops.filter(d => d.rows[0].zone !== 'raid' && d.rows[0].zone !== 'spire').sort((a, b) => a.rows[0].lvl - b.rows[0].lvl);
  const uRows = zoneU.map(d => {
    const src = d.aerie ? [{ who: 'Storm Eagle', lvl: 45, chance: d.rows[0].chance }] : d.rows.slice().sort((a, b) => a.lvl - b.lvl);
    return [[d.aerie ? 'Stormcrest Aerie <span class="d">not live</span>' : d.rows[0].zone, 'nm'], [d.name, 'nm'], [`${h.cap(d.fam)}, T${d.tier}`, 'm'], [stat(d), 'new'], [does(d), 'd'],
      [src.map(r => `${r.who}${r.boss ? ' <span class="d">boss</span>' : ''} <span class="d">Lv ${r.lvl}</span>`).join('<br>'), ''], [src.map(r => pc(r.chance)).join('<br>'), 'm']];
  });
  const raidU = T.drops.filter(d => d.rows[0].zone === 'raid');
  const raidRows = N.raids.filter(r => r.stages).map(r => {
    const mine = raidU.filter(d => d.rows[0].who === r.name);
    const cl = MD.CLOTH.find(x => x.raid === r.id);
    return [[r.name, 'nm'], [`Combat ${r.lvl}`, 'm'], [mine.map(d => `${d.name} <span class="d">T${d.tier} ${d.fam}, ${stat(d)}${does(d) ? ', ' + does(d) : ''}</span>`).join('<br>'), ''], [pc(mine[0].rows[0].chance) + ' each', 'm'],
      [cl ? `${cl.n} robes from ${nm(cl.cloth)} and ${nm(cl.rune)}` : `Dawnveil, four pieces, ${pc(MD.DAWNVEIL.chance)} each`, 'd']];
  });
  const fault = T.drops.find(d => d.id === 'faultline');
  const zonesCovered = new Set(zoneU.filter(d => !d.aerie).map(d => d.rows[0].zone)).size;

  out.push(h.sec('10', 'drops', 'Drops', `One unique for each of the ${N.zones.length} zones, two weapons a raid, one on the Spire.`, `
  ${h.tbl(['Zone', 'Weapon', 'Kind', 'Atk / Magic Power', 'What it does', 'Dropped by', 'Rate'], uRows, { min: 1160 })}
  <p class="tblnote">${zonesCovered} of ${N.zones.length} zones have one. The rates are the ones the game already uses for gear on these tables: 0.5% to 1% from a named monster and 3% from the boss, as Wyrmfang, Doomblade and the four hunting-ground bows are today. One that only a named monster drops has the numbers of the crafted weapon of its tier and adds an element it is better with, or an effect, so it is a choice and not a replacement. One the boss also drops sits a little above the crafted tier, where Wyrmfang and Doomblade sit. Their numbers are ${h.prov} except where section 14 names them.</p>
  ${h.facts([
      ['Tier follows zone', 'No early zone drops a late weapon.', 'Every unique is the tier of the unique that zone already drops: tier 3 beside the Warcleaver in the Goblin Cave, tier 7 beside Wyrmfang in the Wyvern Roost, tier 8 beside Doomblade in the Demon Sanctum. Cross-zone scaling is kept: there is nothing to farm in the Rat Warrens past tier 1.'],
      ['Rare spawns', 'Four times the chance, never more than 85%.', 'The uniques are ordinary rows on the monster drop table, so <code>rollDrops</code> multiplies them by <code>RARE_DROP_MUL</code> and stops at <code>RARE_DROP_CAP</code> with no new code. A 0.5% staff is 2% from a rare spawn.'],
      ['Runes from casters', 'Anything that casts drops its runes, as archers drop arrows.', T.runeDrops.map(r => `${r.who}${r.boss ? ' (boss)' : ''}: ${r.rune}s &times;${r.qty[0]} to ${r.qty[1]}, ${pc(r.chance)}`).join('. ') + '. The grade is read from the monster level. A top-up, not a supply: a Goblin Shaman kill is worth about four casts.']
    ])}
  <h3 class="sh">Raids and the Spire ${h.prov}</h3>
  ${h.tbl(['Raid', 'Unlocks', 'Staff and wand', 'Rate', 'Cloth'], raidRows, { min: 1000 })}
  <p class="tblnote">Raid gear is rolled piece by piece (<code>for (const g of raid.gearDrops)</code>), so two more rows make nothing already on the table rarer. The rates are the ones the raid weapons and armour beside them carry today.</p>
  ${h.facts([
      ['The Spire', `${fault.name}: a tier 11 staff, ${fault.atk} Attack and +${fault.mpow} Magic Power, ${does(fault)}.`, `The fifth name in <code>SPIRE_GEAR</code>. Each piece rolls on its own on boss floors: ${T.spireDrop.at.map(a => `floor ${a[0]}, ${pc(a[1])}`).join('; ')}. A fifth piece does not thin the other four.`],
      ['Sunder Runes', `+${MD.SPIRE_RUNE.pow} Magic Power, Spire boss floors only.`, 'Four times the count the Spire gives Sundershafts, because a Surge spends four: 80 and 10 a floor, so a climb to floor 50 stocks about 3,200, which is 800 Surges or 3,200 Bolts. The same reason the code gives for arrows applies: a rare drop of ammunition is a trophy you can never use. Not in the prototype.']
    ])}`, true));

  /* ── 11 combat UI ─────────────────────────────────────────────────────────── */
  const room = (META.fight && META.fight.info && META.fight.info.room) || null;
  const roomP = (META.fight && META.fight.info && META.fight.info.roomPotions) || null;
  const roomN = (META.nostaff && META.nostaff.info && META.nostaff.info.room) || null;
  const pan = (rm, name) => { const p = rm.panels.find(x => x[0].indexOf(name) === 0); return p ? p[1] : 0; };
  const mast = (META.mastery && META.mastery.info) || {};
  const bar = (META.fight && META.fight.info && META.fight.info.bar) || null;
  const sw = (META.switch && META.switch.info) || {};
  const raidRoom = (META.raid && META.raid.info && META.raid.info.room) || null;
  const hm = m => m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${m} min`;
  /* what the second draft's layout (the buttons inside Training) would have needed in a raid */
  const oldRaid = raidRoom ? raidRoom.panels.filter(p => p[0].indexOf('Training') !== 0 && p[0].indexOf('Combat log') !== 0).reduce((t, p) => t + p[1], 0) + 229 + 112 + raidRoom.gap * (raidRoom.panels.length - 1) : 0;
  const barNote = (bar && raidRoom) ? `The bar is ${bar.bar.w} px wide: a size button is ${bar.size.w} by ${bar.size.h} px and an element button ${bar.element.w} by ${bar.element.h}, at 1920 by 1080. A style button in the rail is 29 px tall. The glass under the monster is ${bar.glass.h} px tall with the bar in it and reaches ${bar.foe.bottom - bar.glass.top} px up the monster's picture, which is the empty margin under its feet. The second draft had these buttons in the Training panel in the right-hand rail. That rail is ${raidRoom.rail} px tall and in a raid it also carries Momentum and the three abilities: the old layout would have needed ${oldRaid} px there. That is why they moved.` : '';

  out.push(h.sec('11', 'ui', 'Combat UI', 'The prototype, photographed in build ' + R.build + '. Nothing here is a drawing.', `
  <p class="lead">Every picture in this section is the real game with the prototype laid over it in memory: the game's own render functions, edited at seven places, drawing a mage. Icons for the new things are flat placeholders, and every placeholder is listed in section 15. The file on disk was never written.</p>
  ${h.fig('fight', `<b>A fight, with a staff.</b> The spell bar is under your own health bar: four sizes, then four elements. Every button that is not greyed works while the fight runs. The line above it names the spell being cast, the runes left and how long they last at that size. Training in the rail names the three Magic styles, with the Magic level said once in the heading. The log names the spell. Damage numbers take the colour of the element.`)}
  ${h.fig('switch', `<b>Changing the spell while the fight runs.</b> One press on Blast, with the fight still on: max hit goes from ${(sw.before || {}).hit} to ${(sw.after || {}).hit}, the same stack lasts ${hm((sw.after || {}).mins)} where it lasted ${hm((sw.before || {}).mins)}, and the log says what changed. It applies from the next cast. Nothing is disengaged. A size the loaded rune cannot power is grey and says what it is waiting for: <span class="game">Surge needs Starfall Runes or better.</span>`)}
  ${h.fig('raid', `<b>In a raid.</b> The rail carries Momentum and the three abilities here and still fits, because the spell bar is not in it. A Barrow Sentry is weak to Storm and resists Frost, and the buttons say so before you press them.`)}
  <p class="tblnote">${barNote} The buttons act on the press, not the release: the combat panel is rebuilt on every kill, and a click that straddles a kill would lose its target.</p>
  ${h.fig('dry', `<b>Running low, on the wrong element.</b> Under ten minutes of runes the readout turns amber. This mage is also casting Fire at something that resists it, which is the mistake the design has to make hard: the button says <span class="game">resists -15%</span> in red, beside one that says <span class="game">weak +15%</span> in green, and either is one press away.`)}
  ${h.fig('out', `<b>Out of runes.</b> The fight stops before the cast, as it does for arrows, and the game says why. The message is the one arrows use, so it has the same flaw: it prints the item name, <span class="game">You are out of Forge Rune.</span> One word fixes it for both.`)}
  <div class="figrow">
    ${h.fig('nostaff', `<b>Holding a sword.</b> The line Ranged has, for Magic. This replaces the locked pill that never draws.`)}
    ${h.fig('gear', `<b>The Gear tab.</b> Staff in the weapon slot, runes in the quiver slot, robes on the doll. The totals name Magic Power and how many casts keep the rune.`)}
    ${h.fig('loadouts', `<b>Loadouts.</b> The Magic tile no longer says Soon. It saves staff, runes and robes like the other two.`)}
  </div>
  <div class="figrow four">
    ${h.fig('tipstaff', `<b>A staff.</b> Attack, Magic Power, its own crit, two-handed, the damage and speed trade, and the element it is better with.`)}
    ${h.fig('tiprune', `<b>A rune.</b> The spells it powers, biggest first, with what each spends and gets. Then which weapon can cast it, and whether yours can.`)}
    ${h.fig('tiprobe', `<b>A robe.</b> Cloth, so spells are at full strength.`)}
    ${h.fig('tipplate', `<b>Plate.</b> One more line under the one a bow already gets.`)}
  </div>
  ${h.fig('picker', `<b>Choosing a monster.</b> The card already says "weak to stab". It gains the element it is weak to and the one it resists, in the same chips.`)}
  ${h.fig('mlog', `<b>The Monster Log.</b> Two more tags in the row that has the damage type today.`)}
  ${h.fig('mastery', `<b>Combat Mastery with a fifth column.</b> Sorcery on the right, with its bridge to Warfare. Five columns need ${mast.boardNeeds || 1702} px and the panel shows ${mast.panelShows || 1366}, so this is drawn at ${Math.round((mast.scale || 0.8) * 100)}%. The board scrolls sideways today, which would hide the new column, so the size is question 9. The thirteen new plates are placeholders.`)}
  ${h.fig('skill', `<b>Runecrafting on the skill rail.</b> A fifteenth row, five tabs, and act cards drawn by the code that draws every other skill. The icon is the painted Magic stat icon standing in.`)}
  ${h.fig('tree', `<b>The Runecrafting tree</b> on the Forge Rail board: eleven columns, sixteen nodes, 98 points.`)}
  <div class="figrow">
    ${h.fig('welcome', `<b>Welcome Back.</b> Offline combat says how far the runes got it and how many were spent. This row needs offline combat to spend ammunition at all, which it does not do today for arrows: slice 9, and question 10.`)}
  </div>
  ${h.facts([
      ['Not drawn', 'A cast effect on the monster.', `The damage numbers carry the element. A flash on the monster in the element's colour would reuse the hit flash the arena has; no new art. ${h.prov}`],
      ['Plain words', 'Every string on these screens, as it would ship.', MD.ELEMENTS.map(e => `<span class="game">${e.n}: ${e.line}</span>`).join(' ') + ' <span class="game">Wave: 3 runes a cast, +15 Magic Power</span> <span class="game">Surge needs Starfall Runes or better.</span> <span class="game">Shadow Wave hits the Ogre Houndmaster for 198.</span> <span class="game">Cloth &middot; spells at full strength</span> <span class="game">1.5% of casts keep their runes</span> <span class="game">25% slower attacks</span>'],
      ['Bows get it too', 'The loaded count and time on the health bar works for arrows.', 'It is one function that reads the quiver. An archer has no such readout today.']
    ])}`, true));

  return out.join('\n') + '\n' + require('./page3.js').partC(c, h);
};

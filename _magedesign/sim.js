/* Magic balance simulator.
 *
 *     node _magedesign/sim.js            every table, and results.json for the page
 *     node _magedesign/sim.js --quick    skip the Monte Carlo fights
 *
 * The Ranged work set the rule this follows: a number being far too large is not
 * an error, nothing throws, and no harness notices. So nothing in the Magic
 * proposal is a guess that this file could have measured instead.
 *
 * It boots the real cindervale.html, lays the prototype in overlay.js over it, and
 * asks the game's own functions for every number. cindervale.html is never
 * written. Melee and Ranged run through the shipped functions untouched, which is
 * also the regression check: their columns must match _rangedsim.js and
 * _rangedstr.js to the digit.
 *
 * TARGETS
 *   weapon maths   Magic inside 95-105% of melee AND of each ranged weapon, at
 *                  Lv 20 / 50 / 75 / 99, matched tiers, with Fire's burn counted
 *   rune cost      still inside the band once the time it costs is taken off
 *   best in slot   a finished mage beside a finished archer, _rangedstr.js's shape
 *   the Spire      wall between floors 25 and 65, lethality the limit
 */
'use strict';
const fs = require('fs');
const path = require('path');
const boot = require('./_boot');
const MD = require('./design.js');
const QUICK = process.argv.includes('--quick');
const pad = (s, n) => String(s).padStart(n);
const padr = (s, n) => String(s).padEnd(n);
const pct = (a, b) => +(a / b * 100).toFixed(1);

/* ── a fight, rolled the way combatTick rolls it ─────────────────────────────
   Order of operations copied from the tick: hit roll (a sure cast is 0.97), 50 to
   100% of max hit, weakness before crit, crit x(2 + crit damage), then lifesteal
   and the on-hit effects. Burn ticks never land the kill. A kill resets both
   attack timers and clears every status, exactly as the respawn does. Overkill is
   wasted, which is the thing a closed-form DPS number cannot see. */
function rng32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = x => Math.max(0.03, Math.min(0.97, x));
function fight(P, M, C, o) {
  o = o || {};
  const rnd = rng32(o.seed || 7), T = (o.hours || 40) * 3600000;
  const el = o.el || null, E = el ? MD.ELEMENTS.find(e => e.k === el) : null;
  let wk = 1;
  if (!o.neutral) {
    if (P.kind === 'magic') wk = M.weakEl === el ? MD.WEAK_MULT : M.resistEl === el ? MD.RESIST_MULT : 1;
    else wk = M.weakTo === P.dmgType ? 1.15 : M.resistTo === P.dmgType ? 0.85 : 1;
  }
  if (o.forceWk) wk = o.forceWk;
  const save = o.save != null ? o.save : (P.runeSave || 0);
  const sure = (E && E.rider.pierce) || 0, leech = (E && E.rider.leech) || 0, burnM = (E && E.rider.burn) || 0, chill = E && E.rider.chill;
  let t = 0, youT = P.swing, foeT = M.swingMs, foeHp = M.hp, kills = 0, dealt = 0, raw = 0, taken = 0, heal = 0, casts = 0, spent = 0, landed = 0;
  let burnUntil = 0, burnNext = 0, burnDmg = 0, chillUntil = 0, burnDealt = 0;
  while (t < T) {
    const nb = burnUntil > t ? burnNext : Infinity;
    const nt = Math.min(youT, foeT, nb);
    t = nt;
    if (nt === nb) {                                   // a burn tick
      if (foeHp > 1) { const d = Math.min(burnDmg, foeHp - 1); foeHp -= d; dealt += d; burnDealt += d; }
      burnNext += C.BURN_TICK_MS; if (burnNext > burnUntil) burnUntil = 0;
      continue;
    }
    if (nt === youT) {                                 // you attack
      youT = t + P.swing; casts++;
      if (P.kind !== 'melee' && rnd() >= save) spent += (P.size || 1);
      const hitC = (sure && rnd() < sure) ? 0.97 : clamp(P.acc / (P.acc + M.def));
      if (rnd() < hitC) {
        let d = Math.max(1, Math.round(P.hit * (C.HIT_MIN + (1 - C.HIT_MIN) * rnd())));
        if (wk !== 1) d = Math.max(1, Math.round(d * wk));
        if (P.crit > 0 && rnd() < P.crit) d = Math.max(1, Math.round(d * (2 + (P.critDmg || 0))));
        raw += d; landed++;
        const real = Math.min(d, foeHp); foeHp -= real; dealt += real;
        const ls = (P.lifesteal || 0) + leech; if (ls > 0) heal += Math.max(1, Math.floor(d * ls));
        if (burnM && rnd() < C.BURN_CHANCE) { burnDmg = Math.max(1, Math.round(P.hit * burnM)); if (!(burnUntil > t)) burnNext = t + C.BURN_TICK_MS; burnUntil = t + C.BURN_DUR_MS; }
        if (chill && rnd() < chill.chance) chillUntil = t + chill.ms;
        if (foeHp <= 0) { kills++; foeHp = M.hp; burnUntil = 0; chillUntil = 0; youT = t + P.swing; foeT = t + M.swingMs; }
      }
      continue;
    }
    foeT = t + Math.round(M.swingMs * (chillUntil > t ? 1 + chill.slow : 1));   // the monster attacks
    if (rnd() < clamp(M.atk / (M.atk + P.def))) {
      let d = Math.max(1, Math.round(M.str * (C.HIT_MIN + (1 - C.HIT_MIN) * rnd())));
      if (P.dodge > 0 && rnd() < P.dodge) d = 0;
      if (d > 0 && P.block > 0) d = Math.max(1, Math.round(d * (1 - P.block)));
      taken += d;
    }
  }
  const h = T / 3600000;
  return { dps: dealt / (T / 1000), rawDps: raw / (T / 1000), killsHr: kills / h, takenHr: taken / h, healHr: heal / h, castsHr: casts / h,
    spentHr: spent / h, hitRate: landed / casts, burnShare: burnDealt / dealt, wk,
    xpHr: (raw * 0.4 + kills * Math.round(M.xp * 0.75)) / h * C.XP_SCALE, goldHr: kills * M.coins / h };
}

boot().then(({ ev, FILE }) => {
  ev(fs.readFileSync(path.join(__dirname, 'simlib.js'), 'utf8'));
  const J = src => JSON.parse(ev('JSON.stringify(' + src + ')'));
  const C = J('SIM.consts()');
  const R = { build: C.build, file: path.basename(FILE), bytes: fs.statSync(FILE).size, when: new Date().toISOString().slice(0, 10) };
  let fails = 0;
  const check = (ok, what, detail) => { if (!ok) fails++; (R.checks = R.checks || []).push({ ok: !!ok, what, detail: detail || '' }); console.log('  ' + (ok ? 'ok  ' : 'FAIL') + '  ' + what + (detail ? '   ' + detail : '')); };

  console.log(`\nMAGIC, measured against build ${C.build}\n`);

  /* 0. what the prototype had to touch */
  R.touch = J('SIM.touch()');
  R.structure = J('SIM.structure()');
  console.log('0. STRUCTURE');
  check(R.structure.treeSum === 98, 'the Runecrafting tree sums to 98', R.structure.nodes + ' nodes, ' + R.structure.cols + ' columns, ' + R.structure.maxAbreast + ' abreast at most');
  check(R.structure.sameShapeAsFletching, 'and sits on the board exactly as Fletching does');
  check(R.structure.sorc === 30 && R.structure.bridge === 4, 'Sorcery is 30 points and its bridge is 4', 'board ' + R.structure.cmastCapNow + ' -> ' + R.structure.newCap);
  check(R.structure.pointsFromMagic === R.structure.sorc + R.structure.bridge, 'Magic levels pay for exactly that many', R.structure.pointsFromMagic + ' points from level 2 to 99');
  check(R.structure.missing.length === 0, 'every Runecrafting input exists in the game', R.structure.missing.slice(0, 4).join(', '));

  /* 1. combat level */
  R.level = J('SIM.levelCheck(200000)');
  console.log('\n1. COMBAT LEVEL');
  check(R.level.moved === 0, 'no save without Magic changes combat level', R.level.seen.toLocaleString() + ' saves tried, ' + R.level.moved + ' moved');
  check(R.level.mage99 === R.level.melee99 && R.level.arch99 === R.level.melee99, 'a pure mage, archer and fighter reach the same level', `${R.level.mage99} / ${R.level.arch99} / ${R.level.melee99}`);

  /* 2. weapon maths */
  const LV = [20, 50, 75, 99], TI = [3, 5, 7, 7];
  R.parity = J('SIM.parity(' + JSON.stringify(LV) + ',' + JSON.stringify(TI) + ')');
  R.parityRS = J('SIM.parity([20,40,60,80,99],[1,3,5,6,7])');
  /* There is no such thing as a cast without an element, so the band is tested on
     the mage as played: Fire, the element every mage has from level 1. The plain
     weapon maths are printed beside it. */
  const band = (rows, title) => {
    console.log('\n' + title);
    console.log('   lv tier  def |   melee     bow  longbow  crossbow | wand   staff  (no element) |  WAND    STAFF  (Fire) | Fire, lowest and highest against melee and each ranged weapon');
    let worst = 0;
    for (const x of rows) {
      const m = x.melee.dps, f = k => pad(pct(x[k].dps, m) + '%', 8);
      const rs = [x.bow.dps, x.longbow.dps, x.xbow.dps];
      const all = [];
      for (const k of ['wand', 'staff']) { all.push(pct(x[k].fire, m)); for (const r of rs) all.push(pct(x[k].fire, r)); }
      const lo = Math.min(...all), hi = Math.max(...all);
      x.lo = lo; x.hi = hi;
      worst = Math.max(worst, Math.abs(lo - 100), Math.abs(hi - 100));
      console.log(`   ${pad(x.lv, 2)}  T${x.tier} ${pad(x.foeDef, 4)} | ${pad(m.toFixed(1), 7)} ${f('bow')} ${f('longbow')} ${f('xbow')}  | ${pad(pct(x.wand.dps, m) + '%', 6)} ${pad(pct(x.staff.dps, m) + '%', 7)}              | ${pad(pct(x.wand.fire, m) + '%', 6)} ${pad(pct(x.staff.fire, m) + '%', 8)}         | ${lo}% to ${hi}%`);
    }
    return worst;
  };
  const w1 = band(R.parity, '2. WEAPON MATHS  ·  equal investment, matched tier, no armour (the _rangedsim.js test)');
  check(w1 <= 5, 'Magic is inside 95-105% of melee and of every ranged weapon at Lv 20, 50, 75 and 99', 'furthest from level: ' + w1.toFixed(1) + ' points');
  const w2 = band(R.parityRS, '   the same test on the levels and tiers _rangedsim.js itself prints');
  check(w2 <= 5, 'and on the five rows _rangedsim.js prints', 'furthest from level: ' + w2.toFixed(1) + ' points');
  R.ladder = J('SIM.ladder()');
  console.log('\n   EVERY CRAFTED TIER, from the level it can be wielded to five past the next  ·  % of the sword at that level (magic with Fire)');
  console.log('   tier   ' + 'lv: bow / longbow / crossbow | wand / staff');
  let lw = 0;
  for (let t = 1; t <= 7; t++) {
    const rows = R.ladder.filter(r => r.tier === t);
    console.log('   T' + t + '   ' + rows.map(r => `${r.lv}: ${Math.round(pct(r.bow, r.melee))}/${Math.round(pct(r.longbow, r.melee))}/${Math.round(pct(r.xbow, r.melee))} | ${Math.round(pct(r.wandFire, r.melee))}/${Math.round(pct(r.staffFire, r.melee))}`).join('    '));
    for (const r of rows) for (const k of ['wandFire', 'staffFire']) lw = Math.max(lw, Math.abs(pct(r[k], r.melee) - 100));
  }
  const lr = Math.max(...R.ladder.map(r => Math.max(...['bow', 'longbow', 'xbow'].map(k => Math.abs(pct(r[k], r.melee) - 100)))));
  R.ladderWorst = { magic: +lw.toFixed(1), ranged: +lr.toFixed(1) };
  check(lw <= lr + 1.5, 'across the whole ladder Magic strays no further from the sword than the bows already do', `Magic ${lw.toFixed(1)} points at worst, the bows ${lr.toFixed(1)}`);

  /* 3. dressed */
  R.dressed = J('SIM.dressed([40,60,80,99],[3,5,6,7])');
  console.log('\n3. DRESSED  ·  crafted gear, no enchants. Plate for the sword, leather for the bow, cloth for the mage. Magic with Fire.');
  console.log('   lv  def |  two hands: bow   STAFF  staff/bow |  one hand + buckler: sword  crossbow   WAND   wand/sword  wand/xbow |  sword+shield  wand+shield');
  for (const x of R.dressed) {
    const b = x.bow.dps;
    x.staffVsBow = pct(x.staff.fire, b); x.wandVsSwordB = pct(x.wand.fire, x.meleeBuckler.dps); x.wandVsXbowB = pct(x.wand.fire, x.xbowBuckler.dps);
    console.log(`   ${pad(x.lv, 2)} ${pad(x.foeDef, 4)} | ${pad(b.toFixed(1), 15)} ${pad(x.staff.fire.toFixed(1), 7)} ${pad(x.staffVsBow + '%', 9)}  | ${pad(x.meleeBuckler.dps.toFixed(1), 25)} ${pad(x.xbowBuckler.dps.toFixed(1), 9)} ${pad(x.wand.fire.toFixed(1), 6)} ${pad(x.wandVsSwordB + '%', 11)} ${pad(x.wandVsXbowB + '%', 10)}  | ${pad(x.melee.dps.toFixed(1), 12)} ${pad(x.wandShield.fire.toFixed(1), 12)}`);
  }
  console.log('   what the wrong armour costs a staff: ' + R.dressed.map(x => `Lv ${x.lv} leather ${pct(x.staffLeather.dps, x.staff.dps)}% plate ${pct(x.staffPlate.dps, x.staff.dps)}% nothing ${pct(x.staffNaked.dps, x.staff.dps)}%`).join('  ·  '));
  console.log('   Defence: ' + R.dressed.map(x => `Lv ${x.lv} cloth ${x.staff.s.def} leather ${x.bow.s.def} plate+shield ${x.melee.s.def}`).join('  ·  '));
  check(R.dressed.every(x => x.staffVsBow >= 95 && x.staffVsBow <= 105), 'dressed, a staff in cloth is inside 95-105% of a bow in leather', R.dressed.map(x => x.staffVsBow + '%').join(' '));
  /* A wand is a light weapon and a crossbow is a heavy one, so the wand gets the
     light-weapon crit the bow and the dagger get and the crossbow does not. That is
     the whole of the gap, and it is why this pair is held to 108 and not 105. */
  check(R.dressed.every(x => x.wandVsXbowB >= 95 && x.wandVsXbowB <= 108), 'and a wand with a buckler is inside 95-108% of a crossbow with one', R.dressed.map(x => x.wandVsXbowB + '%').join(' '));
  check(R.dressed.every(x => x.staffLeather.dps < x.staff.dps * 0.97 && x.staffPlate.dps < x.staffLeather.dps), 'cloth is the right thing to cast in at every tier: leather is worse, plate worse again');

  /* 4. best in slot */
  R.best = J('SIM.best()');
  console.log('\n4. BEST IN SLOT  ·  Lv 99, enchants at average quality (0.4), the _rangedstr.js table');
  console.log('   ' + padr('loadout', 44) + pad('acc', 6) + pad('hit', 6) + pad('speed', 7) + pad('crit', 6) + pad('atk%', 6) + pad('rng%', 6) + pad('mag%', 6) + pad('dps@500', 10) + pad('@1000', 9) + pad('@2000', 9));
  for (const x of R.best) {
    console.log('   ' + padr(x.label, 44) + pad(x.s.acc, 6) + pad(x.s.hit, 6) + pad((x.s.swing / 1000).toFixed(2), 7) + pad((x.s.crit * 100).toFixed(0) + '%', 6)
      + pad((x.s.atkBoost * 100).toFixed(0) + '%', 6) + pad((x.s.rangedStr * 100).toFixed(0) + '%', 6) + pad((x.s.magicDmg * 100).toFixed(0) + '%', 6)
      + pad(x.dps[500], 10) + pad(x.dps[1000], 9) + pad(x.dps[2000], 9));
  }
  const g = l => R.best.find(x => x.label === l);
  const fm = g('FULL: Faultline + Sunder Rune'), fb = g('FULL: Plummet + Sundershaft'), fsw = g('FULL: Sunderedge + Faultward'), fw = g('FULL: Starcall Wand + buckler');
  R.bestSummary = { staffVsBow: pct(fm.dps[500], fb.dps[500]), staffVsBow1000: pct(fm.dps[1000], fb.dps[1000]), staffVsBow2000: pct(fm.dps[2000], fb.dps[2000]), staffVsSword: pct(fm.dps[500], fsw.dps[500]), wandVsBow: pct(fw.dps[500], fb.dps[500]) };
  check(R.bestSummary.staffVsBow >= 95 && R.bestSummary.staffVsBow <= 105, 'the finished mage is inside 95-105% of the finished archer', `staff ${R.bestSummary.staffVsBow}% at def 500, ${R.bestSummary.staffVsBow1000}% at def 1000; wand ${R.bestSummary.wandVsBow}%`);

  /* 5. the Spire */
  R.walls = J('SIM.walls()');
  console.log('\n5. THE SPIRE  ·  Lv 99 in the best gear, the definition _wall.js uses');
  console.log('   ' + padr('build', 34) + pad('acc', 6) + pad('hit', 6) + pad('def', 6) + pad('hp', 6) + pad('DR', 5) + pad('wall', 7) + pad('4-min', 7));
  for (const x of R.walls) console.log('   ' + padr(x.label + (x.asc ? '  *max' : '  *0'), 34) + pad(x.acc, 6) + pad(x.hit, 6) + pad(x.def, 6) + pad(x.hp, 6) + pad((x.dr * 100).toFixed(0) + '%', 5) + pad(x.lethal, 7) + pad(x.slow, 7));
  for (const x of R.walls.filter(x => /staff|wand/.test(x.label))) {
    const w = Math.min(x.lethal, x.slow);
    check(w >= 25 && w <= 65, `${x.label}${x.asc ? ' (ascended)' : ''}: the wall is between floors 25 and 65`, 'floor ' + w);
    check(x.lethal <= x.slow + (x.asc ? 2 : 0), '   and lethality is the limit, not fight length', `lethality ${x.lethal}, four-minute ${x.slow}`);
  }

  /* 6. rune economy */
  R.economy = J('SIM.economy()');
  console.log('\n6. WHAT A RUNE COSTS  ·  seconds of work per rune, from the stone up (the _rangedecon.js method)');
  console.log('   at the level the rune unlocks, no tree               |  at 99 with every tree');
  console.log('   rune       stone   fuel   make | a rune  an arrow    |  a rune  an arrow   bench makes');
  const eu = R.economy.runes.filter(x => !x.trained), et = R.economy.runes.filter(x => x.trained);
  const au = R.economy.arrows.filter(x => !x.trained), at = R.economy.arrows.filter(x => x.trained);
  eu.forEach((x, i) => console.log(`   ${padr(x.name, 9)} ${pad(x.stoneSec, 6)} ${pad(x.fuelSec, 6)} ${pad(x.makeSec, 6)} | ${pad(x.perRune + 's', 6)} ${pad(au[i].perArrow + 's', 8)}    | ${pad(et[i].perRune + 's', 7)} ${pad(at[i].perArrow + 's', 8)} ${pad(et[i].runesPerHrBench.toLocaleString() + '/hr', 13)}`));
  /* an hour of casting, per family. The first three columns are a new mage: skills
     at the level the rune unlocks, no tree. The last is a finished one: 99s, every
     tree, and the 85% ceiling on saving. */
  const SAVES = [['new, nothing saved', 0, false], ['new, robes only (7.5%)', 0.075, false], ['new, half the saving (40%)', 0.40, false], ['finished (85%)', 0.85, true]];
  /* The spell is the biggest the matched rune powers, which is what the weapon
     maths above measured. It spends `cls` runes a cast. */
  /* Agility decides how many casts an hour of fighting holds. A new mage has it at
     the level the rune unlocks, like every other skill in that column; a finished
     one has 99. The weapon maths are speed for speed, so the ratios do not move,
     but the rune bill does. */
  const _rates = {}; const rate = (tier, agi) => _rates[tier + ':' + agi] || (_rates[tier + ':' + agi] = J(`SIM.castRates(${tier},${agi})`));
  R.upkeep = R.parity.map(x => {
    const cls = eu[x.tier - 1].cls;
    const o = { lv: x.lv, tier: x.tier, rune: eu[x.tier - 1].name, cls, spell: MD.SPELLS[cls - 1].n, rows: [] };
    for (const [label, sv, trained] of SAVES) {
      const rune = (trained ? et : eu)[x.tier - 1], arrow = (trained ? at : au)[x.tier - 1];
      const agi = trained ? 99 : rune.lvl, c = rate(x.tier, agi);
      const mins = (casts, per) => +(casts * (1 - sv) * per / 60).toFixed(1);
      o.rows.push({ label, save: sv, trained, agi, castsWand: Math.round(c.wand), castsStaff: Math.round(c.staff), shots: Math.round(c.bow),
        wand: mins(c.wand, rune.perCast), staff: mins(c.staff, rune.perCast), bow: mins(c.bow, arrow.perArrow) });
    }
    o.castsWand = o.rows[0].castsWand; o.castsStaff = o.rows[0].castsStaff; o.shots = o.rows[0].shots;
    o.benchHr = eu[x.tier - 1].runesPerHrBench;
    return o;
  });
  console.log('\n   AN HOUR OF CASTING  ·  minutes of quarrying, burning and firing it costs:  wand / staff (bow)');
  console.log('   lv  rune      casts/hr wand/staff |  ' + SAVES.map(sv => padr(sv[0], 30)).join(''));
  for (const u of R.upkeep) console.log(`   ${pad(u.lv, 2)}  ${padr(u.rune, 9)} ${pad(u.castsWand, 6)} / ${pad(u.castsStaff, 5)}      |  ` + u.rows.map(r => padr(`${r.wand}m / ${r.staff}m (${r.bow}m)`, 30)).join(''));
  /* net of the rune cost: the hour is fighting plus the upkeep it needs */
  console.log('\n   WITH THE RUNE COST TAKEN OFF  ·  damage per hour of your time (fighting plus feeding the weapon), as % of melee');
  console.log('   lv |' + SAVES.map(sv => padr('  ' + sv[0], 36)).join('|'));
  R.net = R.parity.map((x, i) => {
    const u = R.upkeep[i], m = x.melee.dps, o = { lv: x.lv, rows: [] };
    for (const r of u.rows) {
      const net = (dps, mins) => pct(dps * 60 / (60 + mins), m);
      o.rows.push({ label: r.label, wand: net(x.wand.fire, r.wand), staff: net(x.staff.fire, r.staff), bow: net(x.bow.dps, r.bow) });
    }
    console.log(`   ${pad(x.lv, 2)} |` + o.rows.map(r => padr(`  wand ${r.wand}% staff ${r.staff}% bow ${r.bow}%`, 36)).join('|'));
    return o;
  });
  const netMax = R.net.map(n => n.rows[3]);
  check(netMax.every(r => r.staff >= 95 && r.staff <= 105), 'with the rune cost taken off, a finished mage with a staff is still inside 95-105% of melee', netMax.map(r => r.staff + '%').join(' '));
  check(netMax.every(r => r.wand >= 90), 'and with a wand, which casts 44% more often, inside 90%', netMax.map(r => r.wand + '%').join(' '));
  check(R.net.every(n => n.rows.every(r => r.staff >= r.bow && r.wand >= r.bow)), 'at every stage a mage keeps more of the hour than an archer does');
  check(R.upkeep.every(u => u.benchHr > u.castsWand * u.cls * 4), 'one hour at the bench makes more than four hours of casting the biggest spell', R.upkeep.map(u => u.benchHr.toLocaleString()).join(' / ') + ' runes an hour');

  /* 6b. the spell ladder: four sizes of each element */
  R.spells = J('SIM.spells()');
  R.sizes = J('SIM.spellSizes(' + JSON.stringify(LV) + ',' + JSON.stringify(TI) + ')');
  console.log('\n6b. SPELL SIZES  ·  the Magic Power a cast gets, by rune and by size');
  console.log('   rune       grade  arrow  ' + MD.SPELLS.map(s => pad(s.n + ' x' + s.runes, 10)).join('') + '   batch');
  for (const r of R.spells.table) console.log('   ' + padr(r.name, 10) + pad(r.tier, 5) + pad(r.arrow, 7) + '  ' + MD.SPELLS.map((s, i) => pad(i < r.cls ? r.sizes[i] : '.', 10)).join('') + pad(r.batch || 'drop', 8));
  console.log('   first castable: ' + R.spells.sizes.map(s => `${s.n} at Magic ${s.magic} (${s.weapon}, ${s.rune} Runes)`).join(' · '));
  check(R.spells.table.every(r => r.sizes[r.cls - 1] === r.pow && r.pow === r.arrow), 'the biggest spell a rune powers gets exactly the strength of the arrow of its tier', R.spells.table.map(r => r.pow).join(' '));
  check(R.spells.table.every(r => r.sizes.every((p, i) => i === 0 || p > r.sizes[i - 1])), 'with the same rune a bigger spell always gets more');
  check(MD.SPELLS.every((s, i) => { const col = R.spells.table.filter(r => r.cls > i).map(r => r.sizes[i]); return col.every((p, j) => j === 0 || p >= col[j - 1]); }), 'a better rune is never worse at the same spell');
  check(R.spells.table.filter(r => r.batch).every(r => r.batch === MD.RUNE_BATCH * r.cls), 'a batch is ' + MD.RUNE_BATCH + ' runes for every rune the biggest spell spends', R.spells.table.filter(r => r.batch).map(r => r.batch).join(' '));
  console.log('\n   WEAPON ALONE, FIRE ON  ·  the same mage at each size its rune powers');
  console.log('   lv  weapon  rune           spell   power  max hit    dps   of biggest  % melee   runes/hr | upkeep new  net new | upkeep finished  net finished');
  for (const z of R.sizes) {
    const par = R.parity.find(p => p.lv === z.lv), m = par.melee.dps, big = z.rows[0];
    const cu = eu[z.runeTier - 1].perRune, ct = et[z.runeTier - 1].perRune;
    z.newAgi = eu[z.runeTier - 1].lvl; z.newCasts = rate(z.tier, z.newAgi)[z.fam]; z.finCasts = rate(z.tier, 99)[z.fam];
    for (const r of z.rows) {
      r.ofBig = pct(r.dps, big.dps); r.raw = pct(r.dps, m); r.runesHr = Math.round(z.newCasts * r.size);
      r.newMins = +(z.newCasts * r.size * cu / 60).toFixed(1); r.finMins = +(z.finCasts * r.size * 0.15 * ct / 60).toFixed(1);
      r.newNet = pct(r.dps * 60 / (60 + r.newMins), m); r.finNet = pct(r.dps * 60 / (60 + r.finMins), m);
      console.log(`   ${pad(z.lv, 2)}  ${padr(z.fam, 6)}  ${padr(z.rune, 14)} ${padr(r.name, 6)} ${pad(r.pow, 5)} ${pad(r.hit, 8)} ${pad(r.dps.toFixed(1), 7)} ${pad(r.ofBig + '%', 10)} ${pad(r.raw + '%', 9)} ${pad(r.runesHr.toLocaleString(), 9)} | ${pad(r.newMins + 'm', 9)} ${pad(r.newNet + '%', 8)} | ${pad(r.finMins + 'm', 10)} ${pad(r.finNet + '%', 13)}`);
    }
  }
  const std = R.sizes.filter(z => z.matched);
  check(std.every(z => Math.abs(z.rows[0].dps - R.parity.find(p => p.lv === z.lv)[z.fam].fire) < 1e-6), 'the biggest spell is the cast the weapon maths above measured, to the digit');
  const steps = []; for (const z of R.sizes) for (let i = 1; i < z.rows.length; i++) steps.push(+(100 - pct(z.rows[i].dps, z.rows[i - 1].dps)).toFixed(1));
  check(steps.every(s => s >= 6 && s <= 20), 'each size down costs between 6 and 20% of the damage and saves one rune a cast', 'smallest step ' + Math.min(...steps) + '%, largest ' + Math.max(...steps) + '%');
  check(R.sizes.every(z => z.rows.every(r => r.finNet <= z.rows[0].finNet + 0.05)), 'for a finished mage the biggest spell is the best use of an hour', std.filter(z => z.fam === 'staff').map(z => z.rows.map(r => r.finNet + '%').join(' > ')).join('  ·  '));
  const thrift = R.sizes.map(z => +(z.rows[z.rows.length - 1].newNet - z.rows[0].newNet).toFixed(1));
  R.sizeSummary = { steps: [Math.min(...steps), Math.max(...steps)], thrift: [Math.min(...thrift), Math.max(...thrift)],
    finGain: [Math.min(...R.sizes.map(z => +(z.rows[0].finNet - z.rows[z.rows.length - 1].finNet).toFixed(1))), Math.max(...R.sizes.map(z => +(z.rows[0].finNet - z.rows[z.rows.length - 1].finNet).toFixed(1)))] };
  check(thrift.every(s => s <= 1), 'and for a new mage too: a smaller spell never beats the biggest by more than a point, with the rune cost taken off', 'Bolt against the biggest spell: ' + Math.min(...thrift) + ' to +' + Math.max(...thrift) + ' points');
  /* what a smaller spell is for: the same stack of runes lasts longer and does more damage in total */
  for (const z of R.sizes) for (const r of z.rows) { r.lasts = +(z.rows[0].size / r.size).toFixed(2); r.stackDmg = +(r.ofBig / 100 * z.rows[0].size / r.size).toFixed(2); }
  const stretch = R.sizes.map(z => z.rows[z.rows.length - 1].stackDmg);
  R.sizeSummary.stretch = [Math.min(...stretch), Math.max(...stretch)];
  check(R.sizes.every(z => z.rows.every((r, i) => i === 0 || r.stackDmg > z.rows[i - 1].stackDmg)), 'what a smaller spell is for: the same stack of runes does more damage in total, the smaller the spell', 'a stack cast as Bolts does ' + Math.min(...stretch) + ' to ' + Math.max(...stretch) + ' times the damage it does at full size');

  /* 7. the reagents enchanting already spends */
  R.reagents = J('SIM.reagents()');
  console.log('\n7. THE ENCHANTING POOL');
  console.log('   one enchant on tier-8 gear: ' + JSON.stringify(R.reagents.cost[8]));
  console.log(`   a maxed character makes, per hour: ${R.reagents.dustHr} Arcane Dust (Alchemy) · ${R.reagents.fragment.perHr} Rune Fragments (${R.reagents.fragment.how}) · ${R.reagents.essenceForage.perHr} Mana Essence foraged, ${R.reagents.essenceBrewHr} brewed`);
  console.log('   everything Magic ever spends from that pool, once, to bind every crafted staff and wand: ' + JSON.stringify(R.reagents.magicSpendsOnce));
  check(R.reagents.magicSpendsOnce.rune_fragment === 0 && R.reagents.magicSpendsOnce.mana_essence === 0, 'Magic spends no Rune Fragments and no Mana Essence');

  /* 8. skilling xp */
  R.skillXp = J('SIM.skillXp()');
  console.log('\n8. RUNECRAFTING XP AGAINST ITS NEIGHBOURS  ·  best unlocked act, xp/hr, no tree');
  const CMP = ['runecrafting', 'fletching', 'crafting', 'smithing', 'cooking', 'alchemy', 'jeweler', 'firemaking', 'mining'];
  console.log('   lv   ' + CMP.map(s => pad(s.slice(0, 9), 10)).join('') + pad('runes only', 12) + pad('quarry', 9));
  for (const r of R.skillXp.rows) console.log('   ' + pad(r.lv, 2) + '   ' + CMP.map(s => pad((r[s].xph / 1000).toFixed(1) + 'k', 10)).join('') + pad((r.runesOnly.xph / 1000).toFixed(1) + 'k', 12) + pad((r.quarry / 1000).toFixed(1) + 'k', 9));
  console.log('   hours 1 to 99, inputs on hand: ' + Object.keys(R.skillXp.hours).map(k => k + ' ' + R.skillXp.hours[k]).join(' · '));
  console.log('   peak at 99 with the tree: ' + CMP.map(s => s + ' ' + Math.round(R.skillXp.peak[s] / 1000) + 'k').join(' · '));
  for (const r of R.skillXp.rows) { r.vsFletching = pct(r.runecrafting.xph, r.fletching.xph); }
  check(R.skillXp.rows.every(r => r.vsFletching >= 70 && r.vsFletching <= 115), 'Runecrafting levels within 70-115% of Fletching at every level', R.skillXp.rows.map(r => r.vsFletching + '%').join(' '));
  check(R.skillXp.rows.every(r => r.quarry < r.copper), 'quarrying runestone is never the Mining XP pick', R.skillXp.rows.map(r => Math.round(r.quarry / r.copper * 100) + '%').join(' ') + ' of copper');

  /* 9. elements */
  R.elements = J('SIM.elements()');
  console.log('\n9. THE ELEMENT PASS  ·  ' + R.elements.total + ' monsters');
  console.log('   ' + Object.keys(R.elements.count).map(k => `${k}: weak ${R.elements.count[k].weak}, resist ${R.elements.count[k].resist}`).join(' · '));
  console.log(`   today: ${R.elements.melee.weak} of ${R.elements.total} are weak to a melee type and ${R.elements.melee.resist} resist one; ${R.elements.ranged.weak} are weak to ranged and ${R.elements.ranged.resist} resist it`);
  for (const z of R.elements.zones) console.log(`   ${padr(z.name, 18)} Lv ${pad(z.minLvl, 2)}-${pad(z.maxLvl, 2)}  best ${padr(z.best, 7)} (${z.bestWeak}/${z.n} weak)   ` + Object.keys(z.score).map(k => k[0].toUpperCase() + (z.score[k] >= 0 ? '+' : '') + z.score[k]).join(' '));
  const cnt = R.elements.count;
  console.log('   once unlocked: ' + Object.keys(R.elements.after).map(k => { const a = R.elements.after[k]; return `${k} is right for ${a.weak} of ${a.pool} and wrong for ${a.resist}`; }).join(' · '));
  check(Object.keys(cnt).every(k => cnt[k].weak >= 6 && cnt[k].resist >= 6), 'every element has monsters weak to it and monsters that resist it', Object.keys(cnt).map(k => `${k} ${cnt[k].weak}/${cnt[k].resist}`).join('  '));
  check(R.elements.fireResistedEarly.length <= 1, 'Fire, the only element below Magic 12, is almost never the wrong one that early', R.elements.fireResistedEarly.join(', ') || 'nothing under level 15 resists it');
  check(R.elements.rows.every(r => r.weakEl), 'every monster is weak to one element, as every monster is weak to one melee type');

  /* 10. fights */
  if (!QUICK) {
    console.log('\n10. FIGHTS  ·  40 simulated hours each on the real monster, dressed in crafted gear of the tier');
    const REF = { 20: 'goblin_shaman', 50: 'ogre_houndmaster', 75: 'wyvern', 99: 'dread_knight' };
    const TIER = { 20: 3, 50: 5, 75: 7, 99: 7 };
    R.fights = [];
    for (const lv of [20, 50, 75, 99]) {
      const F = J(`SIM.fighters(${lv},${TIER[lv]})`), M = C.monsters.find(m => m.id === REF[lv]);
      const o = { lv, mon: M.name, monId: M.id, weakTo: M.weakTo, weakEl: M.weakEl, resistEl: M.resistEl, rows: {} };
      /* validation: on a monster that cannot die the loop must agree with the closed form */
      const dummy = Object.assign({}, M, { hp: 1e12 });
      const v = fight(F.melee, dummy, C, { neutral: true, hours: 60 });
      const exp = clamp(F.melee.acc / (F.melee.acc + M.def)) * F.melee.hit * 0.75 * (1 + F.melee.crit * (1 + F.melee.critDmg)) / (F.melee.swing / 1000);
      o.validate = pct(v.rawDps, exp);
      o.rows.melee = fight(F.melee, M, C, { neutral: true });
      o.rows.meleeWeak = fight(F.melee, M, C, { forceWk: 1.15 });
      o.rows.bow = fight(F.bow, M, C, { neutral: true });
      o.rows.longbow = fight(F.longbow, M, C, { neutral: true });
      o.rows.meleeBuckler = fight(F.meleeBuckler, M, C, { neutral: true });
      o.rows.xbowBuckler = fight(F.xbowBuckler, M, C, { neutral: true });
      for (const fam of ['wand', 'staff', 'wandBare']) {
        o.rows[fam] = fight(F[fam], M, C, { neutral: true, save: 0 });
        for (const e of MD.ELEMENTS) o.rows[fam + '_' + e.k] = fight(F[fam], M, C, { neutral: true, el: e.k, save: 0 });
        o.rows[fam + '_weak'] = fight(F[fam], M, C, { el: 'fire', forceWk: MD.WEAK_MULT, save: 0 });
        o.rows[fam + '_resist'] = fight(F[fam], M, C, { el: 'fire', forceWk: MD.RESIST_MULT, save: 0 });
      }
      /* the same staff at each smaller size, Fire on, to see what a real monster does to the trade */
      o.sizes = [{ size: F.staff.size, name: MD.SPELLS[F.staff.size - 1].n, hit: F.staff.hit, dps: o.rows.staff_fire.dps, spentHr: o.rows.staff_fire.spentHr, killsHr: o.rows.staff_fire.killsHr }];
      for (let sz = F.staff.size - 1; sz >= 1; sz--) {
        const x = fight(F['staff_s' + sz], M, C, { neutral: true, el: 'fire', save: 0 });
        o.rows['staff_fire_s' + sz] = x;
        o.sizes.push({ size: sz, name: MD.SPELLS[sz - 1].n, hit: F['staff_s' + sz].hit, dps: x.dps, spentHr: x.spentHr, killsHr: x.killsHr });
      }
      for (const z of o.sizes) { z.ofBig = pct(z.dps, o.sizes[0].dps); z.hitOfBig = pct(z.hit, o.sizes[0].hit); }
      o.stats = { melee: F.melee, bow: F.bow, wand: F.wand, staff: F.staff, wandBare: F.wandBare };
      R.fights.push(o);
      const m = o.rows.melee;
      console.log(`\n   Lv ${lv}  ${M.name} (${M.hp} hp, def ${M.def})   loop against the closed form: ${o.validate}%`);
      console.log('   ' + padr('', 22) + pad('dps', 7) + pad('% melee', 9) + pad('kills/hr', 10) + pad('xp/hr', 9) + pad('% melee', 9) + pad('dmg taken/hr', 14) + pad('healed/hr', 11) + pad('casts/hr', 10));
      const line = (label, x) => console.log('   ' + padr(label, 22) + pad(x.dps.toFixed(1), 7) + pad(pct(x.dps, m.dps) + '%', 9) + pad(Math.round(x.killsHr), 10) + pad(Math.round(x.xpHr / 1000) + 'k', 9) + pad(pct(x.xpHr, m.xpHr) + '%', 9) + pad(Math.round(x.takenHr).toLocaleString(), 14) + pad(Math.round(x.healHr).toLocaleString(), 11) + pad(Math.round(x.castsHr), 10));
      line('sword + shield', m); line('sword, weakness hit', o.rows.meleeWeak); line('sword + buckler', o.rows.meleeBuckler);
      line('shortbow', o.rows.bow); line('longbow', o.rows.longbow); line('crossbow + buckler', o.rows.xbowBuckler);
      const NM = { wand: 'wand + buckler', staff: 'staff', wandBare: 'wand, hand empty' };
      for (const fam of ['staff', 'wandBare', 'wand']) {
        line(NM[fam] + ', no element', o.rows[fam]);
        for (const e of MD.ELEMENTS) line('  ' + fam + ' ' + e.n, o.rows[fam + '_' + e.k]);
        line('  ' + fam + ' Fire, weak', o.rows[fam + '_weak']); line('  ' + fam + ' Fire, resisted', o.rows[fam + '_resist']);
      }
    }
    check(R.fights.every(f => Math.abs(f.validate - 100) < 1.5), 'the fight loop agrees with the closed form on a monster that cannot die', R.fights.map(f => f.validate + '%').join(' '));
    const fx = R.fights.map(f => ({ lv: f.lv, fire: pct(f.rows.staff_fire.dps, f.rows.staff.dps), storm: pct(f.rows.staff_storm.dps, f.rows.staff.dps),
      frostTaken: pct(f.rows.staff_frost.takenHr, f.rows.staff.takenHr), shadowHeal: pct(f.rows.staff_shadow.healHr, f.rows.staff.takenHr) }));
    R.riders = fx;
    console.log('\n   WHAT EACH ELEMENT IS WORTH on a monster that is neither weak nor resistant (staff)');
    for (const x of fx) console.log(`   Lv ${pad(x.lv, 2)}: Fire ${(x.fire - 100).toFixed(1)}% more damage · Storm ${(x.storm - 100).toFixed(1)}% more damage · Frost ${(100 - x.frostTaken).toFixed(1)}% less damage taken · Shadow heals ${x.shadowHeal.toFixed(1)}% of the damage you take`);
    check(fx.every(x => x.fire - 100 <= 4 && x.fire - 100 >= 0.5), 'on a real monster the burn from Fire is worth half a percent to 4%: never a tier, never nothing', fx.map(x => (x.fire - 100).toFixed(1) + '%').join(' '));
    R.real = R.fights.map(f => ({ lv: f.lv, mon: f.mon, staffVsBow: pct(f.rows.staff_fire.dps, f.rows.bow.dps), wandBareVsBow: pct(f.rows.wandBare_fire.dps, f.rows.bow.dps),
      wandVsXbow: pct(f.rows.wand_fire.dps, f.rows.xbowBuckler.dps), wandVsSwordB: pct(f.rows.wand_fire.dps, f.rows.meleeBuckler.dps), staffVsWandBare: pct(f.rows.staff_fire.dps, f.rows.wandBare_fire.dps),
      bowVsSword: pct(f.rows.bow.dps, f.rows.melee.dps), longVsBow: pct(f.rows.longbow.dps, f.rows.bow.dps) }));
    console.log('\n   ON REAL MONSTERS, dressed, Fire on: ' + R.real.map(x => `Lv ${x.lv} staff ${x.staffVsBow}% of the bow, wand alone ${x.wandBareVsBow}%, wand+buckler ${x.wandVsXbow}% of crossbow+buckler`).join('  ·  '));
    check(R.real.every(x => x.staffVsBow >= 95 && x.staffVsBow <= 105), 'on real monsters a staff in cloth is inside 95-105% of a bow in leather', R.real.map(x => x.staffVsBow + '%').join(' '));
    check(R.real.every(x => x.wandBareVsBow >= 95 && x.wandBareVsBow <= 105), 'and so is a wand with the other hand empty', R.real.map(x => x.wandBareVsBow + '%').join(' '));
    check(R.real.every(x => x.wandVsXbow >= 95 && x.wandVsXbow <= 108), 'and a wand with a buckler is inside 95-108% of a crossbow with a buckler', R.real.map(x => x.wandVsXbow + '%').join(' '));
    console.log('\n   SPELL SIZES ON REAL MONSTERS (staff, Fire, nothing saved): damage as a share of the biggest spell, and runes spent an hour');
    for (const f of R.fights) console.log(`   Lv ${pad(f.lv, 2)} ${padr(f.mon, 18)} ` + f.sizes.map(z => `${z.name} ${z.ofBig}% (max hit ${z.hitOfBig}%), ${Math.round(z.spentHr).toLocaleString()} runes`).join('  ·  '));
    check(R.fights.every(f => f.sizes.every((z, i) => i === 0 || (z.dps < f.sizes[i - 1].dps && z.spentHr < f.sizes[i - 1].spentHr))), 'on real monsters a smaller spell does less damage and spends fewer runes, every time');
    check(R.fights.every(f => f.sizes.every(z => z.ofBig >= z.hitOfBig - 1.5)), 'and loses no more than its max hit says: a smaller hit wastes less on a monster that is nearly dead');
    R.xp = R.fights.map(f => ({ lv: f.lv, mon: f.mon, melee: Math.round(f.rows.melee.xpHr), bow: Math.round(f.rows.bow.xpHr), wand: Math.round(f.rows.wandBare_fire.xpHr), staff: Math.round(f.rows.staff_fire.xpHr),
      wandPct: pct(f.rows.wandBare_fire.xpHr, f.rows.bow.xpHr), staffPct: pct(f.rows.staff_fire.xpHr, f.rows.bow.xpHr), bowPct: pct(f.rows.bow.xpHr, f.rows.melee.xpHr) }));
  }

  /* 11. art already in the file */
  R.art = J('SIM.artSizes()');
  console.log('\n11. PAINTED ART ALREADY IN THE FILE  ·  bytes per entry');
  for (const k of ['item', 'node', 'banner', 'ach', 'mon', 'pet', 'cmast']) console.log(`   ${padr(k, 8)} ${pad(R.art[k].n, 4)} entries, mean ${pad(R.art[k].mean.toLocaleString(), 7)} bytes, total ${(R.art[k].total / 1024).toFixed(0)} KB`);
  console.log('   file: ' + R.bytes.toLocaleString() + ' bytes · the audit ceiling is 12 MB (' + (12 * 1024 * 1024).toLocaleString() + '), headroom ' + ((12 * 1024 * 1024 - R.bytes) / 1024).toFixed(1) + ' KB');

  R.tables = J('SIM.tables()');
  R.consts = { XP_SCALE: C.XP_SCALE, REQ: C.REQ, P: C.P, RANGED_HIT_LVL: C.RANGED_HIT_LVL };
  R.monsters = C.monsters;
  R.fails = fails;
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(R, null, 1));
  console.log(`\n${fails ? fails + ' CHECK' + (fails > 1 ? 'S' : '') + ' FAILED' : 'every check passed'}  ·  results.json written\n`);
  process.exit(fails ? 1 : 0);
}).catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });

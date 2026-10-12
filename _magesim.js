/* Magic: the balance harness.
 *
 *     node _magesim.js           every table and every check
 *     node _magesim.js --quick   skip the simulated fights and the live ones (10 s, not a minute)
 *     CV_FILE=other.html node _magesim.js     the same checks off another build
 *
 * Magic was designed as a prototype laid over build 0.9.127.3 and measured there
 * (_magedesign/sim.js, 52 checks). This is that simulator pointed at the real
 * file, with nothing laid over it. The numbers the prototype measured are in
 * _magesim.golden.json, and the game has to reproduce them to the digit: a
 * difference is a porting bug, not a balance change. If a number is ever meant to
 * move, move it here on purpose and say why in the commit.
 *
 * Two rules, both paid for in the design sessions:
 *   every measurement starts from defaultState(), or one section's skill levels
 *   leak into the next;
 *   anything counted per hour is read at the Agility the character would really
 *   have, because Agility sets how many casts an hour of fighting holds.
 *
 * Every number comes from the game's own functions. Nothing here is a copy of a
 * formula, except the old combat level, which is kept to compare against.
 *
 * Section 13 does no sums of its own at all. It runs the game's tick() and
 * combatTick() on a clock it holds, an hour of game time at a go, and counts what
 * came out: the XP and the runes a card promises, and the damage the model in 9d
 * predicts. That is where the 100 ms combat timer shows: the tick restarts an
 * attack from the tick it landed on, so every attack time is rounded up to the
 * next tenth of a second, for every weapon. The model does not round, so the two
 * are compared with that rounding counted.
 *
 * NOT here, because they need gear from later slices (Faultline, Dawnveil, the
 * Sunder Rune, the Sorcery column): the best in slot table and the Spire wall.
 * Those two stay in _magedesign/sim.js, which runs against build 0.9.127.3.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const FILE = process.env.CV_FILE || path.join(__dirname, 'cindervale.html');
const QUICK = process.argv.includes('--quick');
const GOLD = JSON.parse(fs.readFileSync(path.join(__dirname, '_magesim.golden.json'), 'utf8'));
/* Electron, not a browser: a browser user agent is the demo build, which caps
   every level at 10. ?cvdev=1 mutes telemetry. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom = new JSDOM(fs.readFileSync(FILE, 'utf8'), {
  url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
  virtualConsole: new VirtualConsole(),
  beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); }
});

const pad = (s, n) => String(s).padStart(n);
const padr = (s, n) => String(s).padEnd(n);
const pct = (a, b) => +(a / b * 100).toFixed(1);

let fails = 0, checks = 0;
function check(ok, what, detail) {
  checks++; if (!ok) fails++;
  console.log('  ' + (ok ? 'ok  ' : 'FAIL') + '  ' + what + (detail ? '   ' + detail : ''));
}
/* The first place two values differ, as a path, or '' when they are the same.
   Numbers are compared exactly: "to the digit" means to the digit. */
function diff(got, want, at) {
  at = at || '';
  if (got === want) return '';
  if (typeof got !== typeof want || got === null || want === null || typeof got !== 'object')
    return (at || 'value') + ': got ' + JSON.stringify(got) + ', the prototype measured ' + JSON.stringify(want);
  if (Array.isArray(got) !== Array.isArray(want)) return at + ': one is a list and one is not';
  if (Array.isArray(got) && got.length !== want.length) return at + ': ' + got.length + ' entries, the prototype had ' + want.length;
  const keys = Array.isArray(want) ? want.map((_, i) => i) : Object.keys(want);
  for (const k of keys) { const d = diff(got[k], want[k], at + (Array.isArray(want) ? '[' + k + ']' : (at ? '.' : '') + k)); if (d) return d; }
  if (!Array.isArray(want)) for (const k of Object.keys(got)) if (!(k in want) && got[k] !== undefined) return at + '.' + k + ': not in what the prototype measured';
  return '';
}
function same(what, got, want) { const d = diff(JSON.parse(JSON.stringify(got)), want); check(!d, what, d ? d.slice(0, 240) : ''); }

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
  const el = o.el || null, E = el ? C.elements.find(e => e.k === el) : null;
  let wk = 1;
  if (!o.neutral) {
    if (P.kind === 'magic') wk = M.weakEl === el ? C.WEAK : M.resistEl === el ? C.RESIST : 1;
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
    if (nt === nb) {
      if (foeHp > 1) { const d = Math.min(burnDmg, foeHp - 1); foeHp -= d; dealt += d; burnDealt += d; }
      burnNext += C.BURN_TICK_MS; if (burnNext > burnUntil) burnUntil = 0;
      continue;
    }
    if (nt === youT) {
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
    foeT = t + Math.round(M.swingMs * (chillUntil > t ? 1 + chill.slow : 1));
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

/* ── the half that runs inside the game page ─────────────────────────────────
   Written as a function and handed to the page as source, so nothing in it needs
   escaping. Everything it calls is the game's. */
function PAGE() {
  var clamp = function (x) { return Math.max(0.03, Math.min(0.97, x)); };
  var BIGGEST = SPELL_SIZES[SPELL_SIZES.length - 1].k;
  var FIRE = MAGIC_ELEMENTS[0];
  var foeDefFor = function (lv) { return Math.round(12 + lv * 3.2); };   // _rangedsim.js's level-scaled defence

  var METAL = ['bronze', 'iron', 'steel', 'mithril', 'cobalt', 'runite', 'starsteel', 'starfall'];
  var WOOD = ['pine', 'oak', 'ironbark', 'ember', 'frost', 'shadow', 'ancient'];
  var HIDE = ['rough', 'chitin', 'wolf', 'ogre', 'troll', 'drake', 'demon'];
  var CLOTHK = CLOTH_TIERS.map(function (c) { return c.key; });
  var PL = ['helm', 'chest', 'legs', 'gloves', 'boots'], RB = ['hood', 'robe', 'leggings', 'wraps', 'slippers'];
  /* the rune ladder, read off the game: the items that are runes, and the act that carves each */
  var RUNES = Object.keys(ITEMS).filter(function (id) { return isRune(id); })
    .sort(function (a, b) { return ITEMS[a].ammoTier - ITEMS[b].ammoTier; }).map(function (id) {
      var act = SKILLS.runecrafting.acts.filter(function (a) { return a.out && a.out[id]; })[0] || null;
      var fuel = act ? Object.keys(act.inp).filter(function (k) { return k !== 'runestone'; })[0] : null;
      return { id: id, k: id.replace(/_rune$/, ''), n: ITEMS[id].name.replace(/ Rune$/, ''), t: ITEMS[id].ammoTier, pow: ITEMS[id].runePow,
        rn: act ? act.lvl : 0, stone: act ? act.inp.runestone : 0, fuel: fuel, fuelN: act ? act.inp[fuel] : 0, act: act };
    });
  var RUNE = RUNES.map(function (r) { return r.id; });

  function clear() {
    state.combatEquipped = {};
    state.combatXp = { attack: 0, strength: 0, defence: 0, ranged: 0, magic: 0, hitpoints: XP_CUM[99] };
    state.items = {}; state.tree = {}; state.cmast = {}; state.charClass = null;
    state.combatStyle = 'attack'; state.combatElement = 'fire'; state.effects = [];
    state.variants = {}; state.sockets = {}; state.asc = {};
    state.combatSpell = BIGGEST;   // every measurement casts the biggest spell the rune powers unless it says otherwise
  }
  /* The plain weapon maths, the _rangedsim.js definition, so the two harnesses can
     be laid side by side. */
  function rawDps(def) {
    var acc = playerAccuracy(), hit = playerMaxHit(), swing = playerSwingMs();
    return (clamp(acc / (acc + def)) * hit * (COMBAT_P.HIT_MIN + 1) / 2) / (swing / 1000);
  }
  /* What Fire adds on a long fight: burn uptime x tick size, the closed form
     _rangedstr.js uses for Barbed. */
  function burnDps(def, mult, extraChance) {
    var acc = playerAccuracy(), hit = playerMaxHit(), swing = playerSwingMs();
    var p = clamp(acc / (acc + def));
    var rate = (p / (swing / 1000)) * Math.min(1, BURN_CHANCE + (extraChance || 0));
    var up = 1 - Math.exp(-rate * BURN_DUR_MS / 1000);
    return up * hit * mult / (BURN_TICK_MS / 1000);
  }
  function snap() {
    var cb = combatBonusesAll(), cs = combatStats();
    return { acc: playerAccuracy(), hit: playerMaxHit(), swing: playerSwingMs(), def: playerDefence(), hp: maxHpFromStats(),
      crit: +Math.min(1, cb.critChance || 0).toFixed(4), critDmg: +(cb.critDmg || 0).toFixed(4),
      lifesteal: +(cb.lifesteal || 0).toFixed(4), dodge: +(cb.dodge || 0).toFixed(4),
      block: +((typeof shieldDamageReduction === 'function') ? shieldDamageReduction() : 0).toFixed(4),
      atkBoost: +(cb.atkBoost || 0).toFixed(4), rangedStr: +(cb.rangedStr || 0).toFixed(4), magicDmg: +(cb.magicDmg || 0).toFixed(4),
      atk: cs.atk, str: cs.str, rstr: cs.rstr || 0, mpow: cs.mpow || 0, gdef: cs.def,
      armourMult: +((usingMagic() ? magicArmourMult() : usingRanged() ? rangedArmourMult() : 1)).toFixed(4),
      runeSave: usingMagic() ? +runeSaveRate().toFixed(4) : 0, size: usingMagic() ? spellSize() : 1, style: combatXpStat(), cl: combatLevel() };
  }

  /* ── weapon maths at equal investment ── */
  function parity(levels, tiers) {
    var rows = [];
    levels.forEach(function (lv, ix) {
      var t = tiers[ix], def = foeDefFor(lv), metal = METAL[t - 1], wood = WOOD[Math.min(WOOD.length - 1, t - 1)], rune = RUNE[t - 1];
      var r = { lv: lv, tier: t, foeDef: def };
      function one(key, set) { clear(); set(); r[key] = { dps: rawDps(def), s: snap() }; return r[key]; }
      one('melee', function () { state.combatXp.attack = XP_CUM[lv]; state.combatXp.strength = XP_CUM[lv]; state.combatEquipped.weapon = metal + '_sword'; });
      one('bow', function () { state.combatXp.ranged = XP_CUM[lv]; state.combatEquipped.weapon = wood + '_shortbow'; state.combatEquipped.quiver = metal + '_arrow'; state.items[metal + '_arrow'] = 1e6; });
      one('longbow', function () { state.combatXp.ranged = XP_CUM[lv]; state.combatEquipped.weapon = wood + '_longbow'; state.combatEquipped.quiver = metal + '_arrow'; state.items[metal + '_arrow'] = 1e6; });
      one('xbow', function () { state.combatXp.ranged = XP_CUM[lv]; state.combatEquipped.weapon = metal + '_crossbow'; state.combatEquipped.quiver = metal + '_bolt'; state.items[metal + '_bolt'] = 1e6; });
      ['wand', 'staff'].forEach(function (fam) {
        var o = one(fam, function () { state.combatXp.magic = XP_CUM[lv]; state.combatEquipped.weapon = wood + '_' + fam; state.combatEquipped.quiver = rune; state.items[rune] = 1e6; });
        o.fire = o.dps + burnDps(def, FIRE.rider.burn, 0);
        o.castsHr = 3600000 / o.s.swing;
      });
      r.bow.shotsHr = 3600000 / r.bow.s.swing;
      rows.push(r);
    });
    return rows;
  }
  /* Every crafted tier, from the level it can be wielded to just past the next. */
  function ladder() {
    var REQ = COMBAT_GEAR_REQ, out = [];
    for (var t = 1; t <= 7; t++) {
      var lo = REQ[t], hi = t < 7 ? REQ[t + 1] + 5 : 99;
      var metal = METAL[t - 1], wood = WOOD[t - 1], rune = RUNE[t - 1];
      for (var L = lo; L <= hi; L += (L < hi && L + 5 > hi) ? (hi - L) : 5) {
        var def = foeDefFor(L), r = { tier: t, lv: L };
        var go = function (key, set) { clear(); set(); r[key] = rawDps(def); if (usingMagic()) r[key + 'Fire'] = r[key] + burnDps(def, FIRE.rider.burn, 0); };
        go('melee', function () { state.combatXp.attack = XP_CUM[L]; state.combatXp.strength = XP_CUM[L]; state.combatEquipped.weapon = metal + '_sword'; });
        go('bow', function () { state.combatXp.ranged = XP_CUM[L]; state.combatEquipped.weapon = wood + '_shortbow'; state.combatEquipped.quiver = metal + '_arrow'; state.items[metal + '_arrow'] = 1e6; });
        go('longbow', function () { state.combatXp.ranged = XP_CUM[L]; state.combatEquipped.weapon = wood + '_longbow'; state.combatEquipped.quiver = metal + '_arrow'; state.items[metal + '_arrow'] = 1e6; });
        go('xbow', function () { state.combatXp.ranged = XP_CUM[L]; state.combatEquipped.weapon = metal + '_crossbow'; state.combatEquipped.quiver = metal + '_bolt'; state.items[metal + '_bolt'] = 1e6; });
        go('wand', function () { state.combatXp.magic = XP_CUM[L]; state.combatEquipped.weapon = wood + '_wand'; state.combatEquipped.quiver = rune; state.items[rune] = 1e6; });
        go('staff', function () { state.combatXp.magic = XP_CUM[L]; state.combatEquipped.weapon = wood + '_staff'; state.combatEquipped.quiver = rune; state.items[rune] = 1e6; });
        out.push(r);
        if (L >= hi) break;
      }
    }
    return out;
  }

  /* ── dressed, crafted, no enchants ── */
  function wear(o, lv) {
    clear();
    var L = lv;
    state.combatXp = { attack: XP_CUM[L], strength: XP_CUM[L], defence: XP_CUM[L], hitpoints: XP_CUM[99], ranged: XP_CUM[L], magic: XP_CUM[L] };
    var ce = {};
    if (o.weapon) ce.weapon = o.weapon;
    if (o.quiver) { ce.quiver = o.quiver; state.items[o.quiver] = 1e6; }
    for (var s in (o.armour || {})) ce[s] = o.armour[s];
    for (var s2 in ce) { if (s2 !== 'quiver') state.items[ce[s2]] = (state.items[ce[s2]] || 0) + 1; }
    state.combatEquipped = ce;
    if (o.el) state.combatElement = o.el;
    if (o.cls) state.charClass = o.cls;
    if (o.spell) state.combatSpell = o.spell;
    combat.active = false; combat.raid = null;
    refreshCombatStats();
  }
  function set5(k, names, extra) {
    var o = { helmet: k + '_' + names[0], chest: k + '_' + names[1], legs: k + '_' + names[2], gloves: k + '_' + names[3], boots: k + '_' + names[4] };
    for (var x in (extra || {})) o[x] = extra[x];
    return o;
  }
  /* The crit-counting closed form the dressed table uses: armour is the question
     there and what leather gives is mostly crit. _rangedstr.js's dps(), with the
     third weapon gate. `el` adds the element's own effect where it is a damage
     effect. */
  function fullDps(def, opt) {
    opt = opt || {};
    var acc = playerAccuracy(), hit = playerMaxHit(), swing = playerSwingMs();
    var rng = usingRanged(), mag = usingMagic();
    var cm = cmastBonuses(), cb = combatBonusesAll();
    var pen = (rng && cm.armourPen > 0) ? (1 - cm.armourPen) : 1;
    var p = clamp(acc / (acc + def * pen));
    var w = ITEMS[eqCombatWeapon()] || {};
    var pierce = (w.wfx && w.wfx.pierce) ? w.wfx.pierce.chance : 0;
    var wind = rng ? treeRank('fletching', 'fl_wind') * FL_WIND_RANK : mag ? treeRank('runecrafting', 'rn_sure') * RN_SURE_RANK : 0;
    var stormE = MAGIC_ELEMENTS.filter(function (e) { return e.k === 'storm'; })[0];
    var storm = (mag && opt.el === 'storm' && stormE) ? stormE.rider.pierce : 0;
    var sure = 1 - (1 - pierce) * (1 - wind) * (1 - storm);
    p = sure * 0.97 + (1 - sure) * p;
    var avg = hit * (COMBAT_P.HIT_MIN + 1) / 2;
    var crit = Math.min(1, cb.critChance || 0), critMul = 1 + crit * (1 + ((cb.critDmg != null ? cb.critDmg : cm.critDmg) || 0));
    var m = 0, n = 0; for (var f = 0.95; f > 0.02; f -= 0.05) { m += cmastDamageMult({}, f, 1); n++; }
    var extra = 1;
    if (w.wfx && w.wfx.cleave) extra += w.wfx.cleave.chance;
    else if (state.cmast['m_t5_m'] > 0) extra += 0.08;
    else if (rng && cm.volley > 0) extra += cm.volley;
    var base = (p * avg) / (swing / 1000);
    var bb = rng ? treeRank('fletching', 'fl_barb') * FL_BARB_RANK : 0, dot = 0;
    if (bb > 0) { var rate = (p / (swing / 1000)) * bb; var up = 1 - Math.exp(-rate * POISON_DUR_MS / 1000); dot = up * hit * POISON_TICK_MULT / (POISON_TICK_MS / 1000); }
    if (mag && opt.el === 'fire') {
      var ch = Math.min(1, BURN_CHANCE + treeRank('runecrafting', 'rn_brand') * RN_BRAND_RANK);
      var r2 = (p / (swing / 1000)) * ch, up2 = 1 - Math.exp(-r2 * BURN_DUR_MS / 1000);
      dot += up2 * hit * FIRE.rider.burn / (BURN_TICK_MS / 1000);
    }
    return (base * (m / n) * critMul * extra) * (opt.weak ? ELEMENT_WEAK_MULT : opt.resist ? ELEMENT_RESIST_MULT : 1) + dot;
  }
  function dressed(levels, tiers) {
    return levels.map(function (lv, ix) {
      var t = tiers[ix], def = foeDefFor(lv), metal = METAL[t - 1], wood = WOOD[t - 1], hide = HIDE[t - 1], cloth = CLOTHK[t - 1], rune = RUNE[t - 1];
      var cape = { cape: metal + '_cape' };
      var r = { lv: lv, tier: t, foeDef: def };
      function one(key, o) { wear(o, lv); r[key] = { dps: fullDps(def), s: snap() }; r[key].fire = usingMagic() ? fullDps(def, { el: 'fire' }) : r[key].dps; }
      one('melee', { weapon: metal + '_sword', armour: set5(metal, PL, { cape: metal + '_cape', shield: metal + '_shield' }) });
      one('bow', { weapon: wood + '_shortbow', quiver: metal + '_arrow', armour: set5(hide, PL, cape) });
      one('longbow', { weapon: wood + '_longbow', quiver: metal + '_arrow', armour: set5(hide, PL, cape) });
      one('wand', { weapon: wood + '_wand', quiver: rune, armour: set5(cloth, RB, { cape: metal + '_cape', shield: metal + '_buckler' }) });
      one('wandBare', { weapon: wood + '_wand', quiver: rune, armour: set5(cloth, RB, cape) });
      one('staff', { weapon: wood + '_staff', quiver: rune, armour: set5(cloth, RB, cape) });
      one('staffLeather', { weapon: wood + '_staff', quiver: rune, armour: set5(hide, PL, cape) });
      one('staffPlate', { weapon: wood + '_staff', quiver: rune, armour: set5(metal, PL, cape) });
      one('staffNaked', { weapon: wood + '_staff', quiver: rune });
      one('bowNaked', { weapon: wood + '_shortbow', quiver: metal + '_arrow' });
      one('meleeNaked', { weapon: metal + '_sword' });
      one('meleeBuckler', { weapon: metal + '_sword', armour: set5(metal, PL, { cape: metal + '_cape', shield: metal + '_buckler' }) });
      one('xbowBuckler', { weapon: metal + '_crossbow', quiver: metal + '_bolt', armour: set5(hide, PL, { cape: metal + '_cape', shield: metal + '_buckler' }) });
      one('wandShield', { weapon: wood + '_wand', quiver: rune, armour: set5(cloth, RB, { cape: metal + '_cape', shield: metal + '_shield' }) });
      return r;
    });
  }

  /* ── what a rune costs, in seconds of work (the _rangedecon.js method) ── */
  function actOf(skill, id) { return SKILLS[skill].acts.filter(function (a) { return a.id === id; })[0]; }
  function gatherSec(skill, itemId, lvl) {
    var acts = SKILLS[skill].acts.filter(function (a) { return a.out && a.out[itemId] && (a.lvl || 1) <= lvl; });
    if (!acts.length) acts = SKILLS[skill].acts.filter(function (a) { return a.out && a.out[itemId]; });
    if (!acts.length) return 0;
    var bestS = Infinity;
    acts.forEach(function (a) { var s = (actMs(a, skill) / 1000) / (a.out[itemId] || 1); if (s < bestS) bestS = s; });
    return bestS;
  }
  /* The cheapest way to make one unit of fuel at this level: the log has to be
     chopped and then burned. */
  function fuelSec(itemId, lvl) {
    var bestS = Infinity, how = '';
    SKILLS.firemaking.acts.forEach(function (a) {
      if (!a.out || !a.out[itemId] || (a.lvl || 1) > lvl) return;
      var log = Object.keys(a.inp || {})[0]; if (!log) return;
      var chop = SKILLS.woodcutting.acts.filter(function (c) { return c.out && c.out[log] && (c.lvl || 1) <= lvl; })[0];
      if (!chop) return;
      var s = (actMs(chop, 'woodcutting') / 1000 + actMs(a, 'firemaking') / 1000) / a.out[itemId];
      if (s < bestS) { bestS = s; how = a.name; }
    });
    return { sec: bestS, how: how };
  }
  function setSkills(lv, trees) {
    state = defaultState(); normalizeState();
    for (var k in SKILLS) state.xp[k] = XP_CUM[lv];
    state.tree = {};
    if (trees) for (var k2 in SKILLS) if (TREES[k2]) {
      var t = {}; TREES[k2].forEach(function (n) { if (!n.reqCape) t[n.id] = n.max; }); state.tree[k2] = t;
    }
  }
  function economy() {
    var out = { runes: [], arrows: [] };
    [false, true].forEach(function (trained) {
      RUNES.filter(function (r) { return r.act; }).forEach(function (r) {
        var fk = r.fuel;
        /* "at the level the rune unlocks" means every skill in the chain is at the
           level the chain needs: charcoal wants Firemaking 25, ember dust 40 */
        var lv = trained ? 99 : Math.max(r.rn, { ash: 1, charcoal: 25, ember_dust: 40 }[fk] || 1);
        setSkills(lv, trained);
        var act = r.act, cls = runeClass(r.t);
        var per = act.out[r.id];
        var stone = gatherSec('mining', 'runestone', lv) * r.stone;
        var fs = fuelSec(fk, lv);
        var fuel = fs.sec * r.fuelN;
        var make = actMs(act, 'runecrafting') / 1000;
        var m = mods('runecrafting');
        out.runes.push({ trained: trained, tier: r.t, name: r.n, lvl: lv, per: per, cls: cls, perCast: +((stone + fuel + make) / per * cls).toFixed(3), stoneSec: +(stone / per).toFixed(3), fuelSec: +(fuel / per).toFixed(3),
          makeSec: +(make / per).toFixed(3), perRune: +((stone + fuel + make) / per).toFixed(3), fuel: fk, fuelHow: fs.how,
          batchMs: Math.round(make * 1000), runesPerHrBench: Math.round(per * 3600 / make), xpPerBatch: act.xp, xpHr: Math.round(act.xp * (3600 / make) * m.xpMult) });
      });
      RANGED_AMMO.forEach(function (a, i) {
        var lv = trained ? 99 : Math.max(a.fl, 1);
        setSkills(lv, trained);
        var w = RANGED_WOODS.filter(function (x) { return x.fl <= a.fl; }).pop() || RANGED_WOODS[0];
        var headAct = actOf('smithing', 'sm_ah_' + a.k), flAct = actOf('fletching', 'fl_ar_' + a.k), shAct = actOf('fletching', 'fl_sh_' + w.k);
        var headsPerBar = headAct.out[a.k + '_arrowhead'], perBatch = flAct.out[a.k + '_arrow'], shafts = shAct.out.wood_shaft;
        var oreSec = gatherSec('mining', a.bar.replace('_bar', '_ore'), 99);
        var smelt = SKILLS.smithing.acts.filter(function (x) { return x.out && x.out[a.bar]; })[0];
        var smeltSec = smelt ? actMs(smelt, 'smithing') / 1000 : 0;
        var chop = gatherSec('woodcutting', w.log, 99);
        var per = (oreSec + smeltSec) / headsPerBar + (actMs(headAct, 'smithing') / 1000) / headsPerBar
                + (chop + actMs(shAct, 'fletching') / 1000) / shafts + (actMs(flAct, 'fletching') / 1000) / perBatch;
        out.arrows.push({ trained: trained, tier: i + 1, name: a.n, perArrow: +per.toFixed(3) });
      });
    });
    return out;
  }

  /* ── skilling XP an hour ── */
  function bestAct(skill, lvl, filter) {
    var m = mods(skill), top = 0, name = '';
    SKILLS[skill].acts.filter(function (a) { return (a.lvl || 1) <= lvl && (!filter || filter(a)); }).forEach(function (a) {
      var ms = actMs(a, skill); if (!(ms > 0)) return;
      var xph = a.xp * (3600000 / ms) * m.xpMult;
      if (xph > top) { top = xph; name = a.name; }
    });
    return { xph: Math.round(top), act: name };
  }
  function skillXp() {
    var CMP = ['runecrafting', 'fletching', 'crafting', 'smithing', 'cooking', 'alchemy', 'jeweler', 'firemaking', 'mining'];
    var rows = [1, 20, 40, 60, 80, 99].map(function (lv) {
      setSkills(lv, false);
      var r = { lv: lv };
      CMP.forEach(function (s) { r[s] = bestAct(s, lv); });
      r.runesOnly = bestAct('runecrafting', lv, function (a) { return a.cat === 'runes'; });
      r.quarry = (function () { var a = actOf('mining', 'mi_rs'); return Math.round(a.xp * (3600000 / actMs(a, 'mining')) * mods('mining').xpMult); })();
      r.copper = (function () { var a = actOf('mining', 'mi1'); return Math.round(a.xp * (3600000 / actMs(a, 'mining')) * mods('mining').xpMult); })();
      return r;
    });
    function hours(skill, filter) {
      var h = 0;
      for (var l = 1; l < 99; l++) { setSkills(l, false); var b = bestAct(skill, l, filter).xph; h += (XP_CUM[l + 1] - XP_CUM[l]) / Math.max(1, b); }
      return +h.toFixed(1);
    }
    var hrs = {}; ['runecrafting', 'fletching', 'crafting', 'smithing', 'alchemy', 'jeweler'].forEach(function (s) { hrs[s] = hours(s); });
    hrs.runesOnly = hours('runecrafting', function (a) { return a.cat === 'runes'; });
    setSkills(99, true);
    var peak = {}; CMP.forEach(function (s) { peak[s] = bestAct(s, 99).xph; });
    return { rows: rows, hours: hrs, peak: peak };
  }

  /* ── the enchanting reagents: what exists, and what Magic takes ── */
  function reagents() {
    setSkills(99, true);
    function dropHr(skill, item) {
      var bestV = 0, how = '';
      SKILLS[skill].acts.forEach(function (a) {
        var d = (DROPS[a.id] || []).filter(function (x) { return x.id === item; })[0]; if (!d) return;
        var v = (3600000 / actMs(a, skill)) * d.chance;
        if (v > bestV) { bestV = v; how = a.name + ' ' + (d.chance * 100).toFixed(1) + '%'; }
      });
      return { perHr: +bestV.toFixed(1), how: how };
    }
    function makeHr(skill, id) { var a = actOf(skill, id); return a ? +(3600000 / actMs(a, skill)).toFixed(0) : 0; }
    var spend = { arcane_dust: 0, rune_fragment: 0, mana_essence: 0 };
    SKILLS.runecrafting.acts.forEach(function (a) { for (var k in spend) if (a.inp && a.inp[k]) spend[k] += a.inp[k]; });
    return { cost: JSON.parse(JSON.stringify(ENCHANT_COST_BY_TIER)),
      fragment: dropHr('mining', 'rune_fragment'), essenceForage: dropHr('foraging', 'mana_essence'),
      dustHr: makeHr('alchemy', 'al_ad'), essenceBrewHr: makeHr('alchemy', 'al_tm_bloom'),
      magicSpendsOnce: spend };
  }

  /* ── does any existing save move? ── */
  function oldCombatLevel() {
    var a = cmbLvl('attack'), s = cmbLvl('strength'), d = cmbLvl('defence'), h = cmbLvl('hitpoints'), r = cmbLvl('ranged');
    return Math.max(1, Math.floor((Math.max(a + s, r * 2) + d + h) / 4));
  }
  function levelCheck(n) {
    var moved = 0, seen = 0, seed = 1234567;
    var rnd = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    var keys = ['attack', 'strength', 'defence', 'hitpoints', 'ranged'];
    function test() { seen++; if (combatLevel() !== oldCombatLevel()) moved++; }
    state = defaultState(); normalizeState();
    /* every corner first, then a random sweep. Magic is absent, zero, and level 1:
       the three shapes an existing save can arrive in. */
    [undefined, 0, XP_CUM[1]].forEach(function (mxp) {
      [1, 2, 10, 50, 98, 99].forEach(function (a) { [1, 2, 50, 99].forEach(function (s) { [1, 50, 99].forEach(function (r) { [1, 99].forEach(function (d) { [10, 99].forEach(function (h) {
        state.combatXp = { attack: XP_CUM[a], strength: XP_CUM[s], defence: XP_CUM[d], hitpoints: XP_CUM[h], ranged: XP_CUM[r] };
        if (mxp !== undefined) state.combatXp.magic = mxp;
        test();
      }); }); }); }); });
    });
    for (var i = 0; i < n; i++) {
      state.combatXp = {}; keys.forEach(function (k) { state.combatXp[k] = Math.floor(rnd() * XP_CUM[99] * 1.2); });
      if (rnd() < 0.5) state.combatXp.magic = 0;
      test();
    }
    state.combatXp = { attack: XP_CUM[99], strength: XP_CUM[99], defence: XP_CUM[99], hitpoints: XP_CUM[99], ranged: 0, magic: 0 }; var melee99 = combatLevel();
    state.combatXp = { attack: 0, strength: 0, defence: XP_CUM[99], hitpoints: XP_CUM[99], ranged: 0, magic: XP_CUM[99] }; var mage99 = combatLevel();
    state.combatXp = { attack: 0, strength: 0, defence: XP_CUM[99], hitpoints: XP_CUM[99], ranged: XP_CUM[99], magic: 0 }; var arch99 = combatLevel();
    return { seen: seen, moved: moved, melee99: melee99, mage99: mage99, arch99: arch99 };
  }

  /* What a save from before Magic looks like after it loads, and what a broken
     one is mended to. */
  function saves() {
    var o = {};
    state = defaultState();
    delete state.combatXp.magic; delete state.combatElement; delete state.combatSpell; delete state.xp.runecrafting;
    state.combatXp.attack = XP_CUM[70]; state.combatXp.strength = XP_CUM[70];
    var before = oldCombatLevel();
    normalizeState();
    o.legacy = { magic: state.combatXp.magic, el: state.combatElement, spell: state.combatSpell, rc: state.xp.runecrafting, level: combatLevel(), was: before };
    state.combatXp.magic = 'lots'; normalizeState(); o.badXp = state.combatXp.magic;
    state.combatXp.magic = -5; normalizeState(); o.negXp = state.combatXp.magic;
    state.combatElement = 'lava'; normalizeState(); o.unknownEl = state.combatElement;
    state.combatSpell = 'nova'; normalizeState(); o.unknownSpell = state.combatSpell;
    /* an element the Magic level has not opened is not kept */
    o.locked = MAGIC_ELEMENTS.filter(function (e) { return e.lvl > 1; }).map(function (e) {
      state.combatXp.magic = XP_CUM[e.lvl - 1]; state.combatElement = e.k; normalizeState(); var under = state.combatElement;
      state.combatXp.magic = XP_CUM[e.lvl]; state.combatElement = e.k; normalizeState();
      return [e.k, under, state.combatElement];
    });
    /* the save slot on the main menu reads the level off a parsed save, not the loaded character */
    var cx = { attack: XP_CUM[1], strength: XP_CUM[1], defence: XP_CUM[60], hitpoints: XP_CUM[60], ranged: XP_CUM[80], magic: 0 };
    state = defaultState(); normalizeState(); state.combatXp = JSON.parse(JSON.stringify(cx));
    o.slotArcher = [combatLevel(cx), combatLevel()];
    cx.ranged = 0; cx.magic = XP_CUM[80]; state.combatXp = JSON.parse(JSON.stringify(cx));
    o.slotMage = [combatLevel(cx), combatLevel()];
    /* a guild can ask for a Ranged or a Magic level */
    state.combatXp.ranged = XP_CUM[40]; state.combatXp.magic = XP_CUM[40];
    o.guild = [gdReqMet({ req: { ranged: 40 } }), gdReqMet({ req: { ranged: 41 } }), gdReqMet({ req: { magic: 40 } }), gdReqMet({ req: { magic: 41 } })];
    state = defaultState(); normalizeState();
    return o;
  }

  /* ── structure: the skill, the tree, the board ── */
  function structure() {
    var t = TREES.runecrafting, byReq = {};
    t.forEach(function (n) { byReq[n.req] = (byReq[n.req] || 0) + 1; });
    var fl = {}; TREES.fletching.forEach(function (n) { fl[n.req] = (fl[n.req] || 0) + 1; });
    var acts = {}; SKILLS.runecrafting.acts.forEach(function (a) { acts[a.cat] = (acts[a.cat] || 0) + 1; });
    /* every input an act asks for, and whether anything in the game makes it */
    var src = buildSourceMap(), missing = [];
    SKILLS.runecrafting.acts.forEach(function (a) {
      for (var k in (a.inp || {})) if (!src[k] && !ITEMS[k]) missing.push(a.id + ':' + k);
      for (var k2 in (a.out || {})) if (!ITEMS[k2]) missing.push(a.id + ' makes ' + k2);
    });
    /* declared in the SKILLS literal: it is in the list before Fletching, which is added later */
    var keys = Object.keys(SKILLS);
    return { treeSum: t.reduce(function (s, n) { return s + n.max; }, 0), nodes: t.length, cols: Object.keys(byReq).length, maxAbreast: Math.max.apply(null, Object.keys(byReq).map(function (k) { return byReq[k]; })),
      sameShapeAsFletching: JSON.stringify(byReq) === JSON.stringify(fl), acts: acts, missing: missing, skills: keys.length,
      inLiteral: keys.indexOf('runecrafting') >= 0 && keys.indexOf('runecrafting') < keys.indexOf('fletching'),
      xphSeeded: (typeof xphBuf !== 'undefined') && Array.isArray(xphBuf.runecrafting) && (typeof _smoothedXph !== 'undefined') && _smoothedXph.runecrafting === 0,
      cape: SKILL_CAPE.runecrafting, capeInShop: SHOP.some(function (s) { return s.id === SKILL_CAPE.runecrafting && s.skill === 'runecrafting'; }),
      pfx: SK_PFX.runecrafting, rail: RAIL_GROUP.runecrafting, accent: SKILL_ACCENT.runecrafting };
  }

  /* ── every tree node changes a number ──
     Each node is bought alone, at full rank, and the one thing it says it does is
     read before and after. A node that moves nothing is a dead node. */
  function nodes() {
    var out = [];
    function fresh() {
      state = defaultState(); normalizeState();
      state.xp.runecrafting = XP_CUM[99]; state.combatXp.magic = XP_CUM[99];
      state.tree = {}; state.gear = []; state.items = { crucible_rune: 100000, runestone: 1000, ember_dust: 1000, ancient_log: 1000, arcane_dust: 1000 };
      state.combatEquipped = { weapon: 'ancient_staff', quiver: 'crucible_rune' };
      combat.active = false; combat.raid = null;
    }
    var READ = {
      rn_speed: function () { return actMs(RUNES[6].act, 'runecrafting'); },
      rn_gm_speed: function () { return actMs(RUNES[6].act, 'runecrafting'); },
      rn_xp: function () { return mods('runecrafting').xpMult; },
      rn_gm_xp: function () { return mods('runecrafting').xpMult; },
      rn_double: function () { return mods('runecrafting').extraBar; },
      rn_thrift: function () { return mods('runecrafting').preserve; },
      rn_save: function () { return runeSaveRate(); },
      rn_gm_save: function () { return runeSaveRate(); },
      rn_endless: function () { return runeSaveRate(); },
      rn_acc: function () { return playerAccuracy(); },
      rn_dmg: function () { return playerMaxHit(); },
      rn_sure: function () { return mageSureChance(); },
      rn_brand: function () { /* the burn chance mageOnHit rolls */ return Math.min(1, BURN_CHANCE + treeRank('runecrafting', 'rn_brand') * RN_BRAND_RANK); },
      rn_batch: function () { return ratesFor(RUNES[6].act, 'runecrafting').rph; },
      rn_cape: function () { return ratesFor(RUNES[6].act, 'runecrafting').rph; },
      rn_bind: function () {
        /* bind one Ancient Staff and count the runes left */
        var a = SKILLS.runecrafting.acts.filter(function (x) { return x.id === 'rn_staff_ancient'; })[0];
        state.items.crucible_rune = 1000; completeAction(a, 'runecrafting', 1);
        return state.items.crucible_rune;
      }
    };
    TREES.runecrafting.forEach(function (n) {
      var read = READ[n.id];
      if (!read) { out.push({ id: n.id, name: n.name, before: null, after: null, moved: false, why: 'no reading for this node' }); return; }
      fresh(); if (n.reqCape) state.gear = [SKILL_CAPE.runecrafting];
      var before = read();
      fresh(); if (n.reqCape) state.gear = [SKILL_CAPE.runecrafting];
      state.tree.runecrafting = {}; state.tree.runecrafting[n.id] = n.max;
      var after = read();
      out.push({ id: n.id, name: n.name, max: n.max, before: before, after: after, moved: before !== after, desc: String(n.desc(n.max)) });
    });
    /* the cape node pays nothing without the cape */
    fresh(); var noCape0 = READ.rn_cape(); state.tree.runecrafting = { rn_cape: 1 }; var noCape1 = READ.rn_cape();
    /* Close Cutting and the cape are for runes: a bound wand is not doubled by either */
    fresh(); state.gear = [SKILL_CAPE.runecrafting];
    var wandAct = SKILLS.runecrafting.acts.filter(function (x) { return x.id === 'rn_wand_ancient'; })[0];
    var w0 = ratesFor(wandAct, 'runecrafting').rph; state.tree.runecrafting = { rn_batch: 6, rn_cape: 1 }; var w1 = ratesFor(wandAct, 'runecrafting').rph;
    /* what a batch really makes with both, against what the card says: 200 batches */
    fresh(); state.gear = [SKILL_CAPE.runecrafting]; state.tree.runecrafting = { rn_batch: 6, rn_cape: 1 };
    state.items = { runestone: 1e6, ember_dust: 1e6 };
    var act = RUNES[6].act, card = ratesFor(act, 'runecrafting').rph / (3600000 / actMs(act, 'runecrafting'));
    completeAction(act, 'runecrafting', 200);
    var made = (state.items.crucible_rune || 0) / 200;
    state = defaultState(); normalizeState();
    return { rows: out, capeNeedsCape: noCape0 === noCape1, wandUntouched: w0 === w1, batchCard: +card.toFixed(2), batchMade: +made.toFixed(2), batchBase: act.out.crucible_rune };
  }

  /* ── the spell ladder ── */
  function spells() {
    var out = { table: [], sizes: [] };
    RUNES.forEach(function (r) {
      var cls = runeClassOf(r.id), row = { id: r.id, name: r.n, tier: r.t, rn: r.rn, pow: ITEMS[r.id].runePow, arrow: ITEMS[METAL[r.t - 1] + '_arrow'].ammoStr, cls: cls, biggest: SPELL_SIZES[cls - 1].n,
        batch: r.act ? r.act.out[r.id] : 0, sizes: [] };
      for (var s = 1; s <= cls; s++) row.sizes.push(spellPower(row.pow, cls, s));
      out.table.push(row);
    });
    /* the first Magic level each size can be cast at: the lightest weapon that can load a rune big enough */
    out.sizes = SPELL_SIZES.map(function (sp, i) {
      var first = null; RUNES.forEach(function (r) { if (!first && runeClass(r.t) === i + 1) first = r; });
      var wt = Math.max(1, first.t - 1);
      return { k: sp.k, n: sp.n, runes: sp.runes, m: sp.m, rune: first.n, runeTier: first.t, rn: first.rn, weaponTier: wt, weapon: ITEMS[WOOD[wt - 1] + '_wand'].name, magic: COMBAT_GEAR_REQ[wt],
        runesNamed: RUNES.filter(function (r) { return runeClass(r.t) === i + 1; }).map(function (r) { return r.n; }) };
    });
    return out;
  }
  /* Weapon alone, Fire on: the same mage at every size the rune powers. */
  function spellSizes(levels, tiers) {
    var out = [];
    state = defaultState(); normalizeState();
    levels.forEach(function (lv, ix) {
      var t = tiers[ix], def = foeDefFor(lv), wood = WOOD[Math.min(WOOD.length - 1, t - 1)];
      [RUNE[t - 1]].concat(lv === 99 ? ['starfall_rune'] : []).forEach(function (rune) {
        ['wand', 'staff'].forEach(function (fam) {
          clear(); state.combatXp.magic = XP_CUM[lv]; state.combatEquipped.weapon = wood + '_' + fam; state.combatEquipped.quiver = rune; state.items[rune] = 1e6;
          var cls = runeClassOf(rune), rows = [];
          for (var s = cls; s >= 1; s--) {
            state.combatSpell = SPELL_SIZES[s - 1].k;
            rows.push({ size: s, name: SPELL_SIZES[s - 1].n, pow: runePow(), hit: playerMaxHit(), dps: rawDps(def) + burnDps(def, FIRE.rider.burn, 0), castsHr: 3600000 / playerSwingMs() });
          }
          out.push({ lv: lv, tier: t, fam: fam, rune: ITEMS[rune].name, runeId: rune, runeTier: ITEMS[rune].ammoTier, matched: rune === RUNE[t - 1], cls: cls, foeDef: def, rows: rows });
        });
      });
    });
    return out;
  }
  /* Casts an hour at a given Agility level: the one skill that changes how many
     runes an hour of fighting spends. */
  function castRates(tier, agi) {
    var wood = WOOD[Math.min(WOOD.length - 1, tier - 1)], out = {};
    state = defaultState(); normalizeState(); state.xp.agility = XP_CUM[agi];
    [['wand', wood + '_wand'], ['staff', wood + '_staff'], ['bow', wood + '_shortbow']].forEach(function (p) {
      clear(); state.combatEquipped.weapon = p[1]; out[p[0]] = 3600000 / playerSwingMs();
    });
    state = defaultState(); normalizeState();
    return out;
  }

  /* ── what a cast does in the real tick ──
     The tables above read numbers. This drives combatTick itself, one cast at a
     time, with the dice fixed, to see that a cast spends what its size says, stops
     when the runes are gone, and names itself. */
  function casting() {
    var o = {};
    function arm(weapon, rune, n, spell) {
      state = defaultState(); normalizeState();
      state.combatXp.magic = XP_CUM[99]; state.combatXp.hitpoints = XP_CUM[99]; state.combatXp.defence = XP_CUM[99];
      state.items = {}; state.items[weapon] = 1; if (rune) state.items[rune] = n;
      state.combatEquipped = { weapon: weapon }; if (rune) state.combatEquipped.quiver = rune;
      state.combatSpell = spell || BIGGEST; state.combatElement = 'fire';
      state.zone = 'rat_warrens'; combat.raid = null; combat.monId = 'rat'; combat.log = [];
      refreshCombatStats();
      combat.active = true; combat.foeHp = 1e9; combat.foeMaxHp = 1e9; combat.rare = null; combat.foeStatus = {};
      combat.youHp = combat.youMaxHp; combat.foeSwingStart = Date.now() + 1e9; combat.foeSwingMs = 1e9;
    }
    function cast() { combat.youSwingStart = Date.now() - combat.youSwingMs - 1; combatTick(); }
    var realRandom = Math.random;
    try {
      /* dice at 0.5: the save roll (0) always spends, the hit roll lands, nothing procs that needs under 0.3 */
      Math.random = function () { return 0.5; };
      o.spent = SPELL_SIZES.map(function (s) {
        arm('ancient_staff', 'starfall_rune', 1000, s.k); cast();
        return 1000 - (state.items.starfall_rune || 0);
      });
      /* a Wave rune asked for a Surge casts a Wave */
      arm('ancient_staff', 'crucible_rune', 1000, 'surge'); cast();
      o.capped = [spellSize(), 1000 - (state.items.crucible_rune || 0), spellName()];
      /* the last cast of a stack spends what is left, and the cast after it stops the fight */
      arm('ancient_staff', 'starfall_rune', 3, 'surge'); cast();
      o.last = [state.items.starfall_rune || 0, combat.active];
      cast();
      o.dry = [combat.active, combat.log.map(function (l) { return l.t; }).filter(function (t) { return /out of/.test(t); })[0] || ''];
      /* nothing loaded, and the wrong thing loaded */
      arm('ancient_staff', null, 0); cast();
      o.empty = [combat.active, combat.log.map(function (l) { return l.t; }).join(' | ')];
      arm('ancient_staff', 'starfall_arrow', 50); cast();
      o.arrows = [combat.active, state.items.starfall_arrow, combat.log.map(function (l) { return l.t; }).join(' | ')];
      arm('pine_wand', 'starfall_rune', 50); cast();
      o.tooHigh = [combat.active, state.items.starfall_rune, combat.log.map(function (l) { return l.t; }).join(' | ')];
      /* an archer's stop message, for the plural */
      state = defaultState(); normalizeState(); state.combatXp.ranged = XP_CUM[99];
      state.items = { ancient_shortbow: 1 }; state.combatEquipped = { weapon: 'ancient_shortbow', quiver: 'starsteel_arrow' };
      combat.raid = null; combat.monId = 'rat'; combat.log = []; refreshCombatStats(); combat.active = true; combat.foeHp = 1e9; combat.foeStatus = {};
      cast();
      o.archerDry = combat.log.map(function (l) { return l.t; }).filter(function (t) { return /out of/.test(t); })[0] || '';
      /* the log names the spell */
      arm('ancient_staff', 'starfall_rune', 1000, 'blast'); cast();
      o.logLine = combat.log.map(function (l) { return l.t; }).filter(function (t) { return /Fire Blast/.test(t); })[0] || '';
      /* a cast that keeps its runes: the save roll under the rate */
      arm('ancient_staff', 'starfall_rune', 1000, 'surge'); state.tree.runecrafting = { rn_save: 10 };
      Math.random = function () { return 0.4; }; cast();
      o.kept = 1000 - (state.items.starfall_rune || 0);
      /* a miss stays a miss: 0 damage, and no element effect, against a monster weak to Fire.
         Every roll here is 0.99, so the crit roll fails too. That matters: the shared
         tick still rolls a crit on a miss, and max(1, round(0 x 2)) is 1, so a miss
         that rolls a crit does 1 damage for every weapon in the game, spells included.
         It is an old fault in code Magic shares with melee and bows, flagged on its
         own and deliberately NOT pinned here, so the fix does not have to fight this. */
      arm('ancient_staff', 'starfall_rune', 1000, 'surge');
      var seq = [0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99], si = 0;
      Math.random = function () { return seq[si++ % seq.length]; };
      cast();
      o.miss = [1e9 - combat.foeHp, !!(combat.foeStatus && combat.foeStatus.burn), combat.log.map(function (l) { return l.t; }).filter(function (t) { return /misses/.test(t); })[0] || ''];
      /* Fire burns: every roll low */
      arm('ancient_staff', 'starfall_rune', 1000, 'surge'); state.tree.runecrafting = {};
      Math.random = function () { return 0.01; };
      /* the save roll at 0.01 would keep the runes only if there were a save rate; there is none here */
      cast();
      o.burn = !!(combat.foeStatus && combat.foeStatus.burn);
      /* Attack % and Strength do nothing for a spell; Magic damage % does */
      arm('ancient_staff', 'starfall_rune', 1000, 'surge');
      var base = [playerMaxHit(), playerAccuracy()];
      state.effects = [{ id: 'x', expires: Date.now() + 1e6, str: 50, atk: 0 }];
      var withStr = playerMaxHit();
      state.effects = [];
      o.strength = [base[0], withStr];
      /* a wand trains Magic, and Warded sends half to Defence */
      arm('ancient_wand', 'starfall_rune', 1000, 'surge');
      o.trains = combatXpStat();
      var m0 = state.combatXp.magic = XP_CUM[50], d0 = state.combatXp.defence = XP_CUM[50];
      state.combatStyle = 'defence'; grantCombatXp('magic', 1000);
      o.warded = [state.combatXp.magic - m0, state.combatXp.defence - d0];
      state.combatStyle = 'attack'; state.combatXp.magic = m0; state.combatXp.defence = d0; grantCombatXp('magic', 1000);
      o.focused = [state.combatXp.magic - m0, state.combatXp.defence - d0];
      /* the styles: Swift is faster and less accurate, Warded slower */
      arm('ancient_staff', 'starfall_rune', 1000, 'surge');
      o.styles = ['attack', 'strength', 'defence'].map(function (k) { state.combatStyle = k; return [magicStyle().name, playerSwingMs(), playerAccuracy()]; });
      state.combatStyle = 'attack';
      /* gear requirement and the fit rule */
      o.req = [combatGearReq('ancient_staff'), combatGearReq('pine_wand')];
      o.fit = [ammoFitsWeapon('pine_wand', 'ash_rune'), ammoFitsWeapon('pine_wand', 'soot_rune'), ammoFitsWeapon('pine_wand', 'char_rune'),
        ammoFitsWeapon('oak_wand', 'char_rune'), ammoFitsWeapon('ancient_staff', 'starfall_rune'), ammoFitsWeapon('ancient_staff', 'starfall_arrow'), ammoFitsWeapon('ancient_shortbow', 'starfall_rune')];
      o.slots = [getItemSlots('ancient_staff'), getItemSlots('pine_wand'), getItemSlots('ash_rune'), getItemSlots('runestone')];
      /* the enchant pools: a staff can never roll Attack */
      var ps = enchPoolFor('ancient_staff'), pw = enchPoolFor('bronze_sword'), pb = enchPoolFor('pine_shortbow');
      o.pools = [ps && ps.pool, ps && ps.keys, pw && pw.pool, pb && pb.pool];
    } finally { Math.random = realRandom; combat.active = false; combat.raid = null; state = defaultState(); normalizeState(); }
    return o;
  }

  /* ── the element pass ── */
  function elements() {
    var els = MAGIC_ELEMENTS.map(function (e) { return e.k; });
    var count = {}; els.forEach(function (e) { count[e] = { weak: 0, resist: 0 }; });
    var byZone = {}, rows = [];
    MONSTERS.forEach(function (m) {
      if (m.weakEl) count[m.weakEl].weak++; if (m.resistEl) count[m.resistEl].resist++;
      (byZone[m.zone] = byZone[m.zone] || []).push(m);
      rows.push({ id: m.id, name: m.name, zone: m.zone, lvl: m.lvl, boss: !!m.boss, weakTo: m.weakTo || '', resistTo: m.resistTo || '', weakEl: m.weakEl || '', resistEl: m.resistEl || '' });
    });
    var zones = ZONES.map(function (z) {
      var ms = byZone[z.id] || [], score = {};
      els.forEach(function (e) { score[e] = ms.reduce(function (s, m) { return s + (m.weakEl === e ? 1 : m.resistEl === e ? -1 : 0); }, 0); });
      var bestE = els.slice().sort(function (a, b) { return score[b] - score[a]; })[0];
      return { id: z.id, name: z.name, lvl: z.unlockLvl, hunt: z.type === 'hunt', n: ms.length, score: score, best: bestE, bestWeak: ms.filter(function (m) { return m.weakEl === bestE; }).length,
        minLvl: Math.min.apply(null, ms.map(function (m) { return m.lvl; })), maxLvl: Math.max.apply(null, ms.map(function (m) { return m.lvl; })) };
    });
    /* a mage who has not unlocked an element yet: is the only one he has ever the wrong one? */
    var early = MONSTERS.filter(function (m) { return m.lvl <= 14 && m.resistEl === 'fire'; }).map(function (m) { return m.id; });
    var melee = { weak: 0, resist: 0 }, ranged = { weak: 0, resist: 0 };
    MONSTERS.forEach(function (m) { if (m.weakTo && m.weakTo !== 'ranged') melee.weak++; if (m.resistTo && m.resistTo !== 'ranged') melee.resist++; if (m.weakTo === 'ranged') ranged.weak++; if (m.resistTo === 'ranged') ranged.resist++; });
    /* of the monsters a mage can still be fighting once an element is unlocked, how
       many is it the right answer for, and how many the wrong one */
    var after = {};
    MAGIC_ELEMENTS.forEach(function (e) {
      var pool = MONSTERS.filter(function (m) { return m.lvl >= e.lvl - 6; });
      after[e.k] = { pool: pool.length, weak: pool.filter(function (m) { return m.weakEl === e.k; }).length, resist: pool.filter(function (m) { return m.resistEl === e.k; }).length };
    });
    return { count: count, zones: zones, rows: rows, total: MONSTERS.length, fireResistedEarly: early, melee: melee, ranged: ranged, after: after };
  }
  /* What each row carries, to hold against the design's three tables: every
     monster, every raid stage, every Spire monster. And a Spire floor that borrows
     a monster has to carry that monster's elements, as it carries its weakness. */
  function elTables() {
    var pair = function (m) { return [m.weakEl || null, m.resistEl || null]; };
    var mon = {}, raid = {}, spire = [];
    MONSTERS.forEach(function (m) { mon[m.id] = pair(m); });
    for (var id in RAID_MON_BY_ID) raid[id] = pair(RAID_MON_BY_ID[id]);
    SPIRE_NATIVES.forEach(function (n) { spire.push([n.name].concat(pair(n))); });
    var known = MAGIC_ELEMENTS.map(function (e) { return e.k; }), odd = [];
    var all = MONSTERS.concat(Object.keys(RAID_MON_BY_ID).map(function (k) { return RAID_MON_BY_ID[k]; }), SPIRE_NATIVES);
    all.forEach(function (m) {
      if (!m.weakEl || known.indexOf(m.weakEl) < 0) odd.push(m.id + ' weak ' + m.weakEl);
      if (m.resistEl && known.indexOf(m.resistEl) < 0) odd.push(m.id + ' resists ' + m.resistEl);
      if (m.resistEl && m.resistEl === m.weakEl) odd.push(m.id + ' is weak to what it resists');
    });
    var floors = 0, wrong = [];
    for (var f = 1; f <= 160; f++) {
      var fm = spireFloor(f, true), bid = fm.id.replace(/^spr_/, '');
      var base = MONSTERS.filter(function (m) { return m.id === bid; })[0] || RAID_MON_BY_ID[bid] || SPIRE_NATIVES.filter(function (n) { return n.id === fm.id; })[0];
      if (!base) { wrong.push('floor ' + f + ': no base for ' + fm.id); continue; }
      floors++;
      if (fm.weakEl !== base.weakEl || fm.resistEl !== base.resistEl || fm.weakTo !== base.weakTo) wrong.push('floor ' + f + ' ' + fm.name);
    }
    /* what the bar and the fight make of it */
    var rat = MONSTERS.filter(function (m) { return m.id === 'rat'; })[0], knight = MONSTERS.filter(function (m) { return m.id === 'bone_knight'; })[0];
    var mult = [elementMult(rat, 'fire'), elementMult(rat, 'frost'), elementMult(knight, 'storm'), elementMult(knight, 'frost'), elementMult(knight, 'fire')];
    return { mon: mon, raid: raid, spire: spire, odd: odd, floors: floors, wrong: wrong, mult: mult, raidStages: Object.keys(RAID_MON_BY_ID).length, natives: SPIRE_NATIVES.length };
  }
  /* The elements in the real tick, dice fixed: Frost chills and the chill slows the
     monster, Storm lands a cast that would have missed, Shadow heals, and the
     weakness is worth 15% either way. */
  function elementFx() {
    var o = {}, realRandom = Math.random;
    function arm(el, monId) {
      state = defaultState(); normalizeState();
      state.combatXp.magic = XP_CUM[99]; state.combatXp.hitpoints = XP_CUM[99]; state.combatXp.defence = XP_CUM[99];
      state.items = { ancient_staff: 1, crucible_rune: 1000 }; state.combatEquipped = { weapon: 'ancient_staff', quiver: 'crucible_rune' };
      state.combatSpell = BIGGEST; state.combatElement = el;
      state.zone = 'rat_warrens'; combat.raid = null; combat.monId = monId || 'rat'; combat.log = []; combat.rare = null;
      refreshCombatStats();
      combat.active = true; combat.foeHp = 1e9; combat.foeMaxHp = 1e9; combat.foeStatus = {};
      combat.youHp = combat.youMaxHp; combat.foeSwingStart = Date.now() + 1e9; combat.foeSwingMs = 2000;
    }
    function cast() { combat.youSwingStart = Date.now() - combat.youSwingMs - 1; combatTick(); }
    try {
      /* the weakness, on one fixed roll: neutral, weak, resisted */
      var dmg = function (el, monId) { arm(el, monId); Math.random = function () { return 0.5; }; cast(); return 1e9 - combat.foeHp; };
      var neutral = dmg('fire', 'bone_knight'), weak = dmg('storm', 'bone_knight'), res = dmg('frost', 'bone_knight');
      o.weak = [neutral, weak, res, +(weak / neutral).toFixed(3), +(res / neutral).toFixed(3)];
      /* Frost: every roll low, so the chill lands, and the monster's attack time is the slowed one */
      arm('frost'); Math.random = function () { return 0.01; }; cast();
      var pin = combat.foeStatus.pin;
      o.frost = [!!pin, pin ? pin.slow : 0, pin ? pin.base : 0];
      combat.foeSwingStart = Date.now() - 5000; cast();
      o.frostSlow = [combat.foeSwingMs, pin ? Math.round(pin.base * 1.25) : 0];
      /* Storm: a hit roll that would miss against a monster with a great deal of Defence */
      var stormHit = function (roll) {
        arm('storm'); var m = getMonster('rat'), keep = m.def; m.def = 1e9;
        var n = 0; Math.random = function () { n++; return roll(n); };
        try { cast(); } finally { m.def = keep; }
        return 1e9 - combat.foeHp;
      };
      /* rolls in order: the rune save, Windcutter, the sure cast, then the hit. 0.02 is under Storm's 4%. */
      o.storm = [stormHit(function (n) { return n === 3 ? 0.02 : 0.5; }) > 0, stormHit(function () { return 0.5; }) > 0];
      /* Shadow: a hit heals 3% of what it dealt */
      arm('shadow'); combat.youHp = 100; Math.random = function () { return 0.5; }; cast();
      var dealt = 1e9 - combat.foeHp;
      o.shadow = [dealt, combat.youHp - 100, Math.max(1, Math.floor(dealt * 0.03))];
      /* Fire's burn tick is 2.4% of max hit */
      arm('fire'); Math.random = function () { return 0.01; }; cast();
      o.fire = [combat.foeStatus.burn ? combat.foeStatus.burn.tickDmg : 0, Math.max(1, Math.round(combat.youMaxHit * 0.024))];
      /* A slow must not outlive the monster it was put on. The live run in section 13
         found this: a kill wiped the status and left the stretched attack time
         behind, the next slow took that as its base, and six kills later the
         monster was attacking at a third of its speed. Chill it, kill it, and the
         next one has to attack at its own speed, every time. */
      var own = getMonster('rat').swingMs || COMBAT_BASE_SWING_MS;
      var afterKills = function (armIt) {
        armIt(); combat.foeSwingMs = own;
        var seen = [], slowed = [];
        Math.random = function () { return 0.01; };          // every roll low: the hit lands, the slow lands
        for (var k = 0; k < 6; k++) {
          combat.foeHp = 1e9; combat.foeMaxHp = 1e9; cast();  // slowed, and still alive
          slowed.push(combat.foeStatus && combat.foeStatus.pin ? combat.foeSwingMs : 0);
          combat.foeHp = 1; cast();                           // the next hit kills it: the respawn
          seen.push(combat.foeSwingMs);
        }
        return { fresh: seen, slowed: slowed };
      };
      o.own = own;
      o.chillKills = afterKills(function () { arm('frost'); });
      o.pinKills = afterKills(function () {
        state = defaultState(); normalizeState();
        state.combatXp.ranged = XP_CUM[99]; state.combatXp.hitpoints = XP_CUM[99]; state.combatXp.defence = XP_CUM[99];
        state.items = { ancient_shortbow: 1, starsteel_arrow: 1000, demon_chest: 1 };
        state.combatEquipped = { weapon: 'ancient_shortbow', quiver: 'starsteel_arrow', chest: 'demon_chest' };
        state.cmast = { k_t5_m: 1 };                          // Pinning Shot: a crit slows the monster 15%
        state.zone = 'rat_warrens'; combat.raid = null; combat.monId = 'rat'; combat.log = []; combat.rare = null;
        refreshCombatStats();
        combat.active = true; combat.foeHp = 1e9; combat.foeMaxHp = 1e9; combat.foeStatus = {};
        combat.youHp = combat.youMaxHp; combat.foeSwingStart = Date.now() + 1e9;
      });
      /* And a slowed monster that enrages keeps the enrage: the slow's stored base is
         what gets faster, or the tick rebuilds the old speed over it a tick later. */
      arm('frost'); Math.random = function () { return 0.5; };
      combat.monfx = { enrage: { below: 0.4, aspd: 0.25 }, raged: false };
      combat.foeStatus = { pin: { base: 2000, until: Date.now() + 60000, slow: 0.25 } };
      combat.foeHp = 3e8; combat.foeMaxHp = 1e9;
      combat.youSwingStart = Date.now() + 1e9; combatTick();
      o.enrage = [combat.monfx.raged, combat.foeStatus.pin ? combat.foeStatus.pin.base : 0, combat.foeSwingMs];
      if (combat.foeStatus.pin) combat.foeStatus.pin.until = Date.now() - 1;
      combat.youSwingStart = Date.now() + 1e9; combatTick();
      o.enrageAfter = [!!combat.foeStatus.pin, combat.foeSwingMs];
      combat.monfx = null;
      /* the damage number carries the element */
      o.unlock = MAGIC_ELEMENTS.map(function (e) { return [e.k, e.lvl]; });
    } finally { Math.random = realRandom; combat.active = false; combat.raid = null; state = defaultState(); normalizeState(); }
    return o;
  }

  /* ── fight numbers for the simulated fights ── */
  /* One definition of each dressed build, so the model below and the live fights
     further down are looking at the same character. */
  function loadout(key, t) {
    var metal = METAL[t - 1], wood = WOOD[t - 1], hide = HIDE[t - 1], cloth = CLOTHK[t - 1], rune = RUNE[t - 1];
    var cape = { cape: metal + '_cape' };
    if (key === 'melee') return { weapon: metal + '_sword', armour: set5(metal, PL, { cape: metal + '_cape', shield: metal + '_shield' }) };
    if (key === 'bow') return { weapon: wood + '_shortbow', quiver: metal + '_arrow', armour: set5(hide, PL, cape) };
    if (key === 'wand') return { weapon: wood + '_wand', quiver: rune, armour: set5(cloth, RB, { cape: metal + '_cape', shield: metal + '_buckler' }) };
    if (key === 'staff') return { weapon: wood + '_staff', quiver: rune, armour: set5(cloth, RB, cape) };
    if (key === 'wandBare') return { weapon: wood + '_wand', quiver: rune, armour: set5(cloth, RB, cape) };
    if (key === 'longbow') return { weapon: wood + '_longbow', quiver: metal + '_arrow', armour: set5(hide, PL, cape) };
    if (key === 'meleeBuckler') return { weapon: metal + '_sword', armour: set5(metal, PL, { cape: metal + '_cape', shield: metal + '_buckler' }) };
    if (key === 'xbowBuckler') return { weapon: metal + '_crossbow', quiver: metal + '_bolt', armour: set5(hide, PL, { cape: metal + '_cape', shield: metal + '_buckler' }) };
    return null;
  }
  function fighters(lv, t) {
    var wood = WOOD[t - 1], cloth = CLOTHK[t - 1], rune = RUNE[t - 1], metal = METAL[t - 1];
    var cape = { cape: metal + '_cape' }, out = {};
    state = defaultState(); normalizeState(); state.xp.agility = XP_CUM[lv];
    function one(key, o) { wear(o, lv); var s = snap(); var w = ITEMS[eqCombatWeapon()] || {}; s.dmgType = w.dmgType; s.kind = w.magic ? 'magic' : w.ranged ? 'ranged' : 'melee'; s.lcrit = s.crit; out[key] = s; }
    one('melee', loadout('melee', t));
    one('bow', loadout('bow', t));
    one('wand', loadout('wand', t));
    one('staff', loadout('staff', t));
    /* the same staff casting each smaller spell its rune powers */
    for (var sz = runeClassOf(rune) - 1; sz >= 1; sz--) one('staff_s' + sz, { weapon: wood + '_staff', quiver: rune, armour: set5(cloth, RB, cape), spell: SPELL_SIZES[sz - 1].k });
    one('wandBare', loadout('wandBare', t));
    one('longbow', loadout('longbow', t));
    one('meleeBuckler', loadout('meleeBuckler', t));
    one('xbowBuckler', loadout('xbowBuckler', t));
    state = defaultState(); normalizeState();
    return out;
  }

  /* ── live: the game's own tick() and combatTick(), on a clock this harness holds ──
     Everything above asks the game's functions for a number and does the sum itself.
     This does no sums. It starts the fight or the act the way a player does, steps
     the clock at the pace the game's own timers run (100 ms in a fight, 250 ms at a
     bench) and counts what happened. Rendering is switched off for the run, because
     it is a thousand times the cost and changes no number; nothing else is.
     Two things are held still so the build that is measured stays that build: the
     levels (ten hours of XP would carry a level 20 character past 50) and, in a
     fight, the player's health. */
  var QUIET = ['renderCombat', 'updateCombatBars', 'cmbSplat', 'renderAll', 'renderTick', 'saveGame', 'toast', 'renderQuestDock', 'questCheck',
    'refreshCombatTabIndicator', 'renderRightPanel', 'renderHeader', 'renderSkillList', 'showHint'];
  function hush(on) {
    if (on) { hush.keep = {}; QUIET.forEach(function (k) { if (typeof window[k] === 'function') { hush.keep[k] = window[k]; window[k] = function () {}; } }); }
    else { for (var k in (hush.keep || {})) window[k] = hush.keep[k]; hush.keep = {}; }
  }
  function seeded(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /* One dressed build against one real monster for `hours` of game time. `neutral`
     blanks the monster's weaknesses for the run, which is what the model's rows do. */
  function liveFight(key, lv, t, monId, hours, seed, neutral, el) {
    var D = Date.now, R = Math.random, out = { key: key };
    var mon = getMonster(monId), keepM = { weakTo: mon.weakTo, resistTo: mon.resistTo, weakEl: mon.weakEl, resistEl: mon.resistEl };
    var keep = { menu: mmAtMenu };
    try {
      state = defaultState(); normalizeState(); state.xp.agility = XP_CUM[lv];
      wear(loadout(key, t), lv);
      if (el) { state.combatElement = el; refreshCombatStats(); out.el = spellElement(); }
      if (neutral) { mon.weakTo = null; mon.resistTo = null; mon.weakEl = null; mon.resistEl = null; }
      mmAtMenu = false; enterCombat(); state.cmbSubTab = 'arena'; state.cmbView = 'fight';
      selectZone(mon.zone); selectMonster(monId);
      var fake = D.call(Date) + (window.__clockShift || 0); Date.now = function () { return fake; };
      Math.random = seeded(seed);
      engageCombat(); stopCombatTimer();
      out.engaged = !!combat.active;
      out.swing = playerSwingMs(); out.hit = playerMaxHit(); out.acc = playerAccuracy(); out.spell = usingMagic() ? spellName() : '';
      hush(true);
      var q = state.combatEquipped.quiver, q0 = q ? state.items[q] : 0, kills = function () { return (state.monKills && state.monKills[monId]) || 0; }, k0 = kills();
      var base = JSON.parse(JSON.stringify(state.combatXp)), gain = {}, stat = combatXpStat(), hit0 = combat.youMaxHit;
      var dealt = 0, taken = 0, casts = 0, steps = Math.round(hours * 36000), i;
      for (i = 0; i < steps; i++) {
        fake += 100;
        var fh = combat.foeHp, yh = combat.youHp, kk = kills(), sw = combat.youSwingStart;
        combatTick();
        if (!combat.active) { out.stopped = combat.log.slice(-1).map(function (l) { return l.t; })[0] || 'stopped'; break; }
        if (combat.youSwingStart !== sw) casts++;
        dealt += (kills() > kk || combat.foeHp > fh) ? fh : (fh - combat.foeHp);
        if (combat.youHp < yh) taken += yh - combat.youHp;
        combat.youHp = combat.youMaxHp;
        for (var k in base) { var d = (state.combatXp[k] || 0) - base[k]; if (d) { gain[k] = (gain[k] || 0) + d; state.combatXp[k] = base[k]; } }
        if (combat.youMaxHit !== hit0) refreshCombatStats();
      }
      out.dps = dealt / (hours * 3600); out.killsHr = (kills() - k0) / hours; out.castsHr = casts / hours;
      out.spentHr = q ? (q0 - state.items[q]) / hours : 0; out.xpHr = (gain[stat] || 0) / hours; out.takenHr = taken / hours;
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 400); }
    finally {
      hush(false); Date.now = D; Math.random = R;
      mon.weakTo = keepM.weakTo; mon.resistTo = keepM.resistTo; mon.weakEl = keepM.weakEl; mon.resistEl = keepM.resistEl;
      try { stopCombatTimer(); } catch (e) {} combat.active = false; combat.raid = null; combatMode = false; mmAtMenu = keep.menu;
      try { _lastTickWall = 0; } catch (e) {}
      state = defaultState(); normalizeState();
    }
    return out;
  }
  /* A whole raid, or `maxMin` game minutes of the Spire, through the real tick, with
     the player topped up after every step. It answers two things a single cast
     cannot: does a build get from stage to stage with everything a raid throws at
     it running, and how long does it take beside the others. */
  function liveRaid(key, lv, t, raidId, seed, maxMin, ammo, el) {
    var D = Date.now, R = Math.random, out = { key: key, stages: [] }, keep = { menu: mmAtMenu };
    try {
      state = defaultState(); normalizeState(); state.xp.agility = XP_CUM[lv];
      var o = loadout(key, t); if (ammo) o.quiver = ammo;
      wear(o, lv);
      if (el) { state.combatElement = el; refreshCombatStats(); }
      mmAtMenu = false; enterCombat();
      var fake = D.call(Date) + (window.__clockShift || 0); Date.now = function () { return fake; };
      Math.random = seeded(seed);
      startRaid(raidId); stopCombatTimer();
      out.started = !!(combat.raid && combat.active); out.spell = usingMagic() ? spellName() : '';
      hush(true);
      var q = state.combatEquipped.quiver, q0 = q ? state.items[q] : 0, t0 = fake, at = fake, mark = combat.raid ? (combat.raid.endless ? combat.raid.floor : combat.raid.stage) : 0;
      var base = JSON.parse(JSON.stringify(state.combatXp)), hit0 = combat.youMaxHit, steps = Math.round(maxMin * 600), i;
      for (i = 0; i < steps; i++) {
        fake += 100; combatTick();
        if (!combat.raid || !combat.active) break;
        combat.youHp = combat.youMaxHp;
        for (var k in base) if (state.combatXp[k] !== base[k]) state.combatXp[k] = base[k];
        if (combat.youMaxHit !== hit0 && !combat.raidDebuff) { refreshCombatStats(); hit0 = combat.youMaxHit; }
        var now = combat.raid.endless ? combat.raid.floor : combat.raid.stage;
        if (now !== mark) { out.stages.push(Math.round((fake - at) / 1000)); at = fake; mark = now; }
      }
      out.seconds = Math.round((fake - t0) / 1000); out.cleared = !combat.raid && !combat.active; out.floor = combat.raid ? combat.raid.floor : 0;
      out.spent = q ? q0 - (state.items[q] || 0) : 0;
      out.last = combat.log.slice(-1).map(function (l) { return String(l.t).replace(/<[^>]+>/g, ''); })[0] || '';
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 400); }
    finally {
      hush(false); Date.now = D; Math.random = R;
      try { stopCombatTimer(); } catch (e) {} combat.active = false; combat.raid = null; combat.raidDebuff = null; combat.bossfx = null; combat.monfx = null; combatMode = false; mmAtMenu = keep.menu;
      try { _lastTickWall = 0; } catch (e) {}
      state = defaultState(); normalizeState();
    }
    return out;
  }
  /* The act a player would pick at a level: the best XP an hour on its own card. */
  function livePick(skill, lv, trees, cat) {
    setSkills(lv, trees);
    var best = '', top = 0;
    SKILLS[skill].acts.forEach(function (a) {
      if ((a.lvl || 1) > lv || (cat && a.cat !== cat)) return;
      for (var i in (a.inp || {})) state.items[i] = 1e9;
      var c; try { c = ratesFor(a, skill); } catch (e) { return; }
      if (c.xph > top) { top = c.xph; best = a.id; }
    });
    state = defaultState(); normalizeState();
    return best;
  }
  /* One act for `hours` of game time through tick(), with everything it needs on hand. */
  function liveSkill(skill, actId, lv, trees, hours, seed) {
    var D = Date.now, R = Math.random, out = {}, keep = { menu: mmAtMenu };
    try {
      setSkills(lv, trees);
      var act = actOf(skill, actId);
      for (var i in (act.inp || {})) state.items[i] = 1e9;
      mmAtMenu = false; combatMode = false; combat.active = false; combat.raid = null;
      var c = ratesFor(act, skill);
      out.act = act.name; out.card = { ms: c.ms, xph: c.xph, rph: c.rph };
      var fake = D.call(Date) + (window.__clockShift || 0); Date.now = function () { return fake; };
      Math.random = seeded(seed);
      hush(true);
      state.action = { skill: skill, actId: actId }; state.actionStart = fake;
      var base = state.xp[skill], gained = 0, steps = Math.round(hours * 14400);
      var outIds = Object.keys(act.out || {}), inIds = Object.keys(act.inp || {}), o0 = {}, i0 = {};
      outIds.forEach(function (id) { o0[id] = state.items[id] || 0; }); inIds.forEach(function (id) { i0[id] = state.items[id] || 0; });
      for (var s = 0; s < steps; s++) {
        fake += 250; tick();
        if (!state.action) { out.stopped = true; break; }
        if (state.xp[skill] !== base) { gained += state.xp[skill] - base; state.xp[skill] = base; }
      }
      out.xph = gained / hours;
      out.made = {}; outIds.forEach(function (id) { out.made[id] = ((state.items[id] || 0) - o0[id]) / hours; });
      out.used = {}; inIds.forEach(function (id) { out.used[id] = (i0[id] - (state.items[id] || 0)) / hours; });
      out.cardAfter = ratesFor(act, skill).xph;
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 400); }
    finally { hush(false); Date.now = D; Math.random = R; state.action = null; mmAtMenu = keep.menu; try { _lastTickWall = 0; } catch (e) {} state = defaultState(); normalizeState(); }
    return out;
  }

  /* ── robes: built off leather, and what casting in anything else costs ── */
  function robes() {
    var o = { tiers: [], bad: [] };
    CLOTH_TIERS.forEach(function (t) {
      var sum = { def: 0, atk: 0, mpow: 0, save: 0 }, lsum = { def: 0, atk: 0 }, req = null;
      RB.forEach(function (p, i) {
        var id = t.key + '_' + p, it = ITEMS[id], st = COMBAT_GEAR_STATS[id], L = COMBAT_GEAR_STATS[t.leather + '_' + PL[i]];
        if (!it || !st || !L) { o.bad.push(id + ' missing'); return; }
        if (!it.cloth || it.light) o.bad.push(id + ' is not cloth');
        if (st.def !== Math.max(1, Math.round((L.def || 0) * 0.62))) o.bad.push(id + ' def ' + st.def);
        if (st.atk !== Math.round((L.atk || 0) * 0.5)) o.bad.push(id + ' atk ' + st.atk);
        if (st.runeSave !== 0.015) o.bad.push(id + ' save ' + st.runeSave);
        if (st.crit || st.dodge || st.aspd || st.str || st.rstr) o.bad.push(id + ' carries a stat that is not cloth\'s');
        if (it.ctier !== t.ctier || it.cslot !== ['helmet', 'chest', 'legs', 'gloves', 'boots'][i]) o.bad.push(id + ' tier or slot');
        if (!SKILLS.runecrafting.acts.some(function (a) { return a.out && a.out[id]; })) o.bad.push(id + ' has no recipe');
        if (!ICONS[id]) o.bad.push(id + ' has no icon');
        var r = combatGearReq(id); req = r; if (!r || r.stat !== 'defence' || r.level !== COMBAT_GEAR_REQ[t.ctier]) o.bad.push(id + ' requirement');
        sum.def += st.def; sum.atk += st.atk; sum.mpow += st.mpow || 0; sum.save += st.runeSave; lsum.def += L.def || 0; lsum.atk += L.atk || 0;
      });
      if (!ITEMS[t.key] || !ICONS[t.key] || !SKILLS.runecrafting.acts.some(function (a) { return a.out && a.out[t.key]; })) o.bad.push(t.key + ' cloth');
      o.tiers.push({ key: t.key, set: t.set, tier: t.ctier, def: sum.def, atk: sum.atk, mpow: sum.mpow, want: t.mpow, save: +sum.save.toFixed(3), leatherDef: lsum.def, leatherAtk: lsum.atk, req: req && req.level });
    });
    /* the armour rule, piece by piece, on a level 99 mage */
    function arm(eq) {
      state = defaultState(); normalizeState(); for (var k in state.combatXp) state.combatXp[k] = XP_CUM[99];
      state.items = { crucible_rune: 1e6 }; state.combatEquipped = eq; combat.active = false; combat.raid = null; refreshCombatStats();
      return { mult: +magicArmourMult().toFixed(4), hit: playerMaxHit(), def: nonClothDef(), save: +runeSaveRate().toFixed(4), mpow: combatStats().mpow };
    }
    var W = { weapon: 'ancient_staff', quiver: 'crucible_rune' }, add = function (x) { var e = {}; for (var k in W) e[k] = W[k]; for (var k2 in x) e[k2] = x[k2]; return e; };
    var cloth = set5('wyrmsilk', RB), leather = set5('demon', PL), plate = set5('starsteel', PL);
    o.rule = { naked: arm(add({})), cloth: arm(add(cloth)), leather: arm(add(leather)), plate: arm(add(plate)),
      plateChest: arm(add({ chest: 'starsteel_chest' })), chestDef: COMBAT_GEAR_STATS.starsteel_chest.def,
      shield: arm({ weapon: 'ancient_wand', quiver: 'crucible_rune', shield: 'starsteel_shield' }), cape: arm(add({ cape: 'starsteel_cape' })),
      stonewright: arm(add({ gloves: 'stonewright_gauntlets' })), raidPlate: arm(add(set5('dawnward', ['helm', 'chest', 'legs', 'gloves', 'boots']))) };
    /* a sword and a bow pay nothing */
    state.combatEquipped = { weapon: 'starsteel_sword', chest: 'starsteel_chest' }; var swordMult = magicArmourMult();
    state.combatEquipped = { weapon: 'ancient_shortbow', quiver: 'starsteel_arrow', chest: 'starsteel_chest' }; state.items.starsteel_arrow = 10; var bowMult = magicArmourMult();
    o.others = [swordMult, bowMult];
    /* Magic Power on what every build already wears */
    o.bucklers = ['cobalt', 'runite', 'starsteel', 'moltensteel', 'voidsteel', 'dawnsteel'].map(function (k) { var s = COMBAT_GEAR_STATS[k + '_buckler']; return s ? (s.mpow || 0) : -1; });
    o.lowBucklers = ['bronze', 'iron', 'steel', 'mithril'].map(function (k) { var s = COMBAT_GEAR_STATS[k + '_buckler']; return s ? (s.mpow || 0) : -1; });
    o.stonewright = [COMBAT_GEAR_STATS.stonewright_gauntlets.mpow, !!ITEMS.stonewright_gauntlets.cloth, !!ITEMS.stonewright_gauntlets.light];
    var capes = Object.keys(COMBAT_GEAR_STATS).filter(function (id) { return ITEMS[id] && ITEMS[id].cslot === 'cape'; });
    o.capes = { n: capes.length, withStr: capes.filter(function (id) { return (COMBAT_GEAR_STATS[id].str || 0) > 0; }).length,
      wrong: capes.filter(function (id) { var s = COMBAT_GEAR_STATS[id]; return (s.str || 0) > 0 ? s.mpow !== s.str : !!s.mpow; }) };
    /* nothing that is not a robe, a buckler, Stonewright or a cape carries Magic Power */
    o.strays = Object.keys(COMBAT_GEAR_STATS).filter(function (id) { var it = ITEMS[id], s = COMBAT_GEAR_STATS[id]; if (!it || it._variant || !s.mpow) return false;
      return !(it.cloth || it.cslot === 'cape' || /_buckler$/.test(id) || id === 'stonewright_gauntlets'); });
    /* Ascension raises Magic Power with a piece's other numbers */
    state = defaultState(); normalizeState(); state.asc = {}; var b0 = gearStats('wyrmsilk_robe').mpow; state.asc.wyrmsilk_robe = 10; var b1 = gearStats('wyrmsilk_robe');
    o.asc = [b0, b1.mpow, b1.def, COMBAT_GEAR_STATS.wyrmsilk_robe.def, b1.runeSave];
    /* cards: what a robe, leather and plate each say */
    var chips = function (id) { var d = document.createElement('div'); d.innerHTML = combatGearStatBlock(id); return [].map.call(d.querySelectorAll('.nt-chip'), function (c) { return c.textContent.trim(); }); };
    state = defaultState(); normalizeState();
    o.cards = { robe: chips('seercloth_robe'), leather: chips('troll_chest'), plate: chips('cobalt_chest'), cape: chips('cobalt_cape'), stonewright: chips('stonewright_gauntlets'), staff: chips('frost_staff'), wand: chips('frost_wand') };
    var d2 = document.createElement('div'); d2.innerHTML = combatGearStatBlock('seercloth_robe'); o.robeStats = d2.querySelector('.nt-stats').textContent.replace(/\s+/g, ' ').trim();
    state = defaultState(); normalizeState();
    return o;
  }

  /* ── the spell bar, the keys, and the line on the health bar ──
     The bar is the part of Magic a player touches most, so it is driven here the
     way a player drives it: a press on a button, a key, a press on a greyed one. */
  function bar() {
    var o = {};
    var flat = function (e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
    function arm(rune, n) {
      state = defaultState(); normalizeState(); state.combatXp.magic = XP_CUM[99]; state.combatXp.hitpoints = XP_CUM[99];
      state.items = { ancient_staff: 1 }; state.items[rune] = n; state.combatEquipped = { weapon: 'ancient_staff', quiver: rune };
      state.combatSpell = BIGGEST; state.combatElement = 'fire'; state.combatStyle = 'strength';
      mmAtMenu = false; combatMode = true; state.cmbSubTab = 'arena'; state.cmbView = 'fight'; state.zone = 'rat_warrens';
      combat.raid = null; combat.active = false; combat.monId = 'rat'; combat.log = [];
      refreshCombatStats(); renderCombat();
    }
    var press = function (sel) { var b = document.querySelector('#cmbSpellBar ' + sel); if (b) b.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })); return !!b; };
    var key = function (code, shift, target) { var e = new KeyboardEvent('keydown', { code: code, key: code.slice(-1), shiftKey: !!shift, bubbles: true, cancelable: true }); (target || document.body).dispatchEvent(e); };
    var realRandom = Math.random;
    try {
      arm('starfall_rune', 1000);
      var el = document.getElementById('cmbSpellBar');
      o.buttons = el ? el.querySelectorAll('button').length : 0;
      o.sizeButtons = el ? [].map.call(el.querySelectorAll('[data-spell]'), flat) : [];
      o.elButtons = el ? [].map.call(el.querySelectorAll('[data-el]'), function (b) { return [b.getAttribute('data-el'), b.disabled, flat(b)]; }) : [];
      o.start = spellName();
      /* a press between fights */
      press('[data-spell="blast"]'); o.pressed = [spellName(), state.combatSpell, state.combatStyle];
      /* a press while the fight runs: the max hit the fight is using moves with it, and the fight goes on */
      combat.active = true; combat.foeHp = 1e9; combat.foeMaxHp = 1e9; combat.foeStatus = {}; renderCombat();
      var hitBlast = combat.youMaxHit;
      press('[data-spell="surge"]');
      o.midFight = [spellName(), combat.youMaxHit > hitBlast, combat.active, combat.log.map(function (l) { return l.t; }).slice(-1)[0]];
      combat.active = false;
      /* the same button again says nothing twice */
      var n0 = combat.log.length; press('[data-spell="surge"]'); o.repeat = combat.log.length - n0;
      /* Enter or Space on a focused button is a click with no press behind it */
      renderCombat(); var kb = document.querySelector('#cmbSpellBar [data-spell="bolt"]'); if (kb) kb.click();
      o.keyboardClick = [spellName(), state.combatStyle];
      /* a size the loaded rune cannot power is grey, names the rune it waits for, and does nothing */
      arm('crucible_rune', 1000);
      var surge = document.querySelector('#cmbSpellBar [data-spell="surge"]');
      o.greyed = [surge.disabled, flat(surge), surge.getAttribute('title')];
      var before = state.combatSpell; press('[data-spell="surge"]'); o.greyedPress = [spellName(), state.combatSpell === before];
      /* no runes at all: every size is grey */
      arm('crucible_rune', 0); delete state.items.crucible_rune; renderCombat();
      o.empty = [].map.call(document.querySelectorAll('#cmbSpellBar [data-spell]'), function (b) { return b.disabled; });
      /* the number keys, on the fight screen only */
      arm('starfall_rune', 1000);
      key('Digit1'); o.k1 = spellName(); key('Digit3'); o.k3 = spellName(); key('Numpad4'); o.k4 = spellName(); key('Digit2'); o.k2 = spellName();
      var inp = document.createElement('input'); document.body.appendChild(inp); key('Digit1', false, inp); o.typing = spellName(); inp.remove();
      combatMode = false; key('Digit1'); o.closed = spellName(); combatMode = true;
      state.cmbSubTab = 'mastery'; key('Digit1'); o.otherTab = spellName(); state.cmbSubTab = 'arena';
      state.combatEquipped.weapon = 'bronze_sword'; key('Digit1'); state.combatEquipped.weapon = 'ancient_staff'; o.sword = spellName();
      o.shift = MAGIC_ELEMENTS.map(function (e, i) { state.combatElement = 'fire'; key('Digit' + (i + 1), true); return spellElement(); });
      state.combatElement = 'fire';
      /* in a live raid 1, 2 and 3 are Rally, Ruin and Brace: the plain digits are left to them */
      state.combatXp.defence = XP_CUM[99]; state.combatXp.attack = XP_CUM[99]; state.combatXp.strength = XP_CUM[99];
      startRaid('sunken_barrow');
      var inRaid = !!(combat.raid && combat.active), s0 = spellName();
      key('Digit1'); var s1 = spellName();
      press('[data-spell="bolt"]'); var s2 = spellName();
      o.raid = [inRaid, s0, s1, s2, !!(combat.raid && combat.active)];
      stopCombatTimer(); combat.active = false; combat.raid = null;
      /* the line on the health bar: runes left and how long they last, amber under ten minutes */
      arm('starfall_rune', 4000); combat.active = true; renderCombat();
      var chip = document.getElementById('cmbAmmoChip');
      o.chip = [flat(chip), chip ? chip.className : '', Math.round(ammoMinutesLeft())];
      state.items.starfall_rune = 300; updateCombatBars(); chip = document.getElementById('cmbAmmoChip');
      o.chipLow = [flat(chip), chip ? /risk/.test(chip.className) : false, +ammoMinutesLeft().toFixed(1)];
      press('[data-spell="bolt"]'); o.chipBolt = +ammoMinutesLeft().toFixed(1);
      combat.active = false;
      /* a sword has no bar and no line; a bow has the line and no bar */
      state.combatEquipped = { weapon: 'bronze_sword' }; renderCombat();
      o.sword2 = [!!document.getElementById('cmbSpellBar'), !!document.getElementById('cmbAmmoChip'), !!document.querySelector('.cst-magic'), !!document.querySelector('.cst-ranged')];
      state.items = { ancient_shortbow: 1, starsteel_arrow: 500 }; state.combatXp.ranged = XP_CUM[99]; state.combatEquipped = { weapon: 'ancient_shortbow', quiver: 'starsteel_arrow' }; renderCombat();
      chip = document.getElementById('cmbAmmoChip');
      o.bow = [!!document.getElementById('cmbSpellBar'), flat(chip), !!document.querySelector('.cst-magic'), !!document.querySelector('.cst-ranged')];
      /* the readout's arrowSaveRate() against the roll the tick itself makes: a roll just
         under the rate keeps the arrow, one just over spends it */
      o.arrowRate = [[{ fl_salvage: 5, fl_gm_salv: 2, fl_endless: 1 }, 'ancient_shortbow', 'starsteel_arrow'], [{ fl_salvage: 10 }, 'starsteel_crossbow', 'starsteel_bolt'],
        [{ fl_salvage: 10, fl_gm_salv: 5, fl_endless: 1, fl_bolts: 1 }, 'starsteel_crossbow', 'starsteel_bolt']].map(function (c) {
        var run = function (roll) {
          state = defaultState(); normalizeState(); state.combatXp.ranged = XP_CUM[99]; state.tree.fletching = c[0];
          state.items = {}; state.items[c[1]] = 1; state.items[c[2]] = 100; state.combatEquipped = { weapon: c[1], quiver: c[2] };
          combat.raid = null; combat.monId = 'rat'; combat.log = []; refreshCombatStats();
          combat.active = true; combat.foeHp = 1e9; combat.foeMaxHp = 1e9; combat.foeStatus = {}; combat.foeSwingStart = Date.now() + 1e9; combat.foeSwingMs = 1e9;
          var r = arrowSaveRate(c[2]);
          Math.random = function () { return roll(r); };
          combat.youSwingStart = Date.now() - combat.youSwingMs - 1; combatTick();
          Math.random = realRandom;
          return [r, 100 - (state.items[c[2]] || 0)];
        };
        var under = run(function (r) { return Math.max(0, r - 0.001); }), over = run(function (r) { return Math.min(0.999, r + 0.001); });
        return [under[0], under[1], over[1]];
      });
    } finally { Math.random = realRandom; try { stopCombatTimer(); } catch (e) {} combat.active = false; combat.raid = null; combatMode = false; state = defaultState(); normalizeState(); }
    return o;
  }

  /* ── what a gold piece is: the best gold an hour each skill offers at 99 with its tree,
     and Runecrafting's beside them, so a rune that sells for too much shows up here ── */
  function gold() {
    setSkills(99, true);
    var out = {};
    for (var sk in SKILLS) {
      var top = 0, name = '';
      SKILLS[sk].acts.forEach(function (a) { var g = 0; try { g = ratesFor(a, sk).gph || 0; } catch (e) {} if (g > top) { top = g; name = a.name; } });
      out[sk] = { gph: top, act: name };
    }
    /* a batch of runes against what went into it, at shop prices */
    var batches = RUNES.filter(function (r) { return r.act; }).map(function (r) {
      var inp = 0; for (var k in r.act.inp) inp += (ITEMS[k].sell || 0) * r.act.inp[k];
      return { name: r.n, inputs: inp, batch: r.act.out[r.id] * (ITEMS[r.id].sell || 0), each: ITEMS[r.id].sell };
    });
    /* and every act in the skill, the same way: nothing it makes is worth much more than it took */
    var acts = SKILLS.runecrafting.acts.map(function (a) {
      var i = 0, o = 0; for (var k in a.inp) i += (ITEMS[k].sell || 0) * a.inp[k]; for (var k2 in a.out) o += (ITEMS[k2].sell || 0) * a.out[k2];
      return { name: a.name, inputs: i, sells: o };
    });
    return { best: out, batches: batches, acts: acts };
  }

  /* ── the goal, end to end ──
     Every table above arms a character by writing its state. These two do not:
     they press the act cards the skill panel builds, let the game's own tick do
     the work, dress through the equip path a satchel click takes, and press the
     spell bar. If a level, a material or a slot is wrong anywhere on the way from
     the quarry to the first kill, this is where it shows. */
  function journey() {
    var o = { steps: [], refused: [] };
    var keep = { toast: window.toast, random: Math.random, menu: mmAtMenu, skill: selectedSkill, tab: viewTab };
    window.toast = function (t) { t = String(t); if (!/level \d+!|equipped\./.test(t)) o.refused.push(t); };
    var rng = function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
    var lvlOf = function (skill) { return levelFromXp(state.xp[skill] || 0); };
    /* press the act's card as the panel builds it, then let tick() run it n times */
    function work(skill, id, n) {
      selectedSkill = skill; viewTab = 'acts';
      var act = getAct(skill, id), before = lvlOf(skill);
      var btn = buildActBtn(act, act.lvl, before, mods(skill), 0, 0);
      state.action = null; btn.click();
      var started = !!(state.action && state.action.skill === skill && state.action.actId === id), done = 0, guard = 0;
      while (started && done < n && state.action && guard++ < 600) {
        state.actionStart = Date.now() - actMs(act, skill) - 1;
        var x0 = state.xp[skill]; tick(); if (state.xp[skill] > x0) done++;
      }
      state.action = null;
      o.steps.push({ what: act.name, skill: skill, needs: act.lvl, at: before, started: started, done: done });
      return started && done === n;
    }
    try {
      Math.random = rng(7);
      state = defaultState(); normalizeState();
      mmAtMenu = false; combatMode = false; combat.raid = null; combat.active = false; combat.log = [];
      o.start = { magic: cmbLvl('magic'), rc: lvlOf('runecrafting'), items: Object.keys(state.items).filter(function (k) { return state.items[k] > 0; }).length, worn: Object.keys(state.combatEquipped).length };
      var pine = SKILLS.woodcutting.acts.filter(function (a) { return a.out && a.out.pine_log; })[0].id;
      /* stone, wood, ash and flax: all four open at level 1 */
      o.gather = [work('mining', 'mi_rs', 6), work('woodcutting', pine, 10), work('firemaking', 'fm1', 6), work('foraging', 'fo_flax', 18)];
      o.gatherAt = o.steps.map(function (s) { return s.at; });
      /* the bench */
      o.carve = work('runecrafting', 'rn_r_ash', 6); o.runes = state.items.ash_rune || 0;
      o.wand = work('runecrafting', 'rn_wand_pine', 1); o.runesAfterWand = state.items.ash_rune || 0;
      o.linen = work('runecrafting', 'rn_loom_linen', 6);
      o.hood = work('runecrafting', 'rn_rb_linen_hood', 1);
      /* the robe is Runecrafting 4: its card does nothing before then, and works at 4 */
      o.robeEarly = [lvlOf('runecrafting'), work('runecrafting', 'rn_rb_linen_robe', 1)];
      var guard = 0;
      while (lvlOf('runecrafting') < 4 && guard++ < 12) { work('mining', 'mi_rs', 4); work('woodcutting', pine, 4); work('firemaking', 'fm1', 4); work('runecrafting', 'rn_r_ash', 4); }
      o.robe = [lvlOf('runecrafting'), work('runecrafting', 'rn_rb_linen_robe', 1)];
      o.made = ['pine_wand', 'linen_hood', 'linen_robe'].map(function (k) { return state.items[k] || 0; });
      /* dress, through the path a satchel click takes */
      equipBodyItem('pine_wand', 'weapon', 'combat'); equipBodyItem('ash_rune', 'quiver', 'combat');
      equipBodyItem('linen_robe', 'chest', 'combat'); equipBodyItem('linen_hood', 'helmet', 'combat');
      o.worn = ['weapon', 'quiver', 'chest', 'helmet'].map(function (s) { return state.combatEquipped[s] || ''; });
      /* the fight: the zone and the monster a new character is offered, the bar, the kill */
      enterCombat(); state.cmbSubTab = 'arena'; state.cmbView = 'fight';
      selectZone('rat_warrens'); selectMonster('rat');
      engageCombat(); stopCombatTimer();
      o.engaged = !!combat.active;
      var flat = function (b) { return [b.getAttribute('data-spell') || b.getAttribute('data-el'), b.disabled, b.textContent.replace(/\s+/g, ' ').trim(), b.getAttribute('title') || '']; };
      o.bar = [].map.call(document.querySelectorAll('#cmbSpellBar button'), flat);
      var press = function (sel) { var b = document.querySelector('#cmbSpellBar ' + sel); if (b) b.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })); };
      press('[data-el="fire"]'); press('[data-spell="bolt"]');
      o.spell = spellName();
      var mon = getMonster(combat.monId);
      o.numbers = { mon: mon.name, hit: playerMaxHit(), foeHp: combat.foeHp, hp: combat.youMaxHp };
      var kills = function () { return (state.monKills && state.monKills[mon.id]) || 0; };
      var k0 = kills(), r0 = state.items.ash_rune || 0, m0 = state.combatXp.magic || 0, casts = 0;
      while (combat.active && kills() === k0 && casts < 400) {
        combat.youSwingStart = Date.now() - combat.youSwingMs - 1; combat.foeSwingStart = Date.now() - combat.foeSwingMs - 1;
        combatTick(); casts++;
      }
      o.fight = { casts: casts, kills: kills() - k0, spent: r0 - (state.items.ash_rune || 0), alive: combat.youHp > 0, magicXp: (state.combatXp.magic || 0) - m0 };
      o.said = combat.log.map(function (l) { return l.t; }).filter(function (t) { return /^Fire Bolt (hits|crits) /.test(t); })[0] || '';
    } catch (e) { o.err = String(e && e.stack || e).slice(0, 400); }
    finally {
      Math.random = keep.random; window.toast = keep.toast; try { stopCombatTimer(); } catch (e) {}
      combat.active = false; combat.raid = null; combatMode = false; mmAtMenu = keep.menu; selectedSkill = keep.skill; viewTab = keep.tab;
      state = defaultState(); normalizeState();
    }
    return o;
  }
  /* a level 99 mage in Wyrmsilk, in the hardest raid and on the Spire */
  function veteran() {
    var o = { refused: [] };
    var keep = { toast: window.toast, random: Math.random, menu: mmAtMenu };
    window.toast = function (t) { t = String(t); if (!/equipped\./.test(t)) o.refused.push(t); };
    function run(raidId) {
      state = defaultState(); normalizeState();
      mmAtMenu = false; combatMode = false; combat.raid = null; combat.active = false; combat.log = [];
      ['magic', 'defence', 'hitpoints'].forEach(function (k) { state.combatXp[k] = XP_CUM[99]; });
      state.items = { ancient_staff: 1, starfall_rune: 4000 };
      var set = 'wyrmsilk', slot = ['helmet', 'chest', 'legs', 'gloves', 'boots'];
      RB.forEach(function (p) { state.items[set + '_' + p] = 1; });
      equipBodyItem('ancient_staff', 'weapon', 'combat'); equipBodyItem('starfall_rune', 'quiver', 'combat');
      RB.forEach(function (p, i) { equipBodyItem(set + '_' + p, slot[i], 'combat'); });
      var r = { worn: Object.keys(state.combatEquipped).length, cl: combatLevel() };
      enterCombat(); startRaid(raidId); stopCombatTimer();
      var mon = getMonster(combat.monId);
      r.inRaid = !!(combat.raid && combat.active); r.foe = mon.name; r.weak = mon.weakEl || ''; r.resist = mon.resistEl || '';
      var press = function (sel) { var b = document.querySelector('#cmbSpellBar ' + sel); if (b) b.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })); };
      r.buttons = document.querySelectorAll('#cmbSpellBar button').length;
      press('[data-el="storm"]'); press('[data-spell="surge"]');
      r.spell = spellName(); r.hit = combat.youMaxHit;
      /* dice at 0.2: the cast lands, does 60% of its max hit, and nothing else rolls in */
      Math.random = function () { return 0.2; };
      var r0 = state.items.starfall_rune, hp0 = combat.foeHp;
      combat.foeSwingStart = Date.now() + 1e9; combat.youSwingStart = Date.now() - combat.youSwingMs - 1; combatTick();
      Math.random = keep.random;
      r.spent = r0 - state.items.starfall_rune; r.dealt = hp0 - combat.foeHp;
      r.want = Math.max(1, Math.round(Math.round(r.hit * (COMBAT_P.HIT_MIN + 0.2 * (1 - COMBAT_P.HIT_MIN))) * elementMult(mon, 'storm')));
      r.said = combat.log.map(function (l) { return l.t; }).filter(function (t) { return /^Storm Surge /.test(t); })[0] || '';
      r.still = !!(combat.raid && combat.active);
      stopCombatTimer(); combat.active = false; combat.raid = null;
      return r;
    }
    try {
      var hardest = RAIDS.filter(function (r) { return !r.endless; }).sort(function (a, b) { return b.unlockLvl - a.unlockLvl; })[0];
      var spire = RAIDS.filter(function (r) { return r.endless; })[0];
      o.raidName = hardest.name; o.raid = run(hardest.id);
      o.spireName = spire.name; o.spire = run(spire.id);
    } catch (e) { o.err = String(e && e.stack || e).slice(0, 400); }
    finally {
      Math.random = keep.random; window.toast = keep.toast; try { stopCombatTimer(); } catch (e) {}
      combat.active = false; combat.raid = null; combatMode = false; mmAtMenu = keep.menu; state = defaultState(); normalizeState();
    }
    return o;
  }

  function consts() {
    return { HIT_MIN: COMBAT_P.HIT_MIN, BURN_CHANCE: BURN_CHANCE, BURN_DUR_MS: BURN_DUR_MS, BURN_TICK_MS: BURN_TICK_MS, XP_SCALE: XP_SCALE,
      WEAK: ELEMENT_WEAK_MULT, RESIST: ELEMENT_RESIST_MULT,
      elements: MAGIC_ELEMENTS.map(function (e) { return { k: e.k, n: e.n, lvl: e.lvl, rider: e.rider }; }),
      sizes: SPELL_SIZES.map(function (s) { return { k: s.k, n: s.n, runes: s.runes, m: s.m }; }),
      monsters: MONSTERS.map(function (m) { return { id: m.id, name: m.name, zone: m.zone, lvl: m.lvl, hp: m.hp, atk: m.atk, str: m.str, def: m.def, xp: m.xp, coins: m.coins, swingMs: m.swingMs, boss: !!m.boss, weakTo: m.weakTo, resistTo: m.resistTo, weakEl: m.weakEl, resistEl: m.resistEl }; }),
      build: (document.querySelector('.mm-ver') || { getAttribute: function () { return ''; } }).getAttribute('data-build'),
      demo: IS_DEMO, robes: CLOTHK.length, magicWeapons: Object.keys(ITEMS).filter(isMagicWeapon).length };
  }

  window.SIM = { levelCheck: levelCheck, saves: saves, consts: consts, parity: parity, ladder: ladder, dressed: dressed, economy: economy, skillXp: skillXp,
    reagents: reagents, structure: structure, nodes: nodes, spells: spells, spellSizes: spellSizes, castRates: castRates, casting: casting, bar: bar, gold: gold, elements: elements, elTables: elTables, elementFx: elementFx, fighters: fighters, robes: robes,
    journey: journey, veteran: veteran, liveFight: liveFight, liveSkill: liveSkill, livePick: livePick, liveRaid: liveRaid,
    raids: function () { return RAIDS.map(function (r) { return { id: r.id, name: r.name, endless: !!r.endless, stages: (r.stages || []).length }; }); } };
}

setTimeout(() => {
  const w = dom.window;
  /* The live section must not care what day it is run on. CV_CLOCK_SHIFT moves the
     clock it holds by that many hours, and the section has to print the same thing. */
  w.eval('window.__clockShift=' + (Math.round((+process.env.CV_CLOCK_SHIFT || 0) * 3600000)) + ';');
  w.eval('(' + PAGE.toString() + ')()');
  const J = src => JSON.parse(w.eval('JSON.stringify(' + src + ')'));
  const C = J('SIM.consts()');
  const R = {};
  console.log(`\nMAGIC, measured on build ${C.build}  ·  held to ${GOLD.from}\n`);
  check(C.demo === false, 'booted as the full game, not the demo');

  /* 0. structure */
  console.log('\n0. STRUCTURE');
  R.structure = J('SIM.structure()');
  check(R.structure.skills === 15 && R.structure.inLiteral, 'Runecrafting is the fifteenth skill, and it is in the SKILLS literal', R.structure.skills + ' skills');
  check(R.structure.xphSeeded, 'so its XP an hour buffers were seeded at parse time, and its XP an hour cannot freeze');
  check(R.structure.treeSum === 98, 'the Runecrafting tree sums to 98', R.structure.nodes + ' nodes, ' + R.structure.cols + ' columns, ' + R.structure.maxAbreast + ' abreast at most');
  check(R.structure.sameShapeAsFletching, 'and sits on the board exactly as Fletching does');
  same('the tree is the shape the prototype measured', { treeSum: R.structure.treeSum, nodes: R.structure.nodes, cols: R.structure.cols, maxAbreast: R.structure.maxAbreast, sameShapeAsFletching: R.structure.sameShapeAsFletching }, GOLD.structure);
  check(R.structure.missing.length === 0, 'every Runecrafting input exists in the game, and so does everything it makes', R.structure.missing.slice(0, 4).join(', '));
  check(R.structure.pfx === 'rn' && R.structure.rail === 'produce' && !!R.structure.accent && R.structure.cape === 'cape_runecrafting' && R.structure.capeInShop,
    'it has its tree prefix, its place on the rail, its colour, and a cape the shop sells');
  check(JSON.stringify(R.structure.acts) === '{"runes":8,"wands":7,"staves":7,"cloth":7,"robes":35}', '64 acts in five tabs: runes, wands, staves, cloth, robes', JSON.stringify(R.structure.acts));

  /* 1. combat level */
  console.log('\n1. COMBAT LEVEL');
  R.level = J('SIM.levelCheck(200000)');
  check(R.level.moved === 0, 'no existing save changes combat level', R.level.seen.toLocaleString() + ' saves tried, ' + R.level.moved + ' moved');
  check(R.level.mage99 === R.level.melee99 && R.level.arch99 === R.level.melee99, 'a pure mage, archer and fighter reach the same level', `${R.level.mage99} / ${R.level.arch99} / ${R.level.melee99}`);
  same('the combat level check is the one the prototype ran', R.level, GOLD.level);

  /* 2. saves */
  console.log('\n2. SAVES');
  const sv = J('SIM.saves()');
  check(sv.legacy.magic === 0 && sv.legacy.el === 'fire' && sv.legacy.spell === 'surge' && sv.legacy.rc === 0,
    'a save from before Magic loads with Magic 0, Fire, the biggest spell and Runecrafting 0', JSON.stringify(sv.legacy));
  check(sv.legacy.level === sv.legacy.was, 'and at the combat level it had', sv.legacy.was + ' before, ' + sv.legacy.level + ' after');
  check(sv.badXp === 0 && sv.negXp === 0, 'Magic XP that is not a number, or is negative, is mended to 0');
  check(sv.unknownEl === 'fire' && sv.unknownSpell === 'surge', 'an unknown element goes back to Fire and an unknown spell to the biggest');
  check(sv.locked.every(x => x[1] === 'fire' && x[2] === x[0]), 'an element is kept only once the Magic level opens it', sv.locked.map(x => x[0]).join(' '));
  check(sv.slotArcher[0] === sv.slotArcher[1] && sv.slotMage[0] === sv.slotMage[1] && sv.slotMage[0] === sv.slotArcher[0],
    'the save slot shows the level the game shows, for an archer and for a mage', 'archer ' + sv.slotArcher.join('/') + ', mage ' + sv.slotMage.join('/'));
  check(sv.guild.join() === 'true,false,true,false', 'a guild can ask for a Ranged level or a Magic level');

  /* 3. weapon maths */
  const LV = [20, 50, 75, 99], TI = [3, 5, 7, 7];
  R.parity = J('SIM.parity(' + JSON.stringify(LV) + ',' + JSON.stringify(TI) + ')');
  R.parityRS = J('SIM.parity([20,40,60,80,99],[1,3,5,6,7])');
  /* There is no such thing as a cast without an element, so the band is tested on
     the mage as played: Fire, the element every mage has from level 1. */
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
  const w1 = band(R.parity, '3. WEAPON MATHS  ·  equal investment, matched tier, no armour (the _rangedsim.js test)');
  check(w1 <= 5, 'Magic is inside 95-105% of melee and of every ranged weapon at Lv 20, 50, 75 and 99', 'furthest from level: ' + w1.toFixed(1) + ' points');
  const w2 = band(R.parityRS, '   the same test on the levels and tiers _rangedsim.js itself prints');
  check(w2 <= 5, 'and on the five rows _rangedsim.js prints', 'furthest from level: ' + w2.toFixed(1) + ' points');
  same('the weapon maths are the prototype\'s, to the digit', R.parity, GOLD.parity);
  same('and so are the five rows _rangedsim.js prints', R.parityRS, GOLD.parityRS);
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
  same('the ladder is the prototype\'s, to the digit', R.ladder, GOLD.ladder);
  same('and its worst point', R.ladderWorst, GOLD.ladderWorst);

  /* 4. dressed */
  {
    R.dressed = J('SIM.dressed([40,60,80,99],[3,5,6,7])');
    console.log('\n4. DRESSED  ·  crafted gear, no enchants. Plate for the sword, leather for the bow, cloth for the mage. Magic with Fire.');
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
       light-weapon crit the bow and the dagger get and the crossbow does not. That
       is the whole of the gap, and why this pair is held to 108 and not 105. */
    check(R.dressed.every(x => x.wandVsXbowB >= 95 && x.wandVsXbowB <= 108), 'and a wand with a buckler is inside 95-108% of a crossbow with one', R.dressed.map(x => x.wandVsXbowB + '%').join(' '));
    check(R.dressed.every(x => x.staffLeather.dps < x.staff.dps * 0.97 && x.staffPlate.dps < x.staffLeather.dps), 'cloth is the right thing to cast in at every tier: leather is worse, plate worse again');
    same('the dressed table is the prototype\'s, to the digit', R.dressed, GOLD.dressed);
  }

  /* 5. rune economy */
  R.economy = J('SIM.economy()');
  console.log('\n5. WHAT A RUNE COSTS  ·  seconds of work per rune, from the stone up (the _rangedecon.js method)');
  console.log('   at the level the rune unlocks, no tree               |  at 99 with every tree');
  console.log('   rune       stone   fuel   make | a rune  an arrow    |  a rune  an arrow   bench makes');
  const eu = R.economy.runes.filter(x => !x.trained), et = R.economy.runes.filter(x => x.trained);
  const au = R.economy.arrows.filter(x => !x.trained), at = R.economy.arrows.filter(x => x.trained);
  eu.forEach((x, i) => console.log(`   ${padr(x.name, 9)} ${pad(x.stoneSec, 6)} ${pad(x.fuelSec, 6)} ${pad(x.makeSec, 6)} | ${pad(x.perRune + 's', 6)} ${pad(au[i].perArrow + 's', 8)}    | ${pad(et[i].perRune + 's', 7)} ${pad(at[i].perArrow + 's', 8)} ${pad(et[i].runesPerHrBench.toLocaleString() + '/hr', 13)}`));
  same('the rune prices are the prototype\'s, to the digit', R.economy, GOLD.economy);
  /* an hour of casting, per family. The first three columns are a new mage: skills
     at the level the rune unlocks, no tree. The last is a finished one: 99s, every
     tree, and the 85% ceiling on saving. Agility decides how many casts an hour of
     fighting holds: a new mage has it at the level the rune unlocks, a finished
     one has 99. */
  const SAVES = [['new, nothing saved', 0, false], ['new, robes only (7.5%)', 0.075, false], ['new, half the saving (40%)', 0.40, false], ['finished (85%)', 0.85, true]];
  const _rates = {}; const rate = (tier, agi) => _rates[tier + ':' + agi] || (_rates[tier + ':' + agi] = J(`SIM.castRates(${tier},${agi})`));
  R.upkeep = R.parity.map(x => {
    const cls = eu[x.tier - 1].cls;
    const o = { lv: x.lv, tier: x.tier, rune: eu[x.tier - 1].name, cls, spell: C.sizes[cls - 1].n, rows: [] };
    for (const [label, sv2, trained] of SAVES) {
      const rune = (trained ? et : eu)[x.tier - 1], arrow = (trained ? at : au)[x.tier - 1];
      const agi = trained ? 99 : rune.lvl, c = rate(x.tier, agi);
      const mins = (casts, per) => +(casts * (1 - sv2) * per / 60).toFixed(1);
      o.rows.push({ label, save: sv2, trained, agi, castsWand: Math.round(c.wand), castsStaff: Math.round(c.staff), shots: Math.round(c.bow),
        wand: mins(c.wand, rune.perCast), staff: mins(c.staff, rune.perCast), bow: mins(c.bow, arrow.perArrow) });
    }
    o.castsWand = o.rows[0].castsWand; o.castsStaff = o.rows[0].castsStaff; o.shots = o.rows[0].shots;
    o.benchHr = eu[x.tier - 1].runesPerHrBench;
    return o;
  });
  console.log('\n   AN HOUR OF CASTING  ·  minutes of quarrying, burning and firing it costs:  wand / staff (bow)');
  console.log('   lv  rune      casts/hr wand/staff |  ' + SAVES.map(s => padr(s[0], 30)).join(''));
  for (const u of R.upkeep) console.log(`   ${pad(u.lv, 2)}  ${padr(u.rune, 9)} ${pad(u.castsWand, 6)} / ${pad(u.castsStaff, 5)}      |  ` + u.rows.map(r => padr(`${r.wand}m / ${r.staff}m (${r.bow}m)`, 30)).join(''));
  console.log('\n   WITH THE RUNE COST TAKEN OFF  ·  damage per hour of your time (fighting plus feeding the weapon), as % of melee');
  console.log('   lv |' + SAVES.map(s => padr('  ' + s[0], 36)).join('|'));
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
  same('an hour of casting costs what the prototype measured', R.upkeep, GOLD.upkeep);
  same('and so does the hour with the rune cost taken off', R.net, GOLD.net);

  /* 5b. the spell ladder */
  R.spells = J('SIM.spells()');
  R.sizes = J('SIM.spellSizes(' + JSON.stringify(LV) + ',' + JSON.stringify(TI) + ')');
  console.log('\n5b. SPELL SIZES  ·  the Magic Power a cast gets, by rune and by size');
  console.log('   rune       grade  arrow  ' + C.sizes.map(s => pad(s.n + ' x' + s.runes, 10)).join('') + '   batch');
  for (const r of R.spells.table) console.log('   ' + padr(r.name, 10) + pad(r.tier, 5) + pad(r.arrow, 7) + '  ' + C.sizes.map((s, i) => pad(i < r.cls ? r.sizes[i] : '.', 10)).join('') + pad(r.batch || 'drop', 8));
  console.log('   first castable: ' + R.spells.sizes.map(s => `${s.n} at Magic ${s.magic} (${s.weapon}, ${s.rune} Runes)`).join(' · '));
  check(R.spells.table.every(r => r.sizes[r.cls - 1] === r.pow && r.pow === r.arrow), 'the biggest spell a rune powers gets exactly the strength of the arrow of its tier', R.spells.table.map(r => r.pow).join(' '));
  check(R.spells.table.every(r => r.sizes.every((p, i) => i === 0 || p > r.sizes[i - 1])), 'with the same rune a bigger spell always gets more');
  check(C.sizes.every((s, i) => { const col = R.spells.table.filter(r => r.cls > i).map(r => r.sizes[i]); return col.every((p, j) => j === 0 || p >= col[j - 1]); }), 'a better rune is never worse at the same spell');
  check(R.spells.table.filter(r => r.batch).every(r => r.batch === 40 * r.cls), 'a batch is 40 runes for every rune the biggest spell spends', R.spells.table.filter(r => r.batch).map(r => r.batch).join(' '));
  same('the spell ladder is the prototype\'s, to the digit', R.spells, GOLD.spells);
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
  for (const z of R.sizes) for (const r of z.rows) { r.lasts = +(z.rows[0].size / r.size).toFixed(2); r.stackDmg = +(r.ofBig / 100 * z.rows[0].size / r.size).toFixed(2); }
  const stretch = R.sizes.map(z => z.rows[z.rows.length - 1].stackDmg);
  R.sizeSummary.stretch = [Math.min(...stretch), Math.max(...stretch)];
  check(R.sizes.every(z => z.rows.every((r, i) => i === 0 || r.stackDmg > z.rows[i - 1].stackDmg)), 'what a smaller spell is for: the same stack of runes does more damage in total, the smaller the spell', 'a stack cast as Bolts does ' + Math.min(...stretch) + ' to ' + Math.max(...stretch) + ' times the damage it does at full size');
  same('every size is worth what the prototype measured, to the digit', R.sizes, GOLD.sizes);
  same('and the summary of them', R.sizeSummary, GOLD.sizeSummary);

  /* 6. the reagents enchanting already spends */
  R.reagents = J('SIM.reagents()');
  console.log('\n6. THE ENCHANTING POOL');
  console.log('   everything Magic ever spends from that pool, once, to bind every crafted staff and wand: ' + JSON.stringify(R.reagents.magicSpendsOnce));
  check(R.reagents.magicSpendsOnce.rune_fragment === 0 && R.reagents.magicSpendsOnce.mana_essence === 0, 'Magic spends no Rune Fragments and no Mana Essence');
  same('what Magic takes from the enchanting pool is what the prototype measured', R.reagents, GOLD.reagents);

  /* 7. skilling xp */
  {
    R.skillXp = J('SIM.skillXp()');
    console.log('\n7. RUNECRAFTING XP AGAINST ITS NEIGHBOURS  ·  best unlocked act, xp/hr, no tree');
    const CMP = ['runecrafting', 'fletching', 'crafting', 'smithing', 'cooking', 'alchemy', 'jeweler', 'firemaking', 'mining'];
    console.log('   lv   ' + CMP.map(s => pad(s.slice(0, 9), 10)).join('') + pad('runes only', 12) + pad('quarry', 9));
    for (const r of R.skillXp.rows) console.log('   ' + pad(r.lv, 2) + '   ' + CMP.map(s => pad((r[s].xph / 1000).toFixed(1) + 'k', 10)).join('') + pad((r.runesOnly.xph / 1000).toFixed(1) + 'k', 12) + pad((r.quarry / 1000).toFixed(1) + 'k', 9));
    console.log('   hours 1 to 99, inputs on hand: ' + Object.keys(R.skillXp.hours).map(k => k + ' ' + R.skillXp.hours[k]).join(' · '));
    console.log('   peak at 99 with the tree: ' + CMP.map(s => s + ' ' + Math.round(R.skillXp.peak[s] / 1000) + 'k').join(' · '));
    for (const r of R.skillXp.rows) { r.vsFletching = pct(r.runecrafting.xph, r.fletching.xph); }
    check(R.skillXp.rows.every(r => r.vsFletching >= 70 && r.vsFletching <= 115), 'Runecrafting levels within 70-115% of Fletching at every level', R.skillXp.rows.map(r => r.vsFletching + '%').join(' '));
    check(R.skillXp.rows.every(r => r.quarry < r.copper), 'quarrying runestone is never the Mining XP pick', R.skillXp.rows.map(r => Math.round(r.quarry / r.copper * 100) + '%').join(' ') + ' of copper');
    same('the Runecrafting XP table is the prototype\'s, to the digit', R.skillXp, GOLD.skillXp);
  }

  /* 8. every node changes a number */
  console.log('\n8. THE TREE  ·  each node bought alone at full rank, and the one number it says it moves');
  R.nodes = J('SIM.nodes()');
  for (const n of R.nodes.rows) console.log('   ' + padr(n.name, 20) + padr(String(n.before), 22) + ' -> ' + padr(String(n.after), 22) + (n.desc || n.why || ''));
  check(R.nodes.rows.length === 16 && R.nodes.rows.every(n => n.moved), 'all sixteen Runecrafting nodes change a number', R.nodes.rows.filter(n => !n.moved).map(n => n.id).join(', ') || '16 of 16');
  check(R.nodes.capeNeedsCape, 'the cape node gives nothing without the cape');
  check(R.nodes.wandUntouched, 'Close Cutting and the cape add runes, and leave a bound wand alone');
  check(Math.abs(R.nodes.batchMade - R.nodes.batchCard) < R.nodes.batchCard * 0.02, 'a batch makes what its card says, with Close Cutting and the cape both on',
    `card ${R.nodes.batchCard}, 200 batches averaged ${R.nodes.batchMade}, plain batch ${R.nodes.batchBase}`);

  /* 9. a cast, in the real tick */
  console.log('\n9. CASTING  ·  combatTick itself, one cast at a time, dice fixed');
  R.cast = J('SIM.casting()');
  check(R.cast.spent.join() === '1,2,3,4', 'Bolt, Blast, Wave and Surge spend 1, 2, 3 and 4 runes a cast', R.cast.spent.join(' '));
  check(R.cast.capped[0] === 3 && R.cast.capped[1] === 3 && R.cast.capped[2] === 'Fire Wave', 'a rune that powers a Wave casts a Wave when a Surge is asked for', R.cast.capped.join(' / '));
  check(R.cast.last[0] === 0 && R.cast.last[1] === true, 'the last cast of a stack spends what is left');
  check(R.cast.dry[0] === false && /You are out of Starfall Runes\./.test(R.cast.dry[1]), 'and the next one stops the fight and says why, in the plural', R.cast.dry[1]);
  check(/You are out of Starsteel Arrows\./.test(R.cast.archerDry), 'an archer gets the same plural', R.cast.archerDry);
  check(R.cast.empty[0] === false && /no runes loaded/.test(R.cast.empty[1]), 'a staff with nothing loaded does not cast');
  check(R.cast.arrows[0] === false && R.cast.arrows[1] === 50 && /does not cast Starfall Arrows/.test(R.cast.arrows[2]), 'a staff does not cast arrows, and spends none');
  check(R.cast.tooHigh[0] === false && R.cast.tooHigh[1] === 50 && /cannot cast Starfall Runes/.test(R.cast.tooHigh[2]), 'a Pine Wand cannot cast Starfall Runes, at any Magic level');
  check(/^Fire Blast hits the /.test(R.cast.logLine), 'the combat log names the spell', R.cast.logLine);
  check(R.cast.kept === 0, 'a cast that keeps its runes spends none of them');
  check(R.cast.miss[0] === 0 && R.cast.miss[1] === false && /misses/.test(R.cast.miss[2]), 'a cast that misses does no damage and applies no element, even on a monster weak to it', R.cast.miss[2]);
  check(R.cast.burn === true, 'Fire sets the monster burning');
  check(R.cast.strength[0] === R.cast.strength[1], 'Strength from a potion or a food does nothing for a spell', R.cast.strength.join(' = '));
  check(R.cast.trains === 'magic', 'a wand trains Magic');
  check(R.cast.warded[1] > 0 && Math.abs(R.cast.warded[0] - R.cast.warded[1]) <= 1 && R.cast.focused[1] === 0, 'Warded sends half its XP to Defence, Focused none', `Warded ${R.cast.warded.join(' / ')}, Focused ${R.cast.focused.join(' / ')}`);
  check(R.cast.styles[0][0] === 'Focused' && R.cast.styles[1][0] === 'Swift' && R.cast.styles[2][0] === 'Warded'
    && R.cast.styles[1][1] < R.cast.styles[0][1] && R.cast.styles[1][2] < R.cast.styles[0][2] && R.cast.styles[2][1] > R.cast.styles[0][1] && R.cast.styles[2][2] === R.cast.styles[0][2],
    'Swift casts faster and hits less often, Warded casts slower', R.cast.styles.map(s => `${s[0]} ${s[1]}ms acc ${s[2]}`).join(' · '));
  check(R.cast.req[0].stat === 'magic' && R.cast.req[0].level === 70 && R.cast.req[1].stat === 'magic' && R.cast.req[1].level === 1, 'staves and wands need Magic, on the ladder a blade climbs on Attack');
  check(R.cast.fit.join() === 'true,true,false,true,true,false,false', 'a wand or a staff casts runes up to its own tier plus one, and nothing else loads them', R.cast.fit.join(' '));
  check(R.cast.slots[0].join() === 'weapon' && R.cast.slots[1].join() === 'weapon' && R.cast.slots[2].join() === 'quiver' && R.cast.slots[3].length === 0, 'a staff goes in the weapon slot and a rune in the quiver');
  check(R.cast.pools[0] === 'staff' && R.cast.pools[1].indexOf('atkBoost') < 0 && R.cast.pools[1][0] === 'magicDmg' && R.cast.pools[2] === 'weapon' && R.cast.pools[3] === 'bow',
    'a staff rolls from the staff pool, and Attack is not in it', (R.cast.pools[1] || []).join(' '));

  /* 9b. elements */
  R.elements = J('SIM.elements()');
  console.log('\n9b. THE ELEMENT PASS  ·  ' + R.elements.total + ' monsters');
  console.log('   ' + Object.keys(R.elements.count).map(k => `${k}: weak ${R.elements.count[k].weak}, resist ${R.elements.count[k].resist}`).join(' · '));
  console.log(`   today: ${R.elements.melee.weak} of ${R.elements.total} are weak to a melee type and ${R.elements.melee.resist} resist one; ${R.elements.ranged.weak} are weak to ranged and ${R.elements.ranged.resist} resist it`);
  for (const z of R.elements.zones) console.log(`   ${padr(z.name, 18)} Lv ${pad(z.minLvl, 2)}-${pad(z.maxLvl, 2)}  best ${padr(z.best, 7)} (${z.bestWeak}/${z.n} weak)   ` + Object.keys(z.score).map(k => k[0].toUpperCase() + (z.score[k] >= 0 ? '+' : '') + z.score[k]).join(' '));
  const cnt = R.elements.count;
  console.log('   once unlocked: ' + Object.keys(R.elements.after).map(k => { const a = R.elements.after[k]; return `${k} is right for ${a.weak} of ${a.pool} and wrong for ${a.resist}`; }).join(' · '));
  check(Object.keys(cnt).length === 4 && Object.keys(cnt).every(k => cnt[k].weak >= 6 && cnt[k].resist >= 6), 'every element has monsters weak to it and monsters that resist it', Object.keys(cnt).map(k => `${k} ${cnt[k].weak}/${cnt[k].resist}`).join('  '));
  check(R.elements.fireResistedEarly.length <= 1, 'Fire, the only element below Magic 12, is almost never the wrong one that early', R.elements.fireResistedEarly.join(', ') || 'nothing under level 15 resists it');
  check(R.elements.rows.every(r => r.weakEl), 'every monster is weak to one element, as every monster is weak to one melee type');
  same('the element pass over the ' + R.elements.total + ' monsters is the prototype\'s, row for row', R.elements, GOLD.elements);
  R.el = J('SIM.elTables()');
  const pairEq = (a, b) => a && b && (a[0] || null) === (b[0] || null) && (a[1] || null) === (b[1] || null);
  const monBad = Object.keys(R.el.mon).filter(id => !pairEq(R.el.mon[id], GOLD.el.mon[id]));
  check(Object.keys(R.el.mon).length === 57 && monBad.length === 0, 'all 57 monsters carry the element the design gives them', monBad.join(', ') || Object.keys(R.el.mon).length + ' rows');
  const raidBad = Object.keys(GOLD.el.raid).filter(id => !pairEq(R.el.raid[id], GOLD.el.raid[id]));
  check(R.el.raidStages === 27 && Object.keys(GOLD.el.raid).length === 27 && raidBad.length === 0, 'and all 27 raid stages', raidBad.join(', ') || '27 stages');
  const spireBad = GOLD.el.spire.filter(r => !R.el.spire.some(x => x[0] === r[0] && pairEq([x[1], x[2]], [r[1], r[2]]))).map(r => r[0]);
  check(R.el.natives === 9 && spireBad.length === 0, 'and all nine Spire monsters', spireBad.join(', ') || '9 monsters');
  check(R.el.odd.length === 0, 'no row names an element that does not exist, and nothing is weak to what it resists', R.el.odd.slice(0, 4).join(', '));
  check(R.el.floors === 160 && R.el.wrong.length === 0, 'a Spire floor that borrows a monster carries its elements with its weakness', R.el.wrong.slice(0, 3).join(', ') || R.el.floors + ' floors');
  check(R.el.mult.join() === '1.15,1,1.15,0.85,1', 'weak is +15%, resisted is -15%, and anything else is neither', R.el.mult.join(' '));
  R.fx = J('SIM.elementFx()');
  check(R.fx.unlock.map(u => u.join(' ')).join(', ') === 'fire 1, frost 12, storm 30, shadow 50', 'Fire opens at Magic 1, Frost at 12, Storm at 30, Shadow at 50');
  check(R.fx.weak[3] > 1.14 && R.fx.weak[3] < 1.16 && R.fx.weak[4] > 0.84 && R.fx.weak[4] < 0.86, 'in the fight, the same roll does 15% more to a weak monster and 15% less to one that resists', `${R.fx.weak[0]} plain, ${R.fx.weak[1]} weak, ${R.fx.weak[2]} resisted`);
  check(R.fx.fire[0] === R.fx.fire[1] && R.fx.fire[0] > 0, 'Fire burns for 2.4% of your max hit a tick', R.fx.fire.join(' = '));
  check(R.fx.frost[0] === true && R.fx.frost[1] === 0.25 && R.fx.frostSlow[0] === R.fx.frostSlow[1], 'Frost chills, and a chilled monster attacks 25% slower', R.fx.frost[2] + 'ms -> ' + R.fx.frostSlow[0] + 'ms');
  const CK = R.fx.chillKills, PK = R.fx.pinKills, OWN = R.fx.own;
  check(CK.fresh.length === 6 && CK.fresh.every(x => x === OWN) && CK.slowed.every(x => x === Math.round(OWN * 1.25)),
    'kill a chilled monster and the next one attacks at its own speed: the chill does not pile up from kill to kill', 'six kills: ' + CK.fresh.join(' ') + ' ms fresh, ' + CK.slowed.join(' ') + ' chilled');
  check(PK.fresh.length === 6 && PK.fresh.every(x => x === OWN) && PK.slowed.every(x => x === Math.round(OWN * 1.15)),
    'and the same for an archer\'s Pinning Shot, which had done it since 0.9.123.13', 'six kills: ' + PK.fresh.join(' ') + ' ms fresh, ' + PK.slowed.join(' ') + ' pinned');
  check(R.fx.enrage[0] === true && R.fx.enrage[1] === 1500 && R.fx.enrage[2] === 1875 && R.fx.enrageAfter[0] === false && R.fx.enrageAfter[1] === 1500,
    'a slowed monster that enrages is 25% faster and still slowed, and stays enraged when the slow ends', '2000 ms: ' + R.fx.enrage[2] + ' ms enraged and chilled, ' + R.fx.enrageAfter[1] + ' ms once the chill is gone');
  check(R.fx.storm[0] === true && R.fx.storm[1] === false, 'Storm lands a cast that would have missed');
  check(R.fx.shadow[1] === R.fx.shadow[2] && R.fx.shadow[1] > 0, 'Shadow heals you for 3% of the damage you deal', `${R.fx.shadow[0]} dealt, ${R.fx.shadow[1]} healed`);

  /* 9c. robes */
  console.log('\n9c. ROBES  ·  built off the leather of the same tier');
  R.robes = J('SIM.robes()');
  console.log('   set          tier  Def  Atk  Magic Power  rune saving | leather Def / Atk | needs Defence');
  for (const t of R.robes.tiers) console.log(`   ${padr(t.set, 12)} ${pad(t.tier, 3)} ${pad(t.def, 5)} ${pad(t.atk, 4)} ${pad('+' + t.mpow, 9)} ${pad((t.save * 100).toFixed(1) + '%', 12)}   | ${pad(t.leatherDef, 7)} / ${padr(t.leatherAtk, 4)}    | ${t.req}`);
  check(R.robes.tiers.length === 7 && R.robes.bad.length === 0, 'seven cloths and 35 robe pieces, each 62% of its leather piece\'s Defence and half its Attack, each with a recipe and an icon', R.robes.bad.slice(0, 4).join(', ') || '35 pieces');
  check(R.robes.tiers.map(t => t.def).join() === '6,9,15,24,31,42,54' && R.robes.tiers.map(t => t.atk).join() === '6,6,8,8,12,14,17', 'the sets total what the design page prints', R.robes.tiers.map(t => t.def + '/' + t.atk).join(' '));
  check(R.robes.tiers.every(t => t.mpow === t.want) && R.robes.tiers.map(t => t.mpow).join() === '0,1,1,2,3,4,5', 'a set carries the Magic Power of its tier', R.robes.tiers.map(t => '+' + t.mpow).join(' '));
  check(R.robes.tiers.every(t => t.save === 0.075), 'and five pieces keep the runes of 7.5% of casts');
  check(R.robes.tiers.map(t => t.req).join() === '1,10,20,30,40,55,70', 'robes need Defence, on the ladder plate and leather climb');
  const RL = R.robes.rule;
  check(RL.cloth.mult === 1 && RL.naked.mult === 1 && RL.cloth.def === 0, 'cloth costs a spell nothing');
  check(RL.plateChest.def === RL.chestDef && RL.plateChest.mult === +(1 - 0.003 * RL.chestDef).toFixed(4), 'a piece that is not cloth costs 0.3% Magic damage for each point of its Defence', `a Starsteel Chest, ${RL.chestDef} Defence: x${RL.plateChest.mult}`);
  check(RL.leather.mult < 1 && RL.plate.mult < RL.leather.mult && RL.plate.hit < RL.leather.hit && RL.leather.hit < RL.cloth.hit, 'so leather hits softer than cloth and plate softer again', `max hit: cloth ${RL.cloth.hit}, leather ${RL.leather.hit}, plate ${RL.plate.hit}`);
  check(RL.raidPlate.mult === 0.6, 'to a limit of 40%', 'Dawnward plate: x' + RL.raidPlate.mult);
  check(RL.shield.mult === 1 && RL.cape.mult === 1, 'the shield and the cape are exempt');
  check(RL.stonewright.mult === 1 && R.robes.stonewright[1] === true && R.robes.stonewright[2] === true, 'and Stonewright Gauntlets count as cloth');
  check(R.robes.others.join() === '1,1', 'a sword and a bow pay nothing for plate');
  check(RL.cloth.save === 0.075 && RL.leather.save === 0 && RL.cloth.mpow === 5, 'worn, a Wyrmsilk set gives +5 Magic Power and keeps the runes of 7.5% of casts');
  check(R.robes.bucklers.join() === '1,1,1,2,2,2' && R.robes.lowBucklers.join() === '0,0,0,0', 'bucklers from Cobalt up carry Magic Power', R.robes.bucklers.join(' '));
  check(R.robes.stonewright[0] === 2, 'Stonewright Gauntlets carry +2');
  check(R.robes.capes.withStr > 0 && R.robes.capes.wrong.length === 0, 'and every cape with Strength carries the same Magic Power', R.robes.capes.withStr + ' of ' + R.robes.capes.n + ' capes');
  check(R.robes.strays.length === 0, 'nothing else in the game carries Magic Power', R.robes.strays.join(', '));
  check(R.robes.asc[0] === 2 && R.robes.asc[1] === Math.round(2 * 1.6) && R.robes.asc[2] === Math.round(R.robes.asc[3] * 1.6) && R.robes.asc[4] === 0.015, 'Ascension raises Magic Power on a piece with its other numbers', `+${R.robes.asc[0]} -> +${R.robes.asc[1]} at ten ranks`);
  const CD = R.robes.cards;
  check(CD.robe.some(c => /^Cloth · spells at full strength$/.test(c)) && !CD.robe.some(c => /Magic damage|Heavy armour|Light armour/.test(c)), 'a robe\'s card says it is cloth', CD.robe.join(' | '));
  check(/\+\d+ Atk/.test(R.robes.robeStats) && /\+\d+ Def/.test(R.robes.robeStats) && /\+1 Magic Power/.test(R.robes.robeStats) && /1\.5% of casts keep their runes/.test(R.robes.robeStats), 'with its Magic Power and what it saves', R.robes.robeStats);
  check(CD.leather.some(c => c === 'Light armour') && CD.leather.some(c => /^-\d+(\.\d)?% Magic damage$/.test(c)), 'leather\'s card says what it costs a spell', CD.leather.join(' | '));
  check(CD.plate.some(c => c === 'Heavy armour') && CD.plate.some(c => /% ranged accuracy$/.test(c)) && CD.plate.some(c => /^-\d+(\.\d)?% Magic damage$/.test(c)), 'and plate\'s, under the line a bow already gets', CD.plate.join(' | '));
  check(!CD.cape.some(c => /Magic damage/.test(c)) && CD.stonewright.some(c => /^Cloth/.test(c)) && !CD.stonewright.some(c => /Magic damage/.test(c)), 'a cape and Stonewright Gauntlets show no cost, because they have none');
  check(CD.staff.some(c => c === 'Two-handed') && CD.staff.some(c => c === '+44% damage') && CD.staff.some(c => c === '25% slower attacks') && CD.staff.some(c => c === 'Heavy'), 'a staff\'s card: two-handed, heavy, +44% damage, 25% slower', CD.staff.join(' | '));
  check(CD.wand.some(c => /^Light · \+\d/.test(c)) && CD.wand.some(c => c === '13% faster attacks') && !CD.wand.some(c => c === 'Two-handed'), 'a wand\'s card: light, with the light weapon\'s crit, and 13% faster', CD.wand.join(' | '));

  /* 9d. fights */
  if (!QUICK) {
    console.log('\n9d. FIGHTS  ·  40 simulated hours each on the real monster, dressed in crafted gear of the tier');
    const REF = { 20: 'goblin_shaman', 50: 'ogre_houndmaster', 75: 'wyvern', 99: 'dread_knight' };
    const TIER = { 20: 3, 50: 5, 75: 7, 99: 7 };
    const EL = C.elements;
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
        for (const e of EL) o.rows[fam + '_' + e.k] = fight(F[fam], M, C, { neutral: true, el: e.k, save: 0 });
        o.rows[fam + '_weak'] = fight(F[fam], M, C, { el: 'fire', forceWk: C.WEAK, save: 0 });
        o.rows[fam + '_resist'] = fight(F[fam], M, C, { el: 'fire', forceWk: C.RESIST, save: 0 });
      }
      /* the same staff at each smaller size, Fire on, to see what a real monster does to the trade */
      o.sizes = [{ size: F.staff.size, name: C.sizes[F.staff.size - 1].n, hit: F.staff.hit, dps: o.rows.staff_fire.dps, spentHr: o.rows.staff_fire.spentHr, killsHr: o.rows.staff_fire.killsHr }];
      for (let sz = F.staff.size - 1; sz >= 1; sz--) {
        const x = fight(F['staff_s' + sz], M, C, { neutral: true, el: 'fire', save: 0 });
        o.rows['staff_fire_s' + sz] = x;
        o.sizes.push({ size: sz, name: C.sizes[sz - 1].n, hit: F['staff_s' + sz].hit, dps: x.dps, spentHr: x.spentHr, killsHr: x.killsHr });
      }
      for (const z of o.sizes) { z.ofBig = pct(z.dps, o.sizes[0].dps); z.hitOfBig = pct(z.hit, o.sizes[0].hit); }
      o.stats = { melee: F.melee, bow: F.bow, wand: F.wand, staff: F.staff, wandBare: F.wandBare };
      R.fights.push(o);
      const m = o.rows.melee;
      console.log(`\n   Lv ${lv}  ${M.name} (${M.hp} hp, def ${M.def})   loop against the closed form: ${o.validate}%`);
      console.log('   ' + padr('', 22) + pad('dps', 7) + pad('% melee', 9) + pad('kills/hr', 10) + pad('xp/hr', 9) + pad('% melee', 9) + pad('dmg taken/hr', 14) + pad('healed/hr', 11) + pad('casts/hr', 10));
      const line = (label, x) => console.log('   ' + padr(label, 22) + pad(x.dps.toFixed(1), 7) + pad(pct(x.dps, m.dps) + '%', 9) + pad(Math.round(x.killsHr), 10) + pad(Math.round(x.xpHr / 1000) + 'k', 9) + pad(pct(x.xpHr, m.xpHr) + '%', 9) + pad(Math.round(x.takenHr).toLocaleString(), 14) + pad(Math.round(x.healHr).toLocaleString(), 11) + pad(Math.round(x.castsHr), 10));
      line('sword + shield', m); line('shortbow', o.rows.bow); line('crossbow + buckler', o.rows.xbowBuckler);
      line('staff, no element', o.rows.staff);
      for (const e of EL) line('  staff ' + e.n, o.rows['staff_' + e.k]);
      line('  staff Fire, weak', o.rows.staff_weak); line('  staff Fire, resisted', o.rows.staff_resist);
      line('wand, hand empty', o.rows.wandBare); line('wand + buckler', o.rows.wand);
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
    same('the 40-hour fights are the prototype\'s, to the digit: every fighter, every element, every size', R.fights, GOLD.fights);
    same('what each element is worth', R.riders, GOLD.riders);
    same('how a mage stands beside an archer on real monsters', R.real, GOLD.real);
    same('and the combat XP an hour', R.xp, GOLD.xp);
  }

  /* 10. the spell bar */
  console.log('\n10. THE SPELL BAR  ·  pressed, keyed and greyed, the way a player meets it');
  R.bar = J('SIM.bar()');
  const NEL = C.elements.length;
  check(R.bar.buttons === 4 + NEL && R.bar.sizeButtons.length === 4, 'the bar has the four sizes and every element, while a staff or a wand is held', R.bar.buttons + ' buttons: ' + R.bar.sizeButtons.concat(R.bar.elButtons.map(e => e[2])).join(', '));
  check(R.bar.sizeButtons.join('|') === 'Bolt1 rune|Blast2 runes|Wave3 runes|Surge4 runes', 'each size button says what it spends');
  check(R.bar.start === 'Fire Surge', 'left alone, a mage casts the biggest spell the rune powers', R.bar.start);
  check(R.bar.pressed[0] === 'Fire Blast' && R.bar.pressed[1] === 'blast', 'one press changes the spell', R.bar.pressed[0]);
  check(R.bar.pressed[2] === 'strength' && R.bar.keyboardClick[1] === 'strength', 'and never the style: the buttons on the bar are not style buttons', 'style still ' + R.bar.pressed[2]);
  check(R.bar.midFight[0] === 'Fire Surge' && R.bar.midFight[1] === true && R.bar.midFight[2] === true, 'it works while the fight runs, and the fight goes on at the new max hit', R.bar.midFight[3]);
  check(R.bar.repeat === 0, 'pressing the spell you are already casting says nothing');
  check(R.bar.keyboardClick[0] === 'Fire Bolt', 'Enter or Space on a focused button works too');
  check(R.bar.greyed[0] === true && /Starfall/.test(R.bar.greyed[1]) && /Surge needs Starfall Runes or better\./.test(R.bar.greyed[2]), 'a size the loaded rune cannot power is grey and says which rune it needs', R.bar.greyed[2]);
  check(R.bar.greyedPress[0] === 'Fire Wave' && R.bar.greyedPress[1] === true, 'and pressing it changes nothing');
  check(R.bar.empty.length === 4 && R.bar.empty.every(Boolean), 'with no runes loaded every size is grey');
  check(R.bar.k1 === 'Fire Bolt' && R.bar.k3 === 'Fire Wave' && R.bar.k4 === 'Fire Surge' && R.bar.k2 === 'Fire Blast', 'keys 1 to 4 pick the size', [R.bar.k1, R.bar.k2, R.bar.k3, R.bar.k4].join(', '));
  check(R.bar.typing === 'Fire Blast' && R.bar.closed === 'Fire Blast' && R.bar.otherTab === 'Fire Blast' && R.bar.sword === 'Fire Blast', 'but not while typing in a field, off the fight screen, on another combat tab, or holding a sword');
  check(R.bar.shift.join() === C.elements.map(e => e.k).join(), 'Shift with 1 to 4 picks the element', R.bar.shift.join(' '));
  check(R.bar.raid[0] === true && R.bar.raid[2] === R.bar.raid[1] && R.bar.raid[3] === 'Fire Bolt' && R.bar.raid[4] === true,
    'in a live raid 1, 2 and 3 stay Rally, Ruin and Brace, and the bar itself still works', R.bar.raid.slice(1, 4).join(' -> '));
  check(/^Fire Surge · 4,000 runes · about /.test(R.bar.chip[0]) && /safe/.test(R.bar.chip[1]), 'the line on the health bar names the spell, the runes left and how long they last', R.bar.chip[0]);
  check(R.bar.chipLow[1] === true && R.bar.chipLow[2] < 10 && /300 runes/.test(R.bar.chipLow[0]), 'it turns amber under ten minutes, and it is kept up to date between kills', R.bar.chipLow[0]);
  check(R.bar.chipBolt > R.bar.chipLow[2] * 3.9, 'and a smaller spell makes the same stack last longer', R.bar.chipLow[2] + ' min as Surge, ' + R.bar.chipBolt + ' min as Bolt');
  check(R.bar.sword2.join() === 'false,false,true,true', 'holding a sword: no bar, and the Ranged and Magic lines under Training');
  check(R.bar.bow[0] === false && /^500 shots · about /.test(R.bar.bow[1]) && R.bar.bow[2] === true && R.bar.bow[3] === false, 'holding a bow: the same line for arrows, and no bar', R.bar.bow[1]);
  check(R.bar.arrowRate.every(x => x[0] > 0 ? (x[1] === 0 && x[2] === 1) : (x[1] === 1 && x[2] === 1)), 'the arrow line counts recovery exactly as the fight rolls it', R.bar.arrowRate.map(x => (x[0] * 100).toFixed(0) + '%').join(' '));

  /* 11. gold */
  console.log('\n11. GOLD  ·  a rune is spent, not sold');
  R.gold = J('SIM.gold()');
  for (const b of R.gold.batches) console.log(`   ${padr(b.name, 9)} a batch sells for ${pad(b.batch, 5)}s, and ${pad(b.inputs, 4)}s of stone and fuel went into it (${b.each}s a rune)`);
  const others = Object.keys(R.gold.best).filter(k => k !== 'runecrafting').map(k => R.gold.best[k].gph);
  const median = others.slice().sort((a, b) => a - b)[Math.floor(others.length / 2)];
  console.log('   best gold an hour at 99 with the tree: ' + Object.keys(R.gold.best).map(k => k + ' ' + Math.round(R.gold.best[k].gph / 100).toLocaleString() + 'g').join(' · '));
  check(R.gold.batches.every(b => b.batch <= b.inputs * 3), 'no batch of runes sells for more than three times what went into it', R.gold.batches.map(b => (b.batch / b.inputs).toFixed(1) + 'x').join(' '));
  const dear = R.gold.acts.filter(a => a.sells > a.inputs * 3);
  check(R.gold.acts.length === 64 && dear.length === 0, 'and nothing else the skill makes does either: wands, staves, cloth, robes', dear.map(a => a.name).join(', ') || 'dearest against its inputs: ' + R.gold.acts.slice().sort((a, b) => b.sells / b.inputs - a.sells / a.inputs)[0].name);
  check(R.gold.best.runecrafting.gph <= Math.max(...others), 'Runecrafting is not the best gold in the game', R.gold.best.runecrafting.act + ', ' + Math.round(R.gold.best.runecrafting.gph / 100).toLocaleString() + 'g an hour against a median of ' + Math.round(median / 100).toLocaleString() + 'g');

  /* 12. the goal, end to end */
  console.log('\n12. THE GOAL  ·  a new character from the quarry to its first kill, and a level 99 one in a raid');
  const JN = J('SIM.journey()');
  if (JN.err) console.log('   ' + JN.err);
  for (const s of JN.steps.slice(0, 9)) console.log(`   ${padr(s.what, 20)} ${padr(s.skill, 13)} needs ${pad(s.needs, 2)}, pressed at ${pad(s.at, 2)}: ${s.started ? 'ran ' + s.done + ' time' + (s.done === 1 ? '' : 's') : 'the card is locked'}`);
  check(!JN.err && JN.start.magic === 1 && JN.start.rc === 1 && JN.start.items === 0 && JN.start.worn === 0, 'a new character starts at Magic 1 and Runecrafting 1, with nothing');
  check(JN.gather.every(Boolean) && JN.gatherAt.slice(0, 4).every(l => l === 1), 'it can quarry runestone, chop pine, burn it to ash and gather flax, all at level 1');
  check(JN.carve && JN.runes === 240, 'and carve Ash Runes at the bench, 40 to a batch', JN.runes + ' runes from 6 batches');
  check(JN.wand && JN.runesAfterWand === 200, 'bind a Pine Wand, which spends 40 of them');
  check(JN.linen && JN.hood, 'weave Linen, and sew a Linen Hood');
  check(JN.robeEarly[0] < 4 && JN.robeEarly[1] === false && JN.robe[0] === 4 && JN.robe[1] === true, 'the Linen Robe waits for Runecrafting 4: its card does nothing before then, and works at 4', 'pressed at ' + JN.robeEarly[0] + ', then at ' + JN.robe[0]);
  check(JN.made.join() === '1,1,1' && JN.worn.join() === 'pine_wand,ash_rune,linen_robe,linen_hood' && JN.refused.length === 0, 'the wand goes in the hand, the runes in the quiver and the robe on, and nothing is refused', JN.refused.join(' | '));
  const jb = k => JN.bar.filter(b => b[0] === k)[0] || [];
  check(JN.engaged && JN.bar.length === 4 + NEL && jb('bolt')[1] === false && jb('fire')[1] === false, 'the spell bar is there, with Bolt and Fire ready');
  check(['blast', 'wave', 'surge'].every(k => jb(k)[1] === true && / needs .* Runes or better\./.test(jb(k)[3])), 'the three bigger spells are grey and name the rune they wait for', ['blast', 'wave', 'surge'].map(k => jb(k)[3]).join(' '));
  check(C.elements.slice(1).every(e => jb(e.k)[1] === true && new RegExp('Magic ' + e.lvl).test(jb(e.k)[2])), 'Frost, Storm and Shadow are grey and say the Magic level they open at', C.elements.slice(1).map(e => jb(e.k)[2]).join(', '));
  check(JN.spell === 'Fire Bolt' && JN.fight.kills === 1 && JN.fight.alive && JN.fight.spent > 0 && JN.fight.spent <= JN.fight.casts && JN.fight.magicXp > 0 && /^Fire Bolt /.test(JN.said),
    'it presses Fire Bolt and kills a rat', `${JN.numbers.mon}, ${JN.numbers.foeHp} health: ${JN.fight.casts} casts, ${JN.fight.spent} runes, max hit ${JN.numbers.hit}`);
  const VT = J('SIM.veteran()');
  if (VT.err) console.log('   ' + VT.err);
  for (const [name, v] of [[VT.raidName, VT.raid], [VT.spireName, VT.spire]]) {
    if (!v) { check(false, 'a level 99 mage casts Storm Surge in ' + name); continue; }
    check(v.cl === 99 && v.worn === 7 && v.inRaid && v.buttons === 4 + NEL && v.spell === 'Storm Surge' && v.spent === 4 && v.dealt === v.want && v.said === `Storm Surge hits the ${v.foe} for ${v.dealt}.` && v.still && VT.refused.length === 0,
      'a level 99 mage in Wyrmsilk casts Storm Surge in ' + name + ': 4 runes, and the run goes on', v.said + (v.weak === 'storm' ? ' (weak to Storm)' : v.resist === 'storm' ? ' (resists Storm)' : ''));
  }

  /* 13. live */
  if (!QUICK) {
    console.log('\n13. LIVE  ·  the game\'s own tick() and combatTick() on a held clock, with the levels held still');
    const kk = x => (x / 1000).toFixed(1) + 'k';
    /* 13a. Runecrafting: what an hour at the bench really gives, against what its card says */
    console.log('\n   RUNECRAFTING  ·  one game hour through tick(), everything it needs on hand');
    console.log('   ' + padr('lv', 4) + padr('best XP on a card', 26) + pad('card xp/hr', 11) + pad('live', 9) + pad('', 8) + '   ' + padr('best rune', 22) + pad('card runes/hr', 14) + pad('live', 9) + pad('', 8) + pad('xp/hr', 9) + '   an hour of carving eats');
    const LS = [];
    for (const trees of [false, true]) {
      for (const lv of (trees ? [99] : [1, 20, 40, 60, 80, 99])) {
        const a = J(`SIM.livePick('runecrafting',${lv},${trees},'')`), ar = J(`SIM.livePick('runecrafting',${lv},${trees},'runes')`);
        const x = J(`SIM.liveSkill('runecrafting','${a}',${lv},${trees},1,${700 + lv})`), r = J(`SIM.liveSkill('runecrafting','${ar}',${lv},${trees},${trees ? 4 : 1},${800 + lv})`);
        const id = Object.keys(r.made || {})[0], made = r.made ? r.made[id] : 0;
        LS.push({ lv, trees, x, r, made, err: x.err || r.err });
        if (x.err || r.err) { console.log('   ' + (x.err || r.err)); continue; }
        console.log('   ' + padr(lv + (trees ? '*' : ''), 4) + padr(x.act, 26) + pad(kk(x.card.xph), 11) + pad(kk(x.xph), 9) + pad(pct(x.xph, x.card.xph) + '%', 8) + '   ' + padr(r.act, 22) + pad(Math.round(r.card.rph).toLocaleString(), 14) + pad(Math.round(made).toLocaleString(), 9) + pad(pct(made, r.card.rph) + '%', 8) + pad(kk(r.xph), 9)
          + '   ' + Object.keys(r.used).map(k => Math.round(r.used[k]).toLocaleString() + ' ' + k.replace(/_/g, ' ')).join(', '));
      }
    }
    console.log('   * with every tree full. A card\'s XP and its runes creep up a little as the hour goes (mastery), so live sits a touch over it.');
    const plain = LS.filter(s => !s.trees), full = LS.filter(s => s.trees);
    check(LS.every(s => !s.err) && plain.every(s => s.x.xph >= s.x.card.xph * 0.995 && s.x.xph <= s.x.card.xph * 1.02 && s.r.xph >= s.r.card.xph * 0.995 && s.r.xph <= s.r.card.xph * 1.02),
      'an hour of Runecrafting through tick() gives the XP its card says', plain.map(s => pct(s.x.xph, s.x.card.xph) + '%').join(' '));
    /* Since 0.9.127.8 a level of mastery is a 0.1% chance of one more, so the runes creep up
       through the hour the way the XP always has (about 16 levels of mastery in it). Same
       band as the XP check above: never under the card, never more than 2% over. */
    check(plain.every(s => s.made >= s.r.card.rph * 0.995 && s.made <= s.r.card.rph * 1.02), 'and the runes its card says', plain.map(s => pct(s.made, s.r.card.rph) + '%').join(' '));
    check(full.every(s => !s.err && Math.abs(s.made / s.r.card.rph - 1) < 0.03 && s.x.xph >= s.x.card.xph * 0.995 && s.x.xph <= s.x.card.xph * 1.03),
      'with every tree full the card still tells the truth: double batches and Close Cutting come out at what it promises', full.map(s => pct(s.made, s.r.card.rph) + '% of ' + Math.round(s.r.card.rph).toLocaleString() + ' runes an hour').join(' '));

    /* 13b. fights: the real combat tick against the model in 9d */
    const REF = { 20: 'goblin_shaman', 50: 'ogre_houndmaster', 75: 'wyvern', 99: 'dread_knight' }, TIER = { 20: 3, 50: 5, 75: 7, 99: 7 };
    const ROW = { melee: 'melee', bow: 'bow', xbowBuckler: 'xbowBuckler', staff: 'staff_fire', wandBare: 'wandBare_fire', wand: 'wand_fire' };
    const NAME = { melee: 'sword + shield', bow: 'shortbow', xbowBuckler: 'crossbow + buckler', staff: 'staff, Fire', wandBare: 'wand, Fire', wand: 'wand + buckler, Fire' };
    const HRS = 8, LF = [];
    console.log(`\n   FIGHTS  ·  ${HRS} game hours each through combatTick(), 100 ms a step as the game's own timer runs, on the monsters of 9d`);
    console.log('   The game restarts an attack from the tick it landed on, so every attack time is rounded up to the next 100 ms. "timer" is what that leaves.');
    for (const lv of [20, 50, 75, 99]) {
      const G = R.fights.find(f => f.lv === lv), L = {};
      console.log(`\n   Lv ${lv}  ${G.mon}`);
      console.log('   ' + padr('', 22) + pad('attack', 8) + pad('timer', 7) + pad('live dps', 10) + pad('model', 8) + pad('x timer', 9) + pad('live/that', 11) + pad('kills/hr', 10) + pad('casts/hr', 10) + pad('spent/hr', 10) + pad('xp/hr', 9));
      for (const key of Object.keys(ROW)) {
        const v = J(`SIM.liveFight('${key}',${lv},${TIER[lv]},'${REF[lv]}',${HRS},${9000 + lv},true)`), m = G.rows[ROW[key]];
        const timer = v.swing / (Math.ceil(v.swing / 100) * 100);
        v.model = m.dps; v.timer = timer; v.of = v.dps / (m.dps * timer); v.lv = lv; L[key] = v; LF.push(v);
        if (v.err || v.stopped) { console.log('   ' + padr(NAME[key], 22) + (v.err || v.stopped)); continue; }
        console.log('   ' + padr(NAME[key], 22) + pad((v.swing / 1000).toFixed(2) + 's', 8) + pad((timer * 100).toFixed(1) + '%', 7) + pad(v.dps.toFixed(1), 10) + pad(m.dps.toFixed(1), 8) + pad((m.dps * timer).toFixed(1), 9) + pad((v.of * 100).toFixed(1) + '%', 11)
          + pad(Math.round(v.killsHr), 10) + pad(Math.round(v.castsHr), 10) + pad(v.spentHr ? Math.round(v.spentHr).toLocaleString() : '', 10) + pad(Math.round(v.xpHr / 1000) + 'k', 9));
      }
      const live = (a, b) => pct(L[a].dps, L[b].dps), mod = (a, b) => pct(G.rows[ROW[a]].dps, G.rows[ROW[b]].dps);
      L.ratios = { staffBow: live('staff', 'bow'), wandBow: live('wandBare', 'bow'), wandXbow: live('wand', 'xbowBuckler'), staffMelee: live('staff', 'melee') };
      LF.push({ lv, ratios: L.ratios });
      console.log(`   live, and the model beside it:  staff ${L.ratios.staffBow}% of the bow (${mod('staff', 'bow')}%)  ·  wand ${L.ratios.wandBow}% of the bow (${mod('wandBare', 'bow')}%)  ·  wand + buckler ${L.ratios.wandXbow}% of the crossbow + buckler (${mod('wand', 'xbowBuckler')}%)`);
    }
    const rows = LF.filter(v => v.key), rat = LF.filter(v => v.ratios);
    check(rows.length === 24 && rows.every(v => !v.err && !v.stopped && v.engaged), 'all 24 fights ran their eight hours: nobody ran out of runes, and nothing stopped a fight');
    /* Eight hours is about ten thousand attacks, so one row carries a point or so of
       dice either way. Each row is held to 5%, which no change to the order of the
       dice can trip, and the average for each kind of weapon to 2%, which is the
       check that would catch a rule the tick applies and the model does not. */
    check(rows.every(v => Math.abs(v.of - 1) < 0.05), 'the real combat tick deals what the model says, once the 100 ms timer is counted: sword, bow, crossbow, staff and wand alike',
      'furthest: ' + rows.slice().sort((a, b) => Math.abs(b.of - 1) - Math.abs(a.of - 1)).slice(0, 3).map(v => NAME[v.key] + ' Lv ' + v.lv + ' ' + (v.of * 100).toFixed(1) + '%').join(', '));
    const avg = re => { const x = rows.filter(v => re.test(v.key)); return x.reduce((s, v) => s + v.of, 0) / x.length; };
    const AV = { sword: avg(/^melee/), bows: avg(/bow/i), magic: avg(/staff|wand/) };
    check(Object.keys(AV).every(k => Math.abs(AV[k] - 1) < 0.02), 'and on average to within 2% for each kind of weapon', 'sword ' + (AV.sword * 100).toFixed(1) + '%  ·  bow and crossbow ' + (AV.bows * 100).toFixed(1) + '%  ·  staff and wand ' + (AV.magic * 100).toFixed(1) + '%');
    const worst = Math.min(...rows.map(v => v.timer));
    console.log(`   The timer costs these 24 builds between ${((1 - Math.max(...rows.map(v => v.timer))) * 100).toFixed(1)}% and ${((1 - worst) * 100).toFixed(1)}% of their damage. It is in the tick every weapon shares, and it was there before Magic.`);
    check(rat.every(v => v.ratios.staffBow > 90 && v.ratios.staffBow < 110 && v.ratios.wandBow > 90 && v.ratios.wandBow < 110),
      'live, with the timer and the dice both in it, a staff and a wand in cloth are each within 10 points of a bow in leather at every level', rat.map(v => 'Lv ' + v.lv + ' ' + v.ratios.staffBow + '% / ' + v.ratios.wandBow + '%').join('  ·  '));
    /* 13c. the elements, on a monster with its real weakness left on */
    {
      const lv = 50, M = C.monsters.find(m => m.id === REF[lv]), E = {};
      console.log(`\n   ELEMENTS  ·  the Lv ${lv} staff on the ${M.name} as it really is (weak to ${M.weakEl || 'nothing'}, resists ${M.resistEl || 'nothing'}), 12 game hours an element`);
      for (const e of C.elements) {
        const v = J(`SIM.liveFight('staff',${lv},${TIER[lv]},'${REF[lv]}',12,${9500 + e.lvl},false,'${e.k}')`);
        E[e.k] = v;
        console.log('   ' + padr(e.n, 8) + pad(v.err || v.stopped || v.dps.toFixed(1), 8) + ' dps' + pad(Math.round(v.killsHr), 6) + ' kills/hr' + pad(Math.round(v.takenHr).toLocaleString(), 9) + ' damage taken/hr   ' + (M.weakEl === e.k ? 'weak' : M.resistEl === e.k ? 'resisted' : 'neither'));
      }
      /* Held to what the model in 9d says for this monster, not to a flat 15%: a
         bigger hit wastes more on a monster that is nearly dead, so the weakness is
         worth about 12% here and the resistance about 13%. */
      const G = R.fights.find(f => f.lv === lv).rows;
      const wantWeak = G.staff_weak.dps / G.staff_fire.dps, wantRes = G.staff_resist.dps / G.staff_frost.dps, wantFrost = G.staff_frost.takenHr / G.staff_storm.takenHr;
      const gotWeak = E[M.weakEl].dps / E.frost.dps, gotRes = E[M.resistEl].dps / E.frost.dps, gotFrost = E.frost.takenHr / E.storm.takenHr;
      check(C.elements.every(e => E[e.k].el === e.k && !E[e.k].err && !E[e.k].stopped), 'each element was really the one cast');
      check(M.weakEl === 'shadow' && M.resistEl === 'fire' && Math.abs(gotWeak - wantWeak) < 0.06, 'over twelve hours the weak element is worth what the model says it is on this monster',
        'Shadow does ' + ((gotWeak - 1) * 100).toFixed(1) + '% more than Frost, the model says ' + ((wantWeak - 1) * 100).toFixed(1) + '%');
      check(Math.abs(gotRes - wantRes) < 0.06, 'and so is the resisted one', 'Fire does ' + ((1 - gotRes) * 100).toFixed(1) + '% less, burn included, the model says ' + ((1 - wantRes) * 100).toFixed(1) + '%');
      check(gotFrost < 0.99 && Math.abs(gotFrost - wantFrost) < 0.05, 'Frost makes the monster hit you less, by what the model says and no more',
        ((1 - gotFrost) * 100).toFixed(1) + '% less damage taken than with Storm, the model says ' + ((1 - wantFrost) * 100).toFixed(1) + '%');
    }
    /* 13d. raids and the Spire, end to end */
    {
      const RD = J('SIM.raids()'), WHO = [['melee', 'sword + shield', '', ''], ['bow', 'shortbow', 'starfall_arrow', ''], ['staff', 'staff, Storm Surge', 'starfall_rune', 'storm'], ['wand', 'wand + buckler, Shadow Surge', 'starfall_rune', 'shadow']];
      console.log('\n   RAIDS AND THE SPIRE  ·  Lv 99 in crafted gear with the best ammunition it takes, every stage through combatTick(), health topped up');
      console.log('   ' + padr('', 30) + RD.map(r => pad(r.endless ? 'Spire, 20 min' : r.name.replace(/^The /, ''), 17)).join('') + pad('four raids', 12));
      const T = {};
      for (const [key, label, ammo, el] of WHO) {
        T[key] = { runs: [], total: 0, floor: 0, ok: true };
        let line = '   ' + padr(label, 30);
        for (const r of RD) {
          const v = J(`SIM.liveRaid('${key}',99,7,'${r.id}',4242,${r.endless ? 20 : 240},'${ammo}','${el}')`);
          T[key].runs.push(v);
          if (v.err || !v.started) { T[key].ok = false; line += pad('FAILED', 17); if (v.err) console.log('   ' + v.err); continue; }
          if (r.endless) { T[key].floor = v.floor; line += pad('floor ' + v.floor, 17); }
          else { if (!v.cleared || v.stages.length !== r.stages - 1) T[key].ok = false; T[key].total += v.seconds; line += pad(v.cleared ? v.seconds + 's' : 'stuck at ' + (v.stages.length + 1), 17); }
        }
        console.log(line + pad(T[key].total + 's', 12));
      }
      check(Object.keys(T).every(k => T[k].ok), 'a staff, a wand, a bow and a sword each clear all four raids stage by stage through the real tick, and start the Spire');
      check(T.staff.total > T.bow.total * 0.6 && T.staff.total < T.bow.total * 1.6 && T.wand.total > T.bow.total * 0.6 && T.wand.total < T.bow.total * 1.6,
        'a mage takes about as long over the four raids as an archer in the same tier of gear', 'staff ' + pct(T.staff.total, T.bow.total) + '% of the bow\'s time, wand ' + pct(T.wand.total, T.bow.total) + '%, sword ' + pct(T.melee.total, T.bow.total) + '%');
      check(Math.abs(T.staff.floor - T.bow.floor) <= 5 && Math.abs(T.wand.floor - T.bow.floor) <= 5 && T.staff.floor >= 10,
        'and climbs the Spire about as fast: within five floors of the bow in twenty minutes', 'sword ' + T.melee.floor + ', bow ' + T.bow.floor + ', staff ' + T.staff.floor + ', wand ' + T.wand.floor);
      const sp = T.staff.runs.filter(v => v.spent).map(v => v.spent);
      check(T.staff.runs.every(v => v.spell === 'Storm Surge') && sp.length === RD.length, 'the staff cast Storm Surge the whole way, and spent runes in every one', sp.join(' / ') + ' runes');
    }
    const mg = rows.filter(v => /staff|wand/.test(v.key));
    check(mg.every(v => v.spentHr > 0 && v.spentHr <= v.castsHr * (/Blast/.test(v.spell) ? 2 : /Wave/.test(v.spell) ? 3 : /Surge/.test(v.spell) ? 4 : 1)),
      'a mage never spends more runes than its casts times the size of the spell, and robes keep some back', mg.filter(v => v.lv === 99).map(v => NAME[v.key] + ' ' + v.spell + ': ' + Math.round(v.spentHr).toLocaleString() + ' runes for ' + Math.round(v.castsHr).toLocaleString() + ' casts').join('  ·  '));
  }

  console.log(`\n${fails ? fails + ' CHECK' + (fails > 1 ? 'S' : '') + ' FAILED' : 'PASS'}: ${fails ? fails + ' of ' : 'all '}${checks} Magic checks\n`);
  process.exit(fails ? 1 : 0);
}, 2800);

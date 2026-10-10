/* Magic: the balance harness.
 *
 *     node _magesim.js           every table and every check
 *     node _magesim.js --quick   skip the simulated fights
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
  var has = function (fn) { return typeof window[fn] === 'function'; };

  var METAL = ['bronze', 'iron', 'steel', 'mithril', 'cobalt', 'runite', 'starsteel', 'starfall'];
  var WOOD = ['pine', 'oak', 'ironbark', 'ember', 'frost', 'shadow', 'ancient'];
  var HIDE = ['rough', 'chitin', 'wolf', 'ogre', 'troll', 'drake', 'demon'];
  var CLOTHK = (typeof CLOTH_TIERS !== 'undefined') ? CLOTH_TIERS.map(function (c) { return c.key; }) : [];
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
      armourMult: +((usingMagic() ? (has('magicArmourMult') ? magicArmourMult() : 1) : usingRanged() ? rangedArmourMult() : 1)).toFixed(4),
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
      /* a miss stays a miss: 0 damage, and no element effect, against a monster weak to Fire */
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
    return { best: out, batches: batches };
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
    reagents: reagents, structure: structure, nodes: nodes, spells: spells, spellSizes: spellSizes, castRates: castRates, casting: casting, bar: bar, gold: gold };
}

setTimeout(() => {
  const w = dom.window;
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
    'it has its tree prefix, its place on the rail, its colour, and a cape the shop sells', JSON.stringify(R.structure.acts));

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
  check(sv.locked.every(x => x[1] === 'fire' && x[2] === x[0]), 'an element is kept only once the Magic level opens it', sv.locked.map(x => x[0]).join(' ') || 'Fire is the only element so far');
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

  /* 4. dressed: needs robes */
  if (C.robes) {
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

  /* 7. skilling xp: needs the whole act list, robes included, to be the prototype's */
  if (C.robes) {
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
  check(R.gold.best.runecrafting.gph <= Math.max(...others), 'Runecrafting is not the best gold in the game', R.gold.best.runecrafting.act + ', ' + Math.round(R.gold.best.runecrafting.gph / 100).toLocaleString() + 'g an hour against a median of ' + Math.round(median / 100).toLocaleString() + 'g');

  console.log(`\n${fails ? fails + ' CHECK' + (fails > 1 ? 'S' : '') + ' FAILED' : 'PASS'}: ${fails ? fails + ' of ' : 'all '}${checks} Magic checks\n`);
  process.exit(fails ? 1 : 0);
}, 2800);

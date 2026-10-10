/* Magic balance: the half of sim.js that runs INSIDE the game page.
 *
 * Everything here calls the game's own functions. The character builder is
 * _rangedstr.js's, extended with a third branch, so a mage is assembled exactly
 * the way that harness assembles its archer: same enchant picker, same sockets,
 * same Ascension, same Mastery spend through the real allocate path.
 */
(function () {
  'use strict';
  var MD = window.MAGE_DESIGN;
  var clamp = function (x) { return Math.max(0.03, Math.min(0.97, x)); };
  var BIGGEST = MD.SPELLS[MD.SPELLS.length - 1].k;
  var foeDefFor = function (lv) { return Math.round(12 + lv * 3.2); };   // _rangedsim.js's level-scaled defence

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
  /* What Fire adds on a long fight: burn uptime x tick size, the same closed form
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

  var METAL = ['bronze', 'iron', 'steel', 'mithril', 'cobalt', 'runite', 'starsteel', 'starfall'];
  var WOOD = ['pine', 'oak', 'ironbark', 'ember', 'frost', 'shadow', 'ancient'];
  var HIDE = ['rough', 'chitin', 'wolf', 'ogre', 'troll', 'drake', 'demon'];
  var CLOTHK = MD.CLOTH.filter(function (c) { return !c.raid; }).map(function (c) { return c.k; });
  var RUNE = MD.RUNES.map(function (r) { return r.k + '_rune'; });

  /* ── 1. weapon maths at equal investment ─────────────────────────────────── */
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
        o.fire = o.dps + burnDps(def, MD.ELEMENTS[0].rider.burn, 0);
        o.castsHr = 3600000 / o.s.swing;
      });
      r.bow.shotsHr = 3600000 / r.bow.s.swing;
      rows.push(r);
    });
    return rows;
  }

  /* ── 2. dressed, crafted, no enchants ────────────────────────────────────── */
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
  var PL = ['helm', 'chest', 'legs', 'gloves', 'boots'], RB = MD.ROBE.PIECE;
  function dressed(levels, tiers) {
    return levels.map(function (lv, ix) {
      var t = tiers[ix], def = foeDefFor(lv), metal = METAL[t - 1], wood = WOOD[t - 1], hide = HIDE[t - 1], cloth = CLOTHK[t - 1], rune = RUNE[t - 1];
      var cape = { cape: metal + '_cape' };
      var r = { lv: lv, tier: t, foeDef: def };
      /* fullDps, not rawDps: armour is the question here and what leather gives is
         mostly crit, so the dressed table counts crit for everyone, the way the
         mid-game table in _rangedstr.js does. */
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
      /* both hands full, the like-for-like for a wand: a buckler in the other one */
      one('meleeBuckler', { weapon: metal + '_sword', armour: set5(metal, PL, { cape: metal + '_cape', shield: metal + '_buckler' }) });
      one('xbowBuckler', { weapon: metal + '_crossbow', quiver: metal + '_bolt', armour: set5(hide, PL, { cape: metal + '_cape', shield: metal + '_buckler' }) });
      one('wandShield', { weapon: wood + '_wand', quiver: rune, armour: set5(cloth, RB, { cape: metal + '_cape', shield: metal + '_shield' }) });
      return r;
    });
  }

  /* Every crafted tier, from the level it can be wielded to just past the next
     one, so the four rows the band is tested on are not the only rows looked at. */
  function ladder() {
    var REQ = COMBAT_GEAR_REQ, out = [];
    for (var t = 1; t <= 7; t++) {
      var lo = REQ[t], hi = t < 7 ? REQ[t + 1] + 5 : 99;
      var metal = METAL[t - 1], wood = WOOD[t - 1], rune = RUNE[t - 1];
      for (var L = lo; L <= hi; L += (L < hi && L + 5 > hi) ? (hi - L) : 5) {
        var def = foeDefFor(L), r = { tier: t, lv: L };
        var go = function (key, set) { clear(); set(); r[key] = rawDps(def); if (usingMagic()) r[key + 'Fire'] = r[key] + burnDps(def, MD.ELEMENTS[0].rider.burn, 0); };
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

  /* ── 3. best in slot, everything on (the _rangedstr.js builder) ───────────── */
  var NEWSTATS = false;
  var HAS_RS = !!ENCH_STAT.rangedStr;
  function colNodes(tree) { return CMAST_NODES.filter(function (n) { return n.tree === tree; }); }
  function spend(trees) {
    state.cmast = {}; state.cmastGranted = 400; state.cmastShards = 0;
    var want = {}; trees.forEach(function (t) { colNodes(t).forEach(function (n) { want[n.id] = n.max; }); });
    var moved = true;
    while (moved) { moved = false;
      for (var id in want) { while (cmastRank(id) < want[id] && cmastCanAllocate(id)) { cmastAllocate(id); moved = true; } } }
    var got = {}; for (var k in state.cmast) if (state.cmast[k] > 0) got[k] = state.cmast[k];
    return got;
  }
  function maxTree(skill) { var t = {}; (TREES[skill] || []).forEach(function (n) { t[n.id] = n.max; }); return t; }
  function prio(kind) {
    var dmg = kind === 'magic' ? 'magicDmg' : (kind === 'ranged' && HAS_RS) ? 'rangedStr' : 'atkBoost';
    var p = NEWSTATS ? [dmg, 'critDmg', 'accBoost', 'critChance'] : [dmg, 'critChance'];
    ['atkBoost', 'lifesteal', 'hpBoost', 'defBoost', 'goldFind', 'rangedStr', 'magicDmg'].forEach(function (k) { if (p.indexOf(k) < 0) p.push(k); });
    /* a mage never wants Attack or Ranged damage, an archer never wants Magic damage */
    if (kind === 'magic') p = p.filter(function (k) { return k !== 'atkBoost' && k !== 'rangedStr'; }).concat(['atkBoost', 'rangedStr']);
    else p = p.filter(function (k) { return k !== 'magicDmg'; }).concat(['magicDmg']);
    return p;
  }
  function pickKeys(keys, n, kind, used) {
    var out = [], p = prio(kind);
    for (var i = 0; i < p.length && out.length < n; i++) if (keys.indexOf(p[i]) >= 0 && (used || []).indexOf(p[i]) < 0) out.push(p[i]);
    for (var j = 0; j < keys.length && out.length < n; j++) if (out.indexOf(keys[j]) < 0 && (used || []).indexOf(keys[j]) < 0) out.push(keys[j]);
    return out;
  }
  function build(o) {
    state = defaultState(); normalizeState();
    var L = o.lvl || 99;
    state.combatXp = { attack: XP_CUM[L], strength: XP_CUM[L], defence: XP_CUM[L], hitpoints: XP_CUM[99], ranged: XP_CUM[L], magic: XP_CUM[L] };
    state.items = {}; state.tree = {}; state.cmast = {}; state.charClass = o.cls || null;
    state.variants = {}; state.sockets = {}; state.asc = {}; state.effects = [];
    state.combatElement = o.el || 'fire'; state.combatStyle = 'attack';
    state.combatSpell = o.spell || BIGGEST;
    var ce = {}, kind = 'melee';
    if (o.weapon) { ce.weapon = o.weapon; var wi = ITEMS[o.weapon] || {}; kind = wi.magic ? 'magic' : wi.ranged ? 'ranged' : 'melee'; }
    if (o.quiver) { ce.quiver = o.quiver; state.items[o.quiver] = 1e6; }
    for (var s in (o.armour || {})) ce[s] = o.armour[s];
    if (o.jewelry) { ce.ring_l = 'void_ring'; ce.ring_r = 'void_ring'; ce.amulet = 'void_jewel'; }
    for (var s2 in ce) { if (s2 === 'quiver') continue; state.items[ce[s2]] = (state.items[ce[s2]] || 0) + 1; }
    state.combatEquipped = ce;
    if (o.enchQ != null) {
      Object.keys(ce).filter(function (s) { return s !== 'quiver'; }).forEach(function (s) {
        var id = ce[s]; if (!isEnchantable(id)) return;
        var vid = splitToVariant(id, { worn: { map: ce, slot: s } }); if (!vid) return;
        var P = enchPoolFor(vid), lines = [];
        if (P) pickKeys(P.keys, ENCH_LINES, kind).forEach(function (k) { lines.push({ k: k, v: enchValueAt(k, vid, o.enchQ, 1), q: o.enchQ, lock: false }); });
        if (isUniqueGear(vid)) {
          var uk = pickKeys(enchUniquePoolFor(vid), 1, kind, lines.map(function (l) { return l.k; }))[0];
          if (uk) lines.push({ k: uk, v: enchValueAt(uk, vid, o.enchQ, ENCH_UNIQUE_MULT), q: o.enchQ, lock: false, u: true });
        }
        state.variants[vid].lines = lines; registerVariant(vid);
        ce[s] = vid;
      });
    }
    if (o.sockets) {
      var gem = o.gem || (kind === 'magic' ? 'wyrd_flaw' : kind === 'ranged' ? 'hawkseye_flaw' : 'sanguine_flaw');
      for (var s3 in ce) { var id3 = ce[s3], n = maxSocketsFor(variantBase(id3)); if (n > 0) state.sockets[id3] = { slots: n, gems: Array(n).fill(gem) }; }
    }
    if (o.asc) { for (var s4 in ce) { var id4 = ce[s4], c = ascCap(variantBase(id4)); if (c > 0) state.asc[id4] = c; } }
    if (o.cmast) spend(o.cmast); else state.cmast = {};
    if (o.fletch) state.tree.fletching = maxTree('fletching');
    if (o.rune) { state.tree.runecrafting = maxTree('runecrafting'); state.xp.runecrafting = XP_CUM[99]; state.gear = (state.gear || []).concat(['cape_runecrafting']); }
    if (o.potion) { state.effects = [Object.assign({ id: o.potion, expires: Date.now() + 3.6e6 }, ITEMS[o.potion].potion)]; }
    combat.active = false; combat.raid = null;
    refreshCombatStats();
    return kind;
  }
  /* _rangedstr.js's dps(), with the third weapon gate. `el` adds the element's own
     effect where it is a damage effect (Fire burns, Storm cannot miss); `weak` is
     the 15% for hitting a weakness. Left out, a mage is measured the way that
     harness measures everyone: weapon effects that are not a second hit are not
     counted for anybody. */
  function fullDps(def, opt) {
    opt = opt || {};
    var acc = playerAccuracy(), hit = playerMaxHit(), swing = playerSwingMs();
    var rng = usingRanged(), mag = usingMagic();
    var cm = cmastBonuses(), cb = combatBonusesAll();
    var pen = (rng && cm.armourPen > 0) ? (1 - cm.armourPen) : (mag && cm.spellPen > 0) ? (1 - cm.spellPen) : 1;
    var p = clamp(acc / (acc + def * pen));
    var w = ITEMS[eqCombatWeapon()] || {};
    var pierce = (w.wfx && w.wfx.pierce) ? w.wfx.pierce.chance : 0;
    var wind = rng ? treeRank('fletching', 'fl_wind') * FL_WIND_RANK : mag ? treeRank('runecrafting', 'rn_sure') * MD.RN_RANK.sure : 0;
    var storm = (mag && opt.el === 'storm') ? MD.ELEMENTS[2].rider.pierce : 0;
    var sure = 1 - (1 - pierce) * (1 - wind) * (1 - storm);
    p = sure * 0.97 + (1 - sure) * p;
    var avg = hit * (COMBAT_P.HIT_MIN + 1) / 2;
    var crit = Math.min(1, cb.critChance || 0), critMul = 1 + crit * (1 + ((cb.critDmg != null ? cb.critDmg : cm.critDmg) || 0));
    var m = 0, n = 0; for (var f = 0.95; f > 0.02; f -= 0.05) { m += cmastDamageMult({}, f, 1); n++; }
    var extra = 1;
    if (w.wfx && w.wfx.cleave) extra += w.wfx.cleave.chance;
    else if (state.cmast['m_t5_m'] > 0) extra += 0.08;
    else if (rng && cm.volley > 0) extra += cm.volley;
    else if (mag && cm.echo > 0) extra += cm.echo;
    var base = (p * avg) / (swing / 1000);
    var bb = rng ? treeRank('fletching', 'fl_barb') * FL_BARB_RANK : 0, dot = 0;
    if (bb > 0) { var rate = (p / (swing / 1000)) * bb; var up = 1 - Math.exp(-rate * POISON_DUR_MS / 1000); dot = up * hit * POISON_TICK_MULT / (POISON_TICK_MS / 1000); }
    if (mag && opt.el === 'fire') {
      var ch = Math.min(1, BURN_CHANCE + treeRank('runecrafting', 'rn_brand') * MD.RN_RANK.brand);
      if (cm.attune) ch = 1 - (1 - ch) * (1 - crit);
      var r2 = (p / (swing / 1000)) * ch, up2 = 1 - Math.exp(-r2 * BURN_DUR_MS / 1000);
      dot += up2 * hit * MD.ELEMENTS[0].rider.burn / (BURN_TICK_MS / 1000);
    }
    return (base * (m / n) * critMul * extra) * (opt.weak ? MD.WEAK_MULT : opt.resist ? MD.RESIST_MULT : 1) + dot;
  }
  function row(label, o, defs, opt) {
    var kind = build(o);
    var s = snap(), out = { label: label, kind: kind, s: s, dps: {}, got: Object.keys(state.cmast).length };
    (defs || [500, 1000, 2000]).forEach(function (d) { out.dps[d] = +fullDps(d, opt).toFixed(1); });
    return out;
  }
  function best() {
    var SUN = { helmet: 'sunweave_helm', chest: 'sunweave_chest', legs: 'sunweave_legs', boots: 'sunweave_boots', gloves: 'stonewright_gauntlets', cape: 'dawnmantle' };
    var DAWN = { helmet: 'dawnward_helm', chest: 'dawnward_chest', legs: 'dawnward_legs', boots: 'dawnward_boots', gloves: 'stonewright_gauntlets', cape: 'dawnmantle' };
    var VEIL = { helmet: 'dawnveil_hood', chest: 'dawnveil_robe', legs: 'dawnveil_leggings', boots: 'dawnveil_slippers', gloves: 'stonewright_gauntlets', cape: 'dawnmantle' };
    function withShield(a, sh) { var o = {}; for (var k in a) o[k] = a[k]; o.shield = sh; return o; }
    var RC = ['mark', 'ranged', 'magic', 'mr', 'kb', 'rm'], MC = ['melee', 'ranged', 'magic', 'mr', 'kb', 'rm'], SC = ['sorc', 'ranged', 'magic', 'gs', 'rm'];
    var FULL = { jewelry: true, enchQ: 0.4, sockets: true, asc: true };
    function F(extra) { var o = {}; for (var k in FULL) o[k] = FULL[k]; for (var k2 in extra) o[k2] = extra[k2]; return o; }
    var rows = [];
    var SWORD = { weapon: 'sunderedge', armour: withShield(DAWN, 'faultward') };
    var TWOH = { weapon: 'dawnreaper', armour: DAWN };
    var BOW = { weapon: 'plummet', quiver: 'sundershaft', armour: SUN };
    var SUNP = { weapon: 'sunpiercer', quiver: 'sundershaft', armour: SUN };
    var XBOW = { weapon: 'starfall_crossbow', quiver: 'sunderbolt', armour: withShield(SUN, 'faultward') };
    var STAFF = { weapon: 'faultline', quiver: 'sunder_rune', armour: VEIL };
    var DAWNC = { weapon: 'dawncaller', quiver: 'sunder_rune', armour: VEIL };
    var WAND = { weapon: 'starcall_wand', quiver: 'sunder_rune', armour: withShield(VEIL, 'dawnsteel_buckler') };
    function mk(base, extra) { var o = {}; for (var k in base) o[k] = base[k]; for (var k2 in extra) o[k2] = extra[k2]; return o; }
    rows.push(row('bare: Sunderedge + Faultward', SWORD));
    rows.push(row('bare: Dawnreaper (2H)', TWOH));
    rows.push(row('bare: Plummet + Sundershaft', BOW));
    rows.push(row('bare: Sunpiercer + Sundershaft', SUNP));
    rows.push(row('bare: Starfall xbow + Sunderbolt + Faultward', XBOW));
    rows.push(row('bare: Faultline + Sunder Rune', STAFF));
    rows.push(row('bare: Dawncaller + Sunder Rune', DAWNC));
    rows.push(row('bare: Starcall Wand + buckler', WAND));
    rows.push(row('FULL: Sunderedge + Faultward', F(mk(SWORD, { cmast: MC }))));
    rows.push(row('FULL: Dawnreaper (2H)', F(mk(TWOH, { cmast: MC }))));
    rows.push(row('FULL: Plummet + Sundershaft', F(mk(BOW, { cmast: RC, fletch: true }))));
    rows.push(row('FULL: Sunpiercer + Sundershaft', F(mk(SUNP, { cmast: RC, fletch: true }))));
    rows.push(row('FULL: Starfall xbow + Faultward', F(mk(XBOW, { cmast: RC, fletch: true }))));
    rows.push(row('FULL: Faultline + Sunder Rune', F(mk(STAFF, { cmast: SC, rune: true }))));
    rows.push(row('FULL: Dawncaller + Sunder Rune', F(mk(DAWNC, { cmast: SC, rune: true }))));
    rows.push(row('FULL: Starcall Wand + buckler', F(mk(WAND, { cmast: SC, rune: true }))));
    rows.push(row('  + Fire burning: Faultline', F(mk(STAFF, { cmast: SC, rune: true })), null, { el: 'fire' }));
    rows.push(row('  + Storm: Faultline', F(mk(STAFF, { cmast: SC, rune: true, el: 'storm' })), null, { el: 'storm' }));
    rows.push(row('  + a weakness hit: Faultline', F(mk(STAFF, { cmast: SC, rune: true })), null, { el: 'fire', weak: true }));
    rows.push(row('  + a resisted element: Faultline', F(mk(STAFF, { cmast: SC, rune: true })), null, { resist: true }));
    /* the same mage casting a smaller spell with the same Sunder Runes, Fire burning */
    ['wave', 'blast', 'bolt'].forEach(function (k) { rows.push(row('size ' + k + ': Faultline', F(mk(STAFF, { cmast: SC, rune: true, spell: k })), null, { el: 'fire' })); });
    rows.push(row('no gems: Plummet + Sundershaft', F(mk(BOW, { cmast: RC, fletch: true, sockets: false }))));
    rows.push(row('no gems: Faultline + Sunder Rune', F(mk(STAFF, { cmast: SC, rune: true, sockets: false }))));
    rows.push(row('no board: Plummet + Sundershaft', F(mk(BOW, { fletch: true }))));
    rows.push(row('no board: Faultline + Sunder Rune', F(mk(STAFF, { rune: true }))));
    rows.push(row('rogue: Plummet + Sundershaft', F(mk(BOW, { cmast: RC, fletch: true, cls: 'rogue' }))));
    rows.push(row('rogue: Starcall Wand + buckler', F(mk(WAND, { cmast: SC, rune: true, cls: 'rogue' }))));
    rows.push(row('berserker: Faultline + Sunder Rune', F(mk(STAFF, { cmast: SC, rune: true, cls: 'berserker' }))));
    rows.push(row('berserker: Starfall xbow + Faultward', F(mk(XBOW, { cmast: RC, fletch: true, cls: 'berserker' }))));
    rows.push(row('brew: Plummet + Sundershaft', F(mk(BOW, { cmast: RC, fletch: true, potion: 'warriors_brew' }))));
    rows.push(row('brew: Faultline + Sunder Rune', F(mk(STAFF, { cmast: SC, rune: true, potion: 'warriors_brew' }))));
    rows.push(row('90% rolls: Plummet + Sundershaft', F(mk(BOW, { cmast: RC, fletch: true, enchQ: 0.9 }))));
    rows.push(row('90% rolls: Faultline + Sunder Rune', F(mk(STAFF, { cmast: SC, rune: true, enchQ: 0.9 }))));
    NEWSTATS = true;
    rows.push(row('new stats: Sunderedge + Faultward', F(mk(SWORD, { cmast: MC }))));
    rows.push(row('new stats: Plummet + Sundershaft', F(mk(BOW, { cmast: RC, fletch: true }))));
    rows.push(row('new stats: Faultline + Sunder Rune', F(mk(STAFF, { cmast: SC, rune: true }))));
    NEWSTATS = false;
    return rows;
  }

  /* ── 4. the Spire wall, _wall.js's definition ────────────────────────────── */
  function wall(eq, asc, extra) {
    state = defaultState(); normalizeState();
    state.combatXp = {}; ['attack', 'strength', 'defence', 'hitpoints', 'ranged', 'magic'].forEach(function (k) { state.combatXp[k] = XP_CUM[99]; });
    state.items = { sundershaft: 1e6, sunder_rune: 1e6, sunderbolt: 1e6 };
    state.combatEquipped = eq; state.asc = {};
    if (extra && extra.el) state.combatElement = extra.el;
    if (asc) for (var id of Object.values(state.combatEquipped)) if (id && ascCap(id) > 0) state.asc[id] = ascCap(id);
    refreshCombatStats();
    var acc = playerAccuracy(), hit = playerMaxHit(), def = playerDefence(), sw = playerSwingMs(), hp = maxHpFromStats(), dr = ascensionDR();
    var dps = (hit * 0.65) * (1000 / sw);
    var lethal = 0, slow = 0, samples = {};
    /* Frost on, as an option: a chilled monster attacks 15% slower while the chill
       is up. Uptime from the same closed form as burn. */
    var chill = 1;
    if (extra && extra.frost) {
      var c = MD.ELEMENTS[1].rider.chill;
      var pHit = 0.5, rate = (pHit / (sw / 1000)) * c.chance, up = 1 - Math.exp(-rate * c.ms / 1000);
      chill = 1 / (1 + c.slow * up);
    }
    for (var f = 1; f <= 250; f++) {
      var m = spireFloor(f, true);
      var hc = clamp(acc / (acc + m.def));
      var secs = m.hp / (dps * hc);
      var fh = clamp(m.atk / (m.atk + def));
      var fdps = (m.str * 0.65) * fh * (1000 / (m.swingMs || 2400)) * (1 - dr) * chill;
      if (!slow && secs > 240) slow = f;
      if (!lethal && fdps * 8 > hp * 2.2) lethal = f;
      if (f === 25 || f === 30 || f === 40) samples[f] = { secs: Math.round(secs), fdps: Math.round(fdps) };
      if (lethal && slow) break;
    }
    return { acc: acc, hit: hit, def: def, sw: sw, hp: hp, dr: dr, lethal: lethal || 999, slow: slow || 999, samples: samples };
  }
  function walls() {
    var CAPE = { cape: 'dawnmantle' }, GL = { gloves: 'stonewright_gauntlets' };
    function eq() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
    var PLATE = { helmet: 'dawnward_helm', chest: 'dawnward_chest', legs: 'dawnward_legs', boots: 'dawnward_boots' };
    var LTHR = { helmet: 'sunweave_helm', chest: 'sunweave_chest', legs: 'sunweave_legs', boots: 'sunweave_boots' };
    var VEIL = { helmet: 'dawnveil_hood', chest: 'dawnveil_robe', legs: 'dawnveil_leggings', boots: 'dawnveil_slippers' };
    var B = [
      ['sword + shield', eq({ weapon: 'sunderedge', shield: 'faultward' }, PLATE, GL, CAPE)],
      ['two-handed', eq({ weapon: 'dawnreaper' }, PLATE, GL, CAPE)],
      ['bow (Sunweave)', eq({ weapon: 'plummet', quiver: 'sundershaft' }, LTHR, GL, CAPE)],
      ['staff (Dawnveil)', eq({ weapon: 'faultline', quiver: 'sunder_rune' }, VEIL, GL, CAPE)],
      ['wand + buckler (Dawnveil)', eq({ weapon: 'starcall_wand', quiver: 'sunder_rune', shield: 'dawnsteel_buckler' }, VEIL, GL, CAPE)]
    ];
    var out = [];
    B.forEach(function (b) {
      [false, true].forEach(function (asc) {
        var r = wall(JSON.parse(JSON.stringify(b[1])), asc); r.label = b[0]; r.asc = asc; out.push(r);
      });
    });
    [false, true].forEach(function (asc) {
      var r = wall(JSON.parse(JSON.stringify(B[3][1])), asc, { el: 'frost', frost: true }); r.label = 'staff (Dawnveil), Frost on'; r.asc = asc; out.push(r);
    });
    return out;
  }

  /* ── 5. what a rune costs, in seconds of work (the _rangedecon.js method) ─── */
  function actOf(skill, id) { return SKILLS[skill].acts.filter(function (a) { return a.id === id; })[0]; }
  function gatherSec(skill, itemId, lvl) {
    var acts = SKILLS[skill].acts.filter(function (a) { return a.out && a.out[itemId] && (a.lvl || 1) <= lvl; });
    if (!acts.length) acts = SKILLS[skill].acts.filter(function (a) { return a.out && a.out[itemId]; });
    if (!acts.length) return 0;
    var bestS = Infinity;
    acts.forEach(function (a) { var s = (actMs(a, skill) / 1000) / (a.out[itemId] || 1); if (s < bestS) bestS = s; });
    return bestS;
  }
  /* The cheapest way to make one unit of a firing agent at this level: the log has
     to be chopped and then burned, and a log that gives two of them halves both. */
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
      MD.RUNES.forEach(function (r, i) {
        var fk = Object.keys(r.fuel)[0];
        /* "at the level the rune unlocks" means every skill in the chain is at the
           level the chain needs: charcoal wants Firemaking 25, ember dust 40 */
        var lv = trained ? 99 : Math.max(r.rn, { ash: 1, charcoal: 25, ember_dust: 40 }[fk] || 1);
        setSkills(lv, trained);
        var act = actOf('runecrafting', 'rn_r_' + r.k);
        var per = act.out[r.k + '_rune'];
        var stone = gatherSec('mining', 'runestone', lv) * r.stone;
        var fs = fuelSec(fk, lv);
        var fuel = fs.sec * r.fuel[fk];
        var make = actMs(act, 'runecrafting') / 1000;
        var m = mods('runecrafting');
        out.runes.push({ trained: trained, tier: r.t, name: r.n, lvl: lv, per: per, cls: MD.runeClass(r.t), perCast: +((stone + fuel + make) / per * MD.runeClass(r.t)).toFixed(3), stoneSec: +(stone / per).toFixed(3), fuelSec: +(fuel / per).toFixed(3),
          makeSec: +(make / per).toFixed(3), perRune: +((stone + fuel + make) / per).toFixed(3), fuel: fk, fuelHow: fs.how,
          batchMs: Math.round(make * 1000), runesPerHrBench: Math.round(per * 3600 / make), xpPerBatch: act.xp, xpHr: Math.round(act.xp * (3600 / make) * m.xpMult) });
      });
      /* arrows, the same way, for the comparison */
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

  /* ── 6. skilling XP an hour, the _rangedecon.js method ───────────────────── */
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
    /* hours 1 to 99 with the inputs on hand: level by level, at the best act */
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

  /* ── 7. the enchanting reagents: what exists, and what Magic takes ────────── */
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

  /* ── 8. combat level: does any existing save move? ───────────────────────── */
  function levelCheck(n) {
    var moved = 0, seen = 0, seed = 1234567;
    var rnd = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    var keys = ['attack', 'strength', 'defence', 'hitpoints', 'ranged'];
    function test() { seen++; if (combatLevel() !== combatLevelOld()) moved++; }
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
    /* and the other direction: a pure mage reaches the level a pure fighter does */
    state.combatXp = { attack: XP_CUM[99], strength: XP_CUM[99], defence: XP_CUM[99], hitpoints: XP_CUM[99], ranged: 0, magic: 0 }; var melee99 = combatLevel();
    state.combatXp = { attack: 0, strength: 0, defence: XP_CUM[99], hitpoints: XP_CUM[99], ranged: 0, magic: XP_CUM[99] }; var mage99 = combatLevel();
    state.combatXp = { attack: 0, strength: 0, defence: XP_CUM[99], hitpoints: XP_CUM[99], ranged: XP_CUM[99], magic: 0 }; var arch99 = combatLevel();
    return { seen: seen, moved: moved, melee99: melee99, mage99: mage99, arch99: arch99 };
  }

  /* ── 9. structure: trees, points, layout ─────────────────────────────────── */
  function structure() {
    var t = TREES.runecrafting, byReq = {};
    t.forEach(function (n) { byReq[n.req] = (byReq[n.req] || 0) + 1; });
    var fl = {}; TREES.fletching.forEach(function (n) { fl[n.req] = (fl[n.req] || 0) + 1; });
    var sorc = CMAST_NODES.filter(function (n) { return n.tree === 'sorc'; }).reduce(function (s, n) { return s + n.max; }, 0);
    var gs = CMAST_NODES.filter(function (n) { return n.tree === 'gs'; }).reduce(function (s, n) { return s + n.max; }, 0);
    var pts = 0; for (var l = 2; l <= 99; l++) { pts += Math.floor(l / MD.SORC_POINTS.every) - Math.floor((l - 1) / MD.SORC_POINTS.every) + (l === MD.SORC_POINTS.bonusAt ? 1 : 0); }
    var acts = {}; SKILLS.runecrafting.acts.forEach(function (a) { acts[a.cat] = (acts[a.cat] || 0) + 1; });
    /* every input an act asks for, and whether anything in the game makes it */
    var src = buildSourceMap(), missing = [];
    SKILLS.runecrafting.acts.forEach(function (a) { for (var k in (a.inp || {})) if (!src[k] && !ITEMS[k]) missing.push(a.id + ':' + k); });
    var allActs = 0; for (var k in SKILLS) allActs += SKILLS[k].acts.length;
    return { treeSum: t.reduce(function (s, n) { return s + n.max; }, 0), nodes: t.length, cols: Object.keys(byReq).length, maxAbreast: Math.max.apply(null, Object.keys(byReq).map(function (k) { return byReq[k]; })),
      sameShapeAsFletching: JSON.stringify(byReq) === JSON.stringify(fl), sorc: sorc, bridge: gs, cmastCapNow: CMAST_CAP, newCap: CMAST_CAP + sorc + gs, pointsFromMagic: pts,
      acts: acts, actTotal: SKILLS.runecrafting.acts.length, allActs: allActs, skills: Object.keys(SKILLS).length, items: Object.keys(ITEMS).length, newItems: MAGE.items, missing: missing };
  }

  /* ── 10. the element pass ────────────────────────────────────────────────── */
  function elements() {
    var els = MD.ELEMENTS.map(function (e) { return e.k; });
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
    MD.ELEMENTS.forEach(function (e) {
      var pool = MONSTERS.filter(function (m) { return m.lvl >= e.lvl - 6; });
      after[e.k] = { pool: pool.length, weak: pool.filter(function (m) { return m.weakEl === e.k; }).length, resist: pool.filter(function (m) { return m.resistEl === e.k; }).length };
    });
    return { count: count, zones: zones, rows: rows, total: MONSTERS.length, fireResistedEarly: early, melee: melee, ranged: ranged, after: after };
  }

  /* ── 11. fight numbers for the Monte Carlo loop in sim.js ────────────────── */
  function fighters(lv, t) {
    var metal = METAL[t - 1], wood = WOOD[t - 1], hide = HIDE[t - 1], cloth = CLOTHK[t - 1], rune = RUNE[t - 1];
    var cape = { cape: metal + '_cape' }, out = {};
    state = defaultState(); normalizeState(); state.xp.agility = XP_CUM[lv];
    function one(key, o) { wear(o, lv); var s = snap(); var w = ITEMS[eqCombatWeapon()] || {}; s.dmgType = w.dmgType; s.kind = w.magic ? 'magic' : w.ranged ? 'ranged' : 'melee'; s.lcrit = s.crit; out[key] = s; }
    one('melee', { weapon: metal + '_sword', armour: set5(metal, PL, { cape: metal + '_cape', shield: metal + '_shield' }) });
    one('bow', { weapon: wood + '_shortbow', quiver: metal + '_arrow', armour: set5(hide, PL, cape) });
    one('wand', { weapon: wood + '_wand', quiver: rune, armour: set5(cloth, RB, { cape: metal + '_cape', shield: metal + '_buckler' }) });
    one('staff', { weapon: wood + '_staff', quiver: rune, armour: set5(cloth, RB, cape) });
    /* the same staff casting each smaller spell its rune powers */
    for (var sz = runeClassOf(rune) - 1; sz >= 1; sz--) one('staff_s' + sz, { weapon: wood + '_staff', quiver: rune, armour: set5(cloth, RB, cape), spell: MD.SPELLS[sz - 1].k });
    one('wandBare', { weapon: wood + '_wand', quiver: rune, armour: set5(cloth, RB, cape) });
    one('longbow', { weapon: wood + '_longbow', quiver: metal + '_arrow', armour: set5(hide, PL, cape) });
    one('meleeBuckler', { weapon: metal + '_sword', armour: set5(metal, PL, { cape: metal + '_cape', shield: metal + '_buckler' }) });
    one('xbowBuckler', { weapon: metal + '_crossbow', quiver: metal + '_bolt', armour: set5(hide, PL, { cape: metal + '_cape', shield: metal + '_buckler' }) });
    return out;
  }
  function consts() {
    return { HIT_MIN: COMBAT_P.HIT_MIN, BURN_CHANCE: BURN_CHANCE, BURN_DUR_MS: BURN_DUR_MS, BURN_TICK_MS: BURN_TICK_MS, XP_SCALE: XP_SCALE,
      SILVER: (typeof SILVER_PER_GOLD !== 'undefined') ? SILVER_PER_GOLD : 1, REQ: COMBAT_GEAR_REQ, P: COMBAT_P, RANGED_HIT_LVL: RANGED_HIT_LVL,
      monsters: MONSTERS.map(function (m) { return { id: m.id, name: m.name, zone: m.zone, lvl: m.lvl, hp: m.hp, atk: m.atk, str: m.str, def: m.def, xp: m.xp, coins: m.coins, swingMs: m.swingMs, boss: !!m.boss, weakTo: m.weakTo, resistTo: m.resistTo, weakEl: m.weakEl, resistEl: m.resistEl }; }),
      build: (document.querySelector('.mm-ver') || { getAttribute: function () { return ''; } }).getAttribute('data-build') };
  }

  /* ── 12. byte sizes of the painted art already in the file ───────────────── */
  function artSizes() {
    function stat(list) { if (!list.length) return { n: 0, mean: 0, total: 0 }; var t = list.reduce(function (a, b) { return a + b; }, 0); return { n: list.length, mean: Math.round(t / list.length), total: t, min: Math.min.apply(null, list), max: Math.max.apply(null, list) }; }
    var item = [], mon = [], pet = [], other = [];
    for (var k in ICONS) { var v = String(ICONS[k] || ''); if (v.indexOf('data:image') < 0) continue;
      if (v.indexOf('art-item') >= 0) item.push(v.length); else if (v.indexOf('art-mon') >= 0) mon.push(v.length); else if (v.indexOf('art-pet') >= 0) pet.push(v.length); else other.push(v.length); }
    var node = []; for (var n in NODE_ART) node.push(String(NODE_ART[n]).length);
    var ban = []; for (var s in SKILL_ART) ban.push(String(SKILL_ART[s]).length);
    var ach = ACHIEVEMENTS.map(function (a) { return String(ICONS[a.icon] || '').length; }).filter(function (x) { return x > 500; });
    var cm = []; if (typeof CMAST_ART !== 'undefined') for (var c in CMAST_ART) { if (c !== 'bg') { var cv = CMAST_ART[c]; cm.push(typeof cv === 'string' ? cv.length : JSON.stringify(cv).length); } }
    /* the bows that shipped as generated SVG, for the placeholder estimate */
    var gen = ['pine_shortbow', 'ancient_longbow', 'bronze_arrow', 'starfall_bolt', 'bronze_crossbow'].map(function (id) { return String(ICONS[id] || '').length; });
    return { item: stat(item), mon: stat(mon), pet: stat(pet), node: stat(node), banner: stat(ban), ach: stat(ach), cmast: stat(cm), other: stat(other), genSample: gen };
  }

  /* ── 13. the tables the page prints, read off the prototype, not retyped ─── */
  function tables() {
    var G = COMBAT_GEAR_STATS, T = {};
    var sum = function (k, names) { var o = { atk: 0, def: 0, mpow: 0, crit: 0, dodge: 0, aspd: 0, runeSave: 0 }; names.forEach(function (n) { var st = G[k + '_' + n] || {}; for (var x in o) o[x] += (st[x] || 0); }); for (var y in o) o[y] = +o[y].toFixed(3); return o; };
    /* weapons, tier 1 to 11, beside the sword and the bow of the tier */
    var ONEH = { 8: 'moltensteel_sword', 9: 'voidsteel_sword', 10: 'dawnbreaker', 11: 'sunderedge' };
    var RAID1 = { 7: 'barrow_blade', 8: 'emberforged_blade', 9: 'voidedge' };
    var BOW = { 10: 'sunpiercer', 11: 'plummet' }, XB = { 8: 'starfall_crossbow' };
    var MST = { 7: 'gravecall_staff', 8: 'slagfire_staff', 9: 'riftcaller', 10: 'dawncaller', 11: 'faultline' };
    var MWD = { 7: 'barrow_wand', 8: 'emberglass_wand', 9: 'nullspire_wand', 10: 'starcall_wand' };
    var one = function (id) { if (!id || !ITEMS[id]) return null; var st = G[id] || {}; return { id: id, name: ITEMS[id].name, atk: st.atk || 0, str: st.str || 0, rstr: st.rstr || 0, mpow: st.mpow || 0, crit: st.crit || 0 }; };
    T.weapons = [];
    for (var t = 1; t <= 11; t++) {
      var r = { tier: t, req: COMBAT_GEAR_REQ[t] };
      if (t <= 7) {
        r.sword = one(METAL[t - 1] + '_sword'); r.shortbow = one(WOOD[t - 1] + '_shortbow'); r.longbow = one(WOOD[t - 1] + '_longbow'); r.xbow = one(METAL[t - 1] + '_crossbow');
        r.wand = one(WOOD[t - 1] + '_wand'); r.staff = one(WOOD[t - 1] + '_staff');
        r.arrow = ITEMS[METAL[t - 1] + '_arrow'].ammoStr; r.rune = ITEMS[RUNE[t - 1]].runePow; r.runeName = ITEMS[RUNE[t - 1]].name;
      } else { r.sword = one(ONEH[t]); r.shortbow = null; r.longbow = one(BOW[t]); r.xbow = one(XB[t]); }
      r.raid1 = one(RAID1[t]); r.dstaff = one(MST[t]); r.dwand = one(MWD[t]);
      if (t === 8) { r.arrow = ITEMS.starfall_arrow.ammoStr; r.rune = ITEMS.starfall_rune.runePow; r.runeName = 'Starfall Rune'; }
      if (t === 11) { r.arrow = ITEMS.sundershaft.ammoStr; r.rune = ITEMS.sunder_rune.runePow; r.runeName = 'Sunder Rune'; }
      T.weapons.push(r);
    }
    /* armour: cloth beside leather and plate, tier by tier */
    T.armour = MD.CLOTH.map(function (c) {
      var plateKey = ['bronze', 'iron', 'steel', 'mithril', 'cobalt', 'runite', 'starsteel', 'moltensteel', 'voidsteel'][c.t - 1];
      return { k: c.k, name: c.n, tier: c.t, rn: c.rn, raid: c.raid || '', cloth: sum(c.k, MD.ROBE.PIECE), leather: sum(c.lk, PL), leatherName: (LEATHER_TIERS.filter(function (x) { return x.key === c.lk; })[0] || {}).set,
        plate: sum(plateKey, PL), plateName: plateKey, pieces: MD.ROBE.PIECE.map(function (p) { return G[c.k + '_' + p]; }) };
    });
    T.dawnveil = { cloth: sum('dawnveil', MD.DAWNVEIL.pieces), leather: sum('sunweave', ['helm', 'chest', 'legs', 'boots']), plate: sum('dawnward', ['helm', 'chest', 'legs', 'boots']) };
    /* every Runecrafting act, with what the game says it earns at its own level */
    T.acts = SKILLS.runecrafting.acts.map(function (a) {
      setSkills(Math.max(1, a.lvl), false);
      var ms = actMs(a, 'runecrafting'), m = mods('runecrafting');
      return { id: a.id, name: a.name, cat: a.cat, sub: a.subcat || '', lvl: a.lvl, ms: a.ms, sec: +(ms / 1000).toFixed(2), xp: a.xp, xph: Math.round(a.xp * (3600000 / ms) * m.xpMult),
        inp: a.inp, out: a.out };
    });
    T.quarry = (function () { var a = actOf('mining', 'mi_rs'); return { name: a.name, lvl: a.lvl, ms: a.ms, minMs: a.minMs, xp: a.xp }; })();
    /* drops */
    var mon = function (id) { return MONSTERS.filter(function (m) { return m.id === id; })[0]; };
    T.drops = [];
    MD.DROP_WEAPONS.forEach(function (d) {
      var st = G[d.id], rows = [];
      if (d.from.indexOf('mon:') === 0) [[d.from.slice(4), d.chance]].concat(d.also || []).forEach(function (r) { var m = mon(r[0]); rows.push({ who: m ? m.name : r[0], zone: m ? getZone(m.zone).name : (d.aerie ? 'Stormcrest Aerie' : ''), lvl: m ? m.lvl : 45, boss: !!(m && m.boss), chance: r[1] }); });
      else if (d.from.indexOf('raid:') === 0) { var rd = RAIDS.filter(function (x) { return x.id === d.from.slice(5); })[0]; rows.push({ who: rd.name, zone: 'raid', lvl: rd.unlockLvl, chance: d.chance }); }
      else rows.push({ who: 'The Sundered Spire', zone: 'spire', lvl: 99, chance: 0 });
      T.drops.push({ id: d.id, name: d.n, fam: d.fam, tier: d.t, atk: st.atk, mpow: st.mpow || 0, crit: st.crit || 0, aff: d.aff || null, wfx: d.wfx || null, ubonus: d.ubonus || null, rows: rows, aerie: !!d.aerie });
    });
    T.runeDrops = MD.RUNE_DROPS.map(function (r) { var m = mon(r[0]); var k = MD.RUNES[0]; MD.RUNES.forEach(function (x) { if (x.rn <= m.lvl) k = x; }); return { who: m.name, zone: getZone(m.zone).name, lvl: m.lvl, boss: !!m.boss, rune: k.n + ' Rune', chance: r[1], qty: r[2].map(function (q) { return q * MD.runeClass(k.t); }), casts: r[2], spell: MD.SPELLS[MD.runeClass(k.t) - 1].n }; });
    T.spireDrop = { base: 0.00005, step: 1.155, at: [30, 40, 50, 60, 70].map(function (f) { return [f, Math.min(1, 0.00005 * Math.pow(1.155, f - 1))]; }) };
    T.raidEl = RAIDS.filter(function (r) { return r.stages && r.stages.length; }).map(function (r) {
      return { name: r.name, lvl: r.unlockLvl, stages: r.stages.map(function (st) { var id = st.mon || st.id || st; var m = (typeof RAID_MON_BY_ID !== 'undefined' && RAID_MON_BY_ID[id]) || {}; var e = MD.RAID_EL[id] || [null, null];
        return { id: id, name: m.name || id, weakTo: m.weakTo || '', weakEl: e[0], resistEl: e[1], boss: !!st.boss }; }) };
    });
    T.counts = { skills: Object.keys(SKILLS).length, acts: (function () { var n = 0; for (var k in SKILLS) n += SKILLS[k].acts.length; return n; })(), items: Object.keys(ITEMS).length,
      newItems: (function () { var o = {}; for (var k in MAGE.items) o[k] = MAGE.items[k].length; return o; })(), ach: ACHIEVEMENTS.length, cmast: CMAST_NODES.length, guilds: GUILDS.length };
    T.ench = { stat: ENCH_STAT.magicDmg, pools: { staff: ENCH_POOL.staff.combat, headhands: ENCH_POOL.headhands.combat, jewelry: ENCH_POOL.jewelry.combat } };
    return T;
  }

  /* Casts an hour at a given Agility level. Agility is the one skill that changes
     how many runes an hour of fighting spends, so the rune bill has to be read at
     the Agility the character would really have. */
  function castRates(tier, agi) {
    var wood = WOOD[Math.min(WOOD.length - 1, tier - 1)], out = {};
    state = defaultState(); normalizeState(); state.xp.agility = XP_CUM[agi];
    [['wand', wood + '_wand'], ['staff', wood + '_staff'], ['bow', wood + '_shortbow']].forEach(function (p) {
      clear(); state.combatEquipped.weapon = p[1]; out[p[0]] = 3600000 / playerSwingMs();
    });
    state = defaultState(); normalizeState();
    return out;
  }

  /* ── 14. the spell ladder ─────────────────────────────────────────────────── */
  function spells() {
    var out = { table: [], sizes: [] };
    MD.RUNES.map(function (r) { return { id: r.k + '_rune', n: r.n, t: r.t, pow: r.pow, rn: r.rn, arrow: ITEMS[METAL[r.t - 1] + '_arrow'].ammoStr }; })
      .concat([{ id: MD.SPIRE_RUNE.id, n: 'Sunder', t: MD.SPIRE_RUNE.t, pow: MD.SPIRE_RUNE.pow, rn: 0, arrow: ITEMS.sundershaft.ammoStr }]).forEach(function (r) {
        var cls = runeClassOf(r.id), row = { id: r.id, name: r.n, tier: r.t, rn: r.rn, pow: ITEMS[r.id].runePow, arrow: r.arrow, cls: cls, biggest: MD.SPELLS[cls - 1].n,
          batch: r.rn ? actOf('runecrafting', 'rn_r_' + r.id.replace('_rune', '')).out[r.id] : 0, sizes: [] };
        for (var s = 1; s <= cls; s++) row.sizes.push(MD.spellPower(row.pow, cls, s));
        out.table.push(row);
      });
    /* the first Magic level each size can be cast at: the lightest weapon that can load a rune big enough */
    out.sizes = MD.SPELLS.map(function (sp, i) {
      var first = null; MD.RUNES.forEach(function (r) { if (!first && MD.runeClass(r.t) === i + 1) first = r; });
      var wt = Math.max(1, first.t - 1);
      return { k: sp.k, n: sp.n, runes: sp.runes, m: sp.m, rune: first.n, runeTier: first.t, rn: first.rn, weaponTier: wt, weapon: ITEMS[WOOD[wt - 1] + '_wand'].name, magic: COMBAT_GEAR_REQ[wt],
        runesNamed: MD.RUNES.filter(function (r) { return MD.runeClass(r.t) === i + 1; }).map(function (r) { return r.n; }).concat(MD.runeClass(MD.SPIRE_RUNE.t) === i + 1 ? ['Sunder'] : []) };
    });
    return out;
  }
  /* Weapon alone, Fire on, the parity test: the same mage at every size the rune powers. */
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
            state.combatSpell = MD.SPELLS[s - 1].k;
            rows.push({ size: s, name: MD.SPELLS[s - 1].n, pow: runePow(), hit: playerMaxHit(), dps: rawDps(def) + burnDps(def, MD.ELEMENTS[0].rider.burn, 0), castsHr: 3600000 / playerSwingMs() });
          }
          out.push({ lv: lv, tier: t, fam: fam, rune: ITEMS[rune].name, runeId: rune, runeTier: ITEMS[rune].ammoTier, matched: rune === RUNE[t - 1], cls: cls, foeDef: def, rows: rows });
        });
      });
    });
    return out;
  }

  window.SIM = { spells: spells, spellSizes: spellSizes, castRates: castRates, parity: parity, dressed: dressed, ladder: ladder, best: best, walls: walls, economy: economy, skillXp: skillXp, reagents: reagents,
    levelCheck: levelCheck, structure: structure, elements: elements, fighters: fighters, consts: consts, artSizes: artSizes,
    tables: tables, touch: function () { return MAGE.touch; } };
})();

/* Magic for Cindervale: a working prototype, laid over the real game.
 *
 * This file is evaluated INSIDE a running copy of cindervale.html (jsdom for
 * sim.js, headless Chrome for shoot.js). It never touches the file on disk.
 *
 * Why a prototype and not a spreadsheet: every number the page quotes comes out
 * of the game's own playerAccuracy / playerMaxHit / playerSwingMs / combatStats /
 * combatBonusesAll / cmastBonuses / mods / actMs, with Magic added the way the
 * real change would add it. Melee and Ranged run through the ORIGINAL functions,
 * untouched, so nothing here can move a number that already ships.
 *
 * Two kinds of change, and the difference matters:
 *
 *   wrap(name, fn)    the original runs for every weapon that is not a staff or a
 *                     wand; the new branch runs only when one is held
 *   edit(name, pairs) a source edit to a function that keeps a hardcoded key
 *                     list. Each pair is an exact string that must be found, or
 *                     the overlay throws. So the list printed in the page under
 *                     "what the prototype had to touch" is a list that RAN.
 */
(function () {
  'use strict';
  var MD = window.MAGE_DESIGN;
  if (!MD) throw new Error('overlay.js: load design.js first');
  if (window.MAGE) return;
  var TOUCH = [];
  var G = function (src) { return window.eval(src); };

  function edit(name, pairs, why) {
    var src = String(G(name)), out = src;
    pairs.forEach(function (p) {
      if (out.indexOf(p[0]) < 0) throw new Error('overlay: ' + name + ' no longer contains: ' + p[0].slice(0, 90));
      out = out.split(p[0]).join(p[1]);
    });
    G(name + '=' + out);
    TOUCH.push({ fn: name, kind: 'edit', edits: pairs.length, why: why });
  }
  function wrap(name, make, why) {
    var orig = G(name);
    window['__orig_' + name] = orig;
    var fn = make(orig);
    window.__mageTmp = fn;
    G(name + '=window.__mageTmp');
    TOUCH.push({ fn: name, kind: 'wrap', edits: 1, why: why });
  }
  var svg = function (body) { return '<svg class="ev-icon" viewBox="0 0 64 64">' + body + '</svg>'; };

  /* ══ 1. the stat ═══════════════════════════════════════════════════════════ */
  COMBAT_STATS.magic = { name: 'Magic', icon: '✨',
    desc: 'Accuracy AND damage, for staves and wands only.\nEach Magic level adds +1.5 accuracy and +' + MD.STAT.HIT_LVL + ' max hit.\n'
      + 'Each point of Magic Power adds +5 max hit. Most of it comes from the rune you have loaded; robes, some staves and capes add more.\n'
      + 'Magic damage % raises your max hit and accuracy with a staff or a wand, the way Attack % does with a sword. Attack % does nothing for a spell.\n'
      + 'One level here does the job of an Attack level and a Strength level, so it is worth less than either. Every cast spends runes: one for a Bolt, up to four for a Surge.' };
  DMG_TYPES.magic = { n: 'Magic', ico: 'magic', col: '#b9a4f0' };
  MD.ELEMENTS.forEach(function (e) { DMG_TYPES[e.k] = { n: e.n, ico: 'magic', col: e.col }; });

  window.isMagicWeapon = function (id) { return !!(id && ITEMS[id] && ITEMS[id].magic); };
  window.usingMagic = function () { return isMagicWeapon(eqCombatWeapon()); };
  window.magicStyle = function () {
    if (!usingMagic()) return null;
    return MD.STYLES[(state && state.combatStyle) || 'attack'] || MD.STYLES.attack;
  };
  window.elementUnlocked = function (k) {
    var e = MD.ELEMENTS.filter(function (x) { return x.k === k; })[0];
    return !!e && cmbLvl('magic') >= e.lvl;
  };
  window.activeElement = function () {
    var k = (state && state.combatElement) || 'fire';
    return elementUnlocked(k) ? k : 'fire';
  };
  /* The spell: how big it is, what it spends, and how much of the rune it gets.
     state.combatSpell is the size the player asked for; what is cast is that or the
     biggest the loaded rune can power, whichever is smaller. Nothing set means the
     biggest, so a mage who never touches the buttons casts at full strength. */
  window.runeClassOf = function (id) { var it = id && ITEMS[id]; return (it && it.runeClass) || 1; };
  window.spellSize = function () {
    var a = readyAmmo(); if (!a) return 1;
    var want = 0; MD.SPELLS.forEach(function (s, i) { if (s.k === (state && state.combatSpell)) want = i + 1; });
    return Math.max(1, Math.min(want || MD.SPELLS.length, runeClassOf(a)));
  };
  window.spellName = function () {
    var e = MD.ELEMENTS.filter(function (x) { return x.k === activeElement(); })[0];
    return e.n + ' ' + MD.SPELLS[spellSize() - 1].n;
  };
  window.runePow = function () {
    var a = readyAmmo();
    return a ? MD.spellPower(ITEMS[a].runePow || 0, runeClassOf(a), spellSize()) : 0;
  };
  /* Defence on worn armour that is not cloth. The shield is exempt, the reason the
     ranged rule gives: a wand's whole point is the free hand. A cape is cloth. */
  window.nonClothDef = function () {
    var ce = state && state.combatEquipped; if (!ce) return 0;
    var d = 0;
    for (var slot in ce) {
      if (slot === 'weapon' || slot === 'quiver' || slot === 'shield' || slot === 'cape') continue;
      var id = ce[slot], it = id && ITEMS[id]; if (!it || it.cloth) continue;
      var cs = gearStats(id); if (!cs) continue;
      d += cs.def || 0;
    }
    return d;
  };
  window.magicArmourMult = function () {
    if (!usingMagic()) return 1;
    return Math.max(MD.ARMOUR.floor, 1 - nonClothDef() * MD.ARMOUR.perDef);
  };
  /* Chance a cast keeps its rune, every source, under the ceiling arrows share. */
  window.runeSaveRate = function () {
    var r = treeRank('runecrafting', 'rn_save') * MD.RN_RANK.save
          + treeRank('runecrafting', 'rn_gm_save') * MD.RN_RANK.gmSave
          + (treeRank('runecrafting', 'rn_endless') > 0 ? MD.RN_RANK.endless : 0);
    var cm = cmastBonuses(); if (cm && cm.ammoSave > 0) r += cm.ammoSave;
    var ce = (state && state.combatEquipped) || {};
    for (var s in ce) { var g = gearStats(ce[s]); if (g && g.runeSave) r += g.runeSave; }
    return Math.min(MD.RUNE_SAVE_CAP, r);
  };

  /* ══ 2. items ══════════════════════════════════════════════════════════════ */
  var NEW = { runes: [], staves: [], wands: [], cloth: [], robes: [], drops: [], misc: [] };
  function item(id, def, group) {
    if (ITEMS[id]) throw new Error('overlay: item id taken: ' + id);
    ITEMS[id] = def; if (group) NEW[group].push(id);
    return def;
  }
  /* placeholders only. No art is proposed here; these are flat shapes in the tier
     palette so the prototype can be photographed. */
  var TPAL = ['#b98a4e', '#a8adb4', '#d3dae2', '#8cc4ec', '#6b9ce8', '#5fd0a8', '#e8e2ff', '#ffd98a', '#c890ff', '#ffe6a0', '#e88fc0'];
  var pal = function (t) { return TPAL[Math.max(0, Math.min(TPAL.length - 1, t - 1))]; };
  function runeSVG(c) { return svg('<path d="M32 6 L52 18 L52 46 L32 58 L12 46 L12 18 Z" fill="#2a2420" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/><path d="M26 20 L26 44 M26 22 L38 30 L26 36 M38 44 L26 36" fill="none" stroke="' + c + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>'); }
  function staffSVG(c) { return svg('<path d="M18 58 L42 14" stroke="#6d4a26" stroke-width="5" stroke-linecap="round"/><circle cx="45" cy="11" r="8" fill="#201a16" stroke="' + c + '" stroke-width="3"/><circle cx="45" cy="11" r="3" fill="' + c + '"/>'); }
  function wandSVG(c) { return svg('<path d="M20 50 L40 22" stroke="#6d4a26" stroke-width="4.4" stroke-linecap="round"/><path d="M44 8 L46.5 15 L54 17 L46.5 19.5 L44 27 L41.5 19.5 L34 17 L41.5 15 Z" fill="' + c + '"/>'); }
  function clothSVG(c) { return svg('<rect x="12" y="18" width="40" height="30" rx="5" fill="#241e1a" stroke="' + c + '" stroke-width="3"/><path d="M12 28 H52 M12 38 H52" stroke="' + c + '" stroke-width="1.6" opacity=".6"/>'); }
  var ROBE_SHAPE = [
    'M14 40 Q14 10 32 8 Q50 10 50 40 L42 50 L22 50 Z',                                   // hood
    'M12 22 L22 12 L42 12 L52 22 L46 28 L46 56 L18 56 L18 28 Z',                          // robe
    'M18 10 L46 10 L48 56 L36 56 L32 28 L28 56 L16 56 Z',                                 // leggings
    'M14 20 L26 16 L30 44 L18 48 Z M38 16 L50 20 L46 48 L34 44 Z',                        // wraps
    'M12 26 L24 26 L26 44 L42 46 L50 52 L50 56 L12 56 Z'                                  // slippers
  ];
  function robeSVG(i, c) { return svg('<path d="' + ROBE_SHAPE[i] + '" fill="#241e1a" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/>'); }

  item('runestone', { name: 'Runestone', icon: '\u{1FAA8}', sell: 6,
    desc: 'A soft grey stone that takes a mark and holds heat. Quarried with a pick. Runecrafting carves it into runes.' }, 'misc');
  ICONS.runestone = svg('<path d="M14 44 L20 20 L40 12 L52 28 L46 50 L24 54 Z" fill="#3a3632" stroke="#8d8578" stroke-width="3" stroke-linejoin="round"/><path d="M26 30 L36 26 L40 38" fill="none" stroke="#8d8578" stroke-width="2"/>');

  MD.RUNES.forEach(function (r) {
    var id = r.k + '_rune';
    item(id, { name: r.n + ' Rune', icon: '\u{1F52E}', sell: Math.round(4 + r.t * r.t * 3.2), ammo: 'rune', runePow: r.pow, ammoTier: r.t, runeClass: MD.runeClass(r.t),
      desc: 'Runestone, carved and baked hard. It can power a ' + MD.SPELLS[MD.runeClass(r.t) - 1].n + ' and any smaller spell. Used up when you cast.' }, 'runes');
    ICONS[id] = runeSVG(pal(r.t));
  });
  item(MD.SPIRE_RUNE.id, { name: MD.SPIRE_RUNE.n, icon: '\u{1F52E}', sell: 580, rare: true, ammo: 'rune', runePow: MD.SPIRE_RUNE.pow, ammoTier: MD.SPIRE_RUNE.t, runeClass: MD.runeClass(MD.SPIRE_RUNE.t),
    desc: 'A rune cut from the Spire’s own stone. A Surge cast with it gets <b>' + MD.SPIRE_RUNE.pow + ' Magic Power</b>. It cannot be made with Runecrafting and only comes from the Spire.' }, 'runes');
  ICONS[MD.SPIRE_RUNE.id] = runeSVG(pal(11));

  function weapon(id, name, fam, tier, atk, mpow, extra, group) {
    var F = MD.FAMILIES[fam];
    item(id, Object.assign({ name: name, icon: '\u{1FA84}', sell: Math.round(60 * Math.pow(2.35, tier - 1)), cgear: true, ctier: tier, cslot: 'weapon',
      dmgType: 'magic', magic: true, ammo: 'rune', mfam: fam, wclass: F.wclass, swingMult: F.swingMult, dmgMult: F.dmgMult,
      desc: fam === 'staff'
        ? 'Slow to cast and hits hard. Takes both hands, so you cannot carry a shield. Every cast spends runes.'
        : 'Quick to cast. One hand only, so a buckler or a shield still fits. Every cast spends runes.' },
      fam === 'staff' ? { twoHanded: true } : {}, extra || {}), group);
    COMBAT_GEAR_STATS[id] = mpow ? { atk: atk, str: 0, def: 0, mpow: mpow } : { atk: atk, str: 0, def: 0 };
    /* armorPerkBonuses() already sums `crit` off every worn piece, the weapon
       included, which is how a buckler carries its own. */
    if (F.crit) COMBAT_GEAR_STATS[id].crit = +(F.crit + F.critTier * tier).toFixed(3);
    ICONS[id] = (fam === 'staff' ? staffSVG : wandSVG)(pal(tier));
  }
  MD.WOODS.forEach(function (w) {
    var a = MD.SWORD_ATK[w.t - 1];
    weapon(w.k + '_wand',  w.n + ' Wand',  'wand',  w.t, Math.round(a * MD.FAMILIES.wand.atkMult),  0, null, 'wands');
    weapon(w.k + '_staff', w.n + ' Staff', 'staff', w.t, Math.round(a * MD.FAMILIES.staff.atkMult), 0, null, 'staves');
  });
  MD.DROP_WEAPONS.forEach(function (d) {
    var ex = { rare: true };
    if (d.wfx) ex.wfx = d.wfx; if (d.ubonus) ex.ubonus = d.ubonus; if (d.aff) ex.aff = d.aff;
    weapon(d.id, d.n, d.fam, d.t, d.atk, d.mpow, ex, 'drops');
  });

  /* robes, built off the leather piece of the same tier */
  function spread(total) {
    var raw = MD.ROBE.SPREAD.map(function (s) { return total * s; }), out = raw.map(Math.floor);
    var left = total - out.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (v, i) { return [v - Math.floor(v), i]; }).sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    for (var i = 0; i < left; i++) out[order[i][1]]++;
    return out;
  }
  MD.CLOTH.forEach(function (c) {
    if (!c.raid) {
      item(c.k, { name: c.n, icon: '\u{1F9F5}', sell: Math.round(30 * Math.pow(1.9, c.t - 1)),
        desc: 'A bolt of ' + c.n.toLowerCase() + ', woven on a loom. Runecrafting sews it into robes.' }, 'cloth');
      ICONS[c.k] = clothSVG(pal(c.t));
    }
    var mp = spread(c.mpow);
    MD.ROBE.PIECE.forEach(function (p, i) {
      var id = c.k + '_' + p, L = COMBAT_GEAR_STATS[c.lk + '_' + MD.ROBE.LEATHER_PIECE[i]];
      if (!L) throw new Error('overlay: no leather piece to measure against: ' + c.lk + '_' + MD.ROBE.LEATHER_PIECE[i]);
      item(id, { name: c.n + ' ' + MD.ROBE.PIECE_NAME[i], icon: '\u{1F9E5}', sell: Math.round(50 * Math.pow(2.1, c.t - 1)), cgear: true, ctier: c.t,
        cslot: MD.ROBE.SLOTS[i], cloth: true,
        desc: c.n + ' cut and sewn into a robe piece. Less Defence than leather, but it adds Magic Power and saves runes. Plate and leather weaken your spells; cloth does not.' }, 'robes');
      var st = { atk: Math.round((L.atk || 0) * MD.ROBE.ATK_FRAC), str: 0, def: Math.max(1, Math.round((L.def || 0) * MD.ROBE.DEF_FRAC)), runeSave: MD.ROBE.SAVE };
      if (mp[i]) st.mpow = mp[i];
      COMBAT_GEAR_STATS[id] = st;
      ICONS[id] = robeSVG(i, pal(c.t));
    });
  });
  (function () {
    var D = MD.DAWNVEIL, ids = [];
    D.pieces.forEach(function (p, i) {
      var id = D.k + '_' + p, L = COMBAT_GEAR_STATS[D.from[i]]; ids.push(id);
      item(id, { name: D.n + ' ' + D.pieceName[i], icon: '\u{1F9E5}', sell: 34000, rare: true, cgear: true, ctier: D.t, cslot: D.slots[i], cloth: true, setKey: D.k,
        desc: 'Cloth from The Empyrean Throne that was never woven by a hand. Part of the <b>' + D.n + '</b> set.' }, 'robes');
      COMBAT_GEAR_STATS[id] = { atk: Math.round((L.atk || 0) * MD.ROBE.ATK_FRAC), str: 0, def: Math.round((L.def || 0) * MD.ROBE.DEF_FRAC), mpow: D.mpow[i], runeSave: D.save };
      ICONS[id] = robeSVG([0, 1, 2, 4][i], pal(10));
    });
    COMBAT_SETS[D.k] = { name: D.n, pieces: ids, bonus: D.set,
      desc: 'Full set: +10% crit chance and +8% damage with any weapon.' };
  })();

  /* Magic Power on what is already worn by every build, the same small list Ranged
     Strength got: bucklers from Cobalt up, Stonewright, and every cape. */
  var MPOW_BUCKLERS = { cobalt: 1, runite: 1, starsteel: 1, moltensteel: 2, voidsteel: 2, dawnsteel: 2 };
  for (var bk in MPOW_BUCKLERS) { var bs = COMBAT_GEAR_STATS[bk + '_buckler']; if (bs) bs.mpow = MPOW_BUCKLERS[bk]; }
  if (COMBAT_GEAR_STATS.stonewright_gauntlets) { COMBAT_GEAR_STATS.stonewright_gauntlets.mpow = 2; ITEMS.stonewright_gauntlets.cloth = true; }
  for (var cid in COMBAT_GEAR_STATS) {
    var cit = ITEMS[cid], cst = COMBAT_GEAR_STATS[cid];
    if (cit && cit.cslot === 'cape' && (cst.str || 0) > 0 && !cst.mpow) cst.mpow = cst.str;
  }

  /* gem and potion */
  MD.GEM.tiers.forEach(function (g, i) {
    item(g[0], { name: g[1] + ' ' + MD.GEM.n, icon: '\u{1F7E3}', sell: [200, 800, 3200][i], rare: true, socketGem: true }, 'misc');
    SOCKET_GEMS[g[0]] = { name: g[1] + ' ' + MD.GEM.n, color: MD.GEM.color, tier: i + 1, bonus: { magicDmg: g[2] }, desc: '+' + Math.round(g[2] * 100) + '% Magic damage' };
    ICONS[g[0]] = svg('<path d="M32 6 L54 26 L32 58 L10 26 Z" fill="#2a1e3a" stroke="#b9a4f0" stroke-width="3" stroke-linejoin="round"/>');
  });
  MD.POTIONS.forEach(function (p) {
    item(p.id, { name: p.n, icon: '✨', sell: p.mpow === 2 ? 1700 : 4200, potion: { mpow: p.mpow, dur: p.sec } }, 'misc');
    ICONS[p.id] = svg('<path d="M26 8 H38 V22 L48 44 Q50 56 32 56 Q14 56 16 44 L26 22 Z" fill="#241a36" stroke="#b9a4f0" stroke-width="3" stroke-linejoin="round"/>');
  });
  if (ITEMS.warriors_brew && ITEMS.warriors_brew.potion) ITEMS.warriors_brew.potion.mpow = 3;

  /* ══ 3. the formulas ═══════════════════════════════════════════════════════ */
  edit('ammoMaxTier', [['(w&&w.ranged)?', '(w&&(w.ranged||w.magic))?']], 'a staff draws runes up to its own tier plus one, the rule a bow follows');
  edit('ammoKindTopTier', [['if(w&&w.ranged&&w.ammo)', 'if(w&&(w.ranged||w.magic)&&w.ammo)']], 'the best staff casts the best rune');
  edit('ammoFitsWeapon', [['!w.ranged||!q.ammo', '!(w.ranged||w.magic)||!q.ammo']], 'runes load into a staff or a wand and nothing else');
  G('_ammoTopTier=null');

  wrap('gearStats', function (orig) {
    return function (id) {
      var o = orig(id); if (!o) return o;
      var base = COMBAT_GEAR_STATS[id];
      if (o !== base && base && base.mpow) { var r = ascRank(id); o.mpow = Math.round(base.mpow * (1 + ASC_STAT_PER_RANK * r)); }
      return o;
    };
  }, 'Ascension raises Magic Power on a piece with the rest of its numbers');

  wrap('combatStats', function (orig) {
    return function () {
      var o = orig(), mp = 0, ce = state && state.combatEquipped;
      if (ce) for (var id of Object.values(ce)) { var g = gearStats(id); if (g && g.mpow) mp += g.mpow; }
      try { if (treeRank('crafting', 'cr_master2') > 0) mp = Math.round(mp * 1.1); } catch (e) {}
      var now = Date.now();
      if (Array.isArray(state.effects)) for (var ef of state.effects) { if (ef && ef.expires > now && ef.mpow) mp += ef.mpow; }
      o.mpow = mp;
      return o;
    };
  }, 'Magic Power is summed beside Strength and Ranged Strength, and never mixes with them');

  edit('combatEnchantBonuses', [
    ['var CK={atkBoost:0,rangedStr:0,', 'var CK={atkBoost:0,rangedStr:0,magicDmg:0,'],
    ['var total={atkBoost:0,rangedStr:0,', 'var total={atkBoost:0,rangedStr:0,magicDmg:0,'],
    ["enchLineBonuses(ce,['atkBoost','rangedStr',", "enchLineBonuses(ce,['atkBoost','rangedStr','magicDmg',"]
  ], 'three key lists that would otherwise drop a Magic damage enchant in silence');
  edit('combatSocketBonuses', [
    ['var CK={atkBoost:0,rangedStr:0,', 'var CK={atkBoost:0,rangedStr:0,magicDmg:0,'],
    ['var total={atkBoost:0,rangedStr:0,', 'var total={atkBoost:0,rangedStr:0,magicDmg:0,']
  ], 'two key lists that would otherwise drop a Wyrdstone in silence');

  edit('cmastBonuses', [
    ['const b={atkBoost:0,rangedStr:0,hpBoost:0,', 'const b={atkBoost:0,rangedStr:0,magicDmg:0,spellPen:0,echo:0,attune:0,runeRefundOnMiss:0,hpBoost:0,'],
    ["const _dk = _rng ? 'rangedStr' : 'atkBoost';",
     "const _mag=(typeof usingMagic==='function')&&usingMagic(); const _dk=_mag?'magicDmg':(_rng?'rangedStr':'atkBoost');"],
    ['if(ef.meleeDmg && !_rng) b.atkBoost += ef.meleeDmg*rank;',
     'if(ef.meleeDmg && !_rng && !_mag) b.atkBoost += ef.meleeDmg*rank;'
     + ' if(ef.magicDmg && _mag) b.magicDmg += ef.magicDmg*rank;'
     + ' if(ef.magicCrit && _mag) b.critChance += ef.magicCrit*rank;'
     + ' if(ef.runeSave && _mag) b.ammoSave += ef.runeSave*rank;'
     + ' if(ef.staffDmg && _mag){ const _sw=eqCombatWeapon(); b.magicDmg += ef.staffDmg*rank*((_sw&&ITEMS[_sw]&&ITEMS[_sw].twoHanded)?2:1); }'],
    ['if(ef.ammoSave)          b.ammoSave += ef.ammoSave*rank;', 'if(ef.ammoSave && !_mag) b.ammoSave += ef.ammoSave*rank;'],
    ["if(id==='k_t5_l'){ b.volley+=0.08; }",
     "if(id==='k_t5_l'){ b.volley+=0.08; }"
     + " if(id==='s_t3_l' && _mag){ b.spellPen+=0.10; }"
     + " if(id==='s_t3_r'){ const _qw=eqCombatWeapon(); if(_qw&&ITEMS[_qw]&&ITEMS[_qw].magic&&!ITEMS[_qw].twoHanded) b.aspd+=0.05; }"
     + " if(id==='s_t5_l'){ b.echo+=0.08; }"
     + " if(id==='s_t5_m'){ b.attune=1; }"
     + " if(id==='s_t5_r'){ b.runeRefundOnMiss=1; }"
     + " if(id==='s_cap' && _mag){ b.critDmg+=0.25; }"
     + " if(id==='gs_t4'){ b[_dk]+=0.06; b.maxHpFlat+=4; }"]
  ], 'the weapon gate gets a third branch, and the Sorcery nodes their effects');

  wrap('combatBonusesAll', function (orig) {
    return function () {
      var b = orig();
      var mag = usingMagic();
      var e = combatEnchantBonuses(), s = combatSocketBonuses(), st = combatSetBonus(), u = combatUniqueBonuses(), cm = cmastBonuses();
      var ce = (state && state.combatEquipped) || {};
      var anyDmg = (e.dmgBoost || 0) + (s.dmgBoost || 0) + (st.dmgBoost || 0) + (u.dmgBoost || 0);
      b.magicDmg = (e.magicDmg || 0) + (s.magicDmg || 0) + (st.magicDmg || 0) + (u.magicDmg || 0) + (cm.magicDmg || 0)
                 + (jewelryInnateBonus(ce, 'magicDmg') || 0) + (mag ? anyDmg : 0);
      if (mag) {
        /* the original handed "damage with any weapon" and the Iron Legion's melee
           damage to Attack %, because the weapon was not a bow. Take both back. */
        var gdc = (typeof gdCombatBonus === 'function') ? gdCombatBonus() : { cdmg: 0 };
        b.atkBoost -= anyDmg + (gdc.cdmg || 0);
        b.accBoost = (b.accBoost || 0) + treeRank('runecrafting', 'rn_acc') * MD.RN_RANK.acc;
      }
      b.spellPen = cm.spellPen || 0; b.echo = cm.echo || 0; b.attune = cm.attune || 0;
      return b;
    };
  }, 'Magic damage % is its own channel; "damage with any weapon" follows the staff');

  wrap('playerAccuracy', function (orig) {
    return function () {
      if (!usingMagic()) return orig();
      var cs = combatStats(), b = combatBonusesAll(), ms = magicStyle();
      var pct = (b.magicDmg || 0) + (b.accBoost || 0);
      return Math.round((cmbLvl('magic') * COMBAT_P.ACC_LVL + cs.atk * COMBAT_P.ACC_GEAR)
        * (1 + pct) * classAccuracyMult() * (ms ? ms.acc : 1));
    };
  }, 'Magic level stands in for Attack; Magic damage % raises it the way Attack % does for a sword');

  wrap('playerMaxHit', function (orig) {
    return function () {
      if (!usingMagic()) return orig();
      var cs = combatStats(), b = combatBonusesAll(), w = ITEMS[eqCombatWeapon()] || {};
      var aff = (w.aff && w.aff.el === activeElement()) ? (1 + w.aff.dmg) : 1;
      return Math.max(1, Math.round((cmbLvl('magic') * MD.STAT.HIT_LVL + ((cs.mpow || 0) + runePow()) * COMBAT_P.HIT_GEAR)
        * (w.dmgMult || 1) * (1 + (b.magicDmg || 0)) * classMaxHitMult() * magicArmourMult() * aff
        * (1 + treeRank('runecrafting', 'rn_dmg') * MD.RN_RANK.dmg)));
    };
  }, '(Magic level x ' + MD.STAT.HIT_LVL + ' + Magic Power x 5) x the staff x Magic damage %, less what plate and leather cost');

  wrap('playerSwingMs', function (orig) {
    return function () {
      var ms = orig(), st = magicStyle();
      return (st && st.swing !== 1) ? Math.max(COMBAT_MIN_SWING_MS, Math.round(ms * st.swing)) : ms;
    };
  }, 'Swift casts faster, Warded slower');

  wrap('combatXpStat', function (orig) {
    return function () { return usingMagic() ? 'magic' : orig(); };
  }, 'a staff trains Magic');

  wrap('styleStatFor', function (orig) {
    return function (slot) { return usingMagic() ? 'magic' : orig(slot); };
  }, 'all three style buttons read the Magic level while a staff is held');

  wrap('combatLevel', function (orig) {
    window.combatLevelOld = orig;
    return function () {
      var a = cmbLvl('attack'), s = cmbLvl('strength'), d = cmbLvl('defence'), h = cmbLvl('hitpoints');
      var r = cmbLvl('ranged'), m = cmbLvl('magic');
      return Math.max(1, Math.floor((Math.max(a + s, r * 2, m * 2) + d + h) / 4));
    };
  }, 'max(attack + strength, ranged x 2, magic x 2): no save with Magic at 1 can move');

  wrap('combatGearReq', function (orig) {
    return function (id) {
      var r = orig(id), it = ITEMS[id];
      if (r && it && it.magic && it.cslot === 'weapon') r.stat = 'magic';
      return r;
    };
  }, 'staves and wands gate on Magic');

  edit('grantCombatXp', [
    ["if(stat==='ranged' && typeof rangedStyle==='function'){\n    const _rs=rangedStyle();",
     "if((stat==='ranged'||stat==='magic') && typeof rangedStyle==='function'){\n    const _rs=(stat==='magic')?magicStyle():rangedStyle();"],
    ['{attack:0,strength:0,defence:0,ranged:0,hitpoints:0}', '{attack:0,strength:0,defence:0,ranged:0,magic:0,hitpoints:0}']
  ], 'Warded splits its XP with Defence the way Longrange does');
  wrap('grantCombatXp', function (orig) {
    return function (stat, amount) {
      var b = cmbLvl('magic');
      orig(stat, amount);
      var a = cmbLvl('magic');
      if (a > b) {
        var n = Math.floor(a / MD.SORC_POINTS.every) - Math.floor(b / MD.SORC_POINTS.every) + ((b < MD.SORC_POINTS.bonusAt && a >= MD.SORC_POINTS.bonusAt) ? 1 : 0);
        if (n > 0 && typeof grantCmastPoints === 'function') grantCmastPoints(n, 'Magic Lv ' + a);
      }
    };
  }, 'Magic levels pay for the Sorcery column: one point every third level, two at 99');

  wrap('normalizeState', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      if (!state.combatXp) state.combatXp = {};
      if (typeof state.combatXp.magic !== 'number' || !(state.combatXp.magic >= 0)) state.combatXp.magic = 0;
      if (!MD.ELEMENTS.some(function (e) { return e.k === state.combatElement; })) state.combatElement = 'fire';
      if (!MD.SPELLS.some(function (s) { return s.k === state.combatSpell; })) state.combatSpell = MD.SPELLS[MD.SPELLS.length - 1].k;
      if (state.xp && typeof state.xp.runecrafting !== 'number') state.xp.runecrafting = 0;
      return r;
    };
  }, 'the save guards: combatXp.magic, combatElement, combatSpell, xp.runecrafting');

  /* ══ 3b. the fight itself ══════════════════════════════════════════════════
     combatTick is edited, not wrapped: the changes are single lines inside the
     attack it already resolves. With these the prototype is playable in the real
     tick, runes and all. sim.js does not lean on it (its fights are rolled in
     Node from the numbers above), but the screenshots do. */
  window.mageSureChance = function () {
    var e = MD.ELEMENTS.filter(function (x) { return x.k === activeElement(); })[0];
    var st = (e && e.rider.pierce) || 0, tr = treeRank('runecrafting', 'rn_sure') * MD.RN_RANK.sure;
    return 1 - (1 - st) * (1 - tr);
  };
  window.mageOnHit = function (mon, dmg, now, crit) {
    var e = MD.ELEMENTS.filter(function (x) { return x.k === activeElement(); })[0]; if (!e) return;
    var cm = cmastBonuses(), more = treeRank('runecrafting', 'rn_brand') * MD.RN_RANK.brand;
    var sure = !!(crit && cm.attune);
    if (!combat.foeStatus) combat.foeStatus = {};
    if (e.rider.burn && (sure || Math.random() < Math.min(1, BURN_CHANCE + more))) {
      var fresh = !combat.foeStatus.burn;
      combat.foeStatus.burn = { tickDmg: Math.max(1, Math.round(combat.youMaxHit * e.rider.burn)), until: now + BURN_DUR_MS,
        last: combat.foeStatus.burn ? combat.foeStatus.burn.last : now };
      if (fresh) cmbLog('The ' + mon.name + ' catches fire.', 'hit');
    }
    if (e.rider.chill && (sure || Math.random() < Math.min(1, e.rider.chill.chance + more))) {
      var base = (combat.foeStatus.pin && combat.foeStatus.pin.base) || combat.foeSwingMs;
      if (!combat.foeStatus.pin) cmbLog('The ' + mon.name + ' is chilled. It attacks ' + Math.round(e.rider.chill.slow * 100) + '% slower.', 'status');
      combat.foeStatus.pin = { base: base, until: now + e.rider.chill.ms, slow: e.rider.chill.slow };
    }
    if (e.rider.leech && combat.youHp < combat.youMaxHp) {
      combat.youHp = Math.min(combat.youMaxHp, combat.youHp + Math.max(1, Math.floor(dmg * e.rider.leech)));
    }
  };
  edit('combatTick', [
    ["let _spentAmmo='';\n    if(usingRanged()){", "let _spentAmmo='';\n    const _mg=(typeof usingMagic==='function')&&usingMagic();\n    if(usingRanged()||_mg){"],
    ["const _why = !_q ? 'Your quiver is empty.'", "const _why = !_q ? (_mg?'You have no runes loaded.':'Your quiver is empty.')"],
    ["if(ITEMS[_am].ammo==='bolt' && treeRank('fletching','fl_bolts')<1) _rate=0;", "if(ITEMS[_am].ammo==='bolt' && treeRank('fletching','fl_bolts')<1) _rate=0;\n      if(_mg) _rate=runeSaveRate();"],
    ["const _penMul=(_cmPen&&_cmPen.armourPen>0&&typeof usingRanged==='function'&&usingRanged())\n      ? (1-_cmPen.armourPen) : 1;",
     "const _penMul=(_mg&&_cmPen&&_cmPen.spellPen>0) ? (1-_cmPen.spellPen) : (_cmPen&&_cmPen.armourPen>0&&typeof usingRanged==='function'&&usingRanged())\n      ? (1-_cmPen.armourPen) : 1;"],
    ["|| Math.random()<flWindChance();", "|| Math.random()<flWindChance() || (_mg && Math.random()<mageSureChance());"],
    ["state.items[_am]=(state.items[_am]||0)-1;", "var _spentN=_mg?Math.min(spellSize(),state.items[_am]||0):1;\n        state.items[_am]=(state.items[_am]||0)-_spentN;"],
    ["if(_qm && _qm.ammoRefundOnMiss) state.items[_spentAmmo]=(state.items[_spentAmmo]||0)+1;", "if(_qm && (_mg?_qm.runeRefundOnMiss:_qm.ammoRefundOnMiss)) state.items[_spentAmmo]=(state.items[_spentAmmo]||0)+(_mg?_spentN:1);"],
    ['cmbLog(`You ${didCrit?\'<span style="color:#ffd700">crit</span> \':\'\'}hit the ${mon.name} for ${youDmg}.`,\'hit\');',
     'cmbLog(_mg?(spellName()+\' \'+(didCrit?\'<span style="color:#ffd700">crits</span>\':\'hits\')+\' the \'+mon.name+\' for \'+youDmg+\'.\'):`You ${didCrit?\'<span style="color:#ffd700">crit</span> \':\'\'}hit the ${mon.name} for ${youDmg}.`,\'hit\');'],
    ['cmbLog(`You miss the ${mon.name}.`,\'miss\');', 'cmbLog(_mg?(spellName()+\' misses the \'+mon.name+\'.\'):`You miss the ${mon.name}.`,\'miss\');'],
    ["if(_wepType){\n        if(mon.weakTo===_wepType){", "if(_mg){ const _em=elementMult(mon); if(_em!==1) youDmg=Math.max(1,Math.round(youDmg*_em)); }\n      else if(_wepType){\n        if(mon.weakTo===_wepType){"],
    ["cmbSplat(youDmg,didCrit?'crit':'hit');", "cmbSplat(youDmg,(didCrit?'crit':'hit')+(_mg?' el-'+activeElement():''));\n      if(_mg) mageOnHit(mon,youDmg,now,didCrit);"],
    ["if(!_cleaveDmg && typeof usingRanged==='function' && usingRanged()){", "if(!_cleaveDmg && _mg){ const _cmE=cmastBonuses(); if(_cmE.echo>0 && Math.random()<_cmE.echo) _cleaveDmg=youDmg; }\n      if(!_cleaveDmg && typeof usingRanged==='function' && usingRanged()){"],
    ["else combat.foeSwingMs=Math.round(_pin.base*1.15);", "else combat.foeSwingMs=Math.round(_pin.base*(1+(_pin.slow||0.15)));"]
  ], 'thirteen lines inside the attack: a cast spends its runes, names its spell, hits the element weakness, applies the element, and stops when the runes run out');

  /* ══ 4. enchants ═══════════════════════════════════════════════════════════ */
  ENCH_STAT.magicDmg = { label: 'Magic damage', word: 'the Seer', scope: 'combat', gear: ENCH_STAT.rangedStr.gear, jewel: ENCH_STAT.rangedStr.jewel };
  ENCH_POOL.staff = { slots: ['weapon'], magic: true, combat: ['magicDmg', 'critChance', 'critDmg', 'lifesteal'], skilling: [] };
  ENCH_POOL.headhands.combat.splice(2, 0, 'magicDmg');
  ENCH_POOL.jewelry.combat.splice(2, 0, 'magicDmg');
  edit('enchPoolFor', [['if(!!P.ranged !== !!it.ranged) continue;', 'if(!!P.ranged !== !!it.ranged) continue; if(!!P.magic !== !!it.magic) continue;']],
    'a staff rolls from the staff pool, the way a bow rolls from the bow pool');
  edit('enchUniquePoolFor', [
    ["if(it.cslot==='weapon') return it.ranged ?", "if(it.cslot==='weapon') return it.magic ? ['magicDmg','critChance','lifesteal','hpBoost'] : it.ranged ?"],
    ["return ['atkBoost','rangedStr','critChance','lifesteal','hpBoost'];", "return ['atkBoost','rangedStr','magicDmg','critChance','lifesteal','hpBoost'];"]
  ], 'the unique enchant on a staff is Magic damage');

  /* ══ 5. Combat Mastery: the Sorcery column ═════════════════════════════════ */
  MD.SORC.forEach(function (n) { var o = Object.assign({ tree: 'sorc' }, n); CMAST_NODES.push(o); CMAST_BY_ID[o.id] = o; });
  MD.SORC_BRIDGE.forEach(function (n) { var o = Object.assign({ tree: 'gs' }, n); CMAST_NODES.push(o); CMAST_BY_ID[o.id] = o; });
  if (typeof CMAST_COLS !== 'undefined' && CMAST_COLS.indexOf('sorc') < 0) CMAST_COLS.push('sorc');
  if (typeof CMAST_SEAM !== 'undefined') CMAST_SEAM.gs = ['magic', 'sorc'];
  if (typeof _CMAST_DISC !== 'undefined') {
    _CMAST_DISC.sorc = { name: 'Sorcery', pc: '#b9a4f0', dim: 'rgba(185,164,240,.42)', glow: 'rgba(185,164,240,.4)', far: 'rgba(185,164,240,.15)', hot: '#3c2a6a', warm: '#221a3a', wash: 'rgba(185,164,240,.045)', role: 'Magic offence: spell damage, runes, the elements.', sig: 'orb' };
    _CMAST_DISC.gs = { name: 'Warcaster', pc: '#cdb89a', dim: 'rgba(205,184,154,.42)', glow: 'rgba(205,184,154,.34)', far: 'rgba(205,184,154,.13)', hot: '#4a3e2a', warm: '#2a2418', wash: 'transparent', role: 'Warfare + Sorcery', sig: 'target' };
  }

  /* ══ 6. Runecrafting ═══════════════════════════════════════════════════════ */
  var o1 = function (k, v) { var o = {}; o[k] = v; return o; };
  var merge = function () { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; };
  /* Quarried, not smelted. 36 xp against copper's 44 on the same clock, so you
     quarry for the stone and never for the XP, the rule flax follows. */
  SKILLS.mining.acts.push({ id: 'mi_rs', name: 'Quarry runestone', lvl: 1, ms: 5600, xp: 36, spdMult: 0.5, minMs: 4000, out: { runestone: 1 } });

  SKILLS.runecrafting = { name: 'Runecrafting', icon: '\u{1F52E}', acts: [] };
  var R = SKILLS.runecrafting.acts;
  var an = function (n) { return (/^[AEIOU]/i.test(n) ? 'an ' : 'a ') + n; };
  MD.RUNES.forEach(function (r, i) {
    R.push({ id: 'rn_r_' + r.k, name: 'Carve ' + r.n + ' Runes', cat: 'runes', lvl: r.rn,
      ms: 4200 + i * 520, xp: Math.round(40 + i * 58), spdMult: Math.min(0.80, 0.52 + i * 0.038), minMs: 800 + i * 110,
      inp: merge({ runestone: r.stone }, r.fuel), out: o1(r.k + '_rune', MD.RUNE_BATCH * MD.runeClass(r.t)) });
  });
  MD.WOODS.forEach(function (w, i) {
    var rune = MD.RUNES[w.t - 1].k + '_rune';
    [['wand', 0], ['staff', 4]].forEach(function (v) {
      var F = MD.FAMILIES[v[0]];
      R.push({ id: 'rn_' + v[0] + '_' + w.k, name: 'Bind ' + an(w.n) + ' ' + F.label, cat: v[0] === 'wand' ? 'wands' : 'staves', lvl: w.rn + v[1],
        ms: 7000 + i * 900, xp: Math.round((v[0] === 'staff' ? 150 : 120) + i * (v[0] === 'staff' ? 190 : 160)),
        spdMult: Math.min(0.80, 0.55 + i * 0.04), minMs: 1500 + i * 180,
        inp: merge(o1(w.log, F.logs), o1(rune, F.runes * MD.runeClass(w.t)), w.t >= 3 ? { arcane_dust: (w.t - 2) * 4 } : {}), out: o1(w.k + '_' + v[0], 1) });
    });
  });
  MD.CLOTH.forEach(function (c, i) {
    if (!c.raid) {
      R.push({ id: 'rn_loom_' + c.k, name: 'Weave ' + c.n, cat: 'cloth', lvl: c.rn,
        ms: 2600 + i * 1300, xp: Math.round(34 + i * 12), spdMult: Math.min(0.85, 0.61 + i * 0.04), minMs: 420 + i * 230,
        inp: c.bolt, out: o1(c.k, 1) });
    }
    MD.ROBE.PIECE.forEach(function (p, j) {
      var n = MD.CLOTH_PER_PIECE[j];
      R.push({ id: 'rn_rb_' + c.k + '_' + p, name: c.n + ' ' + MD.ROBE.PIECE_NAME[j], cat: 'robes', subcat: p, lvl: c.rn + (c.raid ? 0 : [0, 3, 2, 0, 1][j]),
        ms: 4500 + i * 2100, xp: Math.round((48 + i * 36) * [1, 1.6, 1.25, 1.05, 1][j]),
        spdMult: Math.min(0.80, 0.51 + i * 0.035), minMs: 540 + i * 300,
        inp: c.raid ? merge(o1(c.cloth, n), j === 1 ? o1(c.rune, 1) : {}) : o1(c.k, n),
        out: o1(c.k + '_' + p, 1) });
    });
  });
  if (typeof SK_PFX !== 'undefined') SK_PFX.runecrafting = 'rn';
  if (typeof RAIL_GROUP !== 'undefined') RAIL_GROUP.runecrafting = 'produce';
  if (typeof SKILL_ACCENT !== 'undefined') SKILL_ACCENT.runecrafting = '#8f7bd0';
  ICONS.runecrafting = ICONS.magic || runeSVG('#b9a4f0');
  if (typeof TREES !== 'undefined' && typeof N === 'function') {
    var glyph = svg('<path d="M32 6 L52 18 L52 46 L32 58 L12 46 L12 18 Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M26 20 V44 M26 22 L38 30 L26 36" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>');
    TREES.runecrafting = MD.RN_TREE.map(function (n) {
      var f = function (r) { return n.text.replace('{v}', String(Math.round(r * n.per * 100) / 100)); };
      return N(n.id, n.name, glyph, n.max, n.req, f, function () { return n.per ? ('+' + n.per + ' a rank') : n.text; }, n.reqCape ? { reqCape: true } : undefined);
    });
  }
  if (typeof SKILL_CAPE !== 'undefined') SKILL_CAPE.runecrafting = 'cape_runecrafting';
  /* the acts above were pushed below the ACT LADDERS line, which the real change
     must not do; the ladders are rebuilt here so the prototype is honest about it */
  if (typeof buildActTierIndex === 'function') { buildActTierIndex(); sortAllActs(); buildActTierIndex(); }
  try { G('_enchCrafted=null'); } catch (e) {}

  /* potions: Alchemy, beside the Hawkeye pair */
  MD.POTIONS.forEach(function (p, i) {
    SKILLS.alchemy.acts.push({ id: 'al_c1' + i, name: 'Brew ' + p.n, lvl: p.lvl, ms: i ? 28500 : 17000, xp: i ? 920 : 350, spdMult: i ? 0.77 : 0.715, minMs: i ? 4485 : 2730, inp: p.inp, out: o1(p.id, 1) });
  });

  /* ══ 7. monsters ═══════════════════════════════════════════════════════════ */
  MONSTERS.forEach(function (m) { var e = MD.MON_EL[m.id]; if (e) { if (e[0]) m.weakEl = e[0]; if (e[1]) m.resistEl = e[1]; } });
  /* raid stages are monsters too: getMonster() falls back to RAID_MON_BY_ID */
  if (typeof RAID_MON_BY_ID !== 'undefined') for (var rid in MD.RAID_EL) { var rm = RAID_MON_BY_ID[rid], re = MD.RAID_EL[rid]; if (rm) { if (re[0]) rm.weakEl = re[0]; if (re[1]) rm.resistEl = re[1]; } }
  /* drops: the zone uniques, and the runes off anything that casts */
  if (typeof MONSTER_DROPS !== 'undefined') {
    MD.DROP_WEAPONS.forEach(function (d) {
      if (d.from.indexOf('mon:') !== 0) return;
      [[d.from.slice(4), d.chance]].concat(d.also || []).forEach(function (r) {
        if (MONSTER_DROPS[r[0]]) MONSTER_DROPS[r[0]].unshift({ id: d.id, chance: r[1] });
      });
    });
    MD.RUNE_DROPS.forEach(function (r) {
      var m = MONSTERS.filter(function (x) { return x.id === r[0]; })[0]; if (!m || !MONSTER_DROPS[r[0]]) return;
      var rk = MD.RUNES[0]; MD.RUNES.forEach(function (x) { if (x.rn <= m.lvl) rk = x; });
      MONSTER_DROPS[r[0]].push({ id: rk.k + '_rune', chance: r[1], qty: r[2].map(function (q) { return q * MD.runeClass(rk.t); }) });
    });
  }
  if (typeof RAIDS !== 'undefined') {
    MD.DROP_WEAPONS.forEach(function (d) {
      if (d.from.indexOf('raid:') !== 0) return;
      var raid = RAIDS.filter(function (x) { return x.id === d.from.slice(5); })[0];
      if (raid && raid.gearDrops) raid.gearDrops.push({ id: d.id, chance: d.chance });
    });
    var emp = RAIDS.filter(function (x) { return x.id === 'empyrean_throne'; })[0];
    if (emp && emp.gearDrops) MD.DAWNVEIL.pieces.forEach(function (p) { emp.gearDrops.push({ id: MD.DAWNVEIL.k + '_' + p, chance: MD.DAWNVEIL.chance }); });
  }
  if (typeof SPIRE_GEAR !== 'undefined' && SPIRE_GEAR.indexOf('faultline') < 0) SPIRE_GEAR.push('faultline');

  window.elementMult = function (mon, el) {
    if (!mon) return 1; el = el || activeElement();
    return mon.weakEl === el ? MD.WEAK_MULT : (mon.resistEl === el ? MD.RESIST_MULT : 1);
  };

  window.MAGE = { design: MD, touch: TOUCH, items: NEW, edit: edit, wrap: wrap };
})();

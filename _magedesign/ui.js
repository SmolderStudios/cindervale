/* Magic for Cindervale: the prototype's UI, laid over the real game for shoot.js.
 *
 * Every surface the page shows is the game drawing itself. The functions edited
 * here are the render functions that would really change; each edit is an exact
 * source string that has to be found, the same contract overlay.js keeps.
 *
 * Icons are flat placeholders. No art is proposed in this session.
 */
(function () {
  'use strict';
  var MD = window.MAGE_DESIGN, edit = MAGE.edit;
  var svg = function (b) { return '<svg class="ev-icon" viewBox="0 0 64 64">' + b + '</svg>'; };
  var EL = function (k) { return MD.ELEMENTS.filter(function (e) { return e.k === k; })[0]; };
  var ELSHAPE = {
    fire:   'M32 6 Q22 20 21 32 Q17 46 25 54 Q29 58 32 58 Q35 58 39 54 Q47 46 43 32 Q42 20 32 6 Z',
    frost:  'M32 6 V58 M9 19 L55 45 M55 19 L9 45 M32 6 L26 13 M32 6 L38 13 M32 58 L26 51 M32 58 L38 51',
    storm:  'M38 6 L16 34 H30 L24 58 L48 28 H34 Z',
    shadow: 'M44 10 A24 24 0 1 0 54 44 A19 19 0 1 1 44 10 Z'
  };
  MD.ELEMENTS.forEach(function (e) {
    ICONS['el_' + e.k] = svg('<path d="' + ELSHAPE[e.k] + '" fill="' + (e.k === 'frost' ? 'none' : e.col) + '" stroke="' + e.col + '" stroke-width="' + (e.k === 'frost' ? 4 : 2) + '" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>');
  });

  var css = document.createElement('style');
  /* the last rule freezes the damage numbers so a still photograph can show them */
  css.textContent = [
    /* the spell bar: eight buttons under your own health bar */
    '.cvspell{display:flex;gap:calc(5px*var(--tscale));margin-top:calc(2px*var(--tscale));align-items:stretch}',
    '.cvspell .cvspell-b{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:calc(4px*var(--tscale)) 4px;min-height:calc(40px*var(--tscale));line-height:1.15;font-size:calc(12.5px*var(--tscale));cursor:pointer}',
    '.cvspell .cvspell-b.csz{flex:0.85 1 0}',
    '.cvspell .cvspell-b.cel{flex:1.15 1 0}',
    '.cvspell .cvspell-b small{display:flex;align-items:center;gap:3px;font-size:calc(10.5px*var(--tscale));color:#8d7a5a;white-space:nowrap}',
    '.cvspell .cvspell-b small .ev-icon{width:calc(10px*var(--tscale));height:calc(10px*var(--tscale))}',
    '.cvspell .cvspell-b small.weak{color:#a8d79f}',
    '.cvspell .cvspell-b small.res{color:#e09a8f}',
    '.cvspell .cvspell-b.sel small:not(.weak):not(.res){color:#e9d9b8}',
    '.cvspell .cvspell-b.cel.sel{border-color:var(--el);box-shadow:inset 0 0 0 1px var(--el);color:#fff;background:rgba(40,28,62,.75)}',
    '.cvspell .cel-top{display:flex;align-items:center;gap:5px}',
    '.cvspell .cel-top .ev-icon{width:calc(14px*var(--tscale));height:calc(14px*var(--tscale));flex:none}',
    '.cvspell .cvspell-b:disabled{opacity:.42;cursor:default}',
    '.cvspell-sep{flex:0 0 1px;background:rgba(199,155,78,.25);margin:3px 2px}',
    /* the bar adds a row to the glass under the monster; take most of it back out of the padding so the glass does not climb over the monster's feet */
    '.cvstage-bottom .cvarena-bars:has(.cvspell){padding-top:calc(8px*var(--tscale));padding-bottom:calc(9px*var(--tscale))}',
    '.cvstage-bottom .cvarena-bars:has(.cvspell) .cvhp{margin-bottom:calc(3px*var(--tscale))}',
    /* The rail lets every panel shrink so the log can; with a fifth panel in it that
       squeezes all of them. Only the log gives way. */
    '.cvrail.r > .cvglass:not(.cvlogbox),.cvrail.r > .cmb-engage-btn{flex-shrink:0}',
    /* and when potions push it past the bottom, Food and potions scrolls, as a long food list already does */
    '.cvrail.r > .cvglass.cvfoodbox{display:flex;flex-direction:column;flex:0 1 auto;min-height:calc(104px*var(--tscale))}',
    /* the log gives up its spare lines first, and stops at its own minimum */
    '.cvrail.r > .cvglass.cvlogbox{flex:1 1000 auto;min-height:calc(97px*var(--tscale))}',
    /* All three style buttons read the same Magic level, so it is said once, in the
       heading, and the buttons fit on one line. */
    '.cel-on .cstyle-btns{flex-wrap:nowrap}',
    '.cel-on .cstyle-btns .cmb-style{flex:1 1 0;min-width:0;text-align:center;padding-left:0;padding-right:0}',
    '.cel-on .cstyle-btns .cst-lv{display:none}',
    '.cvrail.r > .cvglass.cvfoodbox > .cvfood-scroll{flex:1 1 auto;min-height:0}',
    '.cvammo{margin-left:6px}',
    '.cvammo .ev-icon{width:calc(13px*var(--tscale));height:calc(13px*var(--tscale))}',
    '.cvsplat.el-fire{color:#ff9a4a}.cvsplat.el-frost{color:#9fd8f0}.cvsplat.el-storm{color:#cdbcff}.cvsplat.el-shadow{color:#b98be8}',
    '.cg-chip.el{border-color:#5b4a8a;color:#cdbcff;background:#17122a}',
    '.mage-still .cvsplat{animation:none !important;opacity:1 !important}',
    '.cmb-warn{margin:0 0 8px;padding:8px 12px;border-radius:6px;border:1px solid #6a3a18;background:rgba(40,20,6,.8);color:#e0a24a;font-size:calc(13px*var(--tscale))}'
  ].join('\n');
  document.head.appendChild(css);

  /* ── the element panel, and the Magic readout when no staff is held ──────── */
  window.mageReadoutHTML = function () {
    if (usingMagic()) return '';
    return '<div class="cst-ranged" data-tip="Magic · Lv ' + cmbLvl('magic') + '&#10;&#10;Hold a staff or a wand and all three buttons train Magic instead of the stat they name.">'
      + iconHTML('magic') + '<span class="cr-nm">Magic</span><b class="cr-lv">' + cmbLvl('magic') + '</b><i class="cr-note">equip a staff to train it</i></div>';
  };
  window.mageTrainHeadHTML = function () {
    return usingMagic() ? '<span class="cvh-cmb">Magic ' + cmbLvl('magic') + '</span>' : '';
  };
  var RUNES_A_CAST = function (n) { return n + (n === 1 ? ' rune' : ' runes') + ' a cast'; };
  /* the lowest rune that can power each size, for the line a greyed button gives */
  var FIRST_RUNE = ['ash_rune', 'char_rune', 'forge_rune', 'starfall_rune'];
  /* ── the spell bar ────────────────────────────────────────────────────────
     Eight buttons under your own health bar: four sizes, then four elements. That
     strip is the widest free room in the arena. The right-hand rail is 235 px and
     already full, more so in a raid, where it also carries Momentum and the three
     abilities. The buttons work while the fight runs: a change applies from your
     next cast, and nothing has to be disengaged. */
  window.mageSpellBarHTML = function () {
    if (!usingMagic()) return '';
    var mon = getMonster(combat.monId), cur = activeElement();
    var a = readyAmmo(), cls = a ? runeClassOf(a) : 0, size = a ? spellSize() : 0, rune = a ? ITEMS[a] : null;
    var h = '<div class="cvspell" id="cmbSpellBar">';
    MD.SPELLS.forEach(function (s, i) {
      var n = i + 1, can = n <= cls, need = ITEMS[FIRST_RUNE[i]].name;
      var tip = can ? (EL(cur).n + ' ' + s.n + ': ' + RUNES_A_CAST(n) + ', +' + MD.spellPower(rune.runePow, cls, n) + ' Magic Power from ' + rune.name + 's.')
        : (a ? (s.n + ' needs ' + need + 's or better.') : 'Load runes to cast.');
      h += '<button class="cmb-style cvspell-b csz' + (n === size ? ' sel' : '') + '" data-spell="' + s.k + '" title="' + mmEsc(tip) + '"' + (can ? '' : ' disabled') + '>'
        + '<span class="cst-nm">' + s.n + '</span><small>' + (can ? (n + (n === 1 ? ' rune' : ' runes')) : (iconHTML('ui_lock') + need.replace(' Rune', ''))) + '</small></button>';
    });
    h += '<i class="cvspell-sep"></i>';
    MD.ELEMENTS.forEach(function (e) {
      var open = elementUnlocked(e.k);
      var tag = !open ? '<small>' + iconHTML('ui_lock') + 'Magic ' + e.lvl + '</small>'
        : (mon && mon.weakEl === e.k) ? '<small class="weak">weak +15%</small>'
        : (mon && mon.resistEl === e.k) ? '<small class="res">resists -15%</small>' : '<small>' + e.word + '</small>';
      var tip = e.n + ': ' + e.line + (!open ? ' Unlocks at Magic ' + e.lvl + '.'
        : (mon && mon.weakEl === e.k) ? ' ' + mon.name + ' is weak to it: +15% damage.'
        : (mon && mon.resistEl === e.k) ? ' ' + mon.name + ' resists it: -15% damage.' : '');
      h += '<button class="cmb-style cvspell-b cel' + (cur === e.k ? ' sel' : '') + '" data-el="' + e.k + '" title="' + mmEsc(tip) + '" style="--el:' + e.col + '"' + (open ? '' : ' disabled') + '>'
        + '<span class="cel-top">' + iconHTML('el_' + e.k) + '<span class="cst-nm">' + e.n + '</span></span>' + tag + '</button>';
    });
    return h + '</div>';
  };
  window.mageElementLine = function (k) { var e = EL(k); return e.n + ': ' + e.line; };
  /* a rune card lists the spells it powers, biggest first */
  window.mageRuneSpellsHTML = function (id) {
    var it = ITEMS[id], cls = runeClassOf(id), out = [];
    for (var n = cls; n >= 1; n--) out.push(MD.SPELLS[n - 1].n + ': ' + RUNES_A_CAST(n) + ', +' + MD.spellPower(it.runePow, cls, n) + ' Magic Power');
    return out.join('</div><div class="tt-sub">');
  };
  /* ── what is loaded, and how long it lasts: the readout arrows never got ─── */
  window.ammoMinutesLeft = function () {
    var q = eqQuiver(); if (!q) return 0;
    var n = (state.items[q] || 0), save = usingMagic() ? runeSaveRate() : 0;
    var perHr = (3600000 / playerSwingMs()) * (usingMagic() ? spellSize() : 1) * (1 - save);
    return perHr > 0 ? n / perHr * 60 : 0;
  };
  window.mageAmmoChipHTML = function () {
    if (!(usingMagic() || usingRanged())) return '';
    var q = eqQuiver(), n = q ? (state.items[q] || 0) : 0, ok = !!readyAmmo(), mins = ammoMinutesLeft();
    var st = !ok ? 'nofood' : (mins < 10 ? 'risk' : 'safe');
    var t = mins >= 60 ? (Math.floor(mins / 60) + 'h ' + Math.round(mins % 60) + 'm') : (Math.round(mins) + ' min');
    var word = usingMagic() ? 'runes' : 'shots';
    return '<span class="cveat cvammo ' + st + '" data-tip="' + (q ? ITEMS[q].name : 'Nothing loaded') + '&#10;Enough for about ' + t + ' at this speed.">'
      + (q ? iconHTML(q) : '') + (ok ? (usingMagic() ? spellName() + ' \u00b7 ' : '') + '<b>' + n.toLocaleString() + '</b> ' + word + ' \u00b7 about ' + t : 'no ' + word) + '</span>';
  };

  edit('renderCombat', [
    ["const statKey=rs?'ranged':k;", "const _ms=(typeof usingMagic==='function'&&usingMagic())?MAGE_DESIGN.STYLES[k]:null; const statKey=_ms?'magic':(rs?'ranged':k);"],
    ['const label=rs?rs.name:c.name;', 'const label=_ms?_ms.name:(rs?rs.name:c.name);'],
    ['const tip=(rs', "const tip=(_ms?(_ms.name+': '+_ms.blurb+'\\nMagic Lv '+pr.lvl):rs"],
    ["<div class=\"cvglass\">\n          <h4>Training</h4>", "<div class=\"cvglass${(typeof usingMagic==='function'&&usingMagic())?' cel-on':''}\">\n          <h4>Training${mageTrainHeadHTML()}</h4>"],
    ["<i class=\"cr-note\">equip a bow to train it</i>\n          </div>`}", "<i class=\"cr-note\">equip a bow to train it</i>\n          </div>`}${mageReadoutHTML()}"],
    ["${(typeof usingRanged==='function'&&usingRanged())?'':`<div class=\"cst-ranged\"", "${((typeof usingRanged==='function'&&usingRanged())||(typeof usingMagic==='function'&&usingMagic()))?'':`<div class=\"cst-ranged\""],
    ["<div class=\"cvglass\">\n          <h4>Food &amp; potions</h4>", "<div class=\"cvglass cvfoodbox\">\n          <h4>Food &amp; potions</h4>"],
    ["<span class=\"who\">${mmEsc(state.charName||'You')}</span>", "<span class=\"who\">${mmEsc(state.charName||'You')}</span>${mageAmmoChipHTML()}"],
    ["<div class=\"cmb-status\" id=\"cmbYouStatus\">${statusIconsHTML('you')}</div>\n            </div>", "<div class=\"cmb-status\" id=\"cmbYouStatus\">${statusIconsHTML('you')}</div>\n            </div>\n            ${mageSpellBarHTML()}"]
  ], 'the style row names the Magic styles, the spell bar sits under your health bar, and the spell and rune count sit on it');

  edit('cgDetailHTML', [
    ['<span class="cg-chip res">resists ${m.resistTo}</span>`:\'\'}',
     '<span class="cg-chip res">resists ${m.resistTo}</span>`:\'\'}${m.weakEl?`<span class="cg-chip weak">weak to ${DMG_TYPES[m.weakEl].n}</span>`:\'\'}${m.resistEl?`<span class="cg-chip res">resists ${DMG_TYPES[m.resistEl].n}</span>`:\'\'}']
  ], 'the monster card names the element it is weak to and the one it resists');

  edit('_gearStatsHTML', [
    ["if(b.rangedStr)  chips.push('+'+pc(b.rangedStr)+'% Ranged damage');",
     "if(b.rangedStr)  chips.push('+'+pc(b.rangedStr)+'% Ranged damage'); if(b.magicDmg) chips.push('+'+pc(b.magicDmg)+'% Magic damage');"
     + " if(typeof usingMagic==='function'&&usingMagic()){ chips.push('+'+(runePow()+(combatStats().mpow||0))+' Magic Power'); var _rsv=runeSaveRate(); if(_rsv>0) chips.push(pc(_rsv)+'% of casts keep their runes'); }"],
    ["+(heavy?'<span class=\"dk-chip bad\">Heavy armour: -'+heavy+'% ranged accuracy</span>':'')",
     "+((typeof usingMagic==='function'&&usingMagic())?((1-magicArmourMult())>0?'<span class=\"dk-chip bad\">Armour that is not cloth: -'+Math.round((1-magicArmourMult())*100)+'% Magic damage</span>':''):(heavy?'<span class=\"dk-chip bad\">Heavy armour: -'+heavy+'% ranged accuracy</span>':''))"]
  ], 'the Gear tab lists Magic damage, Magic Power, rune saving and what your armour costs a spell');

  edit('combatGearStatBlock', [
    ["+'</span>+'+s.rstr+' Ranged Str</span>');",
     "+'</span>+'+s.rstr+' Ranged Str</span>');"
     + " if(s.mpow) parts.push('<span style=\"color:#b9a4f0\"><span style=\"display:inline-block;font-size:calc(14px*var(--tscale));line-height:1;vertical-align:-2px;margin-right:2px\">'+iconHTML('magic')+'</span>+'+s.mpow+' Magic Power</span>');"
     + " if(s.runeSave) parts.push('<span style=\"color:#b9a4f0\">'+(Math.round(s.runeSave*1000)/10)+'% of casts keep their runes</span>');"],
    ["if(it.cslot==='weapon' && it.ranged){\n    var _dm=", "if(it.cslot==='weapon' && (it.ranged||it.magic)){\n    var _dm="],
    ["if(it.light) chips.push(_chip('#7fd8c8','ui_wind','Light armour'));",
     "if(it.cloth) chips.push(_chip('#b9a4f0','magic','Cloth · spells at full strength')); else if(it.light){ chips.push(_chip('#7fd8c8','ui_wind','Light armour')); chips.push(_chip('#b9a4f0','','-'+(Math.round(s.def*MAGE_DESIGN.ARMOUR.perDef*1000)/10)+'% Magic damage')); }"],
    ["chips.push(_chip('#e0762f','','-'+(Math.round(s.def*RANGED_PLATE_PER_DEF*1000)/10)+'% ranged accuracy'));",
     "chips.push(_chip('#e0762f','','-'+(Math.round(s.def*RANGED_PLATE_PER_DEF*1000)/10)+'% ranged accuracy')); chips.push(_chip('#b9a4f0','','-'+(Math.round(s.def*MAGE_DESIGN.ARMOUR.perDef*1000)/10)+'% Magic damage'));"],
    ["var chipLine=chips.length?", "if(it.aff&&DMG_TYPES[it.aff.el]) chips.push(_chip(DMG_TYPES[it.aff.el].col,'el_'+it.aff.el,'+'+Math.round(it.aff.dmg*100)+'% damage with '+DMG_TYPES[it.aff.el].n)); var chipLine=chips.length?"]
  ], 'an item card shows Magic Power, rune saving, cast speed, cloth, and what plate and leather cost a spell');

  edit('showItemTooltip', [
    ['if(it.ammo && !it.ranged){', 'if(it.ammo && !it.ranged && !it.magic){'],
    ["{ _meta.push('Ammunition'); _meta.push(it.ammo==='bolt'?'Crossbows':'Bows'); }", "{ _meta.push(it.ammo==='rune'?'Rune':'Ammunition'); _meta.push(it.ammo==='rune'?'Staves and wands':(it.ammo==='bolt'?'Crossbows':'Bows')); }"],
    ['if(!w||!w.ranged||!w.cgear||!ammoFitsWeapon(wid,itemId)) continue;', 'if(!w||!(w.ranged||w.magic)||!w.cgear||!ammoFitsWeapon(wid,itemId)) continue;'],
    ['+${it.ammoStr||0} Ranged Strength to every shot', "${it.runePow?mageRuneSpellsHTML(itemId):('+'+(it.ammoStr||0)+' Ranged Strength to every shot')}"],
    ['Fired by ${ITEMS[_lightest].name} or better', "${it.runePow?'Cast by':'Fired by'} ${ITEMS[_lightest].name} or better"],
    ['if(_hw&&_hw.ranged&&_hw.ammo===it.ammo){', 'if(_hw&&(_hw.ranged||_hw.magic)&&_hw.ammo===it.ammo){'],
    ['`✓ Your ${_hw.name} can fire it`', "`✓ Your ${_hw.name} can ${it.runePow?'cast':'fire'} it`"]
  ], 'a rune card lists the spells it powers and which staff can cast it');

  edit('buildMonLogHTML', [
    ['<span class="mldt-tag swings"><span class="mldt-t"><span class="mldt-k">Damage type</span>',
     '<span class="mldt-tag${sel.weakEl?\' weak\':\' none\'}"><span class="mldt-t"><span class="mldt-k">Weak to</span><span class="mldt-v">${sel.weakEl?DMG_TYPES[sel.weakEl].n:\'no element\'}</span></span><span class="mldt-n">${sel.weakEl?\'+15%\':\'\'}</span></span>'
     + '<span class="mldt-tag${sel.resistEl?\' resist\':\' none\'}"><span class="mldt-t"><span class="mldt-k">Resists</span><span class="mldt-v">${sel.resistEl?DMG_TYPES[sel.resistEl].n:\'no element\'}</span></span><span class="mldt-n">${sel.resistEl?\'\\u221215%\':\'\'}</span></span>'
     + '<span class="mldt-tag swings"><span class="mldt-t"><span class="mldt-k">Damage type</span>']
  ], 'the Monster Log adds the element a monster is weak to and the one it resists');

  /* the compare line under an item card names the two new stats */
  _GEAR_STAT_LABEL.mpow = 'Magic Power'; _GEAR_STAT_LABEL.runeSave = 'Rune saving';
  MAGE.wrap('_gearStatIsPct', function (orig) { return function (key) { return key === 'runeSave' || orig(key); }; }, 'rune saving reads as a percentage on an item card');

  /* the loadout tile stops saying Soon */
  COMBAT_LOADOUTS.forEach(function (d) { if (d.key === 'magic') { delete d.soon; d.sub = 'Staff or wand, and runes'; d.icon = 'magic'; } });

  /* The spell bar. Two things matter here, and both are traps in the real file:
     the buttons must work while a fight runs, and #combatPanel is rebuilt on every
     kill, so a click that straddles a kill loses its target. Act on the press. */
  document.addEventListener('pointerdown', function (e) {
    var z = e.target.closest ? e.target.closest('#cmbSpellBar [data-spell], #cmbSpellBar [data-el]') : null;
    if (!z || z.disabled) return;
    var msg;
    if (z.hasAttribute('data-spell')) { state.combatSpell = z.getAttribute('data-spell'); msg = function () { return spellName() + ': ' + RUNES_A_CAST(spellSize()) + '.'; }; }
    else { state.combatElement = z.getAttribute('data-el'); msg = function () { return mageElementLine(state.combatElement); }; }
    refreshCombatStats();
    cmbLog(msg(), 'sys');
    renderCombat();
    if (typeof updateCombatBars === 'function') updateCombatBars();
  });
})();

/* The states shoot.js photographs. Runs inside the page, after the prototype. */
window.__mage = function (scene) {
  var MD = window.MAGE_DESIGN;
  state = defaultState(); state.name = 'Ashwyn'; state.charName = 'Ashwyn'; normalizeState();
  var lv = { woodcutting: 78, mining: 71, fishing: 62, foraging: 64, smithing: 58, cooking: 69, alchemy: 49, firemaking: 66,
             agility: 41, jeweler: 37, farming: 44, crafting: 59, thieving: 30, fletching: 42, runecrafting: 66 };
  for (var k in lv) state.xp[k] = XP_CUM[lv[k]];
  state.combatXp = { attack: XP_CUM[41], strength: XP_CUM[40], defence: XP_CUM[58], hitpoints: XP_CUM[66], ranged: XP_CUM[22], magic: XP_CUM[64] };
  state.coins = 284320;
  state.items = { forge_rune: 5520, kiln_rune: 1240, cinder_rune: 480, cooked_trout: 64, cooked_tuna: 22, runestone: 212, charcoal: 90, ember_dust: 41, ash: 300,
    frost_staff: 1, frost_wand: 1, seers_eye: 1, cobalt_buckler: 1, cobalt_sword: 1, cobalt_shield: 1,
    seercloth_hood: 1, seercloth_robe: 1, seercloth_leggings: 1, seercloth_wraps: 1, seercloth_slippers: 1, cobalt_cape: 1,
    cobalt_chest: 1, troll_chest: 1, seercloth: 14, spider_silk: 60, frost_log: 40, arcane_dust: 55 };
  state.combatEquipped = { weapon: 'frost_staff', quiver: 'forge_rune', helmet: 'seercloth_hood', chest: 'seercloth_robe', legs: 'seercloth_leggings',
    gloves: 'seercloth_wraps', boots: 'seercloth_slippers', cape: 'cobalt_cape' };
  state.combatElement = 'shadow'; state.combatStyle = 'attack'; state.combatSpell = 'surge';
  for (var id in ITEMS) state.discovered[id] = 1;
  state.monKills = state.monKills || {}; MONSTERS.forEach(function (m) { state.monKills[m.id] = 25; });
  state.cmastGranted = 96;
  mmSlot = 1; mmAtMenu = false;
  document.getElementById('emberMenu').classList.add('mm-hidden');
  document.getElementById('charSelect').classList.add('mm-hidden');
  var d = document.getElementById('mmDestiny'); if (d) d.classList.add('mm-hidden');
  ['mmEaModal', 'mmSettingsModal', 'mmReportModal', 'mmIdeaModal', 'mmCreditsModal', 'mmNameModal', 'mmImportModal', 'mmExportModal', 'fuelModal', 'offlineModal'].forEach(function (i) {
    var e = document.getElementById(i); if (e) { e.classList.add('mm-hidden'); e.classList.add('hidden'); }
  });
  try { hideTooltip(); } catch (e) {}
  try { hideGearTip(); } catch (e) {}
  document.body.classList.add('mage-still');
  state.zone = 'ogre_stronghold'; state.zoneMode = 'dungeons'; state.cmbSubTab = 'arena';
  combat.active = false; combat.raid = null; combat.monId = 'ogre_houndmaster'; combat.log = [];
  rightTab = 'gear';
  if (typeof combatMode !== 'undefined') combatMode = false;
  try { updateModePanels(); } catch (e) {}
  renderAll();
  var info = {};

  function fightNow() {
    enterCombat();
    try { selectMonster('ogre_houndmaster'); } catch (e) {}
    try { engageCombat(); } catch (e) { info.err = String(e); }
  }
  /* the spell bar: how big its buttons are, and what it does to the bottom of the arena */
  function barRoom() {
    var bar = document.getElementById('cmbSpellBar'); if (!bar) return null;
    var r = function (e) { var b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top), bottom: Math.round(b.bottom) }; };
    var sz = bar.querySelector('.csz'), el = bar.querySelector('.cel'), glass = bar.closest('.cvglass'), stage = document.querySelector('.cvstage');
    var foe = document.querySelector('.cvarena-foe, .cvfoe, .cvstage-foe') || null, floor = document.querySelector('.cvstage-floor');
    var o = { bar: r(bar), size: r(sz), element: r(el), glass: r(glass), stage: r(stage), buttons: bar.querySelectorAll('button').length,
      live: bar.querySelectorAll('button:not([disabled])').length, fightRunning: !!combat.active };
    o.clipped = [].some.call(bar.querySelectorAll('button'), function (b) { return b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1; });
    if (foe) o.foe = r(foe);
    return o;
  }
  /* how much room the right-hand rail has */
  function railRoom() {
    var rail = document.querySelector('.cvrail.r'); if (!rail) return null;
    var log = rail.querySelector('.cmb-log'), el = null, kids = [].slice.call(rail.children);
    var o = { rail: rail.clientHeight, max: Math.round(parseFloat(getComputedStyle(rail).maxHeight) || 0),
      panels: kids.map(function (c) { return [(c.querySelector('h4') || c).textContent.trim().slice(0, 18), c.offsetHeight, c.scrollHeight]; }),
      element: el ? el.offsetHeight : 0, logNow: log ? log.clientHeight : 0, logMin: log ? Math.round(parseFloat(getComputedStyle(log).minHeight) || 0) : 0,
      gap: Math.round(parseFloat(getComputedStyle(rail).rowGap) || 0), tscale: +(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tscale')) || 1).toFixed(3) };
    o.clipped = kids.some(function (c) { return c.scrollHeight > c.clientHeight + 1 && !c.classList.contains('cvlogbox'); });
    return o;
  }
  if (scene === 'fight' || scene === 'full') {
    fightNow();
    combat.foeHp = Math.round(combat.foeMaxHp * 0.58);
    cmbLog('Shadow Wave hits the Ogre Houndmaster for 198.', 'hit');
    cmbLog('Ogre Houndmaster hits you for 61.', 'foe');
    cmbLog('Shadow Wave <span style="color:#ffd700">crits</span> the Ogre Houndmaster for 412.', 'hit');
    renderCombat(); updateCombatBars();
    cmbSplat(198, 'hit el-shadow'); cmbSplat(412, 'crit el-shadow'); cmbSplat('+5', 'mend');
    info.spell = spellName(); info.size = spellSize(); info.pow = runePow();
    info.acc = playerAccuracy(); info.hit = playerMaxHit(); info.swing = playerSwingMs(); info.mins = Math.round(ammoMinutesLeft());
    info.room = railRoom(); info.bar = barRoom();
    /* the same rail with two potions in the satchel, measured and put back */
    var pots = ['ironhide_2', 'berserker_2'].filter(function (i) { return ITEMS[i]; });
    pots.forEach(function (i) { state.items[i] = 4; }); renderCombat();
    info.roomPotions = railRoom(); info.potions = combatBuffItems().length;
    pots.forEach(function (i) { delete state.items[i]; }); renderCombat(); updateCombatBars();
    cmbSplat(198, 'hit el-shadow'); cmbSplat(412, 'crit el-shadow'); cmbSplat('+5', 'mend');
  }
  if (scene === 'dry') {
    state.items.forge_rune = 114; state.combatElement = 'fire';
    fightNow();
    renderCombat(); updateCombatBars();
    cmbSplat(141, 'hit el-fire'); cmbSplat(9, 'burn');
    info.mins = +ammoMinutesLeft().toFixed(1);
  }
  if (scene === 'out') {
    state.items.forge_rune = 2; state.combatElement = 'frost';
    fightNow();
    delete state.items.forge_rune;
    combat.youSwingStart = Date.now() - 60000;
    try { combatTick(); } catch (e) { info.err = String(e); }
    info.active = combat.active;
  }
  if (scene === 'nostaff') {
    state.combatEquipped.weapon = 'cobalt_sword'; state.combatEquipped.shield = 'cobalt_shield'; delete state.combatEquipped.quiver;
    refreshCombatStats();
    fightNow(); renderCombat();
  }
  if (scene === 'picker') { enterCombat(); try { selectMonster('ogre_houndmaster'); } catch (e) {} renderCombat(); }
  /* Changing the spell while the fight runs: a real press on the Blast button, the
     way a player would do it, with the fight still active afterwards. */
  if (scene === 'switch') {
    fightNow();
    combat.foeHp = Math.round(combat.foeMaxHp * 0.81);
    cmbLog('Shadow Wave hits the Ogre Houndmaster for 214.', 'hit');
    renderCombat(); updateCombatBars();
    info.before = { spell: spellName(), hit: combat.youMaxHit, mins: Math.round(ammoMinutesLeft()) };
    var btn = document.querySelector('#cmbSpellBar [data-spell="blast"]');
    if (btn) btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    cmbLog('Shadow Blast hits the Ogre Houndmaster for 187.', 'hit');
    renderCombat(); updateCombatBars();
    cmbSplat(187, 'hit el-shadow');
    info.after = { spell: spellName(), hit: combat.youMaxHit, mins: Math.round(ammoMinutesLeft()), stillFighting: !!combat.active };
    info.bar = barRoom();
  }
  /* a raid: the rail also carries Momentum and the three abilities, the bar does not move */
  if (scene === 'raid') {
    state.combatXp.magic = XP_CUM[82]; state.combatXp.defence = XP_CUM[76]; state.combatXp.hitpoints = XP_CUM[80];
    state.combatEquipped.weapon = 'ancient_staff'; state.combatEquipped.quiver = 'crucible_rune'; state.items.ancient_staff = 1; state.items.crucible_rune = 9000;
    refreshCombatStats();
    enterCombat();
    try { startRaid('sunken_barrow'); } catch (e) { info.err = String(e); }
    renderCombat(); updateCombatBars();
    info.raid = !!combat.raid; info.active = !!combat.active; info.cl = combatLevel();
    info.room = railRoom(); info.bar = barRoom();
  }
  /* between fights: the buttons are live, and picking one says what it does */
  if (scene === 'choose') {
    state.combatElement = 'fire';
    fightNow(); fleeCombat();
    state.cmbView = 'fight';
    combat.log = []; state.combatElement = 'shadow'; refreshCombatStats();
    cmbLog(spellName() + ': ' + spellSize() + ' runes a cast.', 'sys');
    cmbLog(mageElementLine('shadow'), 'sys');
    renderCombat(); updateCombatBars();
    info.room = railRoom(); info.bar = barRoom();
  }
  if (scene === 'nostaff') info.room = railRoom();
  if (scene === 'gear') { enterCombat(); rightTab = 'gear'; renderRightPanel(); }
  if (scene === 'loadouts') {
    state.combatPresets = state.combatPresets || {};
    state.combatPresets.magic = JSON.parse(JSON.stringify(state.combatEquipped));
    state.combatPresets.melee = { weapon: 'cobalt_sword', shield: 'cobalt_shield', chest: 'cobalt_chest' };
    enterCombat(); rightTab = 'presets'; _loScope = 'combat'; renderRightPanel(); renderPresets();
  }
  function tip(id) {
    enterCombat();
    showItemTooltip(id, 700, 220, '');
    var t = (typeof ttEl === 'function') ? ttEl() : null;
    info.tip = t ? t.textContent.slice(0, 160) : 'no tooltip element';
  }
  if (scene === 'tipstaff') tip('seers_eye');
  if (scene === 'tiprobe') tip('seercloth_robe');
  if (scene === 'tiprune') tip('forge_rune');
  if (scene === 'tipplate') tip('cobalt_chest');
  if (scene === 'mlog') { enterCombat(); state.cmbSubTab = 'log'; state.monLogZone = 'ogre_stronghold'; state.monLogSel = 'ogre_houndmaster'; state.monLogMon = 'ogre_houndmaster'; renderCombat(); }
  if (scene === 'mastery') {
    enterCombat(); state.cmbSubTab = 'mastery';
    ['s_t1', 's_t2_l', 's_t2_r', 's_t3_l'].forEach(function (n, i) { state.cmast[n] = [4, 5, 3, 1][i]; });
    ['m_t1', 'k_t1', 'r_t1', 'g_t1'].forEach(function (n) { state.cmast[n] = 4; });
    renderCombat();
    var cv = document.querySelector('.cmast-canvas'), gr = document.querySelector('.cmast-grid');
    if (cv && gr) {
      info.boardNeeds = gr.scrollWidth; info.panelShows = cv.clientWidth;
      var st = document.createElement('style'); st.id = 'mage-wide';
      info.scale = +(cv.clientWidth / gr.scrollWidth).toFixed(3);
      st.textContent = '.cmast-grid{zoom:' + info.scale + '}';
      document.head.appendChild(st);
    }
  } else { var old = document.getElementById('mage-wide'); if (old) old.remove(); }
  if (scene === 'skill' || scene === 'tree') {
    selectedSkill = 'runecrafting'; viewTab = 'acts';
    renderAll();
    if (scene === 'tree') { try { viewTab = 'tree'; renderAll(); } catch (e) { info.err = String(e); } }
    info.acts = SKILLS.runecrafting.acts.length;
  }
  if (scene === 'welcome') {
    var nm = function (id, qty) { return { id: id, name: ITEMS[id].name, qty: qty }; };
    var lines = [
      { iconId: 'ui_sword', label: 'Offline Combat', sub: 'Ogre Houndmaster \u00d7212 \u00b7 stopped after 5h 10m, you ran out of Forge Runes', xp: 96400,
        items: [nm('ogre_meat', 55), nm('warhound_fang', 41), nm('ogre_hide', 38)] },
      { iconId: 'forge_rune', label: 'Runes', sub: '5,520 Forge Runes spent on Shadow Wave \u00b7 149 casts kept theirs', xp: 0 },
      { iconId: 'runecrafting', label: 'Runecrafting', sub: 'Carve Forge Runes \u00d7140', xp: 46200, items: [nm('forge_rune', 10500)] }
    ];
    try { showOfflineSummary(8 * 3600000, lines, { awayRaw: 8 * 3600000, totalXp: 128200, totalLevels: 1, totalItems: 3634 }); } catch (e) { info.err = String(e); }
    var om = document.getElementById('offlineModal'); if (om) { om.classList.remove('hidden'); om.classList.remove('mm-hidden'); }
  }
  return info;
};

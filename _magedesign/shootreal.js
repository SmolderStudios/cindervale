/* Photograph Magic in the REAL game file. No prototype is laid over it.
 *
 *     node _magedesign/shootreal.js              every scene -> shots/real/*.png
 *     node _magedesign/shootreal.js fight raid   only those
 *
 * shoot.js photographs the design: build 0.9.127.3 with overlay.js and ui.js on
 * top. This is its twin for the build that has Magic in it. A working copy of
 * cindervale.html is written beside this file with only the scene script
 * appended, loaded in headless Chrome as Electron (a browser user agent is the
 * demo build), photographed, and deleted. The game file is only read. Net access
 * is shimmed off and localStorage is in memory, so nothing here can ping
 * telemetry or touch a save.
 *
 * Each scene also MEASURES what it shows (button sizes, what clips, how much room
 * the rail has) into shots/real/meta.json, because a picture that looks right and
 * a button that is 38 px tall are not the same thing.
 */
'use strict';
const path = require('path'), fs = require('fs');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(path.join(KIT, 'node_modules/puppeteer-core'));
const CHROME = path.join(KIT, 'browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'shots', 'real'); fs.mkdirSync(OUT, { recursive: true });

const SHIM = `<script>
(function(){var mem={};var shim={getItem:function(k){return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null;},
setItem:function(k,v){mem[k]=String(v);},removeItem:function(k){delete mem[k];},clear:function(){mem={};},
key:function(i){return Object.keys(mem)[i]||null;}};
Object.defineProperty(shim,'length',{get:function(){return Object.keys(mem).length;}});
try{Object.defineProperty(window,'localStorage',{value:shim,configurable:true,writable:true});}catch(e){}
window.fetch=function(){return new Promise(function(_,r){r(new Error('preview: net off'));});};
if(navigator.sendBeacon)try{navigator.sendBeacon=function(){return false;};}catch(e){}
})();
</script>
`;

/* ── the scenes: runs inside the page ─────────────────────────────────────── */
function SCENES_IN_PAGE() {
  window.__mage = function (scene) {
    state = defaultState(); state.name = 'Ashwyn'; state.charName = 'Ashwyn'; normalizeState();
    var HAS_ROBES = !!ITEMS.seercloth_robe;
    var lv = { woodcutting: 78, mining: 71, fishing: 62, foraging: 64, smithing: 58, cooking: 69, alchemy: 49, firemaking: 66,
               agility: 41, jeweler: 37, farming: 44, crafting: 59, thieving: 30, fletching: 42, runecrafting: 66 };
    for (var k in lv) state.xp[k] = XP_CUM[lv[k]];
    state.combatXp = { attack: XP_CUM[41], strength: XP_CUM[40], defence: XP_CUM[58], hitpoints: XP_CUM[66], ranged: XP_CUM[22], magic: XP_CUM[64] };
    state.coins = 284320;
    state.items = { forge_rune: 5520, kiln_rune: 1240, cinder_rune: 480, cooked_trout: 64, cooked_tuna: 22, runestone: 212, charcoal: 90, ember_dust: 41, ash: 300,
      frost_staff: 1, frost_wand: 1, shadow_staff: 1, cobalt_buckler: 1, cobalt_sword: 1, cobalt_shield: 1, cobalt_cape: 1,
      cobalt_chest: 1, troll_chest: 1, spider_silk: 60, frost_log: 40, arcane_dust: 55 };
    state.combatEquipped = { weapon: 'frost_staff', quiver: 'forge_rune', cape: 'cobalt_cape' };
    if (HAS_ROBES) {
      ['hood', 'robe', 'leggings', 'wraps', 'slippers'].forEach(function (p, i) { state.items['seercloth_' + p] = 1; state.combatEquipped[['helmet', 'chest', 'legs', 'gloves', 'boots'][i]] = 'seercloth_' + p; });
      state.items.seercloth = 14;
    } else {
      ['helm', 'chest', 'legs', 'gloves', 'boots'].forEach(function (p, i) { state.combatEquipped[['helmet', 'chest', 'legs', 'gloves', 'boots'][i]] = 'troll_' + p; state.items['troll_' + p] = 1; });
    }
    state.combatElement = elementUnlocked('shadow') ? 'shadow' : 'fire'; state.combatStyle = 'attack'; state.combatSpell = 'surge';
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
    var EL = spellElement();

    function fightNow() {
      enterCombat();
      try { selectMonster('ogre_houndmaster'); } catch (e) {}
      try { engageCombat(); } catch (e) { info.err = String(e); }
    }
    var box = function (e) { var b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
    /* the spell bar: how big its buttons are, whether anything in it clips, and
       how far the glass it sits in climbs up the monster */
    function barRoom() {
      var bar = document.getElementById('cmbSpellBar'); if (!bar) return null;
      var btns = [].slice.call(bar.querySelectorAll('button'));
      var glass = bar.closest('.cvglass'), stage = document.querySelector('.cvstage'), foe = document.querySelector('.cvarena-foe'), art = document.querySelector('.cvarena-art');
      var o = { bar: box(bar), glass: box(glass), stage: box(stage), buttons: btns.length, live: btns.filter(function (b) { return !b.disabled; }).length, fightRunning: !!combat.active };
      o.sizes = btns.map(function (b) { var r = b.getBoundingClientRect(); return [b.getAttribute('data-spell') || b.getAttribute('data-el'), Math.round(r.width), Math.round(r.height)]; });
      o.minW = Math.min.apply(null, o.sizes.map(function (s) { return s[1]; })); o.minH = Math.min.apply(null, o.sizes.map(function (s) { return s[2]; }));
      o.clipped = btns.filter(function (b) { return b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1; }).map(function (b) { return b.getAttribute('data-spell') || b.getAttribute('data-el'); });
      /* text inside a button that runs past the button's own box */
      o.spill = btns.filter(function (b) { var r = b.getBoundingClientRect(); return [].some.call(b.querySelectorAll('span,small'), function (c) { var q = c.getBoundingClientRect(); return q.left < r.left - 0.5 || q.right > r.right + 0.5; }); }).map(function (b) { return b.getAttribute('data-spell') || b.getAttribute('data-el'); });
      if (foe) o.foe = box(foe);
      if (art) { o.art = box(art); o.glassOverArt = Math.max(0, o.art.bottom - o.glass.top); }
      var chip = document.getElementById('cmbAmmoChip'), lab = chip && chip.closest('.lab');
      if (chip && lab) { o.chip = chip.textContent.trim(); o.chipCls = chip.className; o.labOverflow = lab.scrollWidth > lab.clientWidth + 1; }
      o.statusYou = document.querySelectorAll('#cmbYouStatus .st-ic').length; o.statusFoe = document.querySelectorAll('#cmbFoeStatus .st-ic').length;
      return o;
    }
    /* how much room the right-hand rail has, and whether any panel in it clips */
    function railRoom() {
      var rail = document.querySelector('.cvrail.r'); if (!rail) return null;
      var log = rail.querySelector('.cmb-log'), kids = [].slice.call(rail.children);
      var o = { rail: rail.clientHeight, scroll: rail.scrollHeight, max: Math.round(parseFloat(getComputedStyle(rail).maxHeight) || 0),
        panels: kids.map(function (c) { return [(c.querySelector('h4') || c).textContent.trim().slice(0, 18), c.offsetHeight, c.scrollHeight]; }),
        logNow: log ? log.clientHeight : 0,
        tscale: +(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tscale')) || 1).toFixed(3) };
      o.clipped = kids.filter(function (c) { return c.scrollHeight > c.clientHeight + 1 && !c.classList.contains('cvlogbox') && !c.classList.contains('cvfoodbox'); }).map(function (c) { return (c.querySelector('h4') || c).textContent.trim().slice(0, 18); });
      var stage = document.querySelector('.cvstage');
      if (stage) o.pastStage = Math.max(0, Math.round(rail.getBoundingClientRect().bottom - stage.getBoundingClientRect().bottom));
      var sb = rail.querySelectorAll('.cstyle-btns .cmb-style');
      o.styleRow = [].map.call(sb, function (b) { var r = b.getBoundingClientRect(); return [b.textContent.trim(), Math.round(r.top), Math.round(r.height)]; });
      return o;
    }
    function splats(list) { list.forEach(function (s) { cmbSplat(s[0], s[1]); }); }

    if (scene === 'fight' || scene === 'full') {
      fightNow();
      combat.foeHp = Math.round(combat.foeMaxHp * 0.58);
      renderCombat(); updateCombatBars();
      splats([[198, 'hit el-' + EL], [412, 'crit el-' + EL]]);
      info.spell = spellName(); info.size = spellSize(); info.pow = runePow();
      info.acc = playerAccuracy(); info.hit = playerMaxHit(); info.swing = playerSwingMs(); info.mins = Math.round(ammoMinutesLeft());
      info.room = railRoom(); info.bar = barRoom();
    }
    /* the same fight with potions in the satchel and status icons under BOTH bars */
    if (scene === 'busy') {
      ['ironhide_2', 'berserker_2', 'honed_edge_2', 'warriors_brew'].forEach(function (i) { if (ITEMS[i]) state.items[i] = 4; });
      fightNow();
      combat.foeHp = Math.round(combat.foeMaxHp * 0.44);
      var now = Date.now();
      combat.foeStatus = { burn: { tickDmg: 6, until: now + 60000, last: now }, poison: { stacks: 3, tickDmg: 9, until: now + 60000, last: now }, stun: { until: now + 60000 } };
      state.effects = [{ _itemId: 'ironhide_2', def: 4, expires: now + 600000 }, { _itemId: 'honed_edge_2', atk: 4, expires: now + 600000 }, { _itemId: 'berserker_2', str: 4, expires: now + 600000 }];
      combat.regens = [{ rate: 1, until: now + 600000, last: now, acc: 0 }];
      renderCombat(); updateCombatBars();
      splats([[141, 'hit el-' + EL], [9, 'burn'], [12, 'poison']]);
      info.room = railRoom(); info.bar = barRoom(); info.potions = combatBuffItems().length;
    }
    if (scene === 'dry') {
      state.items.forge_rune = 114; state.combatElement = 'fire';
      fightNow();
      renderCombat(); updateCombatBars();
      splats([[141, 'hit el-fire'], [9, 'burn']]);
      info.mins = +ammoMinutesLeft().toFixed(1); info.bar = barRoom();
    }
    if (scene === 'out') {
      state.items.forge_rune = 2;
      fightNow();
      delete state.items.forge_rune;
      combat.youSwingStart = Date.now() - 60000;
      try { combatTick(); } catch (e) { info.err = String(e); }
      info.active = combat.active; info.log = combat.log.map(function (l) { return l.t; }).slice(-2);
    }
    if (scene === 'nostaff') {
      state.combatEquipped.weapon = 'cobalt_sword'; state.combatEquipped.shield = 'cobalt_shield'; delete state.combatEquipped.quiver;
      refreshCombatStats();
      fightNow(); renderCombat();
      info.room = railRoom();
      info.lines = [].map.call(document.querySelectorAll('.cst-ranged,.cst-magic'), function (e) { return e.textContent.replace(/\s+/g, ' ').trim(); });
    }
    /* an archer gets the readout line too */
    if (scene === 'bow') {
      state.combatXp.ranged = XP_CUM[60];
      state.items.frost_shortbow = 1; state.items.cobalt_arrow = 640;
      state.combatEquipped = { weapon: 'frost_shortbow', quiver: 'cobalt_arrow', cape: 'cobalt_cape' };
      ['helm', 'chest', 'legs', 'gloves', 'boots'].forEach(function (p, i) { state.combatEquipped[['helmet', 'chest', 'legs', 'gloves', 'boots'][i]] = 'troll_' + p; state.items['troll_' + p] = 1; });
      refreshCombatStats();
      fightNow(); renderCombat(); updateCombatBars();
      var chip = document.getElementById('cmbAmmoChip');
      info.chip = chip ? chip.textContent.trim() : ''; info.room = railRoom(); info.barShown = !!document.getElementById('cmbSpellBar');
    }
    /* Changing the spell while the fight runs: a real press on the Blast button, the
       way a player would do it, with the fight still active afterwards. */
    if (scene === 'switch') {
      fightNow();
      combat.foeHp = Math.round(combat.foeMaxHp * 0.81);
      renderCombat(); updateCombatBars();
      info.before = { spell: spellName(), hit: combat.youMaxHit, mins: Math.round(ammoMinutesLeft()) };
      var btn = document.querySelector('#cmbSpellBar [data-spell="blast"]');
      if (btn) btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      updateCombatBars();
      splats([[187, 'hit el-' + EL]]);
      info.after = { spell: spellName(), hit: combat.youMaxHit, mins: Math.round(ammoMinutesLeft()), stillFighting: !!combat.active, log: combat.log.map(function (l) { return l.t; }).slice(-1)[0] };
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
      var b0 = spellName();
      var el = document.querySelector('#cmbSpellBar [data-el]:not([disabled]):not(.sel)');
      if (el) el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      info.changedInRaid = [b0, spellName(), !!combat.raid && !!combat.active];
      info.room = railRoom(); info.bar = barRoom();
    }
    /* between fights: the buttons are live there too */
    if (scene === 'choose') {
      fightNow(); fleeCombat();
      state.cmbView = 'fight';
      combat.log = [];
      var e2 = document.querySelector('#cmbSpellBar [data-spell="bolt"]');
      renderCombat();
      e2 = document.querySelector('#cmbSpellBar [data-spell="bolt"]');
      if (e2) e2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      info.style = state.combatStyle; info.spell = spellName();
      info.room = railRoom(); info.bar = barRoom();
    }
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
      info.tip = t ? t.textContent.replace(/\s+/g, ' ').slice(0, 400) : 'no tooltip element';
    }
    if (scene === 'tipstaff') tip('shadow_staff');
    if (scene === 'tipwand') tip('frost_wand');
    if (scene === 'tiprobe') tip(HAS_ROBES ? 'seercloth_robe' : 'troll_chest');
    if (scene === 'tiprune') tip('forge_rune');
    if (scene === 'tipplate') tip('cobalt_chest');
    if (scene === 'tipleather') tip('troll_chest');
    if (scene === 'picker') { enterCombat(); try { selectMonster('ogre_houndmaster'); } catch (e) {} renderCombat(); }
    if (scene === 'mlog') { enterCombat(); state.cmbSubTab = 'log'; state.monLogZone = 'ogre_stronghold'; state.monLogSel = 'ogre_houndmaster'; state.monLogMon = 'ogre_houndmaster'; renderCombat(); }
    if (scene === 'mastery') { enterCombat(); state.cmbSubTab = 'mastery'; ['m_t1', 'k_t1', 'r_t1', 'g_t1'].forEach(function (n) { state.cmast[n] = 4; }); renderCombat(); }
    if (scene === 'skill' || scene === 'tree') {
      selectedSkill = 'runecrafting'; viewTab = 'acts';
      state.tree.runecrafting = { rn_speed: 12, rn_xp: 10, rn_double: 8, rn_save: 10, rn_batch: 6, rn_acc: 4 };
      renderAll();
      if (scene === 'tree') { try { viewTab = 'tree'; renderAll(); } catch (e) { info.err = String(e); } }
      info.acts = SKILLS.runecrafting.acts.length;
      info.cats = (function () { var c = {}; SKILLS.runecrafting.acts.forEach(function (a) { c[a.cat] = (c[a.cat] || 0) + 1; }); return c; })();
    }
    /* The icon contact sheet: every new icon as the game holds it, off ICONS and the
       tree, at the three sizes the game draws them (an item card, a satchel tile,
       the skill rail). */
    if (scene === 'sheet') {
      var old = document.getElementById('mageSheet'); if (old) old.remove();
      var isR = function (id) { return isRune(id); };
      var runes = Object.keys(ITEMS).filter(isR).sort(function (a, b) { return ITEMS[a].ammoTier - ITEMS[b].ammoTier; });
      var byTier = function (a, b) { return ITEMS[a].ctier - ITEMS[b].ctier; };
      var wands = Object.keys(ITEMS).filter(function (id) { return ITEMS[id].magic && ITEMS[id].mfam === 'wand' && !ITEMS[id]._variant; }).sort(byTier);
      var staves = Object.keys(ITEMS).filter(function (id) { return ITEMS[id].magic && ITEMS[id].mfam === 'staff' && !ITEMS[id]._variant; }).sort(byTier);
      var cell = function (name, svg, note) {
        return '<div class="c"><div class="b"><div class="s1">' + svg + '</div><div class="s2">' + svg + '</div><div class="s3">' + svg + '</div></div><span>' + name + '</span>' + (note ? '<i>' + note + '</i>' : '') + '</div>';
      };
      var item = function (id) { return cell(ITEMS[id] ? ITEMS[id].name : id, iconHTML(id)); };
      var sec = function (title, sub, cells) { return '<h2>' + title + '<small>' + sub + '</small></h2><div class="row">' + cells.join('') + '</div>'; };
      /* The heading counts painted against drawn itself (an <img> is painted art, an
         <svg> is a generator), so it cannot go stale the way a fixed line did. */
      var h = '<h1>Magic and Runecrafting: the icons, build ' + document.querySelector('.mm-ver').getAttribute('data-build') + '</h1>'
        + '<p>Every icon below is what the game file holds today: <span id="mageSheetN"></span>. Each is shown at 76, 34 and 18 px.</p>';
      h += sec('Runestone and runes', 'one stone, a glow for each grade', ['runestone'].concat(runes).map(item));
      h += sec('Wands', 'one silhouette, seven woods', wands.map(item));
      h += sec('Staves', 'one silhouette, seven woods', staves.map(item));
      h += sec('Cloth', 'one bolt, seven cloths', CLOTH_TIERS.map(function (c) { return item(c.key); }));
      ['hood', 'robe', 'leggings', 'wraps', 'slippers'].forEach(function (p) {
        h += sec('Robes: ' + p, 'one silhouette, seven cloths', CLOTH_TIERS.map(function (c) { return item(c.key + '_' + p); }));
      });
      h += sec('Skill, cape and elements', 'the rail icon, the Runecrafting Cape, and the four marks on the spell bar',
        [cell('Runecrafting', iconHTML('runecrafting')), cell('Runecrafting Cape', iconHTML('cape_runecrafting'))].concat(MAGIC_ELEMENTS.map(function (e) { return cell(e.n, iconHTML('el_' + e.k)); })));
      h += sec('Tree plates', 'the sixteen Runecrafting nodes', TREES.runecrafting.map(function (n) { return cell(n.name, n.icon, String(n.desc(n.max))); }));
      var d0 = document.createElement('div'); d0.id = 'mageSheet'; d0.innerHTML = h;
      var st = document.createElement('style');
      st.textContent = '#mageSheet{position:absolute;left:0;top:0;z-index:99999;width:1560px;box-sizing:border-box;background:#120c07;color:#d9c8a4;font:13px/1.35 Georgia,serif;padding:22px 24px 30px}'
        + '#mageSheet h1{font:600 20px Georgia;color:#e8d8b0;margin:0 0 4px}#mageSheet p{margin:0 0 6px;color:#a8946c}'
        + '#mageSheet h2{font:600 13px Georgia;letter-spacing:2px;text-transform:uppercase;color:#c79b4e;margin:20px 0 8px;border-bottom:1px solid #3a2a18;padding-bottom:4px}'
        + '#mageSheet h2 small{font:italic 12px Georgia;letter-spacing:0;text-transform:none;color:#8a7654;margin-left:12px}'
        + '#mageSheet .row{display:flex;flex-wrap:wrap;gap:10px}'
        + '#mageSheet .c{background:#1d140c;border:1px solid #3a2a18;border-radius:6px;padding:9px 9px 7px;display:flex;flex-direction:column;align-items:center;gap:4px;width:152px;box-sizing:border-box}'
        + '#mageSheet .b{display:flex;align-items:flex-end;gap:9px;height:78px}'
        + '#mageSheet .ev-icon{display:block}#mageSheet .s1 .ev-icon{width:76px;height:76px}#mageSheet .s2 .ev-icon{width:34px;height:34px}#mageSheet .s3 .ev-icon{width:18px;height:18px}'
        + '#mageSheet .c span{font-size:12px;color:#d9c8a4;text-align:center}#mageSheet .c i{font-size:10.5px;color:#8a7654;text-align:center;font-style:normal;line-height:1.25}';
      d0.appendChild(st);
      document.body.appendChild(d0);
      window.scrollTo(0, 0);
      var cells = d0.querySelectorAll('.c'), painted = 0;
      for (var ci = 0; ci < cells.length; ci++) if (cells[ci].querySelector('.s1 img')) painted++;
      d0.querySelector('#mageSheetN').textContent = painted === cells.length ? 'all ' + painted + ' are painted'
        : painted + ' painted, ' + (cells.length - painted) + ' still drawn by the game';
      info.height = Math.ceil(d0.getBoundingClientRect().height); info.icons = cells.length; info.painted = painted;
    }
    if (scene === 'stats') { selectedSkill = 'mining'; viewTab = 'stats'; try { renderAll(); } catch (e) { info.err = String(e); } }
    return info;
  };
}

const SCENES = {
  fight:    { sel: '#combatPanel' },
  busy:     { sel: '#combatPanel' },
  switch:   { sel: '#combatPanel' },
  raid:     { sel: '#combatPanel' },
  nostaff:  { sel: '.cvrail.r' },
  bow:      { sel: '#combatPanel' },
  dry:      { sel: '#combatPanel' },
  out:      { full: true },
  choose:   { sel: '#combatPanel' },
  gear:     { sel: '#gearView' },
  loadouts: { sel: '#presetsView' },
  tipstaff: { sel: '#itemTT', tip: true },
  tipwand:  { sel: '#itemTT', tip: true },
  tiprobe:  { sel: '#itemTT', tip: true },
  tiprune:  { sel: '#itemTT', tip: true },
  tipplate: { sel: '#itemTT', tip: true },
  tipleather: { sel: '#itemTT', tip: true },
  picker:   { sel: '#combatPanel' },
  mlog:     { sel: '#combatPanel' },
  mastery:  { sel: '#combatPanel' },
  skill:    { full: true },
  tree:     { full: true },
  stats:    { full: true },
  sheet:    { sel: '#mageSheet', tall: true },
  full:     { full: true }
};

(async () => {
  const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES);
  const src = fs.readFileSync(path.join(ROOT, 'cindervale.html'), 'utf8');
  const STILL = '<style>.mage-still .cvsplat{animation:none !important;opacity:1 !important}</style>';
  const html = src.replace('</head>', SHIM + STILL + '</head>')
    .replace('</' + 'body>', '<script>\n(' + SCENES_IN_PAGE.toString() + ')();\n</' + 'script>\n</' + 'body>');
  const tmp = path.join(__dirname, 'work-shootreal.html');
  fs.writeFileSync(tmp, html);
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    args: ['--hide-scrollbars', '--font-render-hinting=none', '--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) cindervale-idle/0.9.127 Chrome/151.0.0.0 Electron/33.0.0 Safari/537.36');
  const errs = [];
  p.on('pageerror', e => { errs.push(e.message); console.log('  ! pageerror: ' + e.message); });
  await p.goto('file:///' + tmp.split(String.fromCharCode(92)).join('/') + '?cvdev=1', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2800));
  const metaFile = path.join(OUT, 'meta.json');
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
  meta._build = await p.evaluate(() => document.querySelector('.mm-ver').getAttribute('data-build'));
  for (const id of want) {
    const S = SCENES[id]; if (!S) { console.log('no scene ' + id); continue; }
    let info;
    try { info = await p.evaluate(s => window.__mage(s), id); } catch (e) { console.log('  ! ' + id + ': ' + e.message); continue; }
    await new Promise(r => setTimeout(r, 450));
    /* the contact sheet is taller than a screen: grow the viewport to fit it, and put it back after */
    if (S.tall && info && info.height) await p.setViewport({ width: 1920, height: info.height + 20, deviceScaleFactor: 1 });
    const file = path.join(OUT, id + '.png');
    let clip = null;
    if (!S.full) {
      clip = await p.evaluate((sel, tip) => {
        let el = null;
        if (tip) el = (typeof ttEl === 'function') ? ttEl() : null;
        for (const q of sel.split(',').map(x => x.trim())) { if (el) break; const c = document.querySelector(q); if (c && c.getBoundingClientRect().width > 4) el = c; }
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, Math.floor(r.left) - 6), y: Math.max(0, Math.floor(r.top) - 6), width: Math.ceil(r.width) + 12, height: Math.ceil(r.height) + 12 };
      }, S.sel, !!S.tip);
    }
    if (clip && clip.width > 10 && clip.height > 10) {
      clip.width = Math.min(clip.width, 1920 - clip.x); clip.height = Math.min(clip.height, S.tall ? 6000 : 2400);
      await p.screenshot({ path: file, clip });
    } else { await p.screenshot({ path: file }); }
    meta[id] = { clip, info };
    if (S.tall) { await p.evaluate(() => { const e = document.getElementById('mageSheet'); if (e) e.remove(); }); await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 }); }
    console.log(id.padEnd(10), clip ? `${clip.width}x${clip.height}` : 'full', info ? JSON.stringify(info).slice(0, 260) : '');
  }
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 1));
  await b.close(); fs.unlinkSync(tmp);
  console.log(errs.length ? errs.length + ' page error(s)' : 'no page errors');
})().catch(e => { console.error(e); try { fs.unlinkSync(path.join(__dirname, 'work-shootreal.html')); } catch (x) {} process.exit(1); });

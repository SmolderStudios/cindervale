/* Photograph Magic in the REAL game file. No prototype is laid over it.
 *
 *     node _magedesign/shootreal.js              every scene -> shots/real/*.png
 *     node _magedesign/shootreal.js fight raid   only those
 *     node _magedesign/shootreal.js gear         the gear half (finds, raid robes, Dawnveil,
 *                                                Faultline) -> shots/gear/*.png
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
      h += sec('Cloth', 'one bolt, seven cloths', CLOTH_TIERS.filter(function (c) { return ITEMS[c.key]; }).map(function (c) { return item(c.key); }));
      ['hood', 'robe', 'leggings', 'wraps', 'slippers'].forEach(function (p) {
        h += sec('Robes: ' + p, 'one silhouette, a palette a cloth', CLOTH_TIERS.map(function (c) { return item(c.key + '_' + p); }));
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
    /* ── the gear half of Magic: finds, raid weapons and robes, Dawnveil, Faultline.
       These land in shots/gear. Every list is read off the game, so a scene shows
       whatever of it the build holds. ─────────────────────────────────────────── */
    /* item cards side by side, each drawn by the game's own tooltip and copied out */
    function cards(ids, heads) {
      var old = document.getElementById('gearShot'); if (old) old.remove();
      var box = document.createElement('div'); box.id = 'gearShot';
      box.style.cssText = 'position:absolute;left:60px;top:60px;z-index:99999;display:flex;gap:28px;align-items:flex-start;background:#120c07;padding:26px 28px;border:1px solid #3a2a18;border-radius:8px';
      ids.forEach(function (id, i) {
        showItemTooltip(id, 300, 200, '');
        var c = ttEl().cloneNode(true);
        c.style.position = 'static'; c.style.display = 'block'; c.style.opacity = '1'; c.style.visibility = 'visible'; c.style.transform = 'none'; c.style.left = 'auto'; c.style.top = 'auto';
        var col = document.createElement('div');
        col.innerHTML = '<div style="font:italic 13px Georgia,serif;color:#a8946c;margin:0 0 8px 2px">' + ((heads && heads[i]) || '') + '</div>';
        col.appendChild(c); box.appendChild(col);
      });
      hideTooltip(); document.body.appendChild(box);
      info.cards = ids.map(function (id) { return ITEMS[id].name; });
      info.text = ids.map(function (id, i) { return box.children[i].textContent.replace(/\s+/g, ' ').trim().slice(0, 420); });
    }
    var isFind = function (id) { return !!(ITEMS[id] && ITEMS[id].magic && !ITEMS[id]._variant && typeof isUniqueGear === 'function' && isUniqueGear(id)); };
    var finds = Object.keys(ITEMS).filter(isFind).sort(function (a, b) { return ITEMS[a].ctier - ITEMS[b].ctier; });
    var isZoneFind = function (id) { for (var m in MONSTER_DROPS) if (MONSTER_DROPS[m].some(function (x) { return x.id === id; })) return true; return false; };
    function mage99() {
      ['magic', 'defence', 'hitpoints'].forEach(function (k) { state.combatXp[k] = XP_CUM[99]; });
      state.xp.agility = XP_CUM[70];
    }
    if (scene === 'gear_sheet') {
      var oldS = document.getElementById('mageSheet'); if (oldS) oldS.remove();
      var drawn = function (id) { return /^<svg class="ev-icon"/.test(String(ICONS[id] || '')); };
      var cellG = function (id, note) { var s = iconHTML(id);
        return '<div class="c"><div class="b"><div class="s1">' + s + '</div><div class="s2">' + s + '</div><div class="s3">' + s + '</div></div><span>' + ITEMS[id].name + '</span>' + (note ? '<i>' + note + '</i>' : '') + '</div>'; };
      var secG = function (title, sub, ids, note) { return ids.length ? '<h2>' + title + '<small>' + sub + '</small></h2><div class="row">' + ids.map(function (id) { return cellG(id, note ? note(id) : ''); }).join('') + '</div>' : ''; };
      var where = function (id) {
        var out = [];
        for (var m in MONSTER_DROPS) MONSTER_DROPS[m].forEach(function (x) { if (x.id === id) out.push(getMonster(m).name); });
        RAIDS.forEach(function (r) { (r.gearDrops || []).forEach(function (g) { if (g.id === id) out.push(r.name); }); });
        if (typeof SPIRE_GEAR !== 'undefined' && SPIRE_GEAR.indexOf(id) >= 0) out.push('The Sundered Spire');
        return 'T' + ITEMS[id].ctier + ' ' + (ITEMS[id].mfam || '') + ' · ' + out.join(', ');
      };
      var zoneF = finds.filter(isZoneFind), raidF = finds.filter(function (id) { return !isZoneFind(id); });
      var runesD = Object.keys(ITEMS).filter(function (id) { return isRune(id) && drawn(id); });
      var robeSets = CLOTH_TIERS.filter(function (c) { return drawn(c.key + '_robe'); });
      var veil = Object.keys(ITEMS).filter(function (id) { return ITEMS[id].setKey === 'dawnveil'; });
      var other = Object.keys(ITEMS).filter(function (id) { return !ITEMS[id]._variant && drawn(id) && (/^wyrd_/.test(id) || /^arcane_draught/.test(id)); });
      var hg = '<h1>Magic, the gear half: every new icon, build ' + document.querySelector('.mm-ver').getAttribute('data-build') + '</h1>'
        + '<p>Drawn by the game until its sheets are painted: <span id="mageSheetN"></span>. Each is shown at 76, 34 and 18 px. A found staff or wand is its own shape; raid robes are the five robe shapes in three new cloths; Dawnveil is its own four.</p>';
      hg += secG('Found in the zones', 'one staff or wand a zone, each its own shape', zoneF, where);
      hg += secG('Found in the raids and the Spire', 'two a raid, and Faultline', raidF, where);
      hg += secG('The Spire rune', 'the rune stone, in the Spire\'s rose', runesD);
      robeSets.forEach(function (c) { hg += secG(c.set + ' robes', 'the five robe shapes, raid cloth', ['hood', 'robe', 'leggings', 'wraps', 'slippers'].map(function (p) { return c.key + '_' + p; })); });
      hg += secG('Dawnveil', 'four pieces from The Empyrean Throne, their own shapes', veil);
      hg += secG('The gem and the draught', 'Wyrdstone and the Arcane Draught', other);
      var dg = document.createElement('div'); dg.id = 'mageSheet'; dg.innerHTML = hg;
      var stg = document.createElement('style');
      stg.textContent = '#mageSheet{position:absolute;left:0;top:0;z-index:99999;width:1560px;box-sizing:border-box;background:#120c07;color:#d9c8a4;font:13px/1.35 Georgia,serif;padding:22px 24px 30px}'
        + '#mageSheet h1{font:600 20px Georgia;color:#e8d8b0;margin:0 0 4px}#mageSheet p{margin:0 0 6px;color:#a8946c}'
        + '#mageSheet h2{font:600 13px Georgia;letter-spacing:2px;text-transform:uppercase;color:#c79b4e;margin:20px 0 8px;border-bottom:1px solid #3a2a18;padding-bottom:4px}'
        + '#mageSheet h2 small{font:italic 12px Georgia;letter-spacing:0;text-transform:none;color:#8a7654;margin-left:12px}'
        + '#mageSheet .row{display:flex;flex-wrap:wrap;gap:10px}'
        + '#mageSheet .c{background:#1d140c;border:1px solid #3a2a18;border-radius:6px;padding:9px 9px 7px;display:flex;flex-direction:column;align-items:center;gap:4px;width:180px;box-sizing:border-box}'
        + '#mageSheet .b{display:flex;align-items:flex-end;gap:9px;height:78px}'
        + '#mageSheet .ev-icon{display:block}#mageSheet .s1 .ev-icon{width:76px;height:76px}#mageSheet .s2 .ev-icon{width:34px;height:34px}#mageSheet .s3 .ev-icon{width:18px;height:18px}'
        + '#mageSheet .c span{font-size:12.5px;color:#d9c8a4;text-align:center}#mageSheet .c i{font-size:10.5px;color:#8a7654;text-align:center;font-style:normal;line-height:1.25}';
      dg.appendChild(stg); document.body.appendChild(dg); window.scrollTo(0, 0);
      var cs = dg.querySelectorAll('.c'), nd = 0;
      for (var gi = 0; gi < cs.length; gi++) if (cs[gi].querySelector('.s1 svg')) nd++;
      dg.querySelector('#mageSheetN').textContent = nd + ' of ' + cs.length + ' are drawn, ' + (cs.length - nd) + ' painted';
      info.height = Math.ceil(dg.getBoundingClientRect().height); info.icons = cs.length; info.drawn = nd;
    }
    /* a zone find's card beside the crafted weapon of its tier */
    if (scene === 'unique_card') {
      state.combatXp.magic = XP_CUM[45]; state.items.frostbrand_staff = 1; state.items.ember_staff = 1;
      enterCombat();
      cards(['frostbrand_staff', 'ember_staff'], ['Found: a Frost Bear, 0.9%', 'Crafted: Runecrafting 44']);
    }
    /* the Monster Log on a monster that drops a find and its runes */
    if (scene === 'monster_log') {
      enterCombat(); state.cmbSubTab = 'log'; state.monLogZone = 'goblin_cave'; state.monLogSel = 'goblin_shaman';
      state.monDrops = state.monDrops || {}; state.monDrops.goblin_shaman = { soot_rune: 412, tribal_fetish: 9, goblin_meat: 11, fetish_staff: 1 };
      state.monKills.goblin_shaman = 164;
      renderCombat();
      info.rows = [].map.call(document.querySelectorAll('#combatPanel [data-mldrop]'), function (e) { return e.textContent.replace(/\s+/g, ' ').trim(); }).slice(0, 14);
    }
    /* a raid robe's card, beside the raid leather it is built off and the last crafted robe */
    if (scene === 'raid_robe_card') {
      mage99(); state.xp.runecrafting = XP_CUM[92];
      state.items.riftwoven_robe = 1; state.items.voidweave = 9; state.items.riftshard = 2;
      enterCombat();
      cards(['riftwoven_robe', 'void_chest', 'wyrmsilk_robe'], ['Raid cloth: Runecrafting 90, from Voidweave and a Riftshard', 'The raid leather it is built off', 'The last crafted robe']);
    }
    /* Dawnveil worn, all four, with Faultline: the doll, what it adds up to, and a piece's card */
    if (scene === 'dawnveil_set') {
      mage99();
      state.combatEquipped = { weapon: 'faultline', quiver: 'sunder_rune', helmet: 'dawnveil_hood', chest: 'dawnveil_robe', legs: 'dawnveil_leggings', boots: 'dawnveil_slippers', gloves: 'stonewright_gauntlets', cape: 'dawnmantle' };
      for (var dk in state.combatEquipped) state.items[state.combatEquipped[dk]] = 1;
      state.items.sunder_rune = 3560; state.combatElement = 'storm'; state.combatSpell = 'surge';
      refreshCombatStats(); enterCombat(); rightTab = 'gear'; renderAll();
      cards(['dawnveil_robe', 'dawnveil_hood'], ['Worn with the other three', '']);
      info.sets = activeCombatSets(); var cbv = combatBonusesAll();
      info.crit = +cbv.critChance.toFixed(3); info.magicDmg = +cbv.magicDmg.toFixed(3); info.hit = playerMaxHit(); info.save = +runeSaveRate().toFixed(3);
      info.gear = (document.getElementById('gearView') || { textContent: '' }).textContent.replace(/\s+/g, ' ').slice(0, 260);
    }
    /* Faultline, beside the Empyrean's staff and the rune it casts */
    if (scene === 'faultline_card') {
      mage99(); state.items.faultline = 1; state.items.sunder_rune = 3560;
      enterCombat();
      cards(['faultline', 'dawncaller', 'sunder_rune'], ['The Sundered Spire, boss floors', 'The Empyrean Throne, 1%', 'Spire boss floors, in bulk']);
    }
    /* the Monster Log on a raid and on the Spire: the staff, the wand, Dawnveil and Faultline on their tables */
    if (scene === 'raid_log' || scene === 'spire_log') {
      mage99(); enterCombat(); state.cmbSubTab = 'log';
      state.monLogZone = scene === 'raid_log' ? 'empyrean_throne' : SPR_ID;
      state.raidClears = { empyrean_throne: 14 }; state.spireBest = 35;
      renderCombat();
      info.text = (document.getElementById('combatPanel') || { textContent: '' }).textContent.replace(/\s+/g, ' ');
      info.has = ['Dawncaller', 'Starcall Wand', 'Dawnveil Robe', 'Faultline', 'magic power 34'].filter(function (w) { return info.text.indexOf(w) >= 0; });
      info.text = info.text.slice(0, 200);
    }
    /* a fight with a find in hand: what it does shows on the spell bar and in the log */
    if (scene === 'fight_unique') {
      state.combatXp.magic = XP_CUM[44]; state.combatXp.defence = XP_CUM[40]; state.combatXp.hitpoints = XP_CUM[50];
      state.items.frostbrand_staff = 1; state.items.cinder_rune = 3200;
      state.combatEquipped = { weapon: 'frostbrand_staff', quiver: 'cinder_rune', cape: 'mithril_cape' };
      ['hood', 'robe', 'leggings', 'wraps', 'slippers'].forEach(function (p, i) { state.items['rimeweave_' + p] = 1; state.combatEquipped[['helmet', 'chest', 'legs', 'gloves', 'boots'][i]] = 'rimeweave_' + p; });
      state.combatElement = 'frost'; state.combatSpell = 'blast'; state.zone = 'wolf_den'; state.zoneMode = 'dungeons';
      refreshCombatStats(); enterCombat();
      try { selectZone('wolf_den'); selectMonster('alpha_wolf'); engageCombat(); stopCombatTimer(); } catch (e) { info.err = String(e); }
      /* a dozen casts through the real tick, the dice seeded, so the log is what the game wrote */
      var sd = 11, rr = Math.random; Math.random = function () { sd |= 0; sd = sd + 0x6D2B79F5 | 0; var t = Math.imul(sd ^ sd >>> 15, 1 | sd); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      var hp0 = combat.youMaxHp;
      for (var ci2 = 0; ci2 < 5 && combat.active; ci2++) { combat.youSwingStart = Date.now() - combat.youSwingMs - 1; combat.foeSwingStart = Date.now() + 5000; combatTick(); combat.youHp = hp0; }
      Math.random = rr;
      renderCombat(); updateCombatBars();
      info.spell = spellName(); info.aff = spellAffinity(); info.hit = combat.youMaxHit;
      info.bar = [].map.call(document.querySelectorAll('#cmbSpellBar [data-el]'), function (b) { return b.textContent.replace(/\s+/g, ' ').trim() + ' | ' + b.getAttribute('title'); });
      info.log = combat.log.map(function (l) { return String(l.t).replace(/<[^>]+>/g, ''); }).slice(-8);
      info.room = barRoom();
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
  full:     { full: true },
  /* the gear half: `dir` is the folder under shots/, `file` the name the brief asks for */
  gear_sheet:   { sel: '#mageSheet', tall: true, dir: 'gear', file: 'sheet' },
  unique_card:  { sel: '#gearShot', dir: 'gear' },
  monster_log:  { sel: '#combatPanel', dir: 'gear' },
  raid_robe_card: { sel: '#gearShot', dir: 'gear' },
  dawnveil_set: { full: true, dir: 'gear' },
  faultline_card: { sel: '#gearShot', dir: 'gear' },
  raid_log:     { sel: '#combatPanel', dir: 'gear' },
  spire_log:    { sel: '#combatPanel', dir: 'gear' },
  fight_unique: { full: true, dir: 'gear' }
};

(async () => {
  /* no arguments: the scenes of shots/real. `gear`: the scenes of shots/gear. Or name them. */
  const args = process.argv.slice(2);
  const want = args.length === 1 && args[0] === 'gear' ? Object.keys(SCENES).filter(k => SCENES[k].dir === 'gear')
    : args.length ? args : Object.keys(SCENES).filter(k => !SCENES[k].dir);
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
  const build = await p.evaluate(() => document.querySelector('.mm-ver').getAttribute('data-build'));
  const metas = {};
  const metaOf = dir => { if (!metas[dir]) { const f = path.join(dir, 'meta.json'); metas[dir] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; metas[dir]._build = build; } return metas[dir]; };
  for (const id of want) {
    const S = SCENES[id]; if (!S) { console.log('no scene ' + id); continue; }
    let info;
    try { info = await p.evaluate(s => window.__mage(s), id); } catch (e) { console.log('  ! ' + id + ': ' + e.message); continue; }
    await new Promise(r => setTimeout(r, 450));
    /* the contact sheet is taller than a screen: grow the viewport to fit it, and put it back after */
    if (S.tall && info && info.height) await p.setViewport({ width: 1920, height: info.height + 20, deviceScaleFactor: 1 });
    const dir = S.dir ? path.join(__dirname, 'shots', S.dir) : OUT; fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, (S.file || id) + '.png'), meta = metaOf(dir);
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
    await p.evaluate(() => { const e = document.getElementById('gearShot'); if (e) e.remove(); });
    console.log(id.padEnd(10), clip ? `${clip.width}x${clip.height}` : 'full', info ? JSON.stringify(info).slice(0, 260) : '');
  }
  for (const dir in metas) fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(metas[dir], null, 1));
  await b.close(); fs.unlinkSync(tmp);
  console.log(errs.length ? errs.length + ' page error(s)' : 'no page errors');
})().catch(e => { console.error(e); try { fs.unlinkSync(path.join(__dirname, 'work-shootreal.html')); } catch (x) {} process.exit(1); });

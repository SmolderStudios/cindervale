/* A hidden window, measured through the game's own timers.
 *
 *     node _hiddenwindow.js                       the tables off cindervale.html
 *     node _hiddenwindow.js old.bak               old.bak beside cindervale.html: before and after
 *     node _hiddenwindow.js a.bak b.bak c.bak     any builds side by side; the first is the one the rest are compared with
 *     --hours=8                                   game hours a fight (8 is about two minutes a build)
 *     --json=out.json                             keep the raw numbers
 *     --from=out.json                             print the tables again from kept numbers
 *
 *     git show 96cd544:cindervale.html > old.bak    is build 0.9.127.4, the last one that fought one attack a minute
 *     (run that in Git Bash: PowerShell re-encodes what > writes. *.bak is in
 *     .gitignore, so a 12 MB copy of the game cannot ride into a commit)
 *
 * The engine slows the timers of a window nobody can see. Measured on the
 * wrapper's own Electron (42.5.0, Chrome 148), a minimised window gets them once a
 * second for 60 seconds and then once a minute, and the same engine does that to
 * a background tab in a browser. combatTick() resolves at most one attack from
 * each side, so up to build 0.9.127.4 a minimised game fought at one attack a
 * minute. From 0.9.127.5 the fight's timer runs the ticks it missed
 * (combatTimerTick and combatCatchUp in the game file).
 *
 * This is what measured it, and it does no sums of its own. It starts a fight the
 * way a player does, keeps hold of the timer the game asked for, and fires that
 * timer, tick() and the once-a-second housekeeping on a clock it holds, at the
 * pace the engine gives each kind of window:
 *     seen      every timer at its own rate (100 ms, 250 ms, 1 s, 5 s)
 *     first     every timer once a second    (a hidden window's first minute)
 *     hidden    every timer once a minute    (a hidden window after that)
 * Health is NOT topped up: auto-eat runs as it ships (on, at 50%) out of a stack
 * of food, and the food it eats is counted. Levels are held still, as section 13
 * of _magesim.js holds them, so the build that is measured stays that build.
 *
 * What it prints:
 *   1. kills, food and damage an hour for a fighter, an archer and a mage at
 *      Lv 20, 50, 75 and 99, seen and hidden
 *   2. the first hidden minute
 *   3. a raid and twenty minutes of the Spire, seen and hidden
 *   4. skilling, seen and hidden: the rule a fight is being brought into line with
 *   5. what one hour away from a closed game counts, beside it
 *   6. a machine that sleeps for ten minutes in the middle of a fight, with its
 *      timers waking in their usual order and again with the save waking first
 *
 * It asserts nothing. The checks that hold the timer in place are in _audit_tests.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const HOURS = +opt('hours', 8);
/* Electron, not a browser: a browser user agent is the demo build, which caps
   every level at 10. ?cvdev=1 mutes telemetry. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const REF = { 20: 'goblin_shaman', 50: 'ogre_houndmaster', 75: 'wyvern', 99: 'dread_knight' }, TIER = { 20: 3, 50: 5, 75: 7, 99: 7 };
/* The fish a cook of that level would be carrying. */
const FOOD = { 20: 'cooked_sardine', 50: 'cooked_salmon', 75: 'cooked_shark', 99: 'cooked_voideel' };
const WHO = [['melee', 'sword + shield'], ['bow', 'shortbow'], ['staff', 'staff, Fire']];

/* ── the half that runs inside the page ── */
function HW_PAGE() {
  var METAL = ['bronze', 'iron', 'steel', 'mithril', 'cobalt', 'runite', 'starsteel', 'starfall'];
  var WOOD = ['pine', 'oak', 'ironbark', 'ember', 'frost', 'shadow', 'ancient'];
  var HIDE = ['rough', 'chitin', 'wolf', 'ogre', 'troll', 'drake', 'demon'];
  var HAS_MAGIC = typeof CLOTH_TIERS !== 'undefined' && typeof isRune === 'function';
  var CLOTHK = HAS_MAGIC ? CLOTH_TIERS.map(function (c) { return c.key; }) : [];
  var RUNE = HAS_MAGIC ? Object.keys(ITEMS).filter(function (id) { return isRune(id); }).sort(function (a, b) { return ITEMS[a].ammoTier - ITEMS[b].ammoTier; }) : [];
  var PL = ['helm', 'chest', 'legs', 'gloves', 'boots'], RB = ['hood', 'robe', 'leggings', 'wraps', 'slippers'];
  function set5(k, names, extra) {
    var o = { helmet: k + '_' + names[0], chest: k + '_' + names[1], legs: k + '_' + names[2], gloves: k + '_' + names[3], boots: k + '_' + names[4] };
    for (var x in (extra || {})) o[x] = extra[x];
    return o;
  }
  /* The same three dressed builds _magesim.js measures, crafted gear and no enchants. */
  function loadout(key, t) {
    var metal = METAL[t - 1], wood = WOOD[t - 1], hide = HIDE[t - 1], cape = { cape: metal + '_cape' };
    if (key === 'melee') return { weapon: metal + '_sword', armour: set5(metal, PL, { cape: metal + '_cape', shield: metal + '_shield' }) };
    if (key === 'bow') return { weapon: wood + '_shortbow', quiver: metal + '_arrow', armour: set5(hide, PL, cape) };
    if (key === 'staff') return { weapon: wood + '_staff', quiver: RUNE[t - 1], armour: set5(CLOTHK[t - 1], RB, cape) };
    return null;
  }
  /* Every combat level at `lv`, Hitpoints too: this measures food, so the health
     bar has to be the one that character would have. */
  function dress(key, lv, t, food, ammo) {
    state = defaultState(); normalizeState();
    state.xp.agility = XP_CUM[lv];
    state.combatXp = { attack: XP_CUM[lv], strength: XP_CUM[lv], defence: XP_CUM[lv], hitpoints: XP_CUM[lv], ranged: XP_CUM[lv], magic: XP_CUM[lv] };
    state.items = {}; state.tree = {}; state.cmast = {}; state.charClass = null; state.effects = [];
    state.combatStyle = 'attack'; state.combatElement = 'fire'; state.variants = {}; state.sockets = {}; state.asc = {};
    if (HAS_MAGIC) state.combatSpell = SPELL_SIZES[SPELL_SIZES.length - 1].k;
    var o = loadout(key, t), ce = {};
    if (ammo) o.quiver = ammo;
    if (o.weapon) ce.weapon = o.weapon;
    if (o.quiver) { ce.quiver = o.quiver; state.items[o.quiver] = 1e7; }
    for (var s in (o.armour || {})) ce[s] = o.armour[s];
    for (var s2 in ce) { if (s2 !== 'quiver') state.items[ce[s2]] = (state.items[ce[s2]] || 0) + 1; }
    state.combatEquipped = ce;
    if (food) state.items[food] = 1e7;
    state.hints = state.hints || {}; state.hints.combat_unarmed = 1;
    combat.active = false; combat.raid = null;
    refreshCombatStats();
  }
  /* Rendering is a thousand times the cost and changes no number. saveGame is NOT
     in this list: it is what keeps state.combatSession and lastSeen, and the sleep
     in section 6 turns on both. */
  var QUIET = ['renderCombat', 'updateCombatBars', 'cmbSplat', 'renderAll', 'renderTick', 'toast', 'renderQuestDock', 'questCheck',
    'refreshCombatTabIndicator', 'renderRightPanel', 'renderHeader', 'renderSkillList', 'showHint', 'showOfflineSummary', 'renderPets', 'showXpPop', 'showItemPop'];
  function hush(on) {
    if (on) {
      hush.keep = {}; QUIET.forEach(function (k) { if (typeof window[k] === 'function') { hush.keep[k] = window[k]; window[k] = function () {}; } });
      /* The save still runs, and stamps what it stamps. Only the write to storage is
         left out: under jsdom every write queues an event that cannot be delivered
         while this holds the thread, and eight hours of saves is gigabytes of them. */
      hush.keep.lsSet = window.lsSet; window.lsSet = function () { return true; };
    }
    else { for (var k in (hush.keep || {})) window[k] = hush.keep[k]; hush.keep = {}; }
  }
  function seeded(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* The game's timers on a held clock.
     The fight's own timer is not named here: setInterval is watched while the fight
     starts and whatever the game hands it for 100 ms is the timer, on any build.
     `plan` is a list of [milliseconds, pace] spans, where pace is 0 for a window
     you can see and otherwise the time between the engine's wake-ups. A span can
     name a third thing: the timer the engine runs ahead of the others on each of
     its wake-ups ('s' is the save). */
  function clockwork(start) {
    var C = { fake: start, fn: null, id: 0, n: 0, fires: 0, SI: window.setInterval, CI: window.clearInterval };
    window.setInterval = function (fn, ms) { if (ms === 100) { C.fn = fn; C.id = 900000 + (++C.n); return C.id; } return C.SI.apply(window, arguments); };
    window.clearInterval = function (id) { if (id && id === C.id) { C.fn = null; return; } return C.CI.apply(window, arguments); };
    C.due = { c: start + 100, k: start + 250, e: start + 1000, s: start + 5000 };
    /* One wake-up: everything that is due fires once. The order is the fight,
       tick(), the once-a-second housekeeping, the save, unless `lead` names one
       that goes first. Nothing fires twice: the one that led is no longer due. */
    C.wake = function (now, exact, lead) {
      C.fake = now;
      var d = C.due, step = function (k, ms) { d[k] = exact ? d[k] + ms : now + ms; };
      var fire = {
        c: function () { if (d.c <= now) { if (C.fn) { C.fires++; C.fn(); } step('c', 100); } },
        k: function () { if (d.k <= now) { tick(); step('k', 250); } },
        e: function () { if (d.e <= now) { tickEffects(); step('e', 1000); } },
        s: function () { if (d.s <= now) { saveGame(); step('s', 5000); } }
      };
      if (lead) fire[lead]();
      fire.c(); fire.k(); fire.e(); fire.s();
    };
    C.run = function (plan, each) {
      for (var p = 0; p < plan.length; p++) {
        var end = C.fake + plan[p][0], pace = plan[p][1];
        while (C.fake < end) {
          if (pace) C.wake(C.fake + pace, false, plan[p][2]);
          else C.wake(Math.min(C.due.c, C.due.k, C.due.e, C.due.s), true);
          if (each && each() === false) return;
        }
      }
    };
    C.restore = function () { window.setInterval = C.SI; window.clearInterval = C.CI; };
    return C;
  }

  /* One dressed build on one real monster for a length of game time, with the
     window in whatever state `plan` says. Nothing is topped up. */
  function fight(o) {
    var D = Date.now, R = Math.random, out = { key: o.key, lv: o.lv, plan: o.name }, keep = { menu: mmAtMenu, slot: mmSlot, tick: window.combatTick }, C = null;
    try {
      dress(o.key, o.lv, o.t, o.food);
      mmAtMenu = false; mmSlot = 3;
      enterCombat(); state.cmbSubTab = 'arena'; state.cmbView = 'fight';
      var mon = getMonster(o.mon); selectZone(mon.zone); selectMonster(o.mon);
      var t0 = D.call(Date) + (window.__clockShift || 0);
      C = clockwork(t0);
      Date.now = function () { return C.fake; };
      Math.random = seeded(o.seed);
      /* Every tick the game runs is counted here, whoever asked for it. */
      var N = { steps: 0, you: 0, foe: 0, dealt: 0, taken: 0, most: 0, inFire: 0 }, real = window.combatTick;
      var base = null, gain = {}, hit0 = 0, kills = function () { return (state.monKills && state.monKills[o.mon]) || 0; };
      window.combatTick = function () {
        var fh = combat.foeHp, yh = combat.youHp, kk = kills(), y = combat.youSwingStart, f = combat.foeSwingStart, was = combat.active;
        real(); N.steps++; N.inFire++;
        if (!was) return;
        if (combat.youSwingStart !== y) N.you++;
        if (combat.foeSwingStart !== f && !(combat.foeStatus && combat.foeStatus.stun) && kills() === kk) N.foe++;
        if (combat.active) {
          N.dealt += (kills() > kk || combat.foeHp > fh) ? fh : (fh - combat.foeHp);
          if (combat.youHp < yh) N.taken += yh - combat.youHp;
        }
        if (base) for (var k in base) { var d = (state.combatXp[k] || 0) - base[k]; if (d) { gain[k] = (gain[k] || 0) + d; state.combatXp[k] = base[k]; } }
        if (combat.active && combat.youMaxHit !== hit0) refreshCombatStats();
      };
      engageCombat();
      out.engaged = !!combat.active && !!C.fn;
      out.swing = combat.youSwingMs; out.foeSwing = combat.foeSwingMs; out.hp = combat.youMaxHp; out.hit = combat.youMaxHit;
      hush(true);
      base = JSON.parse(JSON.stringify(state.combatXp)); hit0 = combat.youMaxHit;
      var q = state.combatEquipped.quiver, q0 = q ? state.items[q] : 0, f0 = o.food ? state.items[o.food] : 0, k0 = kills(), c0 = state.coins || 0;
      out.stops = [];
      var total = 0; o.plan.forEach(function (p) { total += p[0]; });
      C.run(o.plan, function () {
        if (N.inFire > N.most) N.most = N.inFire; N.inFire = 0;
        if (!combat.active) {
          out.stops.push(String((combat.log.slice(-1)[0] || {}).t || 'stopped').replace(/<[^>]+>/g, '').slice(0, 80));
          if (out.stops.length >= 25 || o.noRestart) return false;
          combat.youHp = combat.youMaxHp; engageCombat();
        }
      });
      var hrs = total / 3600000;
      out.hours = hrs; out.killsHr = (kills() - k0) / hrs; out.kills = kills() - k0;
      out.foodHr = o.food ? (f0 - (state.items[o.food] || 0)) / hrs : 0; out.food = o.food ? f0 - (state.items[o.food] || 0) : 0;
      out.heal = o.food ? ITEMS[o.food].potion.heal : 0; out.foodName = o.food ? ITEMS[o.food].name : '';
      out.youHr = N.you / hrs; out.foeHr = N.foe / hrs; out.dealtHr = N.dealt / hrs; out.takenHr = N.taken / hrs;
      out.ammoHr = q ? (q0 - (state.items[q] || 0)) / hrs : 0;
      var xp = 0; for (var g in gain) xp += gain[g]; out.xpHr = xp / hrs;
      out.goldHr = ((state.coins || 0) - c0) / SILVER_PER_GOLD / hrs;
      out.steps = N.steps; out.fires = C.fires; out.most = N.most; out.endHp = combat.youHp; out.on = !!combat.active;
      out.offXp = state.offlineXp || 0;
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 500); }
    finally {
      hush(false); Date.now = D; Math.random = R; if (C) C.restore(); window.combatTick = keep.tick;
      try { stopCombatTimer(); } catch (e) {} combat.active = false; combat.raid = null; combatMode = false; mmAtMenu = keep.menu; mmSlot = keep.slot;
      try { _lastTickWall = 0; } catch (e) {}
      try { localStorage.removeItem(mmKey(3)); } catch (e) {}
      state = defaultState(); normalizeState();
    }
    return out;
  }

  /* A whole raid, or `minutes` of the Spire, with the window in one state. Health
     is topped up here, as _magesim.js does for a raid: the question is how far the
     run gets, and a raid has no food to count. */
  function raid(o) {
    var D = Date.now, R = Math.random, out = { key: o.key, raid: o.raid, plan: o.name, stages: [] }, keep = { menu: mmAtMenu, slot: mmSlot, tick: window.combatTick }, C = null;
    try {
      dress(o.key, 99, 7, null, o.ammo);
      if (o.el) { state.combatElement = o.el; refreshCombatStats(); }
      mmAtMenu = false; mmSlot = 3; enterCombat();
      var t0 = D.call(Date) + (window.__clockShift || 0);
      C = clockwork(t0);
      Date.now = function () { return C.fake; };
      Math.random = seeded(o.seed);
      var base = null, hit0 = 0, real = window.combatTick, mark = 0, at = t0, steps = 0;
      window.combatTick = function () {
        real(); steps++;
        if (!combat.raid || !combat.active) return;
        combat.youHp = combat.youMaxHp;
        if (base) for (var k in base) if (state.combatXp[k] !== base[k]) state.combatXp[k] = base[k];
        if (combat.youMaxHit !== hit0 && !combat.raidDebuff) { refreshCombatStats(); hit0 = combat.youMaxHit; }
        var now = combat.raid.endless ? combat.raid.floor : combat.raid.stage;
        if (now !== mark) { out.stages.push(Math.round((Date.now() - at) / 1000)); at = Date.now(); mark = now; }
      };
      startRaid(o.raid);
      out.started = !!(combat.raid && combat.active && C.fn);
      hush(true);
      base = JSON.parse(JSON.stringify(state.combatXp)); hit0 = combat.youMaxHit; mark = combat.raid ? (combat.raid.endless ? combat.raid.floor : combat.raid.stage) : 0;
      C.run(o.plan, function () { if (!combat.raid || !combat.active) return false; });
      out.seconds = Math.round((C.fake - t0) / 1000); out.cleared = !combat.raid && !combat.active; out.floor = combat.raid ? combat.raid.floor : 0;
      out.stage = combat.raid ? combat.raid.stage + 1 : 0; out.steps = steps;
      out.last = String((combat.log.slice(-1)[0] || {}).t || '').replace(/<[^>]+>/g, '').slice(0, 90);
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 500); }
    finally {
      hush(false); Date.now = D; Math.random = R; if (C) C.restore(); window.combatTick = keep.tick;
      try { stopCombatTimer(); } catch (e) {} combat.active = false; combat.raid = null; combat.raidDebuff = null; combat.bossfx = null; combat.monfx = null; combatMode = false; mmAtMenu = keep.menu; mmSlot = keep.slot;
      try { _lastTickWall = 0; } catch (e) {}
      try { localStorage.removeItem(mmKey(3)); } catch (e) {}
      state = defaultState(); normalizeState();
    }
    return out;
  }

  /* One act through tick(), seen or hidden. */
  function skill(o) {
    var D = Date.now, R = Math.random, out = { skill: o.skill, plan: o.name }, keep = { menu: mmAtMenu, slot: mmSlot }, C = null;
    try {
      state = defaultState(); normalizeState();
      for (var s in SKILLS) state.xp[s] = XP_CUM[o.lv];
      var act = bestUnlockedAct(o.skill, o.lv);
      for (var i in (act.inp || {})) state.items[i] = 1e9;
      mmAtMenu = false; mmSlot = 3; combatMode = false; combat.active = false; combat.raid = null;
      var t0 = D.call(Date) + (window.__clockShift || 0);
      C = clockwork(t0);
      Date.now = function () { return C.fake; };
      Math.random = seeded(o.seed);
      hush(true);
      state.action = { skill: o.skill, actId: act.id }; state.actionStart = t0;
      out.act = act.name; out.ms = actMs(act, o.skill);
      var base = state.xp[o.skill], gained = 0, total = 0; o.plan.forEach(function (p) { total += p[0]; });
      C.run(o.plan, function () { if (state.xp[o.skill] !== base) { gained += state.xp[o.skill] - base; state.xp[o.skill] = base; } if (!state.action) return false; });
      out.xpHr = gained / (total / 3600000); out.on = !!state.action; out.offXp = state.offlineXp || 0;
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 400); }
    finally { hush(false); Date.now = D; Math.random = R; if (C) C.restore(); state.action = null; mmAtMenu = keep.menu; mmSlot = keep.slot; try { _lastTickWall = 0; } catch (e) {} try { localStorage.removeItem(mmKey(3)); } catch (e) {} state = defaultState(); normalizeState(); }
    return out;
  }

  /* What offlineCombatResolve counts for one hour away from a closed game: the
     game's own function, called once, eating out of the same stack of food. */
  function offline(o) {
    var out = { key: o.key, lv: o.lv };
    try {
      dress(o.key, o.lv, o.t, o.food);
      combat.active = false; combat.raid = null; combat.monId = o.mon;
      state.combatSession = { monId: o.mon, style: state.combatStyle || 'attack', youHp: combat.youMaxHp, rare: false, at: Date.now() };
      var f0 = state.items[o.food], q = state.combatEquipped.quiver, q0 = q ? state.items[q] : 0;
      hush(true);
      var r = offlineCombatResolve(3600000, offlineMods());
      out.killsHr = r ? r.kills : 0; out.foodHr = r ? (f0 - (state.items[o.food] || 0)) : 0; out.ranOut = !!(r && r.ranOut);
      out.ammoHr = q ? (q0 - (state.items[q] || 0)) : 0; out.rate = OFFLINE_COMBAT_RATE;
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 300); }
    finally { hush(false); combat.active = false; state = defaultState(); normalizeState(); }
    return out;
  }

  window.HW = { fight: fight, raid: raid, skill: skill, offline: offline,
    build: function () { var v = document.querySelector('.mm-ver'); return v ? v.getAttribute('data-build') : ''; },
    rate: function () { return typeof COMBAT_CATCHUP_RATE !== 'undefined' ? COMBAT_CATCHUP_RATE : null; },
    clamp: function () { return TICK_CATCHUP_MAX_MS; },
    mon: function (id) { var m = getMonster(id); return { name: m.name, hp: m.hp, swingMs: m.swingMs || COMBAT_BASE_SWING_MS, lvl: m.lvl }; },
    raids: function () { return RAIDS.map(function (r) { return { id: r.id, name: r.name, endless: !!r.endless }; }); } };
}

/* ── one build, in its own process ── */
function child(file) {
  const { JSDOM, VirtualConsole } = require('jsdom');
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {
    url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole(),
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); }
  });
  setTimeout(() => {
    const w = dom.window;
    w.eval('window.__clockShift=0;');
    w.eval('(' + HW_PAGE.toString() + ')()');
    const MEM = !!process.env.HW_MEM, T0 = Date.now();
    const J = src => { const r = JSON.parse(w.eval('JSON.stringify(' + src + ')')); if (MEM) console.error(String(Math.round((Date.now() - T0) / 1000)).padStart(4) + 's ' + String(Math.round(process.memoryUsage().heapUsed / 1048576)).padStart(5) + ' MB  ' + src.slice(0, 150)); return r; };
    const H = HOURS * 3600000, MIN = 60000;
    const SEEN = [[H, 0]], HIDDEN = [[H, MIN]], FIRST = [[H, 1000]];
    const F = (o) => J('HW.fight(' + JSON.stringify(o) + ')');
    const o = { file: path.basename(file), build: J('HW.build()'), rate: J('HW.rate()'), demo: J('IS_DEMO'), hours: HOURS, seen: [], hidden: [], first: [], offline: [], raids: [], skills: [], sleep: [], sleepSave: [] };
    for (const lv of [20, 50, 75, 99]) for (const [key] of WHO) {
      const b = { key, lv, t: TIER[lv], mon: REF[lv], food: FOOD[lv], seed: 7000 + lv };
      const mon = J(`HW.mon('${REF[lv]}')`);
      o.seen.push(Object.assign(F(Object.assign({ name: 'seen', plan: SEEN }, b)), { mon }));
      o.hidden.push(Object.assign(F(Object.assign({ name: 'hidden', plan: HIDDEN }, b)), { mon }));
      o.first.push(Object.assign(F(Object.assign({ name: 'first', plan: FIRST }, b)), { mon }));
      o.offline.push(Object.assign(J('HW.offline(' + JSON.stringify(b) + ')'), { mon }));
    }
    /* A raid from start to finish and twenty minutes of the Spire. */
    const RD = J('HW.raids()');
    for (const [key, , ammo, el] of [['melee', '', '', ''], ['bow', '', 'starfall_arrow', ''], ['staff', '', 'starfall_rune', 'storm']]) for (const r of RD) {
      const len = (r.endless ? 20 : 240) * MIN, b = { key, raid: r.id, ammo, el, seed: 4242 };
      o.raids.push(Object.assign(J('HW.raid(' + JSON.stringify(Object.assign({ name: 'seen', plan: [[len, 0]] }, b)) + ')'), { name: r.name, endless: r.endless }));
      o.raids.push(Object.assign(J('HW.raid(' + JSON.stringify(Object.assign({ name: 'hidden', plan: [[len, MIN]] }, b)) + ')'), { name: r.name, endless: r.endless }));
    }
    for (const sk of ['woodcutting', 'mining', 'smithing', 'runecrafting']) for (const [name, plan] of [['seen', [[4 * 3600000, 0]]], ['hidden', [[4 * 3600000, MIN]]]])
      o.skills.push(J('HW.skill(' + JSON.stringify({ skill: sk, lv: 60, seed: 31, name, plan }) + ')'));
    /* Ten minutes asleep in a fight that was in front of you: a minute seen, the
       sleep as one wake-up, a minute seen. With a save slot open, as a real game has. */
    for (const [key] of WHO) for (const seed of [1, 2, 3, 4, 5, 6, 7, 8])
      o.sleep.push(F({ key, lv: 99, t: 7, mon: REF[99], food: FOOD[99], seed: 600 + seed, name: 'sleep', plan: [[MIN, 0], [10 * MIN, 10 * MIN], [MIN, 0]] }));
    /* The same sleeps with one thing changed: on waking, the save's timer runs
       before the others. A save stamps lastSeen, which is where the settle used to
       read the time away from. */
    for (const [key] of WHO) for (const seed of [1, 2, 3, 4, 5, 6, 7, 8])
      o.sleepSave.push(F({ key, lv: 99, t: 7, mon: REF[99], food: FOOD[99], seed: 600 + seed, name: 'sleep, save first', plan: [[MIN, 0], [10 * MIN, 10 * MIN, 's'], [MIN, 0]] }));
    process.stdout.write('\n@@HW@@' + JSON.stringify(o) + '@@HW@@\n');
    process.exit(0);
  }, 2800);
}

/* ── the tables ── */
const pad = (s, n) => String(s).padStart(n), padr = (s, n) => String(s).padEnd(n);
const num = x => Math.round(x).toLocaleString('en-US');
const pc = (a, b) => b ? (a / b * 100).toFixed(a / b < 0.1 ? 1 : 0) + '%' : '';
const label = key => (WHO.find(w => w[0] === key) || [0, key])[1];
/* Two runs of one fight that agree on everything counted. */
const same = (a, b) => ['kills', 'food', 'youHr', 'foeHr', 'dealtHr', 'takenHr', 'ammoHr', 'goldHr', 'xpHr', 'endHp'].every(k => a[k] === b[k]);
function tables(B) {
  const many = B.length > 1;
  console.log(`\nA HIDDEN WINDOW, through the game's own timers  ·  ${B.map(b => `${b.label} = ${b.file}, build ${b.build}${b.rate == null ? '' : ', catch-up ' + b.rate}`).join('   ·   ')}`);
  if (B.some(b => b.demo)) console.log('   NOT BOOTED AS THE FULL GAME: the numbers below are the demo\'s');

  const fights = (title, note, list, ref) => {
    console.log(`\n${title}`); note.forEach(n => console.log('   ' + n));
    let last = null;
    B[0][list].forEach((r, ix) => {
      const tag = `Lv ${r.lv}  ${r.mon.name}  (${num(r.mon.hp)} health, attacks every ${(r.mon.swingMs / 1000).toFixed(1)}s)  ·  eating ${r.foodName}, ${r.heal} health each`;
      if (tag !== last) {
        last = tag;
        console.log('\n   ' + tag);
        console.log('   ' + padr('', 16) + padr('', many ? 9 : 0) + pad('kills/hr', 10) + pad('of seen', 9) + pad('food/hr', 9) + pad('of seen', 9) + pad('food/kill', 11) + pad('your attacks', 14) + pad('its attacks', 13) + pad('taken/hr', 10) + pad('ammo/hr', 9) + pad('gold/hr', 9) + pad('xp/hr', 9));
      }
      B.forEach((b, bi) => {
        const v = b[list][ix], s = b[ref][ix];
        if (v.err) { console.log('   ' + padr(bi ? '' : label(r.key), 16) + padr(many ? b.label : '', many ? 9 : 0) + v.err.slice(0, 160)); return; }
        console.log('   ' + padr(bi ? '' : label(r.key), 16) + padr(many ? b.label : '', many ? 9 : 0) + pad(num(v.killsHr), 10) + pad(list === ref && !bi ? '' : pc(v.killsHr, B[0][ref][ix].killsHr), 9) + pad(num(v.foodHr), 9) + pad(list === ref && !bi ? '' : pc(v.foodHr, B[0][ref][ix].foodHr), 9)
          + pad(v.kills ? (v.food / v.kills).toFixed(2) : '', 11) + pad(num(v.youHr), 14) + pad(num(v.foeHr), 13) + pad(num(v.takenHr), 10) + pad(v.ammoHr ? num(v.ammoHr) : '', 9) + pad(num(v.goldHr), 9) + pad(num(v.xpHr / 1000) + 'k', 9)
          + (list !== ref && same(v, b[ref][ix]) ? '   the same fight as seen, to the digit' : '')
          + (v.stops && v.stops.length ? '   STOPPED ' + v.stops.length + ' times: ' + v.stops[0] : ''));
      });
    });
  };
  fights(`1a. A WINDOW YOU CAN SEE  ·  every timer at its own rate, ${B[0].hours} game hours a fight`,
    ['Crafted gear of the tier, every combat level at the level shown, auto-eat on at 50% as it ships, nothing topped up.', '"of seen" is against the first build\'s seen window.'], 'seen', 'seen');
  fights(`1b. THE SAME FIGHTS IN A HIDDEN WINDOW  ·  every timer once a minute, ${B[0].hours} game hours a fight, the same dice`,
    ['This is a minimised game after its first minute, and a browser tab in the background.'], 'hidden', 'seen');
  fights(`2. THE FIRST HIDDEN MINUTE  ·  every timer once a second, ${B[0].hours} game hours of it so the numbers settle, the same dice`,
    ['The engine gives a window this for the 60 seconds after it is hidden.'], 'first', 'seen');

  console.log('\n3. RAIDS AND THE SPIRE  ·  Lv 99 in crafted gear with the best ammunition, health topped up as _magesim.js does, the window seen and hidden');
  console.log('   A raid is given four game hours and the Spire twenty minutes.');
  const names = [...new Set(B[0].raids.map(r => r.name))];
  console.log('   ' + padr('', 16) + padr('', many ? 9 : 0) + padr('', 9) + names.map(n => pad(n.replace(/^The /, '').slice(0, 17), 19)).join(''));
  for (const [key] of WHO) for (const plan of ['seen', 'hidden']) B.forEach((b, bi) => {
    const rows = b.raids.filter(r => r.key === key && r.plan === plan);
    console.log('   ' + padr(bi || plan !== 'seen' ? '' : label(key), 16) + padr(many ? b.label : '', many ? 9 : 0) + padr(plan, 9)
      + rows.map(v => pad(v.err ? 'ERROR' : !v.started ? 'did not start' : v.endless ? 'floor ' + v.floor : v.cleared ? 'cleared ' + v.seconds + 's' : (/defeated|forfeit|fell|died|slain/i.test(v.last) ? 'died' : 'still on') + ' stage ' + (v.stage || '?'), 19)).join(''));
    rows.filter(v => v.err).forEach(v => console.log('      ' + v.err.slice(0, 200)));
  });

  console.log('\n4. SKILLING, for comparison  ·  the best act at Lv 60 through tick(), four game hours, the window seen and hidden');
  console.log('   tick() works out how many cycles fit in the time that passed, so a hidden window has always skilled at the full rate.');
  console.log('   ' + padr('', 34) + B.map(b => pad((many ? b.label + ' ' : '') + 'seen', 14) + pad('hidden', 12) + pad('', 7)).join(''));
  for (let i = 0; i < B[0].skills.length; i += 2) {
    const s = B[0].skills[i];
    console.log('   ' + padr(`${s.skill}: ${s.act}`.slice(0, 33), 34) + B.map(b => pad(num(b.skills[i].xpHr) + ' xp/hr', 14) + pad(num(b.skills[i + 1].xpHr), 12) + pad(pc(b.skills[i + 1].xpHr, b.skills[i].xpHr), 7)).join(''));
  }

  console.log('\n5. CLOSING THE GAME INSTEAD  ·  what one hour away counts for the same fight, by the game\'s own offline sums (' + pc(B[0].offline[0].rate, 1) + ' of the time)');
  /* Until Magic slice 9 this line said offline combat spends no arrows and no runes,
     and the column was not printed because it was always nothing. The quiver is
     charged now, and a spell's element counts: three of the four monsters here
     resist Fire, so the staff's kills on those are 15% under what they were. */
  console.log('   Offline combat is charged for the arrows and the runes its kills take, counts a spell\'s element, cannot kill you, and gives the kill\'s XP without the XP for each hit.');
  console.log('   ' + padr('', 26) + pad('kills', 8) + pad('food', 8) + pad('quiver', 8) + B.map(b => pad((many ? b.label + ' ' : '') + 'seen', 14) + pad('hidden', 9)).join(''));
  B[0].offline.forEach((r, ix) => {
    console.log('   ' + padr(`Lv ${r.lv} ${label(r.key)}`, 26) + pad(num(r.killsHr), 8) + pad(num(r.foodHr), 8) + pad(r.ammoHr ? num(r.ammoHr) : '', 8) + B.map(b => pad(num(b.seen[ix].killsHr) + ' kills', 14) + pad(num(b.hidden[ix].killsHr), 9)).join(''));
  });

  console.log('\n6. A MACHINE THAT SLEEPS  ·  a Lv 99 fight, a minute seen, ten minutes asleep, a minute seen, eight times each with different dice');
  console.log('   Over two minutes without a tick is not a hidden window. tick() settles it as time away, at the offline rate, and takes up the fight again.');
  console.log('   "settled" is how many of the eight got that time. The Offline skill earns XP whenever it is.');
  const slept = list => { for (const [key] of WHO) B.forEach((b, bi) => {
    const rows = (b[list] || []).filter(r => r.key === key), ok = rows.filter(r => !r.err);
    if (!rows.length) { console.log('   ' + padr(bi ? '' : label(key), 16) + padr(many ? b.label : '', many ? 9 : 0) + 'not in these numbers'); return; }
    const settled = ok.filter(r => r.offXp > 0).length, kills = ok.map(r => r.kills);
    console.log('   ' + padr(bi ? '' : label(key), 16) + padr(many ? b.label : '', many ? 9 : 0) + `settled ${settled} of ${ok.length}   kills in the twelve minutes: ${kills.join(', ')}   most ticks from one late timer: ${Math.max(...ok.map(r => r.most))}`
      + (rows.length !== ok.length ? '   ' + rows.filter(r => r.err)[0].err.slice(0, 160) : ''));
  }); };
  console.log('\n   6a. On waking, the timers run in the order the fight, tick(), the once-a-second housekeeping, the save');
  slept('sleep');
  console.log('\n   6b. The same sleeps and the same dice, but on waking the save runs first');
  console.log('       A save stamps lastSeen. Up to build 0.9.127.10 the settle read the time away off lastSeen, so a save that ran before tick() left it nothing.');
  console.log('       From 0.9.127.11 tick() hands the settle the gap it measured between its own two ticks, and the order no longer matters.');
  console.log('       Chrome keeps the autosave\'s own timer behind tick()\'s (0 of 240 stalls on the real page), so read this order as anything that saves ahead of the settle.');
  console.log('       An opening objective completing at the top of tick() does, in every engine.');
  slept('sleepSave');
  console.log('');
}

/* ── run ── */
if (args[0] === '--child') { child(args[1]); }
else if (opt('from', '')) { tables(JSON.parse(fs.readFileSync(opt('from', ''), 'utf8'))); }
else {
  let files = args.filter(a => !a.startsWith('--'));
  const here = path.join(__dirname, 'cindervale.html');
  if (files.length === 0) files = [here]; else if (files.length === 1) files.push(here);
  const labels = files.length === 1 ? ['this'] : files.length === 2 ? ['before', 'after'] : files.map((f, i) => i === 0 ? 'before' : String.fromCharCode(64 + i));
  const t0 = Date.now();
  Promise.all(files.map(f => new Promise((res, rej) => {
    cp.execFile(process.execPath, [__filename, '--child', path.resolve(f), '--hours=' + HOURS], { maxBuffer: 64 * 1024 * 1024 }, (err, out, errOut) => {
      const m = /@@HW@@(.*)@@HW@@/s.exec(out || '');
      if (!m) return rej(new Error(path.basename(f) + ' did not finish: ' + String(err || errOut || out).slice(0, 800)));
      res(JSON.parse(m[1]));
    });
  }))).then(B => {
    B.forEach((b, i) => { b.label = labels[i]; });
    const bad = [];
    for (const b of B) for (const k of ['seen', 'hidden', 'first', 'offline', 'raids', 'skills', 'sleep', 'sleepSave']) for (const r of (b[k] || [])) if (r.err) bad.push(`${b.label} ${k}: ${r.err}`);
    tables(B);
    if (bad.length) console.log('SOMETHING DID NOT RUN:\n   ' + bad.slice(0, 8).join('\n   '));
    const js = opt('json', '');
    if (js) fs.writeFileSync(js, JSON.stringify(B));
    console.log(`(${Math.round((Date.now() - t0) / 1000)} s)`);
    process.exit(bad.length ? 1 : 0);
  }).catch(e => { console.error(String(e && e.message || e)); process.exit(1); });
}

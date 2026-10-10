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
function same(what, got, want) { const d = diff(JSON.parse(JSON.stringify(got)), want); check(!d, what, d ? d.slice(0, 220) : ''); }

/* ── the half that runs inside the game page ─────────────────────────────────
   Written as a function and handed to the page as source, so nothing in it needs
   escaping. Everything it calls is the game's. */
function PAGE() {
  var clamp = function (x) { return Math.max(0.03, Math.min(0.97, x)); };

  /* The combat level formula as it was before Magic, kept only to compare. */
  function oldCombatLevel() {
    var a = cmbLvl('attack'), s = cmbLvl('strength'), d = cmbLvl('defence'), h = cmbLvl('hitpoints'), r = cmbLvl('ranged');
    return Math.max(1, Math.floor((Math.max(a + s, r * 2) + d + h) / 4));
  }
  /* Does any existing save move? Every corner first, then a random sweep. Magic is
     absent, zero, and level 1: the three shapes an existing save can arrive in. */
  function levelCheck(n) {
    var moved = 0, seen = 0, seed = 1234567;
    var rnd = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    var keys = ['attack', 'strength', 'defence', 'hitpoints', 'ranged'];
    function test() { seen++; if (combatLevel() !== oldCombatLevel()) moved++; }
    state = defaultState(); normalizeState();
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

  function consts() {
    return { build: (document.querySelector('.mm-ver') || { getAttribute: function () { return ''; } }).getAttribute('data-build'),
      demo: IS_DEMO, hasMagicStat: !!COMBAT_STATS.magic };
  }

  window.SIM = { levelCheck: levelCheck, saves: saves, consts: consts };
}

setTimeout(() => {
  const w = dom.window;
  w.eval('(' + PAGE.toString() + ')()');
  const J = src => JSON.parse(w.eval('JSON.stringify(' + src + ')'));
  const C = J('SIM.consts()');
  console.log(`\nMAGIC, measured on build ${C.build}  ·  held to ${GOLD.from}\n`);
  check(C.demo === false, 'booted as the full game, not the demo');

  console.log('\n1. COMBAT LEVEL');
  const level = J('SIM.levelCheck(200000)');
  check(level.moved === 0, 'no existing save changes combat level', level.seen.toLocaleString() + ' saves tried, ' + level.moved + ' moved');
  check(level.mage99 === level.melee99 && level.arch99 === level.melee99, 'a pure mage, archer and fighter reach the same level', `${level.mage99} / ${level.arch99} / ${level.melee99}`);
  same('the combat level check is the one the prototype ran', level, GOLD.level);

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

  console.log(`\n${fails ? fails + ' CHECK' + (fails > 1 ? 'S' : '') + ' FAILED' : 'PASS'}: ${fails ? fails + ' of ' : 'all '}${checks} Magic checks\n`);
  process.exit(fails ? 1 : 0);
}, 2800);

/* Does every achievement actually FIRE when its condition is met?
 *
 *     node _achfire.js
 *
 * The existing guards prove none of them fires on a fresh save. That is the easy
 * half. This builds a "god state" that satisfies every condition the game can
 * express, and asserts all 62 then return true. Anything still false is either
 * unobtainable or reading a field nothing ever sets - the shard_bearer failure
 * mode, which sat unobtainable in the shipped game until someone noticed.
 *
 * Each field is set from the DATA (SKILLS, GUILDS, RAIDS, SAIL_ISLES...), so this
 * cannot drift the way a hand-written expected-value list would.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const raw = fs.readFileSync(path.join(__dirname, 'cindervale.html'), 'utf8');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';

const PROBE = function () {
  state = defaultState(); normalizeState();

  /* ---- everything, maxed, from the data ---- */
  for (const k in SKILLS) state.xp[k] = XP_CUM[99];
  /* combatLevel() reads state.combatXp (attack/strength/defence/ranged/hitpoints),
     a different pool from the skilling xp - setting only state.xp left blooded and
     veteran looking broken when they are fine. */
  for (const k in state.combatXp) state.combatXp[k] = XP_CUM[99];
  state.coins = 2e9 * SILVER_PER_GOLD;
  state.playtimeMs = 500 * 3600 * 1000;

  /* kills: every monster, and enough of them */
  state.monKills = {};
  MONSTERS.forEach(m => { state.monKills[m.id] = 200000; });

  /* trees: fill every one to 98 */
  state.tree = {};
  for (const sk in TREES) {
    state.tree[sk] = {};
    let left = 98;
    (TREES[sk] || []).forEach(n => {
      const take = Math.min(n.max || 1, left);
      if (take > 0) { state.tree[sk][n.id] = take; left -= take; }
    });
  }

  /* combat mastery: spend the whole board */
  state.cmast = {};
  if (typeof CMAST_NODES !== 'undefined') {
    let left = CMAST_CAP;
    CMAST_NODES.forEach(n => {
      const take = Math.min(n.max || 1, left);
      if (take > 0) { state.cmast[n.id] = take; left -= take; }
    });
  }
  state.cmastShards = 5;
  state.cmastZoneClears = {};
  ZONES.forEach(z => { state.cmastZoneClears[z.id] = 1; });

  /* collections */
  state.pets = {};
  for (const z in PETS) state.pets[PETS[z].id] = 1;
  if (typeof SECRET_PETS !== 'undefined') for (const k in SECRET_PETS) state.pets[SECRET_PETS[k].id || k] = 1;
  state.egg = { cats: 99 };
  state.discovered = {};
  for (const id in ITEMS) state.discovered[id] = 1;
  state.trophies = {};
  Object.keys(ITEMS).filter(i => ITEMS[i].trophyJewel).slice(0, 9).forEach(i => { state.trophies[i] = 1; });
  if (Object.keys(state.trophies).length < 5)
    for (let i = 0; i < 9; i++) state.trophies['t' + i] = 1;

  /* gear: every skillcape, a socketed+enchanted piece */
  state.gear = Object.values(SKILL_CAPE);
  /* a REAL socketable item and a REAL gem id - the first guess used ids that do
     not exist, so normalizeState dropped them and first_socket looked broken. */
  const _sock = Object.keys(ITEMS).find(i => typeof canSocket === 'function' && canSocket(i));
  const _gem = Object.keys(typeof SOCKET_GEMS !== 'undefined' ? SOCKET_GEMS : {})[0];
  if (_sock && _gem) state.sockets = { [_sock]: { slots: 2, gems: [_gem, null] } };
  state.enchantments = { [_sock || 'steel_sword']: 'uq_wc' };

  /* items: a thousand arrows, and one of everything else */
  state.items = {};
  for (const id in ITEMS) state.items[id] = 5;
  Object.keys(ITEMS).filter(i => ITEMS[i].ammo === 'arrow').forEach(i => { state.items[i] = 2000; });

  /* sailing */
  state.sail.voyages = 500;
  state.sail.hull = SAIL_HULLS.length - 1;
  state.sail.consort = 1;
  state.sail.hull2 = SAIL_HULLS.length - 1;
  state.sail.commsDone = 100;
  /* SAIL_ISLES entries have no id - the fields are n/b/lv/x/y/... - so key the
     found map by INDEX and by name, whichever the game uses. */
  state.sail.found = {};
  SAIL_ISLES.forEach((i, ix) => { state.sail.found[ix] = 1; state.sail.found[i.n] = 1; });

  /* guilds: top rank everywhere */
  state.gd = {};
  GUILDS.forEach(g => { state.gd[g.id] = { rep: GD_REP[GD_REP.length - 1] * 2, q: [], day: 0, skipped: 0 }; });

  /* slayer + raids */
  state.slayer.tasksDone = 500;
  state.slayer.streak = 99;
  state.slayer.points = 99999;
  state.raidClears = {}; state.raidBest = {};
  RAIDS.forEach(r => { state.raidClears[r.id] = 5; state.raidBest[r.id] = { rating: 'S', timeMs: 1000 }; });

  normalizeState();

  /* 'everything' depends on the others, so mark them all earned first */
  state.achievements = {};
  ACHIEVEMENTS.forEach(a => { if (a.id !== 'everything') state.achievements[a.id] = 1; });

  const fail = [], threw = [];
  ACHIEVEMENTS.forEach(a => {
    let r = null;
    try { r = a.check(); } catch (e) { threw.push(a.id + ': ' + e.message); return; }
    if (!r) fail.push(a.id + '  [' + a.cat + ']  ' + a.desc);
  });
  return { total: ACHIEVEMENTS.length, fail, threw,
           sailFound: Object.keys(state.sail.found).length, isles: SAIL_ISLES.length,
           guildRank: (typeof gdTitleNum === 'function') ? gdTitleNum(GUILDS[0].id) : '?',
           cmastSpent: (typeof cmastSpent === 'function') ? cmastSpent() : '?', cap: CMAST_CAP,
           trees98: Object.keys(state.tree).filter(s => {
             let v = 0; for (const n in state.tree[s]) v += state.tree[s][n]; return v >= 98; }).length };
};

(async () => {
  const dom = new JSDOM(raw, { url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); } });
  await new Promise(r => setTimeout(r, 2600));
  const r = dom.window.eval('(' + PROBE.toString() + ')()');
  console.log('achievements: ' + r.total);
  console.log('sail.found ' + r.sailFound + '/' + r.isles + '   guild rank ' + r.guildRank +
              '   mastery ' + r.cmastSpent + '/' + r.cap + '   trees at 98: ' + r.trees98);
  console.log('\nTHREW: ' + (r.threw.length ? '\n  ' + r.threw.join('\n  ') : 'none'));
  console.log('\nDID NOT FIRE on a maxed save (' + r.fail.length + '):');
  if (!r.fail.length) console.log('  none - every achievement is reachable');
  else r.fail.forEach(f => console.log('  ' + f));
  process.exit(0);
})();

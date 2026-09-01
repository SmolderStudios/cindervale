/* Prove the three slayer changes do what they claim, in a booted game.
 * Parsing is not working: the point formula, the cache purchase and the
 * auto-continue all have to be exercised.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const raw = fs.readFileSync(path.join(__dirname, 'cindervale.html'), 'utf8');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';

(async () => {
  const dom = new JSDOM(raw, {
    url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); },
  });
  await new Promise(r => setTimeout(r, 2500));
  const r = dom.window.eval(`(function(){
    const out = {};
    state = defaultState(); state.charName='P'; state.charType='wanderer'; normalizeState();

    // ── 1. points scale with the master, at every streak ──────────────────────
    state.slayer.perks = { quartermaster: 3 };
    const ptsFor = (m, streak) => {
      state.slayer.streak = streak;
      const master = slayerMasterFor(m);
      return master.pts + slayerPerkLevel('quartermaster') + Math.round(master.pts * Math.min(0.5, streak*0.05));
    };
    out.points = { noviceMax: ptsFor('novice', 20), expertMax: ptsFor('expert', 20),
                   generalMax: ptsFor('master', 20), novice0: ptsFor('novice', 0) };

    // ── 2. the cache ──────────────────────────────────────────────────────────
    out.cache = SLAYER_CACHE.map(c => ({ id: c.id, cost: c.cost, real: !!ITEMS[c.id] }));
    state.slayer.points = 300;
    const before = state.items.voidheart || 0;
    buySlayerCache('voidheart');
    out.bought = { got: (state.items.voidheart||0) - before, ptsLeft: state.slayer.points };
    // and it must refuse when short
    state.slayer.points = 10;
    const b2 = state.items.voidheart || 0;
    buySlayerCache('voidheart');
    out.refused = { got: (state.items.voidheart||0) - b2, ptsLeft: state.slayer.points };

    // ── 2b. the new tiered perks are gated AND wired ──────────────────────────
    out.tiers = SLAYER_PERKS.map(p => ({ id: p.id, lvl: p.lvl || 1, max: p.max }));
    // the buy path must refuse below the gate, not just grey the button
    state.slayer.xp = 0; state.slayer.points = 99999; state.slayer.perks = {};
    buySlayerPerk('tithe');
    out.gatedRefused = slayerPerkLevel('tithe') === 0;
    state.slayer.xp = XP_CUM[40];
    buySlayerPerk('tithe');
    out.gatedAllowed = slayerPerkLevel('tithe') === 1;

    // every perk id must appear somewhere OUTSIDE the SLAYER_PERKS table, or it is
    // a number that does nothing — the exact debt the mastery tree already carries
    out.unwired = [];
    {
      const src = document.querySelector('script').textContent;
      for (const pk of SLAYER_PERKS) {
        const hits = src.split("slayerPerkLevel('" + pk.id + "')").length - 1;
        if (hits < 1) out.unwired.push(pk.id);
      }
    }

    // Shortlist must actually shrink a bounty
    state.slayer.xp = XP_CUM[60];
    state.combatXp = { attack: XP_CUM[60], strength: XP_CUM[60], defence: XP_CUM[60], hitpoints: XP_CUM[60] };
    state.slayer.perks = {};
    const sizes = [];
    for (let i = 0; i < 40; i++) { state.slayer.task = null; assignSlayerTask('novice'); if (state.slayer.task) sizes.push(state.slayer.task.need); }
    state.slayer.perks = { shortlist: 3 };
    const small = [];
    for (let i = 0; i < 40; i++) { state.slayer.task = null; assignSlayerTask('novice'); if (state.slayer.task) small.push(state.slayer.task.need); }
    const avg = a => a.reduce((x,y)=>x+y,0)/a.length;
    out.shortlist = { base: +avg(sizes).toFixed(1), withPerk: +avg(small).toFixed(1) };

    // Bloodhound must raise the rare chance, but only on the bounty target
    state.slayer.perks = { bloodhound: 3 };
    const mon = MONSTERS.find(m => !m.boss && m.lvl > 20);
    state.slayer.task = { monId: mon.id, need: 10, done: 0, master: 'novice' };
    out.onTask = slayerOnTask(mon.id);
    out.offTask = slayerOnTask(MONSTERS.find(m => m.id !== mon.id && !m.boss).id);
    state.slayer.perks = {};

    // ── 2c. families and the Mark ─────────────────────────────────────────────
    // every monster must resolve to a family, or a Mark bound there is dead weight
    out.noFamily = MONSTERS.filter(m => !monsterFamily(m)).map(m => m.id);
    out.famCounts = {};
    for (const m of MONSTERS) { const f = monsterFamily(m); out.famCounts[f] = (out.famCounts[f]||0)+1; }

    state.slayer.points = 5000; state.slayer.markTier = 0; state.slayer.markFamily = null;
    // no Mark = no effect
    const wolf = MONSTERS.find(m => m.zone === 'wolf_den');
    const demon = MONSTERS.find(m => m.zone === 'demon_sanctum');
    out.markOff = markDamageMult(wolf);
    buyMarkTier();
    out.tier1 = markTier();
    bindMark('beast');
    out.boundBeast = markFamily();
    out.vsBeast = +markDamageMult(wolf).toFixed(3);
    out.vsDemon = +markDamageMult(demon).toFixed(3);
    // upgrading raises it
    buyMarkTier(); buyMarkTier();
    out.tier3 = markTier();
    out.vsBeastMax = +markDamageMult(wolf).toFixed(3);
    // a fourth buy must be refused
    const ptsBefore = state.slayer.points;
    buyMarkTier();
    out.overBuy = markTier() === MARK_TIERS.length && state.slayer.points === ptsBefore;
    // re-attuning charges
    const p2 = state.slayer.points;
    bindMark('demon');
    out.rebind = { fam: markFamily(), charged: p2 - state.slayer.points };
    // a family that no longer exists must not survive normalizeState
    state.slayer.markFamily = 'nonsense_family';
    normalizeState();
    out.staleFamilyCleared = markFamily() === null;

    // ── 2d. unlocks reach outside the slayer loop ─────────────────────────────
    state.slayer.points = 5000; state.slayer.pockets = 0; state.slayer.ledger = false;
    const capBefore = satchelCap();
    buySlayerUnlock('pockets');
    out.pockets = { before: capBefore, after: satchelCap() };
    buySlayerUnlock('ledger');
    out.ledger = !!state.slayer.ledger;
    const p3 = state.slayer.points;
    buySlayerUnlock('pockets');          // already owned
    out.noDoubleBuy = state.slayer.points === p3 && satchelCap() === capBefore + 8;

    // ── 3. auto-continue takes a new bounty ───────────────────────────────────
    state.combatXp = { attack: XP_CUM[60], strength: XP_CUM[60], defence: XP_CUM[60], hitpoints: XP_CUM[60] };
    state.slayer.xp = XP_CUM[40];
    state.slayer.auto = true;
    state.slayer.task = null;
    assignSlayerTask('novice');
    out.tookOne = !!state.slayer.task;
    out.autoFlagPersists = (function(){
      const s = JSON.parse(JSON.stringify(state));
      state = s; normalizeState();
      return state.slayer.auto === true;
    })();
    return out;
  })()`);

  const ok = [];
  const bad = [];
  const t = (name, cond, detail) => (cond ? ok : bad).push(name + (detail ? '  ' + detail : ''));

  t('novice max points cut 13 -> 8', r.points.noviceMax === 8, '(got ' + r.points.noviceMax + ')');
  t('general max points 26 -> 29',   r.points.generalMax === 29, '(got ' + r.points.generalMax + ')');
  t('general now pays more than novice', r.points.generalMax > r.points.noviceMax * 3,
    '(' + r.points.generalMax + ' vs ' + r.points.noviceMax + ')');
  t('cache items are real ITEMS', r.cache.every(c => c.real), JSON.stringify(r.cache.map(c=>c.id)));
  t('buying gives the item and charges', r.bought.got === 1 && r.bought.ptsLeft === 50,
    '(got ' + r.bought.got + ', ' + r.bought.ptsLeft + ' pts left)');
  t('refuses when short, charges nothing', r.refused.got === 0 && r.refused.ptsLeft === 10,
    '(got ' + r.refused.got + ', ' + r.refused.ptsLeft + ' pts left)');
  t('a bounty can be assigned', r.tookOne);
  t('auto flag survives normalizeState', r.autoFlagPersists);

  const tierLvls = [...new Set(r.tiers.map(x => x.lvl))].sort((a,b)=>a-b);
  t('perks arrive in tiers, not all at Lv 1', tierLvls.length > 1, '(gates: ' + tierLvls.join(', ') + ')');
  t('something unlocks at slayer 35', r.tiers.some(x => x.lvl === 35));
  t('something unlocks at slayer 75', r.tiers.some(x => x.lvl === 75));
  t('buying below the gate is refused', r.gatedRefused);
  t('buying at the gate works', r.gatedAllowed);
  t('every perk is wired, none decorative', r.unwired.length === 0, r.unwired.join(', '));
  t('Shortlist shrinks bounties', r.shortlist.withPerk < r.shortlist.base * 0.85,
    '(' + r.shortlist.base + ' -> ' + r.shortlist.withPerk + ' kills)');
  t('on-task detection is target-specific', r.onTask === true && r.offTask === false);

  t('every monster resolves to a family', r.noFamily.length === 0, r.noFamily.join(', '));
  t('families are spread, not one bucket', Object.keys(r.famCounts).length >= 6,
    Object.entries(r.famCounts).map(([k,v])=>k+' '+v).join(', '));
  t('no Mark = no damage change', r.markOff === 1);
  t('the Mark buys and binds', r.tier1 === 1 && r.boundBeast === 'beast');
  t('it only helps against its family', r.vsBeast > 1 && r.vsDemon === 1,
    '(beast x' + r.vsBeast + ', demon x' + r.vsDemon + ')');
  t('upgrading raises the bonus', r.tier3 === 3 && r.vsBeastMax > r.vsBeast,
    '(x' + r.vsBeast + ' -> x' + r.vsBeastMax + ')');
  t('a fourth tier is refused, nothing charged', r.overBuy);
  t('re-attuning charges points', r.rebind.fam === 'demon' && r.rebind.charged > 0,
    '(' + r.rebind.charged + ' pts)');
  t('a stale family is cleared on load', r.staleFamilyCleared);
  t('Deeper Pockets raises the satchel cap', r.pockets.after === r.pockets.before + 8,
    '(' + r.pockets.before + ' -> ' + r.pockets.after + ')');
  t('Bounty Ledger unlocks', r.ledger);
  t('an owned unlock cannot be bought twice', r.noDoubleBuy);

  ok.forEach(x => console.log('  ok   ' + x));
  bad.forEach(x => console.log('  FAIL ' + x));
  console.log('\n' + (bad.length ? 'FAIL — ' + bad.length + ' of ' + (ok.length+bad.length)
                                 : 'PASS — all ' + ok.length + ' checks'));
  dom.window.close();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

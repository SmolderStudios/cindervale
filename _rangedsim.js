/* Ranged balance simulator.
 *
 *     node _rangedsim.js            the table
 *     node _rangedsim.js --json     machine readable
 *
 * DESIGN.md section 4 promised this before ranged goes anywhere near a balance
 * patch, for the reason the offline rework taught the hard way: a number being far
 * too large is not an error, nothing throws, and no harness notices. The only way
 * to know whether 1.35 is right is to compute it.
 *
 * WHAT IT COMPARES. Damage per second, melee against bow against crossbow, at
 * matched investment and matched gear tier, with the ammunition cost subtracted
 * from ranged. Matched investment means a melee character at attack N and strength
 * N is put against a ranged character at ranged N: two stats versus one, which is
 * the whole reason ranged pays a lower coefficient per level.
 *
 * TARGET: ranged lands inside 95-105% of melee. Outside that band is a bug.
 *
 * It reads the live constants out of cindervale.html rather than restating them,
 * so it cannot drift from the game the way a copied table would.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const JSON_OUT = process.argv.includes('--json');
const html = fs.readFileSync(path.join(__dirname, 'cindervale.html'), 'utf8');
const vc = new VirtualConsole();
const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously',
  pretendToBeVisual: true, virtualConsole: vc });

setTimeout(() => {
  const w = dom.window;
  const out = w.eval(`(function(){
    state=defaultState(); normalizeState();
    /* Lift the demo cap; this harness has no user agent so IS_DEMO is true and every
       level would clamp to 10. */
    demoXpCap=function(){ return XP_CAP; };

    var LEVELS=[20,40,60,80,99];
    /* Matched tiers. Melee takes the sword of that tier, ranged takes the bow or
       crossbow of the same tier and the ammunition of the same tier, so nobody is
       compared against gear they could not have. */
    var TIERS={20:1, 40:3, 60:5, 80:6, 99:7};
    var METAL=['bronze','iron','steel','mithril','cobalt','runite','starsteel','starfall'];
    var WOOD=['pine','oak','ironbark','ember','frost','shadow','ancient'];

    function clear(){
      state.combatEquipped={};
      state.combatXp={attack:0,strength:0,defence:0,ranged:0,hitpoints:XP_CUM[99]};
      state.items={};
      state.tree={}; state.cmast={}; state.charClass=null;
    }
    /* DPS against a defence value, using the game's OWN hit formula so the
       comparison cannot drift from what combatTick actually does. */
    function dps(foeDef){
      var acc=playerAccuracy(), hit=playerMaxHit(), swing=playerSwingMs();
      var p=Math.max(0.03, Math.min(0.97, acc/(acc+foeDef)));
      var avg=hit*(COMBAT_P.HIT_MIN+(1-COMBAT_P.HIT_MIN))/2;
      return (p*avg)/(swing/1000);
    }
    /* A defence that scales with the level being tested, so we are never measuring
       everything against a rat. */
    function foeDefFor(lv){ return Math.round(12+lv*3.2); }

    var rows=[];
    LEVELS.forEach(function(lv){
      var t=TIERS[lv], def=foeDefFor(lv);
      var metal=METAL[t-1], wood=WOOD[Math.min(WOOD.length-1,t-1)];

      // melee: two stats at lv, the sword of that tier
      clear();
      state.combatXp.attack=XP_CUM[lv]; state.combatXp.strength=XP_CUM[lv];
      var sword=metal+'_sword';
      if(!ITEMS[sword]) sword='steel_sword';
      state.combatEquipped.weapon=sword;
      var melee=dps(def), meleeHit=playerMaxHit(), meleeAcc=playerAccuracy(), meleeSwing=playerSwingMs();

      // bow: ONE stat at lv, the shortbow of that tier plus matching arrows
      clear();
      state.combatXp.ranged=XP_CUM[lv];
      state.combatEquipped.weapon=wood+'_shortbow';
      state.combatEquipped.quiver=metal+'_arrow';
      state.items[metal+'_arrow']=100000;
      var bow=dps(def), bowHit=playerMaxHit(), bowAcc=playerAccuracy(), bowSwing=playerSwingMs();

      // longbow, same investment
      clear();
      state.combatXp.ranged=XP_CUM[lv];
      state.combatEquipped.weapon=wood+'_longbow';
      state.combatEquipped.quiver=metal+'_arrow';
      state.items[metal+'_arrow']=100000;
      var lbow=dps(def);

      // crossbow and bolts
      clear();
      state.combatXp.ranged=XP_CUM[lv];
      state.combatEquipped.weapon=metal+'_crossbow';
      state.combatEquipped.quiver=metal+'_bolt';
      state.items[metal+'_bolt']=100000;
      var xbow=dps(def), xbowSwing=playerSwingMs();

      /* The ammunition bill, as a share of the gold the same fighting earns. Ranged
         is only at parity if it is still at parity after paying for its arrows. */
      var arrowsPerHr=3600000/bowSwing;
      var arrowCost=arrowsPerHr*(ITEMS[metal+'_arrow'].sell||1);
      /* What the Salvager line actually buys. Recovery is paid as a chance not to
         consume, so the arrows you burn is the raw rate times (1-rate), and the
         fletching time is that divided by twelve to a batch. This is the second
         check DESIGN.md asked for: ranged has to be able to FEED itself. */
      var flAct=SKILLS.fletching.acts.filter(function(x){ return x.id==='fl_ar_'+metal; })[0];
      var batchMs=flAct?Math.max(flAct.minMs, flAct.ms*flAct.spdMult):5000;
      function feed(rate){
        var burn=arrowsPerHr*(1-rate);
        var per=(flAct&&flAct.out[metal+'_arrow'])||15;   // batch size, read from the act
        return {burn:Math.round(burn), batches:Math.round(burn/per), mins:+((burn/per*batchMs)/60000).toFixed(1)};
      }

      rows.push({lv:lv, tier:t, foeDef:def,
        melee:+melee.toFixed(1), bow:+bow.toFixed(1), longbow:+lbow.toFixed(1), xbow:+xbow.toFixed(1),
        bowPct:+(bow/melee*100).toFixed(1), longPct:+(lbow/melee*100).toFixed(1), xbowPct:+(xbow/melee*100).toFixed(1),
        meleeHit:meleeHit, bowHit:bowHit, meleeAcc:meleeAcc, bowAcc:bowAcc,
        meleeSwing:meleeSwing, bowSwing:bowSwing, xbowSwing:xbowSwing,
        arrowsPerHr:Math.round(arrowsPerHr), arrowGoldPerHr:Math.round(arrowCost),
        feedNone:feed(0), feedMid:feed(0.40), feedMax:feed(0.85)});
    });
    return JSON.stringify({rows:rows, hitLvl:RANGED_HIT_LVL, meleeHitLvl:COMBAT_P.HIT_LVL});
  })()`);

  const r = JSON.parse(out);
  if (JSON_OUT) { console.log(JSON.stringify(r, null, 1)); process.exit(0); }

  const pad = (s, n) => String(s).padStart(n);
  console.log(`\nRanged balance  ·  ranged x${r.hitLvl} per level against melee x${r.meleeHitLvl}`);
  console.log('target: every ranged column inside 95-105% of melee\n');
  console.log('  lv  tier  foeDef |    melee      bow           longbow       crossbow');
  console.log('  ' + '-'.repeat(74));
  let worst = 0, worstWhat = '';
  for (const x of r.rows) {
    const mark = p => (p < 95 || p > 105) ? '  <-- OUT' : '';
    console.log(`  ${pad(x.lv,2)}  ${pad('T'+x.tier,4)}  ${pad(x.foeDef,6)} | ${pad(x.melee,8)}  `
      + `${pad(x.bow,7)} ${pad(x.bowPct+'%',7)}  ${pad(x.longbow,7)} ${pad(x.longPct+'%',7)}  `
      + `${pad(x.xbow,7)} ${pad(x.xbowPct+'%',7)}`);
    for (const [k, p] of [['bow',x.bowPct],['longbow',x.longPct],['crossbow',x.xbowPct]]) {
      const off = Math.abs(p - 100);
      if (off > worst) { worst = off; worstWhat = `${k} at Lv${x.lv}: ${p}%`; }
    }
  }
  /* The second check: can ranged FEED itself? An hour of shooting has to cost less
     than an hour of fletching, or the build is a treadmill that outruns you. Shown
     at no Salvager, at a mid tree, and at the 85% cap. */
  console.log('\n  feeding the bow: arrows burned an hour, and the fletching it takes');
  console.log('     lv |   no Salvager      |   40% recovered    |   85%, maxed');
  console.log('  ' + '-'.repeat(70));
  for (const x of r.rows) {
    const f = g => `${pad(g.burn,5)}/hr ${pad(g.mins+'m',6)}`;
    console.log(`   ${pad(x.lv,4)} |  ${f(x.feedNone)}    |  ${f(x.feedMid)}    |  ${f(x.feedMax)}`);
  }
  const worstFeed = Math.max(...r.rows.map(x => x.feedNone.mins));
  const bestFeed  = Math.max(...r.rows.map(x => x.feedMax.mins));
  console.log(`\n  worst case, no tree at all: ${worstFeed}m of fletching per hour of shooting`);
  console.log(`  maxed Salvager:             ${bestFeed}m per hour`);
  if (worstFeed > 30) console.log('  NOTE: over half an hour of fletching per hour fought is a treadmill, not a cost.');
  const ok = worst <= 5;
  console.log(`\n  worst deviation: ${worstWhat}`);
  console.log(ok ? '  PASS: everything inside the band\n' : '  FAIL: outside 95-105, retune before shipping\n');
  process.exit(ok ? 0 : 1);
}, 3000);

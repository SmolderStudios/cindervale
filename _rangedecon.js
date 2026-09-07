/* Ranged economy and build comparison.
 *
 *     node _rangedecon.js          everything
 *     node _rangedecon.js --json   machine readable
 *
 * _rangedsim.js answers one question: is ranged DPS at parity with melee. This
 * answers the rest of them.
 *
 *   1. DPS against EVERY build, not just a sword. Dagger, sword, hammer, the two
 *      handers, shield and no shield, and each of the three classes, because a
 *      Berserker with a maul is a very different bar to clear than a bare sword.
 *   2. What an arrow actually costs, from the bar down, against what the fighting
 *      that spends it pays.
 *   3. Fletching XP rates and time to 99, against the skills it sits beside.
 *   4. The arrowhead step: does Smithing them beat Smithing anything else, and
 *      does the bar-to-arrow chain lose money.
 *
 * Reads live constants out of the game. Nothing here is restated.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const JSON_OUT = process.argv.includes('--json');
const html = fs.readFileSync(path.join(__dirname, 'cindervale.html'), 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously',
  pretendToBeVisual: true, virtualConsole: new VirtualConsole() });

setTimeout(() => {
  const out = dom.window.eval(`(function(){
    state=defaultState(); normalizeState();
    demoXpCap=function(){ return XP_CAP; };

    function reset(){
      state.combatEquipped={};
      state.combatXp={attack:0,strength:0,defence:0,ranged:0,hitpoints:XP_CUM[99]};
      state.items={}; state.tree={}; state.cmast={}; state.charClass=null;
      state.combatStyle='attack';
    }
    function dps(foeDef){
      var acc=playerAccuracy(), hit=playerMaxHit(), swing=playerSwingMs();
      var p=Math.max(0.03, Math.min(0.97, acc/(acc+foeDef)));
      return (p*(hit*(COMBAT_P.HIT_MIN+1)/2))/(swing/1000);
    }

    /* ── 1. every build, at Lv 80 against a matching foe ───────────────────── */
    var LV=80, DEF=Math.round(12+LV*3.2), TIER=6;
    var metal='runite', wood='shadow';
    function melee(weapon, shield, cls){
      reset();
      state.charClass=cls||null;
      state.combatXp.attack=XP_CUM[LV]; state.combatXp.strength=XP_CUM[LV];
      state.combatEquipped.weapon=weapon;
      if(shield) state.combatEquipped.shield=shield;
      return {dps:+dps(DEF).toFixed(1), hit:playerMaxHit(), acc:playerAccuracy(), swing:playerSwingMs()};
    }
    function ranged(weapon, ammo, cls, armour){
      reset();
      state.charClass=cls||null;
      state.combatXp.ranged=XP_CUM[LV];
      state.combatEquipped.weapon=weapon;
      state.combatEquipped.quiver=ammo;
      state.items[ammo]=100000;
      if(armour) for(var k in armour){ state.combatEquipped[k]=armour[k]; }
      return {dps:+dps(DEF).toFixed(1), hit:playerMaxHit(), acc:playerAccuracy(), swing:playerSwingMs()};
    }
    var builds=[];
    var CLASSES=[null,'rogue','berserker','guardian'];
    CLASSES.forEach(function(c){
      var cn=c||'none';
      builds.push({cls:cn, build:'sword + shield',  r:melee(metal+'_sword', metal+'_shield', c)});
      builds.push({cls:cn, build:'dagger',          r:melee(metal+'_dagger', null, c)});
      builds.push({cls:cn, build:'hammer',          r:melee(metal+'_hammer', null, c)});
      /* grave_cleaver is a T7 RAID drop; putting it against T6 runite measured 185%
         and told us nothing about ranged. Kept, but labelled as the outlier it is. */
      builds.push({cls:cn, build:'2H (raid, T7)', r:melee('grave_cleaver', null, c), outlier:true});
      builds.push({cls:cn, build:'shortbow',        r:ranged(wood+'_shortbow', metal+'_arrow', c)});
      builds.push({cls:cn, build:'longbow',         r:ranged(wood+'_longbow',  metal+'_arrow', c)});
      builds.push({cls:cn, build:'crossbow+shield', r:ranged(metal+'_crossbow', metal+'_bolt', c, {shield:metal+'_shield'})});
    });

    /* ── 2. what an arrow really costs ─────────────────────────────────────────
       In TIME, not gold. Gold is the wrong lens and the first version of this
       section was misled by it: it priced a bronze arrow at 11g of bar, log and
       feather against a Cave Rat's 3g purse and reported -272%, which reads like
       ranged is unplayable. Nobody BUYS the bar. You mine it, smelt it, chop the
       log, and the feathers fall out of the birds you were killing anyway. The
       real question is how many minutes of gathering and making an hour of
       shooting costs you, and that is what this measures. Gold is kept as a
       second column for the player who does buy their arrows off the board. */
    var AM=RANGED_AMMO, WD=RANGED_WOODS;
    function actOf(skill,id){ return SKILLS[skill].acts.filter(function(a){return a.id===id;})[0]; }
    function actSec(skill,id){ var a=actOf(skill,id); return a?actMs(a,skill)/1000:0; }
    /* The gathering act that produces a given raw material, at its own speed. */
    function gatherSec(skill,itemId){
      var acts=SKILLS[skill].acts.filter(function(a){ return a.out&&a.out[itemId]; });
      if(!acts.length) return 0;
      var a=acts[0];
      return (actMs(a,skill)/1000)/(a.out[itemId]||1);
    }
    var ammoCost=AM.map(function(a,i){
      var w=WD.filter(function(x){ return x.fl<=a.fl; }).pop()||WD[0];
      var headAct=actOf('smithing','sm_ah_'+a.k);
      var flAct  =actOf('fletching','fl_ar_'+a.k);
      var shAct  =actOf('fletching','fl_sh_'+w.k);
      var headsPerBar=(headAct&&headAct.out[a.k+'_arrowhead'])||15;
      var perBatch   =(flAct&&flAct.out[a.k+'_arrow'])||15;
      var shaftsPerLog=(shAct&&shAct.out.wood_shaft)||w.yield;

      /* seconds of work inside ONE arrow, every step of the chain */
      var oreSec  = gatherSec('mining', a.bar.replace('_bar','_ore'));
      var smeltAct= SKILLS.smithing.acts.filter(function(x){ return x.out&&x.out[a.bar]; })[0];
      var smeltSec= smeltAct?actMs(smeltAct,'smithing')/1000:0;
      var chopSec = gatherSec('woodcutting', w.log);
      var barSec  = (oreSec + smeltSec) / headsPerBar;      // metal, per arrow
      var headSec = actSec('smithing','sm_ah_'+a.k)/headsPerBar;
      var shaftSec= (chopSec + actSec('fletching','fl_sh_'+w.k))/shaftsPerLog;
      var makeSec = actSec('fletching','fl_ar_'+a.k)/perBatch;
      var perArrowSec = barSec+headSec+shaftSec+makeSec;    // feathers are free, they drop

      var barGold=(ITEMS[a.bar]&&ITEMS[a.bar].sell)||0;
      var logGold=(ITEMS[w.log]&&ITEMS[w.log].sell)||0;
      var per = barGold/headsPerBar + logGold/shaftsPerLog + ITEMS.feather.sell;

      return {tier:a.n, bar:a.bar, log:w.n, shaftsPerLog:shaftsPerLog,
              headsPerBar:headsPerBar, perBatch:perBatch,
              perArrowGold:+per.toFixed(2), arrowSell:(ITEMS[a.k+'_arrow']||{}).sell||0,
              perArrowSec:+perArrowSec.toFixed(2),
              barSec:+barSec.toFixed(2), headSec:+headSec.toFixed(2),
              shaftSec:+shaftSec.toFixed(2), makeSec:+makeSec.toFixed(2)};
    });

    /* ── 3. Fletching xp rates, against its neighbours ─────────────────────── */
    function best(skill, lvl){
      var m=mods(skill);
      var acts=SKILLS[skill].acts.filter(function(a){ return (a.lvl||1)<=lvl; });
      var top=0, name='';
      acts.forEach(function(a){
        var ms=actMs(a,skill);
        if(!(ms>0)) return;
        var xph=a.xp*(3600000/ms)*m.xpMult;
        if(xph>top){ top=xph; name=a.name; }
      });
      return {xph:Math.round(top), act:name};
    }
    var SKILLS_CMP=['fletching','crafting','smithing','cooking','alchemy','jeweler','firemaking'];
    var rates=[20,50,80,99].map(function(lv){
      var row={lv:lv};
      SKILLS_CMP.forEach(function(s){
        for(var k in SKILLS) state.xp[k]=XP_CUM[lv];
        row[s]=best(s,lv).xph;
      });
      return row;
    });
    for(var k in SKILLS) state.xp[k]=XP_CUM[99];
    var toNinetyNine={};
    SKILLS_CMP.forEach(function(s){
      var r=best(s,99).xph;
      toNinetyNine[s]={xph:r, hours:+(XP_CUM[99]/Math.max(1,r)).toFixed(1), act:best(s,99).act};
    });

    /* ── 4. the arrowhead step ─────────────────────────────────────────────── */
    var heads=AM.map(function(a){
      for(var k in SKILLS) state.xp[k]=XP_CUM[99];
      var m=mods('smithing');
      var ah=actOf('smithing','sm_ah_'+a.k), bt=actOf('smithing','sm_bt_'+a.k);
      var barAct=SKILLS.smithing.acts.filter(function(x){
        return x.out && x.out[a.bar] && x.lvl<=99; })[0];
      function xph(act){ var ms=actMs(act,'smithing'); return Math.round(act.xp*(3600000/ms)*m.xpMult); }
      return {tier:a.n, headXph:xph(ah), tipXph:xph(bt),
              barXph: barAct?xph(barAct):0,
              headsPerBar:ah.out[a.k+'_arrowhead'], tipsPerBar:bt.out[a.k+'_bolt_tip']};
    });

    return JSON.stringify({lv:LV, foeDef:DEF, builds:builds, ammoCost:ammoCost,
                           rates:rates, toNinetyNine:toNinetyNine, heads:heads});
  })()`);

  const r = JSON.parse(out);
  if (JSON_OUT) { console.log(JSON.stringify(r, null, 1)); process.exit(0); }
  const pad = (s, n) => String(s).padStart(n);
  const padr = (s, n) => String(s).padEnd(n);

  console.log(`\n1. EVERY BUILD  ·  Lv ${r.lv}, foe defence ${r.foeDef}, matched tier`);
  console.log('   melee spends attack AND strength at that level; ranged spends one stat\n');
  let cls = null;
  const meleeBase = {};
  for (const b of r.builds) if (b.build === 'sword + shield') meleeBase[b.cls] = b.r.dps;
  for (const b of r.builds) {
    if (b.cls !== cls) { cls = b.cls; console.log(`   ${cls}`); }
    const pct = (b.r.dps / meleeBase[b.cls] * 100).toFixed(0);
    console.log(`     ${padr(b.build,16)} ${pad(b.r.dps,7)} dps  ${pad(pct+'%',5)}  `
      + `hit ${pad(b.r.hit,4)}  acc ${pad(b.r.acc,4)}  swing ${pad(b.r.swing,5)}ms`);
  }

  console.log('\n2. WHAT AN ARROW COSTS  ·  in seconds of work, from the ore up');
  console.log('   feathers are free: they drop off the birds you were shooting anyway\n');
  console.log('   tier         metal   head  shaft   make |  per arrow    an hour of shooting     buying the mats');
  for (const a of r.ammoCost) {
    const perHr = 1769 * a.perArrowSec / 60;   // 1769 arrows/hr is a bow's pace
    const maxed = perHr * 0.15;                // what 85% Salvager leaves
    console.log(`   ${padr(a.tier,10)} ${pad(a.barSec,7)}${pad(a.headSec,7)}${pad(a.shaftSec,7)}${pad(a.makeSec,7)} |`
      + ` ${pad(a.perArrowSec+'s',9)}   ${pad(perHr.toFixed(0)+'m',4)} raw  ${pad(maxed.toFixed(0)+'m',4)} maxed   `
      + `${pad(a.perArrowGold.toFixed(0),5)}g in ${pad(a.arrowSell,5)}g out`);
  }

  console.log('\n3. FLETCHING XP AGAINST ITS NEIGHBOURS  ·  best unlocked act, xp/hr');
  const cols = ['fletching','crafting','smithing','cooking','alchemy','jeweler','firemaking'];
  console.log('   lv  ' + cols.map(c => pad(c.slice(0,9), 10)).join(''));
  for (const row of r.rates) {
    console.log('   ' + pad(row.lv,2) + '  ' + cols.map(c => pad((row[c]/1000).toFixed(1)+'k', 10)).join(''));
  }
  console.log('\n   hours of pure action to reach 99, at the best act:');
  for (const c of cols) {
    const t = r.toNinetyNine[c];
    console.log(`     ${padr(c,12)} ${pad(t.hours,7)}h   ${padr(t.act,28)} ${pad((t.xph/1000).toFixed(0)+'k',6)} xp/hr`);
  }

  console.log('\n4. THE ARROWHEAD STEP  ·  Smithing xp/hr, heads against the bar itself');
  console.log('   tier          heads      tips       the bar    heads vs bar');
  for (const h of r.heads) {
    const rel = h.barXph ? (h.headXph / h.barXph * 100).toFixed(0) + '%' : 'n/a';
    console.log(`   ${padr(h.tier,12)} ${pad((h.headXph/1000).toFixed(1)+'k',9)} `
      + `${pad((h.tipXph/1000).toFixed(1)+'k',9)} ${pad((h.barXph/1000).toFixed(1)+'k',10)} ${pad(rel,13)}`);
  }
  console.log('');
}, 3000);

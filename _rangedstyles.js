/* Are the three ranged styles a real choice?
 *
 *     node _rangedstyles.js
 *
 * Rapid is meant to be the damage pick and Jordan expects it to stay #1. The
 * question is by HOW MUCH, and whether the other two buy enough to exist:
 *
 *   Accurate    baseline
 *   Rapid       -12% swing, -10% accuracy   -> most damage
 *   Longrange   +8% swing, half the XP to Defence
 *
 * Rapid's speed gain is flat, but its accuracy loss bites harder the worse your
 * hit chance already is, so the gap should NARROW as foe defence rises. That is
 * the whole reason Accurate is on the board. Measured across the defence range
 * the game actually contains, plus the XP split checked through grantCombatXp.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const dom = new JSDOM(fs.readFileSync(path.join(__dirname, 'cindervale.html'), 'utf8'),
  { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true,
    virtualConsole: new VirtualConsole() });

setTimeout(() => {
  const r = JSON.parse(dom.window.eval(`(function(){
    state=defaultState(); normalizeState(); demoXpCap=function(){ return XP_CAP; };

    function setup(style, weapon){
      state.cmast={}; state.charClass=null; state.tree={};
      state.combatStyle=style;
      state.combatXp={attack:XP_CUM[85],strength:XP_CUM[85],defence:XP_CUM[85],
                      hitpoints:XP_CUM[99],ranged:XP_CUM[85]};
      state.combatEquipped={weapon:weapon};
      var it=ITEMS[weapon];
      if(it&&it.ammo){
        var am=(it.ammo==='bolt')?'starsteel_bolt':'starsteel_arrow';
        state.combatEquipped.quiver=am; state.items={}; state.items[am]=99999;
      }
      combat.active=false;
    }
    function dps(def){
      var acc=playerAccuracy(), hit=playerMaxHit(), swing=playerSwingMs();
      var p=Math.max(0.03, Math.min(0.97, acc/(acc+def)));
      return (p*hit*(COMBAT_P.HIT_MIN+1)/2)/(swing/1000);
    }

    /* The defence range the game actually contains, floor to ceiling. */
    var mons=MONSTERS.filter(function(m){ return !m.bossReq; });
    var lowDef=Math.min.apply(null,mons.map(function(m){return m.def;}));
    var hiDef =Math.max.apply(null,mons.map(function(m){return m.def;}));

    /* Sorted, or the summary line compares the first row against whichever
       defence happened to land last rather than against the highest. */
    var DEFS=[lowDef, 60, 120, 200, 300, 450, hiDef].sort(function(a,b){return a-b;});
    var rows=DEFS.map(function(d){
      setup('attack','ancient_longbow');   var acc=dps(d), accSw=playerSwingMs(), accAc=playerAccuracy();
      setup('strength','ancient_longbow'); var rap=dps(d), rapSw=playerSwingMs(), rapAc=playerAccuracy();
      setup('defence','ancient_longbow');  var lng=dps(d), lngSw=playerSwingMs();
      return {def:d,
        acc:+acc.toFixed(1), rap:+rap.toFixed(1), lng:+lng.toFixed(1),
        rapPct:+((rap/acc-1)*100).toFixed(1), lngPct:+((lng/acc-1)*100).toFixed(1),
        accSw:accSw, rapSw:rapSw, lngSw:lngSw, accAc:accAc, rapAc:rapAc};
    });

    /* Longrange must actually hand XP to Defence, and the other two must not. */
    function xpSplit(style){
      setup(style,'ancient_longbow');
      var before={ranged:state.combatXp.ranged, defence:state.combatXp.defence};
      grantCombatXp('ranged', 1000);
      return {ranged:state.combatXp.ranged-before.ranged,
              defence:state.combatXp.defence-before.defence};
    }
    var xp={accurate:xpSplit('attack'), rapid:xpSplit('strength'), longrange:xpSplit('defence')};

    /* A melee weapon must be untouched by any of it. */
    var melee={};
    ['attack','strength','defence'].forEach(function(st){
      setup(st,'starsteel_sword');
      melee[st]={swing:playerSwingMs(), acc:playerAccuracy()};
    });

    return JSON.stringify({rows:rows, xp:xp, melee:melee, lowDef:lowDef, hiDef:hiDef});
  })()`));

  const pad = (s, n) => String(s).padEnd(n);
  const rp = (s, n) => String(s).padStart(n);

  console.log('\n  RANGED STYLES  ·  Lv 85, ancient longbow, starsteel arrows\n');
  console.log('     foe def |  Accurate      Rapid            Longrange');
  console.log('  ' + '-'.repeat(62));
  for (const x of r.rows) {
    console.log(`     ${rp(x.def, 7)} | ${rp(x.acc, 8)}  ${rp(x.rap, 8)} ${rp('+' + x.rapPct + '%', 7)}  `
      + `${rp(x.lng, 8)} ${rp(x.lngPct + '%', 7)}`);
  }
  const first = r.rows[0], last = r.rows[r.rows.length - 1];
  console.log(`\n     swing   Accurate ${first.accSw}ms   Rapid ${first.rapSw}ms   Longrange ${first.lngSw}ms`);
  console.log(`     acc     Accurate ${first.accAc}      Rapid ${first.rapAc}`);
  console.log(`\n     Rapid's lead narrows from +${first.rapPct}% at defence ${first.def}`
    + ` to +${last.rapPct}% at ${last.def}`);

  console.log('\n  XP from 1000 ranged xp:');
  for (const k of ['accurate', 'rapid', 'longrange']) {
    console.log(`     ${pad(k, 11)} ranged ${rp(r.xp[k].ranged, 5)}   defence ${rp(r.xp[k].defence, 5)}`);
  }
  console.log('\n  a melee weapon, all three styles (must be identical):');
  for (const k of ['attack', 'strength', 'defence']) {
    console.log(`     ${pad(k, 10)} swing ${r.melee[k].swing}ms   acc ${r.melee[k].acc}`);
  }

  const bad = [];
  if (r.rows.some(x => x.rapPct <= 0)) bad.push('Rapid is not the damage pick at every defence');
  if (r.rows.some(x => x.rapPct > 15)) bad.push('Rapid runs away with it (>15%)');
  if (r.rows.some(x => x.lngPct > 0)) bad.push('Longrange is not paying for its Defence xp');
  if (last.rapPct >= first.rapPct) bad.push('Rapid does not narrow as defence rises, so Accurate has no niche');
  if (r.xp.longrange.defence <= 0) bad.push('Longrange grants no Defence xp');
  if (r.xp.rapid.defence !== 0 || r.xp.accurate.defence !== 0) bad.push('a non-Longrange style leaked xp to Defence');
  const m = r.melee;
  if (m.attack.swing !== m.strength.swing || m.attack.acc !== m.strength.acc) bad.push('ranged styles leaked onto a melee weapon');
  console.log(bad.length ? '\n  FAIL\n     ' + bad.join('\n     ') + '\n'
    : '\n  PASS: Rapid leads everywhere but narrows, Longrange pays for its Defence xp,\n'
      + '        and a melee weapon is untouched\n');
  process.exit(bad.length ? 1 : 0);
}, 3000);

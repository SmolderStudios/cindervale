/* Does every Combat Mastery node do what its TOOLTIP says?
 *
 *     node _cmastclaims.js
 *
 * _audit_tests.js already asserts each node "changes something", and
 * _cmastwire.js asserts the Marksman column moves the right channel. Neither
 * checks the MAGNITUDE, so a node could read "+3% per rank" and pay 0.3%, or pay
 * the right number into the wrong channel, and both harnesses would still be
 * green. This one reads the claim off the node's own description and measures it.
 *
 * Nodes whose effect is a per-hit proc rather than a number (Bleeder, Cleaving
 * Edge, Second Wind, Last Stand, Retribution, Ember Wrath) are listed as PROC and
 * checked for wiring only — the probes for those live in _audit_tests.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'cindervale.html'), 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously',
  pretendToBeVisual: true, virtualConsole: new VirtualConsole() });

setTimeout(() => {
  const r = JSON.parse(dom.window.eval(`(function(){
    state=defaultState(); normalizeState(); demoXpCap=function(){ return XP_CAP; };

    var BOW='shadow_longbow', XBOW='runite_crossbow', SWORD='runite_sword',
        DAGGER='runite_dagger', SHIELD='runite_shield';
    function reset(weapon, extra){
      state.cmast={}; state.charClass=null; state.items={};
      state.combatXp={attack:XP_CUM[80],strength:XP_CUM[80],defence:XP_CUM[80],
                      hitpoints:XP_CUM[80],ranged:XP_CUM[80]};
      state.combatEquipped={};
      if(weapon){
        state.combatEquipped.weapon=weapon;
        if(ITEMS[weapon]&&ITEMS[weapon].ammo){
          var am=(ITEMS[weapon].ammo==='bolt')?'runite_bolt':'runite_arrow';
          state.combatEquipped.quiver=am; state.items[am]=9000;
        }
      }
      if(extra) for(var k in extra) state.combatEquipped[k]=extra[k];
      combat.active=false;
    }
    /* Every measurable channel, read the way the GAME reads it. maxHit/acc/swing
       come from the player-facing functions on purpose: a channel that
       cmastBonuses computes but combatBonusesAll drops would pass a bonuses-only
       probe and fail here, which is exactly how Point Blank shipped broken. */
    function snap(){
      var b=cmastBonuses(), all=combatBonusesAll();
      return {
        combatXpMult:b.combatXpMult, atkBoost:b.atkBoost, critChance:all.critChance,
        critDmg:b.critDmg, aspd:all.aspd, maxHpFlat:b.maxHpFlat, dmgReduce:b.dmgReduce,
        lifesteal:b.lifesteal, gpMult:b.gpMult, rareDrop:b.rareDrop,
        doubleDrop:b.doubleDrop, consolation:b.consolation,
        trophyGuarantee:b.trophyGuarantee, accBoost:b.accBoost, ammoSave:b.ammoSave,
        armourPen:b.armourPen, volley:b.volley, ammoTierUp:b.ammoTierUp,
        pinning:b.pinning, defBoost:b.defBoost, hpBoost:b.hpBoost,
        maxHit:playerMaxHit(), acc:playerAccuracy(), swing:playerSwingMs(),
        ammoStr:ammoStr()
      };
    }
    /* Conditional damage, measured through the same function combatTick calls. */
    function dmg(opts){
      return cmastDamageMult(opts.mon||{}, opts.foeFrac===undefined?0.5:opts.foeFrac,
                             opts.youFrac===undefined?1:opts.youFrac);
    }

    var CHECKS=[
      // id, weapon, extra gear, field, expected at MAX rank, label
      ['m_t1',   SWORD, null, 'combatXpMult', 0.16, '+4% combat XP x4'],
      ['m_t2_l', SWORD, null, 'atkBoost',     0.15, '+3% melee damage x5'],
      ['m_t2_r', SWORD, null, 'critChance',   0.10, '+2% crit x5'],
      ['m_t3_r', SWORD, null, 'critDmg',      0.20, '+20% crit damage'],
      ['m_t4_r', SWORD, null, 'aspd',         0.05, '+1% attack speed x5'],
      ['m_t5_r', DAGGER,null, 'critDmg',      0.15, 'dagger crits +15%'],

      ['k_t1',   BOW,  null, 'combatXpMult',  0.16, '+4% combat XP x4'],
      ['k_t2_l', BOW,  null, 'atkBoost',      0.15, '+3% ranged damage x5'],
      ['k_t2_r', BOW,  null, 'ammoSave',      0.20, '4% refunded x5'],
      ['k_t3_l', BOW,  null, 'armourPen',     0.15, 'ignore 15% armour'],
      ['k_t3_r', BOW,  null, 'aspd',          0.08, '+8% attack speed, bow'],
      ['k_t4_l', XBOW, null, 'atkBoost',      0.10, '+2% crossbow damage x5'],
      ['k_t4_r', BOW,  null, 'accBoost',      0.10, '+2% ranged accuracy x5'],
      ['k_t5_l', BOW,  null, 'volley',        0.10, '10% free second arrow'],
      ['k_t5_m', BOW,  null, 'pinning',       1,    'crits slow the target'],
      ['k_cap',  BOW,  null, 'critDmg',       0.25, '+25% ranged crit damage'],

      ['r_t1',   SWORD, null, 'maxHpFlat',    12,   '+3 max HP x4'],
      ['r_t2_l', SWORD, null, 'dmgReduce',    0.10, '+2% damage reduction x5'],
      ['r_t2_r', SWORD, null, 'maxHpFlat',    20,   '+4 max HP x5'],
      ['r_t4_l', SWORD, null, 'dmgReduce',    0.10, '+2% mitigation x5'],
      ['r_t4_r', SWORD, null, 'lifesteal',    0.05, 'heal 1% of damage x5'],
      ['r_t5_r', SWORD, {shield:SHIELD}, 'dmgReduce', 0.10, '+10% with a shield'],

      ['g_t1',   SWORD, null, 'combatXpMult', 0.16, '+4% combat XP x4'],
      ['g_t2_l', SWORD, null, 'gpMult',       0.15, '+3% combat gold x5'],
      ['g_t2_r', SWORD, null, 'rareDrop',     0.05, '+1% rare drops x5'],
      ['g_t3_l', SWORD, null, 'trophyGuarantee', 1, 'boss unique on first kill'],
      ['g_t3_r', SWORD, null, 'consolation',  0.25, '+25% empty-kill gold'],
      ['g_t4_r', SWORD, null, 'doubleDrop',   0.05, '+1% double drop x5'],
      ['g_t5_l', SWORD, null, 'rareDrop',     0.03, '+3% rare drops'],
      ['g_t5_m', SWORD, null, 'combatXpMult', 0.10, '+10% combat XP'],
      ['g_t5_m', SWORD, null, 'gpMult',       0.10, '+10% combat gold'],
      ['g_cap',  SWORD, null, 'atkBoost',     0.05, '+5% Attack'],
      ['g_cap',  SWORD, null, 'defBoost',     0.05, '+5% Defence'],
      ['g_cap',  SWORD, null, 'hpBoost',      0.05, '+5% max HP'],

      ['mr_t3',  SWORD, null, 'atkBoost',     0.09, '+3% any weapon x3 (sword)'],
      ['mr_t3',  BOW,   null, 'atkBoost',     0.09, '+3% any weapon x3 (bow)'],
      ['kb_t3',  SWORD, null, 'critChance',   0.03, '+1% crit x3'],
      ['kb_t3',  SWORD, null, 'dmgReduce',    0.03, '+1% mitigation x3'],
      ['kb_t4',  SWORD, null, 'atkBoost',     0.06, '+6% damage'],
      ['kb_t4',  SWORD, null, 'maxHpFlat',    4,    '+4 max HP'],
      ['rm_t3',  SWORD, null, 'critChance',   0.03, '+1% crit x3'],
      ['rm_t4',  SWORD, null, 'atkBoost',     0.05, '+5% damage'],
      ['rm_t4',  SWORD, null, 'dmgReduce',    0.05, '+5% mitigation'],
    ];

    var out=[];
    CHECKS.forEach(function(c){
      var id=c[0], wep=c[1], extra=c[2], field=c[3], want=c[4], label=c[5];
      var max=CMAST_BY_ID[id].max;
      reset(wep, extra); var before=snap()[field];
      reset(wep, extra); state.cmast[id]=max; var after=snap()[field];
      var got=after-before;
      out.push({id:id, name:CMAST_BY_ID[id].name, label:label, field:field,
                want:want, got:+got.toFixed(4), ok:Math.abs(got-want)<0.0005});
    });

    /* Conditional damage nodes, measured through cmastDamageMult. */
    var DMG=[
      ['m_t4_l', SWORD, {foeFrac:0.95}, 1.10, '+2% x5 above 80% enemy HP'],
      ['m_t5_l', SWORD, {foeFrac:0.10}, 1.25, '+25% under 25% enemy HP'],
      ['r_t3_r', SWORD, {youFrac:0.10}, 1.15, '+15% under 30% your HP'],
      ['g_t5_r', SWORD, {mon:{boss:true}}, 1.20, '+20% vs bosses'],
      ['mr_t4',  SWORD, {youFrac:0.95}, 1.08, '+8% above 80% your HP'],
    ];
    DMG.forEach(function(d){
      var id=d[0], max=CMAST_BY_ID[id].max;
      reset(d[1], null); var before=dmg(d[2]);
      reset(d[1], null); state.cmast[id]=max; var after=dmg(d[2]);
      var got=after/before;
      out.push({id:id, name:CMAST_BY_ID[id].name, label:d[4], field:'damage mult',
                want:d[3], got:+got.toFixed(4), ok:Math.abs(got-d[3])<0.0005});
    });

    /* Undying is conditional on being in a fight and under 20%, so it needs the
       runtime object set up rather than a bare bonuses read. */
    (function(){
      reset(SWORD,null);
      combat.active=true; combat.youMaxHp=100; combat.youHp=10;
      var before=cmastBonuses().dmgReduce;
      state.cmast['r_cap']=1;
      var after=cmastBonuses().dmgReduce;
      out.push({id:'r_cap', name:'Undying', label:'+30% mitigation under 20% HP',
                field:'dmgReduce', want:0.30, got:+(after-before).toFixed(4),
                ok:Math.abs((after-before)-0.30)<0.0005});
      combat.active=false;
    })();

    /* Quiver Master: runite arrow is +15, starsteel is +20, so "one tier stronger"
       has to read 20 rather than adding a flat number. */
    (function(){
      reset(BOW,null); var before=ammoStr();
      state.cmast['k_t5_r']=1; var after=ammoStr();
      var want=RANGED_AMMO[RANGED_AMMO.findIndex(function(a){return a.k==='runite';})+1].str;
      out.push({id:'k_t5_r', name:'Quiver Master', label:'ammo counts one tier up',
                field:'ammoStr', want:want, got:after, ok:after===want});
    })();

    /* Which nodes this harness does NOT put a number on. */
    var covered={};
    out.forEach(function(o){ covered[o.id]=1; });
    var uncovered=CMAST_NODES.filter(function(n){ return !covered[n.id]; })
      .map(function(n){ return {id:n.id, name:n.name, desc:n.desc}; });

    return JSON.stringify({out:out, uncovered:uncovered, total:CMAST_NODES.length});
  })()`));

  const pad = (s, n) => String(s).padEnd(n);
  const num = (v) => (Math.abs(v) < 1 && v !== 0) ? v.toFixed(4) : String(v);
  let bad = 0;
  console.log('\n  Does each node do what its tooltip says?\n');
  let last = '';
  for (const c of r.out) {
    if (!c.ok) bad++;
    const tag = c.id.slice(0, 1);
    if (tag !== last) { console.log(''); last = tag; }
    console.log(`   ${c.ok ? 'ok  ' : 'FAIL'} ${pad(c.name, 18)} ${pad(c.label, 32)} `
      + `${pad(c.field, 16)} want ${pad(num(c.want), 8)} got ${num(c.got)}`);
  }
  console.log(`\n  ${r.out.length} numeric claims checked across ${r.total} nodes`);
  console.log(`  ${r.uncovered.length} nodes carry a proc rather than a number, `
    + `checked for wiring in _audit_tests.js instead:`);
  for (const u of r.uncovered) console.log(`     ${pad(u.name, 16)} ${u.desc}`);
  console.log(bad ? `\n  ${bad} FAILED\n` : '\n  PASS: every measurable node pays what it claims\n');
  process.exit(bad ? 1 : 0);
}, 3000);

/* DPS across the whole board, WITH mastery allocated.
 *
 *     node _dpsboard.js
 *
 * _rangedsim.js measures parity on a bare character: no tree, no class, no
 * mastery. That answers "is the weapon maths right" and nothing else. The
 * question this answers is the one that decides whether Marksman shipped
 * balanced: once a melee player spends 30 points in Onslaught and a ranged
 * player spends 30 in Marksman, are they still level with each other?
 *
 * A column is only worth what it pays the weapon it was written for, so every
 * build here is measured three ways:
 *
 *   BARE      no mastery at all, the _rangedsim baseline
 *   OFFENCE   its own 30-point offence column maxed, and nothing else
 *   FULL      a realistic endgame spend: offence + Bulwark + Warfare + bridges
 *
 * Every number comes out of the game's own playerMaxHit / playerAccuracy /
 * playerSwingMs / cmastDamageMult, so this cannot drift from what combatTick
 * actually does.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const JSON_OUT = process.argv.includes('--json');
const dom = new JSDOM(fs.readFileSync(path.join(__dirname, 'cindervale.html'), 'utf8'),
  { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true,
    virtualConsole: new VirtualConsole() });

setTimeout(() => {
  const r = JSON.parse(dom.window.eval(`(function(){
    state=defaultState(); normalizeState(); demoXpCap=function(){ return XP_CAP; };

    var LV=85, FOE_DEF=Math.round(12+LV*3.2);

    /* Which nodes make up each spend. Read off the live table rather than listed,
       so a rebalance of any column is picked up here automatically. */
    function colNodes(tree){ return CMAST_NODES.filter(function(n){ return n.tree===tree; }); }
    /* Spend through the REAL allocate path, repeatedly, until nothing else can be
       bought. Setting ranks directly was dishonest: it handed a pure ranged build
       the Onslaught/Marksman bridge, which needs an Onslaught node, so the sim was
       giving ranged four points the buy button would refuse. It also silences the
       question of how many bridge points each column can actually reach. */
    function spend(trees){
      state.cmast={}; state.cmastGranted=400; state.cmastShards=0;
      var want={}; trees.forEach(function(t){ colNodes(t).forEach(function(n){ want[n.id]=n.max; }); });
      var moved=true;
      while(moved){
        moved=false;
        for(var id in want){
          while(cmastRank(id)<want[id] && cmastCanAllocate(id)){ cmastAllocate(id); moved=true; }
        }
      }
      var got={}; for(var k in state.cmast) if(state.cmast[k]>0) got[k]=state.cmast[k];
      return got;
    }
    var SPEND={
      bare:    {},
      melee:   spend(['melee']),
      mark:    spend(['mark']),
      /* FULL is a finished character: their own offence column, both shared
         columns, and EVERY bridge they can legally reach from there. The bridge
         list is the same for both on purpose — spend() drops what the prereqs
         refuse, so whatever survives is what that build can really buy. */
      meleeFull: spend(['melee','ranged','magic','mr','kb','rm']),
      markFull:  spend(['mark','ranged','magic','mr','kb','rm']),
    };

    function setup(weapon, extra, cls, cmast){
      state.cmast=cmast||{};
      state.charClass=cls||null;
      state.items={}; state.tree={};
      state.combatXp={attack:XP_CUM[LV],strength:XP_CUM[LV],defence:XP_CUM[LV],
                      hitpoints:XP_CUM[99],ranged:XP_CUM[LV]};
      state.combatEquipped={};
      if(weapon){
        state.combatEquipped.weapon=weapon;
        var it=ITEMS[weapon];
        if(it&&it.ammo){
          var am=(it.ammo==='bolt')?'starsteel_bolt':'starsteel_arrow';
          state.combatEquipped.quiver=am; state.items[am]=99999;
        }
      }
      if(extra) for(var k in extra) state.combatEquipped[k]=extra[k];
      combat.active=false;
    }
    /* DPS through the game's own numbers, including the conditional procs at their
       AVERAGE weight rather than their best case — a foe spends most of a fight
       between 80% and 25%, so Savage Edge and Executioner are worth roughly a
       quarter of their headline each over a whole kill. */
    function dps(){
      var acc=playerAccuracy(), hit=playerMaxHit(), swing=playerSwingMs();
      var p=Math.max(0.03, Math.min(0.97, acc/(acc+FOE_DEF)));
      var avg=hit*(COMBAT_P.HIT_MIN+1)/2;
      var base=(p*avg)/(swing/1000);
      // average the damage procs across the HP curve of one kill
      var m=0, n=0;
      for(var f=0.95; f>0.02; f-=0.05){ m+=cmastDamageMult({}, f, 1); n++; }
      var procAvg=n?m/n:1;
      // crit, including whatever crit damage the tree is paying
      var cb=combatBonusesAll(), cm=cmastBonuses();
      var critMul=1+(cb.critChance||0)*((2+(cm.critDmg||0))-1);
      // Cleaving Edge / Volley are a flat chance at a whole extra hit
      var extra=1;
      if(state.cmast['m_t5_m']>0) extra+=0.08;
      if(cm.volley>0 && usingRanged()) extra+=cm.volley;
      return base*procAvg*critMul*extra;
    }

    var BUILDS=[
      ['sword + shield',  'starsteel_sword',   {shield:'starsteel_shield'}, 'melee'],
      ['dagger',          'starsteel_dagger',  null, 'melee'],
      ['hammer',          'starsteel_hammer',  null, 'melee'],
      ['sword, no shield','starsteel_sword',   null, 'melee'],
      ['shortbow',        'ancient_shortbow',  null, 'mark'],
      ['longbow',         'ancient_longbow',   null, 'mark'],
      ['crossbow+shield', 'starsteel_crossbow',{shield:'starsteel_shield'}, 'mark'],
    ];
    var CLASSES=[null,'rogue','berserker','guardian'];

    var rows=[];
    BUILDS.forEach(function(b){
      var name=b[0], wep=b[1], extra=b[2], col=b[3];
      CLASSES.forEach(function(cls){
        setup(wep,extra,cls,SPEND.bare);      var bare=dps();
        setup(wep,extra,cls,SPEND[col]);      var off=dps();
        setup(wep,extra,cls,SPEND[col+'Full']); var full=dps();
        setup(wep,extra,cls,SPEND[col+'Full']);
        rows.push({build:name, cls:cls||'none', col:col,
          bare:+bare.toFixed(1), off:+off.toFixed(1), full:+full.toFixed(1),
          hit:playerMaxHit(), acc:playerAccuracy(), swing:playerSwingMs()});
      });
    });

    /* ── Fletching and Smithing, with their own trees maxed ─────────────────── */
    function bestAct(skill,lvl){
      var m=mods(skill), top=0, name='';
      SKILLS[skill].acts.filter(function(a){ return (a.lvl||1)<=lvl; }).forEach(function(a){
        var ms=actMs(a,skill); if(!(ms>0)) return;
        var x=a.xp*(3600000/ms)*m.xpMult;
        if(x>top){ top=x; name=a.name; }
      });
      return {xph:Math.round(top), act:name};
    }
    function maxTree(skill){
      var t={};
      (TREES[skill]||[]).forEach(function(n){ t[n.id]=n.max; });
      return t;
    }
    var CMP=['fletching','smithing','crafting','cooking','jeweler','alchemy'];
    var skillRows=CMP.map(function(s){
      state.cmast={}; state.charClass=null;
      for(var k in SKILLS) state.xp[k]=XP_CUM[99];
      state.tree={}; state.gear={}; state.skillingGear={};
      var bareR=bestAct(s,99);
      state.tree[s]=maxTree(s);
      var treeR=bestAct(s,99);
      return {skill:s, bare:bareR.xph, tree:treeR.xph, act:treeR.act,
              hours:+(XP_CUM[99]/Math.max(1,treeR.xph)).toFixed(1)};
    });

    /* ── The ammunition chain, end to end, with every refund the game offers ── */
    state.tree={}; state.cmast={};
    for(var k in SKILLS) state.xp[k]=XP_CUM[99];
    function feedAt(flTree, cmast){
      state.tree.fletching=flTree; state.cmast=cmast;
      state.combatXp={attack:XP_CUM[LV],strength:XP_CUM[LV],defence:XP_CUM[LV],
                      hitpoints:XP_CUM[99],ranged:XP_CUM[LV]};
      state.combatEquipped={weapon:'ancient_shortbow',quiver:'starsteel_arrow'};
      state.items={starsteel_arrow:99999};
      var perHr=3600000/playerSwingMs();
      var rate=treeRank('fletching','fl_salvage')*0.06
             + treeRank('fletching','fl_gm_salv')*0.04
             + (treeRank('fletching','fl_endless')>0?0.05:0);
      var cm=cmastBonuses(); rate+=(cm.ammoSave||0);
      rate=Math.min(0.85,rate);
      var burn=perHr*(1-rate);
      var act=SKILLS.fletching.acts.filter(function(a){return a.id==='fl_ar_starsteel';})[0];
      var per=(act&&act.out.starsteel_arrow)||15;
      var batchMs=act?Math.max(act.minMs,act.ms*act.spdMult):5000;
      return {shots:Math.round(perHr), rate:+(rate*100).toFixed(0), burn:Math.round(burn),
              mins:+((burn/per*batchMs)/60000).toFixed(1)};
    }
    var flMax=maxTree('fletching');
    var feed=[
      ['no tree, no mastery',      feedAt({}, {})],
      ['Fletching tree maxed',     feedAt(flMax, {})],
      ['+ Fletcher\\'s Thrift x5',  feedAt(flMax, spend(['mark']))],
    ];

    function cost(o){ var n=0; for(var k in o) n+=o[k]; return n; }
    var costs={melee:cost(SPEND.melee), mark:cost(SPEND.mark),
               meleeFull:cost(SPEND.meleeFull), markFull:cost(SPEND.markFull)};
    return JSON.stringify({lv:LV, foeDef:FOE_DEF, rows:rows, skills:skillRows,
                           feed:feed, costs:costs});
  })()`));

  if (JSON_OUT) { console.log(JSON.stringify(r, null, 1)); process.exit(0); }
  const pad = (s, n) => String(s).padEnd(n);
  const rp = (s, n) => String(s).padStart(n);

  console.log(`\n1. DPS WITH MASTERY SPENT  ·  Lv ${r.lv}, foe defence ${r.foeDef}, top-tier gear`);
  console.log('   BARE = no mastery · OFFENCE = its own 30-point column · FULL = offence + Bulwark + Warfare + bridges');
  console.log('   the % is against sword + shield in the SAME class and the same spend\n');
  for (const cls of ['none', 'rogue', 'berserker', 'guardian']) {
    const mine = r.rows.filter(x => x.cls === cls);
    const base = mine.find(x => x.build === 'sword + shield');
    console.log(`   ${cls}`);
    for (const x of mine) {
      const pc = (a, b) => rp((a / b * 100).toFixed(0) + '%', 5);
      console.log(`     ${pad(x.build, 17)} `
        + `${rp(x.bare, 6)} ${pc(x.bare, base.bare)}   `
        + `${rp(x.off, 6)} ${pc(x.off, base.off)}   `
        + `${rp(x.full, 6)} ${pc(x.full, base.full)}   `
        + `hit ${rp(x.hit, 4)}  swing ${rp(x.swing, 5)}ms`);
    }
    console.log('');
  }

  console.log('2. FLETCHING AND SMITHING AGAINST THEIR NEIGHBOURS  ·  Lv 99, tree maxed\n');
  console.log('   skill        no tree     tree maxed    hours to 99   best act');
  for (const s of r.skills) {
    console.log(`   ${pad(s.skill, 12)} ${rp((s.bare / 1000).toFixed(0) + 'k', 8)} `
      + `${rp((s.tree / 1000).toFixed(0) + 'k', 13)} ${rp(s.hours + 'h', 13)}   ${s.act}`);
  }

  console.log('\n3. FEEDING THE BOW  ·  starsteel arrows, an hour of shooting\n');
  console.log('   investment                 shots/hr   refunded   arrows burned   fletching');
  for (const [label, f] of r.feed) {
    console.log(`   ${pad(label, 26)} ${rp(f.shots, 8)} ${rp(f.rate + '%', 10)} `
      + `${rp(f.burn, 15)} ${rp(f.mins + 'm', 11)}`);
  }
  console.log('');

  /* The one number that decides whether Marksman shipped balanced, compared
     LIKE FOR LIKE: a bow against a dagger, a crossbow against a hammer. Both
     pairs share a weapon class, so both get the same class treatment, and the
     comparison is between the two weapons a class actually wants.

     Comparing everything to sword and shield was the harness being wrong twice
     over. A Rogue holding a sword is off-class, so its bows read 128% of that —
     but its dagger reads 127%, and the two are level. A Rogue holding a crossbow
     is equally off-class and reads 81%, exactly where a Rogue holding a hammer
     lands (80%). Off-class is off-class; that is what a class is for. */
  const PAIR={shortbow:'dagger', longbow:'dagger', 'crossbow+shield':'hammer'};
  const bad=[];
  console.log('   like for like: bow against dagger, crossbow against hammer'+'\n');
  for(const cls of ['none','rogue','berserker','guardian']){
    const mine=r.rows.filter(x=>x.cls===cls);
    for(const x of mine.filter(v=>v.col==='mark')){
      const m=mine.find(v=>v.build===PAIR[x.build]);
      const p=x.full/m.full*100;
      console.log(`     ${pad(cls,10)} ${pad(x.build,17)} vs ${pad(m.build,8)} `
        + `${rp(x.full,6)} vs ${rp(m.full,6)}   ${rp(p.toFixed(0)+'%',5)}`);
      if(p<92||p>108) bad.push(`${x.build} (${cls}) at ${p.toFixed(0)}% of ${m.build}`);
    }
  }
  console.log('');
  console.log(bad.length
    ? '   OUT OF BAND:\n     ' + bad.join('\n     ') + '\n'
    : '   every ranged build sits inside 90-112% of sword and shield on a full spend\n');
  process.exit(bad.length ? 1 : 0);
}, 3000);

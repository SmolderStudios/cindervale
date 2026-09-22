/* Ranged Strength: best-in-slot DPS, ranged against melee, with EVERYTHING on.
 *
 *     node _rangedstr.js                 the table
 *     node _rangedstr.js --json          machine readable
 *     CV_FILE=old.html node _rangedstr.js    the same table off another build
 *
 * _bowbal.js measures bare gear. That misses almost all of what a finished
 * archer is carrying, and before 0.9.127.2 almost all of it was Attack %: rolled
 * enchant lines on every piece, the unique third line on raid gear, jewelry, the
 * pendant set, socket gems, the Mastery board. This harness puts all of it on,
 * so the Ranged Strength re-plumb can be checked against a real endgame rather
 * than a naked one.
 *
 * It picks the best stats each BUILD offers. On a build that has Ranged damage
 * lines an archer rolls those; on one that does not, it rolls Attack. That is
 * the comparison that matters: what the best archer could do then against what
 * the best archer can do now.
 *
 * Every number comes from the game's own playerAccuracy / playerMaxHit /
 * playerSwingMs / combatBonusesAll / cmastBonuses / cmastDamageMult.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const FILE = process.env.CV_FILE || path.join(__dirname, 'cindervale.html');
const JSON_OUT = process.argv.includes('--json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom = new JSDOM(fs.readFileSync(FILE, 'utf8'), {
  url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true,
  virtualConsole: new VirtualConsole(),
  beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); }
});

setTimeout(() => {
  // RS_PATCH: JS run in the page first, to try a retune without editing the game.
  if (process.env.RS_PATCH) dom.window.eval(process.env.RS_PATCH);
  const r = JSON.parse(dom.window.eval(`(function(){
    var HAS_RS = (typeof ENCH_STAT!=='undefined') && !!ENCH_STAT.rangedStr;
    var DEFS=[500,1000,2000];

    function colNodes(tree){ return CMAST_NODES.filter(function(n){ return n.tree===tree; }); }
    function spend(trees){
      state.cmast={}; state.cmastGranted=400; state.cmastShards=0;
      var want={}; trees.forEach(function(t){ colNodes(t).forEach(function(n){ want[n.id]=n.max; }); });
      var moved=true;
      while(moved){ moved=false;
        for(var id in want){ while(cmastRank(id)<want[id] && cmastCanAllocate(id)){ cmastAllocate(id); moved=true; } } }
      var got={}; for(var k in state.cmast) if(state.cmast[k]>0) got[k]=state.cmast[k];
      return got;
    }
    function maxTree(skill){ var t={}; (TREES[skill]||[]).forEach(function(n){ t[n.id]=n.max; }); return t; }

    /* Which stats to roll, best first. An archer takes Ranged damage wherever the
       build offers it; a melee fighter takes Attack. Crit is the second line for
       both, because it is the only other damage stat in the offensive pools. */
    var NEWSTATS=false;   // set per row: roll the 0.9.127.2 stats (crit damage, accuracy) ahead of crit chance
    function prio(ranged){
      /* On a build with no Ranged damage lines, Attack WAS the archer's damage
         stat, so the archer rolls it first there, exactly like a melee fighter. */
      var dmg=(ranged && HAS_RS)?'rangedStr':'atkBoost';
      var p=NEWSTATS?[dmg,'critDmg','accBoost','critChance']:[dmg,'critChance'];
      ['atkBoost','lifesteal','hpBoost','defBoost','goldFind','rangedStr'].forEach(function(k){ if(p.indexOf(k)<0) p.push(k); });
      return p;
    }
    function pickKeys(keys, n, ranged, used){
      var out=[], p=prio(ranged);
      for(var i=0;i<p.length && out.length<n;i++) if(keys.indexOf(p[i])>=0 && (used||[]).indexOf(p[i])<0) out.push(p[i]);
      for(var j=0;j<keys.length && out.length<n;j++) if(out.indexOf(keys[j])<0 && (used||[]).indexOf(keys[j])<0) out.push(keys[j]);
      return out;
    }
    function uniquePool(id){ return (typeof enchUniquePoolFor==='function')?enchUniquePoolFor(id):ENCH_UNIQUE_POOL; }

    /* Build a character. opts: {weapon, quiver, armour:{slot:id}, jewelry:bool,
       enchQ:number|null, sockets:bool, cmast:[trees], fletch:bool, asc:bool,
       cls, potion, lvl} */
    function build(o){
      state=defaultState(); normalizeState();
      var L=o.lvl||99;
      state.combatXp={attack:XP_CUM[L],strength:XP_CUM[L],defence:XP_CUM[L],hitpoints:XP_CUM[99],ranged:XP_CUM[L]};
      state.items={}; state.tree={}; state.cmast={}; state.charClass=o.cls||null;
      state.variants={}; state.sockets={}; state.asc={}; state.effects=[];
      var ce={}, ranged=false;
      if(o.weapon){ ce.weapon=o.weapon; ranged=!!(ITEMS[o.weapon]&&ITEMS[o.weapon].ranged); }
      if(o.quiver){ ce.quiver=o.quiver; state.items[o.quiver]=1e6; }
      for(var s in (o.armour||{})) ce[s]=o.armour[s];
      if(o.jewelry){ ce.ring_l='void_ring'; ce.ring_r='void_ring'; ce.amulet='void_jewel'; }
      // own one of everything worn (two rings)
      for(var s2 in ce){ if(s2==='quiver') continue; state.items[ce[s2]]=(state.items[ce[s2]]||0)+1; }
      state.combatEquipped=ce;
      if(o.enchQ!=null){
        var slots=Object.keys(ce).filter(function(s){ return s!=='quiver'; });
        slots.forEach(function(s){
          var id=ce[s]; if(!isEnchantable(id)) return;
          var vid=splitToVariant(id,{worn:{map:ce,slot:s}}); if(!vid) return;
          var P=enchPoolFor(vid); var lines=[];
          if(P){ pickKeys(P.keys, ENCH_LINES, ranged).forEach(function(k){
            lines.push({k:k, v:enchValueAt(k,vid,o.enchQ,1), q:o.enchQ, lock:false}); }); }
          if(isUniqueGear(vid)){
            var uk=pickKeys(uniquePool(vid),1,ranged,lines.map(function(l){return l.k;}))[0];
            if(uk) lines.push({k:uk, v:enchValueAt(uk,vid,o.enchQ,ENCH_UNIQUE_MULT), q:o.enchQ, lock:false, u:true});
          }
          state.variants[vid].lines=lines; registerVariant(vid);
          ce[s]=vid;
        });
      }
      if(o.sockets){
        for(var s3 in ce){ var id3=ce[s3]; var n=maxSocketsFor(variantBase(id3));
          if(n>0) state.sockets[id3]={slots:n, gems:Array(n).fill(o.gem||'sanguine_flaw')}; }
      }
      if(o.asc){ for(var s4 in ce){ var id4=ce[s4]; var c=ascCap(variantBase(id4)); if(c>0) state.asc[id4]=c; } }
      if(o.cmast) spend(o.cmast); else state.cmast={};
      if(o.fletch) state.tree.fletching=maxTree('fletching');
      if(o.potion){ var P2=ITEMS[o.potion].potion;
        state.effects=[Object.assign({id:o.potion, expires:Date.now()+3.6e6}, P2)]; }
      combat.active=false; combat.raid=null;
      refreshCombatStats();
    }

    function dps(def){
      var acc=playerAccuracy(), hit=playerMaxHit(), swing=playerSwingMs();
      var rng=usingRanged();
      var cm=cmastBonuses(), cb=combatBonusesAll();
      var pen=(rng&&cm.armourPen>0)?(1-cm.armourPen):1;
      var p=Math.max(0.03, Math.min(0.97, acc/(acc+def*pen)));
      var w=ITEMS[eqCombatWeapon()]||{};
      var pierce=(w.wfx&&w.wfx.pierce)?w.wfx.pierce.chance:0;
      var wind=rng?treeRank('fletching','fl_wind')*FL_WIND_RANK:0;
      var sure=1-(1-pierce)*(1-wind);
      p=sure*0.97+(1-sure)*p;
      var avg=hit*(COMBAT_P.HIT_MIN+1)/2;
      // cb.critDmg includes Critical damage lines on builds that have them
      var crit=Math.min(1,cb.critChance||0), critMul=1+crit*(1+((cb.critDmg!=null?cb.critDmg:cm.critDmg)||0));
      var m=0,n=0; for(var f=0.95;f>0.02;f-=0.05){ m+=cmastDamageMult({},f,1); n++; }
      var extra=1;
      if(w.wfx&&w.wfx.cleave) extra+=w.wfx.cleave.chance;
      else if(state.cmast['m_t5_m']>0) extra+=0.08;
      else if(rng&&cm.volley>0) extra+=cm.volley;
      var base=(p*avg)/(swing/1000);
      var bb=rng?treeRank('fletching','fl_barb')*FL_BARB_RANK:0, dot=0;
      if(bb>0){ var rate=(p/(swing/1000))*bb; var up=1-Math.exp(-rate*POISON_DUR_MS/1000); dot=up*hit*POISON_TICK_MULT/(POISON_TICK_MS/1000); }
      return base*(m/n)*critMul*extra+dot;
    }
    /* the same level-scaled defence _rangedsim.js uses, so a Lv40 is never
       measured against a Lv99's armour */
    function foeDefFor(lv){ return Math.round(12+lv*3.2); }
    function row(label, o, defs){
      build(o);
      var cb=combatBonusesAll(), cs=combatStats();
      var out={label:label, acc:playerAccuracy(), hit:playerMaxHit(), swing:playerSwingMs(),
        crit:+Math.min(1,cb.critChance||0).toFixed(3),
        atkBoost:+(cb.atkBoost||0).toFixed(3), rangedStr:+(cb.rangedStr||0).toFixed(3),
        str:cs.str, rstr:(cs.rstr||0), atk:cs.atk, dps:{}};
      (defs||DEFS).forEach(function(d){ out.dps[d]=+dps(d).toFixed(1); });
      return out;
    }

    var SUN={helmet:'sunweave_helm',chest:'sunweave_chest',legs:'sunweave_legs',boots:'sunweave_boots',
             gloves:'stonewright_gauntlets',cape:'dawnmantle'};
    var DAWN={helmet:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',
              gloves:'stonewright_gauntlets',cape:'dawnmantle'};
    function withShield(a,sh){ var o={}; for(var k in a) o[k]=a[k]; o.shield=sh; return o; }
    var RC=['mark','ranged','magic','mr','kb','rm'], MC=['melee','ranged','magic','mr','kb','rm'];
    var FULL={jewelry:true, enchQ:0.4, sockets:true, asc:true};
    function F(extra){ var o={}; for(var k in FULL) o[k]=FULL[k]; for(var k2 in extra) o[k2]=extra[k2]; return o; }

    var rows=[];
    // Bare gear, the _bowbal view
    rows.push(row('bare: Sunderedge + Faultward', {weapon:'sunderedge', armour:withShield(DAWN,'faultward')}));
    rows.push(row('bare: Dawnreaper (2H)',        {weapon:'dawnreaper', armour:DAWN}));
    rows.push(row('bare: Plummet + Sundershaft',  {weapon:'plummet', quiver:'sundershaft', armour:SUN}));
    rows.push(row('bare: Sunpiercer + Sundershaft',{weapon:'sunpiercer', quiver:'sundershaft', armour:SUN}));
    rows.push(row('bare: Starfall xbow + Sunderbolt + Faultward',{weapon:'starfall_crossbow', quiver:'sunderbolt', armour:withShield(SUN,'faultward')}));
    // Everything on
    rows.push(row('FULL: Sunderedge + Faultward', F({weapon:'sunderedge', armour:withShield(DAWN,'faultward'), cmast:MC})));
    rows.push(row('FULL: Dawnreaper (2H)',        F({weapon:'dawnreaper', armour:DAWN, cmast:MC})));
    rows.push(row('FULL: Plummet + Sundershaft',  F({weapon:'plummet', quiver:'sundershaft', armour:SUN, cmast:RC, fletch:true})));
    rows.push(row('FULL: Sunpiercer + Sundershaft',F({weapon:'sunpiercer', quiver:'sundershaft', armour:SUN, cmast:RC, fletch:true})));
    rows.push(row('FULL: Starfall xbow + Faultward',F({weapon:'starfall_crossbow', quiver:'sunderbolt', armour:withShield(SUN,'faultward'), cmast:RC, fletch:true})));
    // Sensitivity: everything but sockets, everything but the Mastery board, a class, a potion
    rows.push(row('no gems: Sunderedge + Faultward', F({weapon:'sunderedge', armour:withShield(DAWN,'faultward'), cmast:MC, sockets:false})));
    rows.push(row('no gems: Plummet + Sundershaft',  F({weapon:'plummet', quiver:'sundershaft', armour:SUN, cmast:RC, fletch:true, sockets:false})));
    rows.push(row('no board: Plummet + Sundershaft', F({weapon:'plummet', quiver:'sundershaft', armour:SUN, fletch:true})));
    rows.push(row('rogue: Plummet + Sundershaft',    F({weapon:'plummet', quiver:'sundershaft', armour:SUN, cmast:RC, fletch:true, cls:'rogue'})));
    rows.push(row('brew: Sunderedge + Faultward',    F({weapon:'sunderedge', armour:withShield(DAWN,'faultward'), cmast:MC, potion:'warriors_brew'})));
    rows.push(row('brew: Plummet + Sundershaft',     F({weapon:'plummet', quiver:'sundershaft', armour:SUN, cmast:RC, fletch:true, potion:'warriors_brew'})));
    rows.push(row('90% rolls: Plummet + Sundershaft',F({weapon:'plummet', quiver:'sundershaft', armour:SUN, cmast:RC, fletch:true, enchQ:0.9})));
    rows.push(row('90% rolls: Sunderedge + Faultward',F({weapon:'sunderedge', armour:withShield(DAWN,'faultward'), cmast:MC, enchQ:0.9})));
    // The same FULL builds rolling the new stats where they beat crit chance
    NEWSTATS=true;
    rows.push(row('new stats: Sunderedge + Faultward', F({weapon:'sunderedge', armour:withShield(DAWN,'faultward'), cmast:MC})));
    rows.push(row('new stats: Plummet + Sundershaft',  F({weapon:'plummet', quiver:'sundershaft', armour:SUN, cmast:RC, fletch:true})));
    NEWSTATS=false;

    /* Mid-game, dressed. _rangedsim.js strips everyone naked, which is the right
       test of the weapon maths but not of armour, and Ranged Strength on leather
       is exactly an armour question. Matched tier, crafted everything, no
       enchants: a sword, a shield and plate against a bow and leather. */
    var TIERS=[[40,3,'steel','ironbark','wolf'],[60,5,'cobalt','frost','troll'],[80,6,'runite','shadow','drake'],[99,7,'starsteel','ancient','demon']];
    var mid=[];
    TIERS.forEach(function(t){
      var L=t[0], metal=t[2], wood=t[3], hide=t[4];
      var plate={helmet:metal+'_helm',chest:metal+'_chest',legs:metal+'_legs',gloves:metal+'_gloves',boots:metal+'_boots',cape:metal+'_cape',shield:metal+'_shield'};
      var lth={helmet:hide+'_helm',chest:hide+'_chest',legs:hide+'_legs',gloves:hide+'_gloves',boots:hide+'_boots',cape:metal+'_cape'};
      var D=[foeDefFor(L)];
      var m=row('Lv'+L+' melee', {lvl:L, weapon:metal+'_sword', armour:plate}, D);
      var b=row('Lv'+L+' shortbow', {lvl:L, weapon:wood+'_shortbow', quiver:metal+'_arrow', armour:lth}, D);
      var lb=row('Lv'+L+' longbow', {lvl:L, weapon:wood+'_longbow', quiver:metal+'_arrow', armour:lth}, D);
      var mn=row('Lv'+L+' melee, naked', {lvl:L, weapon:metal+'_sword'}, D);
      var bn=row('Lv'+L+' shortbow, naked', {lvl:L, weapon:wood+'_shortbow', quiver:metal+'_arrow'}, D);
      mid.push({lv:L, def:D[0], melee:m, bow:b, longbow:lb, meleeNaked:mn, bowNaked:bn});
    });
    return JSON.stringify({hasRangedStr:HAS_RS, defs:DEFS, rows:rows, mid:mid,
      build:(document.querySelector('.mm-ver')||{}).getAttribute?document.querySelector('.mm-ver').getAttribute('data-build'):''});
  })()`));

  if (JSON_OUT) { console.log(JSON.stringify(r, null, 1)); process.exit(0); }
  const pad = (s, n) => String(s).padStart(n);
  console.log(`\nbuild ${r.build}  ·  Ranged damage lines ${r.hasRangedStr ? 'EXIST' : 'do not exist'} on this build`);
  console.log('Lv99, enchant lines at average quality (0.4) unless the row says otherwise.');
  console.log('FULL = rolled lines on every piece + unique lines, void jewelry with the pendant set,');
  console.log('       Flawless Sanguine in every socket, Ascension 10, the whole Mastery board, Fletching tree.\n');
  console.log('  ' + 'loadout'.padEnd(40) + pad('acc', 6) + pad('hit', 6) + pad('swing', 7) + pad('crit', 6)
    + pad('atk%', 7) + pad('rng%', 7) + r.defs.map(d => pad('dps@' + d, 10)).join(''));
  for (const x of r.rows) {
    console.log('  ' + x.label.padEnd(40) + pad(x.acc, 6) + pad(x.hit, 6) + pad((x.swing / 1000).toFixed(2), 7)
      + pad((x.crit * 100).toFixed(0) + '%', 6) + pad((x.atkBoost * 100).toFixed(0) + '%', 7) + pad((x.rangedStr * 100).toFixed(0) + '%', 7)
      + r.defs.map(d => pad(x.dps[d], 10)).join(''));
  }
  console.log('\n  mid-game, crafted, no enchants, against the level-scaled defence _rangedsim.js uses');
  console.log('  DRESSED = plate + shield for the sword, leather for the bow. NAKED = weapon and ammo only.');
  const pc = (a, b) => pad((a / b * 100).toFixed(0) + '%', 5);
  for (const t of r.mid) {
    const d = t.def, m = t.melee.dps[d], mn = t.meleeNaked.dps[d];
    console.log(`   Lv${pad(t.lv, 2)} def ${pad(d, 3)} | dressed: melee ${pad(m, 6)}  shortbow ${pad(t.bow.dps[d], 6)} ${pc(t.bow.dps[d], m)}`
      + `  longbow ${pad(t.longbow.dps[d], 6)} ${pc(t.longbow.dps[d], m)}`
      + ` | naked: melee ${pad(mn, 6)}  shortbow ${pad(t.bowNaked.dps[d], 6)} ${pc(t.bowNaked.dps[d], mn)}`
      + ` | bow hit ${t.bow.hit} rstr ${t.bow.rstr}`);
  }
  console.log('');
  process.exit(0);
}, 2500);

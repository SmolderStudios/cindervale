/* What is each offence node actually WORTH in DPS, on the weapon it was written
   for? The board sim says ranged runs 26% ahead on a full spend; this says which
   nodes are paying for that. Same dps() the board sim uses. */
const fs=require('fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('cindervale.html','utf8'),
 {url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
setTimeout(()=>{
  const r=JSON.parse(dom.window.eval(`(function(){
    state=defaultState(); normalizeState(); demoXpCap=function(){return XP_CAP;};
    var LV=85, DEF=Math.round(12+LV*3.2);
    function setup(w,extra,base){
      state.cmast={}; for(var k in (base||{})) state.cmast[k]=base[k];
      state.charClass=null; state.items={}; state.tree={};
      state.combatXp={attack:XP_CUM[LV],strength:XP_CUM[LV],defence:XP_CUM[LV],
                      hitpoints:XP_CUM[99],ranged:XP_CUM[LV]};
      state.combatEquipped={weapon:w};
      var it=ITEMS[w];
      if(it&&it.ammo){ var am=(it.ammo==='bolt')?'starsteel_bolt':'starsteel_arrow';
        state.combatEquipped.quiver=am; state.items[am]=99999; }
      if(extra) for(var k2 in extra) state.combatEquipped[k2]=extra[k2];
      combat.active=false;
    }
    function dps(){
      var cm=cmastBonuses();
      // armour pen belongs in the hit roll, exactly where combatTick puts it
      var effDef=DEF*((cm.armourPen>0&&usingRanged())?(1-cm.armourPen):1);
      var acc=playerAccuracy(), hit=playerMaxHit(), swing=playerSwingMs();
      var p=Math.max(0.03,Math.min(0.97,acc/(acc+effDef)));
      var base=(p*hit*(COMBAT_P.HIT_MIN+1)/2)/(swing/1000);
      var m=0,n=0; for(var f=0.95;f>0.02;f-=0.05){ m+=cmastDamageMult({},f,1); n++; }
      var cb=combatBonusesAll();
      var critMul=1+(cb.critChance||0)*((2+(cm.critDmg||0))-1);
      var extra=1;
      if(state.cmast['m_t5_m']>0) extra+=0.08;
      if(cm.volley>0&&usingRanged()) extra+=cm.volley;
      return base*(n?m/n:1)*critMul*extra;
    }
    /* Each node measured ON TOP of its own full column, so it is the marginal
       worth of that node to a finished build, not its worth in isolation. */
    function worth(col, weapon, extra){
      var full={}; CMAST_NODES.filter(function(n){return n.tree===col;})
        .forEach(function(n){ full[n.id]=n.max; });
      setup(weapon,extra,full); var withAll=dps();
      var out=[];
      for(var id in full){
        var less={}; for(var k in full) if(k!==id) less[k]=full[k];
        setup(weapon,extra,less);
        var without=dps();
        out.push({id:id, name:CMAST_BY_ID[id].name,
                  pct:+(((withAll-without)/without)*100).toFixed(1),
                  max:CMAST_BY_ID[id].max});
      }
      out.sort(function(a,b){ return b.pct-a.pct; });
      setup(weapon,extra,{}); var bare=dps();
      return {nodes:out, bare:+bare.toFixed(1), full:+withAll.toFixed(1),
              lift:+(((withAll-bare)/bare)*100).toFixed(1)};
    }
    return JSON.stringify({
      melee: worth('melee','starsteel_sword',{shield:'starsteel_shield'}),
      mark:  worth('mark','ancient_longbow',null),
      markX: worth('mark','starsteel_crossbow',{shield:'starsteel_shield'})
    });
  })()`));
  const pad=(s,n)=>String(s).padEnd(n), rp=(s,n)=>String(s).padStart(n);
  for(const [k,label] of [['melee','ONSLAUGHT on a sword + shield'],
                          ['mark','MARKSMAN on a longbow'],
                          ['markX','MARKSMAN on a crossbow + shield']]){
    const c=r[k];
    console.log(`\n  ${label}`);
    console.log(`  bare ${c.bare} dps -> ${c.full} dps   the column is worth +${c.lift}%\n`);
    for(const n of c.nodes) if(n.pct!==0)
      console.log(`     ${rp('+'+n.pct+'%',8)}  ${pad(n.name,20)} (${n.max} pt${n.max>1?'s':''})`);
    const dead=c.nodes.filter(n=>n.pct===0);
    if(dead.length) console.log(`     ${rp('0%',8)}  ${dead.map(d=>d.name).join(', ')}`);
  }
  console.log('');
},3000);

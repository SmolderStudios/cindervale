const fs=require('fs');
const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{
  const w=dom.window, ev=e=>w.eval(e);
  ev('state=defaultState(); normalizeState();');
  const d=JSON.parse(ev(`JSON.stringify((function(){
    var r=RAID_BY_ID['empyrean_throne'];
    return {mats:(r.matPool||[]).map(function(m){return {n:(ITEMS[m.id]||{}).name||m.id,q:m.qty};}),
      tiers:r.ratingTiers.map(function(t){return {k:t.key,mats:t.mats,gold:t.gold,mult:t.mult};}),
      drops:(r.gearDrops||[]).map(function(g){
        var it=ITEMS[g.id]||{}, cs=COMBAT_GEAR_STATS[g.id]||{};
        return {id:g.id,n:it.name||g.id,c:g.chance,slot:it.cslot||'?',
          atk:cs.atk||0,str:cs.str||0,def:cs.def||0,
          crit:cs.crit||0,dodge:cs.dodge||0,aspd:cs.aspd||0,
          two:!!it.twoHanded, light:!!it.light,
          ub:it.ubonus||null, cheat:!!it.cheatDeath, dmg:it.dmgType||''};
      })};
  })())`));
  console.log('THE EMPYREAN THRONE — '+d.drops.length+' gear drops\n');
  const grp={};
  for(const x of d.drops){ (grp[x.slot]=grp[x.slot]||[]).push(x); }
  for(const sl of ['weapon','shield','helmet','chest','legs','boots','cape']){
    if(!grp[sl]) continue;
    console.log(sl.toUpperCase());
    for(const x of grp[sl]){
      const st=(x.atk+x.str)>x.def ? ('atk '+x.atk+' str '+x.str) : ('def '+x.def+(x.atk?' atk '+x.atk:''));
      const perks=[x.crit?'crit +'+(x.crit*100).toFixed(1)+'%':'',x.dodge?'dodge +'+(x.dodge*100).toFixed(1)+'%':'',
                   x.aspd?'aspd -'+(x.aspd*100).toFixed(1)+'%':''].filter(Boolean).join(' ');
      const eff=x.ub?('  EFFECT '+Object.keys(x.ub).map(k=>k+' +'+(x.ub[k]*100).toFixed(0)+'%').join(', ')):'';
      console.log('  '+x.n.padEnd(20)+(x.c*100).toFixed(3)+'%  1 in '+String(Math.round(1/Math.min(0.6,x.c*3))).padStart(3)+
        '  '+st.padEnd(20)+(x.two?'[2H] ':'')+(x.dmg?'['+x.dmg+'] ':'')+perks+eff+(x.cheat?'  CHEAT-DEATH':''));
    }
  }
  console.log('\nMATERIALS: '+d.mats.map(m=>m.n+' ('+m.q[0]+'-'+m.q[1]+')').join(', '));
  console.log('RATING:    '+d.tiers.map(t=>t.k+' '+t.mats+' mats/'+t.gold+'g/'+t.mult+'x').join('  '));
  process.exit(0);
},2500);

const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);ev('state=defaultState();normalizeState();');
const d=JSON.parse(ev(`JSON.stringify(MONSTERS.map(function(m){
  var ds=(typeof MONSTER_DROPS!=='undefined'&&MONSTER_DROPS[m.id])||[];
  var z=(typeof getZone==='function'&&getZone(m.zone))||{};
  return {n:m.name, lvl:m.lvl, zone:z.name||m.zone, boss:!!m.boss, drops:ds.length,
          gear:ds.filter(function(x){return ITEMS[x.id]&&ITEMS[x.id].cgear;}).length};
}).sort(function(a,b){return a.lvl-b.lvl;}))`));
console.log('LOW-LEVEL MONSTERS WITH THIN TABLES (Lv<=58, <=4 drops)');
console.log('  lvl  drops  gear  monster                        zone');
for(const m of d){
  if(m.lvl>58||m.drops>4) continue;
  console.log('  '+String(m.lvl).padStart(3)+String(m.drops).padStart(7)+String(m.gear).padStart(6)+
    '  '+(m.n+(m.boss?' (boss)':'')).padEnd(30)+m.zone);
}
console.log('\nBOW LADDER GAPS');
console.log(JSON.parse(ev(`JSON.stringify((function(){
  var o=[]; var byT={};
  Object.keys(ITEMS).forEach(function(id){var it=ITEMS[id];
    if(it&&it.ranged&&it.ammo==='arrow'){ (byT[it.ctier]=byT[it.ctier]||[]).push(it.name+' atk '+(COMBAT_GEAR_STATS[id]||{}).atk); }});
  for(var t=1;t<=11;t++) o.push('  T'+String(t).padStart(2)+': '+(byT[t]?byT[t].join(' · '):'*** NOTHING ***'));
  return o;
})())`)).join('\n'));
process.exit(0);},2500);

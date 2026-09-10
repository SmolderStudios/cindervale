const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);ev('state=defaultState();normalizeState();');
console.log(JSON.parse(ev(`JSON.stringify((function(){
  var o=[];
  o.push('WOODS: '+RANGED_WOODS.map(function(x){return x.k+'(fl'+x.fl+')';}).join(' '));
  o.push('AMMO:  '+RANGED_AMMO.map(function(x){return x.k+'(fl'+x.fl+' str'+(ITEMS[x.k+'_arrow']?ITEMS[x.k+'_arrow'].ammoStr:'?')+')';}).join(' '));
  var bows=Object.keys(ITEMS).filter(function(id){return ITEMS[id].ranged&&ITEMS[id].ammo==='arrow';})
    .map(function(id){var c=COMBAT_GEAR_STATS[id]||{};return {n:ITEMS[id].name,t:ITEMS[id].ctier,req:ITEMS[id].reqRanged,
      a:c.atk||0,s:c.str||0,sw:ITEMS[id].swingMult,dm:ITEMS[id].dmgMult};})
    .sort(function(a,b){return a.a-b.a;});
  o.push('REAL BOWS:');
  bows.forEach(function(x){o.push('  T'+x.t+' req'+x.req+'  '+x.n+'  atk '+x.a+' str '+x.s+'  swing x'+x.sw+' dmg x'+x.dm);});
  var top=RANGED_AMMO[RANGED_AMMO.length-1];
  o.push('top arrow: '+top.k+'_arrow  str '+(ITEMS[top.k+'_arrow']||{}).ammoStr+'  fl'+top.fl);
  return o;
})())`)).join('\n'));process.exit(0);},2500);

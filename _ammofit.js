const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);ev('state=defaultState();normalizeState();');
console.log(JSON.parse(ev(`JSON.stringify((function(){
  var o=[];
  var bows=['pine_shortbow','ironbark_longbow','ancient_longbow','scorchhorn_longbow','fiendbone_longbow','sunpiercer','plummet'];
  var arrows=RANGED_AMMO.map(function(a){return a.k+'_arrow';}).concat(['sundershaft']);
  o.push('        '+arrows.map(function(a){return (ITEMS[a].name||a).replace(' Arrow','').slice(0,6).padEnd(7);}).join(''));
  bows.forEach(function(b){
    var row=(ITEMS[b].name+' (T'+(ITEMS[b].ctier||'?')+')').padEnd(24);
    arrows.forEach(function(a){ row+=(ammoFitsWeapon(b,a)?'  yes  ':'   -   ').padEnd(7); });
    o.push(row);
  });
  o.push('');
  o.push('crossbows use bolts:');
  ['bronze_crossbow','starfall_crossbow'].forEach(function(b){
    var bo=RANGED_AMMO.map(function(a){return a.k+'_bolt';}).concat(['sunderbolt']);
    var row=(ITEMS[b].name+' (T'+ITEMS[b].ctier+')').padEnd(24);
    bo.forEach(function(a){ row+=(ammoFitsWeapon(b,a)?'  yes  ':'   -   ').padEnd(7); });
    o.push(row);
  });
  return o;
})())`)).join('\n'));process.exit(0);},2500);

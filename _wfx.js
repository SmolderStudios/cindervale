const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);ev('state=defaultState();normalizeState();');
console.log(JSON.parse(ev(`JSON.stringify((function(){
  var o=[];
  o.push('WEAPONS WITH SPECIAL EFFECTS (wfx)');
  Object.keys(ITEMS).forEach(function(id){var it=ITEMS[id];
    if(it&&it.wfx) o.push('  '+('T'+(it.ctier||'?')).padEnd(4)+(it.ranged?'[ranged] ':'[melee]  ')+
      it.name.padEnd(22)+JSON.stringify(it.wfx));});
  o.push('');
  o.push('RANGED WEAPONS WITH ANY EFFECT AT ALL');
  var r=Object.keys(ITEMS).filter(function(id){return ITEMS[id]&&ITEMS[id].ranged&&(ITEMS[id].wfx||ITEMS[id].ubonus);});
  o.push('  '+(r.length?r.map(function(id){return ITEMS[id].name;}).join(', '):'*** NONE ***'));
  o.push('');
  o.push('CROSSBOW LADDER');
  var byT={};
  Object.keys(ITEMS).forEach(function(id){var it=ITEMS[id];
    if(it&&it.ranged&&it.ammo==='bolt') (byT[it.ctier]=byT[it.ctier]||[]).push(it.name+' atk '+(COMBAT_GEAR_STATS[id]||{}).atk);});
  for(var t=1;t<=11;t++) o.push('  T'+String(t).padStart(2)+': '+(byT[t]?byT[t].join(' · '):'*** NOTHING ***'));
  o.push('');
  o.push('AMMO WITH EFFECTS');
  var a=Object.keys(ITEMS).filter(function(id){return ITEMS[id]&&ITEMS[id].ammo&&(ITEMS[id].wfx||ITEMS[id].ammoFx);});
  o.push('  '+(a.length?a.join(', '):'*** NONE — every arrow is just strength ***'));
  o.push('');
  o.push('EFFECT KINDS THE FIGHT ACTUALLY READS');
  o.push('  burn / poison / stun / cleave (see combatTick wfx handling)');
  return o;
})())`)).join('\n'));
process.exit(0);},2500);

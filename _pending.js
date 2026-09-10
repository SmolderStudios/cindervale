const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);ev('state=defaultState();normalizeState();');
// anything still on a generated/hand SVG rather than painted art
console.log(JSON.parse(ev(`JSON.stringify((function(){
  var art=(typeof ART_ITEM!=='undefined')?ART_ITEM:{};
  return Object.keys(ITEMS).filter(function(id){
    return ICONS[id] && !art[id] && /^<svg/.test(String(ICONS[id]));
  }).map(function(id){var it=ITEMS[id];
    return {id:id, n:it.name, slot:it.cslot||(it.ammo?'ammo':'material'), t:it.ctier||0};});
})())`)).map(function(x){return '  '+x.id.padEnd(24)+x.n.padEnd(24)+x.slot.padEnd(10)+(x.t?'T'+x.t:'');}).join('\n'));
process.exit(0);},2500);

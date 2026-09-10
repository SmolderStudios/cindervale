const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);ev('state=defaultState();normalizeState();');
const out=JSON.parse(ev(`JSON.stringify((function(){
  var o=[];
  ['gloves','shield'].forEach(function(sl){
    var l=Object.keys(COMBAT_GEAR_STATS).filter(function(id){return ITEMS[id]&&ITEMS[id].cslot===sl;})
      .map(function(id){var c=COMBAT_GEAR_STATS[id];return {n:ITEMS[id].name,t:ITEMS[id].ctier||0,a:c.atk||0,d:c.def||0};})
      .sort(function(a,b){return (a.d*100+a.a)-(b.d*100+b.a);}).slice(-5);
    o.push(sl.toUpperCase());
    l.forEach(function(x){o.push('  T'+x.t+'  '+x.n+'  def '+x.d+' atk '+x.a);});
  });
  var bows=Object.keys(COMBAT_GEAR_STATS).filter(function(id){return ITEMS[id]&&/bow|piercer/i.test(ITEMS[id].name||'');})
    .map(function(id){var c=COMBAT_GEAR_STATS[id];return {n:ITEMS[id].name,t:ITEMS[id].ctier||0,a:c.atk||0,s:c.str||0};})
    .sort(function(a,b){return (a.a+a.s)-(b.a+b.s);}).slice(-5);
  o.push('BOWS'); bows.forEach(function(x){o.push('  T'+x.t+'  '+x.n+'  atk '+x.a+' str '+x.s);});
  return o;
})())`));
console.log(out.join('\n'));process.exit(0);},2500);

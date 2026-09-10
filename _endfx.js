const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);ev('state=defaultState();normalizeState();');
console.log(JSON.parse(ev(`JSON.stringify((function(){
  var o=[]; var ids=['dawnbreaker','starfang','worldsunder_maul','dawnreaper','aegis_of_dawn','dawnmantle',
    'sunpiercer','sunderedge','faultward','plummet','stonewright_gauntlets','abyssal_aegis'];
  ids.forEach(function(id){var it=ITEMS[id]; if(!it) return;
    var bits=[];
    if(it.wfx) bits.push('PROC '+JSON.stringify(it.wfx));
    if(it.ubonus) bits.push('stats '+JSON.stringify(it.ubonus));
    if(it.hpBlock) bits.push('hpBlock '+JSON.stringify(it.hpBlock));
    if(it.hpStr) bits.push('hpStr '+JSON.stringify(it.hpStr));
    if(it.cheatDeath) bits.push('CHEAT-DEATH');
    if(it.momGain) bits.push('MOMENTUM +'+it.momGain+'/hit');
    if(it.blockMom) bits.push('MOMENTUM +'+it.blockMom+'/block');
    o.push(('T'+it.ctier).padEnd(4)+it.name.padEnd(24)+(bits.length?bits.join('  |  '):'*** nothing but numbers ***'));
  });
  return o;
})())`)).join('\n'));
console.log('\nhpBlock / hpStr are read where?');
process.exit(0);},2500);

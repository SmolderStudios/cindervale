const fs=require('fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('cindervale.html','utf8'),
 {url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
setTimeout(()=>{
  console.log(dom.window.eval(`(function(){
    state=defaultState(); normalizeState(); demoXpCap=function(){return XP_CAP;};
    var o=[];
    o.push('=== #85/#86  cooked food categorisation ===');
    var cooked=[];
    (SKILLS.cooking.acts||[]).forEach(function(a){ for(var id in (a.out||{})) cooked.push(id); });
    cooked=cooked.filter(function(v,i,z){return z.indexOf(v)===i;});
    var bad=[];
    cooked.forEach(function(id){
      var c=(typeof itemCompCat==='function')?itemCompCat(id):'?';
      if(c!=='food') bad.push(id+' -> '+c);
    });
    o.push('  '+cooked.length+' cooked outputs; miscategorised: '+(bad.length?bad.join(', '):'none'));
    var elk=Object.keys(ITEMS).filter(function(k){return /elk|haunch/i.test(ITEMS[k].name||'');});
    elk.forEach(function(k){
      o.push('    '+(ITEMS[k].name+'').padEnd(22)+' comp='+itemCompCat(k)
        +'  potion='+(ITEMS[k].potion?'yes':'no'));
    });

    o.push('');
    o.push('=== #97  Ring of Plenty, left vs right ring ===');
    var rop=Object.keys(ITEMS).filter(function(k){return /ring of plenty/i.test(ITEMS[k].name||'');});
    rop.forEach(function(k){
      var it=ITEMS[k];
      o.push('  '+k+'  jslot='+it.jslot+'  slot='+(it.slot||'-')+'  cslot='+(it.cslot||'-')
        +'  skillGear='+(it.skillGear?'yes':'no')+'  trophyJewel='+(it.trophyJewel?'yes':'no'));
    });
    o.push('  (slot table skipped)');

    o.push('');
    o.push('=== #95  secondary action quest credit ===');
    o.push('  recordXpGain callers / quest hooks:');
    return o.join(String.fromCharCode(10));
  })()`));
},3000);

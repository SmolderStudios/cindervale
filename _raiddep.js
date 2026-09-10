/* What breaks if a raid is retired? Its materials feed crafted ladders, and a
   material with no other source takes an entire tier down with it silently. */
const fs=require('fs');
const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{
  const w=dom.window, ev=e=>w.eval(e);
  ev('state=defaultState(); normalizeState();');
  const out=JSON.parse(ev(`(function(){
    var res=[];
    RAIDS.filter(function(r){return !r.endless;}).forEach(function(r){
      var mats=[]; (r.matPool||[]).forEach(function(m){ if(mats.indexOf(m.id)<0) mats.push(m.id); });
      var rows=mats.map(function(mid){
        // other sources: any monster drop table, any skilling act output, any shop row
        var fromMon=MONSTERS.filter(function(m){
          var d=(typeof DROPS!=='undefined'&&DROPS[m.id])||[];
          return d.some(function(x){return x.id===mid;});
        }).map(function(m){return m.name;});
        var fromSkill=[];
        for(var sk in SKILLS){ (SKILLS[sk].acts||[]).forEach(function(a){
          if(a.out&&a.out[mid]) fromSkill.push(SKILLS[sk].name+': '+a.name);
        }); }
        var inShop=(typeof SHOP!=='undefined'&&SHOP.some)?SHOP.some(function(x){return x.id===mid;}):false;
        // what consumes it
        var uses=[];
        for(var sk2 in SKILLS){ (SKILLS[sk2].acts||[]).forEach(function(a){
          var c=a.inp||{};
          if(c && c[mid]) uses.push(SKILLS[sk2].name+': '+a.name);
        }); }
        return {mat:mid, name:(ITEMS[mid]&&ITEMS[mid].name)||mid,
                otherMon:fromMon.length, otherSkill:fromSkill, shop:inShop, usedBy:uses.length, useSample:uses.slice(0,4)};
      });
      res.push({raid:r.name, id:r.id, lvl:r.unlockLvl, gear:r.gearDrops.length, mats:rows});
    });
    return JSON.stringify(res);
  })()`));
  for(const r of out){
    console.log('\n=== '+r.raid+' (Lv '+r.lvl+', '+r.gear+' gear pieces) ===');
    for(const m of r.mats){
      const orphan=(m.otherMon===0 && m.otherSkill.length===0 && !m.shop);
      console.log('  '+m.name.padEnd(20)+
        ' other sources: '+(orphan?'NONE — retiring this raid orphans it':(m.otherMon+' monsters, '+m.otherSkill.length+' skill acts'+(m.shop?', shop':''))));
      if(m.usedBy) console.log('      feeds '+m.usedBy+' recipes, e.g. '+m.useSample.join(' | '));
      else console.log('      feeds nothing');
    }
  }
  process.exit(0);
},2500);

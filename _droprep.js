/* Full drop-rate picture across every raid, plus ranged coverage, plus whether the
   Monster Log survives being pointed at an endless raid. */
const fs=require('fs');
const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{
  const w=dom.window, ev=e=>w.eval(e);
  ev('state=defaultState(); normalizeState();');

  console.log('=== 1. DOES THE LOG SURVIVE THE SPIRE? ===');
  for(const rid of JSON.parse(ev('JSON.stringify(RAIDS.map(r=>r.id))'))){
    let res;
    try{ ev(`state.monLogZone='${rid}'; state.monLogSel=null; buildMonLogHTML();`); res='ok'; }
    catch(e){ res='THROWS: '+e.message; }
    console.log('  '+rid.padEnd(18)+' '+res);
  }

  console.log('\n=== 2. RANGED COVERAGE ===');
  const rng=JSON.parse(ev(`JSON.stringify((function(){
    var slots={};
    RAIDS.forEach(function(r){
      (r.gearDrops||[]).forEach(function(g){
        var it=ITEMS[g.id]||{};
        var k=it.cslot||'?';
        var isRanged=!!(it.ammo||it.rangedStr||k==='quiver'||(it.dmgType==='ranged'));
        var nm=(it.name||g.id);
        slots[r.name]=slots[r.name]||{slots:{},ranged:[]};
        slots[r.name].slots[k]=(slots[r.name].slots[k]||0)+1;
        if(isRanged||/bow|quiver|arrow|bolt|piercer/i.test(nm)) slots[r.name].ranged.push(nm);
      });
    });
    return slots;
  })())`));
  for(const rn in rng){
    console.log('  '+rn);
    console.log('    slots: '+JSON.stringify(rng[rn].slots));
    console.log('    ranged-ish: '+(rng[rn].ranged.join(', ')||'NONE'));
  }
  // what ranged gear exists at all, and where does it come from
  const allR=JSON.parse(ev(`JSON.stringify(Object.keys(ITEMS).filter(function(id){
    var it=ITEMS[id]; return it&&(it.cslot==='quiver'||(it.cgear&&/bow|crossbow/i.test(it.name||'')));
  }).map(function(id){return ITEMS[id].name;}))`));
  console.log('  every bow/crossbow/quiver in the game: '+allR.length+' items');

  console.log('\n=== 3. EVERY RAID DROP, BY RATE ===');
  const all=JSON.parse(ev(`JSON.stringify(RAIDS.filter(function(r){return !r.endless;}).map(function(r){
    return {name:r.name, lvl:r.unlockLvl,
      drops:(r.gearDrops||[]).map(function(g){
        var it=ITEMS[g.id]||{};
        return {n:it.name||g.id, c:g.chance, slot:it.cslot||'?', tier:it.ctier||0,
                uniq:!!it.ubonus, two:!!it.twoHanded};
      }),
      mats:(r.matPool||[]).map(function(m){return (ITEMS[m.id]||{}).name||m.id;})};
  }))`));
  for(const r of all){
    console.log('\n  '+r.name+' (Lv '+r.lvl+')');
    const bySlot={};
    for(const d of r.drops){ (bySlot[d.slot]=bySlot[d.slot]||[]).push(d); }
    for(const sl in bySlot){
      console.log('    '+sl+':');
      for(const d of bySlot[sl]){
        const atS=Math.min(0.6,d.c*3.0);
        console.log('      '+d.n.padEnd(24)+(d.c*100).toFixed(3)+'%  1 in '+String(Math.round(1/atS)).padStart(4)+
                    ' at S'+(d.uniq?'  [unique]':'')+(d.two?'  [2H]':''));
      }
    }
    console.log('    materials: '+r.mats.join(', '));
  }

  console.log('\n=== 4. SLOT COVERAGE ACROSS ALL RAIDS ===');
  const cov={};
  for(const r of all) for(const d of r.drops){ cov[d.slot]=(cov[d.slot]||0)+1; }
  console.log('  '+JSON.stringify(cov));
  process.exit(0);
},2500);

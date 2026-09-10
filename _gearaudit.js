/* How much gear do the raids actually add, and how long is any of it worth wearing? */
const fs=require('fs');
const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{
  const w=dom.window, ev=e=>w.eval(e);
  ev('state=defaultState(); normalizeState();');

  const raids=JSON.parse(ev(`JSON.stringify(RAIDS.filter(r=>!r.endless).map(r=>({
    name:r.name, lvl:r.unlockLvl,
    drops:r.gearDrops.map(g=>({id:g.id, chance:g.chance,
      name:(ITEMS[g.id]&&ITEMS[g.id].name)||g.id,
      slot:(ITEMS[g.id]&&(ITEMS[g.id].slot||ITEMS[g.id].cgear))||'?',
      st:COMBAT_GEAR_STATS[g.id]||null,
      uniq:!!(ITEMS[g.id]&&ITEMS[g.id].ubonus)}))
  })))`));

  console.log('\n=== RAID GEAR TABLES ===');
  let total=0, expected=[];
  for(const r of raids){
    total+=r.drops.length;
    // expected clears to see EACH piece once at S rank (mult 3.0)
    const worst=r.drops.reduce((a,d)=>Math.min(a,d.chance),1);
    const best=r.drops.reduce((a,d)=>Math.max(a,d.chance),0);
    const sumP=r.drops.reduce((a,d)=>a+Math.min(0.6,d.chance*3.0),0);
    console.log(`\n${r.name} (Lv ${r.lvl}) — ${r.drops.length} pieces`);
    console.log(`  expected pieces per S clear: ${sumP.toFixed(2)}`);
    console.log(`  rarest ${(worst*100).toFixed(3)}% base → ${(Math.min(0.6,worst*3)*100).toFixed(2)}% at S = ${Math.round(1/Math.min(0.6,worst*3))} clears avg`);
    // clears to COMPLETE the table (coupon-collector on independent rolls)
    let need=0;
    for(const d of r.drops) need=Math.max(need, 1/Math.min(0.6,d.chance*3.0));
    expected.push({name:r.name, complete:Math.round(need), n:r.drops.length});
    for(const d of r.drops){
      const p=Math.min(0.6,d.chance*3.0);
      const s=d.st?`atk ${String(d.st.atk).padStart(3)} str ${String(d.st.str||0).padStart(3)} def ${String(d.st.def).padStart(3)}`:'no stats';
      console.log(`    ${d.name.padEnd(24)} ${(d.chance*100).toFixed(3)}%  ${String(Math.round(1/p)).padStart(4)} clears  ${s}${d.uniq?'  [unique effect]':''}`);
    }
  }

  console.log('\n=== THE PROBLEM, SIZED ===');
  console.log(`raid gear pieces across 4 raids: ${total}`);
  const crafted=+ev(`Object.keys(COMBAT_GEAR_STATS).filter(id=>/^(gravesteel|moltensteel|voidsteel|emberhide|voidhide)_/.test(id)).length`);
  console.log(`crafted raid-metal pieces (Gravesteel/Moltensteel/Voidsteel/Emberhide/Voidhide): ${crafted}`);
  console.log(`total combat gear items in the game: ${ev('Object.keys(COMBAT_GEAR_STATS).length')}`);
  for(const e of expected) console.log(`  ${e.name}: ~${e.complete} S-rank clears to see all ${e.n} pieces`);

  // how long is a raid's weapon actually best?
  console.log('\n=== HOW LONG IS ANY OF IT BEST IN SLOT? ===');
  // cgear is a boolean; the slot is ITEMS[id].cslot.
  const wep=JSON.parse(ev(`JSON.stringify(Object.keys(COMBAT_GEAR_STATS)
    .filter(id=>ITEMS[id]&&ITEMS[id].cgear&&ITEMS[id].cslot==='weapon'&&!ITEMS[id].twoHanded)
    .map(id=>({id,name:ITEMS[id].name,atk:COMBAT_GEAR_STATS[id].atk,str:COMBAT_GEAR_STATS[id].str||0,
      req:(typeof COMBAT_GEAR_REQ!=='undefined'&&COMBAT_GEAR_REQ[id])?COMBAT_GEAR_REQ[id]:null}))
    .sort((a,b)=>(a.atk+a.str)-(b.atk+b.str)))`));
  const top=wep.slice(-14);
  console.log('  top one-hand weapons by atk+str:');
  for(const x of top) console.log(`    ${x.name.padEnd(24)} atk ${String(x.atk).padStart(3)} str ${String(x.str).padStart(3)}  total ${x.atk+x.str}`);
  process.exit(0);
},2500);

const fs=require('fs');
const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{
  const w=dom.window, ev=e=>w.eval(e);
  ev('state=defaultState(); normalizeState();');
  console.log('=== THE WEAPON LADDER WITH CAPS ===');
  const ids=['barrow_blade','emberforged_blade','voidrend','dawnbreaker'];
  const rows=ids.map(id=>{
    ev(`state.asc={}; _b=JSON.stringify(gearStats('${id}'));`);
    const base=JSON.parse(ev('_b'));
    const cap=+ev(`ascCap('${id}')`);
    ev(`state.asc={'${id}':${cap}};`);
    const max=JSON.parse(ev(`JSON.stringify(gearStats('${id}'))`));
    let cost=0; for(let k=1;k<=cap;k++) cost+=Math.round(12*Math.pow(k,1.75));
    return {n:ev(`ITEMS['${id}'].name`), cap, base:base.atk+base.str, max:max.atk+max.str,
            ba:base.atk, bs:base.str, ma:max.atk, ms:max.str, cost};
  });
  for(let i=0;i<rows.length;i++){
    const r=rows[i], nxt=rows[i+1];
    const leap=nxt?(r.max>nxt.base?'  LEAPFROGS '+nxt.n+' base ('+nxt.base+')':'  stays under '+nxt.n+' base ('+nxt.base+')'):'';
    console.log('  '+r.n.padEnd(20)+'cap ★'+r.cap+'   '+r.ba+'/'+r.bs+' -> '+r.ma+'/'+r.ms+
      '   total '+String(r.base).padStart(3)+' -> '+String(r.max).padStart(3)+
      '   '+r.cost.toLocaleString().padStart(6)+' stone'+leap);
  }
  console.log('\n=== SALVAGE POOL NOW ===');
  const d=JSON.parse(ev(`(function(){
    state.items={}; state.combatEquipped={}; state.skillingEquipped={};
    var y=0,n=0;
    Object.keys(COMBAT_GEAR_STATS).forEach(function(id){
      state.items[id]=1; if(canSalvage(id)){ y+=salvageYield(id); n++; } delete state.items[id];
    });
    var full=0; for(var k=1;k<=10;k++) full+=Math.round(12*Math.pow(k,1.75));
    return JSON.stringify({y:y,n:n,full:full});
  })()`));
  console.log('  salvageable pieces: '+d.n+' of 261');
  console.log('  one of each = '+d.y.toLocaleString()+' stone = '+(d.y/d.full).toFixed(1)+' pieces maxed (was 4.3)');
  console.log('\n=== CANNOT BE TOUCHED ===');
  console.log('  '+ev(`Object.keys(COMBAT_GEAR_STATS).filter(function(id){return ascCap(id)<=0;}).length`)+' pieces below T7');
  process.exit(0);
},2500);

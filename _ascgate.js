const fs=require('fs');
const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{
  const w=dom.window, ev=e=>w.eval(e);
  ev('state=defaultState(); normalizeState(); state.items={}; state.combatEquipped={}; state.skillingEquipped={};');
  const d=JSON.parse(ev(`(function(){
    var byTier={}, totalIfOneEach=0, n=0;
    Object.keys(COMBAT_GEAR_STATS).forEach(function(id){
      var t=(ITEMS[id]&&ITEMS[id].ctier)||1;
      state.items[id]=1;
      var y=salvageYield(id);
      byTier[t]=byTier[t]||{n:0,y:0}; byTier[t].n++; byTier[t].y+=y;
      totalIfOneEach+=y; n++;
      delete state.items[id];
    });
    var full=0; for(var k=1;k<=10;k++) full+=Math.round(12*Math.pow(k,1.75));
    return JSON.stringify({byTier:byTier, totalIfOneEach:totalIfOneEach, n:n, fullPiece:full});
  })()`));
  console.log('full ten-rank cost, one piece: '+d.fullPiece.toLocaleString()+' Sunderstone');
  console.log('salvage value if you owned ONE of all '+d.n+' pieces: '+d.totalIfOneEach.toLocaleString());
  console.log('  = '+(d.totalIfOneEach/d.fullPiece).toFixed(1)+' pieces maxed out, for free');
  console.log('\nby tier:');
  const ts=Object.keys(d.byTier).map(Number).sort((a,b)=>a-b);
  let cum=0;
  for(const t of ts){ const b=d.byTier[t]; cum+=b.y;
    console.log('  T'+String(t).padStart(2)+'  '+String(b.n).padStart(3)+' pieces  '+String(b.y).toLocaleString().padStart(7)+' stone   (running total '+cum.toLocaleString()+')'); }
  console.log('\nif salvage/ascension were gated to T9+ only:');
  let hi=0,hn=0; for(const t of ts) if(t>=9){ hi+=d.byTier[t].y; hn+=d.byTier[t].n; }
  console.log('  '+hn+' pieces, '+hi.toLocaleString()+' stone = '+(hi/d.fullPiece).toFixed(1)+' pieces maxed');
  console.log('if gated to T10 only:');
  let h2=0,n2=0; for(const t of ts) if(t>=10){ h2+=d.byTier[t].y; n2+=d.byTier[t].n; }
  console.log('  '+n2+' pieces, '+h2.toLocaleString()+' stone = '+(h2/d.fullPiece).toFixed(1)+' pieces maxed');
  process.exit(0);
},2500);

const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);
ev("state=defaultState(); normalizeState(); state.combatXp={};"+
   "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
   "state.items={starfall_arrow:100000};");
const dps=(eq)=>{ ev(`state.combatEquipped=${eq}; refreshCombatStats();`);
  const acc=+ev('playerAccuracy()'), hit=+ev('playerMaxHit()'), sw=+ev('playerSwingMs()');
  const hc=Math.max(0.03,Math.min(0.97, acc/(acc+500)));
  return (hit*0.65)*(1000/sw)*hc; };
const MELEE="{weapon:'dawnbreaker',shield:'aegis_of_dawn',helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets'}";
const TWOH ="{weapon:'dawnreaper',helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets'}";
const bowEq=id=>`{weapon:'${id}',quiver:'starfall_arrow',helm:'sunweave_helm',chest:'sunweave_chest',legs:'sunweave_legs',boots:'sunweave_boots',gloves:'stonewright_gauntlets'}`;
const base=dps(MELEE), two=dps(TWOH);
console.log('  melee 1H+shield '+base.toFixed(0)+' dps = 100%   ·   Dawnreaper 2H '+two.toFixed(0)+' = '+(100*two/base).toFixed(0)+'%\n');
console.log('  target: Sunpiercer ~110%, Plummet ~120% (both 2H, so the Dawnreaper is the benchmark)\n');
const test=(id,atk,str)=>{ ev(`COMBAT_GEAR_STATS['${id}']={atk:${atk},str:${str},def:0};`);
  const d=dps(bowEq(id)); return {d, p:100*d/base}; };
for(const [id,label] of [['sunpiercer','Sunpiercer'],['plummet','Plummet']]){
  console.log('  '+label+':');
  const cur=JSON.parse(ev(`JSON.stringify(COMBAT_GEAR_STATS['${id}'])`));
  for(const [a,s] of [[cur.atk,cur.str],[94,48],[96,50],[98,52],[100,54]]){
    const r=test(id,a,s);
    console.log('    atk '+String(a).padStart(3)+' str '+String(s).padStart(3)+'  ->  '+r.d.toFixed(0)+' dps  '+r.p.toFixed(0)+'%');
  }
  ev(`COMBAT_GEAR_STATS['${id}']={atk:${cur.atk},str:${cur.str},def:0};`);
}
process.exit(0);},2500);

const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);
ev("state=defaultState(); normalizeState(); state.combatXp={};"+
   "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
   "state.items={starfall_arrow:100000};");
const rows=[
 ['dawnbreaker','melee 1H + Aegis of Dawn',"{weapon:'dawnbreaker',shield:'aegis_of_dawn',helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets'}"],
 ['sunderedge','melee 1H + Faultward',"{weapon:'sunderedge',shield:'faultward',helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets'}"],
 ['dawnreaper','melee 2H',"{weapon:'dawnreaper',helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets'}"],
 ['ancient_longbow','bow T7 + PLATE',"{weapon:'ancient_longbow',quiver:'starfall_arrow',helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets'}"],
 ['ancient_longbow','bow T7 + Sunweave leather',"{weapon:'ancient_longbow',quiver:'starfall_arrow',helm:'sunweave_helm',chest:'sunweave_chest',legs:'sunweave_legs',boots:'sunweave_boots',gloves:'stonewright_gauntlets'}"],
 ['sunpiercer','Sunpiercer + Sunweave',"{weapon:'sunpiercer',quiver:'starfall_arrow',helm:'sunweave_helm',chest:'sunweave_chest',legs:'sunweave_legs',boots:'sunweave_boots',gloves:'stonewright_gauntlets'}"],
 ['plummet','Plummet + Sunweave',"{weapon:'plummet',quiver:'starfall_arrow',helm:'sunweave_helm',chest:'sunweave_chest',legs:'sunweave_legs',boots:'sunweave_boots',gloves:'stonewright_gauntlets'}"],
];
console.log('  Lv99, best arrow, no Ascension. DPS = maxhit x 0.65 / swing x hit-chance vs def 500\n');
console.log('  '+'loadout'.padEnd(30)+'acc'.padStart(6)+'maxhit'.padStart(8)+'swing'.padStart(8)+'dps'.padStart(8)+'  vs melee 1H');
let base=null;
for(const [id,label,eq] of rows){
  ev(`state.combatEquipped=${eq}; refreshCombatStats();`);
  const acc=+ev('playerAccuracy()'), hit=+ev('playerMaxHit()'), sw=+ev('playerSwingMs()');
  const hc=Math.max(0.03,Math.min(0.97, acc/(acc+500)));
  const dps=(hit*0.65)*(1000/sw)*hc;
  if(base===null) base=dps;
  console.log('  '+label.padEnd(30)+String(acc).padStart(6)+String(hit).padStart(8)+
    (sw/1000).toFixed(2).padStart(7)+'s'+dps.toFixed(0).padStart(8)+'   '+(100*dps/base).toFixed(0)+'%');
}
process.exit(0);},2500);

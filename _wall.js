const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);
ev("state=defaultState(); normalizeState(); state.combatXp={};"+
   "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
   "state.items={sundershaft:1e6};");
const CAPE="cape:'dawnmantle'";
const G="gloves:'stonewright_gauntlets'";
const PLATE="helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots'";
const LTHR ="helm:'sunweave_helm',chest:'sunweave_chest',legs:'sunweave_legs',boots:'sunweave_boots'";
const BUILDS=[
 ['sword + shield', `{weapon:'sunderedge',shield:'faultward',${PLATE},${G},${CAPE}}`],
 ['two-handed',     `{weapon:'dawnreaper',${PLATE},${G},${CAPE}}`],
 ['bow (Sunweave)', `{weapon:'plummet',quiver:'sundershaft',${LTHR},${G},${CAPE}}`],
];
function measure(eq,asc){
  ev(`state.combatEquipped=${eq};`);
  ev(asc?"state.asc={}; for(const id of Object.values(state.combatEquipped)) if(id&&ascCap(id)>0) state.asc[id]=ascCap(id);":"state.asc={};");
  ev('refreshCombatStats();');
  const acc=+ev('playerAccuracy()'), hit=+ev('playerMaxHit()'),
        def=+ev('playerDefence()'), sw=+ev('playerSwingMs()'), hp=+ev('maxHpFromStats()'),
        dr=+ev('ascensionDR()');
  const dps=(hit*0.65)*(1000/sw);
  let lethal=0, slow=0;
  for(let f=1;f<=250;f++){
    const m=JSON.parse(ev('JSON.stringify(spireFloor('+f+',true))'));
    const hc=Math.max(0.03,Math.min(0.97, acc/(acc+m.def)));
    const secs=m.hp/(dps*hc);
    const fh=Math.max(0.03,Math.min(0.97, m.atk/(m.atk+def)));
    const fdps=(m.str*0.65)*fh*(1000/(m.swingMs||2400))*(1-dr);
    if(!slow   && secs>240) slow=f;
    if(!lethal && fdps*8 > hp*2.2) lethal=f;
    if(lethal&&slow) break;
  }
  return {acc,hit,def,sw,hp,dr,lethal:lethal||'>250',slow:slow||'>250'};
}
console.log('  Lv99 in the best gear that exists. "Wall" = the floor where the tower');
console.log('  out-damages what food and Rally can put back.\n');
console.log('  '+'build'.padEnd(18)+'acc'.padStart(5)+'maxhit'.padStart(7)+'def'.padStart(5)+'hp'.padStart(6)+'  DR'+'   wall'.padStart(7)+'  4-min floor');
for(const [label,eq] of BUILDS){
  for(const asc of [false,true]){
    const r=measure(eq,asc);
    console.log('  '+(label+(asc?' ★max':' ★0')).padEnd(18)+String(r.acc).padStart(5)+String(r.hit).padStart(7)+
      String(r.def).padStart(5)+String(r.hp).padStart(6)+(100*r.dr).toFixed(0).padStart(4)+'%'+
      String(r.lethal).padStart(7)+String(r.slow).padStart(13));
  }
}
process.exit(0);},2500);

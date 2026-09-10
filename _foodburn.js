const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);
ev("state=defaultState(); normalizeState(); state.combatXp={};"+
   "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
   "state.combatEquipped={weapon:'sunderedge',shield:'faultward',helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets',cape:'dawnmantle'};"+
   "state.asc={}; for(const id of Object.values(state.combatEquipped)) if(id&&ascCap(id)>0) state.asc[id]=ascCap(id); refreshCombatStats();");
const acc=+ev('playerAccuracy()'), hit=+ev('playerMaxHit()'), def=+ev('playerDefence()'),
      sw=+ev('playerSwingMs()'), hp=+ev('maxHpFromStats()'), dr=+ev('ascensionDR()');
const CAP=+ev('RAID_HIT_CAP'), capv=Math.round(hp*CAP);
const FOOD=1120; // Prized Void Eel, the best in the game
console.log('  Fully ascended sword-and-board: '+hp+' hp · '+(dr*100).toFixed(0)+'% DR');
console.log('  single-blow cap: '+(CAP*100).toFixed(0)+'% = '+capv+' · best food heals '+FOOD+' · Rally heals '+Math.round(hp*0.25)+'\n');
console.log('  floor | its avg hit | capped? | hits to kill | kill time | food per floor | total food to here');
console.log('  ------+-------------+---------+--------------+-----------+----------------+-------------------');
let cum=0;
for(let f=1;f<=90;f++){
  const m=JSON.parse(ev('JSON.stringify(spireFloor('+f+',true))'));
  const cur=JSON.parse(ev('JSON.stringify(spireCurse('+f+')||{})'));
  const cdef=Math.round(def*(cur.defMult||1));
  const fh=Math.max(0.03,Math.min(0.97, m.atk/(m.atk+cdef)));
  let avg=Math.round(m.str*0.65*(1-dr)); const raw=avg;
  const capped=avg>capv; if(capped) avg=capv;
  const mySw=sw*(cur.swingMult||1);
  const hc=Math.max(0.03,Math.min(0.97, acc/(acc+m.def)));
  const kill=m.hp/((hit*0.65)*(1000/mySw)*hc);
  const taken=avg*fh*(kill/((m.swingMs||2400)/1000));
  const foodN=Math.max(0,taken-hp*0.25)/FOOD;  // Rally covers a slice for free
  cum+=foodN;
  if([1,20,40,50,55,60,70,80,90].includes(f))
    console.log('  '+String(f).padStart(5)+' | '+String(raw).padStart(11)+' | '+
      (capped?('yes '+avg).padStart(7):'no'.padStart(7))+' | '+
      (hp/avg).toFixed(1).padStart(12)+' | '+(Math.round(kill)+'s').padStart(9)+' | '+
      foodN.toFixed(1).padStart(14)+' | '+Math.round(cum).toString().padStart(18));
}
process.exit(0);},2500);

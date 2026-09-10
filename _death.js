const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);
ev("state=defaultState(); normalizeState(); state.combatXp={};"+
   "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];");
// best heal food in the game
const food=JSON.parse(ev(`JSON.stringify((function(){
  var best=null;
  Object.keys(ITEMS).forEach(function(id){var it=ITEMS[id];
    var h=it&&(it.heal||it.hp||0);
    if(h&&(!best||h>best.heal)) best={id:id,n:it.name,heal:h};});
  return best||{n:'none found',heal:0};
})())`));
ev(`state.combatEquipped={weapon:'sunderedge',shield:'faultward',helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets',cape:'dawnmantle'};`);
ev("state.asc={}; for(const id of Object.values(state.combatEquipped)) if(id&&ascCap(id)>0) state.asc[id]=ascCap(id); refreshCombatStats();");
const acc=+ev('playerAccuracy()'), hit=+ev('playerMaxHit()'), def=+ev('playerDefence()'),
      sw=+ev('playerSwingMs()'), hp=+ev('maxHpFromStats()'), dr=+ev('ascensionDR()');
console.log('  Fully ascended sword-and-board, Lv99.');
console.log('  '+hp+' hp · def '+def+' · max hit '+hit+' · swing '+(sw/1000).toFixed(2)+'s · '+(dr*100).toFixed(0)+'% damage reduction');
console.log('  best food in the game: '+food.n+' heals '+food.heal+'\n');
console.log('  floor | foe max hit | its swing | hits to kill you | your kill time | what ends it');
console.log('  ------+-------------+-----------+------------------+----------------+--------------');
for(const f of [30,40,50,55,60,70]){
  const m=JSON.parse(ev('JSON.stringify(spireFloor('+f+',true))'));
  const cur=JSON.parse(ev('JSON.stringify(spireCurse('+f+')||{})'));
  const cdef=Math.round(def*(cur.defMult||1));
  const fh=Math.max(0.03,Math.min(0.97, m.atk/(m.atk+cdef)));
  const avg=Math.round(m.str*0.65*(1-dr));          // average landed hit after DR
  const max=Math.round(m.str*(1-dr));               // its ceiling
  const hits=(hp/avg).toFixed(1);
  const mySw=sw*(cur.swingMult||1);
  const hc=Math.max(0.03,Math.min(0.97, acc/(acc+m.def)));
  const kill=Math.round(m.hp/((hit*0.65)*(1000/mySw)*hc));
  const slam=Math.round(hp*Math.min(0.44,0.26+f*0.002));
  const oneshot=max>=hp;
  const why=oneshot?('ONE-SHOT: its max hit '+max+' >= your '+hp+' hp')
    :(avg*3>hp?('3 hits kill; food heals '+food.heal+' per '+(avg)+' taken'):'attrition');
  console.log('  '+String(f).padStart(5)+' | '+String(max).padStart(11)+' | '+
    ((m.swingMs||2400)/1000).toFixed(2)+'s'.padStart(6)+' | '+String(hits).padStart(16)+' | '+
    (String(kill)+'s').padStart(14)+' | '+why);
  if(f%20===0||f===55) console.log('        landing slam hits for '+slam+' unbraced, '+Math.round(slam*0.3)+' braced · Rally heals '+Math.round(hp*0.25));
}
process.exit(0);},2500);

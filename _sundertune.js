const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);
ev("state=defaultState(); normalizeState(); state.combatXp={};"+
   "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
   "state.combatEquipped={helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets'};");
// 4000 swings per weapon: enough that RNG stops moving the third digit
function dmg(wep,swings){
  ev(`state.combatEquipped.weapon='${wep}'; refreshCombatStats();`);
  ev("combat.monId=MONSTERS[MONSTERS.length-1].id; combat.active=true; combat.foeStatus={};"+
     "combat.foeHp=1e12; combat.foeMaxHp=1e12; combat.youHp=combat.youMaxHp; _tot=0;");
  // fights of 12 swings each, so Sunder ramps from zero the way it does in a real fight
  ev(`for(let f=0;f<${Math.round(swings/12)};f++){ combat.foeStatus={};`+
     ` for(let i=0;i<12;i++){ var b=combat.foeHp; combat.youSwingStart=0; combat.foeSwingStart=Date.now(); combatTick(); _tot+=b-combat.foeHp; combat.youHp=combat.youMaxHp; } }`);
  return +ev('_tot');
}
const base=dmg('dawnbreaker',4800);
console.log('  12-swing fights, 4,800 swings each. Dawnbreaker (burn 20%) = 100%\n');
console.log('  Dawnbreaker  '+Math.round(base).toLocaleString()+'   100%');
console.log('  (Dawnbreaker is 90/84 with burn 20%)');
for(const [atk,str,per] of [[106,99,0.045],[98,91,0.030],[94,87,0.030],[94,87,0.025],[90,84,0.030]]){
  ev(`COMBAT_GEAR_STATS.sunderedge={atk:${atk},str:${str},def:0}; ITEMS.sunderedge.wfx.sunder.per=${per};`);
  const d=dmg('sunderedge',4800);
  console.log('  Sunderedge '+String(atk).padStart(3)+'/'+String(str).padStart(2)+' sunder '+per.toFixed(3)+
    '  '+Math.round(d).toLocaleString().padStart(9)+'   '+(100*d/base).toFixed(0)+'%');
}
process.exit(0);},2500);

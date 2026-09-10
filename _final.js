const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);
ev("state=defaultState(); normalizeState(); state.combatXp={};"+
   "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
   "state.items={sundershaft:1e6,starfall_arrow:1e6};");
function dps(eq,fights){
  ev(`state.combatEquipped=${eq}; refreshCombatStats();`);
  ev("combat.monId=MONSTERS[MONSTERS.length-1].id; combat.active=true;"+
     "combat.foeHp=1e12; combat.foeMaxHp=1e12; combat.youHp=combat.youMaxHp; _tot=0; _sw=0;");
  ev(`for(let f=0;f<${fights};f++){ combat.foeStatus={};`+
     ` for(let i=0;i<12;i++){ var b=combat.foeHp; combat.youSwingStart=0; combat.foeSwingStart=Date.now(); combatTick(); _tot+=b-combat.foeHp; _sw++; combat.youHp=combat.youMaxHp; } }`);
  return +ev('_tot')/+ev('_sw');
}
const P="helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets',cape:'dawnmantle'";
const L="helm:'sunweave_helm',chest:'sunweave_chest',legs:'sunweave_legs',boots:'sunweave_boots',gloves:'stonewright_gauntlets',cape:'dawnmantle'";
const rows=[
 ['Dawnbreaker + Aegis of Dawn (T10)',`{weapon:'dawnbreaker',shield:'aegis_of_dawn',${P}}`],
 ['Sunderedge + Faultward (T11)',     `{weapon:'sunderedge',shield:'faultward',${P}}`],
 ['Dawnreaper 2H (T10)',              `{weapon:'dawnreaper',${P}}`],
 ['Sunpiercer + Sundershaft (T10)',   `{weapon:'sunpiercer',quiver:'sundershaft',${L}}`],
 ['Plummet + Sundershaft (T11)',      `{weapon:'plummet',quiver:'sundershaft',${L}}`],
];
let base=null;
console.log('  400 fights of 12 swings each, so every proc ramps from zero the way it does live.\n');
console.log('  '+'loadout'.padEnd(36)+'dmg/swing'.padStart(10)+'   vs T10 1H');
for(const [label,eq] of rows){
  const d=dps(eq,400);
  if(base===null) base=d;
  console.log('  '+label.padEnd(36)+d.toFixed(0).padStart(10)+'      '+(100*d/base).toFixed(0)+'%');
}
process.exit(0);},2500);

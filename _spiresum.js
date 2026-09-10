const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);
ev("state=defaultState(); normalizeState(); state.combatXp={};"+
   "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
   "state.combatEquipped={weapon:'sunderedge',shield:'faultward',helm:'dawnward_helm',chest:'dawnward_chest',legs:'dawnward_legs',boots:'dawnward_boots',gloves:'stonewright_gauntlets',cape:'dawnmantle'};"+
   "refreshCombatStats();");
console.log('WHAT A CLIMB PAYS (no affix bonus, S-rank irrelevant - there is no rating)');
console.log('  floor   gold   stone   cores   gear chance   arrows');
let g=0,st=0,co=0,ar=0;
for(let f=1;f<=60;f++){
  const land=(f%5===0);
  const gold=Math.round(900*Math.pow(1.055,f-1));
  const stone=1+Math.floor(f/6);
  const core=(land&&f>=15)?(1+Math.floor((f-15)/20)):0;
  const q=land?Math.round(20+f*2.5):0;
  g+=gold; st+=stone; co+=core; ar+=q;
  if([1,10,20,30,40,50,60].includes(f))
    console.log('  '+String(f).padStart(5)+String(gold).padStart(7)+String(stone).padStart(8)+
      String(core).padStart(8)+(land?((+ev('spireGearChance('+f+')')*100).toFixed(3)+'%'):'   -   ').padStart(14)+
      String(q).padStart(9));
}
console.log('  ---- cumulative to floor 60: '+g.toLocaleString()+'g, '+st.toLocaleString()+
            ' stone, '+co+' cores, '+ar.toLocaleString()+' arrows');
console.log('\nASCENSION COSTS');
let one=0; for(let k=1;k<=10;k++) one+=Math.round(12*Math.pow(k,1.75));
console.log('  one piece to its cap:  T7 star5 '+[1,2,3,4,5].reduce((a,k)=>a+Math.round(12*Math.pow(k,1.75)),0).toLocaleString()+
            '   T10/T11 star10 '+one.toLocaleString()+' stone + 10 cores');
const worn=+ev("Object.values(state.combatEquipped).filter(id=>id&&ascCap(id)>0).length");
console.log('  full loadout ('+worn+' worn pieces at star10): '+(one*worn).toLocaleString()+' stone + '+(10*worn)+' cores');
console.log('  -> that is roughly '+Math.round(one*worn/st*60/60)+' climbs to floor 60 worth of stone');
console.log('\nWHAT IT DEMANDS');
const hp=+ev('maxHpFromStats()');
console.log('  hit cap '+(+ev('RAID_HIT_CAP')*100).toFixed(0)+'% = '+Math.round(hp*(+ev('RAID_HIT_CAP')))+
            ' max per blow on '+hp+' hp (unascended)');
console.log('  food to reach floor 50 ~250-310 · floor 60 ~520-660 · floor 70 ~1,100-1,450');
console.log('\nSTILL OPEN');
console.log('  - no bow between T7 (Ancient Longbow, atk 38) and T10 (Sunpiercer)');
console.log('  - no raid drops a quiver; the slot has no gear at all');
console.log('  - Spire gear + ammo are on generator/placeholder art pending a contact sheet');
process.exit(0);},2500);

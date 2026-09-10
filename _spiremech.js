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

console.log('=== WHAT IS ACTUALLY IN THE SPIRE ===');
console.log(JSON.parse(ev(`JSON.stringify((function(){
  var o=[];
  o.push('scaling   hp x'+SPR_HP_STEP+'/floor  atk+str x'+SPR_DMG_STEP+'  defence x'+SPR_DEF_STEP);
  o.push('landings  every '+SPR_BOSS_EVERY+'th floor: 1.9x health, 1.15x attack, always telegraphs');
  var f5=spireFloor(5,true), f20=spireFloor(20,true), f12=spireFloor(12,true), f3=spireFloor(3,true);
  o.push('telegraph floors 1-11 ordinary: '+(f3.castfx?'yes':'NONE'));
  o.push('          floor 12+ ordinary: '+(f12.castfx?f12.castfx.kinds.join('/'):'none'));
  o.push('          landing under 20: '+(f5.castfx?f5.castfx.kinds.join('/'):'none'));
  o.push('          landing 20+: '+(f20.castfx?f20.castfx.kinds.join('/'):'none'));
  o.push('curse     '+(spireCurse(10)?spireCurse(10).name+' - '+spireCurse(10).desc:'none')); 
  o.push('          at 50: '+(spireCurse(50)?spireCurse(50).name:'')+' -> def x'+(spireCurse(50).defMult.toFixed(2))+' swing x'+spireCurse(50).swingMult.toFixed(2));
  o.push('cap       '+(RAID_HIT_CAP*100).toFixed(0)+'% of max HP per blow');
  o.push('loot      gold every floor, Sunderstone every floor, Spire Cores on landings from 15');
  o.push('          gear on landings (depth-scaled), ammunition in bulk on landings');
  o.push('shared    Momentum + Rally/Ruin/Brace, auto-cast, no-retreat, cheat-death gear');
  o.push('absent    no affixes, no modifiers, no per-run variation beyond the roster band');
  return o;
})())`)).join('\n  '));

console.log('\n=== HIT CAP OPTIONS ===');
const hp=+ev('maxHpFromStats()'), acc=+ev('playerAccuracy()'), hit=+ev('playerMaxHit()'),
      def=+ev('playerDefence()'), sw=+ev('playerSwingMs()'), dr=+ev('ascensionDR()');
const FOOD=1120;
console.log('  '+hp+' hp · best food heals '+FOOD+' · Rally heals '+Math.round(hp*0.25)+'\n');
console.log('  cap  |  per blow | hits to kill | food to floor 50 | to 60 | to 70');
for(const c of [0.34,0.40,0.45,0.50,0.55]){
  const capv=Math.round(hp*c);
  const tot={};
  let cum=0;
  for(let f=1;f<=70;f++){
    const m=JSON.parse(ev('JSON.stringify(spireFloor('+f+',true))'));
    const cur=JSON.parse(ev('JSON.stringify(spireCurse('+f+')||{})'));
    const cdef=Math.round(def*(cur.defMult||1));
    const fh=Math.max(0.03,Math.min(0.97, m.atk/(m.atk+cdef)));
    const avg=Math.min(Math.round(m.str*0.65*(1-dr)), capv);
    const mySw=sw*(cur.swingMult||1);
    const hc=Math.max(0.03,Math.min(0.97, acc/(acc+m.def)));
    const kill=m.hp/((hit*0.65)*(1000/mySw)*hc);
    const taken=avg*fh*(kill/((m.swingMs||2400)/1000));
    cum+=Math.max(0,taken-hp*0.25)/FOOD;
    if(f===50||f===60||f===70) tot[f]=Math.round(cum);
  }
  console.log('  '+(c*100).toFixed(0)+'%  |'+String(capv).padStart(10)+' |'+
    (hp/capv).toFixed(1).padStart(13)+' |'+String(tot[50]).padStart(17)+' |'+
    String(tot[60]).padStart(6)+' |'+String(tot[70]).padStart(6));
}
process.exit(0);},2500);

/* Count what the cooking panel does and does not say. Reads cindervale.html. */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','cindervale.html'),'utf8');
const script=src.match(/<script>([\s\S]*)<\/script>/)[1];
// Pull just the consts we need by eval-ing a sandboxed slice.
function grab(name,open,close){
  const i=script.indexOf(name); if(i<0) throw new Error('no '+name);
  let d=0,s=script.indexOf(open,i),j=s;
  for(;j<script.length;j++){ if(script[j]===open)d++; else if(script[j]===close){d--; if(!d)break;} }
  return script.slice(s,j+1);
}
const ITEMS=eval('('+grab('const ITEMS=','{','}')+')');
const LOG_BURN_SEC=eval('('+grab('const LOG_BURN_SEC=','{','}')+')');
const coBlock=script.slice(script.indexOf('cooking:{name:\'Cooking\''),script.indexOf('crafting:{name:\'Crafting\''));
const acts=[];
const re=/\{id:'([^']+)',\s*name:'([^']*)'|{id:'([^']+)',name:"([^"]*)"/g;
// simpler: eval the acts array
const arrStart=coBlock.indexOf('acts:[');
let d=0,s=coBlock.indexOf('[',arrStart),j=s;
for(;j<coBlock.length;j++){ if(coBlock[j]==='[')d++; else if(coBlock[j]===']'){d--; if(!d)break;} }
const ACTS=eval(coBlock.slice(s,j+1));

console.log('recipes:',ACTS.length);
let noHeal=0,instant=0,regen=0,buff=0;
const rows=[];
for(const a of ACTS){
  const out=Object.keys(a.out)[0];
  const it=ITEMS[out]||{};
  const p=it.potion||{};
  const kind=p.heal?'instant':p.regen?'regen':'none';
  if(kind==='instant')instant++; else if(kind==='regen')regen++; else noHeal++;
  if(p.buff)buff++;
  rows.push({id:a.id,name:a.name,lvl:a.lvl,out:it.name||out,
    heal:p.heal||p.regen||0,kind,dur:p.regenDur||0,
    buffTxt:p.buff?Object.keys(p.buff).filter(k=>k!=='dur').map(k=>'+'+p.buff[k]+' '+k).join(' ')+' '+p.buff.dur+'s':'',
    inps:Object.keys(a.inp||{}), sell:it.sell||0});
}
console.log('instant heal:',instant,' regen:',regen,' no heal data:',noHeal,' with stat buff:',buff);
console.table(rows.map(r=>({lvl:r.lvl,name:r.name,out:r.out,heals:r.heal,kind:r.kind,buff:r.buffTxt,from:r.inps.join('+')})));

// ordering: array index vs level
let bad=[];
for(let i=1;i<ACTS.length;i++) if(ACTS[i].lvl<ACTS[i-1].lvl) bad.push(ACTS[i-1].name+'(Lv'+ACTS[i-1].lvl+') then '+ACTS[i].name+'(Lv'+ACTS[i].lvl+')');
console.log('out-of-order pairs by data lvl:',bad.length?bad:'none');
console.log('NOTE void eel displays Lv 62 via highFishUnlockLevel() but sits at array index',ACTS.findIndex(a=>a.id==='co8'),'after Cook shark (Lv 75)');

// fuel maths for the demo satchel
const bag={pine_log:640,oak_log:410,ironbark_log:180,ember_log:92,frost_log:40,shadow_log:11,ancient_log:3};
let bagSec=0; for(const k in bag) bagSec+=bag[k]*LOG_BURN_SEC[k];
const loaded={pine_log:12,oak_log:8,ironbark_log:3};
let loadSec=0; for(const k in loaded) loadSec+=loaded[k]*LOG_BURN_SEC[k];
const fmt=s=>Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m '+(s%60)+'s';
console.log('fuel LOADED in fire:',loadSec+'s =',fmt(loadSec));
console.log('fuel SITTING IN BAG:',bagSec+'s =',fmt(bagSec),'  (ratio '+(bagSec/loadSec).toFixed(0)+'x)');
console.log('fuel tiers:',Object.keys(LOG_BURN_SEC).length,JSON.stringify(LOG_BURN_SEC));

// input provenance
const FISH=['raw_minnow','raw_sardine','raw_trout','raw_tuna','raw_salmon','raw_swordfish','raw_shark','raw_voideel'];
let fishOnly=0,monster=0,mixed=0,sea=0;
for(const r of rows){
  const f=r.inps.filter(i=>FISH.includes(i)).length, tot=r.inps.length;
  if(f===tot) fishOnly++; else if(f===0) monster++; else mixed++;
}
console.log('recipes fed purely by fishing:',fishOnly,' purely by non-fish drops:',monster,' mixed:',mixed);

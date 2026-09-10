/* How much gear is there, and what is actually best in each slot right now?
   Base stats at rank 0 — Ascension scales everything equally so it does not
   change who wins. */
const fs=require('fs');
const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{
  const w=dom.window, ev=e=>w.eval(e);
  ev('state=defaultState(); normalizeState();');

  const rows=JSON.parse(ev(`JSON.stringify(Object.keys(COMBAT_GEAR_STATS).map(function(id){
    var it=ITEMS[id]||{}, cs=COMBAT_GEAR_STATS[id]||{};
    // where does it come from?
    var src='crafted/shop';
    RAIDS.forEach(function(r){ if((r.gearDrops||[]).some(function(g){return g.id===id;})) src=r.name; });
    if(src==='crafted/shop'){
      for(var mid in (typeof MONSTER_DROPS!=='undefined'?MONSTER_DROPS:{})){
        if((MONSTER_DROPS[mid]||[]).some(function(d){return d.id===id;})){ src='monster drop'; break; }
      }
    }
    return {id:id, n:it.name||id, slot:it.cslot||'?', tier:it.ctier||0,
      atk:cs.atk||0, str:cs.str||0, def:cs.def||0,
      crit:cs.crit||0, dodge:cs.dodge||0, aspd:cs.aspd||0,
      two:!!it.twoHanded, light:!!it.light, dmg:it.dmgType||'', uniq:!!it.ubonus,
      cheat:!!it.cheatDeath, src:src};
  }))`));

  console.log('=== HOW MUCH GEAR ===');
  const bySlot={};
  for(const r of rows){ (bySlot[r.slot]=bySlot[r.slot]||[]).push(r); }
  const order=Object.keys(bySlot).sort((a,b)=>bySlot[b].length-bySlot[a].length);
  let tot=0;
  for(const sl of order){ tot+=bySlot[sl].length; console.log('  '+String(bySlot[sl].length).padStart(4)+'  '+sl); }
  console.log('  ----  ');
  console.log('  '+String(tot).padStart(4)+'  total equippable combat pieces');

  console.log('\n=== BEST IN SLOT (base stats) ===');
  // maxed value at the item's own Ascension cap, since that is what a player ends on
  const maxed=(id)=>{ const c=+ev(`ascCap('${id}')`);
    if(c<=0) return null;
    ev(`state.asc={'${id}':${c}}`); const g=JSON.parse(ev(`JSON.stringify(gearStats('${id}'))`));
    ev('state.asc={}'); return {c:c, atk:g.atk, str:g.str, def:g.def}; };
  const show=(label, list, score, fmt)=>{
    if(!list.length){ console.log('  '+label.padEnd(22)+' NONE'); return; }
    const best=list.slice().sort((a,b)=>score(b)-score(a))[0];
    const second=list.slice().sort((a,b)=>score(b)-score(a))[1];
    const gap=second?(' (next: '+second.n+' '+fmt(second)+')'):'';
    const mx=maxed(best.id);
    // weapons read atk/str, armour reads def — picking atk first printed a helmet's 5
    const isWep=(best.atk+best.str)>best.def;
    const mtxt=mx?('  ->  ★'+mx.c+'  '+(isWep?(mx.atk+'/'+mx.str):('def '+mx.def))):'  (cannot ascend)';
    console.log('  '+label.padEnd(20)+best.n.padEnd(21)+fmt(best).padEnd(19)+mtxt.padEnd(20)+best.src);
  };
  const wep=(bySlot.weapon||[]);
  const S=x=>x.atk+x.str, F=x=>'atk '+x.atk+' str '+x.str;
  show('1H sword (slash)', wep.filter(x=>!x.two&&x.dmg==='slash'), S,F);
  show('1H dagger (stab)', wep.filter(x=>!x.two&&x.dmg==='stab'), S,F);
  show('1H hammer (crush)', wep.filter(x=>!x.two&&x.dmg==='crush'), S,F);
  show('two-handed', wep.filter(x=>x.two), S,F);
  show('bow / ranged', wep.filter(x=>/bow|piercer/i.test(x.n)), S,F);
  for(const sl of ['shield','helmet','chest','legs','gloves','boots','cape','quiver']){
    show(sl, bySlot[sl]||[], x=>x.def*100+x.atk, x=>'def '+x.def+(x.atk?' atk '+x.atk:'')+(x.crit?' crit '+(x.crit*100).toFixed(1)+'%':''));
  }

  console.log('\n=== SETS ===');
  const sets=JSON.parse(ev(`JSON.stringify(typeof COMBAT_SETS!=='undefined'?COMBAT_SETS:{})`));
  const keys=Object.keys(sets);
  if(!keys.length) console.log('  none defined');
  for(const k of keys){
    const s=sets[k];
    console.log('  '+(s.name||k)+' — '+((s.pieces||[]).length)+' pieces: '+(s.pieces||[]).map(p=>(rows.find(r=>r.id===p)||{}).n||p).join(', '));
    console.log('     bonus: '+JSON.stringify(s.bonus||s));
  }
  process.exit(0);
},2500);

const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const raw=fs.readFileSync(path.join('C:/code/embervale','cindervale.html'),'utf8');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
(async()=>{
 const dom=new JSDOM(raw,{url:'http://localhost/?cvdev=1',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
 await new Promise(r=>setTimeout(r,2500));
 const j=dom.window.eval(`(function(){var o=[];for(var id in ITEMS){var it=ITEMS[id];
   if(it.cgear) o.push({id:id,n:it.name,t:it.ctier||0,s:it.cslot,d:it.dmgType||'',two:!!it.twoHanded});}
   return JSON.stringify(o);})()`);
 const g=JSON.parse(j);
 const byTier={};for(const x of g)(byTier[x.t]=byTier[x.t]||[]).push(x);
 for(const t of Object.keys(byTier).sort((a,b)=>a-b)){
   console.log('\n--- tier '+t+'  ('+byTier[t].length+') ---');
   const bySlot={};for(const x of byTier[t])(bySlot[x.s]=bySlot[x.s]||[]).push(x);
   for(const s of Object.keys(bySlot).sort())
     console.log('  '+s.padEnd(7)+bySlot[s].map(x=>x.n+(x.d?'['+x.d+']':'')+(x.two?'[2H]':'')).join(' · '));
 }
 fs.writeFileSync('C:/code/embervale/_iconart/gear.json',JSON.stringify(g,null,1));
 console.log('\n'+g.length+' gear items -> _iconart/gear.json');
})().catch(e=>{console.error(e);process.exit(1);});

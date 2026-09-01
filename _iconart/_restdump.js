const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const raw=fs.readFileSync(path.join(__dirname,'..','cindervale.html'),'utf8');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
(async()=>{
 const dom=new JSDOM(raw,{url:'http://localhost/?cvdev=1',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
 await new Promise(r=>setTimeout(r,2500));
 const need=require('./coverage.json').filter(r=>r.grp!=='gear:weapon'&&!/^gear:/.test(r.grp)).map(r=>r.id);
 const j=dom.window.eval('(function(){var o=[];'+JSON.stringify(need)+'.forEach(function(id){var it=ITEMS[id]||{};'
   +'o.push({id:id,n:it.name||id,d:(it.desc||"").slice(0,150)});});return JSON.stringify(o);})()');
 fs.writeFileSync(path.join(__dirname,'rest.json'),j);
 const rows=JSON.parse(j);
 console.log(rows.length+' non-gear items -> _iconart/rest.json\n');
 for(const r of rows) console.log(r.id.padEnd(20)+r.n);
})().catch(e=>{console.error(e);process.exit(1);});

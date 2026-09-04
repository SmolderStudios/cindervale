const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const raw=fs.readFileSync(path.join(__dirname,'..','cindervale.html'),'utf8');
(async()=>{
 const dom=new JSDOM(raw,{url:'http://localhost/?cvdev=1',runScripts:'dangerously',pretendToBeVisual:true});
 await new Promise(r=>setTimeout(r,2500));
 const out=dom.window.eval(`(function(){
   var a=notifIconHTML('bronze_axe')||'';
   var b=iconHTML('bronze_axe')||'';
   return JSON.stringify({notif:a.slice(0,60), icon:b.slice(0,60), inICONS:!!ICONS['bronze_axe'], inITEMS:!!ITEMS['bronze_axe']});})()`);
 console.log(out);
})();

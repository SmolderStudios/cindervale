const fs=require('fs'),path=require('path');
const KIT='C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer=require(KIT+'/node_modules/puppeteer-core');
const CHROME=KIT+'/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const ids=process.argv.slice(3);
let h='<style>body{background:#181109;color:#ead9b5;font:12px system-ui;margin:0;padding:14px}'
 +'.g{display:flex;flex-wrap:wrap;gap:8px}.c{width:150px;text-align:center}'
 +'.c img{max-width:140px;max-height:140px;background:#fff}.c div{font-size:10px;color:#8a7455;margin-top:2px}</style><div class="g">';
for(const id of ids){
  const f=path.join(__dirname,process.argv[2],id+'__painted.png');
  if(!fs.existsSync(f)){h+='<div class="c">MISSING<div>'+id+'</div></div>';continue;}
  h+='<div class="c"><img src="data:image/png;base64,'+fs.readFileSync(f).toString('base64')+'"><div>'+id+'</div></div>';
}
h+='</div>';
(async()=>{const br=await puppeteer.launch({executablePath:CHROME,headless:true});
const p=await br.newPage();await p.setViewport({width:1000,height:600,deviceScaleFactor:2});
await p.setContent(h,{waitUntil:'load'});
await p.screenshot({path:path.join(__dirname,'_rawgrid.png'),fullPage:true});await br.close();
console.log('ok');})();

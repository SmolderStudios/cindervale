const fs=require('fs'),path=require('path');
const KIT='C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer=require(KIT+'/node_modules/puppeteer-core');
const CHROME=KIT+'/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const CUT=path.join(__dirname,'cut');
const u=id=>{const f=path.join(CUT,id+'__painted.png');
  return fs.existsSync(f)?'data:image/png;base64,'+fs.readFileSync(f).toString('base64'):null;};
const PAIRS=[
  ['Longbow','pine_longbow','zzrot_longbow'],
  ['Shortbow','pine_shortbow','zzrot_shortbow'],
  ['Longbow (unstrung)','unstrung_pine_longbow','zzrot_unlongbow'],
  ['Crossbow','steel_crossbow','zzrot_crossbow'],
];
let h='<style>body{background:#181109;color:#ead9b5;font:13px "Segoe UI",system-ui;margin:0;padding:20px}'
+'h1{font-size:17px;color:#e8c98a;margin:0 0 2px}.s{color:#8a7455;font-size:12px;margin-bottom:16px}'
+'table{border-collapse:collapse}td,th{padding:7px 10px;text-align:center}'
+'th{font-size:10px;color:#8a7455;text-transform:uppercase;letter-spacing:.5px;font-weight:500}'
+'td.l{text-align:right;color:#b09a72;white-space:nowrap;padding-right:14px}'
+'.t{background:linear-gradient(180deg,#2a1d10,#1a1108);border:1px solid #3a2a16;border-radius:4px;'
+'width:34px;height:34px;display:flex;align-items:center;justify-content:center;margin:0 auto}'
+'.t31{width:44px;height:44px}</style>';
h+='<h1>Bows and crossbows: upright as drawn, vs rotated onto the diagonal</h1>';
h+='<div class="s">A tall thin subject letterboxes into a square tile sized by its HEIGHT, so the bow lands at 7% of the tile. Rotating gets it to 20%. The crossbow is already wide, so rotating makes it smaller, not bigger.</div>';
h+='<table><tr><th></th><th colspan="3">as drawn</th><th style="width:24px"></th><th colspan="3">rotated</th></tr>';
h+='<tr><th></th><th>64px</th><th>31px card</th><th>15px satchel</th><th></th><th>64px</th><th>31px card</th><th>15px satchel</th></tr>';
for(const [name,a,b] of PAIRS){
  h+='<tr><td class="l">'+name+'</td>';
  for(const id of [a,b]){
    h+='<td><img src="'+u(id)+'" style="width:64px;height:64px"></td>';
    h+='<td><div class="t t31"><img src="'+u(id)+'" style="width:31px;height:31px"></div></td>';
    h+='<td><div class="t"><img src="'+u(id)+'" style="width:15px;height:15px"></div></td>';
    if(id===a) h+='<td></td>';
  }
  h+='</tr>';
}
h+='</table>';
(async()=>{const br=await puppeteer.launch({executablePath:CHROME,headless:true});
const p=await br.newPage();await p.setViewport({width:880,height:520,deviceScaleFactor:2});
await p.setContent(h,{waitUntil:'load'});
await p.screenshot({path:path.join(__dirname,'_flcmp.png'),fullPage:true});await br.close();
console.log('ok');})().catch(e=>{console.error(e);process.exit(1);});

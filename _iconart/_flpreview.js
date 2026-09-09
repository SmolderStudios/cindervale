/* Preview the fletching batch before anything is injected.
 *
 *     node _iconart/_flpreview.js
 *
 * Ladders as ROWS, because the only question a recoloured tier family raises is
 * whether the progression reads left to right. Each row also shows the 15px satchel
 * tile, which is where an icon lives or dies.
 */
'use strict';
const fs=require('fs'), path=require('path');
const KIT='C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer=require(KIT+'/node_modules/puppeteer-core');
const CHROME=KIT+'/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const CUT=path.join(__dirname,'cut'), REC=path.join(__dirname,'recol_cut');
const OUT=path.join(__dirname,'_flpreview.png');

const METAL=['bronze','iron','steel','mithril','cobalt','runite','starsteel','starfall'];
const WOOD=['pine','oak','ironbark','ember','frost','shadow','ancient'];

const uri=id=>{
  for(const d of [REC,CUT]){
    const f=path.join(d,id+'__painted.png');
    if(fs.existsSync(f)) return 'data:image/png;base64,'+fs.readFileSync(f).toString('base64');
  }
  return null;
};

const LADDERS=[
  ['Arrowhead',      METAL, t=>t+'_arrowhead'],
  ['Bolt Tip',       METAL, t=>t+'_bolt_tip'],
  ['Arrow',          METAL, t=>t+'_arrow'],
  ['Bolt',           METAL, t=>t+'_bolt'],
  ['Crossbow',       METAL, t=>t+'_crossbow'],
  ['Crossbow (uns.)',METAL, t=>'unstrung_'+t+'_crossbow'],
  ['Shortbow',       WOOD,  t=>t+'_shortbow'],
  ['Longbow',        WOOD,  t=>t+'_longbow'],
  ['Shortbow (uns.)',WOOD,  t=>'unstrung_'+t+'_shortbow'],
  ['Longbow (uns.)', WOOD,  t=>'unstrung_'+t+'_longbow'],
];
const MATS=['wood_shaft','feather','flax','bowstring','flax_seed','raw_fowl','roast_fowl'];
const NODES=['fl_speed','fl_xp','fl_double','fl_salvage','fl_split','fl_acc','fl_quiver','fl_dmg',
             'fl_wind','fl_bolts','fl_barb','fl_gm_speed','fl_gm_xp','fl_gm_salv','fl_endless','fl_cape'];

let missing=[];
const cell=(id,px)=>{
  const u=uri(id);
  if(!u){ missing.push(id); return '<div class="miss" style="width:'+px+'px;height:'+px+'px"></div>'; }
  return '<img src="'+u+'" style="width:'+px+'px;height:'+px+'px">';
};

let h='<style>'
 +'body{background:#181109;color:#ead9b5;font:13px/1.4 "Segoe UI",system-ui;margin:0;padding:22px}'
 +'h2{font-size:15px;color:#c79b4e;margin:22px 0 8px;letter-spacing:.4px}'
 +'h1{font-size:19px;color:#e8c98a;margin:0 0 4px}'
 +'table{border-collapse:collapse}'
 +'td,th{padding:5px 7px;text-align:center;vertical-align:middle}'
 +'th{font-size:10px;color:#8a7455;font-weight:500;text-transform:uppercase;letter-spacing:.5px}'
 +'td.lbl{text-align:right;color:#b09a72;font-size:12px;white-space:nowrap;padding-right:12px}'
 +'.tile{background:linear-gradient(180deg,#2a1d10,#1a1108);border:1px solid #3a2a16;'
 +'border-radius:4px;width:34px;height:34px;display:flex;align-items:center;justify-content:center}'
 +'.miss{background:#5a1414;border:1px dashed #a33;border-radius:3px;display:inline-block}'
 +'.grid{display:flex;flex-wrap:wrap;gap:10px}'
 +'.gi{text-align:center;width:96px}'
 +'.gi div{font-size:10px;color:#8a7455;margin-top:3px;word-break:break-all}'
 +'</style>';

h+='<h1>Fletching art batch &mdash; not yet injected</h1>';
h+='<div style="color:#8a7455;font-size:12px">10 drawn cells expanded to 76 items. Big row = 64px, small row = the real 15px satchel tile.</div>';

h+='<h2>Tier ladders</h2><table>';
for(const [name,tiers,f] of LADDERS){
  h+='<tr><td class="lbl">'+name+'</td>';
  for(const t of tiers) h+='<td>'+cell(f(t),64)+'</td>';
  h+='</tr><tr><td class="lbl" style="color:#6a5a40;font-size:10px">at 15px</td>';
  for(const t of tiers) h+='<td><div class="tile">'+cell(f(t),15)+'</div></td>';
  h+='</tr><tr><td></td>';
  for(const t of tiers) h+='<th>'+t+'</th>';
  h+='</tr><tr><td colspan="9" style="height:10px"></td></tr>';
}
h+='</table>';

h+='<h2>Materials, seed and food (drawn individually)</h2><div class="grid">';
for(const id of MATS) h+='<div class="gi">'+cell(id,64)+'<div>'+id+'</div></div>';
h+='</div>';

h+='<h2>Tree nodes</h2><div class="grid">';
for(const id of NODES) h+='<div class="gi">'+cell(id,64)+'<div>'+id+'</div></div>';
h+='</div>';

h+='<h2>Skill icon and cape</h2><div class="grid">';
h+='<div class="gi">'+cell('fletching',64)+'<div>rail icon 64px</div></div>';
h+='<div class="gi"><div class="tile" style="width:26px;height:26px;margin:0 auto">'+cell('fletching',20)+'</div><div>rail icon at real 20px</div></div>';
h+='<div class="gi">'+cell('cape_fletching',64)+'<div>cape_fletching</div></div>';
h+='</div>';

(async()=>{
  const br=await puppeteer.launch({executablePath:CHROME,headless:true});
  const p=await br.newPage();
  await p.setViewport({width:1180,height:900,deviceScaleFactor:2});
  await p.setContent(h,{waitUntil:'load'});
  await p.screenshot({path:OUT,fullPage:true});
  await br.close();
  console.log('wrote '+OUT);
  if(missing.length) console.log('MISSING ('+missing.length+'): '+missing.join(', '));
  else console.log('all assets present');
})().catch(e=>{console.error(e);process.exit(1);});

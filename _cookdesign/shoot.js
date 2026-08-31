/* Screenshot the cooking panel — live game page, real rail + satchel either side.
 *   node _cookdesign/shoot.js            -> shots/now.png  (+ measured panel size)
 *   node _cookdesign/shoot.js a b c      -> also inject concept files concept-<id>.js
 */
const path=require('path'), fs=require('fs');
const KIT='C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer=require(path.join(KIT,'node_modules/puppeteer-core'));
const CHROME=path.join(KIT,'browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe');
const ROOT=path.join(__dirname,'..');
const OUT=path.join(__dirname,'shots'); fs.mkdirSync(OUT,{recursive:true});

const SHIM=`<script>
(function(){var mem={};var shim={getItem:function(k){return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null;},
setItem:function(k,v){mem[k]=String(v);},removeItem:function(k){delete mem[k];},clear:function(){mem={};},
key:function(i){return Object.keys(mem)[i]||null;}};
Object.defineProperty(shim,'length',{get:function(){return Object.keys(mem).length;}});
try{Object.defineProperty(window,'localStorage',{value:shim,configurable:true,writable:true});}catch(e){}
window.fetch=function(){return new Promise(function(_,r){r(new Error('preview: net off'));});};
if(navigator.sendBeacon)try{navigator.sendBeacon=function(){return false;};}catch(e){}
})();
</script>
`;

const BOOT=`
<script>
window.__cook=function(opt){
  opt=opt||{};
  state=defaultState(); state.name='Ashwyn'; state.charType=state.charType||'ember';
  normalizeState();
  var lv={woodcutting:78,mining:71,fishing:82,foraging:64,smithing:58,cooking:79,
          alchemy:49,firemaking:66,agility:41,jeweler:37,farming:44,crafting:59,
          attack:75,strength:70,defence:68,hitpoints:78};
  for(var k in lv) state.xp[k]=XP_CUM[lv[k]];
  state.coins=284320;
  state.items={
    raw_minnow:210, raw_sardine:340, raw_trout:180, raw_tuna:96, raw_salmon:64,
    raw_swordfish:41, raw_shark:12, raw_voideel:0,
    gnawed_bone:88, rat_tail:140, ratskin:52, tanned_hide:31, bone_charm:9,
    rock_salt:74, gull_egg:26, ancient_bone:44, rib_plate:12,
    wolf_pelt:37, frostfur:14, ogre_hide:8, ogre_tusk:3,
    troll_hide:6, troll_blood:2, wyrmscale:0, cinder_gland:0,
    demonhide:0, brimstone:0,
    pine_log:640, oak_log:410, ironbark_log:180, ember_log:92, frost_log:40,
    shadow_log:11, ancient_log:3,
    cooked_trout:64, cooked_tuna:22, cooked_salmon:9, wolf_jerky:15, bone_stew:6,
    gem_dust:2400, cut_sapphire:6, cut_ruby:4, cut_emerald:3, cut_diamond:2,
    gem_sanguine:5, gem_verdant:4, gem_azure:3, gem_topaz:6, gem_onyx:2
  };
  ['sapphire_ring','ruby_ring','emerald_amulet','ruby_amulet','diamond_pendant',
   'gold_ring','silver_ring','pearl_band','sapphire_amulet'].forEach(function(id){
    if(ITEMS[id]) state.items[id]=(state.items[id]||0)+1;
  });
  if(opt.lean){
    ['gnawed_bone','rat_tail','ratskin','tanned_hide','bone_charm','ancient_bone',
     'rib_plate','wolf_pelt','frostfur','ogre_hide','ogre_tusk','troll_hide',
     'troll_blood','gull_egg'].forEach(function(k){ delete state.items[k]; });
    state.items.rock_salt=4;
  }
  for(var id in ITEMS) state.discovered[id]=1;
  // A lit fire with a real mixed load
  var fs_=opt.fire||'burning';
  state.cookingFire = fs_==='out'
    ? {loaded:{},partialSec:0,lit:false,lastBurnAt:Date.now()}
    : {loaded:{pine_log:12,oak_log:8,ironbark_log:3},partialSec:4,
       lit:(fs_!=='stored'),lastBurnAt:Date.now()};
  mmSlot=1; mmAtMenu=false;
  selectedSkill='cooking'; viewTab='acts'; rightTab='satchel';
  document.getElementById('emberMenu').classList.add('mm-hidden');
  document.getElementById('charSelect').classList.add('mm-hidden');
  var d=document.getElementById('mmDestiny'); if(d) d.classList.add('mm-hidden');
  ['mmEaModal','mmSettingsModal','mmReportModal','mmIdeaModal','mmCreditsModal',
   'mmNameModal','mmImportModal','mmExportModal','fuelModal'].forEach(function(i){
    var e=document.getElementById(i); if(e){e.classList.add('mm-hidden');e.classList.add('hidden');}
  });
  // Enchant and Socket only surface while Jeweler is the selected skill.
  if(opt.view){ if(opt.view==='enchant'||opt.view==='socket') selectedSkill='jeweler'; viewTab=opt.view; }
  renderAll();
  if(opt.run){ try{ setAction('cooking','co5'); }catch(e){} renderAll(); }
  return true;
};
</script>
`;

(async()=>{
  const args=process.argv.slice(2);
  const src=fs.readFileSync(path.join(ROOT,'cindervale.html'),'utf8');
  const concepts=args.length?args:[];
  const jobs=[{id:'now',inject:''}].concat(concepts.map(c=>{
    const st=c.indexOf(':')>0?c.split(':'):[c,'burning'];
    c=st[0];
    if(c==='view'){ return {id:'view-'+st[1],view:st[1],inject:''}; }
    const BMODE={grid3:1,grid4:1,grid5:1,filtered:1,lean:1,leanfilt:1,both:1,leanboth:1,
                 slim3:1,slim4:1,slim5:1,scroll3:1,scroll4:1,slimfilt:1};
    const bmode=BMODE[st[1]]?st[1]:null;
    const f=path.join(__dirname,'concept-'+c+'.js');
    const sh=fs.readFileSync(path.join(__dirname,'fire-plates.js'),'utf8')+String.fromCharCode(10)+fs.readFileSync(path.join(__dirname,'_shared.js'),'utf8');
    return {id:st[1]==='burning'?c:c+'-'+st[1],fire:bmode?'burning':st[1],bmode:bmode,inject:'<'+'script>'+sh+'</'+'script>'+'<'+'script>\n'+fs.readFileSync(f,'utf8')+'\n</script>\n'};
  }));

  const b=await puppeteer.launch({executablePath:CHROME,headless:true,
    defaultViewport:{width:1920,height:1080,deviceScaleFactor:1},
    args:['--hide-scrollbars','--font-render-hinting=none','--allow-file-access-from-files']});
  const p=await b.newPage();
  // IS_DEMO = !/electron/i.test(userAgent). A file:// load is therefore the DEMO
  // build: combat caps at Lv 10 and the header wears a DEMO pill. Spoof Electron
  // so the shots show the game people actually buy.
  await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) cindervale-idle/0.9.122 Chrome/151.0.0.0 Electron/33.0.0 Safari/537.36');
  p.on('pageerror',e=>console.log('  ! pageerror: '+e.message));
  p.on('console',m=>{ if(m.type()==='error') console.log('  ! console: '+m.text()); });

  const results=[];
  for(const job of jobs){
    let html=src.replace('</head>',SHIM+BOOT+'</head>');
    if(job.inject) html=html.replace('</'+'body>',job.inject+'</'+'body>');
    const tmp=path.join(__dirname,'work-'+job.id+'.html');
    fs.writeFileSync(tmp,html);
    await p.goto('file:///'+tmp.split(String.fromCharCode(92)).join('/')+'?cvdev=1',{waitUntil:'load'});
    await new Promise(r=>setTimeout(r,2600));
    if(job.bmode) await p.evaluate(m=>{
      window._ckB = (m==='lean')?'grid3':(m==='leanfilt')?'filtered'
        :(m==='both'||m==='leanboth')?'grid4filtered'
        :(m==='slim3')?'slim':(m==='slimfilt')?'slim4filtered':m;
    },job.bmode);
    await p.evaluate(o=>window.__cook(o),{fire:job.fire||'burning',view:job.view||null,
      lean:(job.bmode==='lean'||job.bmode==='leanfilt'||job.bmode==='leanboth')});
    await new Promise(r=>setTimeout(r,900));
    const m=await p.evaluate(()=>{
      const g=document.getElementById('activityGrid');
      const panel=g?g.closest('.panel')||g.parentElement:null;
      const r=g?g.getBoundingClientRect():null;
      var z=1;try{var zz=(typeof _rootZoom!=='undefined')?_rootZoom:1;z=(typeof zz==='number'&&zz>0)?zz:1;}catch(e){}
      return {gridW:r?Math.round(r.width/z):0,gridH:r?Math.round(r.height/z):0,
              panelH:panel?Math.round(panel.getBoundingClientRect().height/z):0,
              docH:Math.round(document.body.scrollHeight/z),zoom:z,
              cards:g?g.querySelectorAll('.act').length:0};
    });
    await p.screenshot({path:path.join(OUT,job.id+'.png')});await p.screenshot({path:path.join(OUT,job.id+'-full.png'),fullPage:true});
    results.push(Object.assign({id:job.id},m));
    console.log(job.id.padEnd(6),JSON.stringify(m));
    fs.unlinkSync(tmp);
  }
  fs.writeFileSync(path.join(OUT,'measured.json'),JSON.stringify(results,null,2));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});

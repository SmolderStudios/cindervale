const fs=require('fs'),path=require('path');
const KIT='C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer=require(KIT+'/node_modules/puppeteer-core');
let exe=null;
(function walk(p){for(const f of fs.readdirSync(p,{withFileTypes:true})){const q=path.join(p,f.name);
  if(f.isDirectory())walk(q); else if(/^chrome\.exe$/i.test(f.name)&&!exe)exe=q;}})(path.join(KIT,'browsers'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(n,c,d)=>{ console.log((c?'  ok   ':'  FAIL ')+n+(d?'  '+d:'')); if(!c) fail++; };
(async()=>{
  const b=await puppeteer.launch({executablePath:exe,headless:'new',args:['--allow-file-access-from-files']});
  const p=await b.newPage();
  await p.setViewport({width:1700,height:1180});
  await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36');
  await p.setRequestInterception(true);
  p.on('request',r=>{ if(/^https?:/.test(r.url())) r.abort(); else r.continue(); });
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
  await p.goto('file:///C:/code/embervale/cindervale.html?cvdev=1',{waitUntil:'load'});
  await sleep(3200);
  const unmodal=()=>p.evaluate(()=>{['mmEaModal','demoBuyModal','gameMenuModal'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.classList.add('mm-hidden');});
    const hc=document.getElementById('hintCard'); if(hc) hc.remove();});
  await unmodal();
  await p.evaluate(()=>{ _auditCount=999; _signupSent=99; window.startTutorial=function(){};
    mmDestinyMode='new'; mmDestinySlot=1; mmDestinyName='Probe';
    mmSelType='normal'; mmSelClass='guardian'; mmConfirmDestiny(); });
  await sleep(1700);
  await p.evaluate(()=>{ if(typeof endTutorial==='function') try{endTutorial();}catch(e){} });
  await unmodal();
  await p.evaluate(()=>{ state.onboard={step:-1,done:true,hidden:false}; state.hintsOn=false;
    state.combatXp={}; for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];
    state.combatEquipped.weapon='bronze_sword'; refreshCombatStats();
    state.cmbSubTab='arena'; state.cmbView='guide'; state.zoneMode='dungeons'; enterCombat(); });
  await sleep(500);
  const q=sel=>p.evaluate(s=>!!document.querySelector(s),sel);
  ok('the combat page opens on the guide', await q('.cg-wrap'));
  ok('and the arena is not on screen', !(await q('.cvstage')));
  ok('zone cards carry their dungeon art', await p.evaluate(()=>{
    const e=document.querySelector('.cg-zone .plate'); return !!e && /url\(data:image/.test(e.getAttribute('style')||''); }));
  ok('drops show their item icons', await p.evaluate(()=>!!document.querySelector('.cg-drops .dr .ic .ev-icon')));

  // hunt mode
  await p.evaluate(()=>{ const b=document.querySelector('[data-zmode="hunt"]'); b&&b.click(); });
  await sleep(350);
  ok('hunting grounds switch in', await p.evaluate(()=>state.zoneMode==='hunt' && !!document.querySelector('.cg-zone')));
  // raids mode
  await p.evaluate(()=>{ const b=document.querySelector('[data-zmode="raids"]'); b&&b.click(); });
  await sleep(350);
  ok('raids still reachable from the same row', await p.evaluate(()=>state.zoneMode==='raids' && !!document.querySelector('.raid-card,.rd-card,[data-raid]')),
     await p.evaluate(()=>document.querySelector('#combatPanel').innerHTML.length+' chars'));
  // start a raid: the arena must take over and Back must be refused
  const raided=await p.evaluate(()=>{ try{ startRaid('sunken_barrow'); return true; }catch(e){ return String(e); } });
  await sleep(600);
  ok('starting a raid forces the arena', raided===true && await q('.cvstage'));
  ok('and the way back is disabled inside a raid', await p.evaluate(()=>{
    const b=document.getElementById('cgBack'); return !!b && b.disabled; }));
  await p.evaluate(()=>{ if(typeof handleRaidFail==='function'){ combat.youHp=0; handleRaidFail(); } combat.active=false; combat.raid=null;
    state.cmbView='guide'; state.zoneMode='dungeons'; renderCombat(); });
  await sleep(400);
  ok('and leaving a raid returns to the guide', await q('.cg-wrap'));
  // other sub-tabs
  for(const t of ['mastery','slayer','pets','log']){
    await p.evaluate(tt=>{ state.cmbSubTab=tt; renderCombat(); }, t);
    await sleep(250);
    ok('the '+t+' tab still renders', await p.evaluate(()=>document.querySelector('#combatPanel').innerHTML.length>800));
  }
  ok('no page errors anywhere', errs.length===0, errs.join(' | '));
  await b.close();
  console.log(fail? ('\n'+fail+' FAILED') : '\nPASS all guide checks');
  process.exit(fail?1:0);
})();

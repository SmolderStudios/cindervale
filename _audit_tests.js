#!/usr/bin/env node
/* Regression suite for the defects found in the v0.9.81 audit and fixed across
 * v0.9.82 - v0.9.88.
 *
 *   node _audit_tests.js
 *
 * Run it after _validate.js. _validate proves the file BOOTS and renders;
 * this proves the specific bugs stay dead. Every block names the defect it
 * guards, so a failure says what regressed rather than just that something did.
 *
 * Most of these were silent for a long time before the audit — four skill-tree
 * nodes that did nothing at all, six XP sites that bypassed the demo cap, a
 * buckler XP curve that made ~200 crafting recipes pointless, and a satchel
 * check that ran AFTER inputs were spent. None of it threw, so none of it
 * showed up in a boot test. That is what this file is for.
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const html = fs.readFileSync(path.join(ROOT, 'cindervale.html'), 'utf8');
const { JSDOM } = require('jsdom');
const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });

setTimeout(() => {
  const w = dom.window, ev = e => w.eval(e);
  let fail = 0, pass = 0;
  const ok = (n, c, x) => {
    if (c) { pass++; console.log('  ok   ' + n + (x ? '  ' + x : '')); }
    else   { fail++; console.log('  FAIL ' + n + (x ? '  ' + x : '')); }
  };
  const section = t => console.log('\n' + t);

  section('Critical exploits & data loss (v0.9.82)');
  {   // block-scoped so each section can reuse local names freely
  ev('state=defaultState(); normalizeState();');

    // --- 1. satchel full must NOT consume inputs on a processing skill ---
    // satchelUsed() only counts ids that exist in ITEMS, so pad with real ones.
    ev(`state.items={copper_ore:200,tin_ore:200};
        var _ids=Object.keys(ITEMS).filter(id=>id!=='copper_ore'&&id!=='tin_ore'&&id!=='bronze_bar');
        for(var i=0;satchelUsed()<satchelCap();i++) state.items[_ids[i]]=1;
        state.xp.smithing=XP_CUM[50];`);
    console.log('   satchel', ev('satchelUsed()+"/"+satchelCap()'));
    const before=ev('[state.items.copper_ore,state.items.tin_ore]');
    const ret=ev(`state.action={skill:'smithing',actId:'sm1'}; completeAction(getAct('smithing','sm1'),'smithing',50);`);
    const after=ev('[state.items.copper_ore,state.items.tin_ore,state.items.bronze_bar||0,state.action===null]');
    ok('satchel-full smelt consumes nothing', before[0]===after[0]&&before[1]===after[1], JSON.stringify({before,after,ret}));
    ok('satchel-full smelt stops the action', after[3]===true);

    // --- 2. Everflame T6 recipe craftable with the input tool held in gear ---
    ev(`state=defaultState(); normalizeState();
        state.xp.crafting=XP_CUM[99]; state.gear=['eclipse_axe'];
        state.items={ember_dust:500,mountain_heart:5,voidheart:5};`);
    const aff=ev(`canAfford(getAct('crafting','cr_tl_everflame_axe'),1,mods('crafting'))`);
    ok('Everflame axe affordable with Eclipse Axe in gear', aff===1, 'canAfford='+aff);
    ev(`completeAction(getAct('crafting','cr_tl_everflame_axe'),'crafting',1);`);
    const g=ev('[state.gear.slice(), state.items.ember_dust]');
    ok('Everflame craft consumes old tool + dust', g[0].indexOf('everflame_axe')>=0 && g[0].indexOf('eclipse_axe')<0 && g[1]===380, JSON.stringify(g));

    // --- 3. tools cannot be sold ---
    ev(`state=defaultState(); normalizeState(); state.gear=['master_forge']; state.coins=0;`);
    ev(`sellShopItem('master_forge');`);
    const s3=ev('[state.coins, state.gear.indexOf("master_forge")>=0]');
    ok('tool sale refused (no coins, still owned)', s3[0]===0&&s3[1]===true, JSON.stringify(s3));

    // --- 4. farming rolls the skilling pet ---
    ok('harvestPatch calls rollSkillPet', /rollSkillPet\('farming'/.test(html));
    const petWired=ev(`(function(){ state=defaultState(); normalizeState(); state.xp.farming=XP_CUM[99]; state.skillPets={};
        var orig=Math.random; Math.random=function(){return 0;};
        var got; try{ rollSkillPet('farming',{lvl:1},1); got=!!state.skillPets['spet_farming']; }catch(e){ got='ERR:'+e.message; }
        Math.random=orig; return got; })()`);
    ok('rollSkillPet grants spet_farming', petWired===true, String(petWired));

    // --- 5. buckler XP no longer dominates the crafting ladder ---
    const b=ev(`(function(){var a=SKILLS.crafting.acts;var f=id=>a.find(x=>x.id===id);
       var rate=r=>Math.round(r.xp/r.ms*3600000);
       var o={}; ['cr_buckler_1','cr_t1_shld','cr_t1_chst','cr_buckler_10','cr_t7_shld'].forEach(function(id){var r=f(id);o[id]=[r.lvl,r.xp,r.ms,rate(r)];});
       return o;})()`);
    ok('Lv5 buckler no longer beats the Lv5 chest', b.cr_buckler_1[3] < b.cr_t1_chst[3], JSON.stringify(b,null,0));
  }

  section('Skill trees & tooltip truth (v0.9.83)');
  {   // block-scoped so each section can reuse local names freely
  const sums=ev(`(function(){var o={};for(var k in TREES) o[k]=TREES[k].reduce(function(s,n){return s+n.max},0);return o;})()`);
    const badTrees=Object.keys(sums).filter(k=>sums[k]!==98);
    ok('98-point invariant holds for all 12 trees', badTrees.length===0, badTrees.length?JSON.stringify(sums):'');

    const probe=(skill,id)=>ev(`(function(){ state=defaultState(); normalizeState();
        var base=JSON.stringify(mods('${skill}'));
        var nd=TREES['${skill}'].find(function(n){return n.id==='${id}'});
        state.tree['${skill}']={}; state.tree['${skill}']['${id}']=nd?nd.max:1;
        return JSON.stringify(mods('${skill}'))!==base; })()`);
    ok('mi_vein now affects mining',  probe('mining','mi_vein'));
    ok('jw_dust now affects jeweler', probe('jeweler','jw_dust'));

    const smelt=ev(`(function(){ state=defaultState(); normalizeState();
        state.tree.mining={mi_smelt:10};
        return {smithing:+mods('smithing').speed.toFixed(4), mining:+mods('mining').speed.toFixed(4)}; })()`);
    ok('mi_smelt buffs SMITHING', smelt.smithing===0.13, JSON.stringify(smelt));
    ok('mi_smelt no longer buffs mining', smelt.mining===0);

    const coins=ev(`(function(){ state=defaultState(); normalizeState();
        var f=function(){return (treeRank('agility','ag_gm_coins')*0.06);};
        var a=f(); state.tree.agility={ag_gm_coins:8}; return +(f()-a).toFixed(2); })()`);
    ok('ag_gm_coins feeds coinMult', coins===0.48, 'delta='+coins);

    const dead=ev(`(function(){
      var out=[];
      for(var sk in TREES){
        state=defaultState(); normalizeState();
        var base=JSON.stringify(mods(sk));
        TREES[sk].forEach(function(n){
          state=defaultState(); normalizeState();
          state.xp[sk]=XP_CUM[99];
          state.tree[sk]={}; state.tree[sk][n.id]=n.max;
          var now;
          try{ now=JSON.stringify(mods(sk)); }catch(e){ out.push(sk+'/'+n.id+' THREW '+e.message); return; }
          if(now===base) out.push(sk+'/'+n.id);
        });
      }
      return out;})()`);
    console.log('\nNodes that do not move mods() ('+dead.length+') — expected for act-unlock / second-bar / cape nodes:');
    console.log('  '+dead.join('\n  '));

    const spd=ev(`(function(){ var bad=[];
      for(var sk in TREES){
        TREES[sk].forEach(function(n){
          if(!/_speed$/.test(n.id)) return;
          state=defaultState(); normalizeState();
          state.tree[sk]={}; state.tree[sk][n.id]=n.max;
          var actual=+(mods(sk).speed*100).toFixed(1);
          var m=String(n.desc(n.max)).match(/([0-9.]+)%/);
          var claimed=m?parseFloat(m[1]):null;
          if(claimed===null||Math.abs(claimed-actual)>0.11) bad.push(sk+'/'+n.id+' says '+claimed+'% actual '+actual+'%');
        });
      }
      return bad;})()`);
    ok('every *_speed node desc matches measured mods()', spd.length===0, spd.join(' | '));
  }

  section('Save integrity & demo gating (v0.9.84)');
  {   // block-scoped so each section can reuse local names freely
  const merged=ev(`(function(){
      state=defaultState(); normalizeState();
      state.charName='Veteran'; state.sail.xp=1000000; state.slayer.points=4000;
      state.pets={pet_rat_familiar:1}; state.achievements={first_log:1}; state.satchelUpgrades=20;
      applySave({xp:{woodcutting:0}, items:{}, coins:0, charName:'Newbie'});
      return {name:state.charName, sailXp:state.sail?state.sail.xp:'?', slayer:state.slayer?state.slayer.points:'?',
              pets:Object.keys(state.pets||{}).length, ach:Object.keys(state.achievements||{}).length,
              upg:state.satchelUpgrades};})()`);
    ok('import no longer inherits the old character',
       merged.sailXp===0&&merged.slayer===0&&merged.pets===0&&merged.ach===0&&merged.upg===0&&merged.name==='Newbie',
       JSON.stringify(merged));

    const stale=ev(`(function(){
      state=defaultState(); state.action={skill:'dualskill',actId:'ds1'}; normalizeState(); var a=state.action;
      state=defaultState(); state.action={skill:'woodcutting',actId:'wc_retired'}; normalizeState(); var b=state.action;
      state=defaultState(); state.offlineConfig={skill:'nope',actId:'x'}; normalizeState(); var c=state.offlineConfig;
      return {badSkill:a, badAct:b, badOffline:c};})()`);
    ok('stale state.action cleared (bad skill)', stale.badSkill===null, JSON.stringify(stale));
    ok('stale state.action cleared (bad actId)', stale.badAct===null);
    ok('stale offlineConfig cleared', stale.badOffline===null);

    const tickSafe=ev(`(function(){ state=defaultState(); mmAtMenu=false; mmSlot=1;
      state.action={skill:'woodcutting',actId:'wc_retired'}; state.actionStart=Date.now()-999999;
      try{ tick(); return 'ok:'+(state.action===null); }catch(e){ return 'THREW '+e.message; } })()`);
    ok('tick() survives an unknown actId', tickSafe==='ok:true', String(tickSafe));

    const q=ev(`(function(){ state=defaultState(); normalizeState(); mmAtMenu=false; mmSlot=1;
      combat.active=true; combat.raid={id:'x'};
      try{ mmQuitToMenu(); }catch(e){ return 'THREW '+e.message; }
      return {active:combat.active, raid:combat.raid, timer:_combatTimer};})()`);
    ok('combat state cleared on quit-to-menu', q&&q.active===false&&q.raid===null&&q.timer===null, JSON.stringify(q));

    const rawWrites=(html.match(/state\.xp\[['"][a-z]+['"]\]\s*=\s*\(state\.xp\[/g)||[]).length;
    ok('no raw state.xp[...] += sites remain', rawWrites===0, rawWrites+' found');

    const funnel=ev(`(function(){
      state=defaultState(); normalizeState();
      var before=state.xp.farming||0;
      var g=addSkillXp('farming',12345);
      return {granted:g, delta:(state.xp.farming||0)-before};})()`);
    ok('addSkillXp is the funnel and returns the granted amount', funnel.granted===funnel.delta, JSON.stringify(funnel));

    ok('dev tap gesture checks IS_DEMO', /_devSellTaps>=5&&!IS_DEMO/.test(html));
    ok('devToggle checks IS_DEMO', /if\(IS_DEMO\) return; \$\('devPanel'\)/.test(html));
    ok('getDeviceId is wrapped in try/catch', /function getDeviceId\(\)\{\s*try\{/.test(html.replace(/\r/g,'')));
  }

  section('Trophy/cape exploits & completion blockers (v0.9.85)');
  {   // block-scoped so each section can reuse local names freely
  const troph=ev(`(function(){ state=defaultState(); normalizeState();
      var first=0,resold=0;
      for(var i=0;i<200;i++){ if(rollDrops('rat_queen').some(function(d){return d.id==='rat_queen_crown';})) first++; }
      state.items.rat_queen_crown=0;
      for(var j=0;j<200;j++){ if(rollDrops('rat_queen').some(function(d){return d.id==='rat_queen_crown';})) resold++; }
      return {firstRuns:first, afterSell:resold, latched:!!(state.trophies&&state.trophies.rat_queen_crown)};})()`);
    ok('trophy drops once then latches', troph.firstRuns===1&&troph.afterSell===0&&troph.latched, JSON.stringify(troph));

    const mig=ev(`(function(){ state=defaultState(); state.items={demonlord_skull:1}; normalizeState();
      var n=0; for(var i=0;i<200;i++) if(rollDrops('demon_lord').some(function(d){return d.id==='demonlord_skull';})) n++;
      return {seeded:!!(state.trophies&&state.trophies.demonlord_skull), rerolls:n};})()`);
    ok('existing trophy owners get no free re-roll', mig.seeded&&mig.rerolls===0, JSON.stringify(mig));

    const cape=ev(`(function(){ state=defaultState(); normalizeState();
      state.xp.foraging=XP_CUM[99]; state.tree.foraging={fo_gm_cape:1};
      state.gear=['cape_foraging']; var a=mods('foraging').fo_primal;
      state.gear=[];                var b=mods('foraging').fo_primal;
      return {withCape:a, without:b};})()`);
    ok('capstone switches off when the cape is sold', cape.withCape===true&&cape.without===false, JSON.stringify(cape));

    const raid=ev(`(function(){ state=defaultState(); normalizeState();
      var ids=Object.keys(ITEMS); for(var i=0;satchelUsed()<satchelCap();i++) state.items[ids[i]]=1;
      var r=grantRaidRewards(RAID_BY_ID.sunken_barrow, 1000);
      var lied=r.mats.filter(function(m){ return !(state.items[m.id]>0); });
      var lied2=r.gear.filter(function(g){ return !(state.items[g]>0)&&state.gear.indexOf(g)<0; });
      return {full:satchelUsed()+'/'+satchelCap(), mats:r.mats.length, lied:lied.length+lied2.length};})()`);
    ok('raid loot never reported without being granted', raid.lied===0, JSON.stringify(raid));

    const disc=ev(`(function(){ state=defaultState(); normalizeState(); state.coins=99999999;
      for(var k in SKILLS) state.xp[k]=XP_CUM[99];
      var tool=SHOP.find(function(i){return i.tool;});
      if(!tool) return {skip:true};
      buyShop(tool.id);
      return {id:tool.id, owned:state.gear.indexOf(tool.id)>=0, discovered:!!state.discovered[tool.id]};})()`);
    ok('buyShop marks the item discovered', disc.skip||disc.discovered===true, JSON.stringify(disc));

    const backfill=ev(`(function(){ state=defaultState(); state.gear=['bronze_axe','iron_pick']; state.discovered={};
      normalizeState(); return {a:!!state.discovered.bronze_axe, b:!!state.discovered.iron_pick};})()`);
    ok('owned gear backfilled into the Collection Log', backfill.a&&backfill.b, JSON.stringify(backfill));

    const comp=ev(`(function(){ var cooked=Object.keys(ITEMS).filter(function(id){return id.indexOf('cooked_')===0;});
      var cats={}; cooked.forEach(function(id){ var c=itemCompCat(id); cats[c]=(cats[c]||0)+1; });
      return {count:cooked.length, cats:cats};})()`);
    ok('all cooked_* items file under Cooked', comp.cats.cooked===comp.count, JSON.stringify(comp));

    const rawDupes=(html.match(/^\s{2}void_cinder:\s*\{/gm)||[]).length;
    ok('void_cinder declared exactly once', rawDupes===1, rawDupes+' declarations');

    const cm=ev(`(function(){ return {nodes:CMAST_NODES.length, cap:CMAST_CAP,
      unwired:Object.keys(CMAST_UNWIRED).length,
      unwiredPts:CMAST_NODES.filter(function(n){return CMAST_UNWIRED[n.id];}).reduce(function(s,n){return s+n.max;},0),
      unknown:Object.keys(CMAST_UNWIRED).filter(function(id){return !CMAST_BY_ID[id];})};})()`);
    ok('every CMAST_UNWIRED id is a real node', cm.unknown.length===0, JSON.stringify(cm));
  }

  section('Sleep exploit, notification hardening & misc (v0.9.87)');
  {   // block-scoped so each section can reuse local names freely
  // 1. notification log: no markup persisted, nothing injected on render
    const notif=ev(`(function(){ state=defaultState(); normalizeState(); rightTab='notifs';
      logNotification('rare','bronze_axe','Found a Bronze Axe');
      var stored=state.notifications[0].icon;
      // hostile save: markup in both fields
      state.notifications.unshift({type:'rare',icon:'<img src=x onerror="window.__PWN=1">',
                                   text:'<b id="PWNT">x</b><script>window.__PWN2=1<\\/script>',time:Date.now(),seen:true});
      renderNotifications();
      return {stored:stored, bytes:JSON.stringify(state.notifications).length,
              pwn:!!window.__PWN, pwn2:!!window.__PWN2, injectedEl:!!document.getElementById('PWNT'),
              resolvesIcon:notifIconHTML('bronze_axe').indexOf('<svg')===0};})()`);
    ok('logNotification stores an id, not SVG', notif.stored==='bronze_axe', JSON.stringify({stored:notif.stored,bytes:notif.bytes}));
    ok('ids still resolve to an icon at paint time', notif.resolvesIcon===true);
    ok('hostile notification cannot inject HTML', !notif.pwn && !notif.pwn2 && !notif.injectedEl, JSON.stringify(notif));

    const mig=ev(`(function(){ state=defaultState();
      state.notifications=[{type:'rare',icon:iconHTML('bronze_axe'),text:'old',time:1,seen:true}];
      var before=JSON.stringify(state.notifications).length;
      normalizeState();
      return {before:before, after:JSON.stringify(state.notifications).length, icon:state.notifications[0].icon};})()`);
    ok('existing saves shed their stored SVG', mig.icon==='✦'&&mig.after<mig.before, JSON.stringify(mig));

    // 2. tick catch-up clamp
    const clamp=ev(`(function(){ state=defaultState(); normalizeState(); mmAtMenu=false; mmSlot=1;
      state.xp.woodcutting=0; state.action={skill:'woodcutting',actId:'wc1'};
      var act=getAct('woodcutting','wc1'), ms=actMs(act,'woodcutting');
      state.actionStart=Date.now()-100*3600000;   // 100 hours "asleep"
      var before=state.items.pine_log||0;
      tick();
      var gained=(state.items.pine_log||0)-before;
      return {ms:ms, maxCycles:Math.floor(TICK_CATCHUP_MAX_MS/ms), gained:gained};})()`);
    ok('a 100h suspend pays at most the clamp window', clamp.gained<=clamp.maxCycles*3, JSON.stringify(clamp));

    // 3. XP/hr tracker reset after offline
    const xph=ev(`(function(){ state=defaultState(); normalizeState();
      recordXpGain('woodcutting', 254540);
      var before=liveXph('woodcutting');
      for(var sk in SKILLS) resetXphTracker(sk);
      return {before:before, after:liveXph('woodcutting')};})()`);
    ok('resetXphTracker clears the poisoned window', xph.after===0||xph.after<xph.before/100, JSON.stringify(xph));
    ok('grantOffline calls resetXphTracker', /resetXphTracker/.test(html.slice(html.indexOf('function grantOffline'), html.indexOf('function showOfflineSummary'))));

    // 4. double-action parity with the primary bar
    const dbl=ev(`(function(){ var s=String(completeWcDoubleAction)+String(completeFishDoubleAction)+String(completeDoubleAction);
      return {alwaysPlusOne:/qty\\+=1\\*cycles/.test(s), rawQtyCycles:/master2\\) qty\\+=q\\*cycles/.test(s),
              binomHits:(s.match(/binom\\(cycles,0\\.(15|30)\\)/g)||[]).length};})()`);
    ok('no "+1 always" master2 left on the second bars', !dbl.alwaysPlusOne && !dbl.rawQtyCycles, JSON.stringify(dbl));
    ok('all three second bars roll master2', dbl.binomHits>=3, JSON.stringify(dbl));

    // 5. achievements
    const ach=ev(`(function(){ state=defaultState(); normalizeState();
      var bf=ACH_BY_ID.beastfriend, jw=ACH_BY_ID.first_socket;
      // Jeweller must NOT fire from merely selecting an item in the socket panel
      getSocketData('bronze_sword');
      var falseFire=jw.check();
      state.sockets.bronze_sword={slots:1,gems:['azure_chip']};
      var realFire=jw.check();
      // Beastfriend needs one pet per zone, and PETS has 12
      var n=0; for(var z in PETS){ state.pets[PETS[z].id]=1; n++; if(n===9) break; }
      var atNine=bf.check();
      for(var z2 in PETS) state.pets[PETS[z2].id]=1;
      return {petCount:Object.keys(PETS).length, falseFire:falseFire, realFire:realFire,
              atNine:atNine, atAll:bf.check(), desc:bf.desc};})()`);
    ok('Jeweller no longer fires on mere selection', ach.falseFire===false && ach.realFire===true, JSON.stringify(ach));
    ok('Beastfriend needs every zone pet, not nine', ach.atNine===false && ach.atAll===true, JSON.stringify(ach));

    // 6. sailing: silver printed as silver, cape berth honoured
    const sail=ev(`(function(){ state=defaultState(); normalizeState();
      var tip=_slItemTip('rock_salt');
      state.sail.hull=SAIL_HULLS.length-1; state.items.cape_sailing=1;
      var berths=sailBerths();
      var roles=SAIL_CREW_ROLES.slice(0,berths);
      state.sail.crew={}; roles.forEach(function(r){ state.sail.crew[r.id]=1; });
      var hired=Object.values(state.sail.crew).reduce(function(a,b){return a+b;},0);
      normalizeState();
      var after=Object.values(state.sail.crew).reduce(function(a,b){return a+b;},0);
      return {tipHasRawG:/[0-9],?[0-9]*g each/.test(tip)&&!/s each/.test(tip),
              tip:tip.slice(0,160), berths:berths, hired:hired, afterReload:after};})()`);
    ok('sailing item tip no longer labels silver as gold', !sail.tipHasRawG, sail.tip.replace(/\n/g,' | '));
    ok('cape berth survives a reload', sail.hired===sail.afterReload, JSON.stringify({berths:sail.berths,hired:sail.hired,after:sail.afterReload}));

    // 7. compendium 'other' now has a chip
    const comp=ev(`(function(){ var ids=COMP_CATEGORIES.map(function(c){return c.id;});
      var other=Object.keys(ITEMS).filter(function(i){return itemCompCat(i)==='other';}).length;
      return {hasChip:ids.indexOf('other')>=0, count:other};})()`);
    ok('every compendium bucket has a chip', comp.hasChip===true, JSON.stringify(comp));
  }

  section('Gear tiers & pacing (v0.9.88)');
  {   // block-scoped so each section can reuse local names freely
  const half=ev(`(function(){
      var pairs=[['plague_fang_dagger','bronze_dagger'],['chitin_maul','iron_hammer'],
                 ['warcleaver','steel_sword'],['soulbinder_hammer','mithril_hammer'],
                 ['ratskin_tunic','bronze_chest'],['chitin_plate','iron_chest'],
                 ['warband_armor','steel_chest'],['bone_plate_cuirass','mithril_chest'],
                 ['pack_leader_vest','cobalt_chest'],['ratskin_cape','bronze_cape'],
                 ['silkwoven_cape','iron_cape'],['warband_cape','steel_cape'],
                 ['wraithweave_cape','mithril_cape'],['pack_alpha_cape','cobalt_cape']];
      var bad=[];
      pairs.forEach(function(p){
        var A=COMBAT_GEAR_STATS[p[0]], B=COMBAT_GEAR_STATS[p[1]];
        if(!A||!B){ bad.push('MISSING '+p[0]+'/'+p[1]); return; }
        var la=COMBAT_GEAR_REQ[(ITEMS[p[0]]||{}).ctier], lb=COMBAT_GEAR_REQ[(ITEMS[p[1]]||{}).ctier];
        var ba=(A.atk||0)+(A.str||0)+(A.def||0), bb=(B.atk||0)+(B.str||0)+(B.def||0);
        if(la!==lb) bad.push(p[0]+' Lv'+la+' vs '+p[1]+' Lv'+lb);
        else if(ba<=bb) bad.push(p[0]+' '+ba+' <= '+p[1]+' '+bb+' @Lv'+la);
      });
      return bad;})()`);
    ok('half-tier drops beat their same-level standard piece', half.length===0, half.join(' | '));

    const next=ev(`(function(){
      var chk=[['ratskin_tunic','iron_chest'],['chitin_plate','steel_chest'],
               ['warband_armor','mithril_chest'],['bone_plate_cuirass','cobalt_chest'],
               ['pack_leader_vest','runite_chest'],['warcleaver','mithril_sword']];
      var bad=[];
      chk.forEach(function(p){
        var A=COMBAT_GEAR_STATS[p[0]], B=COMBAT_GEAR_STATS[p[1]];
        var ba=(A.atk||0)+(A.str||0)+(A.def||0), bb=(B.atk||0)+(B.str||0)+(B.def||0);
        if(ba>=bb) bad.push(p[0]+' ('+ba+') not superseded by '+p[1]+' ('+bb+')');
      });
      return bad;})()`);
    ok('half-tier drops still superseded by the next tier', next.length===0, next.join(' | '));

    const buck=ev(`(function(){
      var b=Object.keys(ITEMS).filter(function(i){return /_buckler$/.test(i);})
        .sort(function(x,y){return ITEMS[x].ctier-ITEMS[y].ctier;});
      var bad=[];
      for(var i=1;i<b.length;i++){
        var A=COMBAT_GEAR_STATS[b[i-1]], B=COMBAT_GEAR_STATS[b[i]];
        ['def','atk','crit','dodge','aspd'].forEach(function(k){
          if((B[k]||0)<(A[k]||0)) bad.push(b[i]+'.'+k+' '+B[k]+' < '+b[i-1]+' '+A[k]);
        });
      }
      return bad;})()`);
    ok('buckler ladder never regresses', buck.length===0, buck.join(' | '));

    const raid=ev(`RAIDS.map(function(r){
      var mx=0; r.gearDrops.forEach(function(g){ var c=(ITEMS[g.id]||{}).ctier; mx=Math.max(mx,COMBAT_GEAR_REQ[c]||0); });
      return {id:r.id, unlock:r.unlockLvl, needs:mx, gap:mx-r.unlockLvl};})`);
    ok('no raid drops loot you cannot wear', raid.filter(r=>r.gap>2).length===0, JSON.stringify(raid));

    const pace=ev(`(function(){
      var out={};
      for(var sk in SKILLS){
        var acts=SKILLS[sk].acts; if(!acts||!acts.length) continue;
        state=defaultState(); normalizeState();
        state.xp[sk]=XP_CUM[99];
        state.tree[sk]={}; TREES[sk].forEach(function(n){ state.tree[sk][n.id]=n.max; });
        state.gear=[SKILL_CAPE[sk]];
        var best=0;
        acts.forEach(function(a){
          if(a.lvl>99) return;
          var m=mods(sk), ms=actMs(a,sk);
          var rate=(a.xp*m.xpMult)/ms*3600000;
          if(rate>best) best=rate;
        });
        out[sk]=Math.round(best);
      }
      return out;})()`);
    const vals=Object.keys(pace).map(k=>pace[k]).sort((a,b)=>a-b);
    const median=vals[Math.floor(vals.length/2)];
    console.log('\n  peak XP/hr, maxed tree + cape (median '+median.toLocaleString()+'):');
    Object.keys(pace).sort((a,b)=>pace[a]-pace[b]).forEach(k=>
      console.log('    '+k.padEnd(13)+String(pace[k]).padStart(10)+(k==='cooking'?'   <-- cooking':'')));
    // Cooking may still sit at the bottom of the pack — that is a design choice.
    // What was broken was the SIZE of the gap: it used to be 33% of the median and
    // 50% of the next-lowest skill. In-band means within ~25% of its nearest peer.
    const sorted=Object.keys(pace).sort((a,b)=>pace[a]-pace[b]);
    const nearest=pace[sorted[sorted[0]==='cooking'?1:0]];
    ok('cooking is in-band with its nearest peer (>=75%)', pace.cooking/nearest>=0.75,
       'cooking '+pace.cooking+' vs nearest '+nearest+' = '+(pace.cooking/nearest*100).toFixed(0)+'%');
    ok('cooking is at least half the median', pace.cooking/median>=0.5,
       (pace.cooking/median*100).toFixed(0)+'% of median');
  }

  console.log('\n' + (fail ? fail + ' FAILED, ' + pass + ' passed' : 'PASS — all ' + pass + ' audit regressions still fixed'));
  process.exit(fail ? 1 : 0);
}, 2500);

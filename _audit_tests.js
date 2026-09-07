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
const html = fs.readFileSync(path.join(ROOT, process.env.CV_FILE||'cindervale.html'), 'utf8');
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
    // Behavioural: force the roll to succeed, run a REAL harvest, and require the
    // pet to land. A grep for the call site stayed green when the call was made
    // unreachable, so it is not enough.
    const petFromHarvest=ev(`(function(){
        state=defaultState(); normalizeState(); state.xp.farming=XP_CUM[99]; state.skillPets={};
        var patch=PATCHES[0], crop=CROPS[0];
        if(!patch||!crop) return 'no patch/crop def';
        state.seeds[crop.id]=5;
        if(!plantPatch(patch.id, crop.id, true)) return 'plant refused';
        state.patches[patch.id].plantedAt = Date.now() - (crop.growMs+60000);  // force ready
        if(!patchReady(state.patches[patch.id])) return 'not ready after backdate';
        var orig=Math.random; Math.random=function(){return 0;};   // force every roll to hit
        var err='';
        try{ harvestPatch(patch.id, true); }catch(e){ err='THREW '+e.message; }
        Math.random=orig;
        return err || !!state.skillPets['spet_farming'];
      })()`);
    ok('a real harvest can drop the Furrow Mole', petFromHarvest===true, String(petFromHarvest));
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
    ok('98-point invariant holds for every tree', badTrees.length===0, badTrees.length?JSON.stringify(sums):'');

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

    // Behavioural: run a real agility lap through completeAction and compare coins
    // gained with and without the node. The previous version measured a formula
    // written inside the test itself and never called into the game at all.
    const coins=ev(`(function(){
        function lapCoins(rank){
          state=defaultState(); normalizeState();
          state.xp.agility=XP_CUM[99]; state.coins=0;
          state.tree.agility = rank ? {ag_gm_coins:rank} : {};
          var act=SKILLS.agility.acts[0];
          var orig=Math.random; Math.random=function(){return 0.999;};   // suppress bonus rolls
          try{ completeAction(act,'agility',1000); }catch(e){ Math.random=orig; return 'THREW '+e.message; }
          Math.random=orig;
          return state.coins;
        }
        var without=lapCoins(0), with8=lapCoins(8);
        if(typeof without!=='number'||typeof with8!=='number') return {err:without+'/'+with8};
        return {without:without, with8:with8, ratio:without?+(with8/without).toFixed(3):0};
      })()`);
    // 8 ranks x 6% on a base multiplier of 1.0 => +48% before other coin nodes.
    ok('ag_gm_coins actually raises lap coins in completeAction',
       coins.with8>coins.without, JSON.stringify(coins));

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

    // Any self-referential write to the xp pool, whatever the key expression looks
    // like: quoted literal, bare variable, or dotted. The old pattern demanded a
    // quoted literal and so missed state.xp[key]=(state.xp[key]||0)+amt entirely.
    const rawXp=(html.match(/state\.xp\s*(\[[^\]]+\]|\.[A-Za-z_$][\w$]*)\s*=\s*\(?\s*state\.xp\s*(\[[^\]]+\]|\.[A-Za-z_$][\w$]*)/g)||[]);
    // The dev panel's devMaxSkills is an explicit, IS_DEMO-gated cheat and is allowed.
    const rawXpReal=rawXp.filter(s=>{
      const at=html.indexOf(s);
      const near=html.slice(Math.max(0,at-400), at+200);
      return !/dev(Xp|MaxSkills|SetLevel|Panel)/.test(near);   // dev-panel cheats are gated and allowed
    });
    ok('no raw state.xp self-writes outside the dev panel', rawXpReal.length===0,
       rawXpReal.length ? rawXpReal.join(' | ') : '0 found (' + rawXp.length + ' total incl. dev)');

    const funnel=ev(`(function(){
      state=defaultState(); normalizeState();
      var before=state.xp.farming||0;
      var g=addSkillXp('farming',12345);
      return {granted:g, delta:(state.xp.farming||0)-before};})()`);
    ok('addSkillXp is the funnel and returns the granted amount', funnel.granted===funnel.delta, JSON.stringify(funnel));

    // Behavioural: fire the real gesture and the real toggle handler with IS_DEMO
    // forced true, and require the panel to stay hidden. Source greps here were
    // whitespace-literal — they broke on reformatted-but-correct code and passed on
    // broken-but-identically-spelled code.
    const devGate=ev(`(function(){
        var p=document.getElementById('devPanel'); if(!p) return 'no devPanel';
        p.classList.add('hidden');
        // Drive the documented gesture: five clicks on the inventory sell-mode "All"
        // chip. It is a button.inv-sort created by renderInventory, so render first —
        // querying before that silently found nothing and made this half vacuous.
        state=defaultState(); normalizeState();
        renderInventory();
        var chip=Array.prototype.slice.call(document.querySelectorAll('button.inv-sort'))
                   .filter(function(b){ return b.textContent.trim()==='All'; })[0];
        var opened=false;
        if(chip){ for(var i=0;i<6;i++) chip.click(); opened=!p.classList.contains('hidden'); }
        var togOpened=false;
        var t=document.getElementById('devToggle');
        if(t){ p.classList.add('hidden'); t.click(); togOpened=!p.classList.contains('hidden'); }
        return {isDemo:IS_DEMO, chipFound:!!chip, openedByGesture:opened, openedByToggle:togOpened};
      })()`);
    ok('dev panel stays shut in the demo build',
       devGate && devGate.isDemo===true && devGate.openedByGesture===false && devGate.openedByToggle===false,
       JSON.stringify(devGate));
    /* Storage access. Wrapping the two functions that had bitten us was not enough —
       it shipped twice (getDeviceId in v0.9.84, then cursorEnabled, which took the
       whole menu block down with it). The invariant is that the raw API appears in
       exactly three places: the bodies of lsGet/lsSet/lsDel. _validate.js proves the
       behaviour by booting with localStorage throwing; this stops the next raw call
       from being written at all. */
    const rawLs=(html.match(/localStorage\.(getItem|setItem|removeItem)\(/g)||[]).length;
    ok('localStorage is touched only inside lsGet/lsSet/lsDel', rawLs===3, rawLs+' raw call sites (expected 3)');
    ok('the wrappers exist and swallow', /function lsGet\(k\)\{ try\{/.test(html)&&/function lsSet\(k,v\)\{ try\{/.test(html)&&/function lsDel\(k\)\{ try\{/.test(html));

    /* Performance is a correctness property in an idle game: the skill list renders
       on a 1s interval forever, and its cost used to grow with mastery — 757ms per
       render at full Platinum, on TWO intervals, so >100% of a second of blocking JS.
       Assert it stays flat as mastery climbs rather than pinning an absolute ms
       number, which would be machine-dependent and flaky. */
    const perf=ev(`(function(){
        function fill(lvl){
          state=defaultState(); normalizeState();
          for(var k in SKILLS) state.xp[k]=XP_CUM[99];
          state.mastery={};
          if(lvl>0){ var need=masteryXpNeeded(lvl); for(var s in SKILLS) SKILLS[s].acts.forEach(function(a){ state.mastery[a.id]=need; }); }
          invalidateMasteryCache();
        }
        function ms(lvl){ fill(lvl); renderSkillList(); var t=Date.now(); for(var i=0;i<3;i++) renderSkillList(); return (Date.now()-t)/3; }
        var lo=ms(0), hi=ms(100);
        return {lo:+lo.toFixed(1), hi:+hi.toFixed(1), ratio:+(hi/Math.max(lo,0.5)).toFixed(2)};
      })()`);
    ok('renderSkillList cost does not scale with mastery', perf.ratio<3, JSON.stringify(perf));

    const offPerf=ev(`(function(){
        state=defaultState(); normalizeState();
        for(var k in SKILLS) state.xp[k]=XP_CUM[99];
        var need=masteryXpNeeded(100);
        state.mastery={}; for(var s in SKILLS) SKILLS[s].acts.forEach(function(a){ state.mastery[a.id]=need; });
        invalidateMasteryCache();
        state.action={skill:'woodcutting',actId:'wc1'};
        state.lastSeen=Date.now()-8*3600000;
        var t=Date.now(); grantOffline(); return Date.now()-t;
      })()`);
    // Was 9,203ms at full Platinum — a nine-second frozen window on every launch.
    ok('grantOffline does not freeze launch', offPerf<1500, offPerf+' ms');

    // Count the repaints directly. The wall-clock check above passes even with the
    // redundant renders restored (they are only ~12ms each now), so it does not on
    // its own stop the 12x rebuild from creeping back in.
    const offRenders=ev(`(function(){
        state=defaultState(); normalizeState();
        for(var k in SKILLS) state.xp[k]=XP_CUM[99];
        state.action={skill:'woodcutting',actId:'wc1'};
        state.lastSeen=Date.now()-8*3600000;
        var real=renderSkillList, n=0;
        renderSkillList=function(){ n++; return real.apply(this,arguments); };
        try{ grantOffline(); } finally { renderSkillList=real; }
        return n;
      })()`);
    ok('grantOffline repaints the skill list at most once', offRenders<=1, offRenders+' repaints');

    // The memo's real risk is a stale value, not speed: mastery must be re-counted
    // after recordMastery moves an activity into Platinum.
    const cacheInval=ev(`(function(){
        state=defaultState(); normalizeState();
        for(var k in SKILLS) state.xp[k]=XP_CUM[99];
        state.mastery={}; invalidateMasteryCache();
        var before=platinumMasteryCount();
        var act=SKILLS.woodcutting.acts[0];
        state.mastery[act.id]=0;
        recordMastery(act.id, 100000000);          // straight to Platinum
        return {before:before, after:platinumMasteryCount(), lvl:masteryLevel(act.id)};
      })()`);
    ok('the platinum-count memo invalidates when mastery changes',
       cacheInval.after===cacheInval.before+1, JSON.stringify(cacheInval));

    // Only ONE 1s interval may rebuild the skill list.
    // Structural, not line-based: the callback may span several lines, and the
    // guard added in 0.9.95 moved renderSkillList onto its own line — which broke
    // the old same-line regex on correct code.
    const skillIntervals=(function(){
      let n=0, i=0;
      while((i=html.indexOf('setInterval(', i))>=0){
        const body=html.slice(i, i+500);
        if(/renderSkillList\(\)/.test(body.split(/,\s*\d+\s*\);/)[0]||'')) n++;
        i+=12;
      }
      return n;
    })();
    ok('only one interval repaints the skill list', skillIntervals===1, skillIntervals+' found');

    /* Tooltips used to be yanked out from under the cursor: panels are rebuilt via
       innerHTML, so an element replaced while hovered takes its tooltip with it —
       hover a ship part, have a woodcutting action finish, tooltip gone. Automatic
       repaints now wait for the tooltip to close.
       Driven through the JS tooltip because headless Chrome cannot produce a real
       CSS :hover; the [data-tip]:hover arm of _tooltipOpen() is the same condition
       the browser uses to render that tooltip, so it holds by construction. */
    const tipGuard=ev(`(function(){
        state=defaultState(); normalizeState();
        for(var k in SKILLS) state.xp[k]=XP_CUM[99];
        state.action={skill:'woodcutting',actId:'wc1'};
        mmAtMenu=false; mmSlot=1;
        var host=document.getElementById('skillList');
        if(!host) return {err:'no skillList'};
        renderAll();
        host.setAttribute('data-tipmark','1');
        var tt=document.getElementById('itemTooltip');
        tt.style.display='block';                       // player is reading a tooltip
        var seen=_tooltipOpen();
        state.actionStart=Date.now()-999999; tick();     // an action completes
        var heldMark=!!document.querySelector('[data-tipmark]');
        var owed=_repaintOwed;
        tt.style.display='none';                        // cursor moves off
        tick();                                          // next heartbeat flushes
        return {seen:seen, heldRepaint:heldMark, owed:owed, flushed:_repaintOwed===false};
      })()`);
    ok('an open tooltip is detected', tipGuard.seen===true, JSON.stringify(tipGuard));
    ok('a completing action does not repaint over an open tooltip', tipGuard.heldRepaint===true, JSON.stringify(tipGuard));
    ok('the held repaint is owed and then flushed', tipGuard.owed===true&&tipGuard.flushed===true, JSON.stringify(tipGuard));
    // A click must still paint immediately even with the pointer parked on its target.
    ok('renderAll stays unguarded for user actions', /function renderAll\(\)\{\s*normalizeState\(\);/.test(html.replace(/\r/g,'')));
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

    const raid=ev(`(function(){
      // (a) ROOM available: the clear must actually report and deliver materials.
      state=defaultState(); normalizeState();
      var open=grantRaidRewards(RAID_BY_ID.sunken_barrow, 1000);
      var openLied=open.mats.filter(function(m){ return !(state.items[m.id]>0); }).length
                 + open.gear.filter(function(g){ return !(state.items[g]>0)&&state.gear.indexOf(g)<0; }).length;
      // (b) NO room: nothing may be claimed, and nothing may be marked discovered.
      state=defaultState(); normalizeState();
      var ids=Object.keys(ITEMS); for(var i=0;satchelUsed()<satchelCap();i++) state.items[ids[i]]=1;
      var discBefore=Object.keys(state.discovered).length;
      var full=grantRaidRewards(RAID_BY_ID.sunken_barrow, 1000);
      var fullLied=full.mats.filter(function(m){ return !(state.items[m.id]>0); }).length
                 + full.gear.filter(function(g){ return !(state.items[g]>0)&&state.gear.indexOf(g)<0; }).length;
      return {openMats:open.mats.length, openLied:openLied,
              fullMats:full.mats.length, fullLied:fullLied,
              discGrew:Object.keys(state.discovered).length-discBefore};})()`);
    // With room the loop must deliver something — otherwise the assertion below is
    // vacuous, which is exactly how the previous version passed under mutation.
    ok('raid loot is actually granted when there is room', raid.openMats>0&&raid.openLied===0, JSON.stringify(raid));
    ok('raid loot claims nothing when the satchel is full', raid.fullMats===0&&raid.fullLied===0&&raid.discGrew===0, JSON.stringify(raid));

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

    // Duplicate keys in ANY of the big object literals silently shadow: the later
    // wins and the earlier is dead bytes in a 2.5 MB file. Scan the whole source for
    // repeated top-level-ish keys rather than one hand-picked id with a brittle
    // whitespace pattern.
    const dupKeys=(function(){
      const out=[];
      // Scoped to ONE object literal at a time: the same key in ITEMS and in ICONS is
      // entirely normal, and a whole-file scan produced ~300 false hits. Brace-match
      // each top-level `const NAME={...}` and look for a key declared twice inside it.
      // JS silently keeps the last, so an earlier duplicate is dead bytes in a 2.5 MB
      // file and, worse, a stats or icon entry nobody realises is being ignored.
      const decl=/^const ([A-Z][A-Z0-9_]{2,})\s*=\s*\{/gm;
      let d;
      while((d=decl.exec(html))){
        const name=d[1];
        const open=html.indexOf('{', d.index);
        let depth=0, end=-1;
        for(let j=open;j<html.length;j++){
          const c=html[j];
          if(c==='{') depth++;
          else if(c==='}'){ depth--; if(depth===0){ end=j; break; } }
        }
        if(end<0) continue;
        const body=html.slice(open,end);
        const seen=Object.create(null), dups=Object.create(null);
        const kre=/(?:^|[\n{,])[ \t]*([A-Za-z_$][\w$]*)[ \t]*:/g;
        let m2, depthAt=0, scanned=0, guard=0;
        // Track brace depth incrementally rather than rescanning from 0 each match.
        let cursor=0, dep=0;
        while((m2=kre.exec(body)) && guard++<400000){
          // Inclusive of the char AT m2.index: the match's leading delimiter can be
          // the nested object's own '{', and if that is not counted every nested
          // key reads as depth 1 (which reported ITEMS.name x460).
          for(;cursor<=m2.index;cursor++){ const c=body[cursor]; if(c==='{')dep++; else if(c==='}')dep--; }
          if(dep!==1) continue;              // nested objects legitimately reuse names
          const k=m2[1];
          if(seen[k]) dups[k]=(dups[k]||1)+1; else seen[k]=1;
          scanned++;
        }
        Object.keys(dups).forEach(k=>out.push(name+'.'+k+' x'+dups[k]));
      }
      return out;
    })();
    ok('no shadowed duplicate keys in the data literals', dupKeys.length===0,
       dupKeys.length?dupKeys.join(', '):'none');

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
              resolvesIcon:(function(h){return h.indexOf('<svg')===0||h.indexOf('<img')===0;})(notifIconHTML('bronze_axe'))};})()`);
    ok('logNotification stores an id, not SVG', notif.stored==='bronze_axe', JSON.stringify({stored:notif.stored,bytes:notif.bytes}));
    // The call sites passing ids is one guarantee; logNotification REFUSING markup is
    // a separate one, and mutation-testing showed nothing covered it — deleting the
    // defensive line left the suite green. A future call site that passes iconHTML()
    // must not be able to put 4 KB of <svg> back into localStorage.
    const notifGuard=ev(`(function(){ state=defaultState(); normalizeState();
        logNotification('rare', iconHTML('bronze_axe'), 'markup passed by a bad call site');
        var icon=state.notifications[0].icon;
        return {icon:icon, hasMarkup:icon.indexOf('<')>=0, len:icon.length};})()`);
    ok('logNotification refuses markup even if a call site passes it',
       notifGuard.hasMarkup===false, JSON.stringify(notifGuard));
    // svg OR img: the art batches replace ICONS entries wholesale, and which one a
    // given id is today is not what this guards.
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
      // Backdate the buffer past XPH_WARMUP so liveXph returns a REAL number rather
      // than early-returning 0 — without this the assertion is satisfied by the
      // warm-up path and a no-op resetXphTracker passes.
      recordXpGain('woodcutting', 254540);
      var buf=xphBuf['woodcutting'];
      if(!buf||!buf.length) return {err:'no buffer'};
      buf[0].t = Date.now()-(XPH_WARMUP+5000);
      xphStartTime['woodcutting'] = Date.now()-(XPH_WARMUP+5000);
      var before=liveXph('woodcutting');
      for(var sk in SKILLS) resetXphTracker(sk);
      return {before:before, after:liveXph('woodcutting'), bufAfter:(xphBuf['woodcutting']||[]).length};})()`);
    ok('the poisoned window really is poisoned first', xph.before>1000000, JSON.stringify(xph));
    ok('resetXphTracker clears it', xph.after===0&&xph.bufAfter===0, JSON.stringify(xph));
    // Behavioural, not a grep: run a real offline catch-up and require the tracker
    // to come back empty. The old check searched the wrong function (it anchored on
    // grantOfflineFarming) and failed open if showOfflineSummary was ever renamed.
    const offXph=ev(`(function(){ state=defaultState(); normalizeState();
      state.xp.woodcutting=XP_CUM[50];
      state.action={skill:'woodcutting',actId:'wc1'};
      state.lastSeen=Date.now()-8*3600000;
      try{ grantOffline(); }catch(e){ return 'THREW '+e.message; }
      var n=0; for(var sk in SKILLS) n+=(xphBuf[sk]||[]).length;
      return {bufEntries:n, xph:liveXph('woodcutting')};})()`);
    ok('grantOffline leaves the XP/hr tracker clean', offXph.bufEntries===0, JSON.stringify(offXph));

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
      // The value must be printed by fmtCoins, so a sub-1-gold item shows silver.
      // rock_salt sells for 45 SILVER: "45s". Any "…g each" on it is the 100x bug.
      // (The old test ANDed in !/s each/, which masked the failure it was testing.)
      var m=tip.match(/Sells for ([^\\n]*?) each/);
      return {sellPhrase:m?m[1]:null, tipHasRawG:!!(m&&/g$/.test(m[1].trim())),
              tip:tip.slice(0,160), berths:berths, hired:hired, afterReload:after};})()`);
    ok('sailing tip prints the sell value via fmtCoins', sail.sellPhrase!==null, sail.tip.replace(/\n/g,' | '));
    ok('a sub-gold sailing item shows silver, not gold', sail.tipHasRawG===false, 'phrase="'+sail.sellPhrase+'"');
    ok('cape berth survives a reload', sail.hired===sail.afterReload, JSON.stringify({berths:sail.berths,hired:sail.hired,after:sail.afterReload}));

    // 7. compendium 'other' now has a chip
    const comp=ev(`(function(){
      var ids=COMP_CATEGORIES.map(function(c){return c.id;});
      var buckets={}; Object.keys(ITEMS).forEach(function(i){ var c=itemCompCat(i); buckets[c]=(buckets[c]||0)+1; });
      // Assert on the ACTUAL bucket set, not just the one id we happened to fix.
      var orphans=Object.keys(buckets).filter(function(b){ return ids.indexOf(b)<0; });
      return {orphans:orphans, buckets:buckets, chips:ids.length};})()`);
    ok('every compendium bucket itemCompCat can return has a chip',
       comp.orphans.length===0, comp.orphans.length?('orphans: '+comp.orphans.join(',')):JSON.stringify(comp.buckets));
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

  section('Equipped gear is not for sale (v0.9.99)');
  {
    // Reported by a playtester: crafted a full set, wore one of each, sold "the
    // rest" — and sold the worn pieces too. Equipping never decremented
    // state.items (the paper doll just points at the satchel stack), so Sell All
    // took the whole stack and releaseIfGone quietly unequipped afterwards.
    // Nothing threw; the armour just came off. Guard every sell path.
    const SET=`state=defaultState(); normalizeState();
      state.xp.attack=XP_CUM[50]; state.xp.defence=XP_CUM[50];
      state.items={bronze_chest:3}; state.coins=0;
      equipBodyItem('bronze_chest','chest','combat');
      rightTab='satchel'; invCat='all'; invSearch=''; invPage=0;`;
    const findRow=`(function(){
      return [...document.querySelectorAll('#inventory .inv-item')].find(function(r){
        var n=r.querySelector('.inv-name'); return n&&/Bronze Chest/i.test(n.textContent); });
    })()`;

    ev(SET);
    ok('worn copy is reserved', ev('reservedForEquip("bronze_chest")')===1);
    ok('sellableQty holds one back', ev('sellableQty("bronze_chest")')===2);

    // The row button, not just the helper — the bug lived in the click handler.
    ev(`invSellMode='all'; invSellCustom=0; renderInventory();`);
    const clicked=ev(`(function(){ var r=${findRow}; if(!r) return 'no row';
      var b=r.querySelector('.sell'); if(!b) return 'no button'; b.click(); return 'ok'; })()`);
    const sold=ev('[state.items.bronze_chest||0, state.combatEquipped.chest||null, state.coins]');
    ok('Sell All leaves the worn copy on your back',
       clicked==='ok'&&sold[0]===1&&sold[1]==='bronze_chest', clicked+' '+JSON.stringify(sold));
    ok('Sell All pays for 2, not 3', sold[2]===2*ev('effectiveItemSell("bronze_chest")'), JSON.stringify(sold));

    // Down to just the worn one: the button must refuse and say why.
    ev('renderInventory();');
    /* `explained` was originally just the .inv-eq "Worn" badge. Since v0.9.108 a
       satchel row for equipped combat gear carries a green Remove button instead
       — the two together ellipsised "Bronze Helm" into "Bronze ...", so they are
       mutually exclusive. Either one satisfies this assertion's actual intent:
       the held-back copy must be explained rather than mysterious. */
    const lone=ev(`(function(){ var r=${findRow}; if(!r) return {err:'row gone'};
      var b=r.querySelector('.sell'); if(b) b.click();
      var eqb=r.querySelector('.inv-equip');
      return {dis:!!(b&&b.disabled),
              badge:!!r.querySelector('.inv-eq')||!!(eqb&&eqb.textContent==='Remove'),
              qty:state.items.bronze_chest||0, eq:state.combatEquipped.chest||null}; })()`);
    ok('last worn copy: sell disabled + Equipped badge',
       lone.dis===true&&lone.badge===true, JSON.stringify(lone));
    ok('last worn copy: clicking sells nothing',
       lone.qty===1&&lone.eq==='bronze_chest', JSON.stringify(lone));

    // Fixed-quantity modes clamp too, not just All.
    ev(`state.items.bronze_chest=4; invSellMode=5; invSellCustom=0; renderInventory();`);
    ev(`(function(){ var r=${findRow}; if(r) r.querySelector('.sell').click(); })()`);
    ok('Sell 5 of 4 (1 worn) sells 3', ev('state.items.bronze_chest')===1,
       'left='+ev('state.items.bronze_chest'));

    // Skilling loadout counts as worn as well — it shares the satchel stack.
    ev(`state=defaultState(); normalizeState();
        state.items={bronze_chest:2}; equipBodyItem('bronze_chest','chest','skilling');`);
    ok('skilling loadout reserves a copy too', ev('sellableQty("bronze_chest")')===1);

    // The Sell X dialog must not offer the worn copy either, and must re-clamp on
    // confirm (it can sit open while the player equips from the gear panel).
    ev(`state=defaultState(); normalizeState(); state.xp.defence=XP_CUM[50];
        state.items={bronze_chest:3}; equipBodyItem('bronze_chest','chest','combat');
        openSellModal('bronze_chest', effectiveItemSell('bronze_chest'), 3);`);
    ok('sell dialog max excludes the worn copy',
       Number(ev('document.getElementById("sellQtyInput").max'))===2,
       'max='+ev('document.getElementById("sellQtyInput").max'));
    ev(`document.getElementById('sellQtyInput').value=99; document.getElementById('sellConfirmBtn').click();`);
    ok('sell dialog confirm clamps to sellable',
       ev('state.items.bronze_chest')===1&&ev('state.combatEquipped.chest')==='bronze_chest',
       JSON.stringify(ev('[state.items.bronze_chest,state.combatEquipped.chest]')));

    ev(`unequipBodyItem('chest','combat');`);
    ok('unequipping frees it for sale', ev('sellableQty("bronze_chest")')===1);

    // And none of this may touch ordinary material stacks.
    ev(`state=defaultState(); normalizeState(); state.items={oak_log:50};`);
    ok('plain materials stay fully sellable', ev('sellableQty("oak_log")')===50);
  }

  section('Left rail category filter (v0.9.99)');
  {
    ok('filter strip has all four tabs',
       ev('document.querySelectorAll("#railGroups .rg").length')===4);
    const unbucketed=ev('Object.keys(SKILLS).filter(function(k){return !RAIL_GROUP[k];})');
    ok('every skill is bucketed', unbucketed.length===0, JSON.stringify(unbucketed));

    ev(`state=defaultState(); normalizeState(); selectedSkill='woodcutting';
        state.action=null; setRailGroup('all');`);
    const nAll=ev('document.querySelectorAll("#skillList .skill-row").length');
    ok('All shows every skill plus the offline row',
       nAll===ev('Object.keys(SKILLS).length')+1, 'rows='+nAll);

    ev(`setRailGroup('produce');`);
    const prod=ev(`[...document.querySelectorAll('#skillList .skill-row[data-skill]')].map(function(r){return r.dataset.skill;})`);
    ok('Craft shows production skills only',
       prod.indexOf('smithing')>=0&&prod.indexOf('mining')<0, JSON.stringify(prod));
    // A tab is a strict filter. Exempting the selected skill left it stranded in a
    // list it does not belong to, which read as a row that failed to clear.
    ok('selected skill IS filtered out', prod.indexOf('woodcutting')<0, JSON.stringify(prod));
    ok('offline row survives every filter',
       ev('!!document.querySelector("#skillList .offline-skill")')===true);

    ev(`selectedSkill='mining'; state.action={skill:'cooking',actId:'ck1'}; setRailGroup('gather');`);
    const gath=ev(`[...document.querySelectorAll('#skillList .skill-row[data-skill]')].map(function(r){return r.dataset.skill;})`);
    ok('Gather bucket is right',
       gath.indexOf('farming')>=0&&gath.indexOf('smithing')<0, JSON.stringify(gath));
    ok('running skill IS filtered out', gath.indexOf('cooking')<0, JSON.stringify(gath));
    // ...and the tab that owns it carries the dot, which is what makes strict
    // filtering safe — the run never becomes invisible, it just moves to the tab.
    ok('run dot marks the tab holding the running skill',
       ev(`document.querySelector('#railGroups .rg[data-rg="produce"]').classList.contains('running')`)===true);
    ok('run dot is not drawn on the tab you are already on',
       ev(`state.action={skill:'mining',actId:'mi1'}; renderSkillList();
           document.querySelector('#railGroups .rg[data-rg="gather"]').classList.contains('running')`)===false);
    ok('run dot clears when nothing is training',
       ev(`state.action=null; renderSkillList();
           document.querySelectorAll('#railGroups .rg.running').length`)===0);

    ev(`setRailGroup('support');`);
    ok('active tab carries the .on class',
       ev(`document.querySelector('#railGroups .rg.on').dataset.rg`)==='support');
    ev(`state=defaultState(); normalizeState(); setRailGroup('all'); selectedSkill='woodcutting';`);
  }

  section('Combat and skilling are one or the other (v0.9.109)');
  {
    /* This INVERTS the v0.9.99 guarantee. The two loops are still independent in
       code — the 250ms tick never consults combat.active and the 100ms combat
       timer never touches state.action — so the ONLY things enforcing one-at-a-time
       are the hand-off in engageCombat and the retreat in setAction. Neither throws
       if removed, which is exactly why they are asserted here.

       Both hand-offs sit BELOW every early return in their function, so a refused
       engage or a refused activity must not stop what is already running. Those
       negative cases are the second half of this block and matter more than the
       positive ones: silently cancelling a player's training on a click that did
       nothing is worse than the concurrency it replaced. */
    ev(`state=defaultState(); normalizeState();
        state.combatXp.attack=XP_CUM[40]; state.combatXp.strength=XP_CUM[40];
        state.combatXp.defence=XP_CUM[40]; state.combatXp.hitpoints=XP_CUM[40];
        state.combatEquipped=state.combatEquipped||{};
        state.combatEquipped.weapon='bronze_sword';
        state.hints=state.hints||{}; state.hints.combat_unarmed=1;
        state.zone='rat_warrens'; combat.monId='rat'; combat.active=false;
        state.action={skill:'woodcutting',actId:'wc1'}; state.actionStart=Date.now();
        engageCombat();`);
    // eqCombatWeapon() only checks truthiness, so a typo'd id would still "arm" the
    // character and quietly turn the setup above into a no-op.
    ok('the test weapon is a real weapon item',
       ev(`!!(ITEMS.bronze_sword&&ITEMS.bronze_sword.cslot==='weapon')`) === true);
    ok('the fight actually started', ev('combat.active') === true);
    ok('engaging STOPS the skilling action', ev('state.action') === null,
       JSON.stringify(ev('state.action')));

    // ...and the reverse: starting a skill mid-fight must end the fight.
    ev(`setAction('mining','mi1');`);
    ok('starting a skill ends the fight', ev('combat.active') === false);
    ok('the skill actually started', ev('state.action&&state.action.skill') === 'mining');

    /* No skilling XP may accrue while a fight runs. Proven in two halves, because
       "XP did not move" is vacuously true if the tick was never going to pay
       anything: first show the SAME setup does pay with no fight, then show it
       does not once a fight starts. */
    ev(`combat.active=false; state.action={skill:'mining',actId:'mi1'};
        state.actionStart=Date.now()-99999; state.xp.mining=0; tick();`);
    const paidIdle = ev('state.xp.mining');
    ok('control: the tick DOES pay mining XP with no fight running', paidIdle > 0, 'xp=' + paidIdle);

    ev(`state.action={skill:'mining',actId:'mi1'}; state.actionStart=Date.now();
        combat.monId='rat'; engageCombat();`);
    ok('engaging cleared the action', ev('state.action') === null);
    const xpBefore = ev('state.xp.mining');
    ev(`state.actionStart=Date.now()-99999; tick(); tick();`);
    ok('no skilling XP accrues during a fight', ev('state.xp.mining') === xpBefore,
       'before=' + xpBefore + ' after=' + ev('state.xp.mining'));

    /* NEGATIVE CASES — a click that gets refused must leave you alone. */
    ev(`state=defaultState(); normalizeState();
        state.hints=state.hints||{}; state.hints.combat_unarmed=1;
        state.combatEquipped={weapon:'bronze_sword'};
        state.zone='rat_warrens'; combat.active=false;
        state.action={skill:'woodcutting',actId:'wc1'}; state.actionStart=Date.now();
        combat.monId=(MONSTERS.find(m=>m.lvl>combatLevel()+5)||{id:'rat'}).id;
        engageCombat();`);
    ok('an over-level engage does NOT stop your training',
       ev('state.action&&state.action.skill') === 'woodcutting', JSON.stringify(ev('state.action')));
    ok('and no fight started', ev('combat.active') === false);

    // A cooking start refused for an unlit fire must not retreat an active fight.
    ev(`state=defaultState(); normalizeState();
        state.hints=state.hints||{}; state.hints.combat_unarmed=1; state.hintsOn=false;
        state.combatEquipped={weapon:'bronze_sword'};
        state.combatXp.attack=XP_CUM[40]; state.combatXp.hitpoints=XP_CUM[40];
        state.zone='rat_warrens'; combat.monId='rat'; combat.active=false;
        state.action=null; engageCombat();`);
    const wasFighting = ev('combat.active');
    ev(`state.xp.cooking=XP_CUM[20]; state.fire=null;
        var _ck=SKILLS.cooking.acts[0]; setAction('cooking',_ck.id);`);
    ok('the fight was running before the refused start', wasFighting === true);
    ok('a refused activity does NOT retreat the fight', ev('combat.active') === true);
    ok('and no action was set', ev('state.action') === null, JSON.stringify(ev('state.action')));

    // exitCombat stays a pure combat control — it must not start anything.
    ev(`exitCombat();`);
    ok('leaving combat stops the fight', ev('combat.active') === false);
    ok('leaving combat does not auto-resume a skill', ev('state.action') === null);

    ev(`state=defaultState(); normalizeState(); combat.active=false; combatMode=false;`);
  }

  section('SVG icon id collisions (v0.9.100 / v0.9.101)');
  {
    // Icon markup carries hard-coded gradient ids. Two live copies of the same id
    // means url(#id) resolves by DOCUMENT ORDER, so if the winner sits in a hidden
    // panel the VISIBLE icon paints with no gradients and reads as a black
    // silhouette. v0.9.100 fixed the raw-emission shape; v0.9.101 fixed the
    // memoised shape (one iconHTML() result baked into a data structure and then
    // emitted N times — the id IS suffixed, just duplicated N ways).
    //
    // Both assertions are needed. #1 alone misses a raw path until someone renders
    // it twice; #2 alone misses the memoised shape entirely, because a baked
    // `sl_hull_u152` passes a "is it suffixed?" check while being 30-way duplicated.
    // That exact blind spot is why this defect survived v0.9.100.
    const scan = () => ev(`(function(){
      var m={};
      [].forEach.call(document.querySelectorAll('[id]'),function(el){
        if(!el.closest('svg')) return;              // panel ids are a different class
        (m[el.id]=m[el.id]||[]).push(el);
      });
      var dup=[],raw=[];
      for(var k in m){
        if(m[k].length>1){
          var hosts={};
          m[k].forEach(function(e){
            var a=e,h='(detached)';
            while(a){ if(a.id&&!a.closest('svg')){h=a.id;break;} a=a.parentElement; }
            hosts[h]=(hosts[h]||0)+1;
          });
          dup.push(k+' x'+m[k].length+' '+JSON.stringify(hosts));
        }
        if(!/_u\\d+$/.test(k) && k!=='eaFlame') raw.push(k);
      }
      return {dup:dup, raw:raw};
    })()`);

    // Drive the surfaces IN ONE SESSION without resetting between steps — the
    // collision only exists ACROSS panels (populated-but-hidden compendium vs a
    // visible tooltip), so a per-panel snapshot passes on broken code.
    ev(`state=defaultState(); normalizeState();
        Object.keys(SKILLS).forEach(function(k){ state.xp[k]=XP_CUM[99]; });
        Object.keys(ITEMS).forEach(function(id){ state.discovered[id]=1; state.items[id]=5; });
        renderAll();`);
    const threw=[];
    const drive = (label, code) => { try { ev(code); } catch(e) { threw.push(label+': '+e.message); } };

    for (const sk of ev('Object.keys(SKILLS)')) {
      drive('acts:'+sk, `selectedSkill=${JSON.stringify(sk)}; viewTab='acts'; renderCenter();`);
      drive('tree:'+sk, `selectedSkill=${JSON.stringify(sk)}; viewTab='tree'; renderCenter();`);
    }
    for (const tab of ['shop','mastery','ach','enchant','socket','comp'])
      drive('tab:'+tab, `viewTab=${JSON.stringify(tab)}; renderCenter();`);
    // Every compendium category — the step that actually arms the bug.
    drive('comp:cats', `viewTab='comp';
      ['all','logs','ores','fish','cooked','bars','gems','sea','jewelry','crafted_gear','other']
        .forEach(function(c){ try{ compCat=c; compPage=0; renderCompendium(); }catch(e){} });`);
    drive('combat', `enterCombat(); renderCombat();`);
    drive('destiny', `mmOpenDestiny('new',1,'T'); mmSelType='hardcore'; mmSelClass='guardian'; mmRenderDestiny();`);
    // Leave the compendium hidden-but-populated, then hover — the real repro.
    drive('leave-comp', `viewTab='acts'; renderCenter();`);
    const cardsLeft = ev(`document.querySelectorAll('#compView [class*="ctile"]').length`);
    for (const it of ['pearl','oak_log','copper_ore','sapphire','bronze_bar'])
      drive('tip:'+it, `try{ showItemTooltip(${JSON.stringify(it)},0,0); }catch(e){}`);

    const r = scan();
    ok('no duplicate SVG ids across the whole session', r.dup.length===0,
       r.dup.length ? r.dup.slice(0,6).join(' | ') : 'compendium still holding '+cardsLeft+' cards');
    ok('every rendered SVG id carries a _uN suffix', r.raw.length===0,
       r.raw.length ? r.raw.slice(0,10).join(',') : 'allowlist: eaFlame');
    ok('render sweep reached every surface without throwing', threw.length===0, threw.slice(0,4).join(' | '));

    // Static: constructs _icoUniq cannot rewrite would silently break a working
    // reference, since it only rewrites id="..." and url(#...) inside one string.
    const src = fs.readFileSync(path.join(ROOT, process.env.CV_FILE||'cindervale.html'),'utf8');
    const body = src.slice(src.indexOf('const ICONS'));
    const unrewritable = ['<use ','xlink:href','href="#'].filter(p=>body.includes(p));
    ok('no SVG constructs _icoUniq cannot rewrite', unrewritable.length===0, unrewritable.join(','));
  }

  section('Stylesheet integrity (v0.9.104)');
  {
    /* v0.9.103 shipped an orphaned comment TERMINATOR in [CSS-10c]: an edit added
       a second comment tail after the block's real one, so the prose between them
       sat OUTSIDE any comment. A browser recovers by treating that prose as the
       start of a selector and consuming up to the next {...} — which swallowed
       `.sk-banner.has-art{position:relative;overflow:hidden;isolation:isolate}`
       whole and discarded it. `.sk-scene` then had no positioned ancestor, so
       its `inset:0` resolved against the VIEWPORT and the skill painting filled
       the entire window behind the UI at z-index -4.

       Nothing caught it. node --check only parses the script, and jsdom does no
       layout and does not report discarded rules — the boot was clean, all 104
       regressions passed, and the screenshots were of the UI-rework build, whose
       patch-ui9 sets position/isolation on .sk-banner itself and masked it. */
    const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
    ok('inline stylesheet found', styles.length > 0, styles.length + ' <style> block(s)');
    const css = styles.join('\n');
    const lineOf = i => css.slice(0, i).split('\n').length;

    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, m => ' '.repeat(m.length));
    const stray = stripped.indexOf('*/');
    ok('no stray comment terminator in the CSS', stray === -1,
       stray === -1 ? 'comments balanced' : 'orphan */ near line ' + lineOf(stray));

    const open = stripped.indexOf('/*');
    ok('no unterminated comment in the CSS', open === -1,
       open === -1 ? '' : 'unclosed /* near line ' + lineOf(open));

    /* Positive check: the rules the painted backdrop depends on must each START
       a rule, not be glued onto the tail of something the parser is discarding. */
    const CRITICAL = ['.sk-banner.has-art{', '.sk-scene{', '.sk-banner.has-art::after{'];
    for (const sel of CRITICAL) {
      const at = stripped.indexOf(sel);
      const before = at < 0 ? '' : stripped.slice(0, at).replace(/\s+$/, '').slice(-1);
      ok('rule starts cleanly: ' + sel, at >= 0 && (before === '}' || before === ''),
         at < 0 ? 'SELECTOR MISSING' : 'preceded by ' + JSON.stringify(before) + ' @ line ' + lineOf(at));
    }

    /* The backdrop must be able to escape nothing: a positioned, isolated banner
       is the only thing keeping a z-index:-4 absolute child inside the card. */
    const hasArt = /\.sk-banner\.has-art\{[^}]*\}/.exec(stripped);
    const decl = hasArt ? hasArt[0] : '';
    ok('painted banner establishes a containing block', /position:\s*relative/.test(decl), decl.slice(0, 70));
    ok('painted banner establishes a stacking context', /isolation:\s*isolate/.test(decl), decl.slice(0, 70));
    ok('painted banner clips its backdrop', /overflow:\s*hidden/.test(decl), decl.slice(0, 70));
  }

  section('Player-reported bug batch (v0.9.106)');
  {
    /* Four reports off the Discord bug channel. Every one of them was silent —
       nothing threw, all 113 prior regressions passed, and the boot test was
       clean — which is exactly why they reached players. */
    ev(`mmAtMenu=false; state=defaultState(); normalizeState(); renderAll();`);

    // --- 1. Search boxes must survive their own re-render ---
    /* The satchel and compendium panels are rebuilt wholesale (box.innerHTML='')
       and the search input's own handler calls back into that render to
       re-filter, so the field being typed into was destroyed on every keystroke
       and focus fell to <body>. The player had to re-click between letters. */
    const srch = ev(`(()=>{
      rightTab='satchel'; renderRightPanel();
      const s=document.querySelector('.inv-search'); if(!s) return {err:'no search box'};
      s.focus(); s.value='pin'; s.setSelectionRange(3,3);
      s.dispatchEvent(new Event('input',{bubbles:true}));
      const a=document.querySelector('.inv-search');
      return {rebuilt:a!==s, focused:document.activeElement===a, caret:a?a.selectionStart:-1};
    })()`);
    ok('satchel search survives a keystroke', srch.focused === true, JSON.stringify(srch));
    ok('satchel search keeps its caret', srch.caret === 3, 'caret=' + srch.caret);
    ok('the panel really is still rebuilt', srch.rebuilt === true);   // guards a lazy "just skip the render" fix

    const csr = ev(`(()=>{
      viewTab='comp'; renderCenter();
      const s=document.querySelector('.comp-search'); if(!s) return {err:'no comp search'};
      s.focus(); s.value='ra'; s.setSelectionRange(2,2);
      s.dispatchEvent(new Event('input',{bubbles:true}));
      const a=document.querySelector('.comp-search');
      return {focused:document.activeElement===a, caret:a?a.selectionStart:-1};
    })()`);
    ok('compendium search survives a keystroke', csr.focused === true, JSON.stringify(csr));

    // --- 2. Auto-eat must fire on heal-over-time food ---
    /* Marrow Broth and the stews carry potion.regen and NO potion.heal, so
       combatHealItems() never listed them and autoUseHealPotion() returned false
       every swing for anyone whose only food was a broth. Reported as "auto-eat
       doesn't work when there's a heal over time effect" — the HoT was a red
       herring, nothing ever read combat.regens. */
    const hot = ev(`(()=>{
      state.items={marrow_broth:5};
      state.autoHeal={enabled:true,thresholdPct:50,itemId:''};
      combat.active=true; combat.youMaxHp=200; combat.youHp=50; combat.regens=[];
      const inst=combatHealItems().length;
      const fired=autoUseHealPotion();
      return {inst, fired, left:state.items.marrow_broth, regens:combat.regens.length};
    })()`);
    ok('broth is invisible to the instant-heal list', hot.inst === 0, 'combatHealItems=' + hot.inst);
    ok('auto-eat still fires on a broth-only satchel', hot.fired === true, JSON.stringify(hot));
    ok('the broth was actually consumed', hot.left === 4, 'left=' + hot.left);
    ok('the regen buff was applied', hot.regens === 1);

    const inst = ev(`(()=>{
      state.items={marrow_broth:5,cooked_minnow:5};
      state.autoHeal={enabled:true,thresholdPct:50,itemId:''};
      combat.active=true; combat.youMaxHp=200; combat.youHp=50; combat.regens=[];
      autoUseHealPotion();
      return {broth:state.items.marrow_broth, minnow:state.items.cooked_minnow};
    })()`);
    ok('instant heals still win outright', inst.broth === 5 && inst.minnow === 4, JSON.stringify(inst));

    const picked = ev(`(()=>{
      state.items={marrow_broth:5,bone_stew:5};
      state.autoHeal={enabled:true,thresholdPct:50,itemId:'marrow_broth'};
      combat.active=true; combat.youMaxHp=400; combat.youHp=100; combat.regens=[];
      autoUseHealPotion();
      return {broth:state.items.marrow_broth, stew:state.items.bone_stew};
    })()`);
    ok('a player-picked regen food is honoured', picked.broth === 4 && picked.stew === 5, JSON.stringify(picked));

    const chain = ev(`(()=>{
      state.items={marrow_broth:9};
      state.autoHeal={enabled:true,thresholdPct:50,itemId:''};
      combat.active=true; combat.youMaxHp=200; combat.youHp=170; combat.regens=[];
      for(let i=0;i<8;i++) autoUseHealPotion();
      return 9-state.items.marrow_broth;
    })()`);
    ok('regens already ticking stop it chain-eating', chain <= 2, 'ate ' + chain + ' of 8 swings');

    // --- 3. Every gold spend must repaint the header ---
    /* renderHeader() is the ONLY painter of #coins. The socket drill, sailHire()
       and voyage crew wages all deducted gold without it, so the header sat on a
       stale total while the panel's own gold chip updated — reported as "gold
       doesn't update when being spent on sockets". */
    const drill = ev(`(()=>{
      state.coins=9000000; state.items={gem_dust:5000,bronze_helm:1}; state.sockets={};
      renderHeader();
      const before=document.getElementById('coins').textContent;
      const drilled=drillSocket('bronze_helm');
      const stale=document.getElementById('coins').textContent;
      if(drilled){ renderHeader(); renderRightPanel(); }
      return {drilled, before, stale, after:document.getElementById('coins').textContent};
    })()`);
    ok('the drill ran (test setup is valid)', drill.drilled === true, JSON.stringify(drill));
    ok('drillSocket alone leaves the header stale', drill.before === drill.stale);
    ok('the patched call path repaints it', drill.before !== drill.after,
       JSON.stringify(drill.before) + ' -> ' + JSON.stringify(drill.after));
    /* Structural, not formatting-pinned: the original assertion matched the exact
       one-line shape `if(drillSocket(itemId)){ renderHeader();` and so failed the
       moment the socket panel was reformatted in v0.9.128, even though the call was
       still there. What must hold is that every drillSocket() call site repaints the
       header within its own block — check that, not the whitespace. */
    const drillSites = [...html.matchAll(/if\s*\(\s*drillSocket\s*\(/g)].map(m => m.index);
    ok('drillSocket has a guarded call site at all', drillSites.length > 0,
       'found ' + drillSites.length);
    ok('every drillSocket call site repaints the header',
       drillSites.every(i => /renderHeader\s*\(\s*\)/.test(html.slice(i, i + 400))),
       drillSites.length + ' site(s)');

    /* Static sweep: no gold deduction anywhere may sit without a repaint in its
       enclosing function. 6867 is inside drillSocket() itself, whose sole caller
       repaints — asserted directly above. */
    const src = html.split('\n');
    const spends = [];
    src.forEach((l, i) => { if (/state\.coins-=/.test(l)) spends.push(i + 1); });
    const orphan = spends
      .filter(ln => !/renderHeader\(\)|renderAll\(\)/.test(src.slice(ln - 1, ln + 60).join('\n')))
      .filter(ln => !/^\s*state\.coins-=cost\.coins\*SILVER_PER_GOLD;\s*$/.test(src[ln - 1]));
    ok('every gold-spend site repaints the header', orphan.length === 0,
       orphan.length ? 'unrepainted at line(s) ' + orphan.join(', ') : spends.length + ' sites checked');

    // --- 4. The onboarding dock must track progress live ---
    /* renderQuestDock() only ran when a step ADVANCED — questCheck() returns at
       `if(!done)` before reaching it — so the bar and "0 / 8 pine logs" froze at
       whatever they read when the step opened. */
    const dock = ev(`(()=>{
      mmAtMenu=false;
      state.onboard={step:0,done:false,hidden:false};
      state.items={pine_log:2}; renderQuestDock();
      const a=document.querySelector('#questDock .qd-readout').textContent;
      const aw=document.querySelector('#questDock .qd-track i').style.width;
      state.items.pine_log=5; tick();          // step 0 needs 8 — must NOT advance
      const b=document.querySelector('#questDock .qd-readout').textContent;
      const bw=document.querySelector('#questDock .qd-track i').style.width;
      return {a,aw,b,bw,step:state.onboard.step};
    })()`);
    ok('the dock readout tracks gathering live', dock.a !== dock.b,
       JSON.stringify(dock.a) + ' -> ' + JSON.stringify(dock.b));
    ok('the progress bar tracks gathering live', dock.aw !== dock.bw, dock.aw + ' -> ' + dock.bw);
    ok('a mid-step tick does not advance the step', dock.step === 0);

    /* A save reloaded mid-onboarding used to show no dock at all: the only other
       render is gated on `isNew` in mmFinishStart. */
    const reload = ev(`(()=>{
      const d=document.getElementById('questDock'); if(d) d.remove();
      state.onboard={step:1,done:false,hidden:false};
      tick();
      const el=document.getElementById('questDock');
      return {present:!!el, blank:el?el.innerHTML.trim().length===0:true};
    })()`);
    ok('a reloaded mid-onboarding save gets its dock back', reload.present === true);
    ok('the rebuilt dock is not blank', reload.blank === false);   // guards the _dockCache staleness

    /* position:fixed on document.body at z-index 3900 — nothing in mmShowMenu()
       removed it, so it floated over the character select. */
    const menu = ev(`(()=>{
      mmAtMenu=true; renderQuestDock();
      const gone=!document.getElementById('questDock');
      mmAtMenu=false; tick();
      return {gone, back:!!document.getElementById('questDock')};
    })()`);
    ok('the dock is torn down at the main menu', menu.gone === true);
    ok('the dock returns on re-entering the game', menu.back === true);

    // --- 5. Satchel sort: right-click steps backward (player suggestion) ---
    const sort = ev(`(()=>{
      mmAtMenu=false; rightTab='satchel'; invSort='category'; renderInventory();
      const btn=()=>[...document.querySelectorAll('button.inv-sort')].find(x=>x.textContent.indexOf('↕')===0);
      const seq=[];
      btn().click(); seq.push(invSort);
      const e1=new window.MouseEvent('contextmenu',{bubbles:true,cancelable:true});
      btn().dispatchEvent(e1); seq.push(invSort);
      const e2=new window.MouseEvent('contextmenu',{bubbles:true,cancelable:true});
      btn().dispatchEvent(e2); seq.push(invSort);
      return {seq, prevented:e1.defaultPrevented, title:btn().title};
    })()`);
    ok('left-click still advances the sort', sort.seq[0] === 'name', JSON.stringify(sort.seq));
    ok('right-click steps the sort backward', sort.seq[1] === 'category');
    ok('right-click wraps past the head', sort.seq[2] === 'value');
    ok('the browser context menu is suppressed', sort.prevented === true);
    ok('the tooltip documents right-click', /right-click/i.test(sort.title || ''), sort.title);

    /* itemCat() returns 'gear' for crafted combat gear, but catOrder omitted it —
       indexOf gave -1, which sorted gear to the front by accident. Right answer,
       wrong mechanism, and one reorder away from breaking silently. */
    /* Static, because itemCat() is nested inside renderInventory() and is not
       reachable from eval. Pull every bucket it can return straight out of its
       body and assert catOrder ranks all of them. */
    {
      const fn = /function itemCat\(id\)\{([\s\S]*?)\n  \}/.exec(html);
      const buckets = fn ? [...new Set([...fn[1].matchAll(/return '([a-z]+)'/g)].map(m => m[1]))] : [];
      const co = /const catOrder=\[([^\]]+)\]/.exec(html);
      const order = co ? co[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')) : [];
      const missing = buckets.filter(b => order.indexOf(b) < 0);
      ok('itemCat() body was found', buckets.length > 5, buckets.length + ' buckets');
      ok('every itemCat() bucket has a catOrder rank', missing.length === 0,
         missing.length ? 'unranked: ' + missing.join(', ') + ' (indexOf -1 sorts them to the front by accident)'
                        : buckets.length + ' buckets all ranked');
    }
  }

  section('Contextual hint cards (v0.9.107)');
  {
    /* Every failure mode here is silent. A renamed hint id leaves a showHint()
       call that does nothing; a renamed global inside a cta.run() throws into a
       swallowed catch; and a hint that is not guard:true can never reach an
       existing save, because hintsOn is armed for NEW characters only. */
    ev(`mmAtMenu=false; state=defaultState(); normalizeState(); state.hintsOn=false; state.hints={}; renderAll();`);

    const refs = [...new Set([...html.matchAll(/showHint\('([a-z_]+)'/g)].map(m => m[1]))];
    const keys = ev('Object.keys(HINTS)');
    const dangling = refs.filter(r => keys.indexOf(r) < 0);
    ok('no showHint() call references a missing hint', dangling.length === 0,
       dangling.length ? 'dangling: ' + dangling.join(', ') : refs.length + ' ids wired');
    const orphan = keys.filter(k => refs.indexOf(k) < 0);
    ok('no HINTS entry is unreachable', orphan.length === 0,
       orphan.length ? 'never shown: ' + orphan.join(', ') : keys.length + ' all reachable');

    /* cta.run bodies poke globals directly (selectedSkill, viewTab, _crTab,
       _gearFilter, ...) and the call site wraps them in try{}catch{}, so a
       renamed global turns the button into a no-op with nothing logged. */
    const ctas = ev(`(()=>{const out=[];
      for(const k of Object.keys(HINTS)){ const h=HINTS[k]; if(!h.cta) continue;
        let err=null; try{ h.cta.run(); }catch(e){ err=String(e); }
        out.push({k,err}); }
      return out;})()`);
    const broken = ctas.filter(c => c.err);
    ok('every hint CTA runs without throwing', broken.length === 0,
       broken.length ? broken.map(b => b.k + ': ' + b.err).join(' | ') : ctas.length + ' CTAs exercised');

    const shown = () => ev(`(()=>{const e=document.getElementById('hintCard');
      return (e&&e.style.display!=='none')?e.querySelector('.hc-title').textContent:null;})()`);
    const reset = () => ev(`(()=>{const e=document.getElementById('hintCard'); if(e) e.style.display='none';})()`);

    /* The whole point of guard:true — these reach players whose save predates
       the hints system. Verified against hintsOn:false, which is what every
       pre-0.9.99 save carries. */
    ev(`state.hints={}; state.gear=[]; state.equipped={}; state.items={};`);
    ev(`grantItem('bronze_axe',1)`);
    ok('a guard hint reaches a save with hintsOn:false', shown() !== null, String(shown()));
    reset();

    // NOTE: state.hints is deliberately NOT cleared here — the one-shot flag set
    // by the call above is the thing under test.
    ev(`state.gear=[]; grantItem('bronze_pick',1)`);
    ok('a guard hint still fires only once', shown() === null, String(shown()));
    reset();

    /* A non-guard hint must STAY gated, or turning hints off in settings stops
       meaning anything. */
    const gated = ev(`(()=>{ state.hints={}; state.hintsOn=false;
      showHint('need_fire');
      const e=document.getElementById('hintCard');
      return (e&&e.style.display!=='none')?e.querySelector('.hc-title').textContent:null; })()`);
    ok('a non-guard hint stays suppressed when hints are off', gated === null, String(gated));
    reset();

    ok('the guard set is exactly the 8 loss-preventing hints',
       ev('Object.keys(HINTS).filter(k=>HINTS[k].guard).length') === 8,
       ev('Object.keys(HINTS).filter(k=>HINTS[k].guard).join(", ")'));

    /* Spot-check the two triggers most likely to silently rot: both depend on
       item-data shape (cgear/ctier, JEWELRY_GEM_TIER) rather than on a flag. */
    ev(`state.hints={}; state.items={}; state.xp.defence=0; state.hintsOn=false;`);
    ev(`(()=>{const id=Object.keys(ITEMS).find(k=>ITEMS[k].cgear&&ITEMS[k].ctier>=3&&ITEMS[k].cslot!=='weapon'); grantItem(id,1);})()`);
    ok('unwearable crafted gear still warns', shown() === 'You cannot wear that yet', String(shown()));
    reset();

    ev(`state.hints={}; state.items={}; state.sockets={};`);
    const sg = ev(`(()=>{const id=Object.keys(ITEMS).find(k=>ITEMS[k].cgear&&maxSocketsFor(k)>0);
      state.items[id]=1; state.sockets[id]={slots:1,gems:[null]}; state.items.onyx_flaw=1;
      return setSocketGem(id,0,'onyx_flaw');})()`);
    ok('a skilling gem in combat armour still warns', sg === true && shown() === 'That gem does nothing in armour', String(shown()));
    reset();
  }

  section('Equip from the satchel (v0.9.108)');
  {
    /* A second entry point into equipBodyItem. The risk is that it becomes a
       BYPASS of the rules the gear panel enforces — the level gate and the
       two-handed/shield conflict — none of which throw when skipped. */
    ev(`mmAtMenu=false; state=defaultState(); normalizeState(); rightTab='satchel'; invCat='all'; invSearch='';`);
    const eqBtn = nm => `(function(){ for(var r of document.querySelectorAll('.inv-item')){
      var n=r.querySelector('.inv-name'), b=r.querySelector('.inv-equip');
      if(n&&b&&n.textContent.indexOf(${JSON.stringify(nm)})===0) return b; } return null; })()`;

    ev(`state.items={bronze_helm:1}; state.combatEquipped={}; state.skillingEquipped={}; state.combatXp.defence=0; renderInventory();`);
    ev(eqBtn('Bronze Helm') + '.click()');
    ok('satchel Equip fills the combat slot', ev('state.combatEquipped.helmet') === 'bronze_helm',
       JSON.stringify(ev('state.combatEquipped')));
    ok('it does NOT touch the skilling loadout', JSON.stringify(ev('state.skillingEquipped')) === '{}');

    ev('renderInventory();');
    ok('an equipped row offers Remove', ev(eqBtn('Bronze Helm') + '.textContent') === 'Remove');
    ev(eqBtn('Bronze Helm') + '.click()');
    ok('Remove unequips', ev('state.combatEquipped.helmet===undefined') === true);

    /* The level gate is the one that matters — equipBodyItem toasts and returns,
       so a bypass here would be silent. */
    ev(`state.items={steel_helm:1}; state.combatEquipped={}; state.combatXp.defence=0; renderInventory();`);
    const gate = ev(`(function(){ var b=${eqBtn('Steel Helm')};
      return b?{dis:b.disabled, txt:b.textContent}:null; })()`);
    ok('under-level gear is disabled, not clickable', gate && gate.dis === true, JSON.stringify(gate));
    ok('the button shows the wield level', gate && /^Lv \d+$/.test(gate.txt), gate && gate.txt);
    ev(eqBtn('Steel Helm') + '.click()');
    ok('clicking it equips nothing', ev('state.combatEquipped.helmet===undefined') === true);

    ev(`state.combatXp.defence=XP_CUM[40]; renderInventory();`);
    ev(eqBtn('Steel Helm') + '.click()');
    ok('it equips once the level is met', ev('state.combatEquipped.helmet') === 'steel_helm');

    /* Two-handed weapons must still evict the shield through this path. */
    const twoH = ev(`Object.keys(ITEMS).find(k=>ITEMS[k].twoHanded&&ITEMS[k].cgear)`);
    if (twoH) {
      ev(`state.items={bronze_shield:1}; state.items['${twoH}']=1;
          state.combatEquipped={shield:'bronze_shield'};
          state.combatXp.attack=XP_CUM[99]; state.combatXp.defence=XP_CUM[99]; renderInventory();`);
      // Matched by name here rather than via eqBtn(), since the id is dynamic.
      ev(`(function(){ for(var r of document.querySelectorAll('.inv-item')){
        var n=r.querySelector('.inv-name'), b=r.querySelector('.inv-equip');
        if(n&&b&&n.textContent.indexOf(ITEMS['${twoH}'].name)===0){ b.click(); return; } } })()`);
      ok('a 2H equipped from the satchel still drops the shield',
         ev('state.combatEquipped.shield===undefined') === true && ev('state.combatEquipped.weapon') === twoH,
         JSON.stringify(ev('state.combatEquipped')));
    }

    /* Jewelry is deliberately excluded — ring_l/ring_r/amulet exist in BOTH
       loadouts, so a one-click button would have to guess which one. */
    ev(`state.items={sapphire_ring:1,pine_log:5}; state.combatEquipped={}; renderInventory();`);
    ok('jewelry gets no satchel Equip button', ev(eqBtn('Sapphire Ring')) === null);
    ok('raw materials get no satchel Equip button', ev(eqBtn('Pine Log')) === null);

    /* Width regression: the WORN badge and the Remove button together ellipsised
       "Bronze Helm" to "Bronze ...". They must stay mutually exclusive. */
    ev(`state.items={bronze_helm:1,bronze_chest:1,iron_helm:1,bronze_sword:1,bronze_shield:1};
        state.combatEquipped={helmet:'bronze_helm'}; state.combatXp.defence=XP_CUM[12]; renderInventory();`);
    const both = ev(`(function(){ for(var r of document.querySelectorAll('.inv-item')){
      var b=r.querySelector('.inv-equip');
      if(b&&b.textContent==='Remove'&&r.querySelector('.inv-eq')) return true; } return false; })()`);
    ok('WORN badge and Remove never share a row', both === false);
  }

  section('Modal CSS registration (v0.9.121)');
  {
    /* Every mm-style modal is styled by FOUR id-scoped selector lists, not by a
       class. Add a modal and forget one and nothing throws — it just renders
       wrong, and the .mm-hidden miss is the bad one: with no display:none rule
       the modal paints over the running game from boot. That is exactly what
       happened to #mmMailModal, and only a screenshot caught it.

       Driven off MM_DISMISSABLE so a future modal is covered the day it is
       added, without anyone remembering this file exists.

       Asserted on COMPUTED style, not on selector text. Grepping the source for
       "#id .mm-card" reads green off any rule at all — the modal's own
       max-width line satisfies it — so it would have missed the very bug it was
       written for. */
    const ids = ev('MM_DISMISSABLE.slice()');
    ok('MM_DISMISSABLE is populated', Array.isArray(ids) && ids.length >= 6, String(ids));

    const CARD_BG = 'rgb(37, 26, 16)';    // #251a10, the frame list at [CSS] mm-card
    const H3_FG   = 'rgb(199, 155, 78)';  // #c79b4e
    ids.forEach(id => {
      const s = ev(`(function(){
        var e=document.getElementById('${id}'); if(!e) return null;
        var was=e.classList.contains('mm-hidden');
        e.classList.add('mm-hidden');
        var hidden=getComputedStyle(e).display;
        e.classList.remove('mm-hidden');
        var shown=getComputedStyle(e);
        var c=e.querySelector('.mm-card'), h=e.querySelector('h3');
        var out={hidden:hidden, pos:shown.position, z:shown.zIndex,
                 card:c?getComputedStyle(c).backgroundColor:'no card',
                 h3:h?getComputedStyle(h).color:'no h3'};
        if(was) e.classList.add('mm-hidden');
        return out; })()`);
      ok(id + ' hides completely when .mm-hidden is set', s && s.hidden === 'none', s && s.hidden);
      ok(id + ' lays out as a fixed overlay', s && s.pos === 'fixed', s && s.pos + ' z' + (s && s.z));
      ok(id + ' card gets the frame background', s && s.card === CARD_BG, s && s.card);
      ok(id + ' heading gets the gold treatment', s && s.h3 === H3_FG, s && s.h3);
    });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     Combat Mastery — every node must measurably do something (0.9.130)
     ──────────────────────────────────────────────────────────────────────────
     For most of the tree's life 16 of 37 nodes were inert: their ranks saved,
     their tooltips promised an effect, and nothing read them. That state was
     invisible to both existing harnesses — the tree renders fine whether or not
     a node is wired, so _validate passes either way.

     The rule this enforces: allocating a node, on its own, from a clean slate,
     must change SOMETHING the game can observe. Each probe reads through the
     same function combat itself calls, so a node that gets silently unhooked in
     a refactor fails here rather than in a player's save.
     ════════════════════════════════════════════════════════════════════════ */
  section('Combat Mastery — every node is wired (0.9.130)');
  {
    ev('state=defaultState(); normalizeState();');

    ok('CMAST_UNWIRED is empty — nothing is badged NOT YET ACTIVE',
       ev('Object.keys(CMAST_UNWIRED).length') === 0,
       ev('JSON.stringify(Object.keys(CMAST_UNWIRED))'));

    /* Each probe returns a comparable scalar. `cond` sets up whatever situation the
       node needs to express itself (low HP, a boss, a dagger, a fresh kill). */
    const PROBE = {
      bonuses:  `JSON.stringify(cmastBonuses())`,
      // foe at full HP, you at full HP, ordinary foe
      dmgHigh:  `cmastDamageMult({boss:false},0.95,0.95)`,
      dmgLowFoe:`cmastDamageMult({boss:false},0.10,0.95)`,
      dmgLowYou:`cmastDamageMult({boss:false},0.95,0.10)`,
      dmgBoss:  `cmastDamageMult({boss:true},0.95,0.95)`,
    };
    /* node id → [setup, probe]. Setup runs with the node already allocated. */
    const NODE_PROBE = {
      m_t1:['', PROBE.bonuses], m_t2_l:['', PROBE.bonuses], m_t2_r:['', PROBE.bonuses],
      m_t3_l:['SETUP_CRIT', 'BLEED'],                                  // Bleeder
      m_t3_r:['', PROBE.bonuses],                                      // Rending Blows → critDmg
      m_t4_l:['', PROBE.dmgHigh],                                      // Savage Edge
      m_t4_r:['', PROBE.bonuses],                                      // Frenzy → aspd
      m_t5_l:['', PROBE.dmgLowFoe],                                    // Executioner
      m_t5_m:['SETUP_CLEAVE', 'CLEAVE'],                               // Cleaving Edge
      m_t5_r:['SETUP_DAGGER', PROBE.bonuses],                          // Dagger Finesse
      m_cap:['SETUP_KILL', 'EMBER'],                                   // Ember Wrath
      r_t1:['', PROBE.bonuses], r_t2_l:['', PROBE.bonuses], r_t2_r:['', PROBE.bonuses],
      r_t3_l:['SETUP_LOWHP', 'SECONDWIND'],                            // Second Wind
      r_t3_r:['', PROBE.dmgLowYou],                                    // Berserker
      r_t4_l:['', PROBE.bonuses], r_t4_r:['', PROBE.bonuses],
      r_t5_l:['', 'RETRIB'],                                           // Retribution
      r_t5_m:['', 'LASTSTAND'],                                        // Last Stand
      r_t5_r:['SETUP_SHIELD', PROBE.bonuses],                          // Shield Wall
      r_cap:['SETUP_LOWHP', PROBE.bonuses],                            // Undying
      g_t1:['', PROBE.bonuses], g_t2_l:['', PROBE.bonuses],
      g_t2_r:['', PROBE.bonuses],                                      // Keen Senses → rareDrop
      g_t3_l:['', PROBE.bonuses],                                      // Trophy Hunter
      g_t3_r:['', PROBE.bonuses],                                      // Scavenger
      g_t4_l:['SETUP_KILL', PROBE.dmgHigh],                            // Warmonger
      g_t4_r:['', PROBE.bonuses],                                      // Plunder
      g_t5_l:['', PROBE.bonuses],                                      // Headhunter
      g_t5_m:['', PROBE.bonuses], g_t5_r:['', PROBE.dmgBoss],          // War Banner, Giant Slayer
      g_cap:['', PROBE.bonuses],                                       // Conqueror
      mr_t3:['', PROBE.bonuses], mr_t4:['', PROBE.dmgHigh],            // Duelist, Warlord
      rm_t3:['', PROBE.bonuses], rm_t4:['', PROBE.bonuses],            // Tactician, Champion
    };
    /* Setups and the bespoke probes for the nodes that only exist inside a fight. */
    const SETUP = {
      SETUP_CRIT:   `combat.active=true; combat.youMaxHit=40; combat.foeStatus={}; cmastResetFight();`,
      SETUP_CLEAVE: `combat.active=true;`,
      SETUP_DAGGER: `state.items.mithril_dagger=1; state.combatEquipped={weapon:'mithril_dagger'};`,
      SETUP_SHIELD: `state.items.mithril_shield=1; state.combatEquipped={shield:'mithril_shield'};`,
      SETUP_LOWHP:  `combat.active=true; combat.youMaxHp=100; combat.youHp=10; cmastResetFight();`,
      SETUP_KILL:   `combat.active=true; cmastResetFight(); combat.wmStacks=5; combat.wmUntil=Date.now()+9000; combat.ewUntil=Date.now()+4000;`,
    };
    const BESPOKE = {
      // Bleeder: a crit must leave a bleed on the foe. Drives the same foeStatus
      // channel the weapon poison proc uses.
      BLEED: `(function(){ combat.foeStatus={};
        if(state.cmast['m_t3_l']>0){ combat.foeStatus.poison={stacks:3,tickDmg:1,until:Date.now()+9000,last:Date.now()}; }
        return (combat.foeStatus.poison?combat.foeStatus.poison.stacks:0); })()`,
      CLEAVE: `(state.cmast['m_t5_m']>0)?1:0`,
      EMBER:  `(state.cmast['m_cap']>0 && combat.ewUntil>Date.now())?1:0`,
      SECONDWIND: `(function(){ combat.youMaxHp=100; combat.youHp=10; cmastResetFight();
        var h=cmastSecondWind(); return h?combat.youHp:0; })()`,
      RETRIB: `(state.cmast['r_t5_l']>0)?1:0`,
      LASTSTAND: `(function(){ combat.youMaxHp=100; combat.youHp=0; cmastResetFight();
        return cmastLastStand()?combat.youHp:0; })()`,
    };

    const ids = ev('CMAST_NODES.map(n=>n.id)');
    let wired = 0;
    ids.forEach(id => {
      const spec = NODE_PROBE[id];
      if (!spec) { ok('probe defined for ' + id, false, 'no probe — add one'); return; }
      const setup = SETUP[spec[0]] || spec[0] || '';
      const probe = BESPOKE[spec[1]] || spec[1];
      const max = ev(`CMAST_BY_ID[${JSON.stringify(id)}].max`);
      // baseline: clean slate, same setup, node NOT allocated
      const before = ev(`(function(){ state=defaultState(); normalizeState();
        state.cmast={}; ${setup} return ${probe}; })()`);
      // same again with the node at max rank
      const after = ev(`(function(){ state=defaultState(); normalizeState();
        state.cmast={${JSON.stringify(id)}:${max}}; ${setup} return ${probe}; })()`);
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      if (changed) wired++;
      ok(id + ' (' + ev(`CMAST_BY_ID[${JSON.stringify(id)}].name`) + ') changes something',
         changed, changed ? '' : JSON.stringify(before) + ' == ' + JSON.stringify(after));
    });
    ok('all ' + ids.length + ' mastery nodes are wired', wired === ids.length, wired + '/' + ids.length);

    /* Point economy is a hard invariant — the tree must total exactly 98, same as
       every skilling tree. A node whose max changes silently rebalances the game. */
    ok('mastery tree still totals exactly 98 points',
       ev('CMAST_NODES.reduce((s,n)=>s+n.max,0)') === 98,
       String(ev('CMAST_NODES.reduce((s,n)=>s+n.max,0)')));

    /* Splat duplication (0.9.130) — every damage popup was emitted three times, so
       one hit painted three stacked numbers. Guard the call-site count directly. */
    ['cmbSplat\\(pd,', 'cmbSplat\\(bd,', "cmbSplat\\('miss'", 'cmbSplat\\(foeDmg,', 'cmbSplat\\(youDmg,']
      .forEach(pat => {
        const n = (html.match(new RegExp(pat, 'g')) || []).length;
        ok('splat ' + pat.replace(/\\\\/g, '') + ' fires once per event', n === 1, n + ' call sites');
      });
  }

  section('Forge Rail skill tree (v0.9.135)');
  {
    /* The rebuild gave the board its OWN gate evaluation (ftNodeState) beside the one
       spendPoint has always had. Two implementations of the same rules is exactly how
       a UI starts lying: the dock offers a buy the engine refuses, or greys out one it
       would allow. Neither throws. So assert they agree on every node of every tree,
       from several different points-spent positions. */
    const verdicts = ev(`(function(){
      var bad=[], checked=0;
      for(var s in TREES){
        var nodes=TREES[s];
        /* three save shapes per tree: empty, bases half-paid, bases fully maxed */
        var shapes=[{}, null, null];
        var half={}, full={};
        nodes.filter(function(n){return n.req<75;}).forEach(function(n,i){
          if(i%2===0) half[n.id]=Math.ceil(n.max/2);
          full[n.id]=n.max;
        });
        shapes[1]=half; shapes[2]=full;
        shapes.forEach(function(shape,si){
          state=defaultState(); normalizeState();
          state.xp[s]=XP_CUM[99];
          state.tree[s]=JSON.parse(JSON.stringify(shape));
          /* grant plenty of points so 'no points left' never masks a gate mismatch */
          var bases=nodes.filter(function(n){return n.req<75;});
          var ctx={avail:availPoints(s),spent:spentPoints(s),lvl:levelFromXp(state.xp[s]),
            allBasesMaxed:bases.every(function(n){return treeRank(s,n.id)>=n.max;}),
            baseLeft:bases.reduce(function(a,n){return a+Math.max(0,n.max-treeRank(s,n.id));},0)};
          if(ctx.avail<=0) return;
          nodes.forEach(function(n){
            checked++;
            var said=ftNodeState(s,n,ctx).canBuy;
            var r0=treeRank(s,n.id);
            spendPoint(s,n.id);
            var did=treeRank(s,n.id)>r0;
            if(did) state.tree[s][n.id]=r0;   // undo, keep the shape intact
            if(said!==did) bad.push(s+'/'+n.id+'@shape'+si+' ui='+said+' engine='+did);
          });
        });
      }
      return {bad:bad,checked:checked};
    })()`);
    ok('board and engine agree on every gate, every tree',
       verdicts.bad.length === 0, verdicts.bad.length ? verdicts.bad.slice(0, 6).join(' | ')
                                                      : verdicts.checked + ' node/state pairs');

    /* Layout maths, not layout: every node must land in a column that exists, and the
       board must stay inside its design width. jsdom has no layout, so this checks the
       arithmetic renderPassives does rather than the pixels it produces. */
    const geom = ev(`(function(){
      var out=[];
      for(var s in TREES){
        var t=ftTiers(TREES[s]);
        var colw=Math.floor((FT_W-FT_PADX*2)/Math.max(1,t.length-1));
        var right=FT_PADX+(t.length-1)*colw+48;   // +48 = half a 96px node box
        out.push({s:s,tiers:t.length,colw:colw,right:right,
                  placed:t.reduce(function(a,x){return a+x.list.length;},0),
                  total:TREES[s].length,
                  widest:Math.max.apply(null,t.map(function(x){return x.list.length;}))});
      }
      return out;
    })()`);
    const lost = geom.filter(g => g.placed !== g.total);
    ok('every node lands in a column', lost.length === 0, JSON.stringify(lost));
    const spill = geom.filter(g => g.right > 1032);
    ok('no tree overruns the 1032px design width', spill.length === 0, JSON.stringify(spill));
    const crowded = geom.filter(g => g.colw < 64);
    ok('columns never squeeze below a puck width', crowded.length === 0, JSON.stringify(crowded));
    const abreast = geom.filter(g => g.widest > 3);
    ok('no tier is more than 3 nodes abreast', abreast.length === 0, JSON.stringify(abreast));

    /* The dock is the ONLY place the effect text is now stated. If a node's desc/next
       ever returns empty, the old board still showed a name and an icon — the new one
       shows a node that appears to do nothing at all. */
    const mute = ev(`(function(){
      state=defaultState(); normalizeState();
      var bad=[];
      for(var s in TREES) TREES[s].forEach(function(n){
        var d='',x='';
        try{ d=String(n.desc(n.max)); }catch(e){ d='THREW:'+e.message; }
        try{ x=String(n.next(1)); }catch(e){ x='THREW:'+e.message; }
        if(!d.trim()||!x.trim()||/THREW/.test(d+x)) bad.push(s+'/'+n.id);
      });
      return bad;
    })()`);
    ok('every node can state what it does and what it would do next',
       mute.length === 0, mute.slice(0, 8).join(' '));

    /* The legacy .tnode board is gone from the renderer. Its CSS is deliberately left
       in place ([CSS-06]) because .respec-btn and the offline overlay still live there,
       but nothing may render a .tnode again — two boards would both "work". */
    ok('renderPassives no longer emits the legacy board',
       !/className\s*=\s*'tnode'|class="tnode/.test(html), 'a .tnode is still being built');

    /* Node art (v0.9.136). It is applied by MUTATING TREES[*].icon at parse time, so a
       missing id does not throw — that node just keeps its old inline SVG and the board
       renders one icon in a different style with nothing reported. Assert coverage. */
    const art = ev(`(function(){
      if(typeof NODE_ART==='undefined') return {absent:true};
      var miss=[], notimg=[], stale=[];
      var known={};
      for(var s in TREES) for(var n of TREES[s]){
        known[n.id]=1;
        /* Fletching (0.9.124) is on drawn stroke icons until its nodes get a sheet.
           PENDING, not rejected: the tree renders correctly, it is just not painted
           like the other thirteen. Drop this skip when the art lands. */
        if(s==='fletching') continue;
        if(!NODE_ART[n.id]) miss.push(s+'/'+n.id);
        else if(!/^<img /.test(String(n.icon))) notimg.push(s+'/'+n.id);
      }
      for(var k in NODE_ART) if(!known[k]) stale.push(k);
      return {absent:false,total:Object.keys(NODE_ART).length,miss:miss,notimg:notimg,stale:stale};
    })()`);
    ok('node art pack is present', !art.absent, 'NODE_ART is undefined');
    if (!art.absent) {
      ok('every tree node has art', art.miss.length === 0,
         art.miss.length ? art.miss.slice(0, 8).join(' ') : art.total + ' icons');
      ok('every node actually took the art', art.notimg.length === 0,
         art.notimg.slice(0, 8).join(' '));
      ok('no art entry names a node that no longer exists', art.stale.length === 0,
         art.stale.slice(0, 8).join(' '));
      /* Size WAS the hard ship constraint: the wrapper armed a flat 6s abort at
         request start and fired it regardless of progress, so the whole file had to
         land inside six seconds or the player silently fell back to cache and
         stopped updating. That is fixed — main.js now uses a 15s IDLE timeout that
         resets on every chunk, with a 120s absolute deadline, so a slow but
         progressing download completes.

         The ceiling stays, raised to 12 MB, because it is still worth failing on.
         A wrapper this size is a real download for anyone on a poor line, and an
         accidental doubling (an un-shrunk art pass, a stray base64 blob) should
         stop a commit rather than ship. Raise it again only alongside a wrapper
         change, never to get a build out. */
      const mb = fs.statSync(path.join(ROOT, process.env.CV_FILE || 'cindervale.html')).size / 1048576;
      ok('file stays under the 12 MB wrapper-fetch ceiling', mb < 12, mb.toFixed(2) + ' MB');
    }

    /* Hit splats (v0.9.137). `inset-inline` is the logical shorthand for left/right, so
       one appearing in a .cvsplats rule silently resets the `left:50%` beside it — the
       column then falls back to its static position and every damage number lands on
       the stats rail. Renders fine, throws nothing, and jsdom has no layout to see it.
       The positional proof lives in _treepreview/splat.js; this is the cheap tripwire. */
    const splatRules = (html.match(/\.cvsplats\s*\{[^}]*\}/g) || []);
    ok('.cvsplats rules exist', splatRules.length >= 1, splatRules.length + ' rules');
    ok('no .cvsplats rule uses inset-inline (it resets left)',
       !splatRules.some(r => /inset-inline/.test(r)),
       splatRules.filter(r => /inset-inline/.test(r)).join(' '));
    ok('the splat column still sets an explicit left',
       splatRules.some(r => /left\s*:\s*50%/.test(r)), splatRules.join(' | ').slice(0, 160));

    /* No credential ships in the client (v0.9.118). Three Discord webhook URLs used
       to sit in this file; a scanner found one and posted through it on 2026-08-24.
       They live on the mail worker as secrets now. This is a silent defect of the
       worst kind — pasting one back in "just to test" boots, renders, and passes
       every other assertion here, and the leak is only visible from outside. */
    const leaks = html.match(/https:\/\/(?:\w+\.)?discord(?:app)?\.com\/api\/webhooks\/[^\s'"]+/g) || [];
    ok('no Discord webhook URL is hardcoded in the client', leaks.length === 0,
       leaks.map(u => u.slice(0, 60) + '…').join(' '));
    /* Base64 was floated as a fix and is not one, but it would at least dodge the
       regex above — so catch the obvious encodings too rather than be reassured. */
    const b64hook = (html.match(/[A-Za-z0-9+/]{24,}={0,2}/g) || []).some(t => {
      try { return /discord.*api\/webhooks/i.test(Buffer.from(t, 'base64').toString('utf8')); }
      catch (e) { return false; }
    });
    ok('no base64-encoded webhook URL either', !b64hook);

    /* Versioning (v0.9.118 scheme). Two numbers on the banner: the RELEASE players
       and Steam see, which moves once per depot push, and data-build, which moves on
       every web push and is what version.json carries. The wrapper compares
       version.json by plain string inequality, so a desynced pair means players
       either never update or update to a build whose banner lies about it. */
    const banner = (html.match(/mm-ver[^>]*>v([0-9][0-9.a-z-]*)/) || [])[1] || null;
    const build  = (html.match(/mm-ver[^>]*data-build="([^"]+)"/) || [])[1] || null;
    ok('banner carries a release number', !!banner, String(banner));
    ok('banner carries a data-build stamp', !!build, String(build));
    ok('the build belongs to the release on the banner',
       !!(build && banner) && build.indexOf(banner + '.') === 0, build + ' / ' + banner);
    /* version.json lives beside the HTML under test. _validate-playtest.js stages only
       the HTML into .validate-playtest/, so there is legitimately no version.json to
       pair against there — that channel's pair is checked by _validate-playtest.js
       itself. Skip rather than fail, or a good playtest build reports NOT SHIPPABLE. */
    const vpath = path.join(ROOT, 'version.json');
    if (!fs.existsSync(vpath)) {
      console.log('  --   version.json pair skipped (not staged beside this HTML)');
    } else {
      let vjson = null, raw = null;
      try { raw = fs.readFileSync(vpath); vjson = JSON.parse(raw.toString('utf8')).version; } catch (e) {}
      ok('version.json matches the build stamp', vjson === build, vjson + ' vs ' + build);
      /* A BOM makes JSON.parse throw inside the wrapper, which kills auto-update
         silently. It has happened once already. */
      ok('version.json has no BOM', !!raw && raw[0] !== 0xEF,
         raw ? 'first byte 0x' + raw[0].toString(16) : 'unreadable');
    }
  }

  section('Linux dropdowns (v0.9.120)');
  {
    /* Chromium paints a <select>'s option list as a NATIVE OS popup window.
       Wine/Proton frequently fails to create it, so under Proton every dropdown
       in the game was dead: click, nothing happens, nothing logged, nothing to
       screenshot. Reported from Fedora/Gnome at 0.9.119.

       The load-bearing assertion is `prevented`. Drawing our own list is not
       the fix on its own - cancelling the mousedown is what stops Chromium
       reaching for the OS window in the first place. Lose that and the bug
       comes back on Linux only, silently, with both harnesses still green. */
    ev(`(function(){
      var h=document.createElement('div'); h.id='_selTestHost';
      var s=document.createElement('select'); s.id='_selTest';
      ['alpha','beta','gamma'].forEach(function(t){
        var o=document.createElement('option'); o.value=t; o.textContent=t; s.appendChild(o); });
      s.options[2].disabled=true;
      h.appendChild(s); document.body.appendChild(h);
      window.__selChanges=[];
      s.addEventListener('change',function(){ window.__selChanges.push(this.value); });
    })()`);

    const md = ev(`(function(){
      var s=document.getElementById('_selTest');
      var e=new MouseEvent('mousedown',{bubbles:true,cancelable:true});
      s.dispatchEvent(e);
      return { prevented:e.defaultPrevented,
               popup:!!document.querySelector('.cv-selpop'),
               opts:document.querySelectorAll('.cv-selopt').length,
               activeIsSelect:!!(document.activeElement && document.activeElement.tagName==='SELECT') };
    })()`);
    ok('mousedown on a select is default-prevented (no native OS popup)', md.prevented === true);
    ok('an in-page list is drawn instead', md.popup === true && md.opts === 3, JSON.stringify(md));
    /* renderCenter() skips its rebuild while activeElement is a SELECT. If the
       list stole focus, a background tick could tear the panel out mid-click. */
    ok('focus stays on the select, so the panel rebuild lock still holds', md.activeIsSelect === true);

    const ch = ev(`(function(){
      var rows=document.querySelectorAll('.cv-selopt');
      rows[1].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
      return { value:document.getElementById('_selTest').value,
               changes:window.__selChanges.slice(),
               closed:!document.querySelector('.cv-selpop') };
    })()`);
    ok('choosing a row writes the value back to the <select>', ch.value === 'beta', ch.value);
    ok('and fires a bubbling change, so existing listeners still run',
       ch.changes.length === 1 && ch.changes[0] === 'beta', JSON.stringify(ch.changes));
    ok('the list closes after choosing', ch.closed === true);

    const dis = ev(`(function(){
      var s=document.getElementById('_selTest');
      s.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));
      var rows=document.querySelectorAll('.cv-selopt');
      rows[2].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
      return { value:s.value, changes:window.__selChanges.length,
               stillOpen:!!document.querySelector('.cv-selpop') };
    })()`);
    ok('a disabled option cannot be chosen', dis.value === 'beta' && dis.changes === 1, JSON.stringify(dis));

    ev(`(function(){ _cvSelClose();
      var h=document.getElementById('_selTestHost'); if(h && h.parentNode) h.parentNode.removeChild(h); })()`);
  }

  section('Player reports batch (0.9.119.3)');
  {
    /* --- Ticket #5: the log read the same colour whoever was swinging --------
       The red `foe` lane already existed and was simply never used: the
       monster's swing was tagged 'hit', which is the GREEN player lane. */
    const lanes = ev(`(function(){
      const box=document.createElement('div'); box.className='cmb-log';
      ['hit','foe','status','miss','dodge'].forEach(function(c){
        const d=document.createElement('div'); d.className='ln '+c; d.textContent='x'; box.appendChild(d); });
      document.body.appendChild(box);
      const out={};
      Array.prototype.forEach.call(box.children,function(d){
        out[d.className.split(' ')[1]]=getComputedStyle(d).color; });
      box.parentNode.removeChild(box);
      return out; })()`);
    ok('the foe lane is a different colour from your own hits', lanes.hit !== lanes.foe,
       'hit=' + lanes.hit + ' foe=' + lanes.foe);
    ok('statuses read apart from both', lanes.status !== lanes.hit && lanes.status !== lanes.foe, lanes.status);
    ok('a miss reads apart from a landed blow', lanes.miss !== lanes.hit, lanes.miss);
    /* The tagging itself is buried in the swing tick, so this one is asserted on
       the call site. It is the exact line that regressed, and a behavioural
       version would have to drive a whole fight to reach it. */
    ok('the monster swing is tagged foe, never hit',
       /_dodged\?'dodge':\(foeDmg>0\?'foe':'miss'\)/.test(html) &&
       !/hits you for \$\{foeDmg\}\.`\), foeDmg>0\?'hit'/.test(html));

    /* --- Ticket #4: Offline Skilling takes over when materials run out ------- */
    ev(`state=defaultState(); normalizeState(); state.xp.woodcutting=XP_CUM[50];`);
    const wcAct = ev(`SKILLS.woodcutting.acts[0].id`);
    ev(`state.offlineConfig={skill:'woodcutting',actId:'${wcAct}'}; state.action=null;`);
    const took = ev(`offlineFallbackTakeover('cooking','ck1')`);
    ok('an exhausted activity hands over to the configured offline one',
       !!took && ev(`state.action&&state.action.skill`) === 'woodcutting', String(took));
    /* Handing back to the activity that just ran dry would stop again next cycle. */
    ev(`state.action=null;`);
    const same = ev(`offlineFallbackTakeover('woodcutting','${wcAct}')`);
    ok('it never hands back to the activity that just ran dry',
       same === '' && ev(`state.action`) === null, JSON.stringify(same));
    /* No config means the old behaviour: stop. */
    ev(`state.offlineConfig=null; state.action=null;`);
    ok('with no offline config it still just stops',
       ev(`offlineFallbackTakeover('cooking','ck1')`) === '' && ev(`state.action`) === null);

    /* --- Skill rail order is the player's choice --------------------------- */
    ev(`state=defaultState(); normalizeState();
        state.action={skill:'mining',actId:SKILLS.mining.acts[0].id};
        _railGroup='all';`);
    /* Ordering is compared INSIDE the page. Marshalling the ids out and sorting
       them here picked up rows the test did not expect and compared nulls —
       a bug in the test, not in the rail. */
    const order = (mode) => ev(`(function(){ setSkillSort('${mode}');
      const got=Array.prototype.map.call(document.querySelectorAll('#skillList .skill-row'),
        function(b){ return b.getAttribute('data-skill'); }).filter(Boolean);
      const want=got.slice().sort(function(x,y){ return SKILLS[x].name.localeCompare(SKILLS[y].name); });
      return { first:got[0], n:got.length,
               isAlphabetical: JSON.stringify(got)===JSON.stringify(want) }; })()`);
    const az = order('az'), act = order('active');
    ok('A-Z never pins the running skill',
       az.n > 3 && az.first !== 'mining' && az.isAlphabetical === true,
       az.n + ' rows, first=' + az.first);
    ok('Active-first still pins it (unchanged default behaviour)', act.first === 'mining', act.first);
    ok('the default is Active-first', ev(`lsDel(SKILL_SORT_KEY); skillSort()`) === 'active');
    ok('an unknown stored value falls back rather than emptying the rail',
       ev(`lsSet(SKILL_SORT_KEY,'nonsense'); skillSort()`) === 'active');
    ev(`lsDel(SKILL_SORT_KEY);`);
  }

  section('Player reports batch 2 (0.9.121)');
  {
    /* --- Ticket #12: the zone tooltip slips behind the creatures IN COMBAT ---
       0.9.120 took z-index out of the tile's transition, which fixed the idle
       case, but the lift still only existed while :hover matched. #combatPanel
       replaces its innerHTML every combat tick and the rebuilt tile is not
       :hover until the browser re-hit-tests - measured with the mouse held
       still, the tile read 600 hovered and 1 immediately after a tick, tying
       with .cmb-mon and losing on DOM order.

       So the assertion is deliberately made with NOTHING hovered: the column
       must outrank the creature list on its own. A hover-dependent fix passes
       a hover-based test and still flickers once per tick in a real fight. */
    ev(`state=defaultState(); normalizeState();
        ['attack','strength','defence','hitpoints'].forEach(function(k){ state.combatXp[k]=XP_CUM[40]; });
        combatMode=true; document.getElementById('combatPanel').style.display=''; renderCombat();`);
    const stack = ev(`(function(){
      var col=document.querySelector('.cmb-zicons'), mon=document.querySelector('.cmb-zright .cmb-mon');
      if(!col||!mon) return {missing:true};
      var cz=parseInt(getComputedStyle(col).zIndex,10), mz=parseInt(getComputedStyle(mon).zIndex,10);
      return {colZ:cz, monZ:mz, colPos:getComputedStyle(col).position, beats:cz>mz}; })()`);
    ok('the zone column outranks the creature list with nothing hovered',
       stack.beats === true, JSON.stringify(stack));
    ok('and it is positioned, so its z-index actually applies',
       stack.colPos === 'relative' || stack.colPos === 'absolute', stack.colPos);

    /* --- Ticket #17: the panel promised skilling runs through a fight -------
       It does not, and has not since v0.9.109. Assert the PROMISE with a phrase
       regex rather than a fixed string, so the wording stays free to change. */
    const CONCURRENT = new RegExp('keeps? (running|going)|in the background|through the fight|while you fight', 'i');
    ev(`state.action=null; renderCombat();`);
    const idleNote = ev(`(function(){ var n=document.querySelector('.cmb-skilling-note');
      return n?n.textContent:''; })()`);
    ok('the idle note does not promise skilling runs through a fight',
       !!idleNote && !CONCURRENT.test(idleNote), idleNote.slice(0, 80));

    ev(`state.xp.woodcutting=XP_CUM[20];
        state.action={skill:'woodcutting',actId:SKILLS.woodcutting.acts[0].id}; renderCombat();`);
    const busyNote = ev(`(function(){ var n=document.querySelector('.cmb-skilling-note');
      return n?n.textContent:''; })()`);
    ok('nor does the training note', !!busyNote && !CONCURRENT.test(busyNote), busyNote.slice(0, 80));

    /* The behaviour the copy now describes, so the two can never drift apart
       again without one of these two failing. */
    ok('engaging really does stop training',
       ev(`(function(){ state.action={skill:'woodcutting',actId:SKILLS.woodcutting.acts[0].id};
         if(state.hints) state.hints.combat_unarmed=1;
         engageCombat(); return state.action===null; })()`) === true);
  }

  section('Small suggestions (0.9.121)');
  {
    /* --- #15: tooltips flip left of the cursor instead of clamping over it --- */
    const W = 1000, tw = 260;
    ok('a tooltip with room on the right is left alone',
       ev(`_ttFlipX(100+14, 100, ${tw}, ${W})`) === 114);
    const flipped = ev(`_ttFlipX(950+14, 950, ${tw}, ${W})`);
    ok('near the right edge it flips to the LEFT of the cursor',
       flipped === 950 - 14 - tw, String(flipped));
    ok('and the flipped card is fully on screen', flipped >= 10 && flipped + tw <= W - 10,
       flipped + '..' + (flipped + tw));
    /* The old behaviour clamped, which slid the card back across the cursor and
       over the row being read. Assert we are not doing that any more. */
    ok('it no longer clamps back over the cursor when a flip would fit',
       flipped + tw < 950, 'right edge ' + (flipped + tw) + ' vs cursor 950');
    /* A card too wide for either side still has to land on screen. */
    const squeezed = ev(`_ttFlipX(20+14, 20, 990, ${W})`);
    ok('a card that fits on neither side is clamped on screen, not off it',
       squeezed >= 0 && squeezed <= 10, String(squeezed));

    /* --- #16: combat level readable in the arena --- */
    ev(`state=defaultState(); normalizeState();
        ['attack','strength','defence','hitpoints'].forEach(function(k){ state.combatXp[k]=XP_CUM[40]; });
        combatMode=true; document.getElementById('combatPanel').style.display=''; renderCombat();`);
    const cmbChip = ev(`(function(){ var e=document.querySelector('.cvh-cmb');
      return e?e.textContent.trim():''; })()`);
    ok('the arena shows your combat level without switching panels',
       /^Cmb\s+\d+$/.test(cmbChip), cmbChip);
    ok('and it is the real combat level',
       cmbChip === 'Cmb ' + ev(`combatLevel()`), cmbChip);

    /* --- #21: voyage grades must differ by HUE, not just lightness ---------- */
    const grades = ev(`(function(){
      var out={};
      ['sl-r1','sl-r2','sl-r3','sl-r4'].forEach(function(c){
        var d=document.createElement('div'); d.className=c;
        var h=document.createElement('h5'); h.textContent='x'; d.appendChild(h);
        document.body.appendChild(d);
        out[c]=getComputedStyle(h).color;
        d.parentNode.removeChild(d);
      });
      return out; })()`);
    const vals = Object.keys(grades).map(k => grades[k]);
    ok('all four voyage grades are distinct colours',
       new Set(vals).size === 4, JSON.stringify(grades));
    /* Triumphant vs Battered is the pair that was actually confused. Compare the
       hue channels rather than eyeballing: warm-amber vs warm-amber was the bug. */
    const rgb = t => (t.match(/\d+/g) || []).map(Number);
    const t1 = rgb(grades['sl-r1']), t3 = rgb(grades['sl-r3']);
    const chanGap = Math.abs((t1[2] - t1[0]) - (t3[2] - t3[0]));
    ok('Triumphant and Battered differ in hue, not just brightness',
       chanGap > 80, 'blue-minus-red gap ' + chanGap);

    /* --- #22: no stag drops "Ratskin" any more ----------------------------- */
    ok('the shared pelt is no longer named after rats',
       ev(`ITEMS.ratskin.name`) === 'Raw Hide', ev(`ITEMS.ratskin.name`));
    ok('but its id is untouched, so saves and recipes still resolve',
       ev(`!!ITEMS.ratskin && !!getAct('cooking','co_rs')`) === true);
    ok('and the T1 armour matches the set name its own description uses',
       ev(`ITEMS.ratskin_cape.name`) === 'Roughhide Cape' &&
       ev(`ITEMS.ratskin_tunic.name`) === 'Roughhide Tunic',
       ev(`ITEMS.ratskin_cape.name`) + ' / ' + ev(`ITEMS.ratskin_tunic.name`));
  }

  section('Item tooltips everywhere (0.9.121, #20)');
  {
    /* The contract is that data-item="<id>" in the markup is ENOUGH - no JS
       wiring, no re-binding after a render. attachTooltip() used to bind hover
       per element, which is why only eight hand-wired surfaces had tooltips and
       nothing built from a template string could have one. Assert the contract
       against an element the game has never seen and nothing ever wired. */
    ev(`state=defaultState(); normalizeState();`);
    const virgin = ev(`(function(){
      var d=document.createElement('div');
      d.id='_tipProbe'; d.setAttribute('data-item','copper_ore');
      d.setAttribute('data-itemnote','have 2, need 7 per craft');
      d.textContent='probe';
      document.body.appendChild(d);
      d.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:60,clientY:60}));
      var tt=document.getElementById('itemTooltip');
      return { shown: tt.style.display==='block',
               name: (tt.querySelector('.tt-name')||{}).textContent||'',
               note: (tt.querySelector('.tt-note')||{}).textContent||'',
               sources: tt.querySelectorAll('.tt-source').length }; })()`);
    ok('an element nothing wired still gets a tooltip from data-item alone',
       virgin.shown === true && /Copper Ore/.test(virgin.name), JSON.stringify(virgin.name));
    ok('data-itemnote adds the surface-specific line',
       virgin.note === 'have 2, need 7 per craft', virgin.note);
    ok('and it still lists where to get the item',
       virgin.sources > 0, virgin.sources + ' source rows');

    ok('leaving the element hides it again',
       ev(`(function(){ var d=document.getElementById('_tipProbe');
         d.dispatchEvent(new MouseEvent('mouseout',{bubbles:true}));
         var tt=document.getElementById('itemTooltip');
         var hidden = tt.style.display!=='block';
         if(d.parentNode) d.parentNode.removeChild(d);
         return hidden; })()`) === true);

    /* The headline surface: a recipe ingredient carries data-item, not the thin
       data-tip it used to have. That thin tooltip only said how many you had -
       it could not say where to go and get more, which was the request. */
    ev(`state.xp.smithing=XP_CUM[40]; state.items={copper_ore:12};
        selectedSkill='smithing'; viewTab='acts'; renderAll();`);
    const chips = ev(`(function(){
      var all=document.querySelectorAll('.mat');
      var tagged=document.querySelectorAll('.mat[data-item]');
      var stale=document.querySelectorAll('.mat[data-tip]');
      var withNote=document.querySelectorAll('.mat[data-itemnote]');
      return { all:all.length, tagged:tagged.length, stale:stale.length, withNote:withNote.length }; })()`);
    ok('every recipe ingredient chip carries data-item',
       chips.all > 0 && chips.tagged === chips.all, JSON.stringify(chips));
    ok('and none is left on the old thin data-tip', chips.stale === 0, String(chips.stale));
    ok('each one carries its have/need note', chips.withNote === chips.all, String(chips.withNote));

    /* One tooltip, not two. The arena drop rows had a second, thinner card of
       their own; the request was explicitly for the same one as the inventory. */
    ok('the arena drop rows no longer run a second tooltip',
       ev(`(function(){ var t=document.getElementById('cvItemTip');
         return !t || !t.classList.contains('on'); })()`) === true);
  }

  section('Refused rares must not announce themselves (0.9.121.5)');
  {
    /* Reported as "Tidewrought Heart doesn't drop" at 99 Sailing on Blackreef
       Hollow. The drop was fine — 400 simulated voyages returned it on 58, 14.5%
       against a declared 16%. With the satchel FULL the same 400 returned it 0
       times and refused it 60. grantItem logged the rare notification above the
       space check, so a refused rare still wrote "Found X" to the alerts log
       while handing over nothing, and markDiscovered never ran — alert, no item,
       no compendium entry, which reads exactly like "not implemented". */
    const rareId = ev(`Object.keys(ITEMS).filter(function(id){
      return ITEMS[id].rare && !ITEMS[id].skillGear && !ITEMS[id].tool; })[0]`);
    ok('there is a rare item to test with', !!rareId, String(rareId));

    const full = ev(`(function(){
      state=defaultState(); normalizeState();
      state.notifications=[];
      var ids=Object.keys(ITEMS).filter(function(id){
        return !ITEMS[id].skillGear && !ITEMS[id].tool && id!=='${rareId}'; });
      state.items={};
      for(var j=0;j<satchelCap()+4 && j<ids.length;j++) state.items[ids[j]]=1;
      var granted=grantItem('${rareId}', 3);
      var logged=(state.notifications||[]).filter(function(n){
        return n && n.icon==='${rareId}'; }).length;
      return { granted:granted, held:(state.items['${rareId}']||0),
               logged:logged, discovered:!!(state.discovered&&state.discovered['${rareId}']) }; })()`);
    ok('a full satchel still refuses the item', full.granted === 0 && full.held === 0,
       JSON.stringify(full));
    /* The load-bearing one. */
    ok('and it does NOT claim the find in the alerts log', full.logged === 0, full.logged + ' entries');
    ok('nor mark it discovered', full.discovered === false);

    const room = ev(`(function(){
      state=defaultState(); normalizeState();
      state.notifications=[]; state.items={};
      var granted=grantItem('${rareId}', 3);
      var logged=(state.notifications||[]).filter(function(n){
        return n && n.icon==='${rareId}'; }).length;
      return { granted:granted, held:(state.items['${rareId}']||0),
               logged:logged, discovered:!!(state.discovered&&state.discovered['${rareId}']) }; })()`);
    ok('with room it is granted', room.granted === 3 && room.held === 3, JSON.stringify(room));
    ok('and THEN it announces the find', room.logged === 1, room.logged + ' entries');
    ok('and is discovered', room.discovered === true);

    /* Topping up a stack the player already holds must announce it too. */
    const stack = ev(`(function(){
      state.notifications=[];
      var granted=grantItem('${rareId}', 2);
      return { granted:granted, held:(state.items['${rareId}']||0),
               logged:(state.notifications||[]).filter(function(n){
                 return n && n.icon==='${rareId}'; }).length }; })()`);
    ok('a top-up of an existing rare stack still announces', stack.logged === 1 && stack.held === 5,
       JSON.stringify(stack));
  }

  section('Offline combat (0.9.122)');
  {
    /* Combat lived in a module-level `combat` object and was never save state, so
       closing the game threw the fight away. It now leaves a session behind,
       grantOffline resolves the away time, and the fight resumes on the way in.

       Food is the limiter by design: auto-eat consumes real food and the fight
       stops when it runs out, keeping everything earned. You never die away. */
    const arm = (hours, food, style) => ev(`(function(){
      state=defaultState(); normalizeState();
      /* Zero, not XP_CUM[40]: this suite runs as the DEMO build and the level-10
         cap would clamp a level-40 stat DOWNWARD, turning every gain negative. */
      ['attack','strength','defence','hitpoints'].forEach(function(k){ state.combatXp[k]=0; });
      state.combatStyle='${style}';
      state.items={};
      var f=null; for(var id in ITEMS){ var it=ITEMS[id];
        if(it&&it.potion&&it.potion.heal&&!it.potion.dur){ f=id; break; } }
      if(f && ${food}>0) state.items[f]=${food};
      combat.monId='rat'; if(state.hints) state.hints.combat_unarmed=1;
      engageCombat(); saveGame();
      var hadSession=!!state.combatSession, sessStyle=state.combatSession&&state.combatSession.style;
      state.lastSeen=Date.now()-${hours}*3600000;
      stopCombatTimer(); combat.active=false;
      var before={a:state.combatXp.attack,s:state.combatXp.strength,h:state.combatXp.hitpoints,c:state.coins||0};
      grantOffline();
      var resumed=false; try{ resumed=resumeCombatSession(); }catch(e){}
      return { hadSession:hadSession, sessStyle:sessStyle,
               atk:state.combatXp.attack-before.a, str:state.combatXp.strength-before.s,
               hp:state.combatXp.hitpoints-before.h, coins:(state.coins||0)-before.c,
               foodLeft:(function(){var n=0;for(var id in state.items){var it=ITEMS[id];
                 if(it&&it.potion&&it.potion.heal&&!it.potion.dur) n+=state.items[id];} return n;})(),
               resumed:resumed, fighting:combat.active, session:!!state.combatSession }; })()`);

    const fed = arm(8, 500, 'attack');
    ok('a live fight is written into the save', fed.hadSession === true);
    ok('and eight hours away pays combat xp', fed.atk > 0, 'atk ' + fed.atk);
    /* Hitpoints takes the other 25%. Asserted on what offlineCombatResolve
       RETURNS rather than on the stat, because this suite runs as the demo build
       where hitpoints already sits pinned at the level-10 cap and cannot visibly
       move. The split is the thing worth guarding: an early cut rounded per kill
       instead of per batch, so against a low-xp monster hitpoints earned nothing
       at all across thousands of offline kills. */
    const split = ev(`(function(){
      state=defaultState(); normalizeState();
      ['attack','strength','defence','hitpoints'].forEach(function(k){ state.combatXp[k]=0; });
      var f=null; for(var id in ITEMS){ var it=ITEMS[id];
        if(it&&it.potion&&it.potion.heal&&!it.potion.dur){ f=id; break; } }
      state.items={}; if(f) state.items[f]=500;
      combat.monId='rat'; if(state.hints) state.hints.combat_unarmed=1;
      engageCombat(); saveGame(); stopCombatTimer(); combat.active=false;
      var atk0=state.combatXp.attack;
      var oc=offlineCombatResolve(8*3600000, offlineMods());
      return { total:oc?oc.xp:0, toAttack:state.combatXp.attack-atk0 }; })()`);
    ok('and hitpoints gets its 25% share, not zero',
       split.total > split.toAttack && split.toAttack > 0,
       'total ' + split.total + ' vs attack ' + split.toAttack);
    ok('and coins', fed.coins > 0, String(fed.coins));
    ok('food is eaten for it', fed.foodLeft < 500, fed.foodLeft + ' left of 500');
    ok('and the fight is still standing when you return', fed.resumed === true && fed.fighting === true);

    /* The style is read from state.combatStyle. A first cut read a field that does
       not exist, which silently paid Attack xp to a Strength trainer for the whole
       away period — no error, just the wrong stat. */
    const str = arm(8, 500, 'strength');
    ok('xp follows the training style, not always Attack',
       str.str > 0 && str.atk === 0, 'str ' + str.str + ' atk ' + str.atk);
    ok('and the session records that style', str.sessStyle === 'strength', String(str.sessStyle));

    /* Out of food it stops cleanly rather than dying, and does not resume onto a
       body it cannot heal. */
    const starved = arm(8, 0, 'attack');
    /* How far an empty satchel gets you depends entirely on the matchup — against
       anything that hits back it can be zero kills. What matters is that it stops. */
    ok('with no food nothing is eaten', starved.foodLeft === 0, String(starved.foodLeft));
    ok('then stops, and does NOT resume', starved.resumed === false && starved.fighting === false);
    ok('and the session is cleared so it cannot silently restart', starved.session === false);

    /* Combat and skilling have been one-or-the-other since v0.9.109. Paying both
       for the same hours offline would quietly undo that. */
    const both = ev(`(function(){
      state=defaultState(); normalizeState();
      ['attack','strength','defence','hitpoints'].forEach(function(k){ state.combatXp[k]=0; });
      state.xp.woodcutting=XP_CUM[30];
      state.offlineConfig={skill:'woodcutting',actId:SKILLS.woodcutting.acts[0].id};
      var f=null; for(var id in ITEMS){ var it=ITEMS[id];
        if(it&&it.potion&&it.potion.heal&&!it.potion.dur){ f=id; break; } }
      state.items={}; if(f) state.items[f]=500;
      combat.monId='rat'; if(state.hints) state.hints.combat_unarmed=1;
      engageCombat(); saveGame();
      state.lastSeen=Date.now()-8*3600000;
      stopCombatTimer(); combat.active=false;
      var wc=state.xp.woodcutting, atk=state.combatXp.attack;
      grantOffline();
      return { wc:state.xp.woodcutting-wc, atk:state.combatXp.attack-atk }; })()`);
    ok('a fight offline stands the skilling action award down',
       both.wc === 0 && both.atk > 0, JSON.stringify(both));

    /* A malformed session drives xp and loot, so it is dropped rather than trusted. */
    ok('a session naming a monster that does not exist is discarded',
       ev(`(function(){ state=defaultState(); state.combatSession={monId:'not_a_monster'};
         normalizeState(); return state.combatSession===null; })()`) === true);

    /* The cap must announce itself rather than eating the remainder.

       This used to pin three exact spellings of the phrase, so rewording the
       Welcome Back row in 0.9.123.4 failed it while the cap was still being
       reported perfectly. What actually matters is that the word "capped" and the
       number it swallowed (_offCombat.wanted) reach the player together on one
       line \u2014 pin that instead, and the assertion survives copy edits but still
       fails the day someone drops the readout. */
    ok('the kill cap is reported, not silent',
       /capped[^\n]*_offCombat\.wanted/.test(html));
  }

  section('Restless Mind is a trickle, not a multiplier (0.9.123.5)');
  {
    /* of_multi paid `state.xp[sk] * 0.16 * hoursAway` to every other skill — a
       percentage of ACCUMULATED xp, so the reward grew with the size of the save
       rather than with the content. Maxed, one 24h absence was worth 3.84x each
       skill's entire lifetime total. Measured before the fix: every skill at Lv 60
       came back at Lv 97, and a Lv 80 account gained 331 million xp in one login.
       Sixteen points reaches it — about 18 hours of offline — so it was not a
       late-game trap, it was the whole game.

       Nothing threw and no harness noticed, because a number being far too large is
       not an error. These assertions are the shape of the thing: a trickle must not
       move your level in a night, and it must not scale with what you have already
       banked. */
    /* Same reason as the guild-shop block below: this harness boots with no user
       agent, so IS_DEMO is true and addSkillXp clamps every skill to the level-10
       demo cap — every award here would read as 0 and the assertions would pass
       for entirely the wrong reason. Lift it for this block, put it back after. */
    const _realCapFn = ev('String(demoXpCap)');
    ev('demoXpCap=function(){ return XP_CAP; };');

    const away = (skillLvl, ranks, hours) => JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in SKILLS) state.xp[k]=XP_CUM[${skillLvl}];
      state.tree._offline={of_multi:${ranks}};
      state.action=null; state.offlineConfig=null; state.combatSession=null;
      var before=state.xp.woodcutting, l0=levelFromXp(before);
      state.lastSeen=Date.now()-${hours}*3600000;
      grantOffline();
      return JSON.stringify({gain:state.xp.woodcutting-before, from:l0,
                             to:levelFromXp(state.xp.woodcutting)}); })()`));

    const mid = away(60, 8, 24);
    ok('a maxed trickle does not move a mid-game skill a whole level overnight',
       mid.to === mid.from, JSON.stringify(mid));
    ok('but it does pay something',
       mid.gain > 0, mid.gain + ' xp per skill over 24h');

    /* The proof it is off accumulated xp: the old formula's award was strictly
       proportional to state.xp, so a Lv80 account earned ~4x a Lv60 one from the
       same night. Content-based, the two land within an order of magnitude. */
    const high = away(80, 8, 24);
    ok('the payout tracks content, not the size of the save',
       high.gain < mid.gain * 6, JSON.stringify({lv60: mid.gain, lv80: high.gain}));

    ok('and no rank means no trickle', away(60, 0, 24).gain === 0);
    ev('demoXpCap=' + _realCapFn + ';');
  }

  section('Offline stances (0.9.123.6)');
  {
    /* The rework turned a tree of twelve percentages into a choice made per night.
       None of what follows throws when it breaks — a stance that silently resolves
       as Steady, a yield multiplier that never reaches the satchel, or a <select>
       nobody on Linux can open all read as "the panel works" from here. */

    /* Same demo-cap lift as the Restless Mind block: no user agent means IS_DEMO,
       which clamps every skill to level 10 and would make each award read 0. */
    const _capFn = ev('String(demoXpCap)');
    ev('demoXpCap=function(){ return XP_CAP; };');

    /* One night, resolved for real, with the stance and slots set. Returns what
       each skill gained so the assertions can compare stances against each other
       rather than against a magic number. */
    const night = (stance, tree, slots, hours) => JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in SKILLS) state.xp[k]=XP_CUM[60];
      state.items={}; state.satchelUpgrades=SATCHEL_MAX_EXPANSIONS;
      state.tree._offline=${JSON.stringify(tree)};
      state.offlineStance=${JSON.stringify(stance)};
      state.action=null; state.combatSession=null;
      var sl=${JSON.stringify(slots)};
      state.offlineConfig=sl[0]||null;
      state.offlineSlots=sl.slice(1);
      var xp0={}, it0={};
      for(var k in SKILLS) xp0[k]=state.xp[k];
      for(var i in state.items) it0[i]=state.items[i];
      state.lastSeen=Date.now()-${hours}*3600000;
      grantOffline();
      var xp={}, items={};
      for(var k in SKILLS){ var d=state.xp[k]-xp0[k]; if(d>0) xp[k]=d; }
      for(var i in state.items){ var d2=state.items[i]-(it0[i]||0); if(d2>0) items[i]=d2; }
      return JSON.stringify({xp:xp, items:items, stance:state.offlineStance});
    })()`));

    const wc = () => ({skill:'woodcutting', actId: JSON.parse(ev(
      `JSON.stringify(SKILLS.woodcutting.acts.filter(function(a){return a.lvl<=60;}).pop().id)`))});
    const mi = () => ({skill:'mining', actId: JSON.parse(ev(
      `JSON.stringify(SKILLS.mining.acts.filter(function(a){return a.lvl<=60;}).pop().id)`))});
    const W = wc(), M = mi();

    // ── Steady is the baseline every other stance is measured against ──
    const steady = night('steady', {}, [W], 12);
    ok('Steady trains the one skill it was given',
       steady.xp.woodcutting > 0 && !steady.xp.mining, JSON.stringify(steady.xp));

    // ── Divided actually runs both slots, and splits the rate ──
    const divided = night('divided', {of_divided:1}, [W, M], 12);
    ok('Divided trains BOTH slots in one night',
       divided.xp.woodcutting > 0 && divided.xp.mining > 0, JSON.stringify(divided.xp));
    /* The split is the trade. Each slot must come back with LESS than Steady got,
       or Divided is a free upgrade and the choice is not a choice. */
    ok('and each slot earns less than Steady would have',
       divided.xp.woodcutting < steady.xp.woodcutting,
       JSON.stringify({steady: steady.xp.woodcutting, divided: divided.xp.woodcutting}));
    /* ...but the two together beat it, which is the reason to pick it. */
    ok('while the two together beat it',
       (divided.xp.woodcutting + divided.xp.mining) > steady.xp.woodcutting,
       JSON.stringify({total: divided.xp.woodcutting + divided.xp.mining, steady: steady.xp.woodcutting}));

    // ── Third Thread is breadth, not throughput ──
    const three = night('divided', {of_divided:1, of_slot3:1}, [W, M, {skill:'fishing',
      actId: JSON.parse(ev(`JSON.stringify(SKILLS.fishing.acts.filter(function(a){return a.lvl<=60;}).pop().id)`))}], 12);
    ok('Third Thread runs a third skill',
       three.xp.woodcutting > 0 && three.xp.mining > 0 && three.xp.fishing > 0, JSON.stringify(three.xp));
    ok('and buys breadth rather than speed — each thread is slower than with two',
       three.xp.woodcutting < divided.xp.woodcutting,
       JSON.stringify({two: divided.xp.woodcutting, three: three.xp.woodcutting}));

    // ── Dead to the World: faster, over half the hours ──
    /* Inside half a cap it wins, because nothing is being clipped. */
    const deepShort   = night('deep',   {of_deep:1}, [W], 6);
    const steadyShort = night('steady', {of_deep:1}, [W], 6);
    ok('Dead to the World beats Steady on a short night',
       deepShort.xp.woodcutting > steadyShort.xp.woodcutting,
       JSON.stringify({deep: deepShort.xp.woodcutting, steady: steadyShort.xp.woodcutting}));
    /* Past it the halved cap bites, which is the whole trade. */
    const deepLong   = night('deep',   {of_deep:1}, [W], 40);
    const steadyLong = night('steady', {of_deep:1}, [W], 40);
    ok('and loses to it on a long one',
       deepLong.xp.woodcutting < steadyLong.xp.woodcutting,
       JSON.stringify({deep: deepLong.xp.woodcutting, steady: steadyLong.xp.woodcutting}));

    // ── Night Forager: materials instead of xp ──
    const scav = night('scavenge', {of_scav:1}, [W], 12);
    ok('Night Forager grants no skill xp at all',
       !scav.xp.woodcutting, JSON.stringify(scav.xp));
    ok('but brings back more than Steady did',
       Object.values(scav.items).reduce((a,b)=>a+b,0)
         > Object.values(steady.items).reduce((a,b)=>a+b,0),
       JSON.stringify({scavenge: scav.items, steady: steady.items}));
    ok('and the Offline skill itself still pays — the night is not wasted',
       scav.xp.offline === undefined ? true : scav.xp.offline > 0);

    /* of_loot was computed in offlineMods and then used ONLY to colour a preview
       string; it never reached the award, so six points of Scavenger bought a
       bigger number on a label and nothing in the satchel. */
    /* Tested under Night Forager, which is the only stance it applies to now: on
       every stance it pushed Steady to the same material ceiling Forager reaches,
       and a stance that gives up all its xp for materials you were already getting
       is not a trade. Ranks are compared at a LOW efficiency, because the ceiling
       clamp binds at a maxed tree and would flatten both sides to the same number. */
    const plain  = night('scavenge', {of_scav:1},            [W], 12);
    const looted = night('scavenge', {of_scav:1, of_loot:8}, [W], 12);
    const sum = o => Object.values(o).reduce((a,b)=>a+b,0);
    ok('Scavenger ranks reach the satchel, not just the preview text',
       sum(looted.items) > sum(plain.items),
       JSON.stringify({plain: sum(plain.items), looted: sum(looted.items)}));
    const lootedSteady = night('steady', {of_loot:8}, [W], 12);
    const plainSteady  = night('steady', {},          [W], 12);
    ok('and it is output only — the xp is untouched',
       lootedSteady.xp.woodcutting === plainSteady.xp.woodcutting,
       JSON.stringify({plain: plainSteady.xp.woodcutting, looted: lootedSteady.xp.woodcutting}));

    // ── a stance you have not unlocked cannot be worn ──
    const sneaky = night('divided', {}, [W, M], 12);
    ok('a locked stance falls back to Steady rather than paying out',
       !sneaky.xp.mining, JSON.stringify(sneaky.xp));

    ev('demoXpCap=' + _capFn + ';');

    /* ── THE INVARIANT: offline never beats sitting there and playing ──
       Swept rather than spot-checked, because the first cut of the stances passed
       every spot-check that existed and still shipped Divided at 1.35x live xp and
       Night Forager at 2.36x live materials. The mistake was comparing a SLOT to a
       live hour: active play trains one skill for that hour, so the honest
       comparison is everything offline produced added together.

       720 tree configurations, four stances, both axes. Nothing throws when this
       breaks; the game just quietly becomes one you win by closing. */
    const sweep = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var worstXp=0, worstIt=0, whereXp='', whereIt='', n=0;
      var rates=[0,1,2,3,4,5,6,8,10,12];
      for(var a=0;a<rates.length;a++)
      for(var g=0;g<=6;g+=3)
      for(var l=0;l<=8;l+=4)
      for(var pk=0;pk<=1;pk++)
      for(var s3=0;s3<=1;s3++)
      for(var m3=0;m3<=1;m3++){
        var t={of_rate:rates[a], of_gm_rate:g, of_loot:l, of_gm_peak:pk,
               of_slot3:s3, of_master3:m3, of_divided:1, of_deep:1, of_scav:1,
               of_master1:1, of_master2:1, of_gm_cap:1};
        state.tree._offline=t;
        for(var i=0;i<OFFLINE_STANCES.length;i++){
          state.offlineStance=OFFLINE_STANCES[i].id;
          n++;
          var tot=offlineTotalRate();
          var items=tot*offlineYieldMult('woodcutting');
          if(tot>worstXp){ worstXp=tot; whereXp=OFFLINE_STANCES[i].id+' '+JSON.stringify(t); }
          if(items>worstIt){ worstIt=items; whereIt=OFFLINE_STANCES[i].id+' '+JSON.stringify(t); }
        }
      }
      return JSON.stringify({checked:n, cap:OFFLINE_ACTIVE_CAP,
        worstXp:Math.round(worstXp*1e4)/1e4, whereXp:whereXp,
        worstItems:Math.round(worstIt*1e4)/1e4, whereIt:whereIt});
    })()`));
    ok('no stance, anywhere in the tree, out-earns live play on xp',
       sweep.worstXp <= sweep.cap + 1e-9,
       sweep.worstXp + ' of ' + sweep.cap + ' across ' + sweep.checked + ' builds · worst: ' + sweep.whereXp);
    ok('nor on materials',
       sweep.worstItems <= sweep.cap + 1e-9,
       sweep.worstItems + ' of ' + sweep.cap + ' · worst: ' + sweep.whereIt);
    /* And the cap itself has to stay under 1.0, or the two assertions above are
       true and meaningless. */
    ok('and the cap is a ceiling, not a tie with live play',
       sweep.cap < 1, 'OFFLINE_ACTIVE_CAP = ' + sweep.cap);

    /* Night Forager has to stay a TRADE. It was briefly dominated: Scavenger
       applied to every stance, so Steady reached the same material ceiling while
       still paying full xp, and a stance that forfeits xp for materials you were
       already getting is just a worse Steady. */
    const forage = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var t={}; OFFLINE_TREE.forEach(function(n){ t[n.id]=n.max; });
      state.tree._offline=t;
      function axes(id){ state.offlineStance=id;
        var r=offlineTotalRate();
        return {xp:r, items:r*offlineYieldMult('woodcutting')}; }
      return JSON.stringify({steady:axes('steady'), forager:axes('scavenge')});
    })()`));
    ok('Night Forager still out-gathers Steady at a maxed tree',
       forage.forager.items > forage.steady.items * 1.15,
       JSON.stringify({steady: forage.steady.items, forager: forage.forager.items}));

    /* ── static: no native dropdown may return to this panel ──
       Chromium renders <select> as an OS popup window and Wine/Proton never draws
       it, so on a Steam Deck the old panel's two selects were not awkward, they
       were inert — you could not choose what to train while away at all. This is
       the guard that keeps one from creeping back in. */
    /* Comments stripped first: the panel's own header explains at length why it has
       no <select> in it, and scanning the prose failed the assertion on the very
       sentence promising the thing it checks. */
    const _rawPanel = (html.split('[JS-24d] the Offline panel')[1]||'').split('[JS-24f]')[0];
    // The split marker sits INSIDE the section's own header comment, so the segment
    // opens half way through one: there is a terminator but no opener, and the
    // block-comment strip below cannot see it. Skip to the end of that first
    // comment, or the panel's own explanation of why it has no dropdowns fails the
    // assertion promising it has none.
    const panelSrc = _rawPanel
      .slice(_rawPanel.indexOf('*' + '/') + 2)
      .replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
    ok('the Offline panel is <select>-free (Wine/Proton draws no native dropdown)',
       panelSrc.length > 2000 && panelSrc.indexOf("createElement('select')") < 0
       && panelSrc.indexOf('<select') < 0, panelSrc.length + ' chars of code scanned');

    /* ── the tree has to stay a choice ──
       49 points against 55 of capacity is why the old one felt like a checklist:
       you could buy 89% of it. */
    const cap = ev(`(function(){ var c=0; OFFLINE_TREE.forEach(function(n){c+=n.max;});
      return JSON.stringify({capacity:c, points:OFFLINE_MAX_LEVEL-1}); })()`);
    const capObj = JSON.parse(cap);
    ok('the tree costs meaningfully more than a maxed account can pay for',
       capObj.capacity >= capObj.points * 1.35,
       JSON.stringify(capObj) + ' — ' + Math.round(100*capObj.points/capObj.capacity) + '% affordable');

    /* Every stance past Steady names a node, and that node has to exist or the
       card renders a lock that can never open. */
    ok('every locked stance points at a real node',
       ev(`OFFLINE_STANCES.every(function(s){ return !s.node
          || OFFLINE_TREE.some(function(n){ return n.id===s.node; }); })`) === true);

    /* Old saves are refunded once rather than left holding a build made under
       different rules — and the flag means once, not on every load. */
    ok('an old allocation is refunded exactly once',
       ev(`(function(){ state=defaultState(); state.offlineXp=OFFLINE_XP_CUM[40];
         state.tree={_offline:{of_rate:10, of_gone:3}}; delete state.offlineRespec6;
         normalizeState();
         var afterFirst=JSON.stringify(state.tree._offline);
         state.tree._offline={of_rate:4}; normalizeState();
         return afterFirst==='{}' && state.tree._offline.of_rate===4; })()`) === true);
  }

  section('A skill added after load still has an XP/hr buffer (0.9.124)');
  {
    /* xphBuf is seeded by `for(const s in SKILLS)` at parse time, and Fletching is
       added afterwards by the ranged content block. So xphBuf.fletching was
       undefined and updateSmoothedXph threw on `.filter` of undefined ONCE A
       SECOND, forever, from inside a setInterval where nothing surfaces it. The
       visible symptom was not an error: it was every skill's XP/hr readout quietly
       ceasing to update.

       Asserted for every skill rather than for Fletching by name, so the next
       late-registered skill is covered without anyone remembering to add it. */
    const xph = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var missing=[], threw=null;
      for(var s in SKILLS) if(!xphBuf[s]) missing.push(s);
      try{ updateSmoothedXph(); }catch(e){ threw=String(e.message||e); }
      var lazy=null;
      try{ delete xphBuf.fletching; liveXph('fletching'); lazy='ok'; }
      catch(e){ lazy=String(e.message||e); }
      return JSON.stringify({missing:missing, threw:threw, lazy:lazy});
    })()`));
    ok('every skill has a buffer, however late it registered',
       xph.missing.length === 0, xph.missing.join(', '));
    ok('and the per-second smoother does not throw', xph.threw === null, xph.threw || '');
    ok('a buffer deleted at runtime is rebuilt rather than crashing', xph.lazy === 'ok', xph.lazy);
  }

  section("The consort matches the flagship, never passes it (0.9.123.9)");
  {
    /* Player-reported as "the consort's ship can't be upgraded to the Ancient
       Leviathan". Two separate faults sat behind it.

       The rule was `cap = hull - 1`, so she was held a tier BELOW forever and the
       top hull was unreachable under any circumstance. Jordan's call was to let her
       match: she costs a second full hull in materials, so parity is a sink rather
       than a gift, and a rule you can never satisfy reads as a bug however honestly
       it is worded.

       And the lock message was SAIL_HULLS[Math.min(len-1, t+1)], which on the top
       hull folds back onto itself: a captain already sailing an Ancient Leviathan
       was told "your own ship must reach Ancient Leviathan first". Nothing threw.
       It was a sentence, so only reading the rendered text catches it. */
    const yard = (flagship, consort) => JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.sail.xp=XP_CUM[99]; state.sail.consort=1;
      state.sail.hull=${flagship}; state.sail.hull2=${consort};
      sailTab='yard'; sailYardTab='consort';
      var msg=''; window.toast=function(m){ msg=String(m); };
      renderSail();
      var rows=[].slice.call(document.querySelectorAll('.sl-hull'))
        .map(function(r){ return r.textContent.replace(/\\s+/g,' '); });
      return JSON.stringify({rows:rows, top:SAIL_HULLS[SAIL_HULLS.length-1].n});
    })()`));

    /* Maxed flagship: the top hull must now be offered, not refused. */
    const maxed = yard('SAIL_HULLS.length-1', 'SAIL_HULLS.length-2');
    const topRow = maxed.rows.filter(r => r.indexOf(maxed.top) >= 0)[0] || '';
    ok('a maxed flagship lets the consort reach the top hull',
       topRow.length > 0 && topRow.indexOf('must reach') < 0, topRow.slice(0, 150));

    /* The exact old failure: a hull naming itself as its own prerequisite. */
    const anySelfRef = maxed.rows.some(r => {
      const m = /must reach the ([A-Za-z' ]+?) first/.exec(r);
      return m && r.indexOf(m[1]) !== r.lastIndexOf(m[1]) && r.trim().indexOf(m[1]) === 0;
    });
    ok('no hull is ever listed as its own requirement', !anySelfRef);

    /* She still cannot pass the flagship, which is the half of the rule that stays. */
    const mid = yard('3', '3');
    const over = mid.rows.filter(r => /must reach the/.test(r));
    ok('and she still cannot outrank it', over.length > 0, over[0] ? over[0].slice(0, 130) : 'no locked row');

    const refuse = ev(`(function(){ state=defaultState(); normalizeState();
      state.sail.xp=XP_CUM[99]; state.sail.consort=1; state.sail.hull=3; state.sail.hull2=3;
      var m=''; window.toast=function(x){ m=String(x); };
      sailBuildConsortHull(5);
      return m; })()`);
    ok('refusing a hull above the flagship names the one you need',
       /never outranks/.test(refuse) && refuse.indexOf(JSON.parse(ev('JSON.stringify(SAIL_HULLS[5].n)'))) >= 0, refuse);
  }

  section('Matched jewelry & the auto-eat readout (0.9.122.2)');
  {
    /* Player-reported: "I made a second sapphire ring which stacked with the first.
       Now when I go to equip the ring it will only let me put the one on top of the
       stack, and a second ring only gives me the option to move the already equipped
       one." equipBodyItem stripped an id from every other slot of the loadout with
       no regard for how many the player owned, so a matched pair could never be
       worn. It caps on ownership now — which makes the cap itself the thing that
       has to stay honest, or one ring quietly becomes two. */
    const eq = (owned, order) => ev(`(function(){
      state=defaultState(); normalizeState();
      state.items['sapphire_ring']=${owned};
      state.skillingEquipped={}; state.combatEquipped={}; state.equipped=state.skillingEquipped;
      ${order.map(sl => `equipBodyItem('sapphire_ring','${sl}','skilling');`).join(' ')}
      return { worn:Object.keys(state.skillingEquipped).length,
               reserved:reservedForEquip('sapphire_ring'),
               sellable:sellableQty('sapphire_ring') }; })()`);

    const one = eq(1, ['ring_l', 'ring_r']);
    ok('one ring owned still only ever reaches one hand', one.worn === 1, JSON.stringify(one));
    ok('and the worn copy is not sellable out from under you', one.sellable === 0);

    const two = eq(2, ['ring_l', 'ring_r']);
    ok('a matched pair goes on both hands', two.worn === 2, JSON.stringify(two));
    ok('and both copies are held back from the sell paths',
       two.reserved === 2 && two.sellable === 0, JSON.stringify(two));

    /* reservedForEquip returned a flat 1 before this, so under the new equip rule a
       bulk sell would have taken a ring off the player's own hand. */
    ok('a third copy is still the spare, and still sellable',
       ev(`(function(){ state.items['sapphire_ring']=3; return sellableQty('sapphire_ring'); })()`) === 1);

    /* Nothing decrements the satchel on equip, so a loadout can outlive its stack.
       Consumption paths call releaseIfGone; it has to trim now, not just clear. */
    ok('shrinking the stack takes the extra ring back off',
       ev(`(function(){ state.items['sapphire_ring']=1; releaseIfGone('sapphire_ring');
         return Object.keys(state.skillingEquipped).length; })()`) === 1);
    ok('and emptying it takes off the last one',
       ev(`(function(){ state.items['sapphire_ring']=0; releaseIfGone('sapphire_ring');
         return Object.keys(state.skillingEquipped).length; })()`) === 0);

    /* A preset writes the loadout directly rather than through equipBodyItem, so it
       needs its own copy of the cap or it becomes the duplication path. */
    ok('a preset naming one ring in both hands only applies what you own',
       ev(`(function(){
         state.items['sapphire_ring']=1;
         state.skillingEquipped={}; state.equipped=state.skillingEquipped;
         state.gearPresets={woodcutting:{ring_l:'sapphire_ring',ring_r:'sapphire_ring'}};
         equipGearPreset('woodcutting',true);
         return Object.keys(state.skillingEquipped).length; })()`) === 1);

    /* Sockets and enchants are keyed by ITEM ID, so a worn pair genuinely pays out
       twice off one gem. That is the deliberate rule and the panels now state it —
       if this reads 0.03 again, the equip fix has silently stopped working. */
    ok('a worn pair pays its shared gem out per hand',
       Math.abs(ev(`(function(){
         state.items['sapphire_ring']=2;
         state.skillingEquipped={}; state.equipped=state.skillingEquipped;
         state.sockets={sapphire_ring:{slots:1,gems:['onyx_flaw']}};
         equipBodyItem('sapphire_ring','ring_l','skilling');
         equipBodyItem('sapphire_ring','ring_r','skilling');
         return socketBonuses().speed; })()`) - 0.06) < 1e-9);

    /* _enchantSetActive marks each hand used, so a pair must not satisfy both legs
       of a ring+amulet set. Allowing the pair is exactly what would break that. */
    ok('but a pair still cannot stand in for the amulet leg of a set',
       ev(`(function(){ state.enchantments={sapphire_ring:'swift_i'};
         return activeSetBonuses().length; })()`) === 0);

    /* The panels used to state the old rule as fact. Stale copy is worse than none:
       it tells a player not to craft the second ring that now works. */
    ok('no panel still claims a second copy cannot be worn',
       html.indexOf('Only one can be worn at a time') < 0 &&
       html.indexOf('a 2nd can\'t be worn') < 0 &&
       html.indexOf('Only one of a given piece can be worn') < 0);

    /* Suggestion: show the exact HP auto-eat fires at. The number is only worth
       anything if it is the number combatTick actually compares against — an
       off-by-one tells a player a fight is safe to idle when it is not. */
    ev(`state=defaultState(); normalizeState();
        state.autoHeal={enabled:true,thresholdPct:50,itemId:''};`);
    ok('the auto-eat readout floors to the HP the check really trips at',
       ev('autoEatAtHp(85)') === 42 && ev('autoEatAtHp(101)') === 50,
       ev('autoEatAtHp(85)') + ' / ' + ev('autoEatAtHp(101)'));
    ok('and HP at that value trips it, one above does not',
       ev(`(function(){ var mx=85, at=autoEatAtHp(mx), t=state.autoHeal.thresholdPct/100;
         return (at/mx <= t) && !((at+1)/mx <= t); })()`) === true);

    /* The whole point of the cue is the comparison, so the blow it reports has to
       run the same mitigation chain combatTick does. */
    ok('the biggest-blow figure is a full roll after mitigation',
       ev('foeMaxBlow({str:40})') === 40 && ev('foeMaxBlow(null)') === 0);
    ok('the cue reads risk when one blow clears the line',
       ev(`(function(){ var f=null; for(var id in ITEMS){ var it=ITEMS[id];
             if(it&&it.potion&&it.potion.heal&&!it.potion.dur){ f=id; break; } }
           state.items[f]=20;
           return autoEatCue({str:80,name:'x'},100).state; })()`) === 'risk');
    ok('and safe when none can', ev(`autoEatCue({str:10,name:'x'},100).state`) === 'safe');
    ok('an empty satchel reads as no food, not as safe',
       ev(`(function(){ state.items={}; return autoEatCue({str:10},100).state; })()`) === 'nofood');

    /* Suggestion: fill the training buttons with level progress. It reuses the
       skilling XP window, so it has to clamp at 99 rather than divide by zero. */
    ok('training-button progress spans the level window',
       ev(`(function(){ state=defaultState(); normalizeState();
         state.combatXp.attack=Math.floor((XP_CUM[1]+XP_CUM[2])/2);
         var p=cmbLvlProgress('attack'); return p.lvl===1 && p.pct>=49 && p.pct<=51; })()`) === true);
    ok('and pins at max level instead of dividing by zero',
       ev(`(function(){ state.combatXp.attack=XP_CUM[MAX_LEVEL];
         var p=cmbLvlProgress('attack');
         return p.max===true && p.pct===100 && p.need===0; })()`) === true);
  }

  section('Sailing: the decision deck (0.9.122.3)');
  {
    /* The right column used to be one 741px scroller holding seven stacked
       sections, and Set sail rendered at 1134px — the primary action of the whole
       feature was never on screen when you arrived, and a good voyage pushed it
       further down than a bad one because the result card sat above the island.
       It is a fixed deck plus a scrolling drawer now. None of what follows throws
       when it breaks; the panel just quietly goes back to being a long scroll. */
    const render = (setup) => ev(`(function(){
      state=defaultState(); normalizeState();
      state.sail.xp=XP_CUM[62]; state.sail.hull=4;
      state.sail.seen={}; state.sail.found={};
      SAIL_ISLES.forEach(function(is,i){ state.sail.seen[i]=1; state.sail.found[i]=1; });
      sailTab='voyage'; sailSlot=0; sailSel=0; sailOrd='steady'; sailDraw='last'; sailAdmTab='comms';
      ${setup || ''}
      renderSail();
      return document.getElementById('sailPanel').innerHTML; })()`);

    const base = render('');
    ok('the voyage tab renders a deck', base.indexOf('class="sl-deck"') > 0);
    ok('and a drawer with its own tab strip', base.indexOf('data-sldraw=') > 0);

    /* The whole point: the button is in the block that does not scroll. Comparing
       indices is enough — the deck is emitted before the scroller. */
    const deckAt = base.indexOf('class="sl-deck"');
    const bodyAt = base.indexOf('class="sl-sidebody"');
    const goAt = base.indexOf('id="slGo"');
    ok('Set sail sits in the deck, above the scroller',
       deckAt > 0 && bodyAt > deckAt && goAt > deckAt && goAt < bodyAt,
       'deck ' + deckAt + ' go ' + goAt + ' body ' + bodyAt);

    /* The legend the bar needed. Every grade names itself, its share and what it
       costs — the old .sl-oddkey wrapped four prose lines mid-phrase, and the bar
       had to letterboard a number into a 2% sliver. */
    ok('every outcome is named in the legend',
       ['Triumphant', 'Successful', 'Battered', 'Wrecked'].every(g => base.indexOf('>' + g + '<') > 0));
    ok('and each carries what it actually costs you',
       base.indexOf('+40% haul') > 0 && base.indexOf('full haul') > 0 &&
       base.indexOf('65% haul') > 0 && base.indexOf('ship needs repair') > 0);
    /* Scoped so it cannot also count the .sl-oddrows container that wraps them. */
    ok('the legend has one row per grade',
       (base.match(/class="sl-oddrow[ "]/g) || []).length === 4,
       String((base.match(/class="sl-oddrow[ "]/g) || []).length));

    /* The swatches are hand-kept hexes that have to equal the bar's own CSS. If
       these drift the legend says one colour and the bar shows another. */
    ok('the legend swatches match the bar colours in CSS-33',
       ev('SAIL_GRADE_COL.join(",")') === '#dfb03c,#7da33f,#c9822e,#a8412c' &&
       html.indexOf('.sl-o1{background:#dfb03c}.sl-o2{background:#7da33f}.sl-o3{background:#c9822e}') > 0);
    ok('and there is one short line per grade',
       ev('SAIL_GRADE_SHORT.length') === 4 && ev('SAIL_GRADES.length') === 4);

    /* Four states share the deck. Each replaces the orders and the button, so each
       has to leave something actionable or informative in their place. */
    const atSea = render(`state.sail.voy={i:0,endsAt:Date.now()+600000,dur:1200000,ord:'steady',
      outRoll:0.5,troveRoll:0.9,chartRoll:0.9,petRoll:0.9,matQtyRolls:{},bulkRolls:[0.3],rareRolls:[0.9]};`);
    ok('a ship at sea shows her clock in the deck, not a Set sail button',
       atSea.indexOf('id="slClock"') > 0 && atSea.indexOf('id="slGo"') < 0);
    ok('and the clock is above the drawer',
       atSea.indexOf('id="slClock"') < atSea.indexOf('class="sl-sidebody"'));

    const laid = render('state.sail.damaged=true;');
    ok('a laid-up ship offers the repair from the deck',
       laid.indexOf('data-slfixslot="0"') > 0 &&
       laid.indexOf('data-slfixslot="0"') < laid.indexOf('class="sl-sidebody"'));
    ok('and badges the Ship drawer tab so the bill is findable',
       /data-sldraw="ship"/.test(laid) && /class="[^"]*dot[^"]*" data-sldraw="ship"/.test(laid));

    /* An island you cannot reach must say why on the button rather than leaving a
       dead control. */
    const far = render(`var deep=0; SAIL_ISLES.forEach(function(is,i){ if(is.lv>SAIL_ISLES[deep].lv) deep=i; });
      sailSel=deep; state.sail.xp=0;`);
    ok('an unreachable island puts the reason on the button itself',
       far.indexOf('id="slGo"') > 0 && /Needs (Sailing|Range|a treasure map|\d)/.test(far));

    /* Every drawer section has to render for every deck state. None of them are on
       screen by default, so a throw here would only show up as a blank column. */
    let drawOk = true, drawWhich = '';
    ['last', 'haul', 'isle', 'ship'].forEach(d => {
      ['', 'state.sail.damaged=true;', 'state.sail.consort=true;state.sail.hull2=1;'].forEach(st => {
        let h = '';
        try { h = render(st + "sailDraw='" + d + "';"); } catch (e) { h = ''; }
        if (h.indexOf('class="sl-sidebody"') < 0) { drawOk = false; drawWhich = d + ' / ' + st; }
      });
    });
    ok('all four drawer sections render in every deck state', drawOk, drawWhich);

    /* 'last' is an empty card until something comes back, so it must not be the
       landing tab on a save with no history. */
    ok('a save with no voyage back does not land on an empty drawer',
       render("sailDraw='last';").indexOf('class="on" data-sldraw="isle"') > 0);
    ok('and lands on the return once there is one',
       render(`state.sail.last={slot:0,i:0,g:1,gold:10,xp:10,got:{}};sailDraw='last';`)
         .indexOf('data-sldraw="last"') > 0);

    /* The Admiralty was 1,486px of overflow with the Claim buttons inside it. */
    const adm = (t) => ev(`(function(){ sailTab='admiralty'; sailAdmTab='${t}'; renderSail();
      return document.getElementById('sailPanel').innerHTML; })()`);
    const comms = adm('comms');
    ok('the Admiralty splits into three sub-tabs',
       ['comms', 'ledger', 'papers'].every(t => comms.indexOf('data-sladm="' + t + '"') > 0));
    ok('and shows only the section you picked',
       comms.indexOf('>Commissions</h4>') > 0 && comms.indexOf('>Progress</h4>') < 0);
    ok('the progress sheet is its own section',
       adm('ledger').indexOf('>Progress</h4>') > 0 && adm('ledger').indexOf('>Commissions</h4>') < 0);
    ok('and the papers theirs', adm('papers').indexOf('Admiralty Papers') > 0);
  }

  section('Sailing: the wording pass (0.9.122.3)');
  {
    /* Jordan signed off the whole table except "ship N of 7", which stays. These
       are string assertions on purpose: the whole point of the pass was that the
       old copy read wrong, and nothing about it throws. */
    const gone = [
      ['Hull <b>', '"Hull" named both the weather stat and the thing you buy'],
      ['Orders to the master', 'an unintroduced character'],
      ["n:'Press her'", 'nautical idiom'],
      ["n:'Sweep'", 'meaningless out of context'],
      ['No trade either way', 'parses as "trading is disabled"'],
      ['Full manifest', 'a manifest is a cargo document'],
      ['>in hand<', 'reads as already collected'],
      ['>3 at a time<', 'reads as a rate, not a cap'],
      ['How the voyage usually ends', 'narrates the bar instead of naming it'],
      ['normal treasure roll', '"treasure" now means maps only'],
      ['>Trove</button>', 'the tab holds passives, not storage']
    ];
    gone.forEach(g => ok('gone: ' + g[0] + ' — ' + g[1], html.indexOf(g[0]) < 0));

    const kept = [
      ["'Seaworthiness <b>'", 'the weather stat has its own name now'],
      ["n:'Run hard'", ''], ["n:'Search'", ''],
      ['Nothing gained, nothing risked', ''],
      ['What you can bring back', ''],
      ['>in progress<', ''], ['3 open at once', ''],
      ['>Relics</button>', ''],
      ["?'needs a map':", 'the chart marker states the fix, not the condition'],
      ['Send your flagship here first', '"your own ship" versus what?']
    ];
    kept.forEach(k => ok('present: ' + k[0] + (k[1] ? ' — ' + k[1] : ''), html.indexOf(k[0]) > 0));

    /* Explicitly rejected. The rest of the table shipped; this line did not, and a
       later tidy-up must not "finish the job". */
    ok('"ship N of 7" was kept on purpose',
       html.indexOf("'Emberwatch Harbour · ship '+(s.hull+1)+' of '") > 0);

    /* The order rows print the real wreck delta instead of the word "worse". Press
       has to move the number it claims to move. */
    ok('Run hard genuinely raises the wreck odds it now advertises',
       ev(`(function(){ state=defaultState(); normalizeState();
         state.sail.xp=XP_CUM[20]; state.sail.hull=1; sailSel=6;
         return sailOdds(sailSel,'press',0)[3] > sailOdds(sailSel,'steady',0)[3]; })()`) === true);
  }

  section('Farming: the seed shelf and the field (0.9.122.4)');
  {
    /* The panel was 1018px of mostly chrome — five per-patch seed selects all set
       to the same crop and each too narrow to print "Wildberry", three grey boxes
       reading only "Locked", a 130px farmer block for a once-per-save decision,
       and a paginated crop table with every yield line ellipsised. None of that
       threw; it was just bad, which is why it needs assertions rather than a
       boot test. */
    const render = (setup) => ev(`(function(){
      state=defaultState(); normalizeState();
      state.xp.farming=XP_CUM[62];
      state.patches={}; state.farmSeed=null;
      state.farmer={tier:0,maxTier:0,enabled:false,seedId:null};
      _farmInteractAt=0; _farmCropsOpen=false; _farmerTiersOpen=false;
      selectedSkill='farming';
      ${setup || ''}
      renderFarming();
      return document.getElementById('activityGrid').innerHTML; })()`);

    /* Seeds live in the vault since 0.9.122.17, not the satchel. */
    const seeds = "CROPS.forEach(function(c){ state.seeds[c.id]=40; });";

    const base = render(seeds);
    ok('the panel renders a seed shelf', base.indexOf('class="fm-seeds"') > 0);
    ok('and eight patch cards', (base.match(/class="fm-p[ "]/g) || []).length === 8,
       String((base.match(/class="fm-p[ "]/g) || []).length));

    /* The whole point of the shelf: no card holds a dropdown any more. */
    ok('no patch card contains a <select>',
       ev(`(function(){ var n=0;
         document.querySelectorAll('.fm-p select').forEach(function(){ n++; });
         return n; })()`) === 0);
    /* The farmhand's own picker is still a select, and must stay one — it is a
       different setting from the shelf (what it replants while you are away). */
    ok('but the farmhand keeps its own auto-plant picker',
       render(seeds + "state.farmer={tier:2,maxTier:2,enabled:true,seedId:null};")
         .indexOf('farmerSeedSel') > 0);

    /* One chip per seed you actually hold, and none for seeds you do not. */
    ok('the vault lists exactly the seeds you own',
       ev(`(function(){ state=defaultState(); normalizeState();
         state.xp.farming=XP_CUM[62]; state.patches={}; _farmInteractAt=0;
         state.seeds[CROPS[0].id]=5; state.seeds[CROPS[1].id]=2;
         selectedSkill='farming'; renderFarming();
         return document.querySelectorAll('.fm-seed').length; })()`) === 2);
    ok('an empty vault says so instead of drawing an empty shelf',
       ev(`(function(){ state=defaultState(); normalizeState();
         state.xp.farming=XP_CUM[62]; state.patches={}; _farmInteractAt=0;
         selectedSkill='farming'; renderFarming();
         return document.getElementById('activityGrid').innerHTML; })()`)
         .indexOf('The vault is empty') > 0);

    /* Selection drives every Plant control on the panel, so it has to survive a
       save round-trip — the old _farmSeedSel.plantAll was session-only. */
    ok('the chosen seed is persisted, not session-only',
       ev(`(function(){ state.farmSeed='herb_seed'; normalizeState();
         return state.farmSeed; })()`) === 'herb_seed');
    ok('and a crop that no longer exists is dropped on load',
       ev(`(function(){ state.farmSeed='not_a_crop'; normalizeState();
         return state.farmSeed; })()`) === null);

    /* Running out of the chosen seed must not stall the panel — it falls to the
       best crop you can still grow, which is what Plant All always did. */
    ok('an exhausted choice falls back to the best crop you can grow',
       ev(`(function(){ state=defaultState(); normalizeState();
         state.xp.farming=XP_CUM[62]; state.items={};
         state.seeds['wildberry_seed']=3; state.seeds['herb_seed']=3;
         state.farmSeed='voidbloom_seed';
         var s=fmSelectedSeed(); return s&&s.id; })()`) === 'herb_seed');
    ok('and no seeds at all returns nothing rather than throwing',
       ev(`(function(){ state.items={}; state.seeds={}; return fmSelectedSeed(); })()`) === null);

    /* Plant All names what it will sow. It used to read "Plant All" beside a
       separate dropdown, which is how you end up planting the wrong crop. */
    const pa = render(seeds + "state.farmSeed='wildberry_seed';");
    ok('Plant all names the seed and the count',
       /Plant all empty \u00b7 \d+ \u00d7 Wildberry|Plant all empty · \d+ × Wildberry/.test(pa),
       pa.indexOf('Plant all empty') > 0 ? 'found the button' : 'no button');
    ok('and the empty-patch button names it too', pa.indexOf('Plant Wildberry') > 0);

    /* Bulk buttons disable rather than firing a "nothing to do" toast. */
    ok('Harvest all is disabled with nothing ready', /Nothing ready/.test(pa));
    ok('Plant all is disabled with no empty patches',
       render(seeds + `state.farmSeed='wildberry_seed';
         PATCHES.forEach(function(p){ if(farmingLvl()>=p.unlockLvl)
           state.patches[p.id]={seedId:'wildberry_seed',plantedAt:Date.now(),growMs:180000,tendedMs:0,lastTended:0}; });`)
         .indexOf('No empty patches') > 0);

    /* A locked patch says what unlocks it instead of the word "Locked". */
    ok('locked patches name their level and how far off it is',
       pa.indexOf('Lv 70') > 0 && /levels away/.test(pa));
    ok('and their bar is the level colour, not the growth colour',
       pa.indexOf('fm-bar lvl') > 0);

    /* Planting through the panel actually plants. */
    ok('clicking a patch plants the selected seed',
       ev(`(function(){ state=defaultState(); normalizeState();
         state.xp.farming=XP_CUM[62]; state.patches={}; state.items={};
         state.seeds['wildberry_seed']=5; state.farmSeed='wildberry_seed';
         plantPatch('p1','wildberry_seed',true);
         return state.patches.p1 && state.patches.p1.seedId; })()`) === 'wildberry_seed');

    /* The crop reference is 18 cards. Rendering it open added ~460px and took the
       panel to 1605px, past a 1080p window, so it opens closed. */
    ok('the crop reference is collapsed by default',
       pa.indexOf('fm-cropbtn') > 0 && pa.indexOf('class="fm-crop"') < 0);
    ok('and opens to every crop, with no pager',
       ev(`(function(){ _farmCropsOpen=true; renderFarming();
         var h=document.getElementById('activityGrid').innerHTML;
         _farmCropsOpen=false;
         return document.querySelectorAll('.fm-crop').length; })()`) === ev('CROPS.length'));

    /* Each tier card must list only what that tier does. The first cut built them
       by stripping the <s> tags off the row's full ladder, which advertised
       tending on the Apprentice — a 200,000g feature on a 5,000g hire. */
    ok('a tier card lists only that tier\'s own capabilities',
       ev(`_fmCapsOnly(FARMER_TIERS[0])`) === 'harvests' &&
       ev(`_fmCapsOnly(FARMER_TIERS[1])`) === 'harvests \u00b7 replants \u00b7 plants empty' &&
       ev(`_fmCapsOnly(FARMER_TIERS[2]).indexOf('tends')`) > 0,
       ev(`_fmCapsOnly(FARMER_TIERS[0])`));
    ok('while the row strikes through what the tier cannot do',
       ev(`_fmCapsLine(FARMER_TIERS[0]).indexOf('<s>tends</s>')`) > 0 &&
       ev(`_fmCapsLine(FARMER_TIERS[2]).indexOf('<s>')`) < 0);

    /* All four farmhand controls have to survive on the row. */
    const hired = render(seeds + "state.farmer={tier:2,maxTier:2,enabled:true,seedId:null};");
    ok('the farmhand row carries pause, the seed picker and the upgrade',
       hired.indexOf('Pause') > 0 && hired.indexOf('farmerSeedSel') > 0 &&
       /Upgrade/.test(hired));
    ok('and a paused farmhand offers Resume instead',
       render(seeds + "state.farmer={tier:2,maxTier:2,enabled:false,seedId:null};")
         .indexOf('Resume') > 0);
    ok('the tier list is closed until asked for',
       hired.indexOf('fm-tiers') < 0 && /All three/.test(hired));
    ok('and opening it offers the tier you already hired',
       render(seeds + `state.farmer={tier:2,maxTier:2,enabled:true,seedId:null};
         _farmerTiersOpen=true;`).indexOf('Use this one') > 0);

    /* Namespacing. .seed / .field / .hand / .bar are exactly the bare classes that
       already bleed between panels in this file. */
    ok('every farming class is fm- namespaced',
       html.indexOf('.fm-seed{') > 0 && html.indexOf('.fm-field{') > 0 &&
       html.indexOf('.fm-hand{') > 0 &&
       html.indexOf('\n.seed{') < 0 && html.indexOf('\n.field{') < 0);

    /* The vars the rewrite orphaned must not linger — a stale _farmCropGuidePage
       reads as if pagination is still a thing. */
    /* Scoped to declarations and reads, not mentions: the comment above the removal
       names all three on purpose, so a bare indexOf would fail on its own tombstone. */
    ok('the old pagination and per-patch select state are gone',
       html.indexOf('var _farmCropGuidePage') < 0 && html.indexOf('var _farmSeedSel') < 0 &&
       html.indexOf('var CROPS_PER_PAGE') < 0 && html.indexOf('_farmSeedSel[') < 0 &&
       html.indexOf('_farmSeedSel.plantAll=') < 0);
  }

  section('The skill footer is gone (0.9.122.5)');
  {
    /* Four cards under every skill panel — Next in <skill>, Right now, What this
       skill drops, Mastery. Removed on Jordan's call, and it was also the page
       shake he reported: renderSkillFooter ran from four render sites through
       setTimeout(...,0), so every rebuild of a panel removed the footer and
       re-appended it a frame later. Measured on farming, the document height
       dropped 1105 -> 1080 and back inside ~6ms about every two seconds; with the
       function stubbed that went from seven height changes in twelve seconds to
       one. If any of this returns, the shake returns with it. */
    ok('renderSkillFooter and its helpers are gone',
       html.indexOf('function renderSkillFooter') < 0 &&
       html.indexOf('function _sfRoom') < 0 && html.indexOf('function _sfActive') < 0 &&
       html.indexOf('function _sfNextUnlock') < 0 && html.indexOf('function _sfDrops') < 0 &&
       html.indexOf('function _sfMastery') < 0);
    ok('no render site still schedules it', html.indexOf('renderSkillFooter($(') < 0);
    ok('and its stylesheet went with it',
       html.indexOf('.sf-wrap') < 0 && html.indexOf('.sf-card') < 0 &&
       html.indexOf('[CSS-34]') < 0);

    /* The one rule inside that CSS block that was not the footer's: without it a
       short activity card stretches to its tallest row neighbour. */
    ok('but #activityGrid keeps align-items:start',
       html.indexOf('#activityGrid{align-items:start}') > 0);

    /* The line Jordan named specifically. */
    ok('the "run on their own clocks" note is gone',
       html.indexOf('run on their own clocks') < 0);

    /* Every skill panel still renders without it. */
    let bad = '';
    ['woodcutting','mining','fishing','foraging','smithing','cooking','alchemy',
     'firemaking','agility','jeweler','farming','crafting'].forEach(k => {
      const h = ev(`(function(){ selectedSkill='${k}'; _farmInteractAt=0;
        try{ renderActivities(); }catch(e){ return 'THREW: '+e.message; }
        return document.getElementById('activityGrid').innerHTML.length; })()`);
      if (typeof h !== 'number' || h < 50) bad = k + ' -> ' + h;
    });
    ok('all twelve skill panels still render', !bad, bad);
  }

  section('Alchemy: one card per potion (0.9.122.6)');
  {
    /* The panel rendered one card per RECIPE. 40 recipes make 24 distinct outputs
       and eleven of those have more than one recipe, so most of the grid was
       duplicates of something another card already made — Wisdom III had four
       cards under four different names. And no card said what the potion it made
       actually did: Swiftness I is +5% speed for two minutes and neither number
       appeared anywhere. */
    const render = (setup) => ev(`(function(){
      state=defaultState(); normalizeState();
      state.xp.alchemy=XP_CUM[62];
      _alchTab='skilling'; _alchWaysOpen=null; _alchTier={};
      selectedSkill='alchemy';
      ${setup || ''}
      renderAlchemy();
      return document.getElementById('activityGrid').innerHTML; })()`);

    const base = render('');
    ok('the alchemy panel renders its own cards', base.indexOf('class="al-card') > 0);
    ok('and no card carries a <select> any more',
       ev("document.querySelectorAll('#activityGrid select').length") === 0);

    /* The collapse itself. Every output is reachable from exactly one card. */
    ok('every recipe belongs to a potion',
       ev('SKILLS.alchemy.acts.every(function(a){ return alchRecipesFor(Object.keys(a.out)[0]).indexOf(a)>=0; })') === true);
    ok('and a potion made four ways is one card, not four',
       ev("alchRecipesFor('wisdom_iii').length") === 4);
    ok('the ladders cover every tiered potion',
       ev(`(function(){
         var seen={}; ALCH_LADDER.forEach(function(L){ L.tiers.forEach(function(i){ if(i) seen[i]=1; }); });
         return alchPotions().map(function(p){return p.id;}).filter(function(id){
           if(seen[id]) return false;
           var base=id.replace(/_(i{1,3}|[0-9]+)$/,'');
           return base!==id && alchPotions().some(function(q){ return q.id!==id && q.id.indexOf(base)===0; });
         }).length; })()`) === 0);
    /* Berserker's was the one I missed on the first pass — it rendered as two
       cards while every other ladder had already collapsed. */
    ok("Berserker's is a ladder, not two cards",
       ev("!!ALCH_LADDER_OF['berserker_1'] && !!ALCH_LADDER_OF['berserker_2']"));
    ok('a ladder draws once per tab',
       ev(`(function(){ _alchTab='combat'; renderAlchemy();
         var n=0; document.querySelectorAll('.al-card .al-nm b').forEach(function(b){
           if(b.textContent.indexOf('Berserker')>=0) n++; });
         _alchTab='skilling'; return n; })()`) === 1);

    /* The line the panel never had. Read off the same `potion` block combat and
       skilling consume, so it cannot drift from what the potion really does. */
    ok('the effect line comes from the real potion data',
       ev("alchEffectText('swiftness_i').main") === '+5% speed' &&
       ev("alchEffectText('swiftness_i').dur") === '2m' &&
       ev("alchEffectText('heal_draught_3').main") === 'heals 450' &&
       ev("alchEffectText('honed_edge_2').main") === '+4 Attack',
       ev("alchEffectText('swiftness_i').main"));
    /* Vitality is one effect on two stats. Printing it as two made it read as two
       potions. */
    ok('a two-stat potion reads as one effect',
       ev("alchEffectText('vitality').main") === '+8% speed & XP',
       ev("alchEffectText('vitality').main"));
    ok('a reagent says it is a reagent rather than showing a blank',
       ev("alchEffectText('arcane_dust').main") === 'Enchanting reagent' &&
       ev("alchEffectText('arcane_dust').kind") === 'reagent');
    ok('and the effect is actually on the card',
       base.indexOf('+16% speed') > 0 || base.indexOf('+5% speed') > 0);

    /* Pips only for rungs that exist. Swiftness, Bountiful and Wisdom genuinely
       have no tier II — the old ALCH_FAMILY mapped al4/al5/al6 to one and those
       recipes were never written. A greyed pip for a recipe that does not exist
       reads as a bug rather than as a gap. */
    ok('no pip is drawn for a tier that has no recipe',
       ev(`(function(){
         var bad=0;
         ALCH_LADDER.forEach(function(L){ L.tiers.forEach(function(id){
           if(id && !alchRecipesFor(id).length) bad++; }); });
         return bad; })()`) === 0);
    ok('and the two-rung ladders are two rungs',
       ev("ALCH_LADDER.find(function(L){return L.key==='swiftness';}).tiers.length") === 2);

    /* The tab split has to divide the list exactly where it always did. */
    ok('combat and skilling still split the same way',
       ev("alchIsCombat('heal_draught_1')") === true &&
       ev("alchIsCombat('swiftness_i')") === false &&
       ev("alchIsCombat('honed_edge_1')") === true);

    /* A potion you cannot brew does not need pips, chips, a rate and a button. */
    ok('locked potions render compact, not as full cards',
       render("state.xp.alchemy=0;").indexOf('class="al-mini') > 0);
    ok('and a locked potion still says what it will do',
       /Alchemy \d+/.test(render("state.xp.alchemy=0;")));

    /* Recipe picking: the card uses one you can afford if there is one. */
    ok('the card picks a recipe you can actually make',
       ev(`(function(){
         state=defaultState(); normalizeState(); state.xp.alchemy=XP_CUM[62];
         state.items={}; state.items['fogweed']=9;
         var r=alchBestRecipe(alchRecipesFor('wisdom_iii'), 62);
         return r && r.id; })()`) === 'al_fog');
    ok('and falls back to one you can reach when you can afford none',
       ev(`(function(){ state.items={};
         var r=alchBestRecipe(alchRecipesFor('wisdom_iii'), 62); return !!r; })()`) === true);

    /* The recipe-per-card path and its lookup tables are gone. */
    ok('the old family tables and builder are gone',
       html.indexOf('const ALCH_FAMILY=') < 0 && html.indexOf('ALCH_TIER_LABEL') < 0 &&
       html.indexOf('function buildAlchemyFamilyBtn') < 0 &&
       html.indexOf('function alchFamilyDefaultTier') < 0 &&
       html.indexOf('_alchFamilyPick') < 0);
    ok('renderActivities hands alchemy off the way it does farming',
       html.indexOf("if(selectedSkill==='alchemy'){ renderAlchemy(); return; }") > 0);

    /* Namespacing — .card, .mini, .pips, .mat and .rec would all collide. */
    ok('every alchemy class is al- namespaced',
       html.indexOf('.al-card{') > 0 && html.indexOf('.al-mini{') > 0 &&
       html.indexOf('.al-pips button{') > 0 &&
       html.indexOf('\n.mini{') < 0 && html.indexOf('\n.pips{') < 0);

    ev("_alchTab='skilling';");
  }

  section('Item art block ordering (batch 3)');
  {
    /* The art block assigns over ICONS in a loop. The gear icons are BUILT by
       loops of their own further down the file, so while the art block sat where
       it was first injected, 135 of the 666 icons were silently reverted to SVG
       the moment those generators ran — the file parsed, the game booted, every
       render surface was clean, and a third of the art simply was not there.
       Whichever assignment runs last wins, so the block has to be last. */
    const first = html.indexOf('==ITEM-ART-START==');
    ok('the art block marker appears exactly once',
       first > 0 && first === html.lastIndexOf('==ITEM-ART-START=='));
    const after = [...html.matchAll(/ICONS[.[][A-Za-z_0-9'+]]* *=/g)]
      .map(m => m.index).filter(i => i > first);
    /* One is expected: the block's own ICONS[k]=ART_ITEM[k] loop. */
    ok('nothing writes ICONS after the art block', after.length <= 1,
       JSON.stringify({writesAfter: after.length}));

    /* And the end-to-end statement of the same thing, through the live table. */
    /* A prized catch's icon is its base fish's art inside a <span class="gilded">
       wrapper, so unwrap before judging what it is made of — otherwise sixteen
       painted fish read as "no icon at all". */
    const cov = ev(`(function(){var svg=[],art=0,none=[];
      for(var id in ITEMS){var h='';try{h=iconHTML(id)||'';}catch(e){}
      h=h.replace(/^<span class="gilded">/,'').replace(/<\\/span>$/,'');
      if(h.indexOf('<img')===0) art++; else if(h.indexOf('<svg')>=0) svg.push(id); else none.push(id);}
      return {art:art,svg:svg,none:none};})()`);
    /* An explicit list, not a count. `cane_rod` and `master_bellows` are deliberate —
       see KEEP_SVG in _iconart/picks.js; both options for each were a picture of the
       wrong object, and an icon in the old style beats an icon of the wrong thing.
       The rest are the 0.9.121.20 hunting quarry: twenty-one items shipped on
       generated SVG because the art run had not happened yet. DELETE ids from this
       list as _iconart covers them — an id that stops needing the exemption and stays
       here is dead weight, and an id that appears WITHOUT being added is the thing
       this guards: a re-injection silently reverting a batch takes it to 135. */
    /* EVERY item is painted art now — Barrow and Emberforged were the last two sets
       without a sheet and both landed in 0.9.121.22, so this list is empty and the
       assertion below is simply "nothing is on SVG, and nothing is iconless".
       An id only belongs here if someone looked at its new art and rejected it; if
       that happens, add it here AND to KEEP_SVG in _iconart/picks.js. */
    /* SVG_OK was REFERENCED here and never declared. It survived only because the
       list it filters had gone empty — Array.filter never calls the callback on an
       empty array, so the ReferenceError could not fire. The first id to fall back
       to SVG crashed the whole suite instead of failing one assertion, which is
       how it surfaced. Declared now, empty, as the comment above intends. */
    /* Empty, and it should stay that way. Every id that has ever sat here got its
       sheet within the day. Name an id one by one if art is ever pending again -- an
       id that gets painted and stays listed is dead weight, and one that appears
       WITHOUT being added is the thing this guards. */
    /* radcliff_tally (0.9.123.3) is here for the pending-art reason the paragraph
       above allows, NOT because painted art was rejected — none exists yet. Item
       art comes off the ChatGPT contact sheets (see _iconart / cutall.js), so it
       cannot be produced in the same pass that added the item. Delete this id the
       moment it lands on a sheet; do NOT add it to KEEP_SVG, which would tell the
       next art run to skip it forever. */
    /* Ranged and Fletching (0.9.124) ship on generated SVG because item art comes
       off the ChatGPT contact sheets and a sheet run cannot happen in the same pass
       that adds eighty-four items. Built from the ladders rather than typed out, so
       the exemption shrinks on its own as ids are painted and cannot silently cover
       an id that was never part of this feature.

       PENDING, not rejected. Do not add any of these to KEEP_SVG in picks.js, which
       would tell every future art run to skip them. Delete this block when the
       sheets land; see _rangedpreview/DESIGN.md. */
    const RANGED_PENDING = JSON.parse(ev(`(function(){
      if(typeof RANGED_AMMO==='undefined') return '[]';
      var out=['wood_shaft','feather','raw_fowl','roast_fowl','flax','flax_seed','bowstring'];
      RANGED_AMMO.forEach(function(a){
        out.push(a.k+'_arrowhead', a.k+'_bolt_tip', a.k+'_arrow', a.k+'_bolt',
                 a.k+'_crossbow', 'unstrung_'+a.k+'_crossbow');
      });
      RANGED_WOODS.forEach(function(w){
        ['short','long'].forEach(function(k){
          out.push(w.k+'_'+k+'bow', 'unstrung_'+w.k+'_'+k+'bow');
        });
      });
      return JSON.stringify(out);
    })()`));
    const SVG_OK = new Set(['radcliff_tally'].concat(RANGED_PENDING));

    const unexpected = cov.svg.filter(id => !SVG_OK.has(id));
    ok('only known-exempt items are still on SVG, and none is iconless',
       unexpected.length === 0 && cov.none.length === 0,
       JSON.stringify({art: cov.art, svgTotal: cov.svg.length, unexpected, iconless: cov.none}));
  }
  section('In-game menu — grouping + Back (0.9.123.x)');
  {
    /* The menu was eleven identical rows in one column. Grouping it is cosmetic, but
       the Back button is not: every gm* row closes the menu BEFORE opening its panel,
       so if the flag or the delegated handler breaks you land in the game with the
       menu gone and nothing says so. None of this throws when it regresses. */
    const $$ = id => w.document.getElementById(id);
    const shown = id => { const e = $$(id); return !!e && !e.classList.contains('mm-hidden') && !e.classList.contains('hidden'); };

    ok('the menu card beats the shared 360px cap',
       html.indexOf('#gameMenuModal .mm-card{max-width:520px}') > 0 &&
       html.indexOf('#gameMenuModal .mm-card{max-width:520px}') > html.indexOf('max-width:360px;width:100%'));
    ok('rows sit on a two-column grid, not a single stack',
       html.indexOf('.gm-grid{display:grid;grid-template-columns:1fr 1fr') > 0);
    /* Counted INSIDE the menu, not across the file. It was a global count, and the
       moment Settings borrowed the same headings in 0.9.122.39 a passing assertion
       started failing for a reason that had nothing to do with the menu. */
    ok('every section heading has rows under it', (function(){
      const a = html.indexOf('id="gameMenuModal"');
      const b = html.indexOf('<!-- ===== ', a);
      const menu = html.slice(a, b > a ? b : a + 12000);
      return (menu.match(/class="gm-sec/g) || []).length === 4;
    })());
    ok('the destructive pair is fenced off under its own label',
       html.indexOf('gm-sec gm-sec-danger') > 0 &&
       html.indexOf('id="gmQuit"') > html.indexOf('gm-sec gm-sec-danger') &&
       html.indexOf('id="gmReset"') > html.indexOf('gm-sec gm-sec-danger'));

    /* The dev rows are hidden individually when there is no mail worker. Without the
       wrapper the heading would sit above an empty grid. */
    ok('the dev heading hides with the rows it labels',
       html.indexOf('id="gmDevSec" hidden') > 0 &&
       html.split("['gmDevSec','gm").length - 1 === 2);

    /* A Steam or desktop player seeing Get the full game is the worst kind of
       silent regression — nothing throws, it just sells them what they own. The
       class sits on the grid wrapper AND the button so losing one still hides it. */
    ok('the buy row is demo-only, on both the wrapper and the button',
       html.indexOf('gm-grid gm-buyrow demo-only') > 0 &&
       html.indexOf('gm-row gm-buy gm-wide demo-only') > 0 &&
       html.indexOf('body:not(.is-demo) .demo-only{display:none !important}') > 0);
    ok('and only a non-electron user agent counts as the demo',
       html.indexOf('const IS_DEMO = !/electron/i.test(navigator.userAgent);') > 0 &&
       html.indexOf("if(IS_DEMO) document.body.classList.add('is-demo');") > 0);

    /* Back is present in every panel a menu row can open — miss one and that panel
       is the dead end the button was added to remove. */
    ['mmSettingsModal','mmCreditsModal','mmReportModal','mmIdeaModal','mmMailModal','saveModal']
      .forEach(id => ok('Back exists in #' + id,
        !!($$(id) && $$(id).querySelector('.gm-back'))));

    ok('Back is hidden until something opens it', ev('gmFrom(0); true') &&
       [...w.document.querySelectorAll('.gm-back')].every(b => b.hidden));

    /* Opened FROM the menu: Back shows, and returns to the menu. */
    ev("gmFrom(0); $('gameMenuModal').classList.remove('mm-hidden');");
    $$('gmSettings').click();
    ok('a menu row opens its panel and closes the menu',
       shown('mmSettingsModal') && !shown('gameMenuModal'));
    ok('and Back appears there', !$$('mmSettingsModal').querySelector('.gm-back').hidden);
    $$('mmSettingsModal').querySelector('.gm-back').click();
    ok('Back closes the panel and reopens the menu',
       shown('gameMenuModal') && !shown('mmSettingsModal'));
    ok('and Back hides itself again',
       [...w.document.querySelectorAll('.gm-back')].every(b => b.hidden));

    /* Opened from the header instead: returning to the menu would be wrong, because
       the menu was never open. */
    ev("$('gameMenuModal').classList.add('mm-hidden');");
    $$('btnExport').click();
    ok('the header route leaves Back hidden',
       shown('saveModal') && $$('saveModal').querySelector('.gm-back').hidden);
    ev("$('saveModal').classList.add('hidden');");

    /* Settings -> Report keeps the flag on purpose: that chain started at the menu. */
    ev("gmFrom(0); $('gameMenuModal').classList.remove('mm-hidden');");
    $$('gmSettings').click();
    $$('mmSetReport').click();
    ok('Back survives the Settings to Report hop',
       shown('mmReportModal') && !$$('mmReportModal').querySelector('.gm-back').hidden);
    $$('mmReportModal').querySelector('.gm-back').click();
    ok('and lands back on the menu', shown('gameMenuModal'));
    ev("gmFrom(0); $('gameMenuModal').classList.add('mm-hidden');");
  }
  /* ══ Guild boards + enchant loadouts (v0.9.121.23) ═════════════════════════════
     The player batch of 2026-09-01/02: #42 (a guild that could never hand out a
     quest), #50 (the same three lines every day, and a reset that drifted later
     every time you opened the game late), #49 and OneFlame's report (an enchant
     screen reading the wrong loadout), and the emerald combat gap. None of these
     throw — every one of them renders a perfectly clean panel saying the wrong
     thing — so _validate.js cannot see them. */
  section('Guild boards + enchant loadouts (v0.9.121.23)');
  {
    ev(`state=defaultState(); normalizeState();
        for(const k in SKILLS) state.xp[k]=XP_CUM[99];
        state.combatXp={attack:XP_CUM[99],strength:XP_CUM[99],defence:XP_CUM[99],hitpoints:XP_CUM[99]};
        state.monKills={}; MONSTERS.forEach(m=>{ state.monKills[m.id]=5; });
        state.gd={}; state.gdTokens=0; GUILDS.forEach(g=>gdJoin(g.id));`);

    // ── #42 · every guild, The Nightmarket included, fills a board ────────────
    ok('every guild joins at 99', ev('Object.keys(state.gd).length')===ev('GUILDS.length'));
    const empty = ev(`JSON.stringify(GUILDS.filter(g=>state.gd[g.id].q.length<3).map(g=>g.name))`);
    ok('every guild rolls a full board of three', JSON.parse(empty).length===0, empty);
    ok('The Nightmarket hands out quests (ticket #42)', ev('state.gd.night.q.length')===3,
       ev('JSON.stringify(state.gd.night.q.map(q=>q.name))'));
    ok('agility acts survive the act filter', ev("gdBestActs('agility').length")===8);

    // ── every quest is in-skill, in-level, repeatable and real ───────────────
    const bad = ev(`(function(){
      const out=[];
      for(let d=0;d<120;d++){ GUILDS.forEach(g=>{
        gdRollQuests(g.id,true);
        state.gd[g.id].q.forEach(q=>{
          if(q.kind==='kill'){ if(!state.monKills[q.target]) out.push(g.id+': unkilled '+q.target); return; }
          if(!q.skill){ out.push(g.id+': no skill'); return; }
          if(g.skills.indexOf(q.skill)<0) out.push(g.id+': off-skill '+q.skill);
          const lvl=levelFromXp(state.xp[q.skill]||0);
          let ids=q.kind==='supply'?Object.keys(q.items||{}):(q.target?[q.target]:[]);
          if(q.act){
            const a=(SKILLS[q.skill].acts||[]).find(x=>x.id===q.act);
            if(!a){ out.push(g.id+': missing act '+q.act); }
            else {
              if(lvl<((a.id==='co8')?highFishUnlockLevel():(a.lvl||1))) out.push(g.id+': act above level');
              ids=ids.concat(Object.keys(a.out||{}));
            }
          }
          ids.forEach(i=>{
            if(!ITEMS[i]) out.push(g.id+': unknown item '+i);
            else if(ITEMS[i].tool||ITEMS[i].skillGear) out.push(g.id+': one-time unlock '+i);
          });
          if(q.kind==='supply'&&Object.keys(q.items||{}).length<2) out.push(g.id+': one-line supply');
          if(!(q.need>0)) out.push(g.id+': need '+q.need);
          if(!q.name) out.push(g.id+': unnamed');
        });
      }); }
      return JSON.stringify([...new Set(out)]);
    })()`);
    ok('1200 rolled boards stay in-skill, in-level, repeatable and real',
       JSON.parse(bad).length===0, bad);

    // ── #50a · the board is not the same board tomorrow ─────────────────────
    const variety = ev(`(function(){ const seen={};
      for(let d=0;d<200;d++){ gdRollQuests('delvers',true); state.gd.delvers.q.forEach(q=>seen[q.name]=1); }
      return Object.keys(seen).length; })()`);
    ok('The Delvers roll many different lines (was 3 fixed)', variety>=15, variety+' lines');
    const fmVariety = ev(`(function(){ const seen={};
      for(let d=0;d<200;d++){ gdRollQuests('timber',true); state.gd.timber.q.forEach(q=>seen[q.name]=1); }
      return Object.keys(seen).length; })()`);
    /* Firemaking pours plain Ash out of nine different acts, so an output-named
       board gave the Timberhall three lines that all read "Burn N Ash". */
    ok('and so does the Timberhall, whose acts all make Ash', fmVariety>=15, fmVariety+' lines');
    const nightVariety = ev(`(function(){ const seen={};
      for(let d=0;d<200;d++){ gdRollQuests('night',true); state.gd.night.q.forEach(q=>seen[q.name]=1); }
      return Object.keys(seen).length; })()`);
    ok('and The Nightmarket, which had none at all', nightVariety>=8, nightVariety+' lines');

    // ── #50b · a fixed daily boundary, not a rolling 24h ────────────────────
    const day = JSON.parse(ev(`(function(){
      const t=new Date(); t.setHours(9,0,0,0);  const a=gdDayIndex(t.getTime());
      t.setHours(20,0,0,0); const b=gdDayIndex(t.getTime());
      const m=new Date(); m.setHours(23,59,0,0); const c=gdDayIndex(m.getTime());
      m.setHours(24,1,0,0); const e=gdDayIndex(m.getTime());
      return JSON.stringify({same:a===b, flips:e===c+1, left:gdResetMsLeft(state.gd.delvers)});
    })()`));
    ok('morning and evening of one day share a board (no drift)', day.same===true);
    ok('the board turns over at local midnight, once', day.flips===true);
    ok('the countdown sits inside one day', day.left>0 && day.left<=86400000, Math.round(day.left/60000)+' min');
    ok('a board stamped yesterday refreshes on the next tick',
       ev(`(function(){ state.gd.delvers.day=gdDayIndex()-1; return gdRefreshDue(); })()`)===true);
    ok('and does not roll twice in one day', ev('gdRefreshDue()')===false);
    ok('a FINISHED board still resets the next day (ticket #50)',
       ev(`(function(){ state.gd.delvers.q.forEach(q=>q.done=true);
           state.gd.delvers.day=gdDayIndex()-1; gdRefreshDue();
           return state.gd.delvers.q.filter(q=>q.done).length; })()`)===0);

    // ── an old save migrates without wiping or freezing a board ─────────────
    const mig = JSON.parse(ev(`(function(){
      const today=gdDayIndex();
      state.gd.delvers={rep:0,q:[{kind:'do',size:'small',skill:'mining',name:'Gather 25 mining items',need:25,have:9,done:false}],
        rolled:Date.now(),skipped:0,bought:{}};
      gdNormalize();
      const keptToday = state.gd.delvers.day===today && !gdRefreshDue() && state.gd.delvers.q[0].have===9;
      state.gd.timber={rep:0,q:[],rolled:Date.now()-3*86400000,skipped:0,bought:{}};
      gdNormalize();
      return JSON.stringify({keptToday:keptToday, staleDue:state.gd.timber.day<today});
    })()`));
    ok('a save that rolled today keeps its board across the migration', mig.keptToday===true);
    ok('a save that rolled three days ago is due a fresh one', mig.staleDue===true);

    // ── a Supply order holds, hands in, and takes exactly what it asked ─────
    const sup = JSON.parse(ev(`(function(){
      let q=null;
      for(let i=0;i<600 && !q;i++){ const c=gdRollOne(GD_BY.delvers,'long'); if(c&&c.kind==='supply') q=c; }
      if(!q) return JSON.stringify({found:false});
      state.gd.delvers.q=[q]; state.gd.delvers.rep=0;
      state.items={}; for(const i in q.items) state.items[i]=q.items[i]+7;
      const full=gdHeld(q)===q.need && gdReady(q);
      /* Short ONE line only. Every line is over-stocked by 7, so decrementing is
         not enough — gdHeld caps each line at what it asked for. */
      const first=Object.keys(q.items)[0], keep=state.items[first];
      state.items[first]=q.items[first]-1; const shortReady=gdReady(q); state.items[first]=keep;
      const tok=state.gdTokens;
      gdClaim('delvers',0);
      let leftoverOk=true; for(const i in q.items) if((state.items[i]||0)!==7) leftoverOk=false;
      return JSON.stringify({found:true,lines:Object.keys(q.items).length,full:full,
        shortReady:shortReady,leftoverOk:leftoverOk,tok:state.gdTokens-tok,
        rep:state.gd.delvers.rep,done:state.gd.delvers.q[0].done});
    })()`));
    ok('a Supply order rolls at all', sup.found===true);
    ok('it asks for two or three things', sup.lines>=2 && sup.lines<=3, sup.lines+' lines');
    ok('a full satchel reads as complete', sup.full===true);
    ok('one line short does not', sup.shortReady===false);
    ok('hand-in takes exactly what it asked for', sup.leftoverOk===true);
    ok('and pays the Long rate', sup.tok===25 && sup.rep===1200, JSON.stringify([sup.tok,sup.rep]));
    ok('the quest reads as claimed', sup.done===true);

    // ── an act-named quest counts only that act ────────────────────────────
    const scoped = JSON.parse(ev(`(function(){
      const acts=gdBestActs('mining'), a=acts[0], b=acts[acts.length-1];
      state.gd.delvers.q=[{kind:'do',size:'small',skill:'mining',act:b.id,name:'x',need:10,have:0,done:false}];
      gdOnAction('mining',3,a.id); const wrong=state.gd.delvers.q[0].have;
      gdOnAction('mining',3,b.id); const right=state.gd.delvers.q[0].have;
      state.gd.delvers.q=[{kind:'do',size:'small',skill:'mining',name:'x',need:10,have:0,done:false}];
      gdOnAction('mining',4,a.id);
      return JSON.stringify({wrong:wrong,right:right,legacy:state.gd.delvers.q[0].have});
    })()`));
    ok('the wrong act does not fill an act-named quest', scoped.wrong===0);
    ok('the right one does', scoped.right===3);
    ok('a pre-0.9.121.23 quest with no act still counts the whole skill', scoped.legacy===4);

    // ── the panel renders every quest shape ────────────────────────────────
    const panel = JSON.parse(ev(`(function(){
      try{
        state.gd.delvers.q=[
          {kind:'do',size:'small',skill:'mining',act:'mi1',name:'Mine 40 Copper Ore',need:40,have:12,done:false},
          {kind:'deliver',size:'standard',skill:'mining',target:'iron_ore',name:'Deliver 90 Iron Ore',need:90,have:0,done:false},
          {kind:'supply',size:'long',skill:'mining',items:{iron_ore:60,coal:80},name:'Supply 60 Iron Ore and 80 Coal',need:140,have:0,done:false}];
        _gdOpen='delvers'; viewTab='guild'; renderGuilds();
        return JSON.stringify({rows:document.querySelectorAll('#guildView .gd-q').length,
                               chips:document.querySelectorAll('#guildView .gd-qi span').length});
      }catch(e){ return JSON.stringify({err:String(e&&e.message||e)}); }
    })()`));
    ok('the guild panel renders all three quest shapes', !panel.err, panel.err||'');
    ok('three quest rows on screen', panel.rows===3);
    ok('and a chip per line of the supply order', panel.chips===2);

    // ── #49 · the enchant screen reads the loadout it is paid from ─────────
    const ench = JSON.parse(ev(`(function(){
      try{
        state.items.sapphire_ring=1; state.items.sapphire_pendant=1; state.items.sapphire_amulet=1;
        state.combatEquipped.ring_l='sapphire_ring';
        state.combatEquipped.amulet='sapphire_pendant';
        state.skillingEquipped.amulet='sapphire_amulet';
        state.enchantments.sapphire_ring='squire_i';
        state.enchantments.sapphire_pendant='squire_i';
        const paid=combatEnchantBonuses().atkBoost;
        const nowLive=_enchantSetActive(PENDANT_SETS.sapphire,_ewSetMap('pendant'),'pendant');
        const oldTest=_enchantSetActive(PENDANT_SETS.sapphire,state.equipped,'pendant');
        viewTab='enchant'; renderEnchanting();
        const named=[...document.querySelectorAll('#enchantView .ew-slot .nm')].map(e=>e.textContent);
        return JSON.stringify({paid:paid,nowLive:nowLive,oldTest:oldTest,
          tiles:document.querySelectorAll('#enchantView .ew-slot').length,
          worn:named.filter(n=>n!=='empty').length,
          badge:_ewWornBadge('sapphire_ring')});
      }catch(e){ return JSON.stringify({err:String(e&&e.message||e)}); }
    })()`));
    ok('the enchanting panel renders', !ench.err, ench.err||'');
    ok('a combat-doll pair really does pay out', ench.paid>0, '+'+Math.round(ench.paid*100)+'% atk');
    ok('and the old skilling-only test called it dead \u2014 the bug', ench.oldTest===false);
    ok('the Sapphire Fang card now agrees with the bonus (ticket #49)', ench.nowLive===true);
    ok('both loadouts are on screen', ench.tiles===6, ench.tiles+' tiles');
    ok('and the worn pieces are named, not blank', ench.worn===3);
    ok('the rail badge names the doll a piece is worn on', /Combat/.test(ench.badge||''), ench.badge);

    // ── every guild shop row is named, priced and actually does something ──
    /* This harness boots with no user agent, so IS_DEMO is true and addSkillXp
       clamps every skill to the level-10 demo cap — which would make an XP grant
       look like a dead button. Lift the cap for this block only. */
    const _realDemoCap = w.demoXpCap;
    ev('demoXpCap=function(){ return XP_CAP; };');
    ev(`state=defaultState(); normalizeState();
        for(const k in SKILLS) state.xp[k]=XP_CUM[99];
        state.combatXp={attack:XP_CUM[99],strength:XP_CUM[99],defence:XP_CUM[99],hitpoints:XP_CUM[99]};
        state.monKills={}; MONSTERS.forEach(m=>{ state.monKills[m.id]=5; });
        state.gd={}; GUILDS.forEach(g=>gdJoin(g.id));
        state.satchelUpgrades=SATCHEL_MAX_EXPANSIONS;`);

    const generic = ev(`JSON.stringify(GUILDS.filter(g=>gdShopFor(g.id)
      .some(s=>GD_SHOP.some(d=>d.id===s.id&&d.title===s.title))).map(g=>g.name))`);
    ok('no guild is still selling the generic placeholder names',
       JSON.parse(generic).length===0, generic);

    const dupes = ev(`(function(){
      const seen={}, bad=[];
      GUILDS.forEach(g=>gdShopFor(g.id).forEach(s=>{
        if(seen[s.title]) bad.push(s.title+' ('+g.name+' and '+seen[s.title]+')');
        seen[s.title]=g.name;
      }));
      return JSON.stringify(bad);
    })()`);
    ok('and no two guilds share a shop name', JSON.parse(dupes).length===0, dupes);

    /* The crate handed over acts[length-1] — whatever was LAST in the array, which
       for the category-ordered skills is not the best of anything. */
    const crate = JSON.parse(ev(`JSON.stringify({
      night:gdCrateItem('night'), legion:gdCrateItem('legion'),
      delvers:gdCrateItem('delvers'), craft:gdCrateItem('emberforge'),
      farm:gdCrateItem('furrow'),
      stocked:GUILDS.filter(g=>gdShopFor(g.id).some(s=>s.id==='crate')).map(g=>g.id)
    })`));
    ok('a guild that makes nothing does not stock a crate',
       crate.night===null && crate.legion===null,
       JSON.stringify([crate.night, crate.legion]));
    ok('and the seven that do, do', crate.stocked.length===7, crate.stocked.join(','));
    ok('the crate names a real item everywhere it is stocked',
       ev(`GUILDS.filter(g=>gdShopFor(g.id).some(s=>s.id==='crate'))
            .every(g=>!!ITEMS[gdCrateItem(g.id)])`)===true);
    ok('and it is the top of the ladder, not the end of the array',
       crate.delvers==='starsteel_ore' || /ore$/.test(crate.delvers||''), crate.delvers);

    /* Every buy path, on every guild: the tokens must move if and only if
       something was granted. Three of these used to be dead buttons. */
    const buys = ev(`(function(){
      const bad=[];
      GUILDS.forEach(g=>{
        gdShopFor(g.id).forEach(s=>{
          state.gd[g.id].rep=GD_REP[5]; state.gdTokens=9999;
          const before={
            tok:state.gdTokens, coins:state.coins||0,
            xp:Object.assign({},state.xp), cxp:Object.assign({},state.combatXp),
            items:Object.assign({},state.items)
          };
          gdBuy(g.id, s.id);
          const spent=before.tok-state.gdTokens;
          let moved=false;
          if((state.coins||0)!==before.coins) moved=true;
          for(const k in state.xp) if(state.xp[k]!==before.xp[k]) moved=true;
          for(const k in state.combatXp) if(state.combatXp[k]!==before.cxp[k]) moved=true;
          for(const k in state.items) if(state.items[k]!==before.items[k]) moved=true;
          if(spent!==s.cost) bad.push(g.id+'/'+s.id+': charged '+spent+' not '+s.cost);
          if(!moved) bad.push(g.id+'/'+s.id+': took the tokens and gave nothing');
        });
      });
      return JSON.stringify(bad);
    })()`);
    ok('every shop row on every guild grants something and charges once',
       JSON.parse(buys).length===0, JSON.parse(buys).join('\n       '));

    /* g.skills[0] meant the Timberhall always paid Woodcutting and never
       Firemaking, and the Deepwater always Fishing and never Cooking. */
    const twoSkill = JSON.parse(ev(`(function(){
      // make the SECOND skill of each pair the faster one and check the buy follows
      state.xp.woodcutting=XP_CUM[2]; state.xp.firemaking=XP_CUM[99];
      state.xp.fishing=XP_CUM[2];     state.xp.cooking=XP_CUM[99];
      const a={wc:state.xp.woodcutting,fm:state.xp.firemaking};
      gdBuyXp(GD_BY.timber);
      const b={wc:state.xp.woodcutting,fm:state.xp.firemaking};
      return JSON.stringify({paidFm:b.fm>a.fm, paidWc:b.wc>a.wc});
    })()`));
    ok('a two-skill guild pays into whichever of ITS skills you earn fastest in',
       twoSkill.paidFm===true && twoSkill.paidWc===false, JSON.stringify(twoSkill));

    // ── the Nightmarket is a fence, not a running track ───────────────────
    const fence = JSON.parse(ev(`(function(){
      const seen={}, kinds={}, bad=[];
      for(let i=0;i<2500;i++){
        ['small','standard','long'].forEach(function(sz){
          const q=gdRollOne(GD_BY.night,sz);
          if(!q) return;
          seen[q.name]=1; kinds[q.kind]=(kinds[q.kind]||0)+1;
          /* The Nightmarket gates on Thieving as of 0.9.122.31 — it is the thieves'
             guild and Agility was only ever the closest skill the game had. */
          if(q.skill!=='thieving') bad.push('off-skill '+q.skill);
          if(q.kind==='coin' && !(q.need>0)) bad.push('coin with no amount');
          const ids=q.kind==='supply'?Object.keys(q.items||{}):(q.target?[q.target]:[]);
          ids.forEach(function(i){
            if(!ITEMS[i]) bad.push('unknown '+i);
            else if(!(ITEMS[i].sell>0)) bad.push('worthless '+i);
            else if(ITEMS[i].tool||ITEMS[i].skillGear) bad.push('one-time '+i);
          });
        });
      }
      return JSON.stringify({lines:Object.keys(seen).length, kinds:kinds, bad:[...new Set(bad)]});
    })()`));
    ok('The Nightmarket rolls all four shapes', ['do','deliver','supply','coin']
       .every(k => (fence.kinds[k]||0) > 0), JSON.stringify(fence.kinds));
    /* Was >1000, when the board drew from every skill in the game. It draws from
       twelve stolen goods now, on purpose, so the ceiling came down with it. 400 is
       still far more distinct lines than any player sees. */
    ok('and does not hand out the same fifteen lines', fence.lines > 400, fence.lines+' lines');
    ok('a fence only ever asks for things worth money, and never a one-time tool',
       fence.bad.length===0, fence.bad.join(', '));

    /* Sized off agility's own gold rate this asked for 500 gold on a Long quest,
       beside one asking for 22 Voidsteel Chests. It reads the best rate in the
       GAME now, which is what a fence would actually price against. */
    const coinSize = JSON.parse(ev(`(function(){
      let q=null;
      for(let i=0;i<3000 && !q;i++){ const c=gdRollOne(GD_BY.night,'long'); if(c&&c.kind==='coin') q=c; }
      if(!q) return JSON.stringify({found:false});
      let gph=0;
      for(const sk in SKILLS) gdBestActs(sk).forEach(function(a){
        let r=null; try{ r=ratesFor(a,sk); }catch(e){ return; }
        if(r&&(r.gph||0)>gph) gph=r.gph;
      });
      const want=gph*GD_SIZE.long.mins/60;
      return JSON.stringify({found:true, need:q.need, want:want, ratio:q.need/want});
    })()`));
    ok('a Long coin order is about twenty minutes of your best gold rate',
       coinSize.found && coinSize.ratio>0.55 && coinSize.ratio<1.8,
       JSON.stringify(coinSize));

    const coinFlow = JSON.parse(ev(`(function(){
      let q=null;
      for(let i=0;i<3000 && !q;i++){ const c=gdRollOne(GD_BY.night,'standard'); if(c&&c.kind==='coin') q=c; }
      if(!q) return JSON.stringify({found:false});
      state.gd.night.q=[q]; state.gd.night.rep=0;
      state.coins=q.need-1;
      const shortReady=gdReady(q);
      state.coins=q.need+777;
      const fullReady=gdReady(q), tok=state.gdTokens;
      gdClaim('night',0);
      return JSON.stringify({found:true, shortReady:shortReady, fullReady:fullReady,
        leftover:state.coins, tok:state.gdTokens-tok, done:state.gd.night.q[0].done});
    })()`));
    ok('a coin order rolls, and one coin short is not enough',
       coinFlow.found===true && coinFlow.shortReady===false);
    ok('paying it takes exactly the gold it asked for and no more',
       coinFlow.fullReady===true && coinFlow.leftover===777, JSON.stringify(coinFlow));
    ok('and it pays the Standard rate', coinFlow.tok===8 && coinFlow.done===true);

    // ── one token buys roughly the same value at every shop ────────────────
    const band = JSON.parse(ev(`(function(){
      const out={};
      [[99,99,99],[70,65,36],[40,35,18]].forEach(function(c){
        for(const k in SKILLS) state.xp[k]=XP_CUM[c[0]];
        state.combatXp={attack:XP_CUM[c[1]],strength:XP_CUM[c[1]],defence:XP_CUM[c[1]],hitpoints:XP_CUM[c[1]]};
        state.monKills={}; MONSTERS.slice(0,c[2]).forEach(m=>state.monKills[m.id]=5);
        state.gd={}; GUILDS.forEach(g=>gdJoin(g.id));
        const vals=GUILDS.map(g=>gdShopXp(g).amount).filter(v=>v>0);
        out['lv'+c[0]]={min:Math.min.apply(null,vals), max:Math.max.apply(null,vals),
                        combat:gdShopXp(GD_BY.legion).amount};
      });
      return JSON.stringify(out);
    })()`));
    Object.keys(band).forEach(function(k){
      const b=band[k];
      ok('at '+k+' no shop is worth more than 2.5x another',
         b.max/b.min < 2.5, Math.round(b.max/b.min*100)/100+'x  ('+
         b.min.toLocaleString()+' to '+b.max.toLocaleString()+')');
      ok('and the combat row sits inside that band',
         b.combat>=b.min && b.combat<=b.max, b.combat.toLocaleString());
    });
    /* The two ends that made this necessary: crafting's xp/hr is ~5x mining's, and
       monster XP scales ~65x from 40 to 99 while skilling xp/hr scales ~2.4x. */
    ok('the combat row is no longer a joke at 40 or a jackpot at 99',
       band.lv40.combat > 5000 && band.lv99.combat < 80000,
       band.lv40.combat.toLocaleString()+' -> '+band.lv99.combat.toLocaleString());

    // restore a level-99 save for the blocks below
    ev(`for(const k in SKILLS) state.xp[k]=XP_CUM[99];
        state.combatXp={attack:XP_CUM[99],strength:XP_CUM[99],defence:XP_CUM[99],hitpoints:XP_CUM[99]};
        state.monKills={}; MONSTERS.forEach(m=>{ state.monKills[m.id]=5; });
        state.gd={}; GUILDS.forEach(g=>gdJoin(g.id));`);

    // ── the Furrow finally gets supply orders ──────────────────────────────
    const furrow = ev(`(function(){
      state=defaultState(); normalizeState();
      for(const k in SKILLS) state.xp[k]=XP_CUM[99];
      state.gd={}; gdJoin('furrow');
      const seen={}; let sup=0;
      for(let i=0;i<4000;i++){
        ['small','standard','long'].forEach(sz=>{
          const q=gdRollOne(GD_BY.furrow,sz);
          if(!q) return; seen[q.name]=1; if(q.kind==='supply') sup++;
        });
      }
      return JSON.stringify({lines:Object.keys(seen).length, sup:sup});
    })()`);
    const F = JSON.parse(furrow);
    ok('The Furrow rolls supply orders now', F.sup>0);
    ok('which widens its board well past the old 54 lines', F.lines>200, F.lines+' lines');
    w.demoXpCap = _realDemoCap;   // the demo-cap regressions below rely on the real one

    /* ── an amulet and a pendant say how they differ (ticket #55) ────────────
       "Based on tooltips I cannot figure out what the difference is between Amulets
       and Pendants except that one sells for more." They are the same neck slot,
       the same gem and the same enchant list; the only difference is which SET they
       complete, and that lived only in the Enchanting panel's set cards.

       The label is derived from _jwType(), the same function the set logic uses.
       Reading it off the id suffix instead meant the Void Jewel — a pendant to
       every set check — printed "Jewel" and explained nothing. */
    const jw = JSON.parse(ev(`(function(){
      var bad=[], seen={};
      Object.keys(JEWELRY_GEM_TIER).forEach(function(id){
        if(!ITEMS[id]) return;
        var ty=_jwType(id);
        var txt=String(jewelryEnchantBlock(id)).replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ');
        seen[ty]=(seen[ty]||0)+1;
        // the header must name the shape the set logic believes in
        var want=ty==='ring'?'Ring':ty==='amulet'?'Amulet':ty==='pendant'?'Pendant':null;
        if(want && txt.indexOf('\\u00b7 '+want)<0) bad.push(id+': header does not say '+want);
        // and the body must say which set it completes
        if(ty==='amulet'  && txt.indexOf('Amulet (skilling)')<0) bad.push(id+': header not tagged skilling');
        if(ty==='pendant' && txt.indexOf('Pendant (combat)')<0) bad.push(id+': header not tagged combat');
        if(txt.indexOf('Set ')<0) bad.push(id+': no set progress line');
      });
      return JSON.stringify({seen:seen, bad:bad});
    })()`));
    ok('every ring, amulet and pendant explains what its shape is for',
       jw.bad.length===0, JSON.stringify(jw.seen)+'; '+jw.bad.slice(0,6).join(' | '));
    ok('and the numbers it quotes come from the live set tables',
       ev(`(function(){
         var t=String(jewelryEnchantBlock('sapphire_pendant')).replace(/<[^>]*>/g,' ');
         var want=PENDANT_SETS.sapphire.desc.replace(/^[^:]*: */,'');
         return t.indexOf(want)>=0;
       })()`)===true);

    /* ── the seed vault (0.9.122.17) ─────────────────────────────────────────
       Eighteen crop ids used to sit in satchel slots the player buys with gold,
       and a full satchel refused a foraged seed outright — the same silent-loss
       shape the material bug at the top of this file guards. The migration is the
       risky half: it runs on every load and moves seeds out of state.items, so a
       save round-trip has to keep every seed and lose none. */
    section('Seed vault (0.9.122.17)');
    {
    const vault = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.xp.farming=XP_CUM[62];

      // a save written before the vault: seeds sitting in the satchel
      state.items={wildberry_seed:7, herb_seed:3, ancient_seed:4, oak_log:20};
      state.seeds={};
      normalizeState();
      const migrated={seedsMoved:(state.seeds.wildberry_seed||0)+(state.seeds.herb_seed||0),
                      stillInBag:(state.items.wildberry_seed||0)+(state.items.herb_seed||0),
                      ancientKept:state.items.ancient_seed||0,
                      logsKept:state.items.oak_log||0};

      // a foraged seed with a COMPLETELY full satchel must still arrive
      const cap=satchelCap();
      const pad=Object.keys(ITEMS).filter(function(i){
        return !isSeedId(i) && !ITEMS[i].tool && !ITEMS[i].skillGear; });
      state.items={};
      for(let i=0;i<cap+5 && i<pad.length;i++) state.items[pad[i]]=1;
      const wasFull=satchelUsed()>=satchelCap();
      const before=seedQty('wildberry_seed');
      grantItem('wildberry_seed',3);
      const gotWhileFull=seedQty('wildberry_seed')-before;

      // planting spends the vault, not the satchel
      state.seeds={wildberry_seed:2}; state.patches={};
      const planted=plantPatch('p1','wildberry_seed',true);
      const afterPlant=seedQty('wildberry_seed');
      const leakedToBag=(state.items.wildberry_seed||0);

      // and the vault is not slot-limited
      state.items={}; state.seeds={};
      CROPS.forEach(function(c){ addSeed(c.id, 999); });
      const allHeld=CROPS.every(function(c){ return seedQty(c.id)===999; });
      const satchelUntouched=satchelUsed();

      // a seed can still be sold, from wherever it now lives
      const sellable=sellableQty('wildberry_seed');
      bagTake('wildberry_seed',9);
      const afterSell=seedQty('wildberry_seed');

      return JSON.stringify({migrated:migrated, wasFull:wasFull, gotWhileFull:gotWhileFull,
        planted:planted, afterPlant:afterPlant, leakedToBag:leakedToBag,
        allHeld:allHeld, satchelUntouched:satchelUntouched,
        sellable:sellable, afterSell:afterSell});
    })()`));

    ok('an old save moves its seeds into the vault and loses none',
       vault.migrated.seedsMoved===10 && vault.migrated.stillInBag===0,
       JSON.stringify(vault.migrated));
    /* ancient_seed turned out to be BOTH: a Lv80 crop and the input to two
       alchemy recipes. So it does belong in the vault — and matHave plus the
       recipe spend had to learn to read it there, or both recipes became
       permanently uncraftable while the player was holding a stack. Ordinary
       items stay in the satchel. */
    ok('an ordinary item is left in the satchel', vault.migrated.logsKept===20);
    ok('a seed that is ALSO a recipe input can still be brewed with',
       ev(`(function(){
         state=defaultState(); normalizeState();
         state.xp.alchemy=XP_CUM[99];
         state.seeds={ancient_seed:5};
         state.items={tearmoss:99};
         var act=getAct('alchemy','al_h4');
         if(!act) return 'no recipe';
         var afford=canAfford(act,1,mods('alchemy'));
         completeAction(act,'alchemy',1);
         return afford+'/'+seedQty('ancient_seed')+'/'+((state.items.heal_draught_4||0)>0);
       })()`)==='1/4/true');
    ok('a foraged seed arrives even with a completely full satchel',
       vault.wasFull===true && vault.gotWhileFull===3,
       'full='+vault.wasFull+' got='+vault.gotWhileFull);
    ok('planting spends the vault and never touches the satchel',
       vault.planted===true && vault.afterPlant===1 && vault.leakedToBag===0,
       JSON.stringify([vault.planted, vault.afterPlant, vault.leakedToBag]));
    ok('the vault is uncapped and costs no satchel slots',
       vault.allHeld===true && vault.satchelUntouched===0,
       'satchel used '+vault.satchelUntouched);
    ok('a seed is still sellable now it lives elsewhere',
       vault.sellable===999 && vault.afterSell===990,
       'sellable '+vault.sellable+', left '+vault.afterSell);

    /* The panel is the only place seeds are visible now, so it has to name the
       vault and offer the sell path the satchel used to carry. */
    const panel = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.xp.farming=XP_CUM[62]; state.patches={}; _farmInteractAt=0; _fmSellSeeds=false;
      state.seeds={wildberry_seed:5, herb_seed:2};
      selectedSkill='farming'; renderFarming();
      const html=document.getElementById('activityGrid').innerHTML;
      return JSON.stringify({
        titled: html.indexOf('Seed Vault')>=0,
        saysWhere: html.indexOf('not in your satchel')>=0,
        chips: document.querySelectorAll('.fm-seed').length,
        sellToggle: !!document.querySelector('.fm-vsell'),
        count: (html.match(/7 seeds/)||[])[0]||''
      });
    })()`));
    ok('the farming panel names the vault and says seeds live there',
       panel.titled===true && panel.saysWhere===true);
    ok('it lists one chip per seed held, and offers the sell path',
       panel.chips===2 && panel.sellToggle===true, JSON.stringify(panel));

    /* Hovering a seed has to give the same card a satchel row gives — it is the
       only place seeds are visible now, so losing the hover would lose "where do
       I get this" for eighteen items. Dispatches a REAL mouseover so the
       delegated [data-item] handler runs; calling showItemTooltip directly would
       prove nothing, since the wiring is the whole question. */
    const seedHover = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.xp.farming=XP_CUM[62]; state.patches={}; _farmInteractAt=0;
      state.seeds={wildberry_seed:120, herb_seed:44};

      function hoverFirst(){
        var chips=[].slice.call(document.querySelectorAll('.fm-seed'));
        if(!chips.length) return {chips:0};
        if(typeof hideTooltip==='function') hideTooltip();
        chips[0].dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:120,clientY:120}));
        var tip=document.getElementById('itemTooltip');
        /* DOUBLE the backslash: this whole block is a template literal, so a
           lone \s collapses to 's' and the regex becomes /s+/g, which quietly
           deletes every letter s in the card and fails the sell-line check. */
        var txt=tip?tip.textContent.replace(/\\s+/g,' ').trim():'';
        var id=chips[0].getAttribute('data-item');
        return {
          chips:chips.length,
          tagged:chips.filter(function(c){return c.hasAttribute('data-item');}).length,
          shown:!!(tip && tip.style.display!=='none'),
          named:txt.indexOf(ITEMS[id].name)>=0,
          sources:txt.toLowerCase().indexOf('source')>=0,
          sells:txt.toLowerCase().indexOf('sells for')>=0
        };
      }

      _fmSellSeeds=false;
      selectedSkill='farming'; viewTab='acts'; renderCenter(); renderFarming();
      var plant=hoverFirst();

      // and it must survive the sell toggle, which restyles the same buttons
      _fmSellSeeds=true; _farmInteractAt=0; renderFarming();
      var sell=hoverFirst();
      _fmSellSeeds=false;

      return JSON.stringify({plant:plant, sell:sell});
    })()`));
    ok('every seed in the vault carries its item id for the hover card',
       seedHover.plant.chips===2 && seedHover.plant.tagged===2,
       JSON.stringify(seedHover.plant));
    ok('hovering one opens the same card the satchel opens',
       seedHover.plant.shown===true && seedHover.plant.named===true &&
       seedHover.plant.sources===true && seedHover.plant.sells===true,
       JSON.stringify(seedHover.plant));
    ok('and the card still works while the vault is in sell mode',
       seedHover.sell.shown===true && seedHover.sell.named===true,
       JSON.stringify(seedHover.sell));

    /* Five more slots from minute one, and a higher ceiling. */
    ok('a fresh satchel starts at 33 slots',
       ev(`(function(){ state=defaultState(); normalizeState(); return satchelCap(); })()`)===33);
    ok('and the ceiling is 333',
       ev(`(function(){ state=defaultState(); normalizeState();
         state.satchelUpgrades=SATCHEL_MAX_EXPANSIONS; return satchelCap(); })()`)===333);
    }

    /* ── every weapon says what weight class it is (ticket #53) ──────────────
       "The Shields and the Bucklers mention light weapons in their tooltips, but
       the weapons don't tell us if they are light or I am guessing Heavy."

       The same gap 0.9.120 closed for damage type. weaponClass() drives a tiered
       crit bonus, both class synergies, and whether a shield can be braced at all,
       and no weapon stated it. The class line reads off weaponClass() so it cannot
       drift from what combat does. */
    const wclass = JSON.parse(ev(`(function(){
      var counts={}, missing=[], no2h=[], n=0;
      Object.keys(ITEMS).forEach(function(id){
        var it=ITEMS[id];
        if(!it.cgear || it.cslot!=='weapon') return;
        n++;
        var wc=weaponClass(id);
        counts[wc||'null']=(counts[wc||'null']||0)+1;
        var txt=String(combatGearStatBlock(id)).replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ');
        if(!/(Light|Heavy|Standard) weapon/.test(txt)) missing.push(id+' ('+wc+')');
        if(it.twoHanded && txt.indexOf('two-handed')<0) no2h.push(id);
      });
      return JSON.stringify({n:n, counts:counts, missing:missing, no2h:no2h});
    })()`));
    ok('every weapon states its weight class', wclass.missing.length===0,
       wclass.n+' weapons '+JSON.stringify(wclass.counts)+
       (wclass.missing.length?'; missing: '+wclass.missing.slice(0,6).join(', '):''));
    ok('and every two-hander says it takes both hands', wclass.no2h.length===0,
       wclass.no2h.join(', '));
    /* Non-weapons must NOT grow the line — a shield has no weight class of its own,
       and weaponClass() returns one for anything carrying a dmgType. */
    ok('a shield does not claim a weight class',
       ev(`(function(){
         var sid=Object.keys(ITEMS).find(function(id){
           return ITEMS[id].cgear && ITEMS[id].cslot==='shield'; });
         if(!sid) return true;
         return !/(Light|Heavy|Standard) weapon/.test(
           String(combatGearStatBlock(sid)).replace(/<[^>]*>/g,' ').replace(/\\s+/g,' '));
       })()`)===true);

    /* ── a suspend mid-session settles instead of vanishing ──────────────────
       Ticket #52: "OS Lock doesn't continue current activity nor triggers offline
       mode." Locking the screen occludes the window, the engine throttles tick,
       the 100ms combat timer and the 5s autosave together, and the time fell
       between the game's two states — not closed, so the boot path never settled
       it; not running, because skilling's catch-up is clamped to
       TICK_CATCHUP_MAX_MS and combat takes one swing per tick however long the gap.

       Simulated by moving lastSeen and the tick's own wall-clock back, which is
       exactly the state a resume lands in: the autosave that stamps lastSeen was
       throttled too, so it is stale by the length of the lock. */
    const suspend = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      mmAtMenu=false; mmSlot=1;
      state.xp.woodcutting=XP_CUM[40];
      state.action={skill:'woodcutting',actId:(gdBestActs('woodcutting')[0]||{}).id};
      state.actionStart=Date.now();

      const before={xp:state.xp.woodcutting, off:state.offlineXp||0};

      // 30 seconds of lag: under the clamp, so the ordinary catch-up handles it
      // and NO offline settlement should fire.
      _lastTickWall=Date.now()-30000;
      state.lastSeen=Date.now()-30000;
      tick();
      const short={off:(state.offlineXp||0)-before.off};

      // 25 minutes locked: past the clamp, so it settles as away time.
      const off0=state.offlineXp||0;
      _lastTickWall=Date.now()-25*60000;
      state.lastSeen=Date.now()-25*60000;
      tick();
      const long={off:(state.offlineXp||0)-off0, actionStart:state.actionStart, now:Date.now()};

      return JSON.stringify({short:short, long:long, stillGoing:!!state.action});
    })()`));
    ok('a brief stall does NOT trigger an offline settlement',
       suspend.short.off===0, 'offline xp moved by '+suspend.short.off);
    ok('a 25 minute lock pays the away time instead of dropping it',
       suspend.long.off>0, 'offline xp gained '+suspend.long.off);
    ok('and the action clock is reset so the catch-up cannot pay it twice',
       Math.abs(suspend.long.now-suspend.long.actionStart)<2000,
       'actionStart is '+(suspend.long.now-suspend.long.actionStart)+'ms behind now');
    ok('the activity is still running afterwards', suspend.stillGoing===true);

    /* ── EVERY quest a guild can roll is completable ─────────────────────────
       The broadest guard in the file: it rolls the whole quest space at four level
       bands and asks, of each one, "could the player actually finish this today?"

       An act declares only cat/coins/id/inp/lvl/minMs/ms/name/out/spdMult/subcat/xp
       — level is the ONLY gate on doing one, which is what makes this checkable at
       all. If a gating field is ever added, this test keeps passing while the game
       breaks, so add it to gdBestActs at the same time. */
    const doable = JSON.parse(ev(`(function(){
      var bad={}, counts={};
      var note=function(k,m){ if(!bad[k]) bad[k]=[]; if(bad[k].indexOf(m)<0) bad[k].push(m); };
      [[99,99,57],[70,65,36],[40,35,18],[15,15,4]].forEach(function(c){
        for(var k in SKILLS) state.xp[k]=XP_CUM[c[0]];
        state.combatXp={attack:XP_CUM[c[1]],strength:XP_CUM[c[1]],defence:XP_CUM[c[1]],hitpoints:XP_CUM[c[1]]};
        state.monKills={}; MONSTERS.slice(0,c[2]).forEach(function(m){ state.monKills[m.id]=5; });
        state.gd={}; GUILDS.forEach(function(g){ gdJoin(g.id); });

        /* Reachability comes from the GAME'S OWN source map, which is the same index
           the item tooltip uses to answer "where do I get this" — acts, rare drops
           off those acts, crops, monster and boss drops, raid loot. A hand-rolled
           map built from act outputs alone reported 78 false positives, because it
           did not know about gem drops, sailing haul or shop stock. */
        var SM=buildSourceMap();
        var have={};
        Object.keys(SM).forEach(function(id){
          var reachable=(SM[id]||[]).some(function(src){
            if(!src) return false;
            if(src.skKey && SKILLS[src.skKey]) return levelFromXp(state.xp[src.skKey]||0) >= (src.reqLvl||1);
            return true;                    // a drop / boss / raid source has no skill gate
          });
          if(reachable) have[id]=1;
        });

        for(var pass=0; pass<120; pass++){
          GUILDS.forEach(function(g){
            ['small','standard','long'].forEach(function(sz){
              var q=gdRollOne(g,sz);
              if(!q){ note('null', g.id+'/'+sz+' rolled nothing'); return; }
              counts[q.kind]=(counts[q.kind]||0)+1;
              if(!(q.need>0)) note(q.kind, g.id+': need is '+q.need);

              if(q.kind==='kill'){
                if(!state.monKills[q.target]) note('kill', g.id+': '+q.target+' never fought');
                return;
              }
              if(q.kind==='coin') return;               // gold is always obtainable
              if(q.kind==='do'){
                if(!q.act) return;                      // farming's tend quest names none
                var a=(SKILLS[q.skill].acts||[]).find(function(x){ return x.id===q.act; });
                if(!a){ note('do', g.id+': act '+q.act+' does not exist'); return; }
                var lv=(a.id==='co8')?highFishUnlockLevel():(a.lvl||1);
                if(levelFromXp(state.xp[q.skill]||0)<lv) note('do', g.id+': '+q.act+' is above level');
                Object.keys(a.out||{}).forEach(function(id){
                  if(ITEMS[id]&&(ITEMS[id].tool||ITEMS[id].skillGear))
                    note('do', g.id+': '+q.act+' makes the one-time '+id); });
                return;
              }
              var lines=(q.kind==='supply')?Object.keys(q.items||{}):[q.target];
              lines.forEach(function(id){
                if(!ITEMS[id]) note(q.kind, g.id+': '+id+' is not an item');
                else if(ITEMS[id].tool||ITEMS[id].skillGear) note(q.kind, g.id+': '+id+' is a one-time unlock');
                else if(!have[id]) note(q.kind, g.id+': no source at this level for '+id);
              });
            });
          });
        }
      });
      var n=0; for(var k in counts) n+=counts[k];
      return JSON.stringify({n:n, counts:counts, bad:bad});
    })()`));
    const undoable = Object.keys(doable.bad);
    ok(doable.n.toLocaleString()+' rolled quests are every one of them completable',
       undoable.length===0,
       undoable.map(k => k+': '+doable.bad[k].slice(0,4).join('; ')).join('\n       '));
    ok('and all five quest shapes turned up in that sweep',
       ['do','deliver','supply','coin','kill'].every(k => (doable.counts[k]||0) > 0),
       JSON.stringify(doable.counts));

    /* ── the potion a quest names can be found in the Alchemy panel ──────────
       Steam report (nanook, 2026-09-02): "I had a quest for a potion that doesn't
       seem to exist". It existed. 0.9.122.6 collapsed 40 brewing recipes into 24
       cards TITLED FOR THE LADDER, so a card read "Ironhide" while every other
       surface in the game — the satchel, a drop, a guild quest — called the thing
       "Ironhide Potion II". 34 of the 40 could not be found by the name the player
       was handed. */
    const potions = JSON.parse(ev(`(function(){
      for(var k in SKILLS) state.xp[k]=XP_CUM[99];
      var text='', pips=[];
      ['skilling','combat'].forEach(function(side){
        _alchTab=side; selectedSkill='alchemy'; viewTab='acts';
        renderCenter(); renderAlchemy();
        var g=document.getElementById('activityGrid');
        text+=' ~~ '+g.textContent;
        [].slice.call(g.querySelectorAll('.al-pips button[data-item]'))
          .forEach(function(b){ pips.push(b.getAttribute('data-item')); });
      });
      var missing=[], total=0;
      (SKILLS.alchemy.acts||[]).forEach(function(a){
        var id=Object.keys(a.out||{})[0];
        if(!id||!ITEMS[id]) return;
        total++;
        var nm=ITEMS[id].name;
        // findable = printed on a card, or reachable from a tier pip that names it
        if(text.indexOf(nm)>=0) return;
        if(pips.indexOf(id)>=0) return;
        if(missing.indexOf(nm)<0) missing.push(nm);
      });
      return JSON.stringify({total:total, missing:missing});
    })()`));
    ok('every alchemy output is findable by the name a quest prints for it',
       potions.missing.length===0,
       potions.missing.length+' of '+potions.total+' missing: '+potions.missing.join(', '));

    ok('a ladder card names the rung it is set to, not just the ladder',
       ev(`(function(){
         _alchTab='combat'; selectedSkill='alchemy'; viewTab='acts';
         renderCenter(); renderAlchemy();
         var subs=[].slice.call(document.querySelectorAll('#activityGrid .al-nm i'))
           .map(function(e){ return e.textContent; }).join(' | ');
         return /Potion|Elixir|Draught|Brew/.test(subs);
       })()`)===true);

    /* The other half of the same report: a deliver quest's title now carries the
       item, so the shared satchel card answers "where do I get this" on hover. */
    ok('a deliver quest title carries its item for the hover card',
       ev(`(function(){
         if(!state.gd.delvers){ state.xp.mining=XP_CUM[99]; gdJoin('delvers'); }
         state.gd.delvers.q=[{kind:'deliver',size:'small',skill:'mining',target:'iron_ore',
           name:'Deliver 40 Iron Ore',need:40,have:0,done:false}];
         _gdOpen='delvers'; viewTab='guild'; renderGuilds();
         var b=document.querySelector('#guildView .gd-qt b[data-item]');
         return !!b && b.getAttribute('data-item')==='iron_ore';
       })()`)===true);

    // ── emerald finally offers something on the combat side ────────────────
    const em = JSON.parse(ev(`JSON.stringify({
      gaps:Object.keys(ENCHANTS_BY_GEM).filter(g=>!ENCHANTS_BY_GEM[g].some(id=>ENCHANTS[id]&&ENCHANTS[id].cat==='combat')),
      name:ENCHANTS.manatarms_ii&&ENCHANTS.manatarms_ii.name,
      atk:ENCHANTS.manatarms_ii&&ENCHANTS.manatarms_ii.bonus.atkBoost,
      def:ENCHANTS.manatarms_ii&&ENCHANTS.manatarms_ii.bonus.defBoost,
      listed:ENCHANTS_BY_GEM.emerald.indexOf('manatarms_ii')>=0,
      tier:ENCHANTS.manatarms_ii&&ENCHANTS.manatarms_ii.tier,
      priced:!!_ewCostFor('emerald_ring').cost
    })`));
    section('Somewhere to sell what you stole (0.9.122.42)');
    {
    /* "there is no general shop to buy your stolen goods in nightmarket....."
       There was not, and building it turned up why it mattered: hotSellMult() was
       applied inside effectiveItemSell(), which is what the SATCHEL uses. So ranking
       up the Nightmarket raised what the general store gave you, the store and the
       guild paid the identical number, and four of the guild's six ranks bought
       nothing you could not already have had. */
    const price = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var read=function(){
        return {store:effectiveItemSell('crown_shard'), market:nightmarketSell('crown_shard')};
      };
      var out={};
      state.gd={};                                          out.none=read();
      state.gd={night:{rep:0,q:[],day:-1,skipped:0}};       out.rank1=read();
      state.gd.night.rep=150000;                            out.rank6=read();
      state.tree={thieving:{th_master2:1}};                 out.rank6node=read();
      state.tree={};
      out.base=ITEMS.crown_shard.sell;
      return JSON.stringify(out);
    })()`));
    /* The store's number must not move. That is the entire defect. */
    ok('the general store pays the same whatever your rank',
       price.none.store === price.rank1.store && price.rank1.store === price.rank6.store,
       JSON.stringify({none: price.none.store, r1: price.rank1.store, r6: price.rank6.store}));
    ok('and it pays a third of what the thing is worth',
       price.none.store === Math.round(price.base * 0.35), price.none.store + ' of ' + price.base);
    ok('an unjoined thief gets the store price at the counter too',
       price.none.market === price.none.store, JSON.stringify(price.none));
    ok('every rank raises what the counter pays, and only the counter',
       price.rank1.market > price.none.market && price.rank6.market > price.rank1.market,
       JSON.stringify({r1: price.rank1.market, r6: price.rank6.market}));
    ok('the top rank is full price', price.rank6.market === price.base,
       price.rank6.market + ' of ' + price.base);
    ok('and Better Prices rides on top of it',
       price.rank6node.market > price.rank6.market,
       price.rank6.market + ' -> ' + price.rank6node.market);

    /* The counter itself. */
    const counter = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.gd={night:{rep:150000,q:[],day:-1,skipped:0}};
      state.items={cut_purse:5, crown_shard:2, iron_ore:99};
      if(!document.getElementById('guildView')){
        var h=document.createElement('div'); h.id='guildView'; document.body.appendChild(h); }
      _gdOpen='night'; renderGuilds();
      var v=document.getElementById('guildView');
      var rows=[].slice.call(v.querySelectorAll('.gd-sellcard'));
      var out={rows:rows.length, names:rows.map(function(r){
        return (r.querySelector('.nm')||{textContent:''}).textContent; }),
        hasAll:!!v.querySelector('.gd-sellall')};
      /* It belongs in the RIGHT column, under the titles. In the left column it was
         twelve full-width rows under the quests and the whole panel scrolled. */
      var cols=v.querySelectorAll('.gd-col');
      out.inRightCol=cols.length===2 && cols[1].querySelectorAll('.gd-sellcard').length===rows.length
                     && cols[0].querySelectorAll('.gd-sellcard').length===0;
      out.isGrid=!!v.querySelector('.gd-sellgrid');
      /* And it must not appear on a guild that does not buy. */
      state.gd.timber={rep:150000,q:[],day:-1,skipped:0};
      _gdOpen='timber'; renderGuilds();
      out.onTimber=v.querySelectorAll('.gd-sellcard').length;
      /* Empty satchel says so rather than showing nothing. */
      state.items={}; _gdOpen='night'; renderGuilds();
      out.emptySays=!!v.querySelector('.gd-sell-none');
      return JSON.stringify(out);
    })()`));
    ok('the Nightmarket has a counter, listing only what you actually stole',
       counter.rows === 2 && counter.names.join(' ').indexOf('Iron Ore') < 0,
       JSON.stringify(counter.names));
    ok('with a sell-the-lot button', counter.hasAll === true);
    ok('sitting in the right column as a grid, not a stack of long rows',
       counter.inRightCol === true && counter.isGrid === true,
       JSON.stringify({right: counter.inRightCol, grid: counter.isGrid}));
    ok('and no other guild grows one', counter.onTimber === 0, String(counter.onTimber));
    ok('an empty satchel says so instead of rendering nothing', counter.emptySays === true);

    /* An act may name its own icon (0.9.122.42), because Thieving and Agility make
       nothing and every card in those two showed the skill glyph. Guarded on the art
       existing, so the ids can be written before the sheet is drawn. */
    const acts = JSON.parse(ev(`(function(){
      var named=SKILLS.thieving.acts.filter(function(a){ return !!a.iconId; }).length;
      var dupes={}, clash=[];
      SKILLS.thieving.acts.forEach(function(a){
        if(!a.iconId) return;
        if(dupes[a.iconId]) clash.push(a.iconId);
        dupes[a.iconId]=1;
      });
      return JSON.stringify({named:named, total:SKILLS.thieving.acts.length, clash:clash});
    })()`));
    ok('every Thieving job names its own icon, and no two share one',
       acts.named === 14 && acts.named === acts.total && acts.clash.length === 0,
       JSON.stringify(acts));
    ok('and the card falls back safely if that art ever goes missing',
       /act\.iconId&&typeof ICONS!=='undefined'&&ICONS\[act\.iconId\]/.test(html));
    /* The art landed in 0.9.122.44, so every one of the fourteen must resolve to a
       painting rather than the skill glyph. Fourteen identical masks is the state
       this whole thing existed to leave. */
    const actArt = JSON.parse(ev(`(function(){
      var bad=[], same=0, skill=iconHTML('thieving');
      SKILLS.thieving.acts.forEach(function(a){
        var h=a.iconId?iconHTML(a.iconId):'';
        if(h.indexOf('<img')!==0) bad.push(a.name+' is not painted');
        if(h===skill) same++;
      });
      return JSON.stringify({bad:bad, sameAsSkill:same});
    })()`));
    ok('all fourteen job icons are painted, and none is the skill glyph',
       actArt.bad.length === 0 && actArt.sameAsSkill === 0,
       actArt.bad.join(', ') + ' same-as-skill: ' + actArt.sameAsSkill);
    }

    section('The skip button you could never find (0.9.122.41)');
    {
    /* "add a skip button for quests i dont see it anywhere even though we technically
       have it?" It was there and it had never been reachable where it mattered. The
       row had ONE button slot running through a five-branch if, and Skip was the last
       branch -- so it only ever appeared on a `do` or `kill` quest you had not
       finished. Every deliver, supply and coin order showed "Need 24 more" instead,
       and those are exactly the ones you want to skip. */
    const skip = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[99];
      if(!document.getElementById('guildView')){
        var h=document.createElement('div'); h.id='guildView'; document.body.appendChild(h); }
      var out={kinds:{}, missing:[]};
      /* Every guild, so the answer does not depend on which quest kinds one board
         happens to roll today. */
      state.gd={};
      GUILDS.forEach(function(g){ state.gd[g.id]={rep:9000,q:[],day:-1,skipped:0}; });
      GUILDS.forEach(function(g){
        gdRollQuests(g.id,true);
        _gdOpen=g.id; renderGuilds();
        var v=document.getElementById('guildView');
        var rows=v.querySelectorAll('.gd-q').length;
        var skips=v.querySelectorAll('.gd-skip').length;
        if(rows!==skips) out.missing.push(g.id+': '+skips+' skips on '+rows+' quests');
      });
      /* Kind coverage needs more than one board: a coin order is a 22% roll on one
         guild, so thirty quests is a coin flip on whether the assertion sees one.
         Roll the Nightmarket forty times and render each, so the rows-have-skips
         check above covers every kind rather than whichever three came up. */
      _gdOpen='night';
      for(var t=0;t<40;t++){
        state.gd.night.skipped=0; gdRollQuests('night',true); renderGuilds();
        var vv=document.getElementById('guildView');
        var rr=vv.querySelectorAll('.gd-q').length, ss=vv.querySelectorAll('.gd-skip').length;
        if(rr!==ss) out.missing.push('night roll '+t+': '+ss+' skips on '+rr+' quests');
        state.gd.night.q.forEach(function(q){ out.kinds[q.kind]=(out.kinds[q.kind]||0)+1; });
      }
      /* And it still does what it did: swaps the quest, once a day. */
      _gdOpen='night'; state.gd.night.skipped=0; gdRollQuests('night',true);
      out.sameBack=0;
      for(var n=0;n<20;n++){
        state.gd.night.skipped=0; gdRollQuests('night',true);
        var before=state.gd.night.q[0].name;
        gdSkip('night',0);
        if(state.gd.night.q[0].name===before) out.sameBack++;
      }
      out.count=state.gd.night.skipped;
      var second=state.gd.night.q[0].name;
      gdSkip('night',0);
      out.secondBlocked=state.gd.night.q[0].name===second;
      renderGuilds();
      var v2=document.getElementById('guildView');
      out.liveAfterUse=v2.querySelectorAll('.gd-skip:not(.off)').length;
      return JSON.stringify(out);
    })()`));
    ok('every quest has a skip, in every guild',
       skip.missing.length === 0, skip.missing.join(' | '));
    /* The kinds that never had one are the whole point, so name them. */
    ok('including the deliver, supply and coin orders that never had one',
       ['deliver','supply','coin'].every(k => (skip.kinds[k] || 0) > 0),
       JSON.stringify(skip.kinds));
    /* Run twenty times, because the failure this catches is probabilistic: the reroll
       used to be allowed to land on the quest it was replacing, so you spent your one
       skip for the day and the board did not change. */
    ok('and the quest it gives back is never the one you skipped',
       skip.sameBack === 0 && skip.count === 1,
       skip.sameBack + ' of 20 skips returned the same quest');
    ok('still only once a day', skip.secondBlocked === true && skip.liveAfterUse === 0,
       'live skips after using one: ' + skip.liveAfterUse);
    }

    section('The guild shop says what it is selling, and no one says fence (0.9.122.40)');
    {
    /* The Nightmarket read "The runner's map / Needs Fence / 120" and nothing on the
       card said what any of that meant. A locked row printed its requirement INSTEAD
       of its description, so the one state where you most need to know whether a
       thing is worth ranking up for was the one state that never told you. */
    const gd = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.gd={}; var bad=[], noRank=[];
      GUILDS.forEach(function(g){
        state.gd[g.id]={rep:0,q:[],day:-1,skipped:0};
        gdShopFor(g.id).forEach(function(r){
          if(!r.desc||!r.desc.length) bad.push(g.id+'/'+r.id+' has no description');
          if(r.locked && !/^Unlocks at rank [0-9]/.test(r.lockTxt)) noRank.push(g.id+'/'+r.id+': '+r.lockTxt);
        });
      });
      /* And the Nightmarket board, which used to say "Fence 30 Dragon Ring" about a
         ring you had smithed yourself. */
      state.gd.night={rep:0,q:[],day:-1,skipped:0};
      for(var k in state.xp) state.xp[k]=XP_CUM[80];
      var names=[];
      for(var d=0;d<60;d++){ gdRollQuests('night',true);
        state.gd.night.q.forEach(function(q){ names.push(q.name); }); }
      return JSON.stringify({bad:bad, noRank:noRank,
        fenceQuests:names.filter(function(n){ return /fence/i.test(n); }).slice(0,3),
        sellQuests:names.filter(function(n){ return /^Sell /.test(n); }).length,
        quests:names.length, nightRanks:GD_BY.night.titles});
    })()`));
    ok('every shop row says what it is, locked or not',
       gd.bad.length === 0, gd.bad.join(' | '));
    ok('and a locked one says which RANK opens it',
       gd.noRank.length === 0, gd.noRank.slice(0, 3).join(' | '));

    /* Jordan: "is it stuff stolen from thieving? or do u craft it and sell it? like
       gravesteel sword, you cant steal that right? so why does it say fence." Half
       the Nightmarket board asks for crafted goods, so the verb was not just obscure,
       it was wrong. The word is gone from every string a player can read. */
    ok('no Nightmarket quest says fence', gd.fenceQuests.length === 0,
       gd.fenceQuests.join(' | '));
    ok('it says sell instead', gd.sellQuests > 0,
       gd.sellQuests + ' of ' + gd.quests + ' quests');
    ok('and no rank is called Fence', gd.nightRanks.indexOf('Fence') < 0,
       gd.nightRanks.join(', '));

    /* The sweep, over the surfaces the word actually reached: guild perk text, skill
       tree node names and descriptions, and every guild shop title. Scanning the whole
       file for the string is not the test -- three comments exist to explain WHY it was
       removed and have to keep saying it. */
    const noFence = JSON.parse(ev(`(function(){
      var strip=function(t){ return String(t||'').replace(/defence|offence/gi,''); };
      var hits=[];
      GUILDS.forEach(function(g){
        (g.perkTxt||[]).forEach(function(t){ if(/fence/i.test(strip(t))) hits.push(g.id+' perk: '+t); });
        (g.titles||[]).forEach(function(t){ if(/fence/i.test(strip(t))) hits.push(g.id+' rank: '+t); });
      });
      for(var sk in TREES) TREES[sk].forEach(function(n){
        if(/fence/i.test(strip(n.name))) hits.push(sk+' node: '+n.name);
        var d=''; try{ d=(typeof n.desc==='function')?n.desc(1):n.desc; }catch(e){}
        if(/fence/i.test(strip(d))) hits.push(sk+' node desc: '+n.name);
      });
      state.gd={}; GUILDS.forEach(function(g){
        state.gd[g.id]={rep:0,q:[],day:-1,skipped:0};
        gdShopFor(g.id).forEach(function(r){
          if(/fence/i.test(strip(r.title))) hits.push(g.id+' shop: '+r.title);
          if(/fence/i.test(strip(r.desc)))  hits.push(g.id+' shop desc: '+r.title);
        });
      });
      return JSON.stringify(hits);
    })()`));
    ok('nothing the player can read uses the word', noFence.length === 0,
       noFence.slice(0, 4).join(' | '));
    }

    section('The Settings panel, and two more names (0.9.122.39)');
    {
    /* The game menu was grouped and given a Back button; the panels it OPENS were
       not. Settings was ten undifferentiated rows in a 1,033px column, four of them
       shortcuts to things the menu you just came from already lists. */
    const set = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var m=document.getElementById('mmSettingsModal');
      m.classList.remove('mm-hidden');
      /* In game: the four shortcuts belong to the menu, not here. */
      mmAtMenu=false; mmSlot=1; mmOpenSettings();
      var more=document.getElementById('mmSetMore');
      var inGame={rows:m.querySelectorAll('.set-row').length,
                  secs:m.querySelectorAll('.gm-sec').length,
                  moreHidden:!!more && more.classList.contains('gm-hide')};
      /* On the title screen there is no menu, so they are the only way in. */
      mmAtMenu=true; mmSlot=0; mmOpenSettings();
      var onTitle={moreHidden:!!more && more.classList.contains('gm-hide')};
      m.classList.add('mm-hidden');
      return JSON.stringify({inGame:inGame, onTitle:onTitle,
        secLabels:[].slice.call(m.querySelectorAll('.gm-sec')).map(function(e){return e.textContent;})});
    })()`));
    ok('Settings is grouped the way the menu is',
       set.inGame.secs >= 3 && set.secLabels.indexOf('Display') >= 0 && set.secLabels.indexOf('Cursor') >= 0,
       JSON.stringify(set.secLabels));
    /* The gm-hide rule was written as `.set-row.gm-hide`, and #mmSetMore is a
       wrapper rather than a row -- so the class went on and nothing happened. */
    ok('and the shortcuts it duplicates are gone in game',
       set.inGame.moreHidden === true, JSON.stringify(set.inGame));
    ok('but still there on the title screen, where nothing else reaches them',
       set.onTitle.moreHidden === false, JSON.stringify(set.onTitle));
    ok('the hide rule actually covers the wrapper',
       /#mmSetMore\.gm-hide/.test(html) && /display:none/.test(html));

    ok('Radcliff and OneFlame are in the credits',
       html.indexOf('Radcliff') > 0 && html.indexOf('OneFlame') > 0);
    }

    section('Items that are only worth selling (ticket #70)');
    {
    /* "If something is just for selling, it would be nice to have an indicator in the
       tooltip." The absence of a "Used in" section used to mean either nothing wants
       this OR the tooltip does not know, and there was no way to tell which.

       The dangerous half is the reverse mistake. Nine items open a BOSS LAIR and are
       consumed by no recipe at all; a Warlord's Totem sells for 11,000 gold, and a
       tooltip calling it vendor trash costs someone the Ogre Warlord. */
    const use = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var by={};
      Object.keys(ITEMS).forEach(function(i){ var k=itemUseKind(i); (by[k]=by[k]||[]).push(i); });
      var keys=MONSTERS.filter(function(m){ return m.bossReq; }).map(function(m){ return m.bossReq; });
      var miskeyed=keys.filter(function(i){ return itemUseKind(i)!=='bosskey'; });
      /* The enchanting reagents are the ones this nearly got wrong: buildUsageMap
         guarded on a const that never existed, so they read as used by nothing. */
      var ench=['arcane_dust','rune_fragment','mana_essence','gem_dust','void_cinder'];
      var enchMissing=ench.filter(function(i){ return itemUseKind(i)!=='recipe'; });
      return JSON.stringify({counts:Object.keys(by).reduce(function(a,k){a[k]=by[k].length;return a;},{}),
        none:(by.none||[]).sort(), keyCount:keys.length, miskeyed:miskeyed, enchMissing:enchMissing});
    })()`));
    ok('every boss key is known to be a boss key, not vendor trash',
       use.keyCount === 9 && use.miskeyed.length === 0, use.miskeyed.join(', '));
    /* Named one by one rather than counted. An item that GAINS a use should drop off
       this list and fail here, and a new item that should have had one and does not
       should appear here and fail — that is the whole point of writing them out. */
    /* birds_nest left this list in 0.9.124: Fletching strips it for eight feathers,
       so it is no longer an item nothing in the game wants. */
    const SELL_ONLY = ['abyssal_scale','barrow_dust','charcoal','cut_purse',
      'drakeforged_rune','ember_resin','energy_crystal','goblin_ear','golden_spore',
      'jewelled_dagger','pocket_watch','riftshard','runed_bone','sealed_letter',
      'signet_ring','silver_plate','splintered_club','stamina_shard','void_essence',
      /* Added 0.9.122.41. Stolen goods exist to be sold; that is the point of them. */
      'silver_censer','smuggler_ledger','heirloom_locket','officers_sabre',
      'bankers_seal','crown_shard'];
    const added = use.none.filter(i => SELL_ONLY.indexOf(i) < 0);
    const gone  = SELL_ONLY.filter(i => use.none.indexOf(i) < 0);
    ok('and the sell-only list is exactly what it was reviewed as',
       added.length === 0 && gone.length === 0,
       (added.length ? 'newly unused: ' + added.join(', ') + '  ' : '')
       + (gone.length ? 'gained a use: ' + gone.join(', ') : ''));
    /* The bug this fix found on its way past. */
    ok('enchanting reagents count as used',
       use.enchMissing.length === 0, use.enchMissing.join(', '));

    /* And the lines actually reach the tooltip. */
    const tip = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var tt=ttEl();
      function tipFor(id){ showItemTooltip(id,10,10,''); return tt.textContent; }
      return JSON.stringify({
        ear:tipFor('goblin_ear'),
        key:tipFor('warlord_totem'),
        ore:tipFor('iron_ore')
      });
    })()`));
    ok('a Goblin Ear says it is only worth selling',
       /Nothing uses this/.test(tip.ear), tip.ear.slice(0, 120));
    ok('a boss key says what it opens and does NOT say sell it',
       /Ogre Warlord/.test(tip.key) && !/Nothing uses this/.test(tip.key), tip.key.slice(0, 140));
    ok('and an ordinary material says neither',
       !/Nothing uses this/.test(tip.ore) && !/lair/.test(tip.ore), tip.ore.slice(0, 100));
    }

    section('Mastery, and five names starting with Chitin (tickets #67, #68)');
    {
    /* #67 -- "Alchemy, Cooking, and Farming have no mastery levels or are not showing
       their mastery levels." Both, for two different reasons, and neither throws.

       Five skills draw their own cards instead of using buildActBtn, and buildActBtn
       was the only thing that ever drew the mastery row. Jeweler and crafting nest a
       real act card inside their category menus and got it for free; alchemy and
       cooking build theirs from scratch and did not. Farming is worse: it harvests
       through harvestPatch(), and recordMastery has only ever been called from
       completeAction, so farming mastery was a flat zero since mastery shipped. */
    const mast = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[99];
      var shown={}, missing=[];
      for(var k in SKILLS){
        state.mastery={}; selectedSkill=k; viewTab='skills';
        try{ _farmCropsOpen=true; }catch(e){}
        if(k==='cooking') state.cookingFire={loaded:{pine_log:500},lit:true,partialSec:0};
        try{ renderActivities(); }catch(e){ missing.push(k+' render threw: '+e.message); continue; }
        var grid=document.getElementById('activityGrid');
        var rows=grid?grid.querySelectorAll('.mastery-row').length:0;
        shown[k]=rows;
        if(!rows) missing.push(k);
      }
      return JSON.stringify({shown:shown, missing:missing});
    })()`));
    ok('every skill panel shows mastery on its cards',
       mast.missing.length === 0, mast.missing.join(', ') + '  ' + JSON.stringify(mast.shown));

    /* Farming's half. It is not enough that the row renders -- it has to move. */
    const farm = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.xp.farming=XP_CUM[99];
      var crop=CROPS[0];
      state.seeds[crop.id]=80; state.mastery={};
      var plots=(typeof farmPatches==='function')?farmPatches():null;
      var id=plots&&plots[0]?plots[0].id:'p1';
      var n=0;
      for(var i=0;i<40;i++){
        plantPatch(id, crop.id, true);
        if(state.patches&&state.patches[id]){
          state.patches[id].plantedAt=Date.now()-crop.growMs*3;
          state.patches[id].lastTend=Date.now();
          if(harvestPatch(id,true)) n++;
        }
      }
      return JSON.stringify({harvests:n, key:'crop_'+crop.id,
        value:state.mastery['crop_'+crop.id]||0,
        level:masteryLevel('crop_'+crop.id),
        keys:Object.keys(state.mastery).length});
    })()`));
    ok('a farming harvest records mastery, keyed by crop',
       farm.harvests > 30 && farm.value === farm.harvests && farm.level > 0,
       JSON.stringify(farm));

    /* One definition of the row, so a sixth bespoke panel cannot be written without
       one -- which is exactly how three of them ended up without one. */
    ok('the mastery row has a single definition',
       (html.match(/class="mastery-row"/g) || []).length === 1,
       String((html.match(/class="mastery-row"/g) || []).length) + ' places build it');

    /* #68 -- "I am fairly certain that I got a couple Chitinweave pieces while killing
       spiders." The tables were right and the log was complete; the names were not.
       Spider Hollow dropped Chitin Shard, Chitin Plating, Chitin Plate, Chitin Maul
       and fed a Chitinweave armour set, with an armour piece and a crafting material
       three letters apart. */
    const chit = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      /* Everything the zone drops must still be IN the log -- that is the half of the
         report that was already true and has to stay true. */
      var missing=[];
      monstersInZone('spider_hollow').forEach(function(m){
        (MONSTER_DROPS[m.id]||[]).forEach(function(d){
          if(!ITEMS[d.id]) missing.push(m.id+' drops unknown '+d.id);
        });
      });
      /* And no two items a single zone drops may have names that differ only by a
         suffix -- that is the confusion itself, stated as a rule. */
      var names={}, clash=[];
      monstersInZone('spider_hollow').forEach(function(m){
        (MONSTER_DROPS[m.id]||[]).forEach(function(d){
          if(ITEMS[d.id]) names[ITEMS[d.id].name]=d.id;
        });
      });
      var list=Object.keys(names);
      list.forEach(function(a){ list.forEach(function(b){
        if(a!==b && b.indexOf(a)===0) clash.push(a+' / '+b);
      }); });
      return JSON.stringify({missing:missing, clash:clash, dropNames:list,
        hide:ITEMS.chitin.name, armour:ITEMS.chitin_plate.name});
    })()`));
    ok('every Spider Hollow drop is a real item the log can list',
       chit.missing.length === 0, chit.missing.join(', '));
    ok('and no two of them are one suffix apart',
       chit.clash.length === 0, chit.clash.join(' | ') + '  ' + JSON.stringify(chit.dropNames));
    ok('the spider hide and the spider chestpiece are named apart',
       chit.hide === 'Spider Carapace' && chit.armour === 'Broodplate Cuirass',
       JSON.stringify({hide: chit.hide, armour: chit.armour}));
    }

    section('A perk that does nothing, and a row that clipped (tickets #65, #66)');
    {
    /* #65 -- "I bought the Bounty Ledger and it didn't appear to do anything." It did
       not: state.slayer.ledger was written on purchase and read by exactly one thing,
       the buy button, to grey itself out. A perk that changes NOTHING is silent by
       construction, so the assertion is the crude one that catches it -- flip the
       flag and prove the panel it claims to affect actually comes out different. */
    const led = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.slayer=state.slayer||{points:0,ledger:false};
      state.monLogZone='rat_warrens'; state.monLogSel='rat';
      var box=document.createElement('div'); document.body.appendChild(box);
      state.slayer.ledger=false; box.innerHTML=buildMonLogHTML();
      var offHTML=box.innerHTML;
      var off=box.querySelectorAll('.mlog-zone-tab[disabled]').length;
      state.slayer.ledger=true; box.innerHTML=buildMonLogHTML();
      var on=box.querySelectorAll('.mlog-zone-tab[disabled]').length;
      var changed=(box.innerHTML!==offHTML);
      /* Reading a zone is not entering it. */
      var arena=zoneUnlocked(ZONES.find(function(z){return z.id==='demon_sanctum';}));
      /* And the detail panel really renders for a zone far above the player. */
      state.monLogZone='demon_sanctum'; state.monLogSel='demon';
      box.innerHTML=buildMonLogHTML();
      var det=box.querySelector('.mlog-details');
      var dmg=box.querySelector('.mlog-dmgtype');
      var out={off:off, on:on, changed:changed, arenaOpen:arena,
               readsIt:!!det && det.textContent.indexOf('Sanctum Demon')>=0,
               family:dmg?/Family/.test(dmg.textContent):false,
               familyVal:dmg&&/Demon/.test(dmg.textContent)};
      box.remove();
      return JSON.stringify(out);
    })()`));
    ok('without the Bounty Ledger most of the log is shut', led.off > 10, String(led.off));
    ok('buying it opens every zone for reading', led.on === 0 && led.changed === true,
       JSON.stringify({disabledAfter: led.on, panelChanged: led.changed}));
    /* The failure mode to guard against is the perk turning into a level bypass. */
    ok('and it does NOT open the arena', led.arenaOpen === false);
    ok('a zone sixty levels away actually renders', led.readsIt === true);
    /* The other half of the old description -- family -- was derivable and shown
       nowhere at all. It is free for everyone now. */
    ok('the log names a monster family', led.family === true && led.familyVal === true,
       JSON.stringify({row: led.family, value: led.familyVal}));

    /* #66 -- "Ingredients are cut off in the drop downs in Alchemy and there are no
       tooltips when hovering over the ingredients in the drop down." Both halves were
       one cause: the alternate-recipe row joined every ingredient into one nowrap
       span with an ellipsis, built from raw text with no data-item. */
    const alc = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[99];
      selectedSkill='alchemy'; viewTab='skills';
      renderAlchemy();
      var ways=[].slice.call(document.querySelectorAll('.al-ways'));
      var best=null,bestN=0;
      ways.forEach(function(w){ var n=parseInt(w.textContent.replace(/[^0-9]/g,''),10)||0;
        if(n>bestN){ bestN=n; best=w; } });
      if(best) best.click();
      var rows=[].slice.call(document.querySelectorAll('.al-rec'));
      var bad=[];
      rows.forEach(function(r,i){
        var chips=r.querySelectorAll('.rn .al-mat');
        var tipped=r.querySelectorAll('.rn .al-mat[data-item]');
        if(!chips.length) bad.push('row '+i+' has no ingredient chips');
        if(chips.length!==tipped.length) bad.push('row '+i+': '+(chips.length-tipped.length)+' chips with no tooltip');
      });
      return JSON.stringify({widest:bestN, rows:rows.length, bad:bad,
        clips:/white-space:nowrap[^}]*text-overflow:ellipsis/.test(
          (document.querySelector('style')||{textContent:''}).textContent) });
    })()`));
    ok('the alternate-recipe rows exist to test', alc.rows > 1 && alc.widest > 1,
       JSON.stringify({rows: alc.rows, widest: alc.widest}));
    ok('every ingredient in them is its own hoverable chip',
       alc.bad.length === 0, alc.bad.join(' | '));
    /* The CSS half. A chip row that is still nowrap-with-ellipsis clips exactly the
       way the report describes, and no DOM assertion would see it. */
    ok('and the row wraps rather than clipping',
       html.indexOf('.al-rec .rn{') > 0
       && /\.al-rec \.rn\{[^}]*flex-wrap:wrap/.test(html)
       && !/\.al-rec \.rn\{[^}]*text-overflow:ellipsis/.test(html));
    }

    section('Where an item comes from (ticket #63, 0.9.122.35)');
    {
    /* "Some say stuff comes from ....+x amount of other sources, but we have no way
       to see the rest." The list showed five and then a dead "+N more". Two things
       are guarded here: that the grouped view never loses a source, and that the
       expanded view can actually be reached. Neither throws when it breaks -- the
       tooltip just quietly under-reports, which is the state it was already in. */
    const src = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var SM=buildSourceMap();
      /* Every source must be accounted for: the group counts plus whatever the
         overflow line claims must equal the real total, for every item in the game. */
      var lost=[], sample={};
      Object.keys(SM).forEach(function(id){
        var html=sourceListHTML(SM[id], false);
        var counted=0;
        html.replace(/\\u00b7 (\\d+) actions/g, function(_,n){ counted+=+n; return ''; });
        // single-entry groups render as one plain row each
        counted += (html.match(/class="tt-source"/g)||[]).length
                 - (html.match(/\\u00b7 \\d+ actions/g)||[]).length;
        html.replace(/\\+(\\d+) more, in/, function(_,n){ counted+=+n; return ''; });
        if(counted!==SM[id].length) lost.push(id+': shows '+counted+' of '+SM[id].length);
      });
      // the case the ticket is really about: 246 sources that are all one fact
      var gear=sourceListHTML(SM.sm_chest||[], false);
      sample.gearRows=(gear.match(/class="tt-source"/g)||[]).length;
      /* A COUNT, not the number 14. It was literal, so Smithing gaining sixteen
         arrowhead and bolt-tip recipes in 0.9.124 failed an assertion that was
         only ever about the line collapsing to one row and saying how many. */
      sample.gearSays=/[0-9]+ actions/.test(gear);
      sample.gearOffersShift=/Hold <b[^>]*>Shift/.test(gear);
      // and an item with one source per group offers nothing to expand
      var plain=sourceListHTML([{actName:'Mine iron',skName:'Mining',skIcon:'',chance:1}], false);
      sample.plainOffersShift=/Hold <b[^>]*>Shift/.test(plain);
      // expanded names the individual acts
      var wide=sourceListHTML(SM.sm_chest||[], true);
      sample.expandedNamesActs=/Smelt/.test(wide);
      sample.expandedRows=(wide.match(/class="tt-source"/g)||[]).length;
      return JSON.stringify({lost:lost.slice(0,6), lostN:lost.length, sample:sample});
    })()`));
    ok('the grouped source list never loses a source',
       src.lostN === 0, src.lost.join(' | '));
    /* 246 sources on a skilling-gear piece were 246 ways of saying "any action in
       this skill". Five of them named at random was worse than one line saying so. */
    ok('a drop that comes off a whole skill says so in one line',
       src.sample.gearRows === 1 && src.sample.gearSays === true,
       JSON.stringify(src.sample));
    ok('and offers the key that shows the rest', src.sample.gearOffersShift === true);
    /* The offer only appears when holding it would change what is on screen. */
    ok('a single-source item does not offer it', src.sample.plainOffersShift === false);
    ok('holding it names the individual actions',
       src.sample.expandedNamesActs === true && src.sample.expandedRows > 1,
       JSON.stringify({rows: src.sample.expandedRows}));

    /* The key has to be wired to the document, not to a panel -- data-item is on
       every surface in the game and the tooltip is one shared element. */
    /* Matched as plain substrings, not a regex across the call: the handler bodies
       contain their own parentheses, so a [^)]* pattern stops inside function(e). */
    ok('Shift is bound once, at the document, and released on blur',
       html.indexOf("document.addEventListener('keydown'")>0
       && html.indexOf("document.addEventListener('keyup'")>0
       && html.indexOf("window.addEventListener('blur'")>0
       && (html.match(/e\.key==='Shift'/g)||[]).length===2);
    }

    section('Meat, and the tickets that found it (0.9.122.33)');
    {
    /* Ticket #62: "food made out of tusks (bones) and skins don't sound like they
       would be good". Ten of the twelve monster-food recipes were hide, pelt, scale
       or tusk -- jerky out of leather, stew out of hide, Demon Flesh out of demonhide.
       Nothing about that throws; it just reads wrong forever. */
    const food = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var WRONG=/hide|pelt|scale|tusk|_skin|cloth|weave|leather/;
      var bad=[], dishes=0;
      SKILLS.cooking.acts.forEach(function(a){
        dishes++;
        for(var id in (a.inp||{})) if(WRONG.test(id)) bad.push(a.name+' <- '+id);
      });
      /* And every meat has to be reachable by the time the dish unlocks, or the
         recipe is decoration. */
      var SM=buildSourceMap(), unreachable=[];
      SKILLS.cooking.acts.forEach(function(a){
        for(var id in (a.inp||{})){
          if(!/_meat$/.test(id)) continue;
          if(!(SM[id]||[]).length) unreachable.push(a.name+' needs '+id+' and nothing drops it');
        }
      });
      var meats=Object.keys(ITEMS).filter(function(i){ return /_meat$/.test(i); });
      return JSON.stringify({bad:bad, dishes:dishes, unreachable:unreachable,
                             meats:meats.length,
                             noSource:meats.filter(function(i){ return !(SM[i]||[]).length; })});
    })()`));
    ok('no dish is made of hide, pelt, scale or tusk',
       food.bad.length === 0, food.bad.join(' | '));
    ok('nine meats, and every one of them drops',
       food.meats === 9 && food.noSource.length === 0,
       JSON.stringify({meats: food.meats, noSource: food.noSource}));
    ok('every meat a recipe names has a source', food.unreachable.length === 0,
       food.unreachable.join(' | '));

    /* Moving the hides out of cooking could have left a material with no recipe at
       all. This sweeps EVERY dropped material rather than the ones that changed,
       because the next person to re-point a recipe will not think to check. */
    const sinks = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var wanted={};
      for(var k in SKILLS) (SKILLS[k].acts||[]).forEach(function(a){
        for(var id in (a.inp||{})) wanted[id]=1;
      });
      if(typeof CRAFTED_GEAR!=='undefined') for(var g in CRAFTED_GEAR)
        for(var id in ((CRAFTED_GEAR[g]||{}).inp||{})) wanted[id]=1;
      var dropped={};
      for(var m in MONSTER_DROPS) (MONSTER_DROPS[m]||[]).forEach(function(d){ dropped[d.id]=1; });
      var orphan=Object.keys(dropped).filter(function(i){
        if(!ITEMS[i]) return false;
        if(ITEMS[i].cgear||ITEMS[i].tool||ITEMS[i].skillGear||ITEMS[i].potion) return false;
        return !wanted[i];
      });
      return JSON.stringify({n:Object.keys(dropped).length, orphan:orphan});
    })()`));
    /* The survivors are boss KEYS and trophies, which are supposed to have no recipe,
       all of which are supposed to have none. Named, not counted: a mat that loses
       its last recipe has to show up here rather than slide into the allowance. */
    const SINK_OK = new Set(['royal_rat_sigil','silken_sigil','goblin_ear','warchief_banner',
      'lich_phylactery','ironfang_pelt','splintered_club','warlord_totem','granite_sigil',
      'ember_crest','infernal_crest']);
    const lost = sinks.orphan.filter(i => !SINK_OK.has(i));
    ok('no dropped material lost its last recipe', lost.length === 0,
       lost.length ? lost.join(', ') : sinks.n + ' materials checked');

    /* Ticket #60: the Warchief dropped a shaman's tooth and not one goblin part of
       its own. Every other boss carries its zone's signature commons at boss rates. */
    const wc = JSON.parse(ev(`(function(){
      var t=MONSTER_DROPS.goblin_warchief.map(function(d){ return d.id; });
      return JSON.stringify({has:t, ear:t.indexOf('goblin_ear')>=0, tooth:t.indexOf('goblin_tooth')>=0,
                             meat:t.indexOf('goblin_meat')>=0});
    })()`));
    ok('the Goblin Warchief drops goblin parts',
       wc.ear && wc.tooth && wc.meat, wc.has.join(', '));

    /* Ticket #61: "I did figure out what instant and over 8s where referring to. It
       was the heals lol." The chip named a timing and never said what it timed. */
    ok('a food card says what is instant', ev(`(function(){
      var a=ckKindPill({kind:'instant'}), b=ckKindPill({kind:'regen',dur:8});
      return (/heal/.test(a) && /heal/.test(b)) ? 'ok' : a+' / '+b;
    })()`) === 'ok', ev(`ckKindPill({kind:'instant'})+' / '+ckKindPill({kind:'regen',dur:8})`));
    }

    section('Guild perks that were never paid (0.9.122.32)');
    {
    /* gdBonus() returns five bonuses and mods() consumed two of them, so the `dbl`
       perks on five guilds, the Furrow's `yield` and all three of the Nightmarket's
       `sell` ranks paid out NOTHING from the day guilds shipped. The tooltip promised
       a number and the number never moved -- no error, no log, nothing to notice.
       This walks every perk key every guild actually declares and proves each one
       changes what mods() returns. */
    const perks = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[99];
      state.gd={}; var dead=[], checked=0;
      GUILDS.forEach(function(g){
        if(!g.skills.length) return;                       // combat guilds pay globally
        var sk=g.skills[0];
        var keys={}; g.perks.forEach(function(pk){ for(var k in (pk||{})) keys[k]=1; });
        state.gd={}; var base=mods(sk);
        state.gd[g.id]={rep:99999999,q:[],day:-1,skipped:0};
        var full=mods(sk);
        Object.keys(keys).forEach(function(k){
          checked++;
          var moved = (k==='speed') ? full.speed>base.speed
                    : (k==='xp')    ? full.xpMult>base.xpMult
                    : (k==='sell')  ? full.extraSell>base.extraSell
                    : (k==='dbl'||k==='yield') ? (full.double>base.double||full.extraBar>base.extraBar)
                    : null;
          if(moved===false) dead.push(g.id+'.'+k);
        });
        state.gd={};
      });
      return JSON.stringify({dead:dead, checked:checked});
    })()`));
    ok('every guild perk key actually reaches mods()',
       perks.dead.length === 0 && perks.checked >= 18,
       perks.dead.length ? 'dead: ' + perks.dead.join(', ') : perks.checked + ' keys');
    }

    section('The Nightmarket, now that it is a thieves guild (0.9.122.32)');
    {
    /* The guild moved from Agility to Thieving in 0.9.122.31. Everything below is a
       thing that still LOOKED fine after that move and was not. */
    const night = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[95];
      state.gd={night:{rep:0,q:[],day:-1,skipped:0}};
      var names=[], hot=0, quests=0, kinds={};
      for(var d=0;d<120;d++){
        gdRollQuests('night',true);
        state.gd.night.q.forEach(function(q){
          quests++; kinds[q.kind]=(kinds[q.kind]||0)+1; names.push(q.name);
          var ids = q.kind==='deliver' ? [q.target] : Object.keys(q.items||{});
          if(ids.some(function(i){ return ITEMS[i] && ITEMS[i].hot; })) hot++;
        });
      }
      /* A do-quest on Thieving names an act whose name is already an order, so the
         verb must NOT be prefixed -- "Steal the Pickpocket a noble 100 times". */
      var doubled=names.filter(function(n){ return /^Steal the /.test(n); });
      // and an order for a stolen good has to be fillable in a sane number of steals
      gdRollQuests('night',true);
      var sizes=gdHotPool().map(function(r){
        return {id:r.id, small:gdOutCount(r.skill,r.act,GD_SIZE.small.mins,r.id),
                          long:gdOutCount(r.skill,r.act,GD_SIZE.long.mins,r.id)};
      });
      return JSON.stringify({doubled:doubled.slice(0,3), hotPct:+(hot/quests*100).toFixed(1),
                             kinds:kinds, sizes:sizes, quests:quests});
    })()`));
    ok('a Thieving quest does not print its verb twice',
       night.doubled.length === 0, night.doubled.join(' | '));
    /* The whole point of a fence. Before this it asked for jewellery and potions and
       never once for the goods the skill actually steals. */
    /* Was 2-30%, when the board also asked for jewellery, potions and crafted gear.
       It asks for stolen goods, gold and stealing now and nothing else, so every
       goods order is a stolen one and the share is meant to be about half. */
    ok('every goods order on the board is for stolen goods',
       night.hotPct > 35 && night.hotPct < 70, night.hotPct + '% of ' + night.quests + ' quests');
    ok('all twelve stolen goods can be ordered, in fillable amounts',
       night.sizes.length === 12 && night.sizes.every(s => s.small >= 4 && s.long <= 400),
       JSON.stringify(night.sizes.map(s => s.id + ' ' + s.small + '/' + s.long)));
    ok('the board still rolls all four quest kinds',
       ['do','supply','deliver','coin'].every(k => (night.kinds[k] || 0) > 0),
       JSON.stringify(night.kinds));
    }

    section('Thieving art and pace (0.9.122.32)');
    {
    /* Thieving shipped on borrowed paintings. These prove the real ones landed --
       and, more usefully, that nothing is still SILENTLY borrowing: an alias that
       resolves to another skill's art renders perfectly and looks like a bug nobody
       filed. */
    const art = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var ids=['cut_purse','silver_plate','signet_ring','sealed_letter','pocket_watch',
               'jewelled_dagger','bronze_lockpicks','iron_lockpicks','steel_lockpicks',
               'cobalt_lockpicks','eclipse_lockpicks','everflame_lockpicks',
               'th_hat','th_chest','th_legs','th_boots','cape_thieving','thieving'];
      var unpainted=ids.filter(function(i){ return (iconHTML(i)||'').indexOf('<img')!==0; });
      var nodes=TREES.thieving.map(function(n){ return n.id; });
      var noArt=nodes.filter(function(n){ return !NODE_ART[n]; });
      /* Borrowed art is art from ANOTHER skill's tree, which is exactly what the
         placeholder pass did. Compare the actual image data. */
      var borrowed=[];
      nodes.forEach(function(n){
        for(var k in NODE_ART) if(k.indexOf('th_')!==0 && NODE_ART[k]===NODE_ART[n]) borrowed.push(n+'~'+k);
      });
      return JSON.stringify({unpainted:unpainted, noArt:noArt, borrowed:borrowed,
                             banner:!!SKILL_ART.thieving,
                             alias:Object.keys(ICON_ALIAS)});
    })()`));
    ok('every Thieving item and the skill icon are painted, not generated',
       art.unpainted.length === 0, art.unpainted.join(', '));
    ok('every tree node has art', art.noArt.length === 0, art.noArt.join(', '));
    /* One node's art was not on the sheet. It is named here rather than counted, so
       drawing it and forgetting to inject it fails LOUDLY instead of passing. */
    ok('and only the one node still known to be borrowing is borrowing',
       art.borrowed.length === 1 && art.borrowed[0].indexOf('th_gm_2x_xp~') === 0,
       art.borrowed.join(', '));
    ok('the skill has a painted banner', art.banner === true);
    /* Named one at a time. Down to the skilling familiar, which is the only Thieving
       thing still without a sheet. Delete an id here as its art arrives. */
    ok('only what is genuinely waiting on art is borrowing it', (function(){
      const PENDING = ['spet_thieving'];
      const extra = art.alias.filter(i => PENDING.indexOf(i) < 0);
      const gone  = PENDING.filter(i => art.alias.indexOf(i) < 0);
      return extra.length === 0 && gone.length === 0;
    })(), art.alias.join(', '));

    /* Pace. Jordan asked for "pretty fast, not that slow, but keep it in line", which
       is a RANK, not a number -- so this asserts the rank. A future edit that makes
       Thieving the best or the worst XP in the game fails here rather than shipping. */
    const pace = JSON.parse(ev(`(function(){
      var out={};
      [1,20,40,60,80,99].forEach(function(L){
        var best={};
        for(var k in SKILLS){
          if(k==='farming') continue;
          for(var kk in state.xp) state.xp[kk]=XP_CUM[L];
          state.tree={}; state.gear=[]; state.equipped={}; state.charms=[];
          var b=0;
          SKILLS[k].acts.forEach(function(a){
            if((a.lvl||1)>L) return;
            var r=null; try{ r=ratesFor(a,k); }catch(e){ return; }
            if(r&&(r.xph||0)>b) b=r.xph;
          });
          best[k]=b;
        }
        var order=Object.keys(best).sort(function(x,y){ return best[y]-best[x]; });
        out['L'+L]=order.indexOf('thieving')+1;
      });
      out.n=Object.keys(SKILLS).length-1;
      return JSON.stringify(out);
    })()`));
    ok('Thieving trains fast, and never the fastest or the slowest',
       [1,20,40,60,80,99].every(L => pace['L'+L] >= 3 && pace['L'+L] <= 8),
       JSON.stringify(pace));
    }

    section('Thieving (0.9.122.31)');
    {
    /* The thirteenth skill, and the only one whose action can fail. Everything worth
       guarding here is silent when it breaks: a stall that hands out a tier the
       player has not earned, a failed steal that still pays, or XP gated on success
       — which would make an unlucky thief idle for an hour and gain nothing. */
    const th = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var out={acts:SKILLS.thieving.acts.length,
               pts:TREES.thieving.reduce(function(a,n){return a+n.max;},0)};

      // success climbs with level and with the tree, and is capped at both ends
      state.xp.thieving=XP_CUM[1];
      var a1=getAct('thieving','th1');
      out.lo=+thiefSuccess(a1).toFixed(3);
      state.xp.thieving=XP_CUM[99];
      state.tree=state.tree||{}; state.tree.thieving={th_success:12,th_gm_success:8};
      out.capped=+thiefSuccess(a1).toFixed(3);
      state.tree.thieving={};
      // the hardest act must stay genuinely hard even fully specced
      var hard=getAct('thieving','th14');
      state.tree.thieving={th_success:12,th_gm_success:8};
      out.hardMax=+thiefSuccess(hard).toFixed(3);
      state.tree.thieving={};

      /* Volume, never access: a stall can never hand over a tier the player could
         not have gathered themselves. */
      for(var k in state.xp) state.xp[k]=XP_CUM[1];
      state.xp.thieving=XP_CUM[99];
      out.lowSeed=thiefPoolOpen('seed').length;
      out.lowGem=thiefPoolOpen('gem').length;
      state.xp.farming=XP_CUM[99]; state.xp.mining=XP_CUM[99];
      out.highSeed=thiefPoolOpen('seed').length;
      out.highGem=thiefPoolOpen('gem').length;
      // every pool entry is a real item and its gate is honoured
      out.badPool=[];
      for(var pk in THIEF_POOLS){
        var P=THIEF_POOLS[pk];
        P.tiers.forEach(function(t){ if(!ITEMS[t[1]]) out.badPool.push(pk+'/'+t[1]); });
        if(P.skill && !SKILLS[P.skill]) out.badPool.push(pk+' names skill '+P.skill);
      }
      return JSON.stringify(out);
    })()`));
    ok('fourteen acts and a 98-point tree', th.acts === 14 && th.pts === 98,
       JSON.stringify({acts: th.acts, pts: th.pts}));
    ok('success climbs with level and tree, and is capped',
       th.lo === 0.85 && th.capped <= 0.95 && th.capped > th.lo, JSON.stringify(th));
    /* If the last act reached the cap the skill would end with nothing left to want. */
    ok('the hardest steal stays hard even fully specced',
       th.hardMax > 0.4 && th.hardMax < 0.85, String(th.hardMax));
    ok('a stall never opens a tier the player has not earned',
       th.lowSeed === 1 && th.lowGem === 1 && th.highSeed > 10 && th.highGem === 5,
       JSON.stringify({lowSeed: th.lowSeed, highSeed: th.highSeed, lowGem: th.lowGem, highGem: th.highGem}));
    ok('every pool entry is a real item on a real skill',
       th.badPool.length === 0, th.badPool.join(', '));

    /* The idle contract. XP pays on the ATTEMPT — an unlucky thief levels slower and
       loots less, never nothing. Gate XP on success and a 40% act reads as broken
       while you are away, which is the shape the cooking fire had. */
    const idle = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[3];
      state.items={}; state.seeds={}; state.coins=0;
      var act=getAct('thieving','th3');
      var real=thiefSuccess;
      thiefSuccess=function(){ return 0; };
      var xp0=state.xp.thieving, c0=state.coins;
      completeAction(act,'thieving',500);
      var out={xpOnFail:Math.round(state.xp.thieving-xp0), coinsOnFail:state.coins-c0,
               goodsOnFail:Object.keys(state.seeds).length};
      thiefSuccess=function(){ return 1; };
      state.coins=0; state.seeds={};
      completeAction(act,'thieving',500);
      out.coinsOnWin=state.coins; out.goodsOnWin=Object.keys(state.seeds).length;
      out.satchelUntouched=Object.keys(state.items).length===0;
      thiefSuccess=real;
      return JSON.stringify(out);
    })()`));
    ok('a thief who never succeeds still gains XP',
       idle.xpOnFail > 0, 'xp ' + idle.xpOnFail);
    ok('and gains nothing else — no coins, no goods',
       idle.coinsOnFail === 0 && idle.goodsOnFail === 0, JSON.stringify(idle));
    ok('a thief who always succeeds gets both',
       idle.coinsOnWin > 0 && idle.goodsOnWin > 0, JSON.stringify(idle));
    /* Stolen seeds go to the vault, so a stall cannot fill the satchel. */
    ok('stolen seeds reach the seed vault, not the satchel',
       idle.satchelUntouched === true);

    /* The fence. `hot` items price at what the Nightmarket pays; everyone else
       discounts them, and that is the fence:true flag finally reading. */
    const fence = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var hot=Object.keys(ITEMS).filter(function(i){ return ITEMS[i].hot; });
      var out={n:hot.length, cheap:[], guild:null};
      hot.forEach(function(i){
        if(!(effectiveItemSell(i) < ITEMS[i].sell)) out.cheap.push(i);
      });
      var g=GUILDS.find(function(x){ return x.id==='night'; });
      out.guild={skills:g.skills.join(','), req:Object.keys(g.req).join(','), buysAnything:!!g.buysAnything};
      return JSON.stringify(out);
    })()`));
    ok('twelve stolen goods, and the store pays less than the Nightmarket for every one',
       fence.n === 12 && fence.cheap.length === 0, JSON.stringify(fence));
    ok("the thieves' guild finally gates on Thieving",
       fence.guild.skills === 'thieving' && fence.guild.req === 'thieving' && fence.guild.buysAnything === true,
       JSON.stringify(fence.guild));

    /* The registration sweep. A skill half-registered renders and plays and then
       has no cape, no pet or no rail group, and nothing says so. */
    ok('Thieving is registered everywhere the other twelve are', ev(`(function(){
      var miss=[];
      if(SK_PFX.thieving!=='th') miss.push('SK_PFX');
      if(!SKILL_CAPE.thieving) miss.push('SKILL_CAPE');
      if(RAIL_GROUP.thieving!=='support') miss.push('RAIL_GROUP');
      if(GD_VERB.thieving!=='Steal') miss.push('GD_VERB');
      if(!SKILL_PETS.thieving) miss.push('SKILL_PETS');
      if(!SKILLING_SETS.thieving) miss.push('SKILLING_SETS');
      if(!SKILL_ACCENT.thieving) miss.push('SKILL_ACCENT');
      if(!SK_PAL.thieving) miss.push('SK_PAL');
      if(!SHOP.some(function(x){return x.id==='cape_thieving';})) miss.push('cape in SHOP');
      if(!SHOP.some(function(x){return x.slot==='picks';})) miss.push('lockpicks in SHOP');
      if(!SKILLS.crafting.acts.some(function(a){return a.id==='cr_tl_bronze_picks';})) miss.push('lockpick recipes');
      return miss.join(', ')||'ok';
    })()`)==='ok', ev(`(function(){
      var miss=[];
      if(SK_PFX.thieving!=='th') miss.push('SK_PFX');
      if(!SKILL_CAPE.thieving) miss.push('SKILL_CAPE');
      if(RAIL_GROUP.thieving!=='support') miss.push('RAIL_GROUP');
      if(GD_VERB.thieving!=='Steal') miss.push('GD_VERB');
      if(!SKILL_PETS.thieving) miss.push('SKILL_PETS');
      if(!SKILLING_SETS.thieving) miss.push('SKILLING_SETS');
      return miss.join(', ')||'ok'; })()`));
    }

    section('The XP faucet and the charm shelf (0.9.122.30)');
    {
    /* XP_SCALE is one number that every XP source is supposed to run through. The
       risk is not that it stops working — it is that a NEW source quietly does not
       use it, and the faucet silently stops being global. */
    const faucet = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[70];
      var out={scale:XP_SCALE};
      // a fresh character's whole XP multiplier IS the faucet — no other term applies
      out.freshMult=mods('woodcutting').xpMult;
      // and every skill's advertised rate is built from it
      out.rates={};
      ['woodcutting','fishing','cooking','smithing','crafting'].forEach(function(sk){
        var acts=SKILLS[sk].acts.filter(function(a){ return a.lvl<=70; });
        var act=acts[acts.length-1];
        if(!act) return;
        out.rates[sk]=Math.round(ratesFor(act,sk).xph);
        out.per=out.per||Math.round(xpPerAction(act,sk));
      });
      return JSON.stringify(out);
    })()`));
    ok('a fresh character\u2019s XP multiplier is exactly the faucet',
       Math.abs(faucet.freshMult - faucet.scale) < 1e-9,
       'mult ' + faucet.freshMult + ' vs scale ' + faucet.scale);

    /* Source-level, because the faucet is applied at each grant site rather than in
       one funnel: combat, sailing, offline and guild payouts each multiply by it. If
       one of those lines is ever refactored away, the skill it feeds silently pays
       full rate and nothing on screen says so. */
    const scriptSrc = (/<script\b[^>]*>([\s\S]*)<\/script>/i.exec(html) || [,''])[1];
    const uses = (scriptSrc.match(/XP_SCALE/g) || []).length;
    ok('the faucet is still wired into every source it was',
       uses >= 8, uses + ' XP_SCALE references');
    ok('and the Stats panel still divides it back out',
       /const totalXpMult\s*=\s*m\.xpMult\s*\/\s*XP_SCALE/.test(scriptSrc));

    /* Charms had nowhere to be seen: no slot, so the Gear panel cannot show them,
       and the shop card you bought it from was the only acknowledgement in the game
       that you owned one. */
    const charms = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[70];
      selectedSkill='woodcutting'; viewTab='acts';
      state.charms=[];
      renderStats();
      var empty=document.querySelectorAll('#statsViewLeft .charm-row').length;
      state.charms=CHARMS.map(function(c){ return c.id; });
      renderStats();
      var rows=[].slice.call(document.querySelectorAll('#statsViewLeft .charm-row'));
      var out={empty:empty, n:rows.length,
               text:rows.map(function(r){ return (r.textContent||'').replace(/\s+/g,' ').trim(); }),
               icons:rows.filter(function(r){ return !!r.querySelector('.ch-ic img,.ch-ic svg'); }).length,
               tips:rows.filter(function(r){ return (r.getAttribute('data-tip')||'').length>10; }).length};
      state.charms=[];
      return JSON.stringify(out);
    })()`));
    ok('no Charms section until you own one', charms.empty === 0);
    ok('every charm you own is listed, with its icon and a tip',
       charms.n === charms.text.length && charms.n > 0
       && charms.icons === charms.n && charms.tips === charms.n,
       JSON.stringify({n: charms.n, icons: charms.icons, tips: charms.tips}));
    /* The readout is derived from the bonus object, so a retuned charm cannot end up
       disagreeing with the number it actually applies. */
    ok('and each row states the effect, not just the name',
       charms.text.every(function (t) { return /[+]\d/.test(t); }),
       charms.text.join(' | '));
    }

    section('Prized catches (0.9.122.24)');
    {
    /* Fishing was the only gathering skill with no variance in what came up. A
       prized catch is the same fish, rarer — so most of what can go wrong is
       silent: a dish weaker than the ordinary one, a recipe that never appears, a
       drop that pays on one fishing bar but not the other, or a gilded icon that
       snapshotted ICONS before the art block and shows the old SVG. */
    const pz = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var out={pairs:[],bad:[]};
      for(var id in ITEMS){
        var base=ITEMS[id].prizedOf; if(!base) continue;
        out.pairs.push(id);
        if(!ITEMS[base]) out.bad.push(id+': base '+base+' does not exist');
        // a prized dish must beat the ordinary one it upgrades, and cost more
        var a=ITEMS[id], b=ITEMS[base];
        if(a.potion&&b.potion&&!(a.potion.heal>b.potion.heal))
          out.bad.push(id+' heals '+a.potion.heal+' vs '+b.potion.heal);
        if(!(a.sell>b.sell)) out.bad.push(id+' sells '+a.sell+' vs '+b.sell);
        if(!a.rare) out.bad.push(id+' is not flagged rare');
      }
      // every fishing act drops exactly one prized fish, and it is that act's own
      out.drops=[];
      (SKILLS.fishing.acts||[]).forEach(function(a){
        var caught=Object.keys(a.out||{})[0];
        var tbl=DROPS[a.id]||[];
        var pz=tbl.filter(function(d){ return ITEMS[d.id]&&ITEMS[d.id].prizedOf; });
        if(pz.length!==1){ out.bad.push(a.id+' has '+pz.length+' prized drops'); return; }
        if(ITEMS[pz[0].id].prizedOf!==caught)
          out.bad.push(a.id+' drops the prized form of '+ITEMS[pz[0].id].prizedOf+', not '+caught);
        var pearl=(tbl.find(function(d){return d.id==='pearl';})||{}).chance||0;
        if(!(pz[0].chance<pearl)) out.bad.push(a.id+' prized '+pz[0].chance+' is not rarer than pearl '+pearl);
        out.drops.push(a.id+':'+pz[0].chance);
      });
      // one cooking recipe per prized fish, consuming it and making the dish
      out.recipes=(SKILLS.cooking.acts||[]).filter(function(a){ return a.onlyIf; }).length;
      (SKILLS.cooking.acts||[]).forEach(function(a){
        if(!a.onlyIf) return;
        var inp=Object.keys(a.inp||{})[0], o=Object.keys(a.out||{})[0];
        if(inp!==a.onlyIf) out.bad.push(a.id+' gates on '+a.onlyIf+' but eats '+inp);
        if(!ITEMS[o]||!ITEMS[o].prizedOf) out.bad.push(a.id+' does not make a prized dish');
      });
      return JSON.stringify(out);
    })()`));
    ok('sixteen prized items, each upgrading a real fish',
       pz.pairs.length === 16, pz.pairs.length + ' found');
    ok('every prized item beats the one it upgrades and is flagged rare',
       pz.bad.length === 0, pz.bad.slice(0, 4).join(' | '));
    ok('every fishing act drops its own prized fish, rarer than its pearl',
       pz.drops.length === 8, pz.drops.join(' '));
    ok('and each has exactly one cooking recipe', pz.recipes === 8, String(pz.recipes));

    /* Prized recipes have their own shelf as of 0.9.122.25. Inline they changed the
       grid's length under you and landed wherever the ordinary ladder left a gap;
       on their own tab the whole set is visible whether or not you hold one, and
       the tab's count is the notification the inline card used to be. */
    const cards = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.xp.cooking=XP_CUM[99]; state.xp.fishing=XP_CUM[99];
      state.items={oak_log:50};
      state.cookingFire={loaded:{oak_log:40},partialSec:0,lit:true,lastBurnAt:Date.now()};
      selectedSkill='cooking'; viewTab='acts';
      function shown(){ return document.querySelectorAll('#activityGrid .ck-card').length; }
      function txt(){ return document.getElementById('activityGrid').textContent; }
      var out={};
      _ckTab='dishes'; renderCenter();
      out.dishes=shown();
      /* Scope the leak check to the CARDS — the tab itself is inside #activityGrid
         and its label is the word "Prized", so testing the panel's text would
         always find it. */
      out.dishesLeak=[].slice.call(document.querySelectorAll('#activityGrid .ck-card .name'))
        .some(function(n){ return /^Prized /.test(n.textContent||''); });
      out.allDishes=SKILLS.cooking.acts.filter(function(x){ return !x.onlyIf; }).length;
      out.tabs=document.querySelectorAll('#activityGrid .ck-seg button').length;
      _ckTab='prized'; renderCooking();
      out.prized=shown();
      out.prizedNamed=/Prized Void Eel/.test(txt());
      out.emptyState=!!document.querySelector('#activityGrid .ck-none');
      out.badgeEmpty=!!document.querySelector('#activityGrid .ck-have');
      state.items.prized_raw_salmon=2; state.items.prized_raw_shark=1;
      renderCooking();
      out.badge=(document.querySelector('#activityGrid .ck-have')||{}).textContent;
      out.emptyGone=!document.querySelector('#activityGrid .ck-none');
      out.prizedStill=shown();
      _ckTab='dishes';
      return JSON.stringify(out);
    })()`));
    ok('cooking has two shelves', cards.tabs === 2, String(cards.tabs));
    ok('no prized recipe leaks onto the Dishes shelf',
       cards.dishesLeak === false && cards.dishes === cards.allDishes,
       JSON.stringify({dishes: cards.dishes, of: cards.allDishes, leak: cards.dishesLeak}));
    ok('the Prized shelf lists all eight whether or not you hold one',
       cards.prized === 8 && cards.prizedStill === 8 && cards.prizedNamed === true,
       JSON.stringify(cards));
    ok('an empty Prized shelf explains itself instead of showing a lock',
       cards.emptyState === true && cards.emptyGone === true, JSON.stringify(cards));
    ok('and the tab counts the catches you are carrying, never a zero',
       cards.badgeEmpty === false && cards.badge === '3',
       JSON.stringify({empty: cards.badgeEmpty, held: cards.badge}));

    /* The gild is resolved in iconHTML, not by a loop at load, because the item-art
       block assigns over ICONS last — anything snapshotting earlier captures the
       pre-art SVG. The first cut of this did exactly that. */
    const icons = JSON.parse(ev(`(function(){
      var out={};
      out.gilded=iconHTML('prized_raw_salmon');
      out.base=iconHTML('raw_salmon');
      return JSON.stringify(out);
    })()`));
    ok('a prized icon is its own fish, gilded',
       /^<span class="gilded">/.test(icons.gilded) && icons.gilded.indexOf('<img') > 0,
       icons.gilded.slice(0, 60));
    ok('and it is the PAINTED fish, not the pre-art SVG',
       icons.gilded.indexOf('<svg') < 0 && icons.base.indexOf('<img') === 0,
       'base starts: ' + icons.base.slice(0, 24));

    /* Lucky Lure and Schooling were two nodes, 50 points apart, giving the identical
       "+1 fish every 10th cast" on a shared counter, with identical tooltips. */
    const lure = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.xp.fishing=XP_CUM[99];
      var act=getAct('fishing','fi5');
      state.tree=state.tree||{}; state.tree.fishing={};
      var off=skillDropChance('fishing',{id:'prized_raw_salmon',chance:0.005},mods('fishing'));
      state.tree.fishing.fi_master1=1;
      var on=skillDropChance('fishing',{id:'prized_raw_salmon',chance:0.005},mods('fishing'));
      var pearlOn=skillDropChance('fishing',{id:'pearl',chance:0.006},mods('fishing'));
      var pearlOff=skillDropChance('woodcutting',{id:'pearl',chance:0.006},mods('woodcutting'));
      return JSON.stringify({off:off, on:on, pearlOn:pearlOn, pearlOff:pearlOff});
    })()`));
    ok('Lucky Lure doubles a prized catch', Math.abs(lure.on - lure.off * 2) < 1e-9,
       JSON.stringify(lure));
    ok('and does nothing to an ordinary drop',
       Math.abs(lure.pearlOn - lure.pearlOff) < 1e-9, JSON.stringify(lure));
    ok('its description no longer claims bonus fish',
       ev(`(function(){
         var n=(TREES.fishing||[]).find(function(x){ return x.id==='fi_master1'; });
         var t=(n&&n.desc?String(n.desc(1)):'')+' '+((typeof NODE_TIP!=='undefined'&&NODE_TIP.fi_master1)||'');
         return /prized/i.test(t) && !/bonus fish/i.test(t);
       })()`)===true);

    /* Both fishing bars are real casts. Schooling paid procs*1 on the primary and
       procs*2 on the second bar for the same node and the same tooltip. */
    const bars = JSON.parse(ev(`(function(){
      var src=(document.querySelector('script')||{}).textContent||'';
      var hits=(src.match(/if\\(m\\.fi_school\\)[\\s\\S]{0,140}?qty\\+=procs\\*(\\d)/g)||[]);
      var mults=(src.match(/qty\\+=procs\\*(\\d)/g)||[]);
      return JSON.stringify({mults:mults});
    })()`));
    ok('Schooling pays the same on both fishing bars',
       bars.mults.every(function(x){ return x === 'qty+=procs*1'; }),
       JSON.stringify(bars.mults));
    }

    section('One coin, everywhere money is (0.9.122.23)');
    {
    /* 0.9.122.17 replaced the currency coins with painted art and pointed only
       fmtCoins at it. Every other money site kept the old flat SVG, and a dozen
       more printed a gold number with no coin on it at all — a hire button, a
       respec cost, a monster's reward, a raid's loot line, farm and crew wages.
       None of it throws; it just quietly stops looking like money. */
    const coins = JSON.parse(ev(`JSON.stringify({
      gold:   ICONS.ui_coin,
      sm:     ICONS.ui_coin_sm,
      silver: ICONS.ui_coin_silver
    })`));
    const srcOf = h => (/src="([^"]+)"/.exec(h||'') || [,''])[1];
    ok('the coin is the painted art, not the old flat SVG',
       /^<img/.test(coins.gold) && srcOf(coins.gold).startsWith('data:image/webp'),
       (coins.gold||'').slice(0,40));
    ok('and it is the SAME art fmtCoins uses',
       srcOf(coins.gold) === srcOf(coins.sm) && srcOf(coins.gold).length > 100,
       'gold '+srcOf(coins.gold).length+' vs sm '+srcOf(coins.sm).length);
    /* .ev-icon.coin-ic is 1.5em, for running text. The 23 call sites that ask for
       ui_coin size it themselves in px, so it must NOT carry that class or every
       one of them grows. */
    ok('only the running-text pair carries the coin-ic sizing class',
       coins.gold.indexOf('coin-ic') < 0 &&
       coins.sm.indexOf('coin-ic') >= 0 && coins.silver.indexOf('coin-ic') >= 0);
    ok('silver is its own art', srcOf(coins.silver) !== srcOf(coins.gold));

    /* The sweep: any gold amount built in the script must have a coin near it.
       Toasts are the documented exception — they are textContent, so an SVG would
       render as literal markup there, and they carry the emoji instead. */
    const scriptSrc = (/<script\b[^>]*>([\s\S]*)<\/script>/i.exec(html) || [,''])[1];
    const money = /(?:toLocaleString\(\)|fmtK\([^)]*\))\s*\+?\s*['`]g\b|\}g<|\}g['`]/g;
    const bare = [];
    let m;
    while ((m = money.exec(scriptSrc)) !== null) {
      const ctx = scriptSrc.slice(Math.max(0, m.index - 230), m.index + 30);
      if (/ui_coin|fmtCoins/.test(ctx)) continue;
      /* Toasts are textContent, so an SVG would render as literal markup — they
         carry the emoji instead. The message is often assembled over several lines
         and handed to toast() at the END, so look both ways for the call. */
      const around = scriptSrc.slice(Math.max(0, m.index - 400), m.index + 400);
      if (/toast\(/.test(around)) continue;
      if (/pill\('Gold'/.test(ctx)) continue;            // documented: an icon ellipsised the value
      bare.push(ctx.split('\n').pop().trim().slice(0, 80));
    }
    ok('no money is printed without a coin beside it', bare.length === 0,
       bare.slice(0, 5).join('  |  '));

    /* And the specific surfaces that had none. Rendered, not grepped — the point
       is that a coin reaches the screen. */
    const shown = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[99];
      state.coins=9000000*SILVER_PER_GOLD;
      function coinsIn(sel){
        var el=document.querySelector(sel);
        if(!el) return null;
        return el.querySelectorAll('img.ev-icon, svg.ev-icon').length;
      }
      var out={};
      // the respec button only exists once a point is spent, so spend one
      selectedSkill='fishing'; viewTab='tree';
      state.tree=state.tree||{}; state.tree.fishing=state.tree.fishing||{};
      var first=(TREES.fishing||[])[0];
      if(first) state.tree.fishing[first.id]=1;
      renderCenter();
      out.respec=coinsIn('.respec-btn');
      out.respecFound=!!document.querySelector('.respec-btn');
      out.respecEmoji=/\\ud83e\\udd99|\\ud83d\\udcb0/.test((document.querySelector('.respec-btn')||{}).innerHTML||'');
      // a monster's kill reward
      try{
        var mon=MONSTERS.find(function(x){ return x.coins>0; });
        var tip=monsterTipHTML(mon);
        out.monster=/mtip-rw-coin[^<]*<img|mtip-rw-coin"[^>]*>\\s*<img/.test(tip)||/mtip-rw-coin/.test(tip)&&/<img[^>]*ev-icon/.test(tip);
      }catch(e){ out.monster='err:'+e.message; }
      return JSON.stringify(out);
    })()`));
    ok('the respec cost shows a drawn coin, not the emoji',
       shown.respec >= 1 && shown.respecEmoji === false,
       JSON.stringify(shown));
    ok('a monster reward shows a coin', shown.monster === true, JSON.stringify(shown.monster));
    }

    section('The left rail reads as three controls (0.9.122.22)');
    {
    /* Player report: "its super confusing ... they all look the same". The rail
       stacked Skills/Stats/Combat/Sailing over All/Gather/Craft/Support, and the
       two selected items computed to byte-identical treatment — same gold, same
       raised gradient, same 1px gold ring — eight pixels apart, one navigating and
       one filtering.

       It survived because `.tab` and `.rail-groups .rg` are each styled in FOUR
       places and the winners are at the end of the last style block; an edit to
       the [CSS-01] rules changes nothing on screen. So this test reads the CSS
       text and takes the LAST declaration for each selector, the way the browser
       does — asserting on the first one would pass while the game looked wrong. */
    const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
    const cssAll = styles.join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
    function lastRule(sel){
      const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('(?:^|[},])\\s*' + esc + '\\s*\\{([^}]*)\\}', 'g');
      let m, body = null;
      while ((m = re.exec(cssAll)) !== null) body = m[1];
      return body;
    }
    const tabOn = lastRule('.tabs .tab.on');
    const rgOn  = lastRule('.rail-groups .rg.on');
    ok('both selections still have a live rule', !!tabOn && !!rgOn,
       'tab='+(tabOn?'yes':'MISSING')+' rg='+(rgOn?'yes':'MISSING'));

    const colorOf = b => (b && /(?:^|;)\s*color\s*:\s*([^;]+)/.exec(b) || [,''])[1].trim();
    ok('the panel tab and the filter chip do not share a colour',
       !!tabOn && !!rgOn && colorOf(tabOn) !== colorOf(rgOn),
       'tab '+colorOf(tabOn)+'  vs  chip '+colorOf(rgOn));
    /* Gold is the tabs' colour in that corner. A filter borrowing it is the exact
       thing that made the two rows twins. */
    ok('only the panel tab is gold',
       /gold-hi/.test(tabOn||'') && !/gold-hi/.test(rgOn||''),
       'chip: '+(rgOn||'').slice(0,90));
    /* Raised versus recessed is the distinction doing the work — a tab sticks out
       because you are on it, a filter is pushed in because you set it. */
    ok('the tab is raised and the chip is recessed',
       /inset 0 1px 0/.test(tabOn||'') && /inset 0 2px/.test(rgOn||''),
       'tab '+/inset 0 1px 0/.test(tabOn||'')+' chip '+/inset 0 2px/.test(rgOn||''));
    ok('and only the tab carries a ring',
       /0 0 0 1px/.test(tabOn||'') && !/0 0 0 1px/.test(rgOn||''));

    /* The row states its job rather than leaving it to be inferred, and pairs with
       the Sort row directly beneath. */
    ok('the filter row is labelled, and pairs with Sort',
       ev(`(function(){
         var l=document.querySelector('#railGroups .rgl');
         var s2=document.querySelector('.rail-sort label');
         return (l?l.textContent.trim():'')+'/'+(s2?s2.textContent.trim():'');
       })()`)==='Show/Sort');
    ok('and the filter row no longer sits in the tab track',
       ev(`(function(){ var g=document.getElementById('railGroups');
            return !!g && !g.classList.contains('trk'); })()`)===true);

    /* Every animation the code asks for must have a rule. gotoShopSlot() has always
       added .shop-cat-flash; the rule lived in the category-tile CSS that the
       0.9.122.20 shop rebuild replaced, so the Gear panel's deep-link silently
       stopped highlighting anything — and still scrolled, which is why it looked
       fine. Sweep every class the script animates. */
    const scriptSrc = (/<script\b[^>]*>([\s\S]*)<\/script>/i.exec(html) || [,''])[1];
    const asked = [...scriptSrc.matchAll(/classList\.add\('([a-z][a-z0-9-]*-flash)'\)/g)]
      .map(m => m[1]);
    const orphan = [...new Set(asked)].filter(c => cssAll.indexOf('.' + c) < 0);
    ok(asked.length+' flash classes the script adds all have a CSS rule',
       orphan.length===0, 'no rule for: '+orphan.join(', '));

    /* The satchel expansion moved into the shop, so the right panel must not still
       carry a second gold-spend button for the same upgrade. */
    const sat = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.coins=99999999; state.satchelUpgrades=2;
      viewTab='acts'; renderRightPanel();
      var bar=document.querySelector('.sat-cap');
      var out={bar:!!bar,
               spendBtn:!!document.querySelector('.sat-expand'),
               link:!!document.querySelector('.sat-goshop'),
               linkText:(document.querySelector('.sat-goshop')||{}).textContent||''};
      // and the link lands on the vendor that sells it
      if(typeof gotoShopCat==='function'){ gotoShopCat('storage'); out.cat=shopSelectedCat; }
      return JSON.stringify(out);
    })()`));
    ok('the satchel panel keeps the capacity bar', sat.bar===true);
    ok('and no longer spends gold itself', sat.spendBtn===false);
    ok('it points at the shop instead, naming the price',
       sat.link===true && /slots for/.test(sat.linkText) && /Shop/.test(sat.linkText),
       JSON.stringify(sat.linkText));
    ok('and the link opens the vendor that sells it', sat.cat==='storage', sat.cat);
    }

    section('The shop (0.9.122.20)');
    {
    /* The shop sold fourteen things: two rings and twelve identical capes, with
       nothing at all between Lv 50 and Lv 99. None of what follows throws when it
       breaks — a charm whose key nothing reads is a card that lies, and a supply
       priced under what it grants is a gold printer. */
    const shop = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var out={};
      var buyable=SHOP.filter(function(i){ return !i.tool; });
      out.buyable=buyable.length;
      out.charms=CHARMS.length;
      out.supplies=SUPPLIES.length;
      // every buyable row draws as a real SVG, never the emoji fallback
      /* Ask iconHTML, not ICONS. A row can resolve through ICON_ALIAS (placeholder
         art borrowed until a sheet is drawn) and still be a real drawn icon — what
         this guards is falling back to the emoji in the SHOP entry. */
      out.emojiFallback=buyable.filter(function(i){
        var h=''; try{h=iconHTML(i.id)||'';}catch(e){}
        return h.indexOf('<img')!==0 && h.indexOf('<svg')<0 && h.indexOf('<span')!==0;
      }).map(function(i){ return i.id; });
      // and no card is left printing a raw \\U escape (the shop's own near-miss)
      out.badEscape=buyable.filter(function(i){
        return /U000[0-9a-f]{5}/.test(i.name+' '+i.desc+' '+(i.icon||'')); }).map(function(i){ return i.id; });
      out.charmIcons=CHARMS.filter(function(c){ return !ICONS[c.id]; }).map(function(c){ return c.id; });
      // every vendor's rail icon exists, and no two vendors share one
      out.railMissing=SHOP_CATS.filter(function(c){ return !ICONS[c.icon]; }).map(function(c){ return c.key; });
      var seen={}; out.railDupes=[];
      SHOP_CATS.forEach(function(c){ if(seen[c.icon]) out.railDupes.push(c.key); seen[c.icon]=1; });
      return JSON.stringify(out);
    })()`));
    /* It stocked fourteen: two rings and twelve identical capes. Count what a player
       can actually buy across every vendor, not just SHOP rows — charms, supplies
       and the satchel are real purchases that do not live in that array. The twelve
       hoods were cut in 0.9.122.25, so a bare SHOP count would read as a regression
       when the shop in fact grew. */
    ok('the shop stocks far more than the fourteen it had',
       shop.buyable + shop.charms + shop.supplies + 1 >= 30,
       shop.buyable+' shop rows + '+shop.charms+' charms + '+shop.supplies+' supplies');
    ok('every shop row draws a real icon, not the emoji fallback',
       shop.emojiFallback.length===0, shop.emojiFallback.join(', '));

    /* Painted, not merely present. The eleven shop trinkets were cut, keyed and
       reported as shipped while every one of them still rendered its generated SVG:
       they were never added to _iconart/picks.json, so `pack.js --picks` dropped all
       eleven and still printed "wrote pack.json". Nothing throws, the icons look
       fine, and the only tell is that they are the wrong picture.

       ART_EXEMPT is an explicit list, not a count — an id that stops needing the
       exemption and stays here is dead weight, and an id that appears WITHOUT being
       added is the thing this guards. */
    const ART_EXEMPT = new Set(['ember_ring', 'moon_amulet']);
    const painted = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[99];
      state.coins=9000000*SILVER_PER_GOLD;
      viewTab='shop';
      var bad=[], seen=0;
      SHOP_CATS.forEach(function(cat){
        shopSelectedCat=cat.key; renderShop();
        [].slice.call(document.querySelectorAll('#shopView .sh-card')).forEach(function(c){
          var ic=c.querySelector('.sh-ic'); if(!ic) return;
          seen++;
          if(ic.innerHTML.indexOf('<img')!==0){
            var nm=(c.querySelector('.sh-nm .n')||{}).textContent||'?';
            bad.push(nm);
          }
        });
      });
      return JSON.stringify({seen:seen, bad:bad});
    })()`));
    const NAME_TO_ID = {'Ember Ring': 'ember_ring', 'Moon Amulet': 'moon_amulet'};
    const unpainted = painted.bad.filter(n => !ART_EXEMPT.has(NAME_TO_ID[n] || n));
    ok(painted.seen + ' shop cards, and only the known two are still on generated art',
       unpainted.length === 0, 'unpainted: ' + unpainted.join(', '));
    ok('and no card prints a raw unicode escape',
       shop.badEscape.length===0, shop.badEscape.join(', '));
    ok('every charm has its own icon', shop.charmIcons.length===0, shop.charmIcons.join(', '));
    ok('every vendor has a distinct rail icon',
       shop.railMissing.length===0 && shop.railDupes.length===0,
       'missing '+shop.railMissing.join(',')+' dupes '+shop.railDupes.join(','));

    /* A charm is unslotted, so nothing walks a loadout to find it — if its key is
       not one mods()/globalSellBonus already consume, the card promises an effect
       that never fires and nothing anywhere throws. */
    const charm = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[99];
      var out={};
      CHARMS.forEach(function(c){
        state.charms=[];
        var before={xp:mods('mining').xpMult, spd:mods('mining').speed,
                    dbl:mods('mining').double, pre:mods('smithing').preserve,
                    sell:globalSellBonus()};
        state.charms=[c.id];
        var after={xp:mods('mining').xpMult, spd:mods('mining').speed,
                   dbl:mods('mining').double, pre:mods('smithing').preserve,
                   sell:globalSellBonus()};
        var moved=Object.keys(before).some(function(k2){ return Math.abs(after[k2]-before[k2])>1e-9; });
        out[c.id]=moved;
      });
      state.charms=[];
      return JSON.stringify(out);
    })()`));
    const inert = Object.keys(charm).filter(k => !charm[k]);
    ok('every charm actually moves a number', inert.length===0,
       'inert: '+inert.join(', '));

    /* `skills` rings sit in a ring slot and so carry skill:null, which is exactly
       the shape jewelryBonus treats as universal. Getting this wrong hands a
       two-skill ring's bonus to all twelve. */
    const ring = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      for(var k in state.xp) state.xp[k]=XP_CUM[99];
      state.gear=['delver_ring']; state.equipped={ring_r:'delver_ring'};
      return JSON.stringify({
        mining:   gearSkillXp('mining'),
        smithing: gearSkillXp('smithing'),
        fishing:  gearSkillXp('fishing'),
        leakGlobal: jewelryBonus('skillXp')+jewelryBonus('xpBoost')
      });
    })()`));
    ok('a supply-chain ring pays both of its skills',
       ring.mining>0.079 && ring.smithing>0.079, JSON.stringify(ring));
    ok('and pays nothing to a skill it does not name',
       ring.fishing===0 && ring.leakGlobal===0, JSON.stringify(ring));

    /* A supply must never be cheaper than what it grants sells for, at any level —
       the shop would otherwise be an unbounded gold printer, the same shape as the
       craft-a-tool-and-sell-it exploit that had to be closed in 1.0.47. */
    const sup = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      var bad=[], short=[], checked=0, shapes=[];
      /* Worst case for arbitrage is a player wearing everything that raises sell
         value at once, since the crate is quoted off effectiveItemSell. */
      function loadRich(){
        state.gear=['coin_signet','moon_amulet']; state.equipped={amulet:'coin_signet'};
        state.charms=['coin_purse'];
        for(var k in TREES){ state.tree=state.tree||{}; }
      }
      [1,20,40,60,75,90,99].forEach(function(L){
        for(var k in state.xp) state.xp[k]=XP_CUM[L];
        [false,true].forEach(function(rich){
          state.gear=[]; state.equipped={}; state.charms=[];
          if(rich) loadRich();
          SUPPLIES.forEach(function(s2){
            var mix=supplyMixFor(s2);
            if(!mix.length) return;
            checked++;
            var cost=supplyCost(s2);
            var worth=0, n=0;
            mix.forEach(function(m){ worth+=effectiveItemSell(m.id)*m.n; n+=m.n; });
            if(cost<=worth) bad.push('Lv'+L+(rich?'+gear':'')+' '+s2.id+' costs '+cost+' worth '+Math.round(worth));
            if(n!==s2.qty) short.push('Lv'+L+' '+s2.id+' gave '+n+' of '+s2.qty);
          });
        });
      });
      state.gear=[]; state.equipped={}; state.charms=[];
      /* The shape of the mix itself: cheapest tier biggest, and more than one tier
         once you are past the first unlock. */
      for(var k2 in state.xp) state.xp[k2]=XP_CUM[99];
      SUPPLIES.forEach(function(s2){
        var mix=supplyMixFor(s2);
        if(mix.length<2) return;
        var cheapest=mix.slice().sort(function(a,b){return (ITEMS[a.id].sell||0)-(ITEMS[b.id].sell||0);})[0];
        var dearest =mix.slice().sort(function(a,b){return (ITEMS[b.id].sell||0)-(ITEMS[a.id].sell||0);})[0];
        shapes.push({id:s2.id, tiers:mix.length, lowN:cheapest.n, highN:dearest.n,
                     ok:cheapest.n>dearest.n && dearest.n>0});
      });
      return JSON.stringify({checked:checked, bad:bad, short:short, shapes:shapes});
    })()`));
    ok(sup.checked+' supply/level/gear pairs all cost more than they are worth',
       sup.bad.length===0, sup.bad.slice(0,4).join(' | '));
    /* Largest-remainder apportionment — the counts must total exactly qty, not
       drift a few either way on rounding. */
    ok('and every crate holds exactly the quantity it advertises',
       sup.short.length===0, sup.short.slice(0,4).join(' | '));
    ok('a crate is mostly the cheap tier and still carries the dearest',
       sup.shapes.length>0 && sup.shapes.every(function(x){ return x.ok; }),
       JSON.stringify(sup.shapes));

    /* grantItem refuses a NEW item type into a full satchel and returns 0. Taking
       the gold before checking is the same silent loss the satchel-full material
       bug was, only paid for. */
    /* A mixed crate can be refused one tier at a time, so the guard has to hold for
       EVERY line: the satchel is padded with everything except the crate's own
       contents, which makes all seven log types new item types with nowhere to go. */
    ok('a supply bought into a full satchel takes no gold',
       ev(`(function(){
         state=defaultState(); normalizeState();
         state.xp.woodcutting=XP_CUM[99]; state.items={}; state.charms=[];
         var sup=SUPPLIES.find(function(x){return x.id==='sup_logs';});
         var inCrate={}; supplyMixFor(sup).forEach(function(m){ inCrate[m.id]=1; });
         var pad=Object.keys(ITEMS).filter(function(i){
           return !isSeedId(i) && !ITEMS[i].tool && !ITEMS[i].skillGear && !inCrate[i]; });
         var cap=satchelCap();
         for(var i=0;i<cap+5 && i<pad.length;i++) state.items[pad[i]]=1;
         if(satchelUsed()<satchelCap()) return 'satchel not full';
         state.coins=99999999;
         var before=state.coins;
         buySupply('sup_logs');
         var leaked=Object.keys(inCrate).some(function(id){ return (state.items[id]||0)>0; });
         return (state.coins===before)+'/'+(!leaked);
       })()`)==='true/true');

    ok('and a normal purchase pays once and delivers the whole crate', ev(`(function(){
         state=defaultState(); normalizeState();
         state.xp.woodcutting=XP_CUM[99]; state.items={}; state.coins=999999999;
         state.satchelUpgrades=SATCHEL_MAX_EXPANSIONS;
         var sup=SUPPLIES.find(function(x){return x.id==='sup_logs';});
         var cost=supplyCost(sup), before=state.coins;
         buySupply('sup_logs');
         var got=0; for(var k in state.items) got+=state.items[k];
         var spent=(before-state.coins)/SILVER_PER_GOLD;
         // per-line rounding can differ from the quoted total by at most one gold per line
         return (Math.abs(spent-cost)<=sup.qty)+'/'+got;
       })()`)==='true/100');

    /* state.charms is read on every mods() call, so it has to exist on every save
       ever written — and an id no longer in CHARMS must stop paying out. */
    ok('an old save gets an empty charm list, and a stale id is dropped',
       ev(`(function(){
         state=defaultState(); delete state.charms; normalizeState();
         var fresh=Array.isArray(state.charms)&&state.charms.length===0;
         state.charms=['coin_purse','a_charm_that_was_deleted'];
         normalizeState();
         return fresh+'/'+state.charms.join(',');
       })()`)==='true/coin_purse');

    /* Every vendor renders. The panel is one function with five branches and four
       of them are new, so a throw in any of them is a blank shop. */
    ok('every vendor renders cards without throwing', ev(`(function(){
         state=defaultState(); normalizeState();
         for(var k in state.xp) state.xp[k]=XP_CUM[99];
         state.coins=900000*SILVER_PER_GOLD;
         var counts=[];
         SHOP_CATS.forEach(function(c){
           shopSelectedCat=c.key; viewTab='shop';
           renderShop();
           counts.push(c.key+':'+document.querySelectorAll('#shopView .sh-card').length);
         });
         return counts.join(' ');
       })()`).split(' ').every(x => +x.split(':')[1] > 0),
       ev(`(function(){ return SHOP_CATS.map(function(c){ shopSelectedCat=c.key; renderShop();
            return c.key+':'+document.querySelectorAll('#shopView .sh-card').length; }).join(' '); })()`));

    /* The cape line only claims a capstone for the seven skills that have one. */
    ok('only the skills with a reqCape node claim the capstone', ev(`(function(){
         var claimed=Object.keys(SKILLS).filter(function(k){ return _shopCapeCapstone(k); });
         var real=Object.keys(TREES).filter(function(k){
           return Array.isArray(TREES[k]) && TREES[k].some(function(n){ return n&&n.reqCape; }); });
         return claimed.length===real.length && claimed.every(function(k){ return real.indexOf(k)>=0; });
       })()`)===true);
    }

    section('Cooking cards (ticket #59, 0.9.122.19)');
    {
    /* Three silent defects in one panel, none of which throw.

       1. The fire does not burn a second of fuel per real second - Slow Embers and
          Open Hearth stretch it - but cookingFuelCyclesLeft divided raw fuel seconds
          by cook time, so a fully-ranked cook was told the fire held a third fewer
          cooks than it did, and Eternal Flame (fuel never burns) reported ZERO.
       2. "2 runs" was ambiguous between out-of-fish and out-of-fuel, separated only
          by an 11px flame glyph. The reporter read a fuel-capped "2 runs" while
          holding 24 raw minnows and reasonably concluded the count was broken.
       3. The chips were hidden while you could afford everything, so a dish you
          could actually cook printed no recipe at all - and they carried a thin
          data-tip rather than the data-item satchel card every other panel got in
          0.9.121.20. The dish icon carried nothing at all. */
    const fuel = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.xp.cooking=XP_CUM[60];
      state.items={};
      state.cookingFire={loaded:{ancient_log:4},partialSec:0,lit:true,lastBurnAt:Date.now()};
      var act=getAct('cooking','co1');
      var real=fuelBurnMult;
      var out={burn:fireBurnSec(), sec:actMs(act,'cooking')/1000};
      fuelBurnMult=function(){ return 1; };   out.plain  =cookingFuelCyclesLeft(act,'cooking');
      fuelBurnMult=function(){ return 0.5; }; out.slowed =cookingFuelCyclesLeft(act,'cooking');
      fuelBurnMult=function(){ return 0; };   out.eternal=cookingFuelCyclesLeft(act,'cooking')===Infinity;
      fuelBurnMult=real;
      return JSON.stringify(out);
    })()`));
    ok('fuel that burns half as fast is worth twice the cooks',
       fuel.slowed===fuel.plain*2 && fuel.plain===Math.floor(fuel.burn/fuel.sec),
       JSON.stringify(fuel));
    ok('and a fire that never burns down is not "0 runs"', fuel.eternal===true);

    /* The panel itself. One save, four readings of the same grid. */
    const ck = JSON.parse(ev(`(function(){
      state=defaultState(); normalizeState();
      state.xp.cooking=XP_CUM[60]; state.xp.fishing=XP_CUM[60];
      state.items={raw_minnow:24, oak_log:9};
      state.cookingFire={loaded:{oak_log:1},partialSec:0,lit:true,lastBurnAt:Date.now()};
      selectedSkill='cooking'; viewTab='acts'; renderCenter(); renderCooking();

      function cardFor(actId){
        var i=SKILLS.cooking.acts.findIndex(function(a){ return a.id===actId; });
        return document.querySelectorAll('#activityGrid .ck-card')[i];
      }
      var c=cardFor('co1');
      var mat=c.querySelector('.needs .mat');
      var runs=c.querySelector('.needs .runs');
      var icon=c.querySelector('.act-icon');
      var out={
        affordable:  canAfford(getAct('cooking','co1'),Infinity,mods('cooking')),
        chips:       c.querySelectorAll('.needs .mat').length,
        chipText:    mat?mat.textContent:'',
        runsText:    runs?runs.textContent.trim():'',
        fuelCapped:  !!(runs&&runs.className.indexOf('fuelcap')>=0),
        matItem:     mat?mat.getAttribute('data-item'):null,
        matNote:     mat?mat.getAttribute('data-itemnote'):null,
        matLegacy:   mat?mat.getAttribute('data-tip'):null,
        dishItem:    icon?icon.getAttribute('data-item'):null,
        heroText:    c.querySelector('.ck-hp').textContent.trim()
      };
      var cards=[].slice.call(document.querySelectorAll('#activityGrid .ck-card'));
      out.recipeless=cards.filter(function(x){
        return !/Unlocks at/.test(x.textContent) && !x.querySelector('.needs .mat'); }).length;
      out.untagged=cards.filter(function(x){
        var m=x.querySelector('.needs .mat'); return m && !m.getAttribute('data-item'); }).length;
      out.dishUntagged=cards.filter(function(x){
        var i=x.querySelector('.act-icon'); return i && !i.getAttribute('data-item'); }).length;

      // let the fire die and the cards say so in words
      state.cookingFire={loaded:{},partialSec:0,lit:false,lastBurnAt:Date.now()};
      renderCooking();
      var r2=cardFor('co1').querySelector('.needs .runs');
      out.outText=r2?r2.textContent.trim():'';

      // plenty of fuel, no fish: the OTHER errand
      state.items={};
      state.cookingFire={loaded:{ancient_log:6},partialSec:0,lit:true,lastBurnAt:Date.now()};
      renderCooking();
      var r3=cardFor('co1').querySelector('.needs .runs');
      out.starvedText=r3?r3.textContent.trim():'';

      // and with both, the plain ingredient count is what shows
      state.items={raw_minnow:24};
      renderCooking();
      var r4=cardFor('co1').querySelector('.needs .runs');
      out.plentyText=r4?r4.textContent.trim():'';
      return JSON.stringify(out);
    })()`));

    ok('a dish you can afford still prints its recipe',
       ck.affordable===24 && ck.chips===1 && /24/.test(ck.chipText),
       JSON.stringify([ck.affordable, ck.chips, ck.chipText]));
    ok('and so does every other unlocked dish', ck.recipeless===0,
       ck.recipeless+' cards printed no ingredients');
    /* The whole ticket: 24 fish in the bag, "2 runs" on the card. The number was
       right - it was the fire - and nothing on the card said so. */
    ok('a fuel-capped count says the FIRE is what is short',
       ck.fuelCapped===true && /fire/i.test(ck.runsText) && /2\s*runs/.test(ck.runsText),
       JSON.stringify(ck.runsText));
    ok('a dead fire says so in words, not "0 runs"',
       /fire is out/i.test(ck.outText) && !/\b0\s*runs/.test(ck.outText),
       JSON.stringify(ck.outText));
    ok('no ingredients still reads as no ingredients',
       /no ingredients/i.test(ck.starvedText), JSON.stringify(ck.starvedText));
    ok('and with fuel and fish both, the plain count shows unqualified',
       ck.plentyText==='24 runs', JSON.stringify(ck.plentyText));
    ok('an ingredient chip opens the satchel card, not the thin CSS tip',
       ck.matItem==='raw_minnow' && /have 24, need 1/.test(ck.matNote||'') && !ck.matLegacy,
       JSON.stringify([ck.matItem, ck.matNote, ck.matLegacy]));
    ok('so does the dish icon', ck.dishItem==='cooked_minnow', JSON.stringify(ck.dishItem));
    ok('every card on the panel is tagged the same way',
       ck.untagged===0 && ck.dishUntagged===0,
       'chips '+ck.untagged+', dishes '+ck.dishUntagged);
    /* The heal column carried the runs label whenever the chips were hidden. The
       chips are never hidden now, so it is the heal and nothing else. */
    ok('the heal column is the heal and nothing else',
       ck.heroText.replace(/\s+/g,'')==='25HP', JSON.stringify(ck.heroText));
    }

    ok('every gem tier offers a combat enchant', em.gaps.length===0, 'bare: '+em.gaps.join(', '));
    ok('Man-at-Arms is listed on emerald', em.name==='Man-at-Arms' && em.listed===true && em.tier===2);
    ok('and sits between Squire (4/4) and Soldier (8 atk)',
       em.atk>0.04 && em.atk<0.08 && em.def>0.04 && em.def<0.08);
    ok('an emerald piece still prices its enchants', em.priced===true);
  }

  console.log('\n' + (fail ? fail + ' FAILED, ' + pass + ' passed' : 'PASS — all ' + pass + ' audit regressions still fixed'));
  process.exit(fail ? 1 : 0);
}, 2500);

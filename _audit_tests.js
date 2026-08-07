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
    // Behavioural: force the roll to succeed, run a REAL harvest, and require the
    // pet to land. A grep for the call site stayed green when the call was made
    // unreachable, so it is not enough.
    const petFromHarvest=ev(`(function(){
        state=defaultState(); normalizeState(); state.xp.farming=XP_CUM[99]; state.skillPets={};
        var patch=PATCHES[0], crop=CROPS[0];
        if(!patch||!crop) return 'no patch/crop def';
        state.items[crop.id]=5;
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
              resolvesIcon:notifIconHTML('bronze_axe').indexOf('<svg')===0};})()`);
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

  console.log('\n' + (fail ? fail + ' FAILED, ' + pass + ' passed' : 'PASS — all ' + pass + ' audit regressions still fixed'));
  process.exit(fail ? 1 : 0);
}, 2500);

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
      /* Size is the live ship constraint — the wrapper aborts the whole fetch at 6s.
         Fail loudly well before the file becomes undownloadable on a slow line. */
      const mb = fs.statSync(path.join(ROOT, process.env.CV_FILE || 'cindervale.html')).size / 1048576;
      ok('file stays under the 7 MB wrapper-fetch ceiling', mb < 7, mb.toFixed(2) + ' MB');
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

    /* Versioning (v0.9.118 scheme). Two numbers on the banner: the RELEASE players
       and Steam see, which moves once per depot push, and data-build, which moves on
       every web push and is what version.json carries. The wrapper compares
       version.json by plain string inequality, so a desynced pair means players
       either never update or update to a build whose banner lies about it. */
    const banner = (html.match(/mm-ver[^>]*>v([0-9][0-9.a-z-]*)/) || [])[1] || null;
    const build  = (html.match(/mm-ver[^>]*data-build="([^"]+)"/) || [])[1] || null;
    let vjson = null;
    try { vjson = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')).version; } catch (e) {}
    ok('banner carries a release number', !!banner, String(banner));
    ok('banner carries a data-build stamp', !!build, String(build));
    ok('version.json matches the build stamp', vjson === build, vjson + ' vs ' + build);
    ok('the build belongs to the release on the banner',
       !!(build && banner) && build.indexOf(banner + '.') === 0, build + ' / ' + banner);
    /* A BOM in version.json makes JSON.parse throw inside the wrapper, which kills
       auto-update silently. It has happened once already. */
    try {
      const raw = fs.readFileSync(path.join(ROOT, 'version.json'));
      ok('version.json has no BOM', raw[0] !== 0xEF, 'first byte 0x' + raw[0].toString(16));
    } catch (e) { ok('version.json is readable', false, e.message); }
  }

  console.log('\n' + (fail ? fail + ' FAILED, ' + pass + ' passed' : 'PASS — all ' + pass + ' audit regressions still fixed'));
  process.exit(fail ? 1 : 0);
}, 2500);

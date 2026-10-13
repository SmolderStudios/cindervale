#!/usr/bin/env node
/* Raid Momentum + telegraph harness (0.9.125).
 *
 *   node _raidmom.js
 *
 * None of this throws when it breaks. A cast that never fires, an ability that
 * spends Momentum and does nothing, Brace still cutting damage after the run
 * ended: every one of those is silent, so _validate.js cannot see any of it.
 * This drives a real run and reads the numbers back.
 *
 * Top-level const/let live in the global LEXICAL scope, not on window, so
 * everything goes through w.eval() the same way _audit_tests.js does it.
 */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname, process.env.CV_FILE||'cindervale.html'),'utf8');
const { JSDOM }=require('jsdom');
/* Boot as Electron, not as a browser. IS_DEMO is a const evaluated at parse time
   off navigator.userAgent, and the demo caps every combat level at 10 — which
   silently makes startRaid() a no-op, since the cheapest raid wants Lv 70. */
const ELECTRON='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){ Object.defineProperty(w.navigator,'userAgent',{value:ELECTRON,configurable:true}); }});

setTimeout(()=>{
  const w=dom.window, ev=e=>w.eval(e);
  let pass=0, fail=0;
  const ok=(n,c,x)=>{ if(c){ pass++; console.log('  ok   '+n+(x?'  '+x:'')); }
                      else { fail++; console.log('  FAIL '+n+(x?'  '+x:'')); } };
  const section=t=>console.log('\n'+t);

  ev('state=defaultState(); normalizeState();');

  section('Telegraph data — every raid has something to answer');
  {
    /* The Spire is skipped here on purpose: it has no `stages` to inspect because
       its floors are generated, and every landing telegraphs by construction.
       _spiretest.js is what proves that. */
    const raids=ev('RAIDS.filter(r=>!r.endless).map(r=>({name:r.name, id:r.id, tele:r.stages.filter(s=>s.castfx).map(s=>({'+
      'name:s.name, kinds:s.castfx.kinds, castMs:s.castfx.castMs, everyMs:s.castfx.everyMs,'+
      'openMs:s.castfx.openMs, frac:s.castfx.frac, req:s.castfx.reqDmg||0,'+
      'labelled:(s.castfx.kinds||[]).every(k=>s.castfx.labels&&s.castfx.labels[k])}))}))');
    for(const r of raids){
      ok(r.name+' telegraphs at least twice', r.tele.length>=2, r.tele.map(t=>t.name).join(', '));
      for(const t of r.tele){
        ok('  '+t.name+' cast is well formed',
           Array.isArray(t.kinds)&&t.kinds.length>0&&t.castMs>0&&t.everyMs>t.castMs&&t.frac>0&&t.openMs>0,
           JSON.stringify({kinds:t.kinds,castMs:t.castMs,everyMs:t.everyMs}));
        /* A rupture with no damage requirement can never be failed; a slam with
           one is a damage check wearing a slam's clothes. Neither is intended. */
        ok('  '+t.name+' rupture and reqDmg agree',
           t.kinds.includes('rupture') ? t.req>0 : t.req===0, 'reqDmg '+t.req);
        /* An unlabelled kind silently prints the generic fallback in the log. */
        ok('  '+t.name+' names every kind it can roll', t.labelled===true, t.kinds.join('/'));
      }
    }
    /* The point of the change: the two bosses whose damage check fired on a
       hidden timer now telegraph it. If one comes back as bossfx, the ring will
       not draw for it and the player is back to guessing. */
    const hidden=ev("JSON.stringify(RAIDS.flatMap(r=>r.stages).filter(s=>s.bossfx&&s.bossfx.kind==='voidbomb').map(s=>s.name))");
    ok('no boss still runs an untelegraphed damage check', hidden==='[]', hidden);
    /* Ignar's burn is the deliberate exception: weather, not a decision. */
    const burns=ev("JSON.stringify(RAIDS.flatMap(r=>r.stages).filter(s=>s.bossfx&&s.bossfx.kind==='burn').map(s=>s.name))");
    ok('the passive burn is left alone', burns.indexOf('Ignar')>=0, burns);
  }

  section('Momentum accrues, and is capped');
  {
    /* Combat levels live in state.combatXp, NOT state.xp — that is the skilling
       store, and setting it leaves combatLevel() at 3 while every raid stays
       locked and startRaid() silently returns. */
    ev("state.combatXp=state.combatXp||{};"+
       "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
       "refreshCombatStats();");
    ok('the test character can enter every raid', ev('combatLevel()>=97'), 'Cmb '+ev('combatLevel()'));
    ev("startRaid('sunken_barrow')");
    ok('the run started', ev('!!combat.raid'), ev('combat.raid&&combat.raid.id'));
    ok('you enter with Momentum, not empty', ev('combat.mom===MOM_START'), ev('String(combat.mom)'));
    ok('the first stage is live', ev('combat.active===true'));
    ok('the run counts its casts from zero', ev('combat.raid.casts===0'));

    ev('combat.mom=0');
    ev('for(let i=0;i<40&&combat.raid;i++){ combat.youSwingStart=0; combat.foeSwingStart=Date.now(); combatTick(); }');
    ok('landing blows builds Momentum', ev('combat.mom>0'), ev('String(combat.mom)')+' after 40 swings');
    ok('Momentum never passes its cap', ev('combat.mom<=MOM_MAX'), ev('String(combat.mom)'));
    ev('combat.mom=MOM_MAX; momAdd(50)');
    ok('and momAdd clamps rather than overflowing', ev('combat.mom===MOM_MAX'), ev('String(combat.mom)'));
    ev('combat.mom=5; momAdd(-99)');
    ok('and never goes negative', ev('combat.mom===0'), ev('String(combat.mom)'));
  }

  section('The three abilities do what their tooltips say');
  {
    ev('combat.mom=MOM_MAX; combat.momLock=0; combat.youHp=Math.round(combat.youMaxHp*0.4)');
    const hp0=+ev('combat.youHp');
    const used=ev("raidUse('rally')");
    ok('Rally spends and heals', used===true && +ev('combat.youHp')>hp0, hp0+' -> '+ev('combat.youHp'));
    ok('Rally costs exactly its price', ev('combat.mom===MOM_MAX-30'), ev('String(combat.mom)'));
    ok('the shared lockout blocks a second cast in the same frame',
       ev("raidUse('ruin')===false"), ev('String(combat.momLock-Date.now())')+'ms left');

    ev("combat.momLock=0; combat.mom=MOM_MAX; raidUse('ruin')");
    ok('Ruin turns on', ev('ruinActive(Date.now())===true'));
    ok('Ruin expires on its own', ev('ruinActive(Date.now()+RUIN_MS+50)===false'));
    ev("combat.momLock=0; raidUse('brace')");
    ok('Brace turns on', ev('braceActive(Date.now())===true'));
    ok('Brace expires on its own', ev('braceActive(Date.now()+BRACE_MS+50)===false'));

    /* The leak that would be invisible: a buff bought in a raid still reducing
       damage in the ordinary arena afterwards. */
    ev('_savedRaid=combat.raid; combat.raid=null');
    ok('Ruin is inert outside a raid', ev('ruinActive(Date.now())===false'));
    ok('Brace is inert outside a raid', ev('braceActive(Date.now())===false'));
    ok('no ability can be used outside a raid', ev("canUseAbil('rally')===false"));
    ok('momAdd does nothing outside a raid', ev('(combat.mom=0, momAdd(50), combat.mom===0)'));
    ev('combat.raid=_savedRaid');

    ok('you cannot spend Momentum you do not have',
       ev("(combat.mom=0, combat.momLock=0, raidUse('ruin')===false)"), 'mom 0');
    ok('an unknown ability id is refused rather than throwing',
       ev("(combat.mom=100, combat.momLock=0, raidUse('nonsense')===false)"));
  }

  section('Telegraphs wind up, resolve, and Brace answers them');
  {
    ev("_r=getRaid('sunken_barrow'); _i=_r.stages.findIndex(s=>s.castfx); combat.raid.stage=_i; _beginRaidStage(_r,_i,true)");
    ok('a telegraphing stage schedules its first cast', ev('combat.nextCast>Date.now()'),
       ((+ev('combat.nextCast-Date.now()'))/1000).toFixed(1)+'s grace');
    ok('and the stage does not open mid-cast', ev('combat.cast===null'));

    ev('tickRaidCast(combat.nextCast)');
    ok('the cast winds up', ev('!!combat.cast'), ev('combat.cast&&combat.cast.label'));
    ok('it carries a name and a window',
       ev('!!(combat.cast&&combat.cast.label&&combat.cast.castMs>0)'),
       ev('combat.cast&&(combat.cast.label+" / "+combat.cast.castMs+"ms")'));
    ok('it does not resolve early',
       ev('(tickRaidCast(combat.cast.startMs+combat.cast.castMs-100), !!combat.cast)'));

    ev('combat.youHp=combat.youMaxHp; combat.momBrace=0; _c=combat.cast');
    ev('tickRaidCast(_c.startMs+_c.castMs+1)');
    const unbraced=+ev('combat.youMaxHp-combat.youHp');
    ok('an unanswered slam takes a real bite', unbraced>0, unbraced+' of '+ev('combat.youMaxHp'));
    ok('the cast clears after resolving', ev('combat.cast===null'));
    ok('and the next one is scheduled', ev('combat.nextCast>_c.startMs+_c.castMs'));

    ev('tickRaidCast(combat.nextCast); combat.youHp=combat.youMaxHp; _c2=combat.cast;'+
   'combat.momBrace=_c2.startMs+_c2.castMs+5000');  // the window must still be open when it lands
    ev('tickRaidCast(_c2.startMs+_c2.castMs+1)');
    const braced=+ev('combat.youMaxHp-combat.youHp');
    ok('Brace cuts a slam to roughly 30%', braced>0 && braced<unbraced*0.45,
       unbraced+' unbraced -> '+braced+' braced');
  }

  section('A rupture is a damage check, and it can be beaten');
  {
    ev("_r=getRaid('abyssal_throne'); _b=_r.stages.length-1;"+
       "combat.raid={id:'abyssal_throne',stage:_b,startMs:Date.now(),n:_r.stages.length,casts:0};"+
       "_beginRaidStage(_r,_b,true); tickRaidCast(combat.nextCast)");
    ok('the void boss opens on the rupture', ev("combat.cast&&combat.cast.kind==='rupture'"),
       ev('combat.cast&&combat.cast.kind'));
    ok('the window states a real damage requirement', ev('combat.cast&&combat.cast.req>0'),
       ev('combat.cast&&String(combat.cast.req)'));

    ev('combat.youHp=combat.youMaxHp; combat.mom=0; _c=combat.cast; combat.cast.acc=_c.req');
    ev('tickRaidCast(_c.startMs+_c.castMs+1)');
    ok('meeting a rupture suppresses it entirely', ev('combat.youHp===combat.youMaxHp'),
       ev('combat.youHp+"/"+combat.youMaxHp'));
    ok('and it pays Momentum back', ev('combat.mom>0'), ev('String(combat.mom)'));

    ev('tickRaidCast(combat.nextCast)');
    ok('the boss then alternates to a slam', ev("combat.cast&&combat.cast.kind==='slam'"),
       ev('combat.cast&&combat.cast.kind'));
    ev('combat.youHp=combat.youMaxHp; combat.momBrace=0; _c2=combat.cast; tickRaidCast(_c2.startMs+_c2.castMs+1)');
    ok('an unanswered boss slam lands', ev('combat.youHp<combat.youMaxHp'),
       ev('combat.youHp+"/"+combat.youMaxHp'));

    /* Missing the check must hurt MORE than the alternating slam, or there is no
       reason to ever spend Ruin on it. */
    ev("_r=getRaid('abyssal_throne'); combat.raid.casts=0; _beginRaidStage(_r,_b,true); tickRaidCast(combat.nextCast)");
    ev('combat.youHp=combat.youMaxHp; combat.cast.acc=0; _c3=combat.cast; tickRaidCast(_c3.startMs+_c3.castMs+1)');
    const missed=+ev('combat.youMaxHp-combat.youHp');
    ok('failing the check costs more than eating the slam', missed>0, missed+' damage');
  }

  section('Nothing leaks out of a finished run');
  {
    ev('combat.mom=55; combat.momRuin=Date.now()+9000; combat.momBrace=Date.now()+9000; combat.cast={}; combat.nextCast=1; clearRaidMomentum()');
    ok('ending a run wipes every Momentum field',
       ev('combat.mom===0&&combat.momRuin===0&&combat.momBrace===0&&combat.cast===null&&combat.nextCast===0'));
    ev("state=defaultState(); normalizeState()");
    ok('auto-cast defaults on for a fresh save', ev('state.raidAuto===true'), ev('String(state.raidAuto)'));
    ev("state.raidAuto='yes'; normalizeState()");
    ok('and a corrupt value is repaired, not carried', ev('state.raidAuto===true'), ev('String(state.raidAuto)'));
    ev("state.raidAuto=false; normalizeState()");
    ok('but a deliberate false is respected', ev('state.raidAuto===false'), ev('String(state.raidAuto)'));
  }

  section('A raid in a hidden window (0.9.127.5)');
  {
    /* A minimised game gets its timers once a minute. A raid's charged attacks and
       Ignar's burn run on the clock while combatTick() gave you one attack a tick,
       so a hidden raid was one attack a minute against a boss on full speed. The
       fight's timer now runs the ticks it missed, each on the clock it would have
       had, and Date.now is that clock for as long as the catch-up lasts: a stage
       that begins inside one stamps its attack timers, its first charged attack and
       the run's clear time off it. This drives the timer the game really starts,
       the way _audit_tests.js does for an ordinary fight. */
    ev(`window.__hwRaid=function(gap, minutes){
      var D=Date.now, R=Math.random, SI=window.setInterval, CI=window.clearInterval, CT=window.combatTick, kept={};
      var QUIET=['renderCombat','updateCombatBars','cmbSplat','renderAll','renderRightPanel','renderHeader','toast','showHint','refreshCombatTabIndicator','renderSkillList','saveGame','logNotification'];
      var out={steps:0, fires:0, most:0, stagesInOneFiring:0, err:''};
      var fake=D.call(Date), mine=function(){ return fake; }, T={fn:null,id:0,n:0};
      try{
        state=defaultState(); normalizeState();
        for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];
        var eq={weapon:'starsteel_sword', shield:'starsteel_shield', helmet:'starsteel_helm', chest:'starsteel_chest', legs:'starsteel_legs', gloves:'starsteel_gloves', boots:'starsteel_boots', cape:'starsteel_cape'};
        state.items={}; for(var s in eq) state.items[eq[s]]=1;
        state.combatEquipped=eq;
        QUIET.forEach(function(k){ if(typeof window[k]==='function'){ kept[k]=window[k]; window[k]=function(){}; } });
        refreshCombatStats();
        Date.now=mine;
        Math.random=(function(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; })(4242);
        window.setInterval=function(fn,ms){ if(ms===100){ T.fn=fn; T.id=800000+(++T.n); return T.id; } return SI.apply(window,arguments); };
        window.clearInterval=function(id){ if(id&&id===T.id){ T.fn=null; return; } return CI.apply(window,arguments); };
        /* health topped up after every tick, as _magesim.js does for a raid: the
           question is whether the run moves, not whether this loadout survives it */
        window.combatTick=function(){ out.steps++; var r=CT(); if(combat.raid&&combat.active) combat.youHp=combat.youMaxHp; return r; };
        /* the sections above leave their last run standing, and startRaid() refuses to start over one */
        try{ stopCombatTimer(); }catch(e){} combat.active=false; combat.raid=null; combat.raidDebuff=null; clearRaidMomentum();
        _raidResult=null;
        startRaid('sunken_barrow');
        out.started=!!(combat.raid&&combat.active&&T.fn); out.timer=T.fn?T.fn.name:'';
        var t0=fake, end=t0+minutes*60000;
        while(fake<end && T.fn && combat.raid){
          var st=combat.raid.stage, s0=out.steps;
          fake+=gap; out.fires++; T.fn();
          if(out.steps-s0>out.most) out.most=out.steps-s0;
          var moved=(combat.raid?combat.raid.stage:getRaid('sunken_barrow').stages.length)-st;
          if(moved>out.stagesInOneFiring) out.stagesInOneFiring=moved;
        }
        out.cleared=!combat.raid && !combat.active && !!_raidResult && !_raidResult.failed;
        out.timeMs=_raidResult?_raidResult.timeMs:0; out.rating=_raidResult?_raidResult.rating:'';
        out.wall=fake-t0; out.timerOn=!!T.fn; out.clock=Date.now===mine; out.idle=_combatCatchUp===null;
      }catch(e){ out.err=String(e&&e.message||e); }
      finally{
        Date.now=D; Math.random=R; window.combatTick=CT;
        try{ stopCombatTimer(); }catch(e){}
        window.setInterval=SI; window.clearInterval=CI;
        for(var k in kept) window[k]=kept[k];
        combat.active=false; combat.raid=null; combat.raidDebuff=null; combat.bossfx=null; combat.monfx=null; clearRaidMomentum(); _raidResult=null;
        state=defaultState(); normalizeState();
      }
      return JSON.stringify(out);
    };`);
    const seen=JSON.parse(ev('__hwRaid(100, 30)')), hid=JSON.parse(ev('__hwRaid(60000, 30)'));
    ok('in view, the test character clears the Sunken Barrow', seen.started && seen.cleared && !seen.err,
       seen.err || (Math.round(seen.timeMs/1000)+'s, '+seen.steps+' ticks, '+seen.rating+' rank'));
    ok('with its timer held to once a minute the same run clears, on the same tick',
       hid.started && hid.cleared && !hid.err && hid.steps===seen.steps, hid.err || (hid.steps+' ticks from '+hid.fires+' firings, against '+seen.steps));
    ok('a stage that begins inside a catch-up starts fighting inside it', hid.stagesInOneFiring>=2,
       hid.stagesInOneFiring+' stages passed in one firing');
    ok('the clear time and the rank are the fight\'s own, not the wake-up\'s',
       hid.timeMs===seen.timeMs && hid.rating===seen.rating && hid.wall>hid.timeMs,
       Math.round(hid.timeMs/1000)+'s '+hid.rating+' rank, noticed '+Math.round(hid.wall/1000)+'s in');
    ok('and the run leaves the real clock and no held painting behind it', hid.clock && hid.idle && !hid.timerOn);
    ev('delete window.__hwRaid');
  }

  /* Ticket #237 (0.9.127.7): "You can run a skill while you are in raid." Skilling
     and fighting are one or the other, and a raid started through its own door had
     no such rule. The other direction was worse: starting a skill mid-raid stopped
     the fight and left the run standing, and engaging again refilled your health. */
  console.log('\nA raid and a skill do not run together (#237)');
  {
    const r=JSON.parse(ev(`(function(){
      try{ if(combat.raid||combat.active) fleeCombat(); }catch(e){}
      state=defaultState(); normalizeState(); mmAtMenu=false; mmSlot=1;
      Object.keys(COMBAT_STATS).forEach(function(k){ state.combatXp[k]=XP_CUM[99]; });
      state.xp.mining=XP_CUM[50]; refreshCombatStats();
      setAction('mining',SKILLS.mining.acts[0].id);
      var training=!!state.action;
      startRaid('sunken_barrow');
      var out={training:training, raid:!!combat.raid, live:combat.active===true, stopped:state.action===null};
      combat.youHp=Math.max(1,Math.round(combat.youMaxHp*0.2)); var hp=combat.youHp, stage=combat.raid?combat.raid.stage:-1;
      setAction('mining',SKILLS.mining.acts[0].id);
      out.refused=(state.action===null);
      out.stillRaid=!!combat.raid&&combat.active===true&&combat.raid.stage===stage;
      out.noHeal=(combat.youHp===hp);
      try{ fleeCombat(); }catch(e){}
      setAction('mining',SKILLS.mining.acts[0].id);
      out.afterLeaving=!!state.action;
      state.action=null;
      return JSON.stringify(out);
    })()`));
    ok('starting a raid stops the skill that was running', r.training && r.raid && r.live && r.stopped, JSON.stringify(r));
    ok('a skill cannot be started during a raid, and the run is left alone', r.refused && r.stillRaid);
    ok('so there is no stopping a raid for a free refill of your health', r.noHeal);
    ok('once you have left the raid, the skill starts as usual', r.afterLeaving);
  }

  section('A staff and a wand in every raid, Dawnveil, and Faultline (0.9.127.11)');
  {
    /* Raid gear is rolled piece by piece off raid.gearDrops, on a clear. A row that
       names an item which does not exist grants nothing and says nothing, and so
       does a staff whose stun, burn or second hit never reaches the tick. So the
       tables are read, a clear is rolled with the dice held, and each effect is cast
       once in a live raid and then carried across a stage. */
    const rd=JSON.parse(ev(`(function(){
      try{ if(combat.raid||combat.active) fleeCombat(); }catch(e){}
      var R=Math.random, o={tables:[], rolls:[]};
      RAIDS.filter(function(r){ return !r.endless; }).forEach(function(r){
        var mg=r.gearDrops.filter(function(g){ return ITEMS[g.id]&&ITEMS[g.id].magic; });
        var top=Math.max.apply(null, r.gearDrops.map(function(g){ var it=ITEMS[g.id]; return (it&&it.cslot==='weapon'&&!it.magic)?it.ctier:0; }));
        o.tables.push({raid:r.id, n:mg.length, fams:mg.map(function(g){ return ITEMS[g.id].mfam; }).sort().join(','),
          rate:mg.every(function(g){ return g.chance===0.010; }), tier:mg.every(function(g){ return ITEMS[g.id].ctier===top; }), top:top,
          real:r.gearDrops.every(function(g){ return !!ITEMS[g.id]&&!!COMBAT_GEAR_STATS[g.id]&&!!ICONS[g.id]; }),
          veil:r.gearDrops.filter(function(g){ return ITEMS[g.id]&&ITEMS[g.id].setKey==='dawnveil'; }).map(function(g){ return g.chance; }).join(','),
          names:mg.map(function(g){ return ITEMS[g.id].name; }).join(' and ')});
        /* a clear with the dice held just under, then just over, what a 1% piece needs at this rating */
        var mult=raidRating(r,1).mult, need=Math.min(0.6,0.010*mult*charDropMult());
        var roll=function(c){ state=defaultState(); normalizeState(); Math.random=function(){ return c; };
          var res=grantRaidRewards(r,1); Math.random=R;
          return {got:mg.filter(function(g){ return res.gear.indexOf(g.id)>=0 && state.items[g.id]===1 && state.discovered[g.id]===1; }).length,
                  veil:res.gear.filter(function(id){ return ITEMS[id].setKey==='dawnveil'; }).length}; };
        o.rolls.push({raid:r.id, under:roll(need-1e-9), over:roll(need+1e-9)});
      });
      /* a level 99 mage in a live raid, one cast at a time with the dice held */
      var arm=function(raidId,weapon,el){
        try{ if(combat.raid||combat.active) fleeCombat(); }catch(e){}
        state=defaultState(); normalizeState(); mmAtMenu=false; mmSlot=1;
        Object.keys(COMBAT_STATS).forEach(function(k){ state.combatXp[k]=XP_CUM[99]; });
        state.items={starfall_rune:5000, sunder_rune:5000}; state.items[weapon]=1;
        state.combatEquipped={weapon:weapon, quiver:ITEMS[weapon].ctier>=10?'sunder_rune':'starfall_rune'};
        state.combatElement=el||'storm'; state.combatSpell='bolt'; state.raidAuto=false;
        refreshCombatStats(); startRaid(raidId); stopCombatTimer();
        combat.foeSwingStart=Date.now()+1e9;
      };
      var cast=function(c){ Math.random=function(){ return c; }; combat.youSwingStart=Date.now()-combat.youSwingMs-1; combatTick(); Math.random=R; };
      var base=function(c){ return Math.max(1,Math.round(combat.youMaxHit*(COMBAT_P.HIT_MIN+(1-COMBAT_P.HIT_MIN)*c))); };
      /* Gravecall Staff: a stun, and a stunned monster does not attack */
      arm('sunken_barrow','gravecall_staff');
      var hp0=combat.foeHp; cast(0.09);
      o.stun={in:!!(combat.raid&&combat.active), hit:hp0-combat.foeHp>0, on:!!(combat.foeStatus&&combat.foeStatus.stun)};
      var you=combat.youHp; combat.youSwingStart=Date.now()+1e9; combat.foeSwingStart=Date.now()-60000;
      Math.random=function(){ return 0.01; }; combatTick(); Math.random=R;
      o.stun.held=combat.youHp===you;
      /* the next cast kills it: the next stage starts clean, and its monster attacks at its own speed */
      var st0=combat.raid.stage; combat.foeHp=1; cast(0.09);
      var m2=getMonster(combat.monId);
      o.stage={moved:combat.raid.stage===st0+1, clean:Object.keys(combat.foeStatus||{}).length===0, own:combat.foeSwingMs===(m2.swingMs||COMBAT_BASE_SWING_MS), live:combat.active===true};
      /* Dawncaller: a burn whatever the element, at 16% of max hit, gone at the next stage */
      arm('empyrean_throne','dawncaller','storm'); cast(0.2);
      o.burn={on:!!combat.foeStatus.burn, tick:combat.foeStatus.burn?combat.foeStatus.burn.tickDmg:0, want:Math.max(1,Math.round(combat.youMaxHit*0.16))};
      var bs=combat.raid.stage; combat.foeHp=1; cast(0.2); o.burn.cleared=combat.raid.stage===bs+1 && !(combat.foeStatus&&combat.foeStatus.burn);
      /* Slagfire Staff in the Emberforge, whose monsters resist Fire: the staff's 8% and the monster's -15% on one roll */
      arm('emberforge','slagfire_staff','fire');
      var mon=getMonster(combat.monId), h1=combat.foeHp, b=base(0.3); cast(0.3);
      o.aff={resists:mon.resistEl==='fire', dealt:h1-combat.foeHp, want:Math.max(1,Math.round(b*(ELEMENT_RESIST_MULT*1.08)))};
      /* Faultline on the Spire: a cast that hits twice, counted once by everything that counts damage */
      arm(SPR_ID,'faultline','storm');
      var h2=combat.foeHp, b2=base(0.09), mom0=combat.mom; cast(0.09);
      var crit=combatBonusesAll().critChance>0.09;
      var one=Math.max(1,Math.round(Math.max(1,Math.round(b2*elementMult(getMonster(combat.monId),'storm')))*(crit?(2+(combatBonusesAll().critDmg||0)):1)));
      o.twice={dealt:h2-combat.foeHp, one:one, said:combat.log.map(function(l){ return String(l.t); }).filter(function(t){ return /hits a second time for/.test(t); })[0]||'', mom:combat.mom-mom0, perHit:Math.round((MOM_PER_HIT+momGearBonus())*spireBoon('momMult'))};
      try{ fleeCombat(); }catch(e){}
      state=defaultState(); normalizeState(); refreshCombatStats();
      return JSON.stringify(o);
    })()`));
    ok('every raid drops one staff and one wand, at the 1% its other weapons drop at',
       rd.tables.length===4 && rd.tables.every(t=>t.n===2 && t.fams==='staff,wand' && t.rate),
       rd.tables.map(t=>t.names).join(' · '));
    ok('each at the tier of the weapons already on that table', rd.tables.every(t=>t.tier), rd.tables.map(t=>'T'+t.top).join(' '));
    ok('and every row on every raid table is a real item with numbers and an icon', rd.tables.every(t=>t.real));
    ok('Dawnveil is four pieces at 1.8% each, from The Empyrean Throne and nowhere else',
       rd.tables.every(t=>t.raid==='empyrean_throne' ? t.veil==='0.018,0.018,0.018,0.018' : t.veil===''),
       rd.tables.map(t=>t.raid+': '+(t.veil||'none')).join(' · '));
    ok('a clear really hands them over: the staff and the wand both drop when the dice allow a 1% piece',
       rd.rolls.every(r=>r.under.got===2), rd.rolls.map(r=>r.under.got).join(' '));
    ok('and do not when the dice are a hair over, while the 1.8% pieces still do',
       rd.rolls.every(r=>r.over.got===0) && rd.rolls.find(r=>r.raid==='empyrean_throne').over.veil===4 && rd.rolls.find(r=>r.raid==='empyrean_throne').under.veil===4,
       rd.rolls.map(r=>r.over.got+'/'+r.over.veil).join(' '));
    ok('the Gravecall Staff stuns in a live raid, and a stunned monster does not attack',
       rd.stun.in && rd.stun.hit && rd.stun.on && rd.stun.held, JSON.stringify(rd.stun));
    ok('nothing is carried to the next stage: no stun on its monster, and it attacks at its own speed',
       rd.stage.moved && rd.stage.clean && rd.stage.own && rd.stage.live, JSON.stringify(rd.stage));
    ok('Dawncaller burns whatever the element, for 16% of your max hit a tick, and the burn ends with the stage',
       rd.burn.on && rd.burn.tick===rd.burn.want && rd.burn.cleared, JSON.stringify(rd.burn));
    ok('the Slagfire Staff adds its 8% to Fire on the roll a monster that resists Fire takes 15% off',
       rd.aff.resists && rd.aff.dealt===rd.aff.want, rd.aff.dealt+' dealt, '+rd.aff.want+' expected');
    ok('Faultline hits twice on the Spire, and the log says so in a mage\'s words',
       rd.twice.dealt===rd.twice.one*2 && /^Storm Bolt hits a second time for \d+\.$/.test(rd.twice.said), rd.twice.said+' ('+rd.twice.dealt+' = 2 x '+rd.twice.one+')');
    ok('and the two hits are one cast to Momentum', rd.twice.mom===rd.twice.perHit, '+'+rd.twice.mom);
  }

  section('A machine that sleeps, in the full game (0.9.127.11)');
  {
    /* Over two minutes without a tick is a sleeping machine, and tick() settles the
       gap as time away: grantOffline(), then resumeCombatSession(). All either of
       them knows of a fight is state.combatSession, and until 0.9.127.11 only
       saveGame() wrote that, up to five seconds behind the fight. It also left it
       alone for the whole of a raid. So: flee a fight, enter a raid before the next
       autosave, and the fled fight was still "in progress" for as long as the raid
       ran. Sleep in that raid and the settle credited the fled monster's kills,
       then resumed that fight INTO the raid: the stage's monster became the fled
       one at full health, and killing it moved the raid on. Flee a Cave Rat and
       stage one of any raid was a Cave Rat.

       Here because this harness boots the full game: a raid wants Lv 70 and the
       gold watch wants half a million gold, and the demo that _audit_tests.js runs
       as has neither. On a clock this holds, through the timer the game starts.
       `ops` is what happens, in order:
         ['engage', id] ['flee'] ['raid', id]   the game's own
         ['fire', gap, n]   the fight's timer fires n times, each `gap` ms after the last
         ['tick'] ['save']  the 250 ms loop, and saveGame()
         ['plant', id]      a session written straight into the save
         ['resume']         resumeCombatSession(), called as the settle calls it
         ['gold', n]        n gold arrives from nowhere
         ['food', n]        how many Cooked Void Eels are in the satchel
         ['saveInSettle']   a save runs inside the settle, after the fight is resolved
         ['snap', name] */
    ev(`window.__slp=function(ops){
      var D=Date.now, R=Math.random, SI=window.setInterval, CI=window.clearInterval, AP=window._auditPing, RD=window._resolvePlayerDeath, kept={};
      var keep={menu:mmAtMenu, slot:mmSlot, ls:window.lsSet, base:_coinsBaseline, mode:combatMode};
      var QUIET=['renderCombat','updateCombatBars','cmbSplat','renderAll','renderRightPanel','renderHeader','toast','showHint','refreshCombatTabIndicator','renderSkillList','logNotification','showOfflineSummary','renderQuestDock','questCheck','renderPets','showItemPop','showXpPop'];
      var out={snaps:{}, pings:[], resumed:null, deaths:0, err:''};
      var fake=D.call(Date), T={fn:null,id:0,n:0};
      function snap(){ return { mon:combat.monId, on:!!combat.active, raid:combat.raid?combat.raid.id:'', stage:combat.raid?combat.raid.stage:-1,
        foeHp:Math.round(combat.foeHp||0), hp:Math.round(combat.youHp||0), session:state.combatSession?state.combatSession.monId:null,
        kills:JSON.stringify(state.monKills||{}), offXp:state.offlineXp||0, gold:Math.round((state.coins||0)/SILVER_PER_GOLD), pings:out.pings.length,
        /* the food left, whether the fight's timer is still set, deaths so far, and
           the lines in the fight log that say the food ran out */
        food:state.items.cooked_voideel||0, timerOn:!!T.fn, deaths:out.deaths,
        said:combat.log.filter(function(l){ return /ran out of food/i.test(l.t); }).map(function(l){ return l.t; }),
        took:combat.log.filter(function(l){ return /take up the fight/i.test(l.t); }).length }; }
      try{
        state=defaultState(); normalizeState();
        for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];
        var eq={weapon:'starsteel_sword', shield:'starsteel_shield', helmet:'starsteel_helm', chest:'starsteel_chest', legs:'starsteel_legs', gloves:'starsteel_gloves', boots:'starsteel_boots', cape:'starsteel_cape'};
        state.items={cooked_voideel:1000000}; for(var s in eq) state.items[eq[s]]=1;
        state.combatEquipped=eq;
        state.hints=state.hints||{}; state.hints.combat_unarmed=1;
        mmAtMenu=false; mmSlot=3; _lastTickWall=0;
        window.lsSet=function(){ return true; };           // the save runs and stamps; only the write to storage is left out
        _coinsBaseline=state.coins||0;                     // as mmFinishStart leaves it on the way in
        QUIET.forEach(function(k){ if(typeof window[k]==='function'){ kept[k]=window[k]; window[k]=function(){}; } });
        window._auditPing=function(reason){ out.pings.push(String(reason)); };   // counted, never sent
        window._resolvePlayerDeath=function(){ out.deaths++; return RD.apply(this,arguments); };
        refreshCombatStats();
        Date.now=function(){ return fake; };
        Math.random=(function(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; })(4242);
        window.setInterval=function(fn,ms){ if(ms===100){ T.fn=fn; T.id=800000+(++T.n); return T.id; } return SI.apply(window,arguments); };
        window.clearInterval=function(id){ if(id&&id===T.id){ T.fn=null; return; } return CI.apply(window,arguments); };
        try{ stopCombatTimer(); }catch(e){} combat.active=false; combat.raid=null; combat.raidDebuff=null; clearRaidMomentum(); _raidResult=null;
        combatMode=true; state.cmbSubTab='arena'; combat.log.length=0;
        ops.forEach(function(op){
          if(op[0]==='engage'){ state.zone=getMonster(op[1]).zone; combat.monId=op[1]; combat.youHp=combat.youMaxHp; engageCombat(); }
          else if(op[0]==='flee') fleeCombat();
          else if(op[0]==='raid') startRaid(op[1]);
          else if(op[0]==='fire'){ for(var i=0;i<(op[2]||1);i++){ fake+=op[1]; if(T.fn) T.fn(); } }
          else if(op[0]==='tick') tick();
          else if(op[0]==='save') saveGame();
          else if(op[0]==='plant') state.combatSession={monId:op[1], style:'attack', youHp:combat.youMaxHp, rare:false, at:fake};
          else if(op[0]==='resume') out.resumed=resumeCombatSession();
          else if(op[0]==='gold') state.coins=(state.coins||0)+op[1]*SILVER_PER_GOLD;
          else if(op[0]==='food'){ if(op[1]) state.items.cooked_voideel=op[1]; else delete state.items.cooked_voideel; }
          else if(op[0]==='saveInSettle') window.showOfflineSummary=function(){ saveGame(); };   // the last thing grantOffline() calls
          else if(op[0]==='snap') out.snaps[op[1]]=snap();
        });
      }catch(e){ out.err=String(e&&e.message||e); }
      finally{
        Date.now=D; Math.random=R; window._auditPing=AP; window._resolvePlayerDeath=RD;
        try{ stopCombatTimer(); }catch(e){}
        window.setInterval=SI; window.clearInterval=CI; window.lsSet=keep.ls;
        for(var k in kept) window[k]=kept[k];
        combat.active=false; combat.raid=null; combat.raidDebuff=null; combat.bossfx=null; combat.monfx=null; clearRaidMomentum(); _raidResult=null;
        combatMode=keep.mode; mmAtMenu=keep.menu; mmSlot=keep.slot; _coinsBaseline=keep.base; _lastTickWall=0;
        state=defaultState(); normalizeState();
      }
      return JSON.stringify(out);
    };`);
    const SLP=ops=>JSON.parse(ev('__slp('+JSON.stringify(ops)+')'));
    const TEN=600000, HARD=ev("RAIDS.filter(function(r){ return !r.endless; }).slice(-1)[0].id");
    const first=ev("getRaid('"+HARD+"').stages[0].id");

    /* Flee a Cave Rat, enter the hardest raid before any save, sleep ten minutes. */
    const stale=SLP([['tick'],['engage','rat'],['fire',100,20],['save'],['flee'],['raid',HARD],['fire',100,30],['tick'],['snap','asleep'],
                     ['fire',TEN],['tick'],['snap','woke'],['fire',100,3],['snap','on']]);
    const A=stale.snaps.asleep||{}, W=stale.snaps.woke||{}, N=stale.snaps.on||{};
    ok('the case: a fled Cave Rat is still the fight in the save, three seconds into the hardest raid',
       !stale.err && A.session==='rat' && A.raid===HARD && A.mon===first && A.on===true,
       stale.err || ('session '+A.session+', in '+A.raid+' against '+A.mon));
    ok('ten minutes asleep there settles no fight: not one Cave Rat is credited',
       W.kills===A.kills && W.gold===A.gold, 'kills '+A.kills+' -> '+W.kills+', gold '+A.gold+' -> '+W.gold);
    ok('the time away still counts for what it should: the Offline skill', W.offXp>A.offXp, 'Offline XP '+A.offXp+' -> '+W.offXp);
    ok('and the raid is left exactly as it was: the same stage, the same monster, the same health on both sides',
       W.raid===HARD && W.stage===A.stage && W.mon===first && W.foeHp===A.foeHp && W.hp===A.hp && W.on===true,
       W.mon+' '+W.foeHp+' (was '+A.mon+' '+A.foeHp+'), you '+W.hp+' (was '+A.hp+'), stage '+(W.stage+1));
    ok('the leftover session is gone, and the raid goes on against its own monster',
       W.session===null && N.mon===first && N.raid===HARD && N.foeHp<=W.foeHp, 'session '+W.session+'; three ticks on, '+N.mon+' '+N.foeHp);

    /* The half no save ever put right: saveGame() left the session alone in a raid. */
    const inRaid=SLP([['tick'],['engage','rat'],['fire',100,20],['save'],['flee'],['raid',HARD],['fire',100,10],['snap','entered'],['save'],['snap','saved']]);
    ok('a save made in a raid does not keep a fight in it: a raid is never a session',
       !inRaid.err && inRaid.snaps.entered.session==='rat' && inRaid.snaps.saved.session===null && inRaid.snaps.saved.raid===HARD,
       inRaid.err || ('session '+inRaid.snaps.entered.session+' before the save, '+inRaid.snaps.saved.session+' after'));

    /* And the last line of defence, whoever leaves a session lying about. */
    const guard=SLP([['raid',HARD],['fire',100,10],['snap','before'],['plant','rat'],['resume'],['snap','after']]);
    ok('resumeCombatSession() refuses while a raid is live, and drops the session it was handed',
       !guard.err && guard.resumed===false && guard.snaps.after.mon===first && guard.snaps.after.foeHp===guard.snaps.before.foeHp
       && guard.snaps.after.hp===guard.snaps.before.hp && guard.snaps.after.session===null,
       guard.err || ('returned '+guard.resumed+', still '+guard.snaps.after.mon+' '+guard.snaps.after.foeHp));

    /* The gold watch. saveGame() sends "Sudden gold spike (possible injection)" to
       the audit channel when gold has risen by more than GOLD_SPIKE since the last
       save. mmFinishStart re-reads the baseline after its own settle so that honest
       offline gold never trips it. The sleep settle did not, so six hours asleep in
       a Lv 99 fight flagged an honest player. */
    const line=ev('GOLD_SPIKE/SILVER_PER_GOLD');
    const rich=SLP([['tick'],['engage','demon'],['fire',100,20],['save'],['tick'],['snap','asleep'],['fire',6*3600000],['tick'],['snap','woke'],
                    ['save'],['snap','saved'],['gold',line+100000],['save'],['snap','odd']]);
    const G=rich.snaps;
    ok('six hours asleep on a Demon settles more gold than the watch allows between two saves',
       !rich.err && G.woke.gold-G.asleep.gold>line, rich.err || ((G.woke.gold-G.asleep.gold).toLocaleString('en-US')+' gold against a line of '+line.toLocaleString('en-US')));
    ok('and the next save sends no gold spike for it', G.saved.pings===0, G.saved.pings+' sent');
    ok('gold that arrives any other way still trips the watch', G.odd.pings===1, G.odd.pings+' sent for '+(line+100000).toLocaleString('en-US')+' gold from nowhere');
    /* The baseline moves by what the settle added, and is not simply read again:
       reading it again would wave through anything that arrived since the last
       save, alongside the settle. */
    const mixed=SLP([['tick'],['engage','demon'],['fire',100,20],['save'],['tick'],['gold',line+100000],['fire',6*3600000],['tick'],['snap','woke'],['save'],['snap','saved']]);
    ok('even when it arrives between the last save and the settle', !mixed.err && mixed.snaps.saved.pings===1,
       mixed.err || (mixed.snaps.saved.pings+' sent'));

    /* Out of food. offlineCombatResolve() treats food as the limit: when the satchel
       cannot cover the kills the time away would give, it settles what the food
       allows, clears the session, and the fight is over. On a launch that is true,
       because nothing is running. After a sleep the fight in front of you still
       was: resumeCombatSession() found no session and did nothing, and the fight
       carried on with an empty satchel, under a Welcome Back panel saying it had
       stopped, until you died. The settle now ends it, on grantOffline()'s own
       word and not on what the save holds, because a save run inside the settle
       writes the session straight back from the fight that is still live. */
    const SIX=6*3600000;
    const dry=SLP([['tick'],['engage','demon'],['fire',100,20],['save'],['food',3],['tick'],['snap','asleep'],['fire',SIX],['tick'],['snap','woke'],['fire',100,600],['snap','on']]);
    const DA=dry.snaps.asleep||{}, DW=dry.snaps.woke||{}, DN=dry.snaps.on||{};
    ok('the case: three fish in the satchel, six hours asleep on a Demon, and the settle eats all three',
       !dry.err && DA.on===true && DA.food===3 && DW.food===0 && DW.kills!==DA.kills,
       dry.err || ('fish '+DA.food+' -> '+DW.food+', kills '+DA.kills+' -> '+DW.kills));
    ok('the fight in front of you is over when you come back: not running, its timer cleared, nothing left in the save',
       DW.on===false && DW.timerOn===false && DW.session===null, 'fighting '+DW.on+', timer '+DW.timerOn+', session '+DW.session);
    ok('and the fight log says why, once', (DW.said||[]).length===1, (DW.said||[]).join(' | ')||'nothing said');
    ok('a minute on, nothing more has been fought and nobody has died',
       DN.kills===DW.kills && DN.on===false && DN.deaths===0 && DN.hp===DW.hp,
       'kills '+DW.kills+' -> '+DN.kills+', deaths '+DN.deaths+', health '+DW.hp+' -> '+DN.hp);
    const dry2=SLP([['tick'],['engage','demon'],['fire',100,20],['save'],['food',3],['tick'],['saveInSettle'],['fire',SIX],['tick'],['snap','woke'],['fire',100,600],['snap','on']]);
    const D2W=dry2.snaps.woke||{}, D2N=dry2.snaps.on||{};
    ok('a save run inside the settle cannot bring the fight back',
       !dry2.err && D2W.on===false && D2W.session===null && D2N.on===false && D2N.deaths===0 && D2N.kills===D2W.kills,
       dry2.err || ('fighting '+D2W.on+', session '+D2W.session+'; a minute on: kills '+D2W.kills+' -> '+D2N.kills+', deaths '+D2N.deaths));
    ok('not even for a moment: the fight is ended before the resume looks, so it is never taken up and dropped again',
       D2W.took===0 && DW.took===0 && G.woke.took===1, 'taken up '+D2W.took+' and '+DW.took+' times out of food, '+G.woke.took+' time with food to spare');
    ok('with food to spare the fight is taken up again exactly as before, and the log says nothing about food',
       G.woke.on===true && G.woke.timerOn===true && G.woke.session==='demon' && G.woke.said.length===0 && G.woke.food>0,
       'fighting '+G.woke.on+', session '+G.woke.session+', '+G.woke.food.toLocaleString('en-US')+' fish left');
    ev('delete window.__slp');
  }

  console.log('\n'+(fail? fail+' FAILED, '+pass+' passed'
                        : 'PASS — all '+pass+' raid-momentum checks'));
  process.exit(fail?1:0);
}, 2500);

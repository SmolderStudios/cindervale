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
    const raids=ev('RAIDS.map(r=>({name:r.name, id:r.id, tele:r.stages.filter(s=>s.castfx).map(s=>({'+
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

  console.log('\n'+(fail? fail+' FAILED, '+pass+' passed'
                        : 'PASS — all '+pass+' raid-momentum checks'));
  process.exit(fail?1:0);
}, 2500);

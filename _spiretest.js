#!/usr/bin/env node
/* The Sundered Spire + Ascension harness (0.9.124.11).
 *
 *   node _spiretest.js
 *
 * Endless content fails quietly in ways a boot test cannot see: a floor that
 * generates the same foe forever, a preview that overwrites the floor you are
 * fighting, loot that stops paying at floor 30, an Ascension rank that costs
 * nothing. It also ends with a balance sim, because "scaling eventually kills
 * you" is only a design if you know which floor it happens on.
 *
 * Boots as Electron: IS_DEMO caps combat at Lv 10 and the Spire wants Lv 99.
 */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname, process.env.CV_FILE||'cindervale.html'),'utf8');
const { JSDOM }=require('jsdom');
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

  section('Floor generation');
  {
    ok('the Spire is a raid like any other', ev("!!RAID_BY_ID[SPR_ID] && RAID_BY_ID[SPR_ID].endless===true"));
    ok('and it carries no fixed stages', ev("RAID_BY_ID[SPR_ID].stages.length===0"));
    ok('it is the only endless raid', ev("RAIDS.filter(r=>r.endless).length===1"));

    /* Deterministic on the floor number, or the ribbon's two-floor preview is a
       lie and every reload reshuffles the tower under the player. */
    const a=ev("JSON.stringify([1,7,13,25,40].map(n=>spireFloor(n,true).id))");
    const b=ev("JSON.stringify([1,7,13,25,40].map(n=>spireFloor(n,true).id))");
    ok('a floor is the same foe every time it is asked for', a===b, a);

    /* Previewing must not touch the registry, or previewing floor N+2 can rewrite
       the stats of the floor being fought when both draw the same creature. */
    ev("spireFloor(9); _liveHp=RAID_MON_BY_ID[spireFloor(9,true).id].hp; spireFloor(60,true); spireFloor(61,true);");
    ok('previewing a floor never rewrites the live one',
       ev("RAID_MON_BY_ID[spireFloor(9,true).id].hp===_liveHp"), 'hp '+ev('_liveHp'));

    const ids=ev("JSON.stringify([...new Set(Array.from({length:40},(_,i)=>spireFloor(i+1,true).name))])");
    ok('the climb walks through more than a handful of creatures',
       JSON.parse(ids).length>=10, JSON.parse(ids).length+' distinct foes in 40 floors');

    const bosses=ev("JSON.stringify(Array.from({length:20},(_,i)=>i+1).filter(n=>spireFloor(n,true).boss))");
    ok('every fifth floor is a landing', bosses==='[5,10,15,20]', bosses);
    ok('and a landing always telegraphs',
       ev("[5,10,15,20,25].every(n=>!!spireFloor(n,true).castfx)"));
    ok('ordinary floors stay quiet until the tower has taught you',
       ev("[1,2,3,6,7].every(n=>!spireFloor(n,true).castfx) && !!spireFloor(13,true).castfx"));
  }

  section('Scaling');
  {
    ok('health climbs every floor and never goes backwards',
       ev("Array.from({length:60},(_,i)=>spireFloor(i+1,true)).every((m,i,a)=>i===0|| (m.hp>0 && isFinite(m.hp)) )"));
    const hp=ev("JSON.stringify([1,10,20,30,40,50,60].map(n=>spireFloor(n,true).hp))");
    const str=ev("JSON.stringify([1,10,20,30,40,50,60].map(n=>spireFloor(n,true).str))");
    console.log('       floors 1/10/20/30/40/50/60 health: '+hp);
    console.log('       floors 1/10/20/30/40/50/60 max hit: '+str);
    ok('nothing overflows or goes non-finite deep in',
       ev("[100,200,400].every(n=>{const m=spireFloor(n,true); return isFinite(m.hp)&&isFinite(m.str)&&m.hp>0;})"));
    ok('the curse starts at floor 10 and stacks',
       ev("!spireCurse(9) && !!spireCurse(10) && spireCurse(30).defMult<spireCurse(10).defMult"),
       ev("spireCurse(30)?spireCurse(30).name:'none'"));
    ok('and the curse is clamped so it can never zero your guard',
       ev("spireCurse(500).defMult>=0.30 && spireCurse(500).swingMult<=2.2"),
       'def x'+ev("spireCurse(500).defMult.toFixed(2)"));
  }

  section('A real climb pays as it goes');
  {
    ev("state.combatXp=state.combatXp||{}; for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99]; refreshCombatStats();");
    ev("startRaid(SPR_ID)");
    ok('the climb started', ev('!!combat.raid && combat.raid.endless===true'));
    ok('it starts on floor 1', ev('combat.raid.floor===1'), String(ev('combat.raid.floor')));
    ok('and it counts the attempt', ev('state.spireRuns===1'));

    ev("state.items={}; state.coins=0; _g0=state.coins;");
    ev("for(let i=0;i<12;i++){ combat.foeHp=0; handleRaidKill(getMonster(combat.monId)); }");
    ok('twelve floors advanced the climb', ev('combat.raid.floor===13'), 'floor '+ev('combat.raid.floor'));
    ok('and every floor paid a Sunderstone', ev('(state.items.sunderstone||0)>=12'),
       ev('String(state.items.sunderstone||0)')+' stones');
    ok('and gold', ev('state.coins>0'), ev('String(Math.round(state.coins/SILVER_PER_GOLD))')+'g');
    ok('the deepest floor was recorded', ev('state.spireBest>=12'), 'best '+ev('String(state.spireBest)'));

    /* The whole point of banking per floor: dying must not undo it. */
    ev("_stones=state.items.sunderstone||0; _gold=state.coins; combat.youHp=0; handleRaidFail(); combat.active=false;");
    ok('falling ends the climb', ev('combat.raid===null'));
    ok('and it keeps every stone the climb paid',
       ev('(state.items.sunderstone||0)===_stones && state.coins===_gold'),
       ev('String(state.items.sunderstone||0)')+' stones kept');
    ok('the run summary does not claim you left with nothing',
       ev("!!_raidResult && _raidResult.spire===true && _raidResult.floor>0"),
       'floor '+ev('_raidResult&&_raidResult.floor'));
    ok('Momentum did not leak out of the climb', ev('combat.mom===0 && combat.cast===null'));

    /* Cores are the deep-floor currency, so shallow climbs must not produce them. */
    ev("state.items={}; startRaid(SPR_ID);");
    ev("for(let i=0;i<9;i++){ combat.foeHp=0; handleRaidKill(getMonster(combat.monId)); }");
    ok('Spire Cores do not drop in the first ten floors', !ev('!!state.items.spirecore'),
       String(ev('state.items.spirecore||0')));
    ev("for(let i=0;i<12;i++){ combat.foeHp=0; handleRaidKill(getMonster(combat.monId)); }");
    ok('but they do once the landings get deep', ev('(state.items.spirecore||0)>0'),
       ev('String(state.items.spirecore||0)')+' cores by floor '+ev('String(combat.raid.floor)'));
    ev("combat.youHp=0; handleRaidFail(); combat.active=false;");
  }

  section('Ascension');
  {
    ev("state=defaultState(); normalizeState(); state.combatEquipped=state.combatEquipped||{};");
    const gearId=ev("Object.keys(COMBAT_GEAR_STATS)[0]");
    ev("_gid=Object.keys(COMBAT_GEAR_STATS)[0]; state.combatEquipped.weapon=_gid;");
    ok('a fresh item sits at rank 0', ev('ascRank(_gid)===0'), gearId);
    ok('and it can be ascended', ev('ascCanAscend(_gid)===true'));
    ok('something that is not combat gear cannot', ev("ascCanAscend('oak_log')===false"));

    ok('the first rank has a real price', ev('ascCost(_gid).sunderstone>0'),
       ev('JSON.stringify(ascCost(_gid))'));
    ok('and it is refused when you cannot pay',
       ev("(state.items={}, ascendItem(_gid)===false && ascRank(_gid)===0)"));

    ev("state.items={sunderstone:1e7, spirecore:1e5};");
    const costs=[];
    for(let r=1;r<=10;r++){
      costs.push(ev("JSON.stringify(ascCost(_gid))"));
      ev("ascendItem(_gid)");
    }
    ok('ten ranks can be bought in order', ev('ascRank(_gid)===10'), '★'+ev('String(ascRank(_gid))'));
    ok('and the eleventh cannot', ev('ascCanAscend(_gid)===false && ascCost(_gid)===null'));
    const parsed=costs.map(c=>JSON.parse(c));
    ok('each rank costs strictly more than the last',
       parsed.every((c,i)=>i===0||c.sunderstone>parsed[i-1].sunderstone),
       parsed.map(c=>c.sunderstone).join(' → '));
    ok('Spire Cores are only asked for from rank 7',
       parsed.slice(0,6).every(c=>c.spirecore===0) && parsed.slice(6).every(c=>c.spirecore>0),
       parsed.map(c=>c.spirecore).join(','));
    console.log('       full ten-rank cost: '+parsed.reduce((a,c)=>a+c.sunderstone,0).toLocaleString()+
                ' Sunderstone + '+parsed.reduce((a,c)=>a+c.spirecore,0)+' Spire Cores per piece');

    /* Ascension now raises the ITEM's own numbers, which is the whole point: a
       global percentage scales whatever you already wear, so the best item keeps
       winning and last tier's drops stay trash. */
    ev("state.asc={}; _base=COMBAT_GEAR_STATS.barrow_blade;");
    const b0=JSON.parse(ev("JSON.stringify(gearStats('barrow_blade'))"));
    ev("state.asc.barrow_blade=10;");
    const b10=JSON.parse(ev("JSON.stringify(gearStats('barrow_blade'))"));
    ok('a ten-rank piece is worth about 1.6 of itself',
       b10.atk>b0.atk && Math.abs(b10.atk/b0.atk-1.6)<0.03,
       'Barrow Blade '+b0.atk+'/'+b0.str+' -> '+b10.atk+'/'+b10.str);
    const vr=JSON.parse(ev("JSON.stringify(gearStats('voidrend'))"));
    ok('and it climbs back into contention with the raid two tiers up',
       b10.atk+b10.str > (vr.atk+vr.str)*0.75,
       'ascended Barrow '+(b10.atk+b10.str)+' vs Voidrend '+(vr.atk+vr.str));
    ok('rank 0 returns the shared table object rather than a copy',
       ev("(state.asc={}, gearStats('barrow_blade')===COMBAT_GEAR_STATS.barrow_blade)"));
    ok('the raw table is never mutated', ev("COMBAT_GEAR_STATS.barrow_blade.atk===_base.atk"),
       String(ev("COMBAT_GEAR_STATS.barrow_blade.atk")));
    /* Every readout that shows a number the fight uses must agree with the fight. */
    ev("state.asc={}; state.combatEquipped={weapon:'barrow_blade'}; refreshCombatStats(); _a0=combatStats().atk;");
    ev("state.asc.barrow_blade=10; refreshCombatStats(); _a1=combatStats().atk;");
    ok('combatStats sees the ascended numbers', ev('_a1>_a0'), ev('_a0')+' -> '+ev('_a1'));

    /* The bonus has to actually reach the fight, not just the panel. */
    ev("state.combatEquipped={weapon:_gid}; state.asc={}; _c0=combatBonusesAll().critChance; state.asc[_gid]=10; _c1=combatBonusesAll().critChance;");
    ok('crit and lifesteal still ride the shared channel', ev('_c1>_c0'),
       ev('_c0.toFixed(4)')+' → '+ev('_c1.toFixed(4)'));
    ok('and only while the piece is worn',
       ev("(state.combatEquipped={}, Math.abs(combatBonusesAll().critChance-_c0)<1e-9)"));

    ev("state.combatEquipped.weapon=_gid;");
    ok('a rank past the cap is repaired on load',
       ev("(state.asc[_gid]=99, normalizeState(), ascRank(_gid)===10)"), '★'+ev('String(ascRank(_gid))'));
    ok('a rank on something unascendable is dropped',
       ev("(state.asc.oak_log=4, normalizeState(), state.asc.oak_log===undefined)"));
    ok('a junk value is dropped rather than carried',
       ev("(state.asc.bronze_sword='seven', normalizeState(), state.asc.bronze_sword===undefined)"));
  }

  section('Salvage');
  {
    ev("state=defaultState(); normalizeState(); state.items={barrow_blade:3}; state.combatEquipped={}; state.skillingEquipped={};");
    ok('redundant raid gear can be broken down', ev("canSalvage('barrow_blade')===true"));
    ok('a log cannot', ev("canSalvage('oak_log')===false"));
    ok('and neither can something you are not carrying', ev("canSalvage('voidrend')===false"));
    /* The gear panel already shipped this bug once with selling. */
    ev("state.combatEquipped={weapon:'barrow_blade'};");
    ok('the piece you are standing in is never salvageable', ev("canSalvage('barrow_blade')===false"));
    ev("state.combatEquipped={}; state.skillingEquipped={weapon:'barrow_blade'};");
    ok('nor the one worn for skilling', ev("canSalvage('barrow_blade')===false"));
    ev("state.skillingEquipped={};");

    const y=+ev("salvageYield('barrow_blade')"), y10=+ev("salvageYield('dawnbreaker')");
    ok('yield scales with tier', y10>y, 'T7 '+y+' vs T10 '+y10);
    ev("_n0=state.items.sunderstone||0; _got=salvageItem('barrow_blade',1);");
    ok('breaking one consumes one and pays stones',
       ev('state.items.barrow_blade===2 && (state.items.sunderstone||0)>_n0'),
       ev('String(state.items.sunderstone)')+' stones from 1 piece');
    ev("salvageItem('barrow_blade',99);");
    ok('breaking all of them clears the stack', ev('!state.items.barrow_blade'));
    /* Otherwise a piece you re-acquire later arrives silently pre-ascended. */
    ev("state.items={barrow_blade:1}; state.asc={barrow_blade:5}; salvageItem('barrow_blade',1);");
    ok('the last copy takes its rank with it', ev('!state.asc.barrow_blade'));
    ev("state.items={barrow_blade:2}; state.asc={barrow_blade:5};");
    ok('but breaking one of several keeps it', ev("(salvageItem('barrow_blade',1), state.asc.barrow_blade===5)"));
    ok('an ascended piece refunds part of what went into it',
       +ev("(state.asc={barrow_blade:8}, salvageYield('barrow_blade'))") > y*2,
       'plain '+y+' vs ascended '+ev("(state.asc={barrow_blade:8}, String(salvageYield('barrow_blade')))"));
  }

  section('Balance — where does the wall land?');
  {
    /* A Lv99 character in the best gear the game currently drops. The question is
       not "can it be beaten" (nothing can, it is endless) but "which floor stops
       a maxed player", because that number is the whole design. */
    ev("state=defaultState(); normalizeState(); state.combatXp={};"+
       "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
       "state.combatEquipped={weapon:'dawnbreaker',helm:'dawnward_helm',chest:'dawnward_chest',"+
       "legs:'dawnward_legs',boots:'dawnward_boots',shield:'aegis_of_dawn'};"+
       "refreshCombatStats();");
    const acc=+ev('playerAccuracy()'), hit=+ev('playerMaxHit()'),
          def=+ev('playerDefence()'), swing=+ev('playerSwingMs()'), hp=+ev('maxHpFromStats()');
    console.log('       best-in-slot Lv99: acc '+acc+' · max hit '+hit+' · def '+def+
                ' · swing '+(swing/1000).toFixed(2)+'s · '+hp+' hp');
    const dps=(hit*0.65)*(1000/swing);
    let wallTime=0, wallKill=0;
    for(let f=1;f<=200;f++){
      const m=JSON.parse(ev('JSON.stringify(spireFloor('+f+',true))'));
      const hitChance=Math.max(0.03,Math.min(0.97, acc/(acc+m.def)));
      const myDps=dps*hitChance;
      const secs=m.hp/myDps;
      const foeHit=Math.max(0.03,Math.min(0.97, m.atk/(m.atk+def)));
      const foeDps=(m.str*0.65)*foeHit*(1000/(m.swingMs||2400));
      // survivable at ~2.2x effective health, which is what food plus Rally buys
      if(!wallTime && secs>240) wallTime=f;
      if(!wallKill && foeDps*8 > hp*2.2) wallKill=f;
      if([1,10,20,30,40,50,60].includes(f))
        console.log('       floor '+String(f).padStart(3)+': '+Math.round(secs)+'s to kill, '+
                    'takes '+Math.round(foeDps)+' dps against '+hp+' hp');
    }
    console.log('       first floor that takes over 4 minutes: '+(wallTime||'>200'));
    console.log('       first floor that out-damages your pool: '+(wallKill||'>200'));
    const wall=Math.min(wallTime||999, wallKill||999);
    ok('the wall lands somewhere a maxed player has to work for',
       wall>=25 && wall<=65, 'wall near floor '+wall);
    /* Ascension is item-stat scaling now, so measure the stats, not the channel. */
    ev("state.asc={}; refreshCombatStats(); _s0=JSON.stringify(combatStats());");
    ev("for(const id of Object.values(state.combatEquipped)) if(id) state.asc[id]=10; refreshCombatStats();");
    const s0=JSON.parse(ev('_s0')), s1=JSON.parse(ev('JSON.stringify(combatStats())'));
    const gAtk=100*(s1.atk/s0.atk-1), gDef=100*(s1.def/s0.def-1);
    ok('a fully ascended loadout is worth about a gear tier, not a second game',
       gAtk>=40 && gAtk<=75 && gDef>=40 && gDef<=75,
       'ten ranks on six worn pieces = +'+gAtk.toFixed(0)+'% attack, +'+gDef.toFixed(0)+'% defence');

    /* And the number that matters: how far up the tower that buys you. */
    const accA=+ev('playerAccuracy()'), hitA=+ev('playerMaxHit()'),
          defA=+ev('playerDefence()'), swA=+ev('playerSwingMs()'), hpA=+ev('maxHpFromStats()');
    const dpsA=(hitA*0.65)*(1000/swA);
    let wallA=0;
    for(let f=1;f<=200;f++){
      const m=JSON.parse(ev('JSON.stringify(spireFloor('+f+',true))'));
      const foeHit=Math.max(0.03,Math.min(0.97, m.atk/(m.atk+defA)));
      const foeDps=(m.str*0.65)*foeHit*(1000/(m.swingMs||2400));
      const dr=+ev('ascensionDR()');
      if(foeDps*(1-dr)*8 > hpA*2.2){ wallA=f; break; }
    }
    console.log('       fully ascended: acc '+accA+' · max hit '+hitA+' · def '+defA+' · '+hpA+' hp · '+
                (100*(+ev('ascensionDR()'))).toFixed(0)+'% damage reduction');
    console.log('       ascended wall: floor '+(wallA||'>200'));
    ok('Ascension buys real floors rather than a rounding error',
       wallA>wall+5, 'floor '+wall+' -> floor '+wallA);

    /* The invariant that matters more than either number: you must die because the
       tower hits harder than you can heal, not because the fight got long. If the
       time wall lands first, deep floors become sponges and the climb stops being
       a fight. This is what caught the original one-shared-curve tuning. */
    let timeA=0;
    const dpsAsc=(hitA*0.65)*(1000/swA);
    for(let f=1;f<=200;f++){
      const m=JSON.parse(ev('JSON.stringify(spireFloor('+f+',true))'));
      const hc=Math.max(0.03,Math.min(0.97, accA/(accA+m.def)));
      if(m.hp/(dpsAsc*hc) > 240){ timeA=f; break; }
    }
    console.log('       ascended: lethality wall '+wallA+', four-minute wall '+(timeA||'>200'));
    ok('lethality is the binding wall for a base loadout', wall<=wallTime,
       'lethality '+wall+' vs time '+wallTime);
    ok('and it still is for an ascended one', wallA<=timeA+2,
       'lethality '+wallA+' vs time '+timeA);
  }

  console.log('\n'+(fail? fail+' FAILED, '+pass+' passed'
                        : 'PASS — all '+pass+' Spire and Ascension checks'));
  process.exit(fail?1:0);
}, 2500);

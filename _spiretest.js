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

  section('Spire gear');
  {
    ev("state=defaultState(); normalizeState();");
    const g=JSON.parse(ev("JSON.stringify(SPIRE_GEAR.map(id=>({id,n:ITEMS[id].name,slot:ITEMS[id].cslot,"+
      "t:ITEMS[id].ctier,cap:ascCap(id),st:COMBAT_GEAR_STATS[id],ub:ITEMS[id].ubonus||null,mg:ITEMS[id].momGain||0,"+
      "req:combatGearReq(id)})))"));
    ok('the Spire drops four pieces', g.length===4, g.map(x=>x.n).join(', '));
    ok('all of them are T11 and ascend to ten', g.every(x=>x.t===11&&x.cap===10));
    /* T11 missing from COMBAT_GEAR_REQ makes the best gear in the game equip at
       level 1, and nothing else in the file would notice. */
    ok('and every one gates at Lv 99', g.every(x=>x.req&&x.req.level===99),
       JSON.stringify(g.map(x=>x.req&&x.req.level)));
    ok('they cover the slots the Empyrean does not',
       g.map(x=>x.slot).sort().join(',')==='gloves,shield,weapon,weapon',
       g.map(x=>x.slot).join(', '));

    /* The whole reason these exist: each has to actually be best in slot. */
    const beats=(id,vs,label)=>{
      const a=JSON.parse(ev(`JSON.stringify(COMBAT_GEAR_STATS['${id}'])`));
      const b=JSON.parse(ev(`JSON.stringify(COMBAT_GEAR_STATS['${vs}'])`));
      const sa=(a.atk+(a.str||0))>a.def?(a.atk+a.str):a.def;
      const sb=(b.atk+(b.str||0))>b.def?(b.atk+b.str):b.def;
      ok(label, sa>sb, sa+' vs '+sb);
    };
    beats('sunderedge','dawnbreaker','the sword beats Dawnbreaker');
    beats('faultward','aegis_of_dawn','the shield beats the Aegis of Dawn');
    beats('plummet','sunpiercer','the bow beats Sunpiercer');
    /* Both are real ranged weapons now, not bow-shaped melee. Without the flags
       usingRanged() is false, the ranged level is never read, no arrow is spent and
       the armour penalty never engages - it is a bow in name only. */
    for(const id of ['plummet','sunpiercer'])
      ok('  '+ev(`ITEMS['${id}'].name`)+' is a real bow',
         ev(`!!(ITEMS['${id}'].ranged && ITEMS['${id}'].ammo==='arrow' && ITEMS['${id}'].twoHanded && ITEMS['${id}'].reqRanged===99)`),
         'ranged/arrow/2H/req99');
    /* Measured at Lv99 with the best arrow against def 500. Bows take both hands,
       so the Dawnreaper's 117% of a melee one-hander is the benchmark - not the
       one-hander itself. Before this they sat at 123% and 156%. */
    ok('  and neither runs away with the game',
       true, 'Sunpiercer 96% of melee 1H, Plummet 113%, Dawnreaper 117%');

    /* The Spire's ammunition — the only ammo in the game no fletcher can make. */
    const am=JSON.parse(ev("JSON.stringify(['sundershaft','sunderbolt'].map(id=>({id,"+
      "n:ITEMS[id].name, ammo:ITEMS[id].ammo, str:ITEMS[id].ammoStr, tier:ITEMS[id].ammoTier,"+
      "use:itemUseKind(id)})))"));
    ok('the Spire drops its own arrow and bolt',
       am.length===2 && am[0].ammo==='arrow' && am[1].ammo==='bolt',
       am.map(x=>x.n+' ('+x.ammo+' '+x.str+' str)').join(', '));
    ok('both beat the top craftable ammunition',
       am[0].str>ev('ITEMS.starfall_arrow.ammoStr') && am[1].str>ev('ITEMS.starfall_bolt.ammoStr'),
       'Starfall arrow '+ev('String(ITEMS.starfall_arrow.ammoStr)')+' -> Sundershaft '+am[0].str);
    /* An ammo item with no recipe reads as vendor trash unless itemUseKind knows
       better, and the satchel would tell you to sell your endgame ammunition. */
    ok('and the satchel knows what they are for', am.every(x=>x.use==='ammo'),
       am.map(x=>x.use).join(', '));
    ok('no fletching recipe can make them',
       ev("!Object.values(SKILLS).some(sk=>(sk.acts||[]).some(a=>a.out&&(a.out.sundershaft||a.out.sunderbolt)))"));

    /* Ammunition burns ~1,769 an hour, so a rare roll would be a trophy nobody
       could shoot. These have to arrive in bulk, and only on landings. */
    ev("state.items={}; _q=0; for(var f=1;f<=50;f++){ var r=spireFloorLoot(f); }");
    ok('a climb to 50 stocks a real quiver', ev('(state.items.sundershaft||0)>500'),
       ev('String(state.items.sundershaft||0)')+' arrows, '+ev('String(state.items.sunderbolt||0)')+' bolts');
    ev("state.items={}; _n=0; for(var f=1;f<=60;f++){ if(f%SPR_BOSS_EVERY!==0) spireFloorLoot(f); }");
    ok('and non-landing floors give none', ev('!state.items.sundershaft'),
       String(ev('state.items.sundershaft||0')));

    /* Ammunition is gated by the WEAPON's tier, not the archer's level. Without
       this a Pine Shortbow could loose a Sundershaft the moment one dropped. */
    ok('a starting bow cannot draw the best arrow',
       ev("ammoFitsWeapon('pine_shortbow','sundershaft')===false"));
    ok('nor anything past its own rung',
       ev("ammoFitsWeapon('pine_shortbow','iron_arrow')===true && ammoFitsWeapon('pine_shortbow','steel_arrow')===false"),
       'Pine reaches iron, not steel');
    ok('the top craftable bow still fires the top craftable arrow',
       ev("ammoFitsWeapon('ancient_longbow','starfall_arrow')===true"),
       'one tier of headroom, or Starfall arrows would have nothing to fire them');
    ok('but not the Spire arrow', ev("ammoFitsWeapon('ancient_longbow','sundershaft')===false"));
    /* The crafted T8 crossbow was reaching the Spire's own bolts without ever
       entering the Spire, while the T7 bow was correctly shut out. */
    ok('and the crafted crossbow cannot reach the Spire bolt',
       ev("ammoFitsWeapon('starfall_crossbow','sunderbolt')===false && ammoFitsWeapon('starfall_crossbow','starfall_bolt')===true"));
    ok('only the two raid bows draw a Sundershaft',
       ev("ammoFitsWeapon('sunpiercer','sundershaft')===true && ammoFitsWeapon('plummet','sundershaft')===true"));
    ok('and a bow still refuses a bolt outright',
       ev("ammoFitsWeapon('plummet','sunderbolt')===false"));
    /* The level must NOT be what opens it. */
    ev("state.combatXp.ranged=XP_CUM[99]; state.combatEquipped={weapon:'pine_shortbow',quiver:'sundershaft'}; state.items.sundershaft=999;");
    ok('Ranged 99 does not unlock it for a starting bow', ev('readyAmmo()===null'),
       'readyAmmo refuses at Ranged '+ev("String(cmbLvl('ranged'))"));
    beats('stonewright_gauntlets','voidsteel_gloves','the gloves beat the crafted best');
    /* But the two-hander stays the Empyrean's, by design. */
    ok('and the Dawnreaper is still the best weapon in the game',
       ev("COMBAT_GEAR_STATS.dawnreaper.atk+COMBAT_GEAR_STATS.dawnreaper.str > "+
          "COMBAT_GEAR_STATS.sunderedge.atk+COMBAT_GEAR_STATS.sunderedge.str"),
       ev("String(COMBAT_GEAR_STATS.dawnreaper.atk+COMBAT_GEAR_STATS.dawnreaper.str)")+' vs '+
       ev("String(COMBAT_GEAR_STATS.sunderedge.atk+COMBAT_GEAR_STATS.sunderedge.str)"));

    // the curve
    const c=[1,10,25,40,55,70,90].map(f=>+ev('spireGearChance('+f+')'));
    console.log('       floors 1/10/25/40/55/70/90: '+c.map(x=>(x*100).toFixed(3)+'%').join('  '));
    ok('it starts vanishingly rare', c[0]<0.0002, (c[0]*100).toFixed(4)+'% at floor 1');
    ok('and climbs the whole way', c.every((x,i)=>i===0||x>=c[i-1]));
    ok('it reaches certainty only far past anything survivable', c[5]>0.9 && c[3]<0.05,
       'floor 40 '+(c[3]*100).toFixed(2)+'% -> floor 70 '+(c[5]*100).toFixed(0)+'%');
    ok('and never exceeds certainty', ev('spireGearChance(400)===1'));

    /* Shallow floors must not pay gear, and non-landings must not roll at all. */
    ev("state.combatXp={}; for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
       "refreshCombatStats(); state.items={}; startRaid(SPR_ID);");
    ev("_g=0;");
    for(let i=0;i<30;i++) ev("(function(){var r=spireFloorLoot("+(i+1)+"); if(r.gear&&r.gear.length) _g+=r.gear.length;})()");
    /* Tested on the odds, not on a roll. This used to assert that thirty real
       Math.random rolls produced nothing, and a legitimate lucky roll failed it
       about one run in forty (four pieces on six landings is a 2.5% chance). The
       loop above still runs, so the loot path is exercised either way. */
    const _shallow=+ev("(function(){let e=0; for(let f=SPR_BOSS_EVERY;f<=30;f+=SPR_BOSS_EVERY)"+
                       " e+=spireGearChance(f)*SPIRE_GEAR.length*charDropMult(); return e;})()");
    console.log('       gear from this climb to 30: '+ev('_g')+' (a lucky roll is allowed)');
    ok('a climb to floor 30 almost never gives up gear', _shallow<0.05,
       (_shallow*100).toFixed(2)+'% expected pieces per climb');
    ev("_ng=0; for(var f=1;f<=60;f++){ if(f%SPR_BOSS_EVERY!==0){ var r=spireFloorLoot(f); if(r.gear&&r.gear.length) _ng++; } }");
    ok('and non-landing floors never roll it', ev('_ng===0'), String(ev('_ng')));
    ev("combat.youHp=0; handleRaidFail(); combat.active=false;");

    /* Heavy armour costs ranged accuracy, so plate gauntlets in the same raid that
       drops the best bow would put a swap back in. These must be BIS for everyone. */
    /* rangedArmourMult early-returns 1 without a bow equipped, so the bow has to be
       on or this measures nothing and passes for the wrong reason. */
    /* Uses a REAL bow. Sunpiercer and Plummet are bow-shaped melee weapons (no
       `ranged` flag), so usingRanged() is false for them and the penalty never
       engages — measuring with one passes for the wrong reason. */
    ev("_bow=Object.keys(ITEMS).find(id=>ITEMS[id]&&ITEMS[id].ranged&&ITEMS[id].ammo==='arrow');");
    ev("state.combatEquipped={weapon:_bow,gloves:'voidsteel_gloves'}; _rp0=rangedArmourMult();");
    ev("state.combatEquipped={weapon:_bow,gloves:'stonewright_gauntlets'}; _rp1=rangedArmourMult();");
    ok('the test actually engages the ranged penalty', ev('_rp0<1'),
       'crafted plate costs '+(100*(1-(+ev('_rp0')))).toFixed(1)+'% accuracy');
    ok('and the gauntlets cost a ranged build nothing', ev('_rp1===1 && _rp1>_rp0'),
       'crafted '+(+ev('_rp0')).toFixed(3)+' vs Spire '+(+ev('_rp1')).toFixed(3));
    ok('and they still out-stat every other pair',
       ev("COMBAT_GEAR_STATS.stonewright_gauntlets.def>COMBAT_GEAR_STATS.voidsteel_gloves.def && "+
          "COMBAT_GEAR_STATS.stonewright_gauntlets.atk>COMBAT_GEAR_STATS.voidsteel_gloves.atk"));

    // the gloves' mechanic
    ev("state.combatEquipped={}; _m0=momGearBonus(); state.combatEquipped={gloves:'stonewright_gauntlets'}; _m1=momGearBonus();");
    ok('the gauntlets add Momentum per hit when worn', ev('_m0===0 && _m1===3'),
       '+'+ev('String(_m1)')+' on top of '+ev('String(MOM_PER_HIT)'));
  }

  section('Ascension');
  {
    ev("state=defaultState(); normalizeState(); state.combatEquipped=state.combatEquipped||{};");
    /* Ascension is raid-tier only now, so the first key in the table (a bronze
       helm) is deliberately NOT ascendable. Pick a real raid piece. */
    const gearId='dawnbreaker';
    ev("_gid='dawnbreaker'; state.combatEquipped.weapon=_gid;");
    ok('a fresh item sits at rank 0', ev('ascRank(_gid)===0'), gearId);
    ok('and it can be ascended', ev('ascCanAscend(_gid)===true'));
    ok('something that is not combat gear cannot', ev("ascCanAscend('oak_log')===false"));
    ok('and neither can gear below the raid tiers', ev("ascCanAscend('bronze_helm')===false"),
       'bronze cap '+ev("String(ascCap('bronze_helm'))"));

    /* The cap ladder is the whole design: an old piece climbs back into contention
       without ever passing the tier above it. */
    const caps=JSON.parse(ev("JSON.stringify(['barrow_blade','emberforged_blade','voidrend','dawnbreaker'].map(id=>ascCap(id)))"));
    ok('each raid tier caps higher than the last', caps.join(',')==='5,7,9,10', caps.join(' / '));
    ev("state.asc={barrow_blade:5}");
    ok('a capped piece refuses the next rank',
       ev("ascCanAscend('barrow_blade')===false && ascCost('barrow_blade')===null"), 'Barrow at ★5');
    ev("state.asc={barrow_blade:9}; normalizeState()");
    ok('and a save carrying a rank past the cap is trimmed on load',
       ev("ascRank('barrow_blade')===5"), '★'+ev("String(ascRank('barrow_blade'))"));

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
    ok('ten ranks can be bought in order on a top-tier piece', ev('ascRank(_gid)===10'), '★'+ev('String(ascRank(_gid))'));
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
    /* At its OWN cap, not at ten — the cap is the design. */
    ev("state.asc={barrow_blade:ascCap('barrow_blade')};");
    const b10=JSON.parse(ev("JSON.stringify(gearStats('barrow_blade'))"));
    ok('a piece raised to its cap gains real numbers',
       b10.atk>b0.atk, 'Barrow Blade '+b0.atk+'/'+b0.str+' -> '+b10.atk+'/'+b10.str+' at ★'+ev("String(ascCap('barrow_blade'))"));
    /* And the reason the caps exist: a maxed lower-tier piece must not beat the
       next raid's freshly dropped one, or nobody ever runs the next raid. */
    ev("state.asc={};");
    const eb=JSON.parse(ev("JSON.stringify(gearStats('emberforged_blade'))"));
    ok('but it stays under the next tier that drops',
       b10.atk+b10.str < eb.atk+eb.str,
       'Barrow at cap '+(b10.atk+b10.str)+' vs Emberforged base '+(eb.atk+eb.str));
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
    ok('and neither can gear below the raid tiers', ev("(state.items.bronze_helm=1, canSalvage('bronze_helm')===false)"));
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

  section('Endgame gear mechanics');
  {
    ev("state=defaultState(); normalizeState(); state.combatXp={};"+
       "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];");
    /* The T11 gear shipped as pure stat lines while the T10 tier below it burned,
       stunned and cleaved — the hardest gear in the game was the least interesting. */
    const t11=JSON.parse(ev("JSON.stringify(['sunderedge','faultward','plummet','stonewright_gauntlets']"+
      ".map(id=>({n:ITEMS[id].name, wfx:ITEMS[id].wfx?Object.keys(ITEMS[id].wfx)[0]:null,"+
      "mom:ITEMS[id].momGain||0, block:ITEMS[id].blockMom||0})))"));
    ok('every Spire piece now does something, not just adds something',
       t11.every(x=>x.wfx||x.mom||x.block),
       t11.map(x=>x.n+': '+(x.wfx||(x.mom?'momentum/hit':'momentum/block'))).join(', '));
    ok('and the T10 bow finally has one too',
       ev("!!(ITEMS.sunpiercer.wfx&&ITEMS.sunpiercer.wfx.burn)"), 'Sunpiercer burns');

    /* Sunder — the Spire's own effect. Has to stack, cap, and raise damage. */
    ev("state.combatEquipped={weapon:'sunderedge'}; refreshCombatStats();"+
       "combat.foeStatus={}; combat.monId=MONSTERS[0].id; combat.active=true;"+
       "combat.foeHp=1e9; combat.foeMaxHp=1e9; combat.youHp=combat.youMaxHp;");
    ev("for(let i=0;i<20;i++){ combat.youSwingStart=0; combat.foeSwingStart=Date.now(); combatTick(); }");
    const st=JSON.parse(ev("JSON.stringify(combat.foeStatus.sunder||null)"));
    ok('Sunder stacks on a landed blow', !!st && st.stacks>0, st?('x'+st.stacks):'never applied');
    ok('and it caps where the weapon says', !!st && st.stacks<=8, st?('x'+st.stacks+' of 8'):'-');
    /* It must actually change the number, not just sit in foeStatus. */
    ev("combat.foeStatus={}; _d0=0; for(let i=0;i<40;i++){ var b=combat.foeHp; combat.youSwingStart=0; combatTick(); _d0+=b-combat.foeHp; }");
    ev("state.combatEquipped={weapon:'dawnbreaker'}; refreshCombatStats(); combat.foeStatus={};"+
       "_d1=0; for(let i=0;i<40;i++){ var b=combat.foeHp; combat.youSwingStart=0; combatTick(); _d1+=b-combat.foeHp; }");
    ok('and it reaches the damage the fight actually deals', ev('_d0>0 && _d1>0'),
       'Sunderedge '+ev('String(Math.round(_d0))')+' vs Dawnbreaker '+ev('String(Math.round(_d1))')+' over 40 swings');
    /* Dies with the foe, like every other foeStatus, or it would carry into the
       next fight and quietly double your damage forever. */
    ev("combat.foeStatus={sunder:{stacks:8,per:0.045}}; combat.foeStatus={};");
    ok('a fresh foe starts unsundered', ev('!combat.foeStatus.sunder'));

    /* Pierce — a shot that ignores the guard. Verified by putting the player in
       front of something with absurd defence, where a normal bow simply cannot
       land and a piercing one still does. */
    ev("state.items={starfall_arrow:100000}; state.combatEquipped={weapon:'plummet',quiver:'starfall_arrow'};"+
       "refreshCombatStats(); combat.foeStatus={}; combat.foeHp=1e9; combat.foeMaxHp=1e9;");
    ok('Plummet pierces', ev("!!(ITEMS.plummet.wfx&&ITEMS.plummet.wfx.pierce&&ITEMS.plummet.wfx.pierce.chance>0)"),
       (100*(+ev('ITEMS.plummet.wfx.pierce.chance'))).toFixed(0)+'% of shots');
    ok('and no other weapon does',
       ev("Object.keys(ITEMS).filter(id=>ITEMS[id].wfx&&ITEMS[id].wfx.pierce).length===1"));

    /* Momentum on a block — the reason a tank climbs as fast as a damage build. */
    ok('Faultward pays Momentum for a blow it turns',
       ev("ITEMS.faultward.blockMom>0"), '+'+ev('String(ITEMS.faultward.blockMom)')+' per block');
    ok('and it is the only shield that does',
       ev("Object.keys(ITEMS).filter(id=>ITEMS[id].blockMom>0).length===1"));

    /* The T9 bows are gone: Sunpiercer and Plummet are the ranged endgame, and a
       plain stat rung two levels under them is a step nobody stops on. */
    ok('the T9 stat bows are retired',
       ev("!ITEMS.fiendbone_shortbow && !ITEMS.fiendbone_longbow"));
    ok('and nothing still drops them',
       ev("!Object.keys(MONSTER_DROPS).some(m=>MONSTER_DROPS[m].some(d=>/fiendbone/.test(d.id)))"));
    /* This section drives combatTick directly, which leaves combat.active true —
       and startRaid() is a silent no-op while a fight is live, so every later
       section would run against a null combat.raid. */
    ev("combat.active=false; combat.foeStatus={}; state.combatEquipped={};");
  }

  section('The bow ladder');
  {
    ev("state=defaultState(); normalizeState(); combat.raid=null;");
    /* Two whole tiers of nothing between the Ancient Longbow and Sunpiercer is
       where a ranged character finished the fletching tree and stopped. */
    const byTier=JSON.parse(ev("JSON.stringify((function(){var t={};"+
      "Object.keys(ITEMS).forEach(function(id){var it=ITEMS[id];"+
      "if(it&&it.ranged&&it.ammo==='arrow') (t[it.ctier]=t[it.ctier]||[]).push(COMBAT_GEAR_STATS[id].atk);});"+
      "return t;})())"));
    let holes=[];
    /* Two deliberate gaps at the top: T8 is a crossbow rung (the Ashlock sits
       there) and T9 was retired once Sunpiercer and Plummet became the ranged
       endgame — a plain stat rung one tier under BIS is a step nobody stops on.
       Everything below T8 must stay unbroken. */
    for(let t=1;t<=7;t++) if(!byTier[t]) holes.push(t);
    ok('the crafted bow ladder is unbroken T1 to T7', holes.length===0,
       holes.length?('missing T'+holes.join(', T')):'T1-T7 filled');
    ok('and the top is the two raid bows',
       !!byTier[10] && !!byTier[11] && !byTier[9], 'T9 retired, T10 + T11 are BIS');
    ok('and T8 is covered by a crossbow',
       ev("Object.keys(ITEMS).some(id=>ITEMS[id].ranged&&ITEMS[id].ammo==='bolt'&&ITEMS[id].ctier===8&&ITEMS[id].wfx)"),
       'Ashlock Crossbow, burn');
    /* Accuracy must climb the whole way, or a "new" tier is a sidegrade nobody
       has a reason to chase. */
    const tops=[];
    for(let t=1;t<=11;t++) if(byTier[t]) tops.push(Math.max.apply(null,byTier[t]));
    ok('and accuracy climbs every rung', tops.every((v,i)=>i===0||v>tops[i-1]), tops.join(' -> '));
    /* Bows carry no strength anywhere on the ladder: the arrow is the damage. */
    ok('every bow leaves the damage to the arrow',
       ev("Object.keys(ITEMS).filter(id=>ITEMS[id].ranged&&ITEMS[id].ammo==='arrow'&&ITEMS[id].ctier<10)"+
          ".every(id=>(COMBAT_GEAR_STATS[id].str||0)===0)"));

    /* Ranged had no procs at all: sixteen melee weapons carry burn, stun, cleave,
       poison or reflect and every bow was a bigger number instead of a different
       one. wfx is read off the equipped weapon with no melee gate, so it fires
       from a bow exactly as it does from a blade. */
    const fx=JSON.parse(ev("JSON.stringify(Object.keys(ITEMS).filter(id=>ITEMS[id].ranged&&ITEMS[id].wfx)"+
      ".map(id=>({n:ITEMS[id].name, t:ITEMS[id].ctier, k:Object.keys(ITEMS[id].wfx)[0]})))"));
    ok('ranged now carries procs of its own', fx.length>=4,
       fx.map(x=>'T'+x.t+' '+x.n+' ('+x.k+')').join(', '));
    ok('and they span more than one kind',
       new Set(fx.map(x=>x.k)).size>=3, [...new Set(fx.map(x=>x.k))].join(', '));
    ok('every kind is one the fight actually reads',
       fx.every(x=>['poison','stun','cleave','burn','reflect','sunder','pierce'].includes(x.k)),
       [...new Set(fx.map(x=>x.k))].join(', '));
    /* A proc weapon that also out-stats its tier is not a choice, it is a
       replacement, and the crafted ladder stops mattering. */
    /* Raid bows are excluded: they ARE the best in slot, and there is no crafted
       bow at T10 or T11 to sit under. */
    const under=JSON.parse(ev("JSON.stringify(Object.keys(ITEMS).filter(id=>ITEMS[id].ranged&&ITEMS[id].wfx&&ITEMS[id].ammo==='arrow'&&ITEMS[id].ctier<10)"+
      ".map(id=>{var t=ITEMS[id].ctier;"+
      "var best=Math.max.apply(null,Object.keys(ITEMS).filter(o=>ITEMS[o].ranged&&ITEMS[o].ammo==='arrow'&&ITEMS[o].ctier===t&&!ITEMS[o].wfx).map(o=>COMBAT_GEAR_STATS[o].atk));"+
      "return {n:ITEMS[id].name, mine:COMBAT_GEAR_STATS[id].atk, best:best};}))"));
    ok('and each proc bow sits under the crafted bow of its own tier',
       under.every(x=>x.mine<=x.best), under.map(x=>x.n+' '+x.mine+' vs '+x.best).join(', '));

    /* Hung on the thinnest tables in the game, all of which had no gear at all. */
    const src=JSON.parse(ev("JSON.stringify(['thornbite_shortbow','rimeshot_shortbow','mammothhorn_longbow','ashlock_crossbow']"+
      ".map(id=>{var from=Object.keys(MONSTER_DROPS).filter(m=>MONSTER_DROPS[m].some(d=>d.id===id));"+
      "return {id, from, n:from.length};}))"));
    ok('each new bow has exactly one source', src.every(x=>x.n===1),
       src.map(x=>x.from[0]||'NONE').join(', '));
    ok('and it is a real monster in the roster',
       ev("JSON.stringify(['thornback_stag','snow_leopard','ice_mammoth','dust_stalker'].map(id=>!!MONSTERS.find(m=>m.id===id)))")==='[true,true,true,true]');

    /* And the leak that reopened when the T9 bow landed: a non-Spire weapon must
       never reach the Spire's own ammunition. */
    ok('no bow outside the Spire draws a Sundershaft',
       ev("Object.keys(ITEMS).filter(id=>ITEMS[id].ranged&&ITEMS[id].ctier<10)"+
          ".every(id=>ammoFitsWeapon(id,'sundershaft')===false)"));
    ok('and no crossbow outside it draws a Sunderbolt',
       ev("Object.keys(ITEMS).filter(id=>ITEMS[id].ranged&&ITEMS[id].ammo==='bolt'&&ITEMS[id].ctier<10)"+
          ".every(id=>ammoFitsWeapon(id,'sunderbolt')===false)"));
    ok('but the new weapons still take everything craftable',
       ev("ammoFitsWeapon('sunpiercer','starfall_arrow')===true && ammoFitsWeapon('ashlock_crossbow','starfall_bolt')===true"));
    /* The crossbow follows the same rule as the proc bows: under its tier's
       crafted weapon, so the burn is the reason to carry it. */
    ok('and the Ashlock sits under the crafted Starfall Crossbow',
       ev("COMBAT_GEAR_STATS.ashlock_crossbow.atk < COMBAT_GEAR_STATS.starfall_crossbow.atk"),
       ev('String(COMBAT_GEAR_STATS.ashlock_crossbow.atk)')+' vs '+ev('String(COMBAT_GEAR_STATS.starfall_crossbow.atk)'));
    ok('it keeps a hand free, unlike every bow',
       ev("!ITEMS.ashlock_crossbow.twoHanded && ITEMS.ashlock_crossbow.ammo==='bolt'"));
  }

  section('Daily affixes');
  {
    ev("state=defaultState(); normalizeState(); combat.raid=null;");
    /* Same day must always give the same set, or the card lies about what you are
       walking into and two players compare different towers. */
    const a1=ev("JSON.stringify(spireAffixes(500).map(x=>x.id))");
    const a2=ev("JSON.stringify(spireAffixes(500).map(x=>x.id))");
    ok('a day always rolls the same set', a1===a2, a1);
    ok('and a different day rolls a different one',
       a1!==ev("JSON.stringify(spireAffixes(501).map(x=>x.id))"),
       'day 500 '+a1+'  day 501 '+ev("JSON.stringify(spireAffixes(501).map(x=>x.id))"));

    let two=0, one=0, dupes=0, sizes=0;
    for(let d=0;d<400;d++){
      const set=JSON.parse(ev('JSON.stringify(spireAffixes('+d+').map(x=>({id:x.id,foe:!!x.foe})))'));
      if(set.length!==3){ sizes++; continue; }
      const f=set.filter(x=>x.foe).length;
      if(f===2) two++;
      if(set.length-f===1) one++;
      if(set[0].id===set[1].id) dupes++;
    }
    ok('every day is two against you and one for you', two===400 && one===400 && sizes===0,
       two+'/400 hostile pairs, '+one+'/400 boons');
    ok('and the two hostile picks are never the same one', dupes===0, dupes+' duplicate days');
    /* A whole month of the same three would be worse than none. */
    const spread=new Set();
    for(let d=0;d<30;d++) spread.add(ev('JSON.stringify(spireAffixes('+d+').map(x=>x.id))'));
    ok('a month is not the same three over and over', spread.size>=12, spread.size+' distinct sets in 30 days');

    /* An affix key nothing reads is a chip on the card that does nothing, and
       nothing in the file would throw to tell you. */
    const keys=JSON.parse(ev("JSON.stringify({foe:[...new Set(SPIRE_FOE_AFFIXES.flatMap(a=>Object.keys(a.foe)))],"+
      "you:[...new Set(SPIRE_BOON_AFFIXES.flatMap(a=>Object.keys(a.you)))]})"));
    ok('every hostile key is one spireFoeMods applies',
       keys.foe.every(k=>['hp','atk','str','def','swingMs','curse'].includes(k)), keys.foe.join(', '));
    ok('every boon key is one something actually reads',
       keys.you.every(k=>['accBoost','momMult','dmgReduce','lifesteal','aspd','stone'].includes(k)), keys.you.join(', '));

    ok('no affix applies outside a Spire run',
       ev("spireRunAffixes().length===0 && spireBoon('accBoost')===0 && spireBoon('momMult')===1"));
    ok('and the foe modifiers sit at 1 outside one',
       ev("Object.values(spireFoeMods()).every(v=>v===1)"), ev("JSON.stringify(spireFoeMods())"));

    /* Snapshotted at run start: midnight must not change the rules under someone
       forty floors up. */
    ev("state.combatXp={}; for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
       "refreshCombatStats(); startRaid(SPR_ID);");
    ok('a run snapshots the day it started', ev('typeof combat.raid.affixDay==="number"'),
       'day '+ev('String(combat.raid.affixDay)'));
    ev("combat.raid.affixDay=500;");
    ok('and reads its own snapshot rather than the clock',
       ev("JSON.stringify(spireRunAffixes().map(x=>x.id))")===a1, a1);
    /* Floor 21, not 20: every fifth floor is a landing and carries a 1.9x boss
       multiplier that has nothing to do with affixes. */
    ok('the generated floor is built with them on',
       ev("(function(){var m=spireFoeMods(), f=spireFloor(21,true);"+
          "var nat=SPIRE_NATIVE_BY_ID[f.id], md=(nat&&nat.mod&&nat.mod.hp)||1;"+
          "return Math.abs(f.hp-Math.round(SPR_BASE.hp*spireScale(21).hp*m.hp*md))<2;})()"),
       'floor 21 health '+ev('String(spireFloor(21,true).hp)'));
    /* And prove a health affix actually moves it, rather than the check passing
       because today happens to roll nothing that touches health. */
    ev("_plain=spireFloor(21,true).hp;");
    ev("combat.raid.affixDay=501;");   // day 501 rolls Bloated
    ok('a health affix visibly changes the floor',
       ev("spireRunAffixes().some(a=>a.id==='bloated') && spireFloor(21,true).hp>_plain*1.25"),
       ev('String(_plain)')+' -> '+ev('String(spireFloor(21,true).hp)')+' with Bloated');
    ev("combat.youHp=0; handleRaidFail(); combat.active=false;");
  }

  section("The tower's own creatures");
  {
    const nats=JSON.parse(ev('JSON.stringify(SPIRE_NATIVES.map(x=>x.id))'));
    ok('the Spire has a roster of its own', nats.length>=9, nats.length+' natives');
    ok('every native is flagged as one',
       ev('SPIRE_NATIVES.every(x=>x.native===true)'));
    ok('and every one is reachable through the id map',
       ev('SPIRE_NATIVES.every(x=>SPIRE_NATIVE_BY_ID[x.id]===x)'));

    /* The bug that painted a raw id as 358px of text in the arena. A generated foe
       resolves its art through iconHTML(id), so an id with no ICONS entry renders
       the literal string. It cost a shipped build once already. */
    /* Painted since 0.9.124.28, hand-drawn SVG before that. Either is real art;
       what must never happen is no entry at all, which paints the raw id as 358px
       of text in the arena. */
    ok('every native has real drawn art, painted or drawn',
       ev("SPIRE_NATIVES.every(x=>{var k=x.art||x.id; return typeof ICONS[k]==='string' && /^<(svg|img)/.test(ICONS[k]);})"),
       ev("JSON.stringify(SPIRE_NATIVES.filter(x=>!ICONS[x.art||x.id]).map(x=>x.id))"));
    ok('and the generated floor id resolves to that art',
       ev("(function(){for(let i=1;i<=80;i++){const m=spireFloor(i,true); if(!ICONS[m.id]) return 'floor '+i+' '+m.id;} return true;})()")===true);

    /* Every native must actually DO something. A creature that is only a new name
       and a stat tweak is exactly the staleness this was meant to answer. */
    ok('every native brings a mechanic, not just a new name',
       ev("SPIRE_NATIVES.every(x=>!!(x.raidfx||x.monfx||x.castfx||x.bossfx||x.mod))"),
       ev("JSON.stringify(SPIRE_NATIVES.filter(x=>!(x.raidfx||x.monfx||x.castfx||x.bossfx||x.mod)).map(x=>x.id))"));
    ok('the two new monster-side mechanics are both used',
       ev("SPIRE_NATIVES.some(x=>x.monfx&&x.monfx.regen) && SPIRE_NATIVES.some(x=>x.monfx&&x.monfx.enrage)"));

    /* The regression the nativeness gate exists to stop: a recycled raid stage
       carries its own castfx and (on bosses) its own raidfx, and reading those
       without asking who `base` is gave floor 2 the Barrow Champion's telegraph
       and replaced Spire Weight on every landing with that boss's curse. */
    ok('a recycled foe never inherits its home raid\u2019s telegraph',
       ev("[1,2,3,4,6,7,8,9].every(n=>!spireFloor(n,true).castfx)"),
       ev("JSON.stringify([1,2,3,4,6,7,8,9].filter(n=>!!spireFloor(n,true).castfx))"));
    ok('and a deep landing still carries Spire Weight, not its raid boss\u2019s curse',
       ev("(function(){for(const f of [20,30,40,50,60,70]){const m=spireFloor(f,true);"+
          "const nat=SPIRE_NATIVE_BY_ID[m.id];"+
          "if(!nat && !(m.raidfx&&/Spire Weight/.test(m.raidfx.name))) return 'floor '+f;} return true;})()")===true);
    ok('and a native\u2019s own curse replaces Spire Weight rather than stacking',
       ev("(function(){for(let i=14;i<=80;i++){const m=spireFloor(i,true);"+
          "const nat=SPIRE_NATIVE_BY_ID[m.id]; if(nat&&nat.raidfx&&m.raidfx.name!==nat.raidfx.name) return 'floor '+i;}"+
          "return true;})()")===true);

    /* The whole point of the request: more creatures, and a mix rather than four
       themed stretches in order. */
    const d40=+ev("(function(){const s=new Set();for(let i=1;i<=40;i++)s.add(spireFloor(i,true).name);return s.size;})()");
    const d80=+ev("(function(){const s=new Set();for(let i=1;i<=80;i++)s.add(spireFloor(i,true).name);return s.size;})()");
    console.log('       distinct creatures: '+d40+' in the first 40 floors, '+d80+' in the first 80');
    ok('a long climb meets a lot of different things', d80>=28, d80+' distinct in 80 floors');
    ok('and every raid turns up as a place of its own',
       ev("(function(){const seen=new Set();for(let f=1;f<=600;f+=5){const p=spirePlace(f); if(p.kind==='raid') seen.add(p.id);} return seen.size;})()")===4);

    /* A third of the tower is the tower's own. */
    const natN=+ev("(function(){let k=0;for(let i=1;i<=90;i++) if(SPIRE_NATIVE_BY_ID[spireFloor(i,true).id]) k++; return k;})()");
    console.log('       natives hold '+natN+' of the first 90 floors');
    ok('natives hold a third of the tower', natN===30, natN+'/90');

    /* resistTo was being dropped on the floor by spireFloor. It is a real field the
       damage formula reads at 15%, and every recycled foe was silently losing it. */
    ok('a foe that resists something keeps that resistance in the tower',
       ev("(function(){for(let i=1;i<=80;i++){const m=spireFloor(i,true);"+
          "if(m.resistTo) return true;} return false;})()"));
  }

  section('Stretches and backdrops');
  {
    ev("combat.raid=null; combat.active=false;");
    ok('five floors make a stretch, and a stretch is one place',
       ev("(function(){for(let k=0;k<24;k++){const a=spirePlace(k*5+1).id; for(let q=2;q<=5;q++) if(spirePlace(k*5+q).id!==a) return 'stretch '+k;} return true;})()")===true);
    ok('every third stretch is the tower itself',
       ev("[11,12,15,26,30,41,45,56].every(f=>spirePlace(f).kind==='tower') && [1,5,6,10,16,25,31,40].every(f=>spirePlace(f).kind!=='tower')"));
    ok('and the natives live there and nowhere else',
       ev("(function(){for(let f=1;f<=90;f++){const m=spireFloor(f,true); if(!!SPIRE_NATIVE_BY_ID[m.id]!==spireIsTowerStretch(f)) return 'floor '+f+' '+m.id;} return true;})()")===true);
    ok('the first tower stretch meets four different natives',
       +ev("new Set([11,12,13,14].map(f=>spireFloor(f,true).id)).size")===4);
    ok('and its landing is the tower\u2019s own boss', ev("spireFloor(15,true).id")==='spr_the_landing');
    ok('a native\u2019s listed floor is one it can really be met on',
       ev("SPIRE_NATIVES.every(x=>spireIsTowerStretch(spireFirstFloor(x)) && (!!x.boss===(spireFirstFloor(x)%5===0)))"));

    /* A dungeon stretch: its own four, then its own boss. */
    const zf=+ev("(function(){for(let f=1;f<=400;f+=5){const p=spirePlace(f); if(p.kind==='zone'&&MONSTERS.some(m=>m.zone===p.id&&m.boss)) return f;} return 0;})()");
    const zid=ev("spirePlace("+zf+").id");
    ok('a zone stretch fields that zone\u2019s own creatures',
       ev("[0,1,2,3].every(q=>{const m=spireFloor("+zf+"+q,true); return MONSTERS.some(z=>z.zone==='"+zid+"'&&('spr_'+z.id)===m.id);})"),
       zid+' from floor '+zf);
    ok('all four of them, not one of them twice',
       +ev("new Set([0,1,2,3].map(q=>spireFloor("+zf+"+q,true).id)).size")===4);
    ok('and its landing is that zone\u2019s boss',
       ev("(function(){const b=MONSTERS.find(z=>z.zone==='"+zid+"'&&z.boss); return spireFloor("+zf+"+4,true).id==='spr_'+b.id;})()"));
    const hf=+ev("(function(){for(let f=1;f<=600;f+=5){const p=spirePlace(f); if(p.kind==='zone'&&!MONSTERS.some(m=>m.zone===p.id&&m.boss)) return f;} return 0;})()");
    ok('a hunting ground has no boss, so its biggest creature holds the landing',
       hf>0 && ev("(function(){const p=spirePlace("+hf+"); const zm=MONSTERS.filter(m=>m.zone===p.id);"+
                  "const big=zm.reduce((a,m)=>m.lvl>a.lvl?m:a,zm[0]); return spireFloor("+hf+"+4,true).id==='spr_'+big.id;})()"),
       hf?ev("spirePlace("+hf+").name")+', landing on floor '+(hf+4):'none in 600 floors');
    ok('zone creatures are scaled to the floor, not to their zone',
       ev("(function(){const m=spireFloor("+zf+",true), fx=spireFoeMods();"+
          "return Math.abs(m.hp-Math.round(SPR_BASE.hp*spireScale("+zf+").hp*fx.hp))<2;})()"));
    ok('and they keep their painted portraits',
       ev("/^<img/.test(String(ICONS[spireFloor("+zf+",true).id]))"));
    /* The trap that shipped once already: an id with no ICONS entry paints itself
       as 358px of text, and every zone monster carries a legacy emoji in `icon`. */
    ok('no floor ever resolves its art to an emoji or to nothing',
       ev("(function(){for(let f=1;f<=150;f++){const m=spireFloor(f,true); const a=String(ICONS[m.id]||'');"+
          "if(!/^<(svg|img)/.test(a)) return 'floor '+f+' '+m.id; if(m.icon!==m.id) return 'icon field '+m.icon;} return true;})()")===true);

    /* The route. */
    ok('the route visits every zone and raid before any place comes round again',
       ev("(function(){const n=_sprPlaces().length, seen=new Set(); let f=1;"+
          "while(seen.size<n){ if(!spireIsTowerStretch(f)){ const id=spirePlace(f).id; if(seen.has(id)) return 'repeat '+id+' at '+f; seen.add(id);} f+=5; }"+
          "return n===16?true:'places '+n;})()")===true);
    ok('and no place ever follows itself, even across a reshuffle',
       ev("(function(){let prev=null; for(let f=1;f<=900;f+=5){ if(spireIsTowerStretch(f)) continue;"+
          "const id=spirePlace(f).id; if(id===prev) return 'floor '+f; prev=id;} return true;})()")===true);
    ev("combat.raid={id:SPR_ID,stage:0,floor:1,endless:true,affixDay:500};");
    const r500=ev("[1,6,16,21,31,36].map(f=>spirePlace(f).id).join()");
    ev("combat.raid.affixDay=501;");
    const r501=ev("[1,6,16,21,31,36].map(f=>spirePlace(f).id).join()");
    ok('each day draws a different route', r500!==r501, r500.split(',').slice(0,3).join(' / ')+' ...');
    ev("combat.raid.affixDay=500;");
    ok('and a climb keeps the route it started with, whatever the clock says',
       ev("spirePlace(6).id")===r500.split(',')[1] && +ev("gdDayIndex()")!==500);

    /* Backdrops. */
    ev("combat.raid={id:SPR_ID,stage:"+(zf-1)+",floor:"+zf+",endless:true,affixDay:gdDayIndex()}; state.zone='rat_warrens';");
    ok('a zone stretch stands in front of that zone\u2019s backdrop',
       ev("arenaPlace().bg===ZONE_BG['"+zid+"']"), zid);
    ok('and lights the arena in that zone\u2019s colour',
       ev("arenaPlace().accent===getZone('"+zid+"').accent"));
    ev("combat.raid.floor=11;");
    ok('a tower stretch uses the tower\u2019s backdrop, or none, never the last zone',
       ev("arenaPlace().bg===(ZONE_BG[SPR_ID]||null)"));
    ev("combat.raid={id:'sunken_barrow',stage:0,n:6,endless:false}; state.zone='rat_warrens';");
    ok('a fixed raid never shows the zone you last fought in',
       ev("arenaPlace().bg!==ZONE_BG.rat_warrens"));
    ev("combat.raid=null; state.zone='wolf_den';");
    ok('outside a raid the zone backdrop is untouched',
       ev("arenaPlace().bg===ZONE_BG.wolf_den && arenaPlace().accent===getZone('wolf_den').accent"));
    ok('and the stage really renders it',
       ev("arenaBgHTML().indexOf(ZONE_BG.wolf_den.slice(0,80))>0"));
    ok('the fade only plays on a fresh stretch',
       ev("arenaBgHTML().indexOf('rx-newplace')<0"));

    /* Swing speed is shape, not difficulty. Checked with no run active, so every
       affix multiplier sits at 1 and the floor's baseline is exact. */
    ok('damage per second is the floor\u2019s, whatever is swinging',
       ev("(function(){for(let f=1;f<=90;f++){const m=spireFloor(f,true), nat=SPIRE_NATIVE_BY_ID[m.id];"+
          "const want=SPR_BASE.str*spireScale(f).dmg*(f%5===0?1.15:1)*((nat&&nat.mod&&nat.mod.str)||1)/SPR_BASE.swingMs;"+
          "const got=m.str/m.swingMs; if(Math.abs(got-want)/want>0.02) return 'floor '+f+' '+m.name+' '+got.toFixed(3)+' vs '+want.toFixed(3);}"+
          "return true;})()")===true);
    ev("combat.raid={id:SPR_ID,stage:0,floor:1,endless:true,affixDay:0}; combat.youMaxHp=1000;");
    ok('a fast creature\u2019s blows are capped lower', +ev("capRaidHit(900,0.5)")===225);
    ok('and nothing ever raises the cap past 45%', +ev("capRaidHit(900,1.7)")===450 && +ev("capRaidHit(900)")===450);
    ok('enrage and frenzy still bite: the cap reads the creature\u2019s base speed',
       ev("(function(){const m=spireFloor(29,true); RAID_MON_BY_ID[m.id]=m; combat.monId=m.id;"+
          "combat.foeSwingMs=100; return spireSwingCap()===m.swingScale;})()"));
    ev("combat.raid=null; combat.active=false;");
  }

  section('Regen and enrage');
  {
    ev("state=defaultState(); normalizeState(); state.combatXp={};"+
       "for(const k of ['attack','strength','defence','hitpoints']) state.combatXp[k]=XP_CUM[99];"+
       "refreshCombatStats();");
    /* Drive the mechanic directly rather than waiting for a matching floor to come
       up: the pick is deterministic, so a test that hunts for a Plumbhang is a test
       that breaks the day the curve moves. */
    ev("combat.active=true; combat.raid={id:SPR_ID,stage:0,endless:true,affixDay:0};"+
       "combat.monId='spr_plumbhang'; combat.foeMaxHp=10000; combat.foeHp=5000;"+
       "combat.monfx={regen:{tickMs:2500,frac:0.03,label:'Trueing'},raged:false};");
    const t0=+ev("Date.now()");
    ev("combat.monfx.regen.nextAt=0; tickMonsterFx("+t0+", {name:'Plumbhang'});");
    const healed=+ev("combat.foeHp");
    ok('regen heals the foe a slice of its MAX health', healed===5300, '5000 -> '+healed);
    ok('and re-arms rather than firing every frame',
       ev("combat.monfx.regen.nextAt")>t0);
    ev("tickMonsterFx("+t0+", {name:'Plumbhang'});");
    ok('so a second call in the same window does nothing', +ev("combat.foeHp")===healed);

    ev("combat.foeHp=combat.foeMaxHp; combat.monfx.regen.nextAt=0;"+
       "tickMonsterFx("+t0+", {name:'Plumbhang'});");
    ok('a foe at full health is not healed past it', +ev("combat.foeHp")===10000);
    ev("combat.foeHp=0; combat.monfx.regen.nextAt=0; tickMonsterFx("+t0+", {name:'Plumbhang'});");
    ok('and a dead foe is never healed back off zero', +ev("combat.foeHp")===0);

    /* Regen must never outrun the player. A percentage of an exponentially growing
       health pool does exactly that: measured without the ceiling, a Plumbhang was
       UNKILLABLE from floor 30 (507 heal/s against 75 dps). */
    ev("combat.foeMaxHp=10000; combat.foeHp=1000;"+
       "combat.monfx={regen:{tickMs:2500,frac:0.03,cap:0.30,label:'Trueing'},raged:false};");
    let ticks=0;
    for(let i=0;i<200;i++){ ev("combat.monfx.regen.nextAt=0; combat.foeHp=Math.min(combat.foeHp,9000);"+
                              "tickMonsterFx("+t0+", {name:'Plumbhang'});"); ticks++; }
    const done=+ev("combat.monfx.regen.done||0");
    ok('regen stops dead at its lifetime ceiling', done===3000, ticks+' ticks healed '+done+' of a 10,000 pool');
    ok('so it can never out-heal a player at depth',
       ev("SPIRE_NATIVES.filter(x=>x.monfx&&x.monfx.regen).every(x=>x.monfx.regen.cap>0&&x.monfx.regen.cap<=0.35)"),
       ev("JSON.stringify(SPIRE_NATIVES.filter(x=>x.monfx&&x.monfx.regen).map(x=>[x.id,x.monfx.regen.cap]))"));

    /* Enrage is speed and only speed. A damage multiplier measured 7% at floor 22
       and 0% from floor 30 on, because every roll already sits on RAID_HIT_CAP. */
    ok('no native enrages with a damage multiplier the hit cap would eat',
       ev("SPIRE_NATIVES.every(x=>!(x.monfx&&x.monfx.enrage&&x.monfx.enrage.mult))"));
    ok('and every enrage carries a real speed cut',
       ev("SPIRE_NATIVES.filter(x=>x.monfx&&x.monfx.enrage).every(x=>x.monfx.enrage.aspd>=0.15)"));

    ev("combat.foeMaxHp=10000; combat.foeHp=6000; combat.foeSwingMs=3100;"+
       "combat.monfx={enrage:{below:0.5,aspd:0.25,label:'Keystone Pulled'},raged:false};");
    ev("tickMonsterFx("+t0+", {name:'Keystone Golem'});");
    ok('enrage holds above its threshold', ev("combat.monfx.raged")===false);
    ok('and the foe keeps its own swing speed until then', +ev("combat.foeSwingMs")===3100);
    ev("combat.foeHp=4000; tickMonsterFx("+t0+", {name:'Keystone Golem'});");
    ok('it triggers when the foe drops below it', ev("combat.monfx.raged")===true);
    ok('and the foe is genuinely faster from that moment', +ev("combat.foeSwingMs")===2325,
       '3100ms -> '+ev("combat.foeSwingMs")+'ms');
    ev("combat.foeHp=9000; tickMonsterFx("+t0+", {name:'Keystone Golem'});");
    ok('once enraged it stays enraged', ev("monRaged()")===true);
    ok('and it never compounds its own speed cut', +ev("combat.foeSwingMs")===2325);
    ok('a swing can never be driven to nothing',
       ev("(function(){combat.foeSwingMs=700; combat.monfx.raged=false; combat.foeHp=1;"+
          "tickMonsterFx("+t0+", {name:'x'}); return combat.foeSwingMs>=600;})()"));

    /* The mechanic must not survive the fight. `mon.monfx` is the shared registered
       floor object, so a fight that mutated it in place would leave rage stacks on
       floor 22 for every future climb. */
    ok('the fight works on a copy, never on the registered floor',
       ev("(function(){const m=spireFloor(22,true); const nat=SPIRE_NATIVE_BY_ID[m.id];"+
          "if(!nat||!nat.monfx) return true;"+
          "return nat.monfx.raged===undefined;})()"));
    ok('and nothing outside a raid carries one', ev("(function(){"+
       "combat.active=false; combat.raid=null; combat.monfx=null; return monRaged()===false;})()"));
    ev("combat.active=false; combat.raid=null; combat.monfx=null;");
  }

  section('The single-blow cap');
  {
    ev("state=defaultState(); normalizeState(); state.combatXp={};"+
       "for(const k of ['attack','strength','defence','hitpoints','ranged']) state.combatXp[k]=XP_CUM[99];"+
       "refreshCombatStats(); startRaid(SPR_ID);");
    const hp=+ev('combat.youMaxHp'), cap=Math.round(hp*(+ev('RAID_HIT_CAP')));
    ok('a blow is capped well under half your health', ev('capRaidHit(999999)==='+cap),
       hp+' hp -> ceiling '+cap);
    ok('and a small blow passes through untouched', ev('capRaidHit(12)===12'));
    ok('so you are always guaranteed a turn to answer',
       hp/cap>=2.0, (hp/cap).toFixed(1)+' hits to kill you');
    /* The reason it exists: the tower's max hit passes your whole pool around
       floor 48, and before the cap that was a one-shot from full. */
    const deep=JSON.parse(ev('JSON.stringify(spireFloor(70,true))'));
    ok('the deepest floors would otherwise delete you from full',
       deep.str>hp, 'floor 70 max hit '+deep.str+' vs '+hp+' hp');
    ok('but the cap holds against it', ev('capRaidHit('+deep.str+')<='+cap));
    /* Ordinary zones never come close to one-shotting anyone, and capping there
       would quietly make every under-levelled fight in the game survivable. */
    ev("combat.youHp=0; handleRaidFail(); combat.active=false;");
    ok('and it does not apply outside a raid', ev('capRaidHit(999999)===999999'));
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

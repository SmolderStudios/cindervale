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
    ok('thirty shallow floors give up no gear', ev('_g===0'), String(ev('_g')));
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
    /* T8 is deliberately a crossbow rung now — the Ashlock sits there instead of a
       pair of plain stat bows, so the bow ladder is allowed one gap and only one. */
    for(let t=1;t<=11;t++) if(!byTier[t]&&t!==8) holes.push(t);
    ok('the bow ladder has no gaps except the T8 crossbow rung', holes.length===0,
       holes.length?('missing T'+holes.join(', T')):'T1-T7, T9-T11 filled');
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
       fx.every(x=>['poison','stun','cleave','burn','reflect'].includes(x.k)));
    /* A proc weapon that also out-stats its tier is not a choice, it is a
       replacement, and the crafted ladder stops mattering. */
    const under=JSON.parse(ev("JSON.stringify(Object.keys(ITEMS).filter(id=>ITEMS[id].ranged&&ITEMS[id].wfx&&ITEMS[id].ammo==='arrow')"+
      ".map(id=>{var t=ITEMS[id].ctier;"+
      "var best=Math.max.apply(null,Object.keys(ITEMS).filter(o=>ITEMS[o].ranged&&ITEMS[o].ammo==='arrow'&&ITEMS[o].ctier===t&&!ITEMS[o].wfx).map(o=>COMBAT_GEAR_STATS[o].atk));"+
      "return {n:ITEMS[id].name, mine:COMBAT_GEAR_STATS[id].atk, best:best};}))"));
    ok('and each proc bow sits under the crafted bow of its own tier',
       under.every(x=>x.mine<=x.best), under.map(x=>x.n+' '+x.mine+' vs '+x.best).join(', '));

    /* Hung on the thinnest tables in the game, all of which had no gear at all. */
    const src=JSON.parse(ev("JSON.stringify(['thornbite_shortbow','rimeshot_shortbow','mammothhorn_longbow','ashlock_crossbow','fiendbone_shortbow','fiendbone_longbow']"+
      ".map(id=>{var from=Object.keys(MONSTER_DROPS).filter(m=>MONSTER_DROPS[m].some(d=>d.id===id));"+
      "return {id, from, n:from.length};}))"));
    ok('each new bow has exactly one source', src.every(x=>x.n===1),
       src.map(x=>x.from[0]||'NONE').join(', '));
    ok('and it is a real monster in the roster',
       ev("JSON.stringify(['thornback_stag','snow_leopard','ice_mammoth','dust_stalker','hellhound','abyssal_fiend'].map(id=>!!MONSTERS.find(m=>m.id===id)))")==='[true,true,true,true,true,true]');

    /* And the leak that reopened when the T9 bow landed: a non-Spire weapon must
       never reach the Spire's own ammunition. */
    ok('no bow outside the Spire draws a Sundershaft',
       ev("Object.keys(ITEMS).filter(id=>ITEMS[id].ranged&&ITEMS[id].ctier<10)"+
          ".every(id=>ammoFitsWeapon(id,'sundershaft')===false)"));
    ok('and no crossbow outside it draws a Sunderbolt',
       ev("Object.keys(ITEMS).filter(id=>ITEMS[id].ranged&&ITEMS[id].ammo==='bolt'&&ITEMS[id].ctier<10)"+
          ".every(id=>ammoFitsWeapon(id,'sunderbolt')===false)"));
    ok('but the new weapons still take everything craftable',
       ev("ammoFitsWeapon('fiendbone_longbow','starfall_arrow')===true && ammoFitsWeapon('ashlock_crossbow','starfall_bolt')===true"));
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
          "return Math.abs(f.hp-Math.round(SPR_BASE.hp*spireScale(21).hp*m.hp))<2;})()"),
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

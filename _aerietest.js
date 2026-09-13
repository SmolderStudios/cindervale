#!/usr/bin/env node
/* Stormcrest Aerie, the bird hunting ground, is built but switched off until its
 * art is in (AERIE_LIVE in cindervale.html). This boots the game WITH it, so the
 * zone is proven sound before it ships, not the day it goes live.
 *
 *   node _aerietest.js
 *
 * When the zone goes live this becomes part of the normal pipeline, and the
 * Spire's place count and the portrait test in the other suites pick it up.
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, process.env.CV_FILE || 'cindervale.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e && e.message || e)));
const dom = new JSDOM(html, { url: 'http://localhost/?cvdev=1&aerie=1', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 Electron/30' }); w.addEventListener('error', e => errors.push(String(e.message))); } });

setTimeout(() => {
  const w = dom.window, ev = e => { try { return w.eval(e); } catch (err) { return { threw: String(err).slice(0, 160) }; } };
  let pass = 0, fail = 0;
  const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n + (x ? '  ' + x : '')); } else { fail++; console.log('  FAIL ' + n + (x ? '  ' + x : '')); } };
  const bootErrs = errors.filter(e => !/Not implemented|getContext/.test(e));
  ok('the game boots with the Aerie switched on', bootErrs.length === 0, bootErrs.slice(0, 3).join(' | '));

  const z = ev(`(function(){
    var birds=MONSTERS.filter(function(m){ return m.zone==='aerie'; });
    var drops={}, missing=[], noRecipe=[];
    birds.forEach(function(b){ var t=MONSTER_DROPS[b.id]||[]; drops[b.id]=t.length;
      t.forEach(function(d){ if(!ITEMS[d.id]) missing.push(b.id+':'+d.id); }); });
    ['storm_plume','gryphon_plume','phoenix_plume'].forEach(function(p){
      if(!SKILLS.fletching.acts.some(function(a){ return a.inp&&a.inp[p]; })) noRecipe.push(p); });
    var icons=['aerie','crag_hawk','storm_eagle','gryphon','phoenix','pet_gryphling','storm_plume','gryphon_plume','phoenix_plume']
      .filter(function(id){ return !/<svg|<img/.test(iconHTML(id)); });
    return {live:AERIE_LIVE, zone:!!ZONES.find(function(z){ return z.id==='aerie'&&z.type==='hunt'; }), birds:birds.map(function(b){ return b.id+'@'+b.lvl; }).join(','),
      drops:drops, missing:missing, noRecipe:noRecipe, icons:icons, pet:!!PETS.aerie, fam:birds.map(function(b){ return monsterFamily(b); }).join(','),
      inHunt:zonesForMode('hunt').some(function(z){ return z.id==='aerie'; }), weak:birds.every(function(b){ return b.weakTo==='ranged'; })};
  })()`);
  ok('the zone is a hunting ground with four birds in level order', z.live === true && z.zone && z.inHunt && z.birds === 'crag_hawk@26,storm_eagle@45,gryphon@60,phoenix@90', JSON.stringify(z));
  ok('every bird has a drop table of real items', Object.values(z.drops).every(n => n > 0) && z.missing.length === 0, JSON.stringify(z.drops) + ' ' + z.missing.join(','));
  ok('every plume has a Fletching recipe that uses it', z.noRecipe.length === 0, z.noRecipe.join(','));
  ok('every new id draws an icon, not its own name', z.icons.length === 0, z.icons.join(','));
  ok('the zone has a pet, and the birds are their own slayer family', z.pet === true && z.fam === 'avian,avian,avian,avian', JSON.stringify(z));
  ok('and they are weak to arrows', z.weak === true);

  /* Every surface that lists zones, monsters or pets, drawn with the Aerie in it. */
  const draw = ev(`(function(){
    var out=[];
    var run=function(name,fn){ try{ fn(); }catch(e){ out.push(name+': '+String(e).slice(0,120)); } };
    state=defaultState(); normalizeState();
    for(var k in state.combatXp) state.combatXp[k]=XP_CUM[99];
    state.zoneMode='hunt';
    run('combat', function(){ enterCombat(); state.combatZone='aerie'; renderCombat(); });
    run('guide', function(){ if(typeof buildCombatGuideHTML==='function') buildCombatGuideHTML(); });
    run('rollDrops', function(){ ['crag_hawk','storm_eagle','gryphon','phoenix'].forEach(function(id){ for(var i=0;i<50;i++) rollDrops(id,i%10===0); }); });
    run('spire', function(){ if(typeof _sprPlaces==='function') _sprPlaces(); if(typeof spireFloor==='function'){ for(var f=1;f<=60;f++) spireFloor(f); } });
    run('slayer', function(){ SLAYER_MASTERS.forEach(function(ms){ var pool=slayerEligible(ms); pool.forEach(function(m){ if(!monsterFamily(m)) throw new Error('no family: '+m.id); }); }); });
    return out;
  })()`);
  ok('combat, the Field Guide, drops, the Spire and slayer all run with it', Array.isArray(draw) && draw.length === 0, JSON.stringify(draw));

  /* Balance: the same Lv99 fighter against each bird and the beasts either side of
     its level. A bird should sit between its neighbours on XP per hour, and hit
     harder for its level than they do (that is the point of a glass cannon). */
  const bal = ev(`(function(){
    state=defaultState(); normalizeState();
    for(var k in state.combatXp) state.combatXp[k]=XP_CUM[99];
    state.items={starsteel_sword:1}; state.combatEquipped={weapon:'starsteel_sword'};
    var acc=playerAccuracy(), hit=playerMaxHit(), sw=playerSwingMs()/1000, def=playerDefence();
    var row=function(id){
      var m=MONSTERS.find(function(x){ return x.id===id; });
      var p=Math.max(0.03,Math.min(0.97,acc/(acc+m.def))), dps=p*hit*(COMBAT_P.HIT_MIN+1)/2/sw;
      var ttk=m.hp/dps, kph=3600/(ttk+2), xph=Math.round(kph*m.xp);
      var foeP=m.atk/(m.atk+def), taken=Math.round(foeP*m.str*(COMBAT_P.HIT_MIN+1)/2/(m.swingMs/1000)*3600/1000);
      return {id:id, lvl:m.lvl, xph:xph, dmgPerSec:Math.round(m.str/(m.swingMs/1000))};
    };
    return ['briar_lynx','crag_hawk','frost_bear','snow_leopard','storm_eagle','tundra_elk','ice_mammoth','gryphon','ash_jackal','scorch_rhino','phoenix'].map(row);
  })()`);
  if (Array.isArray(bal)) {
    console.log('\n   fighter: Lv99, starsteel sword');
    for (const r of bal) console.log(`     ${r.id.padEnd(14)} Lv${String(r.lvl).padStart(2)}   ${String(r.xph).padStart(8)} xp/hr   ${String(r.dmgPerSec).padStart(4)} max hit per second`);
    const by = id => bal.find(r => r.id === id);
    const between = (a, b, c) => by(b).xph >= Math.min(by(a).xph, by(c).xph) * 0.9 && by(b).xph <= Math.max(by(a).xph, by(c).xph) * 1.1;
    ok('the hawk sits between the lynx and the bear on XP per hour', between('briar_lynx', 'crag_hawk', 'frost_bear'));
    ok('the eagle between the leopard and the elk', between('snow_leopard', 'storm_eagle', 'tundra_elk'));
    ok('the gryphon between the mammoth and the jackal', between('ice_mammoth', 'gryphon', 'ash_jackal'));
    ok('the phoenix within 20% of the rhino beside it', Math.abs(by('phoenix').xph / by('scorch_rhino').xph - 1) < 0.2);
    ok('and every bird hits harder for its level than the beast below it',
      by('crag_hawk').dmgPerSec > by('briar_lynx').dmgPerSec && by('storm_eagle').dmgPerSec > by('snow_leopard').dmgPerSec
      && by('gryphon').dmgPerSec > by('ice_mammoth').dmgPerSec && by('phoenix').dmgPerSec > by('scorch_rhino').dmgPerSec);
  } else ok('balance table ran', false, JSON.stringify(bal));

  console.log('\n' + (fail ? fail + ' FAILED, ' + pass + ' passed' : 'PASS — all ' + pass + ' Aerie checks'));
  process.exit(fail ? 1 : 0);
}, 2500);

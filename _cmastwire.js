/* Does every Marksman node actually change a number? A tooltip that promises
   +2% accuracy and moves nothing is the exact class of defect this repo keeps
   finding, so each node is measured against a baseline with it off. */
const fs=require('fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('cindervale.html','utf8'),
  {url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
setTimeout(()=>{
  const r=JSON.parse(dom.window.eval(`(function(){
    state=defaultState(); normalizeState(); demoXpCap=function(){return XP_CAP;};
    const out=[];
    function setup(weapon, ammo){
      state.cmast={}; state.combatEquipped={weapon:weapon};
      state.combatXp={attack:XP_CUM[80],strength:XP_CUM[80],defence:XP_CUM[80],
                      hitpoints:XP_CUM[99],ranged:XP_CUM[80]};
      if(ammo){ state.combatEquipped.quiver=ammo; state.items={}; state.items[ammo]=5000; }
    }
    function probe(){
      const b=cmastBonuses();
      return {hit:playerMaxHit(), acc:playerAccuracy(), swing:playerSwingMs(),
              ammoStr:ammoStr(), save:+(b.ammoSave||0).toFixed(3), pen:b.armourPen||0,
              volley:b.volley||0, crit:+(b.critDmg||0).toFixed(2), pin:b.pinning||0,
              hp:b.maxHpFlat||0};
    }
    function test(label, node, rank, weapon, ammo, field){
      setup(weapon, ammo); const before=probe();
      setup(weapon, ammo); state.cmast[node]=rank; const after=probe();
      out.push({label:label, field:field, before:before[field], after:after[field],
                moved:before[field]!==after[field]});
    }
    const BOW='shadow_longbow', XBOW='runite_crossbow', SWORD='runite_sword';
    test('Draw Weight x5 (bow)',       'k_t2_l',5,BOW,'runite_arrow','hit');
    test("Fletcher's Thrift x5",       'k_t2_r',5,BOW,'runite_arrow','save');
    test('Bodkin Points',              'k_t3_l',1,BOW,'runite_arrow','pen');
    test('Quick Nock (bow)',           'k_t3_r',1,BOW,'runite_arrow','swing');
    test('Heavy Draw x5 (crossbow)',   'k_t4_l',5,XBOW,'runite_bolt','hit');
    test('Point Blank x5',             'k_t4_r',5,BOW,'runite_arrow','acc');
    test('Volley',                     'k_t5_l',1,BOW,'runite_arrow','volley');
    test('Pinning Shot',               'k_t5_m',1,BOW,'runite_arrow','pin');
    test('Quiver Master',              'k_t5_r',1,BOW,'runite_arrow','ammoStr');
    test('Deadeye (ranged)',           'k_cap', 1,BOW,'runite_arrow','crit');
    test('Vanguard',                   'kb_t4', 1,BOW,'runite_arrow','hp');
    test('Skirmisher x3 (bow)',        'mr_t3', 3,BOW,'runite_arrow','hit');
    test('Skirmisher x3 (sword)',      'mr_t3', 3,SWORD,null,'hit');
    // the gates: a Marksman node must not pay a sword, a melee node must not pay a bow
    const gates=[];
    function gate(label, node, rank, weapon, ammo, field, wantMoved){
      setup(weapon,ammo); const before=probe();
      setup(weapon,ammo); state.cmast[node]=rank; const after=probe();
      gates.push({label:label, moved:before[field]!==after[field], want:wantMoved,
                  ok:(before[field]!==after[field])===wantMoved});
    }
    gate('Draw Weight does nothing for a sword','k_t2_l',5,SWORD,null,'hit',false);
    gate('Brutal Strikes does nothing for a bow','m_t2_l',5,BOW,'runite_arrow','hit',false);
    gate('Brutal Strikes still pays a sword',    'm_t2_l',5,SWORD,null,'hit',true);
    gate('Quick Nock does nothing for a crossbow','k_t3_r',1,XBOW,'runite_bolt','swing',false);
    gate('Heavy Draw does nothing for a bow',    'k_t4_l',5,BOW,'runite_arrow','hit',false);
    gate('Deadeye does nothing for a sword',     'k_cap',1,SWORD,null,'crit',false);
    return JSON.stringify({out:out, gates:gates});
  })()`));
  let bad=0;
  console.log('\n  every Marksman node moves the number it claims to');
  for(const t of r.out){
    const ok=t.moved; if(!ok) bad++;
    console.log(`   ${ok?'ok  ':'FAIL'} ${t.label.padEnd(30)} ${t.field.padEnd(8)} ${String(t.before).padStart(7)} -> ${String(t.after).padStart(7)}`);
  }
  console.log('\n  and the weapon gates hold');
  for(const g of r.gates){
    if(!g.ok) bad++;
    console.log(`   ${g.ok?'ok  ':'FAIL'} ${g.label}`);
  }
  console.log(bad?`\n  ${bad} FAILED\n`:'\n  PASS\n');
  process.exit(bad?1:0);
},3000);

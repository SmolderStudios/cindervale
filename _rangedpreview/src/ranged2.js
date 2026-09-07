
/* ════════ [JS-RANGED-2] FLETCHING, FLAX AND FEATHERS ════════════════════════════
   The chain, and where each link lives:

     Woodcutting  a log
     Fletching    log        -> shafts        better log, more shafts, nothing else
     Smithing     bar        -> arrowheads    12 a bar, or 10 bolt tips
     Farming      a patch    -> flax          also foraged wild
     Fletching    flax       -> bowstring
     combat       a moor-hen -> feathers      and supper
     Fletching    shaft + feather + head  -> arrows
     Fletching    shaft + tip             -> bolts, no feathers, hence dearer metal
     Fletching    logs -> unstrung stave -> + bowstring -> a bow

   Four skills feed it on purpose. Fletching is a SINK, and the game has very few.

   One act per log rather than one act with a log picker: that is how every other
   gathering-fed skill in this game already reads, it needs no control at all, and
   a <select> would have been dead on Proton exactly like the offline panel's was. */
(function(){
  if(typeof SKILLS==='undefined'||!window.RANGED_AMMO) return;
  const AMMO=window.RANGED_AMMO, WOODS=window.RANGED_WOODS;

  /* ── flax: grown or gathered ── */
  if(typeof CROPS!=='undefined' && !CROPS.some(c=>c.id==='flax_seed')){
    ITEMS.flax_seed={name:'Flax Seed', icon:'🌱', sell:12,
      desc:'Small oily seed. Sown in a patch it comes up as flax, which spins into bowstring.'};
    ICONS.flax_seed=ICONS.flax;
    CROPS.push({id:'flax_seed', lvl:20, name:'Flax', icon:'🌾', growMs:7*60000,
      tendInterval:110000, tendBoost:0.25, xp:480, out:{flax:3}, seedReturn:0.22});
  }
  SKILLS.foraging.acts.push({id:'fo_flax', name:'Gather wild flax', lvl:20, ms:6700, xp:88,
    spdMult:0.600, minMs:4700, out:{flax:1}});

  /* ── feathers ──
     Three sources so the loop can never hard block. A drop from the two zones
     where birds belong, a shop stock for three in the morning, and Bird's Nest,
     which was on the sell-only list doing nothing at all. */
  if(typeof MONSTER_DROPS!=='undefined'){
    const add=(mon,rows)=>{ if(MONSTER_DROPS[mon]) MONSTER_DROPS[mon]=MONSTER_DROPS[mon].concat(rows); };
    add('thornback_stag',[{id:'feather', chance:0.22, qty:[3,7]}]);
    add('briar_lynx',    [{id:'feather', chance:0.30, qty:[4,9]},
                          {id:'raw_fowl',chance:0.18}]);
    add('timber_wolf',   [{id:'feather', chance:0.18, qty:[2,6]}]);
    add('snow_leopard',  [{id:'feather', chance:0.28, qty:[5,11]},
                          {id:'raw_fowl',chance:0.20}]);
    add('frost_hare',    [{id:'feather', chance:0.24, qty:[4,8]}]);
  }
  /* Bird's Nest finally does something. It was sitting in SELL_ONLY, which is the
     audit's way of saying "nothing in the game wants this". */
  /* The fowl the feathers came off needs somewhere to go, or it is a drop with no
     destination and the audit says so ("no dropped material lost its last recipe"). */
  ITEMS.roast_fowl={name:'Roast Fowl', icon:'🍗', sell:95, potion:{heal:62},
    desc:'A moor-hen turned on a spit until the skin goes glassy. Restores 62 HP.'};
  ICONS.roast_fowl=ICONS.raw_fowl;
  SKILLS.cooking.acts.push({id:'co_fowl', name:'Roast a fowl', lvl:10, ms:5000, xp:62,
    spdMult:0.55, minMs:840, inp:{raw_fowl:2}, out:{roast_fowl:1}});

  SKILLS.fletching={name:'Fletching', icon:'🏹', acts:[]};
  const F=SKILLS.fletching.acts;
  F.push({id:'fl_nest', name:"Strip a Bird's Nest", cat:'shafts', lvl:1, ms:3000, xp:20,
    spdMult:0.5, minMs:900, inp:{birds_nest:1}, out:{feather:8}});

  /* ── shafts, one act per log ── */
  WOODS.forEach(function(w,i){
    F.push({id:'fl_sh_'+w.k, name:'Carve '+w.n+' shafts', cat:'shafts', lvl:w.fl,
      ms:3600+i*420, xp:Math.round(18+i*22), spdMult:Math.min(0.80,0.50+i*0.045),
      minMs:700+i*90, inp:_o(w.log,1), out:{wood_shaft:w.yield}});
  });
  F.push({id:'fl_string', name:'Spin a bowstring', cat:'shafts', lvl:20, ms:5200, xp:95,
    spdMult:0.60, minMs:1100, inp:{flax:3}, out:{bowstring:1}});

  /* ── arrows and bolts ── */
  AMMO.forEach(function(a,i){
    const head=a.k+'_arrowhead', tip=a.k+'_bolt_tip';
    F.push({id:'fl_ar_'+a.k, name:'Fletch '+a.n+' arrows', cat:'arrows', lvl:a.fl,
      ms:4200+i*520, xp:Math.round(40+i*58), spdMult:Math.min(0.80,0.52+i*0.038),
      minMs:800+i*110, inp:_o3('wood_shaft',12,'feather',12,head,12), out:_o(a.k+'_arrow',12)});
    F.push({id:'fl_bo_'+a.k, name:'Fletch '+a.n+' bolts', cat:'bolts', lvl:a.fl+4,
      ms:4600+i*560, xp:Math.round(46+i*64), spdMult:Math.min(0.80,0.52+i*0.038),
      minMs:850+i*115, inp:_o2('wood_shaft',12,tip,12), out:_o(a.k+'_bolt',12)});
  });

  /* ── bows: carve a stave, then string it ── */
  WOODS.forEach(function(w,i){
    [['short','Shortbow',6],['long','Longbow',9]].forEach(function(v){
      const kind=v[0], label=v[1], logs=v[2];
      const un='unstrung_'+w.k+'_'+kind+'bow', id=w.k+'_'+kind+'bow';
      const lv=w.fl+(kind==='long'?4:0);
      F.push({id:'fl_cv_'+w.k+'_'+kind, name:'Carve a '+w.n+' '+label, cat:'bows', lvl:lv,
        ms:7000+i*900, xp:Math.round(120+i*160), spdMult:Math.min(0.80,0.55+i*0.04),
        minMs:1500+i*180, inp:_o(w.log,logs), out:_o(un,1)});
      F.push({id:'fl_st_'+w.k+'_'+kind, name:'String a '+w.n+' '+label, cat:'bows', lvl:lv,
        ms:3400+i*400, xp:Math.round(70+i*95), spdMult:Math.min(0.80,0.55+i*0.04),
        minMs:900+i*100, inp:_o2(un,1,'bowstring',1), out:_o(id,1)});
    });
  });

  /* ── crossbows: a stock, a prod and a string ── */
  AMMO.forEach(function(a,i){
    const wk=WOODS[Math.min(WOODS.length-1, Math.floor(i*WOODS.length/AMMO.length))];
    const un='unstrung_'+a.k+'_crossbow', id=a.k+'_crossbow';
    F.push({id:'fl_cx_'+a.k, name:'Assemble a '+a.n+' Crossbow', cat:'crossbows', lvl:a.fl+2,
      ms:8000+i*1000, xp:Math.round(150+i*190), spdMult:Math.min(0.80,0.55+i*0.04),
      minMs:1700+i*200, inp:_o2(wk.log,5,a.bar,4), out:_o(un,1)});
    F.push({id:'fl_cs_'+a.k, name:'String a '+a.n+' Crossbow', cat:'crossbows', lvl:a.fl+2,
      ms:3600+i*430, xp:Math.round(80+i*105), spdMult:Math.min(0.80,0.55+i*0.04),
      minMs:950+i*110, inp:_o2(un,1,'bowstring',1), out:_o(id,1)});
  });

  /* ── smithing makes the heads, which is where the metal ladder rejoins ── */
  AMMO.forEach(function(a,i){
    SKILLS.smithing.acts.push({id:'sm_ah_'+a.k, name:'Hammer '+a.n+' arrowheads',
      lvl:a.fl, ms:4000+i*480, xp:Math.round(35+i*52), spdMult:Math.min(0.80,0.52+i*0.038),
      minMs:800+i*100, inp:_o(a.bar,1), out:_o(a.k+'_arrowhead',12)});
    SKILLS.smithing.acts.push({id:'sm_bt_'+a.k, name:'Hammer '+a.n+' bolt tips',
      lvl:a.fl+2, ms:4200+i*500, xp:Math.round(38+i*56), spdMult:Math.min(0.80,0.52+i*0.038),
      minMs:830+i*104, inp:_o(a.bar,1), out:_o(a.k+'_bolt_tip',10)});
  });

  function _o(k,v){ const o={}; o[k]=v; return o; }
  function _o2(a,b,c,d){ const o={}; o[a]=b; o[c]=d; return o; }
  function _o3(a,b,c,d,e,f){ const o={}; o[a]=b; o[c]=d; o[e]=f; return o; }

  /* ── the tree. 98 points, the hard invariant every skill holds to. ── */
  if(typeof TREES!=='undefined' && typeof N==='function'){
    /* Drawn here, not borrowed from ICONS. An item icon carries gradient ids and
       the passives board renders a node icon without passing it through _icoUniq,
       so three nodes sharing one item's art put three copies of the same id in the
       document and every gradient after the first resolved to the wrong one.
       Stroke only, no ids, nothing to collide. */
    const ic=(function(){
      const w=b=>'<svg class="ev-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" '
        +'stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">'+b+'</svg>';
      return {
        speed:  w('<path d="M40 6 L18 34 H32 L24 58 L46 30 H32 Z"/>'),
        xp:     w('<path d="M12 44 L24 20 L36 44 M16 36 H32"/><path d="M44 20 L56 44 M56 20 L44 44"/>'),
        batch:  w('<path d="M14 52 L44 14 M22 56 L52 18 M6 48 L36 10"/>'),
        salvage:w('<path d="M32 8 A24 24 0 1 1 12 44"/><path d="M12 30 L12 46 L28 46"/>'),
        split:  w('<path d="M32 58 V30 L16 8 M32 30 L48 8"/>'),
        aim:    w('<circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="8"/><path d="M32 4 V16 M32 48 V60 M4 32 H16 M48 32 H60"/>'),
        quiver: w('<path d="M22 20 L44 24 L39 56 Q32 60 25 55 Z"/><path d="M27 20 L22 6 M33 21 L33 4 M40 22 L46 8"/>'),
        draw:   w('<path d="M46 6 C20 20 20 44 46 58"/><path d="M46 6 V58"/><path d="M18 32 H46"/>'),
        wind:   w('<path d="M6 22 H38 A8 8 0 1 0 30 14"/><path d="M6 38 H46 A8 8 0 1 1 38 46"/>'),
        bolt:   w('<path d="M16 52 L48 16"/><path d="M56 8 L42 12 L52 22 Z"/><path d="M14 46 L22 54"/>'),
        barb:   w('<path d="M14 54 L50 14"/><path d="M50 14 L38 16 L48 26 Z"/><path d="M26 42 L18 34 M34 34 L26 26"/>'),
        cape:   w('<path d="M20 10 H44 L52 22 L46 58 H18 L12 22 Z"/><path d="M26 10 Q32 18 38 10"/>'),
        free:   w('<circle cx="32" cy="32" r="22"/><path d="M22 32 L29 40 L44 24"/>'),
      };
    })();
    TREES.fletching=[
      /* 1.3% a rank, which is what SPD_RANK gives a non-gathering skill.
         _audit_tests.js compares every *_speed desc against measured mods(), and it
         caught this claiming 24% while delivering 15.6%. State the real number. */
      N('fl_speed','Steady Hands',ic.speed,12,0,
        r=>'Reduces task time by '+(r*1.3).toFixed(1)+'%', r=>'+1.3% faster to '+(r*1.3).toFixed(1)+'%'),
      N('fl_xp','Straight Grain',ic.xp,10,0,
        r=>'+'+(r*3)+'% Fletching XP', r=>'+3% to '+(r*3)+'%'),
      N('fl_double','Bulk Fletcher',ic.batch,8,0,
        r=>(r*2)+'% chance of a double batch', r=>'+2% to '+(r*2)+'%'),
      N('fl_salvage','Salvager',ic.salvage,10,12,
        r=>(r*6)+'% of spent ammunition recovered after a fight', r=>'+6% to '+(r*6)+'%'),
      N('fl_split','Splitter',ic.split,6,12,
        r=>'+'+r+' extra shaft from every log', r=>'+1 shaft to +'+r),
      N('fl_acc','Keen Heads',ic.aim,8,20,
        r=>'+'+r+'% ranged accuracy', r=>'+1% to +'+r+'%'),
      N('fl_quiver','Quiverfull',ic.quiver,6,20,
        r=>'+'+(r*25)+' quiver capacity', r=>'+25 to +'+(r*25)),
      N('fl_dmg','Practised Draw',ic.draw,8,30,
        r=>'+'+r+'% ranged damage', r=>'+1% to +'+r+'%'),
      N('fl_wind','Windcutter',ic.wind,5,45,
        r=>(r*2)+'% chance a shot cannot miss', r=>'+2% to '+(r*2)+'%'),
      N('fl_bolts','Master Fletcher',ic.bolt,1,55,
        r=>r?'Ammunition recovery applies to bolts too':'Recovery covers bolts as well as arrows',
        ()=>'Recovery covers bolts'),
      N('fl_barb','Barbed',ic.barb,7,60,   // 7: the tree sums to exactly 98
        r=>(r*1.5)+'% chance a landed shot bleeds', r=>'+1.5% to '+(r*1.5)+'%'),
      N('fl_gm_speed','Swift Bench',ic.speed,5,75,
        r=>'Reduces task time by '+(r*1.8).toFixed(1)+'% (grandmaster)', r=>'+1.8% faster to '+(r*1.8).toFixed(1)+'%'),
      N('fl_gm_xp','Woodsong',ic.xp,5,75,
        r=>'+'+(r*4)+'% Fletching XP', r=>'+4% to '+(r*4)+'%'),
      N('fl_gm_salv','Deep Quiver',ic.salvage,5,80,
        r=>'+'+(r*4)+'% ammunition recovered', r=>'+4% to '+(r*4)+'%'),
      N('fl_endless','Endless Quiver',ic.free,1,90,
        r=>r?'5% of shots spend no ammunition':'5% of shots spend nothing',
        ()=>'5% of shots are free'),
      N('fl_cape','Fletcher’s Cape',ic.cape,1,99,
        r=>r?'The capstone':'The capstone', ()=>'Capstone', {reqCape:true}),
    ];
  }
})();

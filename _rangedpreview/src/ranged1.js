
/* ════════ [JS-RANGED] RANGED + FLETCHING ════════════════════════════════════════
   Data slice. Combat maths live with the rest of the combat maths; this block is
   the items, the icons, the recipes and the two skills that feed them.

   THE ONE IDEA: ranged spends a resource and melee does not. Every shot eats an
   arrow or a bolt. That is why Fletching is a skill rather than a decoration, and
   it is the only thing here that is not negotiable.

   Where the numbers came from, so the next person does not have to guess:
     bow atk   = the sword line at the same tier, so accuracy is at parity
     bow str   = 0. The AMMUNITION carries the damage. A bow that also carried
                 strength would stack with the arrow and put ranged over melee
                 before the level coefficient was even considered.
     arrow str = the sword STR line x0.85, because bows swing 15% faster. Damage
                 x speed is the thing that has to match, not damage.
     bolt str  = arrow x1.15, paid for by the crossbow's 15% slower swing.
   All provisional until _rangedsim.js says otherwise. See _rangedpreview/DESIGN.md
   section 4: nothing here ships to a balance patch on vibes. */
(function(){
  if(typeof SKILLS==='undefined'||typeof ITEMS==='undefined') return;

  /* ── ladders ──────────────────────────────────────────────────────────────
     Ammunition follows the BAR ladder, so it needs no new material and stops
     where smithable metal stops. Moltensteel and voidsteel have no bar (their
     weapons are raid drops), so the ammo ladder ends at starfall. */
  const AMMO=[
    {k:'bronze',    n:'Bronze',    bar:'bronze_bar',    fl:1,  str:2,  sell:4},
    {k:'iron',      n:'Iron',      bar:'iron_bar',      fl:12, str:3,  sell:8},
    {k:'steel',     n:'Steel',     bar:'steel_bar',     fl:24, str:5,  sell:16},
    {k:'mithril',   n:'Mithril',   bar:'mithril_bar',   fl:38, str:8,  sell:34},
    {k:'cobalt',    n:'Cobalt',    bar:'cobalt_bar',    fl:52, str:11, sell:60},
    {k:'runite',    n:'Runite',    bar:'runite_bar',    fl:64, str:15, sell:105},
    {k:'starsteel', n:'Starsteel', bar:'starsteel_bar', fl:76, str:20, sell:180},
    {k:'starfall',  n:'Starfall',  bar:'starfall_bar',  fl:88, str:28, sell:320},
  ];
  /* Bows follow the WOOD ladder. `yield` is how many shafts one of that log
     carves into, which is the whole reason to keep chopping the good stuff. */
  const WOODS=[
    {k:'pine',    n:'Pine',       log:'pine_log',     fl:1,  atk:3,  yield:8,  sell:60},
    {k:'oak',     n:'Oak',        log:'oak_log',      fl:12, atk:5,  yield:10, sell:150},
    {k:'ironbark',n:'Ironbark',   log:'ironbark_log', fl:27, atk:8,  yield:12, sell:400},
    {k:'ember',   n:'Emberwood',  log:'ember_log',    fl:45, atk:12, yield:15, sell:1100},
    {k:'frost',   n:'Frostwood',  log:'frost_log',    fl:62, atk:17, yield:18, sell:2600},
    {k:'shadow',  n:'Shadowwood', log:'shadow_log',   fl:78, atk:23, yield:22, sell:6200},
    {k:'ancient', n:'Ancient',    log:'ancient_log',  fl:90, atk:30, yield:26, sell:14000},
  ];

  /* ── palettes, matching the tiers the rest of the game already uses ── */
  const WPAL={
    pine:{l:'#c09a63',m:'#8a6236',d:'#3f2b14'}, oak:{l:'#b98a4e',m:'#7d5527',d:'#3a2610'},
    ironbark:{l:'#9a9484',m:'#5f5a4c',d:'#2b281f'},
    ember:{l:'#d4703c',m:'#96351d',d:'#3d1108',glow:'#e0762f'},
    frost:{l:'#a8cfe0',m:'#5c8ba4',d:'#1e3242',glow:'#8fd0e6'},
    shadow:{l:'#7c6d90',m:'#463a5c',d:'#1c1528',glow:'#9a5ad0'},
    ancient:{l:'#9aa870',m:'#5e6b38',d:'#232a12',glow:'#c8e070',spark:1},
  };
  const MPAL={
    bronze:{l:'#d79a52',m:'#a36a26',d:'#4a2c0d'}, iron:{l:'#a8adb4',m:'#70767e',d:'#2e3238'},
    steel:{l:'#d3dae2',m:'#8b939d',d:'#3c4249'},
    mithril:{l:'#8cc4ec',m:'#3f74a4',d:'#152f47',glow:'#6fa8d8'},
    cobalt:{l:'#6b9ce8',m:'#2f57a0',d:'#13224a',glow:'#4a7fd0'},
    runite:{l:'#5fd0a8',m:'#238a68',d:'#0d3a2c',glow:'#3fb08a'},
    starsteel:{l:'#e8e2ff',m:'#9089c4',d:'#2e2a4a',glow:'#c8bcff',spark:1},
    starfall:{l:'#ffd98a',m:'#c08a2a',d:'#4a3008',glow:'#ffcf5a',spark:1},
  };

  /* ── icon generators ──────────────────────────────────────────────────────
     One silhouette, one palette per tier, exactly as _roastSVG and
     _curedLeatherSVG do it. A bow is a D: the limb bows out one side and the
     string is dead straight down the chord. Drawn the other way it reads as a
     leaf, which is how the first pass of these came out. */
  let _rid=0; const uid=()=>'rg'+(++_rid);
  function _d(p){
    const g=uid(), s=uid();
    return {g, s, m:'<defs>'
      +(p.glow?'<radialGradient id="'+g+'" cx="0.5" cy="0.5" r="0.55">'
        +'<stop offset="0" stop-color="'+p.glow+'" stop-opacity="0.42"/>'
        +'<stop offset="1" stop-color="'+p.glow+'" stop-opacity="0"/></radialGradient>':'')
      +'<linearGradient id="'+s+'" x1="0.1" y1="0" x2="0.95" y2="0.4">'
      +'<stop offset="0" stop-color="'+p.l+'"/><stop offset="0.45" stop-color="'+p.m+'"/>'
      +'<stop offset="1" stop-color="'+p.d+'"/></linearGradient></defs>'};
  }
  const _halo=(p,d)=>p.glow?'<circle cx="32" cy="32" r="28" fill="url(#'+d.g+')"/>':'';
  const _spk=p=>p.spark?'<circle cx="13" cy="16" r="1.5" fill="#fff" opacity="0.85"/>'
    +'<circle cx="51" cy="46" r="1.2" fill="#fff" opacity="0.7"/>'
    +'<circle cx="46" cy="14" r="1" fill="#fff" opacity="0.6"/>':'';

  function bowSVG(p,long,unstrung){
    const d=_d(p), y0=long?3:9, y1=long?61:55, bulge=long?12:10, ch=50;
    const limb='M'+ch+' '+y0+' C'+bulge+' '+(y0+10)+' '+bulge+' '+(y1-10)+' '+ch+' '+y1;
    const tips=long?'':'<path d="M'+ch+' '+y0+' C'+(ch+7)+' '+(y0+3)+' '+(ch+7)+' '+(y0+8)+' '+(ch-2)+' '+(y0+9)+'" fill="none" stroke="url(#'+d.s+')" stroke-width="5" stroke-linecap="round"/>'
      +'<path d="M'+ch+' '+y1+' C'+(ch+7)+' '+(y1-3)+' '+(ch+7)+' '+(y1-8)+' '+(ch-2)+' '+(y1-9)+'" fill="none" stroke="url(#'+d.s+')" stroke-width="5" stroke-linecap="round"/>';
    return '<svg class="ev-icon" viewBox="0 0 64 64">'+d.m+_halo(p,d)
      +'<path d="'+limb+'" fill="none" stroke="url(#'+d.s+')" stroke-width="'+(long?6:6.5)+'" stroke-linecap="round"/>'
      +'<path d="'+limb+'" fill="none" stroke="'+p.l+'" stroke-width="1.5" opacity="0.4" stroke-linecap="round" transform="translate(-1.6,0)"/>'
      +tips
      +(unstrung?'':'<path d="M'+ch+' '+y0+' L'+ch+' '+y1+'" stroke="#efe4c4" stroke-width="1.8" stroke-linecap="round"/>')
      +'<path d="M'+(bulge+1)+' 24 L'+(bulge+1)+' 40" stroke="#3a2513" stroke-width="10" stroke-linecap="round"/>'
      +'<path d="M'+(bulge+1)+' 24 L'+(bulge+1)+' 40" stroke="#6d4a26" stroke-width="7" stroke-linecap="round"/>'
      +'<path d="M'+(bulge-3)+' 28 H'+(bulge+5)+' M'+(bulge-3)+' 36 H'+(bulge+5)+'" stroke="#c9a86a" stroke-width="1.8" opacity="0.7" stroke-linecap="round"/>'
      +_spk(p)+'</svg>';
  }
  function xbowSVG(p,unstrung){
    const d=_d(p), w=_d({l:'#a07a48',m:'#6d4a26',d:'#33210f'});
    return '<svg class="ev-icon" viewBox="0 0 64 64">'+d.m+w.m+_halo(p,d)
      +'<path d="M27 16 H37 L39 50 Q32 62 25 50 Z" fill="url(#'+w.s+')" stroke="#241708" stroke-width="1.3" stroke-linejoin="round"/>'
      +'<path d="M29.5 20 L29.5 50" stroke="#a07a48" stroke-width="1.4" opacity="0.4"/>'
      +'<path d="M24 44 L32 41 L40 44" fill="none" stroke="'+p.d+'" stroke-width="2.6" stroke-linecap="round"/>'
      +'<path d="M5 30 C16 15 48 15 59 30" fill="none" stroke="url(#'+d.s+')" stroke-width="6.5" stroke-linecap="round"/>'
      +'<path d="M5 30 C16 17 48 17 59 30" fill="none" stroke="'+p.l+'" stroke-width="1.6" opacity="0.4" stroke-linecap="round"/>'
      +(unstrung?'':'<path d="M5 30 L32 38 L59 30" fill="none" stroke="#efe4c4" stroke-width="1.8" stroke-linejoin="round"/>'
        +'<path d="M30 12 L34 12 L34 34 L30 34 Z" fill="'+p.d+'" stroke="'+p.l+'" stroke-width="1.1"/>'
        +'<path d="M32 8 L36 14 L28 14 Z" fill="'+p.l+'"/>')
      +_spk(p)+'</svg>';
  }
  function ammoSVG(p,bolt){
    const d=_d(p), w=_d({l:'#c09a63',m:'#8a6236',d:'#3f2b14'});
    const x0=bolt?22:14, y0=bolt?42:50;
    return '<svg class="ev-icon" viewBox="0 0 64 64">'+d.m+w.m+_halo(p,d)
      +'<path d="M'+x0+' '+y0+' L48 16" stroke="url(#'+w.s+')" stroke-width="'+(bolt?6:4.4)+'" stroke-linecap="round"/>'
      +'<path d="M58 6 L44 10 L54 20 Z" fill="url(#'+d.s+')" stroke="#1a1206" stroke-width="1.2" stroke-linejoin="round"/>'
      +'<path d="M58 6 L48 12.5 L54 20 Z" fill="'+p.l+'" opacity="0.35"/>'
      +(bolt
        ?'<rect x="17" y="39" width="12" height="7" rx="2" transform="rotate(-45 23 42)" fill="'+p.d+'" stroke="'+p.l+'" stroke-width="1.1"/>'
        :'<path d="M14 50 L6 46 L10 56 Z" fill="'+p.m+'" stroke="#1a1206" stroke-width="1"/>'
         +'<path d="M18 46 L10 42 L14 52 Z" fill="'+p.l+'" opacity="0.75" stroke="#1a1206" stroke-width="0.9"/>'
         +'<path d="M22 42 L14 38 L18 48 Z" fill="'+p.m+'" opacity="0.9" stroke="#1a1206" stroke-width="0.9"/>')
      +_spk(p)+'</svg>';
  }
  function headSVG(p,bolt){
    const d=_d(p);
    return '<svg class="ev-icon" viewBox="0 0 64 64">'+d.m+_halo(p,d)
      +(bolt
        ?'<path d="M32 6 L44 26 L38 54 L26 54 L20 26 Z" fill="url(#'+d.s+')" stroke="#1a1206" stroke-width="1.4" stroke-linejoin="round"/>'
         +'<path d="M32 6 L38 26 L32 54 Z" fill="'+p.l+'" opacity="0.3"/>'
        :'<path d="M32 4 L48 30 L36 30 L36 58 L28 58 L28 30 L16 30 Z" fill="url(#'+d.s+')" stroke="#1a1206" stroke-width="1.4" stroke-linejoin="round"/>'
         +'<path d="M32 4 L40 30 L32 30 Z" fill="'+p.l+'" opacity="0.32"/>')
      +_spk(p)+'</svg>';
  }

  /* ── shared materials ── */
  ITEMS.wood_shaft={name:'Arrow Shafts', icon:'🪵', sell:2,
    desc:'Straight lengths of seasoned wood, cut for fletching. Any log carves into them; a better log simply carves into more.'};
  ITEMS.feather={name:'Feather', icon:'🪶', sell:3,
    desc:'A stiff barred flight feather. Three to an arrow, and no arrow flies straight without them. Bolts do without.'};
  ITEMS.raw_fowl={name:'Raw Fowl', icon:'🍗', sell:14,
    desc:'A plump moor-hen, plucked and drawn. The feathers were the point; the bird is supper.'};
  ITEMS.flax={name:'Flax', icon:'🌾', sell:9,
    desc:'Pale fibrous stems, retted and ready to spin. Grown in a patch or gathered wild along the ditches.'};
  ITEMS.bowstring={name:'Bowstring', icon:'🧵', sell:38,
    desc:'Flax spun into a cord that will not stretch. A bow without one is a stick.'};
  ICONS.wood_shaft='<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="wsh" x1="0.1" y1="0" x2="0.95" y2="0.4">'
    +'<stop offset="0" stop-color="#c09a63"/><stop offset="0.45" stop-color="#8a6236"/><stop offset="1" stop-color="#3f2b14"/></linearGradient></defs>'
    +'<path d="M16 54 L44 10 M24 56 L52 12 M8 50 L36 6" stroke="url(#wsh)" stroke-width="5" stroke-linecap="round"/>'
    +'<path d="M14 42 C24 46 34 40 44 44" stroke="#6d4a26" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>';
  ICONS.feather='<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="ftr" x1="0.2" y1="0" x2="0.9" y2="1">'
    +'<stop offset="0" stop-color="#f2e9d4"/><stop offset="0.5" stop-color="#b9ab8c"/><stop offset="1" stop-color="#5e5240"/></linearGradient></defs>'
    +'<path d="M50 8 C30 14 16 32 12 54 C34 50 52 34 56 12 Z" fill="url(#ftr)" stroke="#2e281c" stroke-width="1.3" stroke-linejoin="round"/>'
    +'<path d="M54 10 L10 56" stroke="#6a5f48" stroke-width="1.9" stroke-linecap="round"/>'
    +'<path d="M46 14 L28 22 M42 20 L24 30 M38 27 L21 38 M34 34 L18 45" stroke="#7d7159" stroke-width="1" opacity="0.55"/>'
    +'<path d="M10 56 L6 60" stroke="#4a4130" stroke-width="2.2" stroke-linecap="round"/></svg>';
  ICONS.flax='<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="flx" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0" stop-color="#e8dfae"/><stop offset="0.55" stop-color="#b9a664"/><stop offset="1" stop-color="#5e5228"/></linearGradient></defs>'
    +'<path d="M20 58 C22 38 24 20 26 6 M32 58 C32 36 32 18 32 4 M44 58 C42 38 40 20 38 6" stroke="url(#flx)" stroke-width="4" stroke-linecap="round" fill="none"/>'
    +'<circle cx="26" cy="7" r="3.4" fill="#8fb4e0"/><circle cx="32" cy="5" r="3.8" fill="#a8c8ec"/><circle cx="38" cy="7" r="3.4" fill="#8fb4e0"/>'
    +'<path d="M16 46 H48" stroke="#6d4a26" stroke-width="3.4" stroke-linecap="round"/></svg>';
  ICONS.bowstring='<svg class="ev-icon" viewBox="0 0 64 64">'
    +'<ellipse cx="32" cy="34" rx="20" ry="21" fill="none" stroke="#d8cfae" stroke-width="4.4"/>'
    +'<ellipse cx="32" cy="34" rx="20" ry="21" fill="none" stroke="#8d8464" stroke-width="1.6" stroke-dasharray="4 5"/>'
    +'<ellipse cx="32" cy="13" rx="9" ry="6" fill="none" stroke="#d8cfae" stroke-width="4"/>'
    +'<path d="M25 50 L32 58 L39 50" fill="none" stroke="#b5aa85" stroke-width="2.6" stroke-linecap="round"/></svg>';
  ICONS.raw_fowl='<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="rfw" x1="0.2" y1="0" x2="0.9" y2="1">'
    +'<stop offset="0" stop-color="#f0cfae"/><stop offset="0.55" stop-color="#c08f66"/><stop offset="1" stop-color="#5e3b26"/></linearGradient></defs>'
    +'<path d="M22 20 C12 30 12 46 24 54 C38 60 52 50 50 34 C48 22 34 14 22 20 Z" fill="url(#rfw)" stroke="#3a2214" stroke-width="1.4"/>'
    +'<path d="M26 22 L18 8 L14 12 L20 24" fill="#e8dcc0" stroke="#3a2214" stroke-width="1.2" stroke-linejoin="round"/>'
    +'<path d="M30 30 C36 34 40 42 38 50" stroke="#8a5a3a" stroke-width="1.4" fill="none" opacity="0.6"/></svg>';

  /* ── ammunition, arrowheads and bolt tips ── */
  AMMO.forEach(function(a,i){
    const p=MPAL[a.k], ct=i+1;
    const head=a.k+'_arrowhead', tip=a.k+'_bolt_tip', arrow=a.k+'_arrow', bolt=a.k+'_bolt';
    ITEMS[head]={name:a.n+' Arrowhead', icon:'🔻', sell:Math.round(a.sell*0.5),
      desc:'A barbed '+a.n.toLowerCase()+' head, hammered flat at the anvil. Twelve to a bar. Useless until it meets a shaft and a feather.'};
    ITEMS[tip]={name:a.n+' Bolt Tip', icon:'🔻', sell:Math.round(a.sell*0.7),
      desc:'A squat '+a.n.toLowerCase()+' bodkin, heavier than an arrowhead and made ten to a bar. Bolts trade flight for weight.'};
    ITEMS[arrow]={name:a.n+' Arrow', icon:'🏹', sell:a.sell, ammo:'arrow', ammoStr:a.str, ammoTier:ct,
      desc:'Shaft, feather and '+a.n.toLowerCase()+' head. Adds '+a.str+' strength to every shot from a bow. Spent on firing, though a fletcher recovers some.'};
    ITEMS[bolt]={name:a.n+' Bolt', icon:'🏹', sell:Math.round(a.sell*1.3), ammo:'bolt', ammoStr:Math.round(a.str*1.15), ammoTier:ct,
      desc:'A short heavy quarrel tipped in '+a.n.toLowerCase()+'. Adds '+Math.round(a.str*1.15)+' strength to every shot from a crossbow, which is slower to loose.'};
    ICONS[head]=headSVG(p,false); ICONS[tip]=headSVG(p,true);
    ICONS[arrow]=ammoSVG(p,false); ICONS[bolt]=ammoSVG(p,true);
  });

  /* ── bows: unstrung, shortbow, longbow ──
     Shortbows swing faster and hit the same; longbows swing at normal speed and
     aim better. Both two handed, both `light`, so the Rogue bonus the class blurb
     has always promised finally applies to something. */
  WOODS.forEach(function(w,i){
    const p=WPAL[w.k], ct=i+1;
    [['short','Shortbow',1.00,0.85],['long','Longbow',1.28,1.00]].forEach(function(v){
      const kind=v[0], label=v[1], atkMult=v[2], swing=v[3];
      const id=w.k+'_'+kind+'bow', un='unstrung_'+id;
      ITEMS[un]={name:'Unstrung '+w.n+' '+label, icon:'🪵', sell:Math.round(w.sell*0.35),
        desc:'A '+w.n.toLowerCase()+' stave, carved and tillered. It needs a bowstring before it is a weapon.'};
      ITEMS[id]={name:w.n+' '+label, icon:'🏹', sell:w.sell, cgear:true, ctier:ct, cslot:'weapon',
        dmgType:'ranged', twoHanded:true, wclass:'light', ranged:true, ammo:'arrow',
        swingMult:swing, reqRanged:w.fl,
        desc:w.n+' and flax. '+(kind==='short'
          ? 'Short in the limb and quick to draw: '+Math.round((1-swing)*100)+'% faster than a blade, and the arrow does the rest.'
          : 'Long in the limb and slow to bring round, but it puts the shot where you meant it.')
          +' Takes both hands, so it uses no shield, and every loose spends an arrow.'};
      ICONS[un]=bowSVG(p,kind==='long',true);
      ICONS[id]=bowSVG(p,kind==='long',false);
      COMBAT_GEAR_STATS[id]={atk:Math.round(w.atk*atkMult), str:0, def:0};
    });
  });

  /* ── crossbows: one handed, so the shield stays ── */
  AMMO.forEach(function(a,i){
    const p=MPAL[a.k], ct=i+1;
    const wood=WOODS[Math.min(WOODS.length-1, Math.floor(i*WOODS.length/AMMO.length))];
    const id=a.k+'_crossbow', un='unstrung_'+id;
    /* Crossbow accuracy is baked into `atk` rather than applied as a separate
       multiplier at fire time. One number, in the same place every other weapon
       keeps its accuracy, and it shows up correctly in the item card for free. */
    const atk=Math.round([3,5,8,12,17,23,30,40][i]*1.18);
    ITEMS[un]={name:'Unstrung '+a.n+' Crossbow', icon:'🪵', sell:Math.round(a.sell*14),
      desc:'A stock and a '+a.n.toLowerCase()+' prod, pinned and true. It needs a bowstring before it will hold a draw.'};
    ITEMS[id]={name:a.n+' Crossbow', icon:'🏹', sell:Math.round(a.sell*22), cgear:true, ctier:ct, cslot:'weapon',
      dmgType:'ranged', wclass:'standard', ranged:true, ammo:'bolt',
      swingMult:1.15, reqRanged:a.fl,
      desc:'Slower to crank than a bow draws, and it aims better for it. One hand only, so a shield or buckler still fits, and every shot spends a bolt.'};
    ICONS[un]=xbowSVG(p,true); ICONS[id]=xbowSVG(p,false);
    COMBAT_GEAR_STATS[id]={atk:atk, str:0, def:0};
    ITEMS[un].xbowWood=wood.k;
  });

  /* Handy lookups for the combat code and the panels. */
  /* Flag every leather piece as light. rangedArmourMult() reads that to decide
     whether you are dressed to shoot in. Done here rather than in the
     LEATHER_TIERS loop so the whole feature stays in one block. */
  if(typeof LEATHER_TIERS!=='undefined'){
    LEATHER_TIERS.forEach(function(t){
      ['helm','chest','legs','gloves','boots'].forEach(function(slot){
        const id=t.key+'_'+slot;
        if(ITEMS[id]) ITEMS[id].light=true;
      });
    });
  }

  window.RANGED_AMMO=AMMO; window.RANGED_WOODS=WOODS;
  window.isRangedWeapon=function(id){ return !!(id&&ITEMS[id]&&ITEMS[id].ranged); };
  window.ammoKind=function(id){ return (id&&ITEMS[id]&&ITEMS[id].ammo)||null; };
})();

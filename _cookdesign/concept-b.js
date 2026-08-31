/* B · THE HEARTH — the fire stops being a status bar and becomes the object the
   panel is built around: a wide plate across the top, with the log shelf on it.
   Loading fuel comes out of the modal entirely, and the number the modal was
   hiding — what the satchel is still worth in burn time — sits next to the four
   minutes actually in the fire.

   The plate is deliberately sized for artwork. A drawn hearth belongs here more
   than anywhere else in the game: it is the one surface a cooking panel has that
   is about atmosphere rather than about numbers. */
(function(){
  var s=document.createElement('style');
  s.textContent=[
  '#activityGrid.ck-b{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;align-items:start}',
  '@media(max-width:1000px){#activityGrid.ck-b{grid-template-columns:repeat(2,minmax(0,1fr))}}',

  '.ck-b .hearth{grid-column:1/-1;display:flex;align-items:stretch;gap:0;overflow:hidden;',
  '  background:linear-gradient(178deg,var(--lit-top),var(--lit-bot) 78%);',
  '  border:1px solid var(--trim-d);border-radius:10px;',
  '  box-shadow:var(--sh-2),inset 0 1px 0 var(--rim)}',
  '.ck-b .hearth.out{border-color:#5c2c20}',
  '.ck-b .hearth.burning{border-color:#7a4418;box-shadow:var(--sh-2),inset 0 0 34px rgba(224,118,47,.13)}',

  /* ── the plate: 236x136, the slot a generated hearth would fill ── */
  '.ck-b .fireplate{flex:0 0 236px;position:relative;display:flex;align-items:flex-end;',
  '  justify-content:center;min-height:136px;overflow:hidden;border-right:1px solid var(--trim-d);',
  '  background:radial-gradient(120% 96% at 50% 108%,#5a2c0c,#1d1006 62%,#120a04)}',
  '.ck-b .hearth.out .fireplate{background:radial-gradient(120% 96% at 50% 108%,#2a1d16,#150e08 62%,#100905)}',
  '.ck-b .hearth.stored .fireplate{background:radial-gradient(120% 96% at 50% 108%,#1d3346,#111a22 62%,#0c1116)}',
  '.ck-b .fireplate .fx{position:absolute;inset:0;background:',
  '  radial-gradient(56% 66% at 50% 102%,rgba(255,190,80,.40),transparent 70%),',
  '  radial-gradient(30% 42% at 50% 102%,rgba(255,236,170,.46),transparent 72%)}',
  '.ck-b .hearth.out .fireplate .fx{opacity:.05}',
  /* The drawn plate. Its own edges are already feathered to transparent, so it
     sits on the gradient rather than ending on a rectangle. */
  '.ck-b .fireplate .plate{position:absolute;inset:0;background-size:cover;',
  '  background-position:50% 56%;background-repeat:no-repeat}',
  '.ck-b .hearth.burning .fireplate .plate{animation:ckbreathe 4.2s ease-in-out infinite}',
  '@keyframes ckbreathe{0%,100%{opacity:.94;transform:scale(1)}50%{opacity:1;transform:scale(1.018)}}',
  '@media(prefers-reduced-motion:reduce){.ck-b .fireplate .plate{animation:none}}',
  /* Fallback for the no-art case — the SVG flame the panel ships with today. */
  '.ck-b .fireplate .big{position:relative;line-height:1;margin-bottom:14px;',
  '  filter:drop-shadow(0 0 22px rgba(224,118,47,.6))}',
  '.ck-b .fireplate .big .ev-icon{width:84px;height:84px}',
  '.ck-b .fireplate .state{position:absolute;top:9px;left:12px;font-family:var(--num);',
  '  font-size:calc(10px*var(--tscale));letter-spacing:.18em;text-transform:uppercase;color:#f0c772;',
  '  text-shadow:0 1px 3px #000}',
  '.ck-b .hearth.out .fireplate .state{color:#e0917c}',

  /* ── the readout ── */
  '.ck-b .hbody{flex:1;min-width:0;padding:11px 13px 12px;display:flex;flex-direction:column}',
  '.ck-b .htop{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:9px}',
  '.ck-b .hclock{display:flex;flex-direction:column;line-height:1;flex:none}',
  '.ck-b .hclock b{font-family:var(--num);font-size:calc(28px*var(--tscale));line-height:1;',
  '  color:var(--gold-hi);font-variant-numeric:tabular-nums;font-weight:600;letter-spacing:-.5px}',
  '.ck-b .hclock i{font-style:normal;font-family:var(--num);font-size:calc(10px*var(--tscale));',
  '  letter-spacing:.16em;text-transform:uppercase;color:#8a7657;margin-top:6px}',
  '.ck-b .hgrow{flex:1;min-width:150px}',
  '.ck-b .hbag{font-family:var(--num);font-size:calc(12px*var(--tscale));color:#94805f;margin-bottom:6px}',
  '.ck-b .hbag b{color:#7ec8a0;font-weight:600}',
  '.ck-b .hgauge{height:7px;border-radius:4px;overflow:hidden;background:#0a0604;',
  '  box-shadow:inset 0 1px 3px rgba(0,0,0,.85)}',
  '.ck-b .hgauge i{display:block;height:100%;border-radius:4px}',
  '.ck-b .hbtns{display:flex;gap:6px;flex:none}',
  '.ck-b .hbtns .m-btn{white-space:nowrap}',

  /* ── the log shelf, horizontal, straight out of the modal ── */
  '.ck-b .shelf{display:flex;align-items:center;gap:6px;flex-wrap:wrap;',
  '  border-top:1px solid var(--trim-d);padding-top:9px;margin-top:auto}',
  '.ck-b .shelf .st{font-family:var(--num);font-size:calc(10px*var(--tscale));letter-spacing:.16em;',
  '  text-transform:uppercase;color:#8a7657;flex:none;margin-right:2px}',
  '.ck-b .log{display:inline-flex;align-items:center;gap:6px;padding:4px 5px 4px 7px;border-radius:6px;',
  '  background:#0c0704;box-shadow:inset 0 1px 2px rgba(0,0,0,.7);min-width:0}',
  '.ck-b .log>.ev-icon{width:19px;height:19px;flex:none}',
  '.ck-b .log .ln{font-family:var(--num);font-size:calc(11px*var(--tscale));color:var(--text);white-space:nowrap}',
  '.ck-b .log .ln s{text-decoration:none;color:#8a7657;font-size:calc(10px*var(--tscale))}',
  '.ck-b .log .lf{font-family:var(--num);font-size:calc(11px*var(--tscale));color:var(--ember);white-space:nowrap}',
  '.ck-b .log .lf.zero{color:#5f5140}',
  '.ck-b .log .add{background:#241906;border:1px solid var(--trim-d);border-radius:4px;',
  '  color:var(--trim);font-family:var(--num);font-size:calc(10.5px*var(--tscale));padding:2px 6px;',
  '  cursor:var(--cur-pointer);flex:none}',
  '.ck-b .log .add:hover{border-color:var(--trim);color:var(--gold-hi)}',
  '.ck-b .log .add:disabled{opacity:.3;cursor:var(--cur-na)}',

  /* ── grid4: same card, 108px less of it ── */
  '#activityGrid.ck-b4{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}',
  '@media(max-width:1240px){#activityGrid.ck-b4{grid-template-columns:repeat(3,minmax(0,1fr))}}',
  '@media(max-width:1000px){#activityGrid.ck-b4{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '.ck-b4 .ck-card{padding:7px 8px 7px 12px}',
  '.ck-b4 .ck-card .name{font-size:calc(14.5px*var(--tscale))}',
  '.ck-b4 .ck-card .act-icon{width:34px;height:34px}',
  '.ck-b4 .ck-card .act-icon svg{width:26px;height:26px}',
  '.ck-b4 .ck-hp{min-width:44px;padding-left:5px}',
  '.ck-b4 .ck-hp .v{font-size:calc(22px*var(--tscale))}',
  '.ck-b4 .ck-hp .t{font-size:calc(10px*var(--tscale))}',
  '.ck-b4 .ck-card .ck-row{flex-wrap:nowrap;overflow:hidden}',
  /* Three dishes carry a buff, and at four-up chip + chip + rate is ~15px wider
     than the card. Letting those rows wrap cost 80px of panel; clipping them lost
     the buff. Cheapest cut instead: INSTANT (the default, 16 of 19) and the buff
     DURATION go, the buff itself stays. '+2 STR' is why you cook Ogre Roast. */
  '.ck-b4 .ck-card .ck-row:has(.ck-buff) .ck-kind{display:none}',
  '.ck-b4 .ck-buff s{display:none}',
  '.ck-b4 .ck-card .ck-rate{font-size:calc(9.5px*var(--tscale))}',
  '.ck-b4 .ck-kind{font-size:calc(9px*var(--tscale));padding:1px 4px}',
  '.ck-b4 .ck-buff{font-size:calc(9px*var(--tscale));padding:1px 4px}',
  '.ck-b4 .ck-card .needs{gap:3px 4px}',
  '.ck-b4 .ck-card .needs .mat{font-size:calc(10.5px*var(--tscale));padding:1px 5px}',
  '.ck-b4 .ck-card .needs .mat svg{width:15px;height:15px}',
  '.ck-b4 .ck-card .needs .runs{font-size:calc(10.5px*var(--tscale))}',

  /* ── filtered: the strip ── */
  '.ck-b .ck-foot{grid-column:1/-1}',
  '.ck-b .ck-chips{display:flex;flex-wrap:wrap;gap:6px}',
  '.ck-b .ck-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 9px;border-radius:6px;',
  '  background:#160d07;box-shadow:inset 0 1px 2px rgba(0,0,0,.7);min-width:0}',
  '.ck-b .ck-chip>.ev-icon{width:18px;height:18px;flex:none}',
  '.ck-b .ck-chip .cn{font-family:var(--num);font-size:calc(11.5px*var(--tscale));color:#a08a64;white-space:nowrap}',
  '.ck-b .ck-chip .cn em{font-style:normal;color:#7f9e63}',
  '.ck-b .ck-chip .cw{font-family:var(--num);font-size:calc(10.5px*var(--tscale));color:#c07a62;white-space:nowrap}',
  '.ck-b .ck-chip.lock .cw{color:#7a6446}',
  '.ck-b .ck-all{margin-top:11px;background:transparent;border:1px dashed var(--trim-d);',
  '  border-radius:6px;color:#94805f;font-family:var(--num);',
  '  font-size:calc(11.5px*var(--tscale));padding:6px 12px;cursor:var(--cur-pointer);width:100%}',
  '.ck-b .ck-all:hover{border-color:var(--trim);color:var(--gold-hi)}'
  ].join('\n');
  document.head.appendChild(s);

  var _orig=renderActivities;
  renderActivities=function(){
    if(selectedSkill!=='cooking') return _orig.apply(this,arguments);
    var grid=$('activityGrid'); grid.innerHTML=''; grid.style.display='';
    grid.classList.add('ck-b');
    var R=CK.rows(), F=CK.fuel();

    var h=document.createElement('div');
    h.className='hearth '+F.status;
    var stateTxt=F.status==='burning'?'Burning':F.status==='stored'?'Banked · not lit':'Cold';
    var pct=F.burnSec>0?Math.max(4,Math.min(100,Math.round(F.burnSec/600*100))):0;
    var fill=F.status==='burning'?'linear-gradient(90deg,#e0762f,#ffd24a)'
            :F.status==='stored'?'linear-gradient(90deg,#2f6ea5,#5fa8e0)':'#3a1810';
    /* Three states, three plates. Below two minutes the fire is visibly dying,
       so it drops to the banked-ember art before it goes out entirely. */
    var art=(window.CK_FIRE||{});
    var plate = F.status==='out' ? art.cold
              : F.status==='stored' ? art.banked
              : (F.burnSec<120 ? art.banked : art.burning);

    var shelf='<span class="st">Log shelf</span>';
    F.rows.forEach(function(l){
      shelf+='<span class="log">'+iconHTML(l.id)
        +'<span class="ln">'+l.name.replace(/ Log$/,'')+' <s>'+l.per+'s</s></span>'
        +'<span class="lf'+(l.fire?'':' zero')+'">'+l.fire+'&#9656;</span>'
        +'<button class="add ck-nobubble" data-log="'+l.id+'"'+(l.bag?'':' disabled')
        +' title="'+l.bag+' in the satchel">+'+Math.min(l.bag,10)+'</button></span>';
    });
    if(!F.rows.length) shelf+='<span class="log"><span class="ln" style="color:#8a7657">No logs in the satchel</span></span>';

    h.innerHTML=
      '<div class="fireplate">'
      +(plate
         ? '<div class="plate" style="background-image:url('+plate+')"></div>'
         : '<div class="fx"></div><div class="big">'+iconHTML('firemaking')+'</div>')
      +'<div class="state">'+stateTxt+'</div></div>'
      +'<div class="hbody">'
      +'<div class="htop">'
        +'<div class="hclock"><b>'+CK.hms(F.burnSec)+'</b><i>in the fire</i></div>'
        +'<div class="hgrow"><div class="hbag">Satchel holds <b>'+CK.hms(F.bagSec)+'</b> more'
          +(F.mult<1?' &middot; burns '+Math.round((1-F.mult)*100)+'% slower':'')+'</div>'
        +'<div class="hgauge"><i style="width:'+pct+'%;background:'+fill+'"></i></div></div>'
        +'<div class="hbtns">'
        +(F.burnSec>0?(F.status==='burning'
            ?'<button class="m-btn ck-nobubble" id="tf" style="border-color:var(--red);color:var(--red)">Extinguish</button>'
            :'<button class="m-btn primary ck-nobubble" id="tf">'+iconHTML('ui_flame')+' Light Fire</button>')
          :'<button class="m-btn ck-nobubble" disabled>Load logs to light</button>')
        +'<button class="m-btn ck-nobubble" id="lall">Load all</button></div>'
      +'</div>'
      +'<div class="shelf">'+shelf+'</div>'
      +'</div>';
    grid.appendChild(h);
    var tf=h.querySelector('#tf'); if(tf) tf.addEventListener('click',toggleFire);
    h.querySelector('#lall').addEventListener('click',function(){
      F.rows.forEach(function(l){ if(l.bag) loadFuel(l.id,l.bag); });
      renderAll();
    });
    h.querySelectorAll('[data-log]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-log');
        loadFuel(id,Math.min(state.items[id]||0,10));
        renderAll();
      });
    });

    /* ── the list ───────────────────────────────────────────────────────────
       Nineteen chunky cards is a lot of panel however you slice it. Two levers,
       set by window._ckB:

         'grid3'    the original — three up, all nineteen. 7 rows.
         'grid4'    density — four up, all nineteen, nothing hidden. 5 rows.
                    Paid for with card width: the name drops 19.5px -> 17.3px and
                    the hero column narrows. Measured against "Bone Marrow Stew".
         'filtered' filtering — a full card is a thing you can CLICK, and a recipe
                    you have no ingredients for is not clickable. Those become one
                    line each naming the errand ("needs Wyrmscale + Cinder Gland"),
                    which is a plan; a dimmed card is not. "Show all" restores them.
    */
    var mode = window._ckB || 'grid3';
    if(mode.indexOf('grid4')===0) grid.classList.add('ck-b4');
    if(mode==='grid4filtered') mode='filtered';

    if(mode!=='filtered'){
      R.list.forEach(function(r){ grid.appendChild(CK.card(r)); });
      return;
    }

    var showAll=!!window._ckShowAll;
    var can  = R.list.filter(function(r){ return showAll || (!r.locked && r.mat>0); });
    var cant = showAll ? [] : R.list.filter(function(r){ return r.locked || r.mat<=0; });
    can.sort(function(a,b){ return b.food.hp-a.food.hp; });

    var lab=document.createElement('div');
    lab.className='ck-lab';
    lab.innerHTML='<span>'+(showAll?'Every dish':'Ready to cook')+'</span>'
      +'<span class="rt">'+can.length+' of '+R.list.length
      +(showAll?' recipes':' &middot; best heal first')+'</span>';
    grid.appendChild(lab);
    can.forEach(function(r){ grid.appendChild(CK.card(r)); });

    var foot=document.createElement('div');
    foot.className='ck-foot';
    var html='';
    if(cant.length){
      var chips='';
      cant.sort(function(a,b){ return a.need-b.need; }).forEach(function(r){
        var out=Object.keys(r.act.out)[0];
        var miss=Object.keys(r.act.inp||{}).filter(function(id){
          return (state.items[id]||0) < r.act.inp[id];
        }).map(function(id){ return (ITEMS[id]&&ITEMS[id].name)||id; });
        chips+='<span class="ck-chip'+(r.locked?' lock':'')+'">'+iconHTML(out)
          +'<span class="cn">'+(ITEMS[out]?ITEMS[out].name:r.act.name)
          +' <em>'+r.food.hp+' HP</em></span>'
          +'<span class="cw">'+(r.locked?('Lv '+r.need):('needs '+miss.join(' + ')))+'</span></span>';
      });
      html+='<div class="ck-lab"><span>Not yet</span><span class="rt">'
        +cant.length+' waiting on a level or an ingredient</span></div>'
        +'<div class="ck-chips">'+chips+'</div>';
    }
    html+='<button class="ck-all" type="button">'
      +(showAll?'Hide what I cannot cook':'Show all '+R.list.length+' recipes')+'</button>';
    foot.innerHTML=html;
    foot.querySelector('.ck-all').addEventListener('click',function(){
      window._ckShowAll=!showAll; renderActivities();
    });
    grid.appendChild(foot);
  };
})();

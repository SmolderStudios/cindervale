/* D · THE LARDER — stock first, cooking second.
   Nobody cooks for its own sake; you cook so there is food in the bag when the
   fight starts. So the panel opens with what is actually IN the larder and what
   that is worth in HP, and the recipes below are framed as topping it up. Same
   move the alchemy cabinet made: the thing you own leads, and crafting is the
   refill action underneath it. Recipes you cannot run collapse to a strip rather
   than filling half the panel with dead cards. */
(function(){
  var s=document.createElement('style');
  s.textContent=[
  '#activityGrid.ck-d{display:block}',

  /* ── the larder ── */
  '.ck-d .larder{background:linear-gradient(178deg,var(--lit-top),var(--lit-bot) 78%);',
  '  border:1px solid var(--trim-d);border-radius:10px;padding:11px 13px 12px;',
  '  box-shadow:var(--sh-2),inset 0 1px 0 var(--rim)}',
  '.ck-d .lhead{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:10px}',
  '.ck-d .lbig{display:flex;flex-direction:column;line-height:1;flex:none}',
  '.ck-d .lbig b{font-family:var(--num);font-size:calc(30px*var(--tscale));font-weight:600;color:#9ddc7a;',
  '  letter-spacing:-.6px;font-variant-numeric:tabular-nums lining-nums;',
  '  text-shadow:0 1px 0 rgba(0,0,0,.7),0 0 18px rgba(125,163,63,.22)}',
  '.ck-d .lbig i{font-style:normal;font-family:var(--num);font-size:calc(10px*var(--tscale));',
  '  letter-spacing:.18em;text-transform:uppercase;color:#8a7657;margin-top:6px}',
  '.ck-d .lsub{font-family:var(--num);font-size:calc(12px*var(--tscale));color:#94805f;',
  '  flex:1;min-width:170px;line-height:1.5}',
  '.ck-d .lsub b{color:var(--text);font-weight:600}',
  /* The fire lives inside the larder header, because the fire is the thing that
     stops the larder refilling — not a separate announcement above it. */
  '.ck-d .lfire{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:7px;',
  '  background:#0c0704;box-shadow:inset 0 1px 3px rgba(0,0,0,.8);flex:none}',
  '.ck-d .lfire>.ev-icon{width:24px;height:24px;flex:none}',
  '.ck-d .lfire .ft{font-family:var(--num);font-size:calc(12px*var(--tscale));color:var(--text);white-space:nowrap}',
  '.ck-d .lfire .ft b{color:var(--gold-hi);font-weight:600}',
  '.ck-d .lfire .ft s{display:block;text-decoration:none;color:#8a7657;font-size:calc(10.5px*var(--tscale))}',
  '.ck-d .lfire .ft s b{color:#7ec8a0}',
  '.ck-d .lfire .m-btn{white-space:nowrap;padding:4px 9px}',

  '.ck-d .stock{display:grid;grid-template-columns:repeat(auto-fill,minmax(212px,1fr));gap:7px}',
  '.ck-d .sitem{display:flex;align-items:center;gap:9px;padding:6px 9px;border-radius:7px;',
  '  background:#0c0704;box-shadow:inset 0 1px 2px rgba(0,0,0,.7),0 1px 0 rgba(214,170,96,.08);min-width:0}',
  '.ck-d .sitem>.ev-icon{width:25px;height:25px;flex:none}',
  '.ck-d .sitem .sn{flex:1;min-width:0}',
  '.ck-d .sitem .sn b{display:block;font-family:var(--num);font-size:calc(12px*var(--tscale));',
  '  color:var(--text);font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.ck-d .sitem .sn i{display:block;font-style:normal;font-family:var(--num);',
  '  font-size:calc(10px*var(--tscale));color:#8a7657;margin-top:2px;white-space:nowrap}',
  '.ck-d .sitem .sq{font-family:var(--num);font-size:calc(17px*var(--tscale));color:#9ddc7a;flex:none;',
  '  font-variant-numeric:tabular-nums}',
  '.ck-d .sempty{font-family:var(--num);font-size:calc(12.5px*var(--tscale));color:#8a7657;',
  '  font-style:italic;padding:10px 2px}',

  /* ── the refill ── */
  '.ck-d .refill{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;align-items:start}',
  '@media(max-width:1000px){.ck-d .refill{grid-template-columns:repeat(2,minmax(0,1fr))}}',

  /* Dishes you cannot cook collapse to a strip instead of a wall of dead cards. */
  '.ck-d .short{display:flex;flex-wrap:wrap;gap:6px}',
  '.ck-d .schip{display:inline-flex;align-items:center;gap:7px;padding:5px 9px;border-radius:6px;',
  '  background:#160d07;box-shadow:inset 0 1px 2px rgba(0,0,0,.7);min-width:0}',
  '.ck-d .schip>.ev-icon{width:18px;height:18px;flex:none}',
  '.ck-d .schip .cn{font-family:var(--num);font-size:calc(11.5px*var(--tscale));color:#a08a64;white-space:nowrap}',
  '.ck-d .schip .cn em{font-style:normal;color:#7f9e63}',
  '.ck-d .schip .cw{font-family:var(--num);font-size:calc(10.5px*var(--tscale));color:#c07a62;white-space:nowrap}',
  '.ck-d .schip.lock .cw{color:#7a6446}'
  ].join('\n');
  document.head.appendChild(s);

  var _orig=renderActivities;
  renderActivities=function(){
    if(selectedSkill!=='cooking') return _orig.apply(this,arguments);
    var grid=$('activityGrid'); grid.innerHTML=''; grid.style.display='block';
    grid.classList.add('ck-d');
    var R=CK.rows(), F=CK.fuel();

    /* ── what is in the larder right now ── */
    var held=[], bankedHp=0, meals=0;
    R.list.forEach(function(r){
      if(r.food.held>0){ held.push(r); bankedHp+=r.food.held*r.food.hp; meals+=r.food.held; }
    });
    held.sort(function(a,b){ return (b.food.held*b.food.hp)-(a.food.held*a.food.hp); });
    var maxHp = (typeof maxHpFromStats==='function' ? maxHpFromStats() : 0) || 100;

    var lard=document.createElement('div');
    lard.className='larder';
    var stock = held.length
      ? held.map(function(r){
          return '<div class="sitem">'+iconHTML(r.food.id)
            +'<span class="sn"><b>'+r.food.item.name+'</b>'
            +'<i>'+r.food.hp+' HP each &middot; '+fmtK(r.food.held*r.food.hp)+' banked</i></span>'
            +'<span class="sq">'+r.food.held+'</span></div>';
        }).join('')
      : '<div class="sempty">The larder is empty — cook something below.</div>';

    var fireTxt = F.status==='out'
      ? '<b style="color:#e0917c">Fire is out</b><s>Nothing cooks until it is lit</s>'
      : '<b>'+CK.hms(F.burnSec)+'</b> of fire<s><b>'+CK.hms(F.bagSec)+'</b> more in the satchel</s>';

    lard.innerHTML=
      '<div class="lhead">'
      +'<div class="lbig"><b>'+fmtK(bankedHp)+'</b><i>HP in the larder</i></div>'
      +'<div class="lsub"><b>'+meals+'</b> meals across <b>'+held.length+'</b> dishes — '
        +'<b>'+(bankedHp/maxHp).toFixed(1)+'&times;</b> your '+maxHp+' HP bar.</div>'
      +'<div class="lfire">'+iconHTML('firemaking')+'<span class="ft">'+fireTxt+'</span>'
      +(F.burnSec>0?(F.status==='burning'
          ?'<button class="m-btn ck-nobubble" id="tf" style="border-color:var(--red);color:var(--red)">Out</button>'
          :'<button class="m-btn primary ck-nobubble" id="tf">Light</button>'):'')
      +'<button class="m-btn ck-nobubble" id="lf">Logs</button></div>'
      +'</div>'
      +'<div class="stock">'+stock+'</div>';
    grid.appendChild(lard);
    var tf=lard.querySelector('#tf'); if(tf) tf.addEventListener('click',toggleFire);
    lard.querySelector('#lf').addEventListener('click',openFuelModal);

    /* ── cook to refill: only what you can actually run, best heal first ── */
    var can=R.list.filter(function(r){ return !r.locked && r.mat>0; })
                  .sort(function(a,b){ return b.food.hp-a.food.hp; });
    var cant=R.list.filter(function(r){ return r.locked || r.mat<=0; })
                   .sort(function(a,b){ return a.need-b.need; });

    var lab=document.createElement('div');
    lab.className='ck-lab';
    lab.innerHTML='<span>Cook to refill</span><span class="rt">'+can.length
      +' dishes you hold the ingredients for &middot; best heal first</span>';
    grid.appendChild(lab);

    var wrap=document.createElement('div'); wrap.className='refill';
    can.forEach(function(r){
      wrap.appendChild(CK.card(r,{rightLabel:(r.food.held?r.food.held+' held':'')}));
    });
    grid.appendChild(wrap);

    if(cant.length){
      var lab2=document.createElement('div');
      lab2.className='ck-lab';
      lab2.innerHTML='<span>Out of reach</span><span class="rt">'+cant.length
        +' dishes waiting on a level or an ingredient</span>';
      grid.appendChild(lab2);
      var strip=document.createElement('div'); strip.className='short';
      cant.forEach(function(r){
        var out=Object.keys(r.act.out)[0];
        var missing=Object.keys(r.act.inp||{}).filter(function(id){
          return (state.items[id]||0) < r.act.inp[id];
        }).map(function(id){ return (ITEMS[id]&&ITEMS[id].name)||id; });
        var why = r.locked ? ('Lv '+r.need) : ('needs '+missing.join(' + '));
        strip.innerHTML += '<span class="schip'+(r.locked?' lock':'')+'">'+iconHTML(out)
          +'<span class="cn">'+(ITEMS[out]?ITEMS[out].name:r.act.name)
          +' <em>'+r.food.hp+' HP</em></span>'
          +'<span class="cw">'+why+'</span></span>';
      });
      grid.appendChild(strip);
    }
  };
})();

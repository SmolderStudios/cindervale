/* C · TWO LARDERS — the ladder splits by where the ingredient comes from.
   Eight recipes are fed by Fishing, ten by combat drops, one by the sea. The
   shipped panel interleaves all three into one flat run of nineteen, so a player
   sitting on 340 sardines and no ogre tusks reads a wall of half-dead cards and
   cannot tell which errand fixes which half. Grouped — and sorted by heal inside
   each group — the panel answers "what can I cook right now, and if not, what do
   I go and get" in one look. */
(function(){
  var s=document.createElement('style');
  s.textContent=[
  '#activityGrid.ck-c{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;align-items:start}',
  '@media(max-width:1000px){#activityGrid.ck-c{grid-template-columns:repeat(2,minmax(0,1fr))}}',

  /* The fire keeps a bar, but a thin one — this direction is about the ladder. */
  '.ck-c .firestrip{grid-column:1/-1;display:flex;align-items:center;gap:11px;padding:8px 12px;',
  '  border-radius:8px;background:linear-gradient(135deg,#2a1608,#160c05 72%);border:1px solid #4a2a12;',
  '  box-shadow:inset 0 1px 0 rgba(224,118,47,.14),var(--sh-1)}',
  '.ck-c .firestrip.out{border-color:#5c2c20}',
  '.ck-c .firestrip>.ev-icon{width:26px;height:26px;flex:none}',
  '.ck-c .firestrip .fs-t{font-family:var(--num);font-size:calc(13px*var(--tscale));color:var(--text);',
  '  white-space:nowrap}',
  '.ck-c .firestrip .fs-t b{color:var(--gold-hi);font-weight:600}',
  '.ck-c .firestrip .fs-b{font-family:var(--num);font-size:calc(11.5px*var(--tscale));color:#94805f;',
  '  white-space:nowrap}',
  '.ck-c .firestrip .fs-b b{color:#7ec8a0;font-weight:600}',
  '.ck-c .firestrip .fs-g{flex:1;height:6px;border-radius:3px;background:#0a0604;overflow:hidden;',
  '  box-shadow:inset 0 1px 3px rgba(0,0,0,.85);min-width:60px}',
  '.ck-c .firestrip .fs-g i{display:block;height:100%;border-radius:3px}',
  '.ck-c .firestrip .m-btn{white-space:nowrap}'
  ].join('\n');
  document.head.appendChild(s);

  var GROUPS=[
    {key:'water', title:'From the water', icon:'fishing', note:'refilled by Fishing'},
    {key:'hunt',  title:'From the hunt',  icon:'ui_paw',  note:'refilled by Combat drops'},
    {key:'sea',   title:'Sea rations',    icon:'ui_anchor', note:'salt, egg and preserving'}
  ];

  var _orig=renderActivities;
  renderActivities=function(){
    if(selectedSkill!=='cooking') return _orig.apply(this,arguments);
    var grid=$('activityGrid'); grid.innerHTML=''; grid.style.display='';
    grid.classList.add('ck-c');
    var R=CK.rows(), F=CK.fuel();

    var strip=document.createElement('div');
    strip.className='firestrip '+F.status;
    var pct=F.burnSec>0?Math.max(4,Math.min(100,Math.round(F.burnSec/600*100))):0;
    var fill=F.status==='burning'?'linear-gradient(90deg,#e0762f,#ffd24a)'
            :F.status==='stored'?'linear-gradient(90deg,#2f6ea5,#5fa8e0)':'#3a1810';
    strip.innerHTML=iconHTML('firemaking')
      +'<span class="fs-t">'+(F.status==='out'?'Fire is <b>out</b>':'<b>'+CK.hms(F.burnSec)+'</b> of fire left')+'</span>'
      +'<span class="fs-g"><i style="width:'+pct+'%;background:'+fill+'"></i></span>'
      +'<span class="fs-b"><b>'+CK.hms(F.bagSec)+'</b> more in the satchel</span>'
      +(F.burnSec>0?(F.status==='burning'
          ?'<button class="m-btn ck-nobubble" id="tf" style="border-color:var(--red);color:var(--red)">Extinguish</button>'
          :'<button class="m-btn primary ck-nobubble" id="tf">Light Fire</button>'):'')
      +'<button class="m-btn ck-nobubble" id="lf">Load Logs</button>';
    grid.appendChild(strip);
    var tf=strip.querySelector('#tf'); if(tf) tf.addEventListener('click',toggleFire);
    strip.querySelector('#lf').addEventListener('click',openFuelModal);

    GROUPS.forEach(function(g){
      /* Heal order, not array order. Sorting by what the meal DOES is what makes
         the two inversions in the data visible: Troll Stew (Lv 60) out-heals
         Cooked Swordfish (Lv 62), and Drake Roast (Lv 72) out-heals Cooked Shark
         (Lv 75). On the shipped ladder each sits below the weaker meal. */
      var list=R.list.filter(function(r){ return r.src===g.key; })
                     .sort(function(a,b){ return b.food.hp-a.food.hp; });
      if(!list.length) return;
      var open=list.filter(function(r){ return !r.locked && r.mat>0; }).length;
      var lab=document.createElement('div');
      lab.className='ck-lab';
      lab.innerHTML=iconHTML(g.icon)+'<span>'+g.title+'</span>'
        +'<span class="rt">'+g.note+' &middot; <span class="'+(open?'can':'cant')+'">'
        +open+' of '+list.length+' cookable now</span></span>';
      grid.appendChild(lab);
      list.forEach(function(r){ grid.appendChild(CK.card(r)); });
    });
  };
})();

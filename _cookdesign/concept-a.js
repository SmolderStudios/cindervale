/* A · HEAL FIRST — the smallest possible change. Same grid, same fire bar, a
   rebuilt card. Nothing moves; the card just starts telling the truth about what
   it makes, and loses the two rows that were saying nothing. */
(function(){
  var s=document.createElement('style');
  s.textContent=[
  /* Three per row rather than four. The shipped four-up is 262px wide, which is
     narrower than "Bake Ship's Biscuit" — every long name wrapped, and a wrapped
     name is what made the card five rows tall. */
  '#activityGrid.ck-a{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;align-items:start}',
  '@media(max-width:1000px){#activityGrid.ck-a{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '.ck-a .cook-fire{grid-column:1/-1}',
  '.ck-a .cook-fire .cf-actions .m-btn i{font-style:normal;opacity:.72;margin-left:6px}'
  ].join('\n');
  document.head.appendChild(s);

  var _orig=renderActivities;
  renderActivities=function(){
    if(selectedSkill!=='cooking') return _orig.apply(this,arguments);
    var grid=$('activityGrid'); grid.innerHTML=''; grid.style.display='';
    grid.classList.add('ck-a');
    var R=CK.rows(), F=CK.fuel();

    /* The fire bar keeps its shape and gains the one number it was missing: what
       is still in the satchel. Four minutes in the fire while five and a half
       hours sit in the bag is not a status, it is a trap you cannot see. */
    var bar=document.createElement('div');
    bar.className='cook-fire '+F.status;
    var txt = F.status==='burning'
        ? '<span style="color:var(--green)">&#9679;</span> Burning &middot; '+CK.hms(F.burnSec)+' left'
      : F.status==='stored'
        ? '<span style="color:var(--blue)">&#9679;</span> Banked &middot; '+CK.hms(F.burnSec)+' ready — light it to cook'
        : '<span style="color:var(--red)">&#9679;</span> Fire is out — load logs and light it';
    var pct=F.burnSec>0?Math.max(4,Math.min(100,Math.round(F.burnSec/600*100))):0;
    var fill=F.status==='burning'?'linear-gradient(90deg,#e0762f,#ffd24a)'
            :F.status==='stored'?'linear-gradient(90deg,#2f6ea5,#5fa8e0)':'#3a1810';
    bar.innerHTML='<div class="cf-flame">'+iconHTML('firemaking')+'</div>'
      +'<div class="cf-body"><div class="cf-title">Cooking Fire</div>'
      +'<div class="cf-status">'+txt+'</div>'
      +'<div class="cf-gauge"><i style="width:'+pct+'%;background:'+fill+'"></i></div></div>'
      +'<div class="cf-actions">'
      +(F.burnSec>0?(F.status==='burning'
          ?'<button class="m-btn" id="tf" style="white-space:nowrap;border-color:var(--red);color:var(--red)">Extinguish</button>'
          :'<button class="m-btn primary" id="tf" style="white-space:nowrap">'+iconHTML('ui_flame')+' Light Fire</button>'):'')
      +'<button class="m-btn" id="lf">+ Load Logs <i>'+CK.hms(F.bagSec)+' in bag</i></button>'
      +'</div>';
    grid.appendChild(bar);
    var tf=bar.querySelector('#tf'); if(tf) tf.addEventListener('click',toggleFire);
    bar.querySelector('#lf').addEventListener('click',openFuelModal);

    R.list.forEach(function(r){ grid.appendChild(CK.card(r)); });
  };
})();

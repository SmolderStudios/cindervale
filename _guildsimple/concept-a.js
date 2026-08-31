/* A · THE HIRING HALL — the smallest thing that is still a guild.
   One screen. A row of slots. Each slot holds one helper, each helper works one
   gathering skill, and what they produce goes in your satchel while you do
   something else. Hire with gold, change their skill with a dropdown, dismiss them.

   Three nouns total — helper, slot, gold — and no second currency, no rank, no
   board, no shop. If guilds only ever get this far it is still a complete feature. */
(function(){
  var s=document.createElement('style');
  s.textContent=[
  '.gh-a .gh-slots{grid-template-columns:repeat(3,minmax(0,1fr))}'
  ].join('\n');
  document.head.appendChild(s);

  window.renderGuild=function(){
    var grid=$('activityGrid');
    grid.innerHTML='';
    grid.style.display='block';
    grid.className='activity-grid gh gh-a';

    var slots=GH.slots();
    var hired=GH.ROSTER.slice(0,Math.min(GH.ROSTER.length,slots));

    /* One line stating the whole rule. If this sentence needs a second one, the
       system is already too big. */
    var totalPerHr=0;
    hired.forEach(function(h){
      var o=GH.output(h.skill,h.lvl); if(o) totalPerHr+=o.perHr;
    });
    var lede=document.createElement('div');
    lede.className='gh-lede';
    lede.innerHTML=iconHTML('ui_paw')
      +'<span class="lt">Helpers work one skill for you at <b>a quarter of your own rate</b>, '
      +'even while you are doing something else. What they gather goes straight to your satchel.</span>'
      +'<span class="lg">'+fmtCoins(state.coins||0,true)+'</span>';
    grid.appendChild(lede);

    var lab=document.createElement('div');
    lab.className='gh-lab';
    lab.innerHTML='<span>Your helpers</span><span class="rt">'
      +hired.length+' of '+slots+' slots &middot; '+fmtK(totalPerHr)+' items an hour between them</span>';
    grid.appendChild(lab);

    var wrap=document.createElement('div');
    wrap.className='gh-slots';

    hired.forEach(function(h){
      var o=GH.output(h.skill,h.lvl);
      var c=document.createElement('div');
      c.className='gh-card';
      var opts=GH.WORKABLE.map(function(sk){
        return '<option value="'+sk+'"'+(sk===h.skill?' selected':'')+'>'+GH.skillName(sk)+'</option>';
      }).join('');
      c.innerHTML=
        '<div class="gh-top"><div class="gh-face">'+iconHTML(h.skill)+'</div>'
        +'<div class="gh-nm"><b>'+h.name+'</b><i>with you '+h.since+'</i></div>'
        +'<span class="gh-lvl">Lv '+h.lvl+'</span></div>'
        +(o?'<div class="gh-out">'+iconHTML(o.itemId)
            +'<span><span class="ov">'+fmtK(o.perHr)+'</span> '
            +'<span class="ok">'+o.itemName+' / hr</span></span></div>':'')
        +'<select class="gh-pick">'+opts+'</select>'
        +'<button class="gh-btn">Dismiss <i>refunds half</i></button>';
      wrap.appendChild(c);
    });

    for(var i=hired.length;i<slots;i++){
      var cost=GH.HIRE_COST[i]||GH.HIRE_COST[GH.HIRE_COST.length-1];
      var e=document.createElement('div');
      e.className='gh-card empty';
      e.innerHTML='<div class="gh-empty"><b>Empty slot</b>Someone to work a skill while you work another.</div>'
        +'<button class="gh-btn pri"'+((state.coins||0)>=cost?'':' disabled')+'>Hire <i>'+fmtCoins(cost,true)+'</i></button>';
      wrap.appendChild(e);
    }

    /* Locked slots are shown, not hidden — one dashed card is the whole progression
       message, and it costs nothing to read. */
    for(var j=slots;j<5;j++){
      var l=document.createElement('div');
      l.className='gh-card locked';
      l.innerHTML='<div class="gh-empty"><b>Slot '+(j+1)+'</b>Opens at '+((j)*150)+' total level.</div>';
      wrap.appendChild(l);
    }

    grid.appendChild(wrap);
  };
})();

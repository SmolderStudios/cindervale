/* C · HELPERS AND ONE JOB — A, plus a single standing request.
   Not a contract BOARD. One job at a time, chosen for you, refreshing daily. Your
   helpers' output counts toward it on its own, so it is a reason to check in rather
   than a thing to manage.

   One new noun (the job) and one new verb (hand it in). The reward is gold and the
   occasional helper level, so it feeds the only system already here rather than
   introducing a second currency. */
(function(){
  var s=document.createElement('style');
  s.textContent=[
  '.gh-c .gh-job{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:10px;',
  '  background:linear-gradient(178deg,#33240f,#1b1208 78%);border:1px solid #7a5a1a;',
  '  box-shadow:var(--sh-2),inset 0 1px 0 var(--rim);margin-bottom:12px;flex-wrap:wrap}',
  '.gh-c .gj-ic{width:46px;height:46px;flex:none;border-radius:10px;background:#150e06;',
  '  box-shadow:inset 0 2px 6px rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center}',
  '.gh-c .gj-ic .ev-icon{width:30px;height:30px}',
  '.gh-c .gj-t{flex:1;min-width:190px}',
  '.gh-c .gj-t b{display:block;font-family:\'Cinzel\',serif;font-size:calc(17px*var(--tscale));',
  '  color:var(--gold-hi);line-height:1.15}',
  '.gh-c .gj-t i{display:block;font-style:normal;font-family:var(--num);',
  '  font-size:calc(11.5px*var(--tscale));color:#94805f;margin-top:4px}',
  '.gh-c .gj-t i em{font-style:normal;color:#7ec8a0}',
  '.gh-c .gj-prog{flex:1;min-width:190px}',
  '.gh-c .gj-prog .pr{display:flex;justify-content:space-between;align-items:baseline;',
  '  font-family:var(--num);font-size:calc(12px*var(--tscale));color:#94805f;margin-bottom:5px}',
  '.gh-c .gj-prog .pr b{color:var(--text);font-weight:600}',
  '.gh-c .gj-bar{height:8px;border-radius:4px;background:#0a0604;overflow:hidden;',
  '  box-shadow:inset 0 1px 3px rgba(0,0,0,.85)}',
  '.gh-c .gj-bar i{display:block;height:100%;border-radius:4px;',
  '  background:linear-gradient(90deg,var(--ember),#ffd24a)}',
  '.gh-c .gj-btn{flex:none}',
  '.gh-c .gj-btn .gh-btn{width:auto;padding:9px 18px;white-space:nowrap}',
  '.gh-c .gh-slots{grid-template-columns:repeat(3,minmax(0,1fr))}'
  ].join('\n');
  document.head.appendChild(s);

  window.renderGuild=function(){
    var grid=$('activityGrid');
    grid.innerHTML='';
    grid.style.display='block';
    grid.className='activity-grid gh gh-c';

    var slots=GH.slots();
    var hired=GH.ROSTER.slice(0,Math.min(GH.ROSTER.length,slots));

    var lede=document.createElement('div');
    lede.className='gh-lede';
    lede.innerHTML=iconHTML('ui_paw')
      +'<span class="lt">Helpers work one skill for you at <b>a quarter of your own rate</b>, '
      +'even while you are doing something else. What they gather counts toward the guild’s '
      +'standing job on its own.</span>'
      +'<span class="lg">'+fmtCoins(state.coins||0,true)+'</span>';
    grid.appendChild(lede);

    /* One job. Not a board — a board is a list of things to compare, which is a
       decision, which is the complexity this direction is trying not to have. */
    var have=state.items['oak_log']||0, need=500;
    var pct=Math.min(100,Math.round(have/need*100));
    var job=document.createElement('div');
    job.className='gh-job';
    job.innerHTML=
      '<div class="gj-ic">'+iconHTML('oak_log')+'</div>'
      +'<div class="gj-t"><b>This week: 500 Oak Logs</b>'
      +'<i>Pays <em>'+fmtCoins(4500000,true)+'</em> and a level for one helper &middot; new job every Monday</i></div>'
      +'<div class="gj-prog"><div class="pr"><span><b>'+fmtK(have)+'</b> of '+need+' delivered</span>'
      +'<span>'+pct+'%</span></div>'
      +'<div class="gj-bar"><i style="width:'+pct+'%"></i></div></div>'
      +'<div class="gj-btn"><button class="gh-btn'+(have>=need?' pri':'')+'"'
      +(have>=need?'':' disabled')+'>'+(have>=need?'Hand it in':'Keep gathering')+'</button></div>';
    grid.appendChild(job);

    var totalPerHr=0;
    hired.forEach(function(h){ var o=GH.output(h.skill,h.lvl); if(o) totalPerHr+=o.perHr; });

    var lab=document.createElement('div');
    lab.className='gh-lab';
    lab.innerHTML='<span>Your helpers</span><span class="rt">'
      +hired.length+' of '+slots+' slots &middot; '+fmtK(totalPerHr)+' items an hour between them</span>';
    grid.appendChild(lab);

    var wrap=document.createElement('div');
    wrap.className='gh-slots';
    hired.forEach(function(h){
      var o=GH.output(h.skill,h.lvl);
      var opts=GH.WORKABLE.map(function(sk){
        return '<option value="'+sk+'"'+(sk===h.skill?' selected':'')+'>'+GH.skillName(sk)+'</option>';
      }).join('');
      var c=document.createElement('div');
      c.className='gh-card';
      c.innerHTML=
        '<div class="gh-top"><div class="gh-face">'+iconHTML(h.skill)+'</div>'
        +'<div class="gh-nm"><b>'+h.name+'</b><i>with you '+h.since+'</i></div>'
        +'<span class="gh-lvl">Lv '+h.lvl+'</span></div>'
        +(o?'<div class="gh-out">'+iconHTML(o.itemId)
            +'<span><span class="ov">'+fmtK(o.perHr)+'</span> '
            +'<span class="ok">'+o.itemName+' / hr</span></span></div>':'')
        +'<select class="gh-pick">'+opts+'</select>'
        +'<button class="gh-btn">Dismiss</button>';
      wrap.appendChild(c);
    });
    for(var i=hired.length;i<slots;i++){
      var cost=GH.HIRE_COST[i]||2500;
      var e=document.createElement('div');
      e.className='gh-card empty';
      e.innerHTML='<div class="gh-empty"><b>Empty slot</b>Someone to work a skill while you work another.</div>'
        +'<button class="gh-btn pri">Hire <i>'+fmtCoins(cost,true)+'</i></button>';
      wrap.appendChild(e);
    }
    grid.appendChild(wrap);
  };
})();

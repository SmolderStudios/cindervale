/* B · THREE GUILDS — A, plus the one thing that makes them guilds rather than a
   staffing agency: which guild a helper belongs to.

   Three guilds, not seven. Each owns a group of skills, has its own slots, and has
   a rank that rises just from its helpers working. Rank gives that guild's skills a
   small passive — yours as well as theirs.

   That is exactly one new noun on top of A (rank), and it is a bar that fills on
   its own. No reputation to spend, no shop, no board, no rivalry. */
(function(){
  var s=document.createElement('style');
  s.textContent=[
  '.gh-b .gh-guild{background:linear-gradient(178deg,var(--lit-top),var(--lit-bot) 78%);',
  '  border:1px solid var(--trim-d);border-radius:10px;padding:0;overflow:hidden;',
  '  box-shadow:var(--sh-2),inset 0 1px 0 var(--rim);margin-bottom:11px}',
  '.gh-b .gg-head{display:flex;align-items:center;gap:12px;padding:11px 13px;',
  '  border-bottom:1px solid var(--trim-d);background:#0e0805}',
  '.gh-b .gg-head>.ev-icon{width:28px;height:28px;flex:none}',
  '.gh-b .gg-t{flex:1;min-width:0}',
  '.gh-b .gg-t b{display:block;font-family:\'Cinzel\',serif;font-size:calc(16px*var(--tscale));',
  '  color:var(--gold-hi);line-height:1.15}',
  '.gh-b .gg-t i{display:block;font-style:normal;font-family:var(--num);',
  '  font-size:calc(11px*var(--tscale));color:#8a7657;margin-top:3px}',
  /* Rank is a bar that fills itself. Nothing to spend, nothing to choose. */
  '.gh-b .gg-rank{flex:none;width:250px}',
  '.gh-b .gg-rank .rr{display:flex;justify-content:space-between;align-items:baseline;',
  '  gap:10px;font-family:var(--num);font-size:calc(11px*var(--tscale));color:#94805f;margin-bottom:5px}',
  '.gh-b .gg-rank .rr em{text-align:right;line-height:1.35}',
  '.gh-b .gg-rank .rr b{color:var(--trim);font-weight:600}',
  '.gh-b .gg-rank .rr em{font-style:normal;color:#7ec8a0}',
  '.gh-b .gg-bar{height:6px;border-radius:3px;background:#0a0604;overflow:hidden;',
  '  box-shadow:inset 0 1px 3px rgba(0,0,0,.85)}',
  '.gh-b .gg-bar i{display:block;height:100%;border-radius:3px;',
  '  background:linear-gradient(90deg,var(--ember),#f0a050)}',
  '.gh-b .gg-body{padding:11px 13px 12px}',
  '.gh-b .gh-slots{grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}',
  '.gh-b .gh-card{padding:10px 11px 11px}'
  ].join('\n');
  document.head.appendChild(s);

  /* Three, covering everything a helper can do. A fourth would need a fourth kind
     of work, and there isn't one. */
  var GUILDS=[
    {key:'gather', name:'Gatherers’ Guild', icon:'woodcutting', rank:3, pct:62,
     blurb:'Woodcutting · Mining · Fishing · Foraging',
     perk:'+3% gathering speed per rank — for you as well as them',
     skills:['woodcutting','mining','fishing','foraging'], slots:3,
     roster:[{name:'Bram Hollow',skill:'woodcutting',lvl:3,since:'4d'},
             {name:'Sera Vance', skill:'mining',     lvl:2,since:'2d'}]},
    {key:'field',  name:'Fieldhands’ Guild', icon:'farming', rank:1, pct:24,
     blurb:'Farming · Fishing',
     perk:'+2% crop yield per rank',
     skills:['farming','fishing'], slots:2,
     roster:[{name:'Odd Tomlin',skill:'fishing',lvl:1,since:'6h'}]},
    {key:'hearth', name:'Hearthwardens', icon:'cooking', rank:0, pct:0,
     blurb:'Cooking · Firemaking',
     perk:'Cooking fire burns 5% slower per rank',
     skills:['cooking','firemaking'], slots:2, locked:true, need:'Cooking Lv 40',
     roster:[]},
  ];

  window.renderGuild=function(){
    var grid=$('activityGrid');
    grid.innerHTML='';
    grid.style.display='block';
    grid.className='activity-grid gh gh-b';

    var lede=document.createElement('div');
    lede.className='gh-lede';
    lede.innerHTML=iconHTML('ui_paw')
      +'<span class="lt">Each guild takes helpers for its own skills and works them at '
      +'<b>a quarter of your rate</b>. Its rank rises as they work, and every rank gives '
      +'that guild’s skills a small bonus &mdash; <b>yours too</b>.</span>'
      +'<span class="lg">'+fmtCoins(state.coins||0,true)+'</span>';
    grid.appendChild(lede);

    GUILDS.forEach(function(g){
      var box=document.createElement('div');
      box.className='gh-guild'+(g.locked?' locked':'');
      if(g.locked) box.style.opacity='.5';

      var head='<div class="gg-head">'+iconHTML(g.icon)
        +'<div class="gg-t"><b>'+g.name+'</b><i>'+g.blurb+'</i></div>'
        +'<div class="gg-rank"><div class="rr"><span>Rank <b>'+g.rank+'</b></span>'
        +'<em>'+(g.locked?'needs '+g.need:g.perk.replace(/ &mdash;.*| —.*/,''))+'</em></div>'
        +'<div class="gg-bar"><i style="width:'+g.pct+'%"></i></div></div></div>';

      var cards='';
      g.roster.forEach(function(h){
        var o=GH.output(h.skill,h.lvl);
        var opts=g.skills.map(function(sk){
          return '<option value="'+sk+'"'+(sk===h.skill?' selected':'')+'>'+GH.skillName(sk)+'</option>';
        }).join('');
        cards+='<div class="gh-card">'
          +'<div class="gh-top"><div class="gh-face">'+iconHTML(h.skill)+'</div>'
          +'<div class="gh-nm"><b>'+h.name+'</b><i>with you '+h.since+'</i></div>'
          +'<span class="gh-lvl">Lv '+h.lvl+'</span></div>'
          +(o?'<div class="gh-out">'+iconHTML(o.itemId)
              +'<span><span class="ov">'+fmtK(o.perHr)+'</span> '
              +'<span class="ok">'+o.itemName+' / hr</span></span></div>':'')
          +'<select class="gh-pick">'+opts+'</select>'
          +'<button class="gh-btn">Dismiss</button></div>';
      });
      for(var i=g.roster.length;i<g.slots;i++){
        var cost=GH.HIRE_COST[i]||2500;
        cards+='<div class="gh-card empty">'
          +'<div class="gh-empty"><b>Empty slot</b>'
          +(g.locked?'Unlocks with the guild.':'Hire someone for this guild’s skills.')+'</div>'
          +'<button class="gh-btn'+(g.locked?'':' pri')+'"'+(g.locked?' disabled':'')+'>'
          +(g.locked?'Locked':'Hire <i>'+fmtCoins(cost,true)+'</i>')+'</button></div>';
      }

      box.innerHTML=head+'<div class="gg-body"><div class="gh-slots">'+cards+'</div></div>';
      grid.appendChild(box);
    });
  };
})();

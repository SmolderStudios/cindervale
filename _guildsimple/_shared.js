/* Shared model for the SIMPLE guild directions.
   The two earlier passes had contract boards, rank-up events, guild shops, a Patron
   slot, your own Lodge, standing and rivalries, expeditions and masterwork projects
   — seven guilds and about thirty new nouns. This one has three nouns:

     HELPER    someone who works one skill for you while you do something else
     SLOT      somewhere to put a helper
     GOLD      what a helper costs

   Everything below is built from those. Nothing here is shipped code. */
window.GH = (function(){

  /* A helper works ONE skill and produces a fraction of what you would produce
     doing it yourself, at your own level, using your own tools and tree. That is
     the whole formula — it means a helper is worth more as you get better, needs
     no separate balance table, and can be explained in one line on screen. */
  var SHARE = 0.25;

  /* Skills a helper can be put on. Gathering only, deliberately: a helper who can
     run Smithing needs an ingredient supply, which is a second system. Gatherers
     just produce. */
  var WORKABLE = ['woodcutting','mining','fishing','foraging','farming'];

  /* Demo roster. Real ones would be state.helpers[]. */
  var ROSTER = [
    {name:'Bram Hollow',  skill:'woodcutting', lvl:3, since:'4d'},
    {name:'Sera Vance',   skill:'mining',      lvl:2, since:'2d'},
    {name:'Odd Tomlin',   skill:'fishing',     lvl:1, since:'6h'},
  ];

  /* Same unit as state.coins, which the header renders as gold at /100 — so these
     read 2,500g / 8,000g / 22,000g / 60,000g / 150,000g on screen. */
  var HIRE_COST = [250000, 800000, 2200000, 6000000, 15000000];

  /* What a helper actually produces per hour, from the player's own best unlocked
     action in that skill — so the number on screen is a real number. */
  function output(skill, helperLvl){
    var sk = SKILLS[skill];
    if(!sk || !sk.acts || !sk.acts.length) return null;
    var lvl = levelFromXp(state.xp[skill]||0);
    var best = null;
    for(var i=0;i<sk.acts.length;i++){
      var a = sk.acts[i];
      if((a.lvl||1) <= lvl && a.out && Object.keys(a.out).length) best = a;
    }
    if(!best) return null;
    var r = ratesFor(best, skill);
    /* +5% per helper level, so a helper visibly improves without a second table. */
    var mult = SHARE * (1 + (helperLvl-1)*0.05);
    var outId = Object.keys(best.out)[0];
    return {
      act: best, itemId: outId,
      itemName: (ITEMS[outId]&&ITEMS[outId].name)||outId,
      perHr: Math.max(1, Math.round(r.rph * mult)),
      xpHr:  Math.max(1, Math.round(r.xph * mult)),
      share: mult
    };
  }

  function skillName(s){ return (SKILLS[s]&&SKILLS[s].name)||s; }

  /* How many slots you have. Tied to total level so it arrives on its own rather
     than being another thing to shop for. */
  function slots(){
    var total=0;
    for(var k in SKILLS) total += levelFromXp(state.xp[k]||0);
    return Math.max(1, Math.min(5, 1 + Math.floor(total/150)));
  }

  return {SHARE:SHARE, WORKABLE:WORKABLE, ROSTER:ROSTER, HIRE_COST:HIRE_COST,
          output:output, skillName:skillName, slots:slots};
})();

/* Shared chrome. Every direction uses the same card, so the comparison is about
   how much SYSTEM each one adds, not about which mockup got the nicer card. */
(function(){
  var s=document.createElement('style');
  s.textContent=[
  '#activityGrid.gh{display:block}',

  '.gh-lede{display:flex;align-items:center;gap:11px;padding:10px 13px;border-radius:9px;',
  '  background:linear-gradient(178deg,var(--lit-top),var(--lit-bot) 78%);',
  '  border:1px solid var(--trim-d);box-shadow:var(--sh-1),inset 0 1px 0 var(--rim);',
  '  margin-bottom:11px}',
  '.gh-lede>.ev-icon{width:30px;height:30px;flex:none}',
  '.gh-lede .lt{flex:1;min-width:0;font-family:var(--num);',
  '  font-size:calc(12.5px*var(--tscale));color:#94805f;line-height:1.5}',
  '.gh-lede .lt b{color:var(--text);font-weight:600}',
  '.gh-lede .lg{font-family:var(--num);font-size:calc(11.5px*var(--tscale));',
  '  color:var(--trim);flex:none;white-space:nowrap}',

  '.gh-lab{display:flex;align-items:center;gap:9px;font-family:var(--num);',
  '  font-size:calc(11px*var(--tscale));letter-spacing:.14em;text-transform:uppercase;',
  '  color:#8a7657;margin:14px 0 8px}',
  '.gh-lab::after{content:"";flex:1;height:1px;',
  '  background:linear-gradient(90deg,var(--trim-d),transparent);order:1}',
  '.gh-lab .rt{order:2;flex:none;color:var(--muted);letter-spacing:.04em;',
  '  text-transform:none;font-size:calc(10.5px*var(--tscale))}',

  /* ── the helper card ── chunky, one per slot, everything on its face ── */
  '.gh-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:start}',
  '@media(max-width:1000px){.gh-slots{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '.gh-card{background:linear-gradient(178deg,var(--lit-top),var(--lit-bot) 78%);',
  '  border:1px solid var(--trim-d);border-radius:9px;padding:11px 12px 12px;',
  '  box-shadow:var(--sh-1),inset 0 1px 0 var(--rim);min-width:0}',
  '.gh-card.empty{border-style:dashed;background:none;box-shadow:none}',
  '.gh-card.locked{opacity:.45;border-style:dashed;background:none;box-shadow:none}',
  '.gh-top{display:flex;align-items:center;gap:10px;margin-bottom:9px;min-width:0}',
  '.gh-face{width:38px;height:38px;flex:none;border-radius:9px;background:#150e06;',
  '  box-shadow:inset 0 2px 6px rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center}',
  '.gh-face .ev-icon{width:24px;height:24px}',
  '.gh-nm{flex:1;min-width:0}',
  '.gh-nm b{display:block;font-family:\'Cinzel\',serif;font-size:calc(15px*var(--tscale));',
  '  color:var(--gold-hi);line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.gh-nm i{display:block;font-style:normal;font-family:var(--num);',
  '  font-size:calc(10.5px*var(--tscale));color:#8a7657;margin-top:3px}',
  '.gh-lvl{font-family:var(--num);font-size:calc(11px*var(--tscale));color:var(--trim);',
  '  flex:none;border:1px solid var(--trim-d);border-radius:4px;padding:2px 7px}',

  /* The one number that matters: what this helper puts in your bag every hour. */
  '.gh-out{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:7px;',
  '  background:#0c0704;box-shadow:inset 0 1px 3px rgba(0,0,0,.8);margin-bottom:9px}',
  '.gh-out>.ev-icon{width:24px;height:24px;flex:none}',
  '.gh-out .ov{font-family:var(--num);font-size:calc(19px*var(--tscale));color:#9ddc7a;',
  '  font-weight:600;line-height:1;font-variant-numeric:tabular-nums}',
  '.gh-out .ok{font-family:var(--num);font-size:calc(11px*var(--tscale));color:#8a7657;',
  '  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',

  '.gh-pick{width:100%;margin-bottom:8px}',
  '.gh-btn{width:100%;display:block;font-family:\'Cinzel\',serif;border-radius:6px;',
  '  cursor:var(--cur-pointer);border:1px solid var(--trim-d);',
  '  background:linear-gradient(180deg,#3a2a15,#241906);color:var(--text);',
  '  padding:7px 12px;font-size:calc(13.5px*var(--tscale));transition:filter .12s,border-color .12s}',
  '.gh-btn:hover:not(:disabled){border-color:var(--trim);color:var(--gold-hi)}',
  '.gh-btn.pri{background:linear-gradient(180deg,#e88a3c,#c25e18);border-color:#7a3a0e;',
  '  color:#1a0f06;font-weight:700;box-shadow:0 2px 0 #6a3209}',
  '.gh-btn.pri:hover:not(:disabled){filter:brightness(1.07);color:#1a0f06}',
  '.gh-btn:disabled{opacity:.42;cursor:var(--cur-na)}',
  '.gh-btn i{font-style:normal;font-family:var(--num);font-size:calc(11px*var(--tscale));',
  '  opacity:.75;margin-left:6px;font-weight:400}',
  '.gh-empty{font-family:var(--num);font-size:calc(12.5px*var(--tscale));color:#8a7657;',
  '  text-align:center;padding:16px 8px 14px;line-height:1.6}',
  '.gh-empty b{display:block;color:var(--text);font-size:calc(13.5px*var(--tscale));margin-bottom:4px}'
  ].join('\n');
  document.head.appendChild(s);
})();

/* Shared vocabulary for every cooking concept.
   All four directions draw the SAME card and the SAME numbers — they differ by
   frame only, so the comparison is about layout rather than about which mockup
   happened to get the nicer card. */
window.CK = (function(){

  /* The fact the shipped panel never states: what the meal actually does.
     16 of 19 are an instant heal, 3 are heal-over-time, 3 carry a stat buff. */
  function food(act){
    var outId = Object.keys(act.out||{})[0];
    var it = ITEMS[outId] || {};
    var p = it.potion || {};
    var kind = p.heal ? 'instant' : (p.regen ? 'regen' : 'none');
    var buff = '';
    if(p.buff){
      buff = Object.keys(p.buff).filter(function(k){return k!=='dur';})
        .map(function(k){return '+'+p.buff[k]+' '+k.toUpperCase();}).join(' ');
    }
    return {id:outId, item:it, hp:(p.heal||p.regen||0), kind:kind, dur:p.regenDur||0,
            buff:buff, buffDur:p.buff?p.buff.dur:0, held:state.items[outId]||0,
            sell:it.sell||0};
  }

  /* Every fuel the player owns, plus the number the modal hides: what the whole
     satchel is worth in burn-seconds. */
  function fuel(){
    var loaded = (state.cookingFire&&state.cookingFire.loaded)||{};
    var rows=[], loadSec=0, bagSec=0;
    for(var i=0;i<LOG_TIER_ORDER.length;i++){
      var id=LOG_TIER_ORDER[i], per=LOG_BURN_SEC[id];
      var inFire=loaded[id]||0, inBag=state.items[id]||0;
      loadSec += inFire*per; bagSec += inBag*per;
      if(inFire||inBag) rows.push({id:id,per:per,fire:inFire,bag:inBag,
        name:(ITEMS[id]&&ITEMS[id].name)||id});
    }
    return {rows:rows, loadSec:loadSec, bagSec:bagSec, status:fireStatus(),
            burnSec:fireBurnSec(), mult:(typeof fuelBurnMult==='function'?fuelBurnMult():1)};
  }

  /* Where the ingredients come from. 8 recipes are fed by Fishing, 10 by combat
     drops, 1 by both — two supply chains interleaved in one flat ladder. */
  var FISH=['raw_minnow','raw_sardine','raw_trout','raw_tuna','raw_salmon',
            'raw_swordfish','raw_shark','raw_voideel'];
  var SEA=['rock_salt','gull_egg'];
  function source(act){
    var ks=Object.keys(act.inp||{});
    var f=ks.filter(function(k){return FISH.indexOf(k)>=0;}).length;
    var s=ks.filter(function(k){return SEA.indexOf(k)>=0;}).length;
    if(s) return 'sea';
    if(f===ks.length) return 'water';
    if(f===0) return 'hunt';
    return 'sea';
  }

  function reqLvl(act){ return act.id==='co8' ? highFishUnlockLevel() : act.lvl; }

  /* One row of truth per recipe, so every concept ranks and gates identically. */
  function rows(){
    var lvl=levelFromXp(state.xp.cooking), m=mods('cooking'), out=[];
    SKILLS.cooking.acts.forEach(function(act,i){
      var need=reqLvl(act);
      var r=ratesFor(act,'cooking');
      var mat=act.inp?canAfford(act,Infinity,m):Infinity;
      var fu=cookingFuelCyclesLeft(act,'cooking');
      out.push({act:act, i:i, need:need, locked:lvl<need,
        ms:r.ms, xph:r.xph, rph:r.rph,
        mat:mat, fuel:fu, runs:Math.min(mat,fu),
        food:food(act), src:source(act),
        active: !!(state.action&&state.action.skill==='cooking'&&state.action.actId===act.id)});
    });
    return {lvl:lvl, m:m, list:out};
  }

  /* HP per hour — cooking's real throughput. The shipped panel prints an
     ellipsised "Cooked Swordfish…/hr" in this slot, which compares nothing. */
  function hpPerHour(r){ return Math.round(r.rph*r.food.hp); }

  /* fmtDuration() stops at minutes, so a fire loaded with the satchel's own logs
     reports "345m 51s" in the shipped panel. Roll to hours. */
  function hms(sec){
    sec=Math.max(0,Math.round(sec));
    if(sec<60) return sec+'s';
    if(sec<3600){ var m=Math.floor(sec/60), s=sec%60; return s?m+'m '+s+'s':m+'m'; }
    var h=Math.floor(sec/3600), mm=Math.round(sec%3600/60);
    if(mm===60){ h++; mm=0; }
    return mm?h+'h '+mm+'m':h+'h';
  }

  function kindPill(f){
    if(f.kind==='regen')   return '<span class="ck-kind regen">over '+f.dur+'s</span>';
    if(f.kind==='instant') return '<span class="ck-kind">instant</span>';
    return '';
  }
  function buffPill(f){
    return f.buff ? '<span class="ck-buff">'+f.buff+' &middot; '+f.buffDur+'s</span>' : '';
  }

  /* ── THE CARD ──────────────────────────────────────────────────────────────
     Three rows, not five. The shipped card spends one row on an ellipsised
     "Cooked Swordfish…/hr" and another on 19 copies of "Mastery 0"; both come
     off, and what the meal HEALS takes the hero slot that xp/hr held.
       row 1  name .................................. Lv N
       row 2  [instant] [+2 STR · 60s] ... 84.7k xp/hr · 100.7k HP/hr
       row 3  ingredient chips ....................... 25 runs
       hero   270 HP / 9.6s
  */
  function card(r,opt){
    opt=opt||{};
    var a=r.act, f=r.food, out=Object.keys(a.out)[0];
    var fireOut=!fireIsLit();
    var dead=(!r.locked && r.mat<=0 && !r.active) || (fireOut && !r.active);
    var b=document.createElement('button');
    b.className='act ck-card'+(r.active?' active':'')+(dead?' depleted':'')
      +((r.locked||dead)?' dis':'');

    var pipTot=tierCountForSkill('cooking'), pipIdx=tierIndexForAct(SKILLS.cooking,a);
    var pips='<span class="act-pips">'+Array.from({length:pipTot},function(_,i){
      return '<i'+(i<pipIdx?' class="on"':'')+'></i>';}).join('')+'</span>';

    /* "3 runs" was ambiguous between out-of-ingredients and out-of-fuel — two
       completely different errands. Name the limit that is actually binding. */
    var runs='', runsCls='';
    if(r.locked)          { runs=''; }
    else if(r.mat<=0)     { runs='no ingredients'; runsCls=' none'; }
    else if(r.fuel<r.mat) { runs=iconHTML('ui_flame')+' '+r.fuel+' runs'; runsCls=' fuelcap'; }
    else                  { runs=(r.mat===Infinity?'&infin;':fmtK(r.mat))+' runs'; }

    var mats='';
    for(var id in (a.inp||{})){
      var need=a.inp[id], have=state.items[id]||0;
      mats+='<span class="mat'+(have<need?' miss':'')+'" data-tip="'
        +((ITEMS[id]&&ITEMS[id].name)||id)+' — '+need+' per cook, '+have+' held">'
        +iconHTML(id)+'<b>'+fmtK(have)+'</b><span class="sl">/'+need+'</span></span>';
    }

    /* "Lv 25" on a recipe you unlocked forty levels ago is a column of noise
       that costs every card ~50px of name width. Show it only while it gates. */
    var right = opt.rightLabel!==undefined ? opt.rightLabel
              : (r.locked ? 'Lv '+r.need : '');

    b.innerHTML=
      '<div class="act-stripe" style="background:'+tierStripeColor(pipIdx)+'"></div>'
     +'<div class="act-icon">'+iconHTML(out)+pips
       +(r.locked?'<span class="lock-pip">'+iconHTML('ui_lock')+'</span>':'')+'</div>'
     +'<div class="act-body">'
       +'<div class="act-head"><span class="name">'
         +(ITEMS[out]?ITEMS[out].name:a.name)+'</span>'
         +'<span class="act-tier">'+right+'</span></div>'
       +(r.locked
          ? '<span class="meta">Unlocks at Lv '+r.need+'</span>'
          : '<div class="ck-row">'+kindPill(f)+buffPill(f)
            +'<span class="ck-rate"><b>'+fmtK(r.xph)+'</b> xp/hr</span></div>')
       +'<div class="needs'+(r.locked?' needs-locked':'')+'">'+mats
         +(runs?'<span class="runs'+runsCls+'">'+runs+'</span>':'')+'</div>'
       +(r.active?'<div class="prog"><i></i></div>':'')
     +'</div>'
     +(r.locked
        ? '<div class="ck-hp"><span class="v dim">'+f.hp+'</span><span class="k">HP</span></div>'
        : '<div class="ck-hp"><span class="v">'+f.hp+'</span><span class="k">HP</span>'
          +'<span class="t">'+(r.ms/1000).toFixed(1)+'s</span></div>');

    if(!r.locked && !dead){
      b.addEventListener('click',function(e){
        if(e.target.closest('.ck-nobubble')) return;
        setAction('cooking',a.id); renderAll();
      });
    }
    return b;
  }

  return {food:food,fuel:fuel,source:source,rows:rows,card:card,
          hpPerHour:hpPerHour,hms:hms,kindPill:kindPill,buffPill:buffPill,reqLvl:reqLvl};
})();

/* Shared CSS — the heal vocabulary and the compact card. Each concept adds only
   its own frame rules on top. */
(function(){
  var s=document.createElement('style');
  s.textContent = [
  '.ck-kind{font-family:var(--num);font-size:calc(10px*var(--tscale));letter-spacing:.1em;',
  '  text-transform:uppercase;color:#8a7657;border-radius:3px;padding:1px 5px;background:#0c0704;',
  '  box-shadow:inset 0 1px 2px rgba(0,0,0,.7),0 1px 0 rgba(214,170,96,.08);white-space:nowrap}',
  '.ck-kind.regen{color:#7ec8a0}',
  '.ck-buff{font-family:var(--num);font-size:calc(10px*var(--tscale));letter-spacing:.06em;',
  '  color:#e8b45c;border-radius:3px;padding:1px 5px;background:#221604;white-space:nowrap;',
  '  box-shadow:inset 0 1px 2px rgba(0,0,0,.7),0 0 0 1px rgba(224,150,60,.28)}',

  /* Green is already the heal colour everywhere else in the game — the HP bar,
     the food toasts — so the hero number borrows it rather than inventing a
     fifth accent beside gold, ember, blue and red. */
  '.ck-hp{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;',
  '  flex:0 0 auto;min-width:52px;text-align:right;padding-left:8px}',
  '.ck-hp .v{font-size:calc(25px*var(--tscale));line-height:1;font-weight:600;color:#9ddc7a;',
  '  letter-spacing:-.5px;font-variant-numeric:tabular-nums lining-nums;',
  '  text-shadow:0 1px 0 rgba(0,0,0,.7),0 0 16px rgba(125,163,63,.22)}',
  '.ck-hp .v.dim{color:#5f7a4a;text-shadow:none}',
  '.ck-hp .k{font-size:calc(9.5px*var(--tscale));letter-spacing:2px;text-transform:uppercase;',
  '  color:#8a7657;margin-top:4px}',
  '.ck-hp .t{font-size:calc(10.5px*var(--tscale));color:#8a7657;margin-top:5px;',
  '  font-variant-numeric:tabular-nums;white-space:nowrap}',

  /* Three rows only, and nothing in them wraps. A wrapped name is what made the
     shipped card five rows tall at four-up. */
  '.ck-card{padding:7px 10px 7px 13px}',
  '.ck-card .act-body{gap:3px}',
  '.ck-card .name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
  '.ck-card .act-head{gap:8px;align-items:baseline}',
  '.ck-card .act-tier{white-space:nowrap;flex:none}',
  '.ck-card .ck-row{display:flex;align-items:center;gap:5px;min-width:0;flex-wrap:wrap}',
  '.ck-card .ck-rate{font-family:var(--num);font-size:calc(11px*var(--tscale));color:#94805f;',
  '  margin-left:auto;white-space:nowrap;font-variant-numeric:tabular-nums;flex:none}',
  '.ck-card .ck-rate b{color:var(--ember);font-weight:600}',
  '.ck-card .needs{margin-top:0;align-items:center}',
  '.ck-card .needs .runs{margin-left:auto;color:#8a7657;white-space:nowrap;',
  '  display:inline-flex;align-items:center;gap:3px}',
  '.ck-card .needs .runs .ev-icon{width:12px;height:12px}',
  '.ck-card .needs .runs.fuelcap{color:var(--ember);font-weight:600}',
  '.ck-card .needs .runs.none{color:#e0917c;font-weight:600}',

  '.ck-lab{display:flex;align-items:center;gap:9px;font-family:var(--num);',
  '  font-size:calc(11px*var(--tscale));letter-spacing:.14em;text-transform:uppercase;',
  '  color:#8a7657;margin:13px 0 7px;grid-column:1/-1}',
  '.ck-lab::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--trim-d),transparent);order:1}',
  '.ck-lab .rt{order:2;flex:none;color:var(--muted);letter-spacing:.04em;text-transform:none;',
  '  font-size:calc(10.5px*var(--tscale))}',
  '.ck-lab .can{color:#7ec8a0} .ck-lab .cant{color:#e0917c}',
  '.ck-lab .ev-icon{width:15px;height:15px;flex:none}'
  ].join('\n');
  document.head.appendChild(s);
})();

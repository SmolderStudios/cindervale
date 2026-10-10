/* The Magic design page: shell, helpers, sections 00 to 07. Sections 08 on are
   in page2.js. Text lives here; every number comes in through `c` from
   results.json and design.js. */
'use strict';

/* regions cut from the full-window captures: x, y, width, height */
exports.CROP = { tree: [408, 96, 1064, 762] };

const CSS = `
:root{
  /* Sixth document in the series. Charts were blue, soil green, glassware violet,
     the hearth ember, the bow verdigris. A rune is stone with a light in the cut:
     cold slate for the page, old gold for the mark. */
  --ground:#eff0f3; --surface:#ffffff; --sunk:#e3e5ea;
  --rule:#cdd0d8; --rule-hi:#aeb3bf;
  --ink:#14161d; --body:#3d414c; --dim:#676c79;
  --acc:#4b3fa6; --gold:#8a6410;
  --bad:#9a321c; --good:#3f6a24; --warn:#7d6210;
  --frame-sh:0 2px 4px rgba(20,22,29,.10), 0 22px 48px rgba(20,22,29,.16);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ground:#0e0f13; --surface:#17191f; --sunk:#12141a;
    --rule:#272a33; --rule-hi:#3a3e4a;
    --ink:#e8eaf0; --body:#b2b6c2; --dim:#7f8492;
    --acc:#a99cf5; --gold:#d6b25e;
    --bad:#d8694c; --good:#93c05a; --warn:#dcc060;
    --frame-sh:0 2px 4px rgba(0,0,0,.6), 0 22px 48px rgba(0,0,0,.5);
  }
}
:root[data-theme="dark"]{
  --ground:#0e0f13; --surface:#17191f; --sunk:#12141a; --rule:#272a33; --rule-hi:#3a3e4a;
  --ink:#e8eaf0; --body:#b2b6c2; --dim:#7f8492; --acc:#a99cf5; --gold:#d6b25e;
  --bad:#d8694c; --good:#93c05a; --warn:#dcc060;
  --frame-sh:0 2px 4px rgba(0,0,0,.6), 0 22px 48px rgba(0,0,0,.5);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--ground); color:var(--body); margin:0;
  font-family:'Public Sans',-apple-system,'Segoe UI',sans-serif;
  font-size:15px; line-height:1.62; font-variant-numeric:tabular-nums lining-nums; -webkit-font-smoothing:antialiased}
.w{max-width:1180px; margin:0 auto; padding:0 32px}
.wide{max-width:1380px; margin:0 auto; padding:0 32px}
h1,h2,h3,h4{font-family:'Fraunces','Iowan Old Style',Georgia,serif; color:var(--ink); margin:0; text-wrap:balance; font-weight:600; letter-spacing:-.01em}
p{margin:0}
b{font-weight:600; color:var(--ink)}
code{font-family:'JetBrains Mono',ui-monospace,Consolas,monospace; font-size:.86em; color:var(--acc)}
a{color:var(--acc)}
.mast{padding:60px 0 34px; border-bottom:1px solid var(--rule)}
.eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); margin-bottom:18px}
.mast h1{font-size:clamp(34px,5vw,54px); line-height:1.04; max-width:17ch}
.mast .lede{margin-top:20px; max-width:70ch; font-size:16.5px}
.mast .lede + .lede{margin-top:13px}
.toc{display:flex; flex-wrap:wrap; gap:6px 8px; margin-top:26px}
.toc a{font-family:'JetBrains Mono',monospace; font-size:11.5px; text-decoration:none; color:var(--body); border:1px solid var(--rule); border-radius:3px; padding:4px 9px; background:var(--surface)}
.toc a:hover{border-color:var(--acc); color:var(--acc)}
.toc a i{font-style:normal; color:var(--dim); margin-right:6px}
section{padding:52px 0; border-bottom:1px solid var(--rule)}
.shead{display:flex; align-items:baseline; gap:16px; margin-bottom:24px; flex-wrap:wrap}
.shead .num{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--dim); letter-spacing:.1em; padding-top:6px; flex:0 0 auto}
.shead h2{font-size:27px; line-height:1.2}
.shead .sub{margin-left:auto; font-size:13px; color:var(--dim); text-align:right; max-width:44ch}
h3.sh{font-size:19px; margin:34px 0 4px}
p.lead{max-width:78ch}
p.lead + p.lead{margin-top:11px}
.metrics{display:grid; grid-template-columns:repeat(auto-fit,minmax(196px,1fr)); gap:1px; background:var(--rule); border:1px solid var(--rule); border-radius:3px; overflow:hidden}
.metric{background:var(--surface); padding:19px 21px}
.metric .k{font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.11em; text-transform:uppercase; color:var(--dim); margin-bottom:10px}
.metric .v{font-family:'Fraunces',Georgia,serif; font-size:29px; line-height:1; color:var(--ink); font-weight:600}
.metric .v.alarm{color:var(--bad)} .metric .v.ok{color:var(--good)}
.metric .n{font-size:12.5px; color:var(--dim); margin-top:8px; line-height:1.45}
.pillars{display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:1px; background:var(--rule); border:1px solid var(--rule); border-radius:3px; overflow:hidden}
.pillar{background:var(--surface); padding:24px 24px 26px}
.pillar.pick{box-shadow:inset 0 3px 0 var(--acc)}
.pillar .tag{font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.13em; text-transform:uppercase; color:var(--dim); display:block; margin-bottom:9px}
.pillar.pick .tag{color:var(--acc)}
.pillar h3{font-size:20px; margin-bottom:9px}
.pillar p{font-size:14px; max-width:44ch}
.pillar p + p{margin-top:9px}
.tbl{margin-top:20px; border:1px solid var(--rule); border-radius:3px; overflow:hidden; background:var(--surface)}
.tbl .scroll{overflow-x:auto}
.tbl table{width:100%; border-collapse:collapse; font-size:13.3px; min-width:640px}
.tbl th{font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--dim); text-align:left; padding:10px 14px; border-bottom:1px solid var(--rule); font-weight:500; background:var(--sunk); white-space:normal; line-height:1.4; vertical-align:bottom}
.tbl td{padding:8px 14px; border-bottom:1px solid var(--rule); vertical-align:top}
.tbl tr:last-child td{border-bottom:0}
.tbl .m{font-family:'JetBrains Mono',monospace; font-size:12.3px; color:var(--ink); white-space:nowrap}
.tbl .d{color:var(--dim); font-size:12.6px}
.tbl .mw{font-family:'JetBrains Mono',monospace; font-size:12.1px; color:var(--ink)}
.tbl .neww{font-family:'JetBrains Mono',monospace; font-size:12.1px; color:var(--acc); font-weight:500}
.tbl .nm{color:var(--ink); font-weight:600; white-space:nowrap}
.tbl .new{color:var(--acc); font-family:'JetBrains Mono',monospace; font-size:12.3px; white-space:nowrap; font-weight:500}
.tbl .has{color:var(--good); font-family:'JetBrains Mono',monospace; font-size:12px}
.tbl .bad{color:var(--bad); font-family:'JetBrains Mono',monospace; font-size:12.3px; white-space:nowrap}
.tbl tr.rule-top td{border-top:2px solid var(--rule-hi)}
.tbl tr.grp td{background:var(--sunk); font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--dim); padding:6px 14px}
.tblnote{font-size:12.8px; color:var(--dim); margin-top:10px; max-width:84ch}
.facts{margin-top:20px; display:grid; gap:1px; background:var(--rule); border:1px solid var(--rule); border-radius:3px; overflow:hidden}
.fact{background:var(--surface); padding:14px 20px; display:grid; grid-template-columns:150px 1fr; gap:18px; align-items:start}
.fact .lb{font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.06em; color:var(--acc); padding-top:3px; text-transform:uppercase}
.fact > div > b{display:block}
.fact > div > span{display:block; font-size:13.5px; color:var(--dim); margin-top:2px; max-width:86ch}
.phases{margin-top:20px; display:grid; gap:1px; background:var(--rule); border:1px solid var(--rule); border-radius:3px; overflow:hidden}
.phase{background:var(--surface); padding:18px 22px; display:grid; grid-template-columns:52px 1fr 210px; gap:20px; align-items:start}
.phase .ph{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--dim); letter-spacing:.1em; padding-top:4px}
.phase h4{font-size:17px; margin-bottom:5px}
.phase p{font-size:13.6px; color:var(--dim); max-width:66ch}
.phase .ship{font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--gold); text-align:right; line-height:1.7; padding-top:4px}
.ask{display:grid; gap:1px; background:var(--rule); border:1px solid var(--rule); border-radius:3px; overflow:hidden; margin-top:20px}
.ask > div{background:var(--surface); padding:17px 22px}
.ask > div > b{color:var(--ink); display:block; margin-bottom:3px; font-weight:600}
.ask > div > span{font-size:13.8px; color:var(--dim); display:block; max-width:86ch}
.ask > div > i{font-style:normal; color:var(--acc); font-family:'JetBrains Mono',monospace; font-size:12.4px; display:block; margin-top:6px}
.ask > div > u{text-decoration:none; color:var(--gold); font-family:'JetBrains Mono',monospace; font-size:12.4px; display:block; margin-top:3px}
.callout{margin-top:20px; border-left:3px solid var(--warn); background:var(--sunk); padding:16px 22px; border-radius:0 3px 3px 0}
.callout.ok{border-left-color:var(--good)}
.callout > b{display:block; margin-bottom:4px}
.callout p{font-size:13.8px; color:var(--dim); max-width:84ch}
.callout p + p{margin-top:7px}
.fig{margin:22px 0 0; border:1px solid var(--rule); border-radius:4px; overflow:hidden; background:#120d08; box-shadow:var(--frame-sh)}
.fig img{display:block; width:100%; height:auto}
.fig figcaption{background:var(--surface); border-top:1px solid var(--rule); padding:12px 18px; font-size:13.4px; color:var(--dim)}
.fig figcaption b{display:inline; margin-right:6px}
.figrow{display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:18px; margin-top:22px; align-items:start}
.figrow .fig{margin:0}
.figrow.four{grid-template-columns:repeat(auto-fit,minmax(230px,272px)); justify-content:start}
.checks{margin-top:20px; border:1px solid var(--rule); border-radius:3px; overflow:hidden; background:var(--surface)}
.checks div{display:grid; grid-template-columns:54px 1fr; gap:10px; padding:7px 16px; border-bottom:1px solid var(--rule); font-size:13.2px}
.checks div:last-child{border-bottom:0}
.checks .ok{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--good); padding-top:2px}
.checks .no{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--bad); padding-top:2px}
.checks i{font-style:normal; color:var(--dim); font-family:'JetBrains Mono',monospace; font-size:11.8px; margin-left:8px}
.el{display:inline-flex; align-items:center; gap:5px; white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:12px}
.el::before{content:''; width:8px; height:8px; border-radius:50%; background:var(--c)}
.prov{font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--warn); border:1px solid var(--warn); border-radius:3px; padding:0 5px; margin-left:6px; white-space:nowrap; vertical-align:1px}
.meas{font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--good); border:1px solid var(--good); border-radius:3px; padding:0 5px; margin-left:6px; white-space:nowrap; vertical-align:1px}
details.fold{margin-top:16px; border:1px solid var(--rule); border-radius:3px; background:var(--surface)}
details.fold > summary{cursor:pointer; padding:11px 16px; font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--acc)}
details.fold[open] > summary{border-bottom:1px solid var(--rule)}
details.fold .tbl{margin:0; border:0; border-radius:0}
.game{font-family:'Fraunces',Georgia,serif; color:var(--ink); background:var(--sunk); border:1px solid var(--rule); border-radius:3px; padding:1px 7px; font-size:.95em; white-space:nowrap}
.tbl .game, .fact .game, .fig .game{white-space:normal}
.foot{padding:38px 0 68px; font-size:13px; color:var(--dim)}
.foot p{max-width:84ch} .foot p + p{margin-top:8px}
@media(max-width:820px){
  .phase{grid-template-columns:44px 1fr} .phase .ship{grid-column:2; text-align:left; padding-top:8px}
  .fact{grid-template-columns:1fr; gap:4px} .shead .sub{margin-left:0; text-align:left}
  .w,.wide{padding:0 18px}
}
`;

/* ── helpers ───────────────────────────────────────────────────────────────── */
function mk(c) {
  const h = {};
  h.esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h.n = x => Math.round(x).toLocaleString('en-GB');
  h.f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  h.f2 = x => (Math.round(x * 100) / 100).toFixed(2);
  h.pct = (a, b) => h.f1(a / b * 100) + '%';
  h.cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  h.elc = {}; c.MD.ELEMENTS.forEach(e => { h.elc[e.k] = e.col; });
  h.el = k => k ? `<span class="el" style="--c:${h.elc[k]}">${h.cap(k)}</span>` : '<span class="d">none</span>';
  /* table: head = array of strings, rows = array of arrays of [text, class] or text */
  h.tbl = (head, rows, opt) => {
    opt = opt || {};
    const tr = r => {
      if (r && r.grp) return `<tr class="grp"><td colspan="${head.length}">${r.grp}</td></tr>`;
      const cls = r && r.cls ? ` class="${r.cls}"` : '';
      const cells = (r.cells || r).map((x, i) => {
        const v = Array.isArray(x) ? x[0] : x, k = Array.isArray(x) ? x[1] : (opt.cls && opt.cls[i]) || '';
        return `<td${k ? ` class="${k}"` : ''}>${v === undefined || v === null ? '' : v}</td>`;
      }).join('');
      return `<tr${cls}>${cells}</tr>`;
    };
    return `<div class="tbl"><div class="scroll"><table${opt.min ? ` style="min-width:${opt.min}px"` : ''}><thead><tr>${head.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(tr).join('')}</tbody></table></div></div>`;
  };
  h.fig = (id, cap) => {
    const s = c.shots[id]; if (!s) return `<div class="callout"><b>missing capture: ${id}</b></div>`;
    return `<figure class="fig" style="max-width:${s.w}px"><img alt="" width="${s.w}" height="${s.h}" src="${s.src}"><figcaption>${cap}</figcaption></figure>`;
  };
  h.sec = (num, id, title, sub, body, wide) => `<section class="${wide ? 'wide' : 'w'}" id="${id}"><div class="shead"><span class="num">${num}</span><h2>${title}</h2><span class="sub">${sub}</span></div>${body}</section>`;
  h.facts = rows => `<div class="facts">${rows.map(r => `<div class="fact"><span class="lb">${r[0]}</span><div><b>${r[1]}</b><span>${r[2]}</span></div></div>`).join('')}</div>`;
  h.prov = '<span class="prov">provisional</span>';
  h.meas = '<span class="meas">measured</span>';
  h.inp = o => Object.keys(o || {}).map(k => `${k} &times;${o[k]}`).join(' + ');
  return h;
}

/* ── sections 00 to 07 ─────────────────────────────────────────────────────── */
function partA(c, h) {
  const { R, MD } = c, T = R.tables, P = R.consts.P;
  const out = [];
  const allRows = R.parity.concat(R.parityRS);
  const lo = Math.min(...allRows.map(x => x.lo)), hi = Math.max(...allRows.map(x => x.hi));
  const fin = R.upkeep.map(u => u.rows[3]), neu = R.upkeep.map(u => u.rows[0]);
  const rg = (a, k) => `${Math.min(...a.map(x => x[k]))} to ${Math.max(...a.map(x => x[k]))}`;
  const wallS = R.walls.filter(x => x.label === 'staff (Dawnveil)'), wallB = R.walls.filter(x => x.label === 'bow (Sunweave)');
  c.sum = { lo, hi, fin, neu, rg };

  /* ── masthead ── */
  out.push(`<div class="w mast">
  <div class="eyebrow">Cindervale Idle &middot; design proposal &middot; measured against build ${R.build} &middot; nothing here is in the game</div>
  <h1>Magic chooses how it hurts</h1>
  <p class="lede">Melee and Ranged hit with whatever they are holding. A mage picks one of four elements for the fight, and how big a spell to cast with it: sixteen spells, Fire Bolt to Shadow Surge. Each element does a different job, every monster is weak to one of them, and a bigger spell spends more runes and hits harder. That is the whole proposal. The rest of this page is what it takes to make it true in every place the game reads a weapon, a damage stat or a combat level.</p>
  <p class="lede">The design was built as a working prototype laid over build ${R.build} without editing it, and a simulator asked the game's own functions for every number below: <b>${R.checks.length} checks, ${R.checks.filter(x => !x.ok).length} failing</b>. The mock-ups in section 11 are that prototype photographed in the real game. Anything that was not simulated says <span class="prov">provisional</span>.</p>
  <div class="callout ok" style="margin-top:22px"><b>Third draft. What changed since the first.</b>
  <p><b style="display:inline">The spell bar.</b> You said the spell has to be easy to pick in combat. It is now eight buttons under your own health bar, four sizes and four elements, each about 46 px tall, and they work while the fight runs: press one and it applies from your next cast. Section 11 has it in a fight, mid-switch and in a raid. Question 7 has the one thing that leaves open.</p>
  <p><b style="display:inline">Spells come in four sizes.</b> You asked for more than four spells: each element now has a Bolt, a Blast, a Wave and a Surge, which spend one to four runes a cast and hit harder as they grow. Section 04 opens with them, section 11 has the buttons, and question 17 is the call.</p>
  <p><b style="display:inline">A batch of runes is bigger, and a correction.</b> The first draft read a finished mage's rune bill at Agility 1. A finished mage has Agility 99 and casts a third more often, which put the bill a third higher than I said and the staff just under the band. A batch is now ${MD.RUNE_BATCH} runes for each rune the biggest spell spends (it was 25), every rune table is read at the Agility the character would have, and the real-monster fights are run at the fighter's own Agility. The weapon maths, the best in slot table and the Spire wall did not move.</p>
  <p><b style="display:inline">One rename.</b> The fast Magic style was called Surge. It is Swift now, because Surge is a spell.</p></div>
  <div class="toc">${[['00', 'today', 'What is there today'], ['01', 'identity', 'Identity'], ['02', 'skill', 'The skill'], ['03', 'cast', 'How a cast resolves'], ['04', 'elements', 'Spells and elements'], ['05', 'weapons', 'Weapons'], ['06', 'armour', 'Robes'], ['07', 'runes', 'Runes'], ['08', 'runecrafting', 'Runecrafting'], ['09', 'chain', 'Crafting chain'], ['10', 'drops', 'Drops'], ['11', 'ui', 'Combat UI'], ['12', 'plugs', 'What it plugs into'], ['13', 'saves', 'Saves'], ['14', 'balance', 'Balance'], ['15', 'art', 'Icons and bytes'], ['16', 'order', 'Build order'], ['17', 'decide', 'What I need you to decide']].map(x => `<a href="#${x[1]}"><i>${x[0]}</i>${x[2]}</a>`).join('')}</div>
</div>

<section class="w" style="padding:34px 0">
  <div class="metrics">
    <div class="metric"><div class="k">Weapon maths</div><div class="v ok">${lo} to ${hi}%</div><div class="n">of melee and of every ranged weapon, weapon alone, at Lv 20, 50, 75 and 99 and on the five rows <code>_rangedsim.js</code> prints. The band is 95 to 105.</div></div>
    <div class="metric"><div class="k">Finished mage</div><div class="v ok">${R.bestSummary.staffVsBow}%</div><div class="n">of the finished archer at Defence 500, everything on, in the shape of <code>_rangedstr.js</code>. ${R.bestSummary.staffVsBow1000}% at 1000.</div></div>
    <div class="metric"><div class="k">Spire wall</div><div class="v ok">${wallS[0].lethal} and ${wallS[1].lethal}</div><div class="n">plain and fully ascended. The archer's is ${wallB[0].lethal} and ${wallB[1].lethal}. Lethality is the limit in both, the four-minute floor is ${wallS[0].slow} and ${wallS[1].slow}.</div></div>
    <div class="metric"><div class="k">Spells</div><div class="v ok">16</div><div class="n">Four sizes of each element: Bolt, Blast, Wave, Surge, spending 1 to 4 runes a cast. Each size down saves a rune and costs ${R.sizeSummary.steps[0]} to ${R.sizeSummary.steps[1]}% of the hit.</div></div>
    <div class="metric"><div class="k">Rune bill, finished</div><div class="v ok">${rg(fin, 'staff')} min</div><div class="n">of making runes per hour of casting the biggest spell with a staff, at Agility 99. A wand is ${rg(fin, 'wand')}. A finished archer pays ${rg(fin, 'bow')} for arrows.</div></div>
    <div class="metric"><div class="k">Existing saves</div><div class="v ok">0 moved</div><div class="n">${h.n(R.level.seen)} saves tried against the new combat level formula. A pure mage, archer and fighter all reach ${R.level.mage99}.</div></div>
  </div>
</section>`);

  /* ── 00 ── */
  const ench8 = R.reagents.cost[8];
  out.push(h.sec('00', 'today', 'What is there today', `Checked against <code>cindervale.html</code> at build ${R.build}, not against notes.`,
    h.facts([
      ['The stub', 'Magic is a label, an icon and a tile that says Soon.', '<code>COMBAT_STAT_NAME</code> has the word, a painted <code>magic</code> stat icon is in the item art, and <code>COMBAT_LOADOUTS</code> has a tile flagged <code>soon</code> that the Presets tab draws. <code>state.combatXp</code> has no magic key and <code>COMBAT_STATS</code> has no entry.'],
      ['Dead markup', 'The locked Magic pill in the combat panel never reaches the screen.', '<code>renderCombat</code> still builds it (<code>baseStatPill</code>, with Ranged locked beside it) into <code>statsBlock</code>, which becomes <code>statsCard</code>, which nothing places (the name appears once in the file, where it is declared). The live readout is the one line under the Training buttons that says Ranged and "equip a bow to train it".'],
      ['Damage types', `All ${R.elements.total} monsters are weak to slash, stab or crush. None is weak to a bow.`, `<code>DMG_TYPES</code> is slash, stab, crush, ranged. ${R.elements.melee.weak} of ${R.elements.total} monsters have a melee weakness and ${R.elements.melee.resist} resist a melee type. The four <code>weakTo:'ranged'</code> rows are the Aerie birds, behind <code>AERIE_LIVE</code>, so in the live game a sword with the right edge gets +15% everywhere and a bow gets it nowhere. The 27 raid stages and nine Spire monsters follow the same three types.`],
      ['Enchanting', `One enchant on tier 8 gear costs ${ench8.arcane_dust} Arcane Dust, ${ench8.rune_fragment} Rune Fragments and ${ench8.mana_essence} Mana Essence.`, `A maxed character makes about ${R.reagents.dustHr} Arcane Dust an hour in Alchemy, brews ${R.reagents.essenceBrewHr} Mana Essence, and finds <b style="display:inline">${R.reagents.fragment.perHr} Rune Fragments an hour</b> (${R.reagents.fragment.how}). Fragments are the scarce one: a single tier 8 enchant is about twelve hours of mining. Section 09 shows what Magic takes from this pool, which is nothing a player would notice.`],
      ['No sink', 'Thirteen materials are used by nothing.', 'The audit lists them by name: Runed Bone, Drakeforged Rune, Riftshard and Barrow Dust from the raids, charcoal from every fire past Firemaking 12, Energy Crystal, Stamina Shard, Ember Resin, Golden Spore, Abyssal Scale, Void Essence, Goblin Ear and Splintered Club. Magic gives four of them a use, and gives Spider Silk, which one Alchemy poultice uses today, something to be farmed for.'],
      ['Armour', 'There is no cloth to fight in.', 'Plate is Crafting on bars, leather is Crafting on hides and carries the <code>light</code> flag that makes it the ranged line. The crafted ladder is seven tiers, with three raid tiers above it for both.'],
      ['Combat Mastery', 'The key <code>magic</code> is Warfare, and the board is exactly full.', 'Onslaught, Marksman, Bulwark and Warfare are 30 points each, with three 4 point bridges: 132. A finished character can earn exactly 132 (98 levels, 4 milestones, 9 bosses, 12 zones, 4 raids, 5 Spire floors), and the audit asserts the two numbers match. A fifth column has to bring its own points.'],
      ['Ranged gaps', 'Five things Ranged shipped without, which Magic would inherit.', '<b style="display:inline">Offline combat spends no arrows:</b> <code>offlineCombatResolve</code> has no ammunition in it at all. <b style="display:inline">The arena has no quiver readout:</b> the first sign a quiver is empty is the fight stopping. <b style="display:inline">The save slot shows the wrong combat level for an archer:</b> <code>mmSummary</code> still averages the four melee stats. <b style="display:inline">A Hawkeye Draught shows nothing in the effects bar.</b> <b style="display:inline">A guild quest cannot ask for a Ranged level:</b> <code>gdReqMet</code> knows only the four melee stat names. Each is the same function Magic has to touch, so each is cheaper fixed for both at once.'],
      ['Notes that drifted', 'CLAUDE.md still calls Ranged a placeholder.', 'Also measured in this session: 544 acts and 76 families (the notes say 542 and 75), 570 tree node and state pairs (480), 1,268 audit assertions (1,255), and skilling tools run to tier 6.']
    ])));

  /* ── 01 ── */
  out.push(h.sec('01', 'identity', 'The one decision that makes it not Ranged', 'Three candidates. One pick. What the pick costs.', `
  <div class="pillars">
    <div class="pillar">
      <span class="tag">Candidate A &middot; kept as the cost</span>
      <h3>Every cast spends runes</h3>
      <p>True, and it stays. But it is the sentence Ranged already owns. A rune that is an arrow with a glow on it is a new recipe list and no new game.</p>
      <p>So runes are the price of Magic, not what Magic is.</p>
    </div>
    <div class="pillar pick">
      <span class="tag">Candidate B &middot; the pick</span>
      <h3>A mage chooses how it hurts</h3>
      <p>Four elements, one button each: Fire, Frost, Storm, Shadow. A sword's damage type is the sword. A bow has none. A mage changes it between fights without touching gear.</p>
      <p>And four sizes of each: Bolt, Blast, Wave, Surge. A bigger spell spends more runes and hits harder, so the rune stack is a second thing a mage decides how to spend.</p>
      <p>Every monster is weak to one element and most resist one, for the same 15% a melee weakness is worth. Each element also does one small job of its own: Fire burns, Frost slows the monster, Storm cannot miss, Shadow heals you.</p>
    </div>
    <div class="pillar">
      <span class="tag">Candidate C &middot; rejected</span>
      <h3>A spell grows the longer the fight runs</h3>
      <p>Weak on trash, strong on bosses. It gives Magic a place, but no single number can then say whether it is balanced, and the Spire's own sword already does it (Sunder stacks).</p>
      <p>Worth one Mastery node at most, not the whole style.</p>
    </div>
  </div>
  <h3 class="sh">What the pick costs</h3>
  ${h.facts([
      ['Data', `An element pass over every monster.`, `${R.elements.total} monsters, 27 raid stages and 9 Spire monsters each get a weak element and most get a resisted one. Two new fields, <code>weakEl</code> and <code>resistEl</code>, so the melee fields are untouched. Section 04 has all of them.`],
      ['Screen', 'One new bar on the arena.', 'Eight buttons under your own health bar: four spell sizes, then four elements. They are the only new controls a player has to learn, they are the widest buttons in the arena after Engage, and they work while the fight runs. Section 11 has the measurements.'],
      ['Idle risk', 'The wrong element is a real mistake.', 'Parked on a resisted element you do 85% where the right one does 115%, a quarter of your damage. So the button says "resists -15%" on the monster in front of you, and the Monster Log and the monster card say it before you start.'],
      ['Balance', 'Four small effects that must not become the reason to play.', `Measured on real monsters: Fire is worth ${Math.min(...R.riders.map(x => x.fire - 100)).toFixed(1)} to ${Math.max(...R.riders.map(x => x.fire - 100)).toFixed(1)}% more damage, Storm ${Math.min(...R.riders.map(x => x.storm - 100)).toFixed(1)} to ${Math.max(...R.riders.map(x => x.storm - 100)).toFixed(1)}%, Frost ${Math.min(...R.riders.map(x => 100 - x.frostTaken)).toFixed(1)} to ${Math.max(...R.riders.map(x => 100 - x.frostTaken)).toFixed(1)}% less damage taken, Shadow heals back ${Math.min(...R.riders.map(x => x.shadowHeal)).toFixed(1)} to ${Math.max(...R.riders.map(x => x.shadowHeal)).toFixed(1)}% of the damage you take. The weakness is the big number on purpose.`],
      ['No new plumbing', 'Every element reuses an effect the fight already has.', 'Fire is <code>foeStatus.burn</code>, Frost is the slow Pinning Shot applies, Storm is the roll Plummet and Windcutter use, Shadow is the lifesteal line. No new timer, status or damage path.']
    ])}`));

  /* ── 02 ── */
  out.push(h.sec('02', 'skill', 'The skill', 'One stat, like Ranged. No save moves.', `
  ${h.tbl(['', 'Proposal', 'Why'], [
      [['Stat', 'nm'], ['<code>state.combatXp.magic</code>, level 1 to 99 on <code>XP_CUM</code>', 'm'], ['The sixth combat stat. It does the job of Attack and Strength for a staff or a wand, exactly as Ranged does for a bow.', 'd']],
      [['XP', 'nm'], ['<code>combatXpStat()</code> returns <code>magic</code> while a staff or wand is held', 'm'], ['All seven places that ask which stat is being trained already call that function. Hitpoints keeps its share.', 'd']],
      [['Weapons', 'nm'], ['Staves and wands need Magic, on <code>COMBAT_GEAR_REQ</code>: 1, 10, 20, 30, 40, 55, 70, 80, 90, 99, 99', 'm'], ['The same ladder a blade climbs on Attack and a bow on Ranged. One line in <code>combatGearReq</code>.', 'd']],
      [['Robes', 'nm'], ['Need Defence, like all armour', 'm'], ['One rule for everything you wear. The Warded style trains it. This is question 3 in section 17.', 'd']],
      [['Combat level', 'nm'], ['<code>floor(( max(attack + strength, ranged &times; 2, magic &times; 2) + defence + hitpoints ) / 4)</code>', 'new'], ['One more term inside the <code>max</code> that Ranged added. With Magic at 1 the term is 2, and attack + strength is never less.', 'd']]
    ], { min: 760 })}
  <div class="callout ok"><b>Checked: no existing save changes combat level. ${h.meas}</b>
  <p>${h.n(R.level.seen)} saves were put through the old formula and the new one: every corner (Magic missing from the save, Magic at 0 XP, Magic at level 1, against Attack, Strength, Ranged, Defence and Hitpoints at 1, 2, 50 and 99) and 200,000 random ones. ${R.level.moved} moved. A pure mage reaches ${R.level.mage99}, a pure archer ${R.level.arch99} and a pure fighter ${R.level.melee99}.</p></div>`));

  /* ── 03 ── */
  const prow = x => [[`Lv ${x.lv}`, 'm'], [`T${x.tier}`, 'm'], [x.foeDef, 'm'], [h.f1(x.melee.dps), 'm'], [h.pct(x.bow.dps, x.melee.dps), 'm'], [h.pct(x.longbow.dps, x.melee.dps), 'm'], [h.pct(x.xbow.dps, x.melee.dps), 'm'],
    [h.pct(x.wand.dps, x.melee.dps), 'd'], [h.pct(x.staff.dps, x.melee.dps), 'd'], [h.pct(x.wand.fire, x.melee.dps), 'new'], [h.pct(x.staff.fire, x.melee.dps), 'new'], [`${x.lo} to ${x.hi}%`, 'has']];
  const lp = (v, r) => Math.round(v / r.melee * 100) + '%';
  const ladRows = []; [1, 2, 3, 4, 5, 6, 7].forEach(t => { ladRows.push({ grp: `Tier ${t}, from Magic ${R.consts.REQ[t]}` }); R.ladder.filter(r => r.tier === t).forEach(r => ladRows.push([[`Lv ${r.lv}`, 'm'], [h.f2(r.melee), 'm'], [lp(r.bow, r), 'm'], [lp(r.longbow, r), 'm'], [lp(r.xbow, r), 'm'], [lp(r.wandFire, r), 'new'], [lp(r.staffFire, r), 'new']])); });
  out.push(h.sec('03', 'cast', 'How a cast resolves', 'Slotted into <code>COMBAT_P</code> as it stands. The melee and ranged lines do not move.', `
  ${h.tbl(['Quantity', 'Melee today', 'Ranged today', 'Magic', 'Why'], [
      [['Accuracy', 'nm'], [`Attack &times; ${P.ACC_LVL} + gear Attack &times; ${P.ACC_GEAR}`, 'mw'], [`Ranged &times; ${P.ACC_LVL} + gear Attack &times; ${P.ACC_GEAR}`, 'mw'], [`Magic &times; ${P.ACC_LVL} + gear Attack &times; ${P.ACC_GEAR}`, 'neww'], ['Same slope. Attack printed on a staff or a robe is accuracy, as it is on a bow or leather.', 'd']],
      [['Max hit', 'nm'], [`Strength &times; ${P.HIT_LVL} + Strength on gear &times; ${P.HIT_GEAR}`, 'mw'], [`Ranged &times; ${R.consts.RANGED_HIT_LVL} + Ranged Strength &times; ${P.HIT_GEAR}`, 'mw'], [`Magic &times; ${MD.STAT.HIT_LVL} + Magic Power &times; ${P.HIT_GEAR}`, 'neww'], ['One stat does two jobs, so a level is worth what a Ranged level is worth. The rune carries most of the Magic Power, the way the arrow does.', 'd']],
      [['Percent', 'nm'], ['Attack % (<code>atkBoost</code>): damage and accuracy', 'mw'], ['Ranged damage % (<code>rangedStr</code>): damage and accuracy', 'mw'], ['Magic damage % (<code>magicDmg</code>): damage and accuracy', 'neww'], ['A third channel. Attack % does nothing for a spell, from the first day, so there is no <code>RANGED_ACC_FROM_ATTACK</code> switch to carry.', 'd']],
      [['Flat', 'nm'], ['<code>str</code>', 'mw'], ['<code>rstr</code> + the arrow', 'mw'], ['<code>mpow</code> + what the spell gets from the rune', 'neww'], ['Magic Power. One point is 5 max hit. The biggest spell a rune powers gets all of the rune, a smaller one less: section 04. Strength and Ranged Strength never reach a spell.', 'd']],
      [['Any weapon', 'nm'], ['<code>dmgBoost</code> goes to Attack %', 'mw'], ['goes to Ranged damage %', 'mw'], ['goes to Magic damage %', 'neww'], ['Pendant sets, Sunweave, Stonewright and the cowls follow the staff. One more branch where <code>combatBonusesAll</code> and <code>cmastBonuses</code> already pick.', 'd']],
      [['Armour', 'nm'], ['none', 'mw'], ['heavy Defence costs accuracy', 'mw'], [`Defence that is not cloth costs ${MD.ARMOUR.perDef * 100}% damage a point, to -${Math.round((1 - MD.ARMOUR.floor) * 100)}%`, 'neww'], ['Damage and not accuracy, because accuracy saturates and the ranged rule had to be made large to bite. Section 06.', 'd']],
      [['Weakness', 'nm'], ['weapon type, &plusmn;15%', 'mw'], ['none in the live game', 'mw'], ['the element, &plusmn;15%', 'neww'], ['Applied before crit, on the line the weapon type is applied on today.', 'd']],
      [['Each attack', 'nm'], ['free', 'mw'], ['one arrow or bolt', 'mw'], ['one to four runes, by the size of the spell', 'neww'], ['Checked before damage is rolled, so an empty slot never lands a free hit. The same block, widened.', 'd']]
    ], { min: 1040 })}
  <h3 class="sh">The three styles</h3>
  <p class="lead">Keyed by the same three slots melee and ranged use, so <code>state.combatStyle</code> needs no migration and the button row needs no new case. The numbers are the ones Ranged's styles were tuned to.</p>
  ${h.tbl(['Slot', 'Style', 'Cast speed', 'Accuracy', 'XP', 'In game it says'], Object.keys(MD.STYLES).map(k => { const s = MD.STYLES[k]; return [[k, 'm'], [s.name, 'nm'], [s.swing === 1 ? 'normal' : (s.swing < 1 ? Math.round((1 - s.swing) * 100) + '% faster' : Math.round((s.swing - 1) * 100) + '% slower'), 'm'], [s.acc === 1 ? 'normal' : Math.round((1 - s.acc) * 100) + '% lower', 'm'], [s.def ? 'half to Defence' : 'all to Magic', 'm'], [`<span class="game">${s.blurb}</span>`, '']]; }), { min: 760 })}
  <h3 class="sh">Weapon alone, equal investment ${h.meas}</h3>
  <p class="lead">This is the <code>_rangedsim.js</code> test, run through the game's own <code>playerAccuracy</code>, <code>playerMaxHit</code> and <code>playerSwingMs</code>: a fighter with Attack and Strength at the level against an archer or a mage with one stat at it, same tier, no armour, against that harness's level-scaled Defence. The mage casts the biggest spell the rune powers. There is no such thing as a cast without an element, so Magic is held to the band with Fire on, the element every mage has from level 1. The plain columns are printed so the size of the burn is visible.</p>
  ${h.tbl(['', 'Tier', 'Foe Def', 'Sword dps', 'Shortbow', 'Longbow', 'Crossbow', 'Wand, plain', 'Staff, plain', 'Wand', 'Staff', 'Magic against melee and each ranged weapon'],
      [{ grp: 'the four levels asked for, at the tier that level can wield' }].concat(R.parity.map(prow)).concat([{ grp: 'the five rows _rangedsim.js itself prints' }]).concat(R.parityRS.map(prow)), { min: 1120 })}
  <p class="tblnote">The sword, shortbow, longbow and crossbow columns match <code>_rangedsim.js</code> to the digit, which is the regression check: those run through the shipped functions untouched. Across every crafted tier, from the level it can be wielded to five past the next, Magic strays ${R.ladderWorst.magic} points from the sword at worst and the bows ${R.ladderWorst.ranged}. Both extremes are tier 1 at level 1, where one point of anything is a tenth of a hit.</p>
  <details class="fold"><summary>Every crafted tier, every five levels, as a share of the sword</summary>
  ${h.tbl(['', 'Sword dps', 'Shortbow', 'Longbow', 'Crossbow', 'Wand, Fire', 'Staff, Fire'], ladRows, { min: 640 })}</details>
  <div class="callout"><b>How the numbers were chosen.</b>
  <p>The biggest spell a rune powers gets the arrow's strength, tier for tier, and a wand is exactly as accurate as the sword and the shortbow. That makes a wand a shortbow that casts 2% slower (cast speed &times;${MD.FAMILIES.wand.swingMult} against &times;0.85), and the burn from Fire gives the 2 to 3% back on a long fight. Pegging Magic to the bows is deliberate: theirs is the ladder that harness has already tuned, so Magic inherits the tuning at every tier and not only at the four that were tested.</p></div>`, true));

  /* ── 04 ── */
  const E = R.elements, ridR = k => `${Math.min(...R.riders.map(k)).toFixed(1)} to ${Math.max(...R.riders.map(k)).toFixed(1)}%`;
  const elRows = [
    [h.el('fire'), 'Magic 1', `<span class="game">${MD.ELEMENTS[0].line}</span>`, `30% a hit, as weapon burns are. Each tick is ${MD.ELEMENTS[0].rider.burn * 100}% of your max hit.`, `${ridR(x => x.fire - 100)} more damage`, 'foeStatus.burn'],
    [h.el('frost'), `Magic ${MD.ELEMENTS[1].lvl}`, `<span class="game">${MD.ELEMENTS[1].line}</span>`, '30% a hit.', `${ridR(x => 100 - x.frostTaken)} less damage taken`, 'foeStatus.pin'],
    [h.el('storm'), `Magic ${MD.ELEMENTS[2].lvl}`, `<span class="game">${MD.ELEMENTS[2].line}</span>`, 'Worth more the harder the monster is to hit.', `${ridR(x => x.storm - 100)} more damage`, 'the pierce roll'],
    [h.el('shadow'), `Magic ${MD.ELEMENTS[3].lvl}`, `<span class="game">${MD.ELEMENTS[3].line}</span>`, 'On top of any lifesteal you have.', `heals ${ridR(x => x.shadowHeal)} of the damage you take`, 'the lifesteal line']
  ];
  const zoneRows = E.zones.map(z => [[z.name, 'nm'], [`Lv ${z.minLvl} to ${z.maxLvl}`, 'm'], [h.el(z.best), ''], [`${z.bestWeak} of ${z.n}`, 'm'],
    [MD.ELEMENTS.map(e => { const sc = z.score[e.k]; return sc ? `<span class="${sc > 0 ? 'has' : 'bad'}">${h.cap(e.k)} ${sc > 0 ? '+' : ''}${sc}</span>` : ''; }).filter(Boolean).join(' &nbsp; '), '']]);
  const monRows = [];
  E.zones.forEach(z => {
    monRows.push({ grp: `${z.name} &middot; Lv ${z.minLvl} to ${z.maxLvl}` });
    E.rows.filter(m => m.zone === z.id).forEach(m => monRows.push([[m.name + (m.boss ? ' <span class="d">boss</span>' : ''), 'nm'], [m.lvl, 'm'], [m.weakTo, 'd'], [m.resistTo || '', 'd'], [h.el(m.weakEl), ''], [m.resistEl ? h.el(m.resistEl) : '', '']]));
  });
  const raidRows = [];
  T.raidEl.forEach(r => { raidRows.push({ grp: `${r.name} &middot; Combat ${r.lvl}` }); r.stages.forEach(s => raidRows.push([[s.name + (s.boss ? ' <span class="d">boss</span>' : ''), 'nm'], [s.weakTo, 'd'], [h.el(s.weakEl), ''], [s.resistEl ? h.el(s.resistEl) : '', '']])); });
  out.push(h.sec('04', 'elements', 'Spells and elements', 'Sixteen spells: four elements, four sizes of each.', `${require('./page_spells.js').spellsHTML(c, h)}
  ${h.tbl(['Element', 'Unlocks', 'In game it says', 'How', 'Worth, on a monster that is neither weak nor resistant ' + h.meas, 'Reuses'], elRows.map(r => [[r[0], ''], [r[1], 'm'], [r[2], ''], [r[3], 'd'], [r[4], 'new'], [`<code>${r[5]}</code>`, '']]), { min: 1080 })}
  <p class="tblnote">Worth is from 40 simulated hours each on Goblin Shaman, Ogre Houndmaster, Ashwing Wyvern and Dread Knight, dressed in crafted gear of the tier. On a monster that cannot die the burn is worth 3%; on real ones it resets with every kill and cannot land the killing hit, which is why it measures lower.</p>
  ${h.facts([
      ['One number', 'Weak is +15%, resisted is -15%.', 'The same 15% the melee types use, so the Monster Log teaches one rule. With Faultline, Fire on a monster that is weak to it measures ' + h.pct(R.best.find(x => x.label.indexOf('weakness hit') > 0).dps[500], R.best.find(x => x.label === 'FULL: Faultline + Sunder Rune').dps[500]) + ' of a plain cast (the 15%, and the burn) and a resisted element ' + h.pct(R.best.find(x => x.label.indexOf('resisted element') > 0).dps[500], R.best.find(x => x.label === 'FULL: Faultline + Sunder Rune').dps[500]) + '.'],
      ['When you pick', 'Any time. One press, with the fight still running.', 'The spell bar does not lock. A change applies from your next cast. Styles and gear still lock while a fight runs, as they do today. Section 17, question 7.'],
      ['Fire first', 'A new mage is never on the wrong element.', `Nothing below level 19 resists Fire. Frost arrives at Magic ${MD.ELEMENTS[1].lvl} with the Goblin Cave, where all five are weak to it; Storm at ${MD.ELEMENTS[2].lvl} with the Wolf Den; Shadow at ${MD.ELEMENTS[3].lvl}, the level of the first Ogre that is weak to it.`],
      ['No answer everywhere', `Fire is right for ${E.count.fire.weak} monsters and wrong for ${E.count.fire.resist}.`, `Frost ${E.count.frost.weak} and ${E.count.frost.resist}, Storm ${E.count.storm.weak} and ${E.count.storm.resist}, Shadow ${E.count.shadow.weak} and ${E.count.shadow.resist}. Every monster is weak to one element, as every monster is weak to one melee type today.`]
    ])}
  <h3 class="sh">The pass, zone by zone</h3>
  ${h.tbl(['Zone', 'Monsters', 'Best element', 'Weak to it', 'Score per element (weak minus resisted)'], zoneRows, { min: 760 })}
  <details class="fold"><summary>All ${E.total} monsters: melee weakness today, element proposed</summary>
  ${h.tbl(['Monster', 'Lv', 'Weak to (today)', 'Resists (today)', 'Weak element', 'Resists element'], monRows, { min: 760 })}</details>
  <details class="fold"><summary>The 27 raid stages and the nine Spire monsters ${'<span class="prov">provisional</span>'}</summary>
  ${h.tbl(['Stage', 'Weak to (today)', 'Weak element', 'Resists element'], raidRows.concat([{ grp: 'The Sundered Spire: its own nine. Every other floor borrows a zone or raid monster and copies its elements with its weakness.' }]).concat(MD.SPIRE_EL.map(s => [[s[0], 'nm'], ['', ''], [h.el(s[1]), ''], [s[2] ? h.el(s[2]) : '', '']])), { min: 640 })}</details>
  <p class="tblnote">Raid and Spire elements follow each place's theme (the Emberforge resists Fire, the Abyssal Throne resists Shadow, the Empyrean is weak to it) and were not simulated one by one. Stormcrest Aerie has rows in the design for the day it goes live.</p>`, true));

  /* ── 05 ── */
  const W = T.weapons, FW = MD.FAMILIES.wand, FS = MD.FAMILIES.staff;
  const castsW = R.parity[3].wand.castsHr, castsS = R.parity[3].staff.castsHr;
  const wcell = w => w ? `${w.atk}${w.str ? ' / ' + w.str : ''}${w.rstr ? ' / +' + w.rstr + ' Ranged Str' : ''}` : '';
  const mcell = w => w ? `${w.atk}${w.mpow ? ' / +' + w.mpow : ''}${w.crit ? ` <span class="d">${h.f1(w.crit * 100)}% crit</span>` : ''}` : '';
  const ladder = W.filter(x => x.tier <= 7).map(x => { const w = MD.WOODS[x.tier - 1]; const rune = MD.RUNES[x.tier - 1], rcls = MD.runeClass(x.tier);
    return [[`T${x.tier}`, 'm'], [x.req, 'm'], [wcell(x.sword), 'm'], [`${x.shortbow.atk} / ${x.longbow.atk}`, 'm'], [x.arrow, 'm'],
      [`${w.n} Wand`, 'nm'], [mcell(x.wand), 'new'], [`${w.n} Staff`, 'nm'], [mcell(x.staff), 'new'], [`${rune.n} ${MD.SPELLS[rcls - 1].n} +${x.rune}`, 'new'],
      [`${w.rn} / ${w.rn + 4}`, 'm'], [`${w.n} logs &times;${FW.logs} / &times;${FS.logs}, ${rune.n} Runes &times;${FW.runes * rcls} / &times;${FS.runes * rcls}${x.tier >= 3 ? `, Arcane Dust &times;${(x.tier - 2) * 4}` : ''}`, 'd']]; });
  const allRunes = MD.RUNES.map(r => ({ n: r.n + ' Rune', t: r.t, pow: r.pow })).concat([{ n: MD.SPIRE_RUNE.n, t: MD.SPIRE_RUNE.t, pow: MD.SPIRE_RUNE.pow }]);
  const bestRune = t => { const r = allRunes.filter(x => x.t <= t + 1).pop(); return `${r.n}, ${MD.SPELLS[MD.runeClass(r.t) - 1].n} +${r.pow}`; };
  const top = W.filter(x => x.tier >= 7).map(x => [[`T${x.tier}`, 'm'], [x.req, 'm'], [x.raid1 ? `${x.raid1.name} ${wcell(x.raid1)}` : (x.sword ? `${x.sword.name} ${wcell(x.sword)}` : ''), 'm'], [x.longbow && x.tier >= 10 ? `${x.longbow.name} ${wcell(x.longbow)}` : (x.xbow && x.tier === 8 ? `${x.xbow.name} ${x.xbow.atk}` : (x.tier === 7 ? `Ancient Longbow ${x.longbow.atk}` : 'none')), 'm'],
    [x.dstaff ? x.dstaff.name : '', 'nm'], [mcell(x.dstaff), 'new'], [x.dwand ? x.dwand.name : 'none', 'nm'], [mcell(x.dwand), 'new'], [bestRune(x.tier), 'd']]);
  out.push(h.sec('05', 'weapons', 'Weapons', 'Two families, every tier from 1 to 11.', `
  ${h.tbl(['Family', 'Hands', 'Kind', 'Cast speed', 'Hit', 'Crit', 'Other hand', 'Casts an hour', 'Role'], [
      [['Wand', 'nm'], ['one', 'm'], ['light weapon', 'm'], [`${Math.round((1 - FW.swingMult) * 100)}% faster than a blade`, 'm'], ['normal', 'm'], ['3.4 to 5.8% by tier, the light weapon crit a dagger and a bow already get', 'd'], ['a buckler, or a shield with the light weapon penalty', 'd'], [h.n(castsW), 'm'], ['Fast, and keeps a hand. Rogue. Spends the most runes at any spell size.', 'd']],
      [['Staff', 'nm'], ['two', 'm'], ['heavy weapon', 'm'], [`${Math.round((FS.swingMult - 1) * 100)}% slower than a blade`, 'm'], [`+${Math.round((FS.dmgMult - 1) * 100)}%`, 'm'], [`${h.f1((FS.crit + FS.critTier) * 100)} to ${h.f1((FS.crit + FS.critTier * 11) * 100)}% by tier, printed on the staff`, 'd'], ['none', 'd'], [h.n(castsS), 'm'], [`The same damage in the same time on ${Math.round((1 - castsS / castsW) * 100)}% fewer runes. Berserker.`, 'd']]
    ], { min: 1040 })}
  <p class="tblnote">A staff hits ${Math.round((FS.dmgMult - 1) * 100)}% harder and a wand casts ${Math.round((castsW / castsS - 1) * 100)}% more often: the same damage in the same time, weapon alone. What it gets for the hand it gives up is crit, as a number on the item, because a light weapon already crits and a heavy one does not. On real monsters, dressed, a staff does ${Math.min(...R.real.map(x => x.staffVsWandBare))} to ${Math.max(...R.real.map(x => x.staffVsWandBare))}% of a wand with the other hand empty. A wand with a buckler in it is ahead of both, and pays for it in runes. No new class: wands are light, staves heavy, and a Guardian can hold a wand and a buckler.</p>
  <h3 class="sh">The crafted ladder: the wood ladder, like bows</h3>
  ${h.tbl(['Tier', 'Magic', 'Sword atk / str', 'Bow atk short / long', 'Arrow str', 'Wand', 'atk', 'Staff', 'atk', 'Its rune and biggest spell', 'Runecrafting', 'Made from (wand / staff)'], ladder, { min: 1240 })}
  <h3 class="sh">Tier 7 to 11: drops, beside the raid one-hander and the bow of the tier ${h.prov}</h3>
  ${h.tbl(['Tier', 'Magic', 'One-hander atk / str', 'Bow', 'Staff', 'atk / Magic Power', 'Wand', 'atk / Magic Power', 'Best rune'], top, { min: 1140 })}
  <p class="tblnote">Raid staves and wands carry Attack and Magic Power the way Sunpiercer and Plummet carry Attack and Ranged Strength. Attack sits on the raid one-hander of the tier; the top two sit on the two raid bows. Dawncaller, Starcall and Faultline are in the best in slot table in section 14 and are measured; tiers 7 to 9 follow the same anchors and are not.</p>`, true));

  /* ── 06 ── */
  const armRows = T.armour.map(a => [[`${a.name}${a.raid ? ' <span class="d">raid cloth</span>' : ''}`, 'nm'], [`T${a.tier}`, 'm'], [a.rn, 'm'], [a.cloth.def, 'new'], [a.cloth.atk, 'new'], [a.cloth.mpow ? '+' + a.cloth.mpow : '0', 'new'], [h.f1(a.cloth.runeSave * 100) + '%', 'new'],
    [`${a.leatherName}: ${a.leather.def} / ${a.leather.atk}`, 'm'], [`${Math.round(a.leather.crit * 100)} / ${Math.round(a.leather.dodge * 100)} / ${Math.round(a.leather.aspd * 100)}%`, 'd'], [`${a.plate.def}`, 'm']]);
  const dv = T.dawnveil;
  armRows.push({ cls: 'rule-top', cells: [['Dawnveil <span class="d">Empyrean set, four pieces</span>', 'nm'], ['T10', 'm'], ['drop', 'm'], [dv.cloth.def, 'new'], [dv.cloth.atk, 'new'], ['+' + dv.cloth.mpow, 'new'], [h.f1(dv.cloth.runeSave * 100) + '%', 'new'], [`Sunweave: ${dv.leather.def} / ${dv.leather.atk}`, 'm'], [`${Math.round(dv.leather.crit * 100)} / ${Math.round(dv.leather.dodge * 100)} / ${Math.round(dv.leather.aspd * 100)}%`, 'd'], [`Dawnward ${dv.plate.def}`, 'm']] });
  out.push(h.sec('06', 'armour', 'Robes: the third armour class', 'Ten cloth tiers beside the ten leather tiers, and a third Empyrean set.', `
  <p class="lead">Each robe piece is built off the leather piece of the same tier, so the two ladders cannot drift: ${Math.round(MD.ROBE.DEF_FRAC * 100)}% of its Defence, ${Math.round(MD.ROBE.ATK_FRAC * 100)}% of its Attack, and in place of crit, dodge and attack speed it carries Magic Power and a chance for a cast to keep its runes. Five pieces: hood, robe, leggings, wraps, slippers.</p>
  ${h.tbl(['Set', 'Tier', 'Runecrafting', 'Def', 'Atk', 'Magic Power', 'Casts that keep their runes', 'Leather of the tier: def / atk', 'its crit / dodge / speed', 'Plate def'], armRows, { min: 1140 })}
  ${h.facts([
      ['Plate and leather', `Every point of Defence on armour that is not cloth costs ${MD.ARMOUR.perDef * 100}% Magic damage, to a limit of ${Math.round((1 - MD.ARMOUR.floor) * 100)}%.`, `The shield is exempt, as it is for a bow, and a cape is cloth. Measured on a staff, against the same staff in cloth: ${R.dressed.map(x => `Lv ${x.lv} leather ${h.pct(x.staffLeather.dps, x.staff.dps)}, plate ${h.pct(x.staffPlate.dps, x.staff.dps)}`).join('; ')}. You can cast in plate. You will just hit softer, and the number moves as you swap pieces.`],
      ['In game it says', '<span class="game">Cloth &middot; spells at full strength</span> on a robe, <span class="game">-9.6% Magic damage</span> on a Cobalt Chest.', 'Every armour card names its class and what it costs an archer already; it gains one more chip. The Gear tab totals it: <span class="game">Armour that is not cloth: -17% Magic damage</span>.'],
      ['What you give up', `Defence. A mage in cloth has ${R.dressed[3].staff.s.def} at Lv 99, an archer in leather ${R.dressed[3].bow.s.def}, a fighter in plate with a shield ${R.dressed[3].melee.s.def}.`, `Against a Dread Knight that is ${h.n(R.fights[3].rows.staff.takenHr)} damage an hour for the mage, ${h.n(R.fights[3].rows.bow.takenHr)} for the archer and ${h.n(R.fights[3].rows.melee.takenHr)} for the fighter.`],
      ['Requirement', 'Defence, on the same ladder as plate and leather.', 'Recommended for consistency; the alternative is Magic. Question 3.'],
      ['Also worn by a mage', 'Bucklers from Cobalt up, Stonewright Gauntlets and every cape with Strength carry Magic Power.', 'The same short list that got Ranged Strength in 0.9.127.2, with the same numbers (1 or 2 on a buckler, 2 on Stonewright, the Strength already on a cape). Stonewright is flagged so it does not weaken spells, as it is flagged light so it does not cost a bow accuracy.']
    ])}`, true));

  /* ── 07 ── */
  const eu = R.economy.runes.filter(x => !x.trained), et = R.economy.runes.filter(x => x.trained), au = R.economy.arrows.filter(x => !x.trained), at = R.economy.arrows.filter(x => x.trained);
  const SP = MD.SPELLS;
  const runeRows = MD.RUNES.map((r, i) => [[`${r.n} Rune`, 'nm'], [`T${r.t}`, 'm'], [r.rn, 'm'], [`${SP[eu[i].cls - 1].n} <span class="d">${eu[i].cls} a cast</span>`, 'nm'], ['+' + r.pow, 'new'],
    [`Runestone &times;${r.stone} + ${Object.keys(r.fuel).map(k => (c.N.item[k] || k) + ' &times;' + r.fuel[k]).join(' + ')}`, 'm'], [`&times;${eu[i].per}`, 'm'],
    [eu[i].perCast + 's', 'new'], [au[i].perArrow + 's', 'd'], [et[i].perCast + 's', 'new'], [at[i].perArrow + 's', 'd'], [h.n(et[i].runesPerHrBench), 'm']]);
  runeRows.push({ cls: 'rule-top', cells: [[MD.SPIRE_RUNE.n, 'nm'], ['T11', 'm'], ['drop', 'm'], ['Surge <span class="d">4 a cast</span>', 'nm'], ['+' + MD.SPIRE_RUNE.pow, 'new'], ['The Spire, on boss floors, like the Sundershaft', 'd'], '', '', '', '', '', ''] });
  const upRows = R.upkeep.map(u => [[`Lv ${u.lv}`, 'm'], [`${u.rune} <span class="d">${u.spell}, ${u.cls} a cast</span>`, 'nm'], [`${h.n(u.rows[0].castsWand)} / ${h.n(u.rows[0].castsStaff)}`, 'm']]
    .concat(u.rows.slice(0, 3).map(r => [`${r.wand} / ${r.staff} <span class="d">(${r.bow})</span>`, 'm']))
    .concat([[`${h.n(u.rows[3].castsWand)} / ${h.n(u.rows[3].castsStaff)}`, 'm'], [`${u.rows[3].wand} / ${u.rows[3].staff} <span class="d">(${u.rows[3].bow})</span>`, 'new']]));
  const netRows = R.net.map(nn => [[`Lv ${nn.lv}`, 'm']].concat(nn.rows.map((r, i) => [`${r.wand}% / ${r.staff}% <span class="d">(${r.bow}%)</span>`, i === 3 ? 'new' : 'm'])));
  const rr = (arr, f) => `${Math.min(...arr.map(f))} to ${Math.max(...arr.map(f))}`;
  const costShare = eu.map((x, i) => Math.round(x.perCast / au[i].perArrow * 100));
  /* the finished staff, if a full cast cost what the arrow of its tier costs */
  const ifArrow = R.parity.map((x, i) => { const k = at[x.tier - 1].perArrow / et[x.tier - 1].perCast; return +(x.staff.fire * 60 / (60 + R.upkeep[i].rows[3].staff * k) / x.melee.dps * 100).toFixed(1); });
  c.sum.costShare = costShare; c.sum.ifArrow = ifArrow;
  out.push(h.sec('07', 'runes', 'Runes', 'One ladder, eight grades, named for how hot the stone was baked.', `
  ${h.tbl(['Rune', 'Tier', 'Runecrafting', 'Biggest spell', 'It gets', 'One batch', 'Makes', 'Work for one full cast, new', 'an arrow', 'Work for one full cast, finished', 'an arrow', 'Bench makes, an hour'], runeRows, { min: 1240 })}
  <p class="tblnote">A full cast is the rune's biggest spell, which spends one to four runes. The work is seconds of quarrying, chopping, burning and carving for those runes, from the stone up, the method <code>_rangedecon.js</code> uses for arrows. A batch is ${MD.RUNE_BATCH} runes for each rune the biggest spell spends, so a full cast costs about the same work at every tier and a smaller spell costs a half, a third or a quarter of it. "New" is every skill in the chain at the level the rune unlocks, no tree. "Finished" is 99 with every tree, counting the nodes that save time and not the ones that make a batch bigger, for runes and arrows alike, so both finished prices are the most they can be.</p>
  ${h.facts([
      ['The slot', 'The quiver slot holds what your weapon spends: arrows, bolts or runes.', 'No thirteenth slot. <code>readyAmmo</code>, <code>ammoFitsWeapon</code> and the tier rule already do the work once they accept a staff: runes carry an ammunition kind of their own, so a bow will not take them and a staff will not take arrows, and the stop message already says which. Question 6.'],
      ['The fit', 'A staff or wand casts runes up to its own tier plus one.', 'The bow rule. A tier 7 Ancient Staff casts Starfall Runes, and so a Surge; a Pine Wand does not, at any Magic level. The best staves cast the Sunder Rune.'],
      ['Keeping the runes', `A cast can keep its runes. All of it together stops at ${Math.round(MD.RUNE_SAVE_CAP * 100)}%, the ceiling arrows already have.`, `Robes ${h.f1(MD.ROBE.SAVE * 500)}% for five pieces, the Runecrafting tree ${Math.round(MD.RN_RANK.save * 1000)}% then ${Math.round(MD.RN_RANK.gmSave * 500)}% then ${Math.round(MD.RN_RANK.endless * 100)}%, the Sorcery column 20% and 3%. One roll a cast: it keeps every rune the spell would have spent, or none. Paid as a chance not to spend, exactly as arrow recovery is, so nothing is owed when you retreat or close the game.`],
      ['Running dry', 'The fight stops and says why, and you can see it coming.', 'The stop is the block arrows use, widened: <span class="game">You are out of Forge Runes.</span> New for both styles is a readout on your health bar that names the spell and how long the stack lasts at that size: <span class="game">Shadow Wave &middot; 5,520 runes &middot; about 1h 29m</span>, amber under ten minutes. Pick a smaller spell and the time goes up. Section 11.'],
      ['Away', 'Offline combat spends runes, and stops when they are gone.', `It spends nothing for arrows today. One function charges the quiver for the kills the away time earned, at the spell you left it casting, and caps the kills at what the quiver could pay for. The Welcome Back row says how far it got. ${h.prov}`],
      ['Other sources', 'Anything that casts drops its runes, and the Spire gives Sunder Runes on boss floors.', 'The rule the archers follow for arrows. Section 10.']
    ])}
  <h3 class="sh">What an hour of casting costs ${h.meas}</h3>
  <p class="lead">Minutes of making runes for each hour of casting the biggest spell the rune powers: wand / staff, with the bow and its arrows in brackets. Casts an hour are read at the Agility the character would have, because Agility is the one skill that changes how many runes an hour of fighting spends: the level the rune unlocks for a new mage, 99 for a finished one.</p>
  ${h.tbl(['', 'Rune and spell', 'Casts an hour, new', 'New mage, nothing saved', 'New, robes only (7.5%)', 'New, half the saving (40%)', 'Casts an hour, finished', 'Finished: 99s, every tree, 85%'], upRows, { min: 1100 })}
  <h3 class="sh">With the rune cost taken off ${h.meas}</h3>
  <p class="lead">Damage per hour of your own time, counting the time spent feeding the weapon, as a share of melee, which feeds nothing. Wand / staff, bow in brackets.</p>
  ${h.tbl(['', 'New mage, nothing saved', 'New, robes only', 'New, half the saving', 'Finished'], netRows, { min: 860 })}
  <div class="callout"><b>Read this one carefully.</b>
  <p>"With rune cost taken off" can be read two ways, so both are on this page. Leaving the cost out, Magic is ${lo} to ${hi}% of melee and of each ranged weapon: section 03. Charging for it, as time, is this table, and nothing that spends ammunition is inside 95 to 105% of melee until it has its saving nodes: a new archer keeps ${rr(R.net, x => x.rows[0].bow)}% of the hour and a finished one ${rr(R.net, x => x.rows[3].bow)}%. That is how Ranged ships.</p>
  <p>Runes are priced so a <b style="display:inline">finished mage with a staff keeps ${rr(R.net, x => x.rows[3].staff)}%</b>, inside the band, and a new one keeps ${rr(R.net, x => x.rows[0].staff)}%. A full cast costs ${Math.min(...costShare)} to ${Math.max(...costShare)}% of the work of the arrow of its tier. If it should cost what an arrow costs, it is one number, the batch size, and the finished staff drops to ${Math.min(...ifArrow)} to ${Math.max(...ifArrow)}%. Question 5. A smaller spell cuts the bill further: section 04.</p></div>`, true));

  return out.join('\n');
}

exports.render = function (c) {
  const h = mk(c);
  const a = partA(c, h);
  const b = require('./page2.js').partB(c, h);
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Magic in Cindervale</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap">
<style>${CSS}</style></head><body>
${a}
${b}
</body></html>`;
};

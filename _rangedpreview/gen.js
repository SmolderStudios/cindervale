/* Ranged + Fletching preview.
 *
 *     node _rangedpreview/gen.js   ->  _rangedpreview/preview.html
 *
 * Nothing here touches the game. It draws the proposed art with the same
 * parameterised-generator pattern the shipped icons use (one silhouette, one
 * palette per tier, see _roastSVG / _curedLeatherSVG in cindervale.html) and lays
 * the whole proposal out in the game's own colours so it can be judged as a
 * screenshot rather than as a spec.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* ── palettes ──────────────────────────────────────────────────────────────
   Wood for bows and shafts, metal for crossbows, heads and bolts. `glow` adds a
   halo the way the shipped magical tiers do; `spark` adds star points. */
const WOOD = [
  {k:'pine',    n:'Pine',       lv:1,  wc:1,  l:'#c09a63', m:'#8a6236', d:'#3f2b14'},
  {k:'oak',     n:'Oak',        lv:12, wc:10, l:'#b98a4e', m:'#7d5527', d:'#3a2610'},
  {k:'ironbark',n:'Ironbark',   lv:27, wc:25, l:'#9a9484', m:'#5f5a4c', d:'#2b281f'},
  {k:'ember',   n:'Emberwood',  lv:45, wc:45, l:'#d4703c', m:'#96351d', d:'#3d1108', glow:'#e0762f'},
  {k:'frost',   n:'Frostwood',  lv:62, wc:65, l:'#a8cfe0', m:'#5c8ba4', d:'#1e3murk', glow:'#8fd0e6'},
  {k:'shadow',  n:'Shadowwood', lv:78, wc:78, l:'#7c6d90', m:'#463a5c', d:'#1c1528', glow:'#9a5ad0'},
  {k:'ancient', n:'Ancient',    lv:90, wc:90, l:'#9aa870', m:'#5e6b38', d:'#232a12', glow:'#c8e070', spark:1},
];
WOOD[4].d = '#1e3242';

const METAL = [
  {k:'bronze',    n:'Bronze',     lv:1,  str:2,  l:'#d79a52', m:'#a36a26', d:'#4a2c0d'},
  {k:'iron',      n:'Iron',       lv:12, str:4,  l:'#a8adb4', m:'#70767e', d:'#2e3238'},
  {k:'steel',     n:'Steel',      lv:24, str:7,  l:'#d3dae2', m:'#8b939d', d:'#3c4249'},
  {k:'mithril',   n:'Mithril',    lv:38, str:11, l:'#8cc4ec', m:'#3f74a4', d:'#152f47', glow:'#6fa8d8'},
  {k:'cobalt',    n:'Cobalt',     lv:52, str:16, l:'#6b9ce8', m:'#2f57a0', d:'#13224a', glow:'#4a7fd0'},
  {k:'runite',    n:'Runite',     lv:64, str:22, l:'#5fd0a8', m:'#238a68', d:'#0d3a2c', glow:'#3fb08a'},
  {k:'starsteel', n:'Starsteel',  lv:76, str:29, l:'#e8e2ff', m:'#9089c4', d:'#2e2a4a', glow:'#c8bcff', spark:1},
  {k:'moltensteel',n:'Moltensteel',lv:86,str:37, l:'#ffab55', m:'#c04e18', d:'#48120a', glow:'#ff8420', spark:1},
  {k:'voidsteel', n:'Voidsteel',  lv:94, str:46, l:'#c489f0', m:'#7434b0', d:'#2a0f47', glow:'#9a5ad0', spark:1},
];

let uid = 0;
const u = () => 'rp' + (++uid);

function defs(p, extra) {
  const g = u(), s = u();
  const glow = p.glow
    ? `<radialGradient id="${g}" cx="0.5" cy="0.5" r="0.55">
         <stop offset="0" stop-color="${p.glow}" stop-opacity="0.42"/>
         <stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>` : '';
  return {
    id: {g, s},
    markup: `<defs>${glow}
      <linearGradient id="${s}" x1="0.1" y1="0" x2="0.95" y2="0.4">
        <stop offset="0" stop-color="${p.l}"/><stop offset="0.45" stop-color="${p.m}"/>
        <stop offset="1" stop-color="${p.d}"/></linearGradient>${extra || ''}</defs>`
  };
}
const halo = (p, d) => p.glow ? `<circle cx="32" cy="32" r="28" fill="url(#${d.id.g})"/>` : '';
const sparks = p => p.spark
  ? `<circle cx="13" cy="16" r="1.5" fill="#fff" opacity="0.85"/>
     <circle cx="51" cy="46" r="1.2" fill="#fff" opacity="0.7"/>
     <circle cx="46" cy="14" r="1" fill="#fff" opacity="0.6"/>` : '';

/* A bow. The first cut drew the limb curving one way and the string bulging the
   other, which makes a lens: every tier read as a leaf or an eye rather than a
   bow. A bow is a D. The arc goes out on one side and the string is DEAD STRAIGHT
   down the chord, and that contrast is the entire silhouette.
   Shortbows are shorter with recurved tips; longbows run the full height. */
function bowSVG(p, long) {
  const d = defs(p);
  const y0 = long ? 3 : 9, y1 = long ? 61 : 55;
  const bulge = long ? 12 : 10;                 // how far the limb bows out
  const chord = 50;                             // where the string hangs
  const limb = `M${chord} ${y0} C${bulge} ${y0 + 10} ${bulge} ${y1 - 10} ${chord} ${y1}`;
  const tips = long ? ''
    : `<path d="M${chord} ${y0} C${chord + 7} ${y0 + 3} ${chord + 7} ${y0 + 8} ${chord - 2} ${y0 + 9}"
         fill="none" stroke="url(#${d.id.s})" stroke-width="5" stroke-linecap="round"/>
       <path d="M${chord} ${y1} C${chord + 7} ${y1 - 3} ${chord + 7} ${y1 - 8} ${chord - 2} ${y1 - 9}"
         fill="none" stroke="url(#${d.id.s})" stroke-width="5" stroke-linecap="round"/>`;
  return `<svg class="ev-icon" viewBox="0 0 64 64">${d.markup}${halo(p, d)}
    <path d="${limb}" fill="none" stroke="url(#${d.id.s})" stroke-width="${long ? 6 : 6.5}" stroke-linecap="round"/>
    <path d="${limb}" fill="none" stroke="${p.l}" stroke-width="1.5" opacity="0.4"
      stroke-linecap="round" transform="translate(-1.6,0)"/>
    ${tips}
    <path d="M${chord} ${y0} L${chord} ${y1}" stroke="#efe4c4" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M${bulge + 1} 24 L${bulge + 1} 40" stroke="#3a2513" stroke-width="10" stroke-linecap="round"/>
    <path d="M${bulge + 1} 24 L${bulge + 1} 40" stroke="#6d4a26" stroke-width="7" stroke-linecap="round"/>
    <path d="M${bulge - 3} 28 H${bulge + 5} M${bulge - 3} 36 H${bulge + 5}"
      stroke="#c9a86a" stroke-width="1.8" opacity="0.7" stroke-linecap="round"/>
    ${sparks(p)}</svg>`;
}

/* A crossbow, seen from above: stock running down the frame, prod across the top,
   string pulled back into a V over it. The first cut drew a short stub under a
   shallow arc and read as an umbrella. */
function crossbowSVG(p) {
  const wood = {l:'#a07a48', m:'#6d4a26', d:'#33210f'};
  const d = defs(p);
  const w = defs(wood);
  return `<svg class="ev-icon" viewBox="0 0 64 64">${d.markup}${w.markup}${halo(p, d)}
    <path d="M27 16 H37 L39 50 Q32 62 25 50 Z" fill="url(#${w.id.s})"
      stroke="#241708" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M29.5 20 L29.5 50" stroke="${wood.l}" stroke-width="1.4" opacity="0.4"/>
    <path d="M24 44 L32 41 L40 44" fill="none" stroke="${p.d}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M32 46 Q30 52 33 55" fill="none" stroke="${p.m}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M5 30 C16 15 48 15 59 30" fill="none" stroke="url(#${d.id.s})"
      stroke-width="6.5" stroke-linecap="round"/>
    <path d="M5 30 C16 17 48 17 59 30" fill="none" stroke="${p.l}"
      stroke-width="1.6" opacity="0.4" stroke-linecap="round"/>
    <path d="M5 30 L32 38 L59 30" fill="none" stroke="#efe4c4" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M30 12 L34 12 L34 34 L30 34 Z" fill="${p.d}" stroke="${p.l}" stroke-width="1.1"/>
    <path d="M32 8 L36 14 L28 14 Z" fill="${p.l}"/>
    ${sparks(p)}</svg>`;
}

/* An arrow: diagonal shaft, broadhead, three vanes. A bolt is stubbier with a
   small collar instead of fletching. */
function arrowSVG(p, bolt) {
  const wood = {l:'#c09a63', m:'#8a6236', d:'#3f2b14'};
  const d = defs(p);
  const w = defs(wood);
  const x0 = bolt ? 22 : 14, y0 = bolt ? 42 : 50;
  return `<svg class="ev-icon" viewBox="0 0 64 64">${d.markup}${w.markup}${halo(p, d)}
    <path d="M${x0} ${y0} L48 16" stroke="url(#${w.id.s})" stroke-width="${bolt ? 6 : 4.4}" stroke-linecap="round"/>
    <path d="M${x0 + 2} ${y0 - 2} L46 18" stroke="${wood.l}" stroke-width="1.2" opacity="0.45" stroke-linecap="round"/>
    <path d="M58 6 L44 10 L54 20 Z" fill="url(#${d.id.s})" stroke="#1a1206" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M58 6 L48 12.5 L54 20 Z" fill="${p.l}" opacity="0.35"/>
    ${bolt
      ? `<rect x="17" y="39" width="12" height="7" rx="2" transform="rotate(-45 23 42)" fill="${p.d}" stroke="${p.l}" stroke-width="1.1"/>`
      : `<path d="M14 50 L6 46 L10 56 Z" fill="${p.m}" stroke="#1a1206" stroke-width="1"/>
         <path d="M18 46 L10 42 L14 52 Z" fill="${p.l}" opacity="0.75" stroke="#1a1206" stroke-width="0.9"/>
         <path d="M22 42 L14 38 L18 48 Z" fill="${p.m}" opacity="0.9" stroke="#1a1206" stroke-width="0.9"/>`}
    ${sparks(p)}</svg>`;
}

/* Shared materials. Plain wood and bone tones, no tiering. */
function featherSVG() {
  return `<svg class="ev-icon" viewBox="0 0 64 64"><defs>
    <linearGradient id="ftr" x1="0.2" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#f2e9d4"/><stop offset="0.5" stop-color="#b9ab8c"/>
      <stop offset="1" stop-color="#5e5240"/></linearGradient></defs>
    <path d="M50 8 C30 14 16 32 12 54 C34 50 52 34 56 12 Z" fill="url(#ftr)" stroke="#2e281c" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M54 10 L10 56" stroke="#6a5f48" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M46 14 L28 22 M42 20 L24 30 M38 27 L21 38 M34 34 L18 45"
      stroke="#7d7159" stroke-width="1" opacity="0.55"/>
    <path d="M10 56 L6 60" stroke="#4a4130" stroke-width="2.2" stroke-linecap="round"/></svg>`;
}
function shaftSVG(p) {
  const d = defs(p);
  return `<svg class="ev-icon" viewBox="0 0 64 64">${d.markup}${halo(p, d)}
    <path d="M16 54 L44 10 M24 56 L52 12 M8 50 L36 6"
      stroke="url(#${d.id.s})" stroke-width="5" stroke-linecap="round"/>
    <path d="M14 42 C24 46 34 40 44 44" stroke="#6d4a26" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    ${sparks(p)}</svg>`;
}
function stringSVG() {
  return `<svg class="ev-icon" viewBox="0 0 64 64">
    <ellipse cx="32" cy="34" rx="20" ry="21" fill="none" stroke="#d8cfae" stroke-width="4.4"/>
    <ellipse cx="32" cy="34" rx="20" ry="21" fill="none" stroke="#8d8464" stroke-width="1.6" stroke-dasharray="4 5"/>
    <ellipse cx="32" cy="13" rx="9" ry="6" fill="none" stroke="#d8cfae" stroke-width="4"/>
    <path d="M25 50 L32 58 L39 50" fill="none" stroke="#b5aa85" stroke-width="2.6" stroke-linecap="round"/></svg>`;
}
function quiverSVG() {
  return `<svg class="ev-icon" viewBox="0 0 64 64"><defs>
    <linearGradient id="qv" x1="0.1" y1="0" x2="1" y2="0.3">
      <stop offset="0" stop-color="#a87a44"/><stop offset="0.5" stop-color="#6d4a26"/>
      <stop offset="1" stop-color="#2e1d0c"/></linearGradient></defs>
    <path d="M28 6 L40 8 L44 12 L36 12 Z" fill="#8a6236"/>
    <path d="M22 14 L46 18 L40 58 Q32 62 24 56 Z" fill="url(#qv)" stroke="#1e1408" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M22 26 L45 30 M23 40 L43 43" stroke="#3f2b14" stroke-width="2.6"/>
    <path d="M26 14 L20 4 M32 15 L32 3 M39 16 L44 5" stroke="#c09a63" stroke-width="3" stroke-linecap="round"/>
    <path d="M20 4 L16 0 M32 3 L32 -1 M44 5 L48 1" stroke="#d8cfae" stroke-width="2.4" stroke-linecap="round"/></svg>`;
}

/* ── the Fletching tree, as proposed ─────────────────────────────────────── */
const TREE = [
  {t:'The Bench', req:0, nodes:[
    ['Steady Hands', 12, '+2% Fletching speed per rank'],
    ['Straight Grain', 10, '+3% Fletching XP per rank'],
    ['Bulk Fletcher', 8, '+2% chance of a double batch per rank'],
  ]},
  {t:'The Quiver', req:12, nodes:[
    ['Salvager', 10, '+6% of spent ammunition recovered after a fight'],
    ['Splitter', 6, '+1 extra shaft per log every 2 ranks'],
  ]},
  {t:'The Draw', req:20, nodes:[
    ['Keen Heads', 8, '+1% ranged accuracy per rank with ammunition you fletched'],
    ['Quiverfull', 6, '+25 quiver capacity per rank'],
    ['Practised Draw', 8, '+1% ranged damage per rank'],
  ]},
  {t:'Master', req:40, nodes:[
    ["Fletcher's Eye", 1, 'Arrows show their real damage per second in the panel'],
    ['Windcutter', 5, '+2% chance a shot cannot miss'],
    ['Master Fletcher', 1, 'Ammunition recovery applies to bolts as well as arrows'],
    ['Barbed', 6, '+1.5% bleed chance per rank on a landed shot'],
  ]},
  {t:'Grandmaster', req:75, nodes:[
    ['Swift Bench', 5, '+2% Fletching speed per rank, grandmaster'],
    ['Woodsong', 5, '+4% Fletching XP per rank, grandmaster'],
    ['Deep Quiver', 5, '+4% ammunition recovered per rank, grandmaster'],
    ['Endless Quiver', 1, '5% chance a shot consumes no ammunition'],
    ['Fletching Cape', 1, 'The capstone'],
  ]},
];
const TREE_TOTAL = TREE.reduce((a, t) => a + t.nodes.reduce((b, n) => b + n[1], 0), 0);

/* ── page ─────────────────────────────────────────────────────────────────── */
const cell = (svg, name, sub, tag) =>
  `<div class="rp-cell"><span class="rp-ic">${svg}</span>
     <b>${name}</b>${sub ? `<i>${sub}</i>` : ''}${tag ? `<em>${tag}</em>` : ''}</div>`;

const rowOf = (items) => `<div class="rp-row">${items.join('')}</div>`;

let html = `<!doctype html><meta charset="utf-8"><title>Ranged + Fletching</title>
<style>
:root{--bg:#181109;--panel:#251a10;--raised:#32241566;--raised-s:#322415;--text:#ead9b5;
  --muted:#a08a64;--trim:#c79b4e;--trim-d:#6e552c;--ember:#e0762f;--green:#7da33f;--blue:#5a8fcb}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--text);margin:0;padding:26px 30px 60px;
  font-family:'Crimson Pro',Georgia,serif;font-size:15px}
h1{font-family:Cinzel,Georgia,serif;color:#fbeed0;font-size:27px;margin:0 0 4px}
.sub{color:var(--muted);font-size:14px;margin:0 0 26px}
h2{font-family:Cinzel,Georgia,serif;color:var(--trim);font-size:18px;
  margin:34px 0 4px;border-bottom:1px solid var(--trim-d);padding-bottom:6px}
.note{color:var(--muted);font-size:13.5px;line-height:1.6;margin:8px 0 14px;max-width:104ch}
.rp-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.rp-cell{width:126px;background:linear-gradient(180deg,var(--raised-s),#22180d);
  border:1px solid var(--trim-d);border-radius:10px;padding:11px 8px;text-align:center}
.rp-ic{display:flex;align-items:center;justify-content:center;height:56px;font-size:48px;margin-bottom:6px}
.ev-icon{width:1em;height:1em}
.rp-cell b{display:block;font-family:Cinzel,Georgia,serif;font-size:13px;color:#fbeed0;line-height:1.25}
.rp-cell i{display:block;font-style:normal;font-family:ui-monospace,Consolas,monospace;
  font-size:11px;color:var(--muted);margin-top:3px}
.rp-cell em{display:inline-block;font-style:normal;font-family:ui-monospace,Consolas,monospace;
  font-size:10.5px;color:var(--ember);border:1px solid var(--trim-d);border-radius:999px;
  padding:1px 7px;margin-top:5px}
.mat{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.mat .rp-cell{width:112px}
table{border-collapse:collapse;font-size:13.5px;margin:6px 0 12px}
th,td{border:1px solid var(--trim-d);padding:6px 11px;text-align:left}
th{background:#2a1e12;color:var(--trim);font-family:Cinzel,Georgia,serif;font-weight:normal;font-size:12.5px}
td.n{font-family:ui-monospace,Consolas,monospace;text-align:right;color:#fbeed0}
.tree{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:7px;margin-bottom:14px}
.tnode{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;
  background:#150e07;border:1px solid var(--trim-d);border-radius:9px;padding:9px 11px}
.tnode b{display:block;font-family:Cinzel,Georgia,serif;font-size:13.5px;color:#fbeed0}
.tnode span{display:block;font-size:12px;color:var(--muted);line-height:1.45;margin-top:3px}
.tnode em{font-style:normal;font-family:ui-monospace,Consolas,monospace;font-size:12.5px;color:var(--text)}
.tier{font-family:ui-monospace,Consolas,monospace;font-size:11px;letter-spacing:.15em;
  text-transform:uppercase;color:var(--muted);margin:14px 0 7px;display:flex;gap:9px;align-items:center}
.tier::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--trim-d),transparent)}
.warn{background:#1f1408;border:1px solid #5a3e18;border-radius:8px;padding:11px 14px;
  color:#e0a36f;font-size:13.5px;line-height:1.55;max-width:104ch;margin:10px 0 6px}
.warn b{color:#f5c98a}
.small{font-size:20px}
</style>
<h1>Ranged and Fletching</h1>
<p class="sub">Proposal art and layout. Nothing here is in the game. Sizes shown at 48px and again at 20px, which is what a satchel row actually draws.</p>
`;

html += `<h2>Bows</h2>
<p class="note">Two handed, light class so the Rogue bonus applies, faster swing, no shield.
Seven tiers off the wood ladder that already exists. Shortbows curl at the tips, longbows straighten out and gain reach.</p>`;
html += rowOf(WOOD.map(w => cell(bowSVG(w, false), w.n + ' Shortbow', 'Fletching ' + w.lv, 'wood T' + (WOOD.indexOf(w) + 1))));
html += rowOf(WOOD.slice(2).map(w => cell(bowSVG(w, true), w.n + ' Longbow', 'Fletching ' + (w.lv + 4), 'reach')));

html += `<h2>Crossbows</h2>
<p class="note">One handed, so the shield or buckler stays. Slower swing, better accuracy, heavier bolts.
Nine tiers off the metal ladder, one per bar, no new materials.</p>`;
html += rowOf(METAL.map(m => cell(crossbowSVG(m), m.n + ' Crossbow', 'Fletching ' + m.lv, 'metal T' + (METAL.indexOf(m) + 1))));

html += `<h2>Arrows</h2>
<p class="note">The ammunition carries the damage; the bow carries accuracy and speed. One consumed per shot,
some proportion recovered afterwards depending on the Salvager line.</p>`;
html += rowOf(METAL.map(m => cell(arrowSVG(m, false), m.n + ' Arrow', '+' + m.str + ' str', 'x12 a batch')));

html += `<h2>Bolts</h2>
<p class="note">Same ladder at +15% strength and a dearer recipe, which is where the crossbow's slower swing is paid back.
No fletching on a bolt, so no feathers: they cost metal instead.</p>`;
html += rowOf(METAL.map(m => cell(arrowSVG(m, true), m.n + ' Bolt', '+' + Math.round(m.str * 1.15) + ' str', 'x12 a batch')));

html += `<h2>The bench</h2>
<p class="note">Four skills feed Fletching. Feathers are the only genuinely new material, and they get three sources
so the loop can never hard block: a common drop in Thornwood and Frostfang, eight from a Bird's Nest, which currently does nothing at all, and a poor rate at the shop for three in the morning.</p>`;
html += `<div class="mat">
  ${cell(featherSVG(), 'Feather', 'new drop')}
  ${cell(shaftSVG(WOOD[1]), 'Oak Shafts', '12 per log')}
  ${cell(shaftSVG(WOOD[5]), 'Shadow Shafts', '12 per log')}
  ${cell(stringSVG(), 'Bowstring', '3 spider silk')}
  ${cell(quiverSVG(), 'Quiver', 'new body slot')}
</div>`;

html += `<h2>At 20px, which is the size that matters</h2>
<p class="note">Everything above redrawn at satchel-row size. If a silhouette does not survive here it is the wrong silhouette.</p>
<div class="rp-row" style="gap:6px">`;
const smalls = [bowSVG(WOOD[0], false), bowSVG(WOOD[3], true), bowSVG(WOOD[6], true),
  crossbowSVG(METAL[0]), crossbowSVG(METAL[4]), crossbowSVG(METAL[8]),
  arrowSVG(METAL[0], false), arrowSVG(METAL[5], false), arrowSVG(METAL[8], false),
  arrowSVG(METAL[2], true), arrowSVG(METAL[7], true),
  featherSVG(), shaftSVG(WOOD[2]), stringSVG(), quiverSVG()];
html += smalls.map(s => `<span class="rp-ic small" style="height:auto;width:34px;display:inline-flex;
  background:#1d1409;border:1px solid var(--trim-d);border-radius:7px;padding:6px;margin:0">${s}</span>`).join('');
html += `</div>`;

html += `<h2>How it fights</h2>
<table>
<tr><th></th><th>Melee today</th><th>Bow</th><th>Crossbow</th></tr>
<tr><td>Accuracy from</td><td>Attack x1.5 + gear atk x3.5</td><td>Ranged x1.5 + gear rAtk x3.5</td><td>same, +18%</td></tr>
<tr><td>Damage from</td><td>Strength x1.6 + gear str x5.0</td><td>Ranged x1.35 + (bow + arrow) str x5.0</td><td>same, bolts +15%</td></tr>
<tr><td>Swing</td><td class="n">x1.00</td><td class="n">x0.85</td><td class="n">x1.15</td></tr>
<tr><td>Hands</td><td>one, or two</td><td>two</td><td>one</td></tr>
<tr><td>Costs</td><td>nothing</td><td>one arrow a shot</td><td>one bolt a shot</td></tr>
<tr><td>Armour</td><td>plate</td><td colspan="2">leather, all ten tiers, with a ranged accuracy penalty on metal</td></tr>
</table>
<div class="warn"><b>The 1.35 is the whole balance question.</b> Melee spends two skills to reach a given power,
attack for accuracy and strength for damage. Ranged spends one. So one ranged level has to be worth less than
one attack level plus one strength level, or ranged simply wins. 1.35 against melee's 1.6 is a starting guess and
nothing more: it needs a simulator before any of this ships, targeting ranged landing within 95 to 105% of melee
at equal investment, with the ammunition cost subtracted.</div>`;

html += `<h2>Fletching tree</h2>
<p class="note">Sixteen nodes, ${TREE_TOTAL} points, which is the hard invariant every other skill holds to.
Half the tree improves Fletching and half improves the thing Fletching makes. Salvager is the important one:
it decides whether ammunition reads as a rhythm or as a tax.</p>`;
for (const t of TREE) {
  html += `<div class="tier">${t.t}${t.req ? ' · ' + t.req + ' points spent' : ''}</div><div class="tree">`;
  for (const [n, max, d] of t.nodes)
    html += `<div class="tnode"><span><b>${n}</b><span>${d}</span></span><em>0/${max}</em></div>`;
  html += `</div>`;
}

fs.writeFileSync(path.join(__dirname, 'preview.html'), html);
console.log('preview.html written · tree total ' + TREE_TOTAL + ' points'
  + (TREE_TOTAL === 98 ? ' (invariant holds)' : ' (INVARIANT BROKEN, must be 98)'));

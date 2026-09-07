// Radcliff's Tally icon candidates. Rendered at 20/32/64 because the satchel and
// the Collection Log draw item icons at 1em off the parent font-size, which is
// ~20px in the row list — the silhouette has to survive that, not just look good
// at 64. Shipped SVGs are pulled from the live ICONS registry for comparison.
const fs=require('fs'), path=require('path');
const grab=require('./extract.js');
const refs=['trove_shallows','cape_sailing','birds_nest','gnawed_bone','ancient_bone']
  .map(id=>[id,grab(id)]).filter(x=>x[1]);

const DEFS=`<defs>
  <linearGradient id="rt_w" x1="0.05" y1="0" x2="1" y2="0.35">
    <stop offset="0" stop-color="#d9b877"/><stop offset="0.38" stop-color="#96723d"/>
    <stop offset="0.78" stop-color="#543c1c"/><stop offset="1" stop-color="#2b1d0c"/></linearGradient>
  <linearGradient id="rt_cut" x1="0" y1="0" x2="1" y2="0.4">
    <stop offset="0" stop-color="#fbeec2"/><stop offset="1" stop-color="#b0accharacters"/></linearGradient>
  <linearGradient id="rt_thong" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#9a5b28"/><stop offset="1" stop-color="#38200e"/></linearGradient>
  <radialGradient id="rt_g" cx="0.5" cy="0.5" r="0.55">
    <stop offset="0" stop-color="#e8bd57" stop-opacity="0.40"/>
    <stop offset="1" stop-color="#e8bd57" stop-opacity="0"/></radialGradient>
</defs>`.replace('#b0accharacters','#8d6c3a');

// One thick stick on the diagonal, notches biting the upper edge.
function stickD(rot, notchDepth, thong){
  const w=9.5, L=30;
  const ys=[-19,-9.5,0,9.5,19];      // notch centres
  let right=`L ${w} ${L-5} Q ${w} ${L} ${w-4} ${L}`;   // placeholder, built below
  let p=`M ${-w+4} ${-L} Q ${-w} ${-L} ${-w} ${-L+5} L ${-w} ${L-5} Q ${-w} ${L} ${-w+4} ${L} L ${w-4} ${L} Q ${w} ${L} ${w} ${L-5}`;
  for(let i=ys.length-1;i>=0;i--){
    const y=ys[i];
    p+=` L ${w} ${y+3.4} L ${w-notchDepth} ${y} L ${w} ${y-3.4}`;
  }
  p+=` L ${w} ${-L+5} Q ${w} ${-L} ${w-4} ${-L} Z`;
  let cuts='';
  for(const y of ys) cuts+=`M ${w} ${y+3.4} L ${w-notchDepth} ${y} L ${w} ${y-3.4} Z `;
  return `<svg class="ev-icon" viewBox="0 0 64 64">${DEFS}
<circle cx="32" cy="32" r="28" fill="url(#rt_g)"/>
<g transform="translate(32 32) rotate(${rot})">
  <path d="${p}" fill="url(#rt_w)" stroke="#150d05" stroke-width="1.7" stroke-linejoin="round"/>
  <path d="${cuts}" fill="url(#rt_cut)" opacity="0.72"/>
  <path d="M ${-w+4.5} ${-L+6} L ${-w+4.5} ${L-6}" stroke="#f0d7a0" stroke-width="3"
        opacity="0.34" stroke-linecap="round"/>
  <path d="M -1.5 ${-L+9} L -1.5 ${L-9}" stroke="#1e1408" stroke-width="1.3" opacity="0.34"/>
  ${thong?`<path d="M ${-w-1.5} ${L-11} H ${w+1.5} M ${-w-1.5} ${L-6} H ${w+1.5}"
        stroke="url(#rt_thong)" stroke-width="3.9" stroke-linecap="round"/>`:''}
</g></svg>`;
}

// Notches on BOTH edges, alternating — more teeth in the silhouette.
function stickE(rot){
  const w=9.5, L=30, d=6.5;
  const R=[-16,-2,12], Lft=[-23,-9,5,19];
  let p=`M ${-w+4} ${-L} Q ${-w} ${-L} ${-w} ${-L+5}`;
  for(const y of Lft) p+=` L ${-w} ${y-3.2} L ${-w+d} ${y} L ${-w} ${y+3.2}`;
  p+=` L ${-w} ${L-5} Q ${-w} ${L} ${-w+4} ${L} L ${w-4} ${L} Q ${w} ${L} ${w} ${L-5}`;
  for(let i=R.length-1;i>=0;i--) p+=` L ${w} ${R[i]+3.2} L ${w-d} ${R[i]} L ${w} ${R[i]-3.2}`;
  p+=` L ${w} ${-L+5} Q ${w} ${-L} ${w-4} ${-L} Z`;
  let cuts='';
  for(const y of Lft) cuts+=`M ${-w} ${y-3.2} L ${-w+d} ${y} L ${-w} ${y+3.2} Z `;
  for(const y of R)   cuts+=`M ${w} ${y-3.2} L ${w-d} ${y} L ${w} ${y+3.2} Z `;
  return `<svg class="ev-icon" viewBox="0 0 64 64">${DEFS}
<circle cx="32" cy="32" r="28" fill="url(#rt_g)"/>
<g transform="translate(32 32) rotate(${rot})">
  <path d="${p}" fill="url(#rt_w)" stroke="#150d05" stroke-width="1.7" stroke-linejoin="round"/>
  <path d="${cuts}" fill="url(#rt_cut)" opacity="0.7"/>
  <path d="M -3 ${-L+8} L -3 ${L-8}" stroke="#f0d7a0" stroke-width="2.6" opacity="0.3" stroke-linecap="round"/>
</g></svg>`;
}

const cands={
  'D · diagonal, deep cuts': stickD(38, 8, true),
  'D2 · steeper, no thong':  stickD(20, 8, false),
  'E · notched both edges':  stickE(38),
  'F · diagonal, shallower': stickD(38, 5.5, true),
};

const sizes=[64,32,20];
const row=(label,svg)=>`<tr><th>${label}</th>`+
  sizes.map(s=>`<td><span class="slot" style="font-size:${s}px">${svg}</span><i>${s}px</i></td>`).join('')+'</tr>';
let rows=''; for(const k in cands) rows+=row(k,cands[k]);
let refRows=''; for(const [id,svg] of refs) refRows+=row(id,svg);

fs.writeFileSync(path.join(__dirname,'sheet.html'),
`<!doctype html><meta charset="utf-8"><style>
body{background:#1a1109;color:#c9b28a;font:14px 'Segoe UI',sans-serif;margin:20px}
h2{font-family:Georgia,serif;color:#e0b64e;margin:18px 0 6px;font-size:16px}
table{border-collapse:collapse}
th{text-align:right;padding-right:12px;color:#8a7a5c;font-weight:400;font-size:12px;white-space:nowrap}
td{padding:6px 16px;text-align:center;vertical-align:middle}
.slot{display:inline-flex;align-items:center;justify-content:center;
  width:1.45em;height:1.45em;background:#2a1c10;border:1px solid #45301a;border-radius:6px}
.ev-icon{width:1em;height:1em}
i{display:block;font-style:normal;font-size:9px;color:#6b5a3e;margin-top:3px}
</style><h2>Radcliff's Tally — candidates</h2><table>${rows}</table>
<h2>Shipped SVG icons, same sizes</h2><table>${refRows}</table>`);
fs.writeFileSync(path.join(__dirname,'candidates.json'), JSON.stringify(cands,null,1));
console.log('sheet written · refs:', refs.map(r=>r[0]).join(', '));

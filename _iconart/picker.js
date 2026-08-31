/* Build a self-contained A/B picker page for the generated icons.
 *
 *     node _iconart/picker.js        -> _iconart/pick.html
 *
 * Open it in any browser. Click the version you want for each item; the choice is
 * remembered in localStorage, and "Copy picks JSON" puts a {"id":"style"} object on
 * the clipboard that pack.js reads with --picks.
 *
 * Every icon is shown BOTH at 15px on the real satchel tile (the size that decides
 * whether it works) and large (the size that shows what it is), because judging one
 * without the other is how you pick art that looks lovely and vanishes in the grid.
 */
'use strict';
const fs = require('fs'), path = require('path');
const CUT = path.join(__dirname, 'cut');
const OUT = path.join(__dirname, 'pick.html');
const { FAMILIES } = require('./subjects');

const uri = f => 'data:image/png;base64,' + fs.readFileSync(path.join(CUT, f)).toString('base64');
const hasF = f => fs.existsSync(path.join(CUT, f));

const rows = [];
for (const fam of Object.keys(FAMILIES)) {
  const items = FAMILIES[fam].filter(s => hasF(s.id + '__painted.png') || hasF(s.id + '__emblem.png'));
  if (items.length) rows.push({ fam, items });
}
const n = rows.reduce((a, r) => a + r.items.length, 0);

const card = (id, st) => {
  const f = id + '__' + st + '.png';
  if (!hasF(f)) return `<div class="opt missing">not generated</div>`;
  const u = uri(f);
  return `<button class="opt" data-id="${id}" data-style="${st}">
      <span class="big"><img src="${u}"></span>
      <span class="real"><span class="tile"><img src="${u}"></span><em>15px</em></span>
      <span class="tag">${st}</span>
    </button>`;
};

const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Cindervale — pick item icons</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#181109;color:#ead9b5;font-family:ui-monospace,Consolas,monospace;font-size:13px;padding:22px 26px 90px}
h1{font-size:15px;letter-spacing:.2em;text-transform:uppercase;color:#c79b4e;margin-bottom:5px}
.sub{color:#8a7350;margin-bottom:22px;line-height:1.5}
h2{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#8a7350;
   margin:26px 0 10px;border-bottom:1px solid #33240f;padding-bottom:6px}
.item{display:flex;align-items:center;gap:14px;margin-bottom:9px}
.name{width:130px;text-align:right;color:#c79b4e;flex:none}
.opts{display:flex;gap:10px}
.opt{display:flex;align-items:center;gap:11px;padding:8px 12px;border-radius:9px;cursor:pointer;
  background:linear-gradient(180deg,#2a1d10,#1a1108);color:#9a8462;font-family:inherit;font-size:11px;
  border:0;box-shadow:inset 0 1px 0 rgba(214,170,96,.14), inset 0 -1px 0 rgba(0,0,0,.5);
  transition:box-shadow .12s,color .12s}
.opt:hover{color:#f0c772;box-shadow:inset 0 1px 0 rgba(240,199,114,.3), 0 0 0 1px rgba(199,155,78,.4)}
.opt.sel{color:#f0c772;box-shadow:inset 0 1px 0 rgba(240,199,114,.4), 0 0 0 2px #c79b4e}
.opt.missing{opacity:.35;cursor:default}
.big{display:grid;place-items:center;width:74px;height:74px;border-radius:7px;
  background:linear-gradient(180deg,#241809,#150c05);box-shadow:inset 0 -1px 0 rgba(0,0,0,.5)}
.big img{width:66px;height:66px;object-fit:contain}
.real{display:flex;flex-direction:column;align-items:center;gap:4px}
.tile{display:grid;place-items:center;width:26px;height:26px;border-radius:5px;
  background:linear-gradient(180deg,#2a1d10,#1a1108);box-shadow:inset 0 1px 0 rgba(214,170,96,.17)}
.tile img{width:15px;height:15px;object-fit:contain}
.real em{font-style:normal;font-size:9px;color:#6e5a3c}
.tag{letter-spacing:.14em;text-transform:uppercase}
.bar{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:14px;
  padding:13px 26px;background:linear-gradient(180deg,#31220f,#1c1308);
  box-shadow:0 -4px 14px rgba(0,0,0,.55);border-top:1px solid rgba(224,118,47,.45)}
button.act{border:0;border-radius:7px;padding:9px 15px;cursor:pointer;color:#ead9b5;
  font-family:inherit;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
  background:linear-gradient(180deg,#31230f,#1e1409);
  box-shadow:inset 0 1px 0 rgba(214,170,96,.17), inset 0 -1px 0 rgba(0,0,0,.55)}
button.act:hover{color:#f0c772;box-shadow:inset 0 1px 0 rgba(240,199,114,.3), 0 0 0 1px rgba(199,155,78,.4)}
#count{color:#8a7350}
#out{position:fixed;inset:8% 12%;display:none;z-index:9;flex-direction:column;gap:10px;
  background:#1c1308;border:1px solid #c79b4e;border-radius:10px;padding:18px}
#out textarea{flex:1;background:#120c05;color:#ead9b5;border:1px solid #4a3a1e;border-radius:6px;
  padding:12px;font-family:inherit;font-size:12px;resize:none}
</style></head><body>
<h1>Item icons — pick one of each</h1>
<div class="sub">${n} items, two directions each. The small tile is the real size in the satchel (15px), the big one is just so you can see what it is.<br>
Choices save as you click. When you are done, hit <b>Copy picks JSON</b> and paste it back to me — or just say "all painted" / "all emblem" if one direction wins outright.</div>

${rows.map(r => `<h2>${r.fam.replace('_', ' ')} &nbsp;<span style="color:#5f4d33">${r.items.length}</span></h2>
${r.items.map(s => `<div class="item"><div class="name">${s.id}</div>
  <div class="opts">${card(s.id, 'painted')}${card(s.id, 'emblem')}</div></div>`).join('')}`).join('')}

<div class="bar">
  <button class="act" id="allP">All painted</button>
  <button class="act" id="allE">All emblem</button>
  <button class="act" id="copy">Copy picks JSON</button>
  <button class="act" id="show">Show JSON</button>
  <span id="count"></span>
</div>
<div id="out"><textarea id="ta" readonly></textarea><button class="act" id="close">Close</button></div>
<script>
var KEY='cv_icon_picks';
var picks={};
try{ picks=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ picks={}; }
var ids=[].slice.call(document.querySelectorAll('.opt[data-id]')).map(function(b){return b.dataset.id;});
ids=ids.filter(function(v,i,a){return a.indexOf(v)===i;});

function paint(){
  document.querySelectorAll('.opt[data-id]').forEach(function(b){
    b.classList.toggle('sel', picks[b.dataset.id]===b.dataset.style);
  });
  var done=ids.filter(function(i){return picks[i];}).length;
  document.getElementById('count').textContent=done+' of '+ids.length+' chosen';
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(picks)); }catch(e){} paint(); }

document.addEventListener('click', function(e){
  var b=e.target.closest('.opt[data-id]'); if(!b) return;
  picks[b.dataset.id]=b.dataset.style; save();
});
document.getElementById('allP').onclick=function(){ ids.forEach(function(i){picks[i]='painted';}); save(); };
document.getElementById('allE').onclick=function(){ ids.forEach(function(i){picks[i]='emblem';}); save(); };
document.getElementById('show').onclick=function(){
  document.getElementById('ta').value=JSON.stringify(picks,null,1);
  document.getElementById('out').style.display='flex';
};
document.getElementById('close').onclick=function(){ document.getElementById('out').style.display='none'; };
document.getElementById('copy').onclick=function(){
  var t=JSON.stringify(picks,null,1);
  navigator.clipboard.writeText(t).then(function(){
    document.getElementById('copy').textContent='Copied';
    setTimeout(function(){document.getElementById('copy').textContent='Copy picks JSON';},1400);
  },function(){
    document.getElementById('ta').value=t; document.getElementById('out').style.display='flex';
  });
};
paint();
</script></body></html>`;

fs.writeFileSync(OUT, html);
console.log('wrote pick.html  (' + n + ' items, ' + (html.length / 1048576).toFixed(1) + ' MB)');

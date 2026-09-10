const fs=require('fs');const html=fs.readFileSync('cindervale.html','utf8');
const {JSDOM}=require('jsdom');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,
 beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:UA,configurable:true});}});
setTimeout(()=>{const w=dom.window,ev=e=>w.eval(e);ev('state=defaultState();normalizeState();');
console.log(JSON.parse(ev(`JSON.stringify((function(){
  var o=[];
  var zb=(typeof ZONE_BG!=='undefined')?ZONE_BG:{};
  o.push('ZONE BACKGROUNDS ('+Object.keys(zb).length+' entries)');
  ZONES.forEach(function(z){ o.push('  '+(zb[z.id]?'yes':'NONE').padEnd(6)+z.name); });
  o.push('  --- raids ---');
  RAIDS.forEach(function(r){ o.push('  '+(zb[r.id]?'yes':'NONE').padEnd(6)+r.name); });
  o.push('');
  var art=(typeof MON_ART!=='undefined')?MON_ART:{};
  o.push('MONSTER PORTRAITS');
  var painted=0, svg=0, list=[];
  MONSTERS.forEach(function(m){
    var ic=String(ICONS[m.id]||'');
    if(/^<img/.test(ic)) painted++; else { svg++; list.push(m.name); }
  });
  o.push('  zone monsters: '+painted+' painted, '+svg+' still SVG');
  if(list.length) o.push('    '+list.slice(0,10).join(', '));
  var rp=0, rs=0, rlist=[];
  RAIDS.forEach(function(r){ (r.stages||[]).forEach(function(s){
    var ic=String(ICONS[s.id]||'');
    if(/^<img/.test(ic)) rp++; else { rs++; rlist.push(s.name); }
  });});
  o.push('  raid foes:     '+rp+' painted, '+rs+' still SVG');
  if(rlist.length) o.push('    '+rlist.join(', '));
  o.push('');
  o.push('RAID ABILITY ICONS');
  o.push('  '+RAID_ABILS.map(function(a){return a.name+': '+(ICONS['ui_'+a.id]?'yes':'no icon, text only');}).join('  |  '));
  o.push('');
  o.push('SPIRE ROSTER — does it need new monsters?');
  var ids={};
  for(var f=1;f<=40;f++){ var m=spireFloor(f,true); ids[m.name]=1; }
  o.push('  floors 1-40 draw '+Object.keys(ids).length+' distinct creatures, all recycled from the four fixed raids');
  return o;
})())`)).join('\n'));
process.exit(0);},2500);

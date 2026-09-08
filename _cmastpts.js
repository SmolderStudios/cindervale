const fs=require('fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('cindervale.html','utf8'),
  {url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
setTimeout(()=>{
  console.log(dom.window.eval(`(function(){
    state=defaultState(); normalizeState(); demoXpCap=function(){return XP_CAP;};
    for(var k in state.combatXp) state.combatXp[k]=XP_CUM[99];
    var cl=combatLevel(), bosses=MONSTERS.filter(function(m){return m.boss;}).length;
    var zones=ZONES.length, total=(cl-1)+4+bosses+zones;
    var by={}; CMAST_NODES.forEach(function(n){ by[n.tree]=(by[n.tree]||0)+n.max; });
    var o=[];
    o.push('  points per column');
    for(var k in by) o.push('    '+k.padEnd(8)+String(by[k]).padStart(4));
    o.push('    ' + '-'.repeat(14));
    o.push('    board   '+String(CMAST_CAP).padStart(4)+'   across '+CMAST_NODES.length+' nodes');
    o.push('    earned  '+String(total).padStart(4)+'   you can fill '+Math.round(Math.min(total,CMAST_CAP)/CMAST_CAP*100)+'%');
    var ids=CMAST_NODES.map(function(n){return n.id;});
    var dup=ids.filter(function(x,i){return ids.indexOf(x)!==i;});
    o.push('    duplicate ids: '+(dup.length?dup.join(','):'none'));
    var bad=CMAST_NODES.filter(function(n){
      return (n.prereq||[]).some(function(p){ return !CMAST_BY_ID[p.split(':')[0]]; }); });
    o.push('    dangling prereqs: '+(bad.length?bad.map(function(n){return n.id;}).join(','):'none'));
    var noIco=CMAST_NODES.filter(function(n){ return !CMAST_ICONS[n.id]||!CMAST_ICON_SVG[CMAST_ICONS[n.id]]; });
    o.push('    nodes with no icon: '+(noIco.length?noIco.map(function(n){return n.id;}).join(','):'none'));
    return o.join(String.fromCharCode(10));
  })()`));
},3000);

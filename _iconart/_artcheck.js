/* What still has no art. Asks the RUNNING game: the packs are spliced into ICONS as
   <img> strings, so "has art" is just "its ICONS entry is an image, not an SVG". */
'use strict';
const path=require('path');
const KIT='C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer=require(KIT+'/node_modules/puppeteer-core');
const CHROME=KIT+'/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
(async()=>{
  const b=await puppeteer.launch({executablePath:CHROME,headless:'new'});
  const p=await b.newPage();
  await p.goto(require('url').pathToFileURL(path.join(__dirname,'..','cindervale.html')).href+'?cvdev=1',{waitUntil:'load'});
  await new Promise(r=>setTimeout(r,3000));
  const r=await p.evaluate(()=>{
    const G=n=>{try{return eval(n)}catch(e){return undefined}};
    const IC=G('ICONS')||{};
    const kind=id=>{const v=IC[id];if(!v)return 'none';return /^<img/.test(v)?'art':'svg'};
    const tally=ids=>{const t={art:0,svg:0,none:0},miss=[];
      for(const id of ids){const k=kind(id);t[k]++;if(k!=='art')miss.push(id+':'+k)}
      return {t,miss}};
    const out={};
    out.items=tally(Object.keys(G('ITEMS')||{}));
    // monster ids: whatever the zone table calls them
    const Z=G('ZONES')||G('COMBAT_ZONES')||G('ZONE_LIST')||[];
    const mon=new Set();
    const walk=o=>{if(!o||typeof o!=='object')return;
      if(o.id&&(o.hp!==undefined||o.maxHp!==undefined||o.atk!==undefined))mon.add(o.id);
      for(const k in o)if(typeof o[k]==='object')walk(o[k])};
    walk(Z); walk(G('MONSTERS'));
    out.monsters=tally([...mon]);
    /* PETS is keyed by ZONE, with the familiar's own id inside — one level down. */
    const P=G('PETS')||{}, petIds=[];
    for(const z in P){const v=P[z];
      if(v&&v.id)petIds.push(v.id);
      else if(Array.isArray(v))v.forEach(x=>x&&x.id&&petIds.push(x.id));
      else if(v&&typeof v==='object')for(const k in v){if(v[k]&&v[k].id)petIds.push(v[k].id);}}
    out.pets=tally(petIds.length?petIds:Object.keys(P));
    const all=Object.keys(IC);
    out.iconsTotal=all.length;
    out.iconsArt=all.filter(id=>kind(id)==='art').length;
    out.iconsSvg=all.filter(id=>kind(id)==='svg').length;
    out.zonesFound=Array.isArray(Z)?Z.length:Object.keys(Z||{}).length;
    /* Everything left on a hand-drawn SVG, grouped by prefix, so it is obvious at a
       glance whether the remainder is deliberate chrome or a family nobody drew. */
    out.svgLeft=all.filter(id=>kind(id)==='svg').sort();
    return out;
  });
  await b.close();
  const line=(k,c)=>console.log(k.padEnd(10)+String(c.t.art).padStart(4)+' art  '+String(c.t.svg).padStart(4)+' svg  '+String(c.t.none).padStart(4)+' no icon'+(c.miss.length&&c.miss.length<=45?'\n            '+c.miss.join('  '):''));
  line('items',r.items); line('monsters',r.monsters); line('pets',r.pets);
  console.log('zones seen: '+r.zonesFound);
  console.log('ICONS total '+r.iconsTotal+'  ('+r.iconsArt+' painted images, '+r.iconsSvg+' hand-drawn SVG)');
  const grp={};
  for(const id of r.svgLeft){const k=id.split('_')[0];(grp[k]=grp[k]||[]).push(id);}
  console.log('');
  console.log('still hand-drawn SVG, by prefix:');
  for(const k of Object.keys(grp).sort())console.log('  '+(k+' ').padEnd(12)+grp[k].length+'   '+grp[k].slice(0,8).join(' ')+(grp[k].length>8?' ...':''));
})().catch(e=>{console.error(e.message);process.exit(1);});

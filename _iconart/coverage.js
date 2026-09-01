/* What is still an SVG, grouped the way the art batches would be drawn.
 *
 *     node _iconart/coverage.js            summary
 *     node _iconart/coverage.js --list     every remaining id, by group
 *
 * Asks the running game what iconHTML() actually returns for each id, rather than
 * regexing the source: the art blocks assign over ICONS, so the source shows both
 * the old SVG and the new img and only the live table knows which one wins.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const raw = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const LIST = process.argv.includes('--list');

(async () => {
  const dom = new JSDOM(raw, { url: 'http://localhost/?cvdev=1', runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); } });
  await new Promise(r => setTimeout(r, 2500));

  const rows = dom.window.eval(`(function(){
    state=defaultState(); normalizeState();
    var out=[];
    for(var id in ITEMS){
      var it=ITEMS[id]||{}, h='';
      try{ h=iconHTML(id)||''; }catch(e){ h='ERR'; }
      var kind = h.indexOf('<img')===0 ? 'art' : (h.indexOf('<svg')>=0 ? 'svg' : 'none');
      var grp;
      if(it.cgear) grp = 'gear:'+(it.cslot||'?');
      else if(it.tool) grp = 'tool';
      else if(it.seed || /_seed$/.test(id)) grp = 'seed';
      else if(it.heal || it.eat) grp = 'food';
      else if(it.potion || /^pot_/.test(id)) grp = 'potion';
      else grp = 'other';
      out.push({id:id, name:it.name||id, kind:kind, grp:grp, tier:it.ctier||0});
    }
    return JSON.stringify(out);
  })()`);
  const items = JSON.parse(rows);

  const tally = {};
  for (const r of items) {
    const t = tally[r.grp] || (tally[r.grp] = { art: 0, svg: 0, none: 0, ids: [] });
    t[r.kind]++;
    if (r.kind !== 'art') t.ids.push(r.id);
  }
  const tot = { art: 0, svg: 0, none: 0 };
  console.log('group                 painted    svg   none   left');
  for (const g of Object.keys(tally).sort()) {
    const t = tally[g];
    tot.art += t.art; tot.svg += t.svg; tot.none += t.none;
    console.log('  ' + g.padEnd(20) + String(t.art).padStart(5) + String(t.svg).padStart(7) +
      String(t.none).padStart(7) + String(t.svg + t.none).padStart(7));
  }
  console.log('  ' + 'TOTAL'.padEnd(20) + String(tot.art).padStart(5) + String(tot.svg).padStart(7) +
    String(tot.none).padStart(7) + String(tot.svg + tot.none).padStart(7) + '   of ' + items.length);

  fs.writeFileSync(path.join(__dirname, 'coverage.json'),
    JSON.stringify(items.filter(r => r.kind !== 'art'), null, 1));
  console.log('\nremaining ids -> _iconart/coverage.json');
  if (LIST) for (const g of Object.keys(tally).sort())
    if (tally[g].ids.length) console.log('\n' + g + '\n  ' + tally[g].ids.join(' '));
})().catch(e => { console.error(e); process.exit(1); });

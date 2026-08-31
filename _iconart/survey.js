/* Which items actually need painted art, and how big the job is.
 *
 *     node _iconart/survey.js        ->  _iconart/items.json + a summary
 *
 * Boots the real game so itemCat() and the live ITEMS/ICONS tables decide the
 * answer, rather than a regex over the source guessing at it.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const REPO = path.join(__dirname, '..');
const raw = fs.readFileSync(path.join(REPO, 'cindervale.html'), 'utf8');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';

(async () => {
  const dom = new JSDOM(raw, {
    url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); },
  });
  await new Promise(r => setTimeout(r, 2500));

  const data = dom.window.eval(`(function(){
    state=defaultState(); normalizeState();
    // Which skill produces each item? Read it off the activity tables, so the
    // grouping is the game's own and not a guess from the id prefix.
    const bySkill={};
    for(const sk in SKILLS){
      const acts=(SKILLS[sk]&&SKILLS[sk].acts)||[];
      for(const a of acts){
        for(const k in (a.out||{})) (bySkill[k]=bySkill[k]||new Set()).add(sk);
        for(const k in (a.inp||{})) (bySkill[k]=bySkill[k]||new Set()).add(sk+':input');
      }
    }
    if(typeof CROPS!=='undefined') for(const c of CROPS){
      for(const k in (c.out||{})) (bySkill[k]=bySkill[k]||new Set()).add('farming');
      if(c.seed) (bySkill[c.seed]=bySkill[c.seed]||new Set()).add('farming');
    }
    const rows=[];
    for(const id in ITEMS){
      const it=ITEMS[id];
      const skills=[...(bySkill[id]||[])];
      rows.push({
        id, name:it.name,
        cat:(typeof itemCat==='function')?itemCat(id):'?',
        skills,
        sell:it.sell||0,
        cgear:!!it.cgear, ctier:it.ctier||0, cslot:it.cslot||'',
        potion:!!it.potion, rare:!!it.rare,
        hasIcon:!!ICONS[id],
      });
    }
    return {rows, cats:[...new Set(rows.map(r=>r.cat))]};
  })()`);

  fs.mkdirSync(__dirname, { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'items.json'), JSON.stringify(data.rows, null, 1));

  const byCat = {};
  for (const r of data.rows) (byCat[r.cat] = byCat[r.cat] || []).push(r);
  console.log('TOTAL ITEMS: ' + data.rows.length + '\n');
  console.log('by itemCat():');
  for (const c of Object.keys(byCat).sort()) console.log('  ' + c.padEnd(12) + byCat[c].length);

  // the skilling material families, which is what this pass is for
  const skilled = data.rows.filter(r => r.skills.length && !r.cgear && !r.potion);
  const bySk = {};
  for (const r of skilled) {
    const s = r.skills[0].split(':')[0];
    (bySk[s] = bySk[s] || []).push(r);
  }
  console.log('\nskilling materials (produced by an activity, not gear/potions): ' + skilled.length);
  for (const s of Object.keys(bySk).sort()) {
    console.log('  ' + s.padEnd(13) + String(bySk[s].length).padStart(3) + '   ' +
      bySk[s].slice(0, 6).map(r => r.id).join(', ') + (bySk[s].length > 6 ? ' ...' : ''));
  }
  dom.window.close();
})().catch(e => { console.error(e); process.exit(1); });

/* What the achievement set actually looks like against the game as it is now.
 *
 *     node _achaudit.js
 *
 * The set was written at v0.9.41. Six skills, three combat stats and four whole
 * systems have shipped since, so the question is not "is it nice" but "does any
 * of it still say true things".
 */
'use strict';
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const raw = fs.readFileSync(path.join(__dirname, 'cindervale.html'), 'utf8');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';

(async () => {
  const dom = new JSDOM(raw, { url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); } });
  await new Promise(r => setTimeout(r, 2600));

  const d = JSON.parse(dom.window.eval(`(function(){
    state=defaultState(); normalizeState();
    var icons={}; ACHIEVEMENTS.forEach(function(a){ icons[a.icon]=(icons[a.icon]||0)+1; });
    var byCat={}; ACHIEVEMENTS.forEach(function(a){ byCat[a.cat]=(byCat[a.cat]||0)+1; });
    return JSON.stringify({
      total: ACHIEVEMENTS.length,
      byCat: byCat,
      hidden: ACHIEVEMENTS.filter(function(a){return a.hidden;}).length,
      icons: icons,
      uniqueIcons: Object.keys(icons).length,
      /* the world the set is describing */
      skills: Object.keys(SKILLS).length,
      skillNames: Object.keys(SKILLS),
      zones: ZONES.length,
      zonesNonHunt: ZONES.filter(function(z){return z.type!=='hunt';}).length,
      bosses: MONSTERS.filter(function(m){return m.boss;}).length,
      pets: Object.keys(PETS).length,
      raids: (typeof RAIDS!=='undefined')?RAIDS.length:0,
      guilds: (typeof GUILDS!=='undefined')?GUILDS.length:0,
      hulls: (typeof SAIL_HULLS!=='undefined')?SAIL_HULLS.length:0,
      isles: (typeof SAIL_ISLES!=='undefined')?SAIL_ISLES.length:0,
      cmastCap: (typeof CMAST_CAP!=='undefined')?CMAST_CAP:null,
      items: Object.keys(ITEMS).length,
      /* systems with zero achievement coverage, by keyword over names+descs */
      mentions: (function(){
        var blob=ACHIEVEMENTS.map(function(a){return (a.name+' '+a.desc).toLowerCase();}).join(' | ');
        var out={};
        ['sail','ship','voyage','island','guild','quest','raid','fletch','bow','arrow','ranged',
         'thiev','steal','farm','crop','cook','fish','forage','mine','smith','slayer','mastery'
        ].forEach(function(k){ out[k]=blob.indexOf(k)>=0; });
        return out;
      })()
    });
  })()`));

  console.log('ACHIEVEMENTS: ' + d.total + '  (' + d.hidden + ' hidden)');
  console.log('by category :', JSON.stringify(d.byCat));
  console.log('\nICON REUSE — ' + d.uniqueIcons + ' distinct icons across ' + d.total + ' achievements');
  Object.entries(d.icons).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    if (v > 1) console.log('   ' + String(v) + 'x  ' + k);
  });

  console.log('\nTHE GAME NOW:');
  console.log('  skills ' + d.skills + '  (' + d.skillNames.join(', ') + ')');
  console.log('  zones ' + d.zones + ' (' + d.zonesNonHunt + ' non-hunt) · bosses ' + d.bosses +
              ' · pets ' + d.pets + ' · raids ' + d.raids);
  console.log('  guilds ' + d.guilds + ' · hulls ' + d.hulls + ' · isles ' + d.isles +
              ' · mastery cap ' + d.cmastCap + ' · items ' + d.items);

  const missing = Object.entries(d.mentions).filter(([, v]) => !v).map(([k]) => k);
  console.log('\nNEVER MENTIONED in any achievement name or description:');
  console.log('  ' + missing.join(', '));
  process.exit(0);
})();

/* Does the shape I derived from dmgType match what the item's own text says it is?
 * Sunpiercer is dmgType 'stab' but its description calls it a recurve BOW — the
 * type is a placeholder until Ranged lands. Generating a rapier for it would have
 * been simply wrong, and nothing in the pipeline would have caught it.
 */
const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const raw = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';

/* Form nouns that contradict a sword / dagger / hammer silhouette. */
const FORMS = ['bow', 'recurve', 'longbow', 'crossbow', 'scythe', 'axe', 'spear', 'lance',
  'staff', 'wand', 'whip', 'claw', 'talon', 'flail', 'mace', 'glaive', 'halberd',
  'cleaver', 'rapier', 'sabre', 'katana', 'sickle', 'trident', 'javelin', 'sling'];
const MINE = { slash: ['sword', 'greatsword'], stab: ['dagger', 'rapier'], crush: ['hammer', 'maul'] };

(async () => {
  const dom = new JSDOM(raw, { url: 'http://localhost/?cvdev=1', runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); } });
  await new Promise(r => setTimeout(r, 2500));
  const rows = JSON.parse(dom.window.eval(`(function(){var o=[];for(var id in ITEMS){var it=ITEMS[id];
    if(it.cgear&&it.cslot==='weapon') o.push({id:id,n:it.name,d:it.dmgType||'',two:!!it.twoHanded,
      t:((it.desc||'')+' '+(it.name||'')).toLowerCase()});}return JSON.stringify(o);})()`));

  const { GEAR } = require('./subjects3');
  const byId = new Map(GEAR.map(s => [s.id, s.p.toLowerCase()]));
  let n = 0;
  for (const r of rows) {
    const said = FORMS.filter(f => r.t.includes(f));   // plain substring: the word boundary escapes did not survive the heredoc
    if (!said.length) continue;
    const drew = MINE[r.d] || [];
    const mine = byId.get(r.id) || '';
    /* Fine if my prompt already draws one of the forms the text names. */
    if (said.some(f => mine.includes(f))) continue;
    /* Fine if the only form word is one my silhouette already is. */
    if (said.every(f => drew.includes(f))) continue;
    n++;
    console.log(r.n.padEnd(22) + '(' + r.d + (r.two ? ',2H' : '') + ')  text says: ' + said.join('/') +
      '   I drew: ' + (mine.split(',')[0].replace('a single ', '') || '?'));
  }
  console.log('\n' + n + ' of ' + rows.length + ' weapons where the text names a shape I did not draw');
})().catch(e => { console.error(e); process.exit(1); });

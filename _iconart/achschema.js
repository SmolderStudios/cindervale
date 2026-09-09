/* Generate the Steam achievement schema FROM THE GAME, never by hand.
 *
 *     node _iconart/achschema.js
 *
 * The old steam_achievements.txt was hand-maintained and drifted: it still said
 * 33 while the game had grown. Reading ACHIEVEMENTS means the paste-in text and
 * the thing that fires the unlock cannot disagree.
 *
 * API Name must equal the in-game id exactly - it is the string steamAchievement()
 * sends - and each row needs two 64x64 icons already sitting in the icons folder
 * as <id>.png and <id>_locked.png.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const raw = fs.readFileSync(path.join(__dirname, '..', 'cindervale.html'), 'utf8');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
const ICONS = 'C:/Users/Jordan/Desktop/Cindervale/store/achievement icons';
const OUT = path.join(ICONS, 'STEAM_SETUP.txt');

(async () => {
  const dom = new JSDOM(raw, { url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); } });
  await new Promise(r => setTimeout(r, 2600));
  const A = JSON.parse(dom.window.eval(`JSON.stringify(ACHIEVEMENTS.map(function(a){
    return {id:a.id, name:a.name, desc:a.desc, cat:a.cat, hidden:!!a.hidden}; }))`));
  const CATS = JSON.parse(dom.window.eval('JSON.stringify(ACH_CATS)'));
  const catName = Object.fromEntries(CATS);

  const w = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  const L = [];
  L.push('CINDERVALE IDLE - STEAM ACHIEVEMENT SCHEMA');
  L.push('Total: ' + A.length + '   (generated ' + new Date().toISOString().slice(0, 10) +
         ' by _iconart/achschema.js - do not hand-edit, regenerate)');
  L.push('');
  L.push('Steamworks > Technical Tools > Edit Steamworks Settings > Stats & Achievements');
  L.push('');
  L.push('API Name must match EXACTLY, case-sensitive: it is the string the game sends.');
  L.push('Each row needs TWO 64x64 icons, both already in this folder:');
  L.push('    unlocked   <id>.png');
  L.push('    locked     <id>_locked.png');
  L.push('');
  L.push('HIDDEN = tick "Hidden" so the description stays secret until it is earned.');
  L.push('');

  const miss = [];
  for (const [cid, cname] of CATS) {
    const rows = A.filter(a => a.cat === cid);
    if (!rows.length) continue;
    L.push('-'.repeat(104));
    L.push(cname.toUpperCase() + '   (' + rows.length + ')');
    L.push('-'.repeat(104));
    L.push(w('API NAME', 20) + w('DISPLAY NAME', 24) + w('HIDDEN', 8) + 'DESCRIPTION');
    for (const a of rows) {
      L.push(w(a.id, 20) + w(a.name, 24) + w(a.hidden ? 'YES' : '', 8) + a.desc);
      for (const f of [a.id + '.png', a.id + '_locked.png'])
        if (!fs.existsSync(path.join(ICONS, f))) miss.push(f);
    }
    L.push('');
  }

  L.push('-'.repeat(104));
  L.push('ICON CHECK: ' + (miss.length ? miss.length + ' MISSING -> ' + miss.join(', ')
                                       : 'all ' + (A.length * 2) + ' files present in this folder'));
  fs.writeFileSync(OUT, L.join('\r\n'), 'utf8');
  console.log('wrote ' + OUT);
  console.log('  ' + A.length + ' achievements across ' + CATS.length + ' categories');
  console.log('  icons: ' + (miss.length ? miss.length + ' MISSING (' + miss.slice(0, 6).join(', ') + ')'
                                         : 'all ' + (A.length * 2) + ' present'));
  process.exit(0);
})();

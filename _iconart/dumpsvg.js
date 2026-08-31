/* Pull the CURRENT inline-SVG icon for every subject, so the picker can show
 * what is being replaced next to what would replace it.
 *
 *     node _iconart/dumpsvg.js   ->  _iconart/svg.json  {id: "<svg .../>"}
 *
 * Reads them out of a booted game rather than regexing the source: iconHTML()
 * falls back through ICONS -> ITEMS[id].icon -> SKILLS -> SHOP, and only the live
 * lookup knows which one a given id actually resolves to.
 *
 * Skips ids already overridden by a previous item-art injection — otherwise a
 * second run would show the painted art as the "before".
 */
'use strict';
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const { ALL } = require('./subjects');

const REPO = path.join(__dirname, '..');
const raw = fs.readFileSync(path.join(REPO, 'cindervale.html'), 'utf8');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';

(async () => {
  const dom = new JSDOM(raw, {
    url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); },
  });
  await new Promise(r => setTimeout(r, 2500));
  const out = dom.window.eval(`(function(ids){
    var o = {};
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var h = (typeof iconHTML === 'function') ? iconHTML(id) : null;
      // an <img> here means a previous art pass already replaced it — not a "before"
      if (h && h.indexOf('<svg') === 0) o[id] = h;
    }
    return o;
  })(${JSON.stringify(ALL.map(s => s.id))})`);
  fs.writeFileSync(path.join(__dirname, 'svg.json'), JSON.stringify(out, null, 1));
  console.log(Object.keys(out).length + ' of ' + ALL.length + ' subjects have a current SVG -> svg.json');
  const missing = ALL.map(s => s.id).filter(id => !out[id]);
  if (missing.length) console.log('no SVG (or already art): ' + missing.join(', '));
  dom.window.close();
})().catch(e => { console.error(e); process.exit(1); });

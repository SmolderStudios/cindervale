// Builds _hdrpreview/preview.html from the real game's fonts, palette and icon
// paths, so the header mockups render in the exact typeface/colours they ship in.
const fs = require('fs');
const path = require('path');
const HERE = __dirname;
const raw  = fs.readFileSync(path.join(HERE, '..', 'cindervale.html'), 'utf8');
const game = raw.split('\n');
const fonts = game.slice(60, 62).join('\n');   // lines 61-62: @font-face (base64 woff2)
const root  = game.slice(65, 120).join('\n');  // lines 66-120: :root{ ... }

// pull the real brand mark + the real nav icons straight out of the shipped header
const mark = raw.match(/<img class="brand-mark"[\s\S]*?>/)[0];
function navIcon(id){
  const at = raw.indexOf('id="' + id + '"');
  if (at < 0) throw new Error('no button for ' + id);
  const a = raw.indexOf('<svg', at), b = raw.indexOf('</svg>', a);
  if (a < 0 || b < 0) throw new Error('no icon for ' + id);
  return raw.slice(a, b + 6);
}
const coin = raw.match(/ui_coin_sm:\s*'([\s\S]*?)',/)[1];

const map = {
  __MARK__: mark, __COIN__: coin,
  __I_SHOP__: navIcon('tabShop'),   __I_MAST__: navIcon('tabMastery'),
  __I_LOG__:  navIcon('tabComp'),   __I_ACH__:  navIcon('tabAch'),
  __I_GUILD__:navIcon('tabGuild'),  __I_EXP__:  navIcon('btnExport'),
  __I_IMP__:  navIcon('btnImport'), __I_RST__:  navIcon('btnReset'),
  __I_MENU__: navIcon('btnMenu'),
};
let body = fs.readFileSync(path.join(HERE, 'body.html'), 'utf8');
for (const k in map) body = body.split(k).join(map[k]);

const css = fs.readFileSync(path.join(HERE, 'preview.css'), 'utf8');
const out = `<!doctype html><html><head><meta charset="utf-8"><title>Header rework</title>
<style>
${fonts}
${root}
${css}
</style></head><body>
${body}
</body></html>`;
fs.writeFileSync(path.join(HERE, 'preview.html'), out);
console.log('wrote preview.html', (out.length / 1024 / 1024).toFixed(2) + ' MB');

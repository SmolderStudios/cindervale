/* Photograph the Magic prototype running in the real game.
 *
 *     node _magedesign/shoot.js            every scene -> shots/*.png
 *     node _magedesign/shoot.js fight tip  only those
 *
 * A working copy of cindervale.html is written beside this file with the design,
 * the prototype and its UI appended, loaded in headless Chrome as Electron (a
 * browser user agent is the demo build), photographed, and deleted. The game file
 * itself is only read. Net access is shimmed off and localStorage is in memory,
 * so nothing here can ping telemetry or touch a save.
 */
'use strict';
const path = require('path'), fs = require('fs');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(path.join(KIT, 'node_modules/puppeteer-core'));
const CHROME = path.join(KIT, 'browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });

const SHIM = `<script>
(function(){var mem={};var shim={getItem:function(k){return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null;},
setItem:function(k,v){mem[k]=String(v);},removeItem:function(k){delete mem[k];},clear:function(){mem={};},
key:function(i){return Object.keys(mem)[i]||null;}};
Object.defineProperty(shim,'length',{get:function(){return Object.keys(mem).length;}});
try{Object.defineProperty(window,'localStorage',{value:shim,configurable:true,writable:true});}catch(e){}
window.fetch=function(){return new Promise(function(_,r){r(new Error('preview: net off'));});};
if(navigator.sendBeacon)try{navigator.sendBeacon=function(){return false;};}catch(e){}
})();
</script>
`;
const SCENE = fs.readFileSync(path.join(__dirname, 'scenes.js'), 'utf8');
const tag = f => '<script>\n' + fs.readFileSync(path.join(__dirname, f), 'utf8') + '\n</' + 'script>\n';

/* scene -> { clip: css selector of the region to cut, pad } */
const SCENES = {
  fight:    { sel: '#combatPanel' },
  dry:      { sel: '#combatPanel' },
  out:      { full: true },
  nostaff:  { sel: '.cvrail.r' },
  picker:   { sel: '#combatPanel' },
  choose:   { sel: '#combatPanel' },
  switch:   { sel: '#combatPanel' },
  raid:     { sel: '#combatPanel' },
  gear:     { sel: '#gearView', padTo: null },
  loadouts: { sel: '#presetsView' },
  tipstaff: { sel: '#itemTT, .item-tt, #tooltip, .tt', tip: true },
  tiprobe:  { sel: '#itemTT', tip: true },
  tiprune:  { sel: '#itemTT', tip: true },
  tipplate: { sel: '#itemTT', tip: true },
  mlog:     { sel: '#combatPanel' },
  mastery:  { sel: '#combatPanel' },
  skill:    { full: true },
  tree:     { full: true },
  welcome:  { sel: '#offlineModal .modal, #offlineModal' },
  full:     { full: true }
};

(async () => {
  const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES);
  const src = fs.readFileSync(path.join(ROOT, 'cindervale.html'), 'utf8');
  const html = src.replace('</head>', SHIM + '</head>')
    .replace('</' + 'body>', tag('design.js') + tag('overlay.js') + tag('ui.js') + '<script>\n' + SCENE + '\n</' + 'script>\n</' + 'body>');
  const tmp = path.join(__dirname, 'work-shoot.html');
  fs.writeFileSync(tmp, html);
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    args: ['--hide-scrollbars', '--font-render-hinting=none', '--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) cindervale-idle/0.9.127 Chrome/151.0.0.0 Electron/33.0.0 Safari/537.36');
  const errs = [];
  p.on('pageerror', e => { errs.push(e.message); console.log('  ! pageerror: ' + e.message); });
  await p.goto('file:///' + tmp.split(String.fromCharCode(92)).join('/') + '?cvdev=1', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2800));
  /* a partial run must not throw away what the other scenes measured */
  const metaFile = path.join(OUT, 'meta.json');
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
  meta._touch = await p.evaluate(() => MAGE.touch);
  for (const id of want) {
    const S = SCENES[id]; if (!S) { console.log('no scene ' + id); continue; }
    let info;
    try { info = await p.evaluate(s => window.__mage(s), id); } catch (e) { console.log('  ! ' + id + ': ' + e.message); continue; }
    await new Promise(r => setTimeout(r, id === 'fight' || id === 'dry' ? 350 : 700));
    const file = path.join(OUT, id + '.png');
    let clip = null;
    if (!S.full) {
      clip = await p.evaluate((sel, tip) => {
        const list = sel.split(',').map(x => x.trim());
        let el = null;
        if (tip) el = (typeof ttEl === 'function') ? ttEl() : null;
        for (const q of list) { if (el) break; const c = document.querySelector(q); if (c && c.getBoundingClientRect().width > 4) el = c; }
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, Math.floor(r.left) - 6), y: Math.max(0, Math.floor(r.top) - 6), width: Math.ceil(r.width) + 12, height: Math.ceil(r.height) + 12 };
      }, S.sel, !!S.tip);
    }
    if (S.el) {
      const h = await p.$(S.sel);
      if (h) { await h.screenshot({ path: file }); meta[id] = { info }; console.log(id.padEnd(10), 'element', info ? JSON.stringify(info).slice(0, 200) : ''); continue; }
    }
    if (clip && clip.width > 10 && clip.height > 10) {
      clip.width = Math.min(clip.width, 1920 - clip.x); clip.height = Math.min(clip.height, 2400);
      await p.screenshot({ path: file, clip });
    } else { await p.screenshot({ path: file }); }
    meta[id] = { clip, info };
    console.log(id.padEnd(10), clip ? `${clip.width}x${clip.height}` : 'full', info ? JSON.stringify(info).slice(0, 200) : '');
  }
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 1));
  await b.close(); fs.unlinkSync(tmp);
  if (errs.length) console.log(errs.length + ' page error(s)');
})().catch(e => { console.error(e); try { fs.unlinkSync(path.join(__dirname, 'work-shoot.html')); } catch (x) {} process.exit(1); });

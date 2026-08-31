/* Prove the injected art actually renders in the running game.
 *
 *     node _iconart/shotgame.js [file.html] [out.png]
 *
 * Boots the built file, stocks a satchel with the items this pass covers, and
 * shoots the right-hand panel. A pack that parses is not a pack that works: the
 * whole point is ICONS[id] being replaced at every render site, and the only
 * honest check is looking at the grid.
 *
 * Also counts how many .art-item images are actually in the DOM, so a silently
 * empty override cannot pass as a success.
 */
'use strict';
const path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

// resolve, so a relative path from the repo root works as well as an absolute one
const FILE = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '_test.html');
const OUT  = process.argv[3] ? path.resolve(process.argv[3]) : path.join(__dirname, '_ingame.png');

/* Whatever exists in the pack; the boot script filters to real ITEMS anyway. */
const STOCK = ['pine_log','oak_log','ironbark_log','ember_log','frost_log','shadow_log','ancient_log',
  'copper_ore','tin_ore','iron_ore','coal','gold_ore','mithril_ore','silver_ore','cobalt_ore',
  'runite_ore','starsteel_ore','gem_dust','bronze_bar','iron_bar','steel_bar','gold_bar',
  'silver_bar','mithril_bar','cobalt_bar','runite_bar','starsteel_bar','raw_minnow','raw_trout',
  'raw_salmon','raw_shark','wildberries','bloodcap','thornvine','dewleaf','emberbloom',
  'charcoal','ember_dust','sapphire','emerald','ruby','diamond','cut_ruby','cut_sapphire'];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1745, height: 1100, deviceScaleFactor: 2 });
  await page.goto('file:///' + FILE.replace(/\\/g, '/') + '?cvdev=1', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2500));

  await page.evaluate(stock => {
    state = defaultState();
    state.charName = 'Probe'; state.charType = 'wanderer'; state.tutorialSeen = true;
    normalizeState();
    for (const k in SKILLS) state.xp[k] = XP_CUM[70];
    stock.forEach(id => { if (ITEMS[id]) state.items[id] = 250; });
    mmFinishStart(1, false);
  }, STOCK);
  await new Promise(r => setTimeout(r, 2200));
  await page.evaluate(() => {
    document.querySelectorAll('#gameMenuModal,#mmSettingsModal,#mmEaModal,#tutOverlay,#obDock')
      .forEach(e => e.classList.add('mm-hidden'));
    rightTab = 'satchel'; renderAll(); renderRightPanel();
  });
  await new Promise(r => setTimeout(r, 1000));

  const stats = await page.evaluate(() => {
    const art = document.querySelectorAll('img.ev-icon.art-item');
    const svg = document.querySelectorAll('svg.ev-icon');
    /* Only judge images that are actually on screen. The pack carries
       loading="lazy" (same as the monster and pet packs), and a lazy image below
       the fold legitimately reports naturalWidth 0 until it is scrolled to — so
       counting every one of those as "broken" invents failures. */
    let broken = 0, checked = 0;
    art.forEach(i => {
      const r = i.getBoundingClientRect();
      const onScreen = r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0;
      if (!onScreen) return;
      checked++;
      if (!i.complete || i.naturalWidth === 0) broken++;
    });
    const rp = document.getElementById('rightPanel');
    const r = rp ? rp.getBoundingClientRect() : null;
    return { art: art.length, svg: svg.length, broken, checked,
      box: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null };
  });
  console.log('painted item icons in the DOM: ' + stats.art + '  (' + stats.checked + ' on screen)');
  console.log('svg icons still rendering:     ' + stats.svg + '  (items not in this pack keep theirs)');
  console.log('broken among those on screen:  ' + stats.broken + (stats.broken ? '   <-- BAD' : ''));
  if (!stats.art) { console.log('\nFAIL — nothing replaced. The pack did not reach ICONS.'); process.exit(1); }
  if (stats.broken) { console.log('\nFAIL — broken image sources in the pack.'); process.exit(1); }

  const b = stats.box;
  await page.screenshot({ path: OUT, clip: b
    ? { x: Math.max(0, b.x - 6), y: Math.max(0, b.y - 6), width: b.w + 12, height: Math.min(b.h + 12, 1000) }
    : { x: 0, y: 0, width: 1745, height: 900 } });
  console.log('\nshot ' + path.basename(OUT));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

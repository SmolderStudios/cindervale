/* How big does an item icon ACTUALLY render?
 *
 *     node _iconart/measure.js
 *
 * The monster-art pass learned this the hard way: judge on the real surface or
 * you ship art that dies at the size it is shown. Item icons appear in several
 * places at several sizes, and the smallest one sets the brief.
 *
 * Reports CSS px at the game's own design zoom, not raw rect values — .ev-icon
 * is 1em off its parent, and html{zoom} scales everything on top.
 */
'use strict';
const path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1745, height: 1000, deviceScaleFactor: 2 });
  const url = 'file:///' + path.join(__dirname, '..', 'cindervale.html').replace(/\\/g, '/') + '?cvdev=1';
  await page.goto(url, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2500));

  await page.evaluate(() => {
    state = defaultState();
    state.charName = 'Probe'; state.charType = 'wanderer'; state.tutorialSeen = true;
    normalizeState();
    for (const k in SKILLS) state.xp[k] = XP_CUM[60];
    // stock the satchel with the families this art pass covers
    ['pine_log','oak_log','iron_ore','coal','iron_bar','steel_bar','raw_trout',
     'wildberries','sapphire','ruby','charcoal'].forEach(id => { state.items[id] = 500; });
    mmFinishStart(1, false);
  });
  await new Promise(r => setTimeout(r, 2200));
  await page.evaluate(() => {
    document.querySelectorAll('#gameMenuModal,#mmSettingsModal,#mmEaModal,#tutOverlay,#obDock')
      .forEach(e => e.classList.add('mm-hidden'));
    rightTab = 'satchel'; renderRightPanel(); renderAll();
  });
  await new Promise(r => setTimeout(r, 900));

  const out = await page.evaluate(() => {
    const z = parseFloat(document.documentElement.style.zoom) || 1;
    const seen = {};
    document.querySelectorAll('.ev-icon').forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      // walk up for a meaningful container name
      let ctx = 'unknown', p = el;
      for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
        const c = (p.className && p.className.baseVal !== undefined ? p.className.baseVal : p.className) || '';
        const m = String(c).trim().split(/\s+/)[0];
        if (m && m !== 'ev-icon') { ctx = m; break; }
      }
      const px = +(r.width / z).toFixed(1);
      const key = ctx + ' @' + px;
      seen[key] = (seen[key] || 0) + 1;
    });
    return { zoom: z, seen };
  });

  console.log('root zoom ' + out.zoom.toFixed(3) + '  (sizes below are CSS px at design width)\n');
  const rows = Object.entries(out.seen)
    .map(([k, n]) => { const [ctx, px] = k.split(' @'); return { ctx, px: +px, n }; })
    .sort((a, b) => a.px - b.px);
  console.log('container'.padEnd(26) + 'size'.padStart(8) + 'count'.padStart(7));
  console.log('-'.repeat(41));
  for (const r of rows) console.log(r.ctx.padEnd(26) + (r.px + 'px').padStart(8) + String(r.n).padStart(7));
  const smallest = rows.filter(r => r.px > 0)[0];
  console.log('\nsmallest icon on screen: ' + smallest.px + 'px in .' + smallest.ctx);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

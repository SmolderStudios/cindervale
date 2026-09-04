/* The satchel, full of the new art, at real size. This is the surface that decides
 * whether any of it worked — 15px tiles in a grid, not a contact sheet. */
const path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const CAT = process.argv[2] || 'all';
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1745, height: 1250, deviceScaleFactor: 3 });
  await p.goto(require('url').pathToFileURL(path.join(__dirname, '..', 'cindervale.html')).href + '?cvdev=1',
    { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2500));
  await p.evaluate(() => {
    state = defaultState(); state.charName = 'Probe'; state.charType = 'wanderer';
    state.tutorialSeen = true; normalizeState();
    for (const k in SKILLS) state.xp[k] = XP_CUM[80];
    state.combatXp = { attack: XP_CUM[90], strength: XP_CUM[90], defence: XP_CUM[90], hitpoints: XP_CUM[90] };
    /* One of everything, so the grid is the real mix rather than a tidy family. */
    state.items = {}; for (const id in ITEMS) state.items[id] = 5;
    state.gold = 5e6;
    mmFinishStart(1, false);
  });
  await new Promise(r => setTimeout(r, 2200));
  await p.evaluate(cat => {
    document.querySelectorAll('#gameMenuModal,#mmSettingsModal,#mmEaModal,#tutOverlay,#obDock')
      .forEach(e => e && e.classList.add('mm-hidden'));
    if (typeof invCat !== 'undefined') invCat = cat;
    if (typeof renderAll === 'function') renderAll();
  }, CAT);
  await new Promise(r => setTimeout(r, 1200));
  const el = await p.$('#satchelView');
  if (el) await el.screenshot({ path: path.join(__dirname, '_satchel_' + CAT + '.png') });
  else await p.screenshot({ path: path.join(__dirname, '_satchel_' + CAT + '.png') });
  console.log('shot _satchel_' + CAT + '.png');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });

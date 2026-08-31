// Shoots the states the rework touches but the default view does not show:
// the Combat and Sailing accent tabs, an active header nav item, and the Menu
// panel that Reset and Import moved into.
const path = require('path');
const KIT  = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const W = 1745;

const STATES = [
  { name: 'combat',  act: () => { document.getElementById('tabCombat').click(); },  h: 300 },
  { name: 'sailing', act: () => { document.getElementById('tabSail').click(); },    h: 300 },
  { name: 'guilds',  act: () => { document.getElementById('tabGuild').click(); },   h: 300 },
  { name: 'menu',    act: () => { document.getElementById('btnMenu').click(); },    h: 900 },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: 1000, deviceScaleFactor: 2 });
  const url = 'file:///' + path.join(__dirname, '..', 'cindervale.html').replace(/\\/g, '/') + '?cvdev=1';

  for (const st of STATES) {
    await page.goto(url, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 2400));
    await page.evaluate(() => {
      state = defaultState();
      state.charName = 'Ash'; state.charType = 'wanderer'; state.tutorialSeen = true;
      normalizeState();
      state.coins = 4832;
      for (const k in SKILLS) state.xp[k] = XP_CUM[9];
      mmFinishStart(1, false);
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.evaluate(() => {
      document.querySelectorAll('#gameMenuModal,#mmSettingsModal,#mmEaModal,#tutOverlay,#obDock')
        .forEach(e => e.classList.add('mm-hidden'));
    });
    await page.evaluate(st.act);
    await new Promise(r => setTimeout(r, 900));
    const out = 'st-' + st.name + '.png';
    await page.screenshot({ path: path.join(__dirname, out), clip: { x: 0, y: 0, width: W, height: st.h } });
    console.log('shot ' + out);
  }
  await browser.close();
})();

// Boots the real cindervale.html in Chrome for Testing, forces a save into
// existence, and shoots the top of the screen so the header rework can be
// judged against real data instead of a mockup.
const path = require('path');
const KIT  = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const OUT = process.argv[2] || 'game.png';
const W   = +(process.argv[3] || 1745);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: 1000, deviceScaleFactor: 2 });
  const url = 'file:///' + path.join(__dirname, '..', 'cindervale.html').replace(/\\/g, '/') + '?cvdev=1';
  await page.goto(url, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2500));

  // jump straight past the menu — mmFinishStart is what the Begin button calls
  await page.evaluate(() => {
    state = defaultState();
    state.charName = 'Ash';
    state.charType = 'wanderer';
    state.tutorialSeen = true;
    normalizeState();
    state.coins = 4832;
    for (const k in SKILLS) state.xp[k] = XP_CUM[9];
    mmFinishStart(1, false);
  });
  await new Promise(r => setTimeout(r, 2200));
  await page.evaluate(() => {
    document.querySelectorAll('#gameMenuModal,#mmSettingsModal,#mmEaModal,#tutOverlay,#obDock')
      .forEach(e => e.classList.add('mm-hidden'));
    try { state.coins = 4832; renderAll(); } catch (e) { console.log('seed: ' + e.message); }
  });
  await new Promise(r => setTimeout(r, 900));

  const shown = await page.evaluate(() => {
    const h = document.querySelector('header');
    return h ? getComputedStyle(h).display + ' / ' + h.getBoundingClientRect().height : 'no header';
  });
  console.log('header: ' + shown);
  await page.screenshot({ path: path.join(__dirname, OUT), clip: { x: 0, y: 0, width: W, height: 420 } });
  console.log('shot ' + OUT + ' @ ' + W);
  await browser.close();
})();

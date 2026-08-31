// The left rail's own states: the Combat tab pulsing while a fight runs in the
// background, and the rail-group "running" dot. Neither shows up in a plain
// screenshot, and both key off box-shadow — which the new segment rules reset.
const path = require('path');
const KIT  = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1745, height: 1000, deviceScaleFactor: 3 });
  const url = 'file:///' + path.join(__dirname, '..', 'cindervale.html').replace(/\\/g, '/') + '?cvdev=1';
  await page.goto(url, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2400));
  await page.evaluate(() => {
    state = defaultState();
    state.charName = 'Ash'; state.charType = 'wanderer'; state.tutorialSeen = true;
    normalizeState();
    for (const k in SKILLS) state.xp[k] = XP_CUM[9];
    mmFinishStart(1, false);
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    document.querySelectorAll('#gameMenuModal,#mmSettingsModal,#mmEaModal,#tutOverlay,#obDock')
      .forEach(e => e.classList.add('mm-hidden'));
    document.getElementById('tabCombat').classList.add('fight-active');
    document.querySelector('#railGroups .rg').classList.add('running');
    document.getElementById('tabComp').classList.add('has-new');
  });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(() => {
    const z = parseFloat(document.documentElement.style.zoom) || 1;
    const b = document.getElementById('leftPanel').getBoundingClientRect();
    const cs = getComputedStyle(document.getElementById('tabCombat'));
    return { x: b.x, y: b.y, w: b.width, color: cs.color, anim: cs.animationName };
  });
  console.log('combat tab color ' + r.color + ' anim ' + r.anim);
  await page.screenshot({
    path: path.join(__dirname, 'st-rail.png'),
    clip: { x: Math.max(0, r.x - 8), y: 0, width: r.w + 16, height: 220 },
  });
  console.log('shot st-rail.png');
  await browser.close();
})();

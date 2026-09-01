/* Screenshot the in-game Menu panel.
 *   node _iconart/menushot.js [outName]
 * Reports the panel's real height too — "long list" is a measurable claim, and the
 * whole point of the rework is to make that number smaller.
 */
'use strict';
const path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const OUT = process.argv[2] || '_menu_before';
const OPEN = process.argv[3] || '';   // a gm* row id to click, to shoot the panel behind it

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1745, height: 1200, deviceScaleFactor: 2 });
  const url = require("url").pathToFileURL(path.join(__dirname, "..", "cindervale.html")).href;
  await page.goto(url + "?cvdev=1",
    { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2500));

  await page.evaluate(() => {
    state = defaultState();
    state.charName = 'Probe'; state.charType = 'wanderer'; state.tutorialSeen = true;
    normalizeState();
    mmFinishStart(1, false);
  });
  await new Promise(r => setTimeout(r, 2000));

  /* Reveal the rows that only appear once reports are on, so the shot shows the
     worst case rather than the short version. */
  await page.evaluate(() => {
    document.querySelectorAll('#mmSettingsModal,#mmEaModal,#tutOverlay,#obDock')
      .forEach(e => e && e.classList.add('mm-hidden'));
    ['gmReport', 'gmIdea', 'gmMail'].forEach(id => { const e = document.getElementById(id); if (e) e.hidden = false; });
    document.getElementById('btnMenu').click();
  });
  await new Promise(r => setTimeout(r, 600));

  if (OPEN) {
    await page.evaluate(id => document.getElementById(id).click(), OPEN);
    await new Promise(r => setTimeout(r, 600));
    const shown = await page.evaluate(() => {
      const v = [...document.querySelectorAll('#mmSettingsModal,#mmCreditsModal,#mmReportModal,#mmIdeaModal,#mmMailModal,#saveModal')]
        .find(e => !e.classList.contains('mm-hidden') && !e.classList.contains('hidden'));
      if (!v) throw new Error('no panel opened');
      const back = v.querySelector('.gm-back');
      return { id: v.id, back: !!back && !back.hidden };
    });
    console.log('opened ' + shown.id + '   back button visible: ' + shown.back);
    const card = await page.$('#' + shown.id + ' .mm-card, #' + shown.id + ' .modal');
    await card.screenshot({ path: path.join(__dirname, OUT + '.png') });
    console.log('shot ' + OUT + '.png');
    await browser.close();
    return;
  }

  const m = await page.evaluate(() => {
    const z = parseFloat(document.documentElement.style.zoom) || 1;
    const card = document.querySelector('#gameMenuModal .mm-card');
    const r = card.getBoundingClientRect();
    return { h: +(r.height / z).toFixed(0), w: +(r.width / z).toFixed(0),
             rows: document.querySelectorAll('#gameMenuModal .gm-row:not([hidden])').length, zoom: z };
  });
  console.log('menu card ' + m.w + ' x ' + m.h + ' css px   ' + m.rows + ' visible rows   (zoom ' + m.zoom.toFixed(3) + ')');

  const el = await page.$('#gameMenuModal .mm-card');
  await el.screenshot({ path: path.join(__dirname, OUT + '.png') });
  console.log('shot ' + OUT + '.png');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

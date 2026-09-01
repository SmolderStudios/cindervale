/* Screenshot the Slayer panel with the shop open, one shot per tab.
 *   node _iconart/_slayershot.js [tab]        perks | mark | cache | unlocks | actions
 * Also reports the panel's real height and the computed font sizes, because
 * "small and hard to read" is a measurable claim.
 */
'use strict';
const path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const TAB = process.argv[2] || 'perks';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1745, height: 1400, deviceScaleFactor: 2 });
  await page.goto('file:///' + path.join(__dirname, '..', 'cindervale.html').replace(/\\/g, '/') + '?cvdev=1',
    { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2500));

  await page.evaluate(() => {
    state = defaultState();
    state.charName = 'Probe'; state.charType = 'wanderer'; state.tutorialSeen = true;
    normalizeState();
    for (const k in SKILLS) state.xp[k] = XP_CUM[70];
    state.combatXp = { attack: XP_CUM[80], strength: XP_CUM[80], defence: XP_CUM[80], hitpoints: XP_CUM[80] };
    state.slayer.xp = XP_CUM[80];          // past every perk gate
    state.slayer.points = 9999;
    state.slayer.perks = { scholar: 2, warpath: 1, skinner: 3 };
    state.slayer.markTier = 1; state.slayer.markFamily = 'beast';
    mmFinishStart(1, false);
  });
  await new Promise(r => setTimeout(r, 2200));
  /* Drive the real navigation. Setting combatMode and cmbSubTab by hand left the
     skilling view painted — the panel only exists once the buttons are clicked. */
  await page.evaluate(() => {
    document.querySelectorAll('#gameMenuModal,#mmSettingsModal,#mmEaModal,#tutOverlay,#obDock')
      .forEach(e => e.classList.add('mm-hidden'));
    document.getElementById('tabCombat').click();
  });
  await new Promise(r => setTimeout(r, 900));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cmb-subtab')].find(x => x.dataset.sub === 'slayer');
    if (!b) throw new Error('no slayer sub-tab');
    b.click();
  });
  await new Promise(r => setTimeout(r, 900));
  await page.evaluate(tab => { slyShopOpen = true; slyShopTab = tab; renderCombat(); }, TAB);
  await new Promise(r => setTimeout(r, 900));

  const m = await page.evaluate(() => {
    const z = parseFloat(document.documentElement.style.zoom) || 1;
    const px = el => el ? +(el.getBoundingClientRect().height / z).toFixed(0) : null;
    const fs = sel => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontSize : null; };
    const wrap = document.querySelector('.sly-wrap');
    const shop = document.querySelector('.sly-shop');
    const cards = document.querySelectorAll('.sly-shop .sly-card').length;
    return {
      zoom: z,
      panelH: px(wrap), shopH: px(shop), cards,
      viewportCss: Math.round(innerHeight / z),
      font: { cardName: fs('.sly-cn'), cardDesc: fs('.sly-cd'), button: fs('.sly-cb'),
              tab: fs('.sly-seg button'), hint: fs('.sly-hint') },
    };
  });
  console.log('tab: ' + TAB);
  console.log('  slayer panel   ' + m.panelH + ' css px tall   (viewport is ' + m.viewportCss + ')');
  console.log('  shop block     ' + m.shopH + ' px, ' + m.cards + ' cards');
  console.log('  scroll needed  ' + (m.panelH > m.viewportCss ? (m.panelH - m.viewportCss) + ' px past the fold' : 'none'));
  console.log('  font sizes     ' + Object.entries(m.font).map(([k, v]) => k + ' ' + v).join(', '));

  await page.screenshot({ path: path.join(__dirname, '_slayer_' + TAB + '.png'), fullPage: true });
  console.log('  shot _slayer_' + TAB + '.png');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

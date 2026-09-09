/* Screenshot the open achievement row, so the filled form can be checked. */
'use strict';
const path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const PORT = 9333;

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + PORT, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('partner.steamgames.com')) || pages[pages.length - 1];
  const sel = process.argv[2] || 'tr.selected';
  const el = await page.$(sel);
  const out = path.join(__dirname, '_iconart', '_steamrow.png');
  if (el) { await el.screenshot({ path: out }); console.log('shot ' + sel + ' -> ' + out); }
  else { await page.screenshot({ path: out }); console.log('selector missed; full page -> ' + out); }
  browser.disconnect();
})().catch(e => { console.error(e); process.exit(1); });

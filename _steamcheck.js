/* Did the icons actually land? Close any open editor, then read what the LIST view
 * shows for each achievement - the img src is the honest answer, not the edit form's
 * pending-file text. */
'use strict';
const path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + PORT, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('partner.steamgames.com')) || pages[pages.length - 1];

  if (process.argv.includes('--reload')) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2500);
  }

  const rows = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('tr[id^="a2_"]').forEach(tr => {
      const api = (tr.querySelector('[id$="_apiname"]') || {}).value ||
                  (tr.querySelector('td') || {}).innerText || '';
      const imgs = [...tr.querySelectorAll('img')].map(i => ({
        src: (i.getAttribute('src') || '').split('/').pop().slice(0, 46),
        w: i.naturalWidth, h: i.naturalHeight,
      }));
      if (api) out.push({ api: (api || '').trim().split('\n')[0].slice(0, 24), imgs });
    });
    return out;
  });

  console.log('api                  icons  (naturalWidth 0 = did not load)');
  rows.forEach(r => console.log('  ' + r.api.padEnd(22) +
    (r.imgs.length ? r.imgs.map(i => i.src + ' ' + i.w + 'x' + i.h).join('   ') : '(none)')));

  const el = await page.$('#achievementTable');
  if (el) { await el.screenshot({ path: path.join(__dirname, '_iconart', '_steamlist.png') }); console.log('\nshot -> _iconart/_steamlist.png'); }
  browser.disconnect();
})().catch(e => { console.error(e); process.exit(1); });

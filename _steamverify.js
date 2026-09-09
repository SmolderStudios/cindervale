/* Reload the achievements page and report what the SERVER actually has.
 * Everything before this was reading a DOM the page had mutated locally, which
 * cannot tell a saved row from an unsaved one. */
'use strict';
const path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const PORT = 9333;
const APPID = '4966660';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + PORT, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('partner.steamgames.com')) || pages[pages.length - 1];

  /* an unsaved-changes prompt would hang the navigation forever */
  page.on('dialog', async d => { console.log('  dialog: ' + d.message().slice(0, 80)); await d.accept(); });

  await page.goto('https://partner.steamgames.com/apps/achievements/' + APPID,
    { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);

  const info = await page.evaluate(() => {
    const rows = [];
    /* the display table, not the edit forms */
    document.querySelectorAll('#achievementTable tr, table tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('td')].map(td => (td.innerText || '').trim());
      const api = cells.find(c => /^[a-z][a-z0-9_]{2,}$/.test(c));
      if (!api) return;
      const imgs = [...tr.querySelectorAll('img')]
        .map(i => ({ src: (i.getAttribute('src') || ''), w: i.naturalWidth }));
      rows.push({ api, imgs: imgs.length, loaded: imgs.filter(i => i.w > 0).length,
                  srcs: imgs.map(i => i.src.split('/').pop().slice(0, 20)) });
    });
    const seen = new Set(); const out = [];
    rows.forEach(r => { if (!seen.has(r.api)) { seen.add(r.api); out.push(r); } });
    return { count: out.length, rows: out,
             countText: (document.getElementById('achievementCount') || {}).innerText || '' };
  });

  console.log('achievements on the server: ' + info.count + '   ' + info.countText);
  console.log('\napi                  imgs loaded');
  info.rows.forEach(r => console.log('  ' + r.api.padEnd(22) + String(r.imgs).padEnd(6) +
    String(r.loaded).padEnd(8) + r.srcs.join(' ')));
  const noIcon = info.rows.filter(r => r.loaded < 2).map(r => r.api);
  console.log('\nrows without two loaded icons (' + noIcon.length + '): ' + (noIcon.join(', ') || 'none'));
  browser.disconnect();
})().catch(e => { console.error(e); process.exit(1); });

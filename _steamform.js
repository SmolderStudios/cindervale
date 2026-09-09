/* Dump the raw HTML of an achievement row's icon cell, to find out what the Upload
 * control really is: a form post, an onclick handler, or something else. */
'use strict';
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const PORT = 9333;
const ID = process.argv[2] || 'two_trees';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + PORT, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('partner.steamgames.com')) || pages[pages.length - 1];

  const info = await page.evaluate((ID) => {
    const el = [...document.querySelectorAll('[id^="ach2_"][id$="_apiname"]')].find(x => x.value === ID);
    if (!el) return { none: true };
    const n = el.id.match(/^ach2_(\d+)_/)[1];
    const row = document.getElementById('a2_' + n);
    const files = [...row.querySelectorAll('input[type=file]')];
    return {
      n: n,
      cells: files.map(f => {
        /* the td that holds this file input, verbatim */
        const td = f.closest('td');
        return td ? td.outerHTML.replace(/\s+/g, ' ').slice(0, 900) : '(no td)';
      }),
      forms: [...document.forms].map(f => ({
        name: f.name || '', id: f.id || '', action: f.action || '',
        method: f.method, enctype: f.enctype,
      })),
      fileForm: files.map(f => {
        const fm = f.form;
        return fm ? { name: fm.name || '', id: fm.id || '', action: fm.action, enctype: fm.enctype } : null;
      }),
    };
  }, ID);

  if (info.none) { console.log('no row for ' + ID); browser.disconnect(); return; }
  console.log('row a2_' + info.n + '\n');
  info.cells.forEach((c, i) => console.log('--- icon cell ' + i + ' ---\n' + c + '\n'));
  console.log('the form each file input belongs to:');
  console.log(JSON.stringify(info.fileForm, null, 1));
  console.log('\nall forms on page:');
  console.log(JSON.stringify(info.forms, null, 1));
  browser.disconnect();
})().catch(e => { console.error(e); process.exit(1); });

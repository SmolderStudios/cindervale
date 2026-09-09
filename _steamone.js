/* Create or repair ONE achievement on the partner site, then prove it against the
 * server by reloading.
 *
 *     node _steamone.js two_trees            create it (or repair a mangled row)
 *
 * Two failures got us here and both are worth keeping written down:
 *
 *   1. Setting .value directly and firing synthetic input/change LOOKED right in a
 *      screenshot and Save appeared to work, but the server still had 34 rows. The
 *      page keeps its own model; a programmatic assignment never reaches it.
 *   2. Real typing saved, but triple-click did NOT select the placeholder, so the
 *      text was INSERTED into it: "NEW_ACHIEVEMENTtwo_trees2_2". Ctrl+A does select.
 *
 * So: type like a person, clear with Ctrl+A, and never trust the DOM you just
 * edited - reload and ask the server.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const PORT = 9333;
const APPID = '4966660';
const URL = 'https://partner.steamgames.com/apps/achievements/' + APPID;
const ICONS = 'C:/Users/Jordan/Desktop/Cindervale/store/achievement icons';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = process.argv[2];
if (!ID) { console.error('usage: node _steamone.js <achievement_id>'); process.exit(1); }
const TODO = JSON.parse(fs.readFileSync(path.join(__dirname, '_steam_todo.json'), 'utf8'));
const A = TODO.find(x => x.id === ID);
if (!A) { console.error('not in _steam_todo.json: ' + ID); process.exit(1); }

async function clearType(page, handle, text) {
  await handle.click();
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await handle.type(text, { delay: 10 });
  return page.evaluate(e => e.value, handle);
}

async function reload(page) {
  page.removeAllListeners('dialog');
  page.on('dialog', async d => { try { await d.accept(); } catch (e) {} });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
}

/* Every achievement the server currently lists: api name -> row element index. */
async function serverRows(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('tr').forEach((tr, i) => {
      const c = [...tr.querySelectorAll('td')].map(t => (t.innerText || '').trim()).filter(Boolean);
      if (!c.length) return;
      const api = c[0].split('\n')[0].trim();
      if (/^[A-Za-z][A-Za-z0-9_]{2,}$/.test(api)) out.push({ api, i });
    });
    return out;
  });
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + PORT, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('partner.steamgames.com')) || pages[pages.length - 1];
  page.on('dialog', async d => { try { await d.accept(); } catch (e) {} });

  await reload(page);
  let rows = await serverRows(page);
  console.log('server rows: ' + rows.length);

  const exact = rows.find(r => r.api === ID);
  const mangled = rows.find(r => r.api !== ID && r.api.includes(ID));
  if (exact) { console.log(ID + ' already correct on the server.'); browser.disconnect(); return; }

  /* open the row to work on: the mangled one if it exists, else a new blank */
  let n;
  if (mangled) {
    console.log('repairing mangled row: ' + mangled.api);
    n = await page.evaluate((api) => {
      const trs = [...document.querySelectorAll('tr')];
      const tr = trs.find(t => (t.innerText || '').includes(api));
      if (!tr) return -1;
      const b = [...tr.querySelectorAll('input[type=submit]')].find(e => /^edit$/i.test(e.value || ''));
      if (!b) return -1;
      b.click();
      return 1;
    }, mangled.api);
    await sleep(1800);
    n = await page.evaluate(() => {
      const e = document.querySelector('[id^="ach2_"][id$="_apiname"]');
      return e ? +e.id.match(/^ach2_(\d+)_/)[1] : -1;
    });
  } else {
    const news = await page.$$('input[type=submit][value="New Achievement"]');
    if (!news.length) { console.log('! no New Achievement button'); browser.disconnect(); return; }
    await news[0].click();
    await sleep(1800);
    n = await page.evaluate(() => {
      const e = [...document.querySelectorAll('[id^="ach2_"][id$="_apiname"]')]
        .find(x => /^NEW_ACHIEVEMENT_/.test(x.value));
      return e ? +e.id.match(/^ach2_(\d+)_/)[1] : -1;
    });
  }
  if (n < 0) { console.log('! could not open a row'); browser.disconnect(); return; }
  console.log('editing row a2_' + n);

  const api = await page.$('#ach2_' + n + '_apiname');
  const eng = await page.$$('#a2_' + n + ' input[name="english"]');
  if (!api || eng.length < 2) { console.log('! fields missing'); browser.disconnect(); return; }

  const v1 = await clearType(page, api, A.id);
  const v2 = await clearType(page, eng[0], A.name);
  const v3 = await clearType(page, eng[1], A.desc);
  console.log('  api  "' + v1 + '"');
  console.log('  name "' + v2 + '"');
  console.log('  desc "' + v3 + '"');
  if (v1 !== A.id || v2 !== A.name || v3 !== A.desc) {
    console.log('! a field did not take exactly - NOT saving'); browser.disconnect(); return;
  }
  if (A.hidden) {
    const hb = await page.$('#ach2_' + n + '_hidden');
    if (hb && !(await page.evaluate(e => e.checked, hb))) await hb.click();
  }

  let saveBtn = null;
  for (const s of await page.$$('#a2_' + n + ' input[type=submit]')) {
    if (/^save$/i.test(await page.evaluate(e => e.value, s))) { saveBtn = s; break; }
  }
  if (!saveBtn) { console.log('! no Save'); browser.disconnect(); return; }
  await saveBtn.click();
  await sleep(4000);

  await reload(page);
  rows = await serverRows(page);
  const ok = rows.some(r => r.api === ID);
  const junk = rows.filter(r => /^NEW_ACHIEVEMENT/i.test(r.api) || (r.api !== ID && r.api.includes(ID)));
  console.log('\nserver now: ' + rows.length + ' rows, ' + ID + ' present: ' + ok);
  if (junk.length) console.log('LEFTOVER JUNK ROWS: ' + junk.map(j => j.api).join(', '));
  console.log(ok && !junk.length ? 'CLEAN.' : 'needs attention');
  browser.disconnect();
})().catch(e => { console.error(e); process.exit(1); });

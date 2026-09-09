/* Upload both icons for achievements that already exist on the partner site.
 *
 *     node _steamicons.js two_trees            one
 *     node _steamicons.js --missing            every row that has fewer than 2 icons
 *     node _steamicons.js --all                every row in the game, re-uploaded
 *
 * A row only grows its edit fields (ach2_<n>_apiname, the file inputs) once its
 * Edit button is clicked, so this finds the row by its API NAME in the list, opens
 * it, then uploads. Looking for ach2_*_apiname on a freshly loaded page finds
 * nothing, which is what "no row" meant on the first attempt.
 *
 * Each icon is its own multipart form to /images/uploadachievement carrying a
 * requestType of 'achievement' or 'achievement_gray', so the button to press is the
 * submit INSIDE that file input's own form.
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

const args = process.argv.slice(2);
const MISSING = args.includes('--missing');
const ALL = args.includes('--all');
const NAMED = args.filter(a => !a.startsWith('--'));

async function reload(page) {
  page.removeAllListeners('dialog');
  page.on('dialog', async d => { try { await d.accept(); } catch (e) {} });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
}

/* api name -> how many of its icons actually loaded */
async function survey(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('tr').forEach(tr => {
      const c = [...tr.querySelectorAll('td')].map(t => (t.innerText || '').trim()).filter(Boolean);
      if (!c.length) return;
      const api = c[0].split('\n')[0].trim();
      if (!/^[A-Za-z][A-Za-z0-9_]{2,}$/.test(api)) return;
      const imgs = [...tr.querySelectorAll('img')];
      out.push({ api, loaded: imgs.filter(i => i.naturalWidth > 0).length, imgs: imgs.length });
    });
    return out;
  });
}

/* Open the row for this api name and return its ROW ID (e.g. "a1_7" or "a2_13").
   Steamworks groups achievements under stat blocks: the 34 original ones live under
   stat 1 with rows a1_* and fields ach1_*, and everything created in this session
   landed under stat 2. Hardcoding a2 found two rows out of thirty-four. The row's
   own id carries both numbers, so derive every selector from it. */
async function openRow(page, api) {
  const rowId = await page.evaluate((api) => {
    const tr = [...document.querySelectorAll('tr[id]')].find(t => {
      const c = [...t.querySelectorAll('td')].map(x => (x.innerText || '').trim()).filter(Boolean);
      return c.length && c[0].split(String.fromCharCode(10))[0].trim() === api;
    });
    if (!tr) return '';
    const b = [...tr.querySelectorAll('input[type=submit]')].find(e => /^edit$/i.test(e.value || ''));
    if (!b) return '';
    b.click();
    return tr.id;
  }, api);
  if (!rowId) return '';
  await sleep(1600);
  /* confirm the editor really opened on the row we meant */
  const ok = await page.evaluate((rowId, api) => {
    const m = rowId.match(/^a(\d+)_(\d+)$/); if (!m) return false;
    const f = document.getElementById('ach' + m[1] + '_' + m[2] + '_apiname');
    return !!f && f.value === api;
  }, rowId, api);
  return ok ? rowId : '';
}

async function uploadOne(page, rowId, slot, file) {
  const inputs = await page.$$('#' + rowId + ' input[type=file]');
  if (inputs.length < slot + 1) return 'no file input';
  await inputs[slot].uploadFile(file);
  await sleep(400);
  return page.evaluate((rowId, slot) => {
    const f = [...document.querySelectorAll('#' + rowId + ' input[type=file]')][slot];
    if (!f || !f.form) return 'no form';
    if (!f.files || !f.files.length) return 'file did not attach';
    const kind = (f.form.querySelector('input[name=requestType]') || {}).value || '?';
    const btn = [...f.form.querySelectorAll('input[type=submit]')].find(e => /^upload$/i.test(e.value || ''));
    if (!btn) return 'no Upload';
    btn.click();
    return kind;
  }, rowId, slot);
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + PORT, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('partner.steamgames.com')) || pages[pages.length - 1];
  page.on('dialog', async d => { try { await d.accept(); } catch (e) {} });

  await reload(page);
  let rows = await survey(page);
  let list = NAMED.length ? NAMED
           : MISSING ? rows.filter(r => r.loaded < 2).map(r => r.api)
           : ALL ? rows.map(r => r.api)
           : [];
  if (!list.length) { console.log('nothing to do (use a name, --missing or --all)'); browser.disconnect(); return; }
  console.log(list.length + ' to upload\n');

  const ok = [], bad = [];
  for (const api of list) {
    const u = path.join(ICONS, api + '.png'), l = path.join(ICONS, api + '_locked.png');
    if (!fs.existsSync(u) || !fs.existsSync(l)) { bad.push(api + ' (no file)'); console.log(api.padEnd(20) + 'no icon file'); continue; }
    const rowId = await openRow(page, api);
    if (!rowId) { bad.push(api + ' (row not found)'); console.log(api.padEnd(20) + 'row not found'); continue; }
    const r1 = await uploadOne(page, rowId, 0, u);
    await sleep(2200);
    const r2 = await uploadOne(page, rowId, 1, l);
    await sleep(2200);
    console.log(api.padEnd(20) + rowId.padEnd(8) + r1 + ' / ' + r2);
    ok.push(api);
    await reload(page);            // next row needs a clean list view
  }

  await reload(page);
  rows = await survey(page);
  const still = rows.filter(r => list.includes(r.api) && r.loaded < 2).map(r => r.api);
  console.log('\nattempted ' + ok.length + ', file/row problems ' + bad.length);
  if (bad.length) console.log('  ' + bad.join(', '));
  console.log('still missing icons after reload: ' + (still.length ? still.join(', ') : 'none'));
  browser.disconnect();
})().catch(e => { console.error(e); process.exit(1); });

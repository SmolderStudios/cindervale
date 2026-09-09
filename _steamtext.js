/* Diff the display name and description on the partner site against the game, and
 * optionally repair any that drifted.
 *
 *     node _steamtext.js              report only
 *     node _steamtext.js --fix        correct the ones that differ
 *
 * ashen_ascend is the known one: the game used to say "all twelve skills" and now
 * says "every skill" because the check counts SKILLS.length, but Steam still holds
 * the old sentence and would describe it wrong on the store forever.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const PORT = 9333;
const APPID = '4966660';
const URL = 'https://partner.steamgames.com/apps/achievements/' + APPID;
const FIX = process.argv.includes('--fix');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function reload(page) {
  page.removeAllListeners('dialog');
  page.on('dialog', async d => { try { await d.accept(); } catch (e) {} });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
}

async function openRow(page, api) {
  const rowId = await page.evaluate((api) => {
    const NL = String.fromCharCode(10);
    const tr = [...document.querySelectorAll('tr[id]')].find(t => {
      const c = [...t.querySelectorAll('td')].map(x => (x.innerText || '').trim()).filter(Boolean);
      return c.length && c[0].split(NL)[0].trim() === api;
    });
    if (!tr) return '';
    const b = [...tr.querySelectorAll('input[type=submit]')].find(e => /^edit$/i.test(e.value || ''));
    if (!b) return ''; b.click(); return tr.id;
  }, api);
  if (!rowId) return '';
  await sleep(1500);
  return rowId;
}

async function clearType(page, handle, text) {
  await handle.click();
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await handle.type(text, { delay: 8 });
  return page.evaluate(e => e.value, handle);
}

(async () => {
  /* the game is the source of truth */
  const raw = fs.readFileSync(path.join(__dirname, 'cindervale.html'), 'utf8');
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
  const dom = new JSDOM(raw, { url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); } });
  await new Promise(r => setTimeout(r, 2600));
  const GAME = JSON.parse(dom.window.eval(
    'JSON.stringify(ACHIEVEMENTS.map(a=>({id:a.id,name:a.name,desc:a.desc,hidden:!!a.hidden})))'));

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + PORT, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('partner.steamgames.com')) || pages[pages.length - 1];
  page.on('dialog', async d => { try { await d.accept(); } catch (e) {} });
  await reload(page);

  const live = await page.evaluate(() => {
    const NL = String.fromCharCode(10);
    const out = {};
    document.querySelectorAll('tr[id]').forEach(tr => {
      const c = [...tr.querySelectorAll('td')].map(x => (x.innerText || '').trim()).filter(Boolean);
      if (!c.length) return;
      const api = c[0].split(NL)[0].trim();
      if (!/^[A-Za-z][A-Za-z0-9_]{2,}$/.test(api)) return;
      const lines = (c[1] || '').split(NL).map(s => s.trim()).filter(Boolean);
      out[api] = { name: lines[0] || '', desc: lines.slice(1).join(' ') };
    });
    return out;
  });

  const drift = GAME.filter(g => live[g.id] &&
    (live[g.id].name !== g.name || live[g.id].desc !== g.desc));
  const absent = GAME.filter(g => !live[g.id]).map(g => g.id);

  console.log('on site: ' + Object.keys(live).length + '   in game: ' + GAME.length);
  if (absent.length) console.log('NOT on site: ' + absent.join(', '));
  console.log('\ntext drift: ' + drift.length);
  drift.forEach(g => {
    console.log('  ' + g.id);
    if (live[g.id].name !== g.name) console.log('     name  site "' + live[g.id].name + '"  game "' + g.name + '"');
    if (live[g.id].desc !== g.desc) console.log('     desc  site "' + live[g.id].desc + '"\n           game "' + g.desc + '"');
  });

  if (FIX && drift.length) {
    console.log('\nfixing...');
    for (const g of drift) {
      const rowId = await openRow(page, g.id);
      if (!rowId) { console.log('  ' + g.id + ' row not found'); continue; }
      const eng = await page.$$('#' + rowId + ' input[name="english"]');
      if (eng.length < 2) { console.log('  ' + g.id + ' fields missing'); continue; }
      const n1 = await clearType(page, eng[0], g.name);
      const n2 = await clearType(page, eng[1], g.desc);
      if (n1 !== g.name || n2 !== g.desc) { console.log('  ' + g.id + ' did not take, skipping save'); continue; }
      let save = null;
      for (const s of await page.$$('#' + rowId + ' input[type=submit]'))
        if (/^save$/i.test(await page.evaluate(e => e.value, s))) { save = s; break; }
      if (!save) { console.log('  ' + g.id + ' no Save'); continue; }
      await save.click(); await sleep(3000);
      console.log('  ' + g.id + ' fixed');
      await reload(page);
    }
  }
  browser.disconnect();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

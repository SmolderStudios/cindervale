/* Create achievements on the Steamworks partner site from the game's own data.
 *
 *     node _steamfill.js --only two_trees      one, end to end
 *     node _steamfill.js --all                 every one still missing
 *     node _steamfill.js --icons-only          just re-upload icons for rows that exist
 *
 * Reads _steam_todo.json, which is the diff of ACHIEVEMENTS against what the site
 * already has, so an API Name can never drift from the string steamAchievement()
 * actually sends.
 *
 * ORDER MATTERS, and Jordan confirmed it: create the row, SAVE it, and only then
 * upload the icons. An Upload on an unsaved row has nothing to attach to.
 *
 * The row is TR#a2_<n>:
 *   ach2_<n>_apiname        API Name
 *   input[name=english] x2  display name then description, in DOM order
 *   ach2_<n>_hidden         the Hidden checkbox
 *   input[type=file] x2     unlocked icon then locked, each with its own Upload
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const PORT = 9333;
const ICONS = 'C:/Users/Jordan/Desktop/Cindervale/store/achievement icons';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ONLY = arg('--only');
const ALL = process.argv.includes('--all');
const ICONS_ONLY = process.argv.includes('--icons-only');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TODO = JSON.parse(fs.readFileSync(path.join(__dirname, '_steam_todo.json'), 'utf8'));
const LIST = ONLY ? TODO.filter(a => a.id === ONLY) : (ALL ? TODO : TODO.slice(0, 1));
if (!LIST.length) { console.error('nothing matched'); process.exit(1); }

/* index of the row whose apiname equals id, or -1 */
const rowFor = (page, id) => page.evaluate((id) => {
  const e = [...document.querySelectorAll('[id^="ach2_"][id$="_apiname"]')].find(x => x.value === id);
  return e ? +e.id.match(/^ach2_(\d+)_/)[1] : -1;
}, id);

async function openEdit(page, n) {
  return page.evaluate((n) => {
    const row = document.getElementById('a2_' + n);
    if (!row) return false;
    if (row.querySelector('input[type=file]')) return true;      // already open
    const b = [...row.querySelectorAll('input[type=submit]')].find(e => /^edit$/i.test(e.value || ''));
    if (!b) return false; b.click(); return true;
  }, n);
}

/* Upload one icon. Each icon is its OWN form posting multipart to
   /images/uploadachievement, with hidden sessionid/appID/statID/bit and a
   requestType of 'achievement' or 'achievement_gray', submitted through AIM into a
   hidden iframe. So the button to press is the submit INSIDE that file input's own
   form - walking the DOM forward from the input, as the first attempt did, finds a
   neighbouring form's button and silently uploads nothing. */
async function uploadIcon(page, n, slot, file) {
  const inputs = await page.$$('#a2_' + n + ' input[type=file]');
  if (inputs.length < slot + 1) return 'no file input ' + slot;
  await inputs[slot].uploadFile(file);
  await sleep(500);
  return page.evaluate((n, slot) => {
    const row = document.getElementById('a2_' + n);
    const f = [...row.querySelectorAll('input[type=file]')][slot];
    if (!f || !f.form) return 'no form';
    if (!f.files || !f.files.length) return 'file did not attach';
    const btn = [...f.form.querySelectorAll('input[type=submit]')]
      .find(e => /^upload$/i.test(e.value || ''));
    if (!btn) return 'no Upload in that form';
    const kind = (f.form.querySelector('input[name=requestType]') || {}).value || '?';
    btn.click();
    return 'ok(' + kind + ')';
  }, n, slot);
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + PORT, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('partner.steamgames.com')) || pages[pages.length - 1];

  const done = [], failed = [];
  for (const a of LIST) {
    const tag = a.id.padEnd(18);
    try {
      let n = await rowFor(page, a.id);

      if (n < 0 && !ICONS_ONLY) {
        /* create + fill + save */
        await page.evaluate(() => {
          const open = [...document.querySelectorAll('[id^="ach2_"][id$="_apiname"]')]
            .find(e => /^NEW_ACHIEVEMENT_/.test(e.value));
          if (open) return;
          const b = [...document.querySelectorAll('input[type=submit]')]
            .find(e => /new achievement/i.test(e.value || ''));
          if (b) b.click();
        });
        await sleep(1200);
        const blank = await page.evaluate(() => {
          const e = [...document.querySelectorAll('[id^="ach2_"][id$="_apiname"]')]
            .find(x => /^NEW_ACHIEVEMENT_/.test(x.value));
          return e ? +e.id.match(/^ach2_(\d+)_/)[1] : -1;
        });
        if (blank < 0) { failed.push(a.id + ' (no blank row)'); console.log(tag + 'FAIL no blank row'); continue; }

        const ok = await page.evaluate((n, id, name, desc, hidden) => {
          const set = (el, v) => { if (!el) return false; el.focus(); el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true })); return true; };
          const row = document.getElementById('a2_' + n); if (!row) return false;
          const eng = [...row.querySelectorAll('input[name="english"]')];
          const a1 = set(document.getElementById('ach2_' + n + '_apiname'), id);
          const a2 = set(eng[0], name), a3 = set(eng[1], desc);
          const hb = document.getElementById('ach2_' + n + '_hidden');
          if (hb && hb.checked !== !!hidden) hb.click();
          return a1 && a2 && a3;
        }, blank, a.id, a.name, a.desc, a.hidden);
        if (!ok) { failed.push(a.id + ' (fill)'); console.log(tag + 'FAIL fill'); continue; }

        await page.evaluate((n) => {
          const row = document.getElementById('a2_' + n);
          const b = [...row.querySelectorAll('input[type=submit]')].find(e => /^save$/i.test(e.value || ''));
          if (b) b.click();
        }, blank);
        await sleep(2600);

        n = await rowFor(page, a.id);
        if (n < 0) { failed.push(a.id + ' (not saved)'); console.log(tag + 'FAIL not saved'); continue; }
      }

      if (n < 0) { failed.push(a.id + ' (no row)'); console.log(tag + 'FAIL no row'); continue; }

      /* icons, on the saved row */
      const unlocked = path.join(ICONS, a.id + '.png');
      const locked = path.join(ICONS, a.id + '_locked.png');
      if (!fs.existsSync(unlocked) || !fs.existsSync(locked)) {
        failed.push(a.id + ' (icon file missing)'); console.log(tag + 'FAIL icon file missing'); continue;
      }
      await openEdit(page, n);
      await sleep(900);
      const u1 = await uploadIcon(page, n, 0, unlocked);
      await sleep(2600);
      const n2 = await rowFor(page, a.id);
      await openEdit(page, n2 < 0 ? n : n2);
      await sleep(900);
      const u2 = await uploadIcon(page, n2 < 0 ? n : n2, 1, locked);
      await sleep(2600);

      console.log(tag + 'saved, icons: ' + u1 + ' / ' + u2);
      done.push(a.id);
    } catch (e) {
      failed.push(a.id + ' (' + e.message + ')');
      console.log(tag + 'ERROR ' + e.message);
    }
  }

  console.log('\ndone ' + done.length + ' / ' + LIST.length);
  if (failed.length) console.log('failed: ' + failed.join(', '));
  browser.disconnect();
})().catch(e => { console.error(e); process.exit(1); });

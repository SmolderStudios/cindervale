/* Drive the Steamworks achievement config in a real, visible browser.
 *
 *     node _steamach.js open      launch it, wait for Jordan to sign in, dump the form
 *     node _steamach.js dump      re-read the page structure (browser already open)
 *
 * Why this and not the Claude-in-Chrome extension: there is no Chrome on this
 * machine, only Edge, and the extension's Edge support is not something I am
 * willing to guess at. Chrome for Testing is already here for the art pipeline and
 * puppeteer already drives it, so the only missing piece is a signed-in session -
 * which a persistent --user-data-dir gives us after ONE manual sign-in.
 *
 * I NEVER TOUCH THE CREDENTIALS. The window is visible and Jordan types into it;
 * the profile keeps the session afterwards so it is a one-time cost. Nothing here
 * reads, stores or transmits a password or a Steam Guard code.
 *
 * The browser is deliberately left OPEN when this exits, so the next command can
 * attach to the same signed-in session over the debugging port.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const PROFILE = 'C:/Users/Jordan/Desktop/Cindervale/tools/steam-profile';
const PORT = 9333;
const APPID = '4966660';
const ACH_URL = 'https://partner.steamgames.com/apps/achievements/' + APPID;
const MODE = process.argv[2] || 'open';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function attach() {
  /* Connect to the already-running window rather than starting a second one. */
  return puppeteer.connect({ browserURL: 'http://127.0.0.1:' + PORT, defaultViewport: null });
}

async function launch() {
  fs.mkdirSync(PROFILE, { recursive: true });
  return puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    defaultViewport: null,
    userDataDir: PROFILE,
    args: ['--remote-debugging-port=' + PORT, '--start-maximized', '--no-first-run',
           '--no-default-browser-check'],
  });
}

/* What the page looks like once we are actually in. Printed so the form can be
   learned before a single field is filled. */
async function describe(page) {
  const info = await page.evaluate(() => {
    const t = (s, n) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n || 90);
    return {
      url: location.href,
      title: document.title,
      signedIn: !/login|signin/i.test(location.href),
      h1: [...document.querySelectorAll('h1,h2')].map(e => t(e.textContent)).slice(0, 6),
      forms: document.forms.length,
      inputs: [...document.querySelectorAll('input,textarea,select')].slice(0, 40).map(e => ({
        tag: e.tagName.toLowerCase(), type: e.type || '', name: e.name || '',
        id: e.id || '', placeholder: e.placeholder || '',
        value: t(e.value, 40),
      })),
      buttons: [...document.querySelectorAll('button,input[type=submit],input[type=button],a.btnv6_blue_hoverfade')]
        .slice(0, 25).map(e => t(e.textContent || e.value)),
      bodyStart: t(document.body.innerText, 600),
    };
  });
  console.log('\nURL      ' + info.url);
  console.log('TITLE    ' + info.title);
  console.log('SIGNED IN' + (info.signedIn ? ' yes' : ' NO - still on a login page'));
  console.log('HEADINGS ' + JSON.stringify(info.h1));
  console.log('FORMS    ' + info.forms + '   INPUTS ' + info.inputs.length);
  console.log('\nINPUTS');
  info.inputs.forEach(i => console.log('  ' + (i.tag + '/' + i.type).padEnd(16) +
    ('name=' + i.name).padEnd(30) + ('id=' + i.id).padEnd(26) + (i.value ? 'val="' + i.value + '"' : '')));
  console.log('\nBUTTONS  ' + JSON.stringify(info.buttons));
  console.log('\nPAGE TEXT (first 600)\n' + info.bodyStart);
  return info;
}

/* What is already on the partner site, so nothing gets entered twice. Scraped from
   the rows rather than assumed from my own notes. */
async function listExisting(page) {
  return page.evaluate(() => {
    const rows = [];
    document.querySelectorAll('tr').forEach(tr => {
      const tds = [...tr.querySelectorAll('td')].map(td => (td.innerText || '').trim());
      if (tds.length < 2) return;
      /* the API name is the machine-looking cell: lower_snake_case, no spaces */
      const api = tds.find(t => /^[a-z][a-z0-9_]{2,}$/.test(t));
      if (api) rows.push({ api: api, cells: tds.filter(Boolean).slice(0, 4) });
    });
    return rows;
  });
}

(async () => {
  let browser, page;
  if (MODE === 'list') {
    browser = await attach();
    const pages = await browser.pages();
    page = pages.find(p => p.url().includes('partner.steamgames.com')) || pages[pages.length - 1];
    const rows = await listExisting(page);
    console.log(JSON.stringify(rows.map(r => r.api)));
    browser.disconnect();
    return;
  }
  if (MODE === 'dump') {
    browser = await attach();
    const pages = await browser.pages();
    page = pages.find(p => p.url().includes('partner.steamgames.com')) || pages[pages.length - 1];
    await describe(page);
    browser.disconnect();
    return;
  }

  browser = await launch();
  page = (await browser.pages())[0] || await browser.newPage();
  await page.goto(ACH_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

  console.log('A Chrome window is open on the Steamworks achievements page.');
  console.log('SIGN IN THERE YOURSELF - I do not read or handle the password or the Steam Guard code.');
  console.log('The profile at ' + PROFILE + ' keeps the session, so this is a one-time step.');
  console.log('\nWaiting up to 10 minutes for the achievement page to load signed in...\n');

  const deadline = Date.now() + 10 * 60 * 1000;
  let ok = false;
  while (Date.now() < deadline) {
    await sleep(5000);
    let u = '';
    try { u = page.url(); } catch (e) { break; }
    if (u.includes('/achievements/') && !/login|signin/i.test(u)) {
      const body = await page.evaluate(() => document.body.innerText.slice(0, 400)).catch(() => '');
      if (body && !/sign in|log in to your account/i.test(body)) { ok = true; break; }
    }
  }
  if (!ok) {
    console.log('Still not signed in after 10 minutes. The window is left open - sign in and then run:');
    console.log('    node _steamach.js dump');
  } else {
    console.log('Signed in. Reading the achievement form...');
    await describe(page);
  }
  browser.disconnect();          // leave the window OPEN for the next command
})().catch(e => { console.error(e); process.exit(1); });

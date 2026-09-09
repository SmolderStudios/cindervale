/* Does the achievements PANEL actually render all 62, with their art, in their
 * categories? A check that works and an icon that exists still leave the question
 * of whether the player ever sees either. */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const FILE = 'file:///' + path.join(__dirname, 'cindervale.html').split(path.sep).join('/');

(async () => {
  const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const p = await br.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.setViewport({ width: 900, height: 1400, deviceScaleFactor: 2 });
  await p.goto(FILE + '?cvdev=1', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2600));

  const info = await p.evaluate(() => {
    state = defaultState(); normalizeState();
    /* earn roughly half, so locked AND unlocked both render */
    ACHIEVEMENTS.forEach((a, i) => { if (i % 2 === 0) state.achievements[a.id] = 1; });
    const host = document.createElement('div');
    host.id = 'achprobe';
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#140d07;overflow:auto;padding:16px;width:860px';
    document.body.appendChild(host);

    /* The panel deliberately shows ONE category at a time to keep its height sane,
       so rendering once would only ever prove an eighth of the set draws. Walk them. */
    let html = '', how = 'renderAchievements';
    const perCat = {};
    if (typeof renderAchievements !== 'function') return { err: 'renderAchievements missing' };
    for (const [key, label] of ACH_CATS) {
      _achCat = key;
      try { renderAchievements(); } catch (e) { return { err: 'threw on ' + key + ': ' + e.message }; }
      const box = document.getElementById('achView');
      const inner = box ? box.innerHTML : '';
      perCat[label] = (box ? box.innerText : '');
      html += inner;
    }
    host.innerHTML = html;
    const cards = host.querySelectorAll('*');
    const imgs = [...host.querySelectorAll('img')];
    const ids = ACHIEVEMENTS.map(a => a.id);
    const text = host.innerText || '';
    return {
      how, err: null,
      rendered: !!html.length,
      nodes: cards.length,
      imgs: imgs.length,
      brokenImgs: imgs.filter(i => !i.getAttribute('src')).length,
      namesShown: ACHIEVEMENTS.filter(a => text.includes(a.name)).length,
      missingNames: ACHIEVEMENTS.filter(a => !text.includes(a.name) && !a.hidden).map(a => a.id),
      perCat: Object.keys(perCat).map(k => k + '=' + (perCat[k] || '').length),
      total: ACHIEVEMENTS.length,
      /* an id appearing as literal text means iconHTML returned the id verbatim */
      literalIds: ids.filter(id => new RegExp('(^|\\s)' + id + '(\\s|$)').test(text)),
      cats: ACH_CATS.map(c => c[1]).filter(n => text.includes(n)),
      catCount: ACH_CATS.length,
    };
  });

  console.log(JSON.stringify(info, null, 1));
  console.log('page errors: ' + (errs.length ? errs.join(' | ') : 'none'));
  const el = await p.$('#achprobe');
  if (el) await el.screenshot({ path: path.join(__dirname, '_iconart', '_achpanel.png') });
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });

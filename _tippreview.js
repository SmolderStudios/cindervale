/* The LIVE item tooltip, at rest and with Shift held.
 *
 *     node _tippreview.js
 *
 * No mock-ups: this drives the shipped showItemTooltip() and screenshots what it
 * actually renders, in both states, so the preview cannot flatter the change.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const FILE = 'file:///' + path.join(__dirname, 'cindervale.html').split(path.sep).join('/');

const SHOW = ['bronze_dagger', 'grave_cleaver', 'ancient_longbow', 'starfall_crossbow',
  'steel_shield', 'buckler_leather', 'runite_arrow', 'wood_shaft', 'honed_edge_2', 'roast_fowl',
  'ruby_ring', 'ancient_log'];

const PAGE = function (ids) {
  state = defaultState(); normalizeState();
  state.combatEquipped = state.combatEquipped || {};
  state.combatEquipped.weapon = 'bronze_sword';
  state.combatEquipped.shield = 'bronze_shield';
  ids.forEach(function (id) { if (ITEMS[id]) state.items[id] = 5; });

  var out = [], tt = document.getElementById('itemTooltip');
  ids.forEach(function (id) {
    if (!ITEMS[id]) { out.push({ id: id, missing: true }); return; }
    _ttExpanded = false; showItemTooltip(id, 0, 0);
    var rest = tt.innerHTML;
    _ttExpanded = true; showItemTooltip(id, 0, 0);
    var shift = tt.innerHTML;
    _ttExpanded = false;
    out.push({ id: id, name: ITEMS[id].name, rest: rest, shift: shift });
  });
  var css = ''; document.querySelectorAll('style').forEach(function (s) { css += s.textContent + '\n'; });
  return { rows: out, css: css };
};

(async () => {
  const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const p = await br.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.setViewport({ width: 1600, height: 1000 });
  await p.goto(FILE + '?cvdev=1', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2600));
  const data = await p.evaluate(PAGE, SHOW);
  await br.close();

  let h = '<!doctype html><meta charset="utf-8"><title>Cindervale item tooltip</title>'
    + '<style>' + data.css + '</style><style>'
    + 'body{background:#120d07;margin:0;font-family:"Segoe UI",system-ui;color:#ead9b5}'
    + '.wrap{padding:20px 24px 60px}h1{color:#e8c98a;font-size:22px;margin:0 0 4px}'
    + '.sub{color:#8a7455;font-size:13px;margin-bottom:8px;max-width:900px;line-height:1.55}'
    + '.bar{position:sticky;top:0;z-index:9;background:#0d0904ee;border-bottom:1px solid #2e2113;'
    + 'padding:12px 24px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}'
    + '.bar label{font-size:13px;color:#a08a64;display:flex;align-items:center;gap:7px}'
    + '.bar input[type=range]{width:190px;accent-color:#c79b4e}'
    + '.bar b{color:#e8c98a;font-family:ui-monospace,monospace;min-width:42px;display:inline-block}'
    + '#zoomer{transform-origin:0 0}table{border-collapse:collapse}'
    + 'th{color:#c79b4e;font-size:13px;text-transform:uppercase;letter-spacing:1px;text-align:left;padding:14px 16px 10px}'
    + 'td{vertical-align:top;padding:0 16px 26px}'
    + '.iname{color:#6e552c;font-size:12px;padding:0 16px 4px;letter-spacing:.5px}'
    /* the real card is positioned/hidden by the game; pin it flat for the page */
    + '#itemTooltip{position:static!important;display:block!important;width:330px;'
    + 'background:#1b1409;border:1px solid #3a2a17;border-radius:8px;color:#ead9b5;'
    + 'font-size:14px;line-height:1.45}'
    + '</style>';
  h += '<div class="bar"><label>Zoom <input id="z" type="range" min="100" max="320" value="180"> <b id="zv">180%</b></label>'
    + '<span style="color:#6e552c;font-size:12px">the live card, straight out of showItemTooltip()</span></div>';
  h += '<div id="zoomer"><div class="wrap"><h1>Item tooltip &mdash; live</h1>'
    + '<div class="sub">Left is what you see on hover. Right is the same card with Shift held: the weapon-class and damage-type '
    + 'explanations, the flavour line, every source and the rest of the Used-in chips.</div>';
  h += '<table><tr><th>at rest</th><th>Shift held</th></tr>';
  for (const r of data.rows) {
    if (r.missing) { h += '<tr><td colspan="2" class="iname">' + r.id + ' &mdash; no such item</td></tr>'; continue; }
    h += '<tr><td colspan="2" class="iname">' + r.id + '</td></tr><tr>'
      + '<td><div id="itemTooltip" class="tt-card">' + r.rest + '</div></td>'
      + '<td><div id="itemTooltip" class="tt-card">' + r.shift + '</div></td></tr>';
  }
  h += '</table></div></div>';
  h += '<script>(function(){var z=document.getElementById("z"),v=document.getElementById("zv"),w=document.getElementById("zoomer");'
    + 'function a(){var s=z.value/100;w.style.transform="scale("+s+")";w.style.width=(100/s)+"%";v.textContent=z.value+"%";}'
    + 'z.addEventListener("input",a);a();})();<\/script>';

  const out = path.join(__dirname, '_iconart', '_tippreview.html');
  fs.writeFileSync(out, h);
  const stray = [...h.matchAll(/>\s*(ui_[a-z_]+)\s*</g)].map(m => m[1]);
  console.log('wrote ' + out + '  (' + data.rows.filter(r => !r.missing).length + '/' + SHOW.length + ' items)');
  console.log('page errors: ' + (errs.length ? errs.join(' | ') : 'none'));
  console.log('unresolved icon ids in output: ' + (stray.length ? [...new Set(stray)].join(', ') : 'none'));
})().catch(e => { console.error(e); process.exit(1); });

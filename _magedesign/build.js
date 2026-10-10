/* Build _magedesign/preview.html: the Magic design page.
 *
 *     node _magedesign/sim.js      measures the design, writes results.json
 *     node _magedesign/names.js    reads display names and material uses, writes names.json
 *     node _magedesign/shoot.js    photographs the prototype, writes shots/
 *     node _magedesign/build.js    this: one self-contained page from all three
 *
 * Every number in the page is read out of results.json, names.json or design.js at
 * build time. The screenshots are re-encoded to WebP in the headless Chrome already
 * on this machine and embedded, so the page opens from disk with nothing beside it.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'results.json'), 'utf8'));
const N = JSON.parse(fs.readFileSync(path.join(__dirname, 'names.json'), 'utf8'));
const MD = require('./design.js');
const META = JSON.parse(fs.readFileSync(path.join(__dirname, 'shots', 'meta.json'), 'utf8'));
const page = require('./page.js');

const SHOTS = { fight: 1320, switch: 1320, raid: 1320, dry: 1320, out: 1320, picker: 1320, mlog: 1320, mastery: 1320, skill: 1320, tree: 1064,
  gear: 348, loadouts: 348, nostaff: 272, tipstaff: 272, tiprobe: 272, tiprune: 272, tipplate: 272, welcome: 652 };

(async () => {
  const puppeteer = require(path.join(KIT, 'node_modules/puppeteer-core'));
  const CHROME = path.join(KIT, 'browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe');
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage();
  await p.goto('data:text/html,<body>');
  const shots = {};
  let bytes = 0;
  for (const id of Object.keys(SHOTS)) {
    const f = path.join(__dirname, 'shots', id + '.png');
    if (!fs.existsSync(f)) { console.log('  missing ' + id); continue; }
    const raw = fs.readFileSync(f).toString('base64');
    const out = await p.evaluate(async (raw, maxW, crop) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + raw; await img.decode();
      const sx = crop ? crop[0] : 0, sy = crop ? crop[1] : 0, sw = crop ? crop[2] : img.width, sh = crop ? crop[3] : img.height;
      const s = Math.min(1, maxW / sw);
      const c = document.createElement('canvas'); c.width = Math.round(sw * s); c.height = Math.round(sh * s);
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      return { src: c.toDataURL('image/webp', 0.84), w: c.width, h: c.height };
    }, raw, SHOTS[id], page.CROP[id] || null);
    shots[id] = out; bytes += out.src.length;
    console.log('  ' + id.padEnd(10) + String(out.w).padStart(5) + ' x ' + String(out.h).padEnd(5) + Math.round(out.src.length * 0.75 / 1024) + ' KB');
  }
  await b.close();
  const html = page.render({ R, MD, META, N, shots });

  /* The rules that are easy to break in a page this long. Checked on the text a
     reader sees: data URIs, the stylesheet and anything inside <code> are left out. */
  const noData = html.replace(/src="data:[^"]+"/g, '');
  const text = noData.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<code>[\s\S]*?<\/code>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  const bad = [];
  if (/\u2014|&mdash;/.test(noData)) bad.push('an em dash');
  const gap = text.match(/.{0,40}\b(undefined|NaN|null|Infinity)\b.{0,40}/);
  if (gap) bad.push('a missing number: "' + gap[0].trim() + '"');
  const lit = text.match(/.{0,30}\$\{.{0,40}/);
  if (lit) bad.push('a number that was never filled in: "' + lit[0].trim() + '"');
  const raw = text.match(/.{0,30}\d\.\d{5,}.{0,20}/);
  if (raw) bad.push('a number nobody rounded: "' + raw[0].trim() + '"');
  const us = text.match(/.{0,30}\b(armor|defense|behavior|favor(?!i)|honor|analyz\w+|organiz\w+|optimiz\w+|gray|jewelry|center(ed)?|colors?|catalog|traveling|modeling|labeled|fulfill|program)\b.{0,30}/i);
  if (us) bad.push('a US spelling: "' + us[0].trim() + '"');
  const game = (noData.match(/<span class="game">[\s\S]*?<\/span>/g) || []).map(s => s.replace(/<[^>]+>/g, ''));
  const BANNED = /\b(pays?|yields?|binds? to|swings?|blows?|strikes?|guards?|landings?|stretch(es)?|weight|affix(es)?|telegraph\w*|natives?|dearer|procs?|rolls?|channel)\b/i;
  game.forEach(s => { const m = s.match(BANNED); if (m) bad.push('a banned word in game copy: "' + m[0] + '" in "' + s.slice(0, 70) + '"'); });
  if (bad.length) { console.error('REFUSING TO WRITE: the page contains\n  ' + bad.join('\n  ')); fs.writeFileSync(path.join(__dirname, 'preview.rejected.html'), html); process.exit(1); }

  fs.writeFileSync(path.join(__dirname, 'preview.html'), html);
  try { fs.unlinkSync(path.join(__dirname, 'preview.rejected.html')); } catch (e) {}
  console.log('preview.html  ' + Math.round(html.length / 1024) + ' KB  (' + Math.round(bytes / 1024) + ' KB of it screenshots)  ·  ' + game.length + ' lines of game copy checked');
})().catch(e => { console.error(e); process.exit(1); });

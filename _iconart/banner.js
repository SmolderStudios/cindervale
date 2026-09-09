/* Crop a wide painted scene into a skill BANNER and splice it into SKILL_ART.
 *
 *     node _iconart/banner.js sheets/thief_banner.png thieving --band 0.17,0.49
 *
 * The twelve older banners were made before this existed and are 1536x177 WebP,
 * ~8 KB each. That aspect is 8.7:1 — far wider than anything a generator hands back
 * — and `.sk-scene` uses object-fit:cover, so supplying the source at its own
 * aspect would let the BROWSER pick the crop, centred, which on a night-alley
 * composition throws away the one warm light in the frame. So the band is chosen
 * here: --band <top>,<bottom> as fractions of the source height.
 *
 * Idempotent per skill: an existing SKILL_ART entry is replaced in place.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i+1] : null; };
const [, , srcArg, skill] = process.argv;
if (!srcArg || !skill) { console.error('usage: node _iconart/banner.js <scene.png> <skill> [--band t,b] [--q 0.80] [--dry]'); process.exit(1); }
const BAND = (arg('--band') || '0,1').split(',').map(Number);
const Q = +(arg('--q') || 0.80);
const W = 1536, H = 177;
const SRC = path.resolve(__dirname, srcArg);
const FILE = path.join(__dirname, '..', 'cindervale.html');

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const uri = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');
  const out = await p.evaluate(async (uri, W, H, Q, BAND) => {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = uri; });
    const sy = Math.round(img.height * BAND[0]);
    const sh = Math.round(img.height * (BAND[1] - BAND[0]));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    /* Cover, not stretch: fill the strip from the band and centre what does not fit,
       so a band that is not exactly 8.7:1 is cropped rather than squashed. */
    const s = Math.max(W / img.width, H / sh);
    const dw = img.width * s, dh = sh * s;
    x.drawImage(img, 0, sy, img.width, sh, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return { uri: c.toDataURL('image/webp', Q), src: img.width + 'x' + img.height, band: sy + '..' + (sy + sh) };
  }, uri, W, H, Q, BAND);
  await b.close();

  const kb = (out.uri.length * 0.75 / 1024).toFixed(1);
  console.log(`${path.basename(SRC)}  ${out.src}  band y ${out.band}  ->  ${W}x${H} webp q${Q}  ${kb} KB`);
  if (process.argv.includes('--dry')) { fs.writeFileSync(path.join(__dirname, '_banner_preview.txt'), out.uri); return; }

  let s = fs.readFileSync(FILE, 'utf8');
  const i = s.indexOf('const SKILL_ART={');
  if (i < 0) { console.error('no SKILL_ART literal'); process.exit(1); }
  /* Brace-match, not a search for a "};" line — see the note in injectnodes.js for
     what that shortcut cost the first time. */
  const j = require('./_litend.js')(s, i + 'const SKILL_ART='.length);
  if (j < 0) { console.error('SKILL_ART literal never closes'); process.exit(1); }
  const head = s.slice(0, i + 'const SKILL_ART={'.length);
  let body = s.slice(i + 'const SKILL_ART={'.length, j);
  const re = new RegExp(String.raw`\n?\s*` + skill + String.raw`:\s*'data:image/webp;base64,[^']*',?`);
  const entry = `\n  ${skill}:'${out.uri}',`;
  /* The comma matters. The last entry in the literal carries none, so appending
     without one produced `crafting:'...'` newline `thieving:'...'` and a dead file. */
  const tail = body.replace(/\s*$/, '');
  body = re.test(body) ? body.replace(re, entry)
       : tail + (/[,{]$/.test(tail) ? '' : ',') + entry;
  fs.writeFileSync(FILE, head + body + s.slice(j), 'utf8');
  console.log(`SKILL_ART.${skill} written  (file now ${(fs.statSync(FILE).size/1048576).toFixed(2)} MB)`);
})();

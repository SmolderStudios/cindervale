/* Automated sanity pass over the keyed icons.
 *
 *     node _iconart/verify.js
 *
 * Eyeballing 144 images finds the howlers (copper ore came back as a clenched
 * fist) but not the quiet failures, and it does not scale. These four checks are
 * the ones that actually matter for this surface:
 *
 *   HUE      — colour is what separates one tier from the next. If runite ore is
 *              not green, the tier ladder is broken however nice the picture is.
 *              Only checked where EXPECT below declares an intent.
 *   VALUE    — the monster pass's biggest lesson: a dark subject VANISHES on a
 *              dark panel. Mean luminance over OPAQUE pixels only; the satchel
 *              tile sits around 30/255, so anything near that disappears.
 *   CONTRAST — a flat mid-value blob has no silhouette at 15px even if it is bright.
 *   COVERAGE — the subject should fill the square. Tiny art in a big transparent
 *              frame is the "coin-sized rat in a void" failure from cfg 4.
 *
 * Flags are advisory, not gospel — a black coal lump SHOULD be dark. The point is
 * to put a short list in front of a human instead of a long one.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const CUT = path.join(__dirname, 'cut');

/* Expected dominant hue in degrees, and how far off is acceptable. Only for items
   where the colour IS the information. `null` means "no expectation" — a trout or
   a piece of driftwood can be whatever it wants. */
const EXPECT = {
  // logs read by warmth, not hue family, so only the loud ones are pinned
  ember_log: [25, 45], frost_log: [195, 60], shadow_log: [280, 90], ancient_log: [45, 40],
  // ores — the tier ladder
  copper_ore: [25, 40], iron_ore: [20, 45], gold_ore: [48, 30], mithril_ore: [200, 45],
  cobalt_ore: [225, 45], runite_ore: [140, 50], starsteel_ore: [275, 75],
  // bars — same ladder, cast form
  bronze_bar: [25, 40], gold_bar: [48, 30], mithril_bar: [200, 45],
  cobalt_bar: [225, 45], runite_bar: [140, 50],
  // gems, rough and cut
  sapphire: [220, 40], emerald: [140, 45], ruby: [355, 35], amethyst: [280, 40],
  dragon_gem: [20, 40], bloodstone: [140, 60], void_crystal: [280, 70],
  cut_sapphire: [220, 40], cut_emerald: [140, 45], cut_ruby: [355, 35],
  cut_amethyst: [280, 40], cut_dragon: [20, 40], cut_void: [280, 70],
  // herbs with a strong colour claim
  bloodcap: [355, 40], emberbloom: [28, 45], frostcrocus: [200, 55], nightshade: [285, 55],
  sunroot: [45, 40],
};

const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const WORK = `async (uri) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const px = x.getImageData(0, 0, c.width, c.height).data;
  const N = c.width * c.height;
  let n = 0, sumL = 0, sumL2 = 0, sx = 0, sy = 0, sumSat = 0;
  for (let i = 0; i < N; i++) {
    if (px[i*4+3] < 128) continue;                       // opaque pixels only
    const r = px[i*4] / 255, g = px[i*4+1] / 255, b = px[i*4+2] / 255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn;
    let h = 0;
    if (d > 0.001) {
      if (mx === r) h = 60 * (((g - b) / d) % 6);
      else if (mx === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
      if (h < 0) h += 360;
    }
    const sat = mx === 0 ? 0 : d / mx;
    // weight hue by saturation so a grey rim does not drag the average
    sx += Math.cos(h * Math.PI / 180) * sat;
    sy += Math.sin(h * Math.PI / 180) * sat;
    sumSat += sat;
    const L = (0.299*px[i*4] + 0.587*px[i*4+1] + 0.114*px[i*4+2]);
    sumL += L; sumL2 += L * L; n++;
  }
  if (!n) return { err: 'fully transparent' };
  const meanL = sumL / n;
  const sd = Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL));
  let hue = Math.atan2(sy, sx) * 180 / Math.PI; if (hue < 0) hue += 360;
  return {
    coverage: +(n / N * 100).toFixed(1),
    meanL: +meanL.toFixed(1),
    contrast: +sd.toFixed(1),
    hue: +hue.toFixed(0),
    sat: +(sumSat / n).toFixed(2),
  };
}`;

(async () => {
  const files = fs.readdirSync(CUT).filter(f => f.endsWith('.png')).sort();
  if (!files.length) { console.log('nothing in cut/ — run key.js first'); return; }
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle(`(${WORK})`);

  const flags = [];
  const rows = [];
  for (const f of files) {
    const id = f.replace(/__(painted|emblem)\.png$/, '');
    const uri = 'data:image/png;base64,' + fs.readFileSync(path.join(CUT, f)).toString('base64');
    const r = await p.evaluate((fn, u) => fn(u), fn, uri);
    if (r.err) { flags.push({ f, why: r.err }); continue; }
    const why = [];
    // the satchel tile sits near 30/255; anything close to it disappears
    if (r.meanL < 46) why.push('too dark for the tile (L ' + r.meanL + ')');
    if (r.contrast < 26) why.push('flat, no silhouette (sd ' + r.contrast + ')');
    if (r.coverage < 14) why.push('subject too small (' + r.coverage + '% of frame)');
    const exp = EXPECT[id];
    if (exp && r.sat > 0.12) {
      const d = hueDist(r.hue, exp[0]);
      if (d > exp[1]) why.push('hue ' + r.hue + ' deg, wanted ~' + exp[0] + ' (off by ' + Math.round(d) + ')');
    }
    rows.push(Object.assign({ f, id }, r, { why }));
    if (why.length) flags.push({ f, why: why.join('; ') });
  }
  await b.close();

  fs.writeFileSync(path.join(CUT, '_verify.json'), JSON.stringify(rows, null, 1));
  console.log(rows.length + ' icons checked\n');
  if (!flags.length) { console.log('nothing flagged.'); return; }
  console.log(flags.length + ' flagged (advisory — a coal lump SHOULD be dark):');
  for (const f of flags) console.log('  ' + f.f.replace('.png','').padEnd(30) + f.why);
  console.log('\nre-roll a flagged item:  node _iconart/gen.js --only ' +
    [...new Set(flags.map(f => f.f.replace(/__.*/, '')))].slice(0, 6).join(','));
})().catch(e => { console.error(e); process.exit(1); });

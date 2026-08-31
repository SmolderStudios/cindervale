/* Regenerate the scenes that failed the brightness check, and keep retrying until
 * they pass.
 *
 * Four of the first ten came back nearly black — "night", "deep", "candlelit" and
 * "deep black shadows filling the corners" all pulled the same direction at once,
 * and a card banner made of 80% black reads as a broken image. One came back with
 * a blown-out lamp instead.
 *
 * So this pass measures every image before accepting it: mean luminance, the share
 * of near-black pixels, and the share of near-white ones. A scene has to land
 * inside all three windows or it is generated again with a brighter prompt.
 */
const fs = require('fs'), path = require('path');
const { session, gen } = require('C:/code/irongate/tools/swarm.js');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(path.join(KIT, 'node_modules/puppeteer-core'));
const CHROME = path.join(KIT, 'browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe');

const OUT = path.join(__dirname, 'scenes');
const MODEL = 'ZImage/SwarmUI_Z-Image-Turbo-FP8Mix.safetensors';

/* Light is now stated three times — the source, that it reaches everywhere, and
   that nothing is in silhouette. Saying it once was not enough. */
const BASE = 'dark fantasy game art, painted, textured, warm lantern and firelight '
  + 'reaching into every corner, evenly lit, rich readable detail across the whole '
  + 'frame edge to edge, no empty space, medieval';
const NEG = 'photograph, people, person, face, hands, text, letters, watermark, '
  + 'signature, frame, border, vignette, ui, icon, logo, emblem, crest, flat vector, '
  + 'cartoon, cute, modern, white background, grey background, overexposed, blown '
  + 'highlights, glare, '
  /* the four words that made the first batch black */
  + 'pitch black, underexposed, silhouette, mostly darkness, empty dark space, '
  + 'deep shadow, night sky, unlit';

const JOBS = {
  ashen: 'a brightly lit alchemists workshop, shelves crowded with coloured glass bottles '
    + 'catching the light, a copper still glowing green, candles along the bench, '
    + 'dried herbs hanging, ' + BASE,
  deepwater: 'a fishing harbour at first light, a wooden dock crowded with small boats, '
    + 'nets and crab pots stacked, lanterns still burning on the posts, pale dawn behind, ' + BASE,
  delvers: 'a mine tunnel lit by a row of hanging lanterns, a glowing crystal seam in the '
    + 'rock wall, an ore cart on rails, timber props, tools against the stone, ' + BASE,
  quiethand: 'a rogues hideout lit by many candles, throwing knives and lockpicks laid out '
    + 'on a table, maps pinned to the wall, hooded cloaks on pegs, a shuttered window, ' + BASE,
  facet: 'a jewellers workbench, trays of cut gemstones and gold rings, tiny files and '
    + 'tweezers, an open ledger, steady even lamplight across the whole bench, ' + BASE,
};

/* Thresholds calibrated against the six scenes that already looked right rather
   than picked out of the air. Those measured mean 32-64 with 33-59% near-black —
   so 59% black is FINE in a dark-fantasy interior. The four failures measured
   mean 15-27 with 63-83% black. The line sits between those two groups. */
const OK = m => m.mean >= 30 && m.mean <= 110 && m.dark <= 62 && m.light <= 6;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const page = await b.newPage();
  await page.goto('data:text/html,<body>');
  const measure = buf => page.evaluate(async (raw) => {
    const i = new Image(); i.src = 'data:image/png;base64,' + raw; await i.decode();
    const c = document.createElement('canvas'); c.width = 192; c.height = 64;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0, 192, 64);
    const d = x.getImageData(0, 0, 192, 64).data;
    let sum = 0, dark = 0, light = 0; const n = 192 * 64;
    for (let k = 0; k < d.length; k += 4) {
      const L = 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
      sum += L; if (L < 26) dark++; if (L > 200) light++;
    }
    return { mean: Math.round(sum / n), dark: Math.round(dark / n * 100), light: Math.round(light / n * 100) };
  }, buf.toString('base64'));

  const sid = await session();
  for (const [id, prompt] of Object.entries(JOBS)) {
    let best = null, bestM = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      const buf = await gen(sid, {
        prompt, negativeprompt: NEG, model: MODEL,
        width: 1152, height: 384, steps: 22, cfgscale: 3.0, seed: -1,
      });
      const m = await measure(buf);
      /* keep the brightest attempt so a run always ends with something usable */
      if (!bestM || m.mean > bestM.mean) { best = buf; bestM = m; }
      console.log('  ' + id.padEnd(10) + 'try ' + attempt
        + '  mean ' + String(m.mean).padStart(3)
        + '  black ' + String(m.dark).padStart(2) + '%'
        + '  white ' + String(m.light).padStart(2) + '%'
        + (OK(m) ? '  PASS' : '  retry'));
      if (OK(m)) { best = buf; bestM = m; break; }
    }
    fs.writeFileSync(path.join(OUT, id + '.png'), best);
    console.log('  ' + id.padEnd(10) + '-> kept mean ' + bestM.mean);
  }
  await b.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });

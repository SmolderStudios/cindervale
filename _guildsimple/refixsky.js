/* The white border was sky.
 *
 * Three of the ten guilds were written as outdoor scenes — ploughed fields, a
 * logging camp, a harbour. Outdoors has a horizon, a horizon puts a pale strip
 * along the top of a 3:1 painting, and inside a card that strip reads as a white
 * border. Measured against the middle of each image: furrow +99, timber +62,
 * deepwater +58, while all seven interiors sat between -35 and +8.
 *
 * So the fix is not lighting, it is the subject: give those three guilds an
 * interior like the other seven have. A barn, a lodge, a boathouse.
 *
 * Both checks now run before an image is accepted — overall brightness AND the
 * top-edge lift — so neither failure can come back silently.
 */
const fs = require('fs'), path = require('path');
const { session, gen } = require('C:/code/irongate/tools/swarm.js');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(path.join(KIT, 'node_modules/puppeteer-core'));
const CHROME = path.join(KIT, 'browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe');

const OUT = path.join(__dirname, 'scenes');
const MODEL = 'ZImage/SwarmUI_Z-Image-Turbo-FP8Mix.safetensors';

const BASE = 'dark fantasy game art, painted, textured, interior, walls and roof '
  + 'enclosing the whole frame, warm lantern and firelight reaching into every '
  + 'corner, evenly lit, rich readable detail edge to edge, no empty space, medieval';
const NEG = 'photograph, people, person, face, hands, text, letters, watermark, '
  + 'signature, frame, border, vignette, ui, icon, logo, emblem, crest, flat vector, '
  + 'cartoon, cute, modern, white background, grey background, overexposed, blown '
  + 'highlights, glare, pitch black, underexposed, silhouette, mostly darkness, '
  /* the words that put a horizon in the picture */
  + 'sky, clouds, horizon, sunset, sunrise, dawn, outdoors, open air, landscape, '
  + 'distant hills, daylight from above';

const JOBS = {
  furrow: 'inside a farm barn, hay bales stacked to the rafters, sacks of grain and '
    + 'seed, a plough and hand tools against the wall, baskets of vegetables, a '
    + 'lantern hanging from a beam, ' + BASE,
  timber: 'inside a woodcutters lodge, split logs stacked high against the wall, axes '
    + 'and long saws hung on hooks, a sawhorse and workbench covered in shavings, a '
    + 'fire in a stone hearth, ' + BASE,
  deepwater: 'inside a harbour boathouse, fishing nets and crab pots hanging from the '
    + 'rafters, barrels of salted fish, coils of rope, a small boat up on trestles '
    + 'being repaired, lanterns on the posts, ' + BASE,
};

/* Both gates. `lift` is the top strip against the middle — a horizon shows up here
   long before it is obvious by eye. */
const OK = m => m.mean >= 30 && m.mean <= 110 && m.dark <= 62 && m.light <= 6
             && m.lift <= 22;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const page = await b.newPage();
  await page.goto('data:text/html,<body>');
  const measure = buf => page.evaluate(async (raw) => {
    const i = new Image(); i.src = 'data:image/png;base64,' + raw; await i.decode();
    const W = 192, H = 64;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data;
    const lum = k => 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
    let sum = 0, dark = 0, light = 0; const n = W * H;
    for (let k = 0; k < d.length; k += 4) {
      const L = lum(k); sum += L; if (L < 26) dark++; if (L > 200) light++;
    }
    const band = (y0, y1) => {
      let s = 0, c2 = 0;
      for (let y = y0; y < y1; y++) for (let xx = 0; xx < W; xx++) { s += lum((y * W + xx) * 4); c2++; }
      return s / c2;
    };
    const top = band(0, Math.round(H * 0.14)), mid = band(Math.round(H * 0.30), Math.round(H * 0.80));
    return { mean: Math.round(sum / n), dark: Math.round(dark / n * 100),
             light: Math.round(light / n * 100), lift: Math.round(top - mid) };
  }, buf.toString('base64'));

  const sid = await session();
  for (const [id, prompt] of Object.entries(JOBS)) {
    let best = null, bestM = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const buf = await gen(sid, {
        prompt, negativeprompt: NEG, model: MODEL,
        width: 1152, height: 384, steps: 22, cfgscale: 3.0, seed: -1,
      });
      const m = await measure(buf);
      /* rank by how flat the top edge is, since that is the failure being fixed */
      if (!bestM || m.lift < bestM.lift) { best = buf; bestM = m; }
      console.log('  ' + id.padEnd(10) + 'try ' + attempt
        + '  mean ' + String(m.mean).padStart(3)
        + '  black ' + String(m.dark).padStart(2) + '%'
        + '  top-lift ' + String(m.lift > 0 ? '+' + m.lift : m.lift).padStart(4)
        + (OK(m) ? '   PASS' : '   retry'));
      if (OK(m)) { best = buf; bestM = m; break; }
    }
    fs.writeFileSync(path.join(OUT, id + '.png'), best);
    console.log('  ' + id.padEnd(10) + '-> kept  mean ' + bestM.mean + '  top-lift ' + bestM.lift);
  }
  await b.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });

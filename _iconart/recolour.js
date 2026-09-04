/* Recolour one base icon across a whole tier ladder.
 *
 *     node _iconart/recolour.js                 do every slot in BASES
 *     node _iconart/recolour.js --slot chest    just one
 *     node _iconart/recolour.js --erode 4       trim more of the rim off the base
 *
 * Jordan's call, and it is the right one: generating each tier separately is what
 * produced eleven different silhouettes per slot and a fresh one-off failure every
 * batch. The game's own icon rule already says one base shape with a palette swap
 * per tier — so pick the best generated piece for a slot and derive the ladder from
 * it instead of rolling the dice eleven times.
 *
 * Two things happen to the base:
 *
 *   ERODE. The pale bases were generated on a black backdrop and came back with a
 *   bright rim light around the silhouette. Recolouring keeps that rim white, so it
 *   is shaved off by eroding the alpha a few pixels before anything else.
 *
 *   GRADIENT MAP. Luminance is mapped through a three-stop ramp per metal, which
 *   keeps every fold, rivet and highlight of the original while replacing the hue
 *   completely. A hue rotation cannot do this — it leaves greys grey, which is
 *   exactly what iron and steel are made of.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const CUT = path.join(__dirname, 'cut');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ERODE = +(arg('--erode') || 0);
const ONLY_SLOT = arg('--slot');

/* dark · mid · light for each rung of the ladder */
const RAMPS = {
  bronze:      ['#2e1c0b', '#a86c28', '#f3c877'],
  iron:        ['#1d1d20', '#6b6b70', '#c9c9d0'],
  steel:       ['#2f343a', '#8e959d', '#eff3f8'],
  mithril:     ['#0d2c46', '#2f86c8', '#bde7ff'],
  cobalt:      ['#0d1b45', '#2540c8', '#a3b6ff'],
  runite:      ['#08301d', '#1f9457', '#a4ecc0'],
  starsteel:   ['#282142', '#8b7fd0', '#efe9ff'],
  gravesteel:  ['#1f2a24', '#6d8878', '#cfded3'],
  moltensteel: ['#150e0c', '#7d2f0e', '#ff8f33'],
  voidsteel:   ['#100d1b', '#472d78', '#bd93ff'],
  dawn:        ['#4a3410', '#c79b3e', '#fff3c4'],
};

/* Which generated piece is the master for each slot, and which tier it already is
   (so that tier is copied straight through rather than recoloured onto itself). */
const BASES = {
  helmet: ['steel_helm',   'steel'],
  chest:  ['steel_chest',  'steel'],
  legs:   ['steel_legs',   'steel'],
  gloves: ['steel_gloves', 'steel'],
  boots:  ['steel_boots',  'steel'],
  shield: ['steel_shield', 'steel'],
  cape:   ['steel_cape',   'steel'],
  buckler:['steel_buckler','steel'],
  sword:  ['bronze_sword',  'bronze'],
  dagger: ['bronze_dagger', 'bronze'],
  hammer: ['bronze_hammer', 'bronze'],
};

/* id for a given slot on a given tier, matching the game's own naming */
const SUFFIX = { helmet: 'helm', chest: 'chest', legs: 'legs', gloves: 'gloves',
  boots: 'boots', shield: 'shield', cape: 'cape', buckler: 'buckler', sword: 'sword', dagger: 'dagger', hammer: 'hammer' };

const WORK = `async (uri, ramp, erode) => {
  const img = new Image(); img.src = uri; await img.decode();
  const W = img.width, H = img.height, N = W * H;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, W, H), px = d.data;

  /* erode alpha: any pixel with a transparent neighbour within \`erode\` steps goes.
     This is what takes the bright generated rim off, so it cannot be recoloured. */
  if (erode > 0) {
    let a = new Uint8Array(N);
    for (let i = 0; i < N; i++) a[i] = px[i*4+3] > 24 ? 1 : 0;
    for (let pass = 0; pass < erode; pass++) {
      const b = new Uint8Array(a);
      for (let i = 0; i < N; i++) {
        if (!a[i]) continue;
        const X = i % W, Y = (i / W) | 0;
        if (X === 0 || Y === 0 || X === W-1 || Y === H-1 ||
            !a[i-1] || !a[i+1] || !a[i-W] || !a[i+W]) b[i] = 0;
      }
      a = b;
    }
    for (let i = 0; i < N; i++) if (!a[i]) px[i*4+3] = 0;
  }

  /* luminance range of what survived, so the ramp is sampled across the real span */
  let lo = 255, hi = 0;
  for (let i = 0; i < N; i++) {
    if (px[i*4+3] < 16) continue;
    const l = (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
    if (l < lo) lo = l; if (l > hi) hi = l;
  }
  const span = Math.max(1, hi - lo);

  const hex = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const A = hex(ramp[0]), B = hex(ramp[1]), C2 = hex(ramp[2]);
  const mix = (p, q, t) => [p[0]+(q[0]-p[0])*t, p[1]+(q[1]-p[1])*t, p[2]+(q[2]-p[2])*t];

  const toHsl = (r, g, bl) => {
    r/=255; g/=255; bl/=255;
    const mx = Math.max(r,g,bl), mn = Math.min(r,g,bl), l = (mx+mn)/2;
    if (mx === mn) return [0, 0, l];
    const dd = mx - mn;
    const sat = l > 0.5 ? dd/(2-mx-mn) : dd/(mx+mn);
    let h;
    if (mx === r) h = ((g-bl)/dd + (g < bl ? 6 : 0));
    else if (mx === g) h = (bl-r)/dd + 2;
    else h = (r-g)/dd + 4;
    return [h/6, sat, l];
  };
  const hue2 = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q-p)*6*t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q-p)*(2/3-t)*6;
    return p;
  };
  const toRgb = (h, sat, l) => {
    if (sat === 0) { const v = l*255; return [v,v,v]; }
    const q = l < 0.5 ? l*(1+sat) : l+sat-l*sat, p = 2*l-q;
    return [hue2(p,q,h+1/3)*255, hue2(p,q,h)*255, hue2(p,q,h-1/3)*255];
  };

  for (let i = 0; i < N; i++) {
    if (px[i*4+3] < 16) continue;
    const r = px[i*4], g = px[i*4+1], bl = px[i*4+2];
    const lum = (r*299 + g*587 + bl*114) / 1000;
    const t = Math.min(1, Math.max(0, (lum - lo) / span));
    const target = t < 0.5 ? mix(A, B, t * 2) : mix(B, C2, (t - 0.5) * 2);
    const th = toHsl(target[0], target[1], target[2]);
    /* SOURCE lightness, TARGET hue and saturation — texture is entirely in the
       lightness channel, so this repaints without flattening anything. */
    const src = toHsl(r, g, bl);
    /* squeeze the top end so a near-white rim cannot survive as white, while
       real highlights below it keep their separation */
    const L = src[2] > 0.78 ? 0.78 + (src[2] - 0.78) * 0.30 : src[2];
    const out = toRgb(th[0], th[1], L);
    px[i*4] = out[0]; px[i*4+1] = out[1]; px[i*4+2] = out[2];
  }
  x.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}`;

(async () => {
  const br = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await br.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle('(' + WORK + ')');

  const out = path.join(__dirname, 'recol_cut');
  fs.mkdirSync(out, { recursive: true });
  let n = 0, missing = [];

  for (const [slot, [baseId, baseTier]] of Object.entries(BASES)) {
    if (ONLY_SLOT && slot !== ONLY_SLOT) continue;
    const src = path.join(CUT, baseId + '__painted.png');
    if (!fs.existsSync(src)) { missing.push(baseId); continue; }
    const uri = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');
    for (const [tier, ramp] of Object.entries(RAMPS)) {
      const id = tier + '_' + SUFFIX[slot];
      const dataUrl = await p.evaluate((g, u, r, e) => g(u, r, e), fn, uri, ramp, ERODE);
      fs.writeFileSync(path.join(out, id + '__painted.png'),
        Buffer.from(dataUrl.split(',')[1], 'base64'));
      n++;
    }
    process.stdout.write(slot.padEnd(8) + 'from ' + baseId + ' (' + baseTier + ')  -> ' +
      Object.keys(RAMPS).length + ' tiers\n');
  }
  await br.close();
  if (missing.length) console.log('\nno base art for: ' + missing.join(', '));
  console.log('\n' + n + ' recoloured -> ' + out + '   (erode ' + ERODE + 'px)');
})().catch(e => { console.error(e); process.exit(1); });

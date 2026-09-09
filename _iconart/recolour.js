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
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
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
  /* fletching, 0.9.124. Ammunition runs one rung past the armour ladder to
     starfall, and bows run the WOOD ladder, which nothing else here uses.
     Both sets are lifted straight from the game's own MPAL and WPAL. */
  starfall:    ['#4a3008', '#c08a2a', '#ffd98a'],
  pine:        ['#3f2b14', '#8a6236', '#c09a63'],
  oak:         ['#3a2610', '#7d5527', '#b98a4e'],
  ironbark:    ['#2b281f', '#5f5a4c', '#9a9484'],
  ember:       ['#3d1108', '#96351d', '#d4703c'],
  frost:       ['#1e3242', '#5c8ba4', '#a8cfe0'],
  shadow:      ['#1c1528', '#463a5c', '#7c6d90'],
  ancient:     ['#232a12', '#5e6b38', '#9aa870'],
};

/* Which rungs a given slot actually HAS. Before fletching every slot was
   recoloured into every ramp, which was correct while the only ramps in the file
   were the armour ladder. It stopped being correct the moment woods arrived: an
   unlisted slot would now emit pine_helm and gravesteel_arrow. */
const ARMOUR = ['bronze','iron','steel','mithril','cobalt','runite','starsteel',
                'gravesteel','moltensteel','voidsteel','dawn'];
const METAL  = ['bronze','iron','steel','mithril','cobalt','runite','starsteel','starfall'];
const WOOD   = ['pine','oak','ironbark','ember','frost','shadow','ancient'];

/* Which generated piece is the master for each slot, and which tier it already is
   (so that tier is copied straight through rather than recoloured onto itself). */
const BASES = {
  helmet: ['steel_helm',   'steel',  ARMOUR],
  chest:  ['steel_chest',  'steel',  ARMOUR],
  legs:   ['steel_legs',   'steel',  ARMOUR],
  gloves: ['steel_gloves', 'steel',  ARMOUR],
  boots:  ['steel_boots',  'steel',  ARMOUR],
  shield: ['steel_shield', 'steel',  ARMOUR],
  cape:   ['steel_cape',   'steel',  ARMOUR],
  buckler:['steel_buckler','steel',  ARMOUR],
  sword:  ['bronze_sword',  'bronze', ARMOUR],
  dagger: ['bronze_dagger', 'bronze', ARMOUR],
  hammer: ['bronze_hammer', 'bronze', ARMOUR],
  /* fletching. Ten slots off ten drawn cells -> 76 items. */
  arrowhead:   ['steel_arrowhead',          'steel', METAL],
  bolt_tip:    ['steel_bolt_tip',           'steel', METAL],
  arrow:       ['steel_arrow',              'steel', METAL, 'warm'],
  bolt:        ['steel_bolt',               'steel', METAL, 'warm'],
  crossbow:    ['steel_crossbow',           'steel', METAL, 'warm'],
  un_crossbow: ['unstrung_steel_crossbow',  'steel', METAL, 'warm'],
  /* Bows recolour whole. The limb IS the tier material, and the only fixed parts
     are the grip wrap and the string, both of which sit in the same warm band as
     the limb - a hue mask cannot tell them apart, so it would protect the limb too. */
  shortbow:    ['pine_shortbow',            'pine',  WOOD],
  longbow:     ['pine_longbow',             'pine',  WOOD],
  un_shortbow: ['unstrung_pine_shortbow',   'pine',  WOOD],
  un_longbow:  ['unstrung_pine_longbow',    'pine',  WOOD],
};

/* id for a given slot on a given tier, matching the game's own naming. A plain
   string is `<tier>_<suffix>`. The unstrung bows and crossbows put their marker
   in FRONT of the tier (`unstrung_pine_shortbow`), which a suffix cannot express,
   so those carry {pre, suf} instead. */
const SUFFIX = { helmet: 'helm', chest: 'chest', legs: 'legs', gloves: 'gloves',
  boots: 'boots', shield: 'shield', cape: 'cape', buckler: 'buckler', sword: 'sword', dagger: 'dagger', hammer: 'hammer',
  arrowhead: 'arrowhead', bolt_tip: 'bolt_tip', arrow: 'arrow', bolt: 'bolt',
  crossbow: 'crossbow', shortbow: 'shortbow', longbow: 'longbow',
  un_crossbow: { pre: 'unstrung_', suf: 'crossbow' },
  un_shortbow: { pre: 'unstrung_', suf: 'shortbow' },
  un_longbow:  { pre: 'unstrung_', suf: 'longbow'  } };

/* the id this slot produces on this tier */
function idFor(slot, tier) {
  const s = SUFFIX[slot];
  return typeof s === 'string' ? tier + '_' + s : s.pre + tier + '_' + s.suf;
}

const WORK = `async (uri, ramp, erode, mask) => {
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

  /* WARM MASK. The game never repaints an item's furniture: ammoSVG hardcodes a pine
     shaft, xbowSVG hardcodes a wooden stock, and only the head/prod takes the tier
     palette. A whole-image gradient map ignores that and hands you a mithril arrow
     with a blue shaft. Saturation alone will not separate them - the crossbow's stock
     is a muted brown that sits at the same saturation as steel's shadows - but HUE
     will, because the steel is neutral to blue-grey and every wooden part is orange.
     Protected pixels are left exactly as drawn. */
  const warm = new Uint8Array(N);
  if (mask === 'warm') {
    for (let i = 0; i < N; i++) {
      if (px[i*4+3] < 16) continue;
      const r0 = px[i*4]/255, g0 = px[i*4+1]/255, b0 = px[i*4+2]/255;
      const mx = Math.max(r0,g0,b0), mn = Math.min(r0,g0,b0);
      if (mx === mn) continue;
      const l0 = (mx+mn)/2, dd = mx - mn;
      const s0 = l0 > 0.5 ? dd/(2-mx-mn) : dd/(mx+mn);
      let h0;
      if (mx === r0) h0 = ((g0-b0)/dd + (g0 < b0 ? 6 : 0));
      else if (mx === g0) h0 = (b0-r0)/dd + 2;
      else h0 = (r0-g0)/dd + 4;
      h0 *= 60;
      if (s0 > 0.12 && h0 >= 12 && h0 <= 60) warm[i] = 1;
    }
  }

  /* luminance range of what survived, so the ramp is sampled across the real span.
     Measured over the pixels that will ACTUALLY be recoloured - letting a protected
     wooden shaft stretch the span squashes the metal into the middle of the ramp. */
  let lo = 255, hi = 0;
  for (let i = 0; i < N; i++) {
    if (px[i*4+3] < 16 || warm[i]) continue;
    const l = (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
    if (l < lo) lo = l; if (l > hi) hi = l;
  }
  if (hi <= lo) { lo = 0; hi = 255; }
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
    if (px[i*4+3] < 16 || warm[i]) continue;
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

  for (const [slot, [baseId, baseTier, tiers, mask]] of Object.entries(BASES)) {
    if (ONLY_SLOT && slot !== ONLY_SLOT) continue;
    const src = path.join(CUT, baseId + '__painted.png');
    if (!fs.existsSync(src)) { missing.push(baseId); continue; }
    const uri = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');
    for (const tier of tiers) {
      const ramp = RAMPS[tier];
      if (!ramp) { console.log('  no ramp for tier ' + tier + ' (' + slot + ')'); continue; }
      const id = idFor(slot, tier);
      const dataUrl = await p.evaluate((g, u, r, e, m) => g(u, r, e, m), fn, uri, ramp, ERODE, mask || null);
      fs.writeFileSync(path.join(out, id + '__painted.png'),
        Buffer.from(dataUrl.split(',')[1], 'base64'));
      n++;
    }
    process.stdout.write(slot.padEnd(12) + 'from ' + baseId + ' (' + baseTier + ')  -> ' +
      tiers.length + ' tiers\n');
  }
  await br.close();
  if (missing.length) console.log('\nno base art for: ' + missing.join(', '));
  console.log('\n' + n + ' recoloured -> ' + out + '   (erode ' + ERODE + 'px)');
})().catch(e => { console.error(e); process.exit(1); });

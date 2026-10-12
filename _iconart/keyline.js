/* Key a white-backdrop cut by its KEYLINE, for art that key.js damages.
 *
 *     node _iconart/keyline.js                         raw/*.png -> cut/*.png (128px)
 *     CVRAW=_review/raw_magic CVCUT=_review/cut_magic node _iconart/keyline.js
 *     node _iconart/keyline.js --only forge_rune,el_frost --size 128
 *
 * WHY. key.js removes backdrop two ways: a fill from the border, and a sweep for
 * "enclosed holes" of near-white the fill could not reach, which is how the inside
 * of a ring comes out. On the Magic sheets (0.9.127.6) that second rule took every
 * bright thing for a hole: the glowing mark on the Forge, Crucible and Starfall
 * runes, the centre of the Frost snowflake, the core of the Storm bolt, the mark on
 * the skill icon and on half the tree plates, and every highlight on the white
 * Spidersilk and the pale Rimeweave. Thirty of the 87 came out with holes in them.
 *
 * WHAT THIS DOES INSTEAD. Every painted icon is drawn inside a dark ink keyline, so
 * the keyline is the wall (defringe_jewel.js found this first, for the jewellery):
 *
 *   1. A fill from the picture's border, stopped by ink (grown one pixel to close a
 *      gap), finds everything OUTSIDE the keyline. Nothing inside it can be reached,
 *      so white paint keeps every pixel however bright it is.
 *   2. Outside the line there are only four things: paper, the keyline's own soft
 *      edge, a ground shadow, and a glow. Each pixel there is un-mixed from white:
 *      alpha is how far it is from white. Paper comes out clear, the soft edge comes
 *      out as thin dark ink, and a glow comes out as light that sits on a dark panel.
 *   3. A ground shadow is grey and a glow is coloured. Grey more than a few pixels
 *      from the object is dropped, so no pale blob is left under a stone.
 *   4. A real enclosed hole (the inside of a stone ring) is flat paper white walled
 *      by ink. So is a flat white trim with an ink line round it: Rimeweave's white
 *      cuffs and collar are exactly that, and a rule that cut every such patch took
 *      them out. Nothing tells the two apart but knowing the picture, so holes are
 *      cut ONLY for the ids named in --holes, and every other ink-walled white
 *      patch is kept and listed, so a real hole that was missed shows in the log.
 *   5. THE LEAK CHECK. Art that breaks its own keyline on purpose (Deep Mark: a
 *      mark cut clean through the edge of the stone, light pouring out of the gap)
 *      lets the fill in, and everything inside turns to glass. So the result is
 *      compared with a plain pale-backdrop fill: if most of the silhouette that one
 *      finds is "outside" by this one, the keyline was open. That icon falls back to
 *      the plain fill with a soft edge, and its glow stays as it was painted.
 *
 * The object is sized by itself, not by its glow, so a rune that glows is as big in
 * the satchel as one that does not; the glow fades out inside the margin.
 *
 * It assumes a white backdrop and a dark keyline. A sheet on black, or art with no
 * outline, still wants key.js. Writes the same files key.js writes, so pack.js does
 * not care which one made a cut.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const RAW = path.join(__dirname, process.env.CVRAW || 'raw');
const CUT = path.join(__dirname, process.env.CVCUT || 'cut');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SIZE = +(arg('--size') || 128);
/* keyline.json names the ids this tool owns, which of them have real holes, and any
   icon that needs its own numbers. With no --only, those ids are the ones keyed: this
   never walks a whole raw/ folder re-keying art that key.js already did right. */
const CFG = fs.existsSync(path.join(__dirname, 'keyline.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'keyline.json'), 'utf8')) : { ids: [], holes: [], per: {} };
const P = {
  ink: +(arg('--ink') || 100),        // luma under this is keyline
  grow: +(arg('--grow') || 1),        // pixels the wall is thickened by, to close a gap
  pale: +(arg('--pale') || 219),      // min channel over this is paper, for the leak check
  leak: +(arg('--leak') || 0.5),      // under this share of the plain silhouette kept: the keyline was open
  grey: +(arg('--grey') || 18),       // chroma under this is shadow or paper, not glow
  near: +(arg('--near') || 4),        // a shadow is kept this close to the object, fading out
  holeWhite: +(arg('--holewhite') || 247),
  holeWall: +(arg('--holewall') || 0.55),
  boost: +(arg('--boost') || 0.55),   // a glow's alpha is raised to this power: light, not a tint
  paint: +(arg('--paint') || 0.8),    // how much of the painted paleness a glow keeps (1 = as painted)
  reach: +(arg('--reach') || 0.16),   // a glow fades out over this share of the object's size
  margin: +(arg('--margin') || 0.05),
  boxReach: +(arg('--boxreach') || 0.04), // glow this close to the object (share of its size) may widen the box; further out it may not
  core: +(arg('--core') || 0.015),        // a white-hot core this thin (share of the object's size, each side) is filled back in
  holes: arg('--holes') !== null ? arg('--holes').split(',').filter(Boolean) : (CFG.holes || []),   // ids whose ink-walled white holes are really holes
};

const WORK = `async (uri, SIZE, P) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const W = c.width, H = c.height, N = W * H;
  const d = x.getImageData(0, 0, W, H), px = d.data;
  const lum = new Uint8Array(N), mn = new Uint8Array(N), ch = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = px[i*4], g = px[i*4+1], b = px[i*4+2];
    lum[i] = (r*299 + g*587 + b*114) / 1000;
    const lo = Math.min(r, g, b), hi = Math.max(r, g, b);
    mn[i] = lo; ch[i] = hi - lo;
  }
  const corner = ([0, W-1, (H-1)*W, N-1].map(i => lum[i]).reduce((a,b)=>a+b,0)) / 4;
  if (corner < 214) return { err: 'backdrop is not white (corners ' + Math.round(corner) + '): use key.js' };
  const nb4 = (i, f) => { const X = i % W, Y = (i / W) | 0; if (X > 0) f(i-1); if (X < W-1) f(i+1); if (Y > 0) f(i-W); if (Y < H-1) f(i+W); };
  const fill = (blocked) => {
    const o = new Uint8Array(N), st = [];
    for (let X = 0; X < W; X++) { st.push(X); st.push((H-1)*W + X); }
    for (let Y = 0; Y < H; Y++) { st.push(Y*W); st.push(Y*W + W - 1); }
    while (st.length) { const i = st.pop(); if (o[i] || blocked(i)) continue; o[i] = 1; nb4(i, j => { if (!o[j] && !blocked(j)) st.push(j); }); }
    return o;
  };

  // 1. the wall: ink, thickened; and everything outside it
  const ink = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (lum[i] < P.ink) ink[i] = 1;
  let wall = ink;
  for (let s = 0; s < P.grow; s++) {
    const w2 = new Uint8Array(wall);
    for (let i = 0; i < N; i++) if (!wall[i]) { let hit = 0; nb4(i, j => { if (wall[j]) hit = 1; }); if (hit) w2[i] = 1; }
    wall = w2;
  }
  let out = fill(i => wall[i]);
  // give back what the thickening took: the keyline's own soft outer edge
  for (let s = 0; s < P.grow; s++) {
    const add = [];
    for (let i = 0; i < N; i++) if (!out[i] && !ink[i]) { let hit = 0; nb4(i, j => { if (out[j]) hit = 1; }); if (hit) add.push(i); }
    for (const i of add) out[i] = 1;
  }

  // 5. the leak check, against a plain fill through paper
  const plain = fill(i => mn[i] <= P.pale);
  let silh = 0, kept = 0;
  for (let i = 0; i < N; i++) { if (!plain[i]) silh++; if (!out[i]) kept++; }
  const ratio = silh ? kept / silh : 0;
  const leaked = ratio < P.leak;
  if (leaked) {
    out = plain;
    // a two pixel soft edge, the way key.js de-mattes one
    for (let s = 0; s < 2; s++) {
      const add = [];
      for (let i = 0; i < N; i++) if (!out[i] && !ink[i] && mn[i] > 110) { let hit = 0; nb4(i, j => { if (out[j]) hit = 1; }); if (hit) add.push(i); }
      for (const i of add) out[i] = 1;
    }
  }

  // 4. enclosed holes: flat paper white that is walled by ink
  let holes = 0, holePx = 0;
  { const seen = new Uint8Array(N), MIN = Math.max(30, Math.floor(N * 0.0009));
    const inkNear = i => { const X = i % W, Y = (i / W) | 0; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = X + dx, yy = Y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && ink[yy*W + xx]) return 1; } return 0; };
    const white = i => !out[i] && mn[i] >= P.holeWhite && ch[i] <= 8;
    for (let s0 = 0; s0 < N; s0++) {
      if (seen[s0] || !white(s0)) continue;
      const comp = [], q = [s0]; seen[s0] = 1; let edge = 0, walled = 0;
      while (q.length) {
        const i = q.pop(); comp.push(i);
        let isEdge = 0;
        nb4(i, j => { if (white(j)) { if (!seen[j]) { seen[j] = 1; q.push(j); } } else isEdge = 1; });
        if (isEdge) { edge++; if (inkNear(i)) walled++; }
      }
      if (P.cutHoles && comp.length >= MIN && edge > 0 && walled / edge >= P.holeWall) { for (const i of comp) out[i] = 2; holes++; holePx += comp.length; }
      else if (comp.length >= MIN && edge > 0 && walled / edge >= P.holeWall) { holes++; holePx += comp.length; }
    }
    // and the soft edge round each hole
    for (let s = 0; s < 2; s++) { const add = []; for (let i = 0; i < N; i++) if (!out[i] && !ink[i] && mn[i] > 150 && ch[i] <= 14) { let hit = 0; nb4(i, j => { if (out[j] === 2) hit = 1; }); if (hit) add.push(i); } for (const i of add) out[i] = 2; }
  }

  // the object's own box, and its size
  let solid = 0, bx0 = W, by0 = H, bx1 = -1, by1 = -1;
  for (let i = 0; i < N; i++) if (!out[i]) { solid++; const X = i % W, Y = (i / W) | 0; if (X < bx0) bx0 = X; if (X > bx1) bx1 = X; if (Y < by0) by0 = Y; if (Y > by1) by1 = Y; }
  if (!solid) return { err: 'no keyline found: nothing is inside the wall' };
  const objSize = Math.max(bx1 - bx0 + 1, by1 - by0 + 1), REACH = Math.max(6, objSize * P.reach);

  // distance from the object, into the outside
  const dist = new Uint16Array(N).fill(65535); let fr = [];
  for (let i = 0; i < N; i++) if (!out[i]) { dist[i] = 0; fr.push(i); }
  for (let dd = 1; fr.length && dd < 600; dd++) { const nx = []; for (const i of fr) nb4(i, j => { if (dist[j] === 65535) { dist[j] = dd; nx.push(j); } }); fr = nx; }

  /* THE WHITE-HOT CORE. A glow is painted pale at the edge and white in the middle,
     and white in the middle of a glow on white paper is paper: un-mixing it gives a
     sparkle with no star in it and a ring of light that is two dim lines with a
     gap between them. The core is recovered from its shape instead: it is the thin
     strip of paper that a glow closes round. Close the glow mask over a few pixels
     (grow it, then shrink it back); whatever that filled, more than a couple of
     pixels from the object, is core, and is put back as light. A wide stretch of
     paper inside a ring is not closed over, so the space between a ring and the
     stone it circles stays clear. */
  const isGlow = new Uint8Array(N), core = new Uint8Array(N), nearCore = new Uint8Array(N);
  { for (let i = 0; i < N; i++) if (out[i] === 1 && ch[i] >= P.grey && (1 - mn[i] / 255) >= 0.03) isGlow[i] = 1;
    const R = Math.max(3, Math.round(objSize * P.core));
    const step = (m, grow) => { const o = new Uint8Array(m); for (let i = 0; i < N; i++) { if (grow ? m[i] : !m[i]) continue; let hit = 0; nb4(i, j => { if (grow ? m[j] : !m[j]) hit = 1; }); if (hit) o[i] = grow ? 1 : 0; } return o; };
    let m = isGlow; for (let s = 0; s < R; s++) m = step(m, true); for (let s = 0; s < R; s++) m = step(m, false);
    let any = 0;
    for (let i = 0; i < N; i++) if (m[i] && !isGlow[i] && out[i] === 1 && dist[i] > 3 && (1 - mn[i] / 255) < 0.2) { core[i] = 1; any = 1; }
    /* And the middle of a sparkle, which is wider than that: a small pocket of
       paper with glow all the way round it. Small is the test that matters. The
       space between a ring of light and the stone inside it is a pocket too, and
       it is a hundred times the size. */
    { const open = fill(i => !out[i] || isGlow[i]), seen = new Uint8Array(N), MAXP = Math.max(60, Math.floor(N * 0.006));
      for (let s0 = 0; s0 < N; s0++) {
        if (seen[s0] || open[s0] || out[s0] !== 1 || isGlow[s0]) continue;
        const comp = [], q = [s0]; seen[s0] = 1;
        while (q.length) { const i = q.pop(); comp.push(i); nb4(i, j => { if (!seen[j] && !open[j] && out[j] === 1 && !isGlow[j]) { seen[j] = 1; q.push(j); } }); }
        if (comp.length <= MAXP) for (const i of comp) if (dist[i] > 3) { core[i] = 1; any = 1; }
      }
    }
    if (any) { let n = core; for (let s = 0; s < R + 3; s++) n = step(n, true); for (let i = 0; i < N; i++) nearCore[i] = n[i]; }
  }

  // 2 and 3. un-mix the outside from white
  const al = new Float32Array(N); let glow = 0;
  for (let i = 0; i < N; i++) {
    if (!out[i]) { al[i] = 1; continue; }
    if (core[i]) { al[i] = 0.96; continue; }           // light, as white as it was painted
    let a = 1 - mn[i] / 255;
    if (a < 0.015) { al[i] = 0; continue; }
    const grey = ch[i] < P.grey;
    if (grey) { if (out[i] === 2) a = dist[i] <= 2 ? a : 0; else a *= Math.max(0, Math.min(1, 1 - (dist[i] - 1) / P.near)); }
    if (a < 0.015) { al[i] = 0; continue; }
    // the colour that was mixed into the paper
    const r = (px[i*4]   - (1 - a) * 255) / a, g = (px[i*4+1] - (1 - a) * 255) / a, b = (px[i*4+2] - (1 - a) * 255) / a;
    if (!grey) {
      // light, not a tint: lift the alpha and keep the paleness it was painted with,
      // and let it die away with distance so it stays a rim of light round the object
      const k = P.paint, fall = Math.max(0, Math.min(1, 1 - (dist[i] - 2) / REACH));
      px[i*4]   = Math.max(0, Math.min(255, r * (1 - k) + px[i*4]   * k));
      px[i*4+1] = Math.max(0, Math.min(255, g * (1 - k) + px[i*4+1] * k));
      px[i*4+2] = Math.max(0, Math.min(255, b * (1 - k) + px[i*4+2] * k));
      // a glow that belongs to a core (a sparkle, a ring) is a thing in the picture
      // and keeps its strength; a halo round the object itself dies away
      a = Math.pow(a, P.boost) * ((a > 0.45 || nearCore[i]) ? 1 : fall * fall);
      if (dist[i] > 3) glow += a;
    } else {
      px[i*4] = Math.max(0, Math.min(255, r)); px[i*4+1] = Math.max(0, Math.min(255, g)); px[i*4+2] = Math.max(0, Math.min(255, b));
    }
    al[i] = a;
  }

  // the box: the object, plus anything outside it strong enough to be part of the picture
  let x0 = bx0, y0 = by0, x1 = bx1, y1 = by1;
  const BOX = Math.max(3, objSize * P.boxReach);
  for (let i = 0; i < N; i++) { if (!out[i] || al[i] < 0.62 || dist[i] > BOX) continue; const X = i % W, Y = (i / W) | 0; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const side = Math.ceil(Math.max(bw, bh) / (1 - P.margin * 2));
  const ox0 = Math.round((x0 + x1 + 1) / 2 - side / 2), oy0 = Math.round((y0 + y1 + 1) / 2 - side / 2);
  const FADE = Math.max(2, side * P.margin * 0.9);
  for (let i = 0; i < N; i++) {
    let a = al[i];
    const tx = (i % W) - ox0, ty = ((i / W) | 0) - oy0, de = Math.min(tx, side - 1 - tx, ty, side - 1 - ty);
    if (de < 0) a = 0;
    else if (out[i] && a > 0) a *= Math.max(0, Math.min(1, (de + 1) / FADE));
    px[i*4+3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
  }
  x.putImageData(d, 0, 0);
  // onto a square of its own first, so the downscale has nothing outside it to pull in
  const t = document.createElement('canvas'); t.width = t.height = side;
  t.getContext('2d').drawImage(c, -ox0, -oy0);
  const o = document.createElement('canvas'); o.width = o.height = SIZE;
  const oc = o.getContext('2d'); oc.imageSmoothingEnabled = true; oc.imageSmoothingQuality = 'high';
  oc.drawImage(t, 0, 0, side, side, 0, 0, SIZE, SIZE);
  return { out: o.toDataURL('image/png'), solidPct: Math.round(solid / N * 100), ratio: +ratio.toFixed(2), leaked, holes, holePct: +(holePx / N * 100).toFixed(1),
    glowPct: +(glow / solid * 100).toFixed(1), aspect: +((bx1 - bx0 + 1) / (by1 - by0 + 1)).toFixed(2), grew: +(((bw * bh) / ((bx1 - bx0 + 1) * (by1 - by0 + 1)) - 1) * 100).toFixed(0) };
}`;

(async () => {
  fs.mkdirSync(CUT, { recursive: true });
  const only = arg('--only'), want = only ? new Set(only.split(',')) : (CFG.ids && CFG.ids.length ? new Set(CFG.ids) : null);
  const files = fs.readdirSync(RAW).filter(f => f.endsWith('.png')).filter(f => !want || want.has(f.split('__')[0]));
  if (!files.length) { console.log('nothing in ' + RAW); return; }
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle('(' + WORK + ')');
  const report = [];
  for (const f of files) {
    const uri = 'data:image/png;base64,' + fs.readFileSync(path.join(RAW, f)).toString('base64');
    const id = f.split('__')[0];
    const Pi = Object.assign({}, P, (CFG.per || {})[id] || {}, { cutHoles: P.holes.indexOf('all') >= 0 || P.holes.indexOf(id) >= 0 });
    const r = await p.evaluate((fn, uri, SIZE, P) => fn(uri, SIZE, P), fn, uri, SIZE, Pi);
    if (r.err) { console.log(f.padEnd(34) + 'FAILED: ' + r.err); report.push({ f, err: r.err }); continue; }
    fs.writeFileSync(path.join(CUT, f), Buffer.from(r.out.split(',')[1], 'base64'));
    report.push(Object.assign({ f }, r, { out: undefined }));
    console.log(f.padEnd(34) + 'inside ' + String(r.solidPct).padStart(2) + '%  kept ' + String(r.ratio).padEnd(4) + '  ar ' + String(r.aspect).padEnd(5)
      + (r.holes ? '  ' + (Pi.cutHoles ? 'holes cut ' : 'white walled by ink, KEPT: ') + r.holes + ' (' + r.holePct + '%)' : '') + (r.glowPct > 1 ? '  glow ' + r.glowPct + '%' : '') + (r.grew > 0 ? '  box +' + r.grew + '%' : '')
      + (r.leaked ? '   <-- KEYLINE OPEN: fell back to the plain fill, look at it' : ''));
  }
  fs.writeFileSync(path.join(CUT, '_keyline.json'), JSON.stringify(report, null, 1));
  const bad = report.filter(r => r.err), open = report.filter(r => r.leaked);
  console.log('\n' + (report.length - bad.length) + '/' + report.length + ' keyed at ' + SIZE + 'px -> ' + CUT);
  if (open.length) console.log('keyline open, plain fill used: ' + open.map(r => r.f.replace('__painted.png', '')).join(', '));
  if (bad.length) console.log('FAILED: ' + bad.map(r => r.f).join(', '));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

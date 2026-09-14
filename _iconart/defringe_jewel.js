/* Jewelry cleanup (0.9.124.54). Jordan: "fix the jewelry with the weird white
 * spots/outline". The jewelry sheet was keyed off a pale backdrop that carried a
 * soft ground shadow, so every ring, amulet and pendant came out with a pale rim
 * outside its dark keyline and a grey blob under its bottom-right edge.
 *
 *     node _iconart/defringe_jewel.js probe sapphire_ring    pixel census of one icon
 *     node _iconart/defringe_jewel.js                        cut_prejewelfix/ (else cut/) -> cutfix/, every jewelry id
 *
 * Every piece is drawn inside a solid black keyline, so that is the wall: a fill
 * from the picture's border, blocked by the keyline (grown 2px to close any gap),
 * removes everything outside it, which is only the shadow and the rim. A short walk
 * then clears pale rind still hugging the outside of the line. Nothing inside the
 * keyline is reachable, so gems, silver and highlights keep every pixel.
 * (A first pass that only crossed pale grey pixels missed the beige shadow and bit
 * into the diamonds.) Writes to cutfix/, never cut/.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
let CHROME = null;
(function w(p){ for(const f of fs.readdirSync(p,{withFileTypes:true})){ const q=path.join(p,f.name); if(f.isDirectory()) w(q); else if(/^chrome\.exe$/i.test(f.name)&&!CHROME) CHROME=q; } })(path.join(KIT,'browsers'));

/* Reads the untouched cuts. cut_prejewelfix/ holds them since the first pass went in;
   before that they were cut/. */
const CUT = path.join(__dirname, fs.existsSync(path.join(__dirname,'cut_prejewelfix')) ? 'cut_prejewelfix' : 'cut'), FIX = path.join(__dirname, 'cutfix');
const LUMA = +(process.env.DF_LUMA || 150);     // pale enough to be rim or shadow
const CHROMA = +(process.env.DF_CHROMA || 34);  // grey enough to not be paint
const EXCLUDE = /jewelled_dagger|cape|^jeweler__/;
const DKT = +(process.env.DF_DARK || 80);     // ink: the keyline every painted icon is drawn with
const PALE = +(process.env.DF_PALE || 110);   // rind hugging the line is lighter than paint's own edge
const JEWEL = /(_ring|_amulet|_pendant|_jewel|signet)__painted\.png$/;
/* Only the white stones get their cut facets painted back. Anywhere else an enclosed
   hole walled by light paint can be real openwork (Tidebound Ring's silver scrollwork
   filled in solid when every jewel was refilled). */
const REFILL = { diamond_ring:'ring', diamond_amulet:'chain', diamond_pendant:'chain', soulbound_amulet:'chain' };

const WORK = `async (uri, LUMA, CHROMA, probe, DKT, PALE, REFILLIT) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const W = c.width, H = c.height, N = W*H, d = x.getImageData(0,0,W,H), px = d.data;
  const lum = i => (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114)/1000;
  const chr = i => Math.max(px[i*4],px[i*4+1],px[i*4+2]) - Math.min(px[i*4],px[i*4+1],px[i*4+2]);
  const clear = i => px[i*4+3] < 16;
  const pale = i => !clear(i) && lum(i) > LUMA && chr(i) < CHROMA;
  if (probe) {
    // census of pixels touching transparency: how pale, how grey
    const rows = [];
    for (let i = 0; i < N; i++) {
      if (clear(i)) continue;
      const X = i%W, Y = (i/W)|0;
      const nb = [X>0?i-1:-1, X<W-1?i+1:-1, Y>0?i-W:-1, Y<H-1?i+W:-1].some(j => j>=0 && clear(j));
      if (nb) rows.push([Math.round(lum(i)), chr(i), px[i*4+3]]);
    }
    const bucket = {}; rows.forEach(r => { const k = (Math.floor(r[0]/20)*20)+'/'+(r[1]<34?'grey':'col'); bucket[k]=(bucket[k]||0)+1; });
    return {W, H, edge: rows.length, bucket};
  }
  /* WHITE PAINT THAT key.js TOOK FOR BACKDROP. Jordan: "the diamond has missing
     colors since it was the white". key.js cuts enclosed flat white as a hole (the
     inside of a ring band), and a diamond's white faces and the white glints on the
     other gems are enclosed flat white too, so they went. Tell them apart by what
     surrounds them: a real hole is walled by the black keyline or dark chain; a lost
     facet is walled by the gem's own light paint. Fill those back from their edges
     inward, each pixel the average of the painted neighbours already there. */
  let refilled = 0;
  if (REFILLIT) {
    const ext = new Uint8Array(N), st2 = [];
    const s2 = i => { if (!ext[i] && clear(i)) { ext[i] = 1; st2.push(i); } };
    for (let X = 0; X < W; X++) { s2(X); s2((H-1)*W + X); }
    for (let Y = 0; Y < H; Y++) { s2(Y*W); s2(Y*W + W - 1); }
    while (st2.length) {
      const i = st2.pop(), X = i%W, Y = (i/W)|0;
      if (X>0) s2(i-1); if (X<W-1) s2(i+1); if (Y>0) s2(i-W); if (Y<H-1) s2(i+W);
    }
    const seen = new Uint8Array(N);
    for (let start = 0; start < N; start++) {
      if (seen[start] || ext[start] || !clear(start)) continue;
      const comp = [start], edge = new Set(); seen[start] = 1;
      for (let k = 0; k < comp.length; k++) {
        const i = comp[k], X = i%W, Y = (i/W)|0;
        const nb = [X>0?i-1:-1, X<W-1?i+1:-1, Y>0?i-W:-1, Y<H-1?i+W:-1];
        for (const j of nb) { if (j < 0) continue;
          if (clear(j)) { if (!seen[j] && !ext[j]) { seen[j] = 1; comp.push(j); } }
          else edge.add(j); }
      }
      let light = 0, cy = 0; edge.forEach(j => { if (lum(j) > 150 && px[j*4+3] > 40) light++; });
      comp.forEach(i => { cy += (i/W)|0; }); cy /= comp.length;
      /* a stone's faces are split by darker facet lines, so a third of the wall being
         light is enough; the chain at the top of a pendant is never the stone */
      if (!edge.size || light / edge.size < 0.3 || comp.length > N * 0.08 || (REFILLIT === 'chain' && cy < H * 0.3)) continue;
      // grow the paint inward, ring by ring
      const hole = new Set(comp);
      while (hole.size) {
        const ring = [];
        hole.forEach(i => {
          const X = i%W, Y = (i/W)|0; let r=0,g=0,b=0,n=0;
          [X>0?i-1:-1, X<W-1?i+1:-1, Y>0?i-W:-1, Y<H-1?i+W:-1].forEach(j => {
            if (j >= 0 && !hole.has(j) && px[j*4+3] > 40) { r+=px[j*4]; g+=px[j*4+1]; b+=px[j*4+2]; n++; } });
          if (n) ring.push([i, r/n, g/n, b/n]);
        });
        if (!ring.length) break;
        ring.forEach(([i,r,g,b]) => { px[i*4]=r; px[i*4+1]=g; px[i*4+2]=b; px[i*4+3]=255; hole.delete(i); refilled++; });
      }
      // the de-matted rim around the hole is solid paint again
      edge.forEach(j => { if (lum(j) > 150) px[j*4+3] = 255; });
    }
  }
  /* The ink keyline is the wall. Dark pixels, grown by DILATE so a thin gap in the
     line cannot let the fill in; the fill runs from what is already transparent
     through everything that is not wall. Whatever it reaches sits outside the
     keyline (the shadow and the far rind) and goes. Then a short walk, BAND pixels
     at most, clears the rind hugging the outside of the line, which the grown wall
     had shielded. A gem or a silver frame inside the line is never reached. */
  const DK = +DKT, DILATE = 2, BAND = 3;
  const dark = new Uint8Array(N);
  for (let i = 0; i < N; i++) dark[i] = (px[i*4+3] > 100 && lum(i) < DK) ? 1 : 0;
  const wall = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (dark[i]) {
    const X = i%W, Y = (i/W)|0;
    for (let dy = -DILATE; dy <= DILATE; dy++) for (let dx = -DILATE; dx <= DILATE; dx++) {
      const xx = X+dx, yy = Y+dy; if (xx<0||yy<0||xx>=W||yy>=H) continue;
      if (dx*dx+dy*dy <= DILATE*DILATE) wall[yy*W+xx] = 1;
    }
  }
  /* Seeds are the picture's own border only. Starting from every transparent pixel
     also started inside the ring, from highlights key.js had already cut, and the
     fill ate the gold and the gems from within. */
  const out = new Uint8Array(N), st = [];
  const seed = i => { if (!out[i] && !wall[i]) { out[i] = 1; st.push(i); } };
  for (let X = 0; X < W; X++) { seed(X); seed((H-1)*W + X); }
  for (let Y = 0; Y < H; Y++) { seed(Y*W); seed(Y*W + W - 1); }
  while (st.length) {
    const i = st.pop(), X = i%W, Y = (i/W)|0;
    const go = j => { if (!out[j] && !wall[j]) { out[j] = 1; st.push(j); } };
    if (X>0) go(i-1); if (X<W-1) go(i+1); if (Y>0) go(i-W); if (Y<H-1) go(i+W);
  }
  let removed = 0;
  for (let i = 0; i < N; i++) if (out[i] && !clear(i)) { px[i*4+3] = 0; removed++; }
  // the rind against the outside of the line: a few steps from the removed area, never through ink
  const dist = new Int16Array(N).fill(-1), q = [];
  for (let i = 0; i < N; i++) if (out[i]) { dist[i] = 0; q.push(i); }   // outside only, never an inner hole
  let qi = 0, eased = 0;
  while (qi < q.length) {
    const i = q[qi++], X = i%W, Y = (i/W)|0;
    if (dist[i] >= BAND) continue;
    const go = j => { if (dist[j] < 0 && !dark[j] && px[j*4+3] > 0) { dist[j] = dist[i]+1; q.push(j); } };
    if (X>0) go(i-1); if (X<W-1) go(i+1); if (Y>0) go(i-W); if (Y<H-1) go(i+W);
  }
  /* A pale pixel against the line is the line's antialiasing blended with the white
     sheet. Deleting it left a stair-stepped edge, so un-blend it instead: it becomes
     keyline-black at the coverage it really had (white contributes nothing), which is
     key.js's de-matte with the paint known to be ink. */
  for (let i = 0; i < N; i++) {
    if (dist[i] > 0 && lum(i) > PALE) {
      const a = Math.round((255 - lum(i)) * px[i*4+3] / 255);
      px[i*4] = 6; px[i*4+1] = 5; px[i*4+2] = 3; px[i*4+3] = a;
      eased++;
    }
  }
  x.putImageData(d, 0, 0);
  return {W, H, removed, eased, refilled, out: c.toDataURL('image/png')};
}`;

(async () => {
  const probeId = process.argv[2] === 'probe' ? process.argv[3] : null;
  const files = probeId ? [probeId + '__painted.png']
    : fs.readdirSync(CUT).filter(f => JEWEL.test(f) && !EXCLUDE.test(f));
  if (!probeId) fs.mkdirSync(FIX, { recursive: true });
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const p = await b.newPage();
  const run = await p.evaluateHandle('(' + WORK + ')');
  for (const f of files) {
    const uri = 'data:image/png;base64,' + fs.readFileSync(path.join(CUT, f)).toString('base64');
    const r = await p.evaluate((fn, uri, L, C, pr, dk, pl, rf) => fn(uri, L, C, pr, dk, pl, rf), run, uri, LUMA, CHROMA, !!probeId, DKT, PALE, REFILL[f.replace('__painted.png','')] || '');
    if (probeId) { console.log(f, JSON.stringify(r)); continue; }
    fs.writeFileSync(path.join(FIX, f), Buffer.from(r.out.split(',')[1], 'base64'));
    console.log(f.padEnd(34), 'refilled', String(r.refilled).padStart(4), 'removed', String(r.removed).padStart(5), 'eased', r.eased);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

/* Runs inside the page. Kept in its own file because escaping a 200 line function
   through a shell heredoc has eaten this repo twice. */
async (uri, rows, SIZE, MARGIN) => {
  const img = new Image(); img.src = uri; await img.decode();
  const W = img.width, H = img.height, N = W * H;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, W, H), px = d.data;

  const lum = new Uint8Array(N);
  for (let i = 0; i < N; i++) lum[i] = (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
  const cornerMean = ([0, W-1, (H-1)*W, N-1].map(i => lum[i]).reduce((a,b)=>a+b,0)) / 4;
  if (cornerMean < 214) return { err: 'sheet is not on a white page (corners ' + Math.round(cornerMean) + ')' };
  const isBack = v => v > 214;

  /* the page */
  const bg = new Uint8Array(N);
  const st = [];
  for (let X = 0; X < W; X++) { st.push(X); st.push((H-1)*W + X); }
  for (let Y = 0; Y < H; Y++) { st.push(Y*W); st.push(Y*W + W - 1); }
  while (st.length) {
    const i = st.pop();
    if (bg[i] || !isBack(lum[i])) continue;
    bg[i] = 1;
    const X = i % W, Y = (i / W) | 0;
    if (X > 0)     st.push(i - 1);
    if (X < W - 1) st.push(i + 1);
    if (Y > 0)     st.push(i - W);
    if (Y < H - 1) st.push(i + W);
  }
  /* CAST SHADOWS. The sheets ask for no ground and no cast shadow, and the model
     draws them anyway: a soft grey pool under the feet. It sits just under the
     page cut, so the border fill stops at its edge and leaves the core behind as
     a pale blob at the creature's base once it is on the dark panel. That is what
     Jordan has been seeing as a white patch at the feet.

     Grow the page into anything PALE and DESATURATED that touches it. The guard
     is the thick dark ink outline every creature is drawn with: the growth stops
     dead at it, so a bone white limb or a marble shoulder survives, while a
     shadow, which has no outline of its own, does not. */
  const chroma = i => {
    const r = px[i*4], g = px[i*4+1], b2 = px[i*4+2];
    return Math.max(r, g, b2) - Math.min(r, g, b2);
  };
  const sh = [];
  for (let i = 0; i < N; i++) {
    if (!bg[i]) continue;
    const X = i % W, Y = (i / W) | 0;
    if ((X > 0 && !bg[i-1]) || (X < W-1 && !bg[i+1]) ||
        (Y > 0 && !bg[i-W]) || (Y < H-1 && !bg[i+W])) sh.push(i);
  }
  let shadowPx = 0;
  while (sh.length) {
    const i = sh.pop();
    const X = i % W, Y = (i / W) | 0;
    const push = j => {
      if (bg[j] || lum[j] <= 168 || chroma(j) >= 22) return;
      bg[j] = 1; shadowPx++; sh.push(j);
    };
    if (X > 0)     push(i - 1);
    if (X < W - 1) push(i + 1);
    if (Y > 0)     push(i - W);
    if (Y < H - 1) push(i + W);
  }

  /* Enclosed page: the gap under an arm, the hole in a ribcage. Tighter cut and a
     flatness guard so a highlight on armour is not mistaken for paper. */
  const seenH = new Uint8Array(N);
  for (let s0 = 0; s0 < N; s0++) {
    if (bg[s0] || seenH[s0] || lum[s0] <= 226) continue;
    const comp = [], q = [s0]; seenH[s0] = 1;
    let lo = 255, hi = 0;
    while (q.length) {
      const i = q.pop(); comp.push(i);
      if (lum[i] < lo) lo = lum[i];
      if (lum[i] > hi) hi = lum[i];
      const X = i % W, Y = (i / W) | 0;
      const push = j => { if (!seenH[j] && !bg[j] && lum[j] > 226) { seenH[j] = 1; q.push(j); } };
      if (X > 0)     push(i - 1);
      if (X < W - 1) push(i + 1);
      if (Y > 0)     push(i - W);
      if (Y < H - 1) push(i + W);
    }
    if (comp.length >= Math.max(10, N * 0.0002) && ((hi - lo) < 12 || hi >= 248))
      for (const i of comp) bg[i] = 1;
  }

  /* every blob of ink, 8 connected */
  const lab = new Int32Array(N).fill(-1);
  const blobs = [];
  for (let s0 = 0; s0 < N; s0++) {
    if (bg[s0] || lab[s0] >= 0) continue;
    const id = blobs.length, q = [s0];
    lab[s0] = id;
    let n = 0, sx = 0, sy = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
    while (q.length) {
      const i = q.pop();
      const X = i % W, Y = (i / W) | 0;
      n++; sx += X; sy += Y;
      if (X < x0) x0 = X; if (X > x1) x1 = X;
      if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = X + dx, ny = Y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (bg[j] || lab[j] >= 0) continue;
        lab[j] = id; q.push(j);
      }
    }
    blobs.push({ id, n, cx: sx / n, cy: sy / n, x0, y0, x1, y1,
                 w: x1 - x0 + 1, h: y1 - y0 + 1, keep: true });
  }

  /* Specks. Below this it is sheet noise or a stray antialias pixel. */
  const NOISE = Math.max(24, N * 0.00004);
  for (const b of blobs) if (b.n < NOISE) b.keep = false;

  /* THE CAPTIONS. ChatGPT letters some of these sheets, and "Ogre Grunt" shipped
     as literal words on the portrait. A letter is small, short, and sits on a
     baseline beside its neighbours. One stray small blob is a creature detail;
     three of them sharing a baseline is a word, and nothing in these drawings
     does that. */
  const glyphish = blobs.filter(b => b.keep && b.h < H * 0.045 && b.w < W * 0.055 && b.n < N * 0.0012);
  let glyphs = 0;
  const doneRun = new Set(), bands = [];
  for (const a of glyphish) {
    if (doneRun.has(a.id)) continue;
    const line = glyphish.filter(o => Math.abs(o.y1 - a.y1) <= H * 0.014 && Math.abs(o.cy - a.cy) <= H * 0.022)
      .sort((p, q2) => p.cx - q2.cx);
    /* EVERY word on the baseline, not the longest one. Two cells side by side put
       their captions on the same line ("Brood Rat" beside "Rat Queen"), and taking
       only the best run left the other caption painted on the portrait. */
    const runs = [];
    let run = [line[0]];
    for (let i = 1; i < line.length; i++) {
      if (line[i].x0 - run[run.length - 1].x1 < W * 0.035) run.push(line[i]);
      else { runs.push(run); run = [line[i]]; }
    }
    runs.push(run);
    for (const o of line) doneRun.add(o.id);
    for (const wd of runs) {
      if (wd.length < 3) continue;
      bands.push([Math.min.apply(null, wd.map(o => o.y0)) - H * 0.016,
                  Math.max.apply(null, wd.map(o => o.y1)) + H * 0.016]);
    }
  }
  /* Every caption in a row sits on the same baseline, so one word found gives the
     whole band, and the band is what catches the rest: a short word under three
     letters, and a word whose letters touched and came through as one wide blob.
     Both were leaving "Wyvern" and a scatter of stray letters on the portraits. */
  for (const [t, b2] of bands) for (const bl of blobs) {
    if (!bl.keep || bl.h >= H * 0.045 || bl.n >= N * 0.0016) continue;
    if (bl.y0 >= t && bl.y1 <= b2) { bl.keep = false; glyphs++; }
  }

  /* ONE CLUSTER PER CREATURE. Seeded on the layout grid, then let go, weighted by
     ink so a body holds its centre and a detached wing tip joins the body nearest
     it rather than dragging a centre across the page. A creature is nearly always
     one blob; this only has to place the strays. */
  const live = blobs.filter(b => b.keep);
  if (!live.length) return { err: 'no ink survived the key' };
  const R = rows.length, K = rows.reduce((a, b2) => a + b2, 0);
  const cent = [];
  for (let r = 0; r < R; r++) for (let col = 0; col < rows[r]; col++)
    cent.push({ row: r, x: W * (col + 0.5) / rows[r], y: H * (r + 0.5) / R });
  for (let it = 0; it < 14; it++) {
    const acc = cent.map(() => ({ n: 0, sx: 0, sy: 0 }));
    for (const b of live) {
      let bi = 0, bd = Infinity;
      for (let k = 0; k < K; k++) {
        const dx = b.cx - cent[k].x, dy = b.cy - cent[k].y, dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; bi = k; }
      }
      b.k = bi;
      acc[bi].n += b.n; acc[bi].sx += b.cx * b.n; acc[bi].sy += b.cy * b.n;
    }
    for (let k = 0; k < K; k++) if (acc[k].n) { cent[k].x = acc[k].sx / acc[k].n; cent[k].y = acc[k].sy / acc[k].n; }
  }
  /* Reading order: rows by height on the page, then left to right inside a row. */
  const order = cent.map((p, k) => ({ k, x: p.x, y: p.y })).sort((a, b2) => a.y - b2.y);
  const seq = [], split = [];
  let at = 0;
  for (let r = 0; r < R; r++) {
    const band = order.slice(at, at + rows[r]).sort((a, b2) => a.x - b2.x);
    for (const o of band) seq.push(o.k);
    at += rows[r];
    if (r < R - 1) split.push(Math.round((order[at - 1].y + order[at].y) / 2));
  }

  /* UN-MATTE. The ramp from paint to page is antialiased over two or three pixels
     and the key is binary, so those pixels keep full opacity while still carrying
     a share of white. Recover the coverage each one always had against a LOCAL
     reference, the darkest interior ink beside it, instead of a fixed threshold.
     key.js uses its own 214 backdrop cut as that reference, which means every
     pixel darker than 214 reads as solid paint and the whole rind is skipped:
     that is the white outline. Where the nearby ink is itself white the coverage
     reads as 1 and the pixel is left alone, so a polar bear keeps its edge. */
  for (let i = 0; i < N; i++) px[i*4+3] = bg[i] ? 0 : 255;
  for (let pass = 0; pass < 3; pass++) {
    const ring = [];
    for (let i = 0; i < N; i++) {
      if (!px[i*4+3]) continue;
      const X = i % W, Y = (i / W) | 0;
      if ((X > 0 && !px[(i-1)*4+3]) || (X < W-1 && !px[(i+1)*4+3]) ||
          (Y > 0 && !px[(i-W)*4+3]) || (Y < H-1 && !px[(i+W)*4+3])) ring.push(i);
    }
    if (!ring.length) break;
    const onRing = new Uint8Array(N);
    for (const i of ring) onRing[i] = 1;
    const drop = [];
    for (const i of ring) {
      const X = i % W, Y = (i / W) | 0;
      let ref = 255;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = X + dx, ny = Y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (!px[j*4+3] || onRing[j]) continue;
        if (lum[j] < ref) ref = lum[j];
      }
      if (255 - ref < 14) continue;            // the subject itself is white here
      const a = (255 - lum[i]) / (255 - ref);
      if (a >= 0.97) continue;                 // solid paint, nothing mixed in
      if (a <= 0.26) { drop.push(i); continue; }
      for (let k = 0; k < 3; k++) {
        const v = (px[i*4+k] - (1 - a) * 255) / a;
        px[i*4+k] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      px[i*4+3] = Math.round(a * 255);
    }
    for (const i of drop) px[i*4+3] = 0;
    if (!drop.length) break;
  }

  /* Draw each creature on its own, from its own pixels only. A shape cannot clip
     itself and cannot carry a neighbour it is not connected to. */
  const cells = [];
  for (const k of seq) {
    const mine = live.filter(b => b.k === k);
    const x0 = Math.min.apply(null, mine.map(b => b.x0)), x1 = Math.max.apply(null, mine.map(b => b.x1));
    const y0 = Math.min.apply(null, mine.map(b => b.y0)), y1 = Math.max.apply(null, mine.map(b => b.y1));
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const own = new Set(mine.map(b => b.id));
    const t = document.createElement('canvas'); t.width = bw; t.height = bh;
    const tx = t.getContext('2d');
    const td = tx.createImageData(bw, bh), tp = td.data;
    let ink = 0;
    for (let Y = 0; Y < bh; Y++) for (let X = 0; X < bw; X++) {
      const i = (y0 + Y) * W + (x0 + X), o = (Y * bw + X) * 4;
      if (!px[i*4+3] || !own.has(lab[i])) continue;
      tp[o] = px[i*4]; tp[o+1] = px[i*4+1]; tp[o+2] = px[i*4+2]; tp[o+3] = px[i*4+3];
      ink++;
    }
    tx.putImageData(td, 0, 0);

    const o = document.createElement('canvas'); o.width = o.height = SIZE;
    const ox = o.getContext('2d');
    ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high';
    const avail = SIZE * (1 - MARGIN * 2);
    const s = Math.min(avail / bw, avail / bh);
    const dw = bw * s, dh = bh * s;
    ox.drawImage(t, 0, 0, bw, bh, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);
    cells.push({ png: o.toDataURL('image/png'), w: bw, h: bh, parts: mine.length,
                 inkPct: Math.round(ink / (bw * bh) * 100),
                 edge: x0 <= 1 || y0 <= 1 || x1 >= W - 2 || y1 >= H - 2 });
  }
  return { cells, blobs: live.length, glyphs, split, shadowPx };
}

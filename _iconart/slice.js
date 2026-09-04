/* Cut a contact SHEET of item art into the individual raw/*.png the pipeline wants.
 *
 *     node _iconart/slice.js sheets/hides.png sheets/hides.txt --grid 5x4
 *     node _iconart/slice.js sheets/hides.png sheets/hides.txt --grid 5x4 --dry
 *
 * Jordan generated nineteen pelts as ONE labelled 5-wide sheet from ChatGPT, which
 * is both faster and far more consistent than nineteen separate prompts — the whole
 * set shares one lighting setup and one palette because it was painted in one pass.
 * This turns that sheet back into the per-id files key.js already knows how to eat:
 *
 *     sheet.png  ->  raw/<id>__<style>.png  ->  node key.js  ->  cut/  ->  pack -> inject
 *
 * The grid is GIVEN, not guessed. The first cut of this tried to find cells from ink
 * projection profiles and merged the whole sheet into one cell: the captions sit in
 * the gutters between rows, so the profile never returns to zero anywhere and there
 * are no bands to find. A sheet is always a regular grid, so asking for "5x4" is
 * both shorter and impossible to get subtly wrong.
 *
 * Per cell it still measures: content bounding box, minus a trailing thin band,
 * which is the caption. Captions are only there so a human can check the sheet came
 * back in the right order — nothing here reads them. The id list is the contract:
 * one id per line in READING ORDER, blank lines and #comments ignored.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const has = k => process.argv.indexOf(k) > 0;
const [, , sheetArg, idsArg] = process.argv;
if (!sheetArg || !idsArg) {
  console.error('usage: node _iconart/slice.js <sheet.png> <ids.txt> --grid <cols>x<rows> [--style painted] [--dry] [--pad 0.06] [--caption 0.85]');
  process.exit(1);
}
const GRID = /^(\d+)x(\d+)$/.exec(arg('--grid') || '');
if (!GRID && !arg('--rowcols')) { console.error('--grid <cols>x<rows> or --rowcols <n,n,...> is required'); process.exit(1); }
let COLS = GRID ? +GRID[1] : 0; const ROWS = GRID ? +GRID[2] : 0;
const STYLE = arg('--style') || 'painted';
const PAD = +(arg('--pad') || 0.06);
/* A band starting at or below this fraction of the cell height is a caption, never
   artwork. Measured on the hides sheet: captions start 87-95% down, art starts <15%. */
const CAP_START = +(arg('--caption') || 0.85);
/* Some sheets come back as a labelled MATRIX rather than a plain grid — the crafted
   ladder arrived as 7 tiers across by 4 slots down, with tier names along the top and
   slot names down the left. Those labels are not cells and would be sliced as if they
   were, so trim them off before the grid is applied: --crop x0,y0[,x1,y1]. */
const CROP = (arg('--crop') || '').split(',').map(Number).filter(n => !isNaN(n));
/* Sheets that came back as a DRAWN TABLE put a hairline rule on every cell boundary.
   Those rules are ink, so the horizontal tightening pass snaps to the full cell width
   and every icon ships with a black line down one side. Pull each cell in by a few
   pixels first: --inset 6. Artwork never runs to the very edge of its cell, so this
   costs nothing on a sheet that has no rules either. */
const INSET = +(arg('--inset') || 0);
/* Explicit column edges, in the ORIGINAL image's coordinates, for a row whose objects
   are not evenly spaced — `--colx 0,175,344,545,...`. A hand-assembled sheet lines its
   captions up and lets the artwork sit where it likes, so an equal division puts a
   grid line through a boot on one row and misses it on the next. _colsin.js measures
   the real gutters inside one band; this consumes them. Overrides --grid's columns. */
const COLX = (arg('--colx') || '').split(',').filter(s => s !== '').map(Number).filter(n => !isNaN(n));
if (COLX.length) COLS = COLX.length - 1;
/* How many items each row holds, e.g. --rowcols 6,6,6,6,7. Replaces --grid entirely:
   the row count comes from the list length and each row's column edges are measured
   rather than assumed. Use it for any sheet whose rows are not all the same width. */
const ROWCOLS = (arg('--rowcols') || '').split(',').filter(s => s !== '').map(Number).filter(n => !isNaN(n));
const DRY = has('--dry');
/* --debug <n> dumps the band analysis for cell n and stops. */
const DEBUG = arg('--debug') === null ? -1 : +arg('--debug');
const SHEET = path.resolve(__dirname, sheetArg);
const RAW = path.join(__dirname, process.env.CVRAW || 'raw');

let IDS = fs.readFileSync(path.resolve(__dirname, idsArg), 'utf8')
  .split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
/* `_spare` lines pad an id list out to a rectangle so --grid's cell count matches. With
   --rowcols the last row is declared honestly, so there is nothing to pad — and the
   padding would then be counted as real items. */
if (ROWCOLS.length) IDS = IDS.filter(id => !id.startsWith('_spare'));

const WORK = `async (uri, COLS, ROWS, PAD, CAP_START, CROP, INSET, COLX, ROWCOLS, DEBUG) => {
  const img = new Image(); img.src = uri; await img.decode();
  const cx0 = CROP.length >= 2 ? CROP[0] : 0, cy0 = CROP.length >= 2 ? CROP[1] : 0;
  const cx1 = CROP.length >= 4 ? CROP[2] : img.width, cy1 = CROP.length >= 4 ? CROP[3] : img.height;
  const W = cx1 - cx0, H = cy1 - cy0;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, cx0, cy0, W, H, 0, 0, W, H);
  const px = x.getImageData(0, 0, W, H).data;

  /* Threshold from the sheet's OWN backdrop rather than a constant. This one came
     back at luma 253-254, but a sheet exported through a lossy step sits lower, and
     a fixed 246 would then read the whole background as content. */
  const lum = i => (px[i*4]*299 + px[i*4+1]*587 + px[i*4+2]*114) / 1000;
  const corners = [0, W-1, (H-1)*W, W*H-1].map(lum);
  const bg = corners.reduce((a,b)=>a+b,0) / 4;
  const INK = bg - 8;
  const isInk = i => px[i*4+3] > 24 && lum(i) < INK;

  const cw = W / COLS, ch = H / (ROWCOLS.length || ROWS);
  const NROW = ROWCOLS.length || ROWS;
  const cells = [];
  for (let r = 0; r < NROW; r++) {
    const ry0 = Math.round(r * ch) + INSET, ry1 = Math.round((r+1) * ch) - 1 - INSET;
    /* Column edges MEASURED inside this row when --rowcols says how many items it holds.
       Contact sheets do not keep one column count for the whole page: the sailing sheet
       is six across for four rows and then squeezes seven into the last, and jewellery's
       last row of five is spaced to nothing in particular. A single equal division cuts a
       lantern in half on those rows and lines up perfectly on every other one, which is
       exactly the kind of bug that ships. Blank columns inside the row are the real
       boundaries; take the N-1 widest and put an edge down the middle of each. */
    let edges = null;
    if (ROWCOLS.length) {
      const N = ROWCOLS[r];
      /* Measure the gutters over the ARTWORK ROWS ONLY. A caption runs nearly the full
         width of its cell, so including caption rows closes the gaps between items and
         the row comes back with three columns instead of seven. Tell them apart by mean
         ink-RUN LENGTH: letter strokes are a few pixels wide, a painted object is tens
         of pixels wide, and that holds at any sheet resolution or column count. */
      const artRow = new Uint8Array(ry1 - ry0 + 1);
      for (let y = ry0; y <= ry1; y++) {
        let n = 0, nrun = 0, was = false;
        for (let X = 0; X < W; X++) {
          const on = isInk(y*W + X);
          if (on) { n++; if (!was) nrun++; }
          was = on;
        }
        artRow[y - ry0] = (nrun > 0 && n / nrun >= 12) ? 1 : 0;
      }
      const colInk = new Int32Array(W);
      for (let X = 0; X < W; X++) { let n = 0; for (let y = ry0; y <= ry1; y++) if (artRow[y - ry0] && isInk(y*W + X)) n++; colInk[X] = n; }
      const gaps = []; let g = -1;
      for (let X = 0; X < W; X++) {
        if (colInk[X] === 0) { if (g < 0) g = X; }
        else { if (g >= 0 && X - g >= 3) gaps.push([g, X - 1]); g = -1; }
      }
      const inner = gaps.filter(q => q[0] > 0 && q[1] < W - 1);
      inner.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
      const pick = inner.slice(0, Math.max(0, N - 1)).sort((a, b) => a[0] - b[0]);
      edges = [0, ...pick.map(q => Math.round((q[0] + q[1]) / 2)), W];
    }
    const NCOL = edges ? edges.length - 1 : COLS;
    for (let k = 0; k < NCOL; k++) {
      const x0 = (edges ? edges[k] : (COLX.length ? COLX[k] - cx0 : Math.round(k * cw))) + INSET;
      const x1 = (edges ? edges[k+1] : (COLX.length ? COLX[k+1] - cx0 : Math.round((k+1) * cw))) - 1 - INSET;
      const y0 = ry0, y1 = ry1;

      // row profile INSIDE this cell, then bands
      const hgt = y1 - y0 + 1;
      const prof = new Int32Array(hgt);
      const dens = new Float64Array(hgt);   // ink / horizontal extent, per row
      /* Ink RUNS per row — the one measurement that separates a caption from artwork.
         Density does not: at sheet resolution a row through the x-height of "16. Ironbark
         Log" is 60% ink, the same as a painted ore, so a density test glued the caption of
         the row above onto Runite Ore. But text is many small marks with gaps between
         them, and a painted object is one silhouette: a caption row breaks into 10-30
         runs, an artwork row into 1-3, whatever the resolution or the typeface. */
      const runs = new Int32Array(hgt);
      for (let y = y0; y <= y1; y++) {
        let n = 0, mn = -1, mx = -1, r = 0, was = false;
        for (let X = x0; X <= x1; X++) {
          const on = isInk(y*W + X);
          if (on) { n++; if (mn < 0) mn = X; mx = X; if (!was) r++; }
          was = on;
        }
        prof[y - y0] = n;
        dens[y - y0] = mx < 0 ? 0 : n / (mx - mn + 1);
        runs[y - y0] = r;
      }
      /* A row is TEXT if it is broken into many pieces, or is sparse enough that it can
         only be lettering. Both trims and the glue test share this one definition. */
      const isText = i => runs[i] >= 5 || dens[i] < 0.45;
      /* minGap of ONE. A caption can sit a single blank row under the artwork, and a
         larger gap tolerance swallows it into the art band where nothing can find it
         again — that is what shipped "jackal_pelt" with its own filename painted
         across the bottom of the icon. A one-row gap over-segments the pelt as well,
         but over-segmenting is recoverable and merging is not. */
      /* Split on a FLOOR, not on zero. The sheets carry a soft drop shadow under every
         object, so the four or five rows between a shield and its caption are never
         actually empty — one band swallowed the whole cell and "1. Aegis of Dawn" shipped
         inside the icon. Two per cent of the row's own peak is below any real feature and
         above every gradient tail. */
      let peak = 0;
      for (let i = 0; i < hgt; i++) if (prof[i] > peak) peak = prof[i];
      const FLOOR = Math.max(1, Math.round(peak * 0.02));
      const on = i => prof[i] > FLOOR;
      const bands = [];
      { let s = -1;
        for (let i = 0; i < hgt; i++) {
          if (on(i)) { if (s < 0) s = i; }
          else if (s >= 0) { bands.push([s, i - 1]); s = -1; }
        }
        if (s >= 0) bands.push([s, hgt - 1]); }
      if (!bands.length) { cells.push({ empty: true, x: x0, y: y0, w: 0, h: 0 }); continue; }

      /* THE ARTWORK IS THE TALLEST BAND. Nothing else in the cell comes close: a caption
         is a strip of text a dozen rows deep, and bleed from the row above is the tail
         end of a shape that has mostly been cut off by the grid line.
         Three earlier attempts tried to describe the junk instead — drop bands that end
         inside the top 10%, then 15%, then 28% — and each one failed on the next sheet,
         because "how far down the cell" depends entirely on how tall the cells are. At
         7x11 the cells are 114px and the caption ends at row 42, past any threshold that
         does not also eat real art. Measuring the ONE thing we actually want is stable
         at any grid size, and every failure so far reduces to picking the wrong band:
           Cooked Swordfish  bands 0-13, 16-30, 32-32, 57-178   -> want 57-178
           Ember Crest       bands 0-26, 28-42, 52-113          -> want 52-113
         Adjacent fragments within a few rows are absorbed, so a shape split by a thin
         horizontal gap — antialiasing, a gap between a blade and its guard — stays whole. */
      let bi = 0;
      for (let i = 1; i < bands.length; i++) {
        if ((bands[i][1] - bands[i][0]) > (bands[bi][1] - bands[bi][0])) bi = i;
      }
      let lo = bi, hi = bi;
      const GLUE = Math.max(2, Math.round(hgt * 0.04));
      /* ...but never absorb a band that is TEXT. The caption sits a few pixels under the
         artwork on most of these sheets, well inside GLUE, so plain proximity pulled
         "32. Coal" and "27. Polished Topaz" into their own icons. Letters leave gaps, so
         ink over horizontal extent peaks around 0.2-0.3 across a caption and 0.6+ on any
         row of a painted object; a thin but solid fragment — a blade tip, a chain link —
         still passes. Same measure the top trim uses, applied one band earlier. */
      const solid = b => { let t = 0; for (let i = b[0]; i <= b[1]; i++) if (isText(i)) t++; return t * 2 < (b[1] - b[0] + 1); };
      while (lo > 0 && bands[lo][0] - bands[lo - 1][1] <= GLUE && solid(bands[lo - 1])) lo--;
      while (hi < bands.length - 1 && bands[hi + 1][0] - bands[hi][1] <= GLUE && solid(bands[hi + 1])) hi++;
      const use = bands.slice(lo, hi + 1);
      /* Last defence: a caption that touches the artwork with no blank row between
         them, so band logic cannot split it. "2. Bone Marrow Stew" sat directly on top
         of Cooked Swordfish that way. Text is SPARSE — letters leave gaps, so ink over
         horizontal extent runs about 0.2 — while a painted object is solid at 0.6+.
         Walk in from the top of the chosen band while rows look like text, and stop at
         the first solid row. Capped to the top third so it can never eat real art, and
         density (not width) is the test, so a genuinely narrow shape — a blade tip — is
         safe: it is thin but still solid. */
      /* Trim a caption that is fused to the artwork, from either end. Walk in, collecting
         the run of TEXT rows; stop at the first three consecutive rows that are inked and
         are not text, which is the artwork proper. Counting a run rather than stopping on
         the first non-text row is what matters: a caption contains solid specks — a full
         stop, the bar of an 'f', a fleck of drop shadow — and stopping on one of those left
         "stalker_hood" wearing its own label. Requiring three in a row, and at least four
         text rows before anything is cut, keeps a tapering blade tip or a fur fringe (which
         also reads as sparse) from being shaved off. Capped to a third of the cell. */
      const eat = (from, step, stop) => {
        let i = from, gap = 0, last = -1, n = 0;
        while (i !== stop && i >= 0 && i < hgt) {
          if (on(i)) {
            if (isText(i)) { last = i; n++; gap = 0; }
            else { if (++gap >= 3) break; }
          }
          i += step;
        }
        return n >= 4 ? last : -1;
      };
      let top = use[0][0], bot = use[use.length - 1][1];
      const limit = top + Math.round(hgt * 0.33), floor = bot - Math.round(hgt * 0.33);
      const cutTop = eat(top, 1, Math.min(limit, bot));
      if (cutTop >= 0) { top = cutTop + 1; while (top < bot && !on(top)) top++; }
      const cutBot = eat(bot, -1, Math.max(floor, top));
      if (cutBot >= 0) { bot = cutBot - 1; while (bot > top && !on(bot)) bot--; }
      const ay0 = y0 + top, ay1 = y0 + bot;

      // tighten horizontally over just those rows
      let ax0 = x1, ax1 = x0;
      for (let y = ay0; y <= ay1; y++) for (let X = x0; X <= x1; X++)
        if (isInk(y*W + X)) { if (X < ax0) ax0 = X; if (X > ax1) ax1 = X; }
      if (ax1 < ax0) { cells.push({ empty: true, x: x0, y: y0, w: 0, h: 0 }); continue; }

      if (DEBUG === cells.length) {
        return { debug: true, x0, x1, y0, y1, hgt, bands,
                 text: bands.map(b => { let t = 0; for (let i = b[0]; i <= b[1]; i++) if (isText(i)) t++; return t + '/' + (b[1]-b[0]+1); }),
                 chosen: [lo, hi], top, bot,
                 prof: Array.from(prof), runs: Array.from(runs), dens: Array.from(dens).map(d => +d.toFixed(2)) };
      }
      const bw = ax1 - ax0 + 1, bh = ay1 - ay0 + 1;
      const pad = Math.round(Math.max(bw, bh) * PAD);
      const side = Math.max(bw, bh) + pad * 2;
      const o = document.createElement('canvas');
      o.width = side; o.height = side;
      const ox = o.getContext('2d');
      ox.fillStyle = '#ffffff'; ox.fillRect(0, 0, side, side);   // key.js keys flat white
      ox.drawImage(c, ax0, ay0, bw, bh, Math.round((side - bw) / 2), Math.round((side - bh) / 2), bw, bh);
      cells.push({ x: ax0, y: ay0, w: bw, h: bh, uri: o.toDataURL('image/png') });
    }
  }
  return { W, H, bg: Math.round(bg), cells };
}`;

(async () => {
  if (!fs.existsSync(SHEET)) { console.error('no such sheet: ' + SHEET); process.exit(1); }
  const uri = 'data:image/png;base64,' + fs.readFileSync(SHEET).toString('base64');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  const res = await page.evaluate(new Function('return ' + WORK)(), uri, COLS, ROWS, PAD, CAP_START, CROP, INSET, COLX, ROWCOLS, DEBUG);
  await browser.close();

  if (res.debug) { console.log(JSON.stringify(res, null, 1)); return; }
  console.log(`sheet ${path.basename(SHEET)}  ${res.W}x${res.H}  backdrop luma ${res.bg}  grid ${COLS}x${ROWS} = ${res.cells.length} cells`);
  if (res.cells.length !== IDS.length) {
    console.error(`\nMISMATCH: grid gives ${res.cells.length} cells, id list has ${IDS.length}. Nothing written.`);
    process.exit(1);
  }
  const empty = res.cells.map((c, i) => c.empty ? IDS[i] : null).filter(Boolean);
  if (empty.length) console.log(`  (${empty.length} empty cell(s), skipped: ${empty.join(', ')})`);

  if (!DRY) fs.mkdirSync(RAW, { recursive: true });
  IDS.forEach((id, i) => {
    const cell = res.cells[i];
    if (cell.empty) return;
    const out = path.join(RAW, `${id}__${STYLE}.png`);
    const buf = Buffer.from(cell.uri.split(',')[1], 'base64');
    if (!DRY) fs.writeFileSync(out, buf);
    console.log(`  ${DRY ? 'would write' : 'wrote'}  ${(id + '__' + STYLE + '.png').padEnd(30)} src ${cell.w}x${cell.h}  ${(buf.length/1024).toFixed(0)}kb`);
  });
  console.log(`\nnext:  node _iconart/key.js  &&  node _iconart/pack.js  &&  node _iconart/inject.js`);
})().catch(e => { console.error(e); process.exit(1); });

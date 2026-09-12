/* Cut the monster sheets by SHAPE, not by rectangle.
 *
 *     node _iconart/_monseg.js              all sheets -> cut_mon/ at 256px
 *     node _iconart/_monseg.js mon_wolf_den mon_thornwood
 *     node _iconart/_monseg.js --contact    also write _monseg.html to look at
 *
 * cutall.js slices these sheets with hand measured rectangles: two horizontal
 * bands and a few column edges. Three separate defects come out of that and only
 * that, and all three are what Jordan reported on 2026-09-12:
 *
 *   1. A band edge is one straight line across the whole sheet, so a creature in
 *      the top row that hangs below the line loses everything under it. Half of
 *      the rat queen, the ogre seer, the emberwyrm. There is no line that misses
 *      every one of them because the sheets are not drawn on a grid.
 *   2. A rectangle keeps whatever else is inside it, so a neighbour's wing tip or
 *      tail rides along in the corner, and the caption ChatGPT painted under a
 *      cell ("Ogre Grunt") survives as literal words on the portrait.
 *   3. key.js de-mattes only pixels brighter than its own 214 backdrop cut, so
 *      the antialiased ramp between the paint and the white page, which lands
 *      squarely between about 150 and 214, keeps FULL opacity and its share of
 *      the page. That is the white outline around almost every one of them.
 *
 * So: key the page, label every connected blob of ink, throw away the caption
 * glyphs, group the blobs per creature, and draw ONLY that creature's own blobs
 * onto a transparent square. A shape cannot clip itself, cannot pick up a
 * neighbour it is not connected to, and cannot carry a caption it is not part of.
 * The rind goes by eroding one pixel of ink and un-mattig the ring behind it
 * against a LOCAL reference rather than a fixed threshold.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/Cindervale/tools/trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const SHEETS = path.join(__dirname, 'sheets');
const CUT    = path.join(__dirname, process.env.CVCUT || 'cut_mon');
const SIZE = 256, MARGIN = 0.04;

/* How many creatures sit in each row of each sheet. The row SPLIT is measured
   from the artwork; only the shape of the layout is stated here. */
const LAYOUT = {
  mon_rat_warrens:     [3, 2],
  mon_spider_hollow:   [3, 2],
  mon_goblin_cave:     [3, 2],
  mon_skeleton_crypt:  [3, 2],
  mon_wolf_den:        [3, 2],
  mon_ogre_stronghold: [3, 2],
  mon_troll_caverns:   [3, 2],
  mon_wyvern_roost:    [3, 2],
  mon_demon_sanctum:   [3, 2],
  mon_thornwood:       [2, 2],
  mon_frostfang:       [2, 2],
  mon_ashen_steppe:    [2, 2],
};

const WORK = fs.readFileSync(path.join(__dirname, '_monseg_work.js'), 'utf8');

(async () => {
  const args = process.argv.slice(2);
  const contact = args.includes('--contact');
  const want = args.filter(a => !a.startsWith('--'));
  const names = Object.keys(LAYOUT).filter(n => !want.length || want.includes(n));
  fs.mkdirSync(CUT, { recursive: true });

  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });
  const fn = await p.evaluateHandle(`(${WORK})`);

  let warn = [], tiles = [];
  for (const name of names) {
    const ids = fs.readFileSync(path.join(SHEETS, name + '.txt'), 'utf8').split(/\s+/).filter(Boolean);
    const rows = LAYOUT[name];
    if (ids.length !== rows.reduce((a, c) => a + c, 0))
      throw new Error(name + ': ' + ids.length + ' ids but layout wants ' + rows.reduce((a, c) => a + c, 0));
    const uri = 'data:image/png;base64,' + fs.readFileSync(path.join(SHEETS, name + '.png')).toString('base64');
    const r = await p.evaluate((fn, u, rows, S, M) => fn(u, rows, S, M), fn, uri, rows, SIZE, MARGIN);
    if (r.err) { console.log(name.padEnd(22) + 'FAILED - ' + r.err); warn.push(name + ': ' + r.err); continue; }
    console.log(name.padEnd(22) + r.blobs + ' blobs, ' + r.glyphs + ' caption glyphs dropped, split y=' + r.split.join('/'));
    r.cells.forEach((c, i) => {
      const id = ids[i];
      fs.writeFileSync(path.join(CUT, id + '__painted.png'), Buffer.from(c.png.split(',')[1], 'base64'));
      tiles.push({ id, png: c.png, zone: name });
      const flags = [];
      if (c.parts > 6) flags.push(c.parts + ' parts');
      if (c.w / c.h > 2.6 || c.h / c.w > 2.6) flags.push('aspect ' + (c.w / c.h).toFixed(2));
      if (c.edge) flags.push('TOUCHES SHEET EDGE');
      console.log('   ' + id.padEnd(20) + String(c.w).padStart(4) + 'x' + String(c.h).padEnd(5)
        + ' ink ' + String(c.inkPct).padStart(2) + '%' + (flags.length ? '   <-- ' + flags.join(', ') : ''));
      if (c.edge) warn.push(id + ' touches the sheet edge, the drawing itself may be clipped');
    });
  }

  if (contact) {
    /* On the panel brown at a size where a one pixel halo is actually visible. */
    const html = `<!doctype html><meta charset="utf-8"><title>Monster cuts</title><style>
body{margin:0;padding:16px;background:#1d150f;color:#e8d4bd;font:13px Georgia,serif}
h2{font-size:12px;margin:18px 0 8px;color:#a89076;letter-spacing:.09em;text-transform:uppercase;
  border-bottom:1px solid #3d2c1d;padding-bottom:5px;font-weight:400}
.row{display:flex;gap:12px;flex-wrap:wrap}
.c{width:168px;text-align:center}
.c i{display:block;width:168px;height:168px;border-radius:10px;border:1px solid #3d2c1d;
  background:#2a1f16;background-size:contain;background-repeat:no-repeat;background-position:center}
.c b{display:block;font-size:11.5px;font-weight:400;margin-top:4px}
</style>` + names.map(n => '<h2>' + n.replace(/^mon_|_/g, ' ').trim() + '</h2><div class="row">'
      + tiles.filter(t => t.zone === n).map(t =>
        `<div class="c"><i style="background-image:url(${t.png})"></i><b>${t.id.replace(/_/g, ' ')}</b></div>`).join('')
      + '</div>').join('');
    fs.writeFileSync(path.join(__dirname, '..', '_monseg.html'), html, 'utf8');
    console.log('\nwrote _monseg.html  ' + (fs.statSync(path.join(__dirname, '..', '_monseg.html')).size / 1024).toFixed(0) + 'K');
  }
  await b.close();
  console.log('\n' + tiles.length + ' cut by shape at ' + SIZE + 'px -> ' + CUT);
  if (warn.length) console.log('LOOK AT:\n  ' + warn.join('\n  '));
})().catch(e => { console.error(e); process.exit(1); });

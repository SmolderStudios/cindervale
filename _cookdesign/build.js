/* Build _cookdesign/preview.html — the design review page.
 *
 * Screenshots are re-encoded to WebP in the headless Chrome that is already here
 * (no sharp on this machine) and embedded as data URIs, so the page is one file
 * that opens from disk with nothing else beside it.
 */
const path = require('path'), fs = require('fs');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(path.join(KIT, 'node_modules/puppeteer-core'));
const CHROME = path.join(KIT, 'browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe');

const SHOTS = path.join(__dirname, 'shots');
const MEAS = JSON.parse(fs.readFileSync(path.join(SHOTS, 'measured.json'), 'utf8'));
const byId = Object.fromEntries(MEAS.map(m => [m.id, m]));

const CTX = [
  { id: 'now', title: 'As it is now',       sub: 'panel 1182px' },
  { id: 'a',   title: 'A · Heal first',     sub: 'panel 1055px' },
  { id: 'b',   title: 'B · The hearth',     sub: 'panel 1165px' },
  { id: 'c',   title: 'C · Two larders',    sub: 'panel 1167px' },
  { id: 'd',   title: 'D · The larder',     sub: 'panel 1158px' },
];
const FIRE = [
  { id: 'b',        title: 'Burning',  sub: '4m 2s in the fire' },
  { id: 'b-stored', title: 'Banked',   sub: 'fuel loaded, not lit' },
  { id: 'b-out',    title: 'Cold',     sub: 'nothing cooks' },
];
const BLIST = [
  { id: 'b',           title: 'B · three up',  sub: 'panel 1165px · 19 cards' },
  { id: 'b-grid4',     title: 'B · four up',   sub: 'panel 983px · 19 cards' },
  { id: 'b-filtered',  title: 'B · filtered',  sub: 'panel 1225px · 16 cards' },
  { id: 'b-leanfilt',  title: 'filtered, lean save', sub: 'panel 1052px · 8 cards' },
];
const PLATES = [
  { file: 'fire/burn-2.png', title: 'Burning',  sub: '15KB shipped' },
  { file: 'fire/bank-1.png', title: 'Banked',   sub: '13KB shipped' },
  { file: 'fire/cold-2.png', title: 'Cold',     sub: '13KB shipped' },
];

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.goto('data:text/html,<body>');

  async function webp(file, maxW, q) {
    const raw = fs.readFileSync(path.join(__dirname, file)).toString('base64');
    return p.evaluate(async (raw, maxW, q) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + raw;
      await img.decode();
      const s = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/webp', q);
    }, raw, maxW, q);
  }

  const shots = {};
  for (const c of CTX.concat(FIRE).concat(BLIST)) {
    if (shots[c.id]) continue;
    shots[c.id] = await webp('shots/' + c.id + '.png', 1560, 0.76);
    console.log('  ' + c.id + '  ' + Math.round(shots[c.id].length * 0.75 / 1024) + 'KB');
  }
  const plates = {};
  for (const pl of PLATES) {
    plates[pl.file] = await webp(pl.file, 420, 0.8);
  }
  await b.close();

  const ctxBtns = CTX.map((c, i) =>
    `<button class="${i === 0 ? 'on' : ''}" data-ctx="${c.id}"><b>${c.title}</b><i>${c.sub}</i></button>`).join('');
  const ctxPanes = CTX.map((c, i) =>
    `<div class="ctxpane" data-pane="${c.id}"${i ? ' hidden' : ''}><div class="ctxshot">`
    + `<img alt="${c.title} in the live game page at 1920x1080" src="${shots[c.id]}"></div></div>`).join('');
  const bBtns = BLIST.map((c, i) =>
    `<button class="${i === 1 ? 'on' : ''}" data-b="${c.id}"><b>${c.title}</b><i>${c.sub}</i></button>`).join('');
  const bPanes = BLIST.map((c, i) =>
    `<div class="bpane" data-bpane="${c.id}"${i === 1 ? '' : ' hidden'}><div class="ctxshot">`
    + `<img alt="${c.title}" src="${shots[c.id]}"></div></div>`).join('');
  const firePanes = FIRE.map(f =>
    `<figure><img alt="${f.title} hearth state" src="${shots[f.id]}"><figcaption><b>${f.title}</b> ${f.sub}</figcaption></figure>`).join('');
  const plateFigs = PLATES.map(pl =>
    `<figure class="plate"><img alt="${pl.title} hearth plate" src="${plates[pl.file]}"><figcaption><b>${pl.title}</b> ${pl.sub}</figcaption></figure>`).join('');

  const html = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8')
    .replace('<!--CTXBTNS-->', ctxBtns)
    .replace('<!--CTXPANES-->', ctxPanes)
    .replace('<!--FIREPANES-->', firePanes)
    .replace('<!--PLATES-->', plateFigs)
    .replace('<!--BBTNS-->', bBtns)
    .replace('<!--BPANES-->', bPanes);

  fs.writeFileSync(path.join(__dirname, 'preview.html'), html);
  console.log('preview.html  ' + Math.round(html.length / 1024) + 'KB');
})().catch(e => { console.error(e); process.exit(1); });

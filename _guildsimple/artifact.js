/* Build the Artifact version of the guild review.
 *
 * Same three shots, embedded as WebP data URIs into a standalone page. Written to
 * the scratchpad rather than the repo so the images do not land in git a second
 * time — preview.html already carries them.
 */
const path = require('path'), fs = require('fs');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(path.join(KIT, 'node_modules/puppeteer-core'));
const CHROME = path.join(KIT, 'browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe');
const OUT = process.argv[2];

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.goto('data:text/html,<body>');
  const img = {};
  for (const id of ['a', 'b', 'c']) {
    const raw = fs.readFileSync(path.join(__dirname, 'shots', id + '.png')).toString('base64');
    img[id] = await p.evaluate(async (raw) => {
      const i = new Image(); i.src = 'data:image/png;base64,' + raw; await i.decode();
      const W = 1240, sc = W / i.width;
      const c = document.createElement('canvas');
      c.width = W; c.height = Math.round(i.height * sc);
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
      return c.toDataURL('image/webp', 0.66);
    }, raw);
    console.log('  ' + id + '  ' + Math.round(img[id].length * 0.75 / 1024) + 'KB');
  }
  await b.close();

  let html = fs.readFileSync(path.join(__dirname, 'artifact-template.html'), 'utf8');
  for (const id of ['a', 'b', 'c']) html = html.replace('{{IMG_' + id.toUpperCase() + '}}', img[id]);
  fs.writeFileSync(OUT, html);
  console.log('artifact ' + Math.round(html.length / 1024) + 'KB -> ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });

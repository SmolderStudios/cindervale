/* Build the Steam icon assets from the crest master.
 *
 *     node _iconart/steamicons.js
 *
 * Steam does NOT read the icon baked into the .exe. Its icons are store assets
 * uploaded on the partner site, which is why every depot build so far has left the
 * Steam icon untouched. Both slots live on ONE page:
 *
 *   Store Presence -> Graphical Assets -> Community and Client Icons
 *
 *   Shortcut Icon   512x512 ICO or PNG   the desktop shortcut Steam creates
 *   App Icon        184x184 JPG          library list view, chat favourites, notifications
 *
 * Valve used to call these the Client Icon (32x32 .ico) and the Community Icon, and
 * plenty of still-current advice says 32x32 — there is no such slot on the page now.
 * The pre-existing assets in the output folder are already named after the real slots.
 *
 * The .ico is written too, multi-size, because the slot accepts either and a real
 * multi-size container beats one 512 squeezed down to a 16px list entry. The PNG is
 * the simpler upload and is what the live asset uses.
 *
 * Source is icon256.png in the wrapper: the same master the Windows .ico is built
 * from, so all three finally agree.
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const SRC = 'C:/Users/Jordan/Desktop/OLD EMBERVALE/Embervale Idle Dev/icon256.png';
const OUT = 'C:/Users/Jordan/Desktop/Cindervale Store Assets/icons';
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

const RENDER = `async (uri, size, asJpeg) => {
  const img = new Image(); img.src = uri; await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  if (asJpeg) { x.fillStyle = '#140c06'; x.fillRect(0, 0, size, size); }  // jpeg has no alpha
  x.drawImage(img, 0, 0, size, size);
  return c.toDataURL(asJpeg ? 'image/jpeg' : 'image/png', 0.94);
}`;

/* ICO container. Vista+ allows each entry to be a whole PNG, which keeps this to a
   header, one 16-byte directory record per size, and the PNG bytes. */
function buildIco(pngs) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);            // reserved
  head.writeUInt16LE(1, 2);            // 1 = icon
  head.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = head.length + dir.length;
  pngs.forEach((p, i) => {
    const o = i * 16;
    dir.writeUInt8(p.size >= 256 ? 0 : p.size, o);     // 0 means 256
    dir.writeUInt8(p.size >= 256 ? 0 : p.size, o + 1);
    dir.writeUInt8(0, o + 2);                          // palette
    dir.writeUInt8(0, o + 3);                          // reserved
    dir.writeUInt16LE(1, o + 4);                       // colour planes
    dir.writeUInt16LE(32, o + 6);                      // bits per pixel
    dir.writeUInt32LE(p.buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += p.buf.length;
  });
  return Buffer.concat([head, dir, ...pngs.map(p => p.buf)]);
}

(async () => {
  if (!fs.existsSync(SRC)) throw new Error('crest master not found: ' + SRC);
  fs.mkdirSync(OUT, { recursive: true });
  const uri = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');

  const br = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await br.newPage();
  await p.setContent('<body></body>', { waitUntil: 'load' });

  const png = async size => {
    const d = await p.evaluate((fn, u, s) => eval('(' + fn + ')')(u, s, false), RENDER, uri, size);
    return { size, buf: Buffer.from(d.split(',')[1], 'base64') };
  };
  const jpg = async size => {
    const d = await p.evaluate((fn, u, s) => eval('(' + fn + ')')(u, s, true), RENDER, uri, size);
    return Buffer.from(d.split(',')[1], 'base64');
  };

  const entries = [];
  for (const s of ICO_SIZES) entries.push(await png(s));
  const ico = buildIco(entries);
  fs.writeFileSync(path.join(OUT, 'crest_shortcut_icon.ico'), ico);

  const community = await jpg(184);
  fs.writeFileSync(path.join(OUT, 'crest_app_icon_184.jpg'), community);

  const big = await png(512);
  fs.writeFileSync(path.join(OUT, 'crest_shortcut_icon_512.png'), big.buf);
  await br.close();

  console.log('written to ' + OUT);
  console.log('  crest_shortcut_icon_512.png  ' + (big.buf.length / 1024).toFixed(1) + ' KB   -> Shortcut Icon slot');
  console.log('  crest_app_icon_184.jpg       ' + (community.length / 1024).toFixed(1) + ' KB   -> App Icon slot');
  console.log('  crest_shortcut_icon.ico      ' + (ico.length / 1024).toFixed(1) + ' KB   ' + ICO_SIZES.join('/') + '  (same slot, alt format)');
})().catch(e => { console.error(e); process.exit(1); });

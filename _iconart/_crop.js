'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const [, , src, out, box] = process.argv;
const [X, Y, W, H] = (box || '').split(',').map(Number);
(async () => {
  const uri = 'data:image/png;base64,' + fs.readFileSync(path.resolve(src)).toString('base64');
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const p = await b.newPage();
  const d = await p.evaluate(async (uri, X, Y, W, H) => {
    const img = new Image(); img.src = uri; await img.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(img, X, Y, W, H, 0, 0, W, H);
    return c.toDataURL('image/png');
  }, uri, X, Y, W, H);
  await b.close();
  fs.writeFileSync(path.resolve(out), Buffer.from(d.split(',')[1], 'base64'));
  console.log('wrote ' + out);
})();

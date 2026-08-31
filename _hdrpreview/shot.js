// Screenshots preview.html with the trailer kit's Chrome for Testing.
const path = require('path');
const KIT  = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1640, height: 1400, deviceScaleFactor: 2 });
  await page.goto('file:///' + path.join(__dirname, 'preview.html').replace(/\\/g, '/'));
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 700));
  const h = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1640, height: h + 20, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(__dirname, 'preview.png') });
  console.log('shot ' + h + 'px tall');
  await browser.close();
})();

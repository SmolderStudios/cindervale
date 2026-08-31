// Where does the header actually run out of room?
//
// applyRootZoom sets html{zoom} = window/UI_DESIGN_W, clamped to [0.55, 1.80],
// so above a ~990px window the header ALWAYS has ~1800 CSS px of layout width no
// matter how small the window is. Media queries, however, resolve against the raw
// window width. Breakpoints therefore have to be expressed in window px chosen
// from where the CSS width really shrinks — below the zoom floor — not from the
// width the header appears to have.
//
// Height jumping past one row is the signal: header is flex-wrap:wrap.
const path = require('path');
const KIT  = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  const url = 'file:///' + path.join(__dirname, '..', 'cindervale.html').replace(/\\/g, '/') + '?cvdev=1';
  for (const w of [1920, 1745, 1280, 1000, 960, 900, 860, 820, 780, 740, 700]) {
    await page.setViewport({ width: w, height: 900 });
    await page.goto(url, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 2200));
    const r = await page.evaluate(() => {
      const z = parseFloat(document.documentElement.style.zoom) || 1;
      const h = document.querySelector('header');
      const kids = [...h.children];
      const cs = getComputedStyle(h);
      const gap = parseFloat(cs.gap) || 0;
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      // children rects come back zoomed; divide to get CSS px
      const sum = kids.reduce((a, c) => a + c.getBoundingClientRect().width / z, 0);
      return {
        zoom: z,
        cssW: Math.round(h.getBoundingClientRect().width / z),
        cssH: Math.round(h.getBoundingClientRect().height / z),
        need: Math.round(sum + gap * (kids.length - 1) + pad),
      };
    });
    const wrapped = r.cssH > 75 ? '  <-- WRAPPED' : '';
    console.log(`win ${String(w).padStart(4)}  zoom ${r.zoom.toFixed(3)}  ` +
      `cssW ${String(r.cssW).padEnd(5)} needs ${String(r.need).padEnd(5)} h ${String(r.cssH).padEnd(4)}${wrapped}`);
  }
  await browser.close();
})();

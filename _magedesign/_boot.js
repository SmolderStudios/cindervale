/* Shared boot for the Magic design harnesses: the real game in jsdom, as Electron
   (a browser user agent is the demo build and caps every level at 10), with the
   design and the prototype overlay evaluated on top. cindervale.html is read,
   never written. */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, '..', 'node_modules', 'jsdom'));
const FILE = process.env.CV_FILE || path.join(__dirname, '..', 'cindervale.html');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Electron/33.0 Safari/537.36';
module.exports = function boot(opts) {
  opts = opts || {};
  const dom = new JSDOM(fs.readFileSync(FILE, 'utf8'), {
    url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
    beforeParse(w) { Object.defineProperty(w.navigator, 'userAgent', { value: UA, configurable: true }); }
  });
  return new Promise(resolve => setTimeout(() => {
    const w = dom.window;
    if (!opts.bare) {
      w.eval(fs.readFileSync(path.join(__dirname, 'design.js'), 'utf8'));
      w.eval(fs.readFileSync(path.join(__dirname, 'overlay.js'), 'utf8'));
    }
    resolve({ w, ev: src => w.eval(src), FILE });
  }, 2800));
};

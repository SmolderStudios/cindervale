/* Contact sheet of the generated slayer art, shown at the size each would be used.
 *     node _iconart/slayerartsheet.js
 */
'use strict';
const fs = require('fs'), path = require('path');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';
const DIR = path.join(__dirname, 'slayer');
const uri = f => 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, f)).toString('base64');
const has = f => fs.existsSync(path.join(DIR, f));

const MASTERS = [['master_novice', 'Novice Slayer Master'], ['master_expert', 'Expert Slayer Master'],
                 ['master_general', 'Slayer General']];
const BANNERS = [['banner_board', 'bounty board'], ['banner_table', 'war table']];
const FAMS = ['vermin', 'arachnid', 'goblinoid', 'undead', 'beast', 'giant', 'draconic', 'demon'];

const html = `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#181109;color:#ead9b5;font:13px/1.4 ui-monospace,Consolas,monospace;padding:20px 24px 40px}
h1{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#c79b4e;margin:22px 0 4px}
h1:first-child{margin-top:0}
.sub{color:#8a7350;margin-bottom:12px}
/* the real master row: art left, text right, on the panel's own card */
.mrow{display:flex;align-items:stretch;gap:0;border-radius:9px;overflow:hidden;margin-bottom:10px;
  background:linear-gradient(180deg,#221a14,#150f0a);border:1px solid #6e552c;max-width:1080px}
.mart{width:190px;flex:none;background-size:cover;background-position:center 32%;
  position:relative}
.mart::after{content:'';position:absolute;inset:0;
  background:linear-gradient(90deg,rgba(20,12,8,0) 55%,rgba(21,15,10,1) 100%)}
.mtx{padding:14px 16px;flex:1}
.mnm{font-family:'Cinzel',serif;font-size:17px;color:#e7dcc4}
.mbl{color:#a08a64;margin:5px 0 9px}
.mchip{display:inline-block;border:1px solid #6e552c;border-radius:5px;padding:3px 9px;margin-right:6px;
  font-size:12px;color:#c79b4e}
.ban{width:1080px;height:150px;border-radius:9px;background-size:cover;background-position:center;
  position:relative;margin-bottom:10px;border:1px solid #3f3124}
.ban::after{content:'';position:absolute;inset:0;border-radius:9px;
  background:linear-gradient(180deg,rgba(20,12,8,.15),rgba(20,12,8,.85))}
.bant{position:absolute;left:20px;bottom:16px;z-index:2;font-family:'Cinzel',serif;
  font-size:26px;color:#f0d0c8;text-shadow:0 2px 10px #000}
.fams{display:flex;flex-wrap:wrap;gap:9px}
.fam{width:118px;text-align:center}
.fam img{width:118px;height:118px;border-radius:8px;display:block;border:1px solid #3f3124;object-fit:cover}
.fam .sm{margin-top:6px;display:flex;align-items:center;justify-content:center;gap:7px;color:#c79b4e;font-size:12px}
.fam .sm img{width:26px;height:26px;border-radius:5px;border:0}
</style>

<h1>Slayer Masters</h1>
<div class="sub">art bled into the card from the left, text sitting on the fade — the rows are the biggest cards in the panel and carry a 23px glyph today</div>
${MASTERS.map(([k, n], i) => has(k + '.png') ? `<div class="mrow">
  <div class="mart" style="background-image:url(${uri(k + '.png')})"></div>
  <div class="mtx"><div class="mnm">${n}</div>
    <div class="mbl">${['Rats, spiders, goblins and skeletons.',
                        'Wolves, ogres and undead. More kills per bounty, more points.',
                        'Trolls, wyverns and demons. The most kills, the most points.'][i]}</div>
    <span class="mchip">Lv ${[1,35,75][i]}+</span><span class="mchip">${['15–28','24–40','34–52'][i]} kills</span><span class="mchip">+${[3,9,17][i]} pts</span>
  </div></div>` : '').join('')}

<h1>Panel banner</h1>
<div class="sub">two directions for a strip across the head of the Slayer tab</div>
${BANNERS.map(([k, n]) => has(k + '.png') ? `<div class="ban" style="background-image:url(${uri(k + '.png')})">
  <span class="bant">Slayer</span></div><div class="sub">${n}</div>` : '').join('')}

<h1>Monster families</h1>
<div class="sub">for the Mark tab, which is eight text buttons today — shown large and at the 26px a button would use</div>
<div class="fams">${FAMS.map(f => has('fam_' + f + '.png') ? `<div class="fam">
  <img src="${uri('fam_' + f + '.png')}">
  <div class="sm"><img src="${uri('fam_' + f + '.png')}">${f}</div></div>` : '').join('')}</div>`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2 });
  await p.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: path.join(__dirname, '_slayerart.png'), fullPage: true });
  console.log('shot _slayerart.png');
  await b.close();
})();

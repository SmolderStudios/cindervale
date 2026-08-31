/* Build the guild-layout artifact: pack the generated art, fill the template. */
const path = require('path'), fs = require('fs');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(path.join(KIT, 'node_modules/puppeteer-core'));
const CHROME = path.join(KIT, 'browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe');
const ART = path.join(__dirname, 'scenes');
const OUT = process.argv[2];

/* Ten guilds, in the order they appear on the list screens. */
const G = [
  { id:'furrow',    name:'The Furrow',            sk:'Farming',                       rank:3, pct:64, rep:'12,830 / 20,000', q:'2 quests ready', join:true },
  { id:'timber',    name:'The Timberhall',        sk:'Woodcutting · Firemaking',      rank:2, pct:31, rep:'3,410 / 6,000',   q:'1 quest ready',  join:true },
  { id:'legion',    name:'The Iron Legion',       sk:'Attack · Strength · Defence',   rank:1, pct:12, rep:'190 / 1,500',     q:'3 quests open',  join:true },
  { id:'deepwater', name:'The Deepwater Company', sk:'Fishing · Cooking',             need:'Fishing 20 — you have 82' },
  { id:'delvers',   name:'The Delvers',           sk:'Mining',                        need:'Mining 20 — you have 71' },
  { id:'emberforge',name:'The Emberforge',        sk:'Smithing · Crafting',           need:'Smithing 20 — you have 57' },
  { id:'ashen',     name:'The Ashen Circle',      sk:'Alchemy · Foraging',            need:'Alchemy 25 — you have 49' },
  { id:'facet',     name:'The Gilded Facet',      sk:'Jeweler',                       need:'Jeweler 20 — you have 37' },
  { id:'night',     name:'The Nightmarket',       sk:'Agility · selling',             need:'Agility 30 — you have 41' },
  { id:'quiethand', name:'The Quiet Hand',        sk:'Attack · Agility',              shut:'Needs Attack 60 — you have 55' },
];
/* Six titles per guild, lowest to highest. "Rank 3" is the same in every guild;
   "Yeoman" is only the Furrow. The number still exists underneath for sorting. */
const TITLES = {
  furrow:    ['Field Hand','Tenant','Yeoman','Reeve','Steward','Master of the Furrow'],
  timber:    ['Sawhand','Feller','Woodwright','Timberman','Forest Warden','Master of the Timberhall'],
  legion:    ['Recruit','Legionary','Vanguard','Centurion','Champion','Legate'],
  quiethand: ['Whisper','Cutpurse','Shade','Silencer','Nightblade','The Quiet Hand'],
  deepwater: ['Deckhand','Netter','Trawler','Boatswain','Harbourmaster','Master of the Deepwater'],
  ashen:     ['Novice','Herbalist','Distiller','Adept','Cinder Sage','Circlemaster'],
  facet:     ['Apprentice','Setter','Cutter','Lapidary','Goldwright','Master of the Facet'],
  delvers:   ['Pickhand','Digger','Tunneller','Deepwarden','Vein Seeker','Master Delver'],
  emberforge:['Bellows Hand','Striker','Forgehand','Smith','Mastersmith','Emberwright'],
  night:     ['Runner','Lookout','Fence','Broker','Shadowbroker','Master of the Nightmarket'],
};
const CRESTNAME = {
  legion:'Warriors', quiethand:'Assassins', furrow:'Farmers', timber:'Woodcutters',
  deepwater:'Fishers', ashen:'Alchemists', facet:'Jewellers', delvers:'Miners',
  emberforge:'Smiths', night:'Thieves',
};

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.goto('data:text/html,<body>');

  /* Pack a scene, trimming any black bar the model framed it with first.
     Four of the ten came back matted: Deepwater was letterboxed on all four sides,
     the Furrow had 30% of solid black down its right edge. Cropping is the honest
     fix — the picture is fine, it is the frame around it that is not — and it is
     deterministic, so a re-roll cannot quietly reintroduce one.

     A bar is a FLAT near-black row or column, not merely a dark one. Six scenes
     legitimately fade to darkness at an edge and are left untouched. */
  async function pack(file, W, q) {
    const raw = fs.readFileSync(path.join(ART, file)).toString('base64');
    return p.evaluate(async (raw, W, q) => {
      const i = new Image(); i.src = 'data:image/png;base64,' + raw; await i.decode();

      const m = document.createElement('canvas');
      m.width = i.width; m.height = i.height;
      const mx = m.getContext('2d'); mx.drawImage(i, 0, 0);
      const d = mx.getImageData(0, 0, i.width, i.height).data;
      const L = (px, py) => { const k = (py * i.width + px) * 4;
        return 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]; };
      const rowMean = y => { let s = 0; for (let px = 0; px < i.width; px++) s += L(px, y); return s / i.width; };
      const colMean = x => { let s = 0; for (let py = 0; py < i.height; py++) s += L(x, py); return s / i.height; };
      const T = 14, LIM = 0.34;
      let t = 0; while (t < i.height * LIM && rowMean(t) < T) t++;
      let bm = 0; while (bm < i.height * LIM && rowMean(i.height - 1 - bm) < T) bm++;
      let lf = 0; while (lf < i.width * LIM && colMean(lf) < T) lf++;
      let rt = 0; while (rt < i.width * LIM && colMean(i.width - 1 - rt) < T) rt++;
      const sx = lf, sy = t, sw = i.width - lf - rt, sh = i.height - t - bm;

      /* cover-fit what is left into the target 3:1 banner */
      const H = Math.round(W / 3);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const sc = Math.max(W / sw, H / sh);
      const dw = sw * sc, dh = sh * sc;
      g.drawImage(i, sx, sy, sw, sh, (W - dw) / 2, (H - dh) / 2, dw, dh);
      return c.toDataURL('image/webp', q);
    }, raw, W, q);
  }

  const img = {};
  let crestBytes = 0, hallBytes = 0;
  for (const g of G) {
    img[g.id] = await pack(g.id + '.png', 768, 0.72);
    crestBytes += img[g.id].length * 0.75;
  }
  for (const h of ['hall-1', 'hall-2']) {
    img[h] = await pack('../art/' + h + '.png', 1152, 0.7);
    hallBytes += img[h].length * 0.75;
  }
  await b.close();

  const kb = n => Math.round(n / 1024);
  /* one rule per image, referenced by class; .ph is the box that shows it */
  const imgCSS = '<style>.ph{width:100%;height:100%;display:block;'
    + 'background-size:cover;background-position:center}'
    + G.map(g => '.a-' + g.id + '{background-image:url(' + img[g.id] + ')}').join('')
    + '.a-hall{background-image:url(' + img['hall-1'] + ')}'
    + '.a-hall2{background-image:url(' + img['hall-2'] + ')}'
    + '</style>';
  const ph = id => '<span class="ph a-' + id + '"></span>';
  console.log('  10 emblems ' + kb(crestBytes) + 'KB · 2 halls ' + kb(hallBytes) + 'KB');

  /* ── the gallery ── */
  const crests = G.map(g =>
    `<figure class="crest"><span class="strip">${ph(g.id)}</span>`
    + `<b>${g.name}</b><i>${CRESTNAME[g.id]}</i></figure>`).join('');
  const halls = ['a-hall', 'a-hall2'].map(c =>
    `<div class="hall"><span class="ph ${c}"></span></div>`).join('');

  /* ── list A · small tiles ── */
  const listA = G.map(g => {
    if (g.shut) return `<div class="t shut"><div class="h"><span class="ic">${ph(g.id)}</span>`
      + `<span class="n"><b>${g.name}</b><i>${g.sk}</i></span></div>`
      + `<div class="f"><span>Locked</span></div>`
      + `<div class="g-btn off">Locked</div></div>`;
    if (!g.join) return `<div class="t"><div class="h"><span class="ic">${ph(g.id)}</span>`
      + `<span class="n"><b>${g.name}</b><i>${g.sk}</i></span></div>`
      + `<div class="f"><span>Not a member</span></div>`
      + `<div class="g-btn pri">Join</div></div>`;
    return `<div class="t"><div class="h"><span class="ic">${ph(g.id)}</span>`
      + `<span class="n"><b>${g.name}</b><i>${g.sk}</i></span><span class="r">${TITLES[g.id][g.rank-1]}</span></div>`
      + `<div class="g-bar"><i style="width:${g.pct}%"></i></div>`
      + `<div class="f"><span>${g.rep}</span><em>${g.q}</em></div>`
      + `<div class="g-btn">Open</div></div>`;
  }).join('');

  /* ── list B · emblem cards (six shown) ── */
  const listB = G.map(g => {
    const badge = g.join ? `<span class="rk">${TITLES[g.id][g.rank-1]}</span>` : '';
    const foot = g.join
      ? `<div class="f"><span>${g.rep} rep</span><em>${g.q}</em></div>`
      : g.shut ? `<div class="f"><span>Locked</span><em style="color:#c07a62">${g.shut.replace('Needs ','')}</em></div>`
      : `<div class="f"><span>Not a member</span><em>${(g.need || '').split('—')[0].trim()}</em></div>`;
    const btn = g.shut ? `<div class="g-btn off">Locked</div>`
      : g.join ? `<div class="g-btn">Open</div>` : `<div class="g-btn pri">Join</div>`;
    return `<div class="c${g.join ? ' joined' : ''}"${g.shut ? ' style="opacity:.55"' : ''}>`
      + `<div class="art">${ph(g.id)}${badge}</div>`
      + `<div class="b"><h4>${g.name}</h4><div class="sk">${g.sk}</div>${foot}${btn}</div></div>`;
  }).join('');

  /* ── list C · rows ── */
  const rows = (n) => G.slice(0, n).map(g => {
    const mid = g.join
      ? `<div class="p"><div class="l"><span><b>${g.rep}</b> rep</span><span>${TITLES[g.id][g.rank-1]}</span></div>`
        + `<div class="g-bar"><i style="width:${g.pct}%"></i></div></div>`
        + `<span class="q">${g.q}</span>`
      : `<div class="p"><div class="l"><span>${g.shut ? 'Locked' : 'Not a member'}</span></div>`
        + `<div class="g-bar"><i style="width:0%"></i></div></div>`
        + `<span class="q" style="color:#8a7657">${g.shut || g.need}</span>`;
    const btn = g.shut ? `<div class="g-btn off">Locked</div>`
      : g.join ? `<div class="g-btn">Open</div>` : `<div class="g-btn pri">Join</div>`;
    return `<div class="r${g.join ? ' joined' : ''}"><span class="ic">${ph(g.id)}</span>`
      + `<span class="n"><b>${g.name}</b><i>${g.sk}</i></span>${mid}<span class="a">${btn}</span></div>`;
  }).join('');

  const hallHero = `<div class="ld-hero"><span class="ph a-hall"></span>`
    + `<div class="ov"><b>The Guild Hall</b><i>You are a member of three guilds &middot; 3 quests ready to claim &middot; 184 tokens</i></div></div>`;

  /* ── the guild page pieces, shared by all three detail options ── */
  const furrowIcon = `<span style="width:19px;height:19px;flex:none;border-radius:4px;overflow:hidden;display:block">${ph("furrow")}</span>`;

  const dHero = `<div class="d-hero"><span class="ic">${ph("furrow")}</span>`
    + `<div class="t"><b>${TITLES.furrow[2]}</b><i>Farmers&rsquo; guild &middot; Farming</i></div>`
    + `<div class="p"><div class="l"><span><b>12,830</b> of 20,000 reputation</span>`
    + `<span>next: ${TITLES.furrow[3]}</span></div>`
    + `<div class="g-bar" style="height:8px"><i style="width:64%"></i></div></div></div>`;

  /* Every quest row ends in a button that says exactly what pressing it does.
     That was the gap: a Deliver quest had a progress bar and no way to hand the
     items over. Four states, one per situation:
       Claim         the quest is finished, take the rewards
       Hand in 60    you are holding all 60, press to give them up
       Need 19 more  you are short — disabled, and nothing has been taken
       Skip          still working on it, swap this quest for another        */
  const QS = [
    { t:'Harvest 120 crops', s:'Gather &middot; finished', a:120, b:120, done:1,
      rep:'400', xp:'18,400', tok:'8', btn:'Claim', cls:'pri' },
    { t:'Deliver 60 Wildberries', s:'Deliver &middot; you are holding all 60', a:60, b:60, hold:1,
      rep:'120', xp:'5,200', tok:'3', btn:'Hand in 60', cls:'pri' },
    { t:'Harvest 40 Moonflower', s:'Gather &middot; your helper counts toward it', a:6, b:40,
      rep:'1,200', xp:'56,000', tok:'25', btn:'Skip', cls:'' },
  ];
  const questRow = q => {
    const pct = Math.round(q.a / q.b * 100);
    const count = q.hold ? `you hold <b>${q.a}</b> of ${q.b}` : `<b>${q.a}</b> of ${q.b}`;
    return `<div class="q-row${q.done ? ' done' : ''}${q.hold ? ' ready' : ''}">`
      + `<div class="q-t"><b>${q.t}</b><i>${q.s}</i></div>`
      + `<div class="q-p"><div class="l"><span>${count}</span><span>${pct}%</span></div>`
      + `<div class="g-bar"><i style="width:${pct}%"></i></div></div>`
      + `<div class="q-rw"><span class="rwc rep"><svg><use href="#s-star"/></svg>${q.rep}</span>`
      + `<span class="rwc xp"><svg><use href="#s-wheat"/></svg>${q.xp} xp</span>`
      + `<span class="rwc tok"><svg><use href="#s-token"/></svg>${q.tok}</span></div>`
      + `<span class="g-btn ${q.cls}">${q.btn}</span></div>`;
  };
  const quests = QS.map(questRow).join('');

  /* the four button states, on their own, because this is the bit that was missing */
  const STATES = [
    ['Claim','pri','A Kill, Gather or Make quest that has finished. Press it and the rewards land.'],
    ['Hand in 60','pri','A Deliver quest, and you are holding all sixty. Press it and the items leave your satchel.'],
    ['Need 19 more','off','A Deliver quest you are short on. Greyed out, and <b>nothing has been taken from you</b>.'],
    ['Skip','','Any quest you are still working on. Swaps it for a different one, once a day per guild.'],
  ];
  const states = STATES.map(s => `<div class="stbox"><span class="g-btn ${s[1]}">${s[0]}</span>`
    + `<p>${s[2]}</p></div>`).join('');

  /* Titles, not "Rank N". The number is still there for sorting, but what the
     player sees is what the Furrow calls someone at that standing. */
  const RK = [
    [TITLES.furrow[0],'joined','You can hire a farm helper','have','&#10003;'],
    [TITLES.furrow[1],'1,500 rep','Your helper harvests patches that are ready','have','&#10003;'],
    [TITLES.furrow[2],'6,000 rep','+4% crop yield, for you and your helper','have','&#10003;'],
    [TITLES.furrow[3],'20,000 rep','Your helper replants, and sows empty patches','now','64%'],
    [TITLES.furrow[4],'55,000 rep','A second helper slot','','locked'],
    [TITLES.furrow[5],'150,000 rep','Your helper tends patches so crops grow faster','','locked'],
  ];
  const ranks = RK.map(r => `<div class="r-row ${r[3]}"><div class="r-k"><b>${r[0]}</b><s>${r[1]}</s></div>`
    + `<div class="r-d">${r[2]}</div><div class="r-v">${r[4]}</div></div>`).join('');

  const SH = [
    ['s-wheat','Farm helper','Works your patches while you do something else.','40','Owned','off'],
    ['s-star','Train your helper','+10% output. Bought 1 of 3 times.','60','Buy','pri'],
    ['s-wheat','Sack of seeds','20 mixed seeds, including ones you have not unlocked.','15','Buy','pri'],
    ['s-book','Study notes','One hour of Farming XP, straight away.','120','Buy','pri'],
  ];
  const shopItem = s => `<div class="s-item"><div class="st"><svg><use href="#${s[0]}"/></svg><b>${s[1]}</b></div>`
    + `<div class="sd">${s[2]}</div><div class="sp"><span class="pr"><svg><use href="#s-token"/></svg>${s[3]}</span>`
    + `<span class="g-btn ${s[5]}">${s[4]}</span></div></div>`;
  const shop = SH.map(shopItem).join('');
  const shop2 = SH.slice(0, 2).map(shopItem).join('');

  const total = crestBytes + hallBytes;
  let html = fs.readFileSync(path.join(__dirname, 'pages-template.html'), 'utf8')
    .replace('{{IMGCSS}}', imgCSS)
    .replace('{{CRESTS}}', crests)
    .replace('{{HALLS}}', halls)
    .replace('{{LIST_A}}', listA)
    .replace('{{LIST_B}}', listB)
    .replace('{{LIST_C}}', rows(10))
    .replace('{{LIST_D}}', rows(10))
    .replace('{{HALL_HERO}}', hallHero)
    .replace(/\{\{FURROW_ICON\}\}/g, furrowIcon)
    .replace(/\{\{D_HERO\}\}/g, dHero)
    .replace(/\{\{QUESTS\}\}/g, quests)
    .replace(/\{\{RANKS\}\}/g, ranks)
    .replace('{{STATES}}', states)
    .replace('{{SHOP}}', shop)
    .replace('{{SHOP2}}', shop2)
    .replace(/\{\{CRESTKB\}\}/g, Math.round(crestBytes / G.length / 1024))
    .replace(/\{\{HALLKB\}\}/g, kb(hallBytes))
    .replace(/\{\{TOTALKB\}\}/g, kb(total))
    .replace(/\{\{PCT\}\}/g, (total / (5.96 * 1024 * 1024) * 100).toFixed(1));

  const left = html.match(/\{\{[A-Z_]+\}\}/g);
  if (left) throw new Error('unfilled placeholders: ' + [...new Set(left)].join(', '));

  fs.writeFileSync(OUT, html);
  console.log('  page ' + kb(html.length) + 'KB -> ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });

/* Build _guildsimple/preview.html.
 *
 * Deliberately small and deliberately switcher-free: the cooking preview came out
 * at 1.7MB behind a tab bar and did not load for Jordan, so every shot here is
 * stacked inline at a lower encode and nothing needs a click to be seen.
 */
const path = require('path'), fs = require('fs');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(path.join(KIT, 'node_modules/puppeteer-core'));
const CHROME = path.join(KIT, 'browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe');

const SHOTS = [
  { id: 'a', tag: 'A · smallest', title: 'The Hiring Hall', h: '580px',
    why: `One screen. A row of slots, one helper each, each working one gathering skill at a
          quarter of your own rate while you do something else. Hire with gold, change their
          skill with a dropdown, dismiss them. That is the entire feature.`,
    adds: ['helper', 'slot'],
    note: `Three nouns total and no second currency. If guilds never get past this, it is
           still a complete thing rather than half of something.` },
  { id: 'b', tag: 'B · one step further', title: 'Three Guilds', h: '1046px',
    why: `A, plus the one thing that makes them guilds rather than a staffing agency: which
          guild a helper belongs to. Three guilds, each owning a group of skills, each with a
          rank that rises on its own as its helpers work. Every rank gives that guild's skills
          a small bonus — yours as well as theirs.`,
    adds: ['helper', 'slot', 'guild', 'rank'],
    note: `Exactly one new noun on top of A, and it is a bar that fills itself. Nothing to
           spend it on, nothing to choose. The cost is height: 1046px against A's 580px.` },
  { id: 'c', tag: 'C · a reason to come back', title: 'Helpers and One Job', h: '690px',
    why: `A, plus a single standing request — not a board. One job at a time, chosen for you,
          refreshing weekly. Your helpers' output counts toward it on its own, so it is
          something to check rather than something to manage.`,
    adds: ['helper', 'slot', 'job'],
    note: `The reward is gold and the occasional helper level, so it feeds the system already
           here instead of introducing a second currency to track.` },
];

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.goto('data:text/html,<body>');
  const img = {};
  for (const s of SHOTS) {
    const raw = fs.readFileSync(path.join(__dirname, 'shots', s.id + '.png')).toString('base64');
    img[s.id] = await p.evaluate(async (raw) => {
      const i = new Image(); i.src = 'data:image/png;base64,' + raw; await i.decode();
      const W = 1180, sc = W / i.width;
      const c = document.createElement('canvas');
      c.width = W; c.height = Math.round(i.height * sc);
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
      return c.toDataURL('image/webp', 0.62);
    }, raw);
    console.log('  ' + s.id + '  ' + Math.round(img[s.id].length * 0.75 / 1024) + 'KB');
  }
  await b.close();

  const body = SHOTS.map((s, n) => `
  <section>
    <div class="shead"><span class="num">0${n + 1}</span><h2>${s.title}</h2>
      <span class="sub">${s.tag} &middot; panel ${s.h}</span></div>
    <p class="why">${s.why}</p>
    <p class="adds">New words a player has to learn:
      ${s.adds.map(w => `<b>${w}</b>`).join(' ')}</p>
    <div class="shot"><img alt="${s.title}" src="${img[s.id]}"></div>
    <p class="note">${s.note}</p>
  </section>`).join('');

  const html = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8')
    .replace('<!--SECTIONS-->', body);
  fs.writeFileSync(path.join(__dirname, 'preview.html'), html);
  console.log('preview.html  ' + Math.round(html.length / 1024) + 'KB');
})().catch(e => { console.error(e); process.exit(1); });

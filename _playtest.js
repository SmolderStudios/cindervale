#!/usr/bin/env node
/* Publish the current game to one of the update channels.
 *
 *   node _playtest.js                 push to playtest
 *   node _playtest.js demo            push to demo
 *   node _playtest.js --status        show every channel
 *
 * THREE channels, because three audiences move at different speeds:
 *
 *   root  /cindervale/           dev. Every push lands here immediately. This is
 *                                also the endpoint every pre-playtest install is
 *                                permanently pinned to, so it can never stop
 *                                being updated — see [[cindervale-rename]].
 *   /playtest/                   testers. Ahead of Steam, behind dev, moved by
 *                                hand so a half-finished change can be held back.
 *   /demo/                       the public browser demo the website links to.
 *                                Only ever moved when a build goes to STEAM, so
 *                                the free demo matches the paid product and never
 *                                shows unreleased work to the whole internet.
 *
 * A normal release touches ONLY the root files. Running this script is what
 * moves a channel, and it is the only thing that does.
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const CHANNELS = ['playtest', 'demo'];

const verOf = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')).version; } catch (e) { return null; } };
/* The suffix is part of the match on purpose. A playtest build published by
   _playtest-ui.js is stamped like `0.9.104-ui`; reading only [0-9.] truncated it
   to `0.9.104`, so the status table showed the channel carrying the same banner
   as live and gave no hint the rework was there at all. */
const stampOf = (p) => { try { return (fs.readFileSync(p, 'utf8').match(/mm-ver">v([0-9][0-9.a-z-]*)/) || [])[1] || null; } catch (e) { return null; } };
const read = (dir) => ({
  ver: verOf(path.join(root, dir, 'version.json')),
  html: stampOf(path.join(root, dir, 'cindervale.html'))
});

const live = { ver: verOf(path.join(root, 'version.json')), html: stampOf(path.join(root, 'cindervale.html')) };

if (process.argv.includes('--status')) {
  console.log('\n  channel    version.json   html banner');
  console.log('  ---------- -------------- -----------');
  console.log(`  live       ${String(live.ver).padEnd(14)} ${live.html}`);
  for (const c of CHANNELS) {
    const s = read(c);
    console.log(`  ${c.padEnd(10)} ${String(s.ver).padEnd(14)} ${s.html}`);
  }
  console.log();
  for (const c of CHANNELS) {
    const s = read(c);
    console.log(s.ver === live.ver
      ? `  ${c}: in sync with live`
      : `  ${c}: HELD at ${s.ver} — run \`node _playtest.js ${c}\` to move it`);
  }
  console.log();
  process.exit(0);
}

const channel = CHANNELS.includes(process.argv[2]) ? process.argv[2] : 'playtest';
const dir = path.join(root, channel);

if (!live.ver) { console.error('No version.json at repo root. Wrong directory?'); process.exit(1); }

// The wrapper only re-downloads when the version STRING differs, so a mismatched
// pair means players either never update or update to a wrong banner.
if (live.ver !== live.html) {
  console.error(`Refusing to publish: version.json says ${live.ver} but the HTML banner says ${live.html}.`);
  console.error('Bump both, then re-run.');
  process.exit(1);
}

/* The demo is the public storefront for a paid game, and a gate that lives in one
 * code path is a gate that can silently go missing. v0.9.61 shipped to /demo/
 * without the sailing XP cap (added at 0.9.75), so the free build handed out all
 * 26 islands and the whole shipwright ladder while Woodcutting stopped at 10 —
 * and nothing caught it for fourteen versions. Assert every known gate token is
 * present in the build being published before it is written.
 */
const DEMO_GATE_TOKENS = [
  ['_sailCap',          'sailing XP cap'],
  ['demoXpCap',         'skill XP cap'],
  ['DEMO_LEVEL_CAP',    'level cap constant'],
  ['DEMO_ZONES',        'zone allowlist'],
  ['demoCapHit',        'buy prompt'],
  ['_devSellTaps>=5&&!IS_DEMO', 'dev-panel gesture gate'],
];
if (channel === 'demo') {
  const src = fs.readFileSync(path.join(root, 'cindervale.html'), 'utf8');
  const missing = DEMO_GATE_TOKENS.filter(([t]) => !src.includes(t));
  if (missing.length) {
    console.error('Refusing to publish the demo: these gates are missing from the build —');
    for (const [t, why] of missing) console.error(`  ${t}  (${why})`);
    console.error('The demo is public. Fix the gates, then re-run.');
    process.exit(1);
  }
  console.log(`demo gate check: all ${DEMO_GATE_TOKENS.length} tokens present.`);
}

const before = read(channel).ver;
fs.mkdirSync(dir, { recursive: true });
// version.json LAST: until it changes the wrapper ignores the new HTML, so this
// order means a half-copied build is never advertised as ready.
fs.copyFileSync(path.join(root, 'cindervale.html'), path.join(dir, 'cindervale.html'));
fs.copyFileSync(path.join(root, 'version.json'), path.join(dir, 'version.json'));

console.log(`${channel} channel -> v${live.ver}  (was ${before || 'empty'})`);
if (channel === 'demo') console.log('NOTE: demo is public. Only move it when this build is going to Steam.');
console.log('Commit and push; it goes live in ~30s.');

#!/usr/bin/env node
/* Push the current game to the PLAYTEST channel.
 *
 *   node _playtest.js          copy cindervale.html + version.json into playtest/
 *   node _playtest.js --status show what each channel is serving
 *
 * Why a separate folder at all: the playtest wrapper polls
 * /cindervale/playtest/version.json, while the browser demo and every older
 * install poll /cindervale/version.json. Keeping them apart is what makes
 * "hold updates back from testers" possible without freezing the web demo or
 * breaking a normal release.
 *
 * So: a normal release touches ONLY the root files. Testers see nothing until
 * this script is run and pushed. Running it is the tap.
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const dir = path.join(root, 'playtest');

const verOf = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')).version; } catch (e) { return null; }
};
const stampOf = (p) => {
  try { return (fs.readFileSync(p, 'utf8').match(/mm-ver">v([0-9.]+)/) || [])[1] || null; }
  catch (e) { return null; }
};

const live = { ver: verOf(path.join(root, 'version.json')), html: stampOf(path.join(root, 'cindervale.html')) };
const test = { ver: verOf(path.join(dir, 'version.json')), html: stampOf(path.join(dir, 'cindervale.html')) };

if (process.argv.includes('--status')) {
  console.log('\n  channel    version.json   html banner');
  console.log('  ---------- -------------- -----------');
  console.log(`  live       ${String(live.ver).padEnd(14)} ${live.html}`);
  console.log(`  playtest   ${String(test.ver).padEnd(14)} ${test.html}`);
  console.log(test.ver === live.ver
    ? '\n  In sync — testers are current.\n'
    : `\n  HELD BACK — testers stay on ${test.ver} until this is run without --status.\n`);
  process.exit(0);
}

if (!live.ver) { console.error('No version.json at repo root. Wrong directory?'); process.exit(1); }

// The wrapper only re-downloads when the version STRING differs, so a mismatched
// pair here means testers either never update or update to the wrong banner.
if (live.ver !== live.html) {
  console.error(`Refusing to publish: version.json says ${live.ver} but the HTML banner says ${live.html}.`);
  console.error('Bump both, then re-run.');
  process.exit(1);
}

fs.mkdirSync(dir, { recursive: true });
// version.json LAST: until it changes the wrapper ignores the new HTML, so this
// order means a half-finished copy can never be advertised as ready.
fs.copyFileSync(path.join(root, 'cindervale.html'), path.join(dir, 'cindervale.html'));
fs.copyFileSync(path.join(root, 'version.json'), path.join(dir, 'version.json'));

console.log(`Playtest channel -> v${live.ver}  (was ${test.ver || 'empty'})`);
console.log('Commit and push; testers get it next time they open the game.');

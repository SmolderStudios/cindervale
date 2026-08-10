#!/usr/bin/env node
/* Publish the UI-REWORK build to the playtest channel.
 *
 *   node _playtest-ui.js                                  (after ./build.sh)
 *   node _playtest-ui.js path/to/cindervale-uipreview.html
 *
 * WHY THIS EXISTS SEPARATELY FROM _playtest.js. That script copies ROOT to a
 * channel — the plain game. Running it against playtest would silently replace
 * the rework with the stock UI, which is the opposite of what the channel is
 * for. The rework's source of truth is the patch set at C:/code/cindervale-ui-rework,
 * so its publish has to start from build/cindervale-uipreview.html instead.
 *
 * THE STAMP TRAP THIS CLOSES. The build is produced by patching the CURRENT root
 * game file, so it carries ROOT's mm-ver banner. Copying it to playtest/ without
 * re-stamping leaves the channel advertising a plain version string. Both halves
 * matter: the wrapper re-downloads on a plain string inequality against its
 * cached version.json, and the banner is what a tester reads back to you when
 * reporting a bug. Getting them out of step means either nothing downloads or
 * the report names the wrong build. Done by hand this was forgotten every time.
 *
 * WHO ACTUALLY SEES THIS. Only the `public` wrapper build polls /playtest/ —
 * main.js: BASE = CHANNEL === 'public' ? ORIGIN + '/playtest' : ORIGIN. Every
 * other install, including the one on this machine, polls root and will never
 * see anything published here.
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const DEFAULT_BUILD = 'C:/code/cindervale-ui-rework/build/cindervale-uipreview.html';
const src = process.argv[2] || DEFAULT_BUILD;
const dir = path.join(root, 'playtest');

const die = (m) => { console.error(m); process.exit(1); };
const stampOf = (s) => (s.match(/mm-ver">v([0-9][0-9.a-z-]*)/) || [])[1] || null;

/* ---- root must be internally consistent before anything is derived from it -- */
const liveVer = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).version;
const liveHtml = fs.readFileSync(path.join(root, 'cindervale.html'), 'utf8');
const liveStamp = stampOf(liveHtml);
if (liveVer !== liveStamp)
  die(`Refusing: root version.json says ${liveVer} but its banner says ${liveStamp}. Bump both.`);

/* ---- the build has to actually be the rework, not a stale copy of root ----- */
if (!fs.existsSync(src)) die(`No build at ${src}\nRun: cd C:/code/cindervale-ui-rework && ./build.sh`);
let out = fs.readFileSync(src, 'utf8');
if (out.length < 1_000_000) die(`Build at ${src} is only ${out.length} bytes — that is not a full game file.`);

const MARKERS = [
  ['CSS-99',        'the rework stylesheet'],
  ['sk-banner-glow','patch-ui9 banner accent layer'],
  ['cvarena-',      'patch-ui10 combat arena'],
];
const missing = MARKERS.filter(([t]) => !out.includes(t));
if (missing.length) {
  console.error('Refusing: this file does not look like the rework build —');
  for (const [t, why] of missing) console.error(`  missing ${t}  (${why})`);
  die('Rebuild with ./build.sh and try again.');
}

/* The build is patched FROM root, so it should carry root's stamp. If it does
   not, the build predates the current game file and would publish stale code. */
const buildStamp = stampOf(out);
if (buildStamp !== liveVer)
  die(`Refusing: the build carries banner v${buildStamp} but root is v${liveVer}.\n`
    + 'It was built against an older game file. Re-run ./build.sh.');

/* ---- re-stamp, then write; version.json LAST so a half-copy is never advertised */
const uiVer = liveVer + '-ui';
out = out.replace(/(mm-ver">v)[0-9][0-9.a-z-]*/, '$1' + uiVer);
if (stampOf(out) !== uiVer) die('Re-stamp failed — the mm-ver banner did not change.');

const before = (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'version.json'), 'utf8')).version; }
                        catch (e) { return null; } })();

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'cindervale.html'), out);
fs.writeFileSync(path.join(dir, 'version.json'), JSON.stringify({ version: uiVer }));

console.log(`playtest channel -> v${uiVer}  (was ${before || 'empty'})`);
console.log(`  ${Math.round(out.length / 1024)}K written from ${src}`);
console.log('\nValidate the STAMPED file, not just the build, then commit and push:');
console.log('  node _validate-playtest.js');

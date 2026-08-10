#!/usr/bin/env node
/* Run the mandatory harnesses against the PUBLISHED playtest file.
 *
 *   node _validate-playtest.js
 *
 * ./build.sh already validates build/cindervale-uipreview.html, so it is fair to
 * ask why this exists. Because that is not the file players get: _playtest-ui.js
 * rewrites the mm-ver banner on the way out, and the copy in playtest/ is what
 * the wrapper downloads. A one-string edit is exactly the kind of change that
 * feels too small to re-check — and the v0.9.103 backdrop bug was a one-string
 * edit that discarded a CSS rule and put a painting across the whole window.
 *
 * Both harnesses read `cindervale.html` from their own directory, so the file
 * is staged into a temp dir under that name rather than the harnesses being
 * taught about channels.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = __dirname;
const src = path.join(root, 'playtest', 'cindervale.html');
if (!fs.existsSync(src)) { console.error('No playtest/cindervale.html — run node _playtest-ui.js first.'); process.exit(1); }

const stage = path.join(root, '.validate-playtest');
fs.mkdirSync(stage, { recursive: true });
fs.copyFileSync(src, path.join(stage, 'cindervale.html'));
for (const h of ['_validate.js', '_audit_tests.js']) fs.copyFileSync(path.join(root, h), path.join(stage, h));

const ver = (fs.readFileSync(src, 'utf8').match(/mm-ver">v([0-9][0-9.a-z-]*)/) || [])[1];
const declared = JSON.parse(fs.readFileSync(path.join(root, 'playtest', 'version.json'), 'utf8')).version;
console.log(`playtest: banner v${ver}  version.json ${declared}`);
if (ver !== declared) { console.error('MISMATCH — the wrapper keys off version.json and testers read the banner.'); process.exit(1); }

let bad = 0;
for (const h of ['_validate.js', '_audit_tests.js']) {
  try {
    const out = execFileSync(process.execPath, [h], {
      cwd: stage, encoding: 'utf8',
      env: { ...process.env, NODE_PATH: path.join(root, 'node_modules') },
    });
    console.log('  ' + h.padEnd(17) + out.trim().split('\n').pop());
  } catch (e) {
    bad++;
    console.error('  ' + h.padEnd(17) + 'FAILED');
    console.error((e.stdout || '').split('\n').filter(l => /FAIL|Error/.test(l)).slice(0, 8).join('\n'));
  }
}
console.log(bad ? '\nplaytest build is NOT shippable' : '\nplaytest build passes both harnesses');
process.exit(bad ? 1 : 0);

/* Generated art for the ten slayer perk icons, replacing the hand-drawn SVGs.
 *
 *     node _iconart/perkart.js
 *
 * Same contract as the item pass (recipe.js): Z-Image-Turbo at cfg 2.4, one object
 * filling the frame, value-inverse backdrop so the key-out works, and the two style
 * directions so there is something to choose between.
 *
 * These render at 30px on the shop card — twice the item icons' 15px, but still far
 * too small for detail. Silhouette first, one object, strong value separation.
 *
 * Subjects mirror the SVGs they replace, so the swap does not change what each perk
 * LOOKS like, only how it is drawn.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { session, gen, dupeCheck } = require('./swarm');
const { STYLES, GEN, buildPrompt, negFor } = require('./recipe');

const OUT = path.join(__dirname, 'perkraw');

const S = (id, p, opt) => Object.assign({ id, p }, opt || {});
const SUBJECTS = [
  S('slp_scholar',   'A single open leather-bound tome lying flat, one dark red blood drop on the open page'),
  S('slp_warpath',   'A single tattered war banner on a short spear shaft, deep red cloth with a blunt point'),
  S('slp_skinner',   'A single curved skinning knife with a worn wooden handle, blade sweeping to a hooked point', { pale: true }),
  S('slp_frenzy',    'A single snarling open maw seen head on, dark red gums and long white fangs'),
  S('slp_quarter',   'A single round brass seal stamped with a star, deep red wax under it'),
  S('slp_tithe',     'A single short stack of gold coins with one dark red blood drop falling onto the top coin'),
  S('slp_hound',     'A single hound head in profile, ears back, jaws parted, dark fur with an ember eye'),
  S('slp_shortlist', 'A single rolled parchment list with three ruled lines and one heavy red line struck through it', { pale: true }),
  S('slp_fortune',   'A single carved bone six sided die resting on one corner, dark pips', { pale: true }),
  S('slp_relentless','A single anatomical heart in deep red with a bright pulse line running across it'),
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const session_id = await session();
  const styles = Object.keys(STYLES);
  const jobs = [];
  for (const s of SUBJECTS) for (const st of styles) jobs.push({ s, st });
  console.log(SUBJECTS.length + ' perks x ' + styles.length + ' styles = ' + jobs.length + ' images');

  let ok = 0;
  for (let i = 0; i < jobs.length; i++) {
    const { s, st } = jobs[i];
    const name = s.id + '__' + st;
    process.stdout.write(String(i + 1).padStart(2) + '/' + jobs.length + ' ' + name.padEnd(26));
    const t0 = Date.now();
    try {
      const buf = await gen(session_id, Object.assign({}, GEN, {
        prompt: buildPrompt(s, st), negativeprompt: negFor(s), seed: -1,
      }));
      fs.writeFileSync(path.join(OUT, name + '.png'), buf);
      ok++;
      console.log(((Date.now() - t0) / 1000).toFixed(1) + 's');
    } catch (e) { console.log('ERROR ' + e.message.slice(0, 70)); }
  }
  console.log('\n' + ok + '/' + jobs.length + ' -> ' + OUT);
  dupeCheck(OUT);
})().catch(e => { console.error(e); process.exit(1); });

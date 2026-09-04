/* Four takes on the leg slot, side by side, so Jordan picks rather than me guessing.
 *
 *     node _iconart/legvars.js
 *
 * Everything learned narrowing this down is baked into all four:
 *   - never the word ANKLE. That is what summoned a sabaton, not "greave" or
 *     "shin" — saying "no feet" never worked because an absence is not a shape.
 *   - the lower end always gets a POSITIVE shape ("straight cut edge").
 *   - keep some armour language or it comes back as two blank curved sheets.
 *
 * What varies is only how the plate is decorated, since that is the open question.
 * Writes to legvar_raw/ and legvar_cut/ so nothing in the real pipeline is touched.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { session, gen } = require('./swarm');
const { GEN, buildPrompt, negFor } = require('./recipe');

const OUT = path.join(__dirname, 'legvar_raw');
const COLOUR = 'warm brown gold bronze';
const NEG = 'boots, shoes, footwear, feet, toes, boot toe, ankle boot, trousers, jeans, ' +
  'full suit of armour, whole body, torso, chest plate, helmet, person, standing figure';

const VARIANTS = [
  ['knee_top',  'each with a rounded knee guard at the very top edge, tapering to a straight cut edge at the bottom'],
  ['banded',    'each built from three overlapping horizontal bands, straight cut edge at the bottom'],
  ['ridged',    'each a tall tapering plate with a raised centre ridge and a flared cuff at the top, straight cut edge at the bottom'],
  ['strapped',  'each a tall curved plate crossed by two leather straps with buckles, straight cut edge at the bottom'],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const sid = await session();
  for (const [key, detail] of VARIANTS) {
    const subject = {
      id: 'legvar_' + key,
      p: 'A single pair of matching armour plates standing upright side by side, ' + detail + ', ' + COLOUR,
      neg: NEG,
    };
    process.stdout.write(key.padEnd(10));
    const t0 = Date.now();
    const buf = await gen(sid, Object.assign({}, GEN, {
      prompt: buildPrompt(subject, 'painted'),
      negativeprompt: negFor(subject),
      seed: -1,
    }));
    fs.writeFileSync(path.join(OUT, 'legvar_' + key + '__painted.png'), buf);
    console.log(((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  console.log('\n' + VARIANTS.length + ' variants -> ' + OUT);
  console.log('now:  CVRAW=legvar_raw CVCUT=legvar_cut node _iconart/key.js');
})().catch(e => { console.error(e); process.exit(1); });

/* Generate item icon art, two style directions per item.
 *
 *     node _iconart/gen.js                 everything in subjects.js
 *     node _iconart/gen.js --probe         a 6 item cross-section, both styles
 *     node _iconart/gen.js --family bars   one family
 *     node _iconart/gen.js --only iron_bar,coal
 *     node _iconart/gen.js --resume        skip anything already on disk
 *
 * Writes raw/<id>__<style>.png. Nothing here touches E:/SwarmUI/Output: swarm.gen
 * uses donotsave and returns the bytes inline. A concurrent batch in another
 * session cannot poison this one, which is exactly how a 52 image IRONGATE run
 * came back as somebody else's mushrooms.
 *
 * Progress is written to raw/_log.json after every image so a long unattended run
 * can be inspected — and resumed — without reading the console back.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { session, gen, dupeCheck } = require('./swarm');
const { ALL, FAMILIES } = require('./subjects');
const { STYLES, NEG, GEN, buildPrompt } = require('./recipe');

const OUT = path.join(__dirname, 'raw');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const has = k => process.argv.includes(k);

const PROBE = ['oak_log', 'iron_ore', 'iron_bar', 'raw_trout', 'bloodcap', 'cut_ruby'];

function pick() {
  if (has('--probe')) return ALL.filter(s => PROBE.includes(s.id));
  const fam = arg('--family');
  if (fam) { if (!FAMILIES[fam]) throw new Error('families: ' + Object.keys(FAMILIES).join(', ')); return FAMILIES[fam]; }
  const only = arg('--only');
  if (only) { const set = new Set(only.split(',')); return ALL.filter(s => set.has(s.id)); }
  return ALL;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const subjects = pick();
  const styles = Object.keys(STYLES);
  const jobs = [];
  for (const s of subjects) for (const st of styles) jobs.push({ s, st });

  const resume = has('--resume');
  const todo = jobs.filter(j => !(resume && fs.existsSync(path.join(OUT, j.s.id + '__' + j.st + '.png'))));
  console.log(`${subjects.length} items x ${styles.length} styles = ${jobs.length} images` +
    (resume ? `  (${jobs.length - todo.length} already on disk, ${todo.length} to do)` : ''));

  const session_id = await session();
  const log = [];
  const logPath = path.join(OUT, '_log.json');
  let okN = 0, failN = 0;
  const t00 = Date.now();

  for (let i = 0; i < todo.length; i++) {
    const { s, st } = todo[i];
    const name = s.id + '__' + st;
    const t0 = Date.now();
    process.stdout.write(String(i + 1).padStart(3) + '/' + todo.length + ' ' + name.padEnd(30));
    try {
      const buf = await gen(session_id, Object.assign({}, GEN, {
        prompt: buildPrompt(s, st), negativeprompt: NEG, seed: -1,
      }));
      fs.writeFileSync(path.join(OUT, name + '.png'), buf);
      const secs = (Date.now() - t0) / 1000;
      okN++;
      log.push({ name, id: s.id, style: st, bytes: buf.length,
        md5: crypto.createHash('md5').update(buf).digest('hex'), secs: +secs.toFixed(1) });
      console.log(secs.toFixed(1) + 's  ' + (buf.length / 1024).toFixed(0) + 'KB');
    } catch (e) {
      failN++;
      log.push({ name, id: s.id, style: st, error: e.message });
      console.log('ERROR ' + e.message.slice(0, 90));
    }
    fs.writeFileSync(logPath, JSON.stringify({
      startedMinsAgo: +((Date.now() - t00) / 60000).toFixed(1),
      done: i + 1, total: todo.length, ok: okN, failed: failN, log,
    }, null, 1));
  }

  const mins = ((Date.now() - t00) / 60000).toFixed(1);
  console.log(`\n${okN} ok, ${failN} failed, ${mins} min -> ${OUT}`);
  dupeCheck(OUT);   // aliasing is silent; prove the batch is actually distinct
})().catch(e => { console.error(e); process.exit(1); });

/* Generated art for the Slayer panel — three places it could go, so Jordan can
 * see the options rather than one guess.
 *
 *     node _iconart/slayerart.js
 *
 *   masters  three portraits, the biggest visual win: the master rows are the
 *            largest cards in the panel and carry a 23px glyph today
 *   banner   a wide strip for the panel head, the way the guild cards use a
 *            painted scene
 *   family   the eight monster families the Mark attunes to, currently text buttons
 *
 * Same recipe as the item pass (Z-Image-Turbo, cfg 2.4, donotsave) — see
 * _iconart/recipe.js for why each of those is what it is. Wider aspect here
 * because these are cards and strips, not square icons.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { session, gen, dupeCheck } = require('./swarm');
const { NEG, MODEL } = require('./recipe');

const OUT = path.join(__dirname, 'slayer');

const PAINTED = ', stylised painted dark-fantasy game art, visible brush strokes, muted earthy'
  + ' palette with ember-orange light, dramatic rim light, painterly not photoreal';

const JOBS = [
  /* ── Slayer Master portraits. Chest-up so they read in a short card row. ── */
  { id: 'master_novice', w: 768, h: 512,
    p: 'A grizzled old bounty clerk in a lamplit guild office, leaning over a desk of'
     + ' pinned notices, quill in hand, plain leather jerkin, chest up portrait' },
  { id: 'master_expert', w: 768, h: 512,
    p: 'A scarred veteran hunter in worn chainmail and a wolfskin cloak, arms crossed,'
     + ' a rack of blades behind her, chest up portrait' },
  { id: 'master_general', w: 768, h: 512,
    p: 'A towering armoured warlord in blackened plate with a horned helm under one arm,'
     + ' braziers burning behind him, chest up portrait' },

  /* ── Panel banner. Wide, no focal point, text sits on top of it. ── */
  { id: 'banner_board', w: 1344, h: 448,
    p: 'A weathered bounty board of nailed parchment notices in a dim stone guildhall,'
     + ' one lantern burning, seen straight on, filling the frame edge to edge' },
  { id: 'banner_table', w: 1344, h: 448,
    p: 'A war table strewn with maps, daggers and monster trophies, lit by a low lantern,'
     + ' seen from above at a shallow angle, filling the frame edge to edge' },

  /* ── The eight families the Mark can attune to. ── */
  { id: 'fam_vermin',    w: 512, h: 512, p: 'A single snarling giant rat head emblem, dark fantasy heraldry' },
  { id: 'fam_arachnid',  w: 512, h: 512, p: 'A single menacing spider emblem seen from above, dark fantasy heraldry' },
  { id: 'fam_goblinoid', w: 512, h: 512, p: 'A single grinning goblin skull emblem with crude tusks, dark fantasy heraldry' },
  { id: 'fam_undead',    w: 512, h: 512, p: 'A single cracked human skull emblem with a faint blue glow in the sockets, dark fantasy heraldry' },
  { id: 'fam_beast',     w: 512, h: 512, p: 'A single howling wolf head emblem, dark fantasy heraldry' },
  { id: 'fam_giant',     w: 512, h: 512, p: 'A single heavy ogre skull emblem with a broken tusk, dark fantasy heraldry' },
  { id: 'fam_draconic',  w: 512, h: 512, p: 'A single horned dragon head emblem in profile, ember glow at the jaw, dark fantasy heraldry' },
  { id: 'fam_demon',     w: 512, h: 512, p: 'A single horned demon skull emblem wreathed in low flame, dark fantasy heraldry' },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const session_id = await session();
  console.log(JOBS.length + ' images');
  let ok = 0;
  for (let i = 0; i < JOBS.length; i++) {
    const j = JOBS[i];
    process.stdout.write(String(i + 1).padStart(2) + '/' + JOBS.length + ' ' + j.id.padEnd(18));
    const t0 = Date.now();
    try {
      const buf = await gen(session_id, {
        prompt: j.p + PAINTED, negativeprompt: NEG, model: MODEL,
        width: j.w, height: j.h, steps: 12, cfgscale: 2.4, seed: -1,
      });
      fs.writeFileSync(path.join(OUT, j.id + '.png'), buf);
      ok++;
      console.log(((Date.now() - t0) / 1000).toFixed(1) + 's  ' + (buf.length / 1024).toFixed(0) + 'KB');
    } catch (e) { console.log('ERROR ' + e.message.slice(0, 80)); }
  }
  console.log('\n' + ok + '/' + JOBS.length + ' -> ' + OUT);
  dupeCheck(OUT);
})().catch(e => { console.error(e); process.exit(1); });

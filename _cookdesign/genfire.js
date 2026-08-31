/* Hearth plate art for concept B's fireplate.
 *
 * The plate is a 236x200 slot at the left of the hearth band, and the fire has to
 * be the only light source in it so the artwork dies into the panel's own black at
 * the edges instead of ending on a visible seam. That is the whole art direction:
 * a lit subject on a value-inverse (near-black) backdrop, which is the same recipe
 * the monster portraits landed on.
 *
 * Three states, because the fire already HAS three: burning / banked / cold.
 *
 * Uses irongate/tools/swarm.js — donotsave:true, so nothing races over
 * E:/SwarmUI/Output and no batch can collect another session's images.
 */
const fs = require('fs'), path = require('path');
const { session, gen } = require('C:/code/irongate/tools/swarm.js');

const OUT = path.join(__dirname, 'fire');
fs.mkdirSync(OUT, { recursive: true });

const MODEL = 'ZImage/SwarmUI_Z-Image-Turbo-FP8Mix.safetensors';

/* Painted and textured, never "flat vector" — that phrasing is for 20px icons and
 * it turns atmosphere into a logo. Every prompt names the darkness explicitly,
 * because Turbo's default is a lit studio backdrop. */
const NEG = 'photograph, people, person, hands, face, text, watermark, signature, '
  + 'frame, border, vignette, picture frame, painting on a wall, ui, icon, logo, '
  + 'flat vector, cartoon, chibi, cute, bright daylight, blue sky, white background, '
  + 'grey background, room, furniture, plates, food, cooking pot, kettle, symmetrical';

const BASE = 'dark fantasy game art, painted, textured, muted desaturated palette, '
  + 'the fire is the only light source, deep black shadows filling the corners, '
  + 'no visible walls, close crop, viewed slightly from above';

const JOBS = [
  { id: 'burn-1', prompt: 'a roaring open hearth fire of split logs on blackened stone, tall orange flames, glowing embers scattered at the base, ' + BASE },
  { id: 'burn-2', prompt: 'a strong cooking fire burning between rough hearthstones, split oak logs stacked in a cone, bright yellow-orange flame licking upward, sparks rising into darkness, ' + BASE },
  { id: 'burn-3', prompt: 'a low steady wood fire on a bed of orange coals, blackened iron firedogs either side, warm rim light on the stone, ' + BASE },
  { id: 'bank-1', prompt: 'a bed of banked orange embers under a layer of grey ash, faint smoke, one unburnt log resting on top, almost no flame, ' + BASE },
  { id: 'bank-2', prompt: 'glowing coals dying down in a stone hearth, dull red heat under ash, thin wisp of smoke, deep shadow, ' + BASE },
  { id: 'cold-1', prompt: 'a cold dead hearth, grey ash and charred black log ends on stone, no fire, no glow, lit only by weak cold ambient light, ' + BASE },
  { id: 'cold-2', prompt: 'unlit split firewood stacked on a soot-blackened stone hearth, cold grey ash, no flame, dim and lifeless, ' + BASE },
];

(async () => {
  const sid = await session();
  console.log('session ok, ' + JOBS.length + ' plates');
  for (const j of JOBS) {
    const t0 = Date.now();
    try {
      /* 640x544 — the plate is 236x200, so this is ~2.7x for a retina-clean
         downscale with room to crop. Turbo settings: 8 steps, cfg 1.5. */
      const buf = await gen(sid, {
        prompt: j.prompt, negativeprompt: NEG, model: MODEL,
        width: 640, height: 544, steps: 8, cfgscale: 1.5, seed: -1,
      });
      fs.writeFileSync(path.join(OUT, j.id + '.png'), buf);
      console.log('  ' + j.id + '  ' + Math.round(buf.length / 1024) + 'KB  ' + Math.round((Date.now() - t0) / 1000) + 's');
    } catch (e) {
      console.log('  ! ' + j.id + ': ' + e.message);
    }
  }
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });

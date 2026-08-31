/* Art for the guild pages: ten guild emblems and two wide hall backdrops.
 *
 * Emblems are heraldry, not icons and not scenes — a carved-and-cast badge on
 * black. That sits between the two recipes that already work here: the flat-icon
 * wording collapses a crest into a logo, and the painted-scene wording gives it a
 * background it does not want. So: "carved wood and tarnished brass, centred,
 * symmetrical, solid black" and let the subject carry it.
 *
 * Backdrops are the opposite — painted interiors, lit from one source, edges dying
 * to black so a banner can fade into the panel with no seam.
 *
 * donotsave:true, so nothing races over E:/SwarmUI/Output.
 */
const fs = require('fs'), path = require('path');
const { session, gen } = require('C:/code/irongate/tools/swarm.js');

const OUT = path.join(__dirname, 'art');
fs.mkdirSync(OUT, { recursive: true });
const MODEL = 'ZImage/SwarmUI_Z-Image-Turbo-FP8Mix.safetensors';

const CREST = 'heraldic guild emblem, carved dark wood and tarnished brass, aged metal, '
  + 'centered, symmetrical, filling the frame, solid pure black background, '
  + 'dark fantasy, muted desaturated palette, warm gold and iron, game asset';
const CNEG = 'photograph, text, letters, words, watermark, signature, frame, border, '
  + 'shield outline, banner ribbon, scroll, person, face, hands, landscape, scene, '
  + 'background objects, bright, pastel, neon, cute, chibi, 3d render, plastic';

const SCENE = 'dark fantasy game art, painted, textured, muted desaturated palette, '
  + 'lit by one warm light source, deep black shadows filling the corners and edges, '
  + 'wide establishing shot, no people';
const SNEG = 'photograph, people, person, face, hands, text, watermark, signature, '
  + 'frame, border, vignette, ui, icon, logo, flat vector, cartoon, bright daylight, '
  + 'blue sky, white background, modern, symmetrical';

const JOBS = [
  { id: 'legion',    w: 512, h: 512, neg: CNEG, p: 'two crossed longswords behind a heavy tower shield, ' + CREST },
  { id: 'quiethand', w: 512, h: 512, neg: CNEG, p: 'a single curved dagger behind an open palm, ' + CREST },
  { id: 'furrow',    w: 512, h: 512, neg: CNEG, p: 'a bound sheaf of wheat over a curved plough blade, ' + CREST },
  { id: 'timber',    w: 512, h: 512, neg: CNEG, p: 'a felling axe buried in a cut tree stump, growth rings showing, ' + CREST },
  { id: 'deepwater', w: 512, h: 512, neg: CNEG, p: 'a fish curled around a ship anchor, ' + CREST },
  { id: 'ashen',     w: 512, h: 512, neg: CNEG, p: 'a round alchemy flask inside a ring of laurel leaves, ' + CREST },
  { id: 'facet',     w: 512, h: 512, neg: CNEG, p: 'a large faceted cut gemstone held in metal claws, ' + CREST },
  { id: 'delvers',   w: 512, h: 512, neg: CNEG, p: 'two crossed pickaxes over a miners lantern, ' + CREST },
  { id: 'emberforge',w: 512, h: 512, neg: CNEG, p: 'a blacksmith anvil with a hammer resting on it, ' + CREST },
  { id: 'night',     w: 512, h: 512, neg: CNEG, p: 'an old iron key crossed with a coin, a hooded lantern behind, ' + CREST },

  { id: 'hall-1', w: 1024, h: 384, neg: SNEG, steps: 22, cfg: 3.0,
    p: 'the interior of a great guild hall at night, long timber tables, iron chandeliers, '
     + 'a huge fireplace at the far end throwing all the light, ' + SCENE },
  { id: 'hall-2', w: 1024, h: 384, neg: SNEG, steps: 22, cfg: 3.0,
    p: 'a stone guild hall notice board covered in pinned parchment contracts, '
     + 'a lantern hanging beside it, ' + SCENE },
];

(async () => {
  const sid = await session();
  console.log('session ok, ' + JOBS.length + ' images');
  for (const j of JOBS) {
    const t0 = Date.now();
    try {
      const buf = await gen(sid, {
        prompt: j.p, negativeprompt: j.neg, model: MODEL,
        width: j.w, height: j.h,
        steps: j.steps || 8, cfgscale: j.cfg || 1.5, seed: -1,
      });
      fs.writeFileSync(path.join(OUT, j.id + '.png'), buf);
      console.log('  ' + j.id.padEnd(11) + Math.round(buf.length / 1024) + 'KB  '
        + Math.round((Date.now() - t0) / 1000) + 's');
    } catch (e) {
      console.log('  ! ' + j.id + ': ' + e.message);
    }
  }
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });

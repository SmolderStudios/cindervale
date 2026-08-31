/* Full-bleed guild art: the PLACE each guild works in, filling the whole frame.
 *
 * The first pass made heraldic emblems on black. At 44px they read as "a small
 * object floating on nothing", and in a card banner they leave most of the frame
 * empty. So this pass drops heraldry entirely: each guild gets an interior or a
 * location, edge to edge, no empty background to crop into.
 *
 * Wide 3:1, because that is the shape of a card banner. Warm single-source light
 * so they sit in the game's palette without recolouring.
 */
const fs = require('fs'), path = require('path');
const { session, gen } = require('C:/code/irongate/tools/swarm.js');

const OUT = path.join(__dirname, 'scenes');
fs.mkdirSync(OUT, { recursive: true });
const MODEL = 'ZImage/SwarmUI_Z-Image-Turbo-FP8Mix.safetensors';

const BASE = 'dark fantasy game art, painted, textured, muted desaturated palette, '
  + 'warm lantern and firelight, atmospheric, detail filling the entire frame '
  + 'edge to edge, no empty space, medieval';
const NEG = 'photograph, people, person, face, hands, crowd, text, letters, watermark, '
  + 'signature, frame, border, vignette, black background, empty background, '
  + 'ui, icon, logo, emblem, crest, flat vector, cartoon, cute, modern, '
  + 'bright daylight, blue sky, white background';

const JOBS = [
  { id:'legion',    p:'the inside of an armoury, racks of swords and spears, shields hung on stone walls, a burning brazier, ' + BASE },
  { id:'quiethand', p:'a candlelit back room, throwing knives laid out on dark cloth, hooded cloaks on pegs, shuttered window, ' + BASE },
  { id:'furrow',    p:'ploughed farmland at dusk, furrowed earth, a timber barn and haystacks, lanterns lit, ' + BASE },
  { id:'timber',    p:'a logging camp in deep forest, felled trunks stacked high, a sawpit, axes in stumps, ' + BASE },
  { id:'deepwater', p:'a fishing harbour at night, small boats at a wooden dock, nets hung to dry, lanterns on posts, ' + BASE },
  { id:'ashen',     p:'an alchemists workshop, shelves crowded with glass bottles, a bubbling still, dried herbs hanging, ' + BASE },
  { id:'facet',     p:'a jewellers workbench, cut gemstones and gold rings on a felt tray, tiny tools, a bright work lamp, ' + BASE },
  { id:'delvers',   p:'a deep mine tunnel, timber props, an ore cart on rails, lanterns hung along the wall, glittering ore seam, ' + BASE },
  { id:'emberforge',p:'a blacksmiths forge, glowing metal on the anvil, sparks flying, hammers and tongs on the wall, ' + BASE },
  { id:'night',     p:'a narrow night market alley, cloth stalls, hanging lanterns, crates and barrels, wet cobbles, ' + BASE },
];

(async () => {
  const sid = await session();
  console.log('session ok, ' + JOBS.length + ' scenes');
  for (const j of JOBS) {
    const t0 = Date.now();
    try {
      /* 3:1 and 22 steps at cfg 3.0 — the settings that hold a full scene together.
         Turbo's 8-step / cfg-1.5 preset is for isolated subjects and turns an
         interior into mush. */
      const buf = await gen(sid, {
        prompt: j.p, negativeprompt: NEG, model: MODEL,
        width: 1152, height: 384, steps: 22, cfgscale: 3.0, seed: -1,
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

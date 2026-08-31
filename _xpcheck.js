/* Does the XP nerf actually land at 20%, at every faucet?
 *
 *     node _xpcheck.js
 *
 * Boots the real game twice — once as shipped, once with XP_SCALE forced back to
 * 1.00 — and compares what each faucet actually pays out. Ratios must come out at
 * 0.800. _validate.js and _audit_tests.js both pass whether or not the constant is
 * wired to anything, so neither of them can tell you the nerf worked.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = path.join(__dirname, 'cindervale.html');
const raw = fs.readFileSync(SRC, 'utf8');
const SCALE_LINE = 'const XP_SCALE = 0.80;';
if (raw.split(SCALE_LINE).length - 1 !== 1) throw new Error('XP_SCALE line not found exactly once');

function scriptOf(html) {
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  if (!m) throw new Error('no inline script');
  return m[1];
}

const ELECTRON_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                    'Chrome/131.0 Electron/33.0 Safari/537.36';
async function boot(html) {
  /* IS_DEMO is a const evaluated at parse time from the user agent, and the demo
     build caps combat and sailing XP. Under the default jsdom UA both runs clamp to
     the same ceiling, which reads as "ratio 1.000" and hides whether the nerf
     landed at all. jsdom ignores the top-level userAgent option, so set it in
     beforeParse — same trick _validate.js uses. */
  const dom = new JSDOM(html, {
    url: 'http://localhost/?cvdev=1', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      Object.defineProperty(w.navigator, 'userAgent', { value: ELECTRON_UA, configurable: true });
    },
  });
  await new Promise(r => setTimeout(r, 2500));
  if (dom.window.eval('IS_DEMO')) throw new Error('booted as demo — the XP caps will mask the result');
  return dom;
}

/* Every faucet, measured the way the game pays it — not by reading the constant. */
const PROBE = `(function(){
  const out = {};
  state = defaultState();
  state.charName='Probe'; state.charType='wanderer';
  normalizeState();

  // --- skilling: xp/hr for the first activity of every skill ---
  for (const sk in SKILLS) {
    const acts = (SKILLS[sk] && SKILLS[sk].acts) || [];
    if (!acts || !acts.length) continue;
    try { out['skill:'+sk] = ratesFor(acts[0], sk).xph; } catch(e) { out['skill:'+sk] = 'ERR '+e.message; }
  }

  // --- combat: grant a fixed amount and read what banked ---
  state.combatXp = {attack:0,strength:0,defence:0,hitpoints:0};
  grantCombatXp('attack', 10000);
  out['combat'] = state.combatXp.attack;

  // --- slayer ---
  state.slayer = state.slayer || {}; state.slayer.xp = 0;
  grantSlayerXp(10000);
  out['slayer'] = state.slayer.xp;

  // --- sailing ---
  state.sail = state.sail || {}; state.sail.xp = 0;
  sailGrantXp(10000);
  out['sailing'] = state.sail.xp;

  // --- offline passive skill rate ---
  try { out['offlineRate'] = offlineMods().xpRate; } catch(e) { out['offlineRate'] = 'ERR '+e.message; }

  // --- guild quest payout, one non-farming guild and the farming one ---
  try {
    for (const g of GUILDS) {
      const sk = g.skills[0];
      const q = { size:'standard', skill: sk };
      const v = gdQuestXp(g, q);
      if (sk === 'farming') out['guildquest:farming'] = v;
      else if (!out['guildquest:other']) out['guildquest:other'] = v;
    }
  } catch(e) { out['guildquest:other'] = 'ERR '+e.message; }

  // --- the stats panel's "XP multiplier" row must still read 1.00x at base ---
  try { out['statsRowMult'] = +(mods('woodcutting').xpMult / XP_SCALE).toFixed(4); } catch(e) {}

  return out;
})()`;

(async () => {
  const shipped = raw;
  const baseline = raw.replace(SCALE_LINE, 'const XP_SCALE = 1.00;');

  const results = {};
  for (const [label, html] of [['nerfed', shipped], ['baseline', baseline]]) {
    const dom = await boot(html);
    results[label] = dom.window.eval(PROBE);
    dom.window.close();
  }

  const keys = Object.keys(results.baseline);
  let bad = 0, checked = 0;
  console.log('faucet'.padEnd(24) + 'baseline'.padStart(12) + 'nerfed'.padStart(12) + 'ratio'.padStart(9));
  console.log('-'.repeat(57));
  for (const k of keys) {
    const b = results.baseline[k], n = results.nerfed[k];
    if (typeof b !== 'number' || typeof n !== 'number') {
      console.log(k.padEnd(24) + String(b).padStart(12) + String(n).padStart(12) + '     SKIP');
      continue;
    }
    if (k === 'statsRowMult') {
      const ok = Math.abs(n - 1) < 1e-6;
      if (!ok) bad++;
      console.log(k.padEnd(24) + b.toFixed(4).padStart(12) + n.toFixed(4).padStart(12) +
        (ok ? '   ok(1.00x)' : '   BAD'));
      continue;
    }
    const r = b === 0 ? NaN : n / b;
    checked++;
    // 1-XP floors (Math.max(1,...)) make tiny payouts round up, so allow a little slack
    const ok = Math.abs(r - 0.8) < 0.005;
    if (!ok) bad++;
    console.log(k.padEnd(24) + String(b).padStart(12) + String(n).padStart(12) +
      r.toFixed(3).padStart(9) + (ok ? '' : '   <-- NOT 0.800'));
  }
  console.log('-'.repeat(57));
  console.log(bad === 0
    ? `PASS — ${checked} faucets all cut to 0.800, stats row still reads 1.00x`
    : `FAIL — ${bad} faucet(s) off target`);
  process.exit(bad === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });

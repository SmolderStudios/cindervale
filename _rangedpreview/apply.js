/* Apply the Ranged + Fletching slice to cindervale.html.
 *
 *     node _rangedpreview/apply.js          patch in place
 *     node _rangedpreview/apply.js --check  report only, write nothing
 *
 * Idempotent: it refuses to run twice by looking for its own marker. Every edit
 * asserts its anchor appears exactly once, so a rename upstream fails loudly here
 * rather than silently patching the wrong place or half the places.
 *
 * It builds the whole document in memory and writes ONCE, through a temp file and
 * a rename. The first version of this work was lost because a script opened the
 * game file for writing and then threw on a bad escape before writing a byte,
 * leaving 10 MB of zero. Never truncate the target to find out whether the edit
 * was going to work.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GAME = path.join(ROOT, 'cindervale.html');
const CHECK = process.argv.includes('--check');

/* core.autocrlf is true here, so a fresh `git checkout` hands back a CRLF working
   copy while the index holds LF. Every multi-line anchor below is written with LF,
   so normalise on the way in and write LF back out, which is what the file carries
   in the index and what the harnesses read. Without this the single-line edits land
   and the multi-line ones silently do not. */
let src = fs.readFileSync(GAME, 'utf8').replace(/\r\n/g, '\n');
if (src.indexOf('[JS-RANGED]') >= 0) {
  console.log('already applied (found the [JS-RANGED] marker) - nothing to do');
  process.exit(0);
}

/* Per-edit idempotence, not just whole-file. `git add -A` on an earlier commit
   swept in the first batch of this work, so some edits are already in HEAD and
   others are not. Skipping an edit whose result is already present means this can
   be run against a half-patched tree without either failing or double-applying. */
let n = 0, skipped = 0;
function edit(what, find, repl, already) {
  /* `already` is a short fragment proving the edit landed, for the cases where an
     earlier pass wrote a slightly different comment above the same code. */
  if (src.indexOf(already || repl) >= 0) { skipped++; return; }
  const hits = src.split(find).length - 1;
  if (hits !== 1) throw new Error(`${what}: anchor matched ${hits} times, expected 1`);
  src = src.replace(find, repl);
  n++;
}
function editAll(what, find, repl, expect) {
  if (src.indexOf(find) < 0 && src.indexOf(repl) >= 0) { skipped++; return; }
  const hits = src.split(find).length - 1;
  if (hits !== expect) throw new Error(`${what}: matched ${hits}, expected ${expect}`);
  src = src.split(find).join(repl);
  n++;
}

/* ── 1. the stat ───────────────────────────────────────────────────────────── */
/* Inserted BEFORE the hitpoints row so Ranged reads between Defence and Hitpoints,
   and so the anchor is a short line rather than a whole multi-line desc string. */
edit('COMBAT_STATS.ranged',
`  hitpoints: {name:'Hitpoints',`,
`  /* Ranged does the work of BOTH attack and strength when a bow or crossbow is
     held, which is why one ranged level is worth less than one attack level plus
     one strength level. See RANGED_HIT_LVL. */
  ranged:    {name:'Ranged',    icon:'🏹', desc:'Accuracy AND damage, for bows and crossbows only.\\nEach Ranged level adds +1.5 accuracy and +1.35 max hit; the arrow or bolt in your quiver adds +5 max hit per point of its strength.\\nOne level here does the job of an Attack level and a Strength level, so it is worth less than either. Every shot spends ammunition.'},
  hitpoints: {name:'Hitpoints',`);

/* ── 2. combat level ───────────────────────────────────────────────────────── */
edit('combatLevel',
`function combatLevel(){
  const a=cmbLvl('attack'), s=cmbLvl('strength'), d=cmbLvl('defence'), h=cmbLvl('hitpoints');
  return Math.max(1, Math.floor((a+s+d+h)/4));
}`,
`/* Combat level, with Ranged folded in (0.9.124).

   \`max\` and not a sum, for two reasons. A ranged character spends ONE stat where a
   melee character spends two, so doubling it is what puts the same play time on the
   same combat level. And because a fresh save has ranged at 1, \`ranged x 2\` is 2 and
   attack+strength always wins, so NO EXISTING CHARACTER'S COMBAT LEVEL MOVES. A
   summed formula would have handed every melee player a level for a stat they have
   never used. */
function combatLevel(){
  const a=cmbLvl('attack'), s=cmbLvl('strength'), d=cmbLvl('defence'), h=cmbLvl('hitpoints');
  const r=cmbLvl('ranged');
  return Math.max(1, Math.floor((Math.max(a+s, r*2)+d+h)/4));
}`, 'Math.max(a+s, r*2)');

/* ── 3. the quiver slot ────────────────────────────────────────────────────── */
edit('quiver body slot',
`  {slot:'weapon', label:'Weapon',  empty:SLOT_EMPTY.weapon},
  {slot:'shield', label:'Shield',  empty:SLOT_EMPTY.shield},`,
`  {slot:'weapon', label:'Weapon',  empty:SLOT_EMPTY.weapon},
  /* Quiver (0.9.124). Its own slot rather than sharing the shield's: bows are two
     handed so the shield is free anyway, but a crossbow is one handed and has to be
     able to hold both. */
  {slot:'quiver', label:'Quiver',  empty:SLOT_EMPTY.quiver},
  {slot:'shield', label:'Shield',  empty:SLOT_EMPTY.shield},`, "{slot:'quiver'");

edit('empty quiver icon',
`  const G = '#6e552c', F = '#6e552c1a';
  const wrap = b => \`<svg class="ev-icon" viewBox="0 0 64 64">\${b}</svg>\`;
  return {`,
`  const G = '#6e552c', F = '#6e552c1a';
  const wrap = b => \`<svg class="ev-icon" viewBox="0 0 64 64">\${b}</svg>\`;
  return {
    /* An open tube with three nocks over the lip, so an empty quiver slot reads as
       "arrows go here" and not as one more pouch. */
    quiver: wrap(
      \`<path d="M22 16 L46 20 L41 56 Q32 60 25 55 Z" fill="\${F}" stroke="\${G}" stroke-width="1.6" stroke-linejoin="round"/>\`
      +\`<path d="M22 28 L45 32 M23 42 L43 45" stroke="\${G}" stroke-width="1.1" opacity="0.7"/>\`
      +\`<path d="M26 16 L21 5 M32 17 L32 4 M39 18 L44 6" stroke="\${G}" stroke-width="1.5" stroke-linecap="round"/>\`
      +\`<path d="M19 7 L23 3 M30 6 L34 6 M42 8 L46 4" stroke="\${G}" stroke-width="1.2" stroke-linecap="round"/>\`),`, 'quiver: wrap(');

/* ── 4. ranged xp exists on every save shape ───────────────────────────────── */
edit('combatXp default',
`    combatXp:{attack:0,strength:0,defence:0,hitpoints:(typeof XP_CUM!=='undefined'&&XP_CUM[10])||0}, // hp starts at lvl 10`,
`    combatXp:{attack:0,strength:0,defence:0,ranged:0,hitpoints:(typeof XP_CUM!=='undefined'&&XP_CUM[10])||0}, // hp starts at lvl 10`);
editAll('combatXp fallbacks',
`state.combatXp={attack:0,strength:0,defence:0,hitpoints:0}`,
`state.combatXp={attack:0,strength:0,defence:0,ranged:0,hitpoints:0}`, 4);

/* ── 5. the skill joins the rail and the mods() prefix map ─────────────────── */
edit('SK_PFX',
`const SK_PFX={thieving:'th',woodcutting:'wc',mining:'mi',fishing:'fi',foraging:'fo',smithing:'sm',cooking:'co',alchemy:'al',firemaking:'fm',agility:'ag',jeweler:'jw',farming:'fa',crafting:'cr'};`,
`const SK_PFX={thieving:'th',woodcutting:'wc',mining:'mi',fishing:'fi',foraging:'fo',smithing:'sm',cooking:'co',alchemy:'al',firemaking:'fm',agility:'ag',jeweler:'jw',farming:'fa',crafting:'cr',fletching:'fl'};`);
edit('RAIL_GROUP',
`  smithing:'produce', cooking:'produce', alchemy:'produce', crafting:'produce',`,
`  smithing:'produce', cooking:'produce', alchemy:'produce', crafting:'produce', fletching:'produce',`);

/* ── 6. ammunition is not vendor trash ─────────────────────────────────────── */
edit('itemUseKind ammo',
`  /* A keepsake is not vendor trash. Nothing consumes Radcliff's Tally and no`,
`  /* Ammunition is spent, not sold. No recipe names an arrow, so without this it
     fell to 'none' and the tooltip told you to sell the thing you shoot. */
  if(it.ammo) return 'ammo';
  /* A keepsake is not vendor trash. Nothing consumes Radcliff's Tally and no`);
edit('ammo tooltip line',
`  } else if(!usages.length && _useKind==='keepsake'){`,
`  } else if(!usages.length && _useKind==='ammo'){
    html+=\`<div style="margin-top:5px;padding-top:5px;border-top:1px solid #3a2a17;font-size:calc(13px*var(--tscale));color:#a8c86a">\`
       +\`Ammunition. Sits in your quiver and is spent a shot at a time.</div>\`;
  } else if(!usages.length && _useKind==='keepsake'){`);

/* ── 7. the ranged combat helpers ──────────────────────────────────────────── */
edit('ranged helpers',
`/* Player accuracy: (attack lvl ×1.5 + gear atk ×3.5) × (1+atkBoost) × class. */
function playerAccuracy(){`,
`/* ── RANGED (0.9.124) ─────────────────────────────────────────────────────────
   Ranged does the work of BOTH attack and strength, so one ranged level has to be
   worth less than one attack level plus one strength level or ranged simply wins at
   equal play time. 1.35 against melee's 1.6 on damage, accuracy matched at 1.5.
   Provisional until _rangedsim.js says otherwise; see _rangedpreview/DESIGN.md. */
const RANGED_HIT_LVL = 1.35;
function usingRanged(){
  return typeof isRangedWeapon==='function' && isRangedWeapon(eqCombatWeapon());
}
function eqQuiver(){ return (state&&state.combatEquipped&&state.combatEquipped.quiver)||''; }
/* Leather is the ranged line and plate is not.

   Rather than adding a third array to LEATHER_TIERS and a penalty column to every
   metal piece, this reads what you are actually wearing: leather is flagged \`light\`
   where it is generated and costs nothing, and anything else with real defence costs
   ranged accuracy in proportion to how much of it there is. You CAN shoot in plate.
   You will just miss more, and the number moves as you swap pieces, which is the
   part a flat rule cannot do. Melee is untouched: the multiplier is 1 unless a bow
   or crossbow is held. */
const RANGED_PLATE_PER_DEF = 0.006;   // -0.6% ranged accuracy per point of heavy def
const RANGED_PLATE_FLOOR   = 0.55;    // a cost, never a wall
function rangedArmourMult(){
  if(!usingRanged()) return 1;
  const ce=state&&state.combatEquipped; if(!ce) return 1;
  let heavy=0;
  for(const slot in ce){
    if(slot==='weapon'||slot==='quiver') continue;
    const id=ce[slot], it=id&&ITEMS[id]; if(!it||it.light) continue;
    const cs=COMBAT_GEAR_STATS[id]; if(!cs) continue;
    heavy += cs.def||0;
  }
  return Math.max(RANGED_PLATE_FLOOR, 1 - heavy*RANGED_PLATE_PER_DEF);
}
/* The arrow or bolt in the quiver, but only if it is the kind this weapon fires.
   Loading bolts into a bow is not a small mistake, so it is not a small penalty:
   nothing loads and the shot does not happen. */
function readyAmmo(){
  const w=eqCombatWeapon(), q=eqQuiver();
  if(!w||!q||!ITEMS[w]||!ITEMS[q]) return null;
  if(!ITEMS[w].ranged || ITEMS[q].ammo!==ITEMS[w].ammo) return null;
  if((state.items[q]||0)<1) return null;
  return q;
}
function ammoStr(){ const a=readyAmmo(); return a?(ITEMS[a].ammoStr||0):0; }
/* Which stat a kill's XP goes to. It was this exact ternary copy-pasted into five
   places, so a sixth would have missed ranged in silence. */
function combatXpStat(){
  if(usingRanged()) return 'ranged';
  return (state.combatStyle==='strength'||state.combatStyle==='defence')?state.combatStyle:'attack';
}

/* Player accuracy: (attack lvl ×1.5 + gear atk ×3.5) × (1+atkBoost) × class.
   With a bow or crossbow the ranged level stands in for attack, and heavy armour
   costs you. */
function playerAccuracy(){`);

edit('accuracy uses ranged',
`  return Math.round((cmbLvl('attack')*COMBAT_P.ACC_LVL + cs.atk*COMBAT_P.ACC_GEAR) * (1 + (b.atkBoost||0)) * classAccuracyMult());`,
`  const lvl=usingRanged()?cmbLvl('ranged'):cmbLvl('attack');
  return Math.round((lvl*COMBAT_P.ACC_LVL + cs.atk*COMBAT_P.ACC_GEAR) * (1 + (b.atkBoost||0)) * classAccuracyMult() * rangedArmourMult());`);

edit('max hit uses ranged',
`  const bonusStr=(typeof shieldHpStrBonus==='function')?shieldHpStrBonus():0;   // Aegis HP-scaled shield-bash
  return Math.max(1, Math.round((cmbLvl('strength')*COMBAT_P.HIT_LVL + (cs.str+bonusStr)*COMBAT_P.HIT_GEAR) * (1 + (b.atkBoost||0)) * classMaxHitMult()));`,
`  const bonusStr=(typeof shieldHpStrBonus==='function')?shieldHpStrBonus():0;   // Aegis HP-scaled shield-bash
  /* A bow carries no strength of its own; the AMMUNITION does. A bow that also
     carried strength would stack with the arrow and put ranged over melee before
     the level coefficient was even considered. */
  if(usingRanged()){
    return Math.max(1, Math.round((cmbLvl('ranged')*RANGED_HIT_LVL + (cs.str+ammoStr())*COMBAT_P.HIT_GEAR)
      * (1 + (b.atkBoost||0)) * classMaxHitMult()));
  }
  return Math.max(1, Math.round((cmbLvl('strength')*COMBAT_P.HIT_LVL + (cs.str+bonusStr)*COMBAT_P.HIT_GEAR) * (1 + (b.atkBoost||0)) * classMaxHitMult()));`);

edit('weapon swing multiplier',
`  // Rogue class — 6% faster swings. Still floored so bars stay readable.
  return Math.max(COMBAT_MIN_SWING_MS, Math.round(base*classSwingMult()));`,
`  // Rogue class — 6% faster swings. Still floored so bars stay readable.
  /* A weapon may carry its own pace: a shortbow draws faster than a blade swings, a
     crossbow cranks slower. Applied here so every readout of swing time agrees. */
  const _w=(typeof eqCombatWeapon==='function')?eqCombatWeapon():'';
  const _wm=(_w&&ITEMS[_w]&&ITEMS[_w].swingMult)||1;
  return Math.max(COMBAT_MIN_SWING_MS, Math.round(base*classSwingMult()*_wm));`);

/* ── 8. every kill pays the right stat ─────────────────────────────────────── */
editAll('xp stat sites',
`const style=(state.combatStyle==='strength'||state.combatStyle==='defence')?state.combatStyle:'attack';`,
`const style=combatXpStat();`, 5);
edit('offline xp stat',
`  const style=cs.style||'attack';`,
`  /* A session saved before ranged existed has no style, and one saved WITH a bow
     stored the melee style it never used. Ask the weapon, fall back to the saved. */
  const style=(typeof combatXpStat==='function')?combatXpStat():(cs.style||'attack');`);

/* ── 9. the shot costs an arrow ────────────────────────────────────────────── */
edit('ammo consumption',
`  if(now-combat.youSwingStart>=combat.youSwingMs){
    combat.youSwingStart=now;`,
`  if(now-combat.youSwingStart>=combat.youSwingMs){
    combat.youSwingStart=now;
    /* ── the shot costs an arrow ──────────────────────────────────────────────
       The one thing that makes ranged a different game from melee. Checked here,
       before any damage is rolled, so a dry quiver never lands a free hit.

       Recovery is paid per shot as a chance NOT to consume, rather than banked and
       refunded when the fight ends. Same expected number of arrows, no per-fight
       bookkeeping, and it cannot desync if you retreat, die, close the game
       mid-swing, or get pulled into the next raid stage. */
    if(usingRanged()){
      const _am=readyAmmo();
      if(!_am){
        const _q=eqQuiver(), _w=eqCombatWeapon();
        stopCombatTimer(); combat.active=false;
        if(typeof refreshCombatTabIndicator==='function') refreshCombatTabIndicator();
        const _why = !_q ? 'Your quiver is empty.'
          : (ITEMS[_q]&&ITEMS[_w]&&ITEMS[_q].ammo!==ITEMS[_w].ammo)
            ? 'A '+ITEMS[_w].name+' does not fire '+ITEMS[_q].name+'.'
            : 'You are out of '+((ITEMS[_q]&&ITEMS[_q].name)||'ammunition')+'.';
        cmbLog('\\u2716 '+_why+' The fight stops.','miss');
        if(typeof toast==='function') toast(_why);
        renderCombat();
        return;
      }
      /* Salvager and Deep Quiver return ammunition; Endless Quiver is a flat free
         shot on top. Bolts recover nothing until Master Fletcher is bought. */
      let _rate = treeRank('fletching','fl_salvage')*0.06
                + treeRank('fletching','fl_gm_salv')*0.04
                + (treeRank('fletching','fl_endless')>0?0.05:0);
      if(ITEMS[_am].ammo==='bolt' && treeRank('fletching','fl_bolts')<1) _rate=0;
      if(Math.random() >= Math.min(0.85,_rate)){
        state.items[_am]=(state.items[_am]||0)-1;
        if(state.items[_am]<=0) delete state.items[_am];
      }
    }`);

/* ── 10. the two data blocks ───────────────────────────────────────────────── */
const SP = process.env.CV_RANGED_SRC || path.join(__dirname, 'src');
const b1 = fs.readFileSync(path.join(SP, 'ranged1.js'), 'utf8').replace(/^\s+/, '');
const b2 = fs.readFileSync(path.join(SP, 'ranged2.js'), 'utf8').replace(/^\s+/, '');
const RAID_ANCHOR = '/* ════ RAIDS (1.0.66)';
if (src.split(RAID_ANCHOR).length - 1 !== 1) throw new Error('raid anchor is not unique');
src = src.replace(RAID_ANCHOR, b1 + '\n' + b2 + '\n' + RAID_ANCHOR);
n += 2;

console.log(`${n} edits staged, ${skipped} already present, ${(src.length/1048576).toFixed(2)} MB`);
if (CHECK) { console.log('--check: nothing written'); process.exit(0); }

/* Write once, through a temp file, then rename. */
const tmp = GAME + '.tmp';
fs.writeFileSync(tmp, src, 'utf8');
fs.renameSync(tmp, GAME);
console.log('applied');

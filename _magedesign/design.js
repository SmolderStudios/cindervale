/* Magic for Cindervale: the design, as data.
 *
 * ONE source for every number in the proposal. Three things read it:
 *
 *     overlay.js   builds a working prototype inside the real game (no edit to
 *                  cindervale.html), which is what sim.js measures and shoot.js
 *                  photographs
 *     sim.js       the balance harness
 *     build.js     prints the tables in preview.html
 *
 * Nothing in here is in the game. It is a proposal.
 *
 * Every number below that sim.js has measured is marked MEASURED in the page.
 * Anything else is provisional and says so.
 */
(function (root) {
  'use strict';

  /* ── the stat ─────────────────────────────────────────────────────────────── */
  var STAT = {
    key: 'magic',
    HIT_LVL: 1.35,        // max hit per Magic level. Same as Ranged: one stat does two jobs.
    ACC_LVL: 1.5,         // read from COMBAT_P.ACC_LVL at run time; restated for the page only
    pctKey: 'magicDmg',   // Magic damage %, the twin of atkBoost and rangedStr
    flatKey: 'mpow'       // Magic Power, the twin of str and rstr. One point is 5 max hit.
  };

  /* ── the three styles, on the same three slots melee and ranged use ───────── */
  var STYLES = {
    attack:   { name: 'Focused', swing: 1.00, acc: 1.00, def: false,
                blurb: 'Steady casting. No bonus, no penalty.' },
    strength: { name: 'Swift',   swing: 0.88, acc: 0.90, def: false,
                blurb: 'Casts faster but hits less often. Uses runes faster too.' },
    defence:  { name: 'Warded',  swing: 1.08, acc: 1.00, def: true,
                blurb: 'Slower, and half the XP goes to Defence.' }
  };

  /* ── the four elements ────────────────────────────────────────────────────────
     Each one reuses an effect the combat tick already has, so no element needs a
     new timer, a new status or a new damage path:
       fire    foeStatus.burn      (weapon burn procs)
       frost   foeStatus.pin       (Pinning Shot's slow)
       storm   the pierce roll     (Plummet, Windcutter)
       shadow  the lifesteal line  (Lifeblood, Bloodthirst)                    */
  var ELEMENTS = [
    { k: 'fire',   n: 'Fire',   lvl: 1,  col: '#e0762f', word: 'burns',
      rider: { burn: 0.024 },
      line: 'A hit can set the monster on fire. It burns for 8 seconds.' },
    { k: 'frost',  n: 'Frost',  lvl: 12, col: '#7fb8d4', word: 'slows',
      rider: { chill: { chance: 0.30, slow: 0.25, ms: 6000 } },
      line: 'A hit can chill the monster. It attacks 25% slower for 6 seconds.' },
    { k: 'storm',  n: 'Storm',  lvl: 30, col: '#b9a4f0', word: 'cannot miss',
      rider: { pierce: 0.04 },
      line: '4% of casts cannot miss.' },
    { k: 'shadow', n: 'Shadow', lvl: 50, col: '#9a5ad0', word: 'heals you',
      rider: { leech: 0.03 },
      line: 'You heal for 3% of the damage you deal.' }
  ];
  var WEAK_MULT = 1.15, RESIST_MULT = 0.85;   // the same 15% a sword gets. One number.

  /* ── spells: four sizes of each element ───────────────────────────────────────
     Sixteen spells, Fire Bolt to Shadow Surge. The size is how many runes one cast
     spends. The rune decides the biggest spell it can power, and the Magic Power
     printed on the rune is what that biggest spell gets, so the peg to the arrow
     ladder holds exactly where it did. A smaller spell spends fewer runes and gets
     less of the rune:
         power = rune power x m(size) / m(biggest spell the rune powers), rounded
     The steps in `m` are about a tenth of a hit each, and gentle enough that a
     better rune is never worse at the same spell (a Char Bolt is not weaker than a
     Soot Bolt, a Forge Blast not weaker than a Kiln Blast, and so on up). */
  var SPELLS = [
    { k: 'bolt',  n: 'Bolt',  runes: 1, m: 1.0 },
    { k: 'blast', n: 'Blast', runes: 2, m: 1.5 },
    { k: 'wave',  n: 'Wave',  runes: 3, m: 2.0 },
    { k: 'surge', n: 'Surge', runes: 4, m: 2.6 }
  ];
  /* The biggest spell a rune powers, from its grade:
       Ash, Soot  |  Char, Cinder, Kiln  |  Forge, Crucible  |  Starfall, Sunder */
  function runeClass(t) { return t <= 2 ? 1 : t <= 5 ? 2 : t <= 7 ? 3 : 4; }
  function spellPower(pow, cls, size) {
    return size >= cls ? pow : Math.round(pow * SPELLS[size - 1].m / SPELLS[cls - 1].m);
  }

  /* ── weapon families ──────────────────────────────────────────────────────── */
  var FAMILIES = {
    /* `runes`: a wand takes one batch of the runes of its tier and a staff two */
    wand:  { label: 'Wand',  hands: 1, wclass: 'light', swingMult: 0.87, dmgMult: 1.00, atkMult: 1.00, logs: 2, runes: 40 },
    staff: { label: 'Staff', hands: 2, wclass: 'heavy', swingMult: 1.25, dmgMult: 1.44, atkMult: 1.00, logs: 4, runes: 80,
             crit: 0.06, critTier: 0.004 }
  };
  /* The sword ladder's Attack, tier 1 to 7. A wand and a staff are both exactly as
     accurate as the sword and the shortbow of their tier, and rune power is the
     arrow's strength, tier for tier. So a wand is a shortbow that casts 2% slower,
     and the 3% the burn from Fire adds on a long fight brings it back level.
     Pegging Magic to the bows is deliberate: theirs is the ladder _rangedsim.js has
     already tuned.

     A staff hits 44% harder and a wand casts 44% more often, which is the same
     damage in the same time. What it gets for the hand it gives up is crit: a wand
     is a light weapon and crits like a dagger (3.4% to 5.8% by tier), a staff
     carries its own, larger number. Crit is not part of the weapon-alone test, for
     any weapon, so that test stays honest; the Monte Carlo fights are where the
     staff is checked. */
  var SWORD_ATK = [3, 5, 8, 12, 17, 23, 30];

  /* Crafted ladder: the wood ladder, tier 1 to 7, same as bows. */
  var WOODS = [
    { k: 'pine',     n: 'Pine',       log: 'pine_log',     t: 1, rn: 1 },
    { k: 'oak',      n: 'Oak',        log: 'oak_log',      t: 2, rn: 12 },
    { k: 'ironbark', n: 'Ironbark',   log: 'ironbark_log', t: 3, rn: 26 },
    { k: 'ember',    n: 'Emberwood',  log: 'ember_log',    t: 4, rn: 40 },
    { k: 'frost',    n: 'Frostwood',  log: 'frost_log',    t: 5, rn: 54 },
    { k: 'shadow',   n: 'Shadowwood', log: 'shadow_log',   t: 6, rn: 66 },
    { k: 'ancient',  n: 'Ancient',    log: 'ancient_log',  t: 7, rn: 78 }
  ];

  /* ── runes ────────────────────────────────────────────────────────────────────
     One ladder, eight grades, named for how hot the stone was baked. The rune
     carries the damage the way the arrow does. `pow` is Magic Power while loaded.
     A batch is 40 runes for every rune the grade's biggest spell spends: 40, 80,
     120 or 160. So the work one full-size cast costs is the same at every grade,
     and a smaller spell costs a half, a third or a quarter of it.
     `stone` and `fuel` are what one batch eats.                                 */
  var RUNES = [
    { k: 'ash',      n: 'Ash',      t: 1, rn: 1,  pow: 2,  stone: 1, fuel: { ash: 1 } },
    { k: 'soot',     n: 'Soot',     t: 2, rn: 12, pow: 3,  stone: 1, fuel: { ash: 2 } },
    { k: 'char',     n: 'Char',     t: 3, rn: 25, pow: 5,  stone: 1, fuel: { charcoal: 1 } },
    { k: 'cinder',   n: 'Cinder',   t: 4, rn: 38, pow: 8,  stone: 2, fuel: { charcoal: 1 } },
    { k: 'kiln',     n: 'Kiln',     t: 5, rn: 52, pow: 11, stone: 2, fuel: { ember_dust: 1 } },
    { k: 'forge',    n: 'Forge',    t: 6, rn: 64, pow: 15, stone: 2, fuel: { ember_dust: 1 } },
    { k: 'crucible', n: 'Crucible', t: 7, rn: 76, pow: 20, stone: 2, fuel: { ember_dust: 1 } },
    { k: 'starfall', n: 'Starfall', t: 8, rn: 88, pow: 28, stone: 3, fuel: { ember_dust: 1 } }
  ];
  var RUNE_BATCH = 40;
  var SPIRE_RUNE = { id: 'sunder_rune', n: 'Sunder Rune', t: 11, pow: 38 };
  var RUNE_SAVE_CAP = 0.85;   // the ceiling arrows already share

  /* ── casting in armour that is not cloth ──────────────────────────────────── */
  var ARMOUR = { perDef: 0.003, floor: 0.60 };

  /* ── robes ────────────────────────────────────────────────────────────────────
     Ten cloth tiers beside the ten leather tiers. A robe piece is built off the
     leather piece of the same tier, so the two ladders cannot drift apart:
        Defence       leather x DEF_FRAC
        Attack        leather x ATK_FRAC   (Attack on armour is accuracy)
        Magic Power   the tier's share, spread across the five pieces
        rune saving   SAVE per piece                                          */
  var ROBE = { DEF_FRAC: 0.62, ATK_FRAC: 0.50, SAVE: 0.015,
               SPREAD: [0.15, 0.35, 0.25, 0.10, 0.15],     // hood, robe, leggings, wraps, slippers
               SLOTS: ['helmet', 'chest', 'legs', 'gloves', 'boots'],
               PIECE: ['hood', 'robe', 'leggings', 'wraps', 'slippers'],
               PIECE_NAME: ['Hood', 'Robe', 'Leggings', 'Wraps', 'Slippers'],
               LEATHER_PIECE: ['helm', 'chest', 'legs', 'gloves', 'boots'] };
  var CLOTH = [
    /* key, set name, the leather tier it is measured against, ctier, Runecrafting
       level, total Magic Power, what the cloth is woven from */
    { k: 'linen',      n: 'Linen',      lk: 'rough',  t: 1, rn: 1,  mpow: 0,  bolt: { flax: 3 } },
    { k: 'spidersilk', n: 'Spidersilk', lk: 'chitin', t: 2, rn: 12, mpow: 1,  bolt: { spider_silk: 3 } },
    { k: 'gravecloth', n: 'Gravecloth', lk: 'wolf',   t: 3, rn: 27, mpow: 1,  bolt: { spider_silk: 3, cursed_dust: 1 } },
    { k: 'rimeweave',  n: 'Rimeweave',  lk: 'ogre',   t: 4, rn: 40, mpow: 2,  bolt: { spider_silk: 3, frostfur: 1 } },
    { k: 'seercloth',  n: 'Seercloth',  lk: 'troll',  t: 5, rn: 55, mpow: 3,  bolt: { spider_silk: 4, seer_idol: 1 } },
    { k: 'stoneweave', n: 'Stoneweave', lk: 'drake',  t: 6, rn: 68, mpow: 4,  bolt: { spider_silk: 4, granite_core: 1 } },
    { k: 'wyrmsilk',   n: 'Wyrmsilk',   lk: 'demon',  t: 7, rn: 82, mpow: 5,  bolt: { spider_silk: 5, cinder_gland: 1 } },
    /* the three raid cloths are already cloth, and each raid's unused reagent
       finally has somewhere to go */
    { k: 'runebound',  n: 'Runebound',  lk: 'wraith', t: 7, rn: 75, mpow: 6, raid: 'sunken_barrow',  cloth: 'wraithcloth', rune: 'runed_bone' },
    { k: 'drakerune',  n: 'Drakerune',  lk: 'ember',  t: 8, rn: 84, mpow: 7, raid: 'emberforge',     cloth: 'emberweave',  rune: 'drakeforged_rune' },
    { k: 'riftwoven',  n: 'Riftwoven',  lk: 'void',   t: 9, rn: 90, mpow: 9, raid: 'abyssal_throne', cloth: 'voidweave',   rune: 'riftshard' }
  ];
  /* cloth per piece, the leather recipe's shape: hood 2, robe 4, leggings 3, wraps 2, slippers 2 */
  var CLOTH_PER_PIECE = [2, 4, 3, 2, 2];

  /* The Empyrean's third set, beside Dawnward plate and Sunweave leather. Four
     pieces, like both of those. Built off Sunweave the way crafted robes are
     built off leather. */
  var DAWNVEIL = { k: 'dawnveil', n: 'Dawnveil', t: 10, mpow: [2, 4, 3, 2],
                   pieces: ['hood', 'robe', 'leggings', 'slippers'],
                   pieceName: ['Hood', 'Robe', 'Leggings', 'Slippers'],
                   slots: ['helmet', 'chest', 'legs', 'boots'],
                   from: ['sunweave_helm', 'sunweave_chest', 'sunweave_legs', 'sunweave_boots'],
                   save: 0.02, chance: 0.018,
                   set: { critChance: 0.10, dmgBoost: 0.08 } };

  /* ── drops: raid and Spire weapons, and one unique for every zone ──────────── */
  var DROP_WEAPONS = [
    /* raids. Each carries Attack and Magic Power the way a raid bow carries Attack
       and Ranged Strength, on the same anchors: the raid one-hander of the tier
       for Attack, Sunpiercer and Plummet for the top two. */
    { id: 'gravecall_staff', n: 'Gravecall Staff', fam: 'staff', t: 7, atk: 39, mpow: 6,  from: 'raid:sunken_barrow',  chance: 0.010, wfx: { stun: { chance: 0.10, dur: 1.2 } } },
    { id: 'barrow_wand',     n: 'Barrow Wand',     fam: 'wand',  t: 7, atk: 39, mpow: 5,  from: 'raid:sunken_barrow',  chance: 0.010 },
    { id: 'slagfire_staff',  n: 'Slagfire Staff',  fam: 'staff', t: 8, atk: 54, mpow: 12, from: 'raid:emberforge',     chance: 0.010, aff: { el: 'fire', dmg: 0.08 } },
    { id: 'emberglass_wand', n: 'Emberglass Wand', fam: 'wand',  t: 8, atk: 54, mpow: 10, from: 'raid:emberforge',     chance: 0.010, aff: { el: 'fire', dmg: 0.06 } },
    { id: 'riftcaller',      n: 'Riftcaller',      fam: 'staff', t: 9, atk: 68, mpow: 20, from: 'raid:abyssal_throne', chance: 0.010, aff: { el: 'shadow', dmg: 0.08 } },
    { id: 'nullspire_wand',  n: 'Nullspire Wand',  fam: 'wand',  t: 9, atk: 68, mpow: 17, from: 'raid:abyssal_throne', chance: 0.010, aff: { el: 'shadow', dmg: 0.06 } },
    { id: 'dawncaller',      n: 'Dawncaller',      fam: 'staff', t: 10, atk: 74, mpow: 28, from: 'raid:empyrean_throne', chance: 0.010, wfx: { burn: { mult: 0.16 } } },
    { id: 'starcall_wand',   n: 'Starcall Wand',   fam: 'wand',  t: 10, atk: 70, mpow: 24, from: 'raid:empyrean_throne', chance: 0.010, ubonus: { critChance: 0.07, magicDmg: 0.05 } },
    /* the Spire */
    { id: 'faultline',       n: 'Faultline',       fam: 'staff', t: 11, atk: 80, mpow: 34, from: 'spire', ubonus: { magicDmg: 0.07, critChance: 0.05 }, wfx: { cleave: { chance: 0.10 } } },
    /* zone uniques. Each carries an element it is better with, or an effect the
       crafted weapon of its tier does not have, so it is a choice and not a
       replacement, the rule the proc bows already follow. Boss weapons sit a rung
       above the crafted tier, as Wyrmfang and Doomblade do. */
    { id: 'gnawbone_wand',   n: 'Gnawbone Wand',     fam: 'wand',  t: 1, atk: 3,  mpow: 0, from: 'mon:brood_rat',     chance: 0.007, aff: { el: 'fire', dmg: 0.06 } },
    { id: 'briarwood_wand',  n: 'Briarwood Wand',    fam: 'wand',  t: 2, atk: 5,  mpow: 0, from: 'mon:timber_wolf',   chance: 0.010, wfx: { poison: { mult: 0.08 } } },
    { id: 'webspinner_staff',n: 'Webspinner Staff',  fam: 'staff', t: 2, atk: 5,  mpow: 0, from: 'mon:venomfang',     chance: 0.007, wfx: { poison: { mult: 0.08 } } },
    { id: 'fetish_staff',    n: 'Shaman\u2019s Fetish Staff', fam: 'staff', t: 3, atk: 8, mpow: 0, from: 'mon:goblin_shaman', chance: 0.006, aff: { el: 'frost', dmg: 0.08 } },
    { id: 'gravecaller',     n: 'Gravecaller',       fam: 'staff', t: 4, atk: 14, mpow: 1, from: 'mon:lich',          chance: 0.030, also: [['crypt_wight', 0.005]], aff: { el: 'fire', dmg: 0.08 } },
    { id: 'frostbrand_staff',n: 'Frostbrand Staff',  fam: 'staff', t: 4, atk: 12, mpow: 0, from: 'mon:frost_bear',    chance: 0.009, aff: { el: 'frost', dmg: 0.08 } },
    { id: 'moonhowl_wand',   n: 'Moonhowl Wand',     fam: 'wand',  t: 5, atk: 17, mpow: 0, from: 'mon:alpha_wolf',    chance: 0.006, also: [['ironfang', 0.030]], aff: { el: 'storm', dmg: 0.06 } },
    { id: 'seers_eye',       n: 'Seer\u2019s Eye',   fam: 'staff', t: 6, atk: 25, mpow: 2, from: 'mon:ogre_seer',     chance: 0.005, also: [['ogre_warlord', 0.030]], aff: { el: 'shadow', dmg: 0.08 } },
    { id: 'mossheart_wand',  n: 'Mossheart Wand',    fam: 'wand',  t: 7, atk: 34, mpow: 2, from: 'mon:moss_troll',    chance: 0.005, also: [['troll_king', 0.030]], ubonus: { lifesteal: 0.04 } },
    { id: 'cinderspine',     n: 'Cinderspine',       fam: 'staff', t: 7, atk: 36, mpow: 3, from: 'mon:cinder_drake',  chance: 0.005, also: [['emberwyrm', 0.030]], wfx: { burn: { mult: 0.13 } } },
    { id: 'ashglass_staff',  n: 'Ashglass Staff',    fam: 'staff', t: 8, atk: 44, mpow: 5, from: 'mon:scorch_rhino',  chance: 0.007, aff: { el: 'frost', dmg: 0.08 } },
    { id: 'brimstone_sceptre', n: 'Brimstone Sceptre', fam: 'wand', t: 8, atk: 48, mpow: 7, from: 'mon:abyssal_fiend', chance: 0.005, also: [['demon_lord', 0.030]], aff: { el: 'storm', dmg: 0.06 } },
    { id: 'stormfeather_wand', n: 'Stormfeather Wand', fam: 'wand', t: 5, atk: 16, mpow: 0, from: 'mon:storm_eagle', chance: 0.008, aff: { el: 'storm', dmg: 0.06 }, aerie: true }
  ];

  /* Anything that casts drops its runes, the rule the archers already follow for
     arrows. Tier is read from the monster's level against the rune ladder. The
     counts are for a one-rune spell; the prototype multiplies them by what the
     grade's biggest spell spends. */
  var RUNE_DROPS = [
    ['goblin_shaman', 0.30, [8, 18]],
    ['crypt_wight',   0.22, [6, 14]],
    ['lich',          0.60, [20, 40]],
    ['ogre_seer',     0.30, [8, 18]],
    ['abyssal_fiend', 0.24, [8, 18]],
    ['demon',         0.14, [5, 12]]
  ];

  /* ── elemental weakness and resistance, all 57 monsters ───────────────────────
     [weak, resist]. null = neither. Written zone by zone so no element is the
     answer everywhere and every element has somewhere it is wrong.             */
  var MON_EL = {
    /* Rat Warrens: vermin burn. Nothing resists; it is the first zone and Fire is all you have. */
    rat: ['fire', null], plague_rat: ['fire', null], dire_rat: ['fire', null], brood_rat: ['fire', null], rat_queen: ['fire', null],
    /* Spider Hollow: webs burn. The two big ones are wrapped in silk thick enough to keep the cold out. */
    spider: ['fire', null], web_weaver: ['fire', null], venomfang: ['fire', 'shadow'], brood_matron: ['fire', 'frost'], silkweaver_queen: ['fire', 'frost'],
    /* Goblin Cave: where Frost is taught, two levels before the zone gets hard. The shaman has seen fire before. */
    goblin: ['frost', null], goblin_archer: ['frost', null], goblin_brute: ['frost', null], goblin_shaman: ['frost', 'fire'], goblin_warchief: ['frost', 'fire'],
    /* Skeleton Crypt: the dead burn and do not feel the cold. The plate on the knight takes Storm, once you have it. */
    skeleton: ['fire', 'frost'], skel_archer: ['fire', 'frost'], crypt_wight: ['fire', 'shadow'], bone_knight: ['storm', 'frost'], lich: ['fire', 'storm'],
    /* Wolf Den: where Storm is taught. The frost wolf is the one you swap for. */
    wolf: ['storm', null], frost_wolf: ['fire', 'frost'], alpha_wolf: ['storm', null], pack_hunter: ['storm', 'shadow'], ironfang: ['storm', 'frost'],
    /* Ogre Stronghold: Frost for the first two, and Shadow from the Houndmaster up, the level Shadow unlocks. */
    ogre_grunt: ['frost', null], ogre: ['frost', null], ogre_houndmaster: ['shadow', 'fire'], ogre_seer: ['shadow', 'storm'], ogre_warlord: ['shadow', 'fire'],
    /* Troll Caverns: stone does not burn and Storm cracks it. Two of the five break the pattern. */
    cave_troll: ['storm', 'shadow'], troll: ['storm', 'fire'], moss_troll: ['fire', 'frost'], cavern_troll: ['shadow', 'storm'], troll_king: ['storm', 'fire'],
    /* Wyvern Roost: Frost, and never Fire. */
    drake: ['frost', 'fire'], wyvern: ['storm', 'fire'], cinder_drake: ['frost', 'fire'], magma_wyrm: ['frost', 'storm'], emberwyrm: ['frost', 'fire'],
    /* Demon Sanctum: Fire and Shadow are home to them, and their lord shrugs off the Storm that drops his knights. */
    hellhound: ['frost', 'fire'], demon: ['storm', 'fire'], abyssal_fiend: ['storm', 'shadow'], dread_knight: ['storm', 'shadow'], demon_lord: ['frost', 'storm'],
    /* Thornwood Thicket */
    wild_boar: ['fire', null], timber_wolf: ['fire', 'shadow'], thornback_stag: ['frost', null], briar_lynx: ['fire', null],
    /* Frostfang Tundra: everything here resists Frost */
    frost_bear: ['fire', 'frost'], snow_leopard: ['fire', 'frost'], tundra_elk: ['storm', 'frost'], ice_mammoth: ['shadow', 'frost'],
    /* Ashen Steppe: almost everything here resists Fire */
    ash_jackal: ['frost', 'fire'], cinder_boar: ['frost', 'fire'], dust_stalker: ['shadow', 'storm'], scorch_rhino: ['shadow', 'fire'],
    /* Stormcrest Aerie, when it goes live */
    crag_hawk: ['storm', null], storm_eagle: ['frost', 'storm'], gryphon: ['storm', null], phoenix: ['frost', 'fire']
  };
  /* raid stages and Spire monsters */
  var RAID_EL = {
    barrow_sentry: ['storm', 'frost'], drowned_footman: ['storm', 'frost'], barrow_champion: ['fire', 'shadow'], tomb_revenant: ['fire', 'shadow'], wardens_herald: ['storm', 'frost'], barrow_warden: ['fire', 'shadow'],
    forge_thrall: ['frost', 'fire'], cinder_golem: ['frost', 'fire'], molten_sentinel: ['storm', 'fire'], ashbound_brute: ['frost', 'fire'], ember_colossus: ['storm', 'fire'], ignar: ['frost', 'fire'],
    void_wretch: ['fire', 'shadow'], rift_stalker: ['storm', 'shadow'], null_warden: ['fire', 'shadow'], abyssal_maw: ['frost', 'shadow'], void_herald: ['storm', 'shadow'], riftbound_colossus: ['fire', 'shadow'], xorvael: ['storm', 'shadow'],
    dawnling: ['shadow', 'fire'], radiant_wisp: ['shadow', 'storm'], seraph_warden: ['shadow', 'fire'], astral_hound: ['frost', 'shadow'], lightbringer_herald: ['shadow', 'storm'], empyrean_colossus: ['frost', 'fire'], fallen_choir: ['storm', 'shadow'], aureon: ['shadow', 'fire']
  };
  var SPIRE_EL = [
    ['Rubble Shade', 'storm', 'shadow'], ['Floorwarden', 'storm', 'fire'], ['Stairwraith', 'fire', 'shadow'],
    ['Mortarfiend', 'frost', 'fire'], ['Keystone Golem', 'storm', 'frost'], ['Plumbhang', 'fire', null],
    ['Ashen Architect', 'frost', 'fire'], ['Hollow Choirstone', 'shadow', 'storm'], ['The Landing', 'storm', 'fire']
  ];

  /* ── Combat Mastery: the fifth column ─────────────────────────────────────────
     Tree key 'sorc' (the key 'magic' is Warfare and is taken). Ids s_*. The shape
     and the sizes are Marksman's, node for node, so the two columns are worth the
     same; the three unique nodes are Magic's own. */
  var SORC = [
    { id: 's_t1',   tier: 1, branch: 'c', max: 4, name: 'Steady Mind',   desc: '+4% combat XP per rank.', effect: { combatXp: 0.04 } },
    { id: 's_t2_l', tier: 2, branch: 'l', max: 5, name: 'Deep Focus',    desc: '+2% Magic damage per rank.', prereq: ['s_t1:1'], effect: { magicDmg: 0.02 } },
    { id: 's_t2_r', tier: 2, branch: 'r', max: 5, name: 'Rune Thrift',   desc: 'Each rank: +4% chance a cast keeps its runes.', prereq: ['s_t1:1'], effect: { runeSave: 0.04 } },
    { id: 's_t3_l', tier: 3, branch: 'l', max: 1, name: 'Spellbreak',    desc: 'Ignore 10% of the target’s Defence.', prereq: ['s_t2_l:3'], unique: true },
    { id: 's_t3_r', tier: 3, branch: 'r', max: 1, name: 'Quick Hands',   desc: '+5% attack speed with a wand.', prereq: ['s_t2_r:3'], unique: true },
    { id: 's_t4_l', tier: 4, branch: 'l', max: 5, name: 'Heavy Casting', desc: '+2% staff damage per rank, +1% with a wand.', prereq: ['s_t3_l:1', 's_t3_r:1'], effect: { staffDmg: 0.01 } },
    { id: 's_t4_r', tier: 4, branch: 'r', max: 5, name: 'Sharp Mind',    desc: '+2% crit chance per rank.', prereq: ['s_t3_l:1', 's_t3_r:1'], effect: { magicCrit: 0.02 } },
    { id: 's_t5_l', tier: 5, branch: 'l', max: 1, name: 'Echo',          desc: '8% chance a cast hits twice.', prereq: ['s_t4_l:3'], unique: true },
    { id: 's_t5_m', tier: 5, branch: 'm', max: 1, name: 'Attunement',    desc: 'A crit always applies your element’s effect.', prereq: ['s_t4_l:3', 's_t4_r:3'], unique: true, powerful: true },
    { id: 's_t5_r', tier: 5, branch: 'r', max: 1, name: 'Rune Keeper',   desc: 'A cast that misses does not spend its runes.', prereq: ['s_t4_r:3'], unique: true },
    { id: 's_cap',  tier: 6, branch: 'c', max: 1, name: 'Archmage',      desc: '+25% crit damage with spells.', prereq: ['s_t5_m:1'], capstone: true }
  ];
  /* The new seam, Warfare | Sorcery. Same weight as the other three bridges. */
  var SORC_BRIDGE = [
    { id: 'gs_t3', tier: 3, branch: 'h', max: 3, name: 'Battle Scholar', desc: '+1% crit chance and +1% chance a cast keeps its runes, per rank.', prereq: ['g_t3_r:1', 's_t3_l:1'], hybrid: true, effect: { critChance: 0.01, runeSave: 0.01 } },
    { id: 'gs_t4', tier: 4, branch: 'h', max: 1, name: 'Warcaster',      desc: '+6% damage and +4 max HP.', prereq: ['g_t4_r:3', 's_t4_l:3'], hybrid: true, unique: true }
  ];
  /* 30 + 4 = 34 new points on the board. They come from Magic levels: one at every
     third level (33), and a second one at 99. */
  var SORC_POINTS = { every: 3, bonusAt: 99 };

  /* ── Runecrafting: the 98 point tree ──────────────────────────────────────────
     The same sixteen node shape Fletching uses, so it fits the Forge Rail board
     with no layout work: eleven columns, never more than three abreast. `req`
     under 75 is points spent; 75 and over is a Grandmaster level gate. */
  var RN_TREE = [
    { id: 'rn_speed',    name: 'Steady Chisel',  max: 12, req: 0,  per: 1.3,  text: 'Reduces task time by {v}%', generic: true },
    { id: 'rn_xp',       name: 'Old Script',     max: 10, req: 0,  per: 3,    text: '+{v}% Runecrafting XP', generic: true },
    { id: 'rn_double',   name: 'Twin Batch',     max: 8,  req: 0,  per: 4,    text: '{v}% chance of a double batch', generic: true },
    { id: 'rn_save',     name: 'Lasting Mark',   max: 10, req: 12, per: 5,    text: '{v}% of casts keep their runes' },
    { id: 'rn_batch',    name: 'Close Cutting',  max: 6,  req: 12, per: 4,    text: '+{v}% runes from every batch' },
    { id: 'rn_acc',      name: 'True Lines',     max: 8,  req: 20, per: 0.4,  text: '+{v}% magic accuracy' },
    { id: 'rn_thrift',   name: 'Spare Stone',    max: 6,  req: 20, per: 2,    text: '{v}% chance a batch keeps its stone and fuel', generic: true },
    { id: 'rn_dmg',      name: 'Deep Cut',       max: 8,  req: 30, per: 0.2,  text: '+{v}% Magic damage' },
    { id: 'rn_sure',     name: 'Clear Sight',    max: 5,  req: 45, per: 0.2,  text: '{v}% chance a cast cannot miss' },
    { id: 'rn_bind',     name: 'Bound Twice',    max: 1,  req: 55, per: 0,    text: 'Binding a staff or a wand gives back half its runes' },
    { id: 'rn_brand',    name: 'Branded',        max: 7,  req: 60, per: 1,    text: '+{v}% chance your element’s effect applies' },
    { id: 'rn_gm_speed', name: 'Swift Kiln',     max: 5,  req: 75, per: 1.8,  text: 'Reduces task time by {v}% (grandmaster)', generic: true },
    { id: 'rn_gm_xp',    name: 'Stone Memory',   max: 5,  req: 75, per: 3,    text: '+{v}% Runecrafting XP', generic: true },
    { id: 'rn_gm_save',  name: 'Deep Mark',      max: 5,  req: 80, per: 4,    text: '+{v}% of casts keep their runes' },
    { id: 'rn_endless',  name: 'Endless Rune',   max: 1,  req: 90, per: 0,    text: '5% of casts spend nothing' },
    { id: 'rn_cape',     name: 'Runecrafter’s Cape', max: 1, req: 99, per: 0, text: 'Double runes from every batch', reqCape: true }
  ];
  var RN_RANK = { acc: 0.004, dmg: 0.002, sure: 0.002, brand: 0.01, save: 0.05, gmSave: 0.04, endless: 0.05 };

  /* ── the potion and the gem, twins of the Hawkeye pair and Hawkseye ─────────── */
  var POTIONS = [
    { id: 'arcane_draught_1', n: 'Arcane Draught I',  mpow: 2, sec: 120, lvl: 45, inp: { moonflower: 3 } },
    { id: 'arcane_draught_2', n: 'Arcane Draught II', mpow: 4, sec: 180, lvl: 78, inp: { moonflower: 3, ashbloom: 1 } }
  ];
  var GEM = { color: 'wyrd', n: 'Wyrdstone', tiers: [['wyrd_chip', 'Chipped', 0.02], ['wyrd_polish', 'Polished', 0.04], ['wyrd_flaw', 'Flawless', 0.08]] };

  var MD = { STAT: STAT, STYLES: STYLES, ELEMENTS: ELEMENTS, WEAK_MULT: WEAK_MULT, RESIST_MULT: RESIST_MULT,
    SPELLS: SPELLS, runeClass: runeClass, spellPower: spellPower,
    FAMILIES: FAMILIES, SWORD_ATK: SWORD_ATK, WOODS: WOODS, RUNES: RUNES, RUNE_BATCH: RUNE_BATCH,
    SPIRE_RUNE: SPIRE_RUNE, RUNE_SAVE_CAP: RUNE_SAVE_CAP, ARMOUR: ARMOUR, ROBE: ROBE, CLOTH: CLOTH,
    CLOTH_PER_PIECE: CLOTH_PER_PIECE, DAWNVEIL: DAWNVEIL, DROP_WEAPONS: DROP_WEAPONS, RUNE_DROPS: RUNE_DROPS,
    MON_EL: MON_EL, RAID_EL: RAID_EL, SPIRE_EL: SPIRE_EL, SORC: SORC, SORC_BRIDGE: SORC_BRIDGE,
    SORC_POINTS: SORC_POINTS, RN_TREE: RN_TREE, RN_RANK: RN_RANK, POTIONS: POTIONS, GEM: GEM };

  if (typeof module !== 'undefined' && module.exports) module.exports = MD;
  else root.MAGE_DESIGN = MD;
})(typeof window !== 'undefined' ? window : this);

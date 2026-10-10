Magic for Cindervale: build the core. Slices 1 to 4 of the design, shipped as one release.

GOAL

Put Magic in the game by porting the design in `_magedesign/`. Do not redesign it. This session builds the Magic stat, Runecrafting as the fifteenth skill, runes, wands and staves, the sixteen spells, the four elements with every monster's weakness, robes, and the combat screen that goes with them. When it ends, a new character can quarry stone, carve Ash Runes, bind a Pine Wand, weave a Linen Robe, press Fire Bolt and kill a rat, and a level 99 one can cast Storm Surge in a raid.

One release. Commit after each slice so a failure can be found, but push nothing until all four slices pass and I have seen the screenshots listed at the end.

READ FIRST

1. `_magedesign/preview.html`. The whole design, measured. Sections 02 to 08 and 11 to 13 are this session. Section 16 is the slice list, section 17 the decisions.
2. `_magedesign/design.js`. Every number, in one place. Read numbers from it. Do not retype them from the page.
3. `_magedesign/overlay.js` and `_magedesign/ui.js`. A working prototype laid over the real game. This is your change list: 28 functions. Each `edit(name, [[find, replace], ...])` is an exact string in `cindervale.html` and what it becomes. Each `wrap(name, ...)` is a new branch for that function.
4. `_magedesign/sim.js` and `simlib.js` (52 checks), `shoot.js` and `scenes.js` (the screenshots), `results.json` (the numbers the page prints), `shots/` (what it should look like).
5. Memory: cindervale-magic-design, cindervale-ranged-strength, gear-tier-ladder, plain-ui-copy, no-em-dashes, ui-style-preferences, cindervale-global-class-collisions, combat-panel-render-traps, cindervale-file-size-ceiling, preview-before-shipping, art-prompts-chatgpt, cindervale-art-injectors.
6. The shipped Ranged code. Magic copies its plumbing: `usingRanged`, `RANGED_STYLES`, `readyAmmo`, `ammoFitsWeapon`, `rangedArmourMult`, `rangedStr`, and how 0.9.127.2 routed `dmgBoost`.

FIRST COMMAND

Run `node _magedesign/sim.js`. It must end "every check passed". The design was measured against build 0.9.127.3. If the file has moved since and an edit string no longer matches, the prototype stops and names it. Fix the prototype first, so your reference is right, then start.

DECIDED. Build to these, do not reopen them.

- Sixteen spells: four elements, four sizes. Bolt, Blast, Wave and Surge spend 1, 2, 3 and 4 runes a cast. The rune decides the biggest spell it can power (Ash, Soot: Bolt. Char, Cinder, Kiln: Blast. Forge, Crucible: Wave. Starfall, Sunder: Surge) and that spell gets the rune's whole Magic Power. A smaller spell is always allowed and gets less. The default is the biggest.
- Elements: Fire at Magic 1, Frost 12, Storm 30, Shadow 50. Weak is +15%, resisted is -15%.
- The spell is picked on a spell bar that works while the fight runs. In raids and on the Spire too.
- Styles are Focused, Swift and Warded, on the three slots melee and ranged already use.
- Runecrafting is a skill. No guild seat yet.
- Runes use the quiver slot. A batch is 40 runes for each rune the grade's biggest spell spends.
- Robes need Defence. Armour that is not cloth costs 0.3% Magic damage for each point of its Defence, to a limit of 40%. The shield and the cape are exempt. Stonewright Gauntlets count as cloth.
- Attack % does nothing for a spell. Strength does nothing for a spell, from gear, potions or food. "Damage with any weapon" follows the staff.
- Names stay as the page has them.
- The file size assertion in `_audit_tests.js` moves from 12 MB to 13.5 MB in the same commit that needs it.

WHAT THIS SESSION BUILDS

Slice 1. The rules nobody sees.
The Magic stat (`COMBAT_STATS.magic`, `state.combatXp.magic`), the combat level formula `floor((max(attack + strength, ranged * 2, magic * 2) + defence + hitpoints) / 4)`, and the save guards in `normalizeState` for `combatXp.magic` (0), `combatElement` ('fire'), `combatSpell` ('surge') and `xp.runecrafting` (0). Magic damage % (`magicDmg`) and Magic Power (`mpow`) through `gearStats`, `combatStats`, `combatBonusesAll`, the weapon gate in `cmastBonuses`, `playerAccuracy`, `playerMaxHit`, `playerSwingMs`, `combatXpStat`, `styleStatFor`, `combatGearReq` and `grantCombatXp`. `mmSummary` calls `combatLevel()`. `gdReqMet` knows Ranged and Magic.
Start `_magesim.js` at the repo root, with "no existing save changes combat level" as its first assertion.
Passes when every harness passes and nothing on screen has changed.

Slice 2. Runecrafting, runes, wands, staves, casting.
The skill, declared inside the `SKILLS` literal, with `SK_PFX` `rn`, `RAIL_GROUP`, `SKILL_ACCENT`, the 98 point tree in `TREES` (16 nodes, Fletching's shape), the cape, and the item categories. The Mining act `mi_rs`. Runestone, eight runes, seven wands, seven staves. Casting in `combatTick` (13 edits), `ammoMaxTier`, `ammoKindTopTier`, `ammoFitsWeapon`, the spell sizes (`runeClass`, `spellPower`, `spellSize`). The Magic damage enchant and the staff pool, so a staff cannot roll Attack. The spell bar, the readout, the item cards, the Magic loadout tile, the Magic line under Training.
All sixteen tree nodes must change a number. The prototype leaves three undone: `rn_batch`, `rn_bind` and `rn_cape`. Wire them.

Slice 3. Elements.
Frost, Storm and Shadow, and `weakEl` and `resistEl` on all 57 monsters, the 27 raid stages and the nine Spire monsters, from `MON_EL`, `RAID_EL` and `SPIRE_EL`. A Spire floor that borrows a monster copies its elements with its weakness. The chips on the monster card, the two tags in the Monster Log, the element colour on damage numbers.

Slice 4. Robes.
Seven cloths and 35 robe pieces, built off the leather piece of the same tier exactly as `overlay.js` does it. The `cloth` flag, the armour rule, rune saving on cloth, and Magic Power on bucklers from Cobalt up, on Stonewright Gauntlets and on every cape with Strength.

THE SPELL BAR. This is the part I care most about.

- It sits under my own health bar in the arena, as in `_magedesign/shots/fight.png`. Not in the right-hand rail: that rail is 573 px tall at 1080p and in a raid it also carries Momentum and the three abilities.
- Eight buttons, always on screen while a staff or wand is held: Bolt, Blast, Wave, Surge, then Fire, Frost, Storm, Shadow.
- At 1920 by 1080 no button is under 60 px wide or 44 px tall. The prototype's are 65 by 46 and 84 by 46.
- One press changes the spell. It works while the fight runs and in a raid. It applies from the next cast. No Disengage, no menu, no hover.
- Act on `pointerdown`, delegated from the document. `#combatPanel` is rebuilt on every kill and a click that straddles a kill loses its target. `refreshCombatStats()` is safe to call mid-fight.
- Each size button says what it spends. A size the loaded rune cannot power is grey and says which rune it needs. Each element button says "weak +15%" or "resists -15%" for the monster in front of me, or else what the element does. An element above my Magic level is grey and says the level.
- The line above the bar names the spell, the runes left and how long they last at that size, and turns amber under ten minutes. Bows get the same line for arrows.
- Number keys 1 to 4 pick the size and Shift with 1 to 4 the element, on the combat screen only and never while I am typing in a field. Check the existing `keydown` listeners first and tell me if anything already uses them.
- With a staff held the three style buttons share one line and the Training heading says the Magic level once.
- Check it with potions in the satchel, with status icons under both health bars, and in a raid. Nothing may clip and the bar must not cover the monster.

HOW TO PORT

- An `edit()` in the prototype becomes the same replacement in `cindervale.html`, by str_replace. A `wrap()` becomes a branch inside the function itself.
- What the prototype adds at run time goes where its siblings live: items in `ITEMS`, stats in `COMBAT_GEAR_STATS`, acts in the `SKILLS` literal, above the line where `sortAllActs()` runs.
- The prototype also adds things that are NOT this session: the zone and raid weapons in `DROP_WEAPONS`, `RUNE_DROPS`, the Sorcery column, Wyrdstone, the Arcane Draught, Dawnveil, the three raid cloths, the Sunder Rune. Leave all of them out and leave nothing on screen that points at them.
- Check every new prefix, state key and CSS class with grep before you use it. The prototype's were free at 0.9.127.3: `rn_`, `combatSpell`, `combatElement`, `mpow`, `magicDmg`, `runeSave`, `weakEl`, `resistEl`, `cvspell`, `el_fire`.

TRAPS I ALREADY PAID FOR

- A skill pushed into `SKILLS` after parse misses three passes and its XP an hour freezes. It goes in the literal.
- Key lists drop a stat they do not know in silence: three in `combatEnchantBonuses`, and the gate in `cmastBonuses`.
- The key `magic` is already the Warfare tree. Nothing new may reuse it.
- `_rune` already ends one item id, Drakeforged Rune. Recognise a rune by `ammo: 'rune'`, never by its name.
- The out of ammunition message prints the item name: "You are out of Kiln Rune." Make it plural for runes and arrows.
- A staff must not show the ammunition block on its item card: the test is `it.ammo && !it.ranged && !it.magic`.
- Until the offline slice, a mage away from the game spends no runes, as an archer spends no arrows today. Leave it.

BALANCE: THE REAL FILE MUST MEASURE WHAT THE PROTOTYPE MEASURED

`_magesim.js` is `_magedesign/sim.js` pointed at the real file with no overlay. It must reproduce `results.json` to the digit for the combat level check, the weapon maths (96.1 to 104.8% of melee and of each ranged weapon), the ladder, the dressed table, the rune prices, the spell sizes and the Runecrafting XP. Any difference is a porting bug, not a balance change. The best in slot and Spire wall checks need gear from later slices: leave those in `_magedesign/sim.js` and say so.
Two rules for the harness. Every measurement starts from `defaultState()`. Anything counted per hour is read at the Agility the character would really have.
Add `_magesim.js` to the pipeline in CLAUDE.md beside the other four.

ART

No painted art this session. Do what 0.9.127.3 did for the Hawkseye gem: every new item, the four elements, the skill and its tree nodes get an inline SVG in `ICONS`, one silhouette for each family with a palette for each tier, and every new item is marked pending in the audit's painted list. Show me the contact sheet before anything ships. End by writing the ChatGPT sheet prompts for the painted versions, grouped the way section 15 groups them.

RULES

- The full validation pipeline before every commit: `node --check`, `_validate.js`, `_raidmom.js`, `_spiretest.js`, `_audit_tests.js`, and `_magesim.js` once it exists. Update the assertions that pin 14 skills and the list of unused materials (Charcoal leaves it).
- Never break a save. Touch none of the frozen names.
- Test as Electron, with `?cvdev=1`.
- Bump the build only. The release number stays where it is.
- One push at the end, to all three channels, then `--status`.
- UK spelling. No em dashes. In-game copy says the mechanic in plain words and uses none of the banned words.
- Update CLAUDE.md at the end: fifteen skills, Magic is no longer a placeholder, the third damage channel, the spell ladder, the new harness.

NOT THIS SESSION

Zone uniques and rune drops. The Sorcery column. Wyrdstone and the Arcane Draught. Raid weapons, raid robes, Dawnveil, Faultline and Sunder Runes. Offline rune and arrow spending. Achievements, the guild seat, the wiki. Do not half build any of them.

SHOW ME BEFORE YOU PUSH

Real screenshots from the real file, taken the way `_magedesign/shoot.js` takes them:
1. A fight with a staff, the spell bar in view.
2. The same fight just after a spell change, still running.
3. A raid with a staff.
4. Holding a sword: the Magic line under Training.
5. The Runecrafting panel and its tree.
6. A rune card, a staff card, a robe card and a plate card.
7. The icon contact sheet.

END WITH

What shipped and at which build. The output of every harness. Anything that differs from the design and why. The art prompts. And the prompt for the next session, slices 5 to 9.

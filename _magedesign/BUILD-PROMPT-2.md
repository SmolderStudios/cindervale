Magic for Cindervale: finish it. Slices 5 to 9 of the design.

GOAL

The core of Magic shipped in build 0.9.127.4: the Magic stat, Runecrafting, runes, crafted wands and staves, the sixteen spells, the four elements, robes and the spell bar. This session builds everything the design still owes: a unique wand or staff in every zone and runes from the monsters that cast, the Sorcery column on Combat Mastery, the Wyrdstone gem and the Arcane Draught, raid weapons, raid robes, Dawnveil, Faultline and Sunder Runes, and the loose ends: runes and arrows spent while I am away, the effects bar, achievements, the guild seat, the wiki. When it ends, a level 99 mage has a best in slot build that measures what the design page says it measures, and nothing in the design is left half done.

Commit after each slice so a failure can be found, but push nothing until all five slices pass and I have seen the screenshots listed at the end. If a slice has to be dropped, drop the whole slice and say so. The design was cut so that every slice after 4 can be left out without leaving a hole.

WHERE THINGS STAND

- `cindervale.html` is at build 0.9.127.4, release v0.9.127. The file is 12.03 MB. The audit fails it at 13.5 MB.
- `_magesim.js` (167 checks) holds the real file to the numbers the prototype measured, in `_magesim.golden.json`. It does NOT hold the best in slot table or the Spire wall. Those are `best`, `bestSummary` and `walls` in `_magedesign/results.json`, and they are this session's to prove.
- The prototype no longer lays over the game. `_magedesign/overlay.js` and `ui.js` are exact string edits cut against 0.9.127.3, and the core rewrote the functions they edit. They are still the change list for these five slices. Read them. Do not try to run them against the current file.
- `_magedesign/shootreal.js` takes real screenshots off the real file (headless Chrome from the trailer kit, Electron user agent, `?cvdev=1`). Add scenes to it.
- CLAUDE.md has a Magic section and three conventions (the third damage channel, the key lists, how ammunition is named). Read them before anything else.

READ FIRST

1. `_magedesign/preview.html`. Section 10 is the drops, section 12 is everything Magic plugs into (the Sorcery nodes are at the bottom of it), section 14 is the best in slot table and the wall, section 15 the icons, section 16 the slices, section 17 the decisions.
2. `_magedesign/design.js`. Every number: `DROP_WEAPONS`, `RUNE_DROPS`, `SORC`, `SORC_BRIDGE`, `SORC_POINTS`, `POTIONS`, `GEM`, `DAWNVEIL`, the raid cloths. Read numbers from it. Do not retype them from the page.
3. `_magedesign/overlay.js`. Search it for each of those names to see exactly how the prototype wired them.
4. `_magesim.js`. How the core was proved, and where the new sections go.
5. Memory: cindervale-magic-design, cindervale-ranged-strength, gear-tier-ladder, raid-system, slayer-economy-rework, steam-cloud-and-achievements, cindervale-guilds, plain-ui-copy, no-em-dashes, ui-style-preferences, cindervale-global-class-collisions, combat-panel-render-traps, cindervale-file-size-ceiling, preview-before-shipping, art-prompts-chatgpt.
6. The shipped Magic code. Start at `usingMagic`, `spellSize`, `runePow`, `runeSaveRate`, `elementMult`, `mageOnHit`, `magicArmourMult`, the `CLOTH_TIERS` loop, and the `_mg` branches in `combatTick`.

FIRST COMMAND

Run the whole pipeline before touching anything: `node --check`, `_validate.js`, `_raidmom.js` (72), `_spiretest.js` (211), `_audit_tests.js` (1269), `_magesim.js` (167). All green or stop and tell me.

Then run the prototype against the build it was cut for, so the reference is known good:

    git show d635edc:cindervale.html > _magedesign/work-0.9.127.3.html
    CV_FILE=_magedesign/work-0.9.127.3.html node _magedesign/sim.js
    git checkout -- _magedesign/results.json

It must end "every check passed". The last line puts back the one line of `results.json` the run rewrites. `_magedesign/work-*.html` is ignored by git.

DECIDED. Build to these, do not reopen them.

- Sorcery is the fifth column of Combat Mastery: 11 nodes and 30 points, and a 2 node bridge to Warfare worth 4. Tree key `sorc`, ids `s_*` and `gs_*`. Names and numbers as `design.js` has them.
- Magic levels give the 34 points: one at every third Magic level and a second at 99. The board goes from 132 to 166 and what can be earned rises by the same 34. Saves from 0.9.127.4 already have Magic levels and were given no points for them: back-pay those in `normalizeState`, once, so nobody loses the points for levels they earned before the column existed.
- Five columns: draw the board smaller, as `_magedesign/shots/mastery.png` mocks it at 80%. Show me. If it does not read, show me the scrolling version beside it and I will pick.
- Zone uniques carry the numbers of the crafted weapon of their tier and one thing the crafted one does not have. One the boss also drops sits a little above. Rates as the page has them: 0.5 to 1% from a named monster, 3% from the boss.
- The Stormfeather Wand waits for the Aerie. Define nothing for it.
- Anything that casts drops its runes: the six monsters in `RUNE_DROPS`.
- Raid robes are Runebound, Drakerune and Riftwoven, made from the raid cloth leather already uses and the raid material nothing uses. Dawnveil is four pieces from the Empyrean Throne at 1.8% each: +10% crit chance and +8% damage.
- Faultline is the fifth name in `SPIRE_GEAR`. Sunder Runes (+38 Magic Power) drop on Spire boss floors only, four times the count the Spire gives Sundershafts. The rune is in the prototype; its Spire drop is not, so build that beside the Sundershaft drop.
- A rune is spent, not sold. A Sunder Rune sells for 2 silver, as Starfall does. Do not use the prototype's price formula: the core threw it out.
- Offline combat spends runes and arrows and stops when the quiver is empty. For both, in the same function. The weakness is counted offline; the four element effects are not.
- Runecrafting takes a seat in The Ashen Circle.
- Six achievements: Magic 99, Runecrafting 99, a kill with each element in one zone, a full set of robes, a raid cleared with a staff, the Spire to floor 30 with a staff.
- Strength from a potion or a food still does nothing for a spell. The Arcane Draught is the Magic potion.
- In a live raid the keys 1, 2 and 3 are Rally, Ruin and Brace. The spell bar keeps Shift with 1 to 4 there and nothing else. Leave it.
- Names stay as the page has them.

WHAT THIS SESSION BUILDS

Slice 5. Zone drops.
Twelve unique wands and staves, one a zone, as rows on drop tables that already exist, and `RUNE_DROPS` on the six casters. Each unique is an item with its own drawn silhouette. The new rules are small and all in one place: a weapon that is better with one element (`aff: { el, dmg }`, read where `elementMult` is applied), and a staff or wand carrying a `wfx` the game already has (poison, burn whatever the element, lifesteal). The item card says the one thing the weapon does, in plain words.
Passes when a rare spawn multiplies a unique's chance by four and stops at 85% with no new code, and no early zone drops a late weapon.

Slice 6. The Sorcery column.
Eleven nodes and the two bridge nodes, every one wired: `magicDmg`, `runeSave` into `runeSaveRate()` under its 85% limit, `combatXp`, Spellbreak (ignore 10% of Defence), Quick Hands (wand only), Heavy Casting (staff 2%, wand 1%), Sharp Mind, Echo (8% of casts hit twice), Attunement (a crit always applies the element's effect, in `mageOnHit`), Rune Keeper (a cast that misses keeps its runes), Archmage. The points from Magic levels in `grantCombatXp`, and the back-pay in `normalizeState`. `CMAST_UNWIRED` stays empty. The audit's rule that what the board holds equals what can be earned must still hold at 166.
The board is the one screen I am not sure about. Build it, photograph it at 1920 by 1080, and show me before the push.

Slice 7. The gem and the potion.
Wyrdstone, three cuts: +2, +4 and +8% Magic damage, through the two key lists in `combatSocketBonuses`. The Arcane Draught, two bottles: +2 Magic Power for 2 minutes at Alchemy 45, +4 for 3 minutes at Alchemy 78, from Nightbloom. Warrior's Triple Brew gains +3 Magic Power. A potion stat has to be in seven key lists to work and five more places to be seen. Find all twelve by following `rstr` from the Hawkeye Draught, and give the Hawkeye Draught the five display sites it never got, in the same change.

Slice 8. Raids and the Spire.
Eight raid weapons, two a raid. Three raid cloths as fifteen robe pieces. Dawnveil and its set bonus. Faultline. Sunder Runes. Ascension already raises Magic Power: the core did it. This is the last slice that needs balance work, and it is where `best`, `bestSummary` and `walls` get proved.

Slice 9. Away, and the loose ends.
`offlineCombatResolve` charges the quiver for the kills the time away earned, at the spell I left it casting, less what was kept, and caps the kills at what the quiver could pay for. The Welcome Back summary says what was spent and that the fight stopped when it ran out, as `_magedesign/shots/welcome.png` mocks it. The same for arrows and bolts. The effects bar and the status chips get a line for Magic Power and the one Ranged Strength never got. The six achievements and their rows for the Steam schema: write the rows and tell me what to upload, do not touch Steam. The guild seat. The wiki: `_wikigen.js` gets an Elements page and a weak and a resisted element on every monster page, and the two stale sentences about Magic and Ranged go.
The save slot's combat level and the guild requirement check were on this slice in the design. The core already did both.

HOW TO PORT

- `overlay.js` is the reference, not a patch. For each thing in this session, find how the prototype wired it and make the same change in the function as it stands today. The core's functions have moved: read the function before you edit it.
- What the prototype adds at run time goes where its siblings live: items in `ITEMS`, stats in `COMBAT_GEAR_STATS`, drops on the tables that exist, acts in the `SKILLS` literal above the line where `sortAllActs()` runs.
- Raid robes go through the `CLOTH_TIERS` loop like the seven the core built, off the raid leather of the same tier. Their cloth is an item that exists already (Wraithcloth, Emberweave, Voidweave), so no new cloth and no new weave act.
- Check every new prefix, state key and CSS class with grep first. Free at 0.9.127.4: `sorc`, `s_t1` to `s_cap`, `gs_`, `wyrd`, `arcane_draught`, `dawnveil`, `faultline`, `sunder_rune`, `spellPen`, `echo` as a combat key, `runeRefundOnMiss`. Check again anyway.

TRAPS ALREADY PAID FOR

- Key lists drop a stat they do not know in silence. Three in `combatEnchantBonuses`, two in `combatSocketBonuses`, seven for a potion stat, and the gate in `cmastBonuses`. A new stat missing from one of them shows on the card and does nothing.
- The key `magic` in `state.tree` is the Warfare tree. The column is `sorc`.
- A rune is `isRune(id)`. Never test the id, and never filter on `ammo==='rune'` alone: every staff and wand carries it too.
- `runeClass(tier)` already puts tier 9 at Surge. `spellPower` needs nothing for the Sunder Rune.
- `MAGE_PENDING` in the audit is built from what an item is (a rune, `magic`, `cloth`), so every new staff, wand, robe and the Sunder Rune is pending without being typed. Wyrdstone and the Arcane Draught are neither: add them by hand, the way `HAWK_PENDING` does.
- `_magesim.js` pins seven cloths, 35 robe pieces and 64 Runecrafting acts in five tabs, and `_magesim.golden.json` pins the skill's structure and its XP table. Raid robes move all of them. Move them on purpose, in the commit that adds the robes, and say so.
- A cast that misses does 0 and applies no element. Echo and Attunement are for casts that landed.
- The combat tick can turn a miss into 1 damage: for melee and bows against a monster that is weak or resists, and for every weapon, spells included, when the crit roll comes up on a miss. That is an old fault in shared code with its own task. Do not build on it and do not fix it here. If it has been fixed by the time you read this, Echo and Attunement need no guard of their own.
- `#combatPanel` is rebuilt on every kill. Anything new on the fight screen acts on `pointerdown` from the document, as the spell bar does.
- The audit suite runs as the demo. Anything that needs a level past 10 has to lift `demoXpCap` the way the other blocks in it do.

BALANCE: THE REAL FILE MUST MEASURE WHAT THE PROTOTYPE MEASURED

Extend `_magesim.js`, do not start another harness. Add the best in slot table (38 rows), its summary and the twelve Spire walls, cut from `results.json` into the golden file. The real file has to reproduce them to the digit: a finished staff at 102.9% of a finished bow at Defence 500 and 100.5% at 1000, a wand and buckler at 101.2%, and a mage's wall on floor 30, floor 45 ascended. A difference is a porting bug, not a balance change.
Three places the core differs from the prototype on purpose. If a number cannot match because of one of them, say which, and show me both numbers:
1. Swift and Warded fold into one product in `playerSwingMs`, as Ranged styles do. The prototype rounded twice. At most 1 ms.
2. Rune prices.
3. The bow readout counts recovery (`arrowSaveRate`). The prototype's did not.
Add the mage to the balance sim at the end of `_spiretest.js`, beside melee and the archer. All three walls stay between floors 25 and 65, with lethality the limit and not the length of the fight.
The two harness rules stand: every measurement starts from `defaultState()`, and anything counted per hour is read at the Agility the character would really have.

ART

No painted art this session either. Every new item gets an inline SVG in `ICONS` and is pending in the audit. The 21 dropped weapons (twelve zone uniques, eight raid weapons, Faultline) are each their own shape, not a palette on the crafted silhouette: that is what makes them a find. Raid robes use the five robe silhouettes with three new palettes. Dawnveil is its own four. Thirteen Sorcery plates, drawn the way the other four columns' are. Six achievement icons.
Show me the contact sheet before anything ships. End by adding the sheet prompts for all of it to `_iconart/PROMPTS-magic.md`, under the 14 sheets the core left there.

RULES

- The full pipeline before every commit: `node --check`, `_validate.js`, `_raidmom.js`, `_spiretest.js`, `_audit_tests.js`, `_magesim.js`. Update the assertions that pin what this session moves: the list of unused materials loses Runed Bone, Drakeforged Rune and Riftshard, the Mastery board grows, the achievement count grows.
- Never break a save. Touch none of the frozen names.
- Test as Electron, with `?cvdev=1`.
- Bump the build only. The release number stays where it is.
- One push at the end, to all three channels, then `--status`.
- UK spelling. No em dashes. In-game copy says the mechanic in plain words and uses none of the banned words. A node says its number and stops.
- Watch the file size and tell me what it is at the end.
- Update CLAUDE.md at the end: the Magic section's "not built yet" list goes, the board is 166, the harness counts.

NOT THIS SESSION

Momentum that follows attack time (question 11): it was never simulated and it changes every slow weapon in the game. The Stormfeather Wand. Painted art. A Steam depot push. Do not half build any of them.

SHOW ME BEFORE YOU PUSH

Real screenshots from the real file, taken with `_magedesign/shootreal.js`:
1. The Mastery board with five columns at 1920 by 1080, and the Sorcery column close up with a node selected.
2. A zone unique's card beside the crafted weapon of its tier, and the Monster Log row that drops it.
3. A staff with a Wyrdstone in it, and a fight with an Arcane Draught running: the effects bar in view.
4. A raid robe card, the Dawnveil set with its bonus showing, and Faultline's card.
5. The Welcome Back summary after a mage ran out of runes while away.
6. The six achievements in the panel, and Runecrafting on The Ashen Circle's board.
7. The icon contact sheet.

END WITH

What shipped and at which build. The output of every harness. The best in slot table and the three walls, beside the prototype's. Anything that differs from the design and why. The file size. The art prompts. What I have to upload to Steam. And what, if anything, of Magic is still not built.

# Achievements: what is wrong, the new set, and the art to draw

Everything below is measured off the live file, not remembered. Run
`node _achaudit.js` to reproduce the audit numbers.

---

## 1. What is wrong now

The set was written at **v0.9.41**. Since then the game gained two skills, ranged
combat, sailing, guilds, raids and slayer. The set never moved.

### A live bug: Ashen Ascendant fires two skills early

```
its text        "Reach level 99 in all twelve skills."
its check       _achSkillsAtLeast(99) >= 12
skills in game  14
```

Verified: max every skill **except Thieving and Fletching** and it unlocks anyway.
The hardcoded `12` was right when there were twelve skills. Three sibling
achievements (`all_bosses`, `beastfriend`, `all_zones`) read their totals off the
data and are still correct, which is what this one should have done.

### The icons are twelve glyphs wearing thirty-three hats

**15 distinct icons across 33 achievements**, and they are the generic `ui_*`
interface glyphs, not achievement art:

```
4x  ui_flame     3x  ui_book    3x  ui_bolt    3x  ui_skull   3x  ui_paw
2x  ui_sword     2x  ui_spark   2x  ui_scroll  2x  ui_coin    2x  ui_swords
2x  ui_shield    2x  ui_gem
```

Mastery, Ashen Ascendant, Sanctum Broken and Hundred Million are the same flame.
On the Steam page they would be four identical tiles.

### Six systems have zero coverage

Not one achievement name or description contains any of:

> sail, ship, voyage, island, guild, quest, raid, fletch, bow, arrow, ranged,
> thiev, steal, farm, crop, cook, fish, forage, mine, smith

Sailing is 26 islands, 7 hulls, a consort and a commission chain. Guilds are 10
boards with a 6-rank ladder. There are 4 raids. None of it is worth a single
achievement today, while "hold 1,000 gold" is worth one.

### The world, for reference

```
skills 14   zones 12 (9 non-hunt)   bosses 9   pets 12   raids 4
guilds 10   hulls 7   isles 26   mastery cap 132   items 819
```

---

## 2. Ground rules for the rework

**Never change or remove an existing id.** `state.achievements` is keyed by id and
a Steam API Name is effectively permanent: rename one and every player who earned
it loses it on both surfaces. So all 33 stay, one gets its check repaired, and the
rest is additive.

**Every check reads a field that already exists.** Confirmed present in `state`:

```
sail.voyages  sail.found  sail.hull  sail.consort  sail.commsDone  sail.charts  sail.crew
gd[id].rep    gdTokens    GD_REP=[0,1500,6000,20000,55000,150000]  (6 ranks, 10 guilds)
slayer.tasksDone  slayer.streak  slayer.points  slayer.markTier
raidClears    raidBest    cmastZoneClears   cmastShards   cmastBossKills
playtimeMs  trophies  charms  sockets  enchantments  monKills  monDrops  discovered
patches  seeds  fishCasts  wcStrikes  mineStrikes  satchelUpgrades  gearPresets
```

Nothing below needs a new counter.

**Count off the data, never a literal.** `>= Object.keys(PETS).length`, not `>= 12`.
That is the whole lesson of Ashen Ascendant.

---

## 3. The new set

**33 existing + 27 new = 60.** Hidden ones are marked `H`.

### First Steps (6, unchanged)

Already tuned to fire inside the first fifteen minutes. Leave them alone.

| id | name | condition |
|---|---|---|
| `first_swing` | First Swing | first monster |
| `apprentice` | Apprentice | level 5 in any skill |
| `talent_scout` | Talent Scout | first passive point |
| `pocket_change` | Pocket Change | 1,000 gold |
| `curious` | Curious | 10 items discovered |
| `finding_feet` | Finding Your Feet | total level 25 |

### Skilling (7 existing, 4 new)

| id | name | condition |
|---|---|---|
| `journeyman` | Journeyman | total level 100 |
| `adept` | Adept | level 50 in any skill |
| `polymath` | Polymath | level 50 in five skills |
| `first_99` | Mastery | level 99 in any skill |
| `deep_tree` | Deep Roots | 50 points in one tree |
| `full_tree` | Grandmaster | fill a 98-point tree |
| `ashen_ascend` | Ashen Ascendant | **FIX** `>= Object.keys(SKILLS).length` |
| `well_rounded` **new** | Well Rounded | level 25 in every skill |
| `two_trees` **new** | Twice Rooted | fill two 98-point trees |
| `caped` **new** | Caped | own three skillcapes |
| `total_1500` **new** | Fifteen Hundred | total level 1,500 |

### Combat (8 existing, 3 new)

| id | name | condition |
|---|---|---|
| `blooded` `veteran` `first_boss` `thousand_kills` | | unchanged |
| `zone_three` `slayer_ten` `all_bosses` `demon_lord` | | unchanged |
| `hundred_thousand` **new** | Red Ledger | 100,000 kills |
| `untouchable` **new** | Untouchable | clear a raid without eating |
| `mastery_full` **new** | Full Board | spend all 132 mastery points |

### Ranged and Fletching (5, all new)

The 0.9.124 headline, currently unmentioned.

| id | name | condition |
|---|---|---|
| `first_arrow` **new** | Nocked | fletch your first arrow |
| `bowyer` **new** | Bowyer | string a bow of every wood |
| `quivered` **new** | Quivermaster | hold 1,000 arrows at once |
| `crossbow_kill` **new** | Bolt From The Dark | kill with a crossbow equipped |
| `fletch_99` **new** | Straight and True | Fletching 99 |

### Sailing (6, all new)

| id | name | condition |
|---|---|---|
| `first_voyage` **new** | Cast Off | `sail.voyages >= 1` |
| `ten_isles` **new** | Chartmaker | 10 islands found |
| `all_isles` **new** | Cartographer | every island found |
| `leviathan` **new** | Leviathan | build the top hull |
| `consort` **new** | Two Sails | bring the consort to parity |
| `commissions` **new** | The Admiralty | finish the commission chain |

### Guilds (4, all new)

| id | name | condition |
|---|---|---|
| `first_guild` **new** | Signed On | reach rank 2 in any guild |
| `guild_master` **new** | Master of the Hall | rank 6 in any guild |
| `five_guilds` **new** | Well Connected | rank 3 in five guilds |
| `all_guilds` **new** | Guildbound | rank 6 in every guild |

### Slayer and Raids (3, all new)

| id | name | condition |
|---|---|---|
| `slayer_hundred` **new** | Contracted | 100 slayer tasks |
| `slayer_streak` **new** | Unbroken | a 25-task streak |
| `all_raids` **new** | Gauntlet | clear every raid |

### Collection (8 existing, 2 new)

| id | name | condition |
|---|---|---|
| `first_pet` `beastfriend` `first_socket` `enchanter` | | unchanged |
| `archivist` `voidtouched` | | unchanged |
| `ember_whisperer` H `hearth_cat` H | | unchanged |
| `completionist` **new** | Completionist | discover 500 items |
| `trophy_hunter` **new** | Trophy Hunter | own five trophies |

### Endgame (4 existing, 4 new)

| id | name | condition |
|---|---|---|
| `rich` `shard_bearer` `xp_100m` `all_zones` | | unchanged |
| `billionaire` **new** | Emberking | hold 1,000,000,000 gold |
| `xp_1b` **new** | Billion | 1,000,000,000 total skilling XP |
| `hundred_hours` **new** | Long Haul | 100 hours played |
| `everything` H **new** | Cindervale | earn every other achievement |

---

## 4. Steam side

Steamworks: **Technical Tools > Edit Steamworks Settings > Stats & Achievements**.
API Name must match the in-game `id` exactly, case-sensitive, because that is the
string `steamAchievement(id)` sends.

Each one needs **two 64x64 icons: unlocked in colour, locked in grey.** Do not draw
the locked set. Derive it from the unlocked one the way `recolour.js` already
gradient-maps a tier ladder: desaturate, drop to about 45% brightness, and keep the
silhouette. One drawn icon per achievement, 60 total.

`steam_achievements.txt` in the wrapper folder is the paste-ready schema and needs
regenerating from `ACHIEVEMENTS` once the set is final. Worth making that a script
rather than a hand-edit, so the two can never disagree.

**Do not upload the schema until the ids are frozen.** A renamed API Name orphans
every unlock already earned against it.

---

## 5. The icon art

**60 icons, four sheets of 16 at 4x4.** Style block from `PROMPTS.md` first, exactly
as the fletching batch was done, then one sheet at a time.

These are not item icons. An achievement icon is a **single emblem** read at 64px in
a list of other games' achievements, so it wants one shape, one accent colour, and
no scene. The house rule about silhouette carrying it matters double here.

````
Paste once, before the sheets:

You are drawing ACHIEVEMENT EMBLEMS for a dark-fantasy idle RPG. I will give you
one SHEET at a time. Draw every emblem on that sheet in ONE image, as a labelled
grid, on a single flat pure-white background, with the short label in small plain
text under each cell.

STYLE - identical on every sheet, this is the whole point
Hand-painted stylised emblem. ONE object per cell, centred, filling about 85% of
the cell. Bold clean shapes with a dark ink outline holding the silhouette. Flat
cel-like shading, three or four value steps, NOT smooth gradients. Strong rim light
along one edge, deep shadow opposite.

Dark-fantasy palette: aged bronze, ember orange, bone white, deep forest green,
cold steel blue, near-black. One accent colour per emblem, never a rainbow.

These are displayed at SIXTY-FOUR PIXELS in a list. Use less detail than feels
right. No scene, no background object, no ground line, no landscape, no text or
numerals anywhere in the art, no ribbons or banners with words on them.

It must read from its silhouette alone with no colour at all.

BACKGROUND
Flat pure white, edge to edge, behind the whole sheet. No gradient, no vignette,
no drop shadow.
````

### Sheet A - First Steps and Skilling (16, grid 4x4)

````
SHEET: Achievement emblems, set A. 16 cells, 4 across and 4 down.

  1.  First Swing        a short sword, point down, one nick in the edge
  2.  Apprentice         a single candle, newly lit
  3.  Talent Scout       a sprouting seed inside a hexagon frame
  4.  Pocket Change      a small coin pouch, drawstring open, three coins
  5.  Curious            an open book with a magnifying glass over it
  6.  Finding Your Feet  a worn leather boot, mid-stride
  7.  Journeyman         a walking staff and a rolled travel pack
  8.  Adept              a candle burned halfway, flame steady and tall
  9.  Polymath           five small tools fanned out from one point
  10. Mastery            a laurel wreath closed into a full circle
  11. Deep Roots         a tree stump seen from the side, roots reaching down
  12. Grandmaster        a crown made of tree roots
  13. Ashen Ascendant    a phoenix feather, edges burning to ash
  14. Well Rounded       a perfect circle of fourteen small dots
  15. Twice Rooted       two crowns of roots, interlocked
  16. Caped              three skillcapes hanging on one peg
````

### Sheet B - Combat, Ranged and Fletching (16, grid 4x4)

````
SHEET: Achievement emblems, set B. 16 cells, 4 across and 4 down.

  1.  Fifteen Hundred    a tall stack of five stone tablets
  2.  Blooded            a round shield with one deep dent
  3.  Veteran            a helmet, visor down, scarred across the brow
  4.  Giant Slayer       a huge broken tusk with a small dagger beside it
  5.  Butcher            a cleaver embedded in a chopping block
  6.  Trailblazer        a banner planted in bare rock
  7.  Contract Killer    a rolled contract with a bloodied wax seal
  8.  Throneless         an empty stone throne, cracked down the middle
  9.  Sanctum Broken     a horned demon skull, one horn snapped off
  10. Red Ledger         a thick ledger, edges of the pages stained red
  11. Untouchable        a shield with no marks at all, faint halo behind it
  12. Full Board         a hexagonal board with every node lit
  13. Nocked             a single arrow, fletchings freshly bound
  14. Bowyer             seven bow staves standing in a rack
  15. Quivermaster       a quiver overflowing with arrows
  16. Bolt From The Dark a crossbow bolt half in shadow, tip catching light
````

### Sheet C - Sailing, Guilds, Slayer and Raids (16, grid 4x4)

````
SHEET: Achievement emblems, set C. 16 cells, 4 across and 4 down.

  1.  Straight and True  an arrow that has split a second arrow lengthwise
  2.  Cast Off           a mooring rope, cut clean, one end falling
  3.  Chartmaker         a rolled sea chart with a compass rose showing
  4.  Cartographer       a full sea chart, corners weighted, islands marked
  5.  Leviathan          a vast whale tail rising out of flat water
  6.  Two Sails          two sails side by side, the smaller matching the larger
  7.  The Admiralty      an anchor crossed with a spyglass
  8.  Signed On          a quill signing the foot of a contract
  9.  Master of the Hall a guild seal ring, face up
  10. Well Connected     five seal rings on one cord
  11. Guildbound         a ring of ten small seals forming a circle
  12. Contracted         a spike through a thick stack of finished contracts
  13. Unbroken           an unbroken chain loop, one link glowing
  14. Gauntlet           an armoured gauntlet closed into a fist
  15. Companion          a small paw print inside a heart outline
  16. Beastfriend        twelve small paw prints arranged in a circle
````

### Sheet D - Collection and Endgame (12, grid 4x3)

````
SHEET: Achievement emblems, set D. 12 cells, 4 across and 3 down.

  1.  Jeweller           a faceted gem seated in a metal socket
  2.  Enchanter          a rune burning on a blade
  3.  Archivist          a wall of scrolls in pigeonholes
  4.  Voidtouched        a black heart with violet light in the cracks
  5.  Completionist      a display case of small trophies, seen front on
  6.  Trophy Hunter      a mounted antlered skull
  7.  Dragon's Hoard     a mound of coins with a single goblet on top
  8.  Shard Bearer       a floating shard of crystal, lit from within
  9.  Hundred Million    an hourglass whose sand is glowing embers
  10. Realm Walker       a doorway of standing stones with light through it
  11. Emberking          a crown of ember and blackened iron
  12. Cindervale         the game's own brandmark as a struck medal
````

The two hidden ones (`ember_whisperer`, `hearth_cat`) keep the art they have:
Smokey's face IS the reward on the second, and a padlock until then is the point.
`Long Haul`, `Billion` and `Fifteen Hundred` can share Sheet D's spares if you would
rather 64 than 60.

### After they land

Same pipeline as the fletching batch:

```bash
node _iconart/slice.js sheets/ach_a.png sheets/ach_a.txt --grid 4x4
node _iconart/key.js --only "<ids>"
node _iconart/pack.js --picks _iconart/picks_ach.json --out pack_ach.json --size 96
```

Then a new injector for the achievement icons, and a second pass that writes the
64x64 greyscale locked set for Steam. Neither exists yet; `injectnodes.js` is the
closest template.

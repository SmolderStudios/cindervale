# Item art — full redo prompt pack

Paste **the style block** once at the start of a ChatGPT conversation, then feed it
one sheet at a time. Save each result to the Desktop and I will slice it:

```bash
node _iconart/slice.js sheets/<name>.png sheets/<name>.txt --grid <cols>x<rows>
```

`slice.js` does not read the captions — the ORDER in each list below is the contract.

---

## The style block

````
You are drawing item icons for a dark-fantasy RPG inventory. I will give you one
SHEET at a time. Draw every item on that sheet in ONE image, as a labelled grid, on a
single flat pure-white background, with the item's short label in small plain text
under each cell.

STYLE — identical on every sheet, this is the whole point
Hand-painted stylised fantasy game icon. Bold clean shapes with a dark ink outline
holding the silhouette. Flat cel-like shading — three or four value steps, NOT smooth
gradients. Chunky slightly exaggerated proportions. Strong rim light along one edge,
deep shadow opposite. Rich saturated colour.

It must read as a painted game icon, NOT a photograph, NOT photorealistic, NOT a 3D
render, NOT a scanned texture study. Use LESS detail than feels right: each icon is
displayed to players at about 20 pixels, so the silhouette and two or three big shapes
are all that survive. Never draw fur strand by strand or scales one at a time.

FRAMING
Exactly ONE object per cell, centred, filling about 90% of its cell. Never a pile,
never a scene, never a container of other things. No plinth, no table, no ground line,
no landscape, no hands, nobody holding or wearing anything.

BACKGROUND
Flat pure white, edge to edge, behind the whole sheet. No gradient, no vignette, no
drop shadow under the objects.

A few names are deliberately misleading — "Moonstone Eye" is a gemstone, not the moon
and not an eyeball. Where a name reads oddly, draw the object, not the thing it is
named after.
````

---

## Sheets

| # | sheet | items | grid |
|---|---|---|---|
| 1 | Bars, ores, logs & fire | 30 | 6x5 |
| 2 | Gems — rough and cut | 31 | 6x6 |
| 3 | Herbs, produce & seeds | 34 | 6x6 |
| 4 | Fish & cooked food | 31 | 5x5 |
| 5 | Potions & reagents | 32 | 6x6 |
| 6 | Monster drops | 72 | 7x7 |
| 7 | Hunting hides | 19 | 5x4 |
| 8 | Sailing & the sea | 31 | 6x5 |
| 9 | Jewellery | 40 | 7x6 |
| 10 | Tools I — axes, picks, rods | 32 | 6x6 |
| 11 | Tools II — the rest | 34 | 6x6 |
| 12 | Skilling outfits I | 24 | 6x4 |
| 13 | Skilling outfits II | 24 | 6x4 |
| 14 | Crafted ladder — helm (7 tiers) | 7 | 4x2 |
| 15 | Crafted ladder — chest (7 tiers) | 7 | 4x2 |
| 16 | Crafted ladder — legs (7 tiers) | 7 | 4x2 |
| 17 | Crafted ladder — gloves (7 tiers) | 7 | 4x2 |
| 18 | Crafted ladder — boots (7 tiers) | 7 | 4x2 |
| 19 | Crafted ladder — shield (7 tiers) | 7 | 4x2 |
| 20 | Crafted ladder — buckler (7 tiers) | 7 | 4x2 |
| 21 | Crafted ladder — cape (7 tiers) | 7 | 4x2 |
| 22 | Unique set — voidsteel | 7 | 4x2 |
| 23 | Unique set — gravesteel | 6 | 3x2 |
| 24 | Unique set — moltensteel | 7 | 4x2 |
| 25 | Unique set — barrow | 6 | 3x2 |
| 26 | Unique set — dawnward | 4 | 4x1 |
| 27 | Unique set — sunweave | 4 | 4x1 |
| 28 | Unique set — emberforged | 2 | 2x1 |
| 29 | Leather ladder — helm (10 hides) | 10 | 5x2 |
| 30 | Leather ladder — chest (10 hides) | 10 | 5x2 |
| 31 | Leather ladder — legs (10 hides) | 10 | 5x2 |
| 32 | Leather ladder — gloves (10 hides) | 10 | 5x2 |
| 33 | Leather ladder — boots (10 hides) | 10 | 5x2 |
| 34 | Armour — one-off pieces | 20 | 5x4 |
| 35 | Weapons 1 | 24 | 6x4 |
| 36 | Weapons 2 | 24 | 6x4 |
| 37 | Weapons 3 | 24 | 6x4 |
| 38 | Weapons 4 | 5 | 6x4 |
| 39 | Cured leathers | 10 | 5x2 |
| 40 | THE ONES WE MISSED — catch-up sheet | 4 | 4x2 |

**687 items across 40 sheets.**

---

### Sheet 1 — Bars, ores, logs & fire

`30 items · grid 6x5`

````
SHEET: Bars, ores, logs & fire
Grid 6x5, labelled, flat white background, house style as given.

The SMELTED ladder bars — Bronze, Iron, Steel, Mithril, Cobalt, Runite, Starsteel, Gold, Silver — are one identical ingot in different metals: same shape, same angle, same highlight, colour is the only difference.

The bars that are NOT smelted from ore — Voidsteel and Starfall — must NOT use that ingot shape. Give each its own form so it reads as rare on sight: Voidsteel a cracked jagged block with violet light in the fissures, Starfall a rough unfinished lump still white-hot with sparks lifting off it. Neither is a tidy cast ingot.

Ores are lumpy raw rock with the metal showing in veins. Logs are cross-cut sections with visible end grain, not whole trees.

CELLS:
  1. Ancient Log                — short cut log of ancient goldenwood
  2. Bronze Bar                 — long rectangular cast metal ingot lying flat
  3. Charcoal                   — stick of charcoal
  4. Coal                       — rough broken lump of coal
  5. Cobalt Bar                 — long rectangular cast metal ingot lying flat
  6. Cobalt Ore                 — rough broken lump of raw cobalt ore
  7. Copper Ore                 — rough broken lump of raw copper ore
  8. Deep Amber                 — teardrop of deep amber resin
  9. Bleached Driftwood         — piece of sea bleached driftwood
 10. Emberwood Log              — short cut log of emberwood
 11. Frostwood Log              — short cut log of frostwood
 12. Gold Bar                   — long rectangular cast metal ingot lying flat
 13. Gold Ore                   — rough broken lump of raw gold ore
 14. Iron Bar                   — long rectangular cast metal ingot lying flat
 15. Iron Ore                   — rough broken lump of raw iron ore
 16. Ironbark Log               — short cut log of ironbark
 17. Mithril Bar                — long rectangular cast metal ingot lying flat
 18. Mithril Ore                — rough broken lump of raw mithril ore
 19. Oak Log                    — short cut log of oak
 20. Pine Log                   — short cut log of pale pine
 21. Runite Bar                 — long rectangular cast metal ingot lying flat
 22. Runite Ore                 — rough broken lump of raw runite ore
 23. Shadowwood Log             — short cut log of shadowwood
 24. Silver Bar                 — long rectangular cast metal ingot lying flat
 25. Silver Ore                 — rough broken lump of raw silver ore
 26. Starfall Bar               — long rectangular cast metal ingot lying flat at a raised three quarter angle
 27. Starsteel Bar              — long rectangular cast metal ingot lying flat
 28. Starsteel Ore              — rough broken lump of raw starsteel ore
 29. Steel Bar                  — long rectangular cast metal ingot lying flat
 30. Tin Ore                    — rough broken lump of raw tin ore
````

<details><summary>id order for <code>sheets/bars-ores-logs-fire.txt</code></summary>

```
ancient_log
bronze_bar
charcoal
coal
cobalt_bar
cobalt_ore
copper_ore
deep_amber
driftwood
ember_log
frost_log
gold_bar
gold_ore
iron_bar
iron_ore
ironbark_log
mithril_bar
mithril_ore
oak_log
pine_log
runite_bar
runite_ore
shadow_log
silver_bar
silver_ore
starfall_bar
starsteel_bar
starsteel_ore
steel_bar
tin_ore
```
</details>

---

### Sheet 2 — Gems — rough and cut

`31 items · grid 6x6`

````
SHEET: Gems — rough and cut
Grid 6x6, labelled, flat white background, house style as given.

Rough gems are lumpy uncut mineral chunks with a crystalline face; cut gems are faceted and symmetrical with sharp highlights. The two groups must not look alike.

CELLS:
  1. Amethyst                   — rough uncut amethyst crystal
  2. Chipped Azure              — small rough chipped gemstone
  3. Flawless Azure             — large flawless brilliant cut gemstone seen face on
  4. Polished Azure             — cut and polished oval gemstone seen face on
  5. Bloodstone                 — rough uncut bloodstone
  6. Cut Amethyst               — brilliant cut amethyst gemstone
  7. Cut Diamond                — brilliant cut diamond
  8. Cut Dragon Gem             — brilliant cut dragonstone
  9. Cut Emerald                — emerald cut gemstone
 10. Cut Ruby                   — brilliant cut ruby gemstone
 11. Cut Sapphire               — brilliant cut sapphire gemstone
 12. Cut Void Crystal           — brilliant cut void gemstone
 13. Diamond                    — rough uncut diamond crystal
 14. Dragon Gem                 — rough uncut dragonstone crystal
 15. Emerald                    — rough uncut emerald crystal
 16. Chipped Onyx               — small rough chipped gemstone
 17. Flawless Onyx              — large flawless brilliant cut gemstone seen face on
 18. Polished Onyx              — cut and polished oval gemstone seen face on
 19. Pearl                      — large round pearl
 20. Ruby                       — rough uncut ruby crystal
 21. Chipped Sanguine           — small rough chipped gemstone
 22. Flawless Sanguine          — large flawless brilliant cut gemstone seen face on
 23. Polished Sanguine          — cut and polished oval gemstone seen face on
 24. Sapphire                   — rough uncut sapphire crystal
 25. Chipped Topaz              — small rough chipped gemstone
 26. Flawless Topaz             — large flawless brilliant cut gemstone seen face on
 27. Polished Topaz             — cut and polished oval gemstone seen face on
 28. Chipped Verdant            — small rough chipped gemstone
 29. Flawless Verdant           — large flawless brilliant cut gemstone seen face on
 30. Polished Verdant           — cut and polished oval gemstone seen face on
 31. Void Crystal               — rough uncut void crystal
````

<details><summary>id order for <code>sheets/gems-rough-and-cut.txt</code></summary>

```
amethyst
azure_chip
azure_flaw
azure_polish
bloodstone
cut_amethyst
cut_diamond
cut_dragon
cut_emerald
cut_ruby
cut_sapphire
cut_void
diamond
dragon_gem
emerald
onyx_chip
onyx_flaw
onyx_polish
pearl
ruby
sanguine_chip
sanguine_flaw
sanguine_polish
sapphire
topaz_chip
topaz_flaw
topaz_polish
verdant_chip
verdant_flaw
verdant_polish
void_crystal
```
</details>

---

### Sheet 3 — Herbs, produce & seeds

`34 items · grid 6x6`

````
SHEET: Herbs, produce & seeds
Grid 6x6, labelled, flat white background, house style as given.

Herbs are cut sprigs with leaves and a stem. Seeds are small closed cloth pouches with a few seeds spilled at the mouth — the pouch colour is the only thing that separates them, so make it strong.

CELLS:
  1. Ashbloom                   — grey white ash coloured flower
  2. Ashbloom Seed              — small drawstring cloth seed pouch tied at the neck
  3. Bloodcap                   — mushroom with a deep blood red domed cap and a pale stalk
  4. Bloodcap Seed              — small drawstring cloth seed pouch tied at the neck
  5. Dewleaf                    — broad green leaf beaded with bright dew drops
  6. Dewleaf Seed               — small drawstring cloth seed pouch tied at the neck
  7. Emberbloom                 — flower with glowing ember orange petals
  8. Emberbloom Seed            — small drawstring cloth seed pouch tied at the neck
  9. Frostcrocus                — pale ice blue crocus flower
 10. Frostcrocus Seed           — small drawstring cloth seed pouch tied at the neck
 11. Garden Root                — pulled root vegetable
 12. Herb Seed                  — small drawstring cloth seed pouch tied at the neck
 13. Nightbloom                 — pale silver white flower head seen face on
 14. Nightbloom Seed            — small drawstring cloth seed pouch tied at the neck
 15. Moonpetal Seed             — small drawstring cloth seed pouch tied at the neck
 16. Nightshade                 — sprig of nightshade
 17. Nightshade Seed            — small drawstring cloth seed pouch tied at the neck
 18. Starfern                   — frond of fern with tiny luminous pale blue star lights along it
 19. Starfern Seed              — small drawstring cloth seed pouch tied at the neck
 20. Dawnbloom                  — golden flower head seen face on
 21. Sunroot                    — golden yellow taproot with fine hairs
 22. Sunroot Seed               — small drawstring cloth seed pouch tied at the neck
 23. Tearmoss                   — tuft of soft blue green moss beaded with clear droplets
 24. Tearmoss Seed              — small drawstring cloth seed pouch tied at the neck
 25. Thornvine                  — curling length of thorny green vine
 26. Thornvine Seed             — small drawstring cloth seed pouch tied at the neck
 27. Voidbloom                  — near black flower head seen face on
 28. Voidbloom Seed             — small drawstring cloth seed pouch tied at the neck
 29. Riftmoss Seed              — small drawstring cloth seed pouch tied at the neck
 30. Wild Herb                  — cutting of wild herb
 31. Wildberries                — small cluster of deep red wild berries on a short green stem with two leaves
 32. Wildberry Seed             — small drawstring cloth seed pouch tied at the neck
 33. Witchhazel                 — sprig of witch hazel
 34. Witchhazel Seed            — small drawstring cloth seed pouch tied at the neck
````

<details><summary>id order for <code>sheets/herbs-produce-seeds.txt</code></summary>

```
ashbloom
ashbloom_seed
bloodcap
bloodcap_seed
dewleaf
dewleaf_seed
emberbloom
emberbloom_seed
frostcrocus
frostcrocus_seed
garden_root
herb_seed
moonflower
moonflower_seed
moonpetal_seed
nightshade
nightshade_seed
starfern
starfern_seed
sunbloom
sunroot
sunroot_seed
tearmoss
tearmoss_seed
thornvine
thornvine_seed
voidbloom
voidbloom_seed
voidmoss_seed
wild_herb
wildberries
wildberry_seed
witchhazel
witchhazel_seed
```
</details>

---

### Sheet 4 — Fish & cooked food

`31 items · grid 5x5`

````
SHEET: Fish & cooked food
Grid 5x5, labelled, flat white background, house style as given.

Raw fish are whole and wet-looking with a visible eye; cooked dishes are browned, charred or plated cuts. A cooked item must never look raw.

CELLS:
  1. boar_roast                 — roasted haunch of meat on one bone
  2. Bone Marrow Stew           — wooden bowl of thick brown stew with one bone standing in it
  3. Cooked Minnow              — cooked fish
  4. Cooked Salmon              — cooked fish
  5. Cooked Sardine             — cooked fish
  6. Cooked Shark               — cooked fish
  7. Cooked Swordfish           — cooked fish lying side on
  8. Cooked Trout               — cooked fish
  9. Cooked Tuna                — cooked fish
 10. Cooked Void Eel            — cooked fish
 11. Drake Roast                — roasted joint of drake meat on the bone
 12. elk_haunch                 — smoked haunch of dark meat on one bone
 13. Goblin Jerky               — curled strip of dark dried jerky
 14. Infernal Roast             — roasted joint of meat on the bone wreathed in low orange flame
 15. Marrow Broth               — wooden bowl of steaming pale marrow broth
 16. Ogre Roast                 — huge roasted joint of meat on the bone
 17. Ratmeat Skewer             — wooden skewer threaded with three chunks of roasted meat
 18. Raw Minnow                 — small silver minnow fish
 19. Raw Salmon                 — salmon
 20. Raw Sardine                — sardine fish
 21. Raw Shark                  — small shark
 22. Raw Swordfish              — swordfish with its long flat bill
 23. Raw Trout                  — speckled brown trout
 24. Raw Tuna                   — tuna
 25. Raw Void Eel               — eel of living shadow
 26. rhino_steak                — thick cut steak
 27. Salt Cod                   — split and flattened fish fillet lying flat and open like a board
 28. Ship's Biscuit             — round hardtack ship biscuit
 29. Silk Poultice              — folded pad of pale silk dressing tied with a cord
 30. Troll Stew                 — wooden bowl of murky green troll stew
 31. Wolf Jerky                 — Three flat strips of dried dark red meat lying loosely stacked on nothing
````

<details><summary>id order for <code>sheets/fish-cooked-food.txt</code></summary>

```
boar_roast
bone_stew
cooked_minnow
cooked_salmon
cooked_sardine
cooked_shark
cooked_swordfish
cooked_trout
cooked_tuna
cooked_voideel
drake_roast
elk_haunch
goblin_jerky
infernal_roast
marrow_broth
ogre_roast
ratmeat_skewer
raw_minnow
raw_salmon
raw_sardine
raw_shark
raw_swordfish
raw_trout
raw_tuna
raw_voideel
rhino_steak
salt_cod
ships_biscuit
silk_poultice
troll_stew
wolf_jerky
```
</details>

---

### Sheet 5 — Potions & reagents

`32 items · grid 6x6`

````
SHEET: Potions & reagents
Grid 6x6, labelled, flat white background, house style as given.

Every potion is a stoppered glass bottle — vary the BOTTLE SHAPE as well as the liquid colour so they are told apart at 20px. Reagents are raw substances, not bottles.

CELLS:
  1. Abyssal Scale              — large flat teardrop-shaped scale lying on its own
  2. Ancient Seed               — large gnarled seed pod
  3. Arcane Dust                — A small conical heap of fine violet blue arcane dust
  4. Ash                        — A small conical heap of soft grey ash
  5. Berserker's Brew I         — stoppered glass potion bottle with a cork
  6. Berserker's Brew II        — stoppered glass potion bottle with a cork
  7. Bird's Nest                — woven twig birds nest holding one speckled egg
  8. Bountiful Potion I         — stoppered glass potion bottle with a cork
  9. Bountiful Potion III       — stoppered glass potion bottle with a cork
 10. Ember Resin                — blob of glowing orange tree resin
 11. Energy Crystal             — bright yellow crystal shard crackling with light
 12. Golden Spore               — luminous golden spore puffball with a soft glow around it
 13. Lesser Healing Draught     — stoppered glass potion bottle with a cork
 14. Healing Draught            — stoppered glass potion bottle with a cork
 15. Greater Healing Draught    — stoppered glass potion bottle with a cork
 16. Master Healing Elixir      — stoppered glass potion bottle with a cork
 17. Honed Edge Potion I        — stoppered glass potion bottle with a cork
 18. Honed Edge Potion II       — stoppered glass potion bottle with a cork
 19. Ironhide Potion I          — stoppered glass potion bottle with a cork
 20. Ironhide Potion II         — stoppered glass potion bottle with a cork
 21. Mana Essence               — floating orb of luminous pale blue mana
 22. Philosopher's Drop         — tiny slender glass vial of luminous liquid gold
 23. Rune Fragment              — broken shard of grey stone carved with one glowing rune
 24. Shadow Crystal             — jagged crystal of shadow
 25. Stamina Shard              — pale green crystal shard with a soft inner glow
 26. Swiftness Potion I         — stoppered glass potion bottle with a cork
 27. Swiftness Potion III       — stoppered glass potion bottle with a cork
 28. Vitality Elixir            — stoppered glass potion bottle with a cork
 29. Void Essence               — small round flask of swirling black and violet essence
 30. Warrior's Triple Brew      — stoppered glass potion bottle with three joined chambers holding red
 31. Wisdom Potion I            — stoppered glass potion bottle with a cork
 32. Wisdom Potion III          — stoppered glass potion bottle with a cork
````

<details><summary>id order for <code>sheets/potions-reagents.txt</code></summary>

```
abyssal_scale
ancient_seed
arcane_dust
ash
berserker_1
berserker_2
birds_nest
bountiful_i
bountiful_iii
ember_resin
energy_crystal
golden_spore
heal_draught_1
heal_draught_2
heal_draught_3
heal_draught_4
honed_edge_1
honed_edge_2
ironhide_1
ironhide_2
mana_essence
philosophers_drop
rune_fragment
shadow_crystal
stamina_shard
swiftness_i
swiftness_iii
vitality
void_essence
warriors_brew
wisdom_i
wisdom_iii
```
</details>

---

### Sheet 6 — Monster drops

`72 items · grid 7x7`

````
SHEET: Monster drops
Grid 7x7, labelled, flat white background, house style as given.

These are BODY PARTS AND TROPHIES, never the creature. A fang is one tooth. A claw is one claw. A scale is one flat scale. An eye is one eyeball. If the name contains an animal, the animal must not appear.

CELLS:
  1. Alpha Claw                 — large curved talon lying on its own
  2. Ancient Bone               — long weathered bone
  3. Barrow Dust                — small cloth pouch lying on its side with its drawstring open and a low spil…
  4. Beast Sinew                — coil of pale dried sinew cord
  5. Bone Charm                 — charm of small bones bound with cord into a rough star
  6. Brimstone                  — rough broken lump of brimstone
  7. Chitin Plating             — curved plate of hard dark amber chitin armour
  8. Chitin Shard               — broken splinter of hard insect shell lying on nothing
  9. Cinder Gland               — fleshy dark red organ sac with hot orange light glowing inside it
 10. Crown Fragment             — broken piece torn from a gold crown
 11. Crude Cleaver              — heavy butcher's cleaver standing upright
 12. Cursed Dust                — small cloth pouch lying on its side with its drawstring open and a low spil…
 13. Dawnshard                  — jagged shard of radiant pale gold crystal standing on end
 14. Dragon Fang                — huge curved ivory dragon fang
 15. Dragonheart                — large dark red heart wreathed in faint orange fire
 16. Drakeforged Rune           — flat stone rune tablet standing upright
 17. Ectoplasm                  — blob of translucent pale green ectoplasm
 18. Ember Crest                — curved bony plate standing on end
 19. Ember Dust                 — small cloth pouch lying on its side with its drawstring open and a low spil…
 20. Emberweave                 — loose rectangle of cloth lying draped on nothing
 21. Emberwyrm Eye              — large round dragon eye gem
 22. Frostfur                   — loose clump of long white hair lying on nothing
 23. Gem Dust                   — small cloth pouch lying on its side with its drawstring open and a low spil…
 24. Gnawed Bone                — short gnawed bone with chew marks at both ends
 25. Goblin Ear                 — severed pointed ear lying flat on nothing
 26. Goblin Tooth               — crooked yellow goblin tooth
 27. Gorestone                  — blood red stone with a bright wet highlight across its top face and deep cr…
 28. Granite Core               — rounded core of grey granite with a faint inner light
 29. Granite Sigil              — flat grey stone disc carved with a mountain sigil
 30. Grave Iron                 — corroded bar of grave iron
 31. Gull Egg                   — speckled pale blue gull egg
 32. Hellheart                  — blackened heart burning from within with orange fire
 33. Howling Horn               — curved animal horn banded with leather at the mouthpiece
 34. Infernal Crest             — horned black crest plate cracked with molten orange light
 35. Lich's Phylactery          — small black iron reliquary box bound in chains
 36. Molten Bar                 — long metal ingot lying flat seen from a raised three quarter angle
 37. Moonstone Eye              — small polished gemstone held up alone
 38. Mountain Heart             — rounded core of pale veined stone
 39. Ogre Tusk                  — thick curved tooth lying on its own
 40. Pack-Eye                   — amber eyeball on its own
 41. Rat Fang                   — small curved tooth lying on its own
 42. Rat Tail                   — long thin severed tail lying curled into a loose S on nothing
 43. Rib Plate                  — long curved rib bone lying on nothing
 44. Riftshard                  — jagged shard of violet black crystal standing on end
 45. Rock Salt                  — chunk of coarse white rock salt crystal
 46. Royal Rat Sigil            — small round coin-like medallion of tarnished gold held flat and face-on
 47. Runed Bone                 — long bone carved with glowing blue runes
 48. Rusted Blade               — broken sword blade
 49. Seer Idol                  — squat carved stone idol with a single closed eye
 50. Shade Ember                — floating ember of cold violet fire
 51. Shaman's Tooth             — long tooth carved with crude runes
 52. Silken Sigil               — pale sigil disc woven from spider silk
 53. Soul Shard                 — jagged shard of pale blue soul glass
 54. Spider Silk                — loose skein of pale spider silk
 55. Spinneret                  — small dark chitinous nozzle-like organ standing on its cut base
 56. Splintered Club            — crude wooden club
 57. Tanned Hide                — rolled bundle of plain tanned leather tied with cord
 58. Tribal Fetish              — crude tribal fetish of bound sticks
 59. Troll Blood                — stoppered glass vial standing upright
 60. Tyrant Heart               — huge dark red heart
 61. Venom Sac                  — translucent green venom sac
 62. Void Cinder                — small lump of burnt black rock lying on nothing
 63. Voidheart                  — dark crystalline heart pulsing with violet light
 64. Voidsteel Bar              — long rectangular cast metal ingot lying flat at a raised three quarter angle
 65. Voidweave                  — loose rectangle of cloth lying draped on nothing
 66. Warchief's Banner          — tattered goblin war banner on a short broken pole
 67. Warhound Fang              — heavy blunt fang
 68. Warlord's Aegis            — enormous tower shield seen face on and filling the frame
 69. Warlord's Totem            — tall carved totem of bone and dark wood topped with a skull
 70. Wolf Fang                  — long curved white wolf fang
 71. Wraithcloth                — length of tattered pale grey shroud cloth hanging
 72. Wyrmscale                  — large flat teardrop-shaped scale lying on its own
````

<details><summary>id order for <code>sheets/monster-drops.txt</code></summary>

```
alpha_claw
ancient_bone
barrow_dust
beast_sinew
bone_charm
brimstone
chitin
chitin_shard
cinder_gland
crown_fragment
crude_cleaver
cursed_dust
dawnshard
dragon_fang
dragonheart
drakeforged_rune
ectoplasm
ember_crest
ember_dust
emberweave
emberwyrm_eye
frostfur
gem_dust
gnawed_bone
goblin_ear
goblin_tooth
gorestone
granite_core
granite_sigil
grave_iron
gull_egg
hellheart
howling_horn
infernal_crest
lich_phylactery
molten_bar
moonstone_eye
mountain_heart
ogre_tusk
pack_eye
rat_fang
rat_tail
rib_plate
riftshard
rock_salt
royal_rat_sigil
runed_bone
rusted_blade
seer_idol
shade_ember
shaman_tooth
silken_sigil
soul_shard
spider_silk
spinneret
splintered_club
tanned_hide
tribal_fetish
troll_blood
tyrant_heart
venom_sac
void_cinder
voidheart
voidsteel_bar
voidweave
warchief_banner
warhound_fang
warlord_aegis
warlord_totem
wolf_fang
wraithcloth
wyrmscale
```
</details>

---

### Sheet 7 — Hunting hides

`19 items · grid 5x4`

````
SHEET: Hunting hides
Grid 5x4, labelled, flat white background, house style as given.

Each is a flat stretched pelt seen from directly above, four short leg flaps at the corners, a neck flap at the top. Just the empty skin — no head, no face, no animal. They differ ONLY by fur colour and marking.

CELLS:
  1. bear_pelt                  — A flat stretched animal pelt lying spread out
  2. boar_hide                  — A flat stretched animal pelt lying spread out
  3. cinder_hide                — A flat stretched animal pelt lying spread out
  4. Demonhide                  — A flat stretched animal pelt lying spread out
  5. Drake Hide                 — A flat stretched animal pelt lying spread out
  6. elk_hide                   — A flat stretched animal pelt lying spread out
  7. Ironfang's Pelt            — A flat stretched animal pelt lying spread out
  8. jackal_pelt                — A flat stretched animal pelt lying spread out
  9. leopard_pelt               — A flat stretched animal pelt lying spread out
 10. lynx_pelt                  — A flat stretched animal pelt lying spread out
 11. mammoth_hide               — A flat stretched animal pelt lying spread out
 12. Ogre Hide                  — A flat stretched animal pelt lying spread out
 13. Raw Hide                   — A flat stretched animal pelt lying spread out
 14. rhino_hide                 — A flat stretched animal pelt lying spread out
 15. stag_hide                  — A flat stretched animal pelt lying spread out
 16. stalker_pelt               — A flat stretched animal pelt lying spread out
 17. timber_pelt                — A flat stretched animal pelt lying spread out
 18. Troll Hide                 — A flat stretched animal pelt lying spread out
 19. Wolf Pelt                  — A flat stretched animal pelt lying spread out
````

<details><summary>id order for <code>sheets/hunting-hides.txt</code></summary>

```
bear_pelt
boar_hide
cinder_hide
demonhide
drake_hide
elk_hide
ironfang_pelt
jackal_pelt
leopard_pelt
lynx_pelt
mammoth_hide
ogre_hide
ratskin
rhino_hide
stag_hide
stalker_pelt
timber_pelt
troll_hide
wolf_pelt
```
</details>

---

### Sheet 8 — Sailing & the sea

`31 items · grid 6x5`

````
SHEET: Sailing & the sea
Grid 6x5, labelled, flat white background, house style as given.

Nautical salvage and sea materials. Nothing here is a ship or a scene — each is one small object recovered from the water.

CELLS:
  1. Barnacle Iron              — rough lump of dark iron crusted over with white barnacles
  2. Salvaged Gun Barrel        — short cannon barrel lying flat
  3. Sailing Cape               — heavy oilskin sea cloak hanging from a shoulder clasp
  4. Drowned King's Chart       — rolled sea chart tied with cord
  5. Hangman's Chart            — rolled sea chart tied with cord
  6. Wrecker's Chart            — rolled sea chart tied with cord
  7. Chart of the Long Descent  — rolled sea chart tied with cord
  8. Drowned Coin               — old gold coin seen face on
  9. Drowned Ledger             — waterlogged ledger lying closed
 10. Fogweed                    — sprig of pale grey green weed
 11. Kelp Frond                 — long ribbon of dark green kelp
 12. Krakenbone                 — curved length of pale sea bone
 13. Leviathan Scale            — enormous flat teardrop-shaped scale lying on its own
 14. Mistglass                  — smooth pale grey glass sphere with slow white mist turning inside it
 15. Salt-Forged Iron           — long metal ingot lying flat seen from a raised three quarter angle
 16. Salvaged Powder            — small wooden powder keg standing upright
 17. Cracked Ship's Bell        — cracked bronze ship bell hanging from its yoke
 18. Siren Scale                — large iridescent scale
 19. Storm Petrel               — storm petrel in flight seen from the side
 20. Spire Stone                — tall narrow shard of dark basalt standing on end
 21. Starfall Cinder            — rough lump of meteoric cinder
 22. Tarred Rope                — thick rope coiled flat into a spiral of three or four visible turns lying o…
 23. Tide-Worn Glass            — smooth tumbled piece of pale sea green glass
 24. Tidewrought Heart          — fist-sized lump of fused blue-green sea glass and pink coral resting on not…
 25. Scale of the Old Thing     — enormous curved scale
 26. Hollowtide Almanac         — thick leather bound almanac lying closed
 27. The Steady Lantern         — brass ship lantern with a steady warm flame burning inside the glass
 28. Barnacled Coin-Purse       — fat leather coin purse crusted with white barnacles
 29. The Ninth Bell             — tarnished bronze ship bell hanging from its yoke
 30. Voidwood                   — short cut billet of near black driftwood
 31. Wrack Timber               — short length of splintered ship timber
````

<details><summary>id order for <code>sheets/sailing-the-sea.txt</code></summary>

```
barnacle_iron
cannon_barrel
cape_sailing
chart_crown
chart_gibbet
chart_gravekeel
chart_voidmaw
drowned_coin
drowned_ledger
fogweed
kelp_frond
krakenbone
leviathan_scale
mistglass
salt_iron
salvaged_powder
ship_bell
siren_scale
spet_sailing
spire_stone
starfall_cinder
tarred_rope
tide_glass
tidewrought
trove_far
trove_mist
trove_odd
trove_shallows
trove_wracks
voidwood
wrack_timber
```
</details>

---

### Sheet 9 — Jewellery

`40 items · grid 7x6`

````
SHEET: Jewellery
Grid 7x6, labelled, flat white background, house style as given.

Rings are open bands seen three-quarter with the hole clearly visible. Amulets and pendants hang from a visible chain. The gem is the accent, not the whole icon.

CELLS:
  1. Abyssal Pearl              — large dark pearl
  2. Abyssal Pendant            — pendant holding a dark blue green abyssal stone with a faint cold glow
  3. Alpha Fang Ring            — dark iron finger ring standing upright
  4. Amethyst Amulet            — amulet
  5. Amethyst Pendant           — pendant on a short gold chain
  6. Amethyst Ring              — gold ring seen at a three quarter angle
  7. Bloodstone Amulet          — amulet
  8. Bloodstone Pendant         — pendant on a short gold chain
  9. Bloodstone Ring            — gold ring seen at a three quarter angle
 10. Crown Jewel                — large ornate cut gemstone in a gold crown setting
 11. Diamond Amulet             — amulet
 12. Diamond Pendant            — pendant on a short gold chain
 13. Diamond Ring               — gold ring seen at a three quarter angle
 14. Dragon Amulet              — amulet
 15. Dragon Pendant             — pendant on a short gold chain
 16. Dragon Ring                — gold ring seen at a three quarter angle
 17. Drowned King's Jewel       — ornate waterlogged crown jewel
 18. Drowned Locket             — tarnished brass locket crusted with barnacles
 19. Emerald Amulet             — amulet
 20. Emerald Pendant            — pendant on a short gold chain
 21. Emerald Ring               — gold ring seen at a three quarter angle
 22. Mountain Locket            — heavy stone locket carved with a mountain peak
 23. Pearl Band                 — slim silver ring set with one round white pearl
 24. Ruby Amulet                — amulet
 25. Ruby Pendant               — pendant on a short gold chain
 26. Ruby Ring                  — gold ring seen at a three quarter angle
 27. Sailor's Locket            — small brass locket shaped like a ship wheel
 28. Sanctum Signet             — gold signet ring engraved with a burning sigil
 29. Sapphire Amulet            — amulet
 30. Sapphire Pendant           — pendant on a short gold chain
 31. Sapphire Ring              — gold ring seen at a three quarter angle
 32. Silkweave Band             — pale silver ring wound with fine spider silk threads
 33. Soulbound Amulet           — amulet on a dark chain holding a pale glowing soul wisp in a bone setting
 34. Tidebound Pearl            — large iridescent sea pearl with a faint green sheen
 35. Tidebound Ring             — ring of green sea glass and silver
 36. Void Amulet                — amulet
 37. Void Pendant               — pendant on a short gold chain
 38. Void Ring                  — gold ring seen at a three quarter angle
 39. Warband Torc               — open bronze neck torc with blunt animal head terminals
 40. Warren Signet              — heavy bronze signet ring engraved with a rat skull
````

<details><summary>id order for <code>sheets/jewellery.txt</code></summary>

```
abyssal_pearl
abyssal_pendant
alpha_fang_ring
amethyst_amulet
amethyst_pendant
amethyst_ring
bloodstone_amulet
bloodstone_pendant
bloodstone_ring
crown_jewel
diamond_amulet
diamond_pendant
diamond_ring
dragon_amulet
dragon_pendant
dragon_ring
drowned_jewel
drowned_locket
emerald_amulet
emerald_pendant
emerald_ring
mountain_locket
pearl_band
ruby_amulet
ruby_pendant
ruby_ring
sailors_locket
sanctum_signet
sapphire_amulet
sapphire_pendant
sapphire_ring
silkweave_band
soulbound_amulet
tidebound_pearl
tidebound_ring
void_amulet
void_jewel
void_ring
warband_torc
warren_signet
```
</details>

---

### Sheet 10 — Tools I — axes, picks, rods

`32 items · grid 6x6`

````
SHEET: Tools I — axes, picks, rods
Grid 6x6, labelled, flat white background, house style as given.

One tool per cell, standing upright, nobody holding it. The HEAD shape says which tool it is; the tier says only what it is made of.

CELLS:
  1. Ancient Trowel             — garden trowel
  2. Bronze Axe                 — felling axe
  3. Bronze Pick                — mining pick
  4. Bamboo Rod                 — fishing rod lying diagonally
  5. Cobalt Axe                 — felling axe
  6. Cobalt Pick                — mining pick
  7. Copper Lens                — round magnifying lens on a short handle
  8. Copper Pan                 — frying pan seen from a raised three quarter angle
  9. Crystal Lens               — round magnifying lens on a short handle
 10. Crystal Mortar             — clear crystal mortar and pestle seen from a raised three quarter angle
 11. Crystal Rod                — fishing rod lying diagonally across the frame
 12. Druid's Satchel            — moss green satchel bound in living vine
 13. Eclipse Axe                — felling axe
 14. Eclipse Crucible           — squat crucible on three legs
 15. Eclipse Forge              — small stone forge seen from the front
 16. Eclipse Hearth             — stone hearth seen from the front
 17. Eclipse Lens               — round magnifying lens on a short handle
 18. Eclipse Pick               — mining pick
 19. Eclipse Satchel            — leather shoulder bag hanging closed
 20. Eclipse Tinder             — small dark tinderbox with its lid open
 21. Eclipse Treads             — pair of soft running boots standing side by side
 22. Eclipse Trowel             — garden trowel
 23. Ember Stove                — small iron cooking stove seen from the front
 24. Ember Tinderbox            — small iron tinderbox with its lid open
 25. Everflame Axe              — felling axe
 26. Everflame Crucible         — squat crucible on three legs
 27. Everflame Forge            — small stone forge seen from the front
 28. Everflame Hearth           — stone hearth seen from the front
 29. Everflame Lens             — round magnifying lens on a short handle
 30. Everflame Pick             — mining pick
 31. Everflame Rod              — fishing rod lying diagonally across the frame
 32. Everflame Satchel          — blackened satchel wrapped in living orange flame
````

<details><summary>id order for <code>sheets/tools-i-axes-picks-rods.txt</code></summary>

```
ancient_trowel
bronze_axe
bronze_pick
cane_rod
cobalt_axe
cobalt_pick
copper_lens
copper_pan
crystal_lens
crystal_mortar
crystal_rod
druid_satchel
eclipse_axe
eclipse_crucible
eclipse_forge
eclipse_hearth
eclipse_lens
eclipse_pick
eclipse_satchel
eclipse_tinder
eclipse_treads
eclipse_trowel
ember_stove
ember_tinder
everflame_axe
everflame_crucible
everflame_forge
everflame_hearth
everflame_lens
everflame_pick
everflame_rod
everflame_satchel
```
</details>

---

### Sheet 11 — Tools II — the rest

`34 items · grid 6x6`

````
SHEET: Tools II — the rest
Grid 6x6, labelled, flat white background, house style as given.

Same rules. A "rod" is a fishing rod: a long thin tapering pole with a line, not a staff and not a man holding one.

CELLS:
  1. Everflame Tinder           — small blackened tinderbox with its lid open
  2. Everflame Treads           — pair of soft running boots standing side by side
  3. Everflame Trowel           — garden trowel
  4. Flint & Steel              — piece of grey flint struck against a curved steel striker
  5. Forager's Pouch            — small leather belt pouch
  6. Herbalist Kit              — leather satchel with the flap open
  7. Iron Axe                   — felling axe
  8. Iron Mortar                — iron mortar and pestle seen from a raised three quarter angle
  9. Iron Pan                   — frying pan seen from a raised three quarter angle
 10. Iron Pick                  — mining pick
 11. Iron Rod                   — fishing rod lying diagonally across the frame
 12. Iron Runners               — pair of low soft leather running shoes standing side by side and alone on n…
 13. Iron Tinderbox             — small iron tinderbox with its lid open
 14. Iron Tongs                 — pair of blacksmith tongs seen from the side
 15. Iron Trowel                — garden trowel
 16. Leather Boots              — pair of soft low leather running shoes standing side by side
 17. Master Bellows             — blacksmith air bellows seen from the side
 18. Master Forge               — small stone forge seen from the front
 19. Mithril Trowel             — garden trowel
 20. Moon Rod                   — fishing rod lying diagonally across the frame
 21. Silver Lens                — round magnifying lens on a short handle
 22. Steel Anvil                — blacksmith anvil seen from the side
 23. Steel Axe                  — felling axe
 24. Steel Pick                 — mining pick
 25. Stone Mortar               — stone mortar and pestle seen from a raised three quarter angle
 26. Swift Boots                — pair of soft running boots standing side by side
 27. Void Alembic               — glass alembic still
 28. Void Lens                  — round magnifying lens on a short handle
 29. Void Pouch                 — near black satchel
 30. Void Stove                 — small iron cooking stove seen from the front
 31. Void Tinderbox             — small iron tinderbox with its lid open
 32. Void Rod                   — fishing rod lying diagonally across the frame
 33. Wind Treads                — pair of soft running boots standing side by side
 34. Wooden Trowel              — garden trowel
````

<details><summary>id order for <code>sheets/tools-ii-the-rest.txt</code></summary>

```
everflame_tinder
everflame_treads
everflame_trowel
flint
foraging_pouch
herbalist_kit
iron_axe
iron_mortar
iron_pan
iron_pick
iron_rod
iron_runners
iron_tinder
iron_tongs
iron_trowel
leather_boots
master_bellows
master_forge
mithril_trowel
moonrod
silver_lens
steel_anvil
steel_axe
steel_pick
stone_mortar
swift_boots
void_alembic
void_lens
void_pouch
void_stove
void_tinder
voidrod
wind_treads
wooden_trowel
```
</details>

---

### Sheet 12 — Skilling outfits I

`24 items · grid 6x4`

````
SHEET: Skilling outfits I
Grid 6x4, labelled, flat white background, house style as given.

Empty clothing hanging on nothing, seen flat from the front. No body, no head, no mannequin. Each profession must read from its colour and its props.

CELLS:
  1. Runner's Shoes             — pair of work boots standing side by side
  2. Runner's Shirt             — sleeveless work garment hanging empty
  3. Runner's Cap               — hat standing alone on nothing
  4. Runner's Shorts            — pair of work trousers hanging empty
  5. Alchemist's Boots          — pair of work boots standing side by side
  6. Alchemist's Robe           — sleeveless work garment hanging empty
  7. Alchemist's Hood           — hat standing alone on nothing
  8. Alchemist's Trousers       — pair of work trousers hanging empty
  9. Chef's Clogs               — pair of work boots standing side by side
 10. Chef's Jacket              — sleeveless work garment hanging empty
 11. Chef's Hat                 — hat standing alone on nothing
 12. Chef's Trousers            — pair of work trousers hanging empty
 13. Forgemaster's Boots        — pair of work boots standing side by side
 14. Forgemaster's Apron        — sleeveless work garment hanging empty
 15. Forgemaster's Goggles      — pair of leather and brass workshop goggles with round smoked glass lenses
 16. Forgemaster's Trousers     — pair of work trousers hanging empty
 17. Cultivator's Clogs         — pair of work boots standing side by side
 18. Cultivator's Smock         — sleeveless work garment hanging empty
 19. Cultivator's Hat           — hat standing alone on nothing
 20. Cultivator's Breeches      — pair of work trousers hanging empty
 21. Angler's Boots             — pair of work boots standing side by side
 22. Angler's Jacket            — sleeveless work garment hanging empty
 23. Angler's Hat               — hat standing alone on nothing
 24. Angler's Waders            — pair of work trousers hanging empty
````

<details><summary>id order for <code>sheets/skilling-outfits-i.txt</code></summary>

```
ag_boots
ag_chest
ag_hat
ag_legs
al_boots
al_chest
al_hat
al_legs
co_boots
co_chest
co_hat
co_legs
cr_boots
cr_chest
cr_hat
cr_legs
fa_boots
fa_chest
fa_hat
fa_legs
fi_boots
fi_chest
fi_hat
fi_legs
```
</details>

---

### Sheet 13 — Skilling outfits II

`24 items · grid 6x4`

````
SHEET: Skilling outfits II
Grid 6x4, labelled, flat white background, house style as given.

Same rules.

CELLS:
  1. Pyromancer's Boots         — pair of work boots standing side by side
  2. Pyromancer's Robe          — sleeveless work garment hanging empty
  3. Pyromancer's Hood          — hat standing alone on nothing
  4. Pyromancer's Trousers      — pair of work trousers hanging empty
  5. Herbalist's Boots          — pair of work boots standing side by side
  6. Herbalist's Tunic          — sleeveless work garment hanging empty
  7. Herbalist's Cap            — hat standing alone on nothing
  8. Herbalist's Leggings       — pair of work trousers hanging empty
  9. Lapidary's Shoes           — pair of work boots standing side by side
 10. Lapidary's Apron           — sleeveless work garment hanging empty
 11. Lapidary's Loupe           — jeweller loupe
 12. Lapidary's Trousers        — pair of work trousers hanging empty
 13. Prospector's Boots         — pair of work boots standing side by side
 14. Prospector's Vest          — sleeveless work garment hanging empty
 15. Prospector's Helm          — hat standing alone on nothing
 16. Prospector's Trousers      — pair of work trousers hanging empty
 17. Blacksmith's Boots         — pair of work boots standing side by side
 18. Blacksmith's Apron         — sleeveless work garment hanging empty
 19. Blacksmith's Helm          — hat standing alone on nothing
 20. Blacksmith's Chaps         — pair of work trousers hanging empty
 21. Lumberjack's Boots         — pair of work boots standing side by side
 22. Lumberjack's Jacket        — sleeveless work garment hanging empty
 23. Lumberjack's Hat           — hat standing alone on nothing
 24. Lumberjack's Trews         — pair of work trousers hanging empty
````

<details><summary>id order for <code>sheets/skilling-outfits-ii.txt</code></summary>

```
fm_boots
fm_chest
fm_hat
fm_legs
fo_boots
fo_chest
fo_hat
fo_legs
jw_boots
jw_chest
jw_hat
jw_legs
mi_boots
mi_chest
mi_hat
mi_legs
sm_boots
sm_chest
sm_hat
sm_legs
wc_boots
wc_chest
wc_hat
wc_legs
```
</details>

---

### Sheet 14 — Crafted ladder — helm (7 tiers)

`7 items · grid 4x2`

````
SHEET: Crafted ladder — helm (7 tiers)
Grid 4x2, labelled, flat white background, house style as given.

ONE design, seven colours. Every cell on this sheet is THE SAME OBJECT, drawn identically, differing only in metal colour. Do not restyle it up the tiers, do not add ornament to the later ones, do not change the silhouette. A player must see instantly that these are the same piece at seven ranks.

The shared design: a HELMET on its own, empty, seen three-quarter from the front, the face opening a clear dark hollow. No head, no face, nobody wearing it. Clean symmetrical plate, a raised centre ridge, crisp bevelled edges, simple rivets. No engraving, no gems, no glow on any of them.

CELLS:
  1. Bronze Helm                — medieval knight helm
  2. Iron Helm                  — medieval knight helm
  3. Steel Helm                 — medieval knight helm
  4. Mithril Helm               — medieval knight helm
  5. Cobalt Helm                — medieval knight helm
  6. Runite Helm                — medieval knight helm
  7. Starsteel Helm             — medieval knight helm
````

<details><summary>id order for <code>sheets/crafted-ladder-helm-7-tiers-.txt</code></summary>

```
bronze_helm
iron_helm
steel_helm
mithril_helm
cobalt_helm
runite_helm
starsteel_helm
```
</details>

---

### Sheet 15 — Crafted ladder — chest (7 tiers)

`7 items · grid 4x2`

````
SHEET: Crafted ladder — chest (7 tiers)
Grid 4x2, labelled, flat white background, house style as given.

ONE design, seven colours. Every cell on this sheet is THE SAME OBJECT, drawn identically, differing only in metal colour. Do not restyle it up the tiers, do not add ornament to the later ones, do not change the silhouette. A player must see instantly that these are the same piece at seven ranks.

The shared design: a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it. Clean symmetrical plate, a raised centre ridge, crisp bevelled edges, simple rivets. No engraving, no gems, no glow on any of them.

CELLS:
  1. Bronze Chest               — breastplate
  2. Iron Chest                 — breastplate
  3. Steel Chest                — breastplate
  4. Mithril Chest              — breastplate
  5. Cobalt Chest               — breastplate
  6. Runite Chest               — breastplate
  7. Starsteel Chest            — breastplate
````

<details><summary>id order for <code>sheets/crafted-ladder-chest-7-tiers-.txt</code></summary>

```
bronze_chest
iron_chest
steel_chest
mithril_chest
cobalt_chest
runite_chest
starsteel_chest
```
</details>

---

### Sheet 16 — Crafted ladder — legs (7 tiers)

`7 items · grid 4x2`

````
SHEET: Crafted ladder — legs (7 tiers)
Grid 4x2, labelled, flat white background, house style as given.

ONE design, seven colours. Every cell on this sheet is THE SAME OBJECT, drawn identically, differing only in metal colour. Do not restyle it up the tiers, do not add ornament to the later ones, do not change the silhouette. A player must see instantly that these are the same piece at seven ranks.

The shared design: a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no belt, no feet, no boots. Clean symmetrical plate, a raised centre ridge, crisp bevelled edges, simple rivets. No engraving, no gems, no glow on any of them.

CELLS:
  1. Bronze Legs                — pair of matching armour plates standing upright side by side
  2. Iron Legs                  — pair of matching armour plates standing upright side by side
  3. Steel Legs                 — pair of leg greaves side by side
  4. Mithril Legs               — pair of matching armour plates standing upright side by side
  5. Cobalt Legs                — pair of matching armour plates standing upright side by side
  6. Runite Legs                — pair of matching armour plates standing upright side by side
  7. Starsteel Legs             — pair of matching armour plates standing upright side by side
````

<details><summary>id order for <code>sheets/crafted-ladder-legs-7-tiers-.txt</code></summary>

```
bronze_legs
iron_legs
steel_legs
mithril_legs
cobalt_legs
runite_legs
starsteel_legs
```
</details>

---

### Sheet 17 — Crafted ladder — gloves (7 tiers)

`7 items · grid 4x2`

````
SHEET: Crafted ladder — gloves (7 tiers)
Grid 4x2, labelled, flat white background, house style as given.

ONE design, seven colours. Every cell on this sheet is THE SAME OBJECT, drawn identically, differing only in metal colour. Do not restyle it up the tiers, do not add ornament to the later ones, do not change the silhouette. A player must see instantly that these are the same piece at seven ranks.

The shared design: a PAIR OF GLOVES standing upright side by side, empty, fingers visible, wide cuff at the wrist. No hands, no arms. Clean symmetrical plate, a raised centre ridge, crisp bevelled edges, simple rivets. No engraving, no gems, no glow on any of them.

CELLS:
  1. Bronze Gloves              — armoured gauntlet
  2. Iron Gloves                — armoured gauntlet
  3. Steel Gloves               — armoured gauntlet
  4. Mithril Gloves             — armoured gauntlet
  5. Cobalt Gloves              — armoured gauntlet
  6. Runite Gloves              — armoured gauntlet
  7. Starsteel Gloves           — armoured gauntlet
````

<details><summary>id order for <code>sheets/crafted-ladder-gloves-7-tiers-.txt</code></summary>

```
bronze_gloves
iron_gloves
steel_gloves
mithril_gloves
cobalt_gloves
runite_gloves
starsteel_gloves
```
</details>

---

### Sheet 18 — Crafted ladder — boots (7 tiers)

`7 items · grid 4x2`

````
SHEET: Crafted ladder — boots (7 tiers)
Grid 4x2, labelled, flat white background, house style as given.

ONE design, seven colours. Every cell on this sheet is THE SAME OBJECT, drawn identically, differing only in metal colour. Do not restyle it up the tiers, do not add ornament to the later ones, do not change the silhouette. A player must see instantly that these are the same piece at seven ranks.

The shared design: a PAIR OF BOOTS standing upright side by side, empty, complete with soles and toes. Clean symmetrical plate, a raised centre ridge, crisp bevelled edges, simple rivets. No engraving, no gems, no glow on any of them.

CELLS:
  1. Bronze Boots               — pair of armoured boots side by side seen from the front
  2. Iron Boots                 — pair of armoured boots side by side seen from the front
  3. Steel Boots                — pair of armoured boots side by side seen from the front
  4. Mithril Boots              — pair of armoured boots side by side seen from the front
  5. Cobalt Boots               — pair of armoured boots side by side seen from the front
  6. Runite Boots               — pair of armoured boots side by side seen from the front
  7. Starsteel Boots            — pair of armoured boots side by side seen from the front
````

<details><summary>id order for <code>sheets/crafted-ladder-boots-7-tiers-.txt</code></summary>

```
bronze_boots
iron_boots
steel_boots
mithril_boots
cobalt_boots
runite_boots
starsteel_boots
```
</details>

---

### Sheet 19 — Crafted ladder — shield (7 tiers)

`7 items · grid 4x2`

````
SHEET: Crafted ladder — shield (7 tiers)
Grid 4x2, labelled, flat white background, house style as given.

ONE design, seven colours. Every cell on this sheet is THE SAME OBJECT, drawn identically, differing only in metal colour. Do not restyle it up the tiers, do not add ornament to the later ones, do not change the silhouette. A player must see instantly that these are the same piece at seven ranks.

The shared design: a TALL SHIELD seen flat face-on, filling the frame, one solid face. Nobody holding it. Clean symmetrical plate, a raised centre ridge, crisp bevelled edges, simple rivets. No engraving, no gems, no glow on any of them.

CELLS:
  1. Bronze Shield              — shield seen face on
  2. Iron Shield                — shield seen face on
  3. Steel Shield               — shield seen face on
  4. Mithril Shield             — shield seen face on
  5. Cobalt Shield              — shield seen face on
  6. Runite Shield              — shield seen face on
  7. Starsteel Shield           — shield seen face on
````

<details><summary>id order for <code>sheets/crafted-ladder-shield-7-tiers-.txt</code></summary>

```
bronze_shield
iron_shield
steel_shield
mithril_shield
cobalt_shield
runite_shield
starsteel_shield
```
</details>

---

### Sheet 20 — Crafted ladder — buckler (7 tiers)

`7 items · grid 4x2`

````
SHEET: Crafted ladder — buckler (7 tiers)
Grid 4x2, labelled, flat white background, house style as given.

ONE design, seven colours. Every cell on this sheet is THE SAME OBJECT, drawn identically, differing only in metal colour. Do not restyle it up the tiers, do not add ornament to the later ones, do not change the silhouette. A player must see instantly that these are the same piece at seven ranks.

The shared design: a SMALL ROUND DISC held flat face-on, perfectly circular with a domed knob at the exact centre and rivets around the rim. The outline is a plain circle — it never narrows or comes to a point. Do NOT draw a tall pointed knight shield. Clean symmetrical plate, a raised centre ridge, crisp bevelled edges, simple rivets. No engraving, no gems, no glow on any of them.

CELLS:
  1. Bronze Buckler             — small round metal disc held flat to the viewer
  2. Iron Buckler               — shield seen face on
  3. Steel Buckler              — small round metal disc held flat to the viewer
  4. Mithril Buckler            — shield seen face on
  5. Cobalt Buckler             — small round metal disc held flat to the viewer
  6. Runite Buckler             — small round metal disc held flat to the viewer
  7. Starsteel Buckler          — small round metal disc held flat to the viewer
````

<details><summary>id order for <code>sheets/crafted-ladder-buckler-7-tiers-.txt</code></summary>

```
bronze_buckler
iron_buckler
steel_buckler
mithril_buckler
cobalt_buckler
runite_buckler
starsteel_buckler
```
</details>

---

### Sheet 21 — Crafted ladder — cape (7 tiers)

`7 items · grid 4x2`

````
SHEET: Crafted ladder — cape (7 tiers)
Grid 4x2, labelled, flat white background, house style as given.

ONE design, seven colours. Every cell on this sheet is THE SAME OBJECT, drawn identically, differing only in metal colour. Do not restyle it up the tiers, do not add ornament to the later ones, do not change the silhouette. A player must see instantly that these are the same piece at seven ranks.

The shared design: a CLOAK hanging on its own, seen flat from the front, heavy folds, a clasp at the throat. Empty — nobody wearing it. Clean symmetrical plate, a raised centre ridge, crisp bevelled edges, simple rivets. No engraving, no gems, no glow on any of them.

CELLS:
  1. Bronze Cape                — hanging cloak
  2. Iron Cape                  — hanging cloak
  3. Steel Cape                 — hanging cloak seen from the front
  4. Mithril Cape               — hanging cloak
  5. Cobalt Cape                — hanging cloak
  6. Runite Cape                — hanging cloak
  7. Starsteel Cape             — hanging cloak
````

<details><summary>id order for <code>sheets/crafted-ladder-cape-7-tiers-.txt</code></summary>

```
bronze_cape
iron_cape
steel_cape
mithril_cape
cobalt_cape
runite_cape
starsteel_cape
```
</details>

---

### Sheet 22 — Unique set — voidsteel

`7 items · grid 4x2`

````
SHEET: Unique set — voidsteel
Grid 4x2, labelled, flat white background, house style as given.

JAGGED AND UNSTABLE. Broken angular plate with cracked fissures running through it, torn edges, pieces that look as if they are pulling apart. Near-black metal with violet rift light burning in every crack.

SET LOOK — every piece on this sheet shares it:
JAGGED AND UNSTABLE. Broken angular plate with cracked fissures running through it, torn edges, pieces that look as if they are pulling apart. Near-black metal with violet rift light burning in every crack.

This set must NOT look like any other armour set in the game. The colour is the
least important part of its identity; the shapes are what separate it.

CELLS:
  1. Voidsteel Boots            — a PAIR OF BOOTS standing upright side by side, empty, complete with soles and toes.
  2. Voidsteel Buckler          — a SMALL ROUND DISC held flat face-on, perfectly circular with a domed knob at the exact centre and rivets around the rim. The outline is a plain circle — it never narrows or comes to a point. Do NOT draw a tall pointed knight shield.
  3. Voidsteel Chest            — a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it.
  4. Voidsteel Gloves           — a PAIR OF GLOVES standing upright side by side, empty, fingers visible, wide cuff at the wrist. No hands, no arms.
  5. Voidsteel Helm             — a HELMET on its own, empty, seen three-quarter from the front, the face opening a clear dark hollow. No head, no face, nobody wearing it.
  6. Voidsteel Legs             — a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no belt, no feet, no boots.
  7. Voidsteel Shield           — a TALL SHIELD seen flat face-on, filling the frame, one solid face. Nobody holding it.
````

<details><summary>id order for <code>sheets/unique-set-voidsteel.txt</code></summary>

```
voidsteel_boots
voidsteel_buckler
voidsteel_chest
voidsteel_gloves
voidsteel_helm
voidsteel_legs
voidsteel_shield
```
</details>

---

### Sheet 23 — Unique set — gravesteel

`6 items · grid 3x2`

````
SHEET: Unique set — gravesteel
Grid 3x2, labelled, flat white background, house style as given.

GRAVE-ROBBED. Tarnished corroded plate, pitted and stained, small bone fragments and grave-nails set into the surfaces, tattered cloth wrappings hanging off the edges. Grey-green tarnish over dull steel.

SET LOOK — every piece on this sheet shares it:
GRAVE-ROBBED. Tarnished corroded plate, pitted and stained, small bone fragments and grave-nails set into the surfaces, tattered cloth wrappings hanging off the edges. Grey-green tarnish over dull steel.

This set must NOT look like any other armour set in the game. The colour is the
least important part of its identity; the shapes are what separate it.

CELLS:
  1. Gravesteel Boots           — a PAIR OF BOOTS standing upright side by side, empty, complete with soles and toes.
  2. Gravesteel Chest           — a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it.
  3. Gravesteel Gloves          — a PAIR OF GLOVES standing upright side by side, empty, fingers visible, wide cuff at the wrist. No hands, no arms.
  4. Gravesteel Helm            — a HELMET on its own, empty, seen three-quarter from the front, the face opening a clear dark hollow. No head, no face, nobody wearing it.
  5. Gravesteel Legs            — a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no belt, no feet, no boots.
  6. Gravesteel Shield          — a TALL SHIELD seen flat face-on, filling the frame, one solid face. Nobody holding it.
````

<details><summary>id order for <code>sheets/unique-set-gravesteel.txt</code></summary>

```
gravesteel_boots
gravesteel_chest
gravesteel_gloves
gravesteel_helm
gravesteel_legs
gravesteel_shield
```
</details>

---

### Sheet 24 — Unique set — moltensteel

`7 items · grid 4x2`

````
SHEET: Unique set — moltensteel
Grid 4x2, labelled, flat white background, house style as given.

INDUSTRIAL AND HOT. Blackened crusted iron with slag build-up on the surfaces, heavy squared-off proportions, thick seams. Molten orange light bleeding from the cracks and along the seam lines.

SET LOOK — every piece on this sheet shares it:
INDUSTRIAL AND HOT. Blackened crusted iron with slag build-up on the surfaces, heavy squared-off proportions, thick seams. Molten orange light bleeding from the cracks and along the seam lines.

This set must NOT look like any other armour set in the game. The colour is the
least important part of its identity; the shapes are what separate it.

CELLS:
  1. Moltensteel Boots          — a PAIR OF BOOTS standing upright side by side, empty, complete with soles and toes.
  2. Moltensteel Buckler        — a SMALL ROUND DISC held flat face-on, perfectly circular with a domed knob at the exact centre and rivets around the rim. The outline is a plain circle — it never narrows or comes to a point. Do NOT draw a tall pointed knight shield.
  3. Moltensteel Chest          — a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it.
  4. Moltensteel Gloves         — a PAIR OF GLOVES standing upright side by side, empty, fingers visible, wide cuff at the wrist. No hands, no arms.
  5. Moltensteel Helm           — a HELMET on its own, empty, seen three-quarter from the front, the face opening a clear dark hollow. No head, no face, nobody wearing it.
  6. Moltensteel Legs           — a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no belt, no feet, no boots.
  7. Moltensteel Shield         — a TALL SHIELD seen flat face-on, filling the frame, one solid face. Nobody holding it.
````

<details><summary>id order for <code>sheets/unique-set-moltensteel.txt</code></summary>

```
moltensteel_boots
moltensteel_buckler
moltensteel_chest
moltensteel_gloves
moltensteel_helm
moltensteel_legs
moltensteel_shield
```
</details>

---

### Sheet 25 — Unique set — barrow

`6 items · grid 3x2`

````
SHEET: Unique set — barrow
Grid 3x2, labelled, flat white background, house style as given.

BURIAL REGALIA. Tarnished grave-silver plate with bone inlay along the edges, engraved burial sigils, long tattered grey funeral cloth hanging from every piece. Cold, pale, and old.

SET LOOK — every piece on this sheet shares it:
BURIAL REGALIA. Tarnished grave-silver plate with bone inlay along the edges, engraved burial sigils, long tattered grey funeral cloth hanging from every piece. Cold, pale, and old.

This set must NOT look like any other armour set in the game. The colour is the
least important part of its identity; the shapes are what separate it.

CELLS:
  1. Barrow Warden's Sabatons   — a PAIR OF BOOTS standing upright side by side, empty, complete with soles and toes.
  2. Warden's Aegis             — a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it.
  3. Barrow Warden's Gauntlets  — a PAIR OF GLOVES standing upright side by side, empty, fingers visible, wide cuff at the wrist. No hands, no arms.
  4. Barrow Warden's Helm       — a HELMET on its own, empty, seen three-quarter from the front, the face opening a clear dark hollow. No head, no face, nobody wearing it.
  5. Warden's Greaves           — a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no belt, no feet, no boots.
  6. Barrow Shield              — a TALL SHIELD seen flat face-on, filling the frame, one solid face. Nobody holding it.
````

<details><summary>id order for <code>sheets/unique-set-barrow.txt</code></summary>

```
barrow_boots
barrow_chest
barrow_gloves
barrow_helm
barrow_legs
barrow_shield
```
</details>

---

### Sheet 26 — Unique set — dawnward

`4 items · grid 4x1`

````
SHEET: Unique set — dawnward
Grid 4x1, labelled, flat white background, house style as given.

RADIANT AND CEREMONIAL. Smooth pale gold plate with engraved sunburst motifs, feathered fanning edges at the shoulders and cuffs, warm light glowing from the engraving. Bright and holy.

SET LOOK — every piece on this sheet shares it:
RADIANT AND CEREMONIAL. Smooth pale gold plate with engraved sunburst motifs, feathered fanning edges at the shoulders and cuffs, warm light glowing from the engraving. Bright and holy.

This set must NOT look like any other armour set in the game. The colour is the
least important part of its identity; the shapes are what separate it.

CELLS:
  1. Dawnward Sabatons          — a PAIR OF BOOTS standing upright side by side, empty, complete with soles and toes.
  2. Dawnward Cuirass           — a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it.
  3. Dawnward Helm              — a HELMET on its own, empty, seen three-quarter from the front, the face opening a clear dark hollow. No head, no face, nobody wearing it.
  4. Dawnward Greaves           — a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no belt, no feet, no boots.
````

<details><summary>id order for <code>sheets/unique-set-dawnward.txt</code></summary>

```
dawnward_boots
dawnward_chest
dawnward_helm
dawnward_legs
```
</details>

---

### Sheet 27 — Unique set — sunweave

`4 items · grid 4x1`

````
SHEET: Unique set — sunweave
Grid 4x1, labelled, flat white background, house style as given.

WOVEN, NOT FORGED. Layered gold cloth and fine chain, draping folds rather than rigid plate, embroidered sun motifs, soft edges. This set must NOT read as metal armour.

SET LOOK — every piece on this sheet shares it:
WOVEN, NOT FORGED. Layered gold cloth and fine chain, draping folds rather than rigid plate, embroidered sun motifs, soft edges. This set must NOT read as metal armour.

This set must NOT look like any other armour set in the game. The colour is the
least important part of its identity; the shapes are what separate it.

CELLS:
  1. Sunweave Treads            — a PAIR OF BOOTS standing upright side by side, empty, complete with soles and toes.
  2. Sunweave Vest              — a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it.
  3. Sunweave Hood              — a HELMET on its own, empty, seen three-quarter from the front, the face opening a clear dark hollow. No head, no face, nobody wearing it.
  4. Sunweave Leggings          — a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no belt, no feet, no boots.
````

<details><summary>id order for <code>sheets/unique-set-sunweave.txt</code></summary>

```
sunweave_boots
sunweave_chest
sunweave_helm
sunweave_legs
```
</details>

---

### Sheet 28 — Unique set — emberforged

`2 items · grid 2x1`

````
SHEET: Unique set — emberforged
Grid 2x1, labelled, flat white background, house style as given.

FORGE-BORN. Blackened hammered iron with a rough scale-like surface texture, heavy square proportions, orange forge light glowing in the deep seams and under the plate edges.

SET LOOK — every piece on this sheet shares it:
FORGE-BORN. Blackened hammered iron with a rough scale-like surface texture, heavy square proportions, orange forge light glowing in the deep seams and under the plate edges.

This set must NOT look like any other armour set in the game. The colour is the
least important part of its identity; the shapes are what separate it.

CELLS:
  1. Emberforged Aegis          — a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs.
  2. Emberforged Greaves        — a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no feet, no boots.
````

<details><summary>id order for <code>sheets/unique-set-emberforged.txt</code></summary>

```
emberforged_aegis
emberforged_greaves
```
</details>

---

### Sheet 29 — Leather ladder — helm (10 hides)

`10 items · grid 5x2`

````
SHEET: Leather ladder — helm (10 hides)
Grid 5x2, labelled, flat white background, house style as given.

ONE design, one per hide. Every cell is THE SAME PIECE in a different leather, differing only in hide colour and surface. LEATHER, never plate: soft supple material, visible stitching along every seam, buckled straps, rolled edges.

a HELMET on its own, empty, seen three-quarter from the front, the face opening a clear dark hollow. No head, no face, nobody wearing it.

CELLS:
  1. Roughhide Cowl             — soft leather hood
  2. Chitinweave Cowl           — soft leather hood
  3. Wolfhide Cowl              — soft leather hood
  4. Ogrehide Cowl              — soft leather hood
  5. Trollhide Cowl             — soft leather hood
  6. Drakehide Cowl             — soft leather hood
  7. Demonhide Cowl             — soft leather hood
  8. Wraithhide Cowl            — soft leather hood
  9. Emberhide Cowl             — soft leather hood standing empty
 10. Voidhide Cowl              — soft leather hood
````

<details><summary>id order for <code>sheets/leather-ladder-helm-10-hides-.txt</code></summary>

```
rough_helm
chitin_helm
wolf_helm
ogre_helm
troll_helm
drake_helm
demon_helm
wraith_helm
ember_helm
void_helm
```
</details>

---

### Sheet 30 — Leather ladder — chest (10 hides)

`10 items · grid 5x2`

````
SHEET: Leather ladder — chest (10 hides)
Grid 5x2, labelled, flat white background, house style as given.

ONE design, one per hide. Every cell is THE SAME PIECE in a different leather, differing only in hide colour and surface. LEATHER, never plate: soft supple material, visible stitching along every seam, buckled straps, rolled edges.

a CHEST PIECE on its own, empty, hanging upright and seen flat from the front, cut off cleanly at the waist. No arms, no head, no legs, no body inside it.

CELLS:
  1. Roughhide Jerkin           — sleeveless leather jerkin
  2. Chitinweave Jerkin         — sleeveless leather jerkin
  3. Wolfhide Jerkin            — sleeveless leather jerkin
  4. Ogrehide Jerkin            — sleeveless leather jerkin
  5. Trollhide Jerkin           — sleeveless leather jerkin
  6. Drakehide Jerkin           — sleeveless leather jerkin
  7. Demonhide Jerkin           — sleeveless leather jerkin
  8. Wraithhide Jerkin          — sleeveless leather jerkin
  9. Emberhide Jerkin           — sleeveless leather jerkin
 10. Voidhide Jerkin            — sleeveless leather jerkin
````

<details><summary>id order for <code>sheets/leather-ladder-chest-10-hides-.txt</code></summary>

```
rough_chest
chitin_chest
wolf_chest
ogre_chest
troll_chest
drake_chest
demon_chest
wraith_chest
ember_chest
void_chest
```
</details>

---

### Sheet 31 — Leather ladder — legs (10 hides)

`10 items · grid 5x2`

````
SHEET: Leather ladder — legs (10 hides)
Grid 5x2, labelled, flat white background, house style as given.

ONE design, one per hide. Every cell is THE SAME PIECE in a different leather, differing only in hide colour and surface. LEATHER, never plate: soft supple material, visible stitching along every seam, buckled straps, rolled edges.

a PAIR OF LEG PIECES standing upright side by side and nothing else, knee down to ankle, ending in an open hem with nothing below. No torso, no belt, no feet, no boots.

CELLS:
  1. Roughhide Chaps            — pair of leather shin guards
  2. Chitinweave Chaps          — pair of leather shin guards
  3. Wolfhide Chaps             — pair of leg wraps standing upright side by side
  4. Ogrehide Chaps             — pair of leather shin guards
  5. Trollhide Chaps            — pair of leather shin guards
  6. Drakehide Chaps            — pair of leather shin guards
  7. Demonhide Chaps            — pair of leather shin guards
  8. Wraithhide Chaps           — pair of leather shin guards
  9. Emberhide Chaps            — pair of leather shin guards
 10. Voidhide Chaps             — pair of leather shin guards
````

<details><summary>id order for <code>sheets/leather-ladder-legs-10-hides-.txt</code></summary>

```
rough_legs
chitin_legs
wolf_legs
ogre_legs
troll_legs
drake_legs
demon_legs
wraith_legs
ember_legs
void_legs
```
</details>

---

### Sheet 32 — Leather ladder — gloves (10 hides)

`10 items · grid 5x2`

````
SHEET: Leather ladder — gloves (10 hides)
Grid 5x2, labelled, flat white background, house style as given.

ONE design, one per hide. Every cell is THE SAME PIECE in a different leather, differing only in hide colour and surface. LEATHER, never plate: soft supple material, visible stitching along every seam, buckled straps, rolled edges.

a PAIR OF GLOVES standing upright side by side, empty, fingers visible, wide cuff at the wrist. No hands, no arms.

CELLS:
  1. Roughhide Bracers          — soft leather glove
  2. Chitinweave Bracers        — soft leather glove
  3. Wolfhide Bracers           — soft leather glove
  4. Ogrehide Bracers           — pair of forearm bracers standing upright side by side
  5. Trollhide Bracers          — soft leather glove
  6. Drakehide Bracers          — soft leather glove
  7. Demonhide Bracers          — soft leather glove
  8. Wraithhide Bracers         — soft leather glove
  9. Emberhide Bracers          — soft leather glove
 10. Voidhide Bracers           — soft leather glove
````

<details><summary>id order for <code>sheets/leather-ladder-gloves-10-hides-.txt</code></summary>

```
rough_gloves
chitin_gloves
wolf_gloves
ogre_gloves
troll_gloves
drake_gloves
demon_gloves
wraith_gloves
ember_gloves
void_gloves
```
</details>

---

### Sheet 33 — Leather ladder — boots (10 hides)

`10 items · grid 5x2`

````
SHEET: Leather ladder — boots (10 hides)
Grid 5x2, labelled, flat white background, house style as given.

ONE design, one per hide. Every cell is THE SAME PIECE in a different leather, differing only in hide colour and surface. LEATHER, never plate: soft supple material, visible stitching along every seam, buckled straps, rolled edges.

a PAIR OF BOOTS standing upright side by side, empty, complete with soles and toes.

CELLS:
  1. Roughhide Boots            — pair of soft leather boots side by side seen from the front
  2. Chitinweave Boots          — pair of soft leather boots side by side seen from the front
  3. Wolfhide Boots             — pair of soft leather boots side by side seen from the front
  4. Ogrehide Boots             — pair of soft leather boots side by side seen from the front
  5. Trollhide Boots            — pair of soft leather boots side by side seen from the front
  6. Drakehide Boots            — pair of soft leather boots side by side seen from the front
  7. Demonhide Boots            — pair of soft leather boots side by side seen from the front
  8. Wraithhide Boots           — pair of soft leather boots side by side seen from the front
  9. Emberhide Boots            — pair of soft leather boots side by side seen from the front
 10. Voidhide Boots             — pair of soft leather boots side by side seen from the front
````

<details><summary>id order for <code>sheets/leather-ladder-boots-10-hides-.txt</code></summary>

```
rough_boots
chitin_boots
wolf_boots
ogre_boots
troll_boots
drake_boots
demon_boots
wraith_boots
ember_boots
void_boots
```
</details>

---

### Sheet 34 — Armour — one-off pieces

`20 items · grid 5x4`

````
SHEET: Armour — one-off pieces
Grid 5x4, labelled, flat white background, house style as given.

These do not belong to a set. Each needs its own look; do not make them match anything.

CELLS:
  1. Abyssal Aegis              — curved chest breastplate
  2. Bone Plate Cuirass         — curved chest breastplate made of pale ivory plates
  3. Chitin Plate               — rigid curved chest shell standing empty and upright
  4. Cinderweave Cowl           — soft leather hood
  5. Dawnsteel Buckler          — shield seen face on
  6. elk_striders               — pair of tall tan hide boots standing upright side by side
  7. Emberhide Vest             — sleeveless leather jerkin
  8. Grave-Shroud Vest          — sleeveless vest of grey rotted burial linen
  9. lynx_bracers               — pair of short forearm bracers cut from spotted tawny hide
 10. Pack Alpha Cape            — wolf pelt cloak
 11. Pack Leader Vest           — sleeveless vest of grey wolf pelt
 12. Roughhide Cape             — hanging cloak
 13. rhino_bulwark              — primitive tribal round war shield made of thick grey-brown animal hide stre…
 14. Riftshadow Cowl            — soft hood
 15. Silkwoven Cape             — hanging cloak
 16. Voidforged Greaves         — pair of leg greaves side by side
 17. Warband Cape               — hanging cloak
 18. Warlord's Bulwark          — huge tower shield seen face on
 19. Wraithbound Cowl           — soft hood
 20. Wraithweave Cape           — hanging cloak
````

<details><summary>id order for <code>sheets/armour-one-off-pieces.txt</code></summary>

```
abyssal_aegis
bone_plate_cuirass
chitin_plate
cinderweave_cowl
dawnsteel_buckler
elk_striders
emberhide_vest
graveshroud_vest
lynx_bracers
pack_alpha_cape
pack_leader_vest
ratskin_cape
rhino_bulwark
riftshadow_cowl
silkwoven_cape
voidforged_greaves
warband_cape
warlord_bulwark
wraithbound_cowl
wraithweave_cape
```
</details>

---

### Sheet 35 — Weapons 1

`24 items · grid 6x4`

````
SHEET: Weapons 1
Grid 6x4, labelled, flat white background, house style as given.

Each weapon stands upright, point or head at the top, filling the frame top to bottom, alone on nothing. The HEAD or BLADE shape says which weapon it is — a maul has a blunt block, an axe has a curved blade, a hammer is square. Nobody holding it, no hands, no arms.

CELLS:
  1. Aegis of Dawn              — shield seen face on
  2. Barrow Blade               — sword
  3. Barrow Dagger              — dagger
  4. Barrow Maul                — war hammer
  5. Bone Reaper                — scythe
  6. briar_cloak                — short hooded cloak of brown hide with a shaggy fur collar
  7. Bronze Dagger              — dagger standing straight upright and vertical
  8. Bronze Hammer              — blacksmith sledgehammer
  9. Bronze Sword               — longsword
 10. Chitin Maul                — war hammer
 11. Cinderfang                 — dagger
 12. Cinderguard                — tall shield seen face on
 13. Cindermantle               — hanging cloak
 14. Cobalt Dagger              — dagger standing upright
 15. Cobalt Hammer              — blacksmith sledgehammer
 16. Cobalt Sword               — longsword
 17. Dawnbreaker                — sword
 18. Dawnmantle                 — hanging cloak
 19. Dawnreaper                 — two handed scythe
 20. Demon Lord's Skull         — horned demon skull helm
 21. Doomblade                  — sword
 22. Emberforged Blade          — sword
 23. Emberwyrm Skull            — dragon skull helm
 24. Forgebreaker               — huge two handed axe
````

<details><summary>id order for <code>sheets/weapons-1.txt</code></summary>

```
aegis_of_dawn
barrow_blade
barrow_dagger
barrow_maul
bone_reaper
briar_cloak
bronze_dagger
bronze_hammer
bronze_sword
chitin_maul
cinderfang
cinderguard
cindermantle
cobalt_dagger
cobalt_hammer
cobalt_sword
dawnbreaker
dawnmantle
dawnreaper
demonlord_skull
doomblade
emberforged_blade
emberwyrm_skull
forgebreaker
```
</details>

---

### Sheet 36 — Weapons 2

`24 items · grid 6x4`

````
SHEET: Weapons 2
Grid 6x4, labelled, flat white background, house style as given.

Each weapon stands upright, point or head at the top, filling the frame top to bottom, alone on nothing. The HEAD or BLADE shape says which weapon it is — a maul has a blunt block, an axe has a curved blade, a hammer is square. Nobody holding it, no hands, no arms.

CELLS:
  1. frostpelt_mantle           — heavy shoulder mantle of shaggy white fur
  2. Grave Cleaver              — enormous two-handed greataxe standing upright and filling the whole frame t…
  3. Gravesteel Dagger          — dagger standing upright and alone on an empty background
  4. Gravesteel Hammer          — blacksmith sledgehammer
  5. Gravesteel Sword           — longsword
  6. Iron Dagger                — dagger
  7. Iron Hammer                — blacksmith sledgehammer
  8. Iron Sword                 — longsword
  9. Ironfang Claws             — narrow leather wrist strap seen flat from the front with four long curved i…
 10. Ironfang's Skull           — wolf skull helm
 11. Lich's Crown               — tall crown of blackened bone spires
 12. Mithril Dagger             — dagger
 13. Mithril Hammer             — blacksmith sledgehammer
 14. Mithril Sword              — longsword
 15. Moltensteel Dagger         — dagger
 16. Moltensteel Hammer         — blacksmith sledgehammer
 17. Moltensteel Sword          — longsword
 18. Nullward                   — shield seen face on
 19. Plague Fang Dagger         — dagger
 20. Rat Queen's Crown          — small crooked iron crown set with one dull red stone
 21. Roughhide Tunic            — sleeveless leather jerkin
 22. Riftcrusher                — two-handed war hammer standing upright
 23. Runite Dagger              — dagger
 24. Runite Hammer              — blacksmith sledgehammer
````

<details><summary>id order for <code>sheets/weapons-2.txt</code></summary>

```
frostpelt_mantle
grave_cleaver
gravesteel_dagger
gravesteel_hammer
gravesteel_sword
iron_dagger
iron_hammer
iron_sword
ironfang_claws
ironfang_skull
lich_crown
mithril_dagger
mithril_hammer
mithril_sword
moltensteel_dagger
moltensteel_hammer
moltensteel_sword
nullward
plague_fang_dagger
rat_queen_crown
ratskin_tunic
riftcrusher
runite_dagger
runite_hammer
```
</details>

---

### Sheet 37 — Weapons 3

`24 items · grid 6x4`

````
SHEET: Weapons 3
Grid 6x4, labelled, flat white background, house style as given.

Each weapon stands upright, point or head at the top, filling the frame top to bottom, alone on nothing. The HEAD or BLADE shape says which weapon it is — a maul has a blunt block, an axe has a curved blade, a hammer is square. Nobody holding it, no hands, no arms.

CELLS:
  1. Runite Sword               — longsword
  2. Slagbreaker                — two-handed war hammer standing upright on nothing
  3. Soulbinder Hammer          — war hammer
  4. stalker_hood               — deep pointed hood of dust-grey pelt
  5. Starfang                   — dagger
  6. Starsteel Dagger           — dagger
  7. Starsteel Hammer           — blacksmith sledgehammer
  8. Starsteel Sword            — longsword
  9. Steel Dagger               — dagger
 10. Steel Hammer               — blacksmith sledgehammer
 11. Steel Sword                — longsword
 12. Sunpiercer                 — recurve bow
 13. Troll King's Skull         — crude helm made from a green tinged troll skull
 14. Troll Maul                 — two-handed sledgehammer standing upright
 15. Voidcleaver                — huge two handed greatsword
 16. Voidedge                   — sword
 17. Voidheart Shroud           — sleeveless black robe hanging empty on nothing
 18. Voidrend                   — dagger
 19. Voidshroud Cape            — hanging cloak
 20. Voidsteel Dagger           — dagger
 21. Voidsteel Hammer           — blacksmith sledgehammer standing upright
 22. Voidsteel Sword            — longsword
 23. Warband Hide Armour        — sleeveless leather jerkin
 24. Warchief's Crown           — heavy iron chieftain crown hung with red cord and small bones
````

<details><summary>id order for <code>sheets/weapons-3.txt</code></summary>

```
runite_sword
slagbreaker
soulbinder_hammer
stalker_hood
starfang
starsteel_dagger
starsteel_hammer
starsteel_sword
steel_dagger
steel_hammer
steel_sword
sunpiercer
troll_king_skull
troll_maul
voidcleaver
voidedge
voidheart_shroud
voidrend
voidshroud
voidsteel_dagger
voidsteel_hammer
voidsteel_sword
warband_armor
warchief_crown
```
</details>

---

### Sheet 38 — Weapons 4

`5 items · grid 6x4`

````
SHEET: Weapons 4
Grid 6x4, labelled, flat white background, house style as given.

Each weapon stands upright, point or head at the top, filling the frame top to bottom, alone on nothing. The HEAD or BLADE shape says which weapon it is — a maul has a blunt block, an axe has a curved blade, a hammer is square. Nobody holding it, no hands, no arms.

CELLS:
  1. Warcleaver                 — heavy cleaver
  2. Warlord's Skull            — horned war helm made from a bleached skull
  3. Widow's Crown              — small dark metal circlet standing upright and empty
  4. Worldsunder Maul           — two-handed sledgehammer standing upright and alone
  5. Wyrmfang Blade             — sword
````

<details><summary>id order for <code>sheets/weapons-4.txt</code></summary>

```
warcleaver
warlord_skull
widow_crown
worldsunder_maul
wyrmfang_blade
```
</details>

---

### Sheet 39 — Cured leathers

`10 items · grid 5x2`

````
SHEET: Cured leathers
Grid 5x2, labelled, flat white background, house style as given.

These are the tannery OUTPUT, not the raw hides. Every one is the same object — a rolled bundle of tanned leather standing on end, tied round the middle with a cord — differing only in the leather. They must NOT look like the flat stretched pelts on the hides sheet; a player has to tell raw from cured at a glance.

CELLS:
  1. Chitinweave Leather        — rolled bundle of tanned leather standing on end
  2. Demonhide Leather          — rolled bundle of tanned leather standing on end
  3. Drakehide Leather          — rolled bundle of tanned leather standing on end
  4. Emberhide Leather          — rolled bundle of tanned leather standing on end
  5. Ogrehide Leather           — rolled bundle of tanned leather standing on end
  6. Roughhide Leather          — rolled bundle of tanned leather standing on end
  7. Trollhide Leather          — rolled bundle of tanned leather standing on end
  8. Voidhide Leather           — rolled bundle of tanned leather standing on end
  9. Wolfhide Leather           — rolled bundle of tanned leather standing on end
 10. Wraithhide Leather         — rolled bundle of tanned leather standing on end
````

<details><summary>id order for <code>sheets/cured-leathers.txt</code></summary>

```
chitin_leather
demon_leather
drake_leather
ember_leather
ogre_leather
rough_leather
troll_leather
void_leather
wolf_leather
wraith_leather
```
</details>

---

### Sheet 40 — THE ONES WE MISSED — catch-up sheet

`4 items · grid 4x2`

````
SHEET: THE ONES WE MISSED — catch-up sheet
Grid 4x2, labelled, flat white background, house style as given.

These were left off sheets that are already drawn, so they need their own pass.

Four of them belong with families you have already done — draw them to MATCH those
sheets, not as a fresh style:
  · Cut Bloodstone and Void Shard must sit beside the cut gems on the gems sheet —
    same faceted treatment, same lighting, same size in frame.
  · Moonpetal and Riftmoss must sit beside the herbs — same botanical treatment.

Nothing here is a new look. Consistency with the finished sheets is the whole job.

CELLS:
  1. Cut Bloodstone             — polished domed cabochon gemstone resting on nothing
  2. Moonpetal                  — open flower on a short green stem with two narrow leaves
  3. Void Shard                 — jagged splinter of near-black glass standing on its broken end
  4. Riftmoss                   — loose tuft of moss lying on nothing
````

<details><summary>id order for <code>sheets/the-ones-we-missed-catch-up-sheet.txt</code></summary>

```
cut_bloodstone
moonpetal
void_shard
voidmoss
```
</details>

---


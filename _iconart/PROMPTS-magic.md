# Magic and Runecrafting - the art list for the core

> **DONE at 0.9.127.6.** All 14 sheets came back and all 88 assets are in the game:
> 71 item icons in `ART_ITEM`, 16 plates in `NODE_ART`, the banner in `SKILL_ART`.
> They added 429 KB (the estimate below said 393), which takes the file from
> 12.04 MB to 12.46 MB. What was actually run is in **How they went in** at the
> end and in `README.md`; the sheet prompts are kept as written, for a re-roll.

Everything build 0.9.127.4 added is drawn in inline SVG (`[JS-ICONS-MAGE]`). This is
the painted version of that list, grouped the way section 15 of
`_magedesign/preview.html` groups it, and limited to what the core actually ships.

| Family | Painted | Ships as | Sheet | Pipeline |
|---|---|---|---|---|
| Runestone and runes | 9 | `runestone`, 8 `<grade>_rune` | A | item pack |
| Crafted wands | 7 | `<wood>_wand` | B | item pack |
| Crafted staves | 7 | `<wood>_staff` | C | item pack |
| Cloth | 7 | `linen` ... `wyrmsilk` | D | item pack |
| Robe pieces | 35 | `<cloth>_hood`, `_robe`, `_leggings`, `_wraps`, `_slippers` | E to I | item pack |
| Element marks | 4 | `el_fire`, `el_frost`, `el_storm`, `el_shadow` | J | item pack |
| Tree plates | 16 | `NODE_ART` | K | `injectnodes.js` |
| Runecrafting rail icon | 1 | `ICONS.runecrafting` | L | item pack |
| **Runecrafting banner** | **1** | `SKILL_ART.runecrafting` | M | **1536x177 WebP, about 13 KB** |
| Runecrafter's Cape | 1 | `cape_runecrafting` | N | item pack |

**88 assets across 14 sheets: 87 icons and one banner.** Section 16 of the design
page counts the same 88 at about 393 KB once they are in the file (199 + 17 + 177),
which takes 12.03 MB to about 12.4 MB. The audit's ceiling is 13.5 MB.

Not on this list, because they belong to later slices: the Sunder Rune, the 22
dropped staves and wands, the three raid cloths and Dawnveil, Wyrdstone, the Arcane
Draught, the Sorcery plates, the achievements. The Magic stat icon is painted already.

Paste the **style block** from `PROMPTS.md` once at the start. Every sheet assumes it.

If a sheet comes back with a drawn grid frame, measure the lines before slicing:
`slice.js` reads its backdrop from the four CORNERS, so a border makes it treat the
page as dark and every crop collapses to a 1px sliver. `PROMPTS-shop.md` has the
row-by-row recipe.

## Three things specific to this batch

- **The runes are a heat ladder, not a rainbow.** Ash is cold and grey, Starfall is
  blue-white. Not one of them is an element, so none may read as fire, frost, storm
  or shadow. If Cinder comes back looking like a Fire spell the ladder is lost,
  because the element marks sit right beside these in the fight.
- **Storm and Shadow are both purple in the game** (`#b9a4f0` and `#9a5ad0`). They
  are told apart by SHAPE and VALUE: Storm is a pale, sharp bolt, Shadow is a dark,
  round crescent. Sheet J says so twice on purpose.
- **Cloth is the third armour class and has to read as cloth at 20px.** No plates,
  no buckles, no hard edges. Leather is stitched and strapped, plate is riveted,
  cloth hangs and folds. Every robe sheet repeats this.

---

## Sheet A - Runestone and the eight runes (9, grid 5x2)

The last cell is empty. One stone, eight heats. Every rune is the SAME carved tablet
with the SAME mark, so the only things that change are the colour of the stone and
how hot the mark burns.

````
SHEET: Runestone and runes. 9 cells, 5 across and 2 down. The last cell is empty.

Cell 1 is the raw material. Cells 2 to 9 are ONE object repeated eight times: a
small thick tablet of stone with rounded corners, standing upright and seen flat on,
with ONE bold angular mark carved deep into its face. The mark is the same in all
eight: a vertical stroke with two sharp chevrons branching to the right, like a
letter cut with a chisel. Same tablet, same mark, same size, same angle in every
cell. Only the stone colour and the heat of the mark change.

It is a HEAT LADDER, cold to white-hot, like metal in a forge. None of these is a
fire spell, an ice spell or lightning. No flames, no frost, no sparks of lightning,
no smoke. The mark glows from inside the groove and nothing else.

CELLS:
  1. Runestone      - a rough quarried lump of soft pale grey stone, uncut, with one
                      flat sawn face. No mark on it. Matt, chalky, a little dusty.
  2. Ash Rune       - pale bone-grey tablet. The mark is cut but COLD: no glow at
                      all, just a dark groove.
  3. Soot Rune      - dark blue-grey slate tablet. The mark is cold too, a paler
                      grey scratch in dark stone. No glow.
  4. Char Rune      - brown tablet, the colour of scorched wood. The mark has the
                      first dull glow, a low brown-orange, like an ember under ash.
  5. Cinder Rune    - dark red-brown tablet. The mark glows red-orange.
  6. Kiln Rune      - warm dark tablet. The mark glows bright orange, strong enough
                      to light the stone around the groove.
  7. Forge Rune     - dark tablet. The mark glows yellow-gold, bright, with a warm
                      halo round the whole stone.
  8. Crucible Rune  - pale tablet. The mark is WHITE-HOT with a pale gold edge, the
                      hottest thing a forge makes.
  9. Starfall Rune  - pale blue-white tablet. The mark is a cold bright blue-white,
                      past white-hot, with three or four tiny four-point sparkles
                      round it. The richest and brightest of the eight.
````

<details><summary>id order for <code>sheets/mg_runes.txt</code></summary>

```
runestone
ash_rune
soot_rune
char_rune
cinder_rune
kiln_rune
forge_rune
crucible_rune
starfall_rune
_spare
```
</details>

---

## Sheet B - Crafted wands (7, grid 4x2)

The last cell is empty. One silhouette, seven woods. A wand is the one-handed
weapon: short, light, quick. It has to be told from a staff at 20px, so it is drawn
SHORT and at a slant, with the stone at the top end.

````
SHEET: Wands. 7 cells, 4 across and 2 down. The last cell is empty.

ONE design, seven woods. Every cell is THE SAME WAND: a short slim rod, about the
length of a forearm, drawn on a diagonal from bottom left to top right, tapering
slightly toward the tip. A plain wrapped grip at the lower end. At the upper end a
small rough-cut stone is set into the wood and held by two thin bands. Same length,
same angle, same stone shape in every cell. Only the wood and the colour of the
stone change.

No hands, nobody holding it. No sparkle trail, no spell coming off it.

CELLS:
  1. Pine Wand        - pale yellow-brown pine. The stone is plain grey-white, dull,
                        no glow.
  2. Oak Wand         - mid brown oak, a little darker and heavier in the grain. The
                        stone is pale steel-blue with a faint glow.
  3. Ironbark Wand    - grey-brown ironbark, hard and close-grained. The stone is
                        pale lavender, glowing softly.
  4. Emberwood Wand   - deep red-brown wood. The stone is orange and glowing warm.
  5. Frostwood Wand   - pale blue-grey wood. The stone is ice blue, glowing cold.
  6. Shadowwood Wand  - dark purple-black wood. The stone is violet, glowing.
  7. Ancient Wand     - mossy grey-green wood, gnarled. The stone is bright
                        yellow-green with two or three tiny sparkles. The finest of
                        the seven.
````

<details><summary>id order for <code>sheets/mg_wands.txt</code></summary>

```
pine_wand
oak_wand
ironbark_wand
ember_wand
frost_wand
shadow_wand
ancient_wand
_spare
```
</details>

---

## Sheet C - Crafted staves (7, grid 4x2)

The last cell is empty. The staff is the two-handed weapon: tall, slow, heavy. Drawn
UPRIGHT and filling the height of the cell, so that beside a wand nobody has to read
the name.

````
SHEET: Staves. 7 cells, 4 across and 2 down. The last cell is empty. Tall cells.

ONE design, seven woods. Every cell is THE SAME STAFF: a tall thick walking-staff
standing dead upright, filling the full height of its cell. A straight shaft with a
leather wrap a third of the way down. At the top the wood forks into two short
curved prongs that hold a large rough-cut stone between them, about three times the
size of a wand's stone. An iron shoe on the foot. Same height, same fork, same stone
shape in every cell. Only the wood and the colour of the stone change.

It must read as TWO-HANDED and heavy: thick in the shaft, a big head. No hands,
nobody holding it. No spell coming off it.

CELLS:
  1. Pine Staff        - pale yellow-brown pine. The stone is plain grey-white,
                         dull, no glow.
  2. Oak Staff         - mid brown oak. The stone is pale steel-blue, faint glow.
  3. Ironbark Staff    - grey-brown ironbark. The stone is pale lavender, glowing
                         softly.
  4. Emberwood Staff   - deep red-brown wood. The stone is orange, glowing warm.
  5. Frostwood Staff   - pale blue-grey wood. The stone is ice blue, glowing cold.
  6. Shadowwood Staff  - dark purple-black wood. The stone is violet, glowing.
  7. Ancient Staff     - mossy grey-green wood, gnarled. The stone is bright
                         yellow-green with a few tiny sparkles and a strong halo.
                         The finest of the seven.
````

<details><summary>id order for <code>sheets/mg_staves.txt</code></summary>

```
pine_staff
oak_staff
ironbark_staff
ember_staff
frost_staff
shadow_staff
ancient_staff
_spare
```
</details>

---

## Sheet D - Cloth (7, grid 4x2)

The last cell is empty. These are the loom's output, the thing a robe is cut from.
They sit beside the rolled cured leathers in the satchel and must not be mistaken
for them: leather is a ROLL standing on end tied with a cord, cloth is a FOLDED BOLT
lying flat.

````
SHEET: Bolts of cloth. 7 cells, 4 across and 2 down. The last cell is empty.

Every cell is the same object: one bolt of woven cloth, folded flat into a thick
neat rectangle, lying down, seen from slightly above, with one loose corner turned
back so the weave and the edge trim show. Soft folds, a visible woven texture drawn
as two or three big shapes, not thread by thread. Same fold, same angle, same size
in every cell. Only the cloth changes.

It is CLOTH: soft, matt, folded. Not a roll of leather, not a rug, not a scroll.

CELLS:
  1. Linen       - plain undyed cream cloth, coarse weave, a tan thread along the
                   edge. The humblest of the seven.
  2. Spidersilk  - very pale silver-white cloth with a fine sheen, a thin sea-green
                   edge. Lighter and thinner than linen.
  3. Gravecloth  - dusty grey-violet cloth, a little frayed, with a thin pale
                   ghost-green edge.
  4. Rimeweave   - pale ice-blue cloth with a white edge and a faint cold sheen, as
                   if frosted.
  5. Seercloth   - deep indigo blue cloth with a gold edge. Rich and heavy.
  6. Stoneweave  - warm stone-grey cloth, thick, with a jade-green edge.
  7. Wyrmsilk    - deep crimson cloth with a gold edge and a faint warm glow in the
                   folds. The richest of the seven.
````

<details><summary>id order for <code>sheets/mg_cloth.txt</code></summary>

```
linen
spidersilk
gravecloth
rimeweave
seercloth
stoneweave
wyrmsilk
_spare
```
</details>

---

## Sheets E to I - The robe ladder (35, five sheets of 7, grid 4x2)

Five sheets, one for each piece, the way the leather ladder was done. The last cell
of each is empty. **Run all five in one ChatGPT conversation**, so the seven cloths
come out the same colours from the hood to the slippers.

The seven cloths, in order, for every sheet. Paste this once before sheet E:

````
THE SEVEN CLOTHS, in this order on every robe sheet I send:
  1. Linen       - plain undyed cream, tan trim
  2. Spidersilk  - pale silver-white with a fine sheen, sea-green trim
  3. Gravecloth  - dusty grey-violet, pale ghost-green trim
  4. Rimeweave   - pale ice blue, white trim, faintly frosted
  5. Seercloth   - deep indigo blue, gold trim
  6. Stoneweave  - warm stone grey, jade-green trim
  7. Wyrmsilk    - deep crimson, gold trim, a faint warm glow in the folds

They climb in richness from 1 to 7: more trim, heavier cloth, a little embroidery
from Seercloth upward. Linen is a peasant's cloth, Wyrmsilk is a court mage's.

Every piece is CLOTH and only cloth: soft, hanging, folded. No metal plates, no
rivets, no buckles, no leather straps, no fur. Seams are sewn, edges are trimmed
with a band of the trim colour. This is the opposite of armour and has to look it.
````

### Sheet E - Hoods (7)

````
SHEET: Robe ladder - hood (7 cloths). 7 cells, 4 across and 2 down. The last cell
is empty.

ONE design, one per cloth. Every cell is THE SAME PIECE in a different cloth.

A deep cloth HOOD on its own, empty, seen from the front and slightly to one side:
a soft pointed cowl with a wide dark opening where a face would be, and a short
mantle of cloth spreading over where the shoulders would be. Nothing inside it: no
head, no face, no eyes, only shadow in the opening. A band of trim round the edge
of the opening.

CELLS:
  1. Linen Hood        - soft pointed cloth cowl with a short mantle
  2. Spidersilk Hood   - soft pointed cloth cowl with a short mantle
  3. Gravecloth Hood   - soft pointed cloth cowl with a short mantle
  4. Rimeweave Hood    - soft pointed cloth cowl with a short mantle
  5. Seercloth Hood    - soft pointed cloth cowl with a short mantle
  6. Stoneweave Hood   - soft pointed cloth cowl with a short mantle
  7. Wyrmsilk Hood     - soft pointed cloth cowl with a short mantle
````

<details><summary>id order for <code>sheets/mg_hood.txt</code></summary>

```
linen_hood
spidersilk_hood
gravecloth_hood
rimeweave_hood
seercloth_hood
stoneweave_hood
wyrmsilk_hood
_spare
```
</details>

### Sheet F - Robes (7)

````
SHEET: Robe ladder - robe (7 cloths). 7 cells, 4 across and 2 down. The last cell
is empty.

ONE design, one per cloth. Every cell is THE SAME PIECE in a different cloth.

A ROBE on its own, empty, hanging upright and seen flat from the front: a long
loose garment with wide bell sleeves held a little out to each side, a V neck, a
cloth sash tied at the waist, and the skirt cut off cleanly at about the knee. No
arms, no head, no legs, no body inside it. A band of trim down the front opening
and round each cuff.

It must not read as a jerkin or a breastplate: it is longer, looser, and it has
SLEEVES.

CELLS:
  1. Linen Robe        - long loose robe with wide sleeves and a sash
  2. Spidersilk Robe   - long loose robe with wide sleeves and a sash
  3. Gravecloth Robe   - long loose robe with wide sleeves and a sash
  4. Rimeweave Robe    - long loose robe with wide sleeves and a sash
  5. Seercloth Robe    - long loose robe with wide sleeves and a sash
  6. Stoneweave Robe   - long loose robe with wide sleeves and a sash
  7. Wyrmsilk Robe     - long loose robe with wide sleeves and a sash
````

<details><summary>id order for <code>sheets/mg_robe.txt</code></summary>

```
linen_robe
spidersilk_robe
gravecloth_robe
rimeweave_robe
seercloth_robe
stoneweave_robe
wyrmsilk_robe
_spare
```
</details>

### Sheet G - Leggings (7)

````
SHEET: Robe ladder - leggings (7 cloths). 7 cells, 4 across and 2 down. The last
cell is empty.

ONE design, one per cloth. Every cell is THE SAME PIECE in a different cloth.

A pair of loose cloth LEGGINGS on its own, empty, seen flat from the front: a wide
drawstring waist with the cord tied in a bow, two baggy legs gathered in at the
ankle with a band of trim. Soft folds at the knee. No legs inside, no feet, no body.

They must not read as plate greaves or leather chaps: baggy, soft, gathered.

CELLS:
  1. Linen Leggings        - baggy drawstring cloth trousers gathered at the ankle
  2. Spidersilk Leggings   - baggy drawstring cloth trousers gathered at the ankle
  3. Gravecloth Leggings   - baggy drawstring cloth trousers gathered at the ankle
  4. Rimeweave Leggings    - baggy drawstring cloth trousers gathered at the ankle
  5. Seercloth Leggings    - baggy drawstring cloth trousers gathered at the ankle
  6. Stoneweave Leggings   - baggy drawstring cloth trousers gathered at the ankle
  7. Wyrmsilk Leggings     - baggy drawstring cloth trousers gathered at the ankle
````

<details><summary>id order for <code>sheets/mg_leggings.txt</code></summary>

```
linen_leggings
spidersilk_leggings
gravecloth_leggings
rimeweave_leggings
seercloth_leggings
stoneweave_leggings
wyrmsilk_leggings
_spare
```
</details>

### Sheet H - Wraps (7)

````
SHEET: Robe ladder - wraps (7 cloths). 7 cells, 4 across and 2 down. The last cell
is empty.

ONE design, one per cloth. Every cell is THE SAME PIECE in a different cloth.

A PAIR of cloth HAND WRAPS on their own, empty, side by side: long strips of cloth
wound round and round where a hand and forearm would be, leaving the fingers bare,
with one loose tail of cloth hanging from each wrist. Fingerless. Shown as two
upright shapes, palms toward the viewer. No hands inside, no skin, no arms.

They must not read as gauntlets or leather gloves: no fingers, no knuckle plates,
only wound cloth.

CELLS:
  1. Linen Wraps        - a pair of wound cloth hand wraps, fingerless
  2. Spidersilk Wraps   - a pair of wound cloth hand wraps, fingerless
  3. Gravecloth Wraps   - a pair of wound cloth hand wraps, fingerless
  4. Rimeweave Wraps    - a pair of wound cloth hand wraps, fingerless
  5. Seercloth Wraps    - a pair of wound cloth hand wraps, fingerless
  6. Stoneweave Wraps   - a pair of wound cloth hand wraps, fingerless
  7. Wyrmsilk Wraps     - a pair of wound cloth hand wraps, fingerless
````

<details><summary>id order for <code>sheets/mg_wraps.txt</code></summary>

```
linen_wraps
spidersilk_wraps
gravecloth_wraps
rimeweave_wraps
seercloth_wraps
stoneweave_wraps
wyrmsilk_wraps
_spare
```
</details>

### Sheet I - Slippers (7)

````
SHEET: Robe ladder - slippers (7 cloths). 7 cells, 4 across and 2 down. The last
cell is empty.

ONE design, one per cloth. Every cell is THE SAME PIECE in a different cloth.

A PAIR of soft cloth SLIPPERS on their own, empty, side by side and seen from
slightly above and to one side: low, soft, with a gently upturned pointed toe, a
thin sewn sole, and a band of trim round the opening. No feet inside, no legs.

They must not read as boots: low at the ankle, soft, no laces, no buckles, no
metal toe.

CELLS:
  1. Linen Slippers        - a pair of low soft cloth slippers, pointed toe
  2. Spidersilk Slippers   - a pair of low soft cloth slippers, pointed toe
  3. Gravecloth Slippers   - a pair of low soft cloth slippers, pointed toe
  4. Rimeweave Slippers    - a pair of low soft cloth slippers, pointed toe
  5. Seercloth Slippers    - a pair of low soft cloth slippers, pointed toe
  6. Stoneweave Slippers   - a pair of low soft cloth slippers, pointed toe
  7. Wyrmsilk Slippers     - a pair of low soft cloth slippers, pointed toe
````

<details><summary>id order for <code>sheets/mg_slippers.txt</code></summary>

```
linen_slippers
spidersilk_slippers
gravecloth_slippers
rimeweave_slippers
seercloth_slippers
stoneweave_slippers
wyrmsilk_slippers
_spare
```
</details>

---

## Sheet J - Element marks (4, grid 4x1)

These are the smallest art in the game. On the spell bar they are **14 pixels**,
beside the element's name, and they are also the chip on the monster card and the
tag in the Monster Log. A mark is one bold shape and its colour, nothing more.

**Judge them at 14px before injecting.** The drawn marks were made for that size. If
a painted one is muddier than the drawn one it replaces, keep the drawn one. Nothing
in the audit fails if these four stay drawn.

**What happened (0.9.127.6):** all four painted marks went in. Fire, Frost and Storm
read better painted than drawn. Shadow came back as the dark crescent this sheet
asks for, and at 14px on its own selected button (dark purple) it is the lowest
contrast of the four; its name sits beside it everywhere it is drawn, so it stayed
as painted. If it ever needs to read lighter, lift its tones and leave the ink line
alone (gamma about 0.6 on the coloured pixels only), then swap that one id with
`mergeitems.js`. The audit now asserts all four are painted.

````
SHEET: Four element marks for a dark-fantasy RPG. 4 cells, 4 across and 1 down.

These are EMBLEMS, not items. Each is ONE bold simple shape, centred, filling its
cell, with a dark outline and two or three flat value steps. They are shown at
FOURTEEN PIXELS, so there is no room for detail: if the silhouette alone does not
say which element it is, it has failed.

All four must be told apart from each other by SHAPE first and colour second. Two
of them are purple, on purpose, and those two must differ completely in shape and
in lightness.

CELLS:
  1. Fire    - one tall teardrop flame with a single curl at the tip. Orange
               outside, a small pale yellow core. No logs, no smoke, no sparks.
  2. Frost   - one six-armed snow crystal, thick-armed and simple, each arm with
               one pair of short barbs. Pale ice blue with a white centre.
  3. Storm   - one thick jagged lightning bolt, three sharp angles, running from
               top right to bottom left. PALE: lavender-white, the lightest of the
               four. Hard straight edges. No cloud.
  4. Shadow  - one fat crescent, like a dark moon, with a single small bright point
               held inside its curve. DARK: deep purple going to near-black, the
               darkest of the four. Round soft edges. No skull, no face, no eye.
````

<details><summary>id order for <code>sheets/mg_elements.txt</code></summary>

```
el_fire
el_frost
el_storm
el_shadow
```
</details>

---

## Sheet K - Tree node icons (16, grid 4x4)

No empty cells. Match the existing node art: **one object, centred, no background, no
frame, no text**. They render at about 34px on the Forge Rail board and 64px in the
docked strip. A node icon is a small still life of the thing the perk does, not a
symbol.

The material of this tree is **grey runestone, a chisel and a kiln**. Where a mark
glows, it glows the skill's cool violet-white unless the cell says otherwise.

````
SHEET: Skill-tree perk icons. 16 cells, 4 across and 4 down.

Each cell is ONE object or a very small group, centred, drawn alone on nothing - no
frame, no border, no badge, no numerals, no text. These sit on a dark board at about
34 pixels, so keep them simple and let the silhouette carry it.

Grey carved stone, dark iron tools and pale wood, with a cool violet-white glow in
any carved mark, and one warm accent where noted.

CELLS:
  1.  Steady Chisel   - a chisel held against a slab of pale stone with a wooden
                        mallet just behind it, a few chips flying. No hands.
  2.  Old Script      - a worn stone tablet covered in three neat rows of small
                        carved marks, one corner chipped away.
  3.  Twin Batch      - two identical small heaps of carved rune tablets, side by
                        side.
  4.  Lasting Mark    - ONE rune tablet whose carved mark still glows, with a thin
                        unbroken ring of light closed round the stone.
  5.  Close Cutting   - a block of grey stone scored into a tight grid of small
                        tablets, one corner tablet lifted out. Nothing wasted.
  6.  True Lines      - an iron straightedge laid across a stone, and beside it one
                        perfectly straight glowing line.
  7.  Spare Stone     - one uncut lump of grey runestone set apart on its own, a
                        small green tick-shaped ribbon tied round it.
  8.  Deep Cut        - a rune tablet seen at an angle, its mark carved very deep,
                        bright light pouring up out of the groove.
  9.  Clear Sight     - a ring of polished stone held upright like a sighting
                        glass, one small bright point exactly in its centre.
  10. Bound Twice     - the top half of a wooden staff with TWO glowing bands wound
                        round the shaft, one above the other.
  11. Branded         - a branding iron with a rune-shaped head, the head glowing
                        orange-hot. WARM accent: this is the one orange cell.
  12. Swift Kiln      - a small squat stone kiln with its door open, a fierce fire
                        inside, and a row of tablets on the shelf above. Warm
                        firelight in the mouth only.
  13. Stone Memory    - three stone tablets stacked, each edge showing a different
                        layer of carved marks, the oldest at the bottom worn smooth.
  14. Deep Mark       - a rune tablet with its mark cut clean THROUGH the stone,
                        light showing on both faces.
  15. Endless Rune    - a rune tablet whose carved mark is one closed loop with no
                        beginning and no end, glowing blue-white.
  16. Runecrafter's Cape - a cape hanging on a peg, no head, no body, nobody wearing
                        it, deep violet, one small angular rune in gold high on the
                        chest.
````

<details><summary>node id order for <code>sheets/rn_nodes.txt</code></summary>

```
rn_speed
rn_xp
rn_double
rn_save
rn_batch
rn_acc
rn_thrift
rn_dmg
rn_sure
rn_bind
rn_brand
rn_gm_speed
rn_gm_xp
rn_gm_save
rn_endless
rn_cape
```
</details>

---

## Sheet L - The skill icon (1)

This follows the **skill icon** brief, not the item brief. It sits in the left rail
beside the other fourteen and has to hold up at 20px. It shares stone with Mining and
a glow with Firemaking and the Jeweller, so the carved MARK has to do the work.

````
One icon for a dark-fantasy RPG skill called Runecrafting. It sits in a list beside
icons for Mining, Smithing, Jewellery and so on, and is displayed at about TWENTY
PIXELS.

FILL THE FRAME. One object, drawn LARGE, about 95% of the image edge to edge. No empty
margin.

Two or three big shapes and nothing else. It must be identifiable from its silhouette
alone with no colour.

Deep, slightly desaturated colour, strong contrast inside the object, a bright rim
light on one edge and deep shadow opposite - it sits on a near-black interface, so it
should feel lit in a dark room, not bright and flat.

Hand-painted with a dark ink outline, cel-like shading in three or four value steps.
Not flat vector, not a photograph, not a 3D render. Flat pure white background.

THE OBJECT: one thick upright tablet of dark grey stone with rounded shoulders, and
carved into its face ONE bold angular mark - a vertical stroke with two sharp
chevrons branching to the right - glowing a cool violet-white from inside the
groove. A short iron chisel leans across the lower right corner of the stone.

The glowing mark is the whole icon. Make it thick enough to survive at twenty pixels:
three strokes, no fine lines. The glow is VIOLET, not orange and not blue, so it is
not mistaken for the Firemaking flame or a cut gem.
````

<details><summary>id for <code>sheets/rn_skill.txt</code></summary>

```
runecrafting
```
</details>

---

## Sheet M - The banner scene (1)

Every skill panel has a wide painted landscape behind its header. The other fourteen
have one; Runecrafting falls back to a bare gradient. They are **1536x177 WebP**.

````
A wide banner illustration for a dark-fantasy RPG skill panel. Very wide and short -
roughly 1536 by 177 pixels, about 8.5:1. It sits BEHIND panel text, so it must read as
a backdrop, not as a picture competing for attention.

Composition: keep the interest in the LEFT third and let the right two thirds fall away
into darkness and haze, because the skill's name, level and progress bar sit over that
side. No large bright shapes on the right.

Subject: a rune-carver's bench set into the mouth of a small stone quarry at dusk. A
squat stone kiln with its door ajar and a low fire inside. On the bench a row of
carved stone tablets, three of them with marks that glow a cool violet-white, a
chisel and a mallet left down mid-work, a staff leaning against the rock. Stone dust
hanging in the air. No person, no face, no hands.

Dark, low-key: cold blue-grey rock and near-blacks, warm firelight in the kiln mouth
only, and the cool violet glow of the carved marks as the one other light. Painterly,
the same hand as the other skill banners: atmospheric, slightly soft, not a sharp
illustration and not a photograph. No text, no logo, no UI, no border.
````

<details><summary>id for <code>sheets/rn_banner.txt</code></summary>

```
runecrafting
```
</details>

---

## Sheet N - Runecrafter's Cape (1)

`cape_runecrafting` exists and the shop sells it. It is the fifteenth skillcape, and
the `rn_cape` capstone node is gated on owning it.

````
SHEET: One skillcape for a dark-fantasy RPG. A single cell, one object.

Draw it the way the skillcapes sheet was drawn: hanging as if on a peg, no head, no
body, nobody wearing it, seen flat on from the front, filling the cell.

  Runecrafting Cape - deep violet heavy cloth with a paler lavender lining showing
                      at the edges, a round gold clasp at the throat, a single band
                      of gold braid along the hem, and a small emblem high on the
                      chest: one angular rune, a vertical stroke with two sharp
                      chevrons branching to the right, in gold. A standing collar
                      of the same violet, so its outline differs from the others.
````

<details><summary>id for <code>sheets/rn_cape.txt</code></summary>

```
cape_runecrafting
```
</details>

---

## How they went in (0.9.127.6)

Not the way this file first said. Three things changed between the plan and the job,
and `README.md` has the commands that were really run:

- **The sheets are not a uniform grid**, so `slice.js --grid` on its own was wrong for
  most of them and the caption trim cut the ties off the wraps. Every sheet has its
  own entry in `cutall.js` with measured rows and `noeat: true`.
- **`key.js` holed 30 of the 87.** It cuts enclosed near-white as a hole, and here
  that is the glow in a rune, the middle of the Frost mark and the white of the
  Spidersilk. These ids are keyed by `keyline.js` and listed in `keyline.json`.
- **`inject.js` was not used.** It rewrites the whole block from a full pack, and a
  full pack is different bytes on this machine. Only the 71 new ids were packed
  (`picks_magic.json`) and merged with `mergeitems.js`; all 873 icons that were live
  are byte for byte what they were.

The banner is `--band 0.28,0.59 --q 0.72` (27.6 KB). The plates are 112px, the items
96px, like every other pack.

### What came out of `_audit_tests.js`

All three exemptions that kept the art sweep green while these were drawn are gone:

| Was | Now |
|---|---|
| `MAGE_PENDING` held the 65 items | an empty list. A new drawn item is named there by id; the rule that built it from `isRune`, `it.magic` and `it.cloth` must not come back |
| `if(s==='runecrafting') continue;` in the node art check | removed, so the 16 plates are swept like every other tree |
| `'Runecrafting Cape'` in `ART_EXEMPT` | removed |

One assertion was added in their place: all 71 Magic and Runecrafting icons are
painted (65 items, the four element marks, the skill and the cape).

### What is still in the game

`[JS-ICONS-MAGE]`, about 34 KB of generators, is still there on purpose. The painted
block lands after `/* ==ICONS-DONE== */`, which is below every place a drawn icon is
assigned (the `ICONS` literal and the `CLOTH_TIERS` loop), so paint wins with no
change to either and a drawn icon only ever shows for an id whose painted one is
missing. It can go the way `_capeSVG` went with the twelve capes: `_runeSVG`,
`_runestoneSVG`, `_wandSVG`, `_staffSVG`, `_clothSVG`, the five `_r*SVG` robe
pieces, `_runecraftSVG`, `_runeCapeSVG`, `_elementSVG`, `RN_TREE_ICONS`, and the
line in the loop with them. That is a code change, not an art one, and it was left
for its own build.

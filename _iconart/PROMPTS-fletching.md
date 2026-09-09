# Fletching and ranged - the full art list

Fletching is the fourteenth skill and the only one still drawn entirely in
procedural inline SVG. Counted against what the other thirteen actually have.

| Family | Drawn | Ships as | Pipeline |
|---|---|---|---|
| Skill icon | 1 | `ICONS.fletching` (today: the bow emoji) | item pack |
| **Banner scene** | **1** | `SKILL_ART.fletching` | **1536x177 WebP, ~8 KB** |
| **Tree node icons** | **16** | `NODE_ART` | `injectnodes.js` |
| Materials, seed, food | 7 | item pack | item pack |
| Ammunition bases | 4 | 32 items | **recolour x8 metals** |
| Bow bases | 4 | 28 items | **recolour x7 woods** |
| Crossbow bases | 2 | 16 items | **recolour x8 metals** |
| Fletcher's Cape | 1 | item pack | item pack |

**36 images drawn, 102 assets in game.** Eight sheets below.

Paste the **style block** from `PROMPTS.md` once at the start. Every sheet assumes it.

If a sheet comes back with a drawn grid frame, measure the lines before slicing:
`slice.js` reads its backdrop from the four CORNERS, so a border makes it treat the
page as dark and every crop collapses to a 1px sliver. `PROMPTS-shop.md` has the
row-by-row recipe.

### Not art, but the same checklist

Enumerated from the live file, not remembered. Every one of these is currently
missing for fletching:

| | state |
|---|---|
| `SKILL_CAPE` | **no `fletching` key**, so `fl_cape` can never be bought and 1 of the 98 points is unreachable |
| `PASSIVE_TIPS` | 0 of 16 nodes have a long-form tooltip (125 exist for the other trees) |
| `SKILL_ORDER` | fletching is absent from the Crafting tools sub-tab list |
| `ENCHANTS` | every skill has a tier-5 unique enchant. There is no `uq_fl` |
| `SKILL_ACCENT` | 13 entries, no fletching. It falls back to the default gold |
| `GD_VERB` | the verb guild quests use. Suggest `'Fletch'` |

---

## Sheet A - Materials, seed and food (7, grid 4x2)

The last cell is empty. These are the only fletching items drawn one-off; everything
else on the list is a tier ladder.

````
SHEET: Fletching materials. 7 cells, 4 across and 2 down. The last cell is empty.

Each cell is a single object, drawn alone on nothing, the way the herbs and produce
sheet was drawn.

CELLS:
  1. Arrow Shafts  - three bare wooden shafts, no head and no feather, laid in a
                     loose bundle. Pale seasoned wood, dead straight.
  2. Feather       - one stiff barred flight feather, greyish brown with darker bars,
                     lying on its side.
  3. Flax          - a small tied bundle of pale retted flax stems, a few tiny blue
                     flowers still on the tops.
  4. Bowstring     - a coil of waxed pale cord, looped the way a spare string is
                     carried, one end whipped with darker thread.
  5. Flax Seed     - a small open pouch of flat glossy brown seeds, a few spilled.
  6. Raw Fowl      - a plucked and drawn moor-hen, pale raw skin, no head, no feathers.
  7. Roast Fowl    - the same bird roasted: deep golden brown, crisp skin, glistening.
````

<details><summary>id order for <code>sheets/fl_mats.txt</code></summary>

```
wood_shaft
feather
flax
bowstring
flax_seed
raw_fowl
roast_fowl
_spare
```
</details>

---

## Sheet B - Ammunition bases (4, grid 4x1)

**Draw these once in plain steel.** They become 32 items through `recolour.js`, which
gradient-maps luminance onto a per-metal ramp and keeps every fold and highlight.
Generating eight tiers separately is what produced eleven different silhouettes per
armour slot last time.

The arrow and the bolt must be clearly different objects at 15px: an arrow is long
and thin with a feather, a bolt is short and stubby with no feather at all.

````
SHEET: Arrow and bolt ammunition. 4 cells, 4 across and 1 down.

Draw all four in PLAIN BRIGHT STEEL - neutral grey metal, no colour cast, no tint.
The metal is recoloured later, so any hue baked in now will fight the recolour.
Full value range: real black in the shadows, real white on the rim light.

CELLS:
  1. Arrowhead - ONE barbed arrowhead alone, no shaft. A flat leaf-shaped blade with
                 two backswept barbs and a short socket. Seen slightly edge-on so the
                 thickness reads. Filling the cell.
  2. Bolt Tip  - ONE squat bodkin point alone, no shaft. Short, heavy, four-sided,
                 pyramid-like, obviously thicker and blunter than the arrowhead.
  3. Arrow     - ONE complete arrow, standing diagonally: barbed steel head, long pale
                 wooden shaft, three feather fletchings at the nock end. Long and thin.
  4. Bolt      - ONE complete crossbow bolt, standing diagonally: heavy bodkin tip,
                 SHORT thick shaft, and NO feathers - small flat vanes only. It must
                 read as a stubby cousin of the arrow, roughly half its length.
````

<details><summary>id order for <code>sheets/fl_ammo.txt</code></summary>

```
steel_arrowhead
steel_bolt_tip
steel_arrow
steel_bolt
```
</details>

Ladder, in game order: bronze, iron, **steel (the base, copied through)**, mithril,
cobalt, runite, starsteel, starfall.

---

## Sheet C - Bow bases (4, grid 4x1)

One row, so each bow gets the full height of the page to stand up in. These become
28 items across the seven woods.

**A bow is a D.** The limb bows out to one side and the string runs dead straight down
the chord. Drawn as a symmetrical curve it reads as a leaf, which is exactly how the
first pass of the inline SVGs came out.

````
SHEET: Bows. 4 cells, 4 across and 1 down. Tall narrow cells.

Draw all four in PLAIN MID-BROWN SEASONED WOOD - warm neutral timber, no colour cast.
The wood is recoloured later, so keep the hue plain and the value range wide.

Every bow is drawn UPRIGHT and VERTICAL, filling the height of its cell, seen flat on
from the side. The limb curves out to ONE side; the string is a dead straight line
down the chord. Never a symmetrical leaf shape.

CELLS:
  1. Shortbow          - a short stout bow, deeply curved, strung. Thick in the limb,
                         about two thirds the height of the longbow. Pale cord string.
  2. Longbow           - a tall slender bow, shallow even curve, strung. Slim in the
                         limb, reaching the full height of the cell. Pale cord string.
  3. Unstrung Shortbow - the SAME shortbow with NO STRING. A bare carved stave, the
                         limb relaxing straighter now nothing holds it. Nocks cut at
                         each tip and empty.
  4. Unstrung Longbow  - the SAME longbow with NO STRING. A bare tall stave, nearly
                         straight, nocks cut and empty.

The unstrung pair must be unmistakably stringless at a glance: no cord anywhere in
the cell, and a visibly straighter limb than its strung twin.
````

<details><summary>id order for <code>sheets/fl_bows.txt</code></summary>

```
pine_shortbow
pine_longbow
unstrung_pine_shortbow
unstrung_pine_longbow
```
</details>

Ladder: **pine (the base)**, oak, ironbark, emberwood, frostwood, shadowwood, ancient.
The top four woods carry a glow in their palette. See the note at the bottom.

---

## Sheet D - Crossbow bases (2, grid 2x1)

These become 16 items across the eight metals. The game palettes a crossbow entirely
by its METAL, stock included, so draw it metal-dominant and keep the wood minimal or
the recolour will tint a large brown stock into a large blue one.

````
SHEET: Crossbows. 2 cells, 2 across and 1 down.

Draw both in PLAIN BRIGHT STEEL - neutral grey metal, no colour cast. Make the METAL
the dominant read: a metal prod, metal fittings, metal stirrup, and only a small
amount of dark wood in the stock. Wide value range.

Both are seen flat on from the side, held horizontally, filling the width of the cell.

CELLS:
  1. Crossbow          - a stocky crossbow, strung: a short thick metal prod across
                         the front, a taut cord drawn back to the nut, a solid stock,
                         a trigger, and a stirrup ring at the nose.
  2. Unstrung Crossbow - the SAME crossbow with NO CORD anywhere. Bare prod, empty
                         nut, the stock and trigger unchanged. It must read as
                         obviously stringless at a glance.
````

<details><summary>id order for <code>sheets/fl_xbow.txt</code></summary>

```
steel_crossbow
unstrung_steel_crossbow
```
</details>

Ladder: bronze, iron, **steel (the base)**, mithril, cobalt, runite, starsteel, starfall.

---

## Sheet E - Tree node icons (16, grid 4x4)

No empty cells. Match the existing node art: **one object, centred, no background, no
frame, no text**. They render at about 34px on the Forge Rail board and 64px in the
docked strip. Look at `ag_coins` (a spilled coin pouch) and `fa_seed` (a spilled seed
sack): a node icon is a small still life of the thing the perk does, not a symbol.

````
SHEET: Skill-tree perk icons. 16 cells, 4 across and 4 down.

Each cell is ONE object or a very small group, centred, drawn alone on nothing - no
frame, no border, no badge, no numerals, no text. These sit on a dark board at about
34 pixels, so keep them simple and let the silhouette carry it.

Warm wood browns, pale feather greys and cold steel, with one accent where noted.

CELLS:
  1.  Steady Hands    - a fletcher's knife mid-cut on a shaft, thin curls of shaving
                        peeling away
  2.  Straight Grain  - a split billet of pale wood, dead straight grain running the
                        whole length
  3.  Bulk Fletcher   - two identical tied bundles of finished arrows, side by side
  4.  Salvager        - three used arrows gathered in a bundle, shafts scuffed and
                        fletchings bent from being pulled out of something
  5.  Splitter        - a log seen end-on with an iron wedge driven into it, splitting
                        into pale staves
  6.  Keen Heads      - ONE arrowhead seen edge-on, the honed edge catching a hard
                        bright line
  7.  Quiverfull      - a quiver crammed past its mouth, fletchings crowding out over
                        the rim
  8.  Practised Draw  - a bow at FULL DRAW with an arrow nocked, string pulled deep
                        back. Nobody holding it, no hands, no archer
  9.  Windcutter      - an arrow in flight, one thin curl of air peeling off the head
  10. Master Fletcher - a crossbow bolt and an arrow crossed over each other, the
                        difference in length obvious
  11. Barbed          - a barbed head with hooked backswept prongs, ONE dark red bead
                        on the point
  12. Swift Bench     - a fletcher's workbench: a rack of shafts and a knife left down
                        mid-work
  13. Woodsong        - a bowstring caught mid-pluck, faint rings of sound coming off it
  14. Deep Quiver     - a tall narrow deep quiver, arrows sunk so far in that only the
                        fletchings show at the top
  15. Endless Quiver  - a quiver with pale light spilling up out of its mouth
  16. Fletcher's Cape - a cape hanging on a peg, no head, no body, nobody wearing it,
                        a small crossed-arrows emblem high on the chest
````

<details><summary>node id order for <code>sheets/fl_nodes.txt</code></summary>

```
fl_speed
fl_xp
fl_double
fl_salvage
fl_split
fl_acc
fl_quiver
fl_dmg
fl_wind
fl_bolts
fl_barb
fl_gm_speed
fl_gm_xp
fl_gm_salv
fl_endless
fl_cape
```
</details>

---

## Sheet F - The skill icon (1)

This follows the **skill icon** brief, not the item brief. It sits in the left rail
beside the other thirteen and has to hold up at 20px.

````
One icon for a dark-fantasy RPG skill called Fletching. It sits in a list beside icons
for Woodcutting, Mining, Fishing and so on, and is displayed at about TWENTY PIXELS.

FILL THE FRAME. One object, drawn LARGE, about 95% of the image edge to edge. No empty
margin.

Two or three big shapes and nothing else. It must be identifiable from its silhouette
alone with no colour.

Deep, slightly desaturated colour, strong contrast inside the object, a bright rim
light on one edge and deep shadow opposite - it sits on a near-black interface, so it
should feel lit in a dark room, not bright and flat.

Hand-painted with a dark ink outline, cel-like shading in three or four value steps.
Not flat vector, not a photograph, not a 3D render. Flat pure white background.

THE OBJECT: a bow at full draw with an arrow nocked, seen flat on, standing upright.
The bow is a D SHAPE - the limb curves out to the LEFT and the string is a dead
straight vertical line down the chord. The arrow crosses it horizontally, head to the
right. Drawn as a symmetrical curve it reads as a leaf; it must not.

The silhouette has to stay distinct from the axe, the pickaxe, the fishing rod and the
lockpicks already in that list, so let the straight string and the crossing arrow do
the work.
````

<details><summary>id for <code>sheets/fl_skill.txt</code></summary>

```
fletching
```
</details>

---

## Sheet G - The banner scene (1)

Every skill panel has a wide painted landscape behind its header. The other thirteen
have one; fletching falls back to a bare gradient. They are **1536x177 WebP, about
8 KB each**.

````
A wide banner illustration for a dark-fantasy RPG skill panel. Very wide and short -
roughly 1536 by 177 pixels, about 8.5:1. It sits BEHIND panel text, so it must read as
a backdrop, not as a picture competing for attention.

Composition: keep the interest in the LEFT third and let the right two thirds fall away
into darkness and haze, because the skill's name, level and progress bar sit over that
side. No large bright shapes on the right.

Subject: a fletcher's bench under an open lean-to at the edge of a dark forest. A rack
of bare shafts standing upright, a half-strung bow laid across the bench, a knife and a
scatter of feathers. One low lantern. A few loose feathers drifting in the air. No
person, no face, no hands.

Dark, low-key: deep forest greens and near-blacks, warm lamplight on the bench and the
pale wood, cold blue haze in the trees behind. Painterly, the same hand as the other
skill banners: atmospheric, slightly soft, not a sharp illustration and not a
photograph. No text, no logo, no UI, no border.
````

<details><summary>id for <code>sheets/fl_banner.txt</code></summary>

```
fletching
```
</details>

---

## Sheet H - Fletcher's Cape (1)

`cape_fletching` **does not exist as an item yet.** Every other skill has one, and the
`fl_cape` capstone node is gated on owning it, so the tree currently has one point
nobody can ever spend.

````
SHEET: One skillcape for a dark-fantasy RPG. A single cell, one object.

Draw it the way the skillcapes sheet was drawn: hanging as if on a peg, no head, no
body, nobody wearing it, seen flat on from the front, filling the cell.

  Fletching Cape - deep forest green with a pale bone-white lining showing at the
                   edges, a bronze clasp at the throat, and a small emblem high on the
                   chest: three feather fletchings arranged like a nock, in bone white.
````

<details><summary>id for <code>sheets/fl_cape.txt</code></summary>

```
cape_fletching
```
</details>

---

## After they land

Sheets A, B, C, D, F and H go through the normal item pipeline: `slice.js`, then
`key.js`, then add the ids to `_iconart/picks.json`, then
`pack.js --picks _iconart/picks.json`, then `inject.js`.

**Do not skip the picks.json step.** An id that is not in that file is dropped by
`pack.js` silently, and the run still prints "wrote pack.json". That is exactly how the
eleven shop trinkets shipped on their old generated SVGs for four builds while being
reported as done.

```bash
node _iconart/slice.js sheets/fl_mats.png   sheets/fl_mats.txt   --grid 4x2
node _iconart/slice.js sheets/fl_ammo.png   sheets/fl_ammo.txt   --grid 4x1
node _iconart/slice.js sheets/fl_bows.png   sheets/fl_bows.txt   --grid 4x1
node _iconart/slice.js sheets/fl_xbow.png   sheets/fl_xbow.txt   --grid 2x1
node _iconart/slice.js sheets/fl_nodes.png  sheets/fl_nodes.txt  --grid 4x4
node _iconart/slice.js sheets/fl_skill.png  sheets/fl_skill.txt  --grid 1x1
node _iconart/slice.js sheets/fl_cape.png   sheets/fl_cape.txt   --grid 1x1

node _iconart/recolour.js --slot arrowhead   # and bolt_tip, arrow, bolt,
                                             # shortbow, longbow, crossbow + unstrung

node _iconart/key.js --only "<comma,separated,ids>"
node _iconart/pack.js --picks _iconart/picks.json
node _iconart/inject.js
node _iconart/pack.js --picks _iconart/picks_nodes.json --out pack_nodes.json --size 112
node _iconart/injectnodes.js --pack pack_nodes.json
node _iconart/banner.js sheets/fl_banner.png fletching --band 0.17,0.49
```

### recolour.js needs three small edits before Sheets B, C and D expand

1. **`RAMPS` is missing `starfall`** and has no wood ramps at all. From the game's own
   `MPAL` and `WPAL`, as dark/mid/light:

   ```
   starfall: ['#4a3008', '#c08a2a', '#ffd98a']
   pine:     ['#3f2b14', '#8a6236', '#c09a63']
   oak:      ['#3a2610', '#7d5527', '#b98a4e']
   ironbark: ['#2b281f', '#5f5a4c', '#9a9484']
   ember:    ['#3d1108', '#96351d', '#d4703c']
   frost:    ['#1e3242', '#5c8ba4', '#a8cfe0']
   shadow:   ['#1c1528', '#463a5c', '#7c6d90']
   ancient:  ['#232a12', '#5e6b38', '#9aa870']
   ```

2. **`BASES` and `SUFFIX` need the eight new slots.** Ammo and bows are `<tier>_<slot>`
   like everything else, but the unstrung ids are `unstrung_<tier>_<slot>` - a PREFIX,
   which the current `tier + '_' + suffix` line cannot express. It needs a prefix field.

3. **The glow tiers.** Emberwood, frostwood, shadowwood and ancient carry a `glow` in
   `WPAL`, and mithril upward carry one in `MPAL`; starsteel, starfall and ancient also
   carry `spark`. A gradient map cannot invent a halo. Either accept the top tiers
   without their glow, or add the halo in post the way the inline SVG's `_halo` and
   `_spk` do it.

### The two injectors

`injectnodes.js` and `banner.js` both **MERGE** rather than replace, because neither
`NODE_ART` nor `SKILL_ART` has a sheet on disk to rebuild the rest of itself from.
`_audit_tests.js` asserts that `th_gm_2x_xp` is the ONLY node borrowing another
skill's art, so leaving any of the 16 fletching nodes uninjected fails loudly rather
than shipping quietly.

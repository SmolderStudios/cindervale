# The Sundered Spire and the ranged proc weapons — the art list

Twelve items added across 0.9.124.11 → .23, every one of them still wearing a
palette-driven generator SVG. Enumerated from the live file, not remembered:

```bash
node _pending.js
```

| Family | Items | Sheet |
|---|---|---|
| The Spire's spoils | 4 | A |
| Ranged proc weapons | 4 | B |
| The Spire's endgame gear | 4 | C |

**12 images, 12 assets.** No recolour ladders here — every one is a one-off, so
what comes back is what ships.

Paste the **style block** from `PROMPTS.md` once at the start. Every sheet below
assumes it.

Two things specific to this batch:

- **The Spire's palette is rose and violet stone**, not gold and not void purple.
  Pale dusty pink highlights, a mid rose (`#c96a9a`), deep plum shadow, near-black
  edge. It has to read as its own place beside the Empyrean's gold and the Abyssal
  Throne's violet. Sheets A and C are all one family; say so in the prompt.
- **Sheet B is four DIFFERENT places** — a briar thicket, a snow tundra, a mammoth
  tusk and a scorched steppe. Those four must not drift into one another.

If a sheet comes back with a drawn grid frame, measure the lines before slicing:
`slice.js` reads its backdrop from the four CORNERS, so a border makes it treat
the page as dark and every crop collapses to a 1px sliver. `PROMPTS-shop.md` has
the row-by-row recipe.

---

## Sheet A — The Spire's spoils (4, grid 2x2)

Rubble, the thing inside the rubble, and the two kinds of ammunition nobody can
make. All four share the rose-stone palette.

````
SHEET: The Sundered Spire's spoils. 4 cells, 2 across and 2 down.

All four objects are cut from the same stone: pale dusty pink highlights, a mid
rose body, deep plum shadow, near-black outline. They must read as one family and
must NOT read as gold, and must NOT read as the blue-violet of void crystal.

CELLS:
  1. Sunderstone  - one chunk of broken masonry, fist-sized, faceted where it
                    sheared rather than weathered. Rose-grey stone with one clean
                    flat break face catching the light and old mortar still stuck
                    along one edge. Rubble, not a gem.
  2. Spire Core   - a dense hexagonal stone heart, cut and polished, with a bright
                    rose light burning in the middle of it and thin glowing seams
                    running out to the facets. Heavy and solid, not a floating
                    crystal. Clearly the thing that was INSIDE the rubble.
  3. Sundershaft  - a single arrow whose shaft is drawn-out rose stone rather than
                    wood, faintly translucent along its length, tipped with a
                    chipped stone bodkin and fletched with three stiff dark
                    feathers that are not quite bird feathers. Lying at a slight
                    angle.
  4. Sunderbolt   - the same stone cut short and heavy for a crossbow: a stubby
                    quarrel, thick in the body, blunt-shouldered stone head,
                    two short hard vanes instead of feathers. Obviously shorter
                    and fatter than the arrow beside it.
````

<details><summary>id order for <code>sheets/spire_spoils.txt</code></summary>

```
sunderstone
spirecore
sundershaft
sunderbolt
```
</details>

---

## Sheet B — Ranged proc weapons (4, grid 2x2)

Four drops from four different zones, and the whole point is that each one is
made of the animal that dropped it. These must NOT share a palette.

````
SHEET: Four ranged weapons, each made from a different creature. 4 cells, 2 across
and 2 down.

Each is a single weapon lying alone, strung and ready, no hands and no quiver.
The four must look like they came from four different places.

CELLS:
  1. Thornbite Shortbow    - a short recurve bow of pale stag antler, still ridged
                             and knobbled the way antler is, bound at the grip with
                             dark green briar cord. A few small thorns still caught
                             in the binding. Sickly green wet sheen on the string.
                             Mossy greens and bone.
  2. Rimeshot Shortbow     - a short bow of pale grey rib bone, rimed white with
                             frost, small icicles hanging from the lower limb. Pale
                             ice blue and bone white, cold light.
  3. Mammothhorn Longbow   - a long heavy stave split from one mammoth tusk: warm
                             cream ivory, gently curved the way a tusk curves,
                             cracked with age along the belly, wrapped in thick
                             brown hide at the grip. Cream, tan, deep brown.
  4. Ashlock Crossbow      - a heavy crossbow, not a bow: horizontal prod, wooden
                             stock, visible cranking lock. The stock is scorched
                             black bone, the prod is dark iron glowing faint orange
                             along its length like a bar just out of the forge.
                             Charcoal, ember orange, ash grey.

The crossbow must be instantly distinguishable from the three bows at 20 pixels:
horizontal prod across a stock, not a tall vertical arc.
````

<details><summary>id order for <code>sheets/spire_procs.txt</code></summary>

```
thornbite_shortbow
rimeshot_shortbow
mammothhorn_longbow
ashlock_crossbow
```
</details>

---

## Sheet C — The Spire's endgame gear (4, grid 2x2)

The best sword, shield, bow and gloves in the game. Same rose-stone family as
Sheet A, and they need to look like the top of a ladder.

````
SHEET: The Sundered Spire's best-in-slot gear. 4 cells, 2 across and 2 down.

All four are made from the stone of a fallen tower and share one palette: pale
dusty pink highlight, mid rose body, deep plum shadow, near-black outline, with a
faint rose glow. These are the finest items in the game and should look it -
ornate, but still four big readable shapes.

CELLS:
  1. Sunderedge   - a one-handed longsword whose blade is a single shard of rose
                    stone rather than steel, with a jagged fault line running its
                    length that glows faintly from inside. Straight crossguard of
                    dark iron, wrapped grip, plain heavy pommel.
  2. Faultward    - a tall kite shield that is a slab of load-bearing masonry: a
                    cracked rose-stone face with a bright seam of light down the
                    break, banded in dark iron at top and bottom, one iron boss in
                    the centre. It should look like it held a ceiling up.
  3. Plummet      - a tall longbow whose limbs are rose stone, dead straight and
                    severe, strung with a fine silver plumb-line that has a small
                    heavy pointed weight hanging from the lower limb. Elegant and
                    cold, not organic.
  4. Stonewright  - a PAIR of heavy gauntlets, both in the one cell, palms toward
     Gauntlets      the viewer, fingers slightly curled as if still gripping. Rose
                    stone plates over dark leather, glowing seams between the
                    knuckle plates. Builder's gauntlets, worn and scarred, not
                    ceremonial.
````

<details><summary>id order for <code>sheets/spire_gear.txt</code></summary>

```
sunderedge
faultward
plummet
stonewright_gauntlets
```
</details>

---

## Not on a sheet: the raid icon

`ICONS.sundered_spire` is a zone/raid icon, not an item, so it does not go through
`cutall.js` → `pack.js` → the ART_ITEM block. It is currently a hand-drawn SVG of
a leaning cracked tower with its crown sheared off and rubble at the foot, and it
reads correctly at 96, 36 and 20px. Leave it unless the zone-icon pass happens.

## After the sheets land

```bash
node _iconart/cutall.js spire_spoils      # add the geometry to cutall.js PLAN first
node _iconart/pack.js --picks _iconart/picks.json
node _iconart/inject.js
```

Then delete these ids from `SPIRE_PENDING` in `_audit_tests.js` — that list is
what stops the art audit failing, and it is meant to shrink to nothing:

```
sunderstone  spirecore  sundershaft  sunderbolt
thornbite_shortbow  rimeshot_shortbow  mammothhorn_longbow  ashlock_crossbow
sunderedge  faultward  plummet  stonewright_gauntlets
```

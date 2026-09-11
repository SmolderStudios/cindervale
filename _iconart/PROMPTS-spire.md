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
| The Spire's own creatures | 9 | D |
| The Spire's backdrop | 1 image | E |

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

## Sheet D: The Spire's own creatures (9, grid 3x3)

The nine natives that live in the tower's own stretches. Creatures, not items,
so **start a new chat and paste the creature block below instead of the item
style block.** The drawing rules are the same on purpose: same ink, same flat
shading, same stone as Sheets A and C, so they read as the same place.

Two things matter more here than on any item sheet:

- **Keep the bodies mostly DARK**, like the sword, shield and gauntlets on the
  gear sheet you already made. The arena is a dark stage, and a dark body with
  a lit top edge is what reads there. It also keys cleanly off the white sheet.
- **They are buildings that got up, not animals and not robots.** Every one is a
  building part: a column, an arch, a staircase, a plumb line, a floor slab. My
  own SVG versions kept turning into small robots until I named the part.

### The creature block (paste once, in a new chat)

````
You are drawing creature portraits for the combat arena of a dark-fantasy RPG. I
will give you one SHEET at a time. Draw every creature on that sheet in ONE image,
as a labelled grid, on a single flat pure-white background, with the creature's
short label in small plain text under each cell.

STYLE, identical on every cell
Hand-painted stylised fantasy game art. Bold clean shapes with a thick dark ink
outline holding the whole silhouette closed. Flat cel-like shading, three or four
value steps, NOT smooth gradients. Chunky, slightly exaggerated proportions. Strong
rim light along the top edges, deep shadow underneath. Rich colour.

It must read as painted game art, NOT a photograph, NOT photorealistic, NOT a 3D
render. Use LESS detail than feels right: each creature is shown large in the
arena but also as a 26 pixel thumbnail, so one big readable silhouette and two or
three big shapes matter more than texture.

FRAMING
Exactly ONE creature per cell, whole body visible, three quarter view facing the
viewer, filling about 85% of its cell, its lowest point near the bottom of the
cell. No ground, no floor line, no cast shadow, no scenery, no pedestal, no second
creature.

BACKGROUND
Flat pure white, edge to edge. No gradient, no vignette, no drop shadow.

Several of these creatures are made of buildings. Draw the building part the name
describes, alive. Not a person wearing it and not a robot.
````

### The sheet

````
SHEET: The Sundered Spire's own creatures. 9 cells, 3 across and 3 down.

All nine are made of the same fallen tower's stone and share one palette: dark plum
stone bodies, pale dusty rose highlights only along the top edges, a near-black ink
outline, and a cold rose pink light glowing out of their cracks, eyes and mouths.
Mostly dark. Not gold, not blue-violet void crystal, not plain grey.

CELLS:
  1. Rubble Shade      - a broken stone column caught halfway through collapsing:
                         six or seven angular chunks hanging apart in the air with
                         clear white gaps between every piece, leaning hard to one
                         side, two small points of rose light buried in the biggest
                         chunk. No head, no arms, no legs. The gaps are the point.
  2. Floorwarden       - a squat, wide stone archway that stood up: the arch is its
                         head and shoulders, one enormous slab of an arm hangs to
                         the floor and the other is a short broken stump, a glowing
                         doorway opening in its chest, planted on two blocky feet.
                         Lopsided on purpose.
  3. Stairwraith       - a tall thin hooded figure in heavy stone robes, no face in
                         the hood, only two slit eyes of light. The robe hangs open
                         down the front and inside it a flight of glowing stairs
                         runs away INTO its body, shrinking into the distance. The
                         whole figure leans off vertical.
  4. Mortarfiend       - a low, wide, sagging lump of wet mortar, much wider than it
                         is tall, a cracked crust across its back, two small sunken
                         eyes of light and a long jagged split of a mouth across the
                         front, three stubby dripping feet.
  5. Keystone Golem    - a massive hunched stone golem, huge slab shoulders with a
                         small blunt head sunk low between them, arms hanging to the
                         floor, and a single wedge shaped keystone set in its chest
                         burning bright, with glowing cracks running out from it.
  6. Plumbhang         - a tapered stone plumb weight the size of a body, hanging
                         dead straight from a chain that runs up out of the top of
                         the cell, narrowing to a heavy sharp point at the bottom,
                         two small stubby arms, two slit eyes near the top.
                         Perfectly vertical, touching nothing.
  7. Ashen Architect   - a tall gaunt robed figure with a deep hood, one arm ending
                         in a huge pair of open drafting dividers held up high
                         instead of a hand, a glowing scribed arc hanging in the
                         air where the dividers have passed, dust falling off it.
  8. Hollow Choirstone - one fluted stone pillar, widening toward the base, with
                         four human faces of different sizes fused into it at
                         different heights, every mouth stretched wide open and
                         light pouring out of each throat. No eyes on any of them.
  9. The Landing       - a whole stone floor slab from a stairwell landing, torn
                         free and rearing up at a steep tilt, flagstone joints
                         across its face, a long ragged split across it lined with
                         broken stone teeth and lit from inside like a mouth, two
                         huge stone hands gripping its near edge and holding it up.
                         The biggest thing on the sheet.
````

<details><summary>id order for <code>sheets/spire_natives.txt</code></summary>

```
rubble_shade
floorwarden
stairwraith
mortarfiend
keystone_golem
plumbhang
ashen_architect
hollow_choirstone
the_landing
```
</details>

If one comes back wrong, re-roll just that cell in the same chat ("redraw cell 1
only, same sheet") rather than the whole sheet, so the other eight keep their look.
The two most likely to fight you: **Rubble Shade** fusing into one solid golem (ask
for bigger white gaps between the pieces), and **The Landing** turning into a
creature standing on a slab (it IS the slab).

---

## Sheet E: The Spire's backdrop (one image, not a sheet)

Every third stretch of five floors is the tower itself, and this is what stands
behind the natives there. Raid stretches borrow it too until the five raid
backdrops exist. Same chat is fine; this one is a single picture.

````
Paint a single background plate for a dark-fantasy RPG combat arena, in TALL
portrait format (2:3). A creature will be drawn on top of it in the lower middle,
so this picture has to LOSE that fight on purpose.

THE PLACE: the inside of a huge tower that fell over and is lying on its side.
Floors and staircases run at the wrong angle, walls have become ceilings, masonry
is sheared clean through, and pale pink dust hangs in the air. Cold light comes in
through a crack far above. The stone is the same dark rose and plum stone as the
creatures, but softer and further away.

RULES:
- Low contrast, soft haze, lots of depth. No focal point anywhere.
- The bottom third is an empty, fairly flat stretch of broken floor where the
  creature will stand. Nothing interesting there.
- Darker overall than a normal painting: it sits behind bright creatures on a
  dark screen.
- No creatures, no people, no text, no frame, no border.
- Painted in the same hand as the creature art. Not a photo, not a 3D render.
````

Save it as `spire_backdrop.png` in `icons-inbox`.

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

**Sheet D is different from A to C.** Monster art lives in the `ART_MON` block at
256px, not the item block at 96px, so it cuts the same way and packs a different
way. Drop it in `icons-inbox` and say so; that step is mine.

Then delete these ids from `SPIRE_PENDING` in `_audit_tests.js` — that list is
what stops the art audit failing, and it is meant to shrink to nothing:

```
sunderstone  spirecore  sundershaft  sunderbolt
thornbite_shortbow  rimeshot_shortbow  mammothhorn_longbow  ashlock_crossbow
sunderedge  faultward  plummet  stonewright_gauntlets
```

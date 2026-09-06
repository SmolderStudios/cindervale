# Skill icons — all nineteen  ·  DONE (0.9.122.26)

Sliced from `skills.png` and injected; the nineteen old base64 PNGs were stripped
out of the ICONS literal. Kept for the record.

**They are already painted art, not SVG.** Every one is a base64 PNG inside an
`<svg><image href="data:image/png">` shell, ~15 KB each, ~285 KB in total. So this is
a *redo*, not a conversion — and running the new ones through the normal item
pipeline (96px WebP) should take that 285 KB down to roughly 90 KB.

These are the most-seen icons in the game: the left rail, every activity card, the
tabs, the tree, the guild boards.

Paste the **style block** from `PROMPTS.md` once first — everything below assumes it.

```bash
node _iconart/slice.js sheets/skills.png sheets/skills.txt --grid 5x4
```

If the sheet comes back with a drawn grid frame, measure the lines before slicing —
`slice.js` reads its backdrop from the four CORNERS, so a border makes it treat the
page as dark and every crop collapses to a 1px sliver. `PROMPTS-shop.md` has the
row-by-row workaround.

---

## Why they are being redone

Three things are wrong with the current set, and the prompt below is aimed at all
three:

**1. They are the only icons in the game that are not painted.** Everything else —
679 items, the monsters, the gear — is hand-painted with a dark ink outline and
cel shading. The skill icons are flat, bright, thin-outlined vector art. Side by side
in the rail they read as belonging to a different game.

**2. Woodcutting and Mining are the same icon at 20px.** Both are a brown-handled,
grey-headed tool at the same angle. In the rail, where they sit six rows apart, you
cannot tell them apart. Same problem, milder, for Attack vs Ranged.

**3. They are too bright.** Foraging's green, Jeweler's pink and Magic's purple are
more saturated than anything else on screen and pull the eye away from the content.

The direction is **massive silhouette, darker**: one big shape filling the frame,
low-key colour, readable at a glance.

---

## The sheet (19 + 1 spare, grid 5x4)

````
SHEET: Skill icons. 20 cells, 5 across and 4 down. The last cell is empty.

These are the emblems for a dark-fantasy RPG's skills. They are displayed to players
at about TWENTY PIXELS, so everything below follows from that:

FILL THE FRAME. One single object, drawn LARGE, filling roughly 95% of its cell edge
to edge. No empty margin. This is the most important instruction on the sheet — the
current set is drawn small in frame and disappears at size.

ONE SHAPE. Two or three big forms per icon and nothing else. No background scenery,
no ground, no sparkles, no motion lines, no small decorative details — every one of
those turns to mud at 20px and steals the silhouette.

READ THE SILHOUETTE. Each icon must be identifiable in black-on-white outline alone,
with no colour. Vary the shapes hard between cells: if two icons would have the same
outline, change the angle, the proportions or the object.

DARK AND MOODY. Deep, slightly desaturated colour with strong contrast inside the
object — a bright rim light on one edge and deep shadow opposite. These sit on a
near-black UI, so they should feel lit from within a dark room, NOT bright and flat.
Avoid pure saturated hues.

Hand-painted with a dark ink outline holding the silhouette, cel-like shading in
three or four value steps. NOT flat vector, NOT a photograph, NOT a 3D render.

Flat pure white background behind the whole sheet, edge to edge.

CELLS:
  1.  Woodcutting — a felling AXE seen side-on: one broad curved steel bit, a long
                    wooden haft running corner to corner. Wide triangular blade.
  2.  Mining      — a PICKAXE seen head-on: two narrow iron spikes sweeping out
                    left and right from a short haft. A NARROW, POINTED, TWIN-ARMED
                    silhouette — it must not resemble cell 1 in any way.
  3.  Fishing     — a fish caught mid-leap, curved body, tail up, seen from the side
  4.  Foraging    — a cluster of three broad leaves on a short stem, deep forest green
  5.  Smithing    — an anvil in profile, heavy and blunt, one glowing spot on the horn
  6.  Cooking     — a black iron cauldron, wide-bellied, on short legs
  7.  Alchemy     — a round-bottomed flask with a long neck, dark liquid inside
  8.  Firemaking  — a single tall flame, tapering, with a darker core
  9.  Agility     — a tall leather boot in profile, mid-stride, laces flying
  10. Jeweler     — a cut gemstone, faceted, deep cool blue-violet, NOT pink
  11. Farming     — a bound sheaf of wheat, heads splaying at the top
  12. Crafting    — a spool of thread with a bone needle through it
  13. Attack      — a straight sword blade, point UP, hilt at the bottom
  14. Strength    — a clenched fist, knuckles toward the viewer, wrapped in strapping
  15. Defence     — a kite shield, face on, one iron boss at the centre
  16. Hitpoints   — an anatomical heart, dark red, one strong highlight
  17. Magic       — a wand with a glowing stone at its tip, held diagonally
  18. Ranged      — a BOW, drawn, seen side-on: the curved limbs and the taut string
                    are the silhouette. Not a quiver, not loose arrows.
  19. Sailing     — a single triangular sail on a mast, leaning with the wind
  20. (leave this cell empty)
````

<details><summary>id order for <code>sheets/skills.txt</code></summary>

```
woodcutting
mining
fishing
foraging
smithing
cooking
alchemy
firemaking
agility
jeweler
farming
crafting
attack
strength
defence
hitpoints
magic
ranged
sailing
_spare
```
</details>

---

## Before you accept the sheet

Shrink it until each icon is a thumbnail and try to name all nineteen. **Check
Woodcutting against Mining first** — that is the pair the current set fails, and a
generator will happily hand you two brown-handled tools again.

Then check Attack against Ranged, and Alchemy against Firemaking.

---

## After they land

These are the one set that does NOT live in the ART_ITEM block — they sit in the
`SKILLS[k].icon` / `ICONS[k]` entries near the top of the file, still wrapped as
`<svg><image href="data:image/png">`. `inject.js` will not pick them up on its own;
they need writing into those entries, ideally converted to the same `<img>` WebP form
the item art uses, which is where the ~200 KB saving comes from.

`iconHTML('slayer')` is never called anywhere, so Slayer needs nothing — it uses its
own `slp_*` perk icons.

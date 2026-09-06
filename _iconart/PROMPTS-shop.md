# Shop items — 0.9.122.20 → .22

Eleven new shop items. **Sheet B is DONE** — `shop.png`, sliced and injected in
0.9.122.25. The twelve skill hoods this file used to list were cut from the game;
capes have their own sheet in `PROMPTS-capes.md`.

Paste the **style block** from `PROMPTS.md` once at the start of the conversation
first — everything below assumes it. Then feed one sheet at a time.

```bash
# how shop.png was actually cut — the sheet's rows are 345/351/388px, NOT equal
# thirds, and its black grid lines read as ink, so an even --grid 4x3 drifts ~27px
# and eats the charms' cords. One pass per row, with the measured column edges:
CX="--colx 1,362,724,1086,1447 --inset 7"
node _iconart/slice.js sheets/shop_trinkets.png sheets/_r1.txt --grid 4x1 $CX --crop 4,4,1444,343
node _iconart/slice.js sheets/shop_trinkets.png sheets/_r2.txt --grid 4x1 $CX --crop 4,350,1444,694
node _iconart/slice.js sheets/shop_trinkets.png sheets/_r3.txt --grid 4x1 $CX --crop 4,701,1444,1082
```

The ORDER in each CELLS list is the contract — `slice.js` does not read captions.

---

## Sheet B — Shop jewellery & charms (11, grid 4x3)

Cells 1–6 are jewellery and must sit beside the finished **Jewellery** sheet — same
band treatment, same faceting, same lighting, same size in frame. Cells 7–11 are
charms: a new family, all built the same way, so keep those five consistent with each
other.

````
SHEET: Shop jewellery and charms. 11 cells, 4 across and 3 down. The last cell is empty.

Cells 1 to 6 are rings and neck-pieces. Draw them the way the earlier jewellery sheet
was drawn — the band or chain laid flat and facing the viewer, the stone catching a
single strong highlight. One piece per cell, nothing beneath it.

Cells 7 to 11 are CHARMS: small talismans that hang on a short leather cord with a
metal loop at the top. Keep the cord and the loop identical across all five so they
read as a set; only the thing hanging from it changes.

CELLS:
  1.  Ring of the Delver  — heavy pewter band, a rough uncut grey ore-stone set in it
  2.  Ring of the Tide    — gold band, a polished deep sea-blue stone
  3.  Ring of the Grove   — bronze band shaped like a twig, a green leaf-cut stone
  4.  Ring of Plenty      — broad gold band, a warm amber stone
  5.  Signet of Coin      — gold neck-chain, a struck gold coin hanging as the pendant
  6.  Pendant of Focus    — fine silver chain, a violet teardrop crystal
  7.  Coin Purse          — small brown leather drawstring pouch, fat with coins,
                            two or three coins spilling from the mouth
  8.  Harvester's Charm   — a single ear of golden wheat bound with twine
  9.  Scholar's Charm     — a small brass disc with an open book engraved on its face
  10. Thrifty Charm       — a thick leather cord tied in a tight decorative knot
  11. Swiftwork Charm     — a pale grey feather bound at the quill with blue thread
````

<details><summary>id order for <code>sheets/shop_trinkets.txt</code></summary>

```
delver_ring
tide_ring
grove_ring
plenty_ring
coin_signet
focus_pendant
coin_purse
harvest_charm
scholar_charm
thrift_charm
swift_charm
```
</details>

---

## After they land

`inject.js` writes into the ART_ITEM block. The charms are the one thing to watch: they
are currently merged into `ICONS` by an explicit loop *after* the `const ICONS` literal
(temporal dead zone — see the comment there), so if painted art replaces them, that loop
and `CHARM_ICONS` come out together rather than being left to fight the art block.

If a future sheet comes back with a black grid frame like this one did, measure the
lines before slicing — `slice.js` samples its backdrop from the four CORNERS, so a
border makes it read the page as dark and every crop collapses to a 1px sliver.

---

## Still outstanding — two cells

`ember_ring` and `moon_amulet` are the only jewellery in the game still on generated
SVG; every other ring, amulet and pendant is painted. They predate the shop work and
were never on a sheet. `_audit_tests.js` names them in `ART_EXEMPT` — delete them
from that list when the art lands.

````
SHEET: Two shop jewels. 2 cells, side by side.

Draw them the way the earlier jewellery sheet was drawn — the band or chain laid flat
and facing the viewer, the stone catching a single strong highlight. One piece per
cell, nothing beneath it.

CELLS:
  1. Ember Ring   — a warm bronze band, a glowing orange-red ember set in it, lit
                    from within as though the stone still holds a coal
  2. Moon Amulet  — a silver neck-chain, a pale blue-white moonstone as the pendant,
                    cold and softly luminous
````

<details><summary>id order for <code>sheets/shop_jewels2.txt</code></summary>

```
ember_ring
moon_amulet
```
</details>

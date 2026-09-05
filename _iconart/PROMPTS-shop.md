# Shop items — 0.9.122.20 → .22

Twenty-three new items went into the shop and every one of them is currently a
hand-drawn SVG. Two sheets.

Paste the **style block** from `PROMPTS.md` once at the start of the conversation
first — everything below assumes it. Then feed one sheet at a time.

```bash
node _iconart/slice.js sheets/shop_hoods.png    sheets/shop_hoods.txt    --grid 4x3
node _iconart/slice.js sheets/shop_trinkets.png sheets/shop_trinkets.txt --grid 4x3
```

The ORDER in each CELLS list is the contract — `slice.js` does not read captions.

---

## Sheet A — Skill hoods (12, grid 4x3)

These are twelve versions of the SAME garment. That is the hard part and the whole
job: one hood, drawn twelve times, told apart by cloth and colour and nothing else.

````
SHEET: Skill hoods. 12 cells, 4 across and 3 down.

Every cell is the SAME OBJECT: a short hooded cowl with a small shoulder mantle,
empty, hanging as if on a peg — no head inside it, no face, no body, nobody wearing
it. The hood opening is a dark void. Draw it from the front, slightly three-quarter,
so the cowl reads as a hood and not as a bag.

Keep the silhouette IDENTICAL in all twelve cells. Same shape, same size, same angle,
same lighting. Only the cloth changes: its colour, its material, and one small trim
detail. Do not add emblems, badges, crests, buckles, weapons, tools or props.

These are the humble tier below a hero's cape, so they should look worn and practical
— homespun, patched, working clothes — not regal.

CELLS:
  1.  Woodcutting Hood — rough russet-brown wool, bark-coloured leather trim
  2.  Mining Hood      — slate-grey canvas, dull iron rivets along the mantle edge
  3.  Fishing Hood     — deep sea-blue oilskin with a wet sheen, rope drawstring
  4.  Foraging Hood    — moss-green cloth, a few small leaves caught in the weave
  5.  Smithing Hood    — dark scorched brown leather, singed and blackened at the hem
  6.  Cooking Hood     — warm copper-orange linen, dusted pale with flour
  7.  Alchemy Hood     — acid-green cloth, hem stained darker where it has dripped
  8.  Firemaking Hood  — ember-red wool, edges gone ash-grey
  9.  Agility Hood     — pale sand-coloured cloth, light and loose, hem torn ragged
  10. Jeweler Hood     — deep violet velvet, fine gold thread stitched at the edge
  11. Farming Hood     — wheat-gold burlap, coarse straw-like weave
  12. Crafting Hood    — cool grey canvas with leather patches and visible stitching
````

<details><summary>id order for <code>sheets/shop_hoods.txt</code></summary>

```
hood_woodcutting
hood_mining
hood_fishing
hood_foraging
hood_smithing
hood_cooking
hood_alchemy
hood_firemaking
hood_agility
hood_jeweler
hood_farming
hood_crafting
```
</details>

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

Sheet A is the one likely to need a second pass. Twelve of the same garment is exactly
where a generator drifts — check that Woodcutting, Agility, Farming and Crafting are
still four different hoods at 20px, because those four collided on the CAPES sheet.

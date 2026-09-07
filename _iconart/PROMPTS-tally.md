# Radcliff's Tally  ·  PENDING

One item, added in 0.9.123.3. It is the **only** id in the game still on SVG — every
other item icon came off these sheets — so it is named in `SVG_OK` in
`_audit_tests.js` for the pending-art reason. **Delete it from that list as its cell
lands.** Do NOT add it to `KEEP_SVG` in `picks.js`: that means "art was rejected",
and would tell every future run to skip it.

| id | name | what it is |
|---|---|---|
| `radcliff_tally` | Radcliff's Tally | a peeled hazel stick, notched once for every fault someone bothered to name |

Four takes rather than one cell, because a single-cell sheet gives you nothing to
choose between and this one has a real failure mode: it must not come back reading
as a bone. `gnawed_bone`, `ancient_bone` and `rib_plate` are already pale, thin and
diagonal in the same rows, so the warm wood and the dark leather are what keep it
distinct at 20px.

Paste the standard style block from `PROMPTS.md` first, then this.

````
SHEET: one object for a dark-fantasy RPG inventory, drawn FOUR times as four
separate takes of the same thing. 2 cells across, 2 down.

Hand-painted with a dark ink outline holding the silhouette and cel-like shading in
three or four value steps. NOT flat vector, NOT a photograph, NOT a 3D render, NOT a
woodgrain texture study.

One object per cell, drawn LARGE on the diagonal and filling about 90% of its cell,
no empty margin. No background, no table, no hands, nobody holding it.

THE OBJECT, the same in all four cells:
A tally stick. A short length of hazel about as long as a forearm, bark peeled off so
the wood underneath is warm honey-gold, with a few ragged strips of grey-brown bark
still clinging near one end. Down ONE long edge, a row of deep V-shaped notches cut
into the wood — MANY of them, a dozen or more, running most of the length, cut by
hand so they are not evenly spaced. The cut faces are paler and brighter than the
outside of the stick, like fresh wood. Both ends sawn square. A strip of dark
red-brown leather is wound twice around the blunt end with one short tail hanging
loose.

It should look used and carried, not new and not decorative: no carving, no runes,
no gems, no metal, no writing.

WHAT IT MUST NOT BE
Not a bone. Not a ruler or a measuring stick. Not a sword, a wand, a club or a torch.
Not a bundle or a handful of sticks — one stick only. If it reads as pale ivory
rather than warm wood it is wrong; the colour is what separates it from the bones it
sits next to.

WHAT VARIES BETWEEN THE FOUR CELLS
  1. notches shallow and close together, most of the bark gone
  2. notches deep and widely spaced, a broad cuff of bark left at the bound end
  3. notches running the full length including past the leather, stick slightly thicker
  4. notches on the near edge only for the top two-thirds, one end darkened as if charred

Flat pure white background behind the whole sheet, edge to edge.
````

<details><summary>id order for <code>sheets/tally.txt</code></summary>

```
radcliff_tally
radcliff_tally_b
radcliff_tally_c
radcliff_tally_d
```

Slice all four, look at them, keep the winner as `raw/radcliff_tally__painted.png`
and delete the other three — the `_b/_c/_d` ids exist only to satisfy slice.js's
one-id-per-cell contract and must never reach `items.json`.

```bash
node _iconart/slice.js sheets/tally.png sheets/tally.txt --grid 2x2
node _iconart/key.js
node _iconart/pack.js --style painted
node _iconart/inject.js
```

`pack.js` prints the added weight before anything is written — worth a glance even
for one icon, since the wrapper's 6s fetch abort is measured against the whole file.
</details>

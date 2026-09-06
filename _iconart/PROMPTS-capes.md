# Skillcapes — twelve

The twelve Lv-99 skillcapes are the last shop items still on generated SVG
(`_capeSVG`, one silhouette with a per-skill palette and a small emblem). They are
the most expensive purchase in the game at 100,000g each and the only reward for
reaching 99, so they should be painted.

Paste the **style block** from `PROMPTS.md` once first — everything below assumes it.

```bash
node _iconart/slice.js sheets/capes.png sheets/capes.txt --grid 4x3
```

If the sheet comes back with a drawn grid frame, measure it first — `slice.js` reads
its backdrop from the four CORNERS, so a black border makes it treat the whole page
as dark and every crop collapses to a 1px sliver. See the note in `PROMPTS-shop.md`
for the row-by-row workaround.

---

## The hard part

Twelve versions of the same garment. **The current SVG set already fails this at
size**: Woodcutting, Agility, Farming and Crafting all land on brown-gold and are
indistinguishable at 20px, which is the only size that matters. The emblem is the
only thing separating them and it is the first thing that disappears.

So the brief is not "twelve capes in twelve colours". It is: **twelve capes that are
still twelve different capes when they are 20 pixels tall.** Silhouette, value and
hue all have to do work — a lighter cape, a darker cape, a ragged hem, a hood, a
fur collar, a chain clasp.

---

## Sheet — Skillcapes (12, grid 4x3)

````
SHEET: Skillcapes. 12 cells, 4 across and 3 down.

Every cell is a CAPE, empty, hanging as if on a peg — no head, no face, no body,
nobody wearing it. Shown from the front, full length, the shoulders squared and the
cloth falling straight with a little movement at the hem. One cape per cell.

These are the reward for mastering a craft, so they are FINE garments: heavy cloth,
metal clasp at the throat, a trim of braid or fur, in good condition. Rich but not
royal — a master's cape, not a king's.

MOST IMPORTANT: these twelve must be told apart INSTANTLY at thumbnail size. Do not
rely on the emblem — give each one its own colour, its own overall lightness, and one
distinguishing feature of shape or material from the list below. Four of them are
warm browns and golds and those four in particular must not blur together: vary how
light or dark each is and give each a different collar, hem or clasp.

Keep the emblem SMALL, high on the chest, and simple enough to survive being tiny.

CELLS:
  1.  Woodcutting Cape — deep russet brown, heavy wool, wide fur collar,
                         bronze clasp, small axe emblem
  2.  Mining Cape      — cold slate grey, canvas with leather shoulder pads,
                         iron clasp, small pickaxe emblem
  3.  Fishing Cape     — deep sea blue, oiled cloth with a faint sheen,
                         rope-knot clasp, small fish emblem
  4.  Foraging Cape    — moss green, soft cloth with a leaf-scalloped hem,
                         wooden clasp, small leaf emblem
  5.  Smithing Cape    — near-black leather scorched at the hem, riveted shoulders,
                         glowing orange clasp, small hammer emblem
  6.  Cooking Cape     — warm copper orange linen, crisp white trim,
                         brass clasp, small flame emblem
  7.  Alchemy Cape     — acid green, silk with a violet inner lining showing at the
                         edge, glass-vial clasp, small flask emblem
  8.  Firemaking Cape  — deep ember red fading to ash grey at the hem,
                         gold clasp, small flame emblem
  9.  Agility Cape     — pale sand, short and light with a ragged wind-torn hem,
                         no collar, tiny silver clasp, small wing emblem
  10. Jeweler Cape     — deep violet velvet, gold braid trim,
                         a cut gem as the clasp, small gem emblem
  11. Farming Cape     — wheat gold, coarse woven burlap with a straw texture,
                         plain wooden toggle, small wheat emblem
  12. Crafting Cape    — cool blue-grey canvas, leather patches and visible stitching,
                         steel clasp, small needle-and-thread emblem
````

<details><summary>id order for <code>sheets/capes.txt</code></summary>

```
cape_woodcutting
cape_mining
cape_fishing
cape_foraging
cape_smithing
cape_cooking
cape_alchemy
cape_firemaking
cape_agility
cape_jeweler
cape_farming
cape_crafting
```
</details>

---

## Before you accept the sheet

Open it and shrink it until each cape is about a thumbnail. If you cannot name all
twelve, it needs another pass — that is the actual test, and it is the one the
current SVG set fails.

`inject.js` writes into the ART_ITEM block, which assigns over `ICONS` last, so the
paintings take over from `_capeSVG` with no code change. Leave `_capeSVG` in place
until every one of the twelve is covered — half a sheet would give six painted capes
beside six drawn ones.

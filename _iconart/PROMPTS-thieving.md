# Thieving — the full art list

Everything a thirteenth skill needs, and nothing it doesn't. Counted from what the
other twelve actually have.

| Family | Count | Where it lives | Pipeline |
|---|---|---|---|
| Skill icon | 1 | `ICONS.thieving` | item pack |
| **Banner scene** | **1** | `SKILL_ART.thieving` | **1536&times;177 WebP, ~8 KB** |
| **Tree node icons** | **13** | `NODE_ART` | **no tool — see the note at the bottom** |
| Lockpick tool ladder | 6 | item pack | item pack |
| Thief's gear set | 4 | item pack | item pack |
| Skillcape | 1 | item pack | item pack |
| Stolen goods | 6 | item pack | item pack |
| Skilling pet | **0** | `_critterSVG` | generated — a palette and an ear shape |
| Stall / act icons | **0** | — | acts reuse the icon of what they output |

**32 images.** Five sheets below.

### Not art, but the same checklist

Enumerated from an existing skill rather than remembered — these are the registration
points a design doc forgets:

| | |
|---|---|
| `PASSIVE_TIPS` | 13 long-form node tooltips, one per tree node |
| `SK_PAL` &middot; `SKILL_ACCENT` | the skill's palette and its accent colour |
| `GD_VERB` | the verb guild quests use for it &mdash; `'Steal'` |
| `TOOL_SLOTS` &middot; `SKILL_ORDER` | the lockpick slot in the Gear panel and the Crafting tools sub-tab |
| `ITEM_BODY_SLOTS` | the four gear pieces &rarr; helmet / chest / legs / boots |
| `ENCHANTS` | every skill has a tier-5 unique enchant (`uq_jw`, `uq_wc`&hellip;) |
| `SK` | four fallback gear SVGs &mdash; only needed if the painted set is ever incomplete |

Paste the **style block** from `PROMPTS.md` once at the start — every sheet assumes it.

If a sheet comes back with a drawn grid frame, measure the lines before slicing:
`slice.js` reads its backdrop from the four CORNERS, so a border makes it treat the
page as dark and every crop collapses to a 1px sliver. `PROMPTS-shop.md` has the
row-by-row recipe.

---

## Sheet A — Lockpicks, gear and the cape (11, grid 4x3)

The lockpicks are a tier ladder: **one silhouette, six metals**, exactly like the axes
and picks on the tools sheets. The gear is a matched four-piece outfit.

````
SHEET: Thieving equipment. 11 cells, 4 across and 3 down. The last cell is empty.

Cells 1 to 6 are a TIER LADDER of the same object: a set of lockpicks — two or three
slim steel picks and a tension wrench, bound together at the handle. Keep the shape
IDENTICAL across all six; only the metal changes, getting richer and darker up the
ladder. Draw them the way the axes and picks on the tools sheets were drawn.

Cells 7 to 10 are a matched four-piece outfit for a thief: dark, close-fitting,
practical, no armour plates. Each piece drawn alone on nothing, as the other skilling
outfits were.

Cell 11 is a cape, drawn the way the skillcapes sheet was: hanging as if on a peg, no
head, no body, nobody wearing it, small emblem high on the chest.

CELLS:
  1.  Bronze Lockpicks    — dull warm bronze
  2.  Iron Lockpicks      — plain grey iron
  3.  Steel Lockpicks     — bright polished steel
  4.  Cobalt Lockpicks    — deep blue-steel
  5.  Eclipse Lockpicks   — near-black metal with a faint violet sheen
  6.  Everflame Lockpicks — dark metal with a live orange heat in the shafts
  7.  Thief's Hood        — a soft dark hood, empty, the opening in shadow
  8.  Thief's Jerkin      — a close-fitting dark leather chest piece, buckled
  9.  Thief's Trousers    — dark cloth trousers with a wide belt and a pouch
  10. Thief's Boots       — soft-soled dark leather boots, low and quiet
  11. Thieving Cape       — deep charcoal with a slate-blue lining showing at the
                            edge, a silver clasp, a small lockpick emblem
````

<details><summary>id order for <code>sheets/thief_gear.txt</code></summary>

```
bronze_lockpicks
iron_lockpicks
steel_lockpicks
cobalt_lockpicks
eclipse_lockpicks
everflame_lockpicks
th_hood
th_chest
th_legs
th_boots
cape_thieving
_spare
```
</details>

---

## Sheet B — Stolen goods (6, grid 3x2)

These are what pickpocketing people gives you. They are **loot, not equipment** — the
point is that they look valuable and look like they belong to somebody else.

````
SHEET: Stolen goods. 6 cells, 3 across and 2 down.

Each cell is a single valuable object, drawn alone on nothing, the way the monster-drop
and treasure items were drawn. They should read as things somebody has just had taken
off them — small, portable, worth money.

CELLS:
  1. Cut Purse        — a slit leather purse, coins spilling from the cut
  2. Silver Plate     — a small tarnished silver dish, chased with a pattern
  3. Signet Ring      — a heavy gold ring with a flat engraved face, no gemstone
  4. Sealed Letter    — a folded letter with a broken red wax seal
  5. Pocket Watch     — a gold cased watch on a short chain, lid open
  6. Jewelled Dagger  — a short ornamental dagger, gems in the pommel, never used
````

<details><summary>id order for <code>sheets/thief_loot.txt</code></summary>

```
cut_purse
silver_plate
signet_ring
sealed_letter
pocket_watch
jewelled_dagger
```
</details>

---

## Sheet C — Tree node icons (13, grid 4x4)

Match the existing node art: **one object, centred, no background, no frame, no text**.
They render at about 34px on the tree board and 64px in the docked strip. Look at
`ag_coins` (a spilled coin pouch) and `fa_seed` (a spilled seed sack) — a node icon is
a small still life of the thing the perk does.

````
SHEET: Skill-tree perk icons. 13 cells, 4 across and 4 down. The last 3 cells are empty.

Each cell is ONE object or a very small group, centred, drawn alone on nothing — no
frame, no border, no badge, no numerals, no text. These sit on a dark board at about
34 pixels, so keep them simple and let the silhouette carry it.

CELLS:
  1.  Light Fingers   — a bare hand, fingers spread, reaching
  2.  Steady Hands    — a hand holding a lockpick perfectly still in a keyhole
  3.  Deep Pockets    — a coin pouch, fat and tied, a few coins beside it
  4.  Sticky Fingers  — a hand closed around a gemstone, one facet showing
  5.  Street Wisdom   — a folded street map with a route marked
  6.  Slippery        — a dark cloak caught mid-swirl, empty
  7.  Cutpurse        — a small curved knife and a cut purse string
  8.  Fence Contact   — two hands passing a small bundle between them
  9.  Second Pocket   — two identical coin pouches side by side
  10. Master Thief    — a black mask with eye holes, laid flat
  11. Ghost           — a faint outline of a hooded figure, almost transparent
  12. Magpie          — a black and white bird holding a ring in its beak
  13. Untouchable     — a broken shackle, the chain snapped
````

<details><summary>node id order for <code>sheets/thief_nodes.txt</code></summary>

```
th_speed
th_success
th_coins
th_goods
th_xp
th_caught
th_master1
th_master2
th_master3
th_gm_speed
th_gm_success
th_gm_goods
th_gm_cape
```
</details>

---

## Sheet D — The skill icon (1)

This one follows the **skill icon** brief, not the item brief — it sits in the left
rail beside the other nineteen and has to hold up at 20px.

````
One icon for a dark-fantasy RPG skill called Thieving. It sits in a list beside icons
for Woodcutting, Mining, Fishing and so on, and is displayed at about TWENTY PIXELS.

FILL THE FRAME. One object, drawn LARGE, about 95% of the image edge to edge. No empty
margin.

Two or three big shapes and nothing else. It must be identifiable from its silhouette
alone with no colour.

Deep, slightly desaturated colour, strong contrast inside the object, a bright rim
light on one edge and deep shadow opposite — it sits on a near-black interface, so it
should feel lit in a dark room, not bright and flat.

Hand-painted with a dark ink outline, cel-like shading in three or four value steps.
Not flat vector, not a photograph, not a 3D render. Flat pure white background.

THE OBJECT: a set of lockpicks — two slim steel picks crossed over a tension wrench,
seen flat on. A narrow, spiky, unmistakable silhouette that cannot be confused with the
axe, the pickaxe or the sword already in that list.
````

<details><summary>id for <code>sheets/thief_skill.txt</code></summary>

```
thieving
```
</details>

---

## Sheet E — The banner scene (1)

Every skill panel has a wide painted landscape behind its header. All twelve have one;
they are **1536&times;177 WebP, about 8 KB each, 106 KB for the set**. It is the largest
single piece of art the skill needs and the one most likely to be forgotten, because it
is not an icon.

````
A wide banner illustration for a dark-fantasy RPG skill panel. Very wide and short —
roughly 1536 by 177 pixels, about 8.5:1. It sits BEHIND panel text, so it must read as
a backdrop, not as a picture competing for attention.

Composition: keep the interest in the LEFT third and let the right two thirds fall away
into darkness and haze, because the skill's name, level and progress bar sit over that
side. No large bright shapes on the right.

Subject: a narrow city street at night. Shuttered market stalls, their awnings down. One
lantern burning. A doorway with a figure just out of it — implied, not detailed, no face.
Wet cobbles catching the lamplight.

Dark, low-key, deep blues and near-blacks with a single warm lantern glow. Painterly, the
same hand as the other skill banners: atmospheric, slightly soft, not a sharp
illustration and not a photograph. No text, no logo, no UI, no border.
````

<details><summary>id for <code>sheets/thief_banner.txt</code></summary>

```
thieving
```
</details>

The banner is not an icon and does not go through `slice.js` or the item pack — it is
resized to 1536&times;177, encoded to WebP, and written into `SKILL_ART` as a data URI.

---

## After they land

Sheets A, B and D go through the normal item pipeline — `slice.js` &rarr; `key.js` &rarr;
add the ids to `_iconart/picks.json` &rarr; `pack.js --picks _iconart/picks.json` &rarr;
`inject.js`.

**Do not skip the picks.json step.** An id that is not in that file is dropped by
`pack.js` silently, and the run still prints "wrote pack.json" — that is exactly how the
eleven shop trinkets shipped on their old generated SVGs for four builds while being
reported as done.

**Sheet C has no tool.** The `NODE_ART` block holds 160 painted node icons for the
twelve existing trees, and nothing in `_iconart/` produces it — it was injected once by
hand. The thirteen Thieving nodes need either a small injector written for them or the
same one-off treatment. Worth writing the injector, since it is the last hand-made step
in the art pipeline.

The **pet needs nothing**: skilling pets are generated by `_critterSVG` from a palette
and an ear shape, so a thirteenth is a one-line entry, not a drawing.
